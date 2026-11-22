#!/usr/bin/env bash
# jq filters interpret their own dollar-prefixed variables.
# shellcheck disable=SC2016
set -euo pipefail

script_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_root="$(cd "$script_root/../../.." && pwd)"
export TERN_SKILL_ROOT="$script_root"
export TERN_TOOL_ROOT="${TERN_TOOL_ROOT:-$repo_root/tools/tern-maintain}"
export TERN_VERIFY_BINARY="${TERN_VERIFY_BINARY:-$HOME/.local/bin/tern}"
archive="${TERN_ARCHIVE:-/mnt/c/Users/39764/Downloads/Tern-0.9.29-linux-x86_64.tar.gz}"
prepare="${TERN_PREPARE:-0}"
target_font="${TERN_TARGET_FONT:-$HOME/.local/share/fonts/maple-win/MapleMono-NF-CN-backup-v7.700-20260523-224529/MapleMono-NF-CN-Regular.ttf}"
target_bold="${TERN_TARGET_BOLD:-$HOME/.local/share/fonts/maple-win/MapleMono-NF-CN-backup-v7.700-20260523-224529/MapleMono-NF-CN-Bold.ttf}"

umask 077
TERN_VERIFY_WORK="$(mktemp -d /tmp/tern-verify.XXXXXX)"
export TERN_VERIFY_WORK
evidence_root="${TERN_EVIDENCE_ROOT:-$HOME/.local/share/tern-maintain/verification-evidence}"
mkdir -p "$evidence_root"
TERN_EVIDENCE="$(mktemp -d "$evidence_root/run.XXXXXX")"
export TERN_EVIDENCE
printf 'Evidence: %s\n' "$TERN_EVIDENCE"

cleanup() {
  local result=$?
  trap - EXIT INT TERM
  if [[ -d "$TERN_VERIFY_WORK" ]]; then
    case "$TERN_VERIFY_WORK" in
      /tmp/tern-verify.*)
        if [[ -e "$TERN_VERIFY_WORK/service" ]]; then
          printf 'Private service data remains at %s; inspect the recorded processes before removing it.\n' "$TERN_VERIFY_WORK/service" >&2
          result=1
        else
          rm -rf -- "$TERN_VERIFY_WORK"
        fi
        ;;
      *)
        printf 'Unexpected verification directory: %s\n' "$TERN_VERIFY_WORK" >&2
        result=1
        ;;
    esac
  fi
  if (( result == 0 )); then
    printf 'exit=0; temporary work directory removed; evidence retained\n' > "$TERN_EVIDENCE/cleanup.txt"
  else
    printf 'exit=%s; evidence retained\n' "$result" > "$TERN_EVIDENCE/cleanup.txt"
  fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

run() {
  local name=$1 status
  shift
  printf '%q ' "$@" > "$TERN_EVIDENCE/$name.command"
  printf '\n' >> "$TERN_EVIDENCE/$name.command"
  if "$@" > "$TERN_EVIDENCE/$name.stdout" 2> "$TERN_EVIDENCE/$name.stderr"; then
    status=0
  else
    status=$?
  fi
  printf 'exit=%s\n' "$status" > "$TERN_EVIDENCE/$name.exit"
  if (( status != 0 )); then
    printf '%s failed with exit=%s; see %s/%s.stderr\n' "$name" "$status" "$TERN_EVIDENCE" "$name" >&2
  fi
  return "$status"
}

assert_hash() {
  local name=$1 file=$2 expected=$3 actual
  actual="$(sha256sum "$file")"
  actual="${actual%% *}"
  if [[ "$actual" != "$expected" ]]; then
    printf 'expected=%s\nactual=%s\nfile=%s\n' "$expected" "$actual" "$file" > "$TERN_EVIDENCE/$name.txt"
    printf '%s: hash mismatch for %s\n' "$name" "$file" >&2
    return 1
  fi
  printf 'sha256=%s\nfile=%s\n' "$actual" "$file" > "$TERN_EVIDENCE/$name.txt"
}

for tool in bun jq sha256sum curl openssl python3 awk tar cmp ps; do
  command -v "$tool"
done > "$TERN_EVIDENCE/doctor-tools.txt"
test -x "$TERN_VERIFY_BINARY"
test -f "$archive"
test -f "$target_font"
cd "$TERN_TOOL_ROOT"
run doctor-binary bun --version
run doctor-tern "$TERN_VERIFY_BINARY" --version
TERN_VERIFY_VERSION="$(awk 'NR == 1 {print $2}' "$TERN_EVIDENCE/doctor-tern.stdout")"
export TERN_VERIFY_VERSION
[[ "$TERN_VERIFY_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
run doctor-binaryen bun -e 'await import("binaryen"); console.log("binaryen available")'

run archive-list tar -tzf "$archive"
printf 'tern/\ntern/tern\n' > "$TERN_VERIFY_WORK/archive-expected.txt"
run archive-shape cmp "$TERN_VERIFY_WORK/archive-expected.txt" "$TERN_EVIDENCE/archive-list.stdout"
printf '%q ' tar -xOf "$archive" tern/tern > "$TERN_EVIDENCE/archive-extract.command"
printf '\n' >> "$TERN_EVIDENCE/archive-extract.command"
if tar -xOf "$archive" tern/tern > "$TERN_VERIFY_WORK/archive-tern" 2> "$TERN_EVIDENCE/archive-extract.stderr"; then
  printf 'exit=0\n' > "$TERN_EVIDENCE/archive-extract.exit"
else
  status=$?
  printf 'exit=%s\n' "$status" > "$TERN_EVIDENCE/archive-extract.exit"
  exit "$status"
fi
run archive-binary-cmp cmp -s "$TERN_VERIFY_WORK/archive-tern" "$TERN_VERIFY_BINARY"
run archive-binary-hash sha256sum "$TERN_VERIFY_WORK/archive-tern"

if [[ "$prepare" == 1 ]]; then
  export TERN_ORIGINAL="${TERN_ORIGINAL:-$HOME/.local/share/tern-maintain/$TERN_VERIFY_VERSION/official}"
  mkdir -p -- "$(dirname "$TERN_ORIGINAL")"
  run prepare bun "$TERN_TOOL_ROOT/cli.mjs" prepare --binary "$TERN_VERIFY_BINARY" --out "$TERN_ORIGINAL"
elif [[ "$prepare" == 0 ]]; then
  export TERN_ORIGINAL="${TERN_ORIGINAL:?Set TERN_ORIGINAL to reviewed official resources, or TERN_PREPARE=1 after authorizing network access}"
else
  printf 'TERN_PREPARE must be 0 or 1\n' >&2
  exit 2
fi

inputs="$TERN_ORIGINAL/inputs.json"
run official-identity jq -e --arg version "$TERN_VERIFY_VERSION" '.schemaVersion == 1 and .version == $version' "$inputs"
assert_hash official-wasm-hash "$TERN_ORIGINAL/pkg/original.wasm" "$(jq -er '.wasmSha256' "$inputs")"
assert_hash official-glue-hash "$TERN_ORIGINAL/pkg/client.js" "$(jq -er '.glueSha256' "$inputs")"

font_report="${TERN_FONT_REPORT:-$(dirname "$TERN_ORIGINAL")/original-font-check-cjk.json}"
if [[ -z "${TERN_FONT_PROFILE:-}" ]]; then
  if [[ -f "$(dirname "$TERN_ORIGINAL")/original-profile.json" ]]; then
    font_profile="$(dirname "$TERN_ORIGINAL")/original-profile.json"
  else
    font_profile="$TERN_TOOL_ROOT/profiles/font-registration-$TERN_VERIFY_VERSION-original.json"
  fi
else
  font_profile="$TERN_FONT_PROFILE"
fi
if [[ ! -f "$font_report" || ! -f "$font_profile" ]]; then
  printf 'A matching font report and profile are required. Set TERN_FONT_REPORT and TERN_FONT_PROFILE after an authorized font check.\n' >&2
  exit 1
fi
target_hash="$(sha256sum "$target_font")"
target_hash="${target_hash%% *}"
printf 'sha256=%s\nfile=%s\n' "$target_hash" "$target_font" > "$TERN_EVIDENCE/target-font-hash.txt"
run font-report-identity jq -e --arg wasm "$(jq -er '.wasmSha256' "$inputs")" --arg font "$target_hash" --slurpfile profile "$font_profile" '
  .kind == "font-registration-check" and .expectedSha256 == $wasm and .wasmSha256 == $wasm and
  $profile[0].wasmSha256 == $wasm and $profile[0].fontSha256 == $font and
  any(.fontResponses[]; .phase == "cold" and .status == 200 and .sha256 == $font) and
  any(.runs[]; .phase == "builtin" and .matched == $profile[0].builtin) and
  any(.runs[]; .phase == "missing" and .matched == null) and
  (.classification as $decision | [.runs[] | select(.phase == "cold" or .phase == "warm")] as $runs |
    ($runs | length) == 2 and
    (($decision == "working" and all($runs[]; .matched == $profile[0].family)) or
     ($decision == "registration_missing" and all($runs[]; .matched == null))))
' "$font_report"
run font-decision jq '{source, classification, wasmSha256, fontResponses: [.fontResponses[] | {phase, status, bytes, sha256}]}' "$font_report"
classification="$(jq -er '.classification' "$font_report")"

export TERN_VERIFY_SITE="${TERN_SITE_OUT:-$TERN_VERIFY_WORK/site}"
case "$classification" in
  registration_missing)
    registration="$TERN_VERIFY_WORK/registration"
    run font-registration-build bun "$TERN_TOOL_ROOT/cli.mjs" font-registration-build \
      --original "$TERN_ORIGINAL/pkg/original.wasm" --glue "$TERN_ORIGINAL/pkg/client.js" --out "$registration"
    reference="${TERN_REFERENCE:-$(dirname "$TERN_ORIGINAL")/registration}"
    if [[ -f "$reference/registration.json" ]]; then
      run registration-reference jq -e --arg version "$TERN_VERIFY_VERSION" --slurpfile input "$inputs" --slurpfile reference "$reference/registration.json" '
        .schemaVersion == 1 and .kind == "font-registration" and .version == $version and
        .originalSha256 == $input[0].wasmSha256 and .glueSha256 == $input[0].glueSha256 and
        .candidateSha256 == $reference[0].candidateSha256
      ' "$registration/registration.json"
    else
      run registration-identity jq -e --arg version "$TERN_VERIFY_VERSION" --slurpfile input "$inputs" '
        .schemaVersion == 1 and .kind == "font-registration" and .version == $version and
        .originalSha256 == $input[0].wasmSha256 and .glueSha256 == $input[0].glueSha256
      ' "$registration/registration.json"
    fi
    assert_hash registration-candidate-hash "$registration/candidate.wasm" "$(jq -er '.candidateSha256' "$registration/registration.json")"

    if run rejected-glue bun "$TERN_TOOL_ROOT/cli.mjs" font-registration-build \
      --original "$TERN_ORIGINAL/pkg/original.wasm" --glue "$TERN_ORIGINAL/pkg/original.wasm" --out "$TERN_VERIFY_WORK/rejected-glue"; then
      printf 'Mismatched glue was accepted\n' >&2
      exit 1
    fi
    [[ "$(<"$TERN_EVIDENCE/rejected-glue.exit")" == 'exit=1' ]]
    [[ "$(<"$TERN_EVIDENCE/rejected-glue.stderr")" == 'Official JavaScript glue does not match the reviewed release' ]]
    test ! -e "$TERN_VERIFY_WORK/rejected-glue"

    if run rejected-original bun "$TERN_TOOL_ROOT/cli.mjs" font-registration-build \
      --original "$TERN_ORIGINAL/pkg/client.js" --glue "$TERN_ORIGINAL/pkg/client.js" --out "$TERN_VERIFY_WORK/rejected-original"; then
      printf 'Unknown original was accepted\n' >&2
      exit 1
    fi
    [[ "$(<"$TERN_EVIDENCE/rejected-original.exit")" == 'exit=1' ]]
    [[ "$(<"$TERN_EVIDENCE/rejected-original.stderr")" == 'Unknown official WASM: investigate this version before applying the registration patch' ]]
    test ! -e "$TERN_VERIFY_WORK/rejected-original"

    run assets-registration bun "$TERN_TOOL_ROOT/cli.mjs" assets --registration "$registration" --out "$TERN_VERIFY_SITE"
    run assets-identity jq -e --arg version "$TERN_VERIFY_VERSION" --slurpfile registration "$registration/registration.json" '
      .schemaVersion == 1 and .mode == "font-registration" and .version == $version and
      .originalSha256 == $registration[0].originalSha256 and .candidateSha256 == $registration[0].candidateSha256 and
      .glueSha256 == $registration[0].glueSha256
    ' "$TERN_VERIFY_SITE/deploy-manifest.json"
    if run rejected-assets bun "$TERN_TOOL_ROOT/cli.mjs" assets --registration "$registration" \
      --fonts "$TERN_VERIFY_WORK" --out "$TERN_VERIFY_WORK/rejected-assets"; then
      printf 'Incompatible asset inputs were accepted\n' >&2
      exit 1
    fi
    [[ "$(<"$TERN_EVIDENCE/rejected-assets.exit")" == 'exit=1' ]]
    [[ "$(<"$TERN_EVIDENCE/rejected-assets.stderr")" == 'assembleAssets: registration must not be combined with bundle, official or fonts' ]]
    test ! -e "$TERN_VERIFY_WORK/rejected-assets"
    test ! -e "$TERN_VERIFY_SITE/maple.js"
    test ! -e "$TERN_VERIFY_SITE/fonts.json"
    ;;

  working)
    command -v uv > /dev/null
    test -f "$target_bold"
    run memory bun cli.mjs memory --wasm "$TERN_ORIGINAL/pkg/original.wasm" --out "$TERN_VERIFY_WORK/initial.bin"
    run fonts uv run --with-requirements requirements.txt python fonts.py "$TERN_VERIFY_WORK/initial.bin" --out "$TERN_VERIFY_WORK/fonts-report.json"
    run analyze bun cli.mjs analyze --wasm "$TERN_ORIGINAL/pkg/original.wasm" --fonts "$TERN_VERIFY_WORK/fonts-report.json" --out "$TERN_VERIFY_WORK/plan.json"
    run font-manifest uv run --with-requirements requirements.txt python font_manifest.py \
      --plan "$TERN_VERIFY_WORK/plan.json" --memory "$TERN_VERIFY_WORK/initial.bin" --wasm "$TERN_ORIGINAL/pkg/original.wasm" \
      --regular "$target_font" --bold "$target_bold" --out "$TERN_VERIFY_WORK/font-assets"
    run assets-official bun cli.mjs assets --official "$TERN_ORIGINAL" --fonts "$TERN_VERIFY_WORK/font-assets" --out "$TERN_VERIFY_SITE"
    run assets-identity jq -e --arg version "$TERN_VERIFY_VERSION" --arg wasm "$(jq -er '.wasmSha256' "$inputs")" \
      '.mode == "font-only" and .version == $version and .wasmUnmodified == true and .originalSha256 == $wasm' \
      "$TERN_VERIFY_SITE/deploy-manifest.json"
    run official-wasm-cmp cmp -s "$TERN_VERIFY_SITE/pkg/client.wasm" "$TERN_ORIGINAL/pkg/original.wasm"
    run official-glue-cmp cmp -s "$TERN_VERIFY_SITE/pkg/client.js" "$TERN_ORIGINAL/pkg/client.js"
    ;;

  *)
    printf 'Font registration state is not deployable: %s\n' "$classification" >&2
    exit 1
    ;;
esac

run verify-site env TERN_VERIFY_SITE="$TERN_VERIFY_SITE" TERN_EVIDENCE="$TERN_EVIDENCE" "$TERN_SKILL_ROOT/scripts/verify-site.sh"
run verify-service "$TERN_SKILL_ROOT/scripts/verify-service.sh"
run summary jq -n --arg version "$TERN_VERIFY_VERSION" --arg classification "$classification" --arg site "$TERN_VERIFY_SITE" --arg original "$TERN_ORIGINAL" \
  '{result: "passed", version: $version, classification: $classification, original: $original, site: $site, visual: "not_run", formalUpgrade: "not_run"}'
mv -f -- "$TERN_EVIDENCE/summary.stdout" "$TERN_EVIDENCE/summary.json"
printf 'Verification passed: version=%s classification=%s\nEvidence retained: %s\n' "$TERN_VERIFY_VERSION" "$classification" "$TERN_EVIDENCE"
