# OMP 本地构建：环境准备与 ci 主流程复核

> Source: Bun 官方安装文档 https://bun.sh/docs/installation；rustup 官方文档 https://rust-lang.github.io/rustup/installation/index.html；当前会话的用户决定与隔离 shell 实测
> Collected: 2026-10-10
> Published: Unknown

## 用户决定

用户明确接受 ci profile 作为指南主流程，目标是得到与 npm 发布产物相似的 stripped addon。沿用已实测命令：`CARGO_BUILD_JOBS=4 OMP_NATIVE_BUILD_BACKEND=cargo OMP_NATIVE_CARGO_PROFILE=ci bun run build:native`。不声称完整产物与官方逐字节相同。

## 官方安装说明摘录

Bun 官方安装页面：

> Linux users: You need the `unzip` package to install Bun (`sudo apt install unzip`).

页面给出的 Linux 安装命令：

```sh
curl -fsSL https://bun.com/install | bash
```

页面说明如何安装指定版本：

> To install a specific version, pass the git tag to the install script:

```sh
curl -fsSL https://bun.com/install | bash -s "bun-v1.3.3"
```

因此，使用既有实测版本 1.4.3 的安装命令为：

```sh
curl -fsSL https://bun.com/install | bash -s -- bun-v1.4.3
```

该版本化安装命令依据官方语法整理；本轮未重新执行 Bun 安装，当前已安装 Bun 为 1.4.3。

Bun 页面关于 PATH：

> If you've installed Bun but are seeing a `command not found` error, you may have to manually add the installation directory (`~/.bun/bin`) to your `PATH`.

```sh
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

rustup 官方页面：

> `rustup` installs `rustc`, `cargo`, `rustup` and other standard tools to Cargo’s `bin` directory. On Unix it is located at `$HOME/.cargo/bin`.

对于指定 nightly，页面明确提供先安装 rustup、暂不安装 toolchain 的方式：

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- --default-toolchain none -y
```

页面还说明自定义安装位置时必须把 `CARGO_HOME/bin` 加入 PATH。

## 指南执行顺序

1. 当前 shell 在工具检查前加入 Bun 与 Rust 工具目录，保留已有 PATH。
2. 安装 Ubuntu 系统依赖；curl、ca-certificates、unzip 必须在下载并执行 Bun/rustup installer 前准备好。
3. 检查并安装缺少的 Bun/rustup；安装 rustup 时使用 --default-toolchain none，不额外下载 stable。
4. 安装后重新设置当前 shell 的 PATH，检查 Bun/rustup；rustc/cargo 的版本检查放在指定 nightly 安装完成后。
5. 克隆公开 HTTPS 仓库，选择 v18.8.7，并自动检查 HEAD 与 tag commit 相同。
6. 安装 nightly-2026-10-06；components/targets 与该 tag 配置和原有实测命令相同。
7. bun install --frozen-lockfile → Cargo ci addon → Bun compile。
8. 显式运行目标路径的 --version/--help 并检查退出状态。

## 隔离 shell 实测

使用已有本机工具，没有新建系统环境或重新执行安装。测试程序：`/bin/bash --noprofile --norc`，初始 HOME=/home/cpf、PATH=/usr/bin:/bin，工作目录 /tmp。

- 初始 PATH：bun、rustup、cargo 均 NOT_FOUND。
- 仅前置 $HOME/.cargo/bin：能发现 rustup/cargo，bun 仍 NOT_FOUND。
- 使用下面的命令：

```sh
export PATH="${BUN_INSTALL:-$HOME/.bun}/bin:${CARGO_HOME:-$HOME/.cargo}/bin:$PATH"
```

实际输出：

```text
/home/cpf/.bun/bin/bun
/home/cpf/.cargo/bin/rustup
/home/cpf/.cargo/bin/cargo
1.4.3
rustup 1.29.1 (d95a37b6a 2026-08-13)
```

PATH 与工具版本检查退出状态为 0。rustup --version 的 stderr 包含其正常的 toolchain 提示，不属于失败。

同样使用初始 PATH=/usr/bin:/bin，在 /tmp 直接执行独立产物：

```text
/home/cpf/code-inside/oh-my-pi/packages/coding-agent/dist/omp --version
exit_code=0, stdout_bytes=11, stderr_bytes=0
omp/18.8.7

/home/cpf/code-inside/oh-my-pi/packages/coding-agent/dist/omp --help
exit_code=0, stdout_bytes=15370, stderr_bytes=0
```

## 证据边界

本次没有在另一台机器上执行构建，没有在全新系统中重新安装 Bun/rustup，没有重新编译 Rust 或 TypeScript。完整 ci 构建的证据引用同日原有构建记录；本轮新增的是官方安装说明核实和干净 shell 工具发现、独立程序两个参数的运行结果。默认 local profile 是源码事实，本会话未做其完整构建。
