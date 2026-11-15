# 浏览器端终端候选：Vercel Labs 与 Coder 组织扫描及补齐（2026-11-15）

2026-11-15 对「能在浏览器标签页里渲染终端、且支持 Kitty graphics protocol」的候选做第二轮盘点，重点核查用户点名的 `vercel-labs` 组织与 `coder` 组织，并补齐其它未覆盖候选。全部证据为一手直读（GitHub API、仓库文件树、README、patch 与源码文件），未安装、未运行任何被调研项目。

## star 快照

### 快照一（2026-11-15T09:19:40Z，`stargazers_count` 原值）

| 仓库 | star | description |
|---|---|---|
| vercel-labs/wterm | 3683 | A terminal emulator for the web |
| coder/ghostty-web | 3062 | Ghostty for the web with xterm.js API compatibility |
| coder/code-server | 79869 | VS Code in the browser |
| devswha/ovis | 2065 | Ovis (formerly herdr web UI): free, open-source browser and phone client for herdr. Chat and live terminal for Claude Code, Codex and every agent pane, remote PCs over SSH, web push alerts |
| Textualize/textual-web | 1479 | Run TUIs and terminals in your browser |
| xichan96/dinotty | 739 | Multi-device terminal server for AI coding agents. Server-side VTE, session persistence, file browser, web preview, plugin system. Self-hosted. |
| wiedymi/restty | 420 | Powerful, lightweight web terminal. Batteries included. Powered by libghostty-vt, WebGPU, and text-shaper. |
| ekzhang/sshx | 7717 | Fast, collaborative live terminal sharing over the web |
| Eugeny/tabby-web | 1532 | Tabby Web - an SSH/Telnet/Serial client in your browser. |
| Gaurav-Gosain/tuios | 6532 | A terminal window manager that knows what your agents are doing. Tiling panes, workspaces, sessions that survive restarts, and one Inbox for every coding agent. Official only at tuios.dev and this repo. tuios has no X/Twitter account. |

### 快照二（2026-11-15T09:24:54Z，仅数字）

`tsl0922/ttyd` 12636；`zenbu-labs/terminal-browser` 4649；`Xpra-org/xpra` 3065；`linuxserver/docker-webtop` 4510；`selkies-project/selkies` 2562；`Gaurav-Gosain/sip` 30；`Gaurav-Gosain/webterm` 7。

## vercel-labs 组织

`vercel-labs/wterm` 是全组织 100 个仓库（`search/repositories?q=org:vercel-labs&per_page=100&sort=stars`）中唯一与终端渲染相关者，其余为 agent、AI SDK 模板、WebGPU 库等。

### wterm README 关键原文

README（`gh api repos/vercel-labs/wterm/readme`，2026-11-15）第 12 行：

> wterm ("dub-term") renders terminal rows as DOM text, so native text selection, copy and paste, browser find, and screen readers work on the mounted rows. The core is a VT parser written in Zig and compiled to a ~49 KB WASM binary.

第 49 行：

> There are two cores. The built-in Zig core loads by default. [`@wterm/ghostty`](https://wterm.dev/ghostty) swaps in libghostty for fuller VT compatibility, including Kitty images, OSC 133 shell integration, and reflow of soft-wrapped lines. Both implement the `TerminalCore` interface, so the renderer and framework components work with either ([Pluggable cores](https://wterm.dev/configuration#pluggable-cores)).

### `packages/@wterm/ghostty/README.md` 图形能力原文

（`gh api repos/vercel-labs/wterm/contents/packages/@wterm/ghostty/README.md`，2026-11-15）

> The Ghostty core also provides the optional terminal graphics API. The DOM renderer displays direct Kitty Graphics Protocol PNG/RGB/RGBA images as transient, bounded canvas overlays. Pinned placements follow scrollback, scrolling, resize, and primary/alternate screen changes. Sixel, iTerm2/OSC 1337, animation, virtual Unicode placements, file/shared-memory/URL media, and image persistence are not supported. Auto-sized (implicit) placements align with the terminal content origin and reserve their rendered height in the visual DOM flow so prompts emitted after an image remain visible below it.

限制段：

> The image limit applies to decoded image storage, not browser canvas count. Each direct image is also capped at `MAX_IMAGE_BYTES` (32 MiB), even when a larger `imageStorageLimit` is configured; the larger budget can hold multiple smaller images. Each screen also retains at most 4,096 image descriptors and 4,096 placements, so unique tiny-image churn cannot grow WASM metadata without bound; additional records fail closed until existing records are removed.

构建来源：

> The WASM binary is built from upstream [ghostty-org/ghostty](https://github.com/ghostty-org/ghostty) (v1.3.1) using it as a Zig package dependency — no third-party npm packages or pre-built binaries from other projects.

补丁目标（截取）：

> ghostty's `Terminal` and `Page` types use `posix.mmap` and Mach VM allocators internally, which don't exist on `wasm32-freestanding`. The build script applies small, targeted patches to replace these with `std.heap.wasm_allocator`, expose the discarded-row count from `PageList`, forward the per-screen image limit, bound and compact Kitty image/placement metadata, and make direct PNG decoding work without POSIX time.

实验说明（`experiments/libghostty`，未打补丁的上游构建）：

> the probed freestanding build disables Kitty graphics

即上游 libghostty 的 freestanding（wasm）构建默认关闭 Kitty 图形，wterm 的正式包靠自维护补丁打开。

### 文档页 `apps/docs/content/docs/ghostty.mdx` 关键原文

（`gh api repos/vercel-labs/wterm/contents/apps/docs/content/docs/ghostty.mdx`，2026-11-15）

> Ghostty-backed terminals also render direct Kitty Graphics Protocol PNG, RGB, and RGBA data through the optional graphics contract. The DOM layer draws bounded, transient canvas overlays for pinned placements and follows scrollback, resize, and primary/alternate screen changes. Non-direct media is rejected before file, shared-memory, or URL access; Sixel, iTerm2/OSC 1337, animation, virtual Unicode placements, and persistence are outside the supported boundary.

> `WTerm` answers Kitty's pixel geometry queries from the browser viewport, so direct image commands such as `kitten icat --transfer-mode=stream image.png` can negotiate their display size before transferring image data. The [local shell example](https://github.com/vercel-labs/wterm/tree/main/examples/local) forwards the browser's pixel dimensions to its PTY, so `kitten icat --detect-support` also works from that shell.

内置核心与 Ghostty 核心对比表（截取）：内置 ~49 KB WASM（内联、基础 VT100/VT220/xterm），`@wterm/ghostty` ~580 KB WASM（按需获取、完整 VT）。

### wterm 平台与后端

`examples/local/package.json`（2026-11-15 读取）依赖 `@wterm/core`、`@wterm/dom`、`@wterm/ghostty`、`@wterm/react`（均 `workspace:*`）、`node-pty ^1.0.0`、`next 16.3.5`、`ws ^8.18.2`；`predev` 脚本把两个 WASM 复制到 `public/` 并给 `node-pty` 的 darwin spawn-helper 加执行权限。前端无平台限制（浏览器运行），本地 shell 后端用 node-pty，Linux 可运行。

仓库内 `kitty` 相关文件（代码搜索 `repo:vercel-labs/wterm+kitty`）：`packages/@wterm/dom/src/kitty-keys.ts`、`packages/@wterm/ghostty/README.md`、`packages/@wterm/ghostty/zig/build.zig`、`src/terminal.zig`、`examples/ghostty/README.md`、`examples/ghostty/src/main.ts`、`apps/docs/content/docs/ghostty.mdx`、`examples/local/README.md`、`examples/local/server.ts`、`experiments/libghostty/README.md`、`CHANGELOG.md`、`CONTRIBUTING.md`。Kitty 图形只在 `@wterm/ghostty` 核心，内置核心无。

许可证：Apache-2.0。

## coder 组织

### coder/code-server

描述 `VS Code in the browser`。文件树全量递归（`git/trees/main?recursive=1`，2026-11-15）中 `kitty`/`sixel` 命中为 0；issue 搜索 `repo:coder/code-server+kitty+graphics+in:title,body` 返回空。集成终端基于 xterm.js，无 Kitty 图形支持证据。

### coder/ghostty-web

README（`gh api repos/coder/ghostty-web/readme`，2026-11-15）开头：

> [Ghostty](https://github.com/ghostty-org/ghostty) for the web with [xterm.js](https://github.com/xtermjs/xterm.js) API compatibility — giving you a proper VT100 implementation in the browser.

要点：`@xterm/xterm` 换成 `ghostty-web` 即可迁移；WASM 编译自 Ghostty 解析器；零运行时依赖、约 400KB WASM。本地 demo 段：

> This starts a loopback-only HTTP server with a real shell on `http://127.0.0.1:8080`. The demo protects `/ws` with a per-run same-origin token and rejects cross-origin WebSocket handshakes. Works best on Linux and macOS.

对比表只列复杂文字（Devanagari、Arabic 渲染）与 `XTPUSHSGR/XTPOPSGR` 两项，未提图像。

仓库自身文件树（`git/trees/main?recursive=1`，2026-11-15）中 `kitty`/`image` 命中为 0。构建补丁 `patches/ghostty-wasm-api.patch`（1620 行，2026-11-15 读取）内的 `kitty` 出现只在键盘协议与颜色操作，图像协议无 API；颜色操作原文：

> +    fn kittyColorOperation(self: *ResponseHandler, value: anytype) !void {
> +        _ = self;
> +        _ = value;
> +        // Kitty color operations are not supported in WASM context
> +    }

补丁暴露的渲染 API（`include/ghostty/vt/terminal.h`）只含 cell（codepoint + 颜色 + flags + hyperlink_id），没有图像表面。

issue #197（open，2026-11-15 读取）：`feat(addons): kitty graphics protocol support (KittyGraphicsAddon)`；issue #162（open）：`WIP: Upgrade to Ghostty 1.3`。即 Kitty 图形是尚未完成特性。

许可证：MIT。

### 组织内其余仓库

`coder/boo`（790 star）是 GNU screen 风格终端多路复用器，TTY 客户端接入，非浏览器方案，不满足「浏览器标签页」门槛。

## devswha/ovis

README（2026-11-15）第 34 行：

> Ovis runs on the computer where your agents work, and your phone or any browser connects to it. It is built on [herdr](https://github.com/herdrdev/herdr) and can show the same live terminals as herdr and the [Herdr app](https://herdr.dev/download/), so they work side by side.

第 38 行给出桌面端四平台安装（Mac/Windows/Linux deb），Linux 一行安装 `curl -fsSL https://ovis.sh/install.sh | sh`；第 92 行 Thanks 段写 `powered by [xterm.js](https://xtermjs.org)`。

### 浏览器终端实际渲染路径

`src/lib/ghostty/overlay.ts`（2026-11-15 读取）第 2-11 行：

> libghostty-vt draws every xterm terminal's screen, Kitty graphics pictures included, while xterm stays the engine under it. xterm draws by itself only where this layer cannot: a module that does not load or fails, and an iTerm2 or sixel picture (Pictures in the terminal), which libghostty does not take.
>
> xterm still takes every key, IME syllable, paste, click, selection, link, search and scroll, and still answers the program's queries: everything Ovis built on it keeps working. Its text layer is hidden (PaneTerminal.css `[data-renderer="ghostty"]`), and a layer of plain DOM text, one div per row, is drawn over its screen at its cell size from the same bytes, in the same order.

即 Ovis 的浏览器终端在 xterm.js 之上叠加 libghostty-vt 的 DOM 覆盖层绘制屏幕（含 Kitty 图形图片）；xterm 仍处理输入与六位/iTerm2 图片（`src/lib/terminalImages.ts` 注释原文：`Settings -> Terminal -> Pictures in the terminal: draws sixel and iTerm2 inline images (imgcat, …)`）。

### WASM 构建与补丁

`scripts/ghostty-vt/build.sh`（2026-11-15 读取）第 2-6 行：

> # Rebuilds src/lib/ghostty/ghostty-vt.wasm: libghostty-vt from ghostty (MIT) at a pinned commit, with
> # kitty-on-wasm.patch, which turns the Kitty graphics protocol on for wasm32-freestanding (upstream
> # leaves it off there: no file medium and no PNG decoder). The patch refuses the file, temporary
> # file and shared memory media, which have no meaning in a browser, and links ghostty's bundled
> # wuffs PNG decoder, so a PNG a program sends is decoded inside the module.

pinned commit：`GHOSTTY_COMMIT=e95bed6`；构建 `zig build -Demit-lib-vt -Dtarget=wasm32-freestanding -Doptimize=ReleaseSmall`，产物 sha256 期望值 `b8e8d0f8dd4e84718002198f80d5399005d6d42f2d419b31644343d5703a1444`（zig 0.17.1, x86_64-linux）。

`scripts/ghostty-vt/kitty-on-wasm.patch` 改三处：`src/terminal/build_options.zig` 的 `kittyGraphics()` 去掉 freestanding 返回 false 的分支、改为 `return self.features.kitty_graphics`；`src/terminal/kitty/graphics_image.zig` 在 freestanding 下对非 direct medium 返回 `error.UnsupportedMedium`；`src/terminal/sys.zig` 让 freestanding 下 `decode_png` 保留 `decodePngWuffs`。

### 覆盖层读取的图像常量

`src/lib/ghostty/vt.ts`（2026-11-15 读取）注释与常量：

> // enum values from include/ghostty/vt/render.h, terminal.h and kitty_graphics.h at the pinned commit
> const RS_DATA_IMAGE_ITERATOR = 22, RS_DATA_IMAGE_PLACEMENTS_GENERATION = 23;
> const OPT_KITTY_IMAGE_STORAGE_LIMIT = 15, OPT_SCROLLBACK_MAX_LINES = 28, OPT_MODE = 34;
> const DATA_KITTY_GRAPHICS = 30;
> const IMAGE_ID = 2, IMAGE_GENERATION = 3, IMAGE_LAYER = 4, IMAGE_Z = 5, IMAGE_COL = 6, IMAGE_ROW = 7, IMAGE_OFFSET_X = 10, IMAGE_OFFSET_Y = 11;
> const IMAGE_WIDTH = 12, IMAGE_HEIGHT = 13, IMAGE_SOURCE_X = 14, IMAGE_SOURCE_Y = 15, IMAGE_SOURCE_WIDTH = 16, IMAGE_SOURCE_HEIGHT = 17;
> const KITTY_WIDTH = 3, KITTY_HEIGHT = 4, KITTY_FORMAT = 5, KITTY_DATA_PTR = 7, KITTY_DATA_LEN = 8;
> const FORMAT_RGB = 0, FORMAT_RGBA = 1, FORMAT_GRAY_ALPHA = 3, FORMAT_GRAY = 4;
> /** decoded pictures one terminal keeps; every terminal on the page shares the module's one memory */
> const IMAGE_STORAGE_BYTES = 64n * 1024n * 1024n;

`GhosttyImage` 接口注释：`A Kitty image on screen, in viewport cells and CSS pixels, as the render state places it.`

## wiedymi/restty

README 第 8-9 行：`Browser terminal rendering for web apps, powered by \`libghostty-vt\` in WASM, WebGPU with WebGL2 fallback, and TypeScript text shaping.`；`restty` 为 early-release 软件。

文件树（`git/trees/main?recursive=1`，2026-11-15）中 Kitty 相关实现文件：`src/wasm/runtime/kitty.ts`、`src/pty/kitty-media.ts`、`src/runtime/create-runtime/kitty-render-runtime.ts`、`src/runtime/create-runtime/kitty-render-runtime.types.ts`、`src/runtime/create-runtime/kitty-overlay-utils.ts`、`src/runtime/create-runtime/interaction-runtime/kitty-image-cache.ts`、`src/runtime/create-runtime/interaction-runtime/kitty-image-cache.types.ts`、`src/input/keymap/kitty.ts`；测试：`tests/kitty-graphics-placement.test.ts`、`tests/kitty-graphics-probe.test.ts`、`tests/kitty-graphics-snacks.test.ts`、`tests/kitty-media.test.ts`。

`src/wasm/runtime/kitty.ts`（2026-11-15 读取）开头：

> import type { KittyPlacement, ResttyWasmExports } from "./types";
>
> export function readKittyPlacements(exports: ResttyWasmExports, memory: WebAssembly.Memory, handle: number): KittyPlacement[] {
>   if (!exports.restty_kitty_placement_count || !exports.restty_kitty_placements_ptr) {
>     return [];
>   }

读取 placement 的字段：imageId、imageRevision、placementId、placementExternal、imageFormat、imageWidth/Height、imageDataPtr/Len、x/y/z、width/height、cellOffsetX/Y、sourceX/Y/Width/Height，stride 按版本 68/76/84。

`src/runtime/create-runtime/kitty-render-runtime.ts`（2026-11-15 读取）定义 `KittyWebGLTextureEntry`（WebGL2RenderingContext + WebGLTexture）与 `KittyWebGPUTextureEntry`（GPUDevice + GPUTexture + 两个 GPUBindGroup），`createKittyRenderRuntime` 创建 `kittyImageCache`、WebGL/WebGPU 纹理缓存与采样器缓存。即 Kitty 图片经 WASM 解码后以 WebGPU（WebGL2 回退）纹理绘制。

## Textualize/textual-web

README 第 115-116 行：

> Terminals currently work on macOS and Linux only. Windows support is planned for a future update.

文件树（2026-11-15）中 `kitty`/`sixel`/`image` 命中为 0；未找到任何图像协议实现文件，Kitty 图形支持未确认。

## xichan96/dinotty

README（2026-11-15）第 24 行：`A terminal built for coding agents.`；第 109-110 行：`**Server-side VTE** — full VTE parser, server knows exact screen state, enables session recovery & screen snapshots` 与 `Server-side VTE. PTY survives disconnects. Refresh the page, you're back where you were.`；第 179 行 `**Linux one-liner install**`；第 209 行 `Default port is **8999**. After starting, visit \`http://<your-ip>:8999\`.`；Rust 单二进制、Vue 3 前端。

文件树（2026-11-15）中 `kitty`/`sixel`/`image` 命中只有文档截图 PNG/GIF 与 `frontend/src/components/workspace/ImagePreview.vue`（文件预览），无终端图像协议实现文件，Kitty 图形支持未确认。

## ekzhang/sshx

文件树（2026-11-15）中终端前端为 `src/lib/ui/XTerm.svelte`（xterm.js）；`kitty`/`sixel`/`image` 命中只有站点社交图片与 logo。无 Kitty 图形支持。

## Eugeny/tabby-web

README（2026-11-15）项目状态说明：

> At this time I don't have the time to work on `tabby-web` and won't be able to provide help or support for it. I'm still happy to merge any fixes/improvement PRs. :v:

`This is the Tabby terminal, served as a web app.` 前端依赖（`frontend/package.json`）为 Angular 12 + Bootstrap，无 xterm/kitty 相关依赖（Tabby 桌面端自身是 xterm.js 系）；文件树中 `kitty`/`sixel`/`image` 命中为 0。无 Kitty 图形支持证据。Docker 部署（`ghcr.io/eugeny/tabby-web:latest`），端口 9090。

## 证据边界

- 上述仓库均未安装、未运行；浏览器内目视渲染结果未实测。
- `wterm`、`ghostty-web`、`ovis`、`restty` 四者能力判定来自 README、patch、源码常量与文件树的一手直读。
- `code-server`、`sshx`、`tabby-web`、`textual-web`、`dinotty` 的「无 Kitty 支持证据」来自文件树全量检索与 issue 检索；不排除存在未被检索覆盖的实现，检索范围分别为各仓库默认分支完整文件树。
- `coder/boo` 因不满足浏览器标签页门槛未纳入候选清单。
