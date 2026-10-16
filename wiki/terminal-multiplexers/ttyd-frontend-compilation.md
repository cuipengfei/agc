# ttyd 前端编译模型与 xterm 版本锁定

> Sources: tsl0922/ttyd 1.7.7 release, 2024-03-30; 本机实证, 2026-10-06; 本机实证, 2026-10-16
> Raw: [ttyd 1.7.7 前端依赖锁定摘录](../../raw/terminal-multiplexers/2026-10-06-ttyd-1.7.7-frontend-lockfile.md); [浏览器终端链路剪贴板排障](../../raw/terminal-multiplexers/browser-terminal-clipboard-paste-paths.md)
> Updated: 2026-10-16

## Overview

ttyd 把前端（含 xterm.js）用 webpack 编译进二进制，发版时由 `html/yarn.lock` 锁定依赖版本。要换 xterm 版本只能等上游发新版或自己 rebuild 前端，无法在运行时单独升级。浏览器终端工具（ttyd、Wetty、GoTTY 等）前端全是 xterm.js，所以渲染类 bug 的根源变量是 xterm 版本和渲染器类型，而不是换哪个外壳。

## 版本现状：1.7.7 是 2024-03-30 的最新 tag

截至 2026-10-06，`gh release view tsl0922/ttyd` 确认 `1.7.7` 仍是最新 release tag，publishedAt `2024-03-30T03:18:34Z`。也就是说 ttyd 的前端依赖从 2024-03-30 起就没再动过，不是用户本地文件旧，而是项目本身停在那一刻。

本机 `/usr/bin/ttyd --version` 输出 `1.7.7-40e79c7`，后缀 `40e79c7` 是 tag 之后的构建 commit 短 hash。

## 1.7.7 lockfile 锁定的 xterm 版本

`html/yarn.lock`（yarn berry 格式，`@npm:` 协议 + `resolution:` + `checksum:`）精确锁定：

| 包 | 锁定版本 | peerDependencies |
|---|---|---|
| `@xterm/xterm` | 5.4.0 | — |
| `@xterm/addon-webgl` | 0.17.0 | `@xterm/xterm ^5.0.0` |
| `@xterm/addon-canvas` | 0.6.0 | `@xterm/xterm ^5.0.0` |
| `@xterm/addon-fit` | 0.9.0 | `@xterm/xterm ^5.0.0` |
| `@xterm/addon-image` | 0.7.0 | `@xterm/xterm ^5.2.0` |
| `@xterm/addon-unicode11` | 0.7.0 | `@xterm/xterm ^5.0.0` |
| `@xterm/addon-web-links` | 0.10.0 | `@xterm/xterm ^5.0.0` |

所有 addon 的 peer 都指向 `@xterm/xterm ^5.x`，确认这是一个以 xterm 5.4.0 为核心的组合。

## 前端编译进二进制，升级只能 rebuild

xterm.js 不是运行时可换的外部依赖，而是 webpack 打进 ttyd 前端 bundle 的一部分。要升级 xterm 只有三条路：

1. 等 ttyd 发新版（上游 bump lockfile 后用户重装）。
2. 自己 rebuild ttyd 前端：改 `html/package.json` 提 xterm 版本，`yarn build`，再用 `-I` 指向新产物。
3. 换渲染器类型（如 `rendererType=canvas`）绕过 WebGL atlas 的已知 bug，不升版本。

## 本机定制前端 = 官方默认 + 两个 script 块

本机 `/home/cpf/.local/share/ttyd/index-osc52.html`（systemd 以 `-I` 挂载）与官方 1.7.7 默认首页 HTML 的差异，经 `git diff --no-index --text --word-diff=plain` 对原始文件直跑，结果为单 hunk（+100 / -1）：新增两个 `<script>` 块，插在 `//# sourceMappingURL=...js.map</script>` 之后、`</body></html>` 之前，`sourceMappingURL` 注释保留。

- 块 1：OSC52 剪贴板转发。`window.__ttydOsc52ClipboardInstalled`、`term.parser.registerOscHandler(52, ...)` 把终端应用发出的 OSC52 序列 base64 解码后写浏览器剪贴板；优先 `navigator.clipboard.writeText`，Clipboard API 不可用时降级为隐藏 `textarea` + `document.execCommand('copy')`。
- 块 2：右键菜单拦截。`document.addEventListener('contextmenu', ...)` 对落在 `.xterm` 区域内的事件 `preventDefault()`。

除这两块外整份 html 与官方默认逐字节一致（公共前缀 728,570 / 731,235 字节；官方默认首页 729,693 字节）。

## 两个定制块的剪贴板方向语义

OSC52 块服务「复制方向」：终端应用发出 OSC52 序列，前端解码后写浏览器剪贴板（浏览器放行网页写剪贴板，Clipboard API 不可用时降级 `execCommand`）。「粘贴方向」不经过该块：浏览器只允许网页在真实 paste 事件里读剪贴板，OSC52 回查未实现。因此浏览器终端里两条粘贴路径并存——终端层粘贴（如 Ctrl+Shift+V 的 paste 事件）由前端直接注入文本；应用层粘贴（应用收到 `^V` 按键后自己读系统剪贴板）需要应用侧自带读取路线。本机 omp 因读取路线的环境变量门控全断而报 "Clipboard is empty"、补 `WAYLAND_DISPLAY` 后恢复的案例，见 [浏览器终端链路的剪贴板路径](browser-terminal-clipboard-paths.md)。


## 浏览器终端工具前端全是 xterm.js

ttyd、Wetty、GoTTY、sshwifty 等浏览器终端工具的前端都基于 xterm.js。这意味着 WebGL atlas 那一类渲染 bug 不会因为换外壳工具而消失——核心变量是各自打包的 xterm 版本和默认渲染器类型。换工具的收益在后端能力（SSH/SFTP/多用户），不在渲染。

## See Also

- [tuios workspace 与 session rail](tuios-workspace-and-sidebar.md)
- [浏览器终端链路的剪贴板路径](browser-terminal-clipboard-paths.md)
