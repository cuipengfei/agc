# OMP 在 Herdr 多路复用器下的 Kitty 能力与开关

> Source: 本机 OMP 安装包源码直读（`@oh-my-pi/pi-tui/src/terminal-capabilities.ts`、`kitty-graphics.ts`、`terminal.ts`、`multiplexers/herdr.ts`、`chat/svg-figure.ts`、`chat/table-chart.ts`、`@oh-my-pi/pi-coding-agent/src/modes/settings.ts`、`interactive-mode.ts`）；Herdr v0.9.5 官方 configuration 文档；本机 `~/.config/herdr/config.toml`、`~/.omp/agent/.env` 与 `herdr config check` 输出；OMP `/debug` Terminal State 面板
> Collected: 2026-11-15
> Published: Unknown

验证级别：`[RUN]` = 本机执行并记录输出；`[OBS]` = 运行中直接观察；`[UNVERIFIED]` = 已知存在但未测。

## 链路身份

`[OBS]` 进程链为 sip v0.10.0 → Herdr 0.9.5 → OMP。OMP 所在 pane 的环境：

```text
TERM=xterm-256color
TERM_PROGRAM=herdr
TERM_PROGRAM_VERSION=0.9.5
COLORTERM=truecolor
HERDR_ENV=1
HERDR_PANE_ID=<pane-id>
```

## OMP 面板原文

`[OBS]` 在 OMP 内打开 `/debug`，选择 `View: terminal state`：

```text
 Terminal State
 ━━━━━━━━━━━━━━
 Detected:     trueColor
 Geometry:     158x63 cells · cell 8x18px
 Multiplexer:  herdr

 Subprotocols
   Graphics:     Kitty graphics
   Notify:       BEL (\a)
   Hyperlinks:   yes (OSC 8)
   True color:   yes (24-bit SGR)
   DECCARA:      no (rectangular-SGR background fills)
   Sync output:  yes (DEC 2026)

 Scrollback
   Screen->history clear: CSI 2 J (redraw)

 Detection signals
   TERM:                 xterm-256color
   TERM_PROGRAM:         herdr
   TERM_PROGRAM_VERSION: 0.9.5
   COLORTERM:            truecolor
```

`Notify: BEL` 是回退协议字段。实际发送由 `sendNotification` 先交给多路复用器通知器，成功即返回（`terminal-capabilities.ts:177-189`），Herdr 分支执行 `herdr notification show <title> --body <body> --sound request|done|none`（`multiplexers/herdr.ts:35-51`）。`ask` 与 `error` 用 `request`，`completion` 用 `done`，其余 `none`（`multiplexers/herdr.ts:44-49`）。

## 图像协议的运行时判定

`[RUN]` 判定顺序（`terminal-capabilities.ts`）：

1. `PI_FORCE_IMAGE_PROTOCOL` 非空时直接采用（`:767-772`）。
2. 否则调用 `resolveImageProtocol`（`:771`）。
3. `resolveImageProtocol` 在多路复用器会话中存在 `imagesRequireOverride` 条目时返回 `null`（`:563-568`）。
4. `multiplexers/herdr.ts:63` 把 Herdr 标为 `imagesRequireOverride: true`；`:61-62` 的注释说明 pane 标记不能证明客户端启用了 Herdr 的实验性 Kitty 渲染器。

`[RUN]` Herdr 配置写入：

```toml
[terminal]
kitty_graphics = true
```

同一文件中 `[experimental]` 下的 `kitty_graphics` 键已删除。`herdr config check` 输出 `config: ok`。

`[RUN]` OMP 的 `.env` 加入：

```text
PI_FORCE_IMAGE_PROTOCOL=kitty
```

`[RUN]` 用 `bun -e` 加载 `pi-tui/src/terminal-capabilities.ts`，断言 `TERMINAL.imageProtocol === ImageProtocol.Kitty` 通过。

## Unicode 占位符

`[RUN]` `detectKittyUnicodePlaceholdersSupport`（`kitty-graphics.ts:76-93`）：

- `PI_NO_KITTY_PLACEHOLDERS` 与 `PI_KITTY_PLACEHOLDERS=0` 硬关；`PI_KITTY_PLACEHOLDERS=1` 任意环境开启（`:77-81`）。
- 在多路复用器内且 `PI_FORCE_IMAGE_PROTOCOL=kitty` 时返回 `true`（`:83`）。
- 其余多路复用器场景，若存在 `imagesRequireOverride` 条目则返回 `false`（`:84`）。

`[UNVERIFIED]` Herdr 是否实际绘制 `U=1` 占位符。

## Kitty 键盘协议

`[RUN]` 启动时发送 `CSI ? u` 探测；收到回包即推 `CSI > 1 u` 并置 `kittyProtocolActive`（`terminal.ts:1297-1301`、`:1784-1821`），退出时 `CSI < u` 弹栈（`:2544-2549`）。

`[UNVERIFIED]` Herdr 的 pane VTE 是否转发并回应这条探测；Shift+Enter 的实际行为未按键验证。

## 文字缩放（OSC 66）

`[RUN]` 门禁链：

- `TerminalInfo` 构造参数顺序为 `(id, imageProtocol, trueColor, hyperlinks, notifyProtocol, deccara, supportsScreenToScrollback, supportsTextSizing, hangulJamoWidth)`（`terminal-capabilities.ts:80-97`）。
- `supportsTextSizing` 默认 `false`；`kitty` 条目显式传 `true`（`:596`），`trueColor` 条目沿用默认 `false`（`:594`）。
- `#applyTextSizingSetting` 以 `cfgTuiTextSizing && TERMINAL.supportsTextSizing` 作为门禁（`interactive-mode.ts:4247-4249`）。
- 当前身份是 `trueColor`，所以正常配置下 OMP 不发送 OSC 66，一级标题按单倍字号绘制。

`[UNVERIFIED]` 伪造 `KITTY_WINDOW_ID` 会让 `detectTerminalId` 在识别 `TERM_PROGRAM` 之前返回 `kitty`（`terminal-capabilities.ts:694`、`:701-702`），OMP 随后会发出 OSC 66；Herdr 的 pane VTE（`multiplexers/herdr.ts:56` 记为 libghostty）与 sip 所用的 xterm.js 是否解析并绘制，未做目视验证。

## 矩形填充与带样式下划线

`[RUN]` DECCARA：`detectRectangularSgrSupport` 只在终端身份为 `kitty` 且不在多路复用器时返回 `true`（`terminal-capabilities.ts:366-374`）；只有 `PI_NO_DECCARA` 关闭开关，没有强制开启变量。

`[RUN]` 带样式下划线：`detectStyledUnderlineSupport` 首行在多路复用器内直接返回 `false`（`terminal-capabilities.ts:390-394`），`kitty`、`ghostty`、`monstar`、`wezterm` 与 iTerm2 3.5 以上才在非多路复用器场景返回 `true`。

## Markdown 到图像的渲染路径

`[RUN]` 四条路径：

- `` ```svg `` 代码块：`tui.renderSvg`（默认 `true`，`modes/settings.ts:473-484`）开启后由 `FigureMarkdown` 拆出，`SvgFigure` 用 `rasterizeSvg` 光栅化，`UNITS_PER_ROW = 16`、`MAX_EDGE_PX = 4096`、`MAX_VIEWPORT_SHARE = 0.8`（`chat/svg-figure.ts:24-31`）。`var(--fg)` 等 figure token 按当前主题解析（`:37-45`、`svgFigurePalette`）。
- 数字表格：`tui.autoGraph`（默认 `auto`）下由 `TableChartFigure` 在表格下方画 SVG 再转图像（`chat/table-chart.ts:1-11`、`:22-28`）。
- `` ```mermaid `` 代码块：渲染为字符画（`modes/settings.ts:461-471`）。
- 数学块：`$$…$$` 走 `latex-block.ts` 的二维字符排版（`latex-block.ts:1-23`）。

## 未验证

- Herdr 是否转发并回应 `CSI ? u` 键盘协议探测。
- Herdr 是否绘制 `U=1` 占位符。
- Herdr 与 sip 前端所依赖的渲染器是否解析 OSC 66。
- `herdr server reload-config` 对已运行 server 的图像解析是否立即生效；本机采用停止 session 后重启的方式。
- `/debug` 面板显示 `Graphics: Kitty graphics` 与 `PI_FORCE_IMAGE_PROTOCOL=kitty` 一致；该字段不区分协议由检测还是由强制变量决定。
