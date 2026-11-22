#!/usr/bin/env bash
set -euo pipefail
umask 077

script_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_root="$(cd "$script_root/../../.." && pwd)"
tool_root="${TERN_TOOL_ROOT:-$repo_root/tools/tern-maintain}"
binary="${TERN_VERIFY_BINARY:-$HOME/.local/bin/tern}"
profile=''
original=''
site=''
mode=full
while (( $# )); do
  case "$1" in
    --original|--site|--profile)
      (( $# >= 2 )) || { printf 'Missing value for %s\n' "$1" >&2; exit 2; }
      case "$1" in
        --original) original=$2 ;;
        --site) site=$2 ;;
        --profile) profile=$2 ;;
      esac
      shift 2 ;;
    --smoke) mode=smoke; shift ;;
    *) printf 'Usage: %s (--original DIR | --site DIR) --profile FILE [--smoke]\n' "$0" >&2; exit 2 ;;
  esac
done
[[ -n "$profile" && ( -n "$original" || -n "$site" ) && ! ( -n "$original" && -n "$site" ) ]] || {
  printf 'Specify one source directory and its profile\n' >&2; exit 2;
}
if [[ -n "$original" ]]; then
  wasm="$original/pkg/original.wasm"
  source_args=(--original "$original")
else
  wasm="$site/pkg/client.wasm"
  source_args=(--site "$site")
fi
mode_args=()
[[ "$mode" == full ]] || mode_args=(--smoke)
if [[ -z "${TERN_EXPERIMENT_DIR:-}" ]]; then
  exec bun "$script_root/scripts/run-experiment.mjs" --hypothesis "The supplied module selects the target font and preserves builtin/missing controls ($mode)." \
    --input "$wasm" --input "$profile" -- bash "$0" "${source_args[@]}" --profile "$profile" "${mode_args[@]}"
fi

: "${TERN_EVIDENCE:?}"
for command in bun jq python3 openssl curl sha256sum timeout wslpath; do command -v "$command" >/dev/null; done
test -x "$binary"
test -f "$wasm"
test -f "$profile"
node="${TERN_WINDOWS_NODE:-/mnt/d/Program Files/nodejs/node.exe}"
chrome="${TERN_CHROME:-/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe}"
playwright="${TERN_PLAYWRIGHT_MODULE:-}"
if [[ -z "$playwright" ]]; then
  printf 'Set TERN_PLAYWRIGHT_MODULE to the Windows Playwright index.mjs\n' >&2; exit 2
fi
test -f "$node"
test -f "$chrome"
test -f "$playwright"
expected="$(jq -er '.wasmSha256' "$profile")"
actual="$(sha256sum "$wasm")"
[[ "${actual%% *}" == "$expected" ]] || { printf 'Module and profile identity differ\n' >&2; exit 1; }
work="$(mktemp -d /tmp/tern-font-check.XXXXXX)"
daemon_pid=''
web_pid=''
cleanup() {
  local result=$? pid owner remaining=0 log
  trap - EXIT INT TERM
  for pid in "$web_pid" "$daemon_pid"; do
    [[ -n "$pid" ]] || continue
    if kill -0 "$pid" 2>/dev/null; then
      owner="$(ps -o ppid= -p "$pid" | tr -d '[:space:]')" || owner=''
      if [[ "$owner" != "$$" ]]; then
        printf 'Process ownership changed: %s\n' "$pid" >&2; remaining=1; continue
      fi
      kill -TERM "$pid" 2>/dev/null || true
      for _ in {1..50}; do kill -0 "$pid" 2>/dev/null || break; sleep 0.1; done
      if kill -0 "$pid" 2>/dev/null; then
        owner="$(ps -o ppid= -p "$pid" | tr -d '[:space:]')" || owner=''
        if [[ "$owner" != "$$" ]]; then remaining=1; continue; fi
        kill -KILL "$pid" 2>/dev/null || true
      fi
    fi
    wait "$pid" 2>/dev/null || true
    if kill -0 "$pid" 2>/dev/null; then remaining=1; fi
  done
  for log in daemon web driver; do
    [[ -f "$work/$log.log" ]] || continue
    if [[ -f "$work/token" ]]; then
      bun "$script_root/scripts/run-experiment.mjs" --redact-log "$work/$log.log" --secret-file "$work/token" > "$TERN_EVIDENCE/$log.log" || result=1
    fi
  done
  if (( remaining )); then
    result=1
    printf 'Private processes remain; work retained: %s\n' "$work" >&2
  else
    rm -rf -- "$work"
  fi
  printf 'exit=%s; processes_remaining=%s; evidence retained\n' "$result" "$remaining" > "$TERN_EVIDENCE/font-cleanup.txt"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
mkdir -p "$work/site/pkg" "$work/home" "$work/config" "$work/state" "$work/cache"
if [[ -n "$site" ]]; then
  TERN_VERIFY_SITE="$site" TERN_EVIDENCE="$TERN_EVIDENCE" bash "$script_root/scripts/verify-site.sh"
  cp -a "$site/." "$work/site/"
  wasm_args=()
  version="$(jq -er '.version' "$site/deploy-manifest.json")"
else
  cp "$original/official.html" "$work/site/index.html"
  cp "$original/pkg/client.js" "$work/site/pkg/stencil_tern_web.js"
  wasm_args=(--wasm "$(wslpath -w "$wasm")")
  version="$(jq -er '.version' "$original/inputs.json")"
fi
font_data="${XDG_DATA_HOME:-$HOME/.local/share}"
export HOME="$work/home" XDG_DATA_HOME="$font_data" XDG_CONFIG_HOME="$work/config" XDG_STATE_HOME="$work/state" XDG_CACHE_HOME="$work/cache"
export TERN_CONFIG_DIR="$work/config" TERN_DAEMON_SOCKET="$work/daemon.sock"
openssl rand -hex 32 > "$work/token"
port="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"
"$binary" daemon --socket "$work/daemon.sock" > "$work/daemon.log" 2>&1 &
daemon_pid=$!
for _ in {1..100}; do
  [[ -S "$work/daemon.sock" ]] && break
  kill -0 "$daemon_pid" 2>/dev/null || { printf 'Daemon exited before readiness\n' >&2; exit 1; }
  sleep 0.1
done
[[ -S "$work/daemon.sock" ]] || { printf 'Daemon socket is unavailable\n' >&2; exit 1; }
printf '# 中文字体检查\n\n中文你好，日本語。Maple Mono NF CN。\n' > "$TERN_EVIDENCE/fixture.md"
timeout 15 "$binary" open --split right --json "$TERN_EVIDENCE/fixture.md" > "$TERN_EVIDENCE/open.json"
jq -e '.blocks[0] | type == "number"' "$TERN_EVIDENCE/open.json" >/dev/null
"$binary" web serve --listen "127.0.0.1:$port" --token "$work/token" --assets "$work/site" > "$work/web.log" 2>&1 &
web_pid=$!
ready=0
for _ in {1..100}; do
  if curl --silent --fail --max-time 1 --output /dev/null "http://127.0.0.1:$port/"; then ready=1; break; fi
  kill -0 "$web_pid" 2>/dev/null || { printf 'Web service exited before readiness\n' >&2; exit 1; }
  sleep 0.1
done
(( ready )) || { printf 'Web service did not become ready\n' >&2; exit 1; }
bun "$tool_root/cli.mjs" inspect-runtime --binary "$binary" --socket "$work/daemon.sock" --port "$port" --out "$TERN_EVIDENCE/runtime.json" >/dev/null
jq -e --arg version "$version" --argjson daemon "$daemon_pid" --argjson web "$web_pid" '.version == $version and .httpStatus == 200 and
  any(.processes[]; .role == "daemon" and .pid == $daemon and .matchesInstalled) and
  any(.processes[]; .role == "web" and .pid == $web and .matchesInstalled)' "$TERN_EVIDENCE/runtime.json" >/dev/null
printf 'Private instance ready; mode=%s; daemon=%s; web=%s\n' "$mode" "$daemon_pid" "$web_pid"
"$node" "$(wslpath -w "$tool_root/font-check.mjs")" --url "http://127.0.0.1:$port" \
  --token-file "$(wslpath -w "$work/token")" --playwright-module "$(wslpath -w "$playwright")" \
  --chromium-executable "$(wslpath -w "$chrome")" --profile "$(wslpath -w "$profile")" \
  "${wasm_args[@]}" --mode "$mode" --out "$(wslpath -w "$TERN_EVIDENCE/font-check.json")" > "$work/driver.log" 2>&1
jq '{kind,source,classification,runs:[.runs[]|{phase,matched,error}]}' "$TERN_EVIDENCE/font-check.json"
