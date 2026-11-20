# OMP 自有浏览器后端对照：WebKit 与 Chromium 的源码摘录

> Source: 本机安装包 `@oh-my-pi/pi-coding-agent` 19.0.1 的 `src/prompts/tools/browser.md`、`src/tools/browser/tern/tern-tab.ts`、`src/tools/browser/webkit/kind.ts`、`src/tools/browser/settings.ts`；ABKit 平台能力转引自 `raw/agent-tooling/2026-11-12-abkit-readme-docs-and-builds.md`；2026-11-20
> Collected: 2026-11-20
> Published: Unknown

## WebKit 后端的定位与优势（`src/prompts/tools/browser.md`）

```text
WebKit (open result: `omp's headless WebKit browser`, or `omp's WebKit browser (in a window)` when shown):

- Off screen unless shown (there the user can click and type too); the page always sees a visible, focused window and no automation flag.
- `target` names nothing there. Engine cannot start → Chromium.
- `app: "chromium"`: managed Chromium for this open.
- `app: "webkit"`: require WebKit, downloading a missing engine; fails when that download fails and, with `headed: true`, where it ships no viewer.
- Has WebGL, WebGPU, silent video and audio playback (no sound leaves the machine), Web Audio, WebRTC; camera and microphone requests are denied.
- A page misbehaves (DRM-protected video, speech synthesis)? Reopen it with `app: "chromium"`.
- The page cannot tell it is driven:
  `observe`, selectors, input, `console`, `errors`, `requests`, HAR and network-idle waits come from the engine, not from script in the page.
```

可见窗口的平台限定：

```text
- `headed`: visible or hidden tab per open.
  - A WebKit tab gets its own window where the engine ships a viewer (macOS), and an open of a live WebKit tab shows or hides it at once.
  - Elsewhere a visible browser is Chromium.
```

## 两侧共同的指纹限制（同一文件）

```text
- These do put detectable code in the page's world; AVOID them on a site that fingerprints:
  - `route` (wraps `fetch`/`XMLHttpRequest`/`console`; gone from new documents after the last `unroute`)
  - `emulate` with `geolocation`, `locale` or `offline` (until cleared)
  - `vitals` and `reactEnable` (for the tab's life)
  - `init_scripts`
  - a recording's cursor overlay
  - whatever `evaluate` code leaves behind
```

## 引擎提供的读取与输入（同一文件）

```text
- The page cannot tell it is driven:
  `observe`, selectors, input, `console`, `errors`, `requests`, HAR and network-idle waits come from the engine, not from script in the page.
```

## WebKit 后端不支持的能力（`src/tools/browser/tern/tern-tab.ts`）

```text
			throw this.#unsupported("emulate", "the web view has no mobile or touch viewport emulation");
			throw this.#unsupported("emulate", "the CSS media type cannot be overridden in the web view");
			throw this.#unsupported("emulate", "CPU throttling needs the Chromium DevTools protocol");
			throw this.#unsupported("webmcpList", noWebMcp(this.product));
			throw this.#unsupported("webmcpInvoke", noWebMcp(this.product));
			throw this.#unsupported("webmcpEvents", noWebMcp(this.product));
			throw this.#unsupported("traceStart", "the web view exposes no performance-trace protocol");
			throw this.#unsupported("traceStop", "the web view exposes no performance-trace protocol");
			throw this.#unsupported("profileStart", "the web view exposes no CPU-profiler protocol");
			throw this.#unsupported("profileStop", "the web view exposes no CPU-profiler protocol");
```

PDF 布局选项的说明：

```text
	/** Print the page to PDF (WKWebView pagination; layout options unsupported). */
```

## 视图程序只随 macOS 引擎发布（`src/tools/browser/webkit/kind.ts`）

```ts
/** The engine's viewer program, beside the host executable in engines that ship one (macOS): it shows the host's pages in windows. */
const VIEWER_NAME = "ABView";

/** Platforms whose released engines ship {@link VIEWER_NAME} (ABKit's `docs/installing.md`): only there can a downloaded engine show a window. */
export const VIEWER_PLATFORMS: readonly NodeJS.Platform[] = ["darwin"];
```

## Chromium 一侧的隐身手段（`src/tools/browser/launch.ts`）

`STEALTH_IGNORE_DEFAULT_ARGS` 关闭 puppeteer 默认参数（`--enable-automation`、`--disable-extensions` 等），并注入 `00_stealth_tampering.txt` 至 `13_stealth_worker.txt` 共 14 个补丁脚本（导入语句中的文件名序列）。

## 平台能力（转引自 `raw/agent-tooling/2026-11-12-abkit-readme-docs-and-builds.md`）

```text
> OpenSSL, WebGL, PDF.js, speech through Flite, and Safari's TLS handshake), drawn in software. Off on Linux:
> WebGPU (the tree's only implementation is Metal's), WebAuthn (its UI-process code is Cocoa's), the bubblewrap
> sandbox and libhyphen (neither relocates). The Safari-matching runtime defaults of macOS apply on Linux too.
```

```text
>    module as macOS (shared steps in `WebKitBuild/safari-deps.sh`, plus `linux/patches/`), Mesa for EGL/GLES on
>    llvmpipe, and on glibc a newer GLib, Brotli and fontconfig.
```
