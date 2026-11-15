# TUIOS Web 与安装升级

> Sources: Gaurav-Gosain TUIOS 官方 Web 文档与源码, 2026-10-31; Gaurav-Gosain sip README, 2026-10-17; Herdr 官方远程访问文档, 2026-10-17; 本机安装与端口实测, 2026-10-31; 后续会话核对, 2026-11-01; sip v0.10.0 字体隔离测试, 2026-11-15; tuios v0.13.1 与 sip v0.10.0 release notes、本机 go version -m 与 uv-bun 实测, 2026-11-16
> Raw: [Web 官方文档、安装器与更新器](../../raw/terminal-multiplexers/2026-10-17-tuios-web-official-docs-and-installer.md); [本机安装、认证与更新](../../raw/terminal-multiplexers/2026-10-17-tuios-web-local-install-and-auth.md); [独立运行与 sip](../../raw/terminal-multiplexers/2026-10-17-tuios-web-standalone-and-sip.md); [Herdr 远程访问与端口](../../raw/terminal-multiplexers/2026-10-17-tuios-herdr-web-access-and-ports.md); [TUIOS 0.12.0 配置 schema 与持久化](../../raw/terminal-multiplexers/2026-10-31-tuios-0.12.0-config-schema-and-persistence.md); [后续来源记录](../../raw/terminal-multiplexers/2026-11-01-tuios-web-runtime-graphics-and-font.md); [sip 字体匹配与 Console 验证](../../raw/terminal-multiplexers/2026-11-15-sip-maple-font-resolution-and-console.md); [tuios 0.13.1 升级语义、sip 依赖与 uv-bun 集成](../../raw/terminal-multiplexers/2026-11-16-tuios-0-13-1-sip-dependency-and-uv-bun.md)
> Updated: 2026-11-16

## Overview

`tuios-web` 是独立发布的浏览器终端服务器。本文保留早期安装记录；本次 v0.12.1 核对使用 sip v0.10.0，浏览器由 WebTerm 绘制文字与图形。Web 二进制包含 TUIOS 核心逻辑。

## 使用体验与组成

浏览器打开服务地址后，可以看到 TUIOS 的窗口、布局、状态栏和 agent 状态。默认所有浏览器连接共享名为 `web` 的持久会话：关闭标签页不会终止 pane 中的程序，重新打开后可以继续操作。多个标签页和设备默认看到的是同一组窗口。

各组件的职责是：

| 组件 | 用户可感知的作用 |
|---|---|
| `tuios-web` | 把 TUIOS 接入浏览器，管理 Web 启动参数 |
| `sip` | 管理 PTY、会话、传输、TLS、认证和剪贴板 |
| `webterm` | 提供 sip 内嵌的浏览器客户端 |
| WebTerm | 本次版本在浏览器中处理文字、图形、输入、选择和 scrollback；早期 xterm.js 描述是旧版本记录 |

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

> **Status: Outdated** (2026-11-16)
> `uv-bun` 第 3 段 self-update 已加入 tuios，标题为 `self-update (herdr, hc, umans, rtk, plannotator, witr, sip, tuios)`；版本过期时执行 `tuios update`，该命令在与 tuios 同目录时同时替换 tuios 与 tuios-web 两个二进制。依据见 [tuios 0.13.1 升级语义、sip 依赖与 uv-bun 集成](../../raw/terminal-multiplexers/2026-11-16-tuios-0-13-1-sip-dependency-and-uv-bun.md)与文末「uv-bun 覆盖与 tuios 0.13.1 升级语义」。

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
- [sip v0.10.0 使用参考](sip-v0.10.0-usage-reference.md)
- [ttyd 与 sip 并存部署](ttyd-and-sip-side-by-side.md)

## 本次连接与图形核对

客户端连接记录指向 tuios-web(310412)，OMP 由 TUIOS daemon 的窗格 shell 启动。ttyd 是启动 Web 服务的 shell 的祖先，不等同当前页面渲染入口。PID 属于当次观察。

服务器生成终端输出，sip 传给浏览器，WebTerm 绘制文字和 Kitty 图形；v0.12.1 Web 侧配置 SIXEL 转 Kitty。OMP 图片演示已生成并输出，但没有取得浏览器画面确认，不记录为目视通过。

## Maple 字体设置

该版本 `tuios-web` 没有 `--font-family` 参数。sip 前端的 `setOptions` 可以调整当前页面的字体名称；TUIOS Web 中的实际字形尚未测量。字体需供运行浏览器的系统使用，WSL 安装字体不会自动提供给 Windows 浏览器。

独立 sip v0.10.0 的字体名称与实际字形可能不同，原因及 Chrome Console 临时操作见 [sip v0.10.0 使用参考](sip-v0.10.0-usage-reference.md#字体与渲染)。

## uv-bun 覆盖与 tuios 0.13.1 升级语义

本机 `uv-bun` 共十个段落，第 3 段 self-update 于 2026-11-16 加入 tuios。检查方式与 herdr、witr 等一致：取 `tuios --version` 首行 `tuios version X.Y.Z` 与 GitHub `Gaurav-Gosain/tuios` 最新 release 对比（tuios 的版本输出是多行格式，需专用正则，与其他工具的整行匹配不同）；过期时执行 `tuios update`。`bun test` 行为测试 1 pass 0 fail，耗时 49.8 秒。

`tuios update` 只更新 release archive 安装的二进制并校验发布页 checksum；包管理器、Homebrew、Nix store、Go tool 拥有的副本拒绝覆盖。

0.13.1 的升级语义与 0.12.1 不同：

- 0.12.1 的 daemon 早于 live upgrade 机制，升到 0.13.1 必须执行一次 `tuios restart-server`；这次重启会终止 pane 内程序，会话带原布局与每 pane 最后 1000 行历史回来，shell 是新的。
- 从 0.13.1 起，后续升级在 macOS 与 Linux 上用 `tuios daemon upgrade` 完成，daemon 换到新构建且 pane 内程序全部保留运行。

本机两个二进制已是 0.13.1（`Built: 2026-11-15T03:31:54Z`），daemon 尚未重启，仍跑 0.12.1 构建。

## 0.13.1 用户可见默认变化

以下条目来自 v0.13.1 release notes，daemon 未重启，未在运行实例上复测：

- **Cell frames 默认开启**：在运行 tuios 的终端上按 cell 增量发帧，Windows、SSH 与网页客户端除外；200x60 窗口敲一键的帧耗时从 1023 us 降到 205 us，分配次数从 792 降到 376。画面异常时设 `appearance.cell_frames = "off"` 或环境变量 `TUIOS_CELL_FRAME=0`。
- **bash/zsh pane 默认注入 OSC 133 提示符标记**，不改用户 shell 文件；`[shell] integration = "off"` 可关闭。
- **agent 用量限流独立为 `limit_reached` 状态**（此前归入 `errored`），等待 `errored` 的脚本需改判断。
- **hook 直连 daemon socket**：升级后需重跑 `tuios integration install` 换新 hook，事件经 `nc -U`/`socat` 发送，不再每次起一个完整 tuios。
- 稀有 Mermaid 图类型移到 `sketch` 插件，八种常见类型仍在主程序。
- 从源码构建需要 Go 1.27.4 toolchain，ghostty 后端用 libghostty-vt 1.0.1。

0.13.1 新增配置键（`appearance.cell_frames`、`[shell] integration` 等）目前只有 release notes 级证据；待 daemon 重启后用 `tuios list-options --json` 与 0.12.0 的 271 项基线比对，再更新配置类文章。

## sip 与 tuios 的依赖和抽离关系

tuios 仓库创建于 `2025-09-06T18:13:51Z`，sip 仓库创建于 `2025-12-02T19:09:04Z`（GitHub API `created_at`）；sip README 自述它是从 TUIOS 抽出的 Web 终端功能。依赖方向单边：`tuios` 二进制的模块依赖表中没有 sip，`tuios-web` 经 `go.mod` 依赖 `github.com/Gaurav-Gosain/sip v0.10.0`（2026-11-16 本机 `go version -m` 实测）。

Web 层的更新顺序是 `webterm`（前端 JS，内含 kitty overlay 等）打包进 `sip` 发版，`tuios` 再升级 `go.mod` 里的 sip 版本号。sip v0.10.0 的可选 worker 引擎（libghostty-vt 加 WebGL2 放进 Web Worker）release notes 实测数字：50 MiB 输出下主线程耗时 6,788 ms 降到 190 ms，最长帧间隔 250 ms 降到 16.8 ms。`tuios` 本体的窗口管理、快捷键、agent 看板等逻辑不经过 sip。

`Gaurav-Gosain/tuios-web` 没有独立仓库，tuios-web 的发布 tarball 是 tuios release 的第二个资产；`tuios update --help` 原文写明两个二进制「move together or not at all」。
