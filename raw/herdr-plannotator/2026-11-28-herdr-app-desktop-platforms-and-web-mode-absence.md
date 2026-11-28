# Herdr App 桌面平台范围与 web 客户端缺席：官方摘录

> Source: https://herdr.dev/download/；https://herdr.dev/core/；https://herdr.dev/ 首页；herdrdev/herdr-app README（master 分支）；本机 herdr 0.9.5 的 --help 输出
> Collected: 2026-11-28
> Published: Unknown

## 下载页的桌面平台段

来源：https://herdr.dev/download/

> Download for Mac Apple silicon · or install from the terminal:
>
> $ curl -fsSL https://releases.herdr.dev/app/install.sh | sh
>
> $ powershell -c "irm https://releases.herdr.dev/app/install.ps1 | iex"
>
> macOS Apple silicon. Download the .dmg and drag Herdr to Applications, or use the line.
>
> Linux x86_64 and arm64. Adds Herdr to your app launcher.
>
> Windows x86_64. Adds a Start menu entry.
>
> iPhone, iPad and Android See who needs you and answer from your phone. It connects to herdr-core on your machines over SSH (not Herdr TUI).
>
> Only want the runtime, for servers or your own client? Get herdr-core on its own

下载页全页没有 web/浏览器客户端入口。

## herdr-app README 的安装与平台要求

来源：https://github.com/herdrdev/herdr-app/blob/master/README.md

> Herdr is a desktop app for terminals and coding agents. Keep work in spaces, see which agents need you, and leave terminals running when you close the window.

> Linux needs a desktop session and a working Vulkan driver. macOS builds are available for Apple Silicon; Intel Mac users can build from source. Linux builds are x86-64 and ARM64.

> On macOS (Apple Silicon), you can also install with Homebrew:
>
> brew install --cask herdr-app

> Run in PowerShell on x64 Windows with curl and tar installed (Windows 10 1803 or newer):
>
> irm https://releases.herdr.dev/app/install.ps1 | iex

README 全文没有 web/browser 客户端形态的入口。

## core 页的 Build your own client

来源：https://herdr.dev/core/

> Build your own client
>
> The Herdr app is one client. The same API is open to yours: a phone app, an editor panel, a Stream Deck. hc schema prints it as OpenRPC, with streams and events for live updates.

同页另一句：

> herdr-core draws nothing and guesses nothing.

## 首页的远程访问路径

来源：https://herdr.dev/

> They run on your machines, not in a window. Check on them from the app on any computer or from your phone, at home or away. Herdr connects over SSH, and Tailscale works too.

首页 FAQ 的平台范围（macOS Apple silicon、Linux x86_64 and arm64、Windows x86_64、手机 iPhone/iPad/Android）与 2026-11-12 raw 的摘录相同，不再重复抄录；首页同样没有 web 客户端入口。

## 本机 herdr 0.9.5 --help 命令面

来源：本机 herdr 0.9.5 的 `herdr --help` 输出，2026-11-28 捕获

```text
herdr — terminal workspace manager for AI coding agents

Usage: herdr [options]
       herdr --session <name> [options]
       herdr --machine <label-or-id> <command>
       herdr --remote <ssh-target> [--session <name>]
       herdr session attach <name>
       herdr completion zsh
       herdr update [--handoff]
       herdr channel set <stable|preview>
       herdr machine <subcommand> ...
       herdr server stop
       herdr server reload-config
       herdr api <subcommand> ...
       herdr completion <shell>
       herdr config <subcommand> ...
       herdr channel <subcommand> ...
       herdr workspace <subcommand> ...
       herdr worktree <subcommand> ...
       herdr tab <subcommand> ...
       herdr notification <subcommand> ...
       herdr agent <subcommand> ...
       herdr pane <subcommand> ...
       herdr session <subcommand> ...
       herdr integration <subcommand> ...

Common commands:
  herdr                            Launch or attach to the persistent session
  herdr status [server|client]     Show local client and running server status
  herdr update                     Download and install the latest version
  herdr completion zsh             Generate shell completions for zsh
  herdr server stop                Stop the running server via the API socket
  herdr channel set <stable|preview> Choose the stable or preview update channel
  herdr server reload-config       Reload config.toml in the running server
  herdr config reset-keys          Back up config.toml and remove custom keybindings
  herdr channel <subcommand>       Manage the stable or preview update channel
  herdr machine <subcommand>       Manage saved SSH machines
  herdr api <subcommand>           Inspect socket API metadata and live runtime state
  herdr workspace <subcommand>     Workspace helpers over the socket API
  herdr worktree <subcommand>      Git worktree helpers over the socket API
  herdr tab <subcommand>           Tab helpers over the socket API
  herdr notification <subcommand>  Notification helpers over the socket API
  herdr agent <subcommand>         Agent/terminal helpers over the socket API
  herdr pane <subcommand>          Pane control helpers over the socket API
  herdr session <subcommand>       Manage named persistent sessions
  herdr integration <subcommand>   Manage built-in agent integrations

Advanced commands:
  herdr server                     Run as headless server

Options:
  --session <name>    Use or create a named persistent session
  --machine <label-or-id>  Run an API command on a saved SSH machine
  --remote <target>   Attach through SSH to a remote Herdr server
  --remote-keybindings <local|server>
                      Keybindings for --remote app attach (default: local)
  --handoff           Opt into live handoff for update or remote attach
  --default-config    Print default configuration and exit
  --skill             Print the agent skill file and exit
  --version, -V       Print version and exit
  --help, -h          Show this help

Config: /home/cpf/.config/herdr/config.toml
Logs:   /home/cpf/.config/herdr/sessions/sec/herdr.log (plus herdr-client.log, herdr-server.log)
Env:    HERDR_CONFIG_PATH overrides config file path
Home:   https://herdr.dev
```

命令面没有 web/HTTP 服务类命令：`server` 是 headless server，`api` 查看 socket API 元数据与运行状态，均非 HTTP 服务。

## 本次核查范围（2026-11-28）

来源：本会话只读查询

- 读取 https://herdr.dev/、https://herdr.dev/download/、https://herdr.dev/core/ 与 herdrdev/herdr-app、herdrdev/herdr-core 两份 README；这些入口当日内容里都没有网页服务或浏览器客户端。
- herdr-core README 的机制摘录（hc schema、hc connect over stdin and stdout including through SSH）已在 2026-11-12 的 raw 中保存，本文不重复。
- Herdr App 未实机安装；平台与安装细节全部来自上述官方页面与 README 文字。
- 「没有 web 客户端」是对当日入口内容的缺席核查；官方未就未来是否提供 web 客户端作声明。
