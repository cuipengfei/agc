# WebAssembly 在浏览器中的运行与显示：官方资料摘录

> Source: WebAssembly.org、Mozilla Developer Network、各语言与工具链的官方文档，链接见各节
> Collected: 2026-11-21
> Published: Unknown

## WebAssembly 与宿主接口

[WebAssembly.org: Portability — API](https://webassembly.org/docs/portability/)：

> WebAssembly does not specify any APIs or syscalls, only an import mechanism where the set of available imports is defined by the host environment.

同一节说明 Web 环境通过 Web Platform 定义的 Web APIs 访问功能；非 Web 环境可以提供标准 Web API、其他标准 API 或自行定义的 API。

[MDN: Using the WebAssembly JavaScript API](https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Using_the_JavaScript_API) 的例子把 JavaScript 函数作为 `imported_func` 导入 WASM，再从 WASM 调用；同一页示例在网页脚本中加载、实例化模块并调用其导出函数。

[MDN: WebAssembly.Module](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Module) 的 Worker 示例先把编译后的模块发送给 Worker，再在 Worker 内实例化并调用导出函数：

> When the module is received, we create an instance from it using the `WebAssembly.instantiate()` method and invoke an exported function from inside it.

这两组示例分别展示页面脚本与 Worker 中的 WASM 执行；宿主提供的接口决定程序可以访问哪些能力。

## DOM、Worker 与画布

[MDN: Document Object Model](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)：

> The DOM represents a document with a logical tree. Each branch of the tree ends in a node, and each node contains objects. DOM methods allow programmatic access to the tree. With them, you can change the document's structure, style, or content.

该页另说明 HTML DOM API 和 SVG API 扩充 DOM 的文档表示。

[MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)：

> you can't directly manipulate the DOM from inside a worker

同页说明 Worker 与页面使用消息通信；Worker 的全局环境不同于页面的 `window`。

[MDN: OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)：

> The `OffscreenCanvas` interface provides a canvas that can be rendered off screen, decoupling the DOM and the Canvas API so that the `<canvas>` element is no longer entirely dependent on the DOM. Rendering operations can also be run inside a worker context

[MDN: transferControlToOffscreen()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen) 说明网页 `<canvas>` 可将控制权交给 `OffscreenCanvas`，对象可在页面主线程或 Worker 使用。sip v0.10.0 实例的 Canvas 创建、转交和 Worker 绘制另见 [sip 传输与 Worker 绘制原始材料](../terminal-multiplexers/2026-11-21-sip-transport-renderer-worker.md)。

## Canvas、WebGL、WebGPU 和图片

[MDN: CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)：

> The `CanvasRenderingContext2D` interface, part of the Canvas API, provides the 2D rendering context for the drawing surface of a `<canvas>` element. It is used for drawing shapes, text, images, and other objects.

[MDN: OffscreenCanvas.getContext()](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas/getContext) 分别列出 `2d`、`webgl`、`webgl2`、`webgpu` 和 `bitmaprenderer` 上下文；标识符不受支持或画布已设置其他上下文时，返回 `null`。页面还说明 `willReadFrequently` 可要求软件实现的 2D Canvas。

[MDN: WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API) 说明 WebGL 在 HTML `<canvas>` 元素中绘制图形，并可使用设备提供的硬件图形加速。WebGL 2 对应 `WebGL2RenderingContext`。

[MDN: WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)：

> It supports graphic rendering, but also has first-class support for GPGPU computations.

该页说明 WebGPU 可以绘制到 `<canvas>` 或离屏目标，也可以执行通用计算；需要安全上下文，浏览器支持情况有差异。[MDN: GPU.requestAdapter()](https://developer.mozilla.org/en-US/docs/Web/API/GPU/requestAdapter) 说明部分浏览器的 fallback adapter 可能使用软件实现。

[MDN: SVG](https://developer.mozilla.org/en-US/docs/Web/SVG) 将 SVG 定义为描述二维矢量图形的 XML 标记语言，并说明它可与 DOM、CSS 和 JavaScript 协作；同页将 JPEG 和 PNG 列为位图格式。[SVG as an image](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image) 列出 HTML `<img>`、`<svg>`、CSS 和 Canvas 等使用方式。[MDN: `<img>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img) 说明该 HTML 元素将图片嵌入文档。

结合宿主导入机制与这些浏览器接口可推得：WASM 程序可以通过宿主代码参与更新 DOM、画布或图片内容；具体方式由应用和宿主决定。

## 源语言与运行时

以下内容来自各项目官方文档，说明具体工具链所提供的路径；WASM 模块的宿主和所需接口随目标不同而变化。

### C 与 C++

[Emscripten: About Emscripten](https://emscripten.org/docs/introducing_emscripten/about_emscripten.html)：

> Compile C and C++ code, or any other language that uses LLVM, into WebAssembly, and run it on the Web, Node.js, or other Wasm runtimes.

该页还列出另一种用途：把其他语言的 C/C++ 运行时编译为 WebAssembly，再间接运行这些语言的代码，并以 Python 和 Pyodide 为例。`emcc` 也生成为编译后代码提供 API 支持的 JavaScript。

### Rust

[The rustc book: wasm32-unknown-unknown](https://doc.rust-lang.org/rustc/platform-support/wasm32-unknown-unknown.html)：

> The `wasm32-unknown-unknown` target is a WebAssembly compilation target which does not import any functions from the host for the standard library.

该文列举此目标的标准库限制，并提到 `wasm-bindgen` 用于 Rust 与 JavaScript 互操作。

### Zig

[Zig: Overview](https://ziglang.org/learn/overview/) 将 Zig 库的使用环境列为：

> In web browsers or other plugins with WebAssembly

同页的交叉编译目标列表包括 `wasm32-wasi-musl`。现有 [wterm 原始材料](2026-11-15-browser-terminal-org-scan.md) 记录 `@wterm/ghostty` 使用 Zig 构建 Ghostty WASM。

### Go

[Go Wiki: WebAssembly](https://go.dev/wiki/WebAssembly) 说明 `GOOS=js`、`GOARCH=wasm` 可生成用于 Web 的 WASM 模块，浏览器运行还需要 JavaScript 支持文件。[Go Blog: WASI support](https://go.dev/blog/wasi) 说明 `wasip1` 是针对 WASI preview 1 的另一条路径，面向提供相应系统接口的宿主。

### Swift

[Swift.org: Getting Started with Swift SDKs for WebAssembly](https://www.swift.org/documentation/articles/wasm-getting-started.html)：

> Starting with Swift 6.2 and development snapshots you can easily cross-compile and run Wasm modules with Swift SDKs for Wasm distributed on swift.org.

该页的构建示例面向 WASI；Experimental Embedded Swift 支持语言子集。

### Kotlin

[Kotlin/Wasm](https://kotlinlang.org/docs/wasm-overview.html)：

> Kotlin/Wasm has the power to compile your Kotlin code into WebAssembly (Wasm) format.

页面区分浏览器的 `wasm-js` 目标与浏览器外的 WASI 目标，并将 Kotlin/Wasm 标为 Beta。

### AssemblyScript

[AssemblyScript: Introduction](https://www.assemblyscript.org/introduction.html)：

> AssemblyScript compiles a variant of TypeScript (a typed superset of JavaScript) to WebAssembly using Binaryen

页面说明它使用 WebAssembly 类型、提前编译，且无法支持全部 TypeScript。FAQ 写明 `AssemblyScript compiles to WebAssembly bytecode directly, statically, ahead-of-time.`

### Java 与 TeaVM

[TeaVM: Wasm GC loader](https://teavm.org/docs/wasm-gc-backend/loader.html)：

> TeaVM compiles Java (and Kotlin) code to WebAssembly GC.

该页说明输出模块还配有 `<name>.wasm-runtime.js`，用于加载及运行时支持。

### C# 与 Blazor WebAssembly

[Microsoft Learn: Blazor WebAssembly build tools and AOT](https://learn.microsoft.com/en-us/aspnet/core/blazor/webassembly-build-tools-and-aot?view=aspnetcore-11.0)：

> Blazor WebAssembly supports ahead-of-time (AOT) compilation, where you can compile your .NET code directly into WebAssembly.

同页说明，未启用 AOT 的 Blazor WebAssembly 应用使用以 WebAssembly 实现的 .NET IL 解释器，并有部分 JIT 运行时支持；这些描述针对该文档中的 Blazor WebAssembly。

### Python 与 Pyodide

[Pyodide: What is Pyodide?](https://pyodide.org/en/stable/project/about.html)：

> Pyodide is a Python distribution for the browser and Node.js based on WebAssembly/Emscripten.

[Pyodide 首页](https://pyodide.org/en/stable/)：

> Pyodide is a port of CPython to WebAssembly/Emscripten.

[Pyodide FAQ](https://pyodide.org/en/stable/usage/faq.html) 说明 Pyodide 使用以 Emscripten 构建的 Python。[Emscripten 官方文档](https://emscripten.org/docs/introducing_emscripten/about_emscripten.html) 将 Python / Pyodide 列为把语言运行时编译为 WASM、再间接执行该语言代码的例子。

## 相关项目原始材料

- [wterm 与其他浏览器端终端实现](2026-11-15-browser-terminal-org-scan.md)
- [Tern 网页终端的 WASM 与 WebGPU 绘制](../tern/2026-11-18-tern-web-font-wasm-rendering-path.md)
- [sip 传输与 Worker 绘制](../terminal-multiplexers/2026-11-21-sip-transport-renderer-worker.md)
