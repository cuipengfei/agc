# ADE 选型方法

> Sources: GitHub API (stargazers_count, pushed_at), 2026-10-18; 各仓库官方 README/docs, 2026-10-18
> Raw: [openhands](../../raw/agent-development-environments/2026-10-18-openhands-readme.md); [herdr](../../raw/agent-development-environments/2026-10-18-herdr-readme.md); [vibe-kanban](../../raw/agent-development-environments/2026-10-18-vibe-kanban-readme.md); [t3code](../../raw/agent-development-environments/2026-10-18-t3code-readme.md); [happy](../../raw/agent-development-environments/2026-10-18-happy-readme.md); [paseo](../../raw/agent-development-environments/2026-10-18-paseo-readme.md); [gas-town](../../raw/agent-development-environments/2026-10-18-gas-town-readme.md); [openchamber](../../raw/agent-development-environments/2026-10-18-openchamber-readme.md); [ekko-studio](../../raw/agent-development-environments/2026-10-18-ekko-studio-readme.md); [claude-squad](../../raw/agent-development-environments/2026-10-18-claude-squad-readme.md); [openrig](../../raw/agent-development-environments/2026-10-18-openrig-readme.md); [mission-control](../../raw/agent-development-environments/2026-10-18-mission-control-readme.md); [tuios](../../raw/agent-development-environments/2026-10-18-tuios-readme.md); [agent-deck](../../raw/agent-development-environments/2026-10-18-agent-deck-readme.md); [cao](../../raw/agent-development-environments/2026-10-18-cao-readme.md); [bb](../../raw/agent-development-environments/2026-10-18-bb-readme.md); [toad](../../raw/agent-development-environments/2026-10-18-toad-readme.md); [agent-of-empires](../../raw/agent-development-environments/2026-10-18-agent-of-empires-readme.md); [automaker](../../raw/agent-development-environments/2026-10-18-automaker-readme.md); [codenomad](../../raw/agent-development-environments/2026-10-18-codenomad-readme.md); [nodeterm](../../raw/agent-development-environments/2026-10-18-nodeterm-readme.md); [dmux](../../raw/agent-development-environments/2026-10-18-dmux-readme.md); [ai-devkit](../../raw/agent-development-environments/2026-10-18-ai-devkit-readme.md); [jean](../../raw/agent-development-environments/2026-10-18-jean-readme.md); [fusion](../../raw/agent-development-environments/2026-10-18-fusion-readme.md); [ccmanager](../../raw/agent-development-environments/2026-10-18-ccmanager-readme.md); [orca](../../raw/agent-development-environments/2026-10-18-orca-readme.md); [orca-cli](../../raw/agent-development-environments/2026-10-18-orca-cli-overview.md); [tern-architecture](../../raw/agent-development-environments/2026-10-18-tern-architecture.md)
> Updated: 2026-10-18

## Overview

本文记录 2026-10-18 调研 ADE（Agent/Agentic Development Environment）时使用的准入条件、核验纪律、排除项理由和针对本机环境的推荐排序。

## 准入条件

用户要求的四条门槛：

1. **形态**：Terminal TUI/CLI 或独立 Web UI 可完整使用；排除纯桌面应用。mobile companion 不算独立 Web UI。
2. **Agent 状态可见**：能清楚看到哪些 Agent 在运行，以及所在 project/workspace/worktree/session/host 至少一种位置。
3. **切换**：能方便切换 workspace、session 或 context。
4. **星数**：GitHub stars ≥ 1000。Tern 因用户要求例外保留。

## 核验纪律

### pushed_at vs updated_at

GitHub `pushed_at` 和 `updated_at` 可能差异显著。例如 `fynnfluegge/agtx` 在同一轮调查中返回 `updated_at=2026-10-18T01:08:39Z` 但 `pushed_at=2026-10-02T12:36:16Z`。当用户要求 last push 日期时，必须使用 `pushed_at`。

### REST 与 GraphQL 交叉核对

同一时刻对同一仓库用 REST `gh api repos/{owner}/{repo}` 和 GraphQL `stargazerCount`/`pushedAt` 取值。两者一致才采用；不一致时以 REST 为准并标注差异。

### scout 分组数据须主流程复核

scout 子代理可能因 GitHub API 配额耗尽而使用 shields.io stars 和 Atom feed commit 时间。这些不等于 GitHub API 快照，主流程必须用 `gh api` 重新核验。scout 分组也可能因 429 中断而返回失败，主流程需要接管失败分组重新读取。

### 同名歧义

`mixpeek/amux` 与 `andyrewlee/amux` 是不同项目。核验时必须用完整 `owner/repo` 名，不能只用仓库名。

## 排除项

### Orca（stablyai/orca）

Orca 官方 README 描述为 "Available on desktop, mobile and remote runtime"，安装方式提供 macOS、Windows、Linux 桌面应用；mobile companion 与桌面配对。Orca CLI 文档原文称："The Orca CLI is the `orca` command-line interface for scripting a running Orca editor from any shell."；并称 "It ships with the desktop app"。CLI 提供脚本化操作（`orca worktree create`、`snapshot`、`click`、`fill`），但依赖运行中的 Orca editor，没有独立 terminal ADE 或 self-hosted Web UI 的交付证据。功能符合（并行 worktree、Agent 总览、快速切换、支持 any CLI agent），但形态不符。

### Superset（superset-sh/superset）

官方 README 将其定位为桌面 app，安装方式只有 macOS/Linux 桌面包。CLI 文档显示它能独立管理本机 workspace，但同一文档明确说没有跨 host 的总列表；跨机器视图由桌面 app 提供。因此它只满足终端操作、全局可视总览不足，不完整满足"清楚看到 Agent 在哪里运行"。

### OpenCode（anomalyco/opencode）

官方 README 描述的是 coding-agent 引擎本体。`build`/`plan` 是同一 TUI 内切换的 agent mode，不是跨多个并发 coding agents 的工作区总览。不满足"看见哪些 agents 正在何处运行"的管理层要求。

### Agent Orchestrator（OrchestratorInc/agent-orchestrator）

README 明确自称 local desktop workspace，安装方式是下载 desktop app。即使 GitHub topic 描述含 web/mobile，也没有独立 Web/Terminal 交付证据。

## Tern 插件型归类

Tern 核心提供 terminal + `tern web serve` + daemon 持久 session + OMP 原生集成。Agent 总览依赖插件：

- OMP Tiles：显示 OMP session 所在 Tern session、目录、状态、model 和 context
- workspaces-sidebar：按 tab/workspace 切换
- Overseer：worktree、Agent、PR 总览，但仅限 macOS desktop

Tern Web tab 不运行任何 Lua（官方架构文档原文："The web tab runs no Lua at all"），只能显示 host 侧插件提供的 block 和 view。OMP Tiles 与 workspaces-sidebar 都是 window-only 插件，因此不能拿它们证明 Tern Web 满足 Agent 总览要求。产品本体无官方公开 GitHub 仓库；`tern-sdk` 是 Plugin SDK，其指标不代表 Tern 产品本体。

## 本机推荐排序

本机环境为 WSL2 + OMP + Herdr + TUIOS + ttyd/Web。Herdr 与 TUIOS 有本机 Wiki 实测。

| 排名 | 候选 | 推荐用途 | 理由 | 限制 |
|---:|---|---|---|---|
| 1 | TUIOS | 日常多 Agent 工作区 | Terminal 与 Web 都能显示 window、workspace、Agent 状态、context、subagents；官方 oh-my-pi extension 标注 plugin E2E | 只有 9 个编号 workspace，worktree 与 Agent 编排能力弱于 Herdr |
| 2 | Agent Deck | 补充 Agent session 控制中心 | 原生支持 OMP；TUI/Web 按 host、project、session 显示 running、waiting、done；OMP session fork 继承完整对话历史 | 增加一套持久化数据库与 daemon；不能替代 Herdr 的窗口、布局、worktree 管理 |
| 3 | OpenRig | 本地与 SSH 机器混合运行 Agent | seat 模型直接显示 runtime、model、context、state；支持本地、Docker、SSH seat | OMP 原生支持未证实 `[unknown]` |
| 4 | OpenHands Agent Canvas | 以 Web 为中心、跨机器管理不同 Agent | 能连接 local、remote、cloud Agent Server；backend switcher 可整套切换 conversations、状态与 workspace | 增加 Agent Server、frontend 和后端基础设施；OMP 原生适配未证实 `[unknown]` |
| 5 | CLI Agent Orchestrator | 需要 Agent 之间自动分工和委派 | 支持跨 repo/worktree、多 Agent supervisor/worker，文档明确列出 OMP；提供 tmux 与 Web dashboard | Web 更接近运行总览；workspace、layout、session 的日常切换体验弱于 Herdr/TUIOS |

Herdr 仍然值得保留：本机有实测的 `omp` integration、命名 workspace、worktree、pane agent 状态和 SSH 多机器管理。它目前缺少 Web 总览。

## 证据边界

- 功能描述为官方文档声明 `[single-source]`；stars/push 为 GitHub API 一手直读。
- 未做本机安装运行验证；界面实际表现、OMP 集成、维护状态变化有实测风险。
- Paseo Web 多机器展示、Tern Web Agent 总览、OpenRig OMP 支持均标 `[unknown]`。

## See Also

- [ADE 候选清单](ade-candidate-inventory.md)
- [Coding Agent 候选发现方法](../ai-coding-agents/candidate-discovery-method.md)
- [TUIOS workspace 与 session rail](../terminal-multiplexers/tuios-workspace-and-sidebar.md)
- [Herdr 工具链参考](../herdr-plannotator/toolchain-reference.md)
