#!/usr/bin/env bash
set -euo pipefail

: "${TERN_VERIFY_SITE:?}"
: "${TERN_EVIDENCE:?}"

site="$TERN_VERIFY_SITE"
evidence="$TERN_EVIDENCE"
manifest="$site/deploy-manifest.json"

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
jq -e '.files | type == "object" and has("index.html") and has("pkg/client.wasm") and has("pkg/client.js")' "$manifest" > "$evidence/site-file-map.json"
while IFS= read -r file; do
  [[ "$file" =~ ^[A-Za-z0-9._/-]+$ && "$file" != /* && "$file" != *..* ]]
  assert_hash "asset-${file//\//-}" "$site/$file" "$(jq -er --arg file "$file" '.files[$file]' "$manifest")"
done < <(jq -er '.files | keys[]' "$manifest")

mode="$(jq -er '.mode' "$manifest")"
if [[ "$mode" == font-only ]]; then
  jq -e '.files | has("maple.js") and has("fonts.json")' "$manifest" > "$evidence/font-only-required.json"
  jq -e --slurpfile deployed "$manifest" \
    '.fonts | length > 0 and all(.[]; (.url | sub("^\\./"; "")) as $file | $deployed[0].files | has($file))' \
    "$site/fonts.json" > "$evidence/font-only-font-list.json"
fi

printf 'Site assets verified: mode=%s files=%s\n' "$mode" "$(jq '.files | length' "$manifest")"
