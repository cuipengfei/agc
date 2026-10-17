# TUIOS、Herdr 的远程访问与端口记录

> Source: https://herdr.dev/docs/how-to-work/ ; https://herdr.dev/docs/persistence-remote/ ; https://github.com/tsl0922/ttyd/blob/main/src/server.c ; https://github.com/Gaurav-Gosain/tuios/blob/main/cmd/tuios-web/main.go ; 本机进程与监听检查
> Collected: 2026-10-17
> Published: Unknown

## Herdr 官方远程访问文档摘录

### How to work with Herdr

```text
Use Herdr from your phone

Your agents keep working even when you are away from your desk. Herdr has no mobile app and no web dashboard — your phone connects over SSH instead, which works from anywhere your server is reachable and needs nothing extra installed on it.

The terminal has two parts: a client you see, and a server that owns the terminals. herdr starts both. The server is the part that matters for your phone: it is what keeps your agents alive. The server must already be running on your computer — start it with herdr or herdr server. To check:

herdr status

Two choices, depending on what your phone can do. Both get you into the same live session.

Simplest: a plain SSH client (Terminus, Termius, Prompt, Blink, or similar) and on the server:

herdr

That gives you the whole workspace: every terminal, the agent list, status badges, the sidebar — exactly what is on your desktop, and you can scroll it just the same.

The menu that is not the status line

The menu is opened by Ctrl+J, not by Ctrl+S as some older docs say. If Ctrl+J does nothing, your SSH client is probably swallowing it — try the on-screen menu button if it has one, or remap the key.

Better: attach a Herdr client over SSH (Blink, or a desktop you SSH from), so the sidebar and badges render locally instead of being pushed through the remote terminal:

herdr --remote user@host

You need the herdr binary on both ends for this.
```

### Persistence and remote access

```text
Persistence and remote access

Herdr separates the client you see from the server that owns the terminals, so a disconnect is not a disaster. Reattach and everything is where you left it — including from another machine.

The model: the server owns your terminals

herdr starts a local client and a local server. The client is only a viewer; the server owns the panes, scrollback, and agent processes.

Close your laptop, lose Wi-Fi, kill the client — the server keeps running. Reattaching with herdr finds the live session and drops you back into it.

Each workspace, tab, and agent gets a stable ID (w1, w1:t1, w1:p1) that survives across detach and reattach.

Remote access

herdr --remote <ssh-target> connects a local Herdr client to a remote Herdr server over SSH. You get the full UI — sidebar, agent statuses, notifications — rendered locally, with the agents running on the remote host.

herdr --remote dev@my-server
herdr --remote dev@my-server --session build

Attach directly to a single remote terminal without the full workspace UI:

herdr terminal attach <terminal-id> --remote dev@my-server
```

## 默认端口的一手定义

ttyd `src/server.c` 的帮助文本包含：

```c
"  -p, --port              Port to listen (default: 7681, use `0` for random port)\n"
```

TUIOS `cmd/tuios-web/main.go` 包含：

```go
&cli.StringFlag{
	Name:  "port",
	Usage: "Web server port",
	Value: "7681",
},
```

官方 Web 文档同时说明 TLS 模式下会使用相邻 UDP 端口供 WebTransport 使用。

## 本机进程和监听实测

用户提供：

```text
PID 194 root /usr/bin/ttyd -W -p 7681 -T xterm-256color -t enableSixel true -t fontSize 14 -t fontFamily Maple Mono NF CN, monospace -I /home/cpf/.local/share/ttyd/index-osc52.html login -f cpf
```

本机 `ss -tlnp 'sport = :7681'`：

```text
State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process
LISTEN 0      4096         0.0.0.0:7681      0.0.0.0:*
```

这说明 ttyd 当时监听所有 IPv4 地址的 TCP 7681，包括本机回环地址。默认 `tuios-web` 也选择 TCP 7681，因此两者不能直接以默认配置同时监听同一地址。

本会话曾检查 TCP 7683 与 UDP 7684，当时均未监听，并据此建议：

```bash
tuios-web --port 7683
```

用户后来提供进程列表：

```text
PID 422321 cpf pts/12 tuios-web --port 7682
```

撰写本材料时再次检查，PID 422321 已不存在，TCP 7682 没有监听。这里只记录当时和现在的观察，不把当前状态倒写成此前状态。

## Herdr 本机版本

用户提供：

```text
herdr 0.9.5
```

`herdr --help` 列出本机终端、命名会话、SSH machine、remote attach、server、API、workspace、pane 与 agent 命令，没有 Web 页面服务命令。该帮助输出与官方文档相互支持，但未检查第三方插件是否提供额外浏览器桥接。

## 证据边界

- 两个项目都采用 7681 是一手源码事实。
- 当前官方材料没有解释 TUIOS 是否刻意沿用 ttyd 的默认端口，因此选号动机未确认。
- Herdr 没有内置 Web dashboard 的结论限定为官方文档和本机 0.9.5 命令面，不覆盖第三方扩展。
