# Tern 官方文档：Scripts / Elements / Styles 摘录与调研笔记

> Source: https://docs.stencil.so/tern/ (scripts, elements, styles sections)
> Collected: 2026-10-20
> Published: Unknown

「逐字摘录」为官方页面原文；「调研笔记」为 ScriptsScout 与 ElementsScout 的中文摘要，非逐字。

## 逐字摘录：Scripts › Sessions and Blocks

> These commands group tabs into named sessions, switch between them, protect work from closing, and choose what new terminal blocks run.

- `session new [<name>]`：Creates a session, switches to it and opens its first tab. 省略或空白名字产生 unique random two-word name。
- `session switch <name>` / `session rename <name>` / `session close` / `session lock` / `sessions [<query>]`。
- > A lock refuses closure of the session, its tabs and its blocks, showing a toast rather than failing the script.
- > Closing the only session leaves it present with no tabs.
- > In `tern ctl state`, `sessions` lists each session's `name`, tab count and `current` flag. … The lock is not exposed in state.
- Closing policy：`confirm-close never|running|always`。
  > The default is `running`: ask when a program other than an idle shell would end, including a running command, an editor or an agent mid-turn. Idle shells and agents between turns close without asking.
- `block shell|agent`：Opens the explicitly chosen kind of block and focuses it。`agent-command <text>` 设置未来 agent 块运行的命令（默认 `omp`）；`new-blocks shell|agent` 选择新 tab/分屏打开的块类型。
- > Agent blocks follow the agent-placement preference: by default a split to the right, optionally a new tab or replacement of the tab's only idle shell.
- 等待语义：real-work waits fail after 20 seconds；`session close` 与 `sessions` settle 450 ms。

## 逐字摘录：Scripts › Terminal and Panes

- `split right|down` / `close` / `zoom`（Toggles zoom on the focused pane）/ `equalize` / `focus left|right|up|down|next|prev` / `resize` / `tab new|next|prev|close|<n>` / `rename` / `palette` / `find` / `context pane|tab`。
- `layout rail|float|tiles|studio`：Switches the window layout. Layout names are case-insensitive.
- State：`panes` gives terminal dimensions, `focused.id` identifies focus, `tabs` gives titles, pane counts, active and zoomed flags, and `decks` describes arrangement.
- `font-weight <weight>`：clamped to 100–900。`adjust-cell-height` 结果行高 limited to half through three times the unadjusted height。
- `theme [dark|light] "<name>"`：Changing one appearance's theme preserves the other appearance's choice.
- attention：`alert bell|done|exited|waiting|agent-done`；`inbox` / `inbox go` / `inbox clear` / `inbox close`；`peek [strip|mission|close]`：Opens the tab strip or Mission Control, or returns to the terminal. Defaults to `strip`.

## 逐字摘录：Scripts › Pictures in Picture

> `pip` commands create and arrange blocks floating over an owner block in the active tab.

- `pip float [<corner>]`：Floats the focused split block over the block taking over its space。`float` fails if the focused block cannot float: it needs another eligible block to own it.
- `pip new [<corner>] ["<address>"]`：Creates a browser card over the focused block。corners 为 `tl`/`tr`/`bl`/`br`。
- `pip focus` / `pip expand` / `pip dock [left|right|up|down]`：
  > Returns the focused card to a split beside its owner … Docking removes the card from `pips`.
- `pip drag` / `pip release` / `pip fling`：
  > A landing can change the corner, rebind the card to another owner, dock it or stash it at an edge.
- `pip stash|unstash|stash-all|fan|see|menu`。
- State：`pips` 暴露 `id`、`owner`、`corner`、`slot`、`rect`；`mode` is `glance`, `focus`, `expanded` or `hidden`；`deck` is `whole`, `peek` or `hidden` when laid out。
- 多数命令 settle 650 ms 动画时间；`drag` settle 50 ms。

## 逐字摘录：Styles › Supported CSS（关键段）

> Tern draws plugin views with its own engine, not a browser. It accepts a defined subset of CSS, plus a few Stencil extensions.

Sheet 来源表：

| Source | Sheet name | Scope |
| --- | --- | --- |
| Manifest `styles` | `plugin:<host>:<id>:styles` (`plugin:local:<id>:styles` on this machine) | Global author sheet |
| `tern.css(name, source)` | `plugin:local:<id>:<name>` | Global author sheet |
| A TSP program's surface sheets | `tsp:<scope>:<name>` | Confined to its surface |

Cascade order：

> 1. Tern's user-agent sheet. 2. Author rules (Tern's built-in sheets, then plugin sheets), by specificity, then by sheet order, then by position in the sheet. Because plugin sheets register after Tern's, your rule beats Tern's rule of equal specificity. 3. The element's inline style. 4. Then the same order again for `!important` declarations.

长度单位：只接受 `px`、`em`、`vw`、`vh`、`%`、裸 `0`；`rem`、`ch`、`ex`、`lh`、`vmin`、`vmax`、`dvh`、`cm`、`pt` 等均 rejected with `unsupported length unit`。数学函数 `calc()`/`min()`/`max()`/`clamp()` 可用且可嵌套。`revert`/`revert-layer` 不支持。`@media` 仅 max-width/max-height（px）加三个偏好特性；`@import`/`@layer`/`@supports`/`@container` 等 at-rule 被拒绝。

## 调研笔记（ScriptsScout 摘要，非逐字）

- 顶层对象：Window（窗口或 headless 窗口，可经控制端点脚本驱动）；Session（命名的 tab 分组，可锁定）；Tab（含 1..n 个 pane，有方向/标题/busy/active/zoomed 标志）；Pane（活动 tab 中按阅读顺序编号的格子，持终端或一个 block，全局唯一 focus）；Host（远程主机：name/address/state/sessions/identity/tern 版本/update）。
- 控制端点：Unix socket 或 127.0.0.1 TCP 端口（默认 `/tmp/tern.sock`），一行命令换一行 JSON 回复；`tern ctl state` 输出应用状态 JSON，按主题暴露 panes/tabs/sessions/settings 及各 block 类型一项。
- Script：每行一条命令的纯文本；`tern shot`/`serve`/`ctl --file` 三种执行路径。
- 各块类型域：browser（地址归一化：显式 scheme 保留、点分主机补 https://、localhost/IP 补 http://、其余变搜索）；files pane（block 旁的目录树面板，per-tab 钉 root，visible≤200 行、selection≤64 路径）；file block（rendered/source/hex/image/text 模式，git 改动区）；task-manager（实时进程列表，列 pane 所属 host 的进程）；screen（host 显示器共享，iOS/web 只能看）；git（graph/changes/diff，桌面专用）；sqlite（Structure/Browse/Execute/Pragmas 四区 + cell/plot 侧栏）；notebook（真实 kernel，桌面专用）；board（Markdown 任务板 lanes/cards）；profile（火焰图，macOS sample/Linux perf/Windows 采样器）；carly（内置助手，真实工具，桌面专用）；status 域（account gate/update/kickoff 可编排模拟状态）。
- 关系：window →1..* session；session →1..* tab；tab →1..* pane；pane →0..1 block；session lock 拒绝关闭其 tabs/blocks；confirm-close 应用于 block/tab/session/window 四级；pip card →1 owner block（可 rebind）；host →1..* sessions；procs 块列其 pane 所属 host 的进程；session 的 tab 可被 move-pane 跨会话迁移；移到另一 host 会失败。
- 桌面专属：git/notebook/carly/kickoff；web 客户端不跑多数 script runner。

## 调研笔记（ElementsScout 摘要，非逐字）

- kind 分族：布局（col/row/card/section/rule/spacer）；文本（text/md/code/diff/ansi/rows/math）；数据（kv/table/tree/badge/kbd/icon/image）；列表（list/item/tabs/picker）；动效（spinner/shimmer/elapsed/rate/progress/meter/chart/effort）；输入（editor/input）；框架（status/seg/toast/overlay）；工作（tool/agent/checklist/block/prefs）；裸元素（el，固定标签白名单）。
- 行为要点：col 超 64 子或超 3 视口自动虚拟化；card 折叠状态按 key 本地记忆；md 支持 callouts/GFM 表/task lists/数学/mermaid/流式与长文档虚拟化；code 超 400 行虚拟化；ansi 只画视口行；list 超 200 项或 virtual=true 池化虚拟行；picker 为数据驱动模态玻璃 sheet；editor 多行字段（vim mode chip、ghost text）；input 单行；overlay 永不夺键盘；tool/agent/checklist 为工作类 kind；prefs 为设置页 kind（main=全页、layer=右 dock sheet）。
- 文本归程序所有：所有键盘先到 key handler；focus 走原始 op；native editing 按 hello features 开关；IME 在隐藏 textarea 合成。
- 本地状态模式：折叠、树开合、el 控件翻转、Native/Raw 均按 key 在兄弟间记忆，程序发送不同 prop 才覆盖。
- 样式钩子分层：稳定 `.sf-*`/`[data-id/role/tone]`/`[data-surface]` vs inner class（版本间可变）。
- tone 九值：neutral/accent/info/success/warning/error/pending/muted/user；经 `data-tone` → `--tc` 变量。
- 变量三层：kit 默认 → 主题内联 → 区域网格指标；程序 palette 在区域内联 `--sf-p-*` 并加 `.sf-pal`，对比度校正（≥4.5:1，静默 token 3:1）；插件 surface 无 palette。
- chat skin（Reader/Spine/Console）作用于 inline 与 screen surface；flow 输出与 lens block 无皮肤。
- 双时钟动画：CSS keyframes 走文档时钟；elapsed/rate 走视图 tick（age 锚定）。
- 未逐字核对：variables.md 中段 token 表、css.md 逐属性表、elements 各 kind 的 props 细节。
