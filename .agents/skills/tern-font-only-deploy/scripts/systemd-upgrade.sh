#!/usr/bin/env bash
# jq filters interpret their own dollar-prefixed variables.
# shellcheck disable=SC2016
set -euo pipefail

mode=check
case "${1:-}" in
  '') ;;
  --apply) mode=apply ;;
  *) printf 'Usage: %s [--apply]\n' "$0" >&2; exit 2 ;;
esac

script_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_root="$(cd "$script_root/../../.." && pwd)"
tool_root="${TERN_TOOL_ROOT:-$repo_root/tools/tern-maintain}"
candidate="${TERN_CANDIDATE_BINARY:?Set TERN_CANDIDATE_BINARY to the reviewed official binary}"
site="${TERN_PERSISTENT_SITE:?Set TERN_PERSISTENT_SITE to the verified persistent asset directory}"
archive="${TERN_ARCHIVE:?Set TERN_ARCHIVE to the matching official archive}"
installed="${TERN_INSTALLED_BINARY:-$HOME/.local/bin/tern}"
socket="${TERN_PRODUCTION_SOCKET:-/run/user/$(id -u)/tern/daemon.sock}"
port="${TERN_PRODUCTION_PORT:-8378}"
token_file="${TERN_TOKEN_FILE:-$HOME/.config/tern/web-token}"

umask 077
work="$(mktemp -d /tmp/tern-upgrade.XXXXXX)"
if [[ -z "${TERN_EVIDENCE:-}" ]]; then
  evidence_root="${TERN_EVIDENCE_ROOT:-$HOME/.local/share/tern-maintain/verification-evidence}"
  mkdir -p "$evidence_root"
  evidence="$(mktemp -d "$evidence_root/upgrade.XXXXXX")"
else
  mkdir -p "$TERN_EVIDENCE"
  evidence="$(mktemp -d "$TERN_EVIDENCE/upgrade.XXXXXX")"
fi
printf 'Evidence: %s\n' "$evidence"
stage=''
unit_stage=''
cleanup() {
  local result=$?
  trap - EXIT INT TERM
  case "$work" in
    /tmp/tern-upgrade.*) rm -rf -- "$work" ;;
    *) printf 'Unexpected upgrade work directory: %s\n' "$work" >&2; result=1 ;;
  esac
  if [[ -n "$stage" && -f "$stage" ]]; then rm -f -- "$stage" || result=1; fi
  if [[ -n "$unit_stage" && -f "$unit_stage" ]]; then rm -f -- "$unit_stage" || result=1; fi
  printf 'exit=%s; mode=%s; evidence retained\n' "$result" "$mode" > "$evidence/cleanup.txt"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

run() {
  local name=$1 status
  shift
  printf '%q ' "$@" > "$evidence/$name.command"
  printf '\n' >> "$evidence/$name.command"
  if "$@" > "$evidence/$name.stdout" 2> "$evidence/$name.stderr"; then
    status=0
  else
    status=$?
  fi
  printf 'exit=%s\n' "$status" > "$evidence/$name.exit"
  if (( status != 0 )); then
    printf '%s failed with exit=%s; see %s/%s.stderr\n' "$name" "$status" "$evidence" "$name" >&2
  fi
  return "$status"
}

assert_hash() {
  local name=$1 file=$2 expected=$3 actual
  actual="$(sha256sum "$file")"
  actual="${actual%% *}"
  if [[ "$actual" != "$expected" ]]; then
    printf 'expected=%s\nactual=%s\nfile=%s\n' "$expected" "$actual" "$file" > "$evidence/$name.txt"
    printf '%s: hash mismatch for %s\n' "$name" "$file" >&2
    return 1
  fi
  printf 'sha256=%s\nfile=%s\n' "$actual" "$file" > "$evidence/$name.txt"
}

record_programs() {
  local parent=$1 output=$2
  ps -e -o ppid=,pid=,comm= | awk -v parent="$parent" '$1 == parent {print $2, $3}' | sort > "$output"
}

for tool in bun jq sha256sum curl python3 awk tar cmp comm ps systemctl install mktemp; do
  command -v "$tool"
done > "$evidence/doctor-tools.txt"
test -x "$candidate"
test -f "$archive"
test -f "$installed" && test ! -L "$installed"
test -f "$token_file"
test -f "$site/deploy-manifest.json"
for systemd_path in "$installed" "$socket" "$token_file" "$site"; do
  if [[ ! "$systemd_path" =~ ^/[A-Za-z0-9_./-]+$ ]]; then
    printf 'systemd paths must be absolute and contain only ASCII letters, digits, dot, underscore, hyphen and slash\n' >&2
    exit 1
  fi
done

run candidate-version "$candidate" --version
version="$(awk 'NR == 1 {print $2}' "$evidence/candidate-version.stdout")"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
run archive-list tar -tzf "$archive"
printf 'tern/\ntern/tern\n' > "$work/archive-expected.txt"
run archive-shape cmp "$work/archive-expected.txt" "$evidence/archive-list.stdout"
tar -xOf "$archive" tern/tern > "$work/archive-tern" 2> "$evidence/archive-extract.stderr"
printf 'tar -xOf <archive> tern/tern\nexit=0\n' > "$evidence/archive-extract.txt"
run archive-candidate-cmp cmp -s "$work/archive-tern" "$candidate"
run archive-candidate-hash sha256sum "$work/archive-tern"

run site-identity jq -e --arg version "$version" '.version == $version and
  (.mode == "font-registration" or .mode == "font-only")' "$site/deploy-manifest.json"
run verify-site env TERN_VERIFY_SITE="$site" TERN_EVIDENCE="$evidence" "$script_root/scripts/verify-site.sh"

run daemon-active systemctl --user is-active tern-daemon.service
run web-active systemctl --user is-active tern-web.service
[[ "$(<"$evidence/daemon-active.stdout")" == active ]]
[[ "$(<"$evidence/web-active.stdout")" == active ]]
run before-runtime bun "$tool_root/cli.mjs" inspect-runtime --binary "$installed" --socket "$socket" --port "$port" --out "$evidence/before-runtime.json"
run before-identity jq -e '
  .httpStatus == 200 and
  ([.processes[] | select(.role == "daemon" and .matchesInstalled and .managerPid == null)] | length == 1) and
  ([.processes[] | select(.role == "web" and .matchesInstalled and .managerPid == null)] | length == 1)
' "$evidence/before-runtime.json"
jq -S '.paneIds | sort' "$evidence/before-runtime.json" > "$evidence/before-panes.json"
daemon_pid="$(jq -er '.processes[] | select(.role == "daemon") | .pid' "$evidence/before-runtime.json")"
record_programs "$daemon_pid" "$evidence/before-programs.txt"
token_hash="$(sha256sum "$token_file")"
token_hash="${token_hash%% *}"

web_unit="$(systemctl --user show --property=FragmentPath --value tern-web.service)"
daemon_unit="$(systemctl --user show --property=FragmentPath --value tern-daemon.service)"
printf 'daemon=%s\nweb=%s\n' "$daemon_unit" "$web_unit" > "$evidence/unit-paths.txt"
test -f "$web_unit" && test ! -L "$web_unit"
grep -Fqx "Environment=TERN_DAEMON_SOCKET=$socket" "$web_unit"
exec_line="$(grep -m1 '^ExecStart=' "$web_unit")"
expected_prefix="ExecStart=$installed web serve --listen 127.0.0.1:$port --token $token_file --assets "
[[ "$exec_line" == "$expected_prefix"* ]]
old_site="${exec_line#"$expected_prefix"}"
[[ -n "$old_site" && "$old_site" != *' --'* ]]

run summary jq -n --arg version "$version" --arg mode "$mode" --arg site "$site" \
  '{result: "preflight_passed", version: $version, mode: $mode, site: $site, changed: false}'
mv -f -- "$evidence/summary.stdout" "$evidence/summary.json"
if [[ "$mode" == check ]]; then
  printf 'Preflight passed; no service or configuration changed. Evidence: %s\n' "$evidence"
  exit 0
fi

stage="$(mktemp "$(dirname "$installed")/.tern.XXXXXX")"
run stage-install install -m 0755 "$candidate" "$stage"
run stage-cmp cmp -s "$candidate" "$stage"
run binary-install mv -f -- "$stage" "$installed"
run daemon-restart env TERN_DAEMON_SOCKET="$socket" "$installed" restart --json

unit_stage="$(mktemp "$(dirname "$web_unit")/.tern-web.XXXXXX")"
new_exec="$expected_prefix$site"
while IFS= read -r line || [[ -n "$line" ]]; do
  if [[ "$line" == "$exec_line" ]]; then
    printf '%s\n' "$new_exec" >> "$unit_stage"
  else
    printf '%s\n' "$line" >> "$unit_stage"
  fi
done < "$web_unit"
chmod --reference="$web_unit" "$unit_stage"
printf 'old=%s\nnew=%s\n' "$exec_line" "$new_exec" > "$evidence/unit-exec.txt"
run unit-install mv -f -- "$unit_stage" "$web_unit"
run daemon-reload systemctl --user daemon-reload
run web-restart systemctl --user restart tern-web.service

ready=0
for _ in {1..100}; do
  if curl --silent --fail --max-time 1 --output /dev/null "http://127.0.0.1:$port/"; then
    ready=1
    break
  fi
  sleep 0.1
done
(( ready )) || { printf 'Formal web service did not become ready\n' >&2; exit 1; }
run after-runtime bun "$tool_root/cli.mjs" inspect-runtime --binary "$installed" --socket "$socket" --port "$port" --out "$evidence/after-runtime.json"
run after-identity jq -e --arg version "$version" '
  .version == $version and .httpStatus == 200 and
  ([.processes[] | select(.role == "daemon" and .matchesInstalled)] | length == 1) and
  ([.processes[] | select(.role == "web" and .matchesInstalled)] | length == 1)
' "$evidence/after-runtime.json"
jq -S '.paneIds | sort' "$evidence/after-runtime.json" > "$evidence/after-panes.json"
run panes-preserved cmp -s "$evidence/before-panes.json" "$evidence/after-panes.json"
daemon_pid="$(jq -er '.processes[] | select(.role == "daemon") | .pid' "$evidence/after-runtime.json")"
record_programs "$daemon_pid" "$evidence/after-programs.txt"
run programs-preserved comm -23 "$evidence/before-programs.txt" "$evidence/after-programs.txt"
[[ ! -s "$evidence/programs-preserved.stdout" ]]
after_token_hash="$(sha256sum "$token_file")"
after_token_hash="${after_token_hash%% *}"
[[ "$after_token_hash" == "$token_hash" ]]
unset token_hash after_token_hash
run formal-service bun "$tool_root/cli.mjs" verify-service --url "http://127.0.0.1:$port" --assets "$site" \
  --token-file "$token_file" --version "$version" --out "$evidence/formal-service.json"
run formal-service-identity jq -e '(.checks | length == 6) and all(.checks[]; .status == "passed")' "$evidence/formal-service.json"
run summary jq -n --arg version "$version" --arg mode "$mode" --arg site "$site" \
  '{result: "passed", version: $version, mode: $mode, site: $site, changed: true, visual: "not_run"}'
mv -f -- "$evidence/summary.stdout" "$evidence/summary.json"
printf 'Upgrade passed: version=%s; panes, programs and token preserved. Evidence: %s\n' "$version" "$evidence"
