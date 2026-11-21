# WebAssembly 在浏览器中的运行与显示

> Sources: WebAssembly.org 与 Mozilla Developer Network 浏览器接口文档，2026-11-21；各语言编译器及运行时官方文档，2026-11-21；Gaurav-Gosain/sip v0.10.0 源码；Vercel Labs/wterm 终端实现资料，2026-11-15；Tern 0.9.23 网页客户端静态资料与浏览器记录，2026-11-18
> Raw: [WebAssembly 浏览器显示资料](../../raw/terminal-graphics/2026-11-21-webassembly-rendering-targets.md); [sip 传输与 Worker 绘制](../../raw/terminal-multiplexers/2026-11-21-sip-transport-renderer-worker.md); [浏览器端终端实现与组织调查](../../raw/terminal-graphics/2026-11-15-browser-terminal-org-scan.md); [Tern 网页终端的 WASM 与 WebGPU 绘制](../../raw/tern/2026-11-18-tern-web-font-wasm-rendering-path.md)
> Updated: 2026-11-21

## Overview

WebAssembly（WASM）是程序模块的格式，宿主决定模块可以调用哪些外部接口。浏览器中的 WASM 程序可以与 JavaScript 和 Web API 配合，更新网页元素或向画布提供绘图数据。Worker 是浏览器的后台执行环境；WASM 可以在页面主线程或 Worker 中运行。

## 宿主、JavaScript 与 Worker

WASM 的导入机制允许宿主提供函数等能力。浏览器网页可以把 JavaScript 函数导入 WASM 模块，再由这些函数调用 DOM、Canvas 或其他 Web API；编译工具链也可以提供绑定代码。具体可用接口由宿主环境决定。

页面的 DOM 是文档对象树，可以包含文字、按钮、`<svg>`、`<canvas>` 和 `<img>` 等元素。Worker 不能直接操作页面 DOM；需要更新 DOM 时，Worker 可以向页面线程发送消息，由页面线程处理。

页面也可以把 `<canvas>` 的控制权转为 `OffscreenCanvas` 并交给 Worker。Worker 在自己的执行环境中取得绘图上下文，绘图结果显示在关联的页面画布上。

## 显示方式

| 方式 | 浏览器中的角色 | WASM 程序可以参与的工作 |
|---|---|---|
| HTML 元素 | DOM 提供文字、按钮、输入框等页面元素 | 计算内容，经宿主接口创建或更新元素 |
| SVG | 矢量图形标记，可作为 DOM 内容或图片 | 生成图形数据，由浏览器显示和缩放 |
| Canvas 2D | 在画布上绘制形状、文字和图片 | 生成数据，调用画布的 2D 接口绘制 |
| WebGL2 / WebGPU | 图形接口，可绘制到 Canvas；WebGPU 也支持通用计算 | 提供绘图数据或计算数据，由浏览器图形接口处理 |
| `<img>` | 在网页中嵌入图片；图片可使用 PNG、JPEG 或 SVG 等格式 | 生成或处理图片数据，由宿主提供给图片元素 |

Canvas 是绘图表面，PNG 与 JPEG 是位图格式，SVG 是矢量图形格式；WebGL2 和 WebGPU 是图形接口。SVG 也可以作为图片或 Canvas 的绘图来源。WASM 使用哪种显示方式由应用和宿主共同决定。

WebGL 可使用设备的硬件图形加速。WebGPU 适配器也可能由软件实现；使用哪个适配器以及是否具备硬件加速，取决于浏览器和设备。WebGPU 需要安全上下文，浏览器支持情况有差异。

## 源语言与运行时

不同语言使用各自的工具链生成 WASM；生成的模块仍可能需要语言运行库、JavaScript 加载器和宿主接口。以下是官方文档中的实例：

| 语言 | WASM 路径 |
|---|---|
| C、C++ | Emscripten 将应用代码编译为 WASM，并可生成提供宿主接口的 JavaScript。 |
| Rust | `rustc` 提供 `wasm32-unknown-unknown` 等目标；`wasm-bindgen` 可连接 JavaScript。 |
| Zig | Zig 支持面向 WASM 的目标；wterm 使用 Zig 构建 Ghostty WASM。 |
| Go | 官方编译器支持浏览器的 `GOOS=js`、`GOARCH=wasm` 目标，也支持面向 WASI 宿主的 `wasip1`。 |
| Swift | Swift Wasm SDK 可以交叉编译模块；官方示例使用 WASI 宿主。 |
| Kotlin | Kotlin/Wasm 提供浏览器和 WASI 目标；项目文档将其标为 Beta。 |
| AssemblyScript | 将带有 WebAssembly 类型的 TypeScript 语法变体提前编译为 WASM；它支持部分 TypeScript 特性。 |
| Java | TeaVM 的 Wasm GC 后端生成 WASM 模块，并附带 JavaScript 运行时支持。 |
| C# / .NET | Blazor WebAssembly 可在 WASM 中使用 .NET IL 解释器，也可通过 AOT（提前编译）把 .NET 代码编译为 WASM。 |
| Python | Pyodide 将 CPython 移植到 WASM；Python 代码由其中的运行时执行。 |

WASI 为 WASM 宿主提供系统接口；浏览器中的应用通常通过 Web API 与网页交互。不同目标需要的浏览器功能或宿主接口可能不同。

## 浏览器终端实例

sip v0.10.0 的 Worker engine 将 libghostty-vt 编译成 WASM，用它处理终端状态。网络 Worker 接收终端数据，另一个 Worker 使用 OffscreenCanvas 绘图：先尝试 WebGL2，必要时使用 Canvas 2D。字形由浏览器按字体生成像素图集；WebGL2 再根据终端状态绘制。实际 GPU 使用情况和 Kitty 图片显示的证据边界见 [sip 使用参考](../terminal-multiplexers/sip-v0.10.0-usage-reference.md)。

Vercel Labs 的 wterm 资料提供了另一种组合：`@wterm/ghostty` 通过 Zig 构建 Ghostty WASM，`@wterm/dom` 负责 DOM 渲染。这两个实例说明终端核心使用 WASM 时，页面仍可选择 DOM 或 Canvas 绘制。wterm 的这条记录来自源码资料，未安装运行。

Tern 0.9.23 的网页客户端在 WASM 内进行文字排版与字形光栅化，生成的位图上传到 WebGPU 纹理图集，再将终端画面绘制到 Canvas。该记录来自 Tern 官方客户端资源与浏览器观察。

## See Also

- [sip v0.10.0 使用参考](../terminal-multiplexers/sip-v0.10.0-usage-reference.md)
- [浏览器端 Kitty 图形终端](browser-kitty-terminals.md)
