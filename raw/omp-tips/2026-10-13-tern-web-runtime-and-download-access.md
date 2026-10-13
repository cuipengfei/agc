# Tern 网页运行时与下载访问证据

> Source: `tern --help`、`tern web serve` HTTP 响应、Stencil 官方文档（https://docs.stencil.so/tern/concepts/architecture.md 与 https://docs.stencil.so/tern/concepts/support-matrix.md），以及本仓库对话中的记录检查
> Collected: 2026-10-14（用户试验来源 2026-10-13；本轮仅收窄安装包鉴权表述，无新测量）
> Published: Unknown

凭据与 URL token 值不记录于此。

## 安装与运行时角色

`tern --version` 报告：

```text
tern 0.8.3 (e2b8656)
```

下载的 Linux 安装包含 `tern` 可执行文件，为 x86-64 的 ELF 64-bit LSB pie 可执行文件。安装路径为 `~/.local/bin/tern`，该目录已在 `PATH` 中。

该命令自描述为：

> tern — the multiplexing terminal from Stencil

相关子命令：

```text
tern daemon --socket /run/user/1000/tern/daemon.sock
tern web serve [--listen ADDR:PORT] [--token FILE] [--access FILE] [--assets DIR] [--allow-origin ORIGIN]...
```

daemon 掌管 pane 生命周期与会话状态包。web 客户端是同一个 Tern 客户端编译到 WebAssembly、运行在浏览器标签页内，使用 WebGPU 渲染。web 客户端不运行 Lua 插件，而是接收服务端的插件目录；样式表也不应用于 web 客户端。

web 客户端与 `ttyd` 不是同一模型。浏览器接收完整会话状态，并在 daemon 的会话之上拥有自己的窗口状态。

## Web 客户端资源构成

未修改的 `tern web serve` 页面包含：

- 本地 HTML 与 `pkg/stencil_tern_web.js`，来自运行中的 web 服务
- `stencil_tern_web_bg.wasm`，来自 `https://build.stencil.so/web/tern/0.8.3/stencil_tern_web_bg.wasm`

WASM 响应是公开的：

```text
HTTP/2 200
content-type: application/wasm
access-control-allow-origin: *
cache-control: public, max-age=31536000, immutable
```

`build.stencil.so/d/` 下的 Linux 安装包 URL 在未携带浏览器会话请求时返回重定向到 Stencil 登录页。该重定向意味着这条发布包路径需要已登录浏览器或其他授权路径。此处仅记录本次测试路径的结果，不描述浏览器对公开 WASM 资源的访问。

浏览器下载得到的构建 URL 内含带 `X-Amz-Expires=600` 的预签名 Cloudflare R2 URL。记录请求时间晚于该过期窗口，服务器返回 `403` 与 `ExpiredRequest`。

## Windows 浏览器访问

监听 `127.0.0.1` 的 WSL 服务可通过 localhost 从 Windows 宿主机浏览器访问。可用的测试 URL 形式为：

```text
http://127.0.0.1:<port>/?token=<REDACTED>
```

原版服务与修改后的客户端可以分别运行在不同端口、同时连接同一个 daemon socket。这支持在不停止用户现有服务的情况下直接对比。

修改后的服务以如下命令启动：

```bash
python3 /home/cpf/.local/share/tern-web-maple/serve.py
```

daemon 守护进程以如下命令启动：

```bash
python3 /home/cpf/.local/share/tern-web-maple/daemon.py
```

原版对比服务使用同一 daemon socket，未自定义 assets 目录。命令传入了 `--listen 127.0.0.1:8379`，未传 `--assets` 选项。
