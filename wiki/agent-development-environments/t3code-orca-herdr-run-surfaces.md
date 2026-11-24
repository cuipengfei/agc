# T3 Code、Orca 与 Herdr TUI 的运行形态和本地化边界

> Sources: T3 Code 官方仓库文档，2026-11-15 查阅；Orca 官方文档与 main 分支源码（vite.web.config.ts）、issue #10687，2026-11-15 查阅；Herdr TUI 官方文档，2026-11-15 查阅；用户本机进程表与 `omp --help` 输出，2026-11-15；三仓 Web 模式功能与安装配置核实，2026-11-24
> Raw: [T3 运行形态与 ACP](../../raw/agent-development-environments/2026-11-15-t3code-surfaces-and-acp.md); [Orca 运行模式与远程服务](../../raw/agent-development-environments/2026-11-15-orca-run-modes-and-remote-servers.md); [Herdr TUI agent 与会话文档](../../raw/agent-development-environments/2026-11-15-herdr-tui-agent-and-session-docs.md); [ttyd + Herdr 本机浏览器观察](../../raw/agent-development-environments/2026-11-15-ttyd-herdr-local-browser-observation.md); [三仓 Web 模式功能与安装配置](../../raw/agent-development-environments/2026-11-24-t3-paseo-orca-web-mode-survey.md)
> Updated: 2026-11-24

三个产品都是「控制 agent 的界面 + 保留 agent 执行的环境」，但四层职责的摆放不同：程序本体跑在哪、控制面（server/daemon）在哪、agent 进程在哪、状态存哪。本文只覆盖 T3 Code、Orca 与 Herdr TUI 三家；Herdr 的 app 产品线（herdr-core + 手机）见 [Herdr App、herdr-core 与手机](../herdr-plannotator/herdr-app-core-mobile.md)，图形客户端 Alma 见 [Alma 桌面应用与 Herdr 集成](../herdr-plannotator/alma-desktop-and-herdr-integration.md)。

## 四层运行拓扑

| 层 | T3 Code | Orca | Herdr TUI |
|---|---|---|---|
| 界面本体 | Electron 桌面应用；本机网页 `http://localhost:3000`；托管网页 `app.t3.codes`；iOS/Android | Electron 桌面应用；浏览器客户端；iOS/Android | 终端 TUI（Linux/macOS/Windows x86_64，ARM64 走仿真） |
| 控制面 | T3 server：桌面应用内置，或 `t3` 启动，或 `t3 service install` 常驻 | 桌面进程，或 `orca serve`（orcad Node server，不可用时回退桌面内 server） | 每台机器一个后台 server |
| agent 进程 | server 所在环境的 provider CLI（Codex、Claude Code、Cursor CLI、Grok Build、Kiro、OpenCode、Antigravity、Pi、Muse Code、fx + ACP） | worktree 内任意 CLI agent | pane 内任意进程 |
| 状态 | `~/.t3/userdata` 数据库（服务模式归服务所有）；`/etc/t3/service.env` | server 拥有 projects、worktrees、terminals、tabs、accounts、sessions | `session.json`、`session-snapshots/`、可选 `session-history.json` |

关键差别：

- T3 的执行永远留在 server 所在环境：「Threads 永远不会在客户端机器上运行 — agent、文件系统和工具都留在 T3 server 所在的环境中。客户端是纯 UI。」桌面、手机、网页都通过已认证 RPC 控制 server。
- Orca 的控制面跟「谁拥有 runtime」走：Local 时是桌面进程；SSH 时桌面留在本机、worktree 在远端；Remote Orca Server 时 runtime 在服务器，桌面、浏览器、手机都是客户端；Cloud VM 每个 worktree 一份。
- Herdr TUI 的客户端就是终端：后台 server 拥有 pane 与进程，客户端断开不影响 agent；没有网页与手机客户端。

## 客户端形态

| 形态 | T3 Code | Orca | Herdr TUI |
|---|---|---|---|
| 桌面 GUI | 有（内置 server） | 有（IDE 式，worktree 卡片 + 分屏） | 无 |
| 本机网页 | 有：`t3` 启动后打开 `http://localhost:3000`；文档另写可在环境上直接用浏览器打开 | 有：web client 由 runtime 自身提供（`vite.web.config.ts` 构建 `out/web`；issue #10687 引用 `orca serve --help`「When the web client bundle is available, the server also prints a browser URL with the pairing data embedded」，并写明 web client 只由 runtime 提供） | 无 |
| 托管网页 | `app.t3.codes`（需 HTTPS 端点或 T3 Connect） | 无对应产品 | 无 |
| 手机 | 有（配对链接；文档写明配对「不需要 T3 Connect」） | 有（Relay 或 LAN 直连配对；桌面关闭即断） | 无 |
| TUI | 无 | 无 | 有 |

Orca 手机端官方定位是 remote control：启动/监控/停止会话、终端回放、Chat UI 权限、commit/push/PR、建 workspace，没有完整编辑器。Herdr 两条产品线（TUI 与 app）并存但会话互不相通。

## 全本地与账号依赖

三家都能做到无第三方服务器运行，差别在于要不要主动避开云端功能：

| | 可选云端功能 | 避开后 | 文档依据 |
|---|---|---|---|
| T3 Code | T3 Connect 隧道、托管页 app.t3.codes | 本机网页 + LAN 共享（`t3 up --lan`）均无需登录 | remote-access.md：「仅本地…配置不需要登录」「本地网络…配置不需要登录」；配对链接「不需要 T3 Connect」 |
| Orca | Relay | Local 模式与 LAN 配对不涉及中转 | ways-to-run、mobile：Relay 与 Direct (LAN) 并列 |
| Herdr TUI | 没有云端产品 | 无需关闭任何东西 | concepts：每台机器一个 server；无网页/手机客户端 |

一处待证实：

- Orca 手机 LAN 直连是否要求登录：配对页只说 LAN 不需要 Relay；排障页写手机与桌面需登录同一账号。两条并存，未解决。

web 客户端页面提供方已证实：web client 只由 runtime 提供，官方没有独立托管的静态 web 客户端发布（issue #10687「Today the web client is only served by a runtime」；`vite.web.config.ts` 构建 `out/web`，其 `base: './'` 注释写明用于反向代理配对前缀 `/orca/web-index.html`）。

远程设备（手机、另一台电脑）总需要一条网络路径（局域网、Tailscale 等），这部分与产品无关。agent 连接模型服务一层三家相同。

## OMP 的接入方式

- T3 无内置 OMP：仓库代码搜索 `repo:pingdotgg/t3code "oh-my-pi"` 为 0 结果（2026-11-15）。接入路径是 ACP：OMP 自带 `acp` 子命令（本机 `omp --help`：「acp — Run omp as an ACP server over stdio」），在 T3 里配置为 Local ACP command（可执行文件 `omp`，参数 `acp`）。ACP 形态的限制：agent 无法回滚自己的对话（checkpoint 回滚后 T3 会开新的 ACP session）、没有标准的 subagent 谱系、没有标准的附件上传。本文没有实测这条链路。
- Herdr TUI 原生支持：agents 文档支持表含 OMP 一行，status 需要 omp 集成，session resume 用 `omp --resume`。

## ttyd + Herdr TUI 对比 T3 本机网页

用户本机实际运行组合（进程表为证）：ttyd 以 root 运行、绑定 127.0.0.1:7681、`login -f <USER>`，浏览器里是 xterm.js 画面承载 Herdr TUI；同机另有两个 `herdr server` 与一组 `herdr-core` 进程。

| | ttyd + Herdr TUI | T3 本机网页 |
|---|---|---|
| 页面内容 | 通用终端桥：浏览器显示 TUI 字符画面 | 专用前端：线程列表、权限卡片、diff、commit/push/PR |
| 服务端 | ttyd（root，回环端口，无鉴权）+ Herdr server | T3 server（本机，自带前端与认证 RPC） |
| 交互 | 键盘原样进 TUI；浏览器快捷键可能抢键 | 点击与表单；权限与 diff 为一等公民 |
| 能力边界 | Herdr 有什么就有什么（pane、detach、SSH 多机）；无 diff/PR 界面 | 无 tmux 式 pane 与多机侧栏；以 thread/environment 组织 |
| 通知 | 出不了浏览器外 | 手机推送 |

ttyd 侧安全边界：本机组合以 root 运行且 `login -f <USER>`，任何能连上 7681 的人直接获得 <USER> 的登录 shell。当前仅绑定 127.0.0.1，本机之外不可达；一旦换绑定或加隧道，必须加 `-c 用户:密码` 或套一层带认证的反向代理，并避免以 root 运行。ttyd 前端编译、渲染器与剪贴板路径已有专题：[ttyd 前端编译模型](../terminal-multiplexers/ttyd-frontend-compilation.md)、[ttyd xterm.js 渲染色块](../terminal-multiplexers/ttyd-xterm-renderer-corruption.md)、[浏览器终端链路的剪贴板路径](../terminal-multiplexers/browser-terminal-clipboard-paths.md)。

选型判断：要「浏览器里操作原样 OMP 终端」，ttyd + Herdr 成立且全本地；要「网页上点着审 diff、批权限、开 PR、多 provider 混用」，用 T3 本机网页并把 OMP 作为本地 ACP 命令接入。

## Web 模式功能与安装配置（2026-11-24 补）

星数与 license（gh api 2026-11-24 实测，10-18 快照已过时）：T3 Code 76,689 MIT；Paseo 24,920，LICENSE 文件存在但 GitHub 判 NOASSERTION（条款未识别，全文未读）；Orca 135,516 MIT。历史表见 [ADE 候选清单](ade-candidate-inventory.md)（该文以各自快照日为准，不回改）。

### Web 功能清单

T3（docs/user 十二页核实，标 mobile 的属移动端）：线程与侧栏、消息与附件、权限模式、终端（选 shell、历史）、源控制（逐轮改动审阅、GitHub/GitLab/Forgejo/Gitea 连接）、使用与限额页、快照、视觉回复（HTML 渲染、MCP apps）、访客链接、语音输入、外观主题。离线消息队列（Queue messages offline on mobile）与审批推送为手机端能力，不计入 Web。

Paseo（web-ui 文档 + 插件 reference + CHANGELOG）：并行工作区、worktree、diff、编排（Paseo tools 默认关）、全部 provider（含内置 omp）、插件系统（client/server 组件）。「400+ 社区插件」为第三方比较站数字，官方目录未给总数。

Orca：Web 客户端连 Remote Orca Server，服务器持有全部状态。官方文档确认的 Web/手机可用：听写（三端同时）、浏览器视图（桌面最小化时手机开的标签继续加载）、终端 scrollback 补水、配对管理。唯一明文 Web 限制：Download Folder 桌面专属（docs/ssh）。Monaco 编辑器、GPU 终端分屏、内嵌 Chromium 面板、VM 生命周期管理仅桌面 IDE 维度有描述，Web 是否可用未确认。

### 安装、升级、配置

| | 安装 | 升级 | Web 关键配置 |
|---|---|---|---|
| T3 | `curl -fsSL https://t3.codes/install.sh \| sh`（~/.local/bin） | `t3 update`（managed-policy 的 `feedUrl` 可指自家镜像） | 默认只听回环；对外走 `t3 up --lan`（写 `T3CODE_LAN=true` 入 `~/.t3/service.env`，监听局域网+Tailscale、不碰公网）；`T3CODE_HOST` 仅覆盖，官方示例回环；provider 要在 Settings → Providers 启用 |
| Paseo | `npm install -g @getpaseo/cli`（Node 24）；Docker `ghcr.io/getpaseo/paseo:latest` | npm 全局更新 | `features.webUi.enabled true`（默认关）；Tailscale 路线保持 `daemon.listen 127.0.0.1:6767`，`tailscale serve --bg http://127.0.0.1:6767`；绑 0.0.0.0 才需 `set-password` + `daemon.hostnames`；状态 `PASEO_HOME`（~/.paseo） |
| Orca | AppImage 直链 `https://github.com/stablyai/orca/releases/latest/download/orca-linux.AppImage` | AppImage 自更新；.deb/.rpm 用更新提示的 Copy Install Command | `orca-ide serve --pairing-address <tailscale-ip>` 打印配对 URL，浏览器/手机 Add Server；Linux 命令名 `orca-ide` |

共同前提：agent CLI（omp 等）自装并登录，三者只做控制面。均未实机安装；Paseo LICENSE 条款全文未读。

## 证据边界

- 全部为厂商文档、源码与用户进程表；读取日期 2026-11-15，T3 取 main 分支，Orca/Herdr 取官方文档站当日版本；Orca web client 的判定补源码（`vite.web.config.ts`）与 issue #10687（同日读取）。
- 未安装、未运行三个产品；App Store 页面返回 HTTP 429 未读取，手机端结论全部来自官方文档。
- 推断项：T3 + `omp acp` 的兼容程度；ttyd 鼠标/粘贴行为随 xterm.js 版本变化；Orca 手机 LAN 直连的账号要求。
- 星数不入库；ADE 候选清单以各自快照日为准。

## See Also

- [ADE 候选清单](ade-candidate-inventory.md)
- [ADE 选型方法](ade-selection-method.md)
- [Herdr App、herdr-core 与手机](../herdr-plannotator/herdr-app-core-mobile.md)
- [Alma 桌面应用与 Herdr 集成](../herdr-plannotator/alma-desktop-and-herdr-integration.md)
