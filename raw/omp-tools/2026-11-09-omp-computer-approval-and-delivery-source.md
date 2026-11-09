# OMP computer 的批准解析、投递模式与能力字段摘录

> Source: https://github.com/can1357/oh-my-pi，commit 38be738；packages/coding-agent/src/tools/settings.ts、packages/coding-agent/src/tools/approval.ts、packages/coding-agent/src/tools/computer/supervisor.ts、packages/coding-agent/src/prompts/tools/computer.md、crates/pi-natives/src/desktop/backend.rs、crates/pi-natives/src/desktop/types.rs、crates/pi-natives/src/desktop/ax.rs；另引 OMP 打包文档 `omp://computer-use.md` 与 `omp://tools/computer.md`
> Collected: 2026-11-09
> Published: Unknown

## 批准

`packages/coding-agent/src/tools/settings.ts:308-318`：

```ts
// Default tool approval mode (interaction tab, but governs the tool wrapper).
//   "always-ask"        — auto-approves read-tier tools only; prompts for write/exec.
//   "always-ask-cached" — like always-ask, but file reads and writes can be approved
//                         for a file or folder, this session or across sessions.
//   "write"             — auto-approves read and write-tier tools; prompts for exec.
//   "yolo"              — auto-approves every tier.
export const cfgToolsApprovalMode = register({
	id: "tools.approvalMode",
	type: "enum",
	values: ["always-ask", "always-ask-cached", "write", "yolo"] as const,
	default: "yolo",
```

`packages/coding-agent/src/tools/settings.ts:303-305`（逐工具策略）：

```ts
		description:
			"Per-tool approval policies. Set to 'allow' to auto-approve, 'prompt' to require confirmation, or 'deny' to block. Overrides are honored in every approval mode.",
```

`packages/coding-agent/src/tools/approval.ts:86-89`：

```
 * Missing context (or context with no settings and no `--auto-approve`) is
 * fail-closed: `always-ask` with an empty policy map — no user grant. When
 * settings are present, the configured `tools.approvalMode` is used (schema
 * default remains `yolo`). `--auto-approve` still forces `yolo`.
```

`packages/coding-agent/src/tools/approval.ts:97-112`：

```ts
export function resolveApprovalFromContext(context?: ApprovalContextSource | null): ResolvedExecuteTimeApproval {
	if (context?.autoApprove === true) {
		return {
			approvalMode: "yolo",
			userPolicies: context.settings ? asPolicyMap(cfgToolsApproval.get(context.settings)) : {},
		};
	}
	const settings = context?.settings;
	if (!settings) {
		return { approvalMode: "always-ask", userPolicies: {} };
	}
	const configured: unknown = cfgToolsApprovalMode.get(settings);
	return {
		approvalMode: isApprovalMode(configured) ? configured : "yolo",
		userPolicies: asPolicyMap(cfgToolsApproval.get(settings)),
	};
}
```

`packages/coding-agent/src/tools/computer/supervisor.ts:41-47`：

```ts
/**
 * The user's `tools.approval["computer.control"]` policy. The approval mode never decides it: the default `yolo`
 * would hand the user's foreground to every headless run, so without an explicit entry the user is asked.
 */
function controlPolicy(context: ApprovalContextSource): ApprovalPolicy {
```

`packages/coding-agent/src/tools/computer/supervisor.ts:39`：

```ts
const RESTART_MESSAGE = "computer worker restarted; captures and ax refs were reset";
```

## 投递模式

`crates/pi-natives/src/desktop/backend.rs:42-53`：

```rust
/// How window-targeted input reaches its target.
///
/// `Background` avoids deliberate activation and physical pointer movement;
/// unsupported routes refuse, and detected focus side effects surface as
/// potentially delivered input. `Foreground` is the explicit `takeover: true`
/// escalation: it activates the target and restores state where the OS allows,
/// without overwriting a newer user focus choice. `ForegroundReturnFocus`
/// (`takeover` with `returnFocus`) is the host's own rerun of a refused
/// background action: it hands focus back to the user's app even after the user
/// clicked or pressed a shortcut meanwhile, and leaves it only on a third app
/// the user switched to. Backends that cannot tell the two apart treat it as
/// `Foreground`.
```

## 能力字段

`crates/pi-natives/src/desktop/types.rs:73-103` 的 `DesktopCapabilities` 字段：`backend`、`display_server`、`capture`、`input`、`ax`、`background_window_input`、`takeover`、`applications`、`menus`、`held_input`、`spaces`、`global_escape`、`capture_permission`、`input_permission`、`ax_permission`、`display_count`、`screen_locked`、`display_asleep`。

## 引用寿命

`crates/pi-natives/src/desktop/ax.rs:204-206`：

```rust
	/// Ends `target`'s snapshot `generation` once it has registered its
	/// elements: refs that neither it nor the previous snapshot registered
	/// expire, so an element missing from a single snapshot keeps its ref.
```

## 上限与时长

`packages/coding-agent/src/prompts/tools/computer.md:16`：

> `holdKeys(keys, {duration, takeover?})` and `holdMouse(x, y, {button?, duration, keys?, takeover?})` hold input for 0–100 seconds and release it on every exit.

`omp://tools/computer.md`（打包文档）：

> `win.ax({ all?, maxDepth? })` returns a textual tree with `[ref=eN]` references; default depth is 24 and native snapshots visit at most 800 nodes.

> `win.find({ role?, title?, value?, limit? })` matches case-insensitive substrings and returns an array of up to `limit` elements (default 100, maximum 5000), from a walk bounded to 5000 nodes and depth 64.

> For transports that do not preserve original image detail, and as a Claude-family compatibility fallback, the effective capture caps are `1280×896`.

`omp://computer-use.md`（打包文档）：

> `computer.maxWidth` | `3840` | Maximum screenshot width.
>
> `computer.maxHeight` | `2400` | Maximum screenshot height.

## 平台（`omp://computer-use.md`）

> macOS x64/arm64 | ScreenCaptureKit in a persistent native event-loop worker on macOS 14+, in-process CoreGraphics on macOS 12/13, plus native AX and input.

> Linux Wayland x64/arm64 | RemoteDesktop portal or `LIBEI_SOCKET` input and AT-SPI accessibility. ScreenCast portal/PipeWire capture ships only in builds compiled with the `wayland-pipewire` Cargo feature; released binaries omit it, so `capabilities()` reports `capture: false` there.

> Linux X11 x64/arm64 | X11 capture/input and AT-SPI accessibility. Requires a readable display plus RandR/XTEST.

> Windows x64/arm64 | Native display/window capture, Win32 input, and UI Automation accessibility.

## 后台回退（`omp://computer-use.md`）

> `computer.backgroundFallback` | `takeover` | What a window input call does when its background route is unavailable: `takeover` reruns that one call in takeover and returns focus to the user's app; `refuse` fails it with `BackgroundUnavailable`, takes nothing over, and also refuses the model's own foreground requests and, on macOS, its calls that open a menu.

## 密码回读（`crates/pi-natives/src/desktop/ax.rs:1168-1170`）

```rust
/// the field and stores none of it). The error names what the field reads so
/// the next step needs no extra read, except in a secure field, whose text
/// never enters an error.
```

## 接口（`omp://tools/computer.md`、`omp://computer-use.md`）

> The prelude is available only through enabled Eval runtimes; it is not an AgentTool.

> `computer.run(fnOrCode, { args?, read_only?, timeout? })` runs a function or JavaScript string inside the same session.

> Provider delivery uses ordinary text/image content with image detail `original`; it does not use provider Files or native `computer_call_output` metadata.

## 像素路径（`omp://computer-use.md`）

> Prefer AX when semantic controls are exposed; use window screenshots and pixel input for canvases, mirrored devices, or custom-drawn controls.

> Pixel coordinates always belong to the most recent full screenshot of the same target.
