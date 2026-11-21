# sip v0.10.0 使用参考

> Sources: Gaurav-Gosain/sip v0.10.0 CLI 帮助与官方源码，2026-11-15；Gaurav-Gosain/webterm 字体加载源码；本机 systemd 与隔离浏览器端实测，2026-11-15；sip v0.10.0 源码与隔离 Chromium 实测（渲染器与鼠标），2026-11-20；sip v0.10.0 传输与绘制源码、IETF RFC 与 W3C WebTransport 文档，2026-11-21；WebAssembly.org 与 Mozilla Developer Network 浏览器接口文档，2026-11-21
> Raw: [sip v0.10.0 CLI、URL 与设置面板使用记录](../../raw/terminal-multiplexers/2026-11-15-sip-v0.10.0-cli-url-settings-usage.md); [sip WSL systemd 自启与 uv-bun 集成](../../raw/terminal-multiplexers/2026-11-15-sip-wsl-systemd-autostart-and-uv-bun-update.md); [sip 字体匹配与 Console 验证](../../raw/terminal-multiplexers/2026-11-15-sip-maple-font-resolution-and-console.md); [sip + Herdr：焦点刷新期间的鼠标松开丢失](../../raw/terminal-multiplexers/2026-11-20-sip-herdr-focus-refresh-mouseup-loss.md); [sip v0.10.0 Worker engine：字体加载路径与宿主字体切换](../../raw/terminal-multiplexers/2026-11-20-sip-worker-engine-host-font.md); [sip 服务重启的 cgroup 波及范围](../../raw/terminal-multiplexers/2026-11-20-sip-service-cgroup-restart-blast-radius.md); [sip 传输、渲染回退与 Worker 绘制](../../raw/terminal-multiplexers/2026-11-21-sip-transport-renderer-worker.md); [WebAssembly 浏览器显示资料](../../raw/terminal-graphics/2026-11-21-webassembly-rendering-targets.md)
> Updated: 2026-11-21

## Overview

sip 把任意 CLI 命令通过浏览器暴露为全功能终端。sip 有三处配置入口：命令行参数、浏览器右上角设置面板、URL 查询参数。三处优先级从高到低依次是：URL 参数 > 浏览器设置面板（存在 `localStorage`）> 命令行参数。设置面板里的 `Apply & Reconnect` 无论是否改了 Renderer 都会重连会话，旧 shell 会被结束。

## 三处入口优先级

| 优先级 | 入口 | 作用范围 |
|---|---|---|
| 最高 | URL `?renderer=canvas` 等 | 仅当前浏览器标签页 |
| 中 | 设置面板（`localStorage["sip-web-settings"]`） | 当前浏览器长期保存 |
| 最低 | CLI `--renderer canvas` 等 | 所有新连接客户端的初始默认值 |

URL 参数刷新后仍在；设置面板重启浏览器后仍在；CLI 参数重启 sip 服务后所有新客户端生效。

## 命令行参数（六组）

### 网络与监听

| 参数 | 默认值 | 行为 |
|---|---|---|
| `-H` / `--host` | `localhost` | 监听地址；非回环地址强制要求 TLS |
| `-p` / `--port` | `7681` | TCP 端口；WebTransport 自动用 `port+1` 的 UDP 端口 |

### 加密与证书

| 参数 | 默认值 | 行为 |
|---|---|---|
| `--cert` + `--key` | 空 | 使用已有 TLS 证书 |
| `--auto-tls` | 关闭 | 自动生成并复用自签名证书 |
| `--cert-dir` | `~/.config/sip` | 自动证书存放目录 |
| `--cert-host` | 自动探测 | 额外写入证书的域名/IP |
| `--cert-days` | `0`（365 天） | 证书有效期；<14 天保留 Chrome WebTransport |
| `--allow-insecure-no-tls` | 关闭 | 允许明文 HTTP 下绑定局域网或设密码 |

`sip cert` 子命令：`info`（查看证书信息）、`new [-f]`（重新生成）、`path [--key]`（输出证书或私钥路径）、`rm [-f]`（删除）。

### 认证与防跨站

| 参数 | 默认值 | 行为 |
|---|---|---|
| `--basic-user` | 空 | Basic Auth 用户名 |
| `--basic-pass-file` | 空 | 从文件读密码（文件权限须 600） |
| `--basic-pass` | 空 | 命令行直接写密码（不推荐） |
| `--origin` | 同源 | 浏览器来源白名单 |
| `--allow-host` | 监听地址 | 允许的 HTTP Host 白名单 |
| `--allow-framing` | 关闭 | 允许任何网站 iframe 嵌入 |
| `--frame-ancestor` | 空 | 允许指定来源 iframe 嵌入 |

密码优先级：`--basic-pass-file` > `SIP_PASSWORD` 环境变量 > `--basic-pass`。`SIP_PASSWORD` 读取后从子进程环境移除。

### 字体与渲染

| 参数 | 默认值 | 行为 |
|---|---|---|
| `--font-family` | `JetBrainsMono Nerd Font Mono` | 设置浏览器使用的 CSS 字体名称列表 |
| `--font` | 空 | 将服务器上的字体文件提供给浏览器下载 |
| `--renderer` | 空（自动 WebGL） | 初始默认渲染器 |

`--font-family` 设置字体名称；`--font` 提供服务器上的字体文件。浏览器还会加载 sip 内置的 JetBrains 字体：v0.10.0 没有为这组字体单独指定名称，前端会把它们注册为配置列表里的第一个名称。

启动命令使用 `--font-family "Maple Mono NF CN, monospace"` 时，隔离测试的英文和数字命中 `JetBrainsMonoNFM-Regular`；单独提供 Maple 文件并设置相同字体名称时，测试文字仍使用 JetBrains。本机当前启动命令不指定字体名，Worker engine 下由页面选择宿主字体，步骤见下文链接。

Worker engine 下字体在 Worker 内加载，页面 `document.fonts` 与它互相独立；用宿主字体的步骤与判据见 [sip Worker engine 下使用宿主字体](sip-worker-engine-host-font.md)。

#### Chrome Console 临时操作

适用于 xterm 系渲染器（Auto、WebGL、Canvas、DOM、vtgl）的 sip v0.10.0 配置，且运行 Chrome 的电脑已安装 `Maple Mono NF CN`。在 sip 标签页按 F12，打开 Console，执行：

```js
[...document.fonts]
  .filter(face => face.family.replace(/^['"]|['"]$/g, '') === 'Maple Mono NF CN')
  .forEach(face => document.fonts.delete(face));

window.sipTerm.webterm.setOptions({
  fontFamily: "'Maple Mono NF CN', monospace"
});
```

这会从当前页面的字体集合移除以该名称注册的网页字体，并重新应用终端字体；电脑上安装的字体文件不受影响。隔离 Chrome 的 DOM 终端测试中，英文和数字切换到 `MapleMono-NF-CN-Regular`，终端对象保持不变。Canvas 和 WebGL 测试观察到画布重绘，未直接测量画布字形的字体。

操作只影响当前页面，刷新后可再次执行。操作本身不会主动刷新或重连，字体更换可能触发终端尺寸调整；刷新会断开 sip 连接并结束 sip 直接运行的 shell，Herdr 的会话记录可用 `herdr --session` 重新进入。`window.sipTerm` 是 sip 的内部接口，升级后可能变化；本机现有标签页未参与隔离测试。

### 键盘与图形

| 参数 | 默认值 | 行为 |
|---|---|---|
| `--ctrl-v-to-program` | 关闭 | `Ctrl+V` 发给程序而非粘贴 |
| `--enable-kitty-transcoder` | 关闭 | 服务端 PNG→RGBA 兜底转码（不是 Kitty 总开关） |

Kitty graphics 和 Sixel 在 sip 里默认开启，不需要额外参数。

### 会话生命周期

| 参数 | 默认值 | 行为 |
|---|---|---|
| `--max-conns` | `0`（不限制） | 最大并发标签页 |
| `--idle-timeout` | `0`（不断开） | 无操作自动断开时间 |
| `-d` / `--dir` | 当前目录 | 被运行程序的初始工作目录 |
| `--debug` | 关闭 | 输出调试日志 |

## URL 参数

| 参数 | 可选值 | 行为 |
|---|---|---|
| `?renderer=` | `webgl`/`canvas`/`dom`/`vtgl`/`engine`/`auto` | 选择当前标签页的首选渲染器；初始化失败时仍可能回退 |
| `?mobile=` | `1`/`0` | 强制开启/关闭触屏按键栏 |
| `?vtglShaper=` | `pfb`/`none` | 仅 `renderer=vtgl` 时生效 |
| `?vtglBackend=` | `canvas2d` | 仅 `renderer=vtgl` 时生效 |

## 设置面板逐项

右上角半透明齿轮按钮打开设置面板（手机触屏下收进底部按键栏）。

| 控件 | 默认值 | 行为 |
|---|---|---|
| Transport | `auto` | `auto` 与 `webtransport` 都先尝试 WebTransport，失败时使用 WebSocket；`websocket` 直接使用 WebSocket |
| Renderer | `auto` | 六项，见下文选型 |
| Font Size | `14`（滑杆 10–28） | 字号变化即时重排行列数 |
| Copy on select | 关 | 选中即复制 |
| Blink cursor | 关 | 光标闪烁 |
| Browser right-click menu | 关 | 终端区域右键弹浏览器菜单（Shift+右键始终可呼出） |
| Capture reserved keys | 开 | 全屏时接管 `Ctrl+W` 等浏览器快捷键 |

`Apply & Reconnect` 的两种后果：
- 改了 Renderer：整页刷新，旧 shell 结束，新开 shell。
- 只改其他项：不整页刷新，但重连会断开旧会话并新建一个，旧 shell 同样被结束。在 herdr/tmux 里可重新连接原会话；裸 shell 前台程序会丢。

## 渲染器选型

Renderer 选项指定首选方式，实际使用的渲染器可能因初始化失败而回退。`Auto` 和 `WebGL` 在 v0.10.0 中的选择顺序相同。

| 渲染器 | 终端核心与启动顺序 | 使用体验 |
|---|---|---|
| `Auto` | xterm.js；WebGL → Canvas → DOM | 自动选择可用的绘制方式 |
| `WebGL` | xterm.js；WebGL → Canvas → DOM | 优先使用 WebGL 绘图；无法启动时继续尝试 Canvas 和 DOM |
| `Canvas` | xterm.js；Canvas → DOM | 使用 Canvas 2D；WebGL 绘图出现问题时可单独选择 |
| `DOM` | xterm.js；DOM | 使用 HTML 元素显示终端内容 |
| `vtgl` | xterm.js；vtgl → WebGL → Canvas → DOM | 实验性绘制组件；默认使用 WebGL2 和 HarfBuzz 字形处理 |
| `Worker engine` | libghostty-vt WebAssembly；Worker WebGL2 → Worker Canvas 2D | 实验性终端核心与绘制路径；整个引擎无法启动时使用 xterm.js 的 `Auto` 顺序 |

Worker engine 使用网络 Worker 接收数据，终端 Worker 处理屏幕状态并绘图。页面中的 Canvas 交给 OffscreenCanvas；字形先由浏览器按字体生成像素图集，WebGL2 再绘制终端画面。字体加载另见 [sip Worker engine 下使用宿主字体](sip-worker-engine-host-font.md)。

WebGL2 是浏览器的绘图接口；是否使用硬件 GPU 取决于浏览器的图形实现。Worker Canvas 2D 仍使用 libghostty-vt；设置面板中的 `Canvas` 选项则使用 xterm.js。

设置面板的 `Renderer` 显示实际结果：`Worker engine` 表示 Worker WebGL2，`Worker engine (Canvas2D)` 表示 Worker Canvas 2D；`WebGL`、`Canvas` 和 `DOM` 表示 xterm.js 路径。

## Transport 选型

| 选项 | v0.10.0 的连接顺序 |
|---|---|
| `Auto (prefer QUIC)` | 先尝试 WebTransport；失败时使用 WebSocket |
| `WebTransport (QUIC)` | 先尝试 WebTransport；失败时同样使用 WebSocket |
| `WebSocket` | 直接使用 WebSocket |

WebTransport 向网页代码提供浏览器通信接口；sip 使用 HTTP/3 和 QUIC/UDP，默认在网页服务端口加 1 的端口提供 QUIC。终端数据使用一条双向流。WebSocket 使用 TCP；sip 在 HTTPS 页面选择 `wss:`，在 HTTP 页面选择 `ws:`。支持 WebSocket 的反向代理和只转发 TCP 的 SSH 隧道可以使用这条路径。

QUIC 用 UDP 承载数据包，并使用 TLS 1.3 的安全机制；满足协议要求的更新 TLS 版本也可协商。QUIC 的可靠流按顺序交付字节；一条流内的等待不会强制其他流等待同一段数据，多条流仍共享连接的拥塞控制。sip 的终端连接使用一条双向流，该流一个方向上的数据丢失时，后续内容可能等待补发。

QUIC DATAGRAM 是协商后可用的数据报扩展，丢失的 DATAGRAM 帧不重传，但仍受连接的拥塞控制。sip 的终端消息使用上述流；服务端启用数据报能力与终端消息的实际路径是两个不同事实。

面板的 `Transport` 显示实际连接；`WebSocket (WebTransport unavailable)` 表示当前使用 WebSocket。更改选项后点击 `Apply & Reconnect` 才会应用。

## Transport 与 Renderer 的组合

两个菜单共有 18 种可选组合。表中 `Q→W` 表示先尝试 WebTransport，失败时使用 WebSocket；`W` 表示直接使用 WebSocket。每一格同时表示连接和终端绘制方式。

| Renderer | Auto 或 WebTransport | WebSocket |
|---|---|---|
| Auto、WebGL | `Q→W`；xterm.js，WebGL → Canvas → DOM | `W`；xterm.js，WebGL → Canvas → DOM |
| Canvas | `Q→W`；xterm.js，Canvas → DOM | `W`；xterm.js，Canvas → DOM |
| DOM | `Q→W`；xterm.js，DOM | `W`；xterm.js，DOM |
| vtgl | `Q→W`；xterm.js，vtgl 优先 | `W`；xterm.js，vtgl 优先 |
| Worker engine | `Q→W`；libghostty-vt 与 Worker 绘制 | `W`；libghostty-vt 与 Worker 绘制 |

Worker engine 搭配 WebSocket 时，网络接收仍由网络 Worker 处理。vtgl 和 Worker engine 的具体回退顺序见上表。

## 剪贴板与 OSC 52

- 程序输出 `\e]52;c;<base64>\a` 时，浏览器直接写入系统剪贴板（默认开启）。
- 程序发送 `\e]52;c;?\a` 查询剪贴板时，浏览器忽略该请求，不回传内容（安全设计）。

## 证据边界

- 18 组组合根据菜单与源码选择路径推导，未逐项切换实测；本次浏览器目标查询超时，当前页面的实际连接、渲染器与硬件 GPU 状态未确认。
- `vtgl` 实际稳定性未在本机长期验证。
- `Worker engine` 在焦点重设期间保留鼠标松开事件（隔离 Chromium 实测）；Kitty 图形与键盘协议在源码中具备，未实跑验证；长期稳定性未验证。
- 本机用户确认 Worker engine 的字体切换生效；未做字形级字体来源测量。截图比对受重绘时序影响，不作为判据。
- 鼠标松开丢失的机制与实验对照见 [焦点刷新期间的鼠标松开丢失](focus-refresh-mouse-release-loss.md)。

## See Also

- [Go 与 sip 安装升级](go-and-sip-install-upgrade.md)
- [ttyd 与 sip 并存部署](ttyd-and-sip-side-by-side.md)
- [sip Worker engine 下使用宿主字体](sip-worker-engine-host-font.md)
- [浏览器端 Kitty 图形终端](../terminal-graphics/browser-kitty-terminals.md)
- [WebAssembly 在浏览器中的运行与显示](../terminal-graphics/webassembly-browser-rendering.md)
