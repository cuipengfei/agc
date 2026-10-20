#!/usr/bin/env bash
# 下载并校验 build.mjs / build.test.mjs 使用的固定版本 WABT 工具链。
# 用法: bash ci/install-wabt.sh 全新安装目录（在 tools/tern-maintain 下；
# 在仓库根目录则为 bash tools/tern-maintain/ci/install-wabt.sh）。
# 最后一行 stdout 打印包含 wat2wasm/wasm2wat 的 bin 目录。
# 仅支持 Linux x86_64；INSTALL_DIR 必须不存在，避免覆盖已有内容。
set -euo pipefail

VERSION=1.0.42
SHA256=84895407a6bbb80e918f33b16b2fb2206021c150b6bc9ff6f761263a745ab131
DEST="${1:?用法: install-wabt.sh 全新安装目录}"

if [ "$(uname -s)" != "Linux" ] || [ "$(uname -m)" != "x86_64" ]; then
  echo "install-wabt.sh: 仅支持 Linux x86_64，当前为 $(uname -s)/$(uname -m)" >&2
  exit 1
fi
if [ -e "$DEST" ]; then
  echo "install-wabt.sh: 安装目录已存在: $DEST（请换一个全新目录）" >&2
  exit 1
fi
mkdir "$DEST"

TARBALL="$DEST/wabt-$VERSION-linux-x64.tar.gz"
curl -fsSL -o "$TARBALL" "https://github.com/WebAssembly/wabt/releases/download/$VERSION/wabt-$VERSION-linux-x64.tar.gz"
echo "$SHA256  $TARBALL" | sha256sum -c - >/dev/null
tar -xzf "$TARBALL" -C "$DEST"
rm "$TARBALL"
BIN="$DEST/wabt-$VERSION/bin"
for tool in wat2wasm wasm2wat; do
  if [ "$("$BIN/$tool" --version)" != "$VERSION" ]; then
    echo "install-wabt.sh: $tool 版本不匹配 $VERSION" >&2
    exit 1
  fi
done
echo "$BIN"
