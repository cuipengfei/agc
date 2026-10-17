# TUIOS Web 本机安装、认证与更新记录

> Source: 本机会话命令输出、/tmp/tuios-install-web.sh 修改版、/home/cpf/.local/bin/uv-bun
> Collected: 2026-10-17
> Published: Unknown

## 本机安装位置与版本

用户运行：

```console
$ which tuios
/home/cpf/.local/bin/tuios
$ which tuios-web
/home/cpf/.local/bin/tuios-web
$ tuios --version
tuios version 0.10.0 [pure-Go backend]
Commit: e53ca4145c9f65481487ef029484f1e131e77707
Built: 2026-10-16T06:05:35Z
By: goreleaser
$ tuios-web --version
tuios-web version 0.10.0
Commit: e53ca4145c9f65481487ef029484f1e131e77707
Built: 2026-10-16T06:05:35Z
By: goreleaser
```

Release 元数据查询：

```json
{"assets":["checksums.txt","tuios-web_0.10.0_Linux_x86_64.tar.gz"],"publishedAt":"2026-10-16T06:20:00Z"}
```

本机工具与目录检查：

```text
tuios=/home/cpf/.local/bin/tuios
tuios-web=missing
writable=/home/cpf/.local/bin
```

这发生在安装 `tuios-web` 之前。`/usr/local/bin` 和 `/home/cpf/bin` 当时不可写，`/home/cpf/.local/bin` 可写。

## 官方安装脚本的匿名 API 失败

用户两次运行：

```bash
curl -fsSL https://raw.githubusercontent.com/Gaurav-Gosain/tuios/main/install-web.sh | bash
```

两次均得到：

```text
i Installing tuios-web (Web Terminal Server)...

i Detected OS: Linux
i Detected Architecture: x86_64
i Fetching latest release...
curl: (22) The requested URL returned error: 403
```

进程退出码为 `1`。失败后，对同一 GitHub release API 的查询返回：

```text
API rate limit exceeded for 103.184.237.185. (But here's the good news: Authenticated requests get a higher rate limit. Check out the documentation for more details.)
```

用户随后提供 `curl ipconfig.io/json` 的结果，其中公网地址为 `202.85.53.220`。两个服务观察到的出口地址不同；本会话没有检查代理配置和实际路由，因此具体分流原因未确认。

## 使用 gh 认证的临时修改

`gh auth status` 显示账户已登录并配置 token。临时脚本 `/tmp/tuios-install-web.sh` 只修改版本查询与下载函数；操作系统检测、SHA-256 校验、解压、目录选择、移动二进制、赋予执行权限和版本检查保持原样。

版本查询变为：

```bash
if command -v gh &> /dev/null; then
    VERSION=$(gh api "repos/${REPO}/releases/latest" --jq '.tag_name')
elif command -v curl &> /dev/null; then
    VERSION=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
elif command -v wget &> /dev/null; then
    VERSION=$(wget -qO- "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
else
    print_error "Neither gh, curl nor wget found. Please install one of them."
    exit 1
fi
```

下载变为：

```bash
if command -v gh &> /dev/null; then
    ASSET_PATH=${URL#https://github.com/${REPO}/releases/download/}
    TAG=${ASSET_PATH%%/*}
    ASSET_NAME=${ASSET_PATH#*/}
    gh release download "$TAG" --repo "$REPO" --pattern "$ASSET_NAME" --dir "$(dirname "$OUTPUT")"
    if [ "$OUTPUT" != "$(dirname "$OUTPUT")/$ASSET_NAME" ]; then
        mv "$(dirname "$OUTPUT")/$ASSET_NAME" "$OUTPUT"
    fi
elif command -v curl &> /dev/null; then
    curl -fsSL "$URL" -o "$OUTPUT"
elif command -v wget &> /dev/null; then
    wget -qO "$OUTPUT" "$URL"
else
    print_error "Neither gh, curl nor wget found"
    exit 1
fi
```

执行 `bash -n /tmp/tuios-install-web.sh && bash /tmp/tuios-install-web.sh` 的输出：

```text
i Installing tuios-web (Web Terminal Server)...

i Detected OS: Linux
i Detected Architecture: x86_64
i Fetching latest release...
i Latest version: v0.10.0
i Downloading tuios-web_0.10.0_Linux_x86_64.tar.gz...
i Verifying checksum...
✓ Checksum verified
i Extracting...
i Installing to /home/cpf/.local/bin...
✓ tuios-web installed successfully!

i Run 'tuios-web --version' to verify installation
tuios-web version 0.10.0
Commit: e53ca4145c9f65481487ef029484f1e131e77707
Built: 2026-10-16T06:05:35Z
By: goreleaser

i Run 'tuios-web' to start the web terminal server
i Then open http://localhost:7681 in your browser
```

## GITHUB_TOKEN 与更新结果

用户运行：

```bash
export GITHUB_TOKEN="$(gh auth token)"
tuios update
```

输出：

```text
Installed at /home/cpf/.local/bin/tuios
This build came from a release archive.
Running 0.10.0, latest is v0.10.0.
Already up to date. Nothing to do.
```

此前未设置 token 时，`tuios update` 返回：

```text
ERROR

GitHub is rate limiting this address.
Most likely cause: Sixty release lookups an hour are allowed without a token, shared by everyone on this address.
The limit resets at 10:47PM.
Fix: wait and run it again, or set GITHUB_TOKEN to a token with no scopes to raise the limit.
```

`tuios update --help` 当前说明：

```text
This only updates a binary that came from a release archive, which is what the
install script downloads. Every other way of installing tuios has something that
owns the file: a package manager, Homebrew, the Nix store, or the Go tool.

tuios-web is updated at the same time when it sits beside tuios. The two talk to
one daemon and it compares their versions, so they move together or not at all.

Every download is checked against the release's published checksum. A file that
does not match is discarded and nothing is installed.

The daemon keeps running the old build until it is restarted.
```

设置 token 后只完成了“已经是最新版本”的检查，尚未经历一次从旧版本到新版本的联合升级。

## uv-bun 当前更新范围

完整读取 `/home/cpf/.local/bin/uv-bun` 后，文件中未发现 `tuios`、`tuios update` 或 TUIOS 安装脚本调用。`selfUpdate()` 当前处理 herdr、umans、rtk、plannotator 和 witr，并运行通用系统包更新与其他工具更新。

结论限定为：当前 release-archive 安装的 `/home/cpf/.local/bin/tuios` 没有由 `uv-bun` 直接更新。`uv-bun` 的通用系统包更新是否影响其他包管理器拥有的副本，不属于本次实测范围。

## 凭据边界

本文件不保存 `gh auth token` 的输出，也不保存 `GITHUB_TOKEN` 的值。只记录设置变量的命令形式与更新命令输出。
