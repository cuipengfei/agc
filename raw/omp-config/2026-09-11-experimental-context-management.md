# OMP 实验性上下文管理 源码取证

> 来源：can1357/oh-my-pi 源码 `/home/cpf/code-inside/oh-my-pi` (`61a692cf98`)，读取日期 2026-09-11
> 采集日期：2026-09-11

## 实验 rollover 工具

- 要求的工具表面：必须同时启用且可解析 `context_notes`、`new_context`、`read`、`grep` — `session/agent-session.ts:384-393,1830-1835`
- 调用者权限检查：`context_notes` 与 `new_context` 仅在调用者为 tool session manager 的 owner 时才创建 — `tools/context-notes.ts:41-72,89-91,159-161`
- 改开关后需 restart 才会刷新 available tools — `settings-schema.ts:2623-2632`
- 若已启用，session maintenance 仍要求 effective tool surface 具备实验 rollover 工具 — `session/session-maintenance.ts:412-417`

## Notes 提醒 prompt

- 接近 rollover 阈值时，session maintenance 在每个 compaction/reset boundary 最多调度一次提醒 — `session/session-maintenance.ts:420-440`
- 提醒原文：`Make sure to call context_notes to record important state, decisions, changes, evidence, blockers, and next steps before it falls out of the live tail...` — `prompts/system/experimental-context-notes-reminder.md:1-3`
- `context_notes` 大小限制 16 KiB — `tools/context-notes.ts:113-117`

## Notes 持久化位置

- `context_notes` 调用 `manager.ensureOnDisk()`，append custom notebook entry，再 `manager.flush()` — `tools/context-notes.ts:120-141`
- SessionManager flush 路径将条目写入 session JSONL 写入队列并等待队列完成；**不调用 `fsync`**，因此不具备断电级持久性 — `session/session-manager.ts:460-464,1014-1019,1805-1815`

## 新 context 实际拿到什么

- Rollover prompt 说明新 context 从 `context_notes`、保留的 recent tail、最新 user request 开始；`history://current/full` 是按需读取完整 raw branch history 的入口 — `prompts/system/experimental-context-rollover.md:1-3`
- `history://current/full` 解析 caller-bound branch，读取内存 message array 或 persisted session JSONL；它是按需读取入口，不是自动全量注入 — `internal-urls/history-protocol.ts:1-19`

## 当前配置

- `compaction.experimentalContextManagement: false` — `omp/agent/config.yml`
