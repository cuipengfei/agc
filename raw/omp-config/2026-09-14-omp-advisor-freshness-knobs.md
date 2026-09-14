# OMP advisor 三旋钮源码核验摘录（syncBacklog / immuneTurns / maxNotesPerUpdate）

> Source: 本机 OMP 安装包 @oh-my-pi/pi-coding-agent 18.1.21（~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/）源码逐字摘录，2026-09-14 会话
> Collected: 2026-09-14
> Published: Unknown

## 摘录 1：syncBacklog schema（settings-schema.ts:560-572 逐字）

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

## 摘录 2：syncBacklog 消费点（session-advisors.ts:394-397 逐字）

```ts
		const syncBacklog = this.#host.settings.get("advisor.syncBacklog");
		if (this.#advisors.length === 0 || syncBacklog === "off") return;
		const threshold = Number.parseInt(syncBacklog, 10);
		await Promise.all(this.#advisors.map(advisor => advisor.runtime.waitForCatchup(30_000, threshold, signal)));
```

## 摘录 3：waitForCatchup 放行条件（advisor/runtime.ts:436-447 逐字）

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
```

## 摘录 4：advisor 丢弃路径（advisor/runtime.ts 逐字）

配额耗尽注释（341-347）：

```ts
	/** Quota/rate-limit pause state. When `true`, the advisor stops processing
	 *  turns and drops new deltas until an explicit {@link reset} clears it
	 *  (triggered by `/new`, config rebuild, or session restart). There is no
	 *  timer-based auto-resume: provider quota windows (5h/7d) are far longer
	 *  than any reasonable timer, and premature retries waste calls and
	 *  re-trigger the same error. */
	#quotaExhausted = false;
```

连续失败丢 backlog（约 1444-1452）：

```ts
						this.#consecutiveFailures++;
						if (this.#consecutiveFailures >= 3) {
							logger.warn("advisor failed consecutively 3 times; dropping backlog to prevent stall");
```

## 摘录 5：immuneTurns schema（settings-schema.ts:573-590 逐字）

```ts
	"advisor.immuneTurns": {
		type: "number",
		default: 3,
		ui: {
			tab: "model",
			group: "Advisor",
			label: "Advisor Immune Turns",
			description:
				"After an advisor concern or blocker interrupts, route further concerns/blockers non-interruptingly for this many primary turns.",
			options: [
				{ value: "0", label: "0 turns", description: "Allow every concern/blocker to interrupt." },
```

## 摘录 6：免疫判定（advise-tool.ts:82-89 逐字）

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

## 摘录 7：免疫窗口降级语义与 blocker 豁免（advise-tool.ts:113-135 逐字）

注释：

```ts
 * - During the post-interrupt immune-turn window, further `concern` notes are
 *   downgraded to asides; preservation still wins. A `blocker` is exempt: it
 *   means the agent handed off broken or unexercised work, so it still steers a
 *   triggered turn even right after a prior interrupt (#5628).
 */
export function resolveAdvisorDeliveryChannel(opts: {
	severity: AdvisorSeverity | undefined;
	autoResumeSuppressed: boolean;
	streaming: boolean;
	aborting: boolean;
	terminalAnswerNoQueuedWork?: boolean;
	interruptImmuneTurnActive?: boolean;
	preserveOnly?: boolean;
}): AdvisorDeliveryChannel {
	if (opts.preserveOnly && !opts.streaming) return "preserve";
	if (!isInterruptingSeverity(opts.severity)) return "aside";
	if (opts.autoResumeSuppressed && (opts.aborting || !opts.streaming)) return "preserve";
	if (opts.terminalAnswerNoQueuedWork && opts.severity !== "blocker" && !opts.streaming && !opts.aborting)
		return "preserve";
	if (opts.interruptImmuneTurnActive && opts.severity !== "blocker") return "aside";
	return "steer";
}
```

即 immuneTurns=0 消除的是"打断后降级"窗口，其余例外通道（preserveOnly / autoResumeSuppressed / terminalAnswerNoQueuedWork）不变；blocker 不受免疫窗口约束。

## 摘录 8：maxNotesPerUpdate schema（settings-schema.ts:593-602 逐字）

```ts
	"advisor.maxNotesPerUpdate": {
		type: "number",
		default: ADVISOR_DEFAULT_BUDGET_PER_UPDATE,
		ui: {
			tab: "model",
			group: "Advisor",
			label: "Advisor Max Notes Per Update",
			description:
				"Maximum non-blocker advice notes accepted per advisor prompt update (1–32; UI offers 1–5 quick picks). Blockers are exempt.",
```

## 摘录 9：emission guard 预算语义（advisor/emission-guard.ts 逐字）

```ts
	#acceptedThisUpdate = 0;
	readonly #budgetPerUpdate: number;
```

```ts
	/**
	 * Clear the per-update rate-limit gate. Called by `AdvisorRuntime` right
	 * before each `agent.prompt(batch)` invocation so the next advisor model
	 * cycle starts with a fresh budget.
	 */
	beginUpdate(): void {
		this.#acceptedThisUpdate = 0;
	}
```

```ts
	/**
	 * Classify and reserve a proposed note. Accepted notes consume the update
	 * budget and enter the dedupe history; rejected notes leave both unchanged.
```

即预算按次清零；reject 的 note 不进 dedupe 历史，后续 update 重新提出时仍可通过。

## 摘录 10：来源配置实测值（2026-09-14，~/.omp/agent/config.yml）

```yaml
advisor:
  enabled: true
  syncBacklog: "1"
  immuneTurns: 0
  maxNotesPerUpdate: 1
```

（当日早些时候同一文件曾同步过 syncBacklog "off"、immuneTurns 3、maxNotesPerUpdate 5；之后用户再次调整为上值。）
