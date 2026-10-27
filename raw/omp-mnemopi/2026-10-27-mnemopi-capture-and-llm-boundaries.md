# Mnemopi 捕获触发与 LLM 边界源码摘录

> Source: 本机 @oh-my-pi/pi-mnemopi 与 @oh-my-pi/pi-coding-agent 源码（OMP 18.13.1）
> Collected: 2026-10-27
> Published: Unknown

## @oh-my-pi/pi-coding-agent/src/mnemopi/state.ts:688-704

该段说明什么：agent_end 阶段按 `retainEveryNTurns` 门槛决定是否自动 retain。

```ts
	async maybeRetainOnAgentEnd(_messages: AgentMessage[]): Promise<void> {
		if (!this.config.autoRetain || this.aliasOf) return;
		const userTurns = withLoopPhase("mnemopi.retain", () => {
			this.#restoreRetainedTurnCursor();
			// Cheap gate first: most agent_end events are not retain turns, so skip text extraction.
			return countUserTurns(this.session.sessionManager);
		});
		if (userTurns - this.lastRetainedTurn < this.config.retainEveryNTurns) return;
		const messages = withLoopPhase("mnemopi.retain", () => {
			const flat = extractMessages(this.session.sessionManager);
			return sliceUnretainedMessages(flat, this.lastRetainedTurn);
		});
		await this.retainMessages(messages, `${this.sessionId}-${Date.now()}`, {
			retainedThroughUserTurn: userTurns,
		});
		this.lastRetainedTurn = userTurns;
	}
```

## @oh-my-pi/pi-coding-agent/src/mnemopi/state.ts:706-719

该段说明什么：强制 retain 当前会话，调用方可通过 options 控制 extract。

```ts
	async forceRetainCurrentSession(options: { extract?: boolean } = {}): Promise<void> {
		if (this.aliasOf) return;
		const flat = withLoopPhase("mnemopi.retain", () => extractMessages(this.session.sessionManager));
		const userTurns = withLoopPhase("mnemopi.retain", () => {
			this.#restoreRetainedTurnCursor();
			return flat.filter(message => message.role === "user").length;
		});
		const messages = withLoopPhase("mnemopi.retain", () => sliceUnretainedMessages(flat, this.lastRetainedTurn));
		await this.retainMessages(messages, this.sessionId, {
			...options,
			retainedThroughUserTurn: userTurns,
		});
		this.lastRetainedTurn = Math.max(this.lastRetainedTurn, userTurns);
	}
```

## @oh-my-pi/pi-coding-agent/src/mnemopi/state.ts:721-755

该段说明什么：retainMessages 中由 `options.extract !== false` 与 extractText 是否存在共同决定 `extract: shouldExtract`。

```ts
	async retainMessages(
		messages: Array<{ role: string; content: string }>,
		sourceId: string,
		options: { extract?: boolean; retainedThroughUserTurn?: number } = {},
	): Promise<void> {
		// Label this body's transcript formatting and synchronous remember() work;
		// callers label their preceding cursor and history extraction.
		return withLoopPhase("mnemopi.retain", () => {
			const { transcript, messageCount } = prepareRetentionTranscript(messages, true);
			if (!transcript) return;
			const { transcript: extractText } = prepareUserRetentionTranscript(messages);
			const { transcript: embedText } = prepareEmbeddableRetentionTranscript(messages);
			const shouldExtract = options.extract !== false && extractText !== null;
			this.rememberInScope(transcript, {
				source: "coding-agent-transcript",
				importance: 0.65,
				metadata: {
					session_id: this.sessionId,
					source_id: sourceId,
					message_count: messageCount,
					...(options.retainedThroughUserTurn === undefined
						? {}
						: { retained_through_user_turn: options.retainedThroughUserTurn }),
					cwd: this.session.sessionManager.getCwd(),
				},
				scope: "bank",
				extract: shouldExtract,
				extractEntities: shouldExtract,
				extractText: shouldExtract ? extractText : null,
				embedText,
				veracity: "unknown",
				memoryType: "episode",
			});
		});
	}
```

## @oh-my-pi/pi-coding-agent/src/mnemopi/state.ts:901-905

该段说明什么：consolidate 把 `options.extract` 直接转交给 forceRetainCurrentSession。

```ts
	): Promise<void> {
		if (options.retain !== false) {
			await this.forceRetainCurrentSession({ extract: options.extract });
		}
		for (const memory of this.scoped.owned) {
			await memory.flushExtractions();
```

## @oh-my-pi/pi-coding-agent/src/mnemopi/state.ts:966-973

该段说明什么：dispose 路径的 consolidate 显式传入 `extract: false`。

```ts
		const boundedTimeoutMs = timeoutMs !== undefined && timeoutMs > 0 ? timeoutMs : undefined;
		const deadline = boundedTimeoutMs !== undefined ? performance.now() + boundedTimeoutMs : undefined;
		if (boundedTimeoutMs !== undefined) this.#boundOwnedBusyTimeout(boundedTimeoutMs);
		const consolidatePromise = this.consolidate({
			full: false,
			extract: false,
			sleep: false,
			retain: this.config.autoRetain && options.retain !== false,
		}).catch((error: unknown) => {
```

## @oh-my-pi/pi-coding-agent/src/mnemopi/state.ts:625-632

该段说明什么：beforeAgentStartPrompt 的首轮召回一次性判据 `hasRecalledForFirstTurn`。

```ts
		signal?: AbortSignal,
		budget: (block: string) => string = block => this.budgetRecallBlock(block),
	): Promise<MemoryPromptPreparation | undefined> {
		if (!this.config.autoRecall || this.hasRecalledForFirstTurn) return undefined;
		const latestPrompt = promptText.trim();
		if (!latestPrompt) return undefined;
		const generation = ++this.#recallGeneration;
		// The transcript's recall is history: a resumed session sends it unchanged, so the
		// prompt cache still matches, and reports what changed since as a new message.
```

## @oh-my-pi/pi-coding-agent/src/mnemopi/state.ts:668-675

该段说明什么：#commitRecall 提交后置位 `hasRecalledForFirstTurn = true`。

```ts
	 */
	#commitRecall(generation: number, text: string, record: PersistedRecall | undefined): boolean {
		if (this.#recallGeneration !== generation) return false;
		this.hasRecalledForFirstTurn = true;
		if (text) this.lastRecallSnippet = text;
		if (record) persistRecall(this.session.sessionManager, getMnemopiRecallScope(this.config), record);
		return true;
	}
```

## @oh-my-pi/pi-coding-agent/src/mnemopi/state.ts:799-806

该段说明什么：maybeRecallOnAgentStart 同样受 autoRecall 与首轮标记约束。

```ts
	}

	async maybeRecallOnAgentStart(): Promise<void> {
		if (!this.config.autoRecall || this.hasRecalledForFirstTurn) return;
		const generation = this.#recallGeneration;
		// No message can join a turn already started, so a reused recall's changes wait for
		// the next resume to be reported.
		const persisted = findPersistedRecall(this.session.sessionManager, getMnemopiRecallScope(this.config));
```

## @oh-my-pi/pi-coding-agent/src/mnemopi/settings.ts:286-295

该段说明什么：`retainEveryNTurns` 默认 4，`recallLimit` 默认 8。

```ts
		condition: "mnemopiActive",
	},
});

export const cfgMnemopiRetainEveryNTurns = register({ id: "mnemopi.retainEveryNTurns", type: "number", default: 4 });

export const cfgMnemopiRecallLimit = register({ id: "mnemopi.recallLimit", type: "number", default: 8 });

export const cfgMnemopiRecallContextTurns = register({ id: "mnemopi.recallContextTurns", type: "number", default: 3 });
```

## @oh-my-pi/pi-coding-agent/src/mnemopi/backend.ts:560-600

该段说明什么：llmMode 为 none/remote/smol 时的分支，以及 memory 角色链解析。

```ts
		embeddingApiKey:
			config.providerOptions.embeddingApiKey ??
			(await openrouterKeyResolver(modelRegistry, sessionId, config.providerOptions.embeddingApiUrl)),
		llm: false,
	};

	if (config.llmMode === "none") return base;

	// An explicitly configured external Mnemopi endpoint remains authoritative;
	// role selection only supplies the normal managed-model path.
	if (config.llmMode === "remote") {
		return {
			...base,
			llm: {
				baseUrl: config.llmBaseUrl,
				apiKey:
					config.llmApiKey ??
					(config.llmBaseUrl === undefined
						? undefined
						: await openrouterKeyResolver(modelRegistry, sessionId, config.llmBaseUrl)),
				model: config.llmModel,
			},
		};
	}

	try {
		const candidates = resolveRoleChain("memory", settings, roleCandidatePool("memory", settings, modelRegistry));
		const primary = candidates[0]?.model;
		if (!primary) {
			logger.warn("Mnemopi: llmMode=smol but no memory model resolved; continuing without LLM.");
			return base;
		}

		const complete = async (prompt: string, opts?: MnemopiLlmCompleteOptions): Promise<string | null> => {
			// journalJudgmentUsage snapshots the session id. /new, fork, and session
			// switch keep this function, so bind inside each call. An in-flight call
			// keeps the callback it already created and still journals to its start.
			const { onUsage, request, signal } = {
				onUsage: journalJudgmentUsage(usageLedger),
				request: resolveMemoryCompletionInput(prompt, opts),
				signal:
```

## @oh-my-pi/pi-mnemopi/src/core/extraction.ts:395-412

该段说明什么：模型提取入口，temperature 0，走 host 注入的 completion。

```ts
	const prompt = withLoopPhase("mnemopi.extract", () => buildExtractionPrompt(input));

	// Configured completion (host-injected runtime LLM, e.g. the coding-agent's smol
	// or a local on-device model). Mirrors consolidation's precedence: when a
	// complete() fn is wired, it is the chosen path. Extraction is deterministic
	// (temperature 0) so re-ingesting the same content does not create near-dupes.
	if (configuredLlmWillHandleCall()) {
		diag.recordAttempt("host");
		try {
			const raw = await callConfiguredCompletion(prompt, 0, {
				maxTokens: llmMaxTokens(),
				task: { kind: "memory-extraction", input },
			});
			if (typeof raw === "string" && raw.trim() !== "") {
				const extracted = parseExtractedFactCategories(raw);
				const count = countExtractedFactCategories(extracted);
				if (count > 0) {
					diag.recordSuccess("host", count);
```

## @oh-my-pi/pi-mnemopi/src/core/extraction.ts:448-458

该段说明什么：LLM 不可用时退回 `heuristicExtractFacts` 正则。

```ts
		return emptyFactCategories();
	}

	if (!llmAvailable()) {
		diag.recordAttempt("local");
		const heuristic = heuristicExtractFacts(input);
		if (heuristic.length > 0) {
			diag.recordSuccess("local", heuristic.length);
			diag.recordCall({ succeeded: true });
			return { ...emptyFactCategories(), facts: heuristic };
		}
```

## @oh-my-pi/pi-mnemopi/src/core/beam/consolidate.ts:1130-1145

该段说明什么：sleep 整合写入的 metadata 里 `llm_used: false`。

```ts
			let validUntil: string | null = null;
			for (const item of chunk.items) {
				if (rowValue(item, "scope") === "global") scope = "global";
				const itemValidUntil = rowValue(item, "valid_until");
				if (itemValidUntil && (validUntil === null || itemValidUntil < validUntil)) validUntil = itemValidUntil;
			}
			const sleepSummary = buildSleepSummary(beam, source, chunk);
			const metadata: Metadata = { original_count: chunk.items.length, source, llm_used: false };
			if (sleepSummary.truncated) {
				metadata.truncated = true;
				metadata.original_chars = sleepSummary.originalChars;
				metadata.max_chars = sleepSummary.maxChars;
			}
			const summary = sleepSummary.summary;
			if (!dryRun) {
				consolidateToEpisodic(beam, summary, ids, "sleep_consolidation", 0.6, {
```

## @oh-my-pi/pi-mnemopi/src/core/beam/consolidate.ts:1168-1180

该段说明什么：整合结果报告 `llm_used: 0`、`method: "aaak"`。

```ts
	return {
		dry_run: dryRun,
		status: dryRun ? "dry_run" : "consolidated",
		items_consolidated: consolidatedIds.length,
		summaries_created: summariesCreated,
		conflicts_resolved: 0,
		llm_used: 0,
		method: "aaak",
		consolidated_ids: consolidatedIds,
		degradation,
	};
}
```

## @oh-my-pi/pi-mnemopi/src/core/beam/consolidate.ts:1225-1235

该段说明什么：sleepAllSessions 汇总结果同样为 `llm_used: 0`。

```ts
		dry_run: dryRun,
		status: dryRun ? "dry_run" : items > 0 ? "consolidated" : "no_op",
		sessions_scanned: sessions.length,
		sessions_consolidated: consolidated,
		items_consolidated: items,
		summaries_created: summaries,
		llm_used: 0,
		errors: 0,
		error_details: [],
		session_results: results,
		degradation,
```

## @oh-my-pi/pi-mnemopi/src/core/beam/consolidate.ts:742-752

该段说明什么：整合流程内部用正则抽取事实与 KG 三元组。

```ts
			sourceMemoryId,
		);
		counts.version++;
	}

	counts.entity += storeFactStrings(beam, heuristicExtractFacts(text), messageIdx, sourceMemoryId);

	for (const match of text.matchAll(
		/\b([A-Z][A-Za-z0-9_-]{2,})\s+(?:is|uses|runs|owns|depends on)\s+([^.!?;]{2,80})/g,
	)) {
		insertKg(beam, messageIdx, match[1] ?? "", "related_to", compactWhitespace(match[2] ?? ""), sourceMemoryId);
```

## @oh-my-pi/pi-mnemopi/src/core/beam/store.ts:540-548

该段说明什么：单条 remember 仅在 `options.extract === true` 时排程事实提取。

```ts
		importance,
		metadata: metadata ?? undefined,
	});
	scheduleEmbedding(beam, [{ memoryId, content: embedText }]);
	if (options.extract === true) scheduleFactExtraction(beam, memoryId, extractionSource);
	invalidateCaches(beam);
	return memoryId;
}
```

## @oh-my-pi/pi-mnemopi/src/core/beam/store.ts:612-621

该段说明什么：批量 remember 中，item 级或批次级 extract 为真即排程提取。

```ts
		if (id === undefined) return;
		embeddingItems.push({ memoryId: id, content: embeddingText(item.content, item as StoreRememberOptions) });
	});
	scheduleEmbedding(beam, embeddingItems);
	items.forEach((item, index) => {
		const id = ids[index];
		if (id !== undefined && (item.extract === true || options.extract === true)) {
			scheduleFactExtraction(beam, id, item.content);
		}
	});
```

## @oh-my-pi/pi-mnemopi/src/core/beam/recall.ts:705-733

该段说明什么：分层打分，episodic 与其它层使用不同基底分公式。

```ts
	const content = asString(candidate.row.content);
	const searchableContent = asString(candidate.row.embed_text) || content;
	const lexical = lexicalGroupRelevance(queryGroups, searchableContent);
	const minRel = minimumRelevance(queryTokens);
	if (lexical < minRel && candidate.signals.dense < 0.65) return null;
	const [vecWeight, ftsWeight, importanceWeight] = weights;
	const importance = asNumber(candidate.row.importance, 0.5);
	const decay =
		options.queryTime == null
			? recencyDecay(candidate.row.timestamp, 72)
			: temporalBoost(candidate.row.timestamp, parseQueryTime(options.queryTime), 72);
	const keyword = Math.max(lexical, candidate.signals.fts * 0.6);
	let baseScore: number;
	if (candidate.tierLabel === "episodic") {
		baseScore = Math.max(
			candidate.signals.dense * vecWeight + candidate.signals.fts * ftsWeight + importance * importanceWeight,
			lexical * 0.8,
		);
	} else {
		const kwShare = (1 - importanceWeight) * 0.6;
		baseScore = keyword * kwShare + importance * importanceWeight + keyword * keyword * 0.08;
		if (candidate.signals.dense > 0) baseScore = baseScore * 0.8 + candidate.signals.dense * 0.2;
	}
	let score = baseScore * (0.7 + 0.3 * decay);
	const temporalWeight = options.temporalWeight ?? 0;
	let temporalScore = 0;
	if (temporalWeight > 0) {
		temporalScore = temporalBoost(
```

## @oh-my-pi/pi-mnemopi/src/core/beam/recall.ts:953-970

该段说明什么：权重来自 options 或 beam.config，并按意图调用 adjustWeights。

```ts
		// because RecallOptions exposes the narrower public shape.
		const derived = query.length > 0 ? await embedQuery(query) : null;
		temporalOptions.queryEmbedding = derived === null ? null : Array.from(derived);
	}
	return withLoopPhase("mnemopi.recall", () => {
		let weights = normalizedRecallWeights(
			options.vecWeight ?? beam.config.vecWeight,
			options.ftsWeight ?? beam.config.ftsWeight,
			options.importanceWeight ?? beam.config.importanceWeight,
		);
		if (options.useIntent === true) {
			const intent = classifyIntent(query);
			weights = adjustWeights(weights[0], weights[1], weights[2], intent);
		}
		const useSynonyms = options.useSynonyms !== false;
		const tokens = expandedTokens(query, useSynonyms);
		const tokenGroups = expandedTokenGroups(query, useSynonyms);
		const candidates = collectMemoryCandidates(beam, query, topK, temporalOptions);
```

## @oh-my-pi/pi-mnemopi/src/core/beam/index.ts:60-75

该段说明什么：默认权重 `vecWeight: 0.5`、`ftsWeight: 0.3`、`importanceWeight: 0.2` 与 TTL、recency 半衰期。

```ts
const DEFAULT_CONFIG: BeamConfig = {
	workingMemoryLimit: 1000,
	workingMemoryTtlHours: 24,
	recencyHalflifeHours: 72,
	vecWeight: 0.5,
	ftsWeight: 0.3,
	importanceWeight: 0.2,
	useCloud: false,
	localLlmEnabled: false,
	maxEpisodeChars: 100_000,
	proactiveLinking: false,
};
```

## @oh-my-pi/pi-mnemopi/src/mcp-server.ts:51-53

该段说明什么：MCP 的 tools/list 返回。

```ts
export function listToolsJson(): ListToolsResponse {
	return { tools: getToolDefinitions() };
}
```

## @oh-my-pi/pi-mnemopi/src/mcp-server.ts:70-80

该段说明什么：initialize 返回 `name: "mnemopi"` 的 serverInfo。

```ts
	const method = request.method ?? "";
	if (method.startsWith("notifications/") || !hasRequestId(request)) return null;
	const id = requestId(request);
	if (method === "initialize") {
		return ok(id, {
			protocolVersion: "2024-11-05",
			serverInfo: { name: "mnemopi", version: "3.1.2" },
			capabilities: { tools: {} },
		});
	}
	if (method === "tools/list") return ok(id, listToolsJson());
```

## @oh-my-pi/pi-coding-agent/src/mnemopi/state.ts:289-295

该段说明什么：新转录开始时的重置路径把首轮召回标志清回 false。

```ts
	resetConversationTracking(): void {
		this.#recallGeneration++;
		this.lastRetainedTurn = 0;
		this.#retentionCursorLoaded = false;
		this.hasRecalledForFirstTurn = false;
		this.lastRecallSnippet = undefined;
	}
```
