# TUIOS Web 官方文档、安装器与更新器

> Source: https://tuios.dev/docs/web ; https://github.com/Gaurav-Gosain/tuios/blob/main/install-web.sh ; https://github.com/Gaurav-Gosain/tuios/blob/main/cmd/tuios/update.go ; https://github.com/Gaurav-Gosain/tuios/blob/main/cmd/tuios-web/main.go
> Collected: 2026-10-17
> Published: Unknown

## Web Terminal 文档原文摘录

# Web Terminal

Serve TUIOS in the browser — WebGL-accelerated rendering via xterm.js, WebTransport with WebSocket fallback. Real PTY, persistent sessions, multi-client, clipboard, touch keys. Linux & macOS.

A separate `tuios-web` binary (or `tuios web`) runs the web terminal server. Open the page on any device that can reach the host — a laptop, a phone, a tablet — and you get a full TUIOS session rendered by xterm.js with WebGL acceleration. Each browser connection talks to the same persistent `web` session by default, so closing the tab leaves your panes running and reopening it puts you right back where you were.

Install as a separate binary — the install script picks `/usr/local/bin` or `~/.local/bin`, whichever is writable:

```sh
curl -fsSL https://raw.githubusercontent.com/Gaurav-Gosain/tuios/main/install-web.sh | bash
```

Or with Go:

```sh
go install github.com/Gaurav-Gosain/tuios/cmd/tuios-web@latest
```

Or download the pre-built binary for your platform from [GitHub Releases](https://github.com/Gaurav-Gosain/tuios/releases). Package installs of TUIOS do not include `tuios-web`; `go install github.com/Gaurav-Gosain/tuios/cmd/tuios@latest` only installs `tuios`.

Start the server (default port `7681`, bound to `localhost` so only this machine can reach it):

```sh
tuios-web
```

Then open `http://localhost:7681` in your browser. On macOS, `tuios-web` also opens the browser for you on startup.

To reach the server from a phone or another machine, bind to a LAN address and turn on TLS and a password. `--auto-tls` generates a self-signed certificate and keeps it, and `--random-password` makes one at start and prints it:

```sh
tuios-web --host 0.0.0.0 --auto-tls --random-password
```

Then open `https://<host-ip>:7681` and log in with username `tuios` and the password from the terminal.

A browser that gets in gets a shell as you, so this only helps if you actually turn on TLS and a password: binding a non-loopback host requires both, and the server refuses to start without them. Only `--insecure` (plain HTTP) and `--no-auth` (no password) lift those requirements, and both are meant for trusted networks only.

`--port 7683` would select TCP `7683`, with UDP `7684` for WebTransport when TLS is active.

### Sessions and multiple devices

Every browser connects to the same persistent session (default name `web`), so all your tabs and devices share one set of windows — closing a tab leaves your programs running. Use `--default-session <name>` to share a different named session, or `?session=<name>` in the URL for a one-off. The pane layout uses the smallest connected client; the most recent input takes focus.

### Security

The web terminal gives a full shell to anyone who connects, so the security defaults are strict:

- **Loopback by default.** With no flags the server binds `localhost` only — nothing else on the network can reach it.
- **TLS is required off-loopback.** Binding a LAN or public address requires `--cert`/`--key` or `--auto-tls`. Plain HTTP off-loopback needs the explicit `--insecure` flag.
- **A password is required off-loopback.** Off-loopback also requires a password via `--password-file`, `--random-password`, or `TUIOS_WEB_PASSWORD`. Skipping it needs the explicit `--no-auth` flag.
- **Host header check.** Requests whose `Host` doesn't match the bind address are rejected with 403. This stops DNS-rebinding attacks from a malicious web page reaching a server on your localhost. Behind a reverse proxy, pass `--allow-host <domain>` (which itself requires a password).
- **Password files are checked.** `--password-file` refuses group/world-readable files (must be mode `600` or `400` and owned by you), so the password can't leak to other users on the box.
- **Passwords never reach your panes.** `TUIOS_WEB_PASSWORD` is read by the server and stripped from the environment it spawns panes with, so a program running inside a pane can't read it out of `/proc` or its own environment. Your own shell can still read the variable, of course — prefer `--password-file` for a long-lived password.

On localhost with no password, anyone with access to your browser (or any local process) can open a shell as you — that is the loopback trust model, the same as any local terminal. Off-loopback, set TLS and a password.

### Reverse proxy

For production, terminate TLS at your reverse proxy and run `tuios-web` on localhost. `X-Forwarded-*` headers are only honored when the direct peer is a loopback address.

## install-web.sh 必要摘录

版本查询使用匿名 GitHub API：

```bash
get_latest_version() {
    print_info "Fetching latest release..."
    if command -v curl &> /dev/null; then
        VERSION=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    elif command -v wget &> /dev/null; then
        VERSION=$(wget -qO- "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    else
        print_error "Neither curl nor wget found. Please install one of them."
        exit 1
    fi
    if [ -z "$VERSION" ]; then
        print_error "Could not determine latest release"
        exit 1
    fi
    print_info "Latest version: $VERSION"
}
```

压缩包和 checksum 都来自同一个 GitHub release：

```bash
VERSION_NUM=${VERSION#v}
ARCHIVE_NAME="${BINARY_NAME}_${VERSION_NUM}_${OS}_${ARCH}.tar.gz"
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/${ARCHIVE_NAME}"
CHECKSUMS_URL="https://github.com/${REPO}/releases/download/${VERSION}/checksums.txt"

print_info "Downloading ${ARCHIVE_NAME}..."
download_binary "$DOWNLOAD_URL" "$TMP_DIR/${BINARY_NAME}.tar.gz"

print_info "Verifying checksum..."
download_binary "$CHECKSUMS_URL" "$TMP_DIR/checksums.txt"
verify_checksum "$TMP_DIR/${BINARY_NAME}.tar.gz" "$TMP_DIR/checksums.txt"
```

SHA-256 校验会读取 release 中对应文件的预期值，并与本机计算值比较：

```bash
expected=$(grep "  ${archive_name}\$" "$checksums_path" | awk '{print $1}')
...
if command -v sha256sum &> /dev/null; then
    actual=$(sha256sum "$archive_path" | awk '{print $1}')
elif command -v shasum &> /dev/null; then
    actual=$(shasum -a 256 "$archive_path" | awk '{print $1}')
elif command -v sha256 &> /dev/null; then
    actual=$(sha256 -q "$archive_path")
else
    print_error "No SHA-256 tool found (need sha256sum, shasum, or sha256)"
    exit 1
fi

if [ "$actual" != "$expected" ]; then
    print_error "Checksum mismatch for ${archive_name}!"
    exit 1
fi
print_success "Checksum verified"
```

解压后按顺序选择可写目录并安装：

```bash
print_info "Extracting..."
tar -xzf "$TMP_DIR/${BINARY_NAME}.tar.gz" -C "$TMP_DIR"

if [ -w "/usr/local/bin" ]; then
    INSTALL_DIR="/usr/local/bin"
elif [ -w "$HOME/.local/bin" ]; then
    INSTALL_DIR="$HOME/.local/bin"
elif [ -w "$HOME/bin" ]; then
    INSTALL_DIR="$HOME/bin"
else
    print_error "No writable installation directory found"
    exit 1
fi

print_info "Installing to $INSTALL_DIR..."
mv "$TMP_DIR/${BINARY_NAME}" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/${BINARY_NAME}"
"$INSTALL_DIR/${BINARY_NAME}" --version
```

## 更新器与 Web 启动源码摘录

`cmd/tuios/update.go`：

```go
type companion struct {
	name   string // base name, no extension
	present bool  // found beside the main binary
}

func releaseTarget(build *buildinfo.Info) (string, companion, error) {
	webPath := filepath.Join(filepath.Dir(self), companionName)
	webPresent := fileExists(webPath)
	...
	latest, err := fetchLatestRelease(repo, pre, githubToken())
	...
	wantAssets := 1
	if web.present {
		wantAssets++
	}
	assets, err := findAssets(latest, web.present, wantAssets)
	...
	checksums, err := fetchChecksums(latest, repo, githubToken())
	...
	verifyChecksum(tuiosArchive, expected, checksums)
	...
	newTuios, err := extractTuios(tuiosArchive)
	...
	if web.present {
		verifyChecksum(webArchive, expected, checksums)
		newWeb, err := extractCompanion(webArchive, web.name)
		...
	}
	...
	if err := install(self, newTuios); err != nil {
		return fmt.Errorf("installing tuios: %w", err)
	}
	if web.present {
		webPath := filepath.Join(filepath.Dir(self), companionName)
		if err := install(webPath, newWeb); err != nil {
			return fmt.Errorf("installing %s: %w", companionName, err)
		}
	}
}

func fetchLatestRelease(repo string, pre bool, token string) (release, error) {
	var latest release
	if err := getJSON(releaseURL(repo, pre), token, &latest); err != nil {
		return release{}, fmt.Errorf("checking the latest release on GitHub: %w", err)
	}
	return latest, nil
}

func fetchChecksums(latest release, repo string, token string) ([]byte, error) {
	u := assetURL(latest, repo, "checksums.txt")
	body, err := fetch(u, token)
	...
}
```

`cmd/tuios-web/main.go`：

```go
webFlags = []cli.Flag{
	&cli.StringFlag{
		Name:  "port",
		Usage: "Web server port",
		Value: "7681",
	},
	&cli.StringFlag{
		Name:  "host",
		Usage: "Web server host (localhost)",
		Value: "localhost",
	},
	&cli.StringFlag{
		Name:  "default-session",
		Usage: "Default session name for all connections (creates shared session)",
		Value: "web",
	},
}

tuiosArgs = buildTUIOSArgs(flagVals, extraArgs)
sessionName := flagVals["default-session"].(string)
if flagVals["ephemeral"].(bool) {
	sessionName = ""
}

// TUIOS needs a real PTY: the Ink renderer writes terminal queries
// (DECRQM, Kitty keyboard) to stdout and reads the answers back on stdin,
// which only works over a terminal. Runs unbuffered so queries and the
// alternate-screen sequence flow immediately.
// Frames arrive as serialized VT output, which we pass through to the
// browser as binary.
```

## 证据边界

以上网页摘录来自当前官方页面，脚本和源码摘录来自当前 `main` 分支。发布日期未在页面中声明，因此元数据为 `Unknown`。本文件只保留用于 Wiki 结论的相关原文，不包含本机密钥、token 或密码。
