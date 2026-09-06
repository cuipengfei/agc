# OMP Mnemopi Auto-Recall 注入机制

> Sources: 本地 @oh-my-pi/pi-coding-agent 与 @oh-my-pi/pi-mnemopi 包源码, 2026-09-06
> Raw: [2026-09-06-mnemopi-auto-recall-injection](../../raw/omp-mnemopi/2026-09-06-mnemopi-auto-recall-injection.md); [2026-09-06-mnemopi-auto-recall-corrections](../../raw/omp-mnemopi/2026-09-06-mnemopi-auto-recall-corrections.md)
> Updated: 2026-09-06

## Overview

Mnemopi 的记忆注入不是「session 一启动就发生」，而是在**首个 agent prompt 之前**（`beforeAgentStartPrompt`）做一次 auto-recall，且常规流程**只注入一次**（`hasRecalledForFirstTurn` 防重复）。检索 query 由当前消息加历史窗口动态构造，结果以 `<memories>` 块 append 到 base system prompt 尾部并持久化。理解这套机制对判断 prompt cache 命中、记忆可见性、以及 quit/resume 行为至关重要。

## 注入时机与次数

`beforeAgentStartPrompt(promptText)` 在当前 user turn 已提交、模型首次生成前调用。三个前置检查（state.ts:473-475）：`autoRecall` 须开启、`hasRecalledForFirstTurn` 须为 false、当前 prompt 非空。注入后 `hasRecalledForFirstTurn` 置 true（state.ts:481），后续常规 turn 全部跳过——**常规 auto-recall 仅注入一次**，不是每 turn 都注入。compaction 场景另有 `recallForCompaction`，不在常规路径。

## query 构造

`composeRecallQuery(latestPrompt, queryMessages, recallContextTurns)`（content.ts:118-138）：

- `queryMessages = [...history, 当前消息]`（当前消息已追加进去）。
- **全新 session**：`queryMessages` 里只有当前消息（无历史），`sliceLastTurnsByUserBoundary` 取到的 contextual 经去重（132 行跳过与 latest 相同的当前消息）后 `contextLines.length === 0`（content.ts:136），直接返回当前消息，无 Prior context 块。
- **恢复已有 session**：`sliceLastTurnsByUserBoundary(queryMessages, 3)` 取最后 3 个 user boundaries（含当前这条），去重当前消息后，Prior context 最多含「当前 + 前 2 条 user 消息」。
- 拼接后按 `recallMaxQueryChars`（默认 4000 字符）截断，保留最新 prompt 优先；构造时去除 memory tags 防反馈循环。

`recallContextTurns` 默认 3，是首轮 auto-recall 的历史窗口参数，不是注入周期。

## 检索与数量预算

`recallEnhanced` 默认启用 synonyms（同义词扩展）、intent（意图分类调权重）、MMR（多样性重排）；向量由 `embedQuery` 自动生成（需配 embedding provider）；`includeFacts=true`。注入条数 `recallLimit` 默认 8 条，注入预算 `injectionTokenLimit` 默认 5000 tokens。

veracity 权重（recall.ts:61-70）：`stated`/`true`/`likely_true`=1.0、`unknown`=0.8、`inferred`=0.7、`imported`=0.6、`tool`=0.5、`false`=0。

## 注入位置与持久化

`<memories>` 块由 `formatRecallBlock` 渲染，每条为 `- {content} [source] (date)`，前缀含固定文案与动态字段 `Current time: ...UTC`。`buildDeveloperInstructions` 的拼装顺序是 `STATIC_INSTRUCTIONS → lastRecallSnippet`——**记忆块在 base prompt 尾部**。注入时若 refresh 后 base prompt 未含该块，则 `[...previousBaseSystemPrompt, injected]` 追加为最后一段，并写回 `#baseSystemPrompt` 成为本 session 的持久 base（session-tools.ts:1506-1516）。整个 system prompt 位于 context 头部，记忆块在 system 段内的尾部。

## 记忆类型与可编辑性

`memory_edit` 的 op 枚举为 `update` / `forget` / `invalidate`。类型可编辑性（实测）：

| 类型（store） | recall 标注 | 可编辑？ | 证据 |
|---|---|---|---|
| facts | `[facts]` | 只读 | 三 op 实测全部返回「read-only fact... cannot be edited」 |
| working | `[coding-agent-transcript]` | 可编辑 | `invalidate` 实测成功 |
| episodic | — | 未验证 | 本次未实测 episodic 的可编辑性 |

bank 为 per-project SQLite（`mnemopi.db`）。实测某 bank：working 76 / episodic 4 / facts 306 / triples 2 / graph_edges 592，文件 6.9MB。表结构含 `working_memory`、`episodic_memory`、`facts`、`triples`、`graph_edges` 五类（graph_edges 为关系表）。

## quit/resume 与 prompt cache

resume 时新建 `MnemopiSessionState`，`hasRecalledForFirstTurn` 默认 false（state.ts:252），故首个新 turn 会重新 auto-recall 并重新注入。`formatRecallBlock` 每次写入当时的 `Current time: ...UTC`，而 `formatCurrentTime` 只精确到 UTC 分钟（content.ts:78-84，格式 `YYYY-MM-DD HH:min`，无秒）。因此 quit/resume 若跨分钟，时间戳文本确定不同、system prompt bytes 确定改变；若在同一分钟内 resume，时间戳文本可能相同。cache 是否命中取决于 provider 的缓存键与前缀策略（代码无法断言必破或必命中），代码只能证明：跨分钟 resume 时注入导致的 bytes 变化是确定的，同分钟内则不一定。

## 已知边界

- facts 类型只读，错误结论无法修改/作废/删除（实测 `56ad7ae6a54b3838`）。

## See Also

- [OMP Mnemopi Consolidation 生命周期](consolidation-lifecycle.md) — consolidation 路径、scoping、已知坑
- [OMP 记忆后端对比](memory-backends-comparison.md) — Mnemopi vs Hindsight vs Sharpshooter
