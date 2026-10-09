# Tern：Tern Surface Protocol（TSP）与 browser 工具后端 原文摘录

> Source: oh-my-pi 官方文档 + wire.ts 源码（`can1357/oh-my-pi` GitHub 仓库：`docs/tui-core-renderer.md`、`docs/tools/browser.md`、`packages/coding-agent/src/tools/browser/tern/wire.ts`）
> Collected: 2026-10-10
> Published: Unknown

tern 在本仓库有两个身份：Tern Surface Protocol（TSP，TUI 原生渲染协议）与 browser 工具后端。以下为官方文档/源码原文摘录，未改写、未评价；constant 名（`PI_TUI_NATIVE`、`TERN_PANE` 等）逐字保留。

注：以下三份来源均未解释 "tern" 命名来历，**命名来历未证实**，不做推断。

## 一、TSP（Native rendering / Tern Surface Protocol）

`docs/tui-core-renderer.md` §5 "Native rendering (Tern Surface Protocol)" 小节原文：

> `ProcessTerminal` also sends the TSP `hello` query (APC `tsp`) behind a `tsp` DA1 sentinel owner. `PI_TUI_NATIVE=0` disables it; multiplexers and Bun tests skip it by default, while `PI_TUI_NATIVE=1` forces the probe. A supported-version reply switches `TUI` to `native/backend.ts`: components are described (`describe()`, or `rows` fallback from `render()`), reconciled into document ops (`native/reconcile.ts`) and sent as frames, paced by the terminal's acknowledgements instead of the render cadence. None of this document's history, viewport, resize-replay or CPR machinery runs on that path; SIGWINCH only refreshes the width used by `rows` fallback nodes. While a surface is live the nerd symbol preset is forced process-locally, and icon glyphs are sent as `icon` spans. Each surface receives omp's resolved theme (`t`: every theme token as hex, dark and light variants) after `o` and before its first frame, and again when the resolved palette changes. The first row paint waits up to 300 ms for the probe. Direct Tern sessions optimistically open a surface immediately and fall back to rows if the terminal does not confirm it. The debug socket's `doc` op returns the reference document (every sent frame applied by `native/apply.ts`), and `tsp` returns recent frames.

要点拆分（均为原文措辞）：

- 探针：`ProcessTerminal` 在 `tsp` DA1 sentinel owner 之后发送 TSP `hello` query（APC `tsp`）。
- `PI_TUI_NATIVE` 开关：
  - `PI_TUI_NATIVE=0` disables it（默认发送探针；multiplexers 和 Bun tests 默认 skip，`PI_TUI_NATIVE=1` forces the probe）。
- 检测到支持版本后的行为：reply switches `TUI` to `native/backend.ts`；components 经 `describe()` 描述（或 `rows` fallback from `render()`），reconciled into document ops（`native/reconcile.ts`），作为 frames 发送，paced by the terminal's acknowledgements instead of the render cadence。
- 该路径上 "None of this document's history, viewport, resize-replay or CPR machinery runs"；SIGWINCH only refreshes the width used by `rows` fallback nodes。
- surface live 期间：nerd symbol preset forced process-locally；icon glyphs sent as `icon` spans；theme（`t`：every theme token as hex, dark and light variants）在 `o` 之后、first frame 之前发送，palette 变化时重发。
- 首帧等待：The first row paint waits up to 300 ms for the probe.
- 终端未确认时的回退：Direct Tern sessions optimistically open a surface immediately and fall back to rows if the terminal does not confirm it.
- 调试：debug socket 的 `doc` op 返回 reference document（every sent frame applied by `native/apply.ts`）；`tsp` 返回 recent frames。

## 二、browser 工具后端（Tern 后端）

`docs/tools/browser.md` 开头原文：

> The Eval `browser` facade opens, reuses, scripts, and closes named Chromium, Electron, CDP, relay, Tern, or cmux tabs.

### browser.open 的后端选择顺序

`docs/tools/browser.md` "Browser modes" 小节原文：

> `browser.open` prefers explicit `app.cdp_url`, `app.path`, `app.relay: true`, then `app.tern: true`. Otherwise it considers configured relay, configured CDP, automatic Tern, cmux, then project-shared managed Chromium. Relay and Tern environment kill switches can disable those modes.

### Tern 后端：Tern pane 内画中画浏览器

`docs/tools/browser.md` "Browser modes" 小节 Tern 条目原文：

> **Tern:** inside a Tern pane, opens a visible browser picture-in-picture over the pane using native WKWebView, not Chromium. `headed: false` or `app.tern: false` opts out; `app.tern: true` requires Tern. Automatic Tern selection falls back to Chromium with an explanatory result when Tern cannot host the page.

`headed` 选项的 open options 表原文：

> `headed` — Override `browser.headless` for this open. `headed: false` also opts out of automatic Tern selection.

### 能力边界（原生 webview 后端）

`docs/tools/browser.md` "Browser modes" 小节原文：

> The native-webview backends do not provide full Puppeteer/CDP capabilities. Tern provides fetch/XHR and navigation-response logging, not complete CDP subresource coverage; routing accepts only fetch/XHR resource types. CPU/network throttling, timezone/headers/reduced-motion emulation, CSS-transformed frame input, and tracing/profiling are unsupported; `metrics` returns navigation timing and DOM counts rather than full CDP metrics. Tern PDF accepts only `path`; storage loading restores only the current origin. Inspect backend-specific errors rather than assuming Chromium behavior.

## 三、wire.ts：Tern session daemon 客户端协议

`packages/coding-agent/src/tools/browser/tern/wire.ts` 头部注释原文：

> Client for the Tern session daemon: a Unix socket speaking Tern's JSON script protocol (`crates/tern/src/daemon/json.rs` in the stencil repository), frames of a `u32` LE length then one UTF-8 JSON object. omp greets with `{"hello":{}}` and waits for `{"welcome":{"ops":[…]}}`, whose `ops` list the request kinds this Tern answers (an older Tern lists none and answers only `browser`). Requests are `{"id":N,KIND:REQUEST}`, answered `{"id":N,KIND:ANSWER}` correlated by `id`, where ANSWER is `{"ok": result}` or `{"error": {"kind", "message"}}`:
> - `browser`: Tern's browser op protocol, REQUEST `{"op": …}`.
> - `fork`: REQUEST `{"block":P,"dir":"right"|"down"}` opens `omp --fork` of pane P's session in a new pane beside it; result `{"block":M}`.
>
> Members and message kinds either side does not know are skipped, so the protocol does not tie omp to a Tern build. A Tern from before it cannot read the hello and hangs up.

相关常量与接口（源码摘录）：

```ts
const MAX_FRAME_BYTES = 256 << 20;
const CONNECT_TIMEOUT_MS = 10_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
```

```ts
/** Request kinds whose answers the client correlates by id. */
export type TernChannel = "browser" | "fork";
```

```ts
/** A `fork` request: open `omp --fork` of pane `block`'s session in a new pane beside it. */
export interface TernForkRequest {
	/** The pane whose omp session to fork (`TERN_PANE`). */
	block: number;
	/** Where the new pane goes (Tern's default: `right`). */
	dir?: "right" | "down";
}
```

自动模式回退判定（源码摘录）：

```ts
/** Error kinds meaning "this Tern cannot host a browser for omp right now". */
const UNAVAILABLE_KINDS: Partial<Record<TernErrorKind, true>> = {
	no_window: true,
	unsupported: true,
	connect: true,
};
```

## 附注

- wire.ts 头部注释指向 daemon 协议实现位置：`crates/tern/src/daemon/json.rs` in the **stencil** repository（tern 的 daemon 侧在 stencil 仓库）。
- "Tern Surface Protocol" 缩写 TSP 见 `docs/tui-core-renderer.md` §5 小节标题 "Native rendering (Tern Surface Protocol)"。
- 官方三份来源均未记载 "tern" 命名来历或词源，**命名来历未证实**。
