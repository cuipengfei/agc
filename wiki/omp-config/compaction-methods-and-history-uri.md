# OMP Compaction Methods & History URI Tool Support

> Sources: can1357/oh-my-pi source code at `/home/cpf/code-inside/oh-my-pi` (`d2c894854d`), 2026-10-09
> Raw: [compaction methods and history URI (2026-10-09)](../../raw/omp-config/2026-10-09-compaction-methods-and-history-uri.md); [experimental context management (2026-09-11)](../../raw/omp-config/2026-09-11-experimental-context-management.md); [experimental context deep dive (2026-09-12)](../../raw/omp-config/2026-09-12-experimental-context-deep-dive.md)
> Updated: 2026-10-09

## Overview

OMP 提供五种本地压缩方法（remote、snapcompact、handoff、shake、soft），按 `methodOrder` 链式 fallback。soft 和 handoff 都调用 LLM 生成摘要，但 soft 用压缩候选链模型、生成两段摘要；handoff 用当前模型、生成单份 markdown 文档。实验性 rollover 不调用 LLM，依赖 notebook 和 `history://current/full` 恢复上下文。`history://current/full` 支持 read、grep、find 三种工具，compact 后模型可搜索完整历史。

## 五种压缩方法

| 方法 | 调 LLM | 做什么 |
|---|---|---|
| remote | 否（服务端） | 用 OpenAI Responses 或 Anthropic compaction beta 的服务端压缩 |
| snapcompact | 否（视觉模型读图） | 把历史渲染成位图，视觉模型读回 |
| handoff | 是 | 生成固定格式的 markdown 交接文档 |
| shake | 否 | 本地丢弃工具输出、图片、thinking 等重内容 |
| soft | 是 | 用配置的压缩模型生成摘要，替换被裁掉的历史 |

## 默认 fallback chain

默认顺序：`remote → snapcompact → handoff → shake → soft`。用户配置 `methodOrder` 后，过滤非法项、去重、保留顺序；未列出的默认方法不会自动补回。

运行时按顺序尝试，第一个能跑的成功方法执行。失败判定：抛错或返回空结果 → 下一个；方法不可跑（如 remote 无服务端支持）→ 跳过；shake 回收不足 → 下一个。例外：手动 `/compact snapcompact` 失败没有 fallback。

## soft vs handoff

两者都调用 LLM、都写同一个 compaction entry、都截断历史。区别：

| 维度 | soft | handoff |
|---|---|---|
| 模型 | 压缩候选链（`compactionModel` 或 fallback） | 当前模型 |
| LLM 调用次数 | 两次：`generateSummary`（完整摘要）+ `generateShortSummary`（短摘要） | 一次：`generateDocument` |
| 输出 | 完整摘要 + 短摘要（给 UI 显示） | 单份 markdown 文档 |
| 输入 pipeline | 对话序列化成纯文本，包在 `<conversation>` 标签里 | 完整 live pipeline（系统提示、工具定义、消息历史） |
| 落盘 | 不写磁盘 | 自动触发且 `handoffSaveToDisk=true` 时写磁盘 |
| 失败行为 | 自动 fallback 到下一个方法 | 手动直接报错，无 fallback |

## 实验性 rollover

`experimentalContextManagement: true` 时，自动触发走 rollover，不调用任何压缩方法。用固定 prompt 作为 `summary` 写入 compaction entry，保留 `firstKeptEntryId` 之后的尾部消息。

rollover 后模型有三样恢复机制：
1. **notebook**：模型在 rollover 前被提醒写 `context_notes`，记录任务状态、决定、改动文件、阻塞点、下一步
2. **保留尾部**：`firstKeptEntryId` 之后的近期消息保留在上下文里
3. **`history://current/full`**：完整历史入口，支持 read、grep、find

如果模型没写 notebook，它仍可用 grep 或 find 搜索完整历史，找回之前的工作内容。

## history://current/full 工具支持

实测当前会话（2026-10-09）：

| 工具 | 结果 |
|---|---|
| `read` | 支持，支持行号选择器 |
| `grep` | 支持，关键词搜索 |
| `find` | 支持，语义搜索 |
| `glob` | 返回 URI 本身，无实际匹配 |
| `ast-grep` | 解析失败（markdown 非代码） |

`history-protocol.ts` 声明 `selectors: "lines"`，未声明 grep/find 支持，但实测可用。在下述 gate 满足时，compact 或 rollover 后模型可用这些工具主动恢复之前的上下文，不必完全依赖 notebook 或摘要。

**限制条件**：`history://current/full` 仅在 `experimentalContextManagement === true` 且存在 caller-bound live session branch 时可用。关闭实验开关时，普通 compact 后的模型无法访问该 URI。

每次解析该 URI 都重新调 `getSessionBranch()` 取调用方当前 branch（`history-protocol.ts:377-387`），无 registry、无 on-disk fallback。若 `getSessionBranch()` 返回另一 branch，则 URI 渲染该 branch 历史；无 live branch 时抛错不可解析。branch 切换与 resume 后能否再用，取决于调用方是否重新绑定 live branch，调用方生命周期本次未追踪，标为推断。

## 当前配置

- `compaction.methodOrder: [shake, handoff, soft]`
- `compaction.experimentalContextManagement: true`

自动压缩时实验性 rollover 优先，methodOrder 链只在手动 `/compact` 或 rollover 关闭时生效。

## See Also

- [OMP Experimental Context Management vs OpenCode DCP](experimental-context-vs-dcp.md) — 实验性 rollover 与 DCP 的对比
- [Compaction Model 与 Thinking Level](compaction-model.md) — 压缩模型选择与 thinking 档位
- [Compaction 阈值解析机制](compaction-threshold.md) — 阈值计算与后备空间
- [Snapcompact 机制](snapcompact-mechanics.md) — 视觉模型读图的压缩方法
