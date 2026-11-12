# task.steps 有序阶段执行与 task.autoParallel 源码取证（v18.19.0）

> Source: 本机已安装包 `@oh-my-pi/pi-coding-agent` v18.19.0（`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent`）源码直读 + 本机两次冒烟测试实测
> Collected: 2026-11-12
> Published: 2026-11-12

## 源码摘录：`src/task/steps.ts`

```
/**
 * Sequential steps of one task spawn (`steps` on a task item, instead of `task`).
 *
 * The steps go out in at most {@link MAX_STEPS} prompts ({@link renderStepPrompts}): the first is
 * the initial prompt, each later one is sent once the child delivered the previous (a terminal
 * `yield`, or without `yield` its final message), so the child works one stage at a time instead of
 * planning against the whole list. The last prompt's result is the run's result.
 *
 * A run records the prompts it sent as {@link TASK_STEPS_ENTRY} entries, so `omp --restore` goes on
 * with the prompts an interrupted run had left ({@link readStepProgress}).
 *
 * @example
 * renderStepPrompts(["a", "b", "c", "d", "e"], true).length; // 4: steps 1–2, then 3, 4, 5
 */
```

```
/** Most prompts one stepped spawn sends; more steps share prompts, earlier prompts taking the extra. */
export const MAX_STEPS = 4;
```

```
/**
 * Sizes of the prompts `count` steps go out in: at most {@link MAX_STEPS}, as even as possible,
 * earlier prompts one step larger (5 → 2-1-1-1, 9 → 3-2-2-2).
 */
function promptSizes(count: number): number[] {
	const prompts = Math.min(count, MAX_STEPS);
	const base = Math.floor(count / prompts);
	const larger = count % prompts;
	return Array.from({ length: prompts }, (_, index) => base + (index < larger ? 1 : 0));
}
```

## 源码摘录：`src/task/settings.ts:271-297`

```
export const cfgTaskAutoParallel = register({
	id: "task.autoParallel",
	protocolDefault: ["rpc", "acp"],
	type: "enum",
	values: ["off", "suggest", "on"] as const,
	default: "off",
	ui: {
		tab: "tasks",
		group: "Subagents",
		label: "Auto Parallel",
		description:
			"Ask the native judge resolved through the 'judge' role which parts of each new top-level prompt can run concurrently. Needs a native judge and the task tool; without them nothing is judged.",
		options: [
			{ value: "off", label: "Off", description: "Never split prompts" },
			{
				value: "suggest",
				label: "Suggest",
				description: "Judge each prompt and report the split without acting on it",
			},
			{
				value: "on",
				label: "On",
				description: "When a prompt splits into independent subtasks, tell the agent to delegate them in parallel",
			},
		],
	},
});
```

## 源码摘录：`src/task/settings.ts:313-325`（cfgTaskSteps）

```
export const cfgTaskSteps = register({
	id: "task.steps",
	protocolDefault: ["rpc", "acp"],
	type: "boolean",
	default: false,
	ui: {
		tab: "tasks",
		group: "Subagents",
		label: "Sequential Task Steps",
		description:
			"Spawns take ordered `steps` instead of one `task`: the subagent gets the first step, then each next one once it finishes the previous; past 4 steps, earlier messages carry two or more. The last step's result is the task's result.",
	},
});
```

开启后 task 工具 schema 的 `tasks[]` 项从单个 `task: string` 变为必填的 `steps: string[]`；每项还包含 `solutionSpace: string` 与可选的 `name`/`agent`/`effort`/`outputSchema`/`schemaMode`/`tools`/`model`。

## 实测记录：五步玩笑冒烟测试（2026-11-12，本机）

配置：`task.autoParallel: "suggest"`、`task.steps: true`，均在 `~/.omp/agent/config.yml`。

- 任务以 5 个 steps 派发（一个 `tasks[]` 项，agent 为默认 `task`）
- 阶段消息按 2-1-1-1 分组送达（第 1、2 步合并为一条消息；第 3、4、5 步各一条）
- 每条阶段消息完成后子代理 `yield` 交付，OMP 在同一子代理会话中发送下一条
- 最后一条阶段消息的结果为整个任务的结果，任务状态 `completed`
- 阶段产物（第 2 步的候选 A/B/C、第 3 步的选择理由）留在同一会话，供后续步骤直接引用
- 执行记录 `history://FiveStepJokeSmoke` 显示 `Step 1 of 2` 至 `Step 5 of 5` 全部完成

## 实测记录：两步玩笑冒烟测试（2026-11-12，本机）

- 2 个 steps 派发，分组为 1-1（各自一条消息）
- 子代理两次 `yield`，最终状态 `completed`

## turn 定义（会话中对齐）

- turn = 一次外部输入 → 为处理该输入的内部过程（可含多次模型调用与工具调用）→ 完成该输入的响应
- 旧 `task`（无 steps）初次执行：1 个 turn
- `steps` 有 N 条阶段消息 = N 个 turn（五步实测为 4 个 turn）
