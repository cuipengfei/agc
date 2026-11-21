#!/usr/bin/env bash
set -euo pipefail

: "${TERN_TOOL_ROOT:?}"
: "${TERN_VERIFY_BINARY:?}"
: "${TERN_VERIFY_SITE:?}"
: "${TERN_VERIFY_VERSION:?}"
: "${TERN_VERIFY_WORK:?}"
: "${TERN_EVIDENCE:?}"

case "$TERN_VERIFY_WORK" in
  /tmp/tern-verify.*) ;;
  *) printf 'Unexpected verification work directory: %s\n' "$TERN_VERIFY_WORK" >&2; exit 2 ;;
esac
case "$TERN_EVIDENCE" in
  "$TERN_VERIFY_WORK"|"$TERN_VERIFY_WORK"/*) printf 'Evidence must be outside the work directory\n' >&2; exit 2 ;;
esac

test -d "$TERN_VERIFY_WORK"
test -d "$TERN_EVIDENCE"
test -x "$TERN_VERIFY_BINARY"
test -f "$TERN_VERIFY_SITE/pkg/client.wasm"

umask 077
runtime="$TERN_VERIFY_WORK/service"
test ! -e "$runtime"
socket="$runtime/daemon.sock"
token_file="$runtime/web-token"
daemon_pid=''
web_pid=''

cleanup() {
  local result=$? pid owner still_running=0
  trap - EXIT INT TERM
  for pid in "$web_pid" "$daemon_pid"; do
    [[ -n "$pid" ]] || continue
    if kill -0 "$pid" 2>/dev/null; then
      owner="$(ps -o ppid= -p "$pid" | tr -d '[:space:]')" || owner=''
      if [[ "$owner" != "$$" ]]; then
        printf 'Refusing to stop process %s: parent changed\n' "$pid" >&2
        still_running=1
        continue
      fi
      kill -TERM "$pid" 2>/dev/null || true
      for _ in {1..50}; do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.1
      done
      if kill -0 "$pid" 2>/dev/null; then
        owner="$(ps -o ppid= -p "$pid" | tr -d '[:space:]')" || owner=''
        if [[ "$owner" == "$$" ]]; then
          kill -KILL "$pid" 2>/dev/null || true
        else
          printf 'Refusing to stop process %s: parent changed\n' "$pid" >&2
          still_running=1
          continue
        fi
      fi
    fi
    wait "$pid" 2>/dev/null || true
    if kill -0 "$pid" 2>/dev/null; then
      printf 'Process %s is still running\n' "$pid" >&2
      still_running=1
    fi
  done
  if (( still_running )); then
    result=1
  else
    rm -rf -- "$runtime"
    printf 'Private daemon and web processes exited; temporary service data removed.\n' > "$TERN_EVIDENCE/service-cleanup.txt"
  fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
mkdir -m 700 "$runtime" "$runtime/home" "$runtime/config" "$runtime/state" "$runtime/cache"

openssl rand -hex 32 > "$token_file"
port="$(python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')"
export HOME="$runtime/home" XDG_CONFIG_HOME="$runtime/config" XDG_STATE_HOME="$runtime/state" XDG_CACHE_HOME="$runtime/cache"
export TERN_CONFIG_DIR="$runtime/config" TERN_DAEMON_SOCKET="$socket"

printf 'daemon: %s daemon --socket %s\nweb: %s web serve --listen 127.0.0.1:%s --token %s --assets %s\n' \
  "$TERN_VERIFY_BINARY" "$socket" "$TERN_VERIFY_BINARY" "$port" "$token_file" "$TERN_VERIFY_SITE" > "$TERN_EVIDENCE/service-actions.txt"

"$TERN_VERIFY_BINARY" daemon --socket "$socket" > "$runtime/daemon.log" 2>&1 &
daemon_pid=$!
for _ in {1..100}; do
  [[ -S "$socket" ]] && break
  kill -0 "$daemon_pid" 2>/dev/null || { printf 'Private daemon exited before readiness\n' >&2; exit 1; }
  sleep 0.1
done
[[ -S "$socket" ]] || { printf 'Private daemon socket did not appear\n' >&2; exit 1; }

"$TERN_VERIFY_BINARY" web serve --listen "127.0.0.1:$port" --token "$token_file" --assets "$TERN_VERIFY_SITE" > "$runtime/web.log" 2>&1 &
web_pid=$!
ready=0
for _ in {1..100}; do
  if curl --silent --fail --max-time 1 --output /dev/null "http://127.0.0.1:$port/"; then
    ready=1
    break
  fi
  kill -0 "$web_pid" 2>/dev/null || { printf 'Private web service exited before readiness\n' >&2; exit 1; }
  sleep 0.1
done
(( ready )) || { printf 'Private web service did not become ready\n' >&2; exit 1; }

bun "$TERN_TOOL_ROOT/cli.mjs" inspect-runtime --binary "$TERN_VERIFY_BINARY" --socket "$socket" --port "$port" \
  --out "$TERN_EVIDENCE/runtime.json" > "$TERN_EVIDENCE/runtime-command.json"
jq -e --arg version "$TERN_VERIFY_VERSION" --argjson daemon "$daemon_pid" --argjson web "$web_pid" '
  .version == $version and .httpStatus == 200 and
  ([.processes[] | select(.role == "daemon" and .pid == $daemon and .matchesInstalled)] | length == 1) and
  ([.processes[] | select(.role == "web" and .pid == $web and .matchesInstalled)] | length == 1)
' "$TERN_EVIDENCE/runtime.json" > "$TERN_EVIDENCE/runtime-assertion.json"

bun "$TERN_TOOL_ROOT/cli.mjs" verify-service --url "http://127.0.0.1:$port" --assets "$TERN_VERIFY_SITE" \
  --token-file "$token_file" --version "$TERN_VERIFY_VERSION" --out "$TERN_EVIDENCE/service.json" \
  > "$TERN_EVIDENCE/service-command.json" 2> "$TERN_EVIDENCE/service.stderr"
jq -e '(.checks | length == 6) and all(.checks[]; .status == "passed")' \
  "$TERN_EVIDENCE/service.json" > "$TERN_EVIDENCE/service-assertion.json"

printf 'Private service verification passed; evidence: %s\n' "$TERN_EVIDENCE"
