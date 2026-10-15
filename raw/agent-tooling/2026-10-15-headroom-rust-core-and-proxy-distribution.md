# Headroom Rust 核心与独立 Rust 代理的分发状态

> Source: headroomlabs-ai/headroom pyproject.toml（`[tool.maturin]`）; crates/headroom-proxy/Cargo.toml; crates.io API; GitHub release assets 清单; 本机 uv tool 安装与运行进程实测
> Collected: 2026-10-15
> Published: Unknown

## pyproject.toml `[tool.maturin]`（v0.41.0，maturin 混合构建）

```toml
include = [
    { path = "LICENSE", format = "sdist" },
    { path = "NOTICE", format = "sdist" },
]
python-source = "."
module-name = "headroom._core"
# The cdylib source lives under `crates/headroom-py`. Maturin invokes
# `cargo build` with this manifest to produce `_core.cdylib`, then injects
# the resulting `.so` into the wheel at `headroom/_core.so`.
manifest-path = "crates/headroom-py/Cargo.toml"
features = ["extension-module"]
# Forbid building without the cdylib feature — bare `cargo build` won't
# produce a usable Python extension. Maturin's default `bindings` is "pyo3"
# which is correct here (see `crates/headroom-py/src/`).
bindings = "pyo3"
```

wheel 中模块名为 `headroom._core`，Rust cdylib 来源是 `crates/headroom-py`，注入后为 `headroom/_core.so`（本机实测文件名 `_core.abi3.so`，PyO3 abi3 产物）。

## crates/headroom-proxy/Cargo.toml（独立 Rust 代理，v0.1.0）

```toml
[package]
name = "headroom-proxy"
version = "0.1.0"
edition.workspace = true
rust-version.workspace = true
license.workspace = true
description = "Headroom transparent reverse proxy (Rust, axum). Phase 1: drop-in passthrough in front of the Python proxy."

[[bin]]
name = "headroom-proxy"
path = "src/main.rs"

[lib]
name = "headroom_proxy"
path = "src/lib.rs"
```

依赖：axum、tokio、tower、reqwest（rustls-tls + native roots）、tokio-tungstenite、clap、headroom-core 等。

## crates.io 查询（2026-10-15）

- `https://crates.io/api/v1/crates/headroom-proxy` → HTTP 404（未发布）
- 搜索 `headroom` 返回的同名包 `headroom` 2.1.2 与 `headroom-cli` 0.1.0，与 headroomlabs-ai/headroom 无关（未深挖）

## v0.41.0 GitHub Release assets（2026-10-15 查询）

```
['headroom-ai-0.41.0.tgz', 'headroom-openclaw-0.41.0.tgz',
 'headroom_ai-0.41.0-cp310-abi3-macosx_10_12_x86_64.whl',
 'headroom_ai-0.41.0-cp310-abi3-macosx_11_0_arm64.whl',
 'headroom_ai-0.41.0-cp310-abi3-manylinux_2_28_aarch64.whl',
 'headroom_ai-0.41.0-cp310-abi3-manylinux_2_28_x86_64.whl',
 'headroom_ai-0.41.0-cp310-abi3-win_amd64.whl',
 'headroom_ai-0.41.0.tar.gz']
```

共 8 个资产：5 个平台 wheel + 2 个 tgz + 1 个 sdist；无独立 Rust 代理二进制。

## 本机安装与运行进程验证（2026-10-15）

uv tool 安装路径：`/home/cpf/.local/share/uv/tools/headroom-ai/`。

`import headroom._core` 实测成功：

```
pkg: /home/cpf/.local/share/uv/tools/headroom-ai/lib/python3.13/site-packages/headroom/__init__.py
core: /home/cpf/.local/share/uv/tools/headroom-ai/lib/python3.13/site-packages/headroom/_core.abi3.so
core ok
```

`_core.abi3.so`：`-rwxrwxr-x 1 cpf cpf 29156944 Oct 15 19:12`（约 29 MB）。

运行中的代理进程（PID 151783，命令 `headroom proxy --anthropic-api-url http://localhost:4140 --openai-api-url http://localhost:4140 --port 8787 --code-aware --no-rate-limit --mode cache`）的 `/proc/151783/maps` 中 `_core` 命中 14 段，含 `r-xp` 可执行段与 `r--p` 只读段，映射到同一 `_core.abi3.so` 文件。这证明扩展已加载进进程内存；不证明具体压缩路径调用了 Rust 函数（Python 侧与 Rust 侧实现并存，未验证各路径走向）。
