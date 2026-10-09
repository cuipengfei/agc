# builtin-modes 注册项增补摘录（/slow /ratchet /modelpreset /effort，2026-10-10 取证）

> Sources: oh-my-pi 源码（`can1357/oh-my-pi`，blob 基线 `d485860`，GitHub `file_read` 直读）：`packages/coding-agent/src/slash-commands/builtin-modes.ts`（四命令注册项逐字摘录）、`packages/coding-agent/src/slash-commands/builtin-registry.ts` 与同类 `builtin-collaboration.ts` / `builtin-session.ts` / `builtin-lifecycle.ts` / `builtin-marketplace.ts` / `builtin-skills.ts` / `builtin-control.ts`（总数核算）、`packages/tui/src/thinking.ts`（/effort 子命令档位生成式定义）
> Collected: 2026-10-10
> identifier: builtin-modes-registry-additions

证据分级：**源码**＝file_read 逐字直读。摘录中 ratchet 注册项、`RATCHET_REQUIRED_TOOLS` 等与 `raw/omp/2026-10-10-ratchet-mechanics.md` 锚定的 d485860 基线逐字一致。

## 0. 当前 blob core registry 总数核算（builtin-registry.ts，源码）

当前 registry 合并数组为**七类**（比 v18.1.10 快照的六类多 `BUILTIN_SKILLS_SLASH_COMMANDS`）：

```ts
const BUILTIN_SLASH_COMMAND_REGISTRY: ReadonlyArray<SlashCommandSpec> = [
	...BUILTIN_MODE_SLASH_COMMANDS,
	...BUILTIN_COLLABORATION_SLASH_COMMANDS,
	...BUILTIN_SESSION_SLASH_COMMANDS,
	...BUILTIN_LIFECYCLE_SLASH_COMMANDS,
	...BUILTIN_MARKETPLACE_SLASH_COMMANDS,
	...BUILTIN_SKILLS_SLASH_COMMANDS,
	...BUILTIN_CONTROL_SLASH_COMMANDS,
];
```

逐文件直读统计顶层 `name:` 条目（子命令不计入顶层数）：

| 类（数组来源文件） | 当前 blob | v18.1.10 快照 |
|---|---|---|
| Mode（builtin-modes.ts） | 21 | 17 |
| Collaboration（builtin-collaboration.ts） | 11 | 11 |
| Session（builtin-session.ts） | 19 | 19 |
| Lifecycle（builtin-lifecycle.ts） | 25 | 25 |
| Marketplace（builtin-marketplace.ts） | 3 | 3 |
| Skills（builtin-skills.ts） | 1 | —（快照 registry 无此类） |
| Control（builtin-control.ts） | 5 | 4 |
| **core registry 合计** | **85** | **79** |

增量明细（均源码直读核对）：

- Mode 17→21：增补 `/slow`、`/ratchet`、`/modelpreset`、`/effort` 四条，其余 17 条名称与快照一致。
- Control 4→5：增补 `/pause`，description 原文 "Freeze all agents (main, subagents, advisor) until resumed"。
- 新增 Skills 类：`/skills`，description 原文 "Search, install, and update skills from the skills.omp.sh registry"，TUI-only（只有 `handleTui`）。
- bundled（`/green`、`/review`）与 SDK 注入（`/autoresearch`）两条通道本次未重新核算，v18.1.10 口径为 +3（合计 82）。

## 1. /slow（builtin-modes.ts，源码逐字）

注册项（缩进按原文层级转写；handler 体从略）：

```ts
	{
		name: "slow",
		icon: "fast",
		description:
			"Toggle slow mode: flex tier on OpenAI/Google; on Anthropic, continue at low priority after the Claude session limit",
		acpDescription: "Toggle slow mode",
		acpInputHint: "[on|off|status]",
		subcommands: [
			{ name: "on", description: "Flex tier, or Anthropic low priority at the session limit (auto)" },
			{ name: "off", description: "Standard service; stop Anthropic low priority" },
			{ name: "status", description: "Show slow mode status" },
		],
		allowArgs: true,
		getTuiAutocompleteDescription: runtime =>
			runtime.ctx.session.isSlowModeEnabled() ? "Slow mode: on" : "Slow mode: off",
		handle: async (command, runtime) => { /* runSlowCommand… */ },
		handleTui: (command, runtime) => { /* runSlowCommand… */ },
	},
```

`handle` 与 `handleTui` 均在 → ACP 可用。关联原文：

- `runSlowCommand` doc 注释：`"/slow [on|off|status]" for the active model: the \`flex\` service tier on OpenAI/Google, subscription low priority (\`providers.anthropic.slowMode\` \`auto\`/\`off\`) on Anthropic. Bare invocation toggles.`
- 用法串：`"Usage: /slow [on|off|status]"`
- 不支持时（`SLOW_UNSUPPORTED`）：`"The current model has no slow mode: /slow uses the flex tier on OpenAI/Google models and low priority on Anthropic subscriptions."`

## 2. /ratchet（builtin-modes.ts，源码逐字）

```ts
	{
		name: "ratchet",
		icon: "loop",
		description: "Build (or reuse) an eval for an LLM flow, then hillclimb it unattended",
		inlineHint: "[flow and goal]",
		allowArgs: true,
		handle: (command, runtime) => {
			const armed = prepareRatchet(runtime.session, command.args);
			if ("error" in armed) return usage(armed.error, runtime);
			return { prompt: armed.kickoff };
		},
		handleTui: async (command, runtime) => { /* 同 raw/omp/2026-10-10-ratchet-mechanics.md 1.1 节 */ },
	},
```

`handle` 与 `handleTui` 均在 → ACP 可用。无声明式子命令。装配门槛原文：`const RATCHET_REQUIRED_TOOLS = ["eval", "task"] as const;`，缺工具时返回 `` `/ratchet needs the ${missing.join(" and ")} tool active.` ``。机制细节（kickoff、爬山循环）见 ratchet-mechanics raw，不重复摘录。

## 3. /modelpreset（builtin-modes.ts，源码逐字）

```ts
	{
		name: "modelpreset",
		icon: "model",
		description: "Save and switch model presets (role models + thinking level)",
		acpDescription: "Manage model presets",
		acpInputHint: "[list|save|switch|delete] [name]",
		inlineHint: "[save|switch|delete|list] [name]",
		subcommands: [
			{ name: "list", description: "List saved presets" },
			{ name: "save", description: "Save the current role models and thinking level", usage: "<name>" },
			{ name: "switch", description: "Apply a saved preset", usage: "<name>" },
			{ name: "delete", description: "Delete a saved preset", usage: "<name>" },
		],
		allowArgs: true,
		getTuiAutocompleteDescription: runtime => { /* Presets: N saved / none saved */ },
		handle: async (command, runtime) => { /* runPresetsCommand（ACP/TUI 共享） */ },
		handleTui: async (command, runtime) => { /* 无参弹 "Switch to model preset" 选择器 */ },
	},
```

`handle` 与 `handleTui` 均在 → ACP 可用。关联原文：

- 用法串：`"Usage: /modelpreset [list | save <name> | switch <name> | delete <name>]"`
- 无预设时：`"No model presets saved. Use /modelpreset save <name> to create one."`
- 预设名校验失败：`Invalid preset name "${name}": use a letter, then letters, digits, - or _`

## 4. /effort（builtin-modes.ts，源码逐字）

```ts
	{
		name: "effort",
		icon: "gauge",
		get description() {
			return `Set reasoning effort (thinking level, intelligence) for this session; ${formatKeyHint("shift+tab")} cycles levels`;
		},
		acpDescription: "Set or show reasoning effort (thinking level, intelligence)",
		acpInputHint: "[level]",
		inlineHint: "[level]",
		allowArgs: true,
		subcommands: CLI_THINKING_LEVELS.map(level => ({
			name: level,
			description: getConfiguredThinkingLevelMetadata(level).description,
		})),
		getTuiAutocompleteDescription: runtime =>
			`Thinking: ${runtime.ctx.session.configuredThinkingLevel() ?? "model default"}`,
		handle: async (command, runtime) => { /* 无参输出当前档位与可选档位；有参 resolveThinkingArgument 后 setThinkingLevel */ },
		handleTui: (command, runtime) => { /* 无参 showThinkingSelector()；有参 setThinkingLevel */ },
	},
```

`handle` 与 `handleTui` 均在 → ACP 可用。description 是 getter（含按键提示 `formatKeyHint("shift+tab")`），语义原文即 "Set reasoning effort (thinking level, intelligence) for this session; shift+tab cycles levels"。

子命令为生成式：`CLI_THINKING_LEVELS.map(...)`。`CLI_THINKING_LEVELS` 定义（`packages/tui/src/thinking.ts`，源码逐字）：

```ts
/** Thinking selectors accepted by CLI inputs, in display order. */
export const CLI_THINKING_LEVELS: readonly ConfiguredThinkingLevel[] = ["off", ...THINKING_EFFORTS, "auto"];
```

即档位 off / minimal / low / medium / high / xhigh / max / auto（同文件 `THINKING_LEVEL_BY_SELECTOR` selector 表与 `AUTO_THINKING_METADATA` 逐字可见；档位描述如 off="No reasoning"、low="Light reasoning (~2k tokens)"、auto="Auto-detect per prompt"）。
