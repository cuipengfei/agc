# OMP Vibe mode 关闭实验性 rollover 的运行取证

> 来源：本机安装版 `@oh-my-pi/pi-coding-agent` 18.8.7（`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src`），与 can1357/oh-my-pi 工作副本 `/home/cpf/code-inside/oh-my-pi` 一致；OMP 会话 JSONL `~/.omp/agent/sessions/-code-inside-copilot-api/2026-10-07T12-02-35-686Z_01a1163e-7a26-7644-872f-3c3d68b7ea02.jsonl` 与运行日志 `~/.omp/logs/omp.2026-10-10.41920.log`
> 采集日期：2026-10-10
> 关联：补充 `raw/omp-config/2026-09-12-experimental-context-deep-dive.md` 的三重生效门，新增 Vibe mode 对工具表面门的影响；工具门锚点按 18.8.7 重新核对

## 观察到的矛盾

配置 `compaction.experimentalContextManagement: true`（全局与当前有效设置一致），邻近会话最近一次自动压缩却落入传统方法链，没有走实验性 rollover。

## 源码摘录（安装版 18.8.7，verbatim）

### 实验门 = 开关 AND 工具表面（`session-maintenance.ts:576-582`）

```ts
/** Experimental rollover is safe only when the current effective tool surface can recover its state. */
#usesExperimentalContextManagement(): boolean {
	return (
		this.#compactionSettings.experimentalContextManagement === true &&
		this.#host.hasExperimentalContextRolloverTools()
	);
}
```

### 四项必需工具（`agent-session.ts:562-567`）

```ts
const EXPERIMENTAL_CONTEXT_REQUIRED_TOOLS: Record<string, true> = {
	context_notes: true,
	new_context: true,
	read: true,
	grep: true,
};
```

### 工具表面检查：全部启用且已注册（`agent-session.ts:2238-2243`）

```ts
hasExperimentalContextRolloverTools: () => {
	const enabled = this.#tools.getEnabledToolNames();
	for (const name in EXPERIMENTAL_CONTEXT_REQUIRED_TOOLS) {
		if (!enabled.includes(name) || !this.#tools.getToolByName(name)) return false;
	}
	return true;
```

### Vibe mode 的工具表面（`interactive-mode.ts:6002-6025`）

```ts
const previousTools = options?.previousTools ?? this.session.getEnabledToolNames();
const vibeBaseTools = ["read"];
if (this.session.hasBuiltInTool("todo")) vibeBaseTools.push("todo");
...
await this.session.activateVibeTools(vibeBaseTools);
...
if (options?.persistModeChange !== false) this.sessionManager.appendModeChange("vibe", { previousTools });
this.showStatus(
	"Vibe mode enabled. You direct fast/good worker sessions; toolset is read + optional parent Todo + vibe tools.",
);
```

### Vibe 工具集合（`vibe.ts:30`、`vibe.ts:275`）

```ts
export const VIBE_TOOL_NAMES = ["vibe_spawn", "vibe_send", "vibe_wait", "vibe_kill", "vibe_list"] as const;
...
/** Creates the ephemeral tools installed while `/vibe` mode is active. */
export function createVibeTools(session: ToolSession): Tool[] {
```

机制：Vibe 期间有效工具 = `read` + 可选 `todo` + 五个 `vibe_*`，不含 `grep`、`context_notes`、`new_context`，故 `hasExperimentalContextRolloverTools()` 返回 false，`#usesExperimentalContextManagement()` 返回 false。

## 运行证据（会话 JSONL 与日志）

### 配置

`~/.omp/agent/config.yml`：`compaction.methodOrder: [shake, handoff, soft]`，`compaction.experimentalContextManagement: true`。

### mode_change 时间线（JSONL，时间为 UTC）

- 进入 Vibe：`2026-10-09T15:29:57.064Z`
- 退出 Vibe：`2026-10-09T17:17:23.286Z`
- 当次压缩：`2026-10-09T16:29:54.047Z`，落在 Vibe 区间内。

### 压缩记录与日志

- JSONL compaction 记录（id `fea25bfe`）：`method: "soft"`，tokensBefore 263177。
- `omp.2026-10-10.41920.log:99-108`：`shake` 的 advisor context reset；`handoff` autoTriggered true 无内容后继续；`soft` 成功，263177 → 48597。

### 全部 8 次压缩的模式—结果（JSONL 全量解析输出）

脚本遍历 JSONL，维护 `activeHistoricalMode`（随 `mode_change` 更新），对每条 `compaction` 记录 `method ?? details.kind`：

- 普通模式（mode none）5 次：全部 `experimental-context-rollover`。
- Vibe 模式 3 次：全部 `soft`。
- 最早一次 Vibe：进入 `2026-10-07T15:01:23.165Z`，退出 `2026-10-08T01:23:25.449Z`。

断言核验：Vibe 组 length 3 且结果全为 `soft`，none 组 length 5 且结果全为 `experimental-context-rollover`，通过。

## 推断与证据边界

- 机制推断：Vibe 收缩工具表面 → 工具门不满足 → 自动压缩退回 `methodOrder`。由「Vibe 时间窗覆盖压缩时刻」+「安装版 18.8.7 实现」+「8 次模式—结果一致」三项支撑。
- 未独立证实：压缩那一刻的精确工具清单无独立 dump（证据是模式时间窗 + 实现，非逐实例快照）；当次运行的 OMP 应用版本未独立证实（`ps` 显示 pid 41920 启动于 2026-10-10 07:26，晚于压缩时刻，同名 pid 日志前一日已有记录，不能当历史版本的绝对证据）；`shake` 自动分支归属只见 advisor context reset，未独立确认。
