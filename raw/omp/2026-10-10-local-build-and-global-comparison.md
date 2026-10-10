# OMP v18.8.7 本地构建执行与全局对照实测

> Source: 本机实测，oh-my-pi 仓库 v18.8.7（commit f261ed9faf16b61880b544f599876bface4ded0d）；WSL2 / Ubuntu 26.04.1 LTS / x86_64
> Collected: 2026-10-10
> Published: Unknown

本文件保存一次完整本地构建的实际环境、命令、结果、产物路径与和全局安装的对照数据。全部来自实际工具输出。

## 环境

- 仓库：/home/cpf/code-inside/oh-my-pi
- 分支：release-18.8.7；HEAD 与 v18.8.7^{commit} 均为 f261ed9faf16b61880b544f599876bface4ded0d
- 系统：Ubuntu 26.04.1 LTS，WSL2，x86_64
- Bun：1.4.3
- 内存：11 GiB，开始时 available 7.9 GiB；swap 3 GiB
- 仓库可用磁盘：840 GiB
- 开始前已有：build-essential、gcc、g++、make、curl、ca-certificates、git、unzip
- rustup 已在 ~/.cargo/bin/rustup，但当前 PATH 不含 ~/.cargo/bin，且未安装任何 toolchain

## 实际命令与结果

1. 系统依赖：
   ```sh
   sudo -n apt-get update
   sudo -n apt-get install -y --no-install-recommends pkg-config libssl-dev clang libclang-dev cmake ninja-build
   ```
   成功，21 个系统包安装。apt update 报告 GitHub CLI 软件源缺少公钥 5612B36462313325（旧索引），以及已有 ubuntu.sources.bak-http2https 文件扩展名无效；本任务未改动这些既有软件源配置。
   安装后版本：clang 21.1.8、CMake 4.2.3、Ninja 1.13.2、pkg-config 2.5.1、libssl-dev 3.5.5，dpkg 状态均为 install ok installed。

2. Rust toolchain：
   ```sh
   ~/.cargo/bin/rustup toolchain install nightly-2026-10-06 --profile minimal --component rustfmt,clippy,rust-analyzer --target x86_64-unknown-linux-gnu,x86_64-pc-windows-msvc,aarch64-pc-windows-msvc
   ```
   成功；rustc 1.101.0-nightly (ea137335b 2026-10-05)，8 个 components 安装，rustup 将该版本设为默认 toolchain。

3. Bun 依赖：
   ```sh
   bun install --frozen-lockfile
   ```
   成功；Checked 425 installs across 584 packages (no changes)。prepare 自动生成 tool-views.generated.js。

4. Rust addon：
   ```sh
   env PATH="$HOME/.cargo/bin:$PATH" CARGO_BUILD_JOBS=4 OMP_NATIVE_BUILD_BACKEND=cargo OMP_NATIVE_CARGO_PROFILE=ci bun run build:native
   ```
   首次把 PATH 整体替换成只含固定目录，导致当前命令包装所需的 rtk 不可见，命令以退出码 127 终止，编译未启动；改为保留既有 PATH、仅前置 ~/.cargo/bin 后成功。Cargo ci profile 编译 9m44s，整条命令 774.45s。产出 linux-x64-modern addon；重新生成 135 个 explicit ESM exports，修正声明中的 15 个 const enums；host addon 加载与版本检查成功。

5. 独立程序：
   ```sh
   bun --cwd=packages/coding-agent run build
   ```
   成功，耗时 60.34s，产出 packages/coding-agent/dist/omp。脚本自动生成 stats dashboard、tool views，并在 finally 重置 stats embedded-client placeholder。

6. npm 形式产物（为对照）：
   ```sh
   bun x tsgo -p packages/coding-agent/tsconfig.publish.json
   bun --cwd=packages/coding-agent run gen:bundle
   ```
   tsgo 生成主包 dist/types 成功；随后 scripts/fix-emit-extensions.ts 的 fixEmitExtensions("packages/coding-agent/dist/types", ".d.ts") 为 898 个文件的 3039 个 relative specifiers 补 .js 扩展名。gen:bundle 生成 dist/cli.js 与资源，耗时 0.80s，保留独立 dist/omp。

## 产物

- 独立 binary：/home/cpf/code-inside/oh-my-pi/packages/coding-agent/dist/omp，Linux x86-64 ELF executable，权限 -rwxr-xr-x，236,623,840 bytes，SHA-256 7e2c45e9ba93eabf4fd6792a4cb1a059edfa2877a9d7cb4dc58bda2826b6a254
- 本地 modern addon：/home/cpf/code-inside/oh-my-pi/packages/natives/native/pi_natives.linux-x64-modern.node，stripped ELF，113,477,096 bytes，SHA-256 ec5a054100650a411efdf545362b354d5f0043df77e109187c66472dbd62f94d
- 本地 npm cli.js：29,243,428 bytes

## 运行验证（仅 --version 与 --help）

- 对 dist/omp 执行 --version、--help：退出状态均为 0，stderr 为空；version stdout 为 `omp/18.8.7`（11 bytes），help stdout 15370 bytes；两条 stdout/stderr 与全局安装逐字节相同。
- 对 bun packages/coding-agent/dist/cli.js 执行 --version、--help：退出状态均为 0，stdout/stderr 与全局安装逐字节相同。
- 用户随后用 dist/omp --resume 恢复了本次会话并继续对话，这是用户确认的运行证据。
- 未执行交互之外的功能、模型请求、工具功能、--smoke-test 或完整测试套件。

## 与全局安装对照

全局安装基准：

- ~/.bun/bin/omp 指向 ~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js
- 全局主包 version：18.8.7
- 全局 cli.js：29,244,903 bytes，SHA-256 2a1f0be0d536031830c2de5abc1a0f7f06948e7c3fdcb77542ef70cba3497481
- 全局 baseline addon：113,535,624 bytes，SHA-256 fa226e95db498db0b72c4c494a43d13670ffc4f4effdd559668afa4d4c6f7403
- 全局 modern addon：113,447,672 bytes，SHA-256 e41894f8ae38e0b5f03369808047fa7adb55a9ecb2a350fb8a64c466eb76024d
- 全局 @oh-my-pi 目录有 15 个包；release 相关包为 18.8.7，另有 hashline 18.1.4 和 pi-mnemosyne 15.7.2

对照结果：

- 11 个库包与主包的 src/ 逐文件 SHA-256：coding-agent 1733、utils 126、wire 4、omptype 13、catalog 325、ai 413、tui 516、mnemopi 66、snapcompact 4、stats 90、agent 55；文件集合与内容全部相同。
- 构建前后，native/ 的 17 个 JS/声明绑定文件与全局对应文件 SHA-256 相同。
- 主包声明：两边各 1371 个文件，文件集合相同，1369 个 SHA-256 相同；session/settings.d.ts 与 task/settings.d.ts 各有一处 Effort 类型导入来源差异（全局为 pi-ai，本地为 pi-catalog），源码文件全部相同，差异原因未确认。
- npm dist/ 静态资源：8 个逐字节相同；cli.js 不同（本地 29,243,428 vs 全局 29,244,903 bytes），差异原因未确认，未宣称逐字节复现官方 bundle。
- 本地 modern addon 内容与全局不同。readelf 观察到本地 addon 最高 GLIBC symbol version 为 2.43（例如 atan2f@GLIBC_2.43），全局为 2.17（例如 clock_gettime@GLIBC_2.17）；本地 addon 依赖 libgcc_s.so.1、libm.so.6、libc.so.6、ld-linux-x86-64.so.2。本机 getconf GNU_LIBC_VERSION 为 glibc 2.43。
- 构建完成后重算全局 pi-coding-agent、pi-natives、pi-natives-linux-x64 的完整文件清单与 SHA-256：三个包全部未变；全局 omp 链接仍指向已安装 dist/cli.js。

## 工作树与边界

- 构建产物（dist/omp、dist/cli.js、native/*.node、target/）均被 Git 忽略，源码工作树保持干净，HEAD 仍与 tag 相同。
- 本次未修改源码实现、工具链配置或 package manifests；node_modules、target、addon、声明、bundle 和独立程序均由依赖安装与仓库自带脚本产生。
- 其他 Linux 系统（尤其旧 glibc）、功能测试与完整测试套件未验证。
