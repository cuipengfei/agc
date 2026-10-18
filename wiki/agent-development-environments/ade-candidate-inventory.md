# ADE 候选清单

> Sources: GitHub API (stargazers_count, pushed_at), 2026-10-18; 各仓库官方 README/docs, 2026-10-18
> Raw: [openhands](../../raw/agent-development-environments/2026-10-18-openhands-readme.md); [herdr](../../raw/agent-development-environments/2026-10-18-herdr-readme.md); [vibe-kanban](../../raw/agent-development-environments/2026-10-18-vibe-kanban-readme.md); [t3code](../../raw/agent-development-environments/2026-10-18-t3code-readme.md); [t3code-source](../../raw/agent-development-environments/2026-10-18-t3code-source.md); [happy](../../raw/agent-development-environments/2026-10-18-happy-readme.md); [paseo](../../raw/agent-development-environments/2026-10-18-paseo-readme.md); [paseo-source](../../raw/agent-development-environments/2026-10-18-paseo-source.md); [gas-town](../../raw/agent-development-environments/2026-10-18-gas-town-readme.md); [openchamber](../../raw/agent-development-environments/2026-10-18-openchamber-readme.md); [ekko-studio](../../raw/agent-development-environments/2026-10-18-ekko-studio-readme.md); [ekko-source](../../raw/agent-development-environments/2026-10-18-ekko-source.md); [claude-squad](../../raw/agent-development-environments/2026-10-18-claude-squad-readme.md); [openrig](../../raw/agent-development-environments/2026-10-18-openrig-readme.md); [mission-control](../../raw/agent-development-environments/2026-10-18-mission-control-readme.md); [tuios](../../raw/agent-development-environments/2026-10-18-tuios-readme.md); [agent-deck](../../raw/agent-development-environments/2026-10-18-agent-deck-readme.md); [cao](../../raw/agent-development-environments/2026-10-18-cao-readme.md); [bb](../../raw/agent-development-environments/2026-10-18-bb-readme.md); [bb-source](../../raw/agent-development-environments/2026-10-18-bb-source.md); [toad](../../raw/agent-development-environments/2026-10-18-toad-readme.md); [agent-of-empires](../../raw/agent-development-environments/2026-10-18-agent-of-empires-readme.md); [automaker](../../raw/agent-development-environments/2026-10-18-automaker-readme.md); [codenomad](../../raw/agent-development-environments/2026-10-18-codenomad-readme.md); [nodeterm](../../raw/agent-development-environments/2026-10-18-nodeterm-readme.md); [nodeterm-source](../../raw/agent-development-environments/2026-10-18-nodeterm-source.md); [dmux](../../raw/agent-development-environments/2026-10-18-dmux-readme.md); [ai-devkit](../../raw/agent-development-environments/2026-10-18-ai-devkit-readme.md); [jean](../../raw/agent-development-environments/2026-10-18-jean-readme.md); [fusion](../../raw/agent-development-environments/2026-10-18-fusion-readme.md); [ccmanager](../../raw/agent-development-environments/2026-10-18-ccmanager-readme.md); [orca](../../raw/agent-development-environments/2026-10-18-orca-readme.md); [orca-cli](../../raw/agent-development-environments/2026-10-18-orca-cli-overview.md); [tern-architecture](../../raw/agent-development-environments/2026-10-18-tern-architecture.md)
> Updated: 2026-10-18

## Overview

本文记录 2026-10-18 调研的 ADE（Agent/Agentic Development Environment）候选清单。ADE 指管理多个并发 coding agent 的工作台，区别于 coding-agent 引擎本身（如 OpenCode）和 IDE。准入条件：Terminal TUI/CLI 或独立 Web UI 可完整使用（排除纯桌面应用）；能清楚显示哪些 Agent 在运行及所在 project/workspace/worktree/session/host 至少一种位置；能方便切换 workspace/session/context；GitHub stars ≥ 1000。Tern 因用户要求保留为插件型终端 ADE，产品本体无公开 GitHub 仓库，指标标 `[unknown]`。Orca 因仅桌面应用形态被过滤，保留为排除记录。

## 候选表

按 stars 降序排列。Stars 与 last push 来自 GitHub API `stargazers_count` 和 `pushed_at`，快照日期 2026-10-18，日期取 UTC。功能描述为官方 README/docs 声明。

| 候选 | 来源 | 可用形态 | Agent 在哪里运行、状态如何显示 | Workspace / context 如何切换 | Stars | Last push |
|---|---|---|---|---|---:|---|
| [OpenHands Agent Canvas](https://github.com/OpenHands/OpenHands) | 新增 | Self-hosted Web | Backend sidebar 显示每个 Agent Server 的 RUNNING、IDLE、PAUSED、WAITING_FOR_CONFIRMATION 状态；conversation 按 backend/workspace 分组 | Backend switcher 切换整套 workspace 和 conversations；支持 local、remote、cloud backends | 91189 | 2026-10-17 |
| [Herdr](https://github.com/herdrdev/herdr) | Seed | Terminal TUI、CLI、SSH | pane、workspace 显示 agent 类型与状态；`herdr ps` 列出全部 pane | 命名 workspace、session attach/detach、worktree；每个 pane 保留独立上下文 | 44602 | 2026-10-15 |
| [Vibe Kanban](https://github.com/BloopAI/vibe-kanban)（**sunsetting**） | 新增 | Web | Kanban 卡片关联 agent task；每个 workspace 有独立 branch、terminal、dev server 和运行状态 | 按卡片切换 workspace/agent；可切换多种 coding agent | 28386 | 2026-09-19 |
| [T3 Code](https://github.com/pingdotgg/t3code) | Seed | Web、CLI、本地 daemon | 按 machine、project、workspace、thread 显示 agent runs、terminals 和 Git 状态；内置 driver 包括 Pi、OpenCode 与 ACP Registry | 在 project、workspace、thread 间切换；worktree 提供隔离；ACP 支持 registry 与 local command | 28245 | 2026-10-18 |
| [Happy](https://github.com/slopus/happy) | 新增 | Web、CLI | Session 列表显示在线与离线、archived 状态；daemon 在机器上保留实际 Agent session | CLI `Ctrl+O`、Web 与手机均可切换并接管 session；可按 machine 管理 | 24197 | 2026-10-18 |
| [Paseo](https://github.com/getpaseo/paseo) | Seed | Self-hosted Web、CLI | 每个 agent 在自己的 worktree 运行；源码的 agent row 用 `agent.serverLabel` 显示 host，另有 host column 与 host badge；内置 `omp` provider | 在 host、repository、worktree、agent 间切换；单 daemon 可同时提供 API 与 bundled Web UI | 21268 | 2026-10-18 |
| [Gas Town](https://github.com/gastownhall/gastown) | 新增 | Terminal、Web | Agent Tree 按 rig、role 分组，显示 name、state、health；Terminal feed 与 dashboard 显示各 agent 活动 | `gt mayor attach`、`gt feed` 等命令按 session/actor 接入并切换上下文 | 18405 | 2026-10-18 |
| [OpenChamber](https://github.com/openchamber/openchamber) | Seed | Web/PWA、CLI/server | 跨 project 显示 session 的 working、waiting、finished、failed；multi-run 显示不同模型对应 session/worktree | 切换 project/session；session sync 可在 Web、CLI、其他设备间继续同一 context | 11783 | 2026-10-18 |
| [Ekko Studio](https://github.com/EKKOLearnAI/ekko-studio) | 新增 | Self-hosted Web | Active Sessions 显示状态指示、run/cost/token；session 有 project path 与 model 元数据；源码列出 Claude Code、Codex、Pi、OpenCode 等十四种 Coding runtime | Project drawer 选择 workspace；可为单 session fork session、复制 worktree 或创建新 worktree | 11459 | 2026-10-18 |
| [Claude Squad](https://github.com/smtg-ai/claude-squad) | 新增 | Terminal TUI | TUI 同时管理多个 terminal session；每个 instance 对应独立 git worktree 和 agent | 在 instance 间 tab 切换；`n` 新建、`d` kill、`enter` attach、`q` detach | 8619 | 2026-08-20 |
| [OpenRig](https://github.com/mvschwarz/openrig) | 新增 | Terminal TUI/CLI | Seat strip 显示每个 seat 的 runtime、model、context、state；Seat Inspector 显示 cwd、transcript、skill、usage | 在本地与 SSH seat 间切换；pane 可直接接管 agent；project 使用独立 Git worktree | 7772 | 2026-10-18 |
| [Mission Control](https://github.com/builderz-labs/mission-control)（**alpha**） | 新增 | Web、CLI | Workspace dashboard 显示成员、session、project；Orchestration View 显示各 squad/member 运行位置与状态 | 在 squad、member、session、project 间切换；支持 session resume | 6365 | 2026-10-12 |
| [TUIOS](https://github.com/Gaurav-Gosain/tuios) | Seed | Terminal TUI、Web | Session rail 与 window 显示 agent 状态、context、subagents | 9 个 workspace 可切换；session 持久保存；window 可 attach/detach | 5469 | 2026-10-18 |
| [bb](https://github.com/get-bb/bb) | 新增 | Web、CLI | Thread sidebar 显示每个 thread 的 live status、active model 和所属 project；源码注册 `acp-omp`，通过 `omp acp` 启动 | 同一 project 内切换并行 threads；browser/app/CLI 共享同一历史与状态；OMP 支持 manual compaction 与 tip fork | 4419 | 2026-10-18 |
| [Toad](https://github.com/batrachianai/toad) | 新增 | Terminal TUI、Web | Workspace strip 与 tile badges 显示 session 的 working、idle、attention；tile 关联 cwd 和命令 | 多 session 平铺同屏，可选择不同 workspace/tile；`toad serve` 共享到浏览器 | 3483 | 2026-05-26 |
| [Agent of Empires](https://github.com/agent-of-empires/agent-of-empires) | Seed | Terminal TUI、Web | 按 repository、worktree、session 显示 running、waiting、completed | TUI/Web 均可切换和接管 session；每个 session 使用独立 worktree | 3366 | 2026-10-18 |
| [Automaker](https://github.com/AutoMaker-Org/automaker)（**no longer actively maintained**） | 新增 | Web | Agent task board 显示并行任务；每个任务对应独立 worktree、上下文和执行状态 | 按 board task、project、worktree 切换上下文 | 3229 | 2026-05-22 |
| [CodeNomad](https://github.com/NeuralNomadsAI/CodeNomad) | 新增 | Web/server | Sidebar 按 project/session 显示 working、waiting、needs-input 状态 | 切换 project、session；支持为 session 创建独立 git worktree | 2628 | 2026-10-18 |
| [Nodeterm](https://github.com/eneskirca/nodeterm) | 新增 | Web Server Edition | Canvas 的 project cards 显示 active Claude session；live badges 区分 working、waiting、permission、idle；无 baseAgent 的自定义 agent 仅有 spawn、terminal title 与 process status | 在多个无限 canvas 间切换；每个 project 有独立 terminal、workspace 和 context；带 baseAgent 的自定义 agent 可继承对应内置能力 | 2039 | 2026-10-18 |
| [dmux](https://github.com/standardagents/dmux) | 新增 | Terminal TUI | 多项目侧边栏与各项目 panes 显示 agent 所在 worktree；tmux 保留实时进程状态 | `j/k` 浏览、`h/l` 折叠、`Enter` 跳转；pane 可保存并恢复 | 1804 | 2026-08-16 |
| [AI DevKit](https://github.com/codeaholicguy/ai-devkit) | 新增 | Terminal TUI/CLI | Agent Console 显示 status、type、project path、CLI；最多同时显示 16 个 agent | 选择 agent 后进入 Chat、Send Message 或 Open Terminal；`ai_devkit_console_switch` 切换显示分组 | 1649 | 2026-10-18 |
| [CLI Agent Orchestrator](https://github.com/awslabs/cli-agent-orchestrator) | 新增 | Terminal、Web | Web dashboard 显示 live status badges 与浏览器终端；tmux 中每个 agent 对应独立 session/window | CLI/tmux 可 attach、切换并接管 agent session；Web 可管理 session | 1447 | 2026-10-18 |
| [Jean](https://github.com/coollabsio/jean) | 新增 | Headless Web server | 按 server、project、worktree 管理并行 agent；worktree 显示 branch、terminal 和运行状态 | 在 project/worktree/chat 间切换；可连接本地或远程 headless server | 1339 | 2026-10-18 |
| [Fusion](https://github.com/Runfusion/Fusion) | 新增 | Web、CLI | Dashboard 与 workspace gallery 显示 session 类型、project directory、state | 按 workspace/session 切换；支持保存、恢复与并行运行 | 1279 | 2026-10-18 |
| [CCManager](https://github.com/kbwo/ccmanager) | Seed | Terminal TUI、Web | 按 project、worktree、session 显示 busy、waiting、idle | 在项目与 worktree 间切换 session；恢复操作只重启命令，不恢复之前的 Agent 对话 | 1265 | 2026-10-18 |
| [Agent Deck](https://github.com/asheshgoplani/agent-deck) | Seed | Terminal TUI、Web | 按 group、project、session、host 显示 waiting、running、done | `Enter` 接管 session；支持 fork OMP 等 Agent session，继承对话历史 | 1109 | 2026-10-18 |

## 单独保留

| 候选 | 可用形态 | Agent 状态显示 | Workspace / context 切换 | Stars | Last push |
|---|---|---|---|---:|---|
| [Tern](https://stencil.so/tern) | 插件型终端 ADE；提供 Web 客户端，但 Agent 总览插件为 window-only | OMP Tiles 可显示 OMP session 所在 Tern session、目录、working/waiting/idle、model 和 context | 点击 OMP tile 跳到对应 session；workspaces-sidebar 可按 tab/workspace 切换 | `[unknown]` | `[unknown]` |

Tern 的 Web 是否具备与终端插件相同的 Agent 总览能力尚未核实。官方公开的 `tern-sdk` 是 Plugin SDK，其指标不代表 Tern 产品本体。

## 桌面过滤记录

| 候选 | 形态 | 功能是否满足 | 过滤原因 | Stars | Last push |
|---|---|---|---|---:|---|
| [Orca](https://github.com/stablyai/orca) | 桌面应用 + mobile companion + CLI 依赖运行中的 Orca editor | 功能符合（并行 worktree、Agent 总览、快速切换、支持 OMP） | 无独立 terminal ADE 或 self-hosted Web UI 证据；CLI 需运行中的 Orca editor | 96086 | 2026-10-18 |

## 维护状态提示

- **Vibe Kanban**：官方 README 当前明确写着 sunsetting。
- **Automaker**：官方 README 当前明确写着 no longer actively maintained。
- **Mission Control**：官方 README 当前标为 alpha。

## 证据边界

- 功能描述为官方文档声明或源码一手直读 `[single-source]`；stars/push 为 GitHub API 一手直读。
- 未做本机安装运行验证；界面实际表现、OMP 集成、维护状态变化有实测风险。
- Paseo 源码已证实 Web agent row 显示 host；本机 watchdog、OMP 配置编辑与插件管理未验证。Tern Web Agent 总览、OpenRig OMP 支持仍标 `[unknown]`。

## See Also

- [Coding Agent 候选发现方法](../ai-coding-agents/candidate-discovery-method.md)
- [TUIOS workspace 与 session rail](../terminal-multiplexers/tuios-workspace-and-sidebar.md)
- [TUIOS Web 与安装升级](../terminal-multiplexers/tuios-web-and-updates.md)
- [Herdr 工具链参考](../herdr-plannotator/toolchain-reference.md)
