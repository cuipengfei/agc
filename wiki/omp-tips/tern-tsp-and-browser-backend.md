# Tern：TSP 与 browser 后端

> Sources: oh-my-pi 官方文档与源码，2026-10-10
> Raw: [Tern：TSP 与 browser 后端原文摘录](../../raw/omp-tips/2026-10-10-tern-tsp-and-browser-backend.md)
> Updated: 2026-10-10

tern 在 oh-my-pi 中有两个身份：**Tern Surface Protocol（TSP，TUI 原生渲染协议）**与 **browser 工具后端**。本文按行为层整理：用户感知什么、什么时候发生、有哪些开关。identifier 逐字保留源码/文档原样。

## TSP：TUI 原生渲染协议

TSP 是 omp 的 TUI 原生渲染路径（`docs/tui-core-renderer.md` §5 "Native rendering (Tern Surface Protocol)"）。

**探测与启用**（什么时候发生）：

- `ProcessTerminal` 在 `tsp` DA1 sentinel owner 之后发送 TSP `hello` query（APC `tsp`）。
- 开关 `PI_TUI_NATIVE`：`PI_TUI_NATIVE=0` disables it；multiplexers 和 Bun tests 默认 skip 探针；`PI_TUI_NATIVE=1` forces the probe。
- 首帧等待：The first row paint waits up to 300 ms for the probe。

**启用后用户感知不到的行为**（走哪条渲染路径）：

- A supported-version reply switches `TUI` to `native/backend.ts`。
- components 经 `describe()` 描述（或 `rows` fallback from `render()`），reconciled into document ops（`native/reconcile.ts`），作为 frames 发送，paced by the terminal's acknowledgements instead of the render cadence。
- 该路径上 "None of this document's history, viewport, resize-replay or CPR machinery runs"；SIGWINCH only refreshes the width used by `rows` fallback nodes。
- surface live 期间：nerd symbol preset forced process-locally；icon glyphs sent as `icon` spans。
- theme 下发：每个 surface 在 `o` 之后、first frame 之前收到 omp 的 resolved theme（`t`：every theme token as hex, dark and light variants），resolved palette 变化时重发。

**未确认时的回退**（fallback）：

- Direct Tern sessions optimistically open a surface immediately and fall back to rows if the terminal does not confirm it。

**调试开关**：

- debug socket 的 `doc` op 返回 reference document（every sent frame applied by `native/apply.ts`）；`tsp` 返回 recent frames。

## browser 工具后端（Tern 后端）

Eval `browser` facade 负责 opens, reuses, scripts, and closes named Chromium, Electron, CDP, relay, Tern, or cmux tabs。

**`browser.open` 的后端选择顺序**（优先级从高到低）：

1. 显式指定：`app.cdp_url`、`app.path`、`app.relay: true`、`app.tern: true`（依次优先）。
2. 否则依次考虑：configured relay → configured CDP → automatic Tern → cmux → project-shared managed Chromium。
3. Relay 和 Tern 各有 environment kill switches，可分别禁用这两类模式。

**Tern pane 内画中画浏览器**（用户看到什么）：

- inside a Tern pane, opens a visible browser picture-in-picture over the pane using native **WKWebView, not Chromium**。
- `headed: false` 或 `app.tern: false` opts out；`app.tern: true` requires Tern。
- Automatic Tern selection falls back to Chromium with an explanatory result when Tern cannot host the page。
- `headed` 选项语义：Override `browser.headless` for this open；`headed: false` also opts out of automatic Tern selection。

**能力边界（原生 webview 后端，别当 Chromium 用）**：

- native-webview backends 不提供完整 Puppeteer/CDP capabilities。
- Tern provides fetch/XHR and navigation-response logging, not complete CDP subresource coverage；routing accepts only fetch/XHR resource types。
- 不支持：CPU/network throttling、timezone/headers/reduced-motion emulation、CSS-transformed frame input、tracing/profiling。
- `metrics` returns navigation timing and DOM counts rather than full CDP metrics。
- Tern PDF accepts only `path`；storage loading restores only the current origin。
- Inspect backend-specific errors rather than assuming Chromium behavior。

**自动模式回退判定（源码）**：错误 kind 为 `no_window`、`unsupported`、`connect` 时视为 "this Tern cannot host a browser for omp right now"，自动 Tern 选择回退 Chromium。

## 通信机制：wire.ts 客户端协议

omp 侧客户端在 `packages/coding-agent/src/tools/browser/tern/wire.ts`，对接 Tern session daemon。daemon 侧协议实现在 `crates/tern/src/daemon/json.rs`（**stencil** repository）。

**帧格式与握手**：

- Unix socket，speaking Tern's JSON script protocol；frames of a `u32` LE length then one UTF-8 JSON object。
- 握手：omp greets with `{"hello":{}}` and waits for `{"welcome":{"ops":[…]}}`；`ops` list the request kinds this Tern answers（an older Tern lists none and answers only `browser`）。
- 请求/应答按 `id` 关联：Requests are `{"id":N,KIND:REQUEST}`, answered `{"id":N,KIND:ANSWER}`，ANSWER 为 `{"ok": result}` 或 `{"error": {"kind", "message"}}`。
- 兼容性：Members and message kinds either side does not know are skipped, so the protocol does not tie omp to a Tern build；A Tern from before it cannot read the hello and hangs up。

**两个通道**（`export type TernChannel = "browser" | "fork"`）：

- `browser`：Tern's browser op protocol，REQUEST `{"op": …}`。
- `fork`：REQUEST `{"block":P,"dir":"right"|"down"}` opens `omp --fork` of pane P's session in a new pane beside it；result `{"block":M}`。其中 `block` 是 pane 编号（the pane whose omp session to fork，`TERN_PANE`），`dir` 缺省为 `right`。

**相关常量（源码摘录）**：

```ts
const MAX_FRAME_BYTES = 256 << 20;
const CONNECT_TIMEOUT_MS = 10_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
```

## 命名来历：未证实

oh-my-pi 官方三份来源（`docs/tui-core-renderer.md`、`docs/tools/browser.md`、`wire.ts`）均未解释 "tern" 命名来历或词源，**命名来历未证实**，不做推断。"Tern Surface Protocol" 缩写 TSP 见 `docs/tui-core-renderer.md` §5 小节标题 "Native rendering (Tern Surface Protocol)"。

## See Also

- [OMP 工作模式与 Magic Keywords](../omp-modes/modes-and-magic-keywords.md) — omp 模式与关键词机制总览
