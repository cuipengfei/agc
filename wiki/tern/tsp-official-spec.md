# Tern Surface Protocol 官方规范要点

> Sources: Stencil official Tern documentation (Surface Protocol chapter), 2026-10-20
> Raw: [Surface Protocol 章节摘录与调研笔记](../../raw/tern/2026-10-20-official-docs-protocol-chapter.md)
> Updated: 2026-10-20

## Overview

TSP（Tern Surface Protocol）是 pane 内程序与终端之间的协议：程序把 UI 描述为语义组件树，Tern 原生负责布局、绘制与动画。本文整理官方规范要点：核心实体、三种 mode 与各自生命周期、握手与能力协商、流控与快照、保留与驱逐、blob、主题、安全边界、持久化、SDK。

## 定位

调研笔记口径（raw 行 87）：TSP 让 pane 里的程序把 UI 描述成语义组件树，Tern 负责布局、绘制、动画，程序不再自绘格子。官方 mode 表把 `inline` 模式标注为「在 pane 里运行会话的程序（omp）」（行 17），即 omp 走此协议；调研笔记亦明确 omp 走不等待启动路径（行 91）。

## 核心实体

- Surface：程序在其 pane 中展示的 document。活动 surface 上的一切随时可编辑，包括滚入历史的部分——scrollback 是 document 的一部分，而非封存的历史记录。一个 pane 可在 scrollback 中持有任意多个 closed surface，但每个屏幕缓冲每种 mode 至多一个 live surface（行 11）。
- Document：surface 的内容，节点树 `{"id","k","p","c"}`，根即 surface 自己，根下固定三个 region（调研笔记口径，行 88）。
- Frame：`{"sf","s","ops"}` 一批 op 原子应用，Tern 只在帧间绘制；op 按 id 寻址，包括 add/set/text/splice/move/del/settle/focus/reveal/scroll/suspend/resume（调研笔记口径，行 89）。
- Anchor：inline 与 flow surface 恰好占一个网格行，即其 anchor；surface 与 anchor 行同寿（行 21）。行滚出 scrollback 末端、被擦除（`ESC [2J`、`clear`）或在滚动区内被滚走、scrollback 被清空，surface 随之消失；开着且程序监听时收到 `{"ev":"gone","sf":"s1","ids":["s1"]}`（行 21）。
- Region：surface 根的固定三个子节点（行 25-31）：

| Id | 内容 |
| --- | --- |
| `main` | 流动的 document（一份 transcript），随 pane 滚动 |
| `dock` | surface 存活期间吸在 pane 底部：编辑器、状态行、工作指示器；关闭时移除 |
| `layer` | 浮于一切之上的 overlay；关闭时移除 |

## 三种 mode 与生命周期

Modes 表（行 15-19）：

| Mode | 适用 | 位置 | 程序之后 |
| --- | --- | --- | --- |
| `inline`（默认） | 在 pane 里运行会话的程序（omp） | 主屏幕光标行，存活期间拥有 pane | 下一个 shell prompt 时丢弃 |
| `screen` | 全屏视图（一个应用、全屏 overlay） | 覆盖整个 pane，像 alternate screen | 关闭时丢弃 |
| `flow` | 非全屏的程序：打印表格、提问或显示进度后退出（feature `flow`） | 主屏幕光标行，处在周边输出之间 | 留在 scrollback 中，像输出 |

生命周期规则：

- Shell prompt（OSC 133;A）意味着程序已离开：Tern 丢弃该 pane 的所有 inline 与 screen surface，包括以 `keep:true` 关闭的那些；flow surface 与 Tern 自己的命令 lens 块留下——它们是命令输出（行 23）。
- Adopt：`o` 带 `{"id":"s1","adopt":true}` 重开 scrollback 中该 id 仍在的、最新的 closed inline surface：同一 document，完全可编辑。程序在 stop/start 周期（如外部编辑器）后 adopt，让 transcript 原地续接，免于打印第二份副本（行 33）。
- Suspend/resume：`["suspend"]` 与 `["resume"]` 两个 frame op 把 pane 暂时交还给网格（交互 shell 命令、外部 `$EDITOR`）（行 37）。
- Crash safety：pane 的进程退出时，所有 live surface 关闭——inline 与 flow 按 `keep:true` 处理（死去的 pane 留着可读），screen 丢弃。RIS（`ESC c`）清屏并带走其 surface（行 39）。
- Aside（feature `aside`）：inline surface 的 `layer` 里放 `prefs` 节点，是停靠在 pane 右缘的 sheet，而非 overlay：pane 为它预留 Tern 自己 settings sheet 的宽度（至多方 pane 的 60%）（行 41）。

## 握手与能力协商

握手与能力协商仅见调研笔记（行 90-91）：终端发 `q`（hello）并用 DA1 哨兵探测程序是否说 TSP；hello 声明程序能力（`edit`/`undo`/`send`），回复声明终端能力（`blobs`/`settle`/`adopt`/`dock`/`program-palette`/`reduce-motion`/`aside`/`scroll`/`styles`/`flow`）、`kinds` 词汇表、`apc`、`credits`、`cols`/`cell`/`dark` 等。`listen:false`（任何 mode）表示程序不读输入：Tern 不再发送该 surface 的任何内容——无 ack（发帧不等 credits）、无事件、无错误、无任何回答，直到程序下一次 `q` 或带监听的 `o`（行 35，逐字）。不等待启动路径：`TERM_PROGRAM=tern` 且不在 multiplexer 内时，程序可不等回复直接发 `o` 与首帧；超时未获回复则以 `x keep:false` 回退自绘（调研笔记口径，行 91，其中的超时阈值未逐字摘录）。

## 流控、credits 与 ack

Credits：至多保持 `credits` 个未确认帧（除非 hello 回复另说，为 2）。ack 携带窗口已绘制的最高帧号 `s`，覆盖到它的每一帧（行 45）。Credits 取代渲染定时器与更新合并。由绘制该 surface 的窗口发 ack；没有窗口显示该 pane（detached session）时一个也不来（行 47）。`listen:false` 打开的 surface 没有 ack，发送方不受 credits 限制（行 47）。流式文本走 `text append` op，发到 `md`、`ansi` 或其他文本节点：线上字节只有新增部分，`md` 节点从上一个 open block 起重渲染（行 49）。

## 快照与保留

快照：窗口附着到运行中的 pane 时，得到一份经正常解析器重放的内容——带程序 `app` 与 `features` 的 `hello`，然后每个 surface（closed 在前）以合成 `o` 重放（含 mode、`listen`、title、role）、其 palette（`t`）与 stylesheets（`s`），随后一帧以最后 `s` 加入整个 document、对已 settle 节点补 `settle`，以及 focus 与 suspend 状态（行 59）。

保留：Tern 给每个 pane 一个 surface 预算，默认 64 MiB document state（行 53、83）。每帧、palette、stylesheet 或 close 使 pane 超预算时按序驱逐：先整个驱逐 closed surface 与已完成的命令块，最旧在前；再驱逐 open surface 的 `main` 中最旧的已 settle 顶层子节点——只算自己 settle 的节点，带 settle 后代的节点不算。每次驱逐以 `gone` 事件报告（行 53）。

## Blob 与协议限制

Blob 按 SHA-256 内容寻址：Tern 以解码字节的 SHA-256 存盘（cache 目录 `blobs/`），快照或恢复的 pane 因此无需程序重发即可显示图片（行 63）。`b` verb 发送二进制、body 为 base64（调研笔记口径，行 92）。

限制表（行 73-83）：

| 限制 | 值 |
| --- | --- |
| 单个 blob | 解码后 16 MiB |
| 每屏幕保留 blob | 256 MiB；超出后未引用 blob 按最近最少用逐出 |
| 磁盘保留 blob | 1 GiB；daemon 启动时逐出最近最少展示的 |
| 每 surface 节点数 | 200 000，含根 |
| 深度 | 64 层 |
| 每 surface stylesheets | 全部 sheet 合计 256 KiB CSS |
| 单个 APC 字符串 | 262 144 字节；更长的被 Tern 静默放弃。chunk body 按 hello 的 `apc`（65 536） |
| 单个 chunked 消息 | 拼接后 24 MiB；空闲 1 s 或被另一条 TSP 消息打断的序列以 `error` 丢弃 |
| 每 pane surface state | 默认 64 MiB |

## 主题

主题分两个 verb（调研笔记口径，行 94-95）：`s` verb 安装或替换 surface 的 CSS，级联位于 Tern 之后、选择器只进该 surface 内部；`t` verb 在 `o` 之后、首帧之前发送完整主题（dark/light token 映射）。surface 关闭后 palette 仍附在其上——scrollback 保持颜色。

## 安全边界

- 无脚本、无 raw HTML（行 69）。
- 程序 CSS 只到达自己 surface 内部，不能加载任何东西（`url()`）、不能逸出 pane（`position: fixed`）、不能带字体（行 69）。
- 链接行为同 OSC 8 超链接：悬停显示、仅经显式手势打开（行 69）。
- 事件只携带程序创建的 id 以及用户选择的值（行 69）。
- 键入文本以 pty 输入到达程序，永不作为事件，两个 opt-in 例外：原生编辑的 `edit` 事件（`edit` feature）与用户或 Carly 请求的 `send`（`send` feature）（行 69）。

## 持久化

pane 的屏幕拥有 surface document：Tern session 中 daemon 的屏幕持有它们，每个附着的窗口收到相同字节，因此 document 像网格内容一样活过窗口重启（行 57）。Daemon 停止后恢复的 pane（崩溃或重启）开一个新 shell；其 inline 与 flow surface 及命令块以 closed、只读状态在 scrollback 中回归，位于原 anchor 行；`screen` surface 不回来（行 61）。View-only state（折叠、control 翻转、滚动位置）是窗口的，不进快照（行 65）。

## SDK

四种语言 SDK（调研笔记口径，行 103）：Rust `tern-sdk`、Python、Go `go/tern`、TS `@stencil-hq/tern`，线上字节一致。

## See Also

- [Tern：TSP 与 browser 后端](tsp-and-browser-backend.md)
- [Tern 对象模型](object-model.md)
