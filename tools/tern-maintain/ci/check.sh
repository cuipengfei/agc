#!/usr/bin/env bash
set -euo pipefail

check_wiki() {
  local output errors unref
  output=$(python3 tools/wiki-check/check_evidence.py .)
  printf '%s\n' "$output"
  errors=$(printf '%s\n' "$output" | awk '/Evidence errors/{flag=1;next}/Unreferenced raw files/{flag=0}flag && NF && !/^\(none\)$/{count++}END{print count+0}')
  unref=$(printf '%s\n' "$output" | awk '/Unreferenced raw files/{flag=1;next}/Summary/{flag=0}flag && NF && !/^\(none\)$/{count++}END{print count+0}')
  if (( errors > 0 || unref > 0 )); then
    echo "Wiki evidence check failed: $errors evidence errors, $unref unreferenced raw files" >&2
    return 1
  fi
  echo 'Wiki evidence check passed (suspects are informational)'
}

if [[ ${1:-} == --staged ]]; then
  if [[ $# != 1 ]]; then
    echo 'Usage: bash tools/tern-maintain/ci/check.sh [--staged]' >&2
    exit 2
  fi
  root=$(git rev-parse --show-toplevel)
  cd "$root"
  snapshot=$(mktemp -d "${TMPDIR:-/tmp}/agc-tern-check.XXXXXXXX")
  trap 'rm -rf -- "$snapshot"' EXIT
  git diff --cached --name-only --no-renames -z > "$snapshot/changed"
  tern=false
  wiki=false
  while IFS= read -r -d '' path; do
    case "$path" in
      tools/tern-maintain/*) tern=true ;;
      tools/wiki-check/*|wiki/*|raw/*) wiki=true ;;
      .github/workflows/tern-maintain.yml|.pre-commit-config.yaml) tern=true; wiki=true ;;
    esac
  done < "$snapshot/changed"
  if [[ $tern == false && $wiki == false ]]; then
    echo 'Tern quick checks: no relevant staged changes'
    exit 0
  fi

  mkdir "$snapshot/tree"
  git checkout-index --all --prefix="$snapshot/tree/"
  env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_COMMON_DIR bash "$snapshot/tree/tools/tern-maintain/ci/check.sh" --quick "$tern" "$wiki"
  exit
fi

if [[ ${1:-} == --quick && $# == 3 ]]; then
  root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
  cd "$root"
  if [[ $2 == true ]]; then
    cd tools/tern-maintain
    bun install --frozen-lockfile --prefer-offline
    bun test cli.test.mjs
    cd "$root"
  fi
  if [[ $3 == true ]]; then
    check_wiki
  fi
  exit
fi

if [[ $# != 0 ]]; then
  echo 'Usage: bash tools/tern-maintain/ci/check.sh [--staged]' >&2
  exit 2
fi

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
cd "$root"
for command in bun uv python3 cc; do
  if ! command -v "$command" >/dev/null; then
    echo "Tern CI checks: missing $command" >&2
    exit 1
  fi
done
if [[ -z ${WABT_DIR:-} ]]; then
  wat2wasm=$(command -v wat2wasm || true)
  if [[ -n $wat2wasm ]]; then
    WABT_DIR=$(dirname "$wat2wasm")
  elif [[ -x ${HOME:-}/.cache/agc/wabt-1.0.42/wabt-1.0.42/bin/wat2wasm ]]; then
    WABT_DIR="$HOME/.cache/agc/wabt-1.0.42/wabt-1.0.42/bin"
  else
    echo 'Tern CI checks: set WABT_DIR to the WABT 1.0.42 bin directory' >&2
    exit 1
  fi
fi
for tool in wat2wasm wasm2wat; do
  if [[ ! -x $WABT_DIR/$tool ]] || [[ $("$WABT_DIR/$tool" --version) != 1.0.42 ]]; then
    echo "Tern CI checks: $WABT_DIR/$tool must be WABT 1.0.42" >&2
    exit 1
  fi
done
export WABT_DIR

cd "$root/tools/tern-maintain"
bun install --frozen-lockfile
bun install --cwd typecheck --frozen-lockfile
bun run check
bun test

cd "$root"
check_wiki

cd "$root/tools/tern-maintain"
uv run --with-requirements requirements.txt python -m unittest discover -s python_tests -v
cd "$root"
python3 -m unittest discover -s tests -v
