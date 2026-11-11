# Herdr App、herdr-core 与手机：官方摘录和会话查询范围

> Source: Herdr 官方网站、herdrdev/herdr-core 文档、Google Play 官方应用条目，以及本次会话的只读查询记录；各节注明具体来源
> Collected: 2026-11-12
> Published: Unknown

## 桌面 App 定制与 Herdr TUI 的关系

来源：https://herdr.dev/

### 宣传语和定制说明

> One sentence in. A different app out.
>
> Ask your agent to change Herdr.
>
> No two Herdrs look alike.
>
> Herdr is a native app for running coding agents. Your agent can change any part of it, from the sidebar to whole new panels. Close it and your agents keep working.
>
> Herdr keeps its layout, sidebar, tabs, keys and themes as plain files in `~/.config/herdr-app`. An `AGENTS.md` in there explains them to your agent. You say what you want and your agent writes it.

### FAQ：How is it different from Herdr TUI?

> Herdr TUI is the original Herdr: a terminal app with its own server. This is a new, separate program built on herdr-core. They don't share agents, so what runs in one doesn't show up in the other. Herdr TUI keeps working, and everything for it is at herdr.dev/tui.

### FAQ：Which systems does it run on?

> macOS (Apple silicon), Linux (x86_64 and arm64) and Windows (x86_64). Other machines join over SSH, whatever they run. On your phone: iPhone, iPad and Android, from the App Store and Google Play.

## 手机连接、显示和操作

来源：https://herdr.dev/mobile/

### Inbox

> The Inbox lists every agent on every machine, sorted by what it needs from you: needs you, done, working, idle. A blue dot means you haven't read it yet.

### Answer it

> Open an agent and you're in its real terminal. Type straight in, like on your laptop. The key bar has Esc, Ctrl, Tab and the arrows, and you can change what's on it.
>
> For more than a few words, open compose: write, paste text or a screenshot, attach photos, or dictate. It goes to the agent as one paste, then Enter.
>
> Dictation runs on your phone with a speech model you download once, or with Apple's or Google's speech engine if you prefer.

### Your spaces

> The spaces you made in the Herdr app show up on your phone, each tab drawn as a small map of its panes. Open one to watch its panes or to start a new terminal there. Watching from the phone never resizes anything on your computer.

### How it connects

> Your phone talks to herdr-core on each machine over SSH. There's no Herdr account and no server of ours in between.
>
> Connect one machine, and Herdr offers the others it knows about: the machines Herdr there already uses, the hosts in your SSH config and your Tailscale devices. Away from home, Tailscale or any VPN gets you there, and Tailscale SSH works without setting up a key.

### FAQ：What do I need on my computer?

> herdr-core, the runtime under Herdr. It comes with the Herdr app, or you can install it on its own. Terminals and agents show up either way; spaces show up when the Herdr app runs there too.

### FAQ：Does it work with Herdr TUI?

> No. The phone app talks to herdr-core, the runtime the Herdr app is built on. Herdr TUI runs its own server, so agents started there don't show up on your phone. Both can run on the same machine.

### FAQ：Which agents does it show?

> The same ones as the Herdr app: every terminal on your machines is there, and agents that report their status through OSC 7501 land in the Inbox, sorted by whether they're working, done or need you.

## Android 官方应用和登录方式

来源：https://play.google.com/store/apps/details?id=dev.herdr.app

应用名称：Herdr。开发者：Herdr, Inc.。应用 ID：`dev.herdr.app`。

### YOUR MACHINES, NO ACCOUNT

> Connect one machine by its name or address. The app makes its own SSH key on the phone; add it to the machine once, or use Tailscale SSH and skip that step. The machines that computer already knows come along. Your terminals go straight between your phone and your machines and never pass through us. No sign-in, no ads, no tracking.

### REAL TERMINALS

> Tap an agent and you're in its actual terminal, drawn the same way your desktop draws it, in your Ghostty theme. Type straight into it, use the key bar for Esc, Tab, Ctrl and the arrows, select and copy text, and see the images agents print.


### WORKS WITH YOUR AGENTS

> Herdr knows Claude Code, Codex, Amp, OpenCode and Pi, and any other program shows up as a plain terminal.

### 运行要求

> Herdr needs herdr-core on each computer you connect. Get it at herdr.dev.

## 手机隐私与可选语音服务

来源：https://herdr.dev/privacy/

页面注明：Last updated November 2, 2026。

> The app talks only to the machines you add, over SSH. Your terminals go between your phone and your machine and never pass through us. There's no sign-in, no ads, no tracking and no analytics.
>
> Dictation runs on your phone. If you pick Apple's or Google's speech engine instead, their privacy policies apply. Speech models download once from huggingface.co and github.com.

## 官方下载范围

来源：https://herdr.dev/download/

> iPhone, iPad and Android
>
> See who needs you and answer from your phone. It connects to herdr-core on your machines over SSH (not Herdr TUI).

Android 下载链接：https://play.google.com/store/apps/details?id=dev.herdr.app

## core 的使用形态与普通程序

来源：https://github.com/herdrdev/herdr-core/blob/master/README.md

> `hc` runs programs and coding agents in terminals that stay alive after you leave.
> Agents can start other agents, send them work, and hear back; you can attach to any terminal and take over.
>
> Core draws nothing. Use it from your shell, an agent, or your own app.

### Run it and come back

```sh
hc run cargo test                  # stream output and wait for it
hc run --bg --name web bun dev     # start it and return
hc ls                             # see live terminals
hc attach web                     # take over; Ctrl+\ detaches
hc read web --lines 100            # read without attaching
```

> Closing your viewer does not end the program.

### Default shell

> With no program, `hc run --bg` starts the machine's shell: `$SHELL` (or `/bin/sh`) on Unix, PowerShell 7 on Windows if available, else Windows PowerShell.

### Every machine

> Programs and files stay on that machine. Your local core brings its terminals into the same list.

### Build your own client

> `hc schema` prints the request/response API as OpenRPC with JSON Schema.
> The API docs cover connecting, terminal streams, events, and status.
> Use `hc connect` to carry the protocol over stdin and stdout, including through SSH.

## 命令帮助中的选择菜单、运行和连接

来源：https://github.com/herdrdev/herdr-core/blob/master/docs/commands.md

该文档注明：Generated from the built binary's help。

### hc

```text
hc - run programs and coding agents in terminals that stay alive

Usage: hc <command> [options]
       hc               pick a terminal and attach (new… on top)
```

```text
  run <cmd|template> [task]   run it and wait like a shell (--bg: don't wait)
  ls                          list live terminals (--all: finished too)
  attach [t]                  put this terminal on it (ctrl+\ detaches)
  server start|stop|status|restart
  connect                     the API over stdin/stdout (ssh box hc connect)
```

### hc 辅助说明

来源：本次会话已读取的 DeepWiki herdrdev/herdr-core 说明，作为辅助资料，与官方 README 和命令文档分开标注。

> If not in interactive terminal (such as through pipe), displays terminal list and common commands.


### hc attach

```text
Put this terminal on a core terminal (detach: ctrl+\)

Usage: hc attach [OPTIONS] [TERMINAL]

Arguments:
  [TERMINAL]  The terminal: `t7`, a name, or `machine/t7`
```

### hc run

```text
Start a program, or a template by name with its task: hc run reviewer "review src/x.rs"

Usage: hc run [OPTIONS] [ARGV]...

Arguments:
  [ARGV]...  Program and arguments, or a template name and its task. With neither argv nor line: that machine's own shell
```

### hc connect

```text
Speak the protocol over stdin/stdout (`ssh box hc connect`)

Usage: hc connect [OPTIONS]
```

## core 的运行位置与访问权限

来源：https://github.com/herdrdev/herdr-core/blob/master/docs/security.md

### What runs

> The CLI starts a background core when it needs one.
> Holder processes own the terminals so a core restart or update can leave programs running.
> Programs run as the account that runs core, with its filesystem and network access.

### Who can connect

> On Unix, core listens on a local Unix socket, not a public TCP port.
>
> On Windows, core uses named pipes. Their access rules allow the current account and SYSTEM.

### Remote trust

> SSH handles login, host keys, and encryption. Core carries its protocol through that connection.
> A custom connection command must provide its own trust and transport guarantees.
> Core does not add another encryption layer or authenticate a remote user itself.

## 远程连接条件和程序位置

来源：https://github.com/herdrdev/herdr-core/blob/master/docs/machines.md

> The other machine needs hc.

### What runs where

> Your local core keeps the machine connection and combines terminal lists and events.
> The remote core owns its programs, terminal history, and files.

### When something goes wrong

> If the connection closes at once, check that the remote login prints no extra text to stdout. The connection carries a byte protocol, not a terminal session.
>
> With a custom connection, check that it passes bytes unchanged and does not prompt. Do not request a remote PTY.

## core 的通信协议与正确顺序

来源：https://github.com/herdrdev/herdr-core/blob/master/schema/README.md

### Connecting

> On Unix, core listens on a Unix socket; on Windows, it uses a named pipe.
> `hc connect` speaks the same protocol over stdin/stdout, so `ssh box hc connect` is a remote core.
>
> A connection starts in plain mode: JSON-RPC 2.0, one message per line.
>
> `hello` with `{"framed": true}` switches the connection to framed mode after its reply. Attach needs it; everything else works in both modes.

### Framed mode

> Channel 0 carries JSON-RPC both ways. Calls on it run side by side.

### Attach streams

> `terminal.attach` returns a `channel`. On it the core sends the first paint (the current screen, optional history, the latest status report and title, and `CSI ?9001h` or `l`: whether the program asked for win32-input-mode, as Windows' ConPTY does when it starts), then the program's raw output, minus terminal queries the core already answered.
>
> The viewer sends keys as DATA on the same channel, and RESIZE, FOCUS and FACTS as it changes. The last active viewer sets the size (active: it attached, typed, resized or gained focus); `observe` viewers never type or resize.

### Status

> A terminal's status is whatever its program reported through OSC 7501, the Program Status Protocol (`idle`, `working`, `done`, `blocked`, `error`, ...), stored as reported. hc never infers status from the screen. Programs that don't speak 7501 have no status.

## 本次会话的查询范围与未确认项

来源：本次会话中实际执行的只读查询和已读取页面；此节记录调查范围，不作为厂商能力声明。

- 已读取上述官方页面和文档。Context7 的 `/herdrdev/herdr-core` 与 DeepWiki 用于辅助核对命令和通信说明；结论以官方原文为准。
- 执行 `gh api 'users/herdrdev/repos?per_page=100' --jq '.[] | {name,default_branch,description}'`，返回 `herdr`、`herdr-app`、`herdr-core`、`herdr-layout-examples`、`herdr-nix`。在这次返回的公开仓库列表中没有找到 Android 客户端源码；这项记录不说明其他时间或其他账户是否存在相关源码。
- 已读取手机页和 Google Play 条目，未取得“手机支持桌面 App 那种任意布局和功能面板定制”的明确说明，也未取得“桌面自定义面板能够在手机显示”的明确说明。
- 已搜索 Herdr Android 的 Google Play services、APK、Huawei 相关内容。查询到的官方资料没有明确说明整个应用是否强制依赖 GMS，也没有确认华为兼容性。Google 语音引擎可选这一事实不用于推断整个应用的依赖。
- 已查阅的官方下载页面提供 Google Play 链接，没有提供独立 APK 或华为 AppGallery 链接；此项只描述本次读取的页面。
- 本次读取的官方资料没有取得 Android 最低系统版本说明，也不存在基于 Android 私有源码的系统要求分析。
- 本次未安装程序、未启动服务、未连接设备、未测试手机。查询本机 `hc` 可用性未找到命令，其帮助命令没有执行。上述命令片段来自文档，不作为本机执行结果。
