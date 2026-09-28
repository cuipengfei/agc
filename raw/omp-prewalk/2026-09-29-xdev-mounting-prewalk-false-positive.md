# OMP xdev 挂载机制对 Prewalk 的影响与 False Positive 分析

> Source: 本机源码 `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent` v18.4.2（运行 `omp --help` 确认）
> Collected: 2026-09-29
> Published: Unknown

以下为本会话对 prewalk 动作分类器、xdev 挂载机制、MCP 工具统一 tier 以及 `tools.xdev` 配置的源码取证摘录与运行时实测结果。

## 动作分类器（prewalk.ts:36-62）

```typescript
const PREWALK_ACTION_TOOLS: Record<string, true> = {
	edit: true,
	write: true,
};
```

```typescript
function isPrewalkImplementationAction(result: ToolResultMessage): boolean {
	if (!PREWALK_ACTION_TOOLS[result.toolName]) return false;
	const details = result.details;
	// A direct filesystem edit/write carries no `xd://` dispatch metadata.
	if (!details || typeof details !== "object" || !("xdev" in details) || !details.xdev) return true;
	const xdev = details.xdev;
	// Device dispatch: switch only on a genuine mutation tier. An absent tier
	// (help lookup, unresolved approval) declines the switch, matching the
	// reporter's "stay on the large model a couple turns longer" preference.
	if (typeof xdev !== "object" || !("tier" in xdev)) return false;
	return xdev.tier === "write" || xdev.tier === "exec";
}
```

注释（prewalk.ts:42-50）原文：

> Whether a completed tool result is the first workspace-mutating action that
> arms the prewalk hand-off. A direct `edit`/`write` call always counts; a
> `write` that dispatched an `xd://` device (e.g. `lsp`, `ast_edit`, `debug`)
> counts only when the wrapped tool resolved to a `write`/`exec` approval tier.
> Read-only device calls — LSP navigation, `debug` inspection, `ast_edit` on
> internal URLs, help lookups — leave the tier `read` (or absent) and must not
> switch the model mid-investigation (issue #7312).

## MCP 工具统一 tier = write（tool-bridge.ts:641-657）

```typescript
export class MCPTool implements CustomTool<TSchema, MCPToolDetails> {
	readonly name: string;
	readonly legacyName?: string;
	readonly label: string;
	readonly description: string;
	readonly parameters: TSchema;
	readonly mcpToolName: string;
	readonly mcpServerName: string;
	readonly approval = "write" as const;
```

DeferredMCPTool 同样（tool-bridge.ts:760-772）：

```typescript
export class DeferredMCPTool implements CustomTool<TSchema, MCPToolDetails> {
	readonly name: string;
	readonly legacyName?: string;
	readonly label: string;
	readonly description: string;
	readonly parameters: TSchema;
	readonly mcpToolName: string;
	readonly mcpServerName: string;
	readonly approval = "write" as const;
```

## bash approval 中 allow 规则返回 tier = write（bash.ts:511-594）

```typescript
readonly approval = (args: unknown): ToolApprovalDecision => {
	const rawCommand = (args as Partial<BashToolInput>).command;
	const command = typeof rawCommand === "string" ? rawCommand : "";
	const patternRules = getBashApprovalPatternRules(cfgBashPatterns.get(this.session.settings));
	const shell = cfgBashAllowCompoundCommands.get(this.session.settings)
		? this.session.settings.getShellConfig().shell
		: undefined;
	const compoundSegments = shell && isPosixShell(shell) ? extractLiteralAndChainSegments(command) : null;
	// ...
	};
```

关键返回值：

- bash.ts:540-547: deny 规则 → tier `exec` + deny policy
- bash.ts:549-551: 非复合命令命中 critical pattern → tier `exec`
- bash.ts:558-564: 复合命令段命中 deny → tier `exec` + deny
- bash.ts:568-575: 复合命令段命中 prompt → tier `exec` + prompt
- bash.ts:579-580: 复合命令段命中 critical → tier `exec`
- bash.ts:583: 复合命令有未匹配段 → tier `exec`；全部段命中 allow → `{ tier: "write", policy: "allow" }`
- bash.ts:585: 非复合命令命中 allow 规则 → `{ tier: "write", policy: "allow" }`
- bash.ts:586-592: 非复合命令命中 prompt → tier `exec` + prompt
- bash.ts:594: 以上都不匹配 → `exec`

## xdev 挂载判定（xdev.ts:52-82）

```typescript
export const XDEV_KEEP_TOP_LEVEL: Record<string, true> = {
	todo: true,
	yield: true,
	ask: true,
	grep: true,
	web_search: true,
};

export const XDEV_TRANSPORT_TOOLS: Record<string, true> = { read: true, write: true };

export function isMountableUnderXdev(tool: { name: string; loadMode?: ToolLoadMode }): boolean {
	if (tool.name in XDEV_TRANSPORT_TOOLS || tool.name in XDEV_KEEP_TOP_LEVEL) return false;
	return tool.loadMode === "discoverable";
}
```

## essential 工具清单（essential-tools.ts:23-47）

```typescript
export const ESSENTIAL_BUILTIN_TOOL_NAMES: Record<string, true> = {
	read: true,
	write: true,
	bash: true,
	edit: true,
	glob: true,
	find: true,
	eval: true,
	task: true,
	wait: true,
	learn: true,
	manage_skill: true,
	context_notes: true,
	new_context: true,
};

export function defaultLoadModeForToolName(name: string, declared?: ToolLoadMode): ToolLoadMode {
	if (declared) return declared;
	return name in ESSENTIAL_BUILTIN_TOOL_NAMES ? "essential" : "discoverable";
}
```

## discoverable builtin 工具声明

以下工具声明 `loadMode = "discoverable"`（grep 结果）：

| 工具 | 声明位置 | XDEV_KEEP_TOP_LEVEL 例外 |
|---|---|---|
| ask | ask.ts:570 | 是（强制顶层） |
| ast_edit | ast-edit.ts:234 | 否（挂载） |
| ast_grep | ast-grep.ts:172 | 否（挂载） |
| checkpoint | checkpoint.ts:61 | 否（挂载） |
| rewind | checkpoint.ts:97 | 否（挂载） |
| debug | debug.ts:580 | 否（挂载） |
| github | gh.ts:144 | 否（挂载） |
| ida | ida.ts:102 | 否（挂载） |
| lsp | lsp/tool.ts:187 | 否（挂载） |
| memory_edit | memory-edit.ts:31 | 否（挂载） |
| recall | memory-recall.ts:29 | 否（挂载） |
| reflect | memory-reflect.ts:30 | 否（挂载） |
| retain | memory-retain.ts:52 | 否（挂载） |
| security_scan | security-scan.ts:111 | 否（挂载） |
| todo | todo.ts:725 | 是（强制顶层） |
| web_search | web/search/index.ts:334 | 是（强制顶层） |
| grep | grep.ts:353 | 是（强制顶层） |

## syncXdevState（sdk.ts:3474-3486）

```typescript
const syncXdevState = (): void => {
    const wanted =
        !restrictToolNames &&
        cfgToolsXdev.get(settings) &&
        toolRegistry.has("write") &&
        builtInRegistryToolNames.has("write");
    if (wanted === (toolSession.xdev !== undefined)) return;
    if (wanted) {
        toolSession.xdev = createXdevState(toolSession, toolRegistry, builtInRegistryToolNames);
        return;
    }
    toolSession.xdev?.mountedNames.clear();
    toolSession.xdev = undefined;
};
```

## 分区循环（sdk.ts:4001-4013）

```typescript
if (toolSession.xdev) {
    const topLevelToolNames: string[] = [];
    const mountedNames: string[] = [];
    for (const name of initialToolNames) {
        const tool = toolRegistry.get(name);
        const explicitlyRequested = explicitlyRequestedToolNameSet?.has(name) === true;
        if (tool && xdevReadAvailable && xdevWriteAvailable && !explicitlyRequested && isMountableUnderXdev(tool))
            mountedNames.push(name);
        else topLevelToolNames.push(name);
    }
    toolSession.xdev.mountedNames.clear();
    for (const name of mountedNames) toolSession.xdev.mountedNames.add(name);
    initialToolNames = topLevelToolNames;
```

## 特殊设备不依赖 session.xdev（xd-protocol.ts:84-123）

write 路径（xd-protocol.ts:84-91）：

```typescript
const { name } = target;
if (name === REPORT_ISSUE_DEVICE_NAME) {
    const { result, xdev } = await dispatchReportIssueDevice(session, content);
    return { content: result.content, details: { xdev }, isError: result.isError, useless: result.useless };
}
if (name && isResolutionDeviceName(name)) {
    const { result, xdev } = await dispatchResolutionDevice(session, name, content);
    return { content: result.content, details: { xdev }, isError: result.isError, useless: result.useless };
}
const xdev = session.xdev;
if (!xdev) throw new ToolError(NOT_MOUNTED);
```

read 路径（xd-protocol.ts:118-123）：

```typescript
#usage(session: ToolSession, name: string | null): string {
    if (name === REPORT_ISSUE_DEVICE_NAME) return reportIssueDeviceUsage();
    if (name && isResolutionDeviceName(name)) return resolutionDeviceUsage(name);
    const xdev = session.xdev;
    if (!xdev) throw new ToolError(NOT_MOUNTED);
    return name === null ? xdevListing(xdev) : xdevDocs(xdev, name);
}
```

特殊设备名（resolve.ts:15-24）：

```typescript
export const RESOLVE_DEVICE_NAME = "resolve";
export const REJECT_DEVICE_NAME = "reject";
export const PROPOSE_DEVICE_NAME = "propose";

export function isResolutionDeviceName(name: string): name is ResolutionDeviceName {
    return name === RESOLVE_DEVICE_NAME || name === REJECT_DEVICE_NAME || name === PROPOSE_DEVICE_NAME;
}
```

## xdev 配置项（settings.ts:866-913）

```typescript
export const cfgToolsXdev = register({
    id: "tools.xdev",
    type: "boolean",
    default: true,
    ui: {
        tab: "tools",
        group: "Discovery & MCP",
        label: "xd:// Tools",
        description:
            "Mount rarely-used (discoverable) tools under xd:// device URLs driven via read/write instead of shipping their schemas on every request. Sessions whose explicit tool list grants read but omits write mount devices through a device-only write transport (filesystem writes stay rejected). Disable to expose every enabled tool top-level.",
    },
});

export const cfgToolsXdevDocs = register({
    id: "tools.xdevDocs",
    type: "enum",
    values: ["inline", "builtins", "catalog"] as const,
    default: "catalog",
    // ...
});

export const cfgToolsXdevInlineDevices = register({
    id: "tools.xdevInlineDevices",
    type: "array",
    default: EMPTY_STRING_ARRAY,
    // ...
});
```

## 运行时实测

### xdev 启用时（配置变更前）

`write xd://?` 返回 43 个挂载设备：

```
xd://security_scan  Run OMP-native scans and explicit Codex Security cloud operations
xd://ast_grep       Search code with AST patterns (structural grep)
xd://ast_edit       Perform AST-aware code edits (structural refactoring)
xd://debug          Debug a running process with DAP (debugger adapter protocol)
xd://github         Interact with GitHub repositories, files, pull requests, and Actions
xd://lsp            Query LSP (language server) for diagnostics, hover info, and references
xd://mcp__codegraph_explore  ...
xd://mcp__context7_query_docs  ...
（共 43 个，含 33 个 MCP 工具和 10 个 discoverable builtin）
```

### xdev 关闭后（配置变更后）

`read xd://` 返回："xd:// is not mounted in this session."

### 配置改动

`~/.omp/agent/config.yml:118` 从 `xdev: true` 改为 `xdev: false`。

## 证据边界声明

- schema token 增加对计费的影响涉及 prefix cache，本会话未实测实际 cache 命中率和 token 数量。缓存是否命中取决于 provider 支持和请求前缀是否满足缓存条件，本机是否命中及实际节省均未验证。缓存不减少上下文 token 占用。
- `tools.xdev: false` 后 `xdevDocs`/`xdevInlineDevices` 对运行时动态新增工具的呈现是否有完全无影响，未确认。常规启动时不影响；动态路径未检查。
- 本地源码的 Published 日期未查证。
