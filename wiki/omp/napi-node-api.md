# Node-API and napi-rs in OMP

> Sources: Node.js documentation (nodejs.org/api/n-api.html); napi-rs documentation (napi.rs); OMP pi-natives package inspection, 2026-09-27
> Raw: [Node-API (N-API) and napi-rs — source excerpts](../../raw/omp/2026-09-27-node-api-napi-rs-overview.md)
> Updated: 2026-09-27

## Overview

Node-API（旧称 N-API）是 Node.js 官方提供的、给原生扩展（native addon）用的稳定接口。napi-rs 是在 Rust 里使用 Node-API 的框架。OMP 的原生插件 `pi_natives` 就是用 napi-rs 构建的，TS 侧通过 `import { TextPredictor } from "@oh-my-pi/pi-natives"` 这样的普通 import 调用 Rust 功能。

## Node-API 是什么

Node.js 官方文档原文："Node-API (formerly N-API) is an API for building native Addons. It is independent from the underlying JavaScript runtime (for example, V8) and is maintained as part of Node.js itself. This API will be Application Binary Interface (ABI) stable across versions of Node.js. It is intended to insulate addons from changes in the underlying JavaScript engine and allow modules compiled for one major version to run on later major versions of Node.js without recompilation."

核心特性：一个针对特定 Node-API level 编译的原生扩展，可以在后续 Node.js 版本上加载而不重新编译，因为扩展不直接依赖 V8 内部 API，而是通过 Node-API 的函数集与运行时交互。文档同段原文："Instead of using the V8 or Native Abstractions for Node.js APIs, the functions available in Node-API are used."

## ABI 稳定性的边界（限定于 Node.js）

napi-rs 的 support-compatibility 文档把这个保证限定得很清楚，原文："Node-API provides ABI stability across Node.js versions. A native binary built against Node-API level `N` can generally load on later Node.js releases that still provide level `N`, without rebuilding for every Node major."

同页明确列出保证**不包含**的范围，原文："That guarantee does not cover: APIs introduced after the selected Node-API level. Operating-system, CPU, libc, C++ runtime, or minimum deployment-target compatibility. Bugs in an alternate runtime's Node-API implementation. Native libraries linked by your own dependencies."

因此一个 Linux x64 的 `.node` 不能拿到 macOS 或 ARM 上跑，glibc 和 musl 也要分开编。这解释了 OMP 为什么按平台分包（`pi-natives-linux-x64`、`pi-natives-darwin-arm64` 等）。

## 替代运行时：Bun 是 best effort，不是 Node-API 保证

Node-API 的跨版本 ABI 保证针对的是 **Node.js**。其他运行时（Bun、Deno）的 Node-API 支持是各自运行时的实现，不在 Node-API 保证范围内。

napi-rs support-compatibility 文档的 JavaScript runtimes 表把 Bun 明确标为 "Best effort"，原文："Best effort. The source repository runs a latest-Bun job, but the test step is `continue-on-error`, so Bun failures do not block napi-rs releases. Test your actual addon before claiming support."

OMP 本机证据：`pi-natives/package.json` 的 engines 字段声明 `"bun": ">=1.3.14"`，且本机 OMP 在 Bun 下运行、`pi_natives` 被正常加载（预测 daemon 进程 `__omp_worker_text_predict` 由 bun 拉起并加载 `TextPredictor`）。这是本机实测证据，不是从 Node-API 的 Node.js ABI 保证推广而来。

## napi-rs 是什么

napi-rs 是在 Rust 里构建 Node.js 原生扩展的框架和工具链。getting-started 文档给出的构建产物原文："It produces: `<binaryName>.<platform-arch-abi>.node`, the native addon. `index.js`, the generated loader. `index.d.ts`, the generated TypeScript declarations when type generation is enabled."

关键约束（同文档）：
- 最低 Rust 版本 "Rust 1.88 or newer, including Cargo"
- Rust 侧用 `#[napi]` 暴露：源文件表原文 "`src/lib.rs` | Rust functions, structs, and classes exported with `#[napi]`"
- 平台分发："napi-rs normally publishes a small root package plus one optional package per platform"，生成的 `index.js` 在安装后按当前操作系统、CPU、Linux libc 加载匹配的平台包

## OMP 的使用证据

`pi-natives/package.json`（v18.3.5）的直接证据：

- devDependencies 包含 `"@napi-rs/cli": "3.7.2"`
- napi 配置块：`{ "binaryName": "pi_natives", "triples": {} }`
- description："Native Rust bindings for PDF conversion, audio, WebRTC, grep, clipboard, image processing, syntax highlighting, PTY, and shell operations via N-API"

二进制符号证据：`pi_natives.linux-x64-modern.node` 中包含 `napi_register_module_v1` 符号，确认这个 `.node` 通过 Node-API 注册模块。

## See Also

- [OMP Rust/TS architecture and pi-natives](rust-ts-architecture.md)
- [OMP predictive text engine](predictive-text-engine.md)
- [OMP 本地构建：依赖、步骤、产物与验证](local-build.md)
