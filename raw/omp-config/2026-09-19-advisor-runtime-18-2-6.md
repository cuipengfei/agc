# OMP advisor 18.2.6 运行时语义核验摘录（syncBacklog / immuneTurns / admission defer / 退出排水）

> Source: 本机 OMP 安装包 @oh-my-pi/pi-coding-agent 18.2.6（~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/）源码逐字摘录，2026-09-19 会话
> Collected: 2026-09-19
> Published: Unknown

## 摘录 1：syncBacklog schema（config/settings-schema.ts:386-398 逐字）

```ts
	"advisor.syncBacklog": {
		type: "enum",
		values: ["off", "1", "3", "5"] as const,
		default: "off",
		ui: {
			tab: "model",
			group: "Advisor",
			label: "Advisor Sync Backlog",
			description:
				"Pause the main agent for up to 30 seconds if the advisor falls behind by this many turns. Off disables catch-up delays.",
			condition: "advisorEnabled",
		},
	},
```

## 摘录 2：syncBacklog 唯一消费点（session/session-advisors.ts:504-507 逐字）

```ts
			const syncBacklog = this.#host.settings.get("advisor.syncBacklog");
			if (this.#advisors.length === 0 || syncBacklog === "off") return;
			const threshold = Number.parseInt(syncBacklog, 10);
			await Promise.all(this.#advisors.map(advisor => advisor.runtime.waitForCatchup(30_000, threshold, signal)));
```

## 摘录 3：drain 照常进行（advisor/runtime.ts:401-406 逐字）

```ts
		if (rendered) {
			this.#pending.push({ ...rendered, turns: 1 });
			this.#backlog++;
			this.#notifyWaiters();
			void this.#drain();
		}
	}
```

## 摘录 4：waitForCatchup 放行条件（advisor/runtime.ts:415-427 逐字）

```ts
	waitForCatchup(maxMs: number, threshold: number, signal?: AbortSignal): Promise<boolean> {
		if (
			this.disposed ||
			signal?.aborted ||
			this.#backlog < threshold ||
			this.#quotaExhausted ||
			this.#halted ||
			// An advisor mid-failure/retry must NEVER gate the primary agent:
			// its backlog cannot drain until the retry cycle resolves, and the
			// primary would otherwise park for the full catch-up budget.
			this.#failing
		)
			return Promise.resolve(this.#backlog < threshold);
```

## 摘录 5：丢弃路径（advisor/runtime.ts 逐字）

配额注释尾部与字段（323-326）：

```ts
	 *  timer-based auto-resume: provider quota windows (5h/7d) are far longer
	 *  than any reasonable timer, and premature retries waste calls and
	 *  re-trigger the same error. */
	#quotaExhausted = false;
```

quota 置位（1376-1379）：

```ts
						// quota windows (5h/7d) outlast any retry budget. The batch is
						// requeued and the backlog stays visible so reset() replays it.
						logger.warn("advisor quota exhausted", { err: String(err) });
						this.#quotaExhausted = true;
```

onTurnEnd 在 quota/halted 下直接丢新 delta（374-375）：

```ts
	onTurnEnd(messages?: AgentMessage[], opts?: { willContinue?: boolean }): void {
		if (this.disposed || this.#quotaExhausted || this.#halted) return;
```

连续失败丢 backlog（1437-1442）：

```ts
					} else {
						this.#consecutiveFailures++;
						if (this.#consecutiveFailures >= 3) {
							logger.warn("advisor failed consecutively 3 times; dropping backlog to prevent stall");
							this.#notifyFailureOnce(err);
							this.#notifyTurnAbandoned();
							this.#consecutiveFailures = 0;
```

reset/dispose 丢弃 in-flight batch（314-318、1219-1221）：

```ts
	/** Bumped by every external {@link reset}/{@link dispose}. A drain iteration
	 *  captures it before its awaits; a mismatch on resume means a reset aborted
	 *  the in-flight advisor prompt, so the stale batch is dropped instead of
	 *  being retried/requeued into the post-reset conversation. */
	#epoch = 0;
```

```ts
					// reset()/dispose() aborts the in-flight prompt; treat it as a
					// reset, not a transient failure — drop the stale batch.
					if (this.#epoch !== epoch) continue;
```

## 摘录 6：in-progress non-blocker admission defer（advisor/advise-tool.ts 逐字）

defer ack（168-169）：

```ts
/** Held behind the in-progress primary turn; flushed when it completes. */
const ADVISOR_ACK_DEFERRED = "Queued for the end of the turn. Do not re-raise.";
```

beginUpdate 注释（220-227）：

```ts
	 * Start one advisor update: resets the guard's per-update budget and marks
	 *  whether the update reviews an in-progress primary turn. Non-blockers
	 *  emitted while in progress are withheld so partial work does not interrupt
	 *  the primary before it can finish its planned steps. Transitioning to a
	 *  completed update flushes the withheld backlog, oldest first — each note
	 *  was admitted when emitted, so the flush routes without re-admission and a
	 *  backlog of one note per originating update reaches the primary intact.
	 */
```

execute defer 分支（266-291）：

```ts
		if (this.#inProgressUpdate && args.severity !== "blocker") {
			// Withheld, not delivered: reserve for the deterministic flush at the
			// completed-update transition / terminal boundary.
			const pending = this.#deferredNotes.find(item => item.key === key);
			if (pending) {
				// Re-raise of a still-queued note is not a new admission: escalate
				// severity in place (never a second slot) and keep the dedupe rank
				// coherent so equal/lower repeats of the text stay suppressed.
				if (rank > advisorSeverityRank(pending.severity)) {
					pending.severity = args.severity;
					this.#guard.escalatePending(args.note, rank);
				}
				return this.#result(ADVISOR_ACK_DEFERRED, args);
			}
			const decision = this.#guard.admit(args.note, { rank, pending: true });
			if (!decision.accepted) return this.#suppressed(args, decision.reason);
```

defer flush 路由不再过 guard（305-315）：

```ts
	/** Route every withheld note, oldest first, without re-admission — each was
	 *  admitted when emitted. Routed notes are marked so their originating
	 *  update's slots stay charged and can no longer be displaced. */
	#flushDeferred(): void {
		if (this.#deferredNotes.length === 0) return;
		const pending = this.#deferredNotes;
		this.#deferredNotes = [];
		for (const { note, severity } of pending) {
			this.#guard.markRouted(note);
			this.onAdvice(note, severity);
```

## 摘录 7：免疫判定只在投递路由 consulted（advisor/advise-tool.ts、session/session-advisors.ts 逐字）

免疫判定（69-76）：

```ts
export function isAdvisorInterruptImmuneTurnActive(opts: {
	completedTurns: number;
	immuneTurnStart: number | undefined;
	immuneTurns: number;
}): boolean {
	if (opts.immuneTurnStart === undefined || opts.immuneTurns <= 0) return false;
	return opts.completedTurns < opts.immuneTurnStart + opts.immuneTurns;
}
```

投递路由中的免疫降级（117-123）：

```ts
	if (opts.preserveOnly && !opts.streaming) return "preserve";
	if (opts.terminalAnswerNoQueuedWork && opts.severity !== "blocker" && !opts.streaming && !opts.aborting)
		return "preserve";
	if (!isInterruptingSeverity(opts.severity)) return "aside";
	if (opts.autoResumeSuppressed && (opts.aborting || !opts.streaming)) return "preserve";
	if (opts.interruptImmuneTurnActive && opts.severity !== "blocker") return "aside";
	return "steer";
```

路由调用点（session/session-advisors.ts:1384）与免疫窗口读取（746-750）：

```ts
			interruptImmuneTurnActive: interrupting && this.#isAdvisorInterruptImmuneTurnActive(),
```

```ts
	#advisorImmuneTurnLimit(): number {
		const immuneTurns = this.#host.settings.get("advisor.immuneTurns") as number;
		if (!Number.isFinite(immuneTurns) || immuneTurns <= 0) return 0;
		return Math.trunc(immuneTurns);
	}
```

## 摘录 8：print/headless 独立退出排水（modes/print-mode.ts、task/executor.ts、session/session-advisors.ts 逐字）

print 模式排水预算（36-38）：

```ts
export const PRINT_MODE_ADVISOR_DRAIN_TIMEOUT_MS = 10 * 60_000;
/** Error exits cannot hold automation for the full normal drain budget. */
export const PRINT_MODE_ERROR_ADVISOR_DRAIN_TIMEOUT_MS = 30_000;
```

print 模式退出前等待（286-289）：

```ts
	// A turn-fatal exit cannot hold automation for the full normal drain budget.
	await session.waitForAdvisorCatchup(
		terminalFailure ? PRINT_MODE_ERROR_ADVISOR_DRAIN_TIMEOUT_MS : PRINT_MODE_ADVISOR_DRAIN_TIMEOUT_MS,
	);
```

task executor 非 abort 退出前同样排水（2969-2973）：

```ts
		// mirroring print mode's headless drain — bounded by the shared cleanup
		// deadline. Hard aborts skip this to keep kill teardown fast.
		if (!args.aborted) {
			args.session.prepareForHeadlessAdvisorDrain();
			await args.session.waitForAdvisorCatchup(Math.max(0, cleanupDeadlineAt - Date.now()));
		}
```

waitForAdvisorCatchup 实现（session/session-advisors.ts:2125-2133）：

```ts
	async waitForAdvisorCatchup(timeoutMs: number): Promise<boolean> {
		const deadline = Date.now() + timeoutMs;
		const results = await Promise.all(this.#advisors.map(advisor => advisor.runtime.waitForCatchup(timeoutMs, 1)));
		const cardEventsCaughtUp = await this.#waitForPendingAdvisorCardEvents(Math.max(0, deadline - Date.now()));
		const abandoned = this.#advisors.filter(
			(advisor, index) => results[index] === false && advisor.runtime.backlog > 0,
		);
		if (abandoned.length > 0 || !cardEventsCaughtUp) {
			logger.warn("advisor shutdown drain incomplete; disposal will abandon reviews or cards", {
```

## 结论（精确总结）

- `advisor.syncBacklog` 合法值 off/1/3/5，默认 off；唯一消费点是每轮结束的 waitForCatchup（摘录 2），`off` 只跳过该停等，后台 `#drain()` 照常跑（摘录 3）。
- 即使开 backlog 等待也不保证每条必达：reset/dispose（epoch 丢 in-flight）、quota（丢新 delta）、连续失败 3 次（丢 backlog）、admission 的 dedup/noise/budget 拒收（摘录 5，guard 部分见 2026-09-14 raw 摘录 9）。
- print/headless 退出有独立排水：print 模式正常 10 分钟、出错 30 秒；task executor 非 abort 退出走同一 waitForAdvisorCatchup；超时不等并告警（摘录 8）。与 syncBacklog 取值无关。
- immuneTurns 只在 `resolveAdvisorDeliveryChannel` consulted（摘录 7）；in-progress non-blocker admission defer 在其上游的 `AdviseTool.execute`（摘录 6），`immuneTurns: 0` 绕不过。
- syncBacklog 与投递路由正交：grep 全 src 仅 settings-schema（声明）、session-advisors.ts:504-507（消费）、main.ts（sandbox 隔离清单）三处出现。
