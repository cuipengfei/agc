# ABKit 源材料：README、docs 与构建 API

> Source: [stencil-hq/abkit README](https://github.com/stencil-hq/abkit)；[docs/protocol.md](https://github.com/stencil-hq/abkit/blob/main/docs/protocol.md)；[docs/page.md](https://github.com/stencil-hq/abkit/blob/main/docs/page.md)；[docs/presentation.md](https://github.com/stencil-hq/abkit/blob/main/docs/presentation.md)；[docs/viewer.md](https://github.com/stencil-hq/abkit/blob/main/docs/viewer.md)；[docs/building.md](https://github.com/stencil-hq/abkit/blob/main/docs/building.md)；[docs/installing.md](https://github.com/stencil-hq/abkit/blob/main/docs/installing.md)；[build.stencil.so/api/products](https://build.stencil.so/api/products)；[build.stencil.so/api/products/abkit/builds](https://build.stencil.so/api/products/abkit/builds)；[stencil.so/about](https://stencil.so/about)；[GitHub stencil-hq](https://github.com/stencil-hq)
> Collected: 2026-11-12
> Published: Unknown（仓库文档无发布日期；ABKit 0.1.0 的 `published_at` 为 2026-11-12T03:11:13Z）

## 1. README 原文摘录

> ABKit (AgentBrowser Kit) is a browser engine for agents: a fork of [WebKit](https://webkit.org/)'s WPE port that
> runs on macOS, Linux and Windows, plus `ABHost`, a headless browser that a parent process drives over its
> standard streams. It is the engine behind [omp](https://github.com/can1357/oh-my-pi)'s `webkit` browser and
> Tern's web views.
>
> A page in ABKit cannot tell it is driven: it sees a visible, focused window, trusted input, a plausible screen,
> and no automation flag, and no client script has to run in it. On macOS it is Safari to the page and to the
> server: Safari's user agent, fonts and form controls, and Safari's TLS handshake, HTTP/2 settings and request
> header order, with WebGL, WebGPU, media (played silently), Web Audio, WebRTC, WebAuthn and the rest of what Safari
> exposes. What exactly a page sees: [docs/page.md](/stencil-hq/abkit/blob/main/docs/page.md).

Layout 表：

| Path                            | What                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Source/`                       | WebKit, with the WPE port running on Darwin and Windows and the engine changes ABKit needs            |
| `Source/WebKit/AgentHost/`      | `ABHost` (namespace `AgentHost::`), its web process extension and the macOS viewer `ABView` (`View/`) |
| `WebKitBuild/`                  | build, packaging and install scripts per platform (`darwin/`, `linux/`, `win/`), the CI smoke test    |
| `docs/`                         | the host's protocol and how to build and install the engine                                           |
| `.github/workflows/release.yml` | builds every target and publishes releases                                                            |

> The library keeps WPE's name (`libWPEWebKit-2.0`); the processes are ABKit's: `ABHost`, `ABWebProcess`, `ABNetworkProcess`, `ABView`.

Using it 段原文：

> A client starts `ABHost` from the engine directory and speaks JSON frames to it:
>
> ```
> → {"hello":{}}
> ← {"welcome":{"ops":["browser","dom","console","network","present"]}}
> → {"id":1,"browser":{"op":"open","url":"https://example.com"}}
> ← {"id":1,"browser":{"ok":{"block":1,"url":"https://example.com"}}}
> → {"id":2,"browser":{"op":"events","block":1,"wait":true}}
> ← {"id":2,"browser":{"ok":{"events":[…,{"type":"loaded","url":"https://example.com/","seq":7}],"next":7,"dropped":0}}}
> → {"id":3,"browser":{"op":"eval","block":1,"function":"() => document.title"}}
> ← {"id":3,"browser":{"ok":{"value":"Example Domain"}}}
> ```
>
> Each frame is a 4-byte little-endian length and that much UTF-8 JSON. `WebKitBuild/smoke-engine.py` is a complete
> client in a hundred lines.

使用方原文：

> - **omp** runs the installed engine for its browser tool whenever it is installed (`browser.open` without `app`,
>   or `app: { webkit: true }`), and shows a tab in a window through `ABView` on macOS.
> - **Tern** draws its web views with it: on macOS as blocks of an `ABHost` child process presented over Mach
>   (`STENCIL_WEBKIT=agent`, the default once installed), elsewhere by loading the library in process.

Documentation 列表：`docs/protocol.md`、`docs/events.md`、`docs/page.md`、`docs/presentation.md`、`docs/viewer.md`、`docs/building.md`、`docs/installing.md`。

Building and installing 段原文：

> On a Mac with Homebrew:
>
> ```
> WebKitBuild/darwin/build-engine.sh darwin-arm64 WebKitBuild/engine
> WebKitBuild/install-engine.sh
> ```
>
> The engine lands in `~/.o2/lib/abkit`, where omp and Tern find it. Linux and Windows: [docs/building.md](/stencil-hq/abkit/blob/main/docs/building.md).
> Releases for every platform are on [build.stencil.so](https://build.stencil.so) (product `abkit`).

Upstream 段原文：

> ABKit tracks [WebKit/WebKit](https://github.com/WebKit/WebKit) `main`. WebKit's own documentation is in `Introduction.md`; its licenses (LGPL 2 and BSD, per file) apply to ABKit unchanged.

## 2. docs/protocol.md 原文摘录

> `ABHost` runs headless web views for a parent process, which drives them over the host's standard streams.
> This file, with [events.md](events.md), [page.md](page.md), [presentation.md](presentation.md) and
> [viewer.md](viewer.md), is the contract between the host and its clients (omp's `webkit` browser backend and
> Tern's `agent` engine are two).

Process 段原文：

> - `ABHost [--data-dir DIR] [--inspector HOST:PORT]`. `DIR` keeps website data per profile across runs;
>   without it every profile lives in a temporary directory that is removed when the host exits.
> - `--inspector HOST:PORT` serves the Web Inspector for the host's views: open `http://HOST:PORT` in a browser and
>   pick a view from the target list, and the views' pages enable the instrumentation that makes them debuggable.
>   It is off by default (no inspector server runs and the views are not inspectable) and binds only the given
>   address, a port alone meaning `127.0.0.1`.
> - Requests arrive on standard input and answers leave on standard output, as frames of a 4-byte little-endian
>   payload length followed by UTF-8 JSON (at most 256 MiB). Nothing else is written to standard output: the host
>   keeps a private duplicate for the protocol and points descriptor 1 at standard error. Diagnostics go to
>   standard error (`G_MESSAGES_DEBUG=ABHost` adds the host's debug log).
> - The host exits with status 0 when standard input ends, after closing every block. It reads no environment
>   variables and finds the engine through its rpath, and its web process extension in `extensions/` beside its
>   own executable.

Envelope 段原文：

> - `{"hello":{}}` is answered `{"welcome":{"ops":["browser","dom","console","network","present"]}}`. `dom` says
>   the `dom` op exists; `console` and `network` say those event families are reported; `present` (macOS only)
>   says blocks can be presented to another process ([presentation.md](presentation.md)).
> - `{"id":N,"browser":{"op":NAME,…}}` is answered `{"id":N,"browser":{"ok":VALUE}}` or
>   `{"id":N,"browser":{"error":{"kind":K,"message":M}}}`, in any order. Kinds: `invalid` (bad or missing field,
>   unknown op), `not_found` (no such block), `unsupported`, `js` (an `eval` threw), `failed` (anything else).
> - `{"id":N,"fork":…}` is answered with an `unsupported` error: the host has no sessions.

Blocks 段原文：

> A block is one web view. Ids are positive integers, never reused in a process. Every op but `open`, `blocks`,
> `clipboard` and `clear` takes `block`.
>
> | Op | Fields | Answer |
> |---|---|---|
> | `open` | `url` (default `about:blank`), `width`, `height` (CSS px, 1..16384, default 1280×800), `scale` (device px per CSS px, 0.25..8, default 1), `profile` (name, default `"agent"`; `null` for a store of its own); `owner` and `show` are accepted and ignored | `{"block","url"}` once the view exists |
> | `close`, `release` | | `{}`; the view is destroyed |
> | `blocks` | | `{"blocks":[{"block","url","title","owner":null,"shown","driven":true}]}`; `shown` is true while the block is presented |
> | `state` | | `{"url","title","loading","progress","back","forward","width","height","shown","focused","error"}`; `shown` is true while the block is presented, `focused` is what `focus` last said (default true) |
> | `goto` | `url` | `{}` at once; the load is reported by events |
> | `nav` | `go`: `back`, `forward`, `reload`, `stop` | `{}` at once |
> | `viewport` | `width`, `height`, `scale` (as for `open`; unchanged when left out) | `{}` |
> | `events` | `after` (default 0), `wait` (default false) | `{"events":[…],"next","dropped"}`; each event has `seq`, counted from 1; the last 4096 are kept. With `wait`, answered only once there is an event after `after` (or with `not_found` when the block closes); one waiting call per block: a new `events` call answers the waiting one with what it has (possibly nothing). The events: [events.md](events.md) |
> | `focus` | `value` (boolean) | `{}`; whether the view holds the keyboard. True (the default) is what a driven page must see: focused in an active window whatever happens. A presenting client sets false while its block does not have the keyboard |
> | `present` | `to`: a target, or `null` to stop | `{}` once the target is reached; `failed` when it cannot be ([presentation.md](presentation.md)) |
> | `clear` | `profile` (a name) | `{}` once that profile's website data (cookies, storage, caches) is erased; a profile never opened, or without data, is no error; `null` is `invalid` (a store of a block's own goes with its block). Blocks open on the profile stay open and find the data gone |
>
> `open` with `about:blank` loads nothing, so the first `goto` is the view's first history entry; `committed` and
> `loaded` are still reported for it.

Page 段原文（操作表）：

> | Op | Fields | Answer |
> |---|---|---|
> | `dom` | a request of `webkit_web_view_run_interaction_query()` (`read`: `snapshot`, `resolve`, `query`, `wait`) | the engine's reply, verbatim, also when it is an `{"error":…}` reply |
> | `eval` | `function` (source), `args` (array), `world` (`page` or `isolated`), `frame` (a frame's name) | `{}` for `undefined`, else `{"value"}`; a throw, or a result that is not JSON, is kind `js` |
> | `scripts` | `scripts`: `[{"source","world","frames":"main"\|"all","at":"start"\|"end"}]`, replacing the list | `{}` |
> | `input` | `events`: steps `mouse` (`action` `move`\|`down`\|`up`, `x`, `y`, `button`, `clicks`, `mods`), `wheel` (`x`, `y`, `dx`, `dy`, `mods`), `key` (`action`, `key`, `code`, `mods`), `text` (`text`) | `{}` two frames after the last step |
> | `edit` | `action`: `copy`, `cut`, `paste`, `selectAll`, `undo`, `redo` | `{}` |
> | `capture` | `format` (`png`, `jpeg`), `quality`, `scale`, `rect` (`{x,y,width,height}`), `full` | `{"data","mime","width","height"}` |
> | `dialogs` | `policy`: `default` (alerts and beforeunload accepted, confirm and prompt held), `accept`, `dismiss` | `{}` |
> | `dialog` | `accept`, `text` | `{}`; `failed` when no dialog is held |
> | `files` | `paths` (array, or `null`) | `{}`; answers a held chooser or presets the next one |
> | `cookies` | | `{"cookies":[{"name","value","domain","path","expires","httpOnly","secure","sameSite"}]}` |
> | `setCookie`, `deleteCookie` | `cookie`; `name`, `domain`, `path` | `{}` |
> | `agent` | `value` (string, or `null` for the host's default) | `{}` |
> | `appearance` | `value`: `dark`, `light`, `null` | `{}`; applies to every block of the process. `null` (the default) is the system's appearance: on macOS the Mac's own, dark or light, as in Safari; light elsewhere |
> | `allow` | `hosts` (exact names and `*.domain`, or `null`) | `{}` |
> | `insecure` | `value` | `{}`; `true` accepts invalid certificates |
> | `fileAccess` | `value` | `{}`; `true` lets a `file:` document read other files (fetch, XHR, frames, canvas pixels) as if they shared its origin, as Chromium's `--allow-file-access-from-files` does. Off by default; documents loaded afterwards see the change |
> | `credentials` | `username`, `password`, or neither | `{}` |
> | `downloads` | `dir` (or `null`: downloads are cancelled) | `{}` |
> | `identity` | `seed`, `screen`, `window` ([page.md](page.md)) | `{}` |
> | `clipboard` | `text` to write, nothing to read | `{}` or `{"text"}`; the host's own clipboard, not the system's |
>
> Input steps are trusted events sent through the view (`text` is an input-method commit, without key events).
> Key names are DOM `key` values; a key the host cannot map fails the call with `input: unknown key "…"`.
> `pdf` and `media` answer `unsupported`.

## 3. docs/page.md 原文

> The host exists so that a page cannot tell it is driven. A client keeps that property by installing no
> page-world script; everything below holds without one.
>
> - The view is visible, focused and active, and its input is trusted. `navigator.webdriver` is false.
> - Nothing is composited or painted to a buffer except during `capture` and while the block is presented, while
>   animation frames keep their display cadence ([presentation.md](presentation.md), "Pacing").
> - `webkit.messageHandlers.stencil` and `stencilFrame` exist in the isolated world always, and in the page's
>   world only while the `scripts` list holds a page-world script.
> - The screen and the window are never the viewport. The window frame is `x: 80, y: 60`, as wide as the
>   viewport and 87 px taller; the screen is the first of 1920×1080, 2560×1440, 3440×1440 and 3840×2160 that
>   holds it, less a 25 px menu bar at the top on macOS and a 40 px bar at the bottom elsewhere. Both follow the
>   viewport.
> - The machine is a desktop: there is a mouse and a keyboard and no touchscreen, so `(hover: hover)` and
>   `(pointer: fine)` match and there are no touch events or `ontouch*` attributes.
> - On macOS the user agent is Safari's and `window.safari` exists. The generic font families are the ones Safari
>   uses (Times, Helvetica, Courier, Apple Chancery, Papyrus; Times for a family that is not installed), and
>   `system-ui` and `-apple-system` are the system font. Form controls use the system font at 11 px.
>   Scrollbars overlay the page and take no room in it, as on a Mac with only a trackpad.
> - On macOS and Linux the TLS handshake, the HTTP/2 settings and the request headers, their order included, are
>   the ones Safari sends (on Linux under the engine's own user agent). Windows uses MSYS2's stock TLS.
> - Video and audio play and Web Audio runs, but no sound reaches an output device. There is no camera or
>   microphone: `enumerateDevices()` lists one unlabelled device of each kind, as Safari does before permission,
>   and `getUserMedia()` and `getDisplayMedia()` are denied. WebAuthn requests and `navigator.share()` end as a
>   sheet the user dismissed, and no gamepad is attached.
> - `file:` documents cannot read other files until the client sends `fileAccess` ([protocol.md](protocol.md)).
> - `identity` changes this: `seed` (a string; `null` for none) seeds the noise the engine adds to canvas
>   read-backs, so one seed is one stable device; `screen` (`{"width","height","availLeft","availTop","availWidth",
>   "availHeight"}`) and `window` (`{"x","y","width","height"}`) pin those values, and `null` returns either to the
>   rule above. A member that is left out is unchanged.
>
> Which engine features each platform's build has: [building.md](building.md).

## 4. docs/presentation.md 原文摘录

> `{"op":"present","block":N,"to":TARGET}` shows a block's frames in another process without copying them:
> while presented, the block renders like a page on screen and every frame it renders goes to the target as the
> buffer the web process drew it into. `{"op":"present","block":N,"to":null}` stops. Stopping, `close`, the
> host's exit and the target's death end a presentation; then the buffers go back to the view and nothing is
> rendered again until the next `capture` or `present`. `capture` works while presenting. Presenting a block to
> the target it is presented to already does nothing; to another one, ends the first presentation.

TARGET 段原文：

> - macOS: `{"mach":NAME}`, a Mach bootstrap service the client checked in (`bootstrap_check_in()`), which must
>   outlive the presentations to it. One service serves every block, and every host, of a client. The answer
>   `{}` comes once the service was reached and sent `hello`; `failed` when it cannot be reached.
> - `{"hwnd":N}` (Windows) and `{"socket":PATH}` (Linux) are reserved: answered `unsupported`.
>
> A client that wants windows without speaking the Mach channel itself starts the engine's viewer
> ([viewer.md](viewer.md)) and presents blocks to it.

Pacing 段原文：

> The host's pages run their animation frames at the refreshes of one screen. While a client sent a `tick` (its
> display refreshed) within the last second, a refresh is a `tick`; otherwise a 60 Hz timer is. A client sends
> `tick`s from its display link while it shows a presented block, and stops when it shows none. A presented frame
> counts as shown at the refresh after it was sent (its page's next frame waits for that), so a presented page
> renders at most one frame per refresh: with 120 ticks a second, 120 frames and animation frames a second.

Mach 通道摘要原文：

> Plain `mach_msg()` messages between the host and the client's service, in native byte order. `msgh_id` is the
> kind. A simple message is the 24-byte `mach_msg_header_t` followed by its payload of 32-bit unsigned words; a
> complex one (`MACH_MSGH_BITS_COMPLEX`) is the header, a `mach_msg_body_t` (4 bytes, `msgh_descriptor_count`
> 1), one `mach_msg_port_descriptor_t` (12 bytes) and then its payload words.

## 5. docs/viewer.md 原文

> The host has no window. `ABView`, beside the host in the engine's directory, is a presentation client
> ([presentation.md](presentation.md)) that gives presented blocks one each: a program a client starts, takes its
> service name from, and presents blocks to. It links nothing of the engine. It speaks one JSON object a line on its
> standard streams and exits when its input closes.
>
> - It writes `{"ready":{"mach":NAME}}` once its service (`so.stencil.ABView.<pid>`) is checked in: the `present`
>   target is `{"mach":NAME}`. One viewer serves the blocks of one host.
> - `{"show":{"block":N,"title":"…","scale":S}}` names a block's window before the block is presented: its title
>   and the block's `scale`, from which the window takes its size (one point per CSS pixel, smaller where the
>   screen is). The window opens with the block's first frame, in front but without taking the keyboard from the
>   app the user is in, and closes when the presentation ends. `show` for a shown block renames its window.
> - `{"hide":{"block":N}}` closes a block's window; the client also stops presenting the block.
> - `{"input":{"block":N,"events":[…]}}` is what the user did in a window, as steps of the `input` op in the
>   block's CSS pixels (`mouse`, `wheel`, `key`, and `text` for what a key press cannot say); the client sends
>   them on. The viewer never sets `focus`: a shown page stays focused like a hidden one.
> - `{"closed":{"block":N}}`: the user closed the window; the client stops presenting the block.
>   `{"ended":{"block":N}}`: the block's presentation ended (`bye`) and its window is gone.
>
> A typical client (omp's `webkit/host.ts`): start `ABView` with the first window, wait for `ready`, send `show`,
> then `{"op":"present","block":N,"to":{"mach":NAME}}` to the host; forward `input` lines to the host's `input`
> op; on `closed` send `present` with `"to":null`; close the viewer's input when the last window is gone.

## 6. docs/building.md 原文摘录

> Every platform builds the WPE port with CMake and Ninja and packages the result as one relocatable engine
> directory ([installing.md](installing.md)). One script per platform does all of it, as CI runs it:
>
> ```sh
> WebKitBuild/<darwin|linux|win>/build-engine.sh TARGET OUT_DIR
> ```
>
> `TARGET` is one of `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`, `linux-musl-x64`, `linux-musl-arm64`,
> `windows-x64`, `windows-arm64`. With `CCACHE_DIR` set, compiles go through ccache. `WebKitBuild/smoke-engine.py
> OUT_DIR` then checks the package: the host starts, loads a page, runs script, captures a frame and exits cleanly.

macOS 段原文（要点）：

> `WebKitBuild/darwin/build-engine.sh darwin-arm64|darwin-x64 OUT_DIR`, on a Mac with Xcode (or its command line
> tools) and Homebrew. ... It bundles Homebrew's libraries, so it runs on the macOS version it was built on and later.
> It draws with Metal (through ANGLE), so it needs a Metal device: every Mac that runs a current macOS has one, but a
> virtual machine without a GPU (GitHub's Intel macOS runners) does not, and there pages fail to load.

Linux 段原文：

> `WebKitBuild/linux/build-engine.sh linux-x64|linux-arm64|linux-musl-x64|linux-musl-arm64 OUT_DIR` builds in a
> container; the host needs only Docker (CI: vmon for x64, Blacksmith for arm64; another architecture works through
> emulation, slowly). The container is `WebKitBuild/linux/Dockerfile.glibc` (Ubuntu 22.04, clang 20) or
> `Dockerfile.musl` (Alpine 3.22, with apt.llvm.org's clang 20 on its own glibc compiling for Alpine: under musl's
> allocator clang builds the engine about 1.8 times slower), and in it:
>
> 1. `WebKitBuild/linux/build-deps.sh` builds pinned sources: the same Safari-shaped libsoup and BoringSSL TLS
>    module as macOS (shared steps in `WebKitBuild/safari-deps.sh`, plus `linux/patches/`), Mesa for EGL/GLES on
>    llvmpipe, and on glibc a newer GLib, Brotli and fontconfig.
> 2. `WebKitBuild/configure-wpe-linux.sh BUILD_DIR DEPS_PREFIX`, then `ninja`.
> 3. `WebKitBuild/package-engine-linux.sh BUILD_DIR OUT_DIR DEPS_PREFIX`: every library but the C library (and on
>    glibc libstdc++ and libgcc_s) goes into `lib/` behind `$ORIGIN` run paths, with GStreamer's plugins and
>    scanner, fontconfig's configuration and DejaVu as a last-resort font, xkb keymaps and (musl) ICU data, found
>    through `useBundledRuntimePathsIfPresent()`. Packaging fails if `ldd` reports a missing library or symbol
>    version.
>
> A glibc engine runs on glibc 2.35 and later (Ubuntu 22.04, Debian 12, Fedora 36 and newer) with the system's
> libstdc++; a musl engine on musl 1.2.5 and later with nothing else from the system. The feature set is macOS's
> (media through GStreamer, Web Audio, MediaStream, WebRTC, MSE, WebCodecs, ClearKey Encrypted Media through
> OpenSSL, WebGL, PDF.js, speech through Flite, and Safari's TLS handshake), drawn in software. Off on Linux:
> WebGPU (the tree's only implementation is Metal's), WebAuthn (its UI-process code is Cocoa's), the bubblewrap
> sandbox and libhyphen (neither relocates). The Safari-matching runtime defaults of macOS apply on Linux too.

Windows 段原文（要点）：

> `WebKitBuild/win/build-engine.sh windows-x64|windows-arm64 OUT_DIR` cross-compiles from Linux (CI: ubuntu-24.04
> for both targets) with clang-cl and lld-link; ...
>
> Off on Windows, each needing port work: media (GStreamer, and with it Web Audio, MediaStream, WebRTC, MSE,
> WebCodecs, Encrypted Media), WebGL and WebGPU, the GPU process, gamepads, WebAuthn and speech. TLS is MSYS2's
> stock libsoup and OpenSSL, not Safari's handshake. The web process draws with Direct3D 11, falling back to the
> WARP software renderer where there is no hardware device.

## 7. docs/installing.md 原文

> An engine is one directory: everything in it finds the rest beside itself, wherever the directory is.
>
> | File | What it is |
> |---|---|
> | `ABHost` (`ABHost.exe`) | the host clients start ([protocol.md](protocol.md)) |
> | `extensions/` | the host's web process extension (`libABHostExtension.so`, `ABHostExtension.dll`) |
> | `libWPEWebKit-2.0.1.dylib`, `libWPEWebKit-2.0.so.1`, `WPEWebKit-2.0.dll` | the engine's library |
> | `ABWebProcess`, `ABNetworkProcess` (`.exe`) | its helper processes, which it looks for beside itself |
> | `libWPEInjectedBundle.*` | the engine's own web process bundle |
> | `ABView` (macOS) | the viewer ([viewer.md](viewer.md)) |
> | `inspector.gresource` | the Web Inspector's frontend, for `--inspector` |
> | `lib/` and the remaining libraries | the engine's dependencies: TLS backend, GStreamer and its plugins, fontconfig's configuration, and what they link |

Where 段原文：

> The engine is installed for a user at `~/.o2/lib/abkit` (`%USERPROFILE%\.o2\lib\abkit` on Windows). Clients
> look for the host there:
>
> - **omp** runs `~/.o2/lib/abkit/ABHost` for its `webkit` browser backend. `PI_BROWSER_WEBKIT_PATH`, then the
>   `browser.webkitPath` setting, name another host executable or engine directory; `PI_BROWSER_WEBKIT=0` turns the
>   backend off.
> - **Tern** loads the engine from `~/.o2/lib/abkit` (on macOS it runs `ABHost` there, on Linux and Windows it loads
>   the library in process). `STENCIL_WEBKIT_DIR` names another engine directory; `STENCIL_WEBKIT` picks the engine.

From a release 段原文：

> Releases are published to [build.stencil.so](https://build.stencil.so) as product `abkit`: one archive per target,
> holding the engine directory. Unpack it as `~/.o2/lib/abkit`:
>
> ```sh
> mkdir -p ~/.o2/lib && rm -rf ~/.o2/lib/abkit
> curl -fL https://build.stencil.so/d/abkit/latest/macos-arm64 | tar -xz -C ~/.o2/lib
> ```
>
> Targets: `macos-arm64`, `macos-x86_64`, `linux-x86_64`, `linux-arm64`, `linux-musl-x86_64`, `linux-musl-arm64`,
> `windows-x86_64`, `windows-arm64`. The archive's top directory is `abkit/`.

## 8. 构建 API 原始 JSON 摘录

### 页面 HTML 摘录

`GET https://build.stencil.so/abkit`（2026-11-12 取回）的 HTML 只含挂载节点与内联 module script，页面内容由脚本请求 JSON 后渲染：

```html
<div id="root"></div>
<script type="module" crossorigin>…（内联打包脚本）…</script>
```

`GET https://build.stencil.so/api/products`（2026-11-12 取回）中的产品条目：

```json
{
  "products": [
    { "id": "tern", "name": "Tern", "public": false, "access": false, "latest": null },
    { "id": "omp", "name": "omp", "public": true, "access": true,
      "latest": { "id": "20261112-033623-04cd1a7", "product": "omp", "version": "18.19.0",
                  "channel": "stable", "commit": "04cd1a7549a02d62ad1d24826198d52507595683",
                  "created_at": "2026-11-12T03:36:23Z", "published_at": "2026-11-12T03:38:52Z" } },
    { "id": "ovnfs", "name": "ovnfs", "public": true, "access": true,
      "latest": { "version": "0.5.2" } },
    { "id": "abkit", "name": "ABKit", "public": true, "access": true,
      "latest": { "id": "20261112-031035-84b9006", "product": "abkit", "version": "0.1.0",
                  "channel": "stable", "commit": "84b900694c2531719bf2cde60dc8e5cfc3f6db28",
                  "created_at": "2026-11-12T03:10:35Z", "published_at": "2026-11-12T03:11:13Z" } }
  ]
}
```

`GET https://build.stencil.so/api/products/abkit/builds`（2026-11-12 取回）的构建与产物：

```json
{
  "product": { "id": "abkit", "name": "ABKit", "public": true },
  "builds": [
    {
      "id": "20261112-031035-84b9006",
      "product": "abkit",
      "version": "0.1.0",
      "channel": "stable",
      "commit": "84b900694c2531719bf2cde60dc8e5cfc3f6db28",
      "created_at": "2026-11-12T03:10:35Z",
      "published_at": "2026-11-12T03:11:13Z",
      "files": [
        { "name": "abkit-0.1.0-darwin-arm64.tar.gz", "platform": "macos", "arch": "arm64", "kind": "archive", "size": 166541894, "sha256": "f22303f68743734e2cc98cdb0d8b31820851b0181d47993e026e010103230015", "url": "/d/abkit/20261112-031035-84b9006/abkit-0.1.0-darwin-arm64.tar.gz" },
        { "name": "abkit-0.1.0-darwin-x64.tar.gz", "platform": "macos", "arch": "x86_64", "kind": "archive", "size": 182668427, "sha256": "e577cf3b1d06c805760050ff2b0bdaa4dcfc86449e8dd35280b14dcf6031d938", "url": "/d/abkit/20261112-031035-84b9006/abkit-0.1.0-darwin-x64.tar.gz" },
        { "name": "abkit-0.1.0-linux-x64.tar.gz", "platform": "linux", "arch": "x86_64", "kind": "archive", "size": 170911123, "sha256": "734ea8417ee1227ebd9da404e0a3a19008e1b9dece7f83f0071ee236f7a042f5", "url": "/d/abkit/20261112-031035-84b9006/abkit-0.1.0-linux-x64.tar.gz" },
        { "name": "abkit-0.1.0-linux-arm64.tar.gz", "platform": "linux", "arch": "arm64", "kind": "archive", "size": 163189264, "sha256": "db3584aa1a0b6926c6d858b669a87b396be79d0b75a8ae88c3691d921abcd799", "url": "/d/abkit/20261112-031035-84b9006/abkit-0.1.0-linux-arm64.tar.gz" },
        { "name": "abkit-0.1.0-linux-musl-x64.tar.gz", "platform": "linux-musl", "arch": "x86_64", "kind": "archive", "size": 165426779, "sha256": "e83f4e32bfbe396db221db5f6d903c7dcba983997bef53fbadac3495a2c947ac", "url": "/d/abkit/20261112-031035-84b9006/abkit-0.1.0-linux-musl-x64.tar.gz" },
        { "name": "abkit-0.1.0-linux-musl-arm64.tar.gz", "platform": "linux-musl", "arch": "arm64", "kind": "archive", "size": 157916761, "sha256": "8e40fa8b6d38f5332d130b6e52618d0332451430aecd564ee48433c661341769", "url": "/d/abkit/20261112-031035-84b9006/abkit-0.1.0-linux-musl-arm64.tar.gz" },
        { "name": "abkit-0.1.0-windows-x64.zip", "platform": "windows", "arch": "x86_64", "kind": "archive", "size": 73132655, "sha256": "ed411043791ce978b9cd28c68f6a9d565b85ef077aa96b46a2d5239dd80bc114", "url": "/d/abkit/20261112-031035-84b9006/abkit-0.1.0-windows-x64.zip" },
        { "name": "abkit-0.1.0-windows-arm64.zip", "platform": "windows", "arch": "arm64", "kind": "archive", "size": 69313481, "sha256": "92d1d585b7701b178f5f2792408148132c0c169d8929bae6389704b782e796e1", "url": "/d/abkit/20261112-031035-84b9006/abkit-0.1.0-windows-arm64.zip" }
      ]
    }
  ]
}
```

omp 18.19.0 发行说明中与 ABKit 相关的段落原文：

> - Changed the browser `open` API: `ignore_https_errors` is now `insecure`, `allow_file_access` has been removed, and `file:` pages can access other local files.
>
> - Browser sessions now prefer the bundled ABKit WebKit engine when available, with automatic installation and SHA-256 verification. WebKit provides headed, user-visible tabs and broader browser compatibility; Chromium remains the fallback and can be selected explicitly with `app: "chromium"`, while `app: "webkit"` requires WebKit. Configure this behavior with `browser.webkit` and `browser.webkitPath` or the corresponding environment variables.
> - Browser visibility controls now show or hide WebKit tab windows immediately. Headed WebKit tabs can be interacted with directly, while Chromium tabs retain their existing mode-switching behavior.
> - In Tern environments with native DOM access, browser observation and interaction use trusted native input across frames and closed shadow roots, with caret-aware typing and case-insensitive text selectors.

## 9. omp docs Web & browser 原文摘录

> ## Choose the lightest path that works
>
> | Your task                                                                    | Best path       | Example request                                                                                                 |
> | ---------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------- |
> | Find current information or compare several sources                          | Web search      | `Compare the current Bun and Node.js workspace behavior. Cite the official documentation.`                      |
> | Read a page whose URL you already know                                       | URL reading     | `Read https://example.com/docs/auth and summarize the token refresh rules.`                                     |
> | Use a JavaScript application, click, fill a form, or inspect the rendered UI | Managed browser | `Open the local app, create a test account, and report any validation problems. Do not submit payment details.` |
> | Work inside an account already signed in to Chrome                           | Browser Relay   | `Using my visible Chrome tab titled “Acme Admin,” export the August report and tell me where it downloaded.`    |
>
> Start with search when you do not know the source. Give omp an exact URL when you do. Use browser automation only when rendering or interaction is necessary, and use the relay only when you intentionally want to share your own Chrome state.
>
> For GitHub issues and pull requests, ask omp to use its [GitHub integration](/docs/github) instead. It is structured, cached, and usually more reliable than scraping the site.

URL reading 段原文：

> URL reading extracts clean text from articles, documentation, PDFs, JSON, feeds, and many common developer sites. It does not execute page JavaScript or inherit browser cookies. This makes it faster and less stateful than browser automation, but unsuitable for client-rendered applications, authenticated dashboards, consent flows, and interactive forms.

浏览器自动化的边界原文：

> A site may detect automation, require CAPTCHA or hardware-backed authentication, or block debugger-controlled tabs; take over manually rather than asking omp to bypass the control.

> Browser automation can break when a site changes its DOM, virtualizes content, rate-limits requests, or detects automation.

## 10. 公司与组织

`https://stencil.so/about` 原文摘录：

> # New instruments for building software.
>
> Stencil Labs builds new tools that make agentic development as seamless as it can be. We believe agentic development will revolutionize the way software is built, accelerating human intent at speeds never before possible.
>
> At our core, we're a research company. We build tools we can constantly experiment with, evaluate, improve, and iterate on, and we publish what we learn along the way.
>
> ## Research
>
> - [omp](https://omp.sh), our open-source proving ground for applied AI research.
> - Hashline, an edit format that beats patch for 14 of 16 models.
> - Prewalk, which keeps 92–97% of the frontier pass rate at roughly half the cost.
> - Snapcompact, near-verbatim context recall at a third of the input price.
>
> ## Team
>
> - **Can Bölük**, founder & CEO
>   Systems engineer and security researcher with a decade spent across kernels, reverse engineering, and compilers. Leads product direction and R&D.
> - **Meehir Patel**, co-founder & COO
>   Engineering leader and technical director with years of experience running engineering organizations. Leads partnerships and enterprise adoption from San Francisco.
>
> ## Company
>
> Stencil Labs, Inc. is a Delaware corporation.

GitHub 组织页 facts（2026-11-12 取回）：组织描述 “New instruments for building software.”；公开仓库 8 个，包括 `abkit`（forked from WebKit/WebKit）、`dquickts`、`ovnfs`、`slab`、`vibemon`、`tern-sdk`、`wasm-grammars`；`abkit` 页面显示 326,506 次提交、3 stars。

## 11. 本次核对记录

- 全 wiki `grep` `abkit|ABKit|AgentBrowser` 无命中；本会话前无 ABKit 文章。
- 未下载、未安装、未运行 ABKit；页面伪装、性能与兼容性均未实测。
- 本文只记录 README、docs、构建 API 与 omp 发行说明能直接支持的事实。
