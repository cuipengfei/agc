# ABKit：面向 agent 的 WebKit 浏览器引擎

> Sources: Stencil Labs（stencil-hq/abkit README 与 docs），2026-11-12; build.stencil.so 构建 API，2026-11-12; omp docs Web & browser，2026-11-12; agent-browser 与 chrome-devtools MCP 源材料，2026-11-07; Tern：TSP 与 browser 后端原文摘录，2026-10-10
> Raw: [ABKit README、docs 与构建 API](../../raw/agent-tooling/2026-11-12-abkit-readme-docs-and-builds.md); [agent-browser 与 chrome-devtools MCP 源材料](../../raw/agent-tooling/agent-browser-and-chrome-devtools-mcp-sources.md); [Tern：TSP 与 browser 后端原文摘录](../../raw/omp-tips/2026-10-10-tern-tsp-and-browser-backend.md)
> Updated: 2026-11-12

## Overview

ABKit（AgentBrowser Kit）是 Stencil Labs 维护的浏览器引擎：WebKit 的 WPE port 派生，运行在 macOS、Linux、Windows，附带无窗口宿主 `ABHost`，父进程通过标准输入输出用 JSON 帧驱动。0.1.0 于 2026-11-12 发布，提交 `84b900694c2531719bf2cde60dc8e5cfc3f6db28`。它是 omp 的 `webkit` 浏览器后端，也是 Tern 网页视图的引擎。

## 分层位置

| 层 | 代表 | 角色 | 控制接口 |
|---|---|---|---|
| 引擎 | ABKit | 自带渲染与网络进程的浏览器本体 | `ABHost` 自有 JSON 帧 |
| 驱动器 | agent-browser、chrome-devtools-mcp | 驱动现成 Chrome | Chrome DevTools Protocol |
| 使用方 | OMP `browser` prelude、Tern | 选择并调用引擎 | eval 全局对象、Tern 脚本协议 |

agent-browser 的守护进程通过 Chrome DevTools Protocol 控制 Chrome；chrome-devtools-mcp 用 puppeteer 自动化 Chrome，底层同为 CDP。ABKit 没有 CDP，它自己就是被驱动的一方。`ABHost` 的帧格式与 Tern 的脚本协议同形：`u32` 小端长度加 UTF-8 JSON，`hello` 换 `welcome`，请求按 `id` 关联。因此在 OMP 里它属于 Tern 一类后端，不按 MCP server 接入。

## ABHost 协议

- 启动参数：`ABHost [--data-dir DIR] [--inspector HOST:PORT]`。不带 `--data-dir` 时每个 profile 使用临时目录，宿主退出时删除。
- 帧：4 字节小端长度加 UTF-8 JSON，单帧上限 256 MiB。标准输出只承载协议，诊断写标准错误。
- 握手：`{"hello":{}}` 返回 `{"welcome":{"ops":["browser","dom","console","network","present"]}}`。
- 请求与应答：`{"id":N,"browser":{"op":NAME,…}}` 返回 `ok` 或 `error`；错误 kind 为 `invalid`、`not_found`、`unsupported`、`js`、`failed`。
- block 是一个 web view，id 为正整数且进程内不复用。`open` 默认 `about:blank`、`1280×800`、scale `1`；viewport 允许 `1..16384`，scale 允许 `0.25..8`。
- `events` 保留最近 4096 条，支持按 `seq` 等待；`input` 通过视图发送受信任事件；`capture` 输出 PNG 或 JPEG；`present` 只在 macOS 有效。
- `focus` 默认 `true`；`identity` 设置 `seed`、`screen`、`window`；`fileAccess` 默认关闭。

操作表分四组：block 生命周期与状态（`open`、`close`、`blocks`、`state`、`goto`、`nav`、`viewport`、`events`、`focus`、`present`、`clear`）；页面读取与执行（`dom`、`eval`、`scripts`、`input`、`edit`、`capture`）；页面交互设施（`dialogs`、`dialog`、`files`、`cookies`、`setCookie`、`deleteCookie`、`clipboard`）；环境与身份（`agent`、`appearance`、`allow`、`insecure`、`fileAccess`、`credentials`、`downloads`、`identity`）。

## 页面身份

页面无法判断自己被驱动，这一点不依赖注入页面脚本：

- 视图可见、有焦点、处于活动状态，输入是受信任事件，`navigator.webdriver` 为 `false`。
- 除 `capture` 与 `present` 外不合成、不绘制到缓冲区，动画帧仍保持显示节奏。
- 屏幕与窗口不是 viewport。窗口 `x: 80, y: 60`，宽度等于 viewport，高 87 px；屏幕取 `1920×1080`、`2560×1440`、`3440×1440`、`3840×2160` 中第一个容纳它的，macOS 顶部扣 25 px 菜单栏，其他平台底部扣 40 px。
- 设备被视为桌面：有鼠标键盘、无触摸屏，`(hover: hover)` 与 `(pointer: fine)` 匹配。
- macOS 使用 Safari 的 User-Agent，`window.safari` 存在，字体与表单控件按 Safari 的规则，滚动条覆盖页面且不占空间。
- macOS 与 Linux 的 TLS 握手、HTTP/2 设置与请求头顺序按 Safari 发送；Linux 使用引擎自己的 User-Agent。Windows 使用 MSYS2 原生 TLS。
- 音视频播放但不出声；无摄像头与麦克风；WebAuthn 与 `navigator.share()` 以用户关闭的表单结束；无手柄。
- `identity.seed` 固定 canvas 读回噪声，`identity.screen` 与 `identity.window` 固定对应值；`null` 恢复默认规则。

## 呈现模型

- `ABHost` 没有窗口，viewer 文档首句即 “The host has no window”。
- `present` 把 block 的帧送到另一个进程，不复制像素。macOS 的目标是 `{"mach":NAME}`；Windows 的 `{"hwnd":N}` 与 Linux 的 `{"socket":PATH}` 已保留但返回 `unsupported`。
- macOS 的独立呈现客户端是 `ABView`：不链接引擎，按行读取 JSON，提供 `ready`、`show`、`hide`、`input`、`closed`、`ended`。
- 帧节奏：客户端一秒内发过 `tick` 时按 `tick` 刷新，否则按 60 Hz；每秒 120 个 `tick` 时每秒渲染 120 帧。
- 停止呈现、`close`、宿主退出或目标退出都会结束呈现；之后不再渲染，直到下一次 `capture` 或 `present`。

## 平台与构建

八个目标：`darwin-arm64`、`darwin-x64`、`linux-x64`、`linux-arm64`、`linux-musl-x64`、`linux-musl-arm64`、`windows-x64`、`windows-arm64`。

| 平台 | 绘制 | 能力边界 |
|---|---|---|
| macOS | Metal（ANGLE） | 媒体、Web Audio、WebRTC、MSE、WebCodecs、WebGL、WebGPU、WebAuthn 等；无 GPU 的虚拟机页面加载失败 |
| Linux | 软件（Mesa llvmpipe） | 功能集与 macOS 相同；关闭 WebGPU、WebAuthn、bubblewrap 沙箱、libhyphen |
| Windows | Direct3D 11，回退 WARP | 关闭媒体（含 Web Audio、WebRTC、MSE、WebCodecs）、WebGL、WebGPU、GPU 进程、手柄、WebAuthn、语音；TLS 为 MSYS2 原生 |

Linux 的 glibc 构建要求 glibc 2.35 及以上（Ubuntu 22.04、Debian 12、Fedora 36 起），musl 构建要求 musl 1.2.5 及以上。Linux 在容器里构建，macOS 用 Xcode 与 Homebrew，Windows 从 Linux 交叉编译。

## 安装与接入

引擎是一个自包含目录：`ABHost`、`extensions/`、`libWPEWebKit-2.0.so.1`（或 dylib、dll）、`ABWebProcess`、`ABNetworkProcess`、`libWPEInjectedBundle`、`inspector.gresource`，以及 `lib/` 下的依赖。安装位置是 `~/.o2/lib/abkit`，Windows 为 `%USERPROFILE%\.o2\lib\abkit`。

- **omp**：运行 `~/.o2/lib/abkit/ABHost`。`PI_BROWSER_WEBKIT_PATH` 与 `browser.webkitPath` 指定其他位置；`PI_BROWSER_WEBKIT=0` 关闭后端。
- **Tern**：从 `~/.o2/lib/abkit` 加载。macOS 运行 `ABHost`，Linux 与 Windows 在进程内加载引擎库；`STENCIL_WEBKIT_DIR` 指定其他目录，`STENCIL_WEBKIT` 选择引擎。
- **omp 18.19.0**：浏览器会话优先使用随包的 ABKit WebKit，未安装时自动安装并校验 SHA-256；Chromium 为回退，`app: "chromium"` 显式选择，`app: "webkit"` 要求 WebKit；配置项为 `browser.webkit` 与 `browser.webkitPath`。macOS 上的 headed 标签页可以显示为真实窗口并直接操作。

## 发行页与 API

`build.stencil.so` 是单页应用，页面数据来自 JSON 接口：

- `GET /api/products`：产品列表。`tern` 的 `public` 为 `false`，`omp`、`ovnfs`、`abkit` 为 `true`。
- `GET /api/products/{product}/builds`：某产品的全部构建。

ABKit 0.1.0 的构建 id 为 `20261112-031035-84b9006`，创建于 `2026-11-12T03:10:35Z`，发布于 `2026-11-12T03:11:13Z`，共八个产物：macOS 两个（arm64、x64，`tar.gz`）、Linux 四个（glibc 与 musl 各两个架构，`tar.gz`）、Windows 两个（x64、arm64，`zip`）。查最新版本直接读接口即可，不需要渲染页面。

## 使用判据

omp 官方文档给的是按任务选最轻的路径：

| 任务 | 路径 |
|---|---|
| 查找当前信息或比较多个来源 | Web search |
| 读取已知 URL 的页面 | URL reading |
| 使用 JavaScript 应用、点击、填写表单或检查渲染后的界面 | Managed browser |
| 在已登录 Chrome 的账户里工作 | Browser Relay |

原文的建议：不知道来源时先搜索，知道 URL 时直接给 URL；只有需要渲染或交互时才用浏览器自动化，只有确实想共享自己的 Chrome 状态时才用 relay。GitHub issue 与 PR 使用 GitHub 集成，它结构化、有缓存，通常比抓取页面可靠。

URL reading 不执行页面 JavaScript，也不继承浏览器 Cookie，客户端渲染的应用、已登录后台与交互表单需要浏览器路径。浏览器自动化在站点改变 DOM、虚拟化内容、限流或检测自动化时会失败；站点要求 CAPTCHA、硬件认证或阻止调试器接管时，官方要求人工接管，不要求 omp 绕过这些控制。

ABKit 这类引擎处理的是客户端身份这一层：页面检测自动化时看到的不是自动化客户端；ABKit 不注入页面脚本，页面代码与事件处理路径保持原样。检查自有前端时，feature detection、Safari 专属代码与字体、表单控件差异都依赖真实客户端身份，这是引擎层存在的理由。

## 证据边界

- 内容来自官方 README、`docs/`、构建 API 与 omp 18.19.0 发行说明；未下载、未安装、未运行 ABKit，页面伪装与性能均未实测。
- 发行版为 0.1.0，仓库跟踪 WebKit `main`，行为可能变化。
- Linux 与 Windows 的 `ABHost` 只能 `capture` 取像素；需要窗口或进程内呈现时由使用方自行加载引擎库，Tern 在 Linux 与 Windows 上就是这种方式。

## See Also

- [agent-browser 与 chrome-devtools MCP 对比](agent-browser-vs-chrome-devtools-mcp.md) — 同为 agent 浏览器工具，处在驱动器层
- [OMP browser prelude 与 relay 架构](../omp-tools/browser-prelude-and-relay-architecture.md) — OMP 的浏览器门面与后端路由
- [Tern：TSP 与 browser 后端](../tern/tsp-and-browser-backend.md) — Tern 的脚本协议与浏览器后端选择
