# OMP `/shake thinking` 保留提示与 Responses 原生重放取证

> Source: `@oh-my-pi/pi-coding-agent` 18.18.3 与 `@oh-my-pi/pi-ai` 18.18.3 源码（本机 `~/.bun/install/global/node_modules/@oh-my-pi/`）；`~/code-inside/copilot-api` 源码；OpenAI 官方 Reasoning 指南与 Responses API 参考
> Collected: 2026-11-09
> Published: Unknown

本文件保存逐字摘录，供 wiki 文章核对。代码段保留原始缩进与注释；行号来自本机安装包。

## 1. 版本与变更记录

`pi-coding-agent/CHANGELOG.md:48,120`：

```text
## [18.18.2] - 2026-11-08
- `/shake thinking` now reports and preserves reasoning blocks that the provider continues to replay, avoiding inaccurate context-reduction claims.
```

本机安装版本为 `18.18.3`。

## 2. 汇总文案：`shake-types.ts`

`pi-coding-agent/src/session/shake-types.ts:9-47`：

```ts
export type ShakeMode = "elide" | "images" | "thinking";

export interface ShakeResult {
	mode: ShakeMode;
	/** Whole tool-call results dropped. */
	toolResultsDropped: number;
	/** Large fenced/XML blocks dropped. */
	blocksDropped: number;
	/** Image blocks removed (images mode only). */
	imagesDropped?: number;
	/** Thinking blocks dropped (thinking mode only). */
	thinkingBlocksDropped?: number;
	/** Thinking blocks the provider replays from its payload, left in place (thinking mode only). */
	thinkingBlocksKept?: number;
	/** Estimated context tokens reclaimed. */
	tokensFreed: number;
	/** Session artifact holding the dropped originals, when persisted. */
	artifactId?: string;
}

export function formatShakeSummary(result: ShakeResult): string {
	// ...
	if (result.mode === "thinking") {
		const dropped = result.thinkingBlocksDropped ?? 0;
		const kept = result.thinkingBlocksKept ?? 0;
		if (dropped === 0 && kept === 0) return "No thinking blocks found in this session.";
		const keptText = `${kept} thinking block${kept === 1 ? "" : "s"} ${kept === 1 ? "was" : "were"} kept because removing ${
			kept === 1 ? "it" : "them"
		} would not change what the model receives`;
		if (dropped === 0) return `${keptText}.`;
		const droppedText = `Dropped ${dropped} thinking block${dropped === 1 ? "" : "s"} from this session${result.tokensFreed > 0 ? ` (~${result.tokensFreed} tokens freed)` : ""}`;
		return kept === 0 ? `${droppedText}.` : `${droppedText}; ${keptText}.`;
	}
```

释放量后缀只在 `result.tokensFreed > 0` 时附加；只保留不删除时走 `if (dropped === 0) return ...` 一行，因此文案里没有 `tokens freed`。

## 3. 命令定义与 TUI 输出

`pi-coding-agent/src/slash-commands/builtin-lifecycle.ts:322-339` 声明 `/shake [elide|images|thinking]`。

`pi-coding-agent/src/modes/controllers/command-controller.ts:2199-2229`：

```ts
	/**
	 * TUI handler for `/shake`. `elide` drops heavy structural content,
	 * `images` strips image blocks, and `thinking` drops the thinking blocks the
	 * request rebuilds from them, keeping the turns it replays natively (they
	 * are reported as kept and the transcript is left alone). Rebuilds the chat
	 * and reports counts.
	 */
	async handleShakeCommand(mode: ShakeMode): Promise<void> {
		let result: ShakeResult;
		try {
			result = await this.ctx.session.shake(mode);
		} catch (error) {
			this.ctx.showError(`Shake failed: ${error instanceof Error ? error.message : String(error)}`);
			return;
		}

		const dropped =
			result.toolResultsDropped +
			result.blocksDropped +
			(result.imagesDropped ?? 0) +
			(result.thinkingBlocksDropped ?? 0);
		if (dropped === 0) {
			// Replayed thinking was left in place: nothing to rebuild, but say so.
			this.ctx.showStatus((result.thinkingBlocksKept ?? 0) > 0 ? formatShakeSummary(result) : "Nothing to shake.");
			return;
		}
		this.ctx.rebuildChatFromMessages();
		this.ctx.statusLine.invalidate();
		this.ctx.ui.requestRender(true, { clearScrollback: true });
		this.ctx.showStatus(formatShakeSummary(result));
	}
```

删除数为 0 时走 `showStatus` 后直接 `return`，不调用 `rebuildChatFromMessages`。

## 4. `shake("thinking")` 实现

`pi-coding-agent/src/session/session-maintenance.ts:933-941`：

```ts
	/**
	 * Whether the next request replays this turn's native Responses payload, so
	 * its reasoning travels on the wire regardless of what `content` holds. The
	 * same decision the tokenizer counts with, resolved from the live provider
	 * session state exactly as the request resolves it.
	 */
	#replaysNativeHistory(message: AssistantMessage, nativeHistoryReplay: boolean): boolean {
		return replaysNativeResponsesHistory(message, this.#model, { nativeHistoryReplay });
	}
```

`pi-coding-agent/src/session/session-maintenance.ts:943-962`：

```ts
	/**
	 * Surgically reduce context by dropping heavy content ("shake").
	 *
	 * - `images` delegates to {@link dropImages}.
	 * - `thinking` removes assistant reasoning blocks without replacement text
	 *   and credits their tokens. A turn whose native payload the request
	 *   replays is left untouched instead: those blocks are not on the wire, so
	 *   removing them would change nothing the model receives and would credit
	 *   tokens that stay billed. Kept blocks are reported through
	 *   {@link ShakeResult.thinkingBlocksKept}.
	 * - `elide` replaces whole tool-call results and large fenced/XML blocks
	 *   with short placeholders that embed an `artifact://` recovery link.
	 *
	 * Mutates the branch in place, persists via `rewriteEntries`, replays the
	 * rebuilt context through the agent, and tears down provider sessions that
	 * cache message identity — same rewrite contract as {@link dropImages}.
	 *
	 * No-op (zero counts) when nothing is eligible, and a `thinking` run whose
	 * every turn is replayed returns without rewriting anything at all.
	 */
```

`pi-coding-agent/src/session/session-maintenance.ts:978-1028`（`thinking` 分支主体）：

```ts
		if (mode === "thinking") {
			const branchEntries = this.#host.sessionManager.getBranch();
			const latestCompaction = getLatestCompactionEntry(branchEntries);
			const compactionIndex = latestCompaction ? branchEntries.lastIndexOf(latestCompaction) : -1;
			const hasRemoteReplacementHistory = getOpenAiRemoteCompactionPayload(latestCompaction) !== undefined;
			const anchorIndex = findUsageAnchorIndex(branchEntries, compactionIndex);
			let removed = 0;
			let replayedBlocks = 0;
			let tokensFreed = 0;
			let anchoredTokensRemoved = 0;
			const countOptions = { excludeEncryptedReasoning: true } as const;
			const model = this.#host.model();
			const nativeHistoryReplay = openAIResponsesReplaysNativeHistory(model, this.#host.providerSessionState);
			for (const [index, entry] of branchEntries.entries()) {
				if (entry.type !== "message" || entry.message.role !== "assistant") continue;
				const message = entry.message;
				const isReasoning = (block: (typeof message.content)[number]) =>
					block.type === "thinking" || block.type === "redactedThinking";
				const dropped = message.content.filter(isReasoning).length;
				if (dropped === 0) continue;
				// Native Responses replay uses the stored payload instead of content.
				// Leave those blocks intact: stripping them cannot save wire tokens
				// and needlessly invalidates the provider's prompt cache. They are
				// reported as kept, and a run that only keeps blocks rewrites nothing.
				if (this.#replaysNativeHistory(message, nativeHistoryReplay)) {
					replayedBlocks += dropped;
					continue;
				}
				const kept = message.content.filter(block => !isReasoning(block));
				// Match the stored-context floor: opaque signatures and encrypted
				// reasoning bytes do not have a reliable provider-token equivalent.
				const before = this.#tokenizer.countMessage(message, countOptions);
				// Provider serializers omit empty assistant turns, so don't invent model-authored text.
				message.content = kept;
				invalidateMessageCache(message);
				const saved = Math.max(0, before - this.#tokenizer.countMessage(message, countOptions));
				tokensFreed += saved;
				if (index < anchorIndex && (!hasRemoteReplacementHistory || index > compactionIndex)) {
					anchoredTokensRemoved += saved;
				}
				removed += dropped;
			}
			if (removed === 0) {
				return {
					mode,
					toolResultsDropped: 0,
					blocksDropped: 0,
					thinkingBlocksDropped: 0,
					thinkingBlocksKept: replayedBlocks,
					tokensFreed: 0,
				};
			}
```

自动维护路径只调用 `elide`：`session-maintenance.ts:1176`（`const result = await this.shake("elide", {`）、`:4572`（`const result = await this.#host.shake("elide", { config: RESCUE_SHAKE_CONFIG, signal });`）、`:6485`（`const result = await this.#host.shake("elide", { config: DEFAULT_SHAKE_CONFIG, signal });`）。

## 5. Tokenizer 与预估共用同一判定

`pi-coding-agent/src/session/settings-stream-fn.ts:156-168`：

```ts
		// A cold Responses session rebuilds turns without their encrypted reasoning.
		// A request that may wait for a provider slot is built when it gets one,
		// after a concurrent response may have warmed the session, so it is
		// fitted as replaying.
		const nativeHistoryReplay =
			Object.hasOwn(maxInFlightRequests, model.provider) ||
			openAIResponsesReplaysNativeHistory(model, streamOptions?.providerSessionState);
		const tokenizerKey = `${model.provider}\0${model.api}\0${model.id}\0${nativeHistoryReplay}`;
		let tokenizer = tokenizers.get(tokenizerKey);
		if (!tokenizer) {
			tokenizer = new Tokenizer(model, { nativeHistoryReplay });
			tokenizers.set(tokenizerKey, tokenizer);
		}
```

`pi-coding-agent/src/session/session-maintenance.ts:4445-4454`：

```ts
		// what `model` itself would be sent: another reader drops the active
		// model's natively replayed reasoning, a cold session drops its own, and
		// a reader without image input gets each archive as text.
		const providerExcludedTokens = activeExcludedMessage ? this.#tokenizer.countMessage(activeExcludedMessage) : 0;
		const tokenizerOptions = {
			nativeHistoryReplay: openAIResponsesReplaysNativeHistory(model, this.#host.providerSessionState),
		};
		const tokenizer = this.#tokenizer.countsAlike(model, tokenizerOptions)
			? this.#tokenizer
			: new Tokenizer(model, tokenizerOptions);
```

## 6. 会话冷暖判定

`pi-ai/src/providers/openai-responses-state.ts:11-30`：

```ts
/**
 * Whether the next request for `model` replays native Responses history items
 * (encrypted reasoning, item ids), matching request construction. A session
 * is cold, rebuilding turns from message content, from the first request on a
 * connection-bound host (`compat.connectionBoundNativeHistory`, GitHub Copilot)
 * and after `close()` on any host, until a response succeeds. Without session
 * state every request replays. Transport selection does not change this rule.
 */
export function openAIResponsesReplaysNativeHistory(
	model: Pick<Model, "api" | "provider" | "compat"> | null | undefined,
	providerSessionState: Map<string, ProviderSessionState> | undefined,
): boolean {
	if (!providerSessionState || (model?.api !== "openai-responses" && model?.api !== "openrouter")) return true;
	const state = providerSessionState.get(`${OPENAI_RESPONSES_PROVIDER_SESSION_STATE_PREFIX}${model.provider}`) as
		| OpenAIResponsesProviderSessionState
		| undefined;
	if (state) return state.nativeHistoryReplayWarmed;
	const compat = model.compat;
	return !(compat && "connectionBoundNativeHistory" in compat && compat.connectionBoundNativeHistory);
}
```

该函数只对 `openai-responses` 与 `openrouter` 查询会话状态；其余 api 直接返回 `true`。

`pi-ai/src/providers/openai-responses.ts:505`：

```ts
		nativeHistoryReplayWarmed: !model.compat.connectionBoundNativeHistory,
```

`pi-ai/src/providers/openai-responses.ts:1460-1463`（成功响应后转暖）：

```ts
			if (replayableResponseItems) {
				if (providerSessionState && providerSessionState.closeCount === closeCountAtStart) {
					providerSessionState.nativeHistoryReplayWarmed = true;
				}
```

`pi-ai/src/providers/openai-responses.ts:1797`：

```ts
	const shouldReplayNativeHistory = providerSessionState?.nativeHistoryReplayWarmed ?? true;
```

## 7. 重放判定函数

`pi-ai/src/providers/openai-shared.ts:2157-2180`：

```ts
/**
 * Whether a same-provider assistant turn may replay its native items while the
 * provider session is still cold (#489). A cold session rebuilds turns from
 * message content because some backends bind native items to one connection
 * (GitHub Copilot: `401 input item does not belong to this connection`, #488).
 * Binding needs server-issued state that survives replay sanitization: an
 * `encrypted_content` blob or an item id. A turn with neither, whose every
 * reasoning item carries plaintext `reasoning_text`, has nothing to bind and is
 * exactly what the server receives once the session warms; rebuilding it would
 * drop that reasoning and change the prompt prefix the server cached.
 * Summary-only reasoning keeps the rebuild: it is no evidence of a server that
 * returns plaintext reasoning.
 */
export function isColdReplayableResponsesTurn(items: ResponseInput): boolean {
	let hasReasoning = false;
	for (const item of items) {
		if ("id" in item && typeof item.id === "string") return false;
		if ("encrypted_content" in item && typeof item.encrypted_content === "string") return false;
		if (item.type !== "reasoning") continue;
		if (!item.content?.some(part => part.type === "reasoning_text")) return false;
		hasReasoning = true;
	}
	return hasReasoning;
}
```

`isColdReplayableResponsesTurn` 只拒绝字符串类型的 `id` 与 `encrypted_content`；`encrypted_content` 为 `null` 时通过该检查。

`pi-ai/src/providers/openai-shared.ts:2182-2223`：

```ts
/**
 * The native Responses history items a request for `model` would replay from
 * this assistant turn, or `undefined` when the turn was produced by another
 * api, model or provider and its payload cannot go back on the wire at all.
 */
export function getNativeResponsesHistoryItems(
	message: AssistantMessage,
	model: Pick<Model, "api" | "provider" | "id"> | null | undefined,
): Array<Record<string, unknown>> | undefined {
	if (!model || message.api !== model.api || message.model !== model.id) return undefined;
	return getOpenAIResponsesHistoryItems(message.providerPayload, model.provider, message.provider);
}

/**
 * The history items a request for `model` puts back on the wire for this turn,
 * after the payload sanitizer keeps the replayable output in them, or
 * `undefined` when the turn is rebuilt from `content` instead: another api,
 * model or provider, no payload at all, or a payload the sanitizer empties.
 */
export function getReplayableNativeResponsesHistoryItems(
	message: AssistantMessage,
	model: Pick<Model, "api" | "provider" | "id"> | null | undefined,
): ResponseInput | undefined {
	const items = getNativeResponsesHistoryItems(message, model);
	if (!items) return undefined;
	return sanitizeOpenAIResponsesAssistantHistoryItemsForReplay(items);
}

/**
 * Whether a request puts those items on the wire: a warm provider session
 * always does, a cold one (`nativeHistoryReplay` false) only when nothing in
 * them is bound to one connection ({@link isColdReplayableResponsesTurn}).
 */
export function replaysNativeResponsesTurn(replay: ResponseInput, nativeHistoryReplay: boolean): boolean {
	return nativeHistoryReplay || isColdReplayableResponsesTurn(replay);
}
```

`pi-ai/src/providers/openai-shared.ts:2225-2247`：

```ts
/**
 * Whether a request for `model` replays this assistant turn's native Responses
 * history, so the turn reaches the wire as `providerPayload` items and its
 * `content` blocks are not sent at all. The one replay decision shared by
 * request accounting (the tokenizer's local count) and context maintenance
 * (`/shake`), mirroring `buildResponsesInput`'s assistant branch.
 *
 * `buildResponsesInput` decides this inline; it can adopt these helpers once
 * its extra concerns (rebuilding calls cut by the output limit, hidden-empty
 * suppression) move with them.
 */
export function replaysNativeResponsesHistory(
	message: AssistantMessage,
	model: Pick<Model, "api" | "provider" | "id"> | null | undefined,
	options: { nativeHistoryReplay?: boolean } = {},
): boolean {
	const replay = getReplayableNativeResponsesHistoryItems(message, model);
	return replay !== undefined && replaysNativeResponsesTurn(replay, options.nativeHistoryReplay ?? true);
}
```

注释说明该函数「mirroring `buildResponsesInput`'s assistant branch」，请求构造器另有两项自己的处理：重建被输出上限截断的调用、抑制 hidden-empty 轮次。

## 8. 请求构造里的原生重放分支

`pi-ai/src/providers/openai-shared.ts:2374-2455`：

```ts
			const providerPayload =
				assistantMsg.api === options.model.api && assistantMsg.model === options.model.id
					? getOpenAIResponsesHistoryPayload(
							assistantMsg.providerPayload,
							options.model.provider,
							assistantMsg.provider,
						)
					: undefined;
			const nativeReplayEnabled = options.nativeHistory?.replay === true;
			const historyItems = providerPayload?.items;
			let suppressHiddenEmptyFallback = false;
			if (historyItems) {
				const rawSanitizedHistoryItems = sanitizeOpenAIResponsesAssistantHistoryItemsForReplay(
					filterReasoning(historyItems),
					{
						supportsImageDetailOriginal,
						supportsComputerUse: options.model.supportsComputerUse === true,
					},
				);
				const replayNativeItems =
					nativeReplayEnabled ||
					(options.nativeHistory !== undefined &&
						rawSanitizedHistoryItems !== undefined &&
						isColdReplayableResponsesTurn(rawSanitizedHistoryItems));
				if (replayNativeItems && rawSanitizedHistoryItems) {
					const nativeItems = adaptResponsesReplayItemsForModel(
						rawSanitizedHistoryItems,
						supportsCustomToolCalls,
						customToolWireNameMap,
						options.model.supportsComputerUse === true,
					);
					// Calls cut by the output limit have no native item: rebuild them the way the cold path
					// encodes calls (wire tool names included), and before the required-reasoning repair, so a
					// turn whose only call was cut still counts as one that calls a tool.
					const missingCalls = pickUnrecordedResponsesToolCalls(assistantMsg, historyItems);
					const turnItems =
						missingCalls.length > 0
							? [
									...nativeItems,
									...convertResponsesAssistantMessage(
										{ ...assistantMsg, content: missingCalls },
										options.model,
										msgIndex,
										knownCallIds,
										false,
										customCallIds,
										false,
										supportsCustomToolCalls,
										customToolWireNameMap,
										computerCallIds,
										false,
										false,
										options.toolNaming,
									),
								]
							: nativeItems;
					const sanitizedHistoryItems = ensureRequiredResponsesReasoningReplay(
						turnItems,
						assistantMsg.stopReason,
						options.requiresReasoningReplayForAllTurns ?? false,
						options.requiresReasoningReplayForToolCalls ?? false,
					);
					// Model-owned replay items can carry reserved control-token
					// spellings as data (the model writing *about* Harmony); escape the
					// transport copy just like client turns.
					const wireItems = escapeControlTokens
						? escapeReplayedControlTokens(sanitizedHistoryItems)
						: sanitizedHistoryItems;
					if (providerPayload?.dt) {
						pushNativeReplayItems(wireItems);
					} else {
						messages.splice(0, messages.length, ...wireItems);
						knownCallIds.clear();
						customCallIds.clear();
						computerCallIds.clear();
						messageCallIds.clear();
						unpushedCallIds.clear();
						recordPushedCallIds(wireItems);
					}
					msgIndex++;
					continue;
				}
				if (!rawSanitizedHistoryItems) suppressHiddenEmptyFallback = true;
			}
```

这条分支把 `providerPayload.items` 经 `filterReasoning`、`sanitizeOpenAIResponsesAssistantHistoryItemsForReplay`、`adaptResponsesReplayItemsForModel`、`pickUnrecordedResponsesToolCalls` 补建、`ensureRequiredResponsesReasoningReplay` 与 `escapeReplayedControlTokens` 处理后放入请求，然后 `continue` 跳过 `convertResponsesAssistantMessage`。`content` 里的 `thinking` 块在这条路径上不参与序列化。

## 9. 载荷的构造、保存范围与读取校验

`pi-ai/src/utils.ts:640-651`：

```ts
function sanitizeOpenAIResponsesReasoningItemForReplay(
	item: Record<string, unknown>,
	preserveItemId: boolean,
): OpenAIResponsesReplayItem {
	const sanitizedItem: Record<string, unknown> = { type: "reasoning" };
	if (preserveItemId && typeof item.id === "string") sanitizedItem.id = item.id;
	if (Array.isArray(item.summary)) sanitizedItem.summary = item.summary;
	if (Array.isArray(item.content)) sanitizedItem.content = item.content;
	if (typeof item.encrypted_content === "string" || item.encrypted_content === null) {
		sanitizedItem.encrypted_content = item.encrypted_content;
	}
	return sanitizedItem as unknown as OpenAIResponsesReplayItem;
}
```

`pi-ai/src/utils.ts:668-700`：

```ts
export function createOpenAIResponsesHistoryPayload(
	provider: string,
	items: Array<Record<string, unknown>>,
	incremental = true,
): OpenAIResponsesHistoryPayload {
	return {
		type: "openaiResponsesHistory",
		provider,
		...(incremental ? { dt: true } : {}),
		items,
	};
}

export function getOpenAIResponsesHistoryPayload(
	providerPayload: ProviderPayload | undefined,
	currentProvider: string,
	fallbackProvider?: string,
): OpenAIResponsesHistoryPayload | undefined {
	if (providerPayload?.type !== "openaiResponsesHistory" || !Array.isArray(providerPayload.items)) {
		return undefined;
	}
	const payloadProvider = providerPayload.provider ?? fallbackProvider ?? currentProvider;
	if (payloadProvider !== currentProvider) return undefined;
	return { ...providerPayload, provider: payloadProvider };
}

export function getOpenAIResponsesHistoryItems(
	providerPayload: ProviderPayload | undefined,
	currentProvider: string,
	fallbackProvider?: string,
): Array<Record<string, unknown>> | undefined {
	return getOpenAIResponsesHistoryPayload(providerPayload, currentProvider, fallbackProvider)?.items;
}
```

`createOpenAIResponsesHistoryPayload` 的调用点只有两处：

`pi-ai/src/providers/openai-responses.ts:1453`：

```ts
			output.providerPayload = createOpenAIResponsesHistoryPayload(model.provider, nativeOutputItems);
```

`pi-ai/src/providers/openai-codex-responses.ts:3171-3174`：

```ts
		output.providerPayload = createOpenAIResponsesHistoryPayload(
			this.model.provider,
			this.runtime.finalizeNativeOutputItems(),
		);
```

Codex 侧的助手轮分支（`pi-ai/src/providers/openai-codex-responses.ts:4370-4426`）：

```ts
		if (msg.role === "assistant") {
			const assistantMsg = msg as AssistantMessage;
			// Native items are model-bound (reasoning carries encrypted content
			// minted by the producing model); after a mid-session model switch fall
			// back to block re-encode, which strips foreign signatures.
			const providerPayload =
				assistantMsg.api === model.api && assistantMsg.model === model.id
					? getOpenAIResponsesHistoryPayload(assistantMsg.providerPayload, model.provider, assistantMsg.provider)
					: undefined;
			const historyItems = providerPayload?.items as Array<Record<string, unknown>> | undefined;
			let suppressHiddenEmptyFallback = false;
			if (historyItems) {
				const sanitizedHistoryItems = sanitizeOpenAIResponsesAssistantHistoryItemsForReplay(historyItems, {
					supportsImageDetailOriginal: model.compat.supportsImageDetailOriginal,
				});
				if (sanitizedHistoryItems) {
```

该分支只按 `api` 与 `model` 匹配，没有冷热判断，命中后 `continue`。

`pi-ai/src/providers/azure-openai-responses.ts:373-384`（Azure 侧）：

```ts
	const messages = buildResponsesInput({
		model,
		context,
		strictResponsesPairing: true,
		supportsImageDetailOriginal: model.compat.supportsImageDetailOriginal,
		systemRole,
		nativeHistory: { replay: true, filterReasoning: false },
		includeThinkingSignatures: true,
		developerStringContent: true,
		preserveAssistantMessageIds: true,
		repairOrphanOutputs: true,
	});
```

Azure 文件里没有 `createOpenAIResponsesHistoryPayload` 的调用，请求端虽设 `nativeHistory: { replay: true }`，但没有可重放的 `providerPayload`。

`pi-ai/src/stream.ts:924-931`（OpenRouter 路由）：

```ts
	const api: Api = providerModel.api;
	if (api === "openrouter" && $env.PI_OPENROUTER_RESPONSES !== "0") {
		return streamOpenAIResponses(
			providerModel as Model<"openai-responses">,
			context,
			providerOptions as OptionsForApi<"openai-responses">,
		);
	}
```

## 10. 目录里的连接绑定标记

`pi-catalog/src/compat/rules.json`（单行 JSON）中的 `providers/github-copilot.kdl:3` 条目：

```text
{"source":"providers/github-copilot.kdl:3","providers":["github-copilot"],"wire":{"supportsStrictMode":true,"disableStrictTools":true,"supportsContextManagement":false,"connectionBoundNativeHistory":true,"strictResponsesPairing":true}
```

`pi-catalog/src/compat/resolve.ts:805-806` 的默认值为 `storeResponses: false, connectionBoundNativeHistory: false`；`:874` 把 `compat.connectionBoundNativeHistory` 透传进解析结果。

## 11. OMP 本地 `thinking` 块与原生 `reasoning` 条目的关系

`pi-ai/src/providers/openai-shared.ts:3045-3056`：

```ts
/** Chooses final reasoning text without making sequential-cutoff results disagree with emitted deltas. */
export function finalizeReasoningThinking(
	item: ResponseReasoningItem,
	streamedThinking: string,
	cutoff?: SequentialCutoffSummaryState,
): string {
	if (cutoff) return finalizeCutoffReasoningThinking(item, streamedThinking, cutoff);
	const summaryThinking = item.summary?.map(part => part.text).join("\n\n") ?? "";
	if (summaryThinking) return summaryThinking;
	const contentThinking = item.content?.[0]?.type === "reasoning_text" ? (item.content[0].text ?? "") : "";
	return contentThinking || streamedThinking || "";
}
```

`pi-ai/src/providers/openai-shared.ts:3856-3877`：

```ts
			if (item.type === "reasoning") {
				// Prefer the routed entry; the bare itemId find misroutes when ids are
				// absent (`undefined === undefined` matches the FIRST thinking block) and
				// misses entirely when the done-event id drifts from the added-event id.
				const reasoningBlock =
					entry?.block.type === "thinking"
						? entry.block
						: (output.content.find(b => b.type === "thinking" && (b as ThinkingContent).itemId === item.id) as
								| ThinkingContent
								| undefined);
				if (reasoningBlock) {
					reasoningBlock.thinking = finalizeReasoningThinking(item, reasoningBlock.thinking);
					reasoningBlock.thinkingSignature = JSON.stringify(item);
					settleReasoningSummary(item, reasoningBlock);
```

`pi-ai/src/providers/openai-shared.ts:3058-3069`（区分摘要与模型自身痕迹）：

```ts
/**
 * Records whether a finalized reasoning block holds a provider-written summary
 * or the model's own trace, following `finalizeReasoningThinking`'s choice of
 * text: the done item's summary wins, then its `reasoning_text` content, then
 * the streamed deltas, which the summary handlers mark on the block as they
 * append.
 */
export function settleReasoningSummary(item: ResponseReasoningItem, block: ThinkingContent): void {
	const hasSummary = item.summary?.some(part => part.text) ?? false;
	const hasTrace = item.content?.some(part => part.type === "reasoning_text" && part.text) ?? false;
	block.summary = hasSummary || (!hasTrace && block.summary === true);
}
```

## 12. `copilot-api` 的条件剥除重试

`copilot-api/src/services/copilot/responses-compat.ts:26-37`：

```ts
const REPLAY_CACHE_LIMIT = 1024

export const hasStrippableReasoningItem = (
  payload: ResponsesPayload,
): boolean => {
  return (
    Array.isArray(payload.input)
    && payload.input.some(
      (item) => isReasoningItem(item) && item.encrypted_content !== undefined,
    )
  )
}
```

`copilot-api/src/services/copilot/responses-compat.ts:49-118`：

```ts
  // 内层 auto-session 重试可能换掉令牌，学习时必须按发送后的当前 headers 重算
  const getReplayCacheKey = (): string | undefined =>
    reasoningReplayIdentity === undefined ? undefined : (
      JSON.stringify([
        reasoningReplayIdentity,
        payload.model,
        url,
        createHash("sha256")
          .update(headers.Authorization ?? headers.authorization ?? "")
          .digest("hex"),
        createHash("sha256")
          .update(
            headers["Copilot-Session-Token"]
              ?? headers["copilot-session-token"]
              ?? "",
          )
          .digest("hex"),
      ])
    )
  const replayCacheKey = getReplayCacheKey()
  const replayLearned =
    replayCacheKey !== undefined
    && state.responsesReplayLearned.has(replayCacheKey)

  if (replayLearned && hasStrippableReasoningItem(payload)) {
    normalizeResponsesInputForReplay(payload)
  }

  let response = await sendCopilotRequest(url, {
    headers,
    payload,
    clientSignal,
    transportConfig,
  })

  logCopilotRateLimits(response.headers)

  if (!response.ok) {
    const errorMessage = await getResponseErrorMessage(response)
    const shouldStripReasoningAndRetry =
      response.status >= 400
      && response.status < 500
      && errorMessage?.toLowerCase().includes("belong") === true
      && hasStrippableReasoningItem(payload)

    if (shouldStripReasoningAndRetry) {
      consola.warn(
        `drop thinking block, reason: upstream ${response.status} response mentions "belong" (instance-bound item ID); stripping reasoning.encrypted_content and retrying once`,
      )
      normalizeResponsesInputForReplay(payload)
      const learnedKey = getReplayCacheKey()
      if (learnedKey !== undefined) {
        const learned = state.responsesReplayLearned
        learned.add(learnedKey)
        if (learned.size > REPLAY_CACHE_LIMIT) {
          const oldest = learned.values().next().value
          if (oldest !== undefined) learned.delete(oldest)
        }
      }
      response = await sendCopilotHttpRequest(url, {
        headers,
        payload,
        clientSignal,
        transportConfig,
      })
      logCopilotRateLimits(response.headers)
    }
  }
```

`copilot-api/src/routes/responses/utils.ts:517-525`：

```ts
export const normalizeResponsesInputForReplay = (
  payload: ResponsesPayload,
): void => {
  if (!Array.isArray(payload.input) || payload.input.length === 0) {
    return
  }

  payload.input = payload.input.map((item) => normalizeResponseInputItem(item))
}
```

`copilot-api/src/routes/responses/utils.ts:592-616`：

```ts
const normalizeResponseInputItem = (
  item: ResponseInputItem,
): ResponseInputItem => {
  if (isReasoningItem(item)) {
    return normalizeReasoningItem(item)
  }

  return item
}

export const isReasoningItem = (
  item: ResponseInputItem,
): item is ResponseInputReasoning => {
  return "type" in item && item.type === "reasoning"
}

const normalizeReasoningItem = (
  item: ResponseInputReasoning,
): ResponseInputItem => {
  return {
    ...(item.id ? { id: item.id } : {}),
    type: "reasoning",
    summary: Array.isArray(item.summary) ? item.summary : [],
  }
}
```

改写后的 `reasoning` 条目只保留 `id`、`type`、`summary`，`encrypted_content` 被移除。

## 13. OpenAI 官方文档原文

来源：[Reasoning models 指南](https://developers.openai.com/api/docs/guides/reasoning)、[Create a model response 参考](https://developers.openai.com/api/reference/resources/responses/methods/create)、[Migrate to the Responses API 指南](https://developers.openai.com/api/docs/guides/migrate-to-responses)，抓取日期 2026-11-09。

关于原始 reasoning tokens 的可见性与计费：

> While reasoning tokens are not visible via the API, they still occupy space in the model's context window and are billed as output tokens.

关于 `reasoning` 条目在后续轮次中的用法：

> Reasoning items in the `output` array will include an `encrypted_content` property containing encrypted reasoning tokens that you can pass to future calls.

> When you create a response in stateless mode, reasoning items in the response's `output` array include an `encrypted_content` property by default. Stateless mode applies when `store` is `false` or when your organization uses Zero Data Retention (ZDR). The API still accepts the legacy `reasoning.encrypted_content` value in `include` for compatibility, but doesn't require it.

关于服务端如何处理回传的密文：

> The API will then return an encrypted version of the reasoning tokens, which you can pass back in future requests just like regular reasoning items. For ZDR organizations, OpenAI enforces `store: false` automatically. When a request includes `encrypted_content`, it is decrypted in memory, used for generating the next response, and then securely discarded. Any new reasoning tokens are immediately encrypted and returned to you, ensuring no intermediate state is persisted.

`reasoning` 条目的字段定义：

> The type of the object. Always `reasoning`.
>
> summary: array of SummaryTextContent { text, type }
>
> Reasoning summary content.
>
> text: string
>
> A summary of the reasoning output from the model so far.
>
> type: "summary_text" (default: "summary_text")
>
> The type of the object. Always `summary_text`.
>
> content: optional array of object { text, type }
>
> Reasoning text content.
>
> text: string
>
> The reasoning text from the model.
>
> type: "reasoning_text" (default: "reasoning_text")
>
> The type of the reasoning text. Always `reasoning_text`.
>
> encrypted_content: optional string or null
>
> The encrypted content of the reasoning item. This is populated by default for reasoning items returned by `POST /v1/responses` and WebSocket `response.create` requests.

> `reasoning.encrypted_content`: Includes an encrypted version of reasoning tokens in reasoning item outputs. This enables reasoning items to be used in multi-turn conversations when using the Responses API statelessly (like when the `store` parameter is set to `false`, or when an organization is enrolled in the zero data retention program).

流式返回时取完整条目的说明：

> When streaming, use the completed reasoning item and its `encrypted_content` from the `response.output_item.done` event in subsequent requests. The `encrypted_content` in `response.output_item.added` may be incomplete. This is especially important when `store` is `false` or when using Zero Data Retention.

OpenAI 文档中没有名为 `thinking` 的条目类型或字段。
