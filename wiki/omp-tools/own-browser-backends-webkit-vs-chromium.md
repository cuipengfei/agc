# OMP 自有浏览器后端：WebKit 与 Chromium 对照

> Sources: 本机安装包 `@oh-my-pi/pi-coding-agent` 19.0.1 的浏览器提示词、后端驱动与设置源码, 2026-11-20; ABKit 官方 README 与 docs（经既有 raw 转引）, 2026-11-12
> Raw: [自有浏览器后端源码摘录](../../raw/omp-tools/2026-11-20-omp-own-browser-backends-webkit-vs-chromium.md); [19.0.1 路由、下载顺序与开关语义](../../raw/omp-tools/2026-11-20-omp-19-browser-backend-routing-and-downloads.md); [ABKit README、docs 与构建 API](../../raw/agent-tooling/2026-11-12-abkit-readme-docs-and-builds.md)
> Updated: 2026-11-20

## Overview

OMP 的自有浏览器有两个后端：ABKit 的 WebKit 引擎（`ABHost`）和受管 Chromium（puppeteer-core 驱动）。默认无头标签在引擎安装后走 WebKit，引擎缺失或标签需要可见窗口时走 Chromium。两者的差别集中在页面身份、空闲渲染与可用的诊断与模拟手段：WebKit 在不可探测性和空闲成本上占优，Chromium 在能力面上更全。

## 选择规则

- 无 `app` 时，自有浏览器先看 WebKit 是否安装：装了用无头 WebKit，没装用受管 Chromium。
- 可见窗口只在引擎带视图程序的平台归 WebKit。`VIEWER_PLATFORMS` 只有 `darwin`，Linux 与 Windows 上 `headed: true` 交给 Chromium。
- 显式 `app: "webkit"` 要求引擎，缺失时下载，下载失败或平台没有视图程序而要求 headed 时报错；引擎启动失败则自动回退 Chromium。
- 显式 `app: "chromium"` 跳过 WebKit。
- `browser.webkit: false` 只关闭自动选择；`PI_BROWSER_WEBKIT=0` 是硬关闭，此时 `app: "webkit"` 直接报错且不下载。

## ABKit 更强的地方

**页面身份。** 引擎层的视图始终可见、有焦点且处于活动状态，输入是受信任事件，页面看不到自动化标记。`observe`、选择器、输入、`console`、`errors`、`requests`、HAR 与 network-idle 等待都由引擎协议提供，不向页面注入脚本。Chromium 一侧要达到同等效果，需要关闭 puppeteer 的默认参数并注入 14 个 stealth 补丁脚本。

**空闲成本。** WebKit 标签除 `capture` 与 `present` 之外不合成、不绘制，动画帧仍按显示节奏推进。Chromium 标签在页面有动画时持续绘制，需要 `browser.freezeOnTurnEnd` 在回合结束时冻结。

**客户端身份。** macOS 上按 Safari 发送 UA、TLS 握手、HTTP/2 设置与请求头顺序，`window.safari` 存在，字体与表单控件按 Safari 规则；Linux 使用引擎自己的 UA。检查自家前端的 Safari 分支与表单控件差异依赖这一层。

**媒体策略。** 音视频静音播放，不出声；摄像头与麦克风请求被拒绝；WebAuthn 与 `navigator.share()` 以用户关闭的表单结束。

## Chromium 更强的地方

- **WebMCP**：`webmcp*` 三个 helper 在 WebKit 后端直接报不支持。
- **性能诊断**：`traceStart`/`traceStop` 与 `profileStart`/`profileStop` 需要 DevTools 协议，WebKit 后端没有。
- **设备与媒体模拟**：移动端与 touch viewport、CSS media 覆写、CPU throttling 都不支持。
- **PDF**：WebKit 后端只有 WKWebView 的分页结果，布局选项（页边距、页码范围等）不可用。
- **可见窗口**：非 macOS 平台没有视图程序，需要用户看见的标签只能交给 Chromium。
- **网页兼容兜底**：DRM 视频、speech synthesis 一类页面在 WebKit 上异常时，按提示改用 `app: "chromium"` 重开。

## 两侧共同的限制

`route`、`emulate` 的 `geolocation`/`locale`/`offline`、`vitals`、`reactEnable`、`init_scripts`、录制的光标浮层，以及 `evaluate` 留下的代码，在 WebKit 后端同样会把可检测代码放进页面世界。指纹站点上，两侧都要避开这些 helper；差别只在默认路径——WebKit 的默认读取与输入不注入脚本，Chromium 的隐身始终依赖补丁与参数调整。

## 平台差异

Linux 的 ABKit 用 Mesa llvmpipe 软件绘制，功能集与 macOS 相同，但关闭 WebGPU、WebAuthn、bubblewrap 沙箱与 libhyphen。Windows 进一步关闭媒体、WebGL、WebGPU、GPU 进程与语音。能力差异与性能差异是两件事：本机没有安装引擎，伪装效果与渲染速度都未实测。

## 本机状态（2026-11-20）

WSL 内 `~/.o2` 不存在，`/usr/bin/chromium` 与 `~/.omp/puppeteer` 的 Chrome for Testing 都可用，因此默认打开走受管无头 Chromium，不触发任何下载。要体验 WebKit 后端，显式 `app: "webkit"` 会下载引擎到 `~/.o2/lib/abkit`。

## See Also

- [OMP browser prelude 与 relay 架构](browser-prelude-and-relay-architecture.md)
- [ABKit：面向 agent 的 WebKit 浏览器引擎](../agent-tooling/abkit-agent-browser-engine.md)
- [agent-browser 与 chrome-devtools MCP 对比](../agent-tooling/agent-browser-vs-chrome-devtools-mcp.md)
