# Tern 官方文档：Surface Protocol 章节摘录与调研笔记

> Source: https://docs.stencil.so/tern/protocol/ (index, transport, handshake, surfaces, documents, input, theme, operations, sdks)
> Collected: 2026-10-20
> Published: Unknown

「逐字摘录」为官方页面原文；「调研笔记」为 ProtocolScout 对 9 页逐页阅读后的中文摘要，非逐字。

## 逐字摘录：Surfaces

> A **surface** is a document a program shows in its pane. Everything in a live surface stays editable at any time, including the parts that scrolled up into history: scrollback is part of the document, not a sealed record of past rows. A pane holds any number of closed surfaces in its scrollback, but at most one live surface of each mode per screen buffer.

Modes 表：

| Mode | For | Sits | After the program |
| --- | --- | --- | --- |
| `inline` (default) | A program that runs a session in the pane (omp) | At the cursor row of the main screen, owning the pane while live | Discarded at the next shell prompt |
| `screen` | A full-screen view (an app, a full-screen overlay) | Over the whole pane, like the alternate screen | Discarded on close |
| `flow` | A program that isn't full-screen: a CLI that prints a table, asks a question or shows progress, then exits (feature `flow`) | At the cursor row of the main screen, among the output around it | Kept in the scrollback, like output |

> An inline or flow surface occupies exactly one grid row, its **anchor**. … The surface lives exactly as long as its anchor row. When the row falls off the end of the scrollback, is erased (`ESC [2J`, `clear`) or scrolled away inside a scroll region, or the scrollback is cleared, the surface goes with it, and an open one whose program listens hears `{"ev":"gone","sf":"s1","ids":["s1"]}`.

> A shell prompt (OSC 133;A) means the program is gone. Tern discards every inline and screen surface of the pane, including the ones closed with `keep:true` … Flow surfaces and Tern's own command-lens blocks stay: they are command output.

Regions 表（surface 根的固定三个子节点）：

| Id | Holds |
| --- | --- |
| `main` | The flowing document (a transcript). It scrolls with the pane. |
| `dock` | Sticky at the pane's bottom while the surface is live: an editor, a status line, a working indicator. Removed on close. |
| `layer` | Overlays floating above everything. Removed on close. |

> **Adopt.** `o` with `{"id":"s1","adopt":true}` reopens the newest closed inline surface with that id still in this pane's scrollback: the same document, fully editable again … A program adopts after a stop/start cycle (an external editor) so its transcript continues in place instead of printing a second copy.

> **Not listening.** `listen:false` (any mode) says the program never reads its input. Tern then sends nothing about the surface: no acks (send frames without waiting for credits), no events, no errors, and no answers at all until your next `q` or listening `o`.

> **Suspend.** The `["suspend"]` and `["resume"]` frame ops hand the pane back to the grid for a while (an interactive shell command, an external `$EDITOR`).

> **Crash safety.** When the pane's process exits, every live surface closes: inline and flow ones as if `keep:true` (a dead pane stays to be read), screen ones discarded. RIS (`ESC c`) clears the screen and its surfaces with it.

> **Aside** (feature `aside`). A `prefs` node in an inline surface's `layer` is a sheet docked at the pane's right edge, not an overlay: the pane reserves the width of Tern's own settings sheet for it (at most 60% of the pane).

## 逐字摘录：Flow Control, Persistence and Security（operations）

> **Credits.** Keep at most `credits` frames (2 unless the `hello` reply says otherwise) unacknowledged. An `ack` carries the highest frame `s` the window has drawn, and covers every frame up to it … Credits replace render timers and update coalescing.

> **Who acks.** The window that draws the surface sends the `ack`. While no window shows the pane (a detached session), none arrive … A surface opened with `listen:false` gets no acks, so it sends without credits.

> **Streaming.** Stream text as `text append` ops on an `md`, `ansi` or other text node: the bytes on the wire are only the new ones, and an `md` node re-renders from its last open block on.

Retention：

> Tern gives each pane a surface budget: 64 MiB of document state by default … Each frame, palette, stylesheet or close that leaves the pane over budget evicts, in this order: 1. Closed surfaces and finished command blocks, whole, oldest first. 2. The oldest settled top-level children of `main` of open surfaces. Only a child you settled itself counts, not one with a settled descendant. Tern reports each with a `gone` event.

Persistence：

> The pane's screen owns the surface documents. In a Tern session, the session daemon's screen holds them and every attached window receives the same bytes, so documents survive a window restart the way grid content does.

> A window attaching to a running pane gets a snapshot that replays, through the normal parser, a `hello` with your program's `app` and `features`, then each surface (closed ones first) as a synthetic `o` (with its mode, `listen`, `title` and `role`), its palette (`t`) and stylesheets (`s`), and one frame with your last `s` adding the whole document followed by `settle`s for settled nodes, the focus and `suspend` when suspended.

> A pane restored after its daemon stopped (a crash or a restart) starts a new shell. Its inline and flow surfaces and command blocks come back closed in the scrollback, read-only, where their anchor rows were; `screen` surfaces don't come back.

> Blobs are kept on disk by their SHA-256 (Tern's cache folder, `blobs/`), so a snapshot or a restored pane shows its images without your program resending them.

> View-only state (folds, control flips, scroll positions) is the window's and isn't in a snapshot.

Security：

> No scripts and no raw HTML. … Program CSS only reaches inside its own surface, and it can't load anything (`url()`), escape the pane (`position: fixed`) or bring fonts … Links behave like OSC 8 hyperlinks: shown on hover, opened only on an explicit gesture. … Events carry only ids the program created, plus values the user chose. Typed text reaches you as pty input, never as events, with two opt-in exceptions: native editing's `edit` events (the `edit` feature) and a `send` the user or Carly asked for (the `send` feature).

协议限制表（operations 页尾）：

| Limit | Value |
| --- | --- |
| One blob | 16 MiB decoded |
| Blobs kept per screen | 256 MiB; past it, unreferenced blobs go, least recently used first |
| Blobs kept on disk | 1 GiB; the least recently shown go when the daemon starts |
| Nodes per surface | 200 000, root included |
| Depth | 64 levels |
| Stylesheets per surface | 256 KiB of CSS, all sheets together |
| One APC string | 262 144 bytes; Tern abandons a longer one silently. Chunk bodies at the `hello`'s `apc` (65 536) |
| One chunked message | 24 MiB joined; a sequence idle for 1 s or interrupted by another TSP message is dropped with `error` |
| Surface state per pane | 64 MiB by default |

## 调研笔记（ProtocolScout 摘要，非逐字）

- TSP 让 pane 里的程序把 UI 描述成语义组件树，Tern 负责布局、绘制、动画；程序不再自绘格子。
- document：surface 的内容，节点树 `{"id","k","p","c"}`，根是 surface 自己，根下固定三个 region。
- frame：`{"sf","s","ops"}` 一批 op 原子应用，Tern 只在帧间绘制；op 按 id 寻址（add/set/text/splice/move/del/settle/focus/reveal/scroll/suspend/resume）。
- 握手：`q`（hello）+ DA1 哨兵探测终端是否说 TSP；hello 声明程序能力（`edit`/`undo`/`send`），回复声明终端能力（`blobs`/`settle`/`adopt`/`dock`/`program-palette`/`reduce-motion`/`aside`/`scroll`/`styles`/`flow`）与 `kinds` 词汇表、`apc`、`credits`、`cols`/`cell`/`dark` 等。
- 不等待启动：`TERM_PROGRAM=tern` 且不在 multiplexer 内时可不等回复直接发 `o`+首 `f`；1 秒无回复则 `x keep:false` 回退自绘。omp 走此路径。
- blob：`b` verb 发送二进制，body 为 base64，id 为解码字节的 hex SHA-256；内容寻址、被 pane 的 surfaces 共享、Tern 存盘。
- chunk：body 超过 `apc`（默认 65536）时按同 verb 拆多消息。
- stylesheet：`s` verb 安装/替换 surface 的 CSS，级联在 Tern 之后、选择器仅限该 surface 内部。
- palette：`t` verb 在 `o` 后、首个 `f` 前发送完整主题（dark/light token 映射）；关闭后仍附在 surface（scrollback 保色）。
- native editing：Tern 在 `editor`/`input` 里持 GUI 式选择，选区按键变 `edit` 事件；需 hello feature。
- send：原子地向 composer 提交提示词；需 field `sendable:true`。
- pointer actions：`toggle`/`copy`/`open`/`zoom` 在 Tern 侧执行，`select`/`activate`/自定义名发事件给程序。
- form values：`el form` 内节点事件附带各 enabled named 控件的当前值。
- ages：时长以"已流逝毫秒"传输（`elapsed.age`），Tern 存 `start = receive time − age`，无时钟同步问题。
- 调试：`PI_TUI_TSP_RECORD=`（omp 侧）记 JSONL；`surface-play` 回放；control socket `tree`/`css` 检视。
- 方向：program→terminal 走 pty 输出侧 APC（verb `q`/`o`/`f`/`b`/`t`/`s`/`x`）；terminal→program 走 pty 输入侧（`r`/`e`）；Windows ConPTY 下输入侧改 OSC 877。
- SDK：四种语言（Rust `tern-sdk`、Python、Go `go/tern`、TS `@stencil-hq/tern`），线上字节一致。
- 安全：无脚本无 raw HTML；程序 CSS 丢 `url()`/`position:fixed`/`@font-face`；typed text 永不作为事件发给程序（`edit`/`send` 两个 opt-in 例外）。
- 所有权（index 页 "Who owns what"）：文档内容、状态、输入、历史归程序；布局、动画、view-only state（hover/scroll）归 Tern（从不报告）；theme 归程序默认（用户可切回）；folding/checkbox 翻转立即生效并上报。
- 边界：blob 驱逐措辞两处略异（"asking counts as a use" vs "least recently shown"），实际判定未验证。
