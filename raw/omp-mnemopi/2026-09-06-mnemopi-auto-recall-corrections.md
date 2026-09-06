# OMP Mnemopi Auto-Recall 注入机制修正证据

> Source: 本地 `@oh-my-pi/pi-coding-agent` 包源码（`~/.bun/install/global/node_modules/`）
> Collected: 2026-09-06
> Published: Unknown

本文件是对 `2026-09-06-mnemopi-auto-recall-injection.md` 的两处修正证据。原 raw 中的初步摘录保留不变；以下为新核实的源码证据，作为文章的准绳。

## 修正 1：全新 session 只返回 latest 的真实分支

原 raw 把「全新 session 只返回 latest」归因为 `messages.length === 0`（content.ts:124）。实际在 `beforeAgentStartPrompt` 路径中，`queryMessages` 已先 append 当前消息（state.ts:476-478），故 `messages.length === 0` 在该路径不成立。真实分支是去重后 `contextLines.length === 0`（content.ts:136）。

`~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/hindsight/content.ts`（118-138 行）：

```ts
export function composeRecallQuery(
	latestQuery: string,
	messages: HindsightMessage[],
	recallContextTurns: number,
): string {
	const latest = latestQuery.trim();
	if (recallContextTurns <= 1 || messages.length === 0) return latest;

	const contextual = sliceLastTurnsByUserBoundary(messages, recallContextTurns);
	const contextLines: string[] = [];

	for (const msg of contextual) {
		const content = stripMemoryTags(msg.content).trim();
		if (!content) continue;
		if (msg.role === "user" && content === latest) continue;  // 132：去重当前消息
		contextLines.push(`${msg.role}: ${content}`);
	}

	if (contextLines.length === 0) return latest;  // 136：去重后无剩余则只返回当前消息
	return ["Prior context:", contextLines.join("\n"), latest].join("\n\n");
}
```

`beforeAgentStartPrompt` 先 append 当前消息（state.ts:476-478）：

```ts
const history = extractMessages(this.session.sessionManager);
const queryMessages = [...history, { role: "user" as const, content: latestPrompt }];
const query = composeRecallQuery(latestPrompt, queryMessages, this.config.recallContextTurns);
```

## 修正 2：formatCurrentTime 只精确到 UTC 分钟

原 raw 称「时间文本每次不同」。实际 `formatCurrentTime` 只精确到 UTC 分钟（无秒），故 quit/resume 跨分钟才确定改变 bytes，同分钟内不一定。

`~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/hindsight/content.ts`（77-85 行）：

```ts
/** Format current UTC time for the recall preamble. */
export function formatCurrentTime(now: Date = new Date()): string {
	const y = now.getUTCFullYear();
	const m = String(now.getUTCMonth() + 1).padStart(2, "0");
	const d = String(now.getUTCDate()).padStart(2, "0");
	const h = String(now.getUTCHours()).padStart(2, "0");
	const min = String(now.getUTCMinutes()).padStart(2, "0");
	return `${y}-${m}-${d} ${h}:${min}`;
}
```
