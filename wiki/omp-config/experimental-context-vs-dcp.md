# OMP Experimental Context Management vs OpenCode DCP

> Sources: can1357/oh-my-pi source code at `/home/cpf/code-inside/oh-my-pi` (`db038d5bee`), 2026-09-12; OpenCode DCP official repository, 2026-09-11
> Raw: [experimental context management (2026-09-11)](../../raw/omp-config/2026-09-11-experimental-context-management.md); [experimental context deep dive (2026-09-12)](../../raw/omp-config/2026-09-12-experimental-context-deep-dive.md); [OpenCode DCP 官方项目摘录](../../raw/omp-config/2026-09-11-opencode-dcp-project.md); [OpenCode DCP 本地配置摘录](../../raw/omp-config/2026-09-11-opencode-dcp-config.md)
> Updated: 2026-09-12

## 术语表

| 术语 | 白话定义 |
|---|---|
| **Context window** | LLM 一次能接收的最大 token 量；超过就必须丢掉旧内容 |
| **Compaction** | OMP 处理 context 过长的旧机制，通过多种方法（见下文）把旧内容压缩/丢弃 |
| **Rollover** | 实验机制处理 context 过长的方式：换到新 context window，保留 notebook 和 recent tail。旧 compaction 也重建模型可见 context，只是不把这个过程叫 rollover |
| **Compaction entry** | Session 历史里的一条特殊记录，标记一次 compaction/rollover 的边界和摘要信息 |
| **Live branch** | 当前活跃 session 的内存历史链；`history://current/full` 读的是这个，不是磁盘文件 |
| **Owner** | 当前 session 的主 agent（即用户直接对话的那个），不是 advisor 或 task subagent |
| **Effective tool surface** | 当前 session 实际可用的工具列表；某些上下文（如 task subagent）会限制这个列表 |
| **Transcript** | Session 的完整对话历史，包含用户消息、assistant 消息、tool 调用和返回 |
| **Custom instructions** | 用户给 compaction 的额外文字指令（如 "把改动过的文件列表保留下来"） |
| **Internal guidance** | OMP 内部给 compaction 的引导参数（如 focus 或 mode） |
| **Summarization model** | 专门用来生成对话摘要的 LLM；`handoff`/`soft` 等方法会调用它 |
| **Retained tail** | Rollover 后留在新 window 里的近期历史片段，从 `firstKeptEntryId` 开始 |
| **Notebook** | `context_notes` 写入的 16 KiB 持久文本，跨 rollover 保留 |
| **First kept entry ID** | Rollover 时决定从哪条历史记录开始保留的标记点；见下文算法 |

## 一句话结论

两者都在处理"context 太长怎么办"，但机制不同：

- **OMP 实验机制**：在自动触发、threshold/overflow/idle/incomplete 等场景，或 LLM 显式请求时，用 notebook + 换窗（rollover）替代摘要压缩。
- **OpenCode DCP**：不改 session history，而是在 outbound request 前把可裁剪的旧内容替换/压缩成 summary 或 placeholder。

## 机制对比

| 问题 | OMP experimental context management | OpenCode DCP |
|---|---|---|
| 主要动作 | `context_notes` + `new_context` rollover | outbound message transform |
| 原 session history | 保留，提供 `history://current/full` 按需读取 | 不直接删除；裁剪的是这次发给模型的视图 |
| notes/摘要从哪来 | LLM 自己根据系统提示调用 `context_notes` 写 notebook | DCP 对旧 tool output / messages 做 summary/placeholder |
| 新 context 自动拿到什么 | notebook、保留的 recent tail、最新 user request | 当前请求中被保留的 trimmed context |
| 何时可启用 | 开关为 true、实验 tool surface 可用、调用者是 owner | 插件在 OpenCode 运行链中实际加载 |
| 主要风险 | notes 没写好时，新 context 接不上工作状态 | 被压缩掉的内容仍有价值时，模型当前请求里看不到细节 |

## OMP 的实际流程

1. **触发场景**：自动 rollover 的 reason 包括 `overflow`（超出 token 上限）、`threshold`（逼近阈值）、`idle`（空闲超时）、`incomplete`（未完成的 turn 需要重建 context）。LLM 也可显式调用 `new_context` 请求 rollover。
2. **阈值提醒**：接近 rollover 阈值时，OMP 最多每个 compaction/reset boundary 注入一次 `<context-window-reminder>` 系统提示。提示明确写着："Do not call new_context until the notebook is current"。这是对模型的系统指令，不是可选建议。
3. **写 notebook**：LLM 应调用 `context_notes` 记录任务状态、决定、改动文件、证据、阻塞点、下一步。工具/运行时层面没有强制前置校验，但系统提示要求先写再 rollover。
4. **请求换窗**：LLM 调用 `new_context` 请求 fresh window；这是**显式请求**，系统在当前 turn 结束后执行。
5. **自动 rollover 也可不经过 `new_context`**：即使模型没调用 `new_context`，自动触发条件满足时系统仍会执行 rollover。
6. **新 context 拿到什么**：notebook + 保留的 recent tail（从 `firstKeptEntryId` 开始，包含该 entry，且该 entry 及其后能被转成 model message 的类型）+ 最新 user request。若需要旧细节，再读 `history://current/full`。

`context_notes` 会写入当前 session branch 的 custom journal entry，并 flush 到 session JSONL 写入队列；这不是纯 RAM-only，但也不是 power-loss durable。

## `firstKeptEntryId` 怎么选

由 `@oh-my-pi/pi-agent-core/compaction` 的 `prepareCompaction` 计算（旧 compaction 和实验 rollover 都用同一个函数）：

1. **预算**：`keepRecentTokens`（默认 20,000），按实际 token / 估算 token 的比例调整。
2. **从后往前累加**：从最新消息开始向后（向旧消息方向）累加 token，直到达到预算。
3. **找合法切点**：达到预算后，在其后找最近的合法切点；**不在 tool result 上切**。
4. **取 ID**：合法切点所在 entry 的 ID 就是 `firstKeptEntryId`。

新 window 实际追加的是 retained tail 中**可转成 model message 的 entry 类型**（message、custom_message、branch_summary 等），不是所有 journal entry 类型都进新 window。

## OMP 的启用条件

三重门，全部满足才生效：

| 门 | 要求 | 源码位置 |
|---|---|---|
| 配置开关 | `compaction.experimentalContextManagement === true` | `settings-schema.ts:2623` |
| 工具表面 | 四项 required tool-surface entries（`context_notes`、`new_context`、`read`、`grep`）必须在 effective tool surface；`read`+`grep` 存在时自动注入实验工具 | `tools/index.ts:569-577`；运行时二次确认 `hasExperimentalContextRolloverTools()` — `session-maintenance.ts:413-416` |
| Owner + live branch | `sessionManager` 存在、未 disposed、身份校验通过 | `context-notes.ts:41-48` |

改开关后需 restart，工具列表不热刷新。

### 自动路径 vs 显式路径

- **自动触发**或**无显式 mode、customInstructions、internalGuidance 的 manual `/compact`** → 走 `#runExperimentalContextRollover`，`method: undefined`，不调用 summarization model — `session-maintenance.ts:822-831`
- **显式 mode、customInstructions 或 internalGuidance 的 `/compact`** → bypass 实验路径，走旧方法管线（`remote → snapcompact → handoff → shake → soft`）— `session-maintenance.ts:1198-1202`

旧管线中，`snapcompact`（图像归档）和 `shake`（文本裁剪）不调用 LLM；`remote` 可走 provider-native compaction；只有 `handoff`/`soft` 等方法才生成 LLM 摘要。

### `new_context` 的消费语义

- 信号在**当前 turn 结束后**才消费；turn 正常完成，随后提交边界 — `session-maintenance.ts:2067-2093`
- 显式调用可绕过 `compaction.enabled` 开关；即使用户关了 auto-compact，agent 调用此工具仍会触发 rollover — `session-maintenance.ts:2072-2073`

### `history://current/full` 的精确语义

- **只解析 caller-bound live session branch**，无 registry、无 on-disk fallback — `history-protocol.ts:267-285`
- **Gate**：`experimentalContextManagement === true` + `getSessionBranch()` 返回有效 branch；这是 URI 自身的 gate，与 rollover 的四项 tool-surface gate 不同 — `history-protocol.ts:268-275`
- 与普通 `history://<agentId>` 是不同路径：后者走 registry-based resolution，**不需要**实验开关 — `history-protocol.ts:286-303`
- `read` 和 `grep` 都能通过该 URI 恢复原始消息与 tool output

## DCP 的实际机制

DCP 的公开定位是 OpenCode 的 dynamic context pruning plugin。它做的是 outbound transform：

- `turnProtection.turns` 保护 tool invocation 后最近若干 message turns 的 tool outputs；
- `protectUserMessages: true` 单独保护 user messages；
- `minContextLimit` 是提醒下限；`maxContextLimit` 是 soft upper limit / compression nudge 条件；
- `deduplication`、`purgeErrors` 是"发给模型的视图被裁剪"，不是删除用户历史本身。

本机已写入 DCP 配置：

- `turnProtection.enabled: true`
- `turns: 4`
- `protectUserMessages: true`
- `minContextLimit: 55%`
- `maxContextLimit: 65%`

这只证明配置已写入，不证明运行时已加载该插件。

## 选型判断

| 场景 | 更贴近的机制 |
|---|---|
| 你想让 agent 在跨 context 时保留工作状态，并可回查原始 history | OMP experimental context management |
| 你只想让长会话发给模型的上下文变轻，旧 tool output 不再占住当前请求 | OpenCode DCP |
| 你想在 OpenCode 侧减少旧内容干扰，但不删除历史本身 | OpenCode DCP |
| 你更关心 OMP 内部把"换新 context"做成显式工具链 | OMP experimental context management |

## 证据边界

OMP 部分来自本机 fork 源码与 prompt 文件；DCP 部分来自官方仓库 README 与本地配置摘录。本轮未运行 DCP 的实际 transform，也未交互实测 OMP rollover UI。

## See Also

- [OMP Config Semantics](config-semantics.md) — 24 项普通设置的触发、行为与取舍
- [OMP Runtime Controls](runtime-controls.md) — steering / follow-up / interrupt 与 parse regression tooling