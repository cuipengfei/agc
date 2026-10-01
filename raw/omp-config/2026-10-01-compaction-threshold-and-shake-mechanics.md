# OMP Compaction 阈值解析与 Shake 机制源码取证

> Source URL: 本地源码树 /home/cpf/code-inside/oh-my-pi（git HEAD 73a11421fe，v18.2.11-58，2026-09-23）
> Collected: 2026-10-01
> Published: Unknown

## Compaction 阈值解析（packages/agent/src/compaction/compaction.ts）

`shouldCompact`（:364-368）：`shouldCompact(contextTokens, contextWindow, settings)`，内部调 `resolveThresholdTokens(contextWindow, settings)`，`contextTokens > thresholdTokens` 即触发。入参没有模型 `maxTokens`。

`resolveThresholdTokens`（:389-413）三种模式，全部以 `contextWindow` 为唯一基数：

1. `thresholdTokens > 0`：固定值，clamp 到 `[1, contextWindow - 1]`（"Clamp to [1, contextWindow - 1] so there's always room"）。
2. `thresholdPercent > 0`：`Math.floor(contextWindow * (clampedThresholdPercent / 100))`，percent clamp 到 [1, 99]。
3. 两者均为哨兵 -1（默认）：`Math.max(0, Math.min(contextWindow - 1, contextWindow - resolveBudgetReserveTokens(contextWindow, settings)))`。

reserve 计算（:334-336, :350-352）：

- `effectiveReserveTokens = Math.max(Math.floor(contextWindow * 0.15), settings.reserveTokens ?? DEFAULT_RESERVE_TOKENS)`，注释："Effective reserve: at least 15% of context window or the configured floor (defaulting to DEFAULT_RESERVE_TOKENS when unset), whichever is larger."
- `DEFAULT_RESERVE_TOKENS = 16384`（:213）。
- `resolveBudgetReserveTokens`：reserve 未显式配置且默认 reserve 相对小窗口不可行时退回比例 reserve `Math.max(1, Math.floor(contextWindow * 0.15))`。

`DEFAULT_COMPACTION_SETTINGS`（:230-237）：`enabled: true, strategy: "context-full", thresholdPercent: -1, thresholdTokens: -1, midTurnEnabled: true, keepRecentTokens: 20000, autoContinue: true`。reserveTokens 刻意缺省（:227-229 注释：unset 是 provenance 信号）。

settings-schema（packages/coding-agent/src/config/settings-schema.ts:2566-2591）：`compaction.thresholdPercent` default -1，`compaction.thresholdTokens` default -1。

模型 `maxTokens` 在 compaction.ts 中只出现在摘要自身的输出预算：`summarizeConversation` 里 `const maxTokens = Math.min(Math.floor(0.8 * reserveTokens), MAX_SUMMARY_TOKENS)`（:869）；`MAX_SUMMARY_TOKENS = DEFAULT_RESERVE_TOKENS`（:225），注释说 120k-token 摘要会让模型照抄而非压缩。`summaryInputBudgetTokens(model, maxTokens)`（:802-807）用 `model.contextWindow` 打八折再减摘要预算，同样不读 `model.maxTokens`。

调用侧（packages/coding-agent/src/session/session-maintenance.ts:3074、:547、:2005、:2069、:2233、:3648、:3830、:5156；session/context-usage-runtime.ts:26）均传 `model.contextWindow`。

## 与旧记录的差异

2026-09-06 的 raw（raw/omp-config/2026-09-06-compaction-model-resolution.md）记载 `thresholdPercent（default 85）、thresholdTokens（default -1，UI 描述 "overrides percentage if set"，-1 即退回 percentage）`。本次在同一源码树（HEAD 2026-09-23）读到两者 default 均为 -1。default 85 已被 -1（reserve 模式）取代。

## Shake 机制（packages/agent/src/compaction/shake.ts）

三档预设（:47-75）：

```typescript
export const DEFAULT_SHAKE_CONFIG: ShakeConfig = {
	protectTokens: 16_000,
	minSavings: 4_000,
	protectedTools: ["skill", isSkillReadToolResult, isArtifactRecoveryToolResult],
	fenceMinTokens: 400,
};
export const AGGRESSIVE_SHAKE_CONFIG: ShakeConfig = {
	protectTokens: 4_000,
	minSavings: 0,
	protectedTools: ["skill", isSkillReadToolResult],
	fenceMinTokens: 400,
};
export const RESCUE_SHAKE_CONFIG: ShakeConfig = {
	...AGGRESSIVE_SHAKE_CONFIG,
	protectTokens: 0,
	protectedTools: [...AGGRESSIVE_SHAKE_CONFIG.protectedTools, isArtifactRecoveryToolResult],
};
```

AGGRESSIVE 注释（:54-59）："Manual `/shake`: aggressive — no savings threshold and drops eligible regions across history, artifact recovery reads included (the user's full escape hatch). Still keeps a small recent tail so it cannot strip the tool results the agent is currently working from (#7776)."

RESCUE 注释（:70-72）："Rescue must be able to elide the newest oversized result even inside the manual preset's recent-tail window (#7776) — a dead-end recovery that cannot drop its blocker is not a recovery."

裁剪对象（`collectShakeRegions` :316-376 及其 doc comment :301-315）：

- "collects the text from eligible tool-result messages (honoring `protectedTools` and skipping already-pruned results) and large fenced/XML blocks inside user/developer/assistant/custom messages."
- "`toolCall` blocks are never touched (tool-call/result pairing is preserved) and regions never span a message boundary. When the combined estimated savings is below `minSavings`, returns `[]` (no-op)."
- 保护窗：entry 之后的内容不足 `protectTokens` 则跳过（:349）；`useless === true && isError !== true` 的 tool result 即使在保护窗内也可裁（:346-349："Useless-flagged results carry no information once consumed; they are eligible even inside the protect-recent window."）。
- 已 prune（`prunedAt !== undefined`）与受保护工具结果跳过（:351-353）。
- 消息文本块：`collectBlockRegions`（:257-279）对 assistant 消息的 text block、user/developer 消息、custom_message 都扫描；`scanTextForBlockRanges`（:157-209）只定位 fenced code block 和顶层 XML 段；`fenceMinTokens` 400 以下的块不合格。
- XML 检测保守（:107-110）："Lowercase tag names only — conservative by design (uppercase / mixed-case tags are ignored)."
- 替换只动定位区间（`applyShakeRegion` :426-461）；占位符成本估计 `PLACEHOLDER_TOKEN_ESTIMATE = 16`（:78）。
- compaction boundary 之前的 entry 跳过（:331-339："Entries before the compaction boundary are summarized away and never sent — shaking them only churns persisted history"）。

`/shake` 变体（本仓库 wiki/omp-slash-commands/builtin-slash-commands.md:89）："精确丢弃重内容（elide 默认 / images / thinking），无 LLM 调用"。

## protectTokens 16000 与模型输出上限无关的取证

- `git log -S '16_000' -- packages/agent/src/compaction/shake.ts` 唯一命中：417a1a1d32 "feat(agent): added shake compaction strategy primitives"（2026-05-31）。
- 该提交中 DEFAULT_SHAKE_CONFIG 即为 `protectTokens: 16_000`，注释只有 "Auto-shake config: protects the live tail, conservative thresholds."；AGGRESSIVE 当时 protectTokens 为 0（后由 c3da093a1d "fix(compaction): manual /shake keeps a recent tail of tool results" 改为 4000）。
- 该提交 CHANGELOG 条目："Added `shake` compaction primitives ... under `@oh-my-pi/pi-agent-core/compaction`. These detect heavy context regions — whole tool-call results plus large fenced/XML blocks — and either elide them with placeholders or extractively compress them through an injected completion backend (no LLM summary cut-point)."
- 全仓库 grep `protectTokens`：生产代码只有 shake.ts 三档预设与 pruning.ts 的 DEFAULT_PRUNE_CONFIG（protectTokens: 40_000，pruning.ts:55），无任何从 model.maxTokens 派生的路径；覆盖值只出现在测试里。
