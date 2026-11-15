# sip v0.10.0 使用参考

> Sources: Gaurav-Gosain/sip v0.10.0 CLI 帮助与本机源码，2026-11-15；本机 systemd 与浏览器端实测，2026-11-15
> Raw: [sip v0.10.0 CLI、URL 与设置面板使用记录](../../raw/terminal-multiplexers/2026-11-15-sip-v0.10.0-cli-url-settings-usage.md); [sip WSL systemd 自启与 uv-bun 集成](../../raw/terminal-multiplexers/2026-11-15-sip-wsl-systemd-autostart-and-uv-bun-update.md)
> Updated: 2026-11-15

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
| `--font-family` | `JetBrainsMono Nerd Font Mono` | CSS 字体名，只发名字给浏览器 |
| `--font` | 空 | 把 WSL 磁盘上的字体文件发给浏览器下载 |
| `--renderer` | 空（自动 WebGL） | 初始默认渲染器 |

`--font-family` 只写名字，浏览器在打开网页的那台设备上找字体；WSL 里有没有该字体文件不影响。`--font` 才把字体文件打包发过去，适合手机等未装字体的设备。

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
| `?renderer=` | `webgl`/`canvas`/`dom`/`vtgl`/`engine`/`auto` | 强制当前标签页渲染器 |
| `?mobile=` | `1`/`0` | 强制开启/关闭触屏按键栏 |
| `?vtglShaper=` | `pfb`/`none` | 仅 `renderer=vtgl` 时生效 |
| `?vtglBackend=` | `canvas2d` | 仅 `renderer=vtgl` 时生效 |

## 设置面板逐项

右上角半透明齿轮按钮打开设置面板（手机触屏下收进底部按键栏）。

| 控件 | 默认值 | 行为 |
|---|---|---|
| Transport | `auto` | `auto` 优先 QUIC 失败回 WebSocket；`webtransport` 强制 UDP；`websocket` 强制 TCP |
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

| 渲染器 | 适合场景 |
|---|---|
| `Canvas` | Windows + WSL2 首选；字体抗锯齿自然；彻底避开 WebGL 色块故障 |
| `WebGL` | GPU 正常且跑重度 TUI（btop、大量滚屏）；帧率最高 |
| `Auto` | 显卡驱动没问题的设备开箱即用 |
| `DOM` | 无 GPU 环境、屏幕阅读器、自动化测试 |
| `vtgl` | 实验性，测试字形排版整形 |
| `Worker engine` | 实验性，终端解析放后台线程，适合海量输出时保持页面响应 |

## Transport 选型

| 场景 | 选择 |
|---|---|
| 本机 localhost | `Auto` 或 `WebSocket`（回环延迟近 0，两者体感相同，WebSocket 省去 QUIC 握手） |
| Wi-Fi / 4G / 弱网 | `WebTransport (QUIC)`（UDP 抗丢包，不会队头阻塞） |
| 反向代理 / SSH 转发 | `WebSocket`（代理通常不转发 UDP） |

## 剪贴板与 OSC 52

- 程序输出 `\e]52;c;<base64>\a` 时，浏览器直接写入系统剪贴板（默认开启）。
- 程序发送 `\e]52;c;?\a` 查询剪贴板时，浏览器忽略该请求，不回传内容（安全设计）。

## 证据边界

- WebTransport 弱网优势是协议机制推断，本机 localhost 环境无法实测。
- Canvas 渲染器「字体抗锯齿自然」是相对 WebGL 的体感描述，非量化指标。
- `vtgl` / `Worker engine` 实际稳定性未在本机长期验证。

## See Also

- [Go 与 sip 安装升级](go-and-sip-install-upgrade.md)
- [ttyd 与 sip 并存部署](ttyd-and-sip-side-by-side.md)
- [浏览器端 Kitty 图形终端](../terminal-graphics/browser-kitty-terminals.md)
