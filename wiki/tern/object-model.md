# Tern 对象模型：包含关系、数量与生命周期

> Sources: Stencil official Tern documentation, 2026-10-20; Tern 0.9.4 (b9ef74c) binary strings and local process inspection, 2026-10-20
> Raw: [Concepts、Guides、Reference、Examples 官方摘录](../../raw/tern/2026-10-20-official-docs-concepts-guides-reference.md); [Surface Protocol 章节官方摘录](../../raw/tern/2026-10-20-official-docs-protocol-chapter.md); [Scripts、Elements、Styles 官方摘录](../../raw/tern/2026-10-20-official-docs-scripts-elements-styles.md); [设置 Schema 二进制字符串摘录](../../raw/tern/2026-10-20-settings-schema-from-binary-strings.md)
> Updated: 2026-10-20

## Overview

Tern 的对象体系围绕 session daemon 展开：pane 及其权威画面正本保存在 daemon 进程，窗口附着 daemon 并镜像画面；窗口持有 session、tab 与界面状态。本文整理官方 glossary 的规范定义、对象间的包含与数量关系、所有权划分、生命周期与关闭策略，以及脚本命令页和二进制内置文本中出现的界面词汇，最后记录术语冲突与本机进程验证。

## 核心对象定义

官方 glossary（Reference › Glossary）逐字定义了以下对象：

> Session — A named set of tabs in a window, as `cx.session` reads it; a window can hold several.

> Daemon — The session daemon: the per-user process that owns the panes and runs the host halves for this machine. Windows attach to it.

> Block — A pane whose program is Lua: a block type defined by a plugin's host half and started by the palette, "Open with", a route decision, `cx:new_block` or a workspace. It lives in the daemon's pane table like a shell and draws through the surface protocol.

> Lens block — The block in a shell pane that holds a claimed command's raw output and shows its lens view; Raw shows the output itself.

> Replica — One copy of a pane's screen: the daemon's, each attached window's, iOS's, the web tab's. Only the host runs Lua; replicas learn claims from the catalog and views from the host.

> Window key — The key that names a window's sessions in the daemon; panes see it as `$TERN_WINDOW_KEY`, and `tern` commands pick one with `--window`. A host effect goes to every window with the pane's window key.

所引 glossary 摘录未包含独立的 Host 与 Pane 词条，两者的含义从相邻条目拼合：Pane 是 daemon 拥有、承载 shell 或 block 的格子（Daemon 词条称其 "owns the panes"，Architecture 段落称 "Tern's panes, and the authoritative copy of each pane's screen, live in the session daemon"）；Host 是运行 daemon、承载各插件 host half 的那台机器（Catalog 词条以 "a host's plugins" 表述其归属）。

## 包含与数量链

按脚本章节的梳理，包含关系构成一条单向链：一个 window 持有多个 session，一个 session 持有多个 tab，一个 tab 持有多个 pane，一个 pane 至多持有一个 block。其中 "a window can hold several" 有 glossary 原文支撑；链上其余数量关系来自脚本章节的调研梳理，按定性结论引用。

数量上另有三个固定搭配：

- daemon 为每用户、每机器一个的进程，持有全部 pane 及其画面正本（Daemon 词条与 Architecture 段落）。
- 每个插件在每个 host 拥有一条 worker 线程（worker 内含该插件的 VM）；每个插件在每个 window 拥有一条 VM。glossary 原文："One Luau virtual machine: one per plugin on each host (in its worker) and one per plugin in each window."
- VM 之间相互隔离，共享范围只有数据目录；每个 VM 上限 256 MiB。

## 所有权

Architecture 段落给出逐字段的归属划分：

> Tern's panes, and the authoritative copy of each pane's screen, live in the session daemon. Windows attach to the daemon and mirror the screens; when a window quits, its panes keep running.

> UI state is different: a window's tabs, focus, palette, keymap, chrome and style sheets belong to that window and are mutated on its UI thread, one event at a time.

可见 pane 正本属于 daemon，tabs、focus、palette、keymap、chrome 与样式表属于 window。Surface Protocol 章节的 operations 段落补充了 snapshot 的边界：

> View-only state (folds, control flips, scroll positions) is the window's and isn't in a snapshot.

即只读查看状态（折叠、控件翻转、滚动位置）留在窗口本地，窗口附着 pane 时收到的 snapshot 不含这部分。

## 生命周期

pane 的存活跟随 daemon，窗口退出后 pane 继续运行（见上节 Architecture 引文）。daemon 重启时的恢复顺序有逐字段说明：

> Daemon restart: When the daemon starts and finds the state file of one that stopped (quit, crashed, or the machine restarted), it loads plugins first and then restores the saved panes. Shells come back as login shells; a plugin block comes back as the same block type, started from the state its `save` returned last, at its last size, on a blank screen.

就地升级（Unix）同样保住运行中的程序："An upgrade hands the daemon over to the new build without ending any program: shells keep their pseudoterminals, screens and scrollback." 插件块没有伪终端，升级前插件先行退出，最后保存的 state 由新 daemon 据此重建。

lens 块的重建依赖 rehydration 机制：lens 状态只保存在 worker 的 VM 中，每个插件保留最近 256 条 capture；reload、daemon 重启或 capture 被逐出后，lens 块仍持有命令行、工作目录、原始输出、宽度与退出状态，事件到来时 worker 按 `match` globs 重新认领，命中则重放 `open`、`line`、`finish`，再处理事件并发送新视图。

关闭策略由 `confirm-close` 控制，脚本章节逐字段给出取值与默认值：

> Closing policy：`confirm-close never|running|always`。
> The default is `running`: ask when a program other than an idle shell would end, including a running command, an editor or an agent mid-turn. Idle shells and agents between turns close without asking.

该策略按 block、tab、session、window 四级生效（来自脚本章节的调研梳理，定性引用）。session 一级另有锁定机制：

> A lock refuses closure of the session, its tabs and its blocks, showing a toast rather than failing the script.

锁的状态不进控制端点输出："In `tern ctl state`, `sessions` lists each session's `name`, tab count and `current` flag. … The lock is not exposed in state." 关闭唯一剩下的 session 时，该 session 保留为空壳："Closing the only session leaves it present with no tabs."

## 界面词汇

以下词汇描述窗口中的浮动与辅助界面，多数只在脚本命令页与二进制内置文本中出现。

pill（胶囊）是 Float 布局里盛放标签页的浮动容器。Layout 枚举的注释逐字段说明：

> Zen: the terminal fills the window; a glass pill holds the tabs and fades while you type.

该枚举同时强调四种布局 "terminal-first" 且 "shows the same tabs and panes"，即 pill 只改变标签页的包装形态，标签页与 pane 的层级结构保持不变。

PiP card 是浮动在宿主 block 之上的卡片。脚本章节给出命令与状态字段：`pip float [<corner>]` 把聚焦的分屏块浮起，corners 取 `tl`/`tr`/`bl`/`br`；`pip stash|unstash|stash-all|fan|see|menu` 管理卡片堆叠与展开；`pip dock [left|right|up|down]` 把卡片放回宿主旁的分屏并从 `pips` 中移除。状态字段逐字为：`mode` is `glance`, `focus`, `expanded` or `hidden`；`deck` is `whole`, `peek` or `hidden` when laid out。

stage 与 park pile 来自二进制内嵌设置注释：`park_pile` 字段注释为 "Where the parked panes' pile rests on the stage's bottom edge"，即被停放的 pane 在舞台底边排成一堆，字段控制这堆的位置与大小。

Mission Control 与 tab peek 由 `peek` 命令与三指手势触发：脚本命令 `peek [strip|mission|close]` "Opens the tab strip or Mission Control, or returns to the terminal. Defaults to `strip`"；设置项 `three_finger_swipes` 的注释为三指手势开 tab peek、Mission Control、切 tab 与 dismiss banners。

inbox 与 banner 同属 attention 域：`alert bell|done|exited|waiting|agent-done` 触发通知，inbox 由 `inbox`、`inbox go`、`inbox clear`、`inbox close` 四条命令查看与清理。

需要注明：stage、park pile、Mission Control、tab peek 这些词仅见于本地二进制内置文本与脚本命令页；官方 SDK 文档概念章的 glossary 未收录这些词条。

## 进程拓扑与验证

"daemon 保活 pane、窗口即观察口"的直接证据是本机进程树。2026-10-20 实测（`pstree -ps` 输出）：

```text
systemd(1)---python3(1180314)---tern(1180316)---zsh(1180349)---omp(1530955)
```

当前 omp 会话（pts/42）运行在由 tern daemon（`tern daemon --socket /run/user/1000/tern/daemon.sock`）拉起的 shell 之下；同机另一 omp（pid 1312107，pts/6）的父进程是普通 zsh（2057），不在 tern 之下。同时运行的还有 `tern web serve --listen 127.0.0.1:8378`。实测时 `tern --version` 输出 `tern 0.9.4 (b9ef74c)`。这条父链与 Architecture 引文一致：pane（此处为 shell）由 daemon 持有，窗口及其中的 omp 只是附着者。

## 术语冲突记录

session 存在双重表述。官方 glossary 定义为窗口内的命名 tab 组（"A named set of tabs in a window"）；CLI 帮助语境中则出现 daemon 持有 sessions 的说法。后者未能在所引 raw 中逐字检到，按未定证据处理。调和读法：glossary 描述的是窗口侧的呈现单位（`cx.session` 读取的对象），daemon 侧保存 sessions 数据并向窗口提供附着（设置项 `share_sessions` 的注释允许本机 session 被 serve 到其他机器和浏览器），两种表述分别对应呈现层与持有层，指向同一批 session。

另一处待验证：本地 strings 中 Layout 枚举尾部出现 "Whether its tab bar shows each tab's Deck icon: Rail and Studio do, Float and Tiles name tabs in text alone"，说明 Deck icon 是标签栏上的图标且随布局开关；同时脚本章节 pip 状态里有 `deck` is `whole`, `peek` or `hidden`。字符串表中的 "Deck tile" 未能在任何 raw 中逐字检到，Deck icon/Deck tile 与 pip 页的 deck 是否为同一概念，标注未验证。

## See Also

- [Tern 官方文档地图](official-docs-map.md)
- [Tern 插件架构与平台边界](plugin-architecture.md)
