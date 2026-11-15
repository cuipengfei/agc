# 浏览器端 Kitty 图形终端：能力矩阵与可选方案

> Sources: `tsl0922/ttyd` `html/package.json`，2026-11-15 读取；npm registry `@xterm/addon-image@0.9.0` 包内容检查，2026-11-15；`zenbu-labs/terminal-browser` 源码与 README，2026-11-15；`Gaurav-Gosain/sip`、`Gaurav-Gosain/webterm`、`wiedymi/restty`、`NimbleTerminal/ntwebterm`、`Xpra-org/xpra`、`linuxserver/docker-webtop` 仓库描述，2026-11-15
> Raw: [terminal-browser 架构与浏览器端 Kitty 图形终端盘点](../../raw/terminal-graphics/2026-11-15-terminal-browser-and-browser-kitty-terminals.md)
> Updated: 2026-11-15

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

`Gaurav-Gosain/tuios`（6532 star）的 TUIOS Web（`tuios-web`）把完整终端多路复用器放进浏览器，底层使用 `sip` 与 `webterm` 的组件。

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

## 选型对照

| 需求 | 候选 |
|---|---|
| 浏览器里跑普通命令行程序，需要 Kitty 图形 | `sip`（`sip -- <命令>`） |
| 嵌入式终端组件，需要 Kitty 图形 | `webterm`（基于 xterm.js） |
| 高刷新率图形应用，愿意用 WASM 终端引擎 | `restty`、`ntwebterm` |
| 想在浏览器里用现成终端多路复用器 | `tuios-web` |
| 需要完整本地协议、可接受窗口投射 | `xpra`、Webtop + Selkies |
| 在终端字符界面里浏览网页 | `terminal-browser` |

## 证据边界

包内容检查、清单版本、源码常量与 README 原文均为一手直读。上述项目全部未安装、未运行；浏览器内的目视渲染结果、帧率、输入映射细节都未实测。

## See Also

- [终端图像协议支持矩阵](terminal-image-protocol-matrix.md)
- [Tern Surface Protocol](tern-surface-protocol.md)
- [Herdr 与 Plannotator 生态地图](../herdr-plannotator/herdr-plannotator-ecosystem-map.md)
