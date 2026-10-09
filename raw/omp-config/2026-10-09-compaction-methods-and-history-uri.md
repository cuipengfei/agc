# OMP compaction methods & history URI tool support 源码取证

> Source: can1357/oh-my-pi source code at `/home/cpf/code-inside/oh-my-pi` (`d2c894854d`, merged from upstream 2026-10-09)
> Collected: 2026-10-09
> Published: Unknown

## 五种压缩方法

`compaction-methods.ts:11-38` 定义 `COMPACTION_METHODS`，五种方法，均为 `kind: "local"`：

| 方法 | 描述 |
|---|---|
| `remote` | Provider-native server-side compaction (OpenAI Responses `previous_response_id`, Anthropic compaction beta) |
| `snapcompact` | Render conversation history as a bitmap, read back by a vision model, no LLM call |
| `handoff` | Generate a structured markdown handoff document, use as compaction summary |
| `shake` | Locally discard recoverable heavy content (tool outputs, images, thinking), no LLM call |
| `soft` | Use a dedicated model to generate a summary, replace the summarized turns locally |

## 默认 fallback chain

`compaction-methods.ts:43-50` 默认顺序：

```
remote → snapcompact → handoff → shake → soft
```

`resolveCompactionMethodOrder` 处理用户配置：过滤非法项、去重、保留顺序；未列出的默认方法不会自动补回。

运行时判定逻辑（`session-maintenance.ts:5099-5118`）：
- 方法失败（抛错或返回空结果）→ 自动切到下一个
- 方法不可跑（如 remote 无服务端支持、snapcompact 遇到文本模型）→ 跳过
- shake 回收不足 → 继续下一个

例外：手动 `/compact snapcompact` 是 local-only，失败没有 fallback。

## soft 压缩的两次 LLM 调用

soft 走 `compact()`（`compaction.ts:1573`），内部调用两次 LLM：

1. `generateSummary()`（`compaction.ts:849`）：对历史窗口做折叠摘要，多窗口时迭代更新 carried summary，输出预算 `min(0.8 * reserveTokens, 16384)` tokens
2. `generateShortSummary()`（`compaction.ts:2060`）：对保留的 recent tail 做短摘要，输出预算 `min(512, 0.2 * reserveTokens)` tokens

返回 `CompactionResult`（`compaction.ts:145-155`）：`summary`、`shortSummary?`、`firstKeptEntryId`、`tokensBefore`、`details?`、`preserveData?`。

## handoff 的一次 LLM 调用

handoff 走 `SessionHandoff.generateDocument()`（`session-handoff.ts:88`）：

- 使用当前模型（非压缩候选链）
- 输入走完整 live pipeline（系统提示、工具定义、完整消息历史），cache-friendly
- 输出为 markdown 文档，固定模板（`handoff-document.md`）
- 返回后经 `handoffSummaryFromDocument()`（`session-maintenance.ts:365-382`）拆成 `{summary, details}`，无 `shortSummary`
- 手动 `/handoff` 失败直接报错，无 fallback
- 自动触发且 `handoffSaveToDisk=true` 时写磁盘文件

## 实验性 rollover

`experimentalContextManagement: true` 时，自动触发走 `#runExperimentalContextRollover`（`session-maintenance.ts:1675`）：

- 不调用任何压缩方法（不调 LLM）
- 用固定 prompt 作为 `summary` 写入 compaction entry
- 保留 `firstKeptEntryId` 之后的尾部消息
- 配套机制：`context_notes` 工具（模型主动写 notebook）、`history://current/full`（完整历史入口）

rollover prompt（`experimental-context-rollover.md:2`）说明新 context 从 persistent notebook、保留尾部、最新 user request 开始；`history://current/full` 是按需读取完整 raw branch history 的入口。

## history://current/full 工具支持

实测（2026-10-09，当前会话）：

| 工具 | 结果 |
|---|---|
| `read` | 支持，支持行号选择器（`:1-30`、`:15500-15550`、`: -20`） |
| `grep` | 支持，关键词搜索，返回行号和匹配内容 |
| `find` | 支持，语义搜索，返回相关段落和行号 |
| `glob` | 返回 URI 本身，无实际匹配 |
| `ast-grep` | 解析失败（markdown 非代码） |

`history-protocol.ts:310` 声明 `selectors: "lines"`，未声明 grep/find 支持，但实测可用。

**限制条件**：`#resolveCurrentFull`（`history-protocol.ts:371-381`）要求 `context.experimentalContextManagement === true`，否则抛错；再调 `context.getSessionBranch?.()` 取当前 branch，无 branch 时抛错。关闭实验开关或无 live branch 时该 URI 不可解析。

## branch 解析机制

每次解析 `history://current/full` 都重新调 `getSessionBranch()` 取调用方当前 branch，再用 `formatCurrentBranchFullHistory` 渲染（`history-protocol.ts:377-387`）。

- 无 registry、无 on-disk fallback（`history-protocol.ts:291` 源码注释：this view never uses a registry or on-disk fallback）
- 无 live branch（`getSessionBranch` 返回空）时抛错不可解析；会话结束是否必然使其返回空，取决于调用方生命周期，本次未追踪，标为推断
- 若 `getSessionBranch()` 返回另一 branch，则 URI 渲染该 branch 历史；branch 实际切换生命周期本次未追踪，标为推断
- resume 后能否再用，取决于调用方是否重新绑定 live branch 并保持开关开启；调用方生命周期本次未追踪，标为推断

## 当前配置

- `compaction.methodOrder: [shake, handoff, soft]` — `~/.omp/agent/config.yml:301-303`
- `compaction.experimentalContextManagement: true` — `~/.omp/agent/config.yml:304`
