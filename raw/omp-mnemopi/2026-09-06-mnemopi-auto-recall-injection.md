# OMP Mnemopi Auto-Recall 注入机制源码证据

> Source: 本地 `@oh-my-pi/pi-coding-agent` 与 `@oh-my-pi/pi-mnemopi` 包源码（`~/.bun/install/global/node_modules/`）
> Collected: 2026-09-06
> Published: Unknown

以下为从本地安装的包源码中直接摘录的关键片段（含文件路径与行号），作为 auto-recall 注入机制的原始证据。

## 注入时机与次数（state.ts）

`~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/mnemopi/state.ts`：

```ts
// 472-484 行：首个 agent prompt 前的 auto-recall，仅一次
async beforeAgentStartPrompt(promptText: string): Promise<string | undefined> {
	if (!this.config.autoRecall || this.hasRecalledForFirstTurn) return undefined;  // 473
	const latestPrompt = promptText.trim();
	if (!latestPrompt) return undefined;
	const history = extractMessages(this.session.sessionManager);
	const queryMessages = [...history, { role: "user" as const, content: latestPrompt }];
	const query = composeRecallQuery(latestPrompt, queryMessages, this.config.recallContextTurns);  // 478
	const truncated = truncateRecallQuery(query, latestPrompt, this.config.recallMaxQueryChars);
	const context = await this.recallForContext(truncated);
	this.hasRecalledForFirstTurn = true;  // 481
	if (!context) return undefined;
	this.lastRecallSnippet = context;
	return context;
}
```

`hasRecalledForFirstTurn` 默认值与重置（state.ts:241-252、265-270）：

```ts
hasRecalledForFirstTurn: boolean;
// constructor: this.hasRecalledForFirstTurn = options.hasRecalledForFirstTurn ?? false;  (252)
resetConversationTracking(): void {
	this.lastRetainedTurn = 0;
	this.hasRecalledForFirstTurn = false;  // 268
	this.lastRecallSnippet = undefined;
}
```

## query 构造（content.ts）

`~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/hindsight/content.ts`（composeRecallQuery，118-138 行）核心逻辑：

```ts
function composeRecallQuery(latest, messages, recallContextTurns) {
	// ...
	if (recallContextTurns <= 1 || messages.length === 0) return latest;  // 124：空历史直接返回当前消息
	// 有历史时：sliceLastTurnsByUserBoundary(queryMessages, 3) 取最后 3 个 user boundaries（含当前）
	// 132 行：if (msg.role === "user" && content === latest) continue;  // 去重当前消息
	// 结果：Prior context 块 + 当前消息
}
```

配置默认值：`recallContextTurns` 默认 3，`recallMaxQueryChars` 默认 4000。

## 检索与数量/预算

`recallEnhanced`（backend.ts:62-66 区域）默认启用 synonyms、intent、MMR；向量由 `embedQuery` 生成；`includeFacts=true`。注入条数 `recallLimit` 默认 8，注入预算 `injectionTokenLimit` 默认 5000 tokens。

## veracity 权重（recall.ts:61-70）

`~/.bun/install/global/node_modules/@oh-my-pi/pi-mnemopi/src/core/beam/recall.ts`：

```ts
const VERACITY_WEIGHTS = {
	stated: 1.0, true: 1.0, likely_true: 1.0,
	unknown: 0.8,
	inferred: 0.7,
	imported: 0.6,
	tool: 0.5,
	false: 0,
};
```

## 注入位置与持久化（session-tools.ts:1506-1516）

`~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/session/session-tools.ts`：

```ts
// 若 refresh 后 base prompt 未含该 injected，才追加
stablePrompt = [...previousBaseSystemPrompt, injected]   // 追加为 base prompt 最后一段
this.#baseSystemPrompt = stablePrompt                    // 写回持久化
this.#applyAgentSystemPrompt(stablePrompt)
```

`buildDeveloperInstructions`（backend.ts:139-146）拼装顺序：`STATIC_INSTRUCTIONS → lastRecallSnippet`（记忆块在尾部）。

## 注入格式（state.ts:956-963）

`formatRecallBlock` 渲染每条为 `- {content} [source] (date)`，块前缀含固定文案与动态字段 `Current time: ${formatCurrentTime()} UTC`。

## 记忆类型可编辑性（memory_edit schema 与实测）

`memory_edit` schema 说明：
- Operations: `update` / `forget` / `invalidate`
- 「Fact ids — recall results marked `[facts]`: read-only. Inspect with `read memory://<id>`; any edit op → `not_editable`.」

实测（bank `copilot-api-3txf4siqne7xa`）：
- fact `56ad7ae6a54b3838`：`update`、`invalidate`、`forget` 三个 op 全部返回「read-only fact... cannot be edited」
- working 类型 `f521f4838423d253`（store: working，transcript 来源）：`invalidate` 实测成功

## Bank 存储结构实测（copilot-api bank）

`~/.omp/agent/memories/mnemopi/banks/copilot-api-3txf4siqne7xa/mnemopi.db`，文件大小 6.9MB。`memory_stats` 显示：working 76 / episodic 4 / facts 306 / triples 2 / graph_edges 592。表结构含 `working_memory`、`episodic_memory`、`facts`、`triples`、`graph_edges` 五类表（graph_edges 为关系表）。

## quit+resume 与 cache

resume 时新建 `MnemopiSessionState`，`hasRecalledForFirstTurn` 默认 false → 首个新 turn 重新 auto-recall → `formatRecallBlock` 写入当时 `Current time: ...UTC`（时间文本每次不同）→ system prompt bytes 改变。cache 是否命中取决于 provider 的缓存键与前缀策略（代码无法断言），但 bytes 必然因时间戳字段变化而改变。
