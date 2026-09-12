# OMP 实验性上下文管理 深层源码取证（修正与补充）

> 来源：can1357/oh-my-pi 源码 `/home/cpf/code-inside/oh-my-pi` (`db038d5bee`)，读取日期 2026-09-12
> 采集日期：2026-09-12
> 关联：纠正 `raw/omp-config/2026-09-11-experimental-context-management.md` 中 `history://current/full` 的存储语义错误

## 工具 schema（已验证）

- `context_notes` schema：`{ text?: string }`，无 `i` 参数 — `tools/context-notes.ts:20-22`
- `new_context` schema：`{}`，零参数 — `tools/context-notes.ts:24`
- 注入条件：session 工具列表含 `read` + `grep`，且 `!restrictToolNames` — `tools/index.ts:569-577`

## 三重生效门

1. 配置开关：`compaction.experimentalContextManagement === true` — `settings-schema.ts:2623`
2. 工具表面：运行时 `hasExperimentalContextRolloverTools()` 确认四项 capabilities（`context_notes`、`new_context`、`read`、`grep`）都在 effective tool surface — `session-maintenance.ts:413-416`
3. Owner + live branch：`sessionManager` 存在、未 disposed、身份校验通过 — `context-notes.ts:41-48`

## history://current/full 的精确语义（修正）

- 只解析 **caller-bound live session branch**，无 registry、无 on-disk fallback — `history-protocol.ts:267-285`
- 需要 `context.experimentalContextManagement === true` + `context.getSessionBranch()` 返回有效 branch — `history-protocol.ts:268-275`
- 与普通 `history://<agentId>` 是不同路径：后者走 registry-based resolution，**不需要**实验开关 — `history-protocol.ts:286-303`
- `read` 和 `grep` 都能通过该 URI 恢复原始消息与 tool output — `history-protocol.ts` 注册在 internal-urls 下，由 `read`/`grep` 统一解析

## 自动路径 vs 显式路径的分流

- 自动触发或无显式 mode/focus 的 manual `/compact` → `#runExperimentalContextRollover` — `session-maintenance.ts:1289`
- 显式 mode 或 focus 的 `/compact` → bypass 实验路径，走旧方法管线（`remote → snapcompact → handoff → shake → soft`）— `session-maintenance.ts:1198-1202`

## new_context 的消费语义

- `new_context` 的信号在当前 turn **结束后**才消费，turn 正常完成 — `session-maintenance.ts:2067-2093`
- 显式 `new_context` 调用可绕过 `compaction.enabled` 开关 — `session-maintenance.ts:2072-2073`

## `firstKeptEntryId` 算法

由 `@oh-my-pi/pi-agent-core/compaction` 的 `prepareCompaction` 计算：

1. **预算**：`keepRecentTokens`（默认 20,000），按实际 token / 估算 token 的比例调整。
2. **从后往前累加**：从最新消息开始向后（向旧消息方向）累加 token，直到达到预算。
3. **找合法切点**：达到预算后，在其后找最近的合法切点；**不在 tool result 上切**。
4. **取 ID**：合法切点所在 entry 的 ID 就是 `firstKeptEntryId`。

新 window 实际追加的是 retained tail 中可转成 model message 的 entry 类型（message、custom_message、branch_summary 等），不是所有 journal entry 类型都进新 window — `session-context.ts:536-546`。

## Rollover 保留内容

- Notebook（`context_notes` 写入）
- 最近一条 user request entry — `session-context.ts:517-528`
- 从 `firstKeptEntryId` 开始（包含该 entry）的 retained tail，限于可转成 model message 的 entry 类型
- Raw history 通过 `history://current/full` 按需回溯（非自动注入）

## 系统提示注入

- Rollover 边界注入 `<context-window-rollover>` — `prompts/system/experimental-context-rollover.md:1-3`
- 阈值临近注入 `<context-window-reminder>` — `prompts/system/experimental-context-notes-reminder.md:1-3`

## 配置更新

- `compaction.experimentalContextManagement: true` — `omp/agent/config.yml`（2026-09-12 pull 后）
## 系统提示原文（用于 grounding）

`prompts/system/experimental-context-notes-reminder.md` 全文：

<context-window-reminder>
The current context window is nearing its rollover threshold. Before important details fall out of the live tail, use context_notes to save a concise durable notebook: current task state, decisions, changed files, evidence, blockers, and exact next steps. Keep the notebook a compact index with one line per item, no copied logs or file bodies, and replace stale entries instead of appending so it stays well under the 16 KiB cap. Do not call new_context until the notebook is current.
</context-window-reminder>
