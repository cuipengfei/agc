# OMP 本地构建：源码与官方安装说明摘录（v18.8.7）

> Source: 本机 oh-my-pi 仓库 v18.8.7（commit f261ed9faf16b61880b544f599876bface4ded0d）源码文件；Rust 官方文档 doc.rust-lang.org；Bun 官方文档 bun.sh；rustup 官方站点 rust-lang.org
> Collected: 2026-10-10
> Published: Unknown

本文件保存构建所依据的源码片段与官方安装说明的要点，供 wiki 文章引用。所有行号对应 v18.8.7（commit f261ed9）。

## 工具链锁定

`rust-toolchain.toml`（第 1-4 行）：

- channel = "nightly-2026-10-06"
- components = rustfmt, clippy, rust-analyzer
- targets 含 x86_64-unknown-linux-gnu、x86_64-pc-windows-msvc、aarch64-pc-windows-msvc

仓库在构建目录执行 cargo 时，rustup 按此文件选择 toolchain。

## 为什么必须 nightly

`crates/pi-natives/src/lib.rs:23`：`#![feature(alloc_error_hook)]`

`crates/pi-natives/src/crash_handler.rs:96`：`std::alloc::set_alloc_error_hook(...)`，用于 OOM 崩溃诊断。

Rust 官方 stable 文档 https://doc.rust-lang.org/stable/std/alloc/fn.set_alloc_error_hook.html 原文标注：

> 🔬 This is a nightly-only experimental API. (`alloc_error_hook` #51245)

文档示例以 `#![feature(alloc_error_hook)]` 开头。该 API 至今未稳定，stable 工具链无法编译 crash_handler.rs:96 这一行。因此 nightly 是源码的实际需求，不是可选项。

## Linux 系统依赖

`Dockerfile`（第 44-49 行）安装组与注释说明：

- pkg-config —— 构建脚本探测依赖
- libssl-dev —— openssl 链接
- clang + libclang-dev —— bindgen 生成 pipewire-sys / libspa-sys 绑定（Linux 桌面采集）
- cmake + make + ninja-build —— opusic-sys 用 CMake 构建内置 libopus

`.cargo/config.toml`（第 6-14 行）：CMake 使用 Ninja 生成器；配置 Cargo unstable embed-metadata。

## 原生构建后端与 profile

`scripts/bazel-natives.ts`（第 380-406 行）：host 目标默认使用 Cargo / N-API 后端；装有 bazelisk 且设 `OMP_NATIVE_BUILD_BACKEND=bazel` 时才走 Bazel。

`packages/natives/scripts/build-bindings.ts`（第 8-9 行、216-218 行）：Cargo profile 默认为 `local`（thin LTO、incremental，构建快）；由环境变量 `OMP_NATIVE_CARGO_PROFILE` 覆盖。`ci` profile 为 thin LTO、16 codegen units、stripped，用于发布产物。

`scripts/host-detect.ts`：按本机 CPU 是否支持 AVX2，产出 `pi_natives.<platform>-<arch>-modern.node` 或 `-baseline.node` 之一。

## 独立程序与 npm 产物

`packages/coding-agent/scripts/build-binary.ts`（第 77-78 行）：未设 `CROSS_TARGET` 时输出名为 `omp`，路径 `packages/coding-agent/dist/<outName>`，即 `packages/coding-agent/dist/omp`。第 88-97 行调用 compileCodingAgent，native 取当前平台。

`packages/coding-agent/scripts/compile-binary.ts`（第 47-81 行）：用 `Bun.build` 以 compile 模式编译，内嵌当前平台 Rust addon；`fastembed`、`onnxruntime-node` 列为外部依赖不内嵌，首次使用按需安装。

`packages/coding-agent/scripts/bundle-dist.ts`（第 16-26 行、75-124 行）：npm 形式 `dist/cli.js` 与静态资源的生成流程；npm 包的 cli.js 使用外部 `@oh-my-pi/pi-natives` 包，不内嵌 addon。

## 源码 launcher

`package.json`（第 74 行）：`"dev": "bun --cwd=packages/coding-agent src/cli.ts"`。

`scripts/setup.ts`（第 83-87 行）：`bun setup` 四步 —— bun install、build:native、`bun --cwd=packages/coding-agent link`、`sh scripts/link-omp.sh`。

`scripts/link-omp.sh`（第 17 行、30 行）：把全局 bin 的 `omp` 软链到 `packages/coding-agent/scripts/omp`，后者最终执行 `src/cli.ts` 源码。

## 官方发布的 GLIBC 兼容设置

`docs/natives-build-release-debugging.md`（第 74-82 行）：官方 Linux release 的原生构建使用 Zig 工具链，针对 glibc 2.17 兼容范围；Rust toolchains are nightly（pinned in MODULE.bazel）。本机 Cargo 构建使用本机编译环境的 libc，不复现官方的旧系统兼容范围。

## 官方安装说明

Bun 官方文档 https://bun.sh/docs/installation：Linux/macOS 安装命令 `curl -fsSL https://bun.sh/install | bash`；要求 Linux kernel >= 5.1（推荐 >= 5.6）。

rustup 官方站点 https://rust-lang.org/tools/install/：Linux/macOS 安装命令 `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`。

仓库 `package.json`（第 205 行）：`"packageManager": "bun@>=1.4"`。`packages/natives/package.json`（engines）要求 bun `>=1.3.14`。
