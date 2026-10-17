# TUIOS Web 独立运行与 sip 组成

> Source: https://github.com/Gaurav-Gosain/tuios/blob/main/cmd/tuios-web/main.go ; https://github.com/Gaurav-Gosain/sip
> Collected: 2026-10-17
> Published: Unknown

## TUIOS Web 启动源码摘录

`cmd/tuios-web/main.go` 的包声明与导入：

```go
// cmd/tuios-web is the standalone web terminal server for TUIOS.
// Serves TUIOS through a browser with full terminal emulation.
package main

import (
	"crypto/subtle"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/charmbracelet/log"
	"github.com/charmbracelet/x/exp/term/ansi"
	sip "github.com/Gaurav-Gosain/sip"
	"github.com/Gaurav-Gosain/tuios/internal/app"
	"github.com/Gaurav-Gosain/tuios/internal/buildinfo"
	"github.com/Gaurav-Gosain/tuios/internal/config"
	"github.com/Gaurav-Gosain/tuios/internal/session"
	"github.com/Gaurav-Gosain/tuios/internal/terminal"
	uv "github.com/charmbracelet/ultraviolet"
)
```

会话创建逻辑：

```go
if flagVals["ephemeral"].(bool) {
	// Ephemeral mode: single-process, no daemon.
	// Creates fresh TUIOS per connection (original behavior).
	srv := sip.New(
		sip.RunProgram(createTUIOSProgram(tuiosArgs, true, logger)),
		sip.WithAddress(":"+flagVals["port"].(string)),
		sip.WithHostname("localhost"),
		sip.WithLogger(logger),
		sip.WithClock(fixedClock),
	)
	logger.Info("Starting in ephemeral mode (no session persistence)")
	if err := srv.ListenAndServe(); err != nil {
		return fmt.Errorf("server error: %w", err)
	}
} else {
	// Daemon mode (default): shared persistent session.
	// Creates TUIOS once when session is created, PTY stays alive
	// across browser disconnects.
	srv := sip.New(
		sip.RunProgram(createTUIOSProgram(tuiosArgs, false, logger)),
		sip.WithDaemonMode(sip.DaemonConfig{
			Session:   sessionName,
			SocketDir: session.SocketDir(),
			StateDir:  session.StateDir(),
		}),
		sip.WithAddress(":"+flagVals["port"].(string)),
		sip.WithHostname("localhost"),
		sip.WithLogger(logger),
		sip.WithClock(fixedClock),
	)
	if err := srv.ListenAndServe(); err != nil {
		if strings.Contains(err.Error(), "daemon not running") ||
			strings.Contains(err.Error(), "connection refused") {
			logger.Warn("Daemon mode failed, falling back to ephemeral mode", "error", err)
			logger.Info("For persistent sessions, start the daemon: tuios start-server")
			fallbackSrv := sip.New(
				sip.RunProgram(createTUIOSProgram(tuiosArgs, true, logger)),
				sip.WithAddress(":"+flagVals["port"].(string)),
				sip.WithHostname("localhost"),
				sip.WithLogger(logger),
				sip.WithClock(fixedClock),
			)
			if err := fallbackSrv.ListenAndServe(); err != nil {
				return fmt.Errorf("server error: %w", err)
			}
		} else {
			return fmt.Errorf("server error: %w", err)
		}
	}
}
```

Web 启动参数也包含全部 TUIOS 外观和快捷键相关 flags。官方文档说明这些 flags 会传给生成的 TUIOS 实例。

## sip README 原文摘录

# sip

Serve terminal applications through the browser. Handles PTY, session persistence, multi-client, security, and clipboard. Renders with xterm.js.

`sip` is the Go library (and CLI) for exposing TUI applications through a browser. Point it at a command — or a Bubble Tea program — and every browser that connects gets a live terminal, backed by a real PTY on the host.

Originally extracted from the web terminal server in [tuios](https://github.com/Gaurav-Gosain/tuios).

## Features

- **Two protocols** — WebTransport (HTTP/3 over QUIC) with automatic WebSocket fallback. xterm.js rendering on the client, WebGL when available.
- **Your own PTY** — runs any command on the host, not just Bubble Tea. Respects terminal size, forwards resizes, handles process death cleanly.
- **Persistent sessions** — opt-in daemon mode keeps the PTY alive across browser disconnects. Reconnect from another device and the session is still there.
- **Multi-client** — any number of browsers can attach to the same session. Smallest-client-wins sizing, most-recent-input-wins focus, scrollback replay on join.
- **Security by default** — loopback-only by default. TLS (with auto-generated self-signed certs), password auth with constant-time compare, Host-header validation, rate-limited auth, strict password file permissions. Binds off-loopback only when explicitly asked.
- **Clipboard** — OSC 52 in both directions. Writes from the program reach the browser clipboard, and paste from the browser reaches the program. Same-origin policy on the web side, no extra native helpers.
- **Kitty graphics pass-through** — programs that emit Kitty graphics work as-is, no translation needed.
- **Mobile-ready** — touch keyboard bar, responsive layout, works on phones and tablets.
- **Single binary** — the client (xterm.js, fonts, HTML/JS) is embedded via `go:embed`. No CDN, no node_modules, no build step for consumers.

## How it works

```
┌──────────┐    WebTransport / WebSocket    ┌──────────┐      ┌─────────┐
│ Browser  │ ◄──────────────────────────────►│   sip    │ ───► │   PTY   │
│ xterm.js │   binary (VT output) + JSON      │  server  │ ◄─── │ (your   │
│          │   (resize, clipboard, ping)      │          │      │  app)   │
└──────────┘                                  └──────────┘      └─────────┘
```

The browser client (xterm.js + WebGL addon) renders the terminal, the Go server owns the PTY and the session, and bytes between them are mostly raw VT output — no JSON wrapping of every frame. Control messages (resize, clipboard, ping/pong) use a separate JSON channel.

## The bundled client

The browser client lives in its own repo — [Gaurav-Gosain/webterm](https://github.com/Gaurav-Gosain/webterm). `sip` vendors its build output here (`client/webterm.js` and `client/index.html`) via `go:embed` so consumers get a single binary.

That split keeps the JS/TypeScript iteration loop (bun, xterm.js addons, Vite) out of the Go module while making the browser side independently reusable: `webterm` can be embedded by other projects, not just `sip`.

Upstream `webterm` already bundles xterm.js, its addons, the Kitty graphics overlay, clipboard, transports, and touch keys — `sip` adds only the Go-side plumbing (PTY, sessions, TLS, auth, asset serving).

## 独立运行结论的证据边界

- `tuios-web` 源码直接导入 TUIOS 的内部应用包并创建程序，没有调用外部 `tuios` 可执行文件的启动路径。
- 官方安装脚本只安装 `tuios-web`。
- 本会话没有删除或隐藏现有 `tuios` 后做独立运行实验；独立运行结论来自源码与安装器，不是删除依赖后的实测。
