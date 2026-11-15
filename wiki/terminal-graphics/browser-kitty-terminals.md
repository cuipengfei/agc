# 浏览器端 Kitty 图形终端：能力矩阵与可选方案

> Sources: `tsl0922/ttyd` `html/package.json`，2026-11-15 读取；npm registry `@xterm/addon-image@0.9.0` 包内容检查，2026-11-15；`zenbu-labs/terminal-browser` 源码与 README，2026-11-15；`Gaurav-Gosain/sip`、`Gaurav-Gosain/webterm`、`wiedymi/restty`、`NimbleTerminal/ntwebterm`、`Xpra-org/xpra`、`linuxserver/docker-webtop` 仓库描述，2026-11-15；`vercel-labs/wterm`、`coder/ghostty-web`、`coder/code-server`、`devswha/ovis`、`Textualize/textual-web`、`xichan96/dinotty`、`ekzhang/sshx`、`Eugeny/tabby-web` 的 README、文件树、patch 与源码，2026-11-15；本机 go version -m 实测，2026-11-16
> Raw: [terminal-browser 架构与浏览器端 Kitty 图形终端盘点](../../raw/terminal-graphics/2026-11-15-terminal-browser-and-browser-kitty-terminals.md); [Vercel Labs 与 Coder 组织扫描及补齐](../../raw/terminal-graphics/2026-11-15-browser-terminal-org-scan.md); [tuios 0.13.1 升级语义、sip 依赖与 uv-bun 集成](../../raw/terminal-multiplexers/2026-11-16-tuios-0-13-1-sip-dependency-and-uv-bun.md)
> Updated: 2026-11-16

## 判断门槛

在浏览器标签页里渲染终端，同时要显示 Kitty 图形协议产生的像素，需要前端自己实现该协议。多数 Web 终端直接使用 `xterm.js`，而 `xterm.js` 的图像插件目前还没有把 Kitty 图形带进发布包。

`@xterm/addon-image@0.9.0` 的发布 tarball 只有四个文件：`lib/addon-image.js`、`lib/addon-image.js.map`、`lib/addon-image.mjs`、`lib/addon-image.mjs.map`。对 `.mjs` 全文检索 `kitty` 与 `10EEEE`，命中数为 0。

`ttyd` 上游 `html/package.json` 锁定 `"@xterm/addon-image": "^0.8.0"`；本机 `ttyd` 1.7.7 锁定的是 `^0.7.0`。两个版本都早于含 Kitty 代码的构建，因此 `ttyd` 当前不显示 Kitty 图形。

## 浏览器端实现的四条路线

### 路线一：在 xterm.js 之上叠加 Kitty 图层

`Gaurav-Gosain/webterm`（7 star）的仓库描述原文：`An embeddable browser terminal built on xterm.js, with kitty graphics, a clipboard that works on insecure origins, and reference-checked unicode widths.`

`Gaurav-Gosain/sip`（30 star）把它作为前端：README 写明 `static/webterm.js` 是 webterm 包的独立构建，内联了 `xterm.js` 及其 fit、webgl、canvas、web-links、image、unicode-graphemes 插件，再加上 kitty overlay、剪贴板层、宽度覆盖、传输层、缓冲搜索与触摸层。README 的图注写明图像「在浏览器里从程序写出的 kitty escape 解码」。

`sip` 的用法有两种：`sip -- htop` 直接跑一条命令，或 `server.Serve` 为每个浏览器会话跑一个 Bubble Tea model。传输优先 WebTransport，不支持时回退 WebSocket。终端窗口尺寸带像素维度，让 Kitty 图形工具能按 cell grid 计算图像尺寸。

`sip` 还有两条可选渲染路径：`static/webterm-vtgl.js`（可选 vtgl 渲染器）与 `static/engine/`（实验性 worker 引擎，`libghostty-vt` 加 WebGL2，在 Web Worker 内运行）。

### 路线二：WASM 终端引擎加 WebGPU

`wiedymi/restty`（420 star）描述原文：`Powerful, lightweight web terminal. Batteries included. Powered by libghostty-vt, WebGPU, and text-shaper.`

`NimbleTerminal/ntwebterm`（1 star）描述原文：`Browser-embedded Ghostty terminal, with an xterm.js-compatible API, with WebGPU-driven Kitty graphics`。

### 路线三：终端多路复用器自带 Web 端

`Gaurav-Gosain/tuios`（6532 star）的 TUIOS Web（`tuios-web`）把完整终端多路复用器放进浏览器，前端使用 `webterm` 的组件，服务端经 `go.mod` 依赖 `sip`；`tuios` 本体的模块依赖表中没有 sip（2026-11-16 本机 `go version -m` 实测 `tuios-web` 固定 `github.com/Gaurav-Gosain/sip v0.10.0`）。

### 路线四：把原生终端窗口投射到浏览器

`Xpra-org/xpra`（3065 star）描述原文：`Persistent remote applications for X11; screen sharing for X11, MacOS and MSWindows.` 它可以把单个原生程序窗口投射到浏览器，终端因此保留完整的本地协议支持。

`linuxserver/docker-webtop`（4510 star）与 `selkies-project/selkies`（2562 star）组合提供浏览器内桌面，桌面里可以直接运行原生终端。

## terminal-browser 自身

`zenbu-labs/terminal-browser`（4648 star）用 Electron 的离屏渲染 API 从 Chromium 取像素，网站视觉变化时只向终端发送覆盖变化区域的小块补丁；输入通过终端事件与一个后台 swift 应用补齐。

取帧按平台分支：macOS 用 `useSharedTexture: true` 与 `sharedTexturePixelFormat: "argb"`；Linux 用 `useSharedTexture: false` 加 `useSharedMemory: SHM_FRAMES`，其中 `SHM_FRAMES = process.platform === "linux" && process.env.PIXEL_SHM !== "0"`。模式串为 `shared-texture`、`shm`、`bitmap` 三者之一。设置 `PIXEL_DISABLE_GPU=1` 会给 Chromium 加 `--disable-gpu`。

协议序列层面，`pixel-kitty` 的 `kitty.rs` 同时包含 `t=d`（direct）与 `t=s`（shared memory）两条传输路径，以及 `a=T` 整图、`a=t` 小图、`a=p` 放置、`a=f` 帧编辑、`a=d` 删除，并使用 `\u{10EEEE}` 作为占位符、支持 `\x1bPtmux;` 包装。

Presenter 选择在 `present/mod.rs` 的 `select()`；`relayed` 为真时返回 `Presenter::Full`（除非强制 `animation` 且允许帧编辑）。传输策略由 `TransmitStrategy` 的 `Patches`、`Flatten`、`Skip` 三种形态决定；`Flatten` 的触发原因包括窗口尺寸变化、像素预算超限、patch id 或 layer 用尽、空闲。

Windows 上的前提是安装在 WSL 内，且外层宿主终端支持 Kitty 图形；README 声明在 Windows 下只实测过 `noctty.com`。

安装脚本 `https://terminal-browser.sh/install` 当前版本 v0.15.3，四个平台各自带 SHA-256 与字节数，例如 linux-x64 为 138500865 字节。程序解包到 `$XDG_DATA_HOME/terminal-browser/app`（默认为 `~/.local/share/terminal-browser/app`），命令入口放在 `$XDG_BIN_HOME`（默认为 `~/.local/bin`）。


## Vercel Labs 与 Coder 组织

### vercel-labs/wterm：DOM 渲染加可选 Ghostty 核心

`wterm`（3683 star，快照 2026-11-15 09:19:40Z）把终端行画成 DOM 文本，内置核心是 Zig 写的 VT 解析器（约 49 KB WASM），只覆盖基础 VT100/VT220/xterm，不含 Kitty 图形。`@wterm/ghostty` 核心从 ghostty v1.3.1 源码编成约 580 KB WASM，DOM 层把 direct Kitty Graphics Protocol 的 PNG/RGB/RGBA 画成受限的临时 canvas 覆盖层，pinned placement 跟随滚动与换屏；sixel、iTerm2/OSC 1337、动画、file/shared-memory/URL 媒体与持久化不支持。`kitten icat --transfer-mode=stream` 与 `--detect-support` 可用，上游 libghostty 的 freestanding 构建默认关闭 Kitty 图形，wterm 靠自维护补丁打开。本地 shell 示例后端用 `node-pty`，Linux 可运行。Apache-2.0。

### coder/ghostty-web：Ghostty WASM，Kitty 图形仍是开放需求

`ghostty-web`（3062 star，同一快照）把 Ghostty 解析器编成 WASM，提供 xterm.js 兼容 API（约 400 KB，零运行时依赖）。仓库补丁只涉及 Kitty 键盘协议与颜色操作（颜色操作注释写明 WASM 上下文不支持），渲染 API 只有 cell 没有图像表面；issue #197「feat(addons): kitty graphics protocol support (KittyGraphicsAddon)」仍为 open。demo 在 Linux 与 macOS 上体验最佳。MIT。

### coder/code-server：集成终端无 Kitty 图形

`code-server`（79869 star，同一快照）是浏览器里的 VS Code，集成终端基于 xterm.js。仓库文件树全量检索 `kitty`/`sixel` 命中 0，issue 检索也无 Kitty 图形议题，没有支持证据。

## 其它补齐候选

### devswha/ovis：xterm 之上叠加 libghostty-vt 覆盖层

`ovis`（2065 star，同一快照）是 herdr 的浏览器与手机客户端，Linux 有 deb 包与一行安装脚本。终端实际渲染是 xterm.js 加一层 libghostty-vt 的 DOM 覆盖层：覆盖层源码注释写明 libghostty-vt draws every xterm terminal's screen, Kitty graphics pictures included；其 `ghostty-vt.wasm` 用 `kitty-on-wasm.patch` 在 wasm32-freestanding 上打开上游默认关闭的 Kitty 图形并链接 wuffs PNG 解码，xterm 继续处理输入以及 sixel 与 iTerm2 图片。

### wiedymi/restty：WebGPU 绘制 Kitty 图片

`restty`（420 star，同一快照）是 libghostty-vt WASM 加 WebGPU（WebGL2 回退）的浏览器终端渲染库。仓库内有完整的 Kitty 实现文件（`src/wasm/runtime/kitty.ts` 读取 placement，`kitty-render-runtime.ts` 建 WebGPU/WebGL2 纹理与图片缓存）以及三个 Kitty 图形测试，目前是 early-release。

### 其余候选

- `ekzhang/sshx`（7717 star，同一快照）：终端前端是 xterm.js（`src/lib/ui/XTerm.svelte`），树内无 kitty 文件，无 Kitty 图形。
- `Eugeny/tabby-web`（1532 star，同一快照）：Tabby 终端的 Web 版，底层是 xterm.js 系，树内无 kitty 文件；README 注明作者目前无时间维护。Docker 部署，Linux 可运行。
- `Textualize/textual-web`（1479 star，同一快照）：在浏览器发布 Textual 应用与终端；README 注明终端模式仅在 macOS 与 Linux 可用；树内无 kitty/sixel 文件，Kitty 图形未确认。
- `xichan96/dinotty`（739 star，同一快照）：服务端 VTE 状态机的多设备终端，Rust 单二进制加 Vue 3 前端，Linux 一键安装；树内无终端图像协议文件，Kitty 图形未确认。

## 候选总表

star 为 `stargazers_count` 原值，快照时间 2026-11-15（09:19:40Z 与 09:24:54Z 两批）。

| 项目 | star | Linux | 浏览器标签页 | Kitty 图形 |
|---|---|---|---|---|
| coder/code-server | 79869 | 支持 | 满足 | 无证据 |
| tsl0922/ttyd | 12636 | 支持 | 满足 | 无（sixel + iTerm IIP） |
| ekzhang/sshx | 7717 | 支持 | 满足 | 无（xterm.js） |
| Gaurav-Gosain/tuios | 6532 | 支持 | 满足 | 完整渲染 |
| zenbu-labs/terminal-browser | 4649 | 支持 | 满足 | 支持 |
| linuxserver/docker-webtop | 4510 | 支持 | 满足 | 桌面投射 |
| vercel-labs/wterm | 3683 | 支持 | 满足 | `@wterm/ghostty` 核心支持 direct PNG/RGB/RGBA |
| Xpra-org/xpra | 3065 | 支持 | 满足 | 窗口投射 |
| coder/ghostty-web | 3062 | 支持 | 满足 | 尚未支持（issue #197） |
| selkies-project/selkies | 2562 | 支持 | 满足 | 桌面投射 |
| devswha/ovis | 2065 | 支持 | 满足 | 支持 |
| Eugeny/tabby-web | 1532 | 支持 | 满足 | 无证据 |
| Textualize/textual-web | 1479 | 终端模式仅 macOS/Linux | 满足 | 未确认 |
| xichan96/dinotty | 739 | 支持 | 满足 | 未确认 |
| wiedymi/restty | 420 | 支持 | 满足 | 支持 |
| Gaurav-Gosain/sip | 30 | 支持 | 满足 | 支持 |
| Gaurav-Gosain/webterm | 7 | 支持 | 满足 | 支持 |
| NimbleTerminal/ntwebterm | 1 | 未确认 | 满足 | 描述自称 WebGPU-driven Kitty graphics |

## 选型对照

| 需求 | 候选 |
|---|---|
| 浏览器里跑普通命令行程序，需要 Kitty 图形 | `sip`（`sip -- <命令>`） |
| 嵌入式终端组件，需要 Kitty 图形 | `webterm`（基于 xterm.js）、`@wterm/ghostty`（wterm 的 Ghostty WASM 核心） |
| 终端库要 Ghostty 解析器 | `ghostty-web`（Kitty 图形仍未实现）、`restty`（已实现） |
| herdr 场景的浏览器终端客户端 | `ovis`（ghostty-vt 覆盖层，Kitty 图形可用） |
| 高刷新率图形应用，愿意用 WASM 终端引擎 | `restty`、`ntwebterm` |
| 想在浏览器里用现成终端多路复用器 | `tuios-web` |
| 需要完整本地协议、可接受窗口投射 | `xpra`、Webtop + Selkies |
| 在终端字符界面里浏览网页 | `terminal-browser` |
| 浏览器里跑完整 VS Code | `code-server`（集成终端无 Kitty 图形） |

## 证据边界

包内容检查、清单版本、源码常量、patch 与 README 原文均为一手直读。上述项目全部未安装、未运行；浏览器内的目视渲染结果、帧率、输入映射细节都未实测。「无证据」「未确认」的条目为文件树全量检索与 issue 检索后的结论，检索范围是各仓库默认分支完整文件树。

## See Also

- [终端图像协议支持矩阵](terminal-image-protocol-matrix.md)
- [Tern Surface Protocol](tern-surface-protocol.md)
- [Herdr 与 Plannotator 生态地图](../herdr-plannotator/herdr-plannotator-ecosystem-map.md)
- [sip v0.10.0 使用参考](../terminal-multiplexers/sip-v0.10.0-usage-reference.md)
- [ttyd 与 sip 并存部署](../terminal-multiplexers/ttyd-and-sip-side-by-side.md)
