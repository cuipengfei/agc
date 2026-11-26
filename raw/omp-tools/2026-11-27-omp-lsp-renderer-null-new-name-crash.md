# OMP LSP 工具卡片的 null 参数崩溃：日志、源码与会话取证

> Source: 本机日志 `~/.omp/logs/omp.2026-11-27.2713272.log`；打包文件 `dist/cli.js` 偏移取证；随包 `src/` 摘录；崩溃会话 JSONL 摘录；`can1357/oh-my-pi#20663`、`#20664` 及已发布评论两条
> Collected: 2026-11-27
> Published: Unknown

## 1. 本机版本

```text
$ omp --version
omp/19.2.1
```

## 2. 崩溃日志

`~/.omp/logs/omp.2026-11-27.2713272.log` 第 47 行，绝对路径已归一为 `~/`：

```json
{"timestamp":"2026-11-27T00:11:47.328+08:00","level":"error","pid":2713272,"message":"Uncaught exception","sessionId":"01a2183c-6bcc-7594-8603-961b1c853e37","err":{"name":"TypeError","message":"null is not an object (evaluating 'e.includes')","stack":"TypeError: null is not an object (evaluating 'e.includes')\n    at Je (~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js:290:34096)\n    at MYd (~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js:21924:818)\n    at YVs (~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js:21907:806)\n    at G4d (~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js:21907:219)\n    at #o (~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js:2362:6928)\n    at refresh (~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js:2362:6817)\n    at read (~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js:2362:6613)\n    at kqd (~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js:21802:22982)\n    at #o (~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js:2362:6928)\n    at refresh (~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js:2362:6817)"}}
```

第 48 行，`sessionFile` 已替换为占位符：

```json
{"timestamp":"2026-11-27T00:11:47.371+08:00","level":"warn","pid":2713272,"message":"Session exit recorded","sessionId":"01a2183c-6bcc-7594-8603-961b1c853e37","sessionFile":"<session-file>","reason":"uncaught_exception","kind":"fatal","pendingToolCalls":0}
```

## 3. 偏移映射到打包函数

读取 `dist/cli.js` 对应行列附近的字符片段：

```text
290 34096 ...function Je(e){return e.includes("\t")?e.replaceAll("\t",E$l):e}function Ve(e,t){if(t<=0)return[];...

21924 818 ...g("accent","LSP")}: ${o.fg("muted",Je(r.description??""))}`;if(r.newName!==void 0)a+=` ${o.fg("dim",`new:${Je(r.newName)}`)}`;...
```

即 `Je` 是 `replaceTabs`，`21924:818` 是 LSP 卡片的 head 拼接处，先判 `r.newName !== void 0` 再调用 `Je(r.newName)`。

## 4. 随包源码

`src/lsp/types.ts` 的工具 schema：

```ts
export const lspSchema = type({
	action:
		"'diagnostics' | 'definition' | 'references' | 'hover' | 'symbols' | 'rename' | 'rename_file' | 'code_actions' | 'type_definition' | 'implementation' | 'status' | 'reload' | 'capabilities' | 'request'",
	file: "string?",
	line: "number?",
	symbol: "string?",
	query: "string?",
	new_name: "string?",
	apply: "boolean?",
	"timeout?": type.number
		.atLeast(TOOL_TIMEOUTS.lsp.min)
		.atMost(TOOL_TIMEOUTS.lsp.max)
		.describe("Timeout in seconds; raises or lowers the default (range 5–300)."),
	payload: "string?",
});
```

`src/ui/tools/lsp.tsx` 的 presenter 参数与转发：

```ts
export interface LspArgs {
	readonly action?: string;
	readonly file?: string;
	readonly line?: number;
	readonly symbol?: string;
	readonly new_name?: string;
}
```

```ts
function callMeta(args: LspArgs | undefined): TspText[] {
	if (!args?.symbol) return [];
	return [args.new_name !== undefined ? `${args.symbol} · → ${args.new_name}` : args.symbol];
}

function lspTerm(args: LspArgs | undefined, extra?: Partial<LspTerm>): LspTerm {
	const action = args?.action || "lsp";
	const location = args?.file ? ` ${args.file}${args.line !== undefined ? `:${args.line}` : ""}` : "";
	const symbol = args?.symbol && args.new_name === undefined ? ` (${args.symbol})` : "";
	return {
		look: "lsp",
		description: `${action}${location}${symbol}`,
		newName: args?.new_name,
		...extra,
	};
}
```

`src/ui/styles/tools/lsp.ts` 第 71–72 行：

```ts
	let head = `${glyph} ${theme.fg("accent", "LSP")}: ${theme.fg("muted", replaceTabs(term.description ?? ""))}`;
	if (term.newName !== undefined) head += ` ${theme.fg("dim", `new:${replaceTabs(term.newName)}`)}`;
```

`@oh-my-pi/pi-tui` 的 `src/text/width.ts`：

```ts
/** Tabs replaced by `TAB_WIDTH` spaces (terminal rows never carry raw tabs). */
export function replaceTabs(text: string): string {
	return text.includes("\t") ? text.replaceAll("\t", TAB_SPACES) : text;
}
```

## 5. 崩溃会话里的那次调用

会话 JSONL 中 `2026-11-26T16:11:47.442Z` 的 `lsp` 调用，私有仓库路径、符号与意图文本已替换为占位符：

```json
{"timestamp":"2026-11-26T16:11:47.442Z","calls":[{"name":"lsp","arguments":{"i":"<intent>","action":"references","file":"<private-repo-path>","line":48,"symbol":"<symbol>","query":null,"new_name":null,"apply":false,"timeout":20,"payload":null}}]}
```

## 6. 注册门与卡片选择

`src/tools/index.ts` 第 811 行：

```ts
		if (name === "lsp") return enableLsp && cfgLspEnabled.get(session.settings);
```

`src/lsp/tool.ts` 第 337 行：

```ts
	static createIf(session: ToolSession): LspTool | null {
		return session.enableLsp === false ? null : new LspTool(session);
	}
```

`src/session/session-tools.ts` 第 997 行：

```ts
	hasBuiltInTool(name: string): boolean {
		const tool = resolveToolWireName(this.#toolRegistry, name);
		return tool !== undefined && this.#builtInToolNames.has(tool.name);
	}
```

`src/modes/interactive/transcript.tsx` 的卡片 presenter 选择：

```ts
	#presentCard(spec: ToolCallSpec, builtIn: boolean, before: TranscriptBlock | undefined): PendingTool {
		const { display } = this.#host;
		const renderer = builtIn ? undefined : legacyRenderer(spec.tool);
		// A same-named tool that is not the built-in (an extension's) without hooks draws the
		// generic card, never the built-in's presenter.
		const registered = toolPresenter(spec.name);
		const presenter = renderer
			? legacyPresenter(renderer, registered ?? defaultPresenter)
			: !builtIn && registered
				? defaultPresenter
				: undefined;
```

## 7. 配置动作与回读

`~/.omp/agent/config.yml` 的 `lsp` 段在改动后为：

```yaml
lsp:
  enabled: false
  lazy: true
  shared: true
  formatOnWrite: false
  diagnosticsOnWrite: true
  diagnosticsOnEdit: true
  diagnosticsDeduplicate: true
```

```text
$ omp config get lsp.enabled
false
```

## 8. 上游状态

`can1357/oh-my-pi#20663`：

- 标题：`Crash: TypeError: null is not an object (evaluating 'e.includes') in LSP tool renderer when new_name is null`
- 状态：OPEN；标签 `bug`、`tui`、`prio:p1`、`tool`、`triaged`
- 创建时间：`2026-11-26T14:21:32Z`

`can1357/oh-my-pi#20664`：

- 标题：`fix(coding-agent): treated null lsp optional args as omitted in renderer`
- 状态：OPEN；base `main`；head `farm/28e4a3d4/fix-lsp-render-null-new-name`；merge state `DIRTY`
- 创建时间：`2026-11-26T14:28:06Z`
- 内容：`LspArgs` 把 `new_name` 与 `line` 放宽为可为 `null`，`lspTerm` 把 null 的 `new_name` 转为 `undefined`，`callMeta` 改判 `!= null`，新增 `fileLine` 辅助；回归测试在 `packages/coding-agent/test/ui/tools/lsp.test.ts`，断言 `line: null, new_name: null` 与省略两者绘制结果相同；正文写明 `Fixes #20663`

已发布评论：

- `https://github.com/can1357/oh-my-pi/issues/20663#issuecomment-7197628334`
- `https://github.com/can1357/oh-my-pi/pull/20664#issuecomment-7197628191`

两条评论只写版本、平台、崩溃栈归属与 `lsp.enabled: false` 可规避，未带 provider 名、模型名与本机私有路径。

## 9. 证据边界

- 一手直读：日志两行、`dist/cli.js` 片段、随包 `src/` 五处摘录、会话 JSONL 调用、`omp config get lsp.enabled` 输出、上游 issue 与 PR 文本
- 推断：恢复历史会话时，同一张 `lsp` 卡片会落到通用 presenter，不再经过崩溃的绘制函数。依据是 `transcript.tsx` 的 `#presentCard` 在 `!builtIn && registered` 分支使用 `defaultPresenter`。本轮未实际 resume 复现。
- 未核实：崩溃会话中该调用是否已产生工具结果；`20` 秒超时是否参与触发
