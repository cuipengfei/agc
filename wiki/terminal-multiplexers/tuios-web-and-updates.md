# TUIOS Web 与安装升级

> Sources: Gaurav-Gosain TUIOS 官方 Web 文档与源码, 2026-10-31; Gaurav-Gosain sip README, 2026-10-17; Herdr 官方远程访问文档, 2026-10-17; 本机安装与端口实测, 2026-10-31
> Raw: [Web 官方文档、安装器与更新器](../../raw/terminal-multiplexers/2026-10-17-tuios-web-official-docs-and-installer.md); [本机安装、认证与更新](../../raw/terminal-multiplexers/2026-10-17-tuios-web-local-install-and-auth.md); [独立运行与 sip](../../raw/terminal-multiplexers/2026-10-17-tuios-web-standalone-and-sip.md); [Herdr 远程访问与端口](../../raw/terminal-multiplexers/2026-10-17-tuios-herdr-web-access-and-ports.md); [TUIOS 0.12.0 配置 schema 与持久化](../../raw/terminal-multiplexers/2026-10-31-tuios-0.12.0-config-schema-and-persistence.md)
> Updated: 2026-10-31

## Overview

`tuios-web` 是 TUIOS 主仓库独立发布的浏览器终端服务器。它在真实 PTY 中运行 TUIOS，通过 WebTransport 或 WebSocket 连接浏览器，由 xterm.js 负责浏览器内的终端显示和输入。Web 二进制已经包含 TUIOS 核心逻辑，可以独立运行；同时安装 `tuios` 和 `tuios-web` 的价值在于分别服务本机终端与浏览器，并让同目录的 release 二进制共同维护版本。

## 使用体验与组成

浏览器打开服务地址后，可以看到 TUIOS 的窗口、布局、状态栏和 agent 状态。默认所有浏览器连接共享名为 `web` 的持久会话：关闭标签页不会终止 pane 中的程序，重新打开后可以继续操作。多个标签页和设备默认看到的是同一组窗口。

各组件的职责是：

| 组件 | 用户可感知的作用 |
|---|---|
| `tuios-web` | 把 TUIOS 接入浏览器，管理 Web 启动参数 |
| `sip` | 管理 PTY、会话、传输、TLS、认证和剪贴板 |
| `webterm` | 提供 sip 内嵌的浏览器客户端 |
| xterm.js | 在浏览器中解释终端输出并处理显示、输入、选择和 scrollback |

`sip` 从 TUIOS 的 Web 终端功能提取而来。浏览器客户端和字体等资源被嵌入发布二进制，使用者不需要另外安装 Node 包或单独部署前端。

## 独立运行与同目录安装

Web 启动源码直接创建 TUIOS 程序，没有依赖外部 `tuios` 命令来启动会话。默认 daemon 模式失败时，还可以进入单进程模式。因此只安装 `tuios-web` 就能提供浏览器中的 TUIOS。

本机选择把两个二进制都放在 `/home/cpf/.local/bin`。这样安排有两个直接效果：

- 本机终端使用 `tuios`，浏览器使用 `tuios-web`。
- `tuios update` 的帮助和源码说明，同目录的 Web 二进制会与主程序共同更新。

本会话只完成过 `0.10.0` 已是最新版本的检查，没有经历一次真实的跨版本联合升级。

## 官方安装脚本与认证下载

官方 `install-web.sh` 的流程是：检测系统和架构，查询最新 release，下载平台压缩包与 `checksums.txt`，验证 SHA-256，解压，选择可写目录，安装并运行版本检查。

本机直接运行官方脚本时，在“Fetching latest release”阶段收到 HTTP `403`。随后对相同 GitHub API 的查询显示匿名请求额度已耗尽。失败发生在版本查询阶段，压缩包下载尚未开始。

临时修改版脚本只改变版本查询和 release 下载：存在 `gh` 时，使用 `gh api` 和 `gh release download`，从而复用已经登录的 GitHub 认证。其余校验、解压和安装步骤保持不变。执行后成功安装：

```text
/home/cpf/.local/bin/tuios-web
tuios-web version 0.10.0
```

安装输出同时包含 `Checksum verified`。

## 更新职责与 token

当前 `uv-bun` 没有直接更新 release-archive 安装的 TUIOS。这个结论只针对脚本当前显式更新逻辑；通用系统包更新可能影响其他由系统包管理器拥有的副本。

`GITHUB_TOKEN` 可以直接从 `gh` 已保存的认证中读取：

```bash
export GITHUB_TOKEN="$(gh auth token)"
tuios update
```

该命令只把 token 放进当前 shell 的环境，不要求把明文 token 写入配置文件。本机设置后，`tuios update` 能查询 release，并报告 `0.10.0` 已经是最新版本。

## 端口冲突

ttyd 与 `tuios-web` 都把 TCP `7681` 作为默认端口。本机 ttyd 还显式使用 `-p 7681`，并监听 `0.0.0.0:7681`，所以默认 Web 启动会遇到监听冲突。

本机曾运行：

```bash
tuios-web --port 7682
```

也可以使用其他空闲端口。TLS 模式下，WebTransport 会使用相邻的 UDP 端口，因此选择端口时要同时考虑两个监听。

两个项目采用相同默认端口是一手源码事实；官方材料没有解释是否刻意沿用，因此历史选号原因未确认。

## 远程访问的安全边界

默认只绑定 `localhost`。绑定 LAN 或公网地址时，官方默认要求 TLS 和密码，例如：

```bash
tuios-web --host 0.0.0.0 --auto-tls --random-password
```

浏览器连接成功后可以取得运行 Web 服务账户的 shell。`--insecure` 和 `--no-auth` 分别允许明文传输和无密码访问，只适用于使用者明确信任的网络。密码文件需要属于当前用户且权限为 `600` 或 `400`。

## 与 Herdr 远程使用的区别

Herdr `0.9.5` 官方远程路径是 SSH 和终端客户端：远程 shell 中运行 `herdr`，或者本地运行 `herdr --remote <ssh-target>`。官方文档明确写着没有 mobile app 和 web dashboard。

TUIOS 则直接提供浏览器页面。Herdr 的后台 server 负责保存 pane 和 agent 状态，本身不提供 HTTP 页面。这一结论没有覆盖第三方插件可能提供的浏览器桥接。

## Web 模式配置持久化（0.12.0）

- `tuios-web` 与 `tuios` 共用 `config.LoadUserConfig()`，从 `$XDG_CONFIG_HOME/tuios/config.toml` 读取配置。
- `internal/app/client_kind.go`：`ClientBrowser` 强制 `ConfigReadOnly = true`。仅浏览器连接时，设置面板（`Ctrl+b ,`）和 `tuios set-config` 不写盘。
- 落盘方式：`tuios config edit`、`tuios keybinds preset/unbind/free`（直接 `config.SaveUserConfig()`）、或让 pane agent 编辑 `config.toml`。
- `ClientBrowser` 仍启用 `startConfigWatch()` 热重载。
- 生效分层：外观/侧栏/Dock/快捷键热重载；新窗口初值仅对新窗口生效；放宽权限类变更需在 TUIOS 外终端 `tuios config apply`（pane 内拒绝）或重启 daemon，收紧权限类变更即时生效；daemon 级需重启。
- 浏览器端设置（传输、渲染器、字号等）保存在 `localStorage["sip-web-settings"]`，不写回宿主 `config.toml`。Auto-TLS 证书在 `~/.config/sip/sip.crt`/`.key`（可 `--cert-dir` 覆盖）。
## 证据边界

- Web 功能、安装器、更新器和独立运行来自官方文档与源码。
- 端口冲突、认证和 token 读取来自本机实测。
- Web 模式配置持久化与生效时机来自源码（`internal/app/client_kind.go`、`internal/session/verb_options.go`、`internal/app/config_watch_test.go`）与 `tuios config apply --help`。
- 安装成功、版本、端口和 token 设置前后的结果来自本机命令输出。
- 联合升级只完成静态确认和已是最新检查，未做跨版本实测。
- 未在移除 `tuios` 命令的环境中做 Web 独立运行实验。
- 不同服务报告不同公网出口地址的具体网络分流原因未确认。
## See Also

- [TUIOS 配置与用户体验](tuios-config-user-experience.md)
- [tuios workspace 与 session rail](tuios-workspace-and-sidebar.md)
- [ttyd 前端编译模型与 xterm 版本锁定](ttyd-frontend-compilation.md)
- [终端图像协议支持矩阵](../terminal-graphics/terminal-image-protocol-matrix.md)
