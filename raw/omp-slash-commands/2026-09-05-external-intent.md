# OMP 内置 Slash 命令 — 外部信源调查报告

> 调查时间: 2026-09-05  
> 调查范围: OMP (oh-my-pi) 内置 slash 命令的设计意图与官方文档表述  
> 调查渠道: DeepWiki MCP、Context7 MCP、Web 搜索 + GitHub 直读  
> 约束: 只读调查，未修改任何本地文件

---

## 一、DeepWiki MCP 结论

**查询**: `can1357/oh-my-pi` — "built-in slash commands, design intent, categories"  
**来源 URL**: https://deepwiki.com/can1357/oh-my-pi/6.3-slash-commands  
**搜索页**: https://deepwiki.com/search/what-are-the-builtin-slash-com_47b7e151-6891-425b-8f23-60f41fe2aae1

### 1.1 设计总览

DeepWiki 将内置 slash 命令分为六大类别（与源码 `builtin-registry.ts` 六类数组对应）：

| 类别 | 命令示例 | 设计意图 |
|------|---------|---------|
| **/mode** | `/vibe`, `/goal`, `/guided-goal`, `/loop` | 管理会话的运行模式（vibe 工作流、目标驱动、循环提交） |
| **/collaboration** | `/collab`, `/join` | 实时协作会话分享与加入 |
| **/session** | `/todo`, `/session` | 当前会话的管理（待办、会话信息） |
| **/lifecycle** | `/new`, `/fresh`, `/clear`, `/drop`, `/compact`, `/shake`, `/handoff`, `/dirs`, `/exit`, `/ssh` | 会话生命周期与上下文管理 |
| **/marketplace** | `/marketplace` | 插件市场源管理与插件安装/卸载/升级 |
| **/control** | （未列举具体命令） | 通用控制功能，`BUILTIN_CONTROL_SLASH_COMMANDS` 数组在注册表中存在但详情未在片段中展开 |

### 1.2 各命令简要（DeepWiki 原文提炼）

- **`/vibe`**: Toggle "vibe mode," enabling direct, persistent fast/good worker sessions with a read-only toolset. Blocked by plan/goal mode.
- **`/goal`**: Toggle "goal mode," setting a persistent autonomous objective. Subcommands: `set`, `show`, `pause`, `resume`, `drop`, `budget`.
- **`/guided-goal`**: Interactive chat to define and set up goal mode.
- **`/loop`**: Toggle loop mode; re-submits next prompt after every yield.
- **`/collab`**: Share session through end-to-end encrypted relay link.
- **`/join`**: Join a shared session using a provided link.
- **`/todo`**: View or modify agent's todo list. Subcommands: `edit`, `copy`, `export`, `import`, `append`, `start`, `done`, `drop`, `rm`.
- **`/session`**: Session management. Subcommands: `info`, `delete`, `pin`.
- **`/ssh`**: Manage SSH hosts (`add`, `list`, `remove`, `help`).
- **`/new`**: Start a new session.
- **`/fresh`**: Reset provider stream state without altering local transcript.
- **`/clear`**: Clear conversation context in place, keeping session active.
- **`/drop`**: Delete current session and initiate a new one.
- **`/compact`**: Manually compact session context.
- **`/shake`**: Drop heavy content (tool results, large blocks) to reclaim tokens. Subcommands: `elide`, `images`.
- **`/handoff`**: Hand off session context to a new session.
- **`/dirs`**: List session workspace directories.
- **`/exit`**: Exit application.
- **`/marketplace`**: Main marketplace command. Subcommands: `add`, `remove`, `update`, `list`, `discover`, `install`, `uninstall`, `installed`, `upgrade`, `help`.

### 1.3 设计意图总结（DeepWiki）

> "The built-in slash commands are designed to provide a rich, real-time interactive experience within the `oh-my-pi` Interactive Mode. They allow users to manage agent sessions, interactions, and various operational aspects directly from the terminal user interface (TUI)."

- 某些命令同时具有 ACP（Agent Control Protocol）处理器；但详细描述主要从 TUI 视角呈现。
- 协作场景下，某些命令对 guest 用户受限。

---

## 二、Context7 MCP 结论

**解析库 ID**: `/can1357/oh-my-pi`（Oh My Pi, Benchmark 75.45, 5161 code snippets）  
**查询策略**: 两次 `context_query_docs` 查询，覆盖全部内置命令

### 2.1 完整内置命令清单（来自 Context7 的 `builtin-registry.ts` 逐字描述）

Context7 提供了 `BUILTIN_SLASH_COMMAND_REGISTRY` 数组（lines 380–2719）中每条命令的 **description 原文**:

| 命令 | 别名 | 描述原文 |
|------|------|---------|
| `/advisor` | — | Toggle the advisor (a second model that reviews each turn and injects notes) |
| `/agents` | — | Open Agent Control Center dashboard |
| `/branch` | — | Create a new branch from a previous message |
| `/btw` | — | Ask an ephemeral side question using the current session context |
| `/changelog` | — | Show changelog entries |
| `/collab` | — | Share this session live via a relay |
| `/compact` | — | Manually compact the session context |
| `/context` | — | Show estimated context usage breakdown |
| `/dump` | — | Copy session transcript to clipboard (and write LLM request JSON to tmp) |
| `/export` | — | Export session to HTML file |
| `/extensions` | `/status` | Open Extension Control Center dashboard |
| `/fast` | — | Toggle priority service tier (OpenAI service_tier=priority, Anthropic speed=fast) |
| `/fork` | — | Create a new fork from a previous message |
| `/fresh` | — | Reset provider stream state without changing the local transcript |
| `/goal` | — | Toggle goal mode (persistent autonomous objective for this session) |
| `/guided-goal` | — | Have the agent interview you in chat, then set up goal mode |
| `/handoff` | — | Hand off session context to a new session |
| `/hotkeys` | — | Show all keyboard shortcuts |
| `/jobs` | — | Show async background jobs status |
| `/loop` | — | Toggle loop mode. While enabled, the next prompt you send re-submits after every yield. Esc cancels the current iteration; /loop again to disable. |
| `/marketplace` | — | Manage marketplace plugin sources and installed plugins |
| `/model` | `/models` | Switch model for this session |
| `/omfg` | — | Forge a TTSR rule from a complaint to stop a recurring behavior |
| `/plan` | — | Toggle plan mode (agent plans before executing) |
| `/plan-review` | — | Re-open the plan review for the latest plan (plan mode only) |
| `/plugins` | — | View and manage installed plugins |
| `/prewalk` | — | Switch to a fast/cheap model at the next action (works even without --prewalk) |
| `/queue` | — | Queue a message for after the agent yields |
| `/security` | — | Plan, run, inspect, import, and compare OMP-native security scans |
| `/session` | — | Session management commands |
| `/settings` | — | Open settings menu |
| `/setup` | `/providers` | Open provider setup |
| `/shake` | — | Drop heavy content from context (tool results, large blocks) |
| `/share` | — | Share session via an encrypted link (share server or secret gist) |
| `/stats` | — | Launch the local stats dashboard |
| `/switch` | — | Switch model for this session (same as alt+p) |
| `/tan` | — | Run a full background agent on tangential work |
| `/todo` | — | View or modify the agent's todo list |
| `/tools` | — | Show tools currently visible to the agent |
| `/tree` | — | Navigate session tree (switch branches) |
| `/usage` | — | Show provider usage and limits |
| `/vibe` | — | Toggle vibe mode (direct persistent fast/good worker sessions; read-only toolset) |

### 2.2 子命令详细文档（Context7 提取）

#### `/memory` 子命令
**来源**: `docs/memory.md`

| 子命令 | 作用 |
|--------|------|
| `view` | Show current backend injection payload |
| `stats` | Show backend-specific memory statistics |
| `diagnose` | Show backend-specific diagnostics |
| `queue` | Show pending memory deltas awaiting consolidation |
| `sync` | Run memory consolidation now |
| `clear` / `reset` | Delete active backend memory data/artifacts |
| `enqueue` / `rebuild` | Force consolidation/retention work |
| `mm …` | Hindsight mental-model maintenance (list/show/refresh/history/seed/delete/reload) |

> 注: `/memory` 命令在 Context7 中有完整独立文档页；`memory.md` 还描述了五种 memory backend（off/local/hindsight/mnemopi/sharpshooter）。

#### `/mcp` 子命令
**来源**: `docs/mcp-config.md`

| 子命令 | 作用 |
|--------|------|
| `reload` | Refresh all MCP servers |
| `list` | Identify configuration sources |
| `test` | Test individual server connections |
| `reconnect` | Reconnect specific server |
| `reauth` | Re-auth specific server |

#### `/marketplace` 子命令
**来源**: `docs/skills/authoring-marketplaces.md` + Context7

| 子命令 | 作用 |
|--------|------|
| `add <source>` | Add marketplace source |
| `remove <name>` | Remove marketplace |
| `update [name]` | Re-fetch catalog(s) |
| `list` | List configured marketplaces |
| `discover [marketplace]` | Browse available plugins |
| `install [--force] [name@marketplace]` | Install plugin |
| `uninstall [name@marketplace]` | Uninstall plugin |
| `installed` | List installed plugins |
| `upgrade [name@marketplace]` | Upgrade plugin(s) |
| `help` | Show usage guide |

#### `/todo` 子命令
**来源**: DeepWiki + Context7 交叉验证

| 子命令 | 作用 |
|--------|------|
| `edit` | Edit todo list |
| `copy` | Copy todo list |
| `export` | Export todo list |
| `import` | Import todo list |
| `append` | Append item |
| `start` | Start item |
| `done` | Mark done |
| `drop` | Drop item |
| `rm` | Remove item |

#### `/session` 子命令
**来源**: DeepWiki + Context7

| 子命令 | 作用 |
|--------|------|
| `info` | Show session details |
| `delete` | Delete current session |
| `pin` | Pin provider to OAuth account |

### 2.3 `/dirs` 机制细节
**来源**: `packages/coding-agent/src/slash-commands/builtin-lifecycle.ts`（Context7 提取）

```typescript
name: "dirs",
description: "List this session's workspace directories",
acpDescription: "List this session's workspace directories",
handle: async (_command, runtime) => {
    await runtime.output(formatWorkspaceDirectories(runtime));
    return commandConsumed();
},
```

---

## 三、Web 搜索 + GitHub 官方文档直读

### 3.1 官方文档站点

- **omp.sh 主站**: https://omp.sh/ — 重定向到主页，未发现独立 `/docs` 子站有大量 slash 命令专属页。
- **GitHub docs 目录**: https://github.com/can1357/oh-my-pi/tree/main/docs — 包含约 40+ 个 markdown 文档文件。

### 3.2 有独立官方文档页的命令

以下命令在 `docs/` 目录下有 **专属独立文档页**（非源码注释，非 README 提及）：

| 命令 | 文档页 | URL |
|------|--------|-----|
| `/vibe` | `docs/vibe-mode.md` | https://github.com/can1357/oh-my-pi/blob/main/docs/vibe-mode.md |
| `/collab`, `/join` | `docs/collab.md` | https://github.com/can1357/oh-my-pi/blob/main/docs/collab.md |
| `/compact`, `/shake` | `docs/compaction.md` | https://github.com/can1357/oh-my-pi/blob/main/docs/compaction.md |
| `/memory` | `docs/memory.md` | https://github.com/can1357/oh-my-pi/blob/main/docs/memory.md |
| `/mcp` | `docs/mcp-config.md` | https://github.com/can1357/oh-my-pi/blob/main/docs/mcp-config.md |
| `/advisor` | `docs/advisor-watchdog.md` | https://github.com/can1357/oh-my-pi/blob/main/docs/advisor-watchdog.md |
| `/share` | `docs/session-operations-export-share-fork-resume.md`（共享页） | https://github.com/can1357/oh-my-pi/blob/main/docs/session-operations-export-share-fork-resume.md |
| `/handoff` | 同 `docs/compaction.md`（handoff 在 compaction 文档中详细描述） | 同上 |
| `/ssh` | `docs/cli-reference.md` 中提及 | https://github.com/can1357/oh-my-pi/blob/main/docs/cli-reference.md |
| `/tree`, `/branch`, `/fork` | `docs/compaction.md`（branch summary 部分） | 同上 |
| `/settings`, `/setup` | `docs/cli-reference.md`, `docs/config-usage.md` | https://github.com/can1357/oh-my-pi/blob/main/docs/cli-reference.md |
| `/security` | `docs/security-scan.md`（推测，需验证） | 未直读确认 |

### 3.3 机制深度文档（无单一命令专属页，但涵盖多个命令）

| 文档 | 覆盖命令/主题 | URL |
|------|-------------|-----|
| `slash-command-internals.md` | 全部内置命令的发现、去重、TUI 呈现、ACP/RPC 可用性、`/pause` 专属说明 | https://github.com/can1357/oh-my-pi/blob/main/docs/slash-command-internals.md |
| `cli-reference.md` | `/ssh`, `/settings`, `/setup` 等；同时是 CLI 子命令参考 | https://github.com/can1357/oh-my-pi/blob/main/docs/cli-reference.md |
| `agent-hub.md` | `/agents` 相关 | https://github.com/can1357/oh-my-pi/blob/main/docs/agent-hub.md |
| `rpc.md` | `/session` 相关 RPC 命令（`get_session_stats`, `export_html`, `switch_session`, `branch`, `handoff` 等） | https://github.com/can1357/oh-my-pi/blob/main/docs/rpc.md |

### 3.4 `/pause` 专属说明（TUI-only）
**来源**: `docs/slash-command-internals.md`

> "`/pause` is available only in the interactive TUI. It engages a process-global gate for the main agent, in-process subagents, and the advisor. Each agent parks at its next safe boundary: in-flight calls finish, nothing is aborted, and no new work starts until the gate is released. From the pause screen, press Esc, Enter, Space, or Ctrl+C to resume."

- `/pause` 只有 `handleTui`，没有 `handle`，因此 **ACP 文本模式不可用**。

### 3.5 `/green` 与 `/review`（Bundled 命令，非 Core Registry）
**来源**: Web 搜索 + Context7

- `/green` 和 `/review` 不是 `builtin-registry.ts` 中定义的命令，而是通过 **custom-commands plugin system** 以 bundled 形式加载的扩展命令。
- **注册位置**: `packages/coding-agent/src/extensibility/custom-commands/loader.ts`
- `/green`（ci-green）: 检查 CI 状态/绿灯状态。
- `/review`: PR 审查工作流，支持 GitHub PR diff 审查，大 diff 会自动回退到 per-file API（v17.0.2 修复）。
- 这些命令属于 **bundled custom commands**，不是 core registry 的 79 条顶层命令之一。

### 3.6 `/autoresearch`（SDK 注入）
**来源**: Context7 + Web 搜索

- `/autoresearch` 是通过 SDK 示例/自动研究模式注入的命令。
- **来源文件**: `packages/coding-agent/src/autoresearch/command-resume.md`
- 功能: 在当前会话上恢复自动研究，检查最近的 git 历史以继续最有前景的未完成方向，迭代直到中断或达到配置上限。
- **注意**: `/clear` 的自动完成在 v17.0.2 中被修复，以避免意外选择 `/autoresearch`。

---

## 四、查不到的命令（明说）

以下命令在外部信源中 **未找到独立文档页或设计意图详细说明**，仅有源码描述（Context7 提供的 registry description）:

| 命令 | 已知信息 | 缺失信息 |
|------|---------|---------|
| `/omfg` | "Forge a TTSR rule from a complaint" | 无独立文档页说明 TTSR 规则锻造的具体流程与示例 |
| `/tan` | "Run a full background agent on tangential work" | 无独立文档页；与 `vibe_spawn` 或 task agent 的关系未在外部文档中展开 |
| `/btw` | "Ask an ephemeral side question" | 无独立文档页；与主会话的隔离机制、上下文共享范围未详细说明 |
| `/prewalk` | "Switch to fast/cheap model at next action" | 无独立命令文档；仅在 `cli-reference.md` 的 `--prewalk` flag 中提及 |
| `/fast` | "Toggle priority service tier" | 无独立文档；OpenAI/Anthropic 优先级机制未在文档中展开 |
| `/switch` | "Switch model (same as alt+p)" | 无独立文档；与 `/model` 的区别未说明 |
| `/queue` | "Queue a message for after agent yields" | 无独立文档；消息队列的具体行为与限制未说明 |
| `/plan-review` | "Re-open plan review for latest plan" | 无独立文档；仅在 plan mode 上下文中间接提及 |
| `/stats` | "Launch local stats dashboard" | 无独立文档；dashboard 内容与指标未说明 |
| `/usage` | "Show provider usage and limits" | 无独立文档；输出格式与限制含义未说明 |
| `/changelog` | "Show changelog entries" | 无独立文档 |
| `/hotkeys` | "Show keyboard shortcuts" | 无独立文档 |
| `/tools` | "Show tools currently visible" | 无独立文档 |
| `/context` | "Show estimated context usage" | 无独立文档；与 `/compact` 的区别未在外部说明 |
| `/dump` | "Copy transcript to clipboard" | 无独立文档 |
| `/export` | "Export to HTML" | 与 `/share` 共享 `session-operations-export-share-fork-resume.md`，但无 `/export` 专属章节 |
| `/plugins` | "View and manage installed plugins" | 无独立文档；与 `/marketplace` 的精确分工未说明 |
| `/extensions` (`/status`) | "Open Extension Control Center" | 无独立文档 |
| `/agents` | "Open Agent Control Center" | `agent-hub.md` 存在但主要讲 Hub 架构，非 `/agents` 命令专属 |
| `/security` | "Plan/run/compare security scans" | 未找到 `docs/security-scan.md` 直读确认 |
| `/new`, `/clear`, `/drop` | 基本生命周期操作 | 无独立文档页；仅在 `cli-reference.md` 或 compaction 文档中顺带提及 |
| `/exit` | 退出应用 | 无独立文档 |

---

## 五、特殊分类说明

### 5.1 Core Registry 六类数组（79 条顶层命令）
**来源**: `builtin-registry.ts:38-45`（Context7 验证）

1. `BUILTIN_MODE_SLASH_COMMANDS` — /mode 类
2. `BUILTIN_COLLABORATION_SLASH_COMMANDS` — /collab 类
3. `BUILTIN_SESSION_SLASH_COMMANDS` — /session 类
4. `BUILTIN_LIFECYCLE_SLASH_COMMANDS` — /lifecycle 类
5. `BUILTIN_MARKETPLACE_SLASH_COMMANDS` — /marketplace 类
6. `BUILTIN_CONTROL_SLASH_COMMANDS` — /control 类

### 5.2 ACP 可用性规则
**来源**: `docs/slash-command-internals.md`

> "spec 有 handle: 则 ACP 文本模式可用；只有 handleTui: 则 TUI 专属"

- `/pause` 是典型的 **TUI-only** 命令（无 `handle`，只有 `handleTui`）。
- 大多数 lifecycle/session 命令同时具有 `handle` 和 `handleTui`。

### 5.3 Bundled / SDK 注入命令

| 命令 | 类型 | 注入机制 | 文档状态 |
|------|------|---------|---------|
| `/green` | Bundled custom command | `loader.ts` 中 `bundled:green` | 无独立 docs 页；CHANGELOG 提及 |
| `/review` | Bundled custom command | `loader.ts` 中 `bundled:review` | 无独立 docs 页；CHANGELOG 提及 |
| `/autoresearch` | SDK 注入 | `autoresearch/command-resume.md` | 有 SDK prompt 文档，无用户面向文档 |

---

## 六、信源可靠性总结

| 信源 | 成功/失败 | 覆盖范围 | 限制 |
|------|----------|---------|------|
| **DeepWiki MCP** | ✅ 成功 | 六类命令分类、设计意图概述、部分子命令 | 控制类命令未展开；缺少 registry 级逐条描述 |
| **Context7 MCP** | ✅ 成功 | 全部 40+ 条内置命令的逐字 description；/memory /mcp 子命令表 | 对设计意图（why）解释较浅，主要是 what |
| **Web 搜索** | ⚠️ 部分成功 | 找到 `slash-command-internals.md`、GitHub 目录结构 | `site:omp.sh` 搜索无直接命中；官网 docs 页内容较少 |
| **GitHub 直读** | ✅ 成功 | vibe-mode.md、collab.md、compaction.md、memory.md、mcp-config.md、cli-reference.md、slash-command-internals.md | 需要逐个文件读取，无统一索引页 |

---

*报告结束。所有断言均标注来源 URL/渠道；未找到的命令已在第四节明确列出。*
