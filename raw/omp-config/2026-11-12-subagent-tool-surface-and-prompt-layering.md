# OMP 子代理工具面解析与提示词分层取证（v18.19.0）

> Source: 本机已安装包 `@oh-my-pi/pi-coding-agent` v18.19.0（`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent`）源码直读；本机 `~/.omp/agent/agents/*.md` 与 `manifest.json`；`resolveBuiltinToolPlan` 与 `discoverAgents` 实测输出
> Collected: 2026-11-12
> Published: 2026-11-12

## 源码摘录：`src/tools/index.ts:663-853`（resolveBuiltinToolPlan）

```
export async function resolveBuiltinToolPlan(session: ToolSession, toolNames?: string[]): Promise<BuiltinToolPlan> {
	const restrictToolNames = session.restrictToolNames === true;
	const includeYield = session.requireYieldTool === true;
	const enableLsp = session.enableLsp ?? true;
	const requestedTools = restrictToolNames
		? normalizeToolNames(toolNames ?? [])
		: toolNames
			? normalizeToolNames(toolNames)
			: undefined;
```

取全量与取列表两条路径：`toolNames` 缺失时 `requestedTools` 为 `undefined`，末段 `names` 取 `Object.keys(BUILTIN_TOOLS).filter(isToolAllowed)`；写了列表时只保留列表内名称。

```
	if (requestedTools && !restrictToolNames) {
		if (
			cfgCompactionExperimentalContextManagement.get(session.settings) &&
			requestedTools.includes("read") &&
			requestedTools.includes("grep")
		) {
			if (!requestedTools.includes("context_notes")) requestedTools.push("context_notes");
			if (!requestedTools.includes("new_context")) requestedTools.push("new_context");
		}
		if (
			requestedTools.includes("grep") &&
			!requestedTools.includes("ast_grep") &&
			cfgAstGrepEnabled.get(session.settings)
		) {
			requestedTools.push("ast_grep");
		}
		if (
			requestedTools.includes("edit") &&
			!requestedTools.includes("ast_edit") &&
			cfgAstEditEnabled.get(session.settings)
		) {
			requestedTools.push("ast_edit");
		}
		if (["hindsight", "mnemopi"].includes(cfgMemoryBackend.get(session.settings))) {
			for (const name of ["recall", "retain", "reflect"]) {
				if (!requestedTools.includes(name)) requestedTools.push(name);
			}
		}
		if (cfgMemoryBackend.get(session.settings) === "mnemopi" && !requestedTools.includes("memory_edit")) {
			requestedTools.push("memory_edit");
		}
```

自动补齐分支：`context_notes`/`new_context` 依赖 `cfgCompactionExperimentalContextManagement` 且同时有 `read` 与 `grep`；`ast_grep` 由 `grep` 触发；`ast_edit` 由 `edit` 触发；`recall`/`retain`/`reflect` 由 `memory.backend` 为 hindsight 或 mnemopi 触发；`memory_edit` 只由 mnemopi 触发。

```
		if (cfgAutolearnEnabled.get(session.settings) && (session.taskDepth ?? 0) === 0) {
			if (!requestedTools.includes("manage_skill")) requestedTools.push("manage_skill");
			if (
				["hindsight", "mnemopi", "local"].includes(cfgMemoryBackend.get(session.settings)) &&
				!requestedTools.includes("learn")
			) {
				requestedTools.push("learn");
			}
		}
```

`manage_skill` 与 `learn` 的自动补齐限 `taskDepth` 为 0，子代理（深度 1）不触发。

```
	const names = requestedTools?.filter(
		name => (name in BUILTIN_TOOLS || name in HIDDEN_TOOLS) && isToolAllowed(name),
	) ?? [
		...Object.keys(BUILTIN_TOOLS).filter(isToolAllowed),
		...(externalThinkingActive ? ["think"] : []),
		...(includeYield ? ["yield"] : []),
		...(goalModeActive ? ["goal"] : []),
	];
```

列表模式下不在 `BUILTIN_TOOLS` 与 `HIDDEN_TOOLS` 里的名称被直接丢弃，因此 frontmatter 里的 `mcp__*` 名称不参与内置工具计算。

`isToolAllowed` 的逐项门禁（同文件 776-840 行）：`goal` 需 `goal.enabled` 且非受限；`lsp` 需 `enableLsp` 与 `lsp.enabled`；`edit` 需 `edit.mode` 不为 `none`；`bash` 在 `edit.mode` 为 `none` 时放行，否则需 `bash.enabled`；`eval` 需任一后端可用；`debug`、`ida`、`checkpoint`/`rewind`、`manage_skill`、`learn`、`github`、`glob`、`grep`、`find`、`ast_grep`、`ast_edit`、`web_search`、`security_scan`、`ask`、`context_notes`/`new_context`、`todo`、`wait`、记忆工具各有对应设置键；`task` 走 `canSpawnAtDepth`。

## 源码摘录：`src/sdk.ts:4528-4541`（alwaysInclude）

```
		const alwaysInclude: string[] = restrictToolNames
			? []
			: [
					...sdkCustomTools.map(t => t.name),
					...registeredTools.map(t => t.definition.name),
					...settingsGatedCustomEntries.keys(),
				].filter(name => !defaultInactiveToolNames.has(name));
		for (const name of alwaysInclude) {
			if (toolRegistry.has(name) && !initialToolNames.includes(name)) {
				initialToolNames.push(name);
			}
		}
```

`restrictToolNames` 为假时，SDK 自定义工具（含 MCP 代理）、扩展注册工具与设置门控自定义工具无条件进入激活集合，与 frontmatter `tools` 列表无关。

## 源码摘录：`src/sdk.ts:2619-2623`（hasEditTool）

```
			get hasEditTool() {
				const requestedToolNames = options.toolNames ? normalizeToolNames(options.toolNames) : undefined;
				return restrictToolNames
					? requestedToolNames?.includes("edit") === true
					: !requestedToolNames || requestedToolNames.includes("edit");
			},
```

`hasEditTool` 只取决于工具列表是否含 `edit`；该标志控制 `read` 输出的 hashline 行锚点。

## 源码摘录：`src/task/executor.ts:4624, 4627-4636, 4652-4659`（toolNames 组装）

```
	const restrictToolNames = options.restrictToolNames === true || preparedSession !== undefined;
```

```
	let toolNames: string[] | undefined;
	if (agent.tools) {
		toolNames = structured ? agent.tools : agent.tools.filter(name => name !== "yield");
		// Auto-include task tool if spawns defined but task not in tools
		if (agent.spawns !== undefined && !toolNames.includes("task") && !atMaxDepth) {
			toolNames = [...toolNames, "task"];
		}
	}
```

```
	if (
		toolNames &&
		!options.restrictToolNames &&
		!toolNames.includes("wait") &&
		(toolNames.includes("task") || toolNames.includes("bash"))
	) {
		toolNames = [...toolNames, "wait"];
	}
```

普通子代理 `restrictToolNames` 为假；`preparedSession`（seance）为真。`wait` 由 `task` 或 `bash` 触发补齐。

## 源码摘录：`src/task/read-only-policy.ts:1-28`

```
export const READ_ONLY_TOOL_NAMES: ReadonlySet<string> = new Set([
	"read",
	"wait",
	"grep",
	"glob",
	"find",
	"web_search",
	"ast_grep",
	"yield",
	"ask",
	"todo",
	"recall",
	"reflect",
	"retain",
	"memory_edit",
	"checkpoint",
	"rewind",
]);

export function isReadOnlyAgent(agent: AgentDefinition): boolean {
	return !!agent.tools?.length && agent.tools.every(tool => READ_ONLY_TOOL_NAMES.has(tool));
}
```

16 个只读工具名；`lsp`、`bash`、`eval`、`write`、`edit`、`task` 不在其中，任一出现即判定为非只读。判定结果写入会话契约的 `readOnly` 字段（`executor.ts:5299`）。

## 源码摘录：`src/prompts/system/system-prompt.md:192-195,230`

```
{{#if subagent}}
# 2. Hand-off
- NEVER run builds, tests, linters, formatters or smoke runs unless your assignment says to; the main agent verifies once all subagents land.
- Done → yield, naming the checks to run.
{{else}}
```

```
- NEVER narrate or weigh session limits, token budgets, or effort estimates.
```

子代理专用 `# 2. Hand-off` 禁止在任务未明确要求时运行构建、测试、linter、格式化或冒烟运行，原文为：NEVER run builds, tests, linters, formatters or smoke runs unless your assignment says to; the main agent verifies once all subagents land. `Critical` 段禁止陈述会话限制、token 预算与工作量估计。

## 实测：五个 agent 与 `task` 的生效内置工具（taskDepth 1，本机）

`resolveBuiltinToolPlan(session, toolNames)` 输出，输入为各 agent frontmatter 声明加执行器补齐（`spawns` 注入 `task`、`bash`/`task` 注入 `wait`）：

```
builder => ["read","security_scan","bash","edit","ast_grep","ast_edit","ask","debug","eval","github","glob","grep","find","lsp","context_notes","new_context","wait","web_search","write","memory_edit","retain","recall","reflect","yield"]
frontend => ["read","write","edit","find","grep","glob","ast_grep","lsp","bash","eval","web_search","wait","context_notes","new_context","ast_edit","recall","retain","reflect","memory_edit","yield"]
librarian => ["read","find","grep","glob","web_search","github","context_notes","new_context","ast_grep","recall","retain","reflect","memory_edit","yield"]
oracle => ["read","find","grep","glob","ast_grep","lsp","context_notes","new_context","recall","retain","reflect","memory_edit","yield"]
qa => ["read","write","edit","find","grep","glob","bash","eval","debug","wait","context_notes","new_context","ast_grep","ast_edit","recall","retain","reflect","memory_edit","yield"]
task => ["read","security_scan","bash","edit","ast_grep","ast_edit","ask","debug","eval","github","glob","grep","find","lsp","context_notes","new_context","wait","web_search","write","memory_edit","retain","recall","reflect","yield"]
```

条数：`builder` 24、`frontend` 20、`librarian` 14、`oracle` 13、`qa` 19、`task` 24。`builder` 与 `task` 输出逐项相同。本机 `task.maxRecursionDepth` 为 `1`，一阶子代理在深度 1 达到上限，`canSpawnAtDepth` 使 `task` 不出现在任何子代理的工具面。

## 本机五个 agent 的 frontmatter 现状（2026-11-12 修改后）

```yaml
# builder.md
name: builder
description: 默认工作者，处理不需要更具体角色的中等改动。…
spawns: "*"
model: "@balanced"
thinkingLevel: medium
readSummarize: false
```

```yaml
# frontend.md
name: frontend
tools: read, write, edit, find, grep, glob, ast_grep, lsp, bash, eval, web_search
model: "@designer"
thinkingLevel: high
readSummarize: false
```

```yaml
# qa.md
name: qa
tools: read, write, edit, find, grep, glob, bash, eval, debug
model: "@task"
thinkingLevel: high
readSummarize: false
```

```yaml
# librarian.md
name: librarian
tools: read, find, grep, glob, web_search, github, mcp__context7_resolve_library_id, mcp__context7_query_docs, mcp__deep_wiki_ask_wiki_question, mcp__deep_wiki_read_wiki_structure, mcp__deep_wiki_read_wiki_contents, mcp__grep_app_github_searchgithub, mcp__search_tavily_tavily_search, mcp__search_tavily_tavily_extract
model: "@smol"
thinkingLevel: high
readSummarize: false
```

```yaml
# oracle.md
name: oracle
tools: read, find, grep, glob, ast_grep, lsp
model: "@architect"
thinkingLevel: high
readSummarize: false
```

`builder` 的 `tools` 行已删除（省略即取全部允许项），`spawns: "*"` 使其与内置 `task` 一致。`frontend` 与 `qa` 各自写入显式列表，避免省略 `tools` 却未声明 `spawns` 时空壳 `task` 工具的情形。

## 同步与验证

- 来源 `~/.omp/agent/agents/` 修改后经 `./pull.sh` 单向拉入 `omp/agent/agents/`；`pull: updated=5 would_update=0 unchanged=74 missing=0 protected_slots=40`（`qa` 补 `edit` 后单次为 `updated=1`）。
- `manifest.json` 的 `omp-agent-agents` 条目：`source: ~/.omp/agent/agents`、`repo: omp/agent/agents`、`protected: false`、`directory: true`。
- `./sync.py status` 与 `./sync.py diff` 在 pull 后对五条均为 `unchanged`。
