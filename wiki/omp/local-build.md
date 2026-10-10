# OMP 本地构建：依赖、步骤、产物与验证

> Sources: 本机实测 2026-10-10（oh-my-pi v18.8.7, commit f261ed9）; Rust official docs; Bun official docs; rustup official site; 用户确定的 ci 构建流程与隔离 shell 复核
> Raw: [本地构建源码与官方说明摘录](../../raw/omp/2026-10-10-local-build-source-excerpts.md); [v18.8.7 本地构建执行与全局对照实测](../../raw/omp/2026-10-10-local-build-and-global-comparison.md); [便携环境准备与 ci 主流程复核](../../raw/omp/2026-10-10-local-build-portable-setup.md)
> Updated: 2026-10-10

## Overview

OMP 从源码本地构建需要两条链路：Rust 把 `crates/pi-*` 编译成一个 Node-API 原生插件（`.node` 文件），TypeScript 经 Bun 编译成独立 `omp` 可执行文件。本文面向 Linux / WSL2 的 Ubuntu x86_64，使用 OMP `v18.8.7`、Bun 1.4.3 和 Cargo `ci` profile 的成功构建记录组织操作步骤。指南包括缺少工具时的安装方法，不依赖全局 OMP 或本次对话；完整构建是在已有部分工具的本机执行，另一台机器从零安装到构建的全过程未验证。

构建产物有三种形态，用途不同：

- **独立 `omp` 二进制**（`packages/coding-agent/dist/omp`）：单文件可执行，内嵌当前平台的 Rust addon。
- **npm 形式 `cli.js`**（`packages/coding-agent/dist/cli.js`）：发布到 npm 的入口，运行时使用外部 `@oh-my-pi/pi-natives` 包，不内嵌 addon。
- **源码 launcher**（`bun setup` 创建的全局 `omp`）：软链到仓库脚本，直接执行 `src/cli.ts` 源码，改代码即时生效。

本文主线是构建并运行独立二进制；npm 产物作为可选对照步骤。

## 1. 环境检查

动手前确认：

- 操作系统为 Linux，CPU 架构为 x86_64（本文实测范围）。
- 有安装系统包的权限（`sudo`）。
- 网络可访问 GitHub、npm、Rust 与 Bun 的官方下载地址。
- 磁盘有数 GiB 空间（本次 Rust 构建产物与依赖占用可观）。
- 内存：本次为 11 GiB，用 `CARGO_BUILD_JOBS=4` 限制 Cargo 并发以控制内存峰值；这是资源设置，不是所有机器的强制值。内存更充裕可省略。

以下命令在同一个 Bash 会话中执行。工具检查前加入安装目录；如果设置了自定义 `BUN_INSTALL` 或 `CARGO_HOME`，沿用其位置：

```sh
export PATH="${BUN_INSTALL:-$HOME/.bun}/bin:${CARGO_HOME:-$HOME/.cargo}/bin:$PATH"
for tool in bun rustup; do
  if command -v "$tool"; then
    "$tool" --version
  else
    printf '%s 待安装\n' "$tool"
  fi
done
```

此时只检查 Bun 与 rustup。Rust 编译器和 Cargo 的版本在安装指定 nightly 后检查。

## 2. 安装缺少的工具

**系统依赖先安装**。Bun/rustup 安装器需要 `curl` 和证书，Bun 在 Linux 上还需要 `unzip`；这些工具必须在执行下载命令前可用：

```sh
sudo apt-get update &&
sudo apt-get install -y --no-install-recommends \
  build-essential curl ca-certificates git unzip \
  pkg-config libssl-dev clang libclang-dev cmake ninja-build
```

各包用途（来自仓库 `Dockerfile:44-49`）：`pkg-config` 探测依赖；`libssl-dev` 供 openssl 链接；`clang` + `libclang-dev` 供 bindgen；`cmake` + `ninja-build` 供 CMake 构建内置 libopus。`build-essential` 提供 gcc、g++ 和 make。构建前核对这些命令存在：

```sh
for tool in curl unzip git gcc g++ make clang cmake ninja pkg-config; do
  command -v "$tool" || exit 1
done
```

**Bun**：本次实测版本为 1.4.3。缺失或需要复现实测版本时，按官方的指定版本安装方式执行；已有兼容版本可保留，但其他版本未在本次完整构建中验证：

```sh
set -o pipefail
curl -fsSL https://bun.com/install | bash -s -- bun-v1.4.3
```

**rustup**：缺失时安装管理器，暂不下载默认 stable toolchain；指定 nightly 在第 4 节安装：

```sh
set -o pipefail
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | \
  sh -s -- --default-toolchain none -y
```

两个安装命令执行失败时停止，不继续构建。安装后在当前 Bash 会话重新设置 PATH，不依赖安装器修改的 shell 启动文件：

```sh
export PATH="${BUN_INSTALL:-$HOME/.bun}/bin:${CARGO_HOME:-$HOME/.cargo}/bin:$PATH"
bun --version && rustup --version
```

不要整体替换已有 PATH。这里的两个安装目录均使用 `$HOME` 或已配置的安装位置，不需要个人辅助工具或全局 OMP。

## 3. 取得源码并切换版本

```sh
git clone https://github.com/can1357/oh-my-pi.git &&
cd oh-my-pi || exit 1
export OMP_REPO="$PWD"
```

构建某个发布版本时，切到对应 tag 并核对 HEAD：

```sh
git switch --detach v18.8.7 || exit 1
git rev-parse HEAD 'v18.8.7^{commit}'
test "$(git rev-parse HEAD)" = "$(git rev-parse 'v18.8.7^{commit}')" || exit 1
```

本次实测 tag `v18.8.7` 对应 commit `f261ed9faf16b61880b544f599876bface4ded0d`。

构建其他版本时，切换 tag 后以该 tag 的 `rust-toolchain.toml` 为准决定 Rust 版本——不同版本的 nightly 日期可能不同。

## 4. 安装该版本要求的 Rust nightly

`v18.8.7` 的 `rust-toolchain.toml:1-4` 锁定 `nightly-2026-10-06`。下面的 components 和 targets 与该文件及本次实测安装命令一致：

```sh
rustup toolchain install nightly-2026-10-06 \
  --profile minimal \
  --component rustfmt,clippy,rust-analyzer \
  --target x86_64-unknown-linux-gnu,x86_64-pc-windows-msvc,aarch64-pc-windows-msvc
```

安装成功后，在 `$OMP_REPO` 目录验证选中的工具链：

```sh
rustup show active-toolchain && rustc --version && cargo --version
```

active toolchain 应为 `nightly-2026-10-06`；本次实际 rustc 版本为 `1.101.0-nightly (ea137335b 2026-10-05)`。列出的 Windows targets 是该 tag 的工具链配置项，本流程产出本机 Linux 程序。

**为什么必须 nightly**：`crates/pi-natives/src/crash_handler.rs:96` 调用 `std::alloc::set_alloc_error_hook`（OOM 崩溃诊断），`crates/pi-natives/src/lib.rs:23` 为此声明 `#![feature(alloc_error_hook)]`。Rust 官方 stable 文档把 `set_alloc_error_hook` 标注为 "nightly-only experimental API"（`alloc_error_hook` #51245），stable 工具链无法编译这一行。只要源码还用这个 hook，nightly 就是硬要求。

进入仓库目录后执行 cargo，rustup 会按 `rust-toolchain.toml` 自动选用该版本。

## 5. 构建

在 `$OMP_REPO` 仓库根目录按顺序执行，前一个步骤失败时停止。主流程使用本次成功构建的 Cargo `ci` profile，生成 stripped addon，方便与 npm 发布产物比较：

```sh
bun install --frozen-lockfile &&
CARGO_BUILD_JOBS=4 \
OMP_NATIVE_BUILD_BACKEND=cargo \
OMP_NATIVE_CARGO_PROFILE=ci \
bun run build:native &&
bun --cwd=packages/coding-agent run build
```

`ci` 为 thin LTO、16 codegen units、stripped。本次实测和本文主流程均明确选择它；这不会复现官方发布的旧 GLIBC 兼容范围，也不保证二进制逐字节一致。

源码的默认 profile 是 `local`，由 `OMP_NATIVE_CARGO_PROFILE` 覆盖（`packages/natives/scripts/build-bindings.ts:216-218`）。需要开发时的 incremental 编译可选择默认 `local`，但本次没有完整验证该 profile，本文复现流程保持 `ci`。

`build:native` 的 host 目标默认支持 Cargo / N-API 后端（`scripts/bazel-natives.ts:380-406`）；上面的命令显式选择 Cargo，无需 Bazel。脚本按本机 CPU 是否支持 AVX2，产出 `pi_natives.linux-x64-modern.node` 或 `-baseline.node`，并在结束前用子进程验证 addon 加载与构建版本。本次 Cargo `ci` 编译 9m44s，完整命令 774.45s。

`bun --cwd=packages/coding-agent run build`（`build-binary.ts:77-78`）未设 `CROSS_TARGET` 时输出名为 `omp`，经 Bun compile 内嵌当前平台 addon（`compile-binary.ts:47-81`），本次耗时 60.34s。使用本机流程时不要设置交叉编译用的 `CROSS_TARGET`。

## 6. 产物与运行

```sh
test -x "$OMP_REPO/packages/coding-agent/dist/omp" || exit 1
"$OMP_REPO/packages/coding-agent/dist/omp" --version &&
"$OMP_REPO/packages/coding-agent/dist/omp" --help
```

本次实测：

- 独立二进制 `packages/coding-agent/dist/omp`，236,623,840 bytes。
- `--version` 输出 `omp/18.8.7`，`--help` 输出 15370 bytes，两者退出状态 0、stderr 为空。
- 之后用该二进制 `--resume` 成功恢复并继续了一个真实会话。

本机两个参数退出状态为 0，随后用户确认会话恢复与继续对话成功。两个参数只验证版本与帮助入口；工具功能和完整测试套件未验证。

要让全局 `omp` 命令指向源码（而非编译二进制），用 `bun setup`，它会执行 bun install、build:native、`bun --cwd=packages/coding-agent link`、`sh scripts/link-omp.sh`（`scripts/setup.ts:83-87`），把全局 `omp` 软链到仓库脚本并最终执行 `src/cli.ts`。本次实测**未**执行链接步骤，以保留已有的全局安装。

## 7. 产物位置小结

| 产物 | 路径 | 说明 |
|---|---|---|
| Rust addon | `packages/natives/native/pi_natives.linux-x64-modern.node` | 按 AVX2 选 modern 或 baseline |
| 独立二进制 | `packages/coding-agent/dist/omp` | 内嵌 addon，可直接运行 |
| npm cli.js | `packages/coding-agent/dist/cli.js` | 用外部 pi-natives 包 |
| 源码 launcher | 全局 bin 的 `omp`（`bun setup` 创建） | 软链到 `src/cli.ts` |

## 8. 与全局安装的对照（可选）

另一台机器没有全局 OMP 也能完成构建；本节仅在需要确认本地产物与已安装版本一致时执行。本次对照结果：

- **源码**：11 个库包与主包的 src/ 共数千个文件，文件集合与逐文件 SHA-256 全部相同。
- **原生绑定**：`native/` 的 17 个 JS/声明文件与全局一致。
- **声明**：主包各 1371 个声明文件，1369 个相同；两个文件各有一处 `Effort` 类型导入来源差异（全局 pi-ai、本地 pi-catalog），源码相同，差异原因未确认——源码一致只说明差异来自类型发射路径，不足以判定两种导入在消费者侧等价。
- **npm 静态资源**：8 个逐字节相同。
- **`cli.js`**：本地 29,243,428 bytes、全局 29,244,903 bytes，内容不同，原因未确认；不据此宣称完整产物一致。
- **addon 二进制**：内容不同，见下节。
- 对照全程全局安装三个包的文件清单与 SHA-256 均未变，全局 `omp` 链接未被改动。

## 9. GLIBC 兼容：本机构建 vs 官方发布

`.node` addon 和编译出的二进制都依赖系统提供的 **GLIBC**（Linux 基础运行库：数学、时间、文件等）。用 `readelf` 查看 addon 对系统库的版本要求，本次观察到：

- 本地 addon 最高要求 `GLIBC_2.43`（例如 `atan2f@GLIBC_2.43`）。
- 官方发布的 addon 最高要求 `GLIBC_2.17`（例如 `clock_gettime@GLIBC_2.17`）。

这些数字是 addon 对运行机器系统库的最低要求，不是 addon 自带的库。本机 `getconf GNU_LIBC_VERSION` 为 glibc 2.43。差异来源：官方 Linux release 用 Zig 工具链针对 glibc 2.17 兼容范围构建（`docs/natives-build-release-debugging.md:74-82`），本机 Cargo 构建用本机 glibc 2.43。

影响：

- **本机运行**：本地产物在当前机器正常运行。
- **复制到旧系统**：若目标系统的 glibc 低于 2.43，这个本地 addon 会加载失败。本机构建**不复现**官方发布的旧系统兼容范围。
- 需要跨旧系统分发时，走官方 Bazel / hermetic 工具链，不在本文范围。

`ci` profile 控制优化、调试信息与增量编译；本次本地 addon 的 GLIBC 要求来自实际二进制检查，不能通过选择 `ci` 宣称具有官方发布兼容性。默认 `local` profile 的产物未在本次比较中检查。

## 10. 证据边界

- 完整构建使用已有部分工具的本机环境；Bun 1.4.3、nightly-2026-10-06、Cargo `ci` 的命令已实测。全新系统中的安装命令依据官方文档，另一台机器上的完整复现未验证。
- 额外在不加载 shell 启动文件、初始 PATH 仅为 `/usr/bin:/bin` 的 Bash 中验证：加入 Bun/Rust 安装目录后可找到全部工具；在 `/tmp` 直接运行独立 `omp` 的 `--version`、`--help` 均退出 0，stderr 为空。
- `cli.js` 与两处声明差异的原因未确认，不判定完整产物逐字节一致或类型消费者行为等价。
- 仅在 Ubuntu 26.04.1 x86_64 实测；其他发行版、架构与旧 GLIBC 系统未验证。未重新编译默认 `local` profile。
- 构建产物被 Git 忽略，原有构建完成时源码工作树保持干净。

## See Also

- [OMP Rust/TS architecture and pi-natives](rust-ts-architecture.md)
- [Node-API and napi-rs in OMP](napi-node-api.md)
