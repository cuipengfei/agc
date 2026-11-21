# OMP 19.0.1 自动换窗运行取证：实验性 rollover 未先执行 shake

> Source: OMP 19.0.1 session JSONL、runtime log 与已安装源码；本机路径 `/home/cpf/.omp/agent/sessions/-code-inside-agc/`、`/home/cpf/.omp/logs/omp.2026-11-21.<PID>.log`、`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/session/session-maintenance.ts`
> Collected: 2026-11-21
> Published: Unknown

## 事件归属核对

父会话 JSONL `/home/cpf/.omp/agent/sessions/-code-inside-agc/<SESSION_FILE>.jsonl` 含有：

```json
{"type":"session","version":3,"id":"<SESSION_ID>","timestamp":"2026-11-20T11:58:21.318Z","cwd":"/home/cpf/code-inside/agc","parentSession":null,"title":"Pop up herdr and omp notifications on Windows host","titleSource":"auto"}
{"type":"compaction","id":"<ENTRY_ID>","timestamp":"2026-11-21T04:21:03.327Z","parentId":"<ENTRY_ID>","tokensBefore":370256,"firstKeptEntryId":"<ENTRY_ID>","details":{"kind":"experimental-context-rollover","version":1}}
```

续接会话 JSONL `/home/cpf/.omp/agent/sessions/-code-inside-agc/<SESSION_FILE>.jsonl` 的 session entry 指回父会话：

```json
{"type":"session","version":3,"id":"<SESSION_ID>","timestamp":"2026-11-21T04:27:03.710Z","cwd":"/home/cpf/code-inside/agc","parentSession":"<SESSION_ID>","providerPromptCacheKey":"<SESSION_ID>","title":"Pop up herdr and omp notifications on Windows host","titleSource":"auto"}
```

同一续接 JSONL 也保存了 compaction entry `<ENTRY_ID>`，字段与父会话中的记录一致。

## Runtime log 原文

`/home/cpf/.omp/logs/omp.2026-11-21.<PID>.log:313-314`：

```json
{"timestamp":"2026-11-21T12:21:03.331+08:00","level":"debug","pid":<PID>,"message":"advisor context reset","sessionId":"<SESSION_ID>","reason":"experimental-context-rollover","lastCount":715,"pending":1,"backlog":5}
{"timestamp":"2026-11-21T12:21:03.426+08:00","level":"debug","pid":<PID>,"message":"Mid-run compaction ran between provider calls","sessionId":"<SESSION_ID>","contextTokens":370256,"contextWindow":400000,"methods":["shake","handoff","soft"],"goalActive":false,"messagesBefore":715,"messagesAfter":20}
```
换窗前两次阈值决策 `/home/cpf/.omp/logs/omp.2026-11-21.<PID>.log:290,302`：

```json
{"timestamp":"2026-11-21T12:12:52.621+08:00","level":"debug","pid":<PID>,"message":"Auto-compaction threshold decision","sessionId":"<SESSION_ID>","phase":"post-agent-end","goalModeEnabled":false,"stopReason":"stop","sameModel":true,"contextWindow":400000,"methods":["shake","handoff","soft"],"thresholdTokens":360000,"assistantUsageContextTokens":329780,"storedContextTokens":348003,"resolvedContextTokens":348003,"postMaintenanceContextTokens":348003,"maintenanceTokensFreed":0,"shouldCompact":false,"contextPromotionEnabled":false}
{"timestamp":"2026-11-21T12:17:40.572+08:00","level":"debug","pid":<PID>,"message":"Auto-compaction threshold decision","sessionId":"<SESSION_ID>","phase":"post-agent-end","goalModeEnabled":false,"stopReason":"stop","sameModel":true,"contextWindow":400000,"methods":["shake","handoff","soft"],"thresholdTokens":360000,"assistantUsageContextTokens":336404,"storedContextTokens":358849,"resolvedContextTokens":358849,"postMaintenanceContextTokens":358849,"maintenanceTokensFreed":0,"shouldCompact":false,"contextPromotionEnabled":false}
```
## 已安装源码摘录

`@oh-my-pi/pi-coding-agent` 19.0.1，`src/session/session-maintenance.ts:5504-5525`：

```ts
const compactionSettings = this.#compactionSettings;
// An explicit model-requested rollover bypasses the Auto-Compact toggle;
// automatic threshold rollover stays gated exactly as before.
const explicitNewContextRequest = options.explicitNewContextRequest === true;
if (reason !== "idle" && !compactionSettings.enabled && !explicitNewContextRequest) {
	return COMPACTION_CHECK_NONE;
}
// Every threshold caller and strategy goes through here, so the fixed-context gate lives here once.
if (reason === "threshold" && !explicitNewContextRequest) {
	const deadEnd = this.#thresholdFixedContextDeadEnd();
	if (deadEnd) return deadEnd;
}
if (this.#usesExperimentalContextManagement()) {
	return await this.#runExperimentalContextRollover(reason, willRetry, options);
}
// The explicit request is valid only on the notes-backed rollover path.
// If the experimental capability disappeared between request recognition
// and this dispatch (tool surface or settings changed while tool results
// were being persisted), drop the stale request rather than fall through
// to ordinary summary compaction: no summary-provider request was agreed.
if (explicitNewContextRequest) return COMPACTION_CHECK_NONE;
const methods = resolveCompactionMethodOrder(compactionSettings.methodOrder);
if (methods.length === 0) return COMPACTION_CHECK_NONE;
```

`src/session/session-maintenance.ts:2098-2128`：

```ts
const result =
	prepared.kind === "fromHook"
		? {
				summary: prepared.summary,
				shortSummary: prepared.shortSummary,
				firstKeptEntryId: prepared.firstKeptEntryId,
				tokensBefore: options.triggerContextTokens ?? prepared.tokensBefore,
				details: {
					kind: "experimental-context-rollover",
					version: 1,
					hookDetails: prepared.details,
				},
				preserveData: prepared.preserveData,
				providerReplayThroughEntryId: prepared.providerReplayThroughEntryId,
			}
		: {
				summary: experimentalContextRolloverPrompt,
				shortSummary: undefined,
				firstKeptEntryId: preparation.firstKeptEntryId,
				tokensBefore: options.triggerContextTokens ?? preparation.tokensBefore,
				details: { kind: "experimental-context-rollover", version: 1 },
				preserveData: prepared.preserveData,
			};
await this.#commitCompactionEntry({
	...result,
	fromExtension,
	method: undefined,
	codexCompaction: undefined,
	advisorResetReason: "experimental-context-rollover",
	detachExtensionEmit: detachPostCommit,
});
```

`src/session/session-maintenance.ts:3804-3819` 说明阈值决策日志中的 `methods` 来源：

```ts
logger.debug("Auto-compaction threshold decision", {
	phase: "post-agent-end",
	goalModeEnabled: this.#goalModeState?.enabled === true,
	goalStatus: this.#goalModeState?.goal.status,
	stopReason: assistantMessage.stopReason,
	sameModel: sameModel === true,
	contextWindow,
	methods: resolveCompactionMethodOrder(compactionSettings.methodOrder),
	thresholdTokens,
	assistantUsageContextTokens,
	storedContextTokens,
	resolvedContextTokens: contextTokens,
	postMaintenanceContextTokens,
	maintenanceTokensFreed,
	shouldCompact: shouldThresholdCompact,
	contextPromotionEnabled: cfgContextPromotionEnabled.get(this.#host.settings) === true,
});
```

## 本次取证结论

- compaction entry `<ENTRY_ID>` 属于父会话 `<SESSION_ID>`；续接会话 `<SESSION_ID>` 通过 `parentSession` 指向它。
- 12:21:03 的日志显示消息数从 `messagesBefore: 715` 变为 `messagesAfter: 20`，`contextTokens: 370256`，`contextWindow: 400000`。
- `details.kind: "experimental-context-rollover"` 与源码中的固定 `summary: experimentalContextRolloverPrompt`、`method: undefined` 相互印证；该路径不写 LLM 摘要。
- 源码在 `usesExperimentalContextManagement()` 为真时直接调用 `#runExperimentalContextRollover` 并返回，后面的 `resolveCompactionMethodOrder` 与 `shake` 分支不会执行。
- 日志字段 `methods: ["shake","handoff","soft"]` 是阈值决策日志写入的配置顺序，不是当次实际执行的方法列表。
- 12:12:52 与 12:17:40 的两次阈值决策均为 `shouldCompact: false`；这两条记录早于 12:21:03 的 rollover。
