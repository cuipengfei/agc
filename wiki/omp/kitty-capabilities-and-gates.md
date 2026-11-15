# OMP 在 Herdr 多路复用器下的 Kitty 能力与开关

> Sources: 本机 OMP 安装包源码直读（pi-tui、pi-coding-agent），2026-11-15；Herdr v0.9.5 官方 configuration 文档；本机 config.toml 与 .env 实测，2026-11-15
> Raw: [OMP 在 Herdr 多路复用器下的 Kitty 能力与开关](../../raw/terminal-graphics/2026-11-15-omp-kitty-capabilities-under-herdr.md)
> Updated: 2026-11-15

## 链路

进程链为 sip v0.10.0 → Herdr 0.9.5 → OMP。OMP 所在 pane 的身份变量：`TERM=xterm-256color`、`TERM_PROGRAM=herdr`、`TERM_PROGRAM_VERSION=0.9.5`、`COLORTERM=truecolor`、`HERDR_ENV=1`。OMP 由这些变量识别出终端身份 `trueColor`、多路复用器 `herdr`。

## 能力清单

| 能力 | 开启条件 | Herdr 内的状态 | 需要的配置 |
|---|---|---|---|
| Kitty 图像 | 终端静态能力、多路复用器回退、或 `PI_FORCE_IMAGE_PROTOCOL` | 可开（强制变量） | `PI_FORCE_IMAGE_PROTOCOL=kitty` + Herdr `terminal.kitty_graphics=true` |
| Unicode 占位符 | `detectKittyUnicodePlaceholdersSupport`，多路复用器内强制变量也会打开 | 随强制变量打开 | 同上；`PI_NO_KITTY_PLACEHOLDERS` 硬关 |
| Kitty 键盘协议 | 运行时探测 `CSI ? u`，回包即推 `CSI > 1 u` | 由探测结果决定 | 无配置入口 |
| OSC 66 文字缩放 | 静态 `supportsTextSizing`（仅 `kitty` 条目为 `true`）且 `tui.textSizing` | 正常配置下不发送 | 无强制变量 |
| DECCARA 矩形填充 | 终端身份为 `kitty` 且不在多路复用器内 | 不可开 | 只有 `PI_NO_DECCARA` 关闭开关 |
| 带样式下划线 | `detectStyledUnderlineSupport`，多路复用器内首行返回 `false` | 不可开 | 无开关 |
| OSC 99 通知 | 终端通知协议，多路复用器内改走通知器 | 改走 `herdr notification show` | 无需配置 |

## 图像与占位符

Herdr 在 `pi-tui/src/multiplexers/herdr.ts:63` 被标为 `imagesRequireOverride: true`，`resolveImageProtocol` 遇到这种多路复用器会话时返回 `null`（`terminal-capabilities.ts:563-568`）——pane 标记不能证明客户端启用了 Herdr 的实验性 Kitty 渲染器。`PI_FORCE_IMAGE_PROTOCOL` 在 `TERMINAL` 构造时优先于上述判定（`:767-772`），是这类多路复用器内唯一的自动开启途径。本机实测：`.env` 设 `PI_FORCE_IMAGE_PROTOCOL=kitty`、Herdr 设 `terminal.kitty_graphics=true` 并重启 session 后，`/debug` 面板显示 `Graphics: Kitty graphics`。

Unicode 占位符在多路复用器内同样依赖强制变量：`PI_FORCE_IMAGE_PROTOCOL=kitty` 会让 `detectKittyUnicodePlaceholdersSupport` 返回 `true`（`kitty-graphics.ts:83`）；`PI_NO_KITTY_PLACEHOLDERS` 与 `PI_KITTY_PLACEHOLDERS=0` 为硬关。图像协议被置 `null` 的多路复用器场景，占位符同样返回 `false`（`:84`）。

`PI_FORCE_IMAGE_PROTOCOL` 只决定 OMP 往终端写什么序列；链路上每一层还要各自能渲染：Herdr 需 `terminal.kitty_graphics=true`（改后需重启 server 或重连 client），sip v0.10.0 默认渲染 Kitty graphics。

## 键盘协议

OMP 启动时发送 `CSI ? u` 探测，收到回包即推 `CSI > 1 u`，退出时 `CSI < u` 弹栈（`terminal.ts:1297-1301`、`:1784-1821`）。无配置开关。这条探测要经过 Herdr 的 pane VTE，Herdr 是否转发并回应未实测；输入框里按 Shift+Enter 换行而 Enter 直接发送，即为生效表现。

## 文字缩放（OSC 66）

门禁两层：静态的 `supportsTextSizing` 只在 `kitty` 条目为 `true`（`terminal-capabilities.ts:596`），`trueColor` 条目沿用默认 `false`（`:594`）；`#applyTextSizingSetting` 以 `tui.textSizing && TERMINAL.supportsTextSizing` 做第二道门（`interactive-mode.ts:4247-4249`）。当前 Herdr 传入的身份是 `trueColor`，所以即使设置 `tui.textSizing: true`，OMP 也不发送 OSC 66，一级标题按单倍字号绘制。伪造 `KITTY_WINDOW_ID` 会让 `detectTerminalId` 在识别 `TERM_PROGRAM` 之前返回 `kitty`（`terminal-capabilities.ts:694`、`:701-702`），OMP 随后会发出序列；下游是否解析绘制未测。

## 矩形填充与带样式下划线

DECCARA 的判定 `detectRectangularSgrSupport` 只在终端身份为 `kitty` 且不在多路复用器时返回 `true`（`terminal-capabilities.ts:366-374`），只有 `PI_NO_DECCARA` 关闭开关，没有强制开启变量。带样式下划线更严：`detectStyledUnderlineSupport` 首行即在多路复用器内返回 `false`（`:390-394`），`kitty`、`ghostty`、`monstar`、`wezterm` 与 iTerm2 3.5 以上也只有直接在终端里才开启。这两项关闭后功能完整——DECCARA 关闭时逐行填背景色，下划线退回普通单横线。

## 通知

`sendNotification` 先把消息交给多路复用器通知器，路由成功即返回，不写终端序列（`terminal-capabilities.ts:177-189`）。Herdr 分支执行 `herdr notification show <title> --body <body> --sound request|done|none`（`multiplexers/herdr.ts:35-51`）：`ask` 与 `error` 类通知用 `request` 音，`completion` 用 `done` 音，其余静默。`/debug` 面板的 `Notify: BEL (\a)` 是回退协议字段，多路复用器通知器路由成功时不会走到它。

## Markdown 到图像的渲染路径

| 输入 | 设置 | 渲染方式 |
|---|---|---|
| `` ```svg `` 代码块 | `tui.renderSvg`（默认 `true`） | `SvgFigure` 用 `rasterizeSvg` 光栅化成内联图像；`var(--fg)` 等 figure token 按当前主题解析 |
| 数字 Markdown 表格 | `tui.autoGraph`（默认 `auto`） | 表格下方自动画 SVG 图表再转图像 |
| `` ```mermaid `` 代码块 | `tui.renderMermaid`（默认 `true`） | 字符画，不转图像 |
| `$$…$$` 数学块 | 无设置项 | 二维字符排版，不转图像 |

`SvgFigure` 的尺寸边界：每终端行折 16 个 SVG user units、单边最长 4096 像素、最多占视口 80%（`chat/svg-figure.ts:24-31`）。

## 验证方式

`/debug` → `View: terminal state` 面板逐项显示 Graphics、Notify、Hyperlinks、True color、DECCARA、Sync output 的实际值与检测信号原文，比推断准确。图像生效的直接确认：让 OMP 读一张本地图片，或输出 `` ```svg `` 代码块与数字表格。

## 证据边界

- 源码直读：判定函数、KNOWN_TERMINALS 条目、构造参数顺序、通知路由、渲染路径的行号来自本机安装包源码。
- 本机实测：Herdr 配置改动与 `herdr config check` 输出、`.env` 改动、以新进程加载 pi-tui 断言 `TERMINAL.imageProtocol === ImageProtocol.Kitty`、`/debug` 面板全文。
- 未验证：Herdr 是否转发并回应 `CSI ? u`；是否绘制 `U=1` 占位符；依赖的渲染器是否解析 OSC 66；`herdr server reload-config` 对已运行 server 的图像解析是否立即生效（本机采用停止 session 后重启）。

## See Also

- [终端图像协议支持矩阵](../terminal-graphics/terminal-image-protocol-matrix.md)
- [OMP 环境变量全量参考](env-variables-reference.md)
- [Markdown 标题的 TUI 渲染](markdown-heading-rendering.md)
- [Herdr 配置项与用户体验](../herdr-plannotator/herdr-config-user-experience.md)
