# OMP 状态栏 cost 段计费三元组源码与会话记录摘录

> Sources: OMP 18.22.2 (@oh-my-pi/pi-tui / @oh-my-pi/pi-coding-agent) 与本次会话 JSONL
> Collected: 2026-11-18
> Published: 2026-11-18

## 会话模型切换记录

会话日志 `~/.omp/agent/sessions/-code-inside-agc/2026-11-18T14-48-06-168Z_01a1ef21-1918-73c4-ae5a-56da3f6365a7.jsonl`：

- 14:48:40 assistant 消息字段：`"provider":"antigravity-cli","model":"gemini-3.8-flash"`
- 14:49:14 记录事件：`model_change` 切换至 `opencode-go/deepseek-v4.1-flash`
- 14:49:16 user 提问：`now?`
- 配置项 `~/.omp/agent/config.yml:74`：`default: opencode-go/deepseek-v4.1-flash:max`

两次身份问答分别对应两次模型切换时处于活动状态的模型配置。

## 样本状态栏片段

用户终端复制的状态栏样本：

```text
⠧ 46s ·  GPT-6.1 Terra  ·  max ·  ~/code-inside/agc ·  master *7 ?4 ·  67.1%/400K  · $40.60 (+0.19) +  1.52
```

其中计费三元组文本为：`$40.60 (+0.19) +  1.52`。

## 预设与段分布

摘自 `@oh-my-pi/pi-tui/src/status-line/presets.ts:4-9`：

```typescript
export const STATUS_LINE_PRESETS: Record<StatusLinePreset, PresetDef> = {
	default: {
		leftSegments: ["pi", "vim", "model", "mode", "collab", "stream", "path", "git", "pr", "context_pct", "cost"],
		rightSegments: ["session_name"],
		separator: "powerline-thin",
		segmentOptions: {
```

`default` 预设将 `cost` 放置在左侧段末尾。

## 计费段计算算法

摘自 `@oh-my-pi/pi-tui/src/status-line/segments.ts:792-842`：

```typescript
/** Billing summary for the `cost` segment, or undefined when there is nothing to bill. */
function costSummary(ctx: SegmentContext): string | undefined {
	const { cost, premiumRequests } = ctx.usageStats;
	// `cost` folds in completed task results; show the session's own spend and
	// the subagent tree separately. The hub-projected tree total also covers
	// grandchildren and running/async agents, but it lags persisted-roster
	// hydration after resume, so the task-result sum is its floor.
	const taskResultCost = ctx.usageStats.subagentCost ?? 0;
	const ownCost = Math.max(0, cost - taskResultCost);
	const subagentCost = Math.max(ctx.subagentTreeCost ?? 0, taskResultCost);
	const advisorCost = ctx.session.getAdvisorCost?.() ?? 0;
	const state = ctx.session.state;
	const pricingPeriod = state.model?.cost
		? getTimeBasedPricingPeriod(state.model.cost, ctx.now?.getTime())
		: undefined;
	const usingSubscription = state.model
		? (ctx.session.modelRegistry?.isUsingSubscription(state.model) ?? false)
		: false;
	// Resolve the advisor subscription flag lazily: with no active advisor
	// it walks the whole model catalog (getAvailable → hasAuth per provider
	// → credential-file reads), and the status line re-renders at the
	// working-spinner cadence, so an eager per-frame probe pinned CPU (#10129).
	return formatBillingSummary(
		{
			cost: ownCost,
			subagentCost,
			usingSubscription,
			premiumRequests,
			fractionDigits: 2,
			pricingPeriod,
			advisor: advisorCost
				? { cost: advisorCost, usingSubscription: ctx.session.isAdvisorUsingSubscription?.() ?? false }
				: undefined,
		},
		theme,
	);
}

const costSegment: StatusLineSegment = {
	id: "cost",
	render(ctx) {
		const billing = costSummary(ctx);
		if (!billing) return { content: "", visible: false };

		return { content: theme.fg("statusLineCost", billing), visible: true };
	},
	describe(ctx) {
		const billing = costSummary(ctx);
		return billing ? segView([span(billing, "statusLineCost")]) : null;
	},
};
```

## 排版规则与单位控制

摘自 `@oh-my-pi/pi-tui/src/status-line/metrics.ts:7-104`：

```typescript
export interface BillingSummaryOptions {
	readonly cost: number;
	readonly usingSubscription: boolean;
	readonly premiumRequests: number;
	readonly fractionDigits: number;
	readonly pricingPeriod?: "peak" | "off-peak";
	/** Subagent-tree spend, rendered `(+…)` after the session's own spend; `cost` excludes it. */
	readonly subagentCost?: number;
	readonly advisor?: {
		readonly cost: number;
		readonly usingSubscription: boolean;
	};
}

type BillingUnit = "metered" | "subscription";

/** `showUnit: false` omits the `$`/subscription symbol when the summary already printed it. */
function formatSpend(
	amount: number,
	usingSubscription: boolean,
	fractionDigits: number,
	uiTheme: Theme,
	showUnit: boolean,
): string {
	const formatted = amount.toFixed(fractionDigits);
	if (!showUnit) return formatted;
	if (!usingSubscription) return `$${formatted}`;
	if (uiTheme.getSymbolPreset() === "nerd") {
		const icon = uiTheme.icon.subscription;
		return icon ? `${icon} ${formatted}` : `S${formatted}`;
	}
	return `S${formatted}`;
}

function formatAdvisorSpend(
	amount: number,
	usingSubscription: boolean,
	fractionDigits: number,
	uiTheme: Theme,
	showUnit: boolean,
): string {
	const spend = formatSpend(amount, usingSubscription, fractionDigits, uiTheme, showUnit);
	const icon = uiTheme.icon.advisor;
	return icon && icon !== "(adv)" ? `${icon} ${spend}` : `${spend} (adv)`;
}

export function formatBillingSummary(options: BillingSummaryOptions, uiTheme: Theme): string | undefined {
	const premiumRequests = normalizePremiumRequests(options.premiumRequests);
	const advisorCost = options.advisor?.cost ?? 0;
	const subagentCost = options.subagentCost ?? 0;
	if (
		!options.cost &&
		!subagentCost &&
		!advisorCost &&
		!options.usingSubscription &&
		!premiumRequests &&
		!options.pricingPeriod
	) {
		return undefined;
	}

	const parts: string[] = [];
	let shownUnit: BillingUnit | undefined;
	const primaryUnit: BillingUnit = options.usingSubscription ? "subscription" : "metered";
	if (options.cost || options.pricingPeriod || subagentCost) {
		parts.push(formatSpend(options.cost, options.usingSubscription, options.fractionDigits, uiTheme, true));
		shownUnit = primaryUnit;
	} else if (options.usingSubscription) {
		parts.push(
			uiTheme.getSymbolPreset() === "nerd" && uiTheme.icon.subscription ? uiTheme.icon.subscription : "(sub)",
		);
		shownUnit = primaryUnit;
	}
	// Always follows the primary spend, which already carries the unit.
	if (subagentCost) parts.push(`(+${subagentCost.toFixed(options.fractionDigits)})`);
	if (options.pricingPeriod) parts.push(options.pricingPeriod === "peak" ? "↑" : "↓");
	if (premiumRequests) parts.push(`★ ${formatNumber(premiumRequests)}`);
	if (advisorCost && options.advisor) {
		const prefix = parts.length > 0 ? "+ " : "";
		const advisorUnit: BillingUnit = options.advisor.usingSubscription ? "subscription" : "metered";
		parts.push(
			`${prefix}${formatAdvisorSpend(
				advisorCost,
				options.advisor.usingSubscription,
				options.fractionDigits,
				uiTheme,
				shownUnit !== advisorUnit,
			)}`,
		);
	}
	return parts.length > 0 ? parts.join(" ") : undefined;
}
```

## 数据模型与子代理树统计

摘自 `@oh-my-pi/pi-tui/src/status-line/types.ts:133-162`：

```typescript
	usageStats: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
		totalTokens: number;
		orchestrationInput: number;
		orchestrationOutput: number;
		orchestrationCacheRead: number;
		premiumRequests: number;
		cost: number;
		/** Portion of `cost` carried by completed subagent task results. */
		subagentCost?: number;
		tokensPerSecond: number | null;
	};
	contextPercent: number | null;
	contextTokens: number;
	contextWindow: number;
	autoCompactEnabled: boolean;
	compactionSpeculation: "idle" | "running" | "armed";
	speculationBlinkOn: boolean;
	subagentCount: number;
	/**
	 * Spend of every subagent under the main session (descendants included),
	 * from the Agent Hub projection; 0 while a subagent is focused or unknown.
	 */
	subagentTreeCost?: number;
```

摘自 `@oh-my-pi/pi-tui/src/status-line/component.ts:2752-2754`：

```typescript
			// The tree total describes the main session; a focused subagent's
			// view falls back to its own completed task results.
			subagentTreeCost: this.#focusedAgentId ? 0 : this.#subagentTreeCost,
```

## Advisor 图标定义与丢失

摘自 `@oh-my-pi/pi-tui/src/theme/symbols.ts`：

- nerd 模式（L878）：`"icon.advisor": "\uea70"`（Nerd Font 代码为 nf-cod-eye）。
- unicode 模式（L493）：`"icon.advisor": "👁"`。
- ascii 模式（L1296）：`"icon.advisor": "(adv)"`。

在终端环境中，私有区字符 `\uea70` 在被复制到剪贴板时若被过滤丢弃，在 `+ ` 与金额之间会留出双空格空白。

## Advisor 独立记账与独立文件存储

摘自 `@oh-my-pi/pi-coding-agent/src/session/session-advisors.ts:2010-2015`：

```typescript
		const cost = message.usage.cost.total;
		this.#advisorCosts.set(advisor.slug, (this.#advisorCosts.get(advisor.slug) ?? 0) + cost);
		// Capture credential attribution now so subscription spend survives
		// the advisor runtime being torn down (#10131).
		if (cost > 0 && Number.isFinite(cost) && this.#host.modelRegistry.isUsingSubscription(advisor.model)) {
```

摘自 `@oh-my-pi/pi-coding-agent/src/advisor/transcript-recorder.ts:15-27`：

```typescript
export const ADVISOR_TRANSCRIPT_STEM = "__advisor";
export const ADVISOR_TRANSCRIPT_FILENAME = `${ADVISOR_TRANSCRIPT_STEM}.jsonl`;

const JSONL_SUFFIX = ".jsonl";

/**
 * Transcript filename for an advisor: `__advisor.jsonl` for the legacy/default
 * advisor (empty slug), `__advisor.<slug>.jsonl` for a named advisor. The `.`
 * separator keeps named files out of the output manager's `-<n>` bump namespace.
 */
export function advisorTranscriptFilename(slug: string): string {
	return slug ? `${ADVISOR_TRANSCRIPT_STEM}.${slug}${JSONL_SUFFIX}` : ADVISOR_TRANSCRIPT_FILENAME;
}
```

摘自 `@oh-my-pi/pi-coding-agent/src/session/session-advisors.ts:1641-1647`：

```typescript
			// Persist this advisor's turns to `<session>/__advisor[.<slug>].jsonl`
			// (resolved lazily so it follows session switches) for stats attribution
			// and Agent Hub observability, without registering it as a peer.
			const recorder = new AdvisorTranscriptRecorder(
				() => this.#host.sessionManager.getSessionFile(),
				() => this.#host.sessionManager.getCwd(),
				advisorTranscriptFilename(slug),
```

Advisor 的记录持久化在 `<session>/__advisor.jsonl` 或 `<session>/__advisor.<slug>.jsonl` 独立文件中，不写入主会话 JSONL transcript 的 `model_usage` 账本。
