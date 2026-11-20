# 焦点刷新期间的鼠标松开丢失

> Sources: herdrdev/herdr v0.9.5 源码与 `config-reference.json`，2026-11-20；Gaurav-Gosain/sip v0.10.0 源码与隔离 Chromium 实验，2026-11-20
> Raw: [sip + Herdr：焦点刷新期间的鼠标松开丢失](../../raw/terminal-multiplexers/2026-11-20-sip-herdr-focus-refresh-mouseup-loss.md); [Herdr 0.9.5：标签栏位置与滚轮步长](../../raw/herdr-plannotator/2026-11-20-herdr-tab-bar-position-and-scroll-lines.md); [sip 的 KillMode=process 与 ttyd 对齐](../../raw/terminal-multiplexers/2026-11-20-sip-killmode-process-and-ttyd-parity.md)
> Updated: 2026-11-20

## Overview

浏览器终端在程序获得焦点时会重设鼠标捕获。如果这次重设恰好发生在鼠标按下与松开之间，xterm 系前端会移除等待中的 `mouseup` 监听，松开事件不再送达程序。程序侧于是保留一个“已按下、未移动”的选择起点，下一次滚轮就走“滚动并扩展选区”分支，表现为滚轮选中文字。Herdr 在 Linux 上正是这样重设捕获的，因此该组合可以稳定触发。

## 症状与触发条件

同时满足三个条件时出现：

- 承载程序是 Herdr 0.9.5 这类在焦点进入时重设宿主鼠标模式的终端程序；
- 浏览器终端是 xterm 系前端（sip 默认渲染器、ttyd 默认前端）；
- 操作者是先用鼠标单击让终端获得焦点，紧接着滚动滚轮。

表现为：单击聚焦后滚轮把文字选中并高亮；双击终端后恢复正常。pane 内只跑 shell 也出现，与 pane 内运行什么无关。

## 为什么会丢一次松开

Herdr 收到焦点进入（`\x1b[I`）后，在把事件交给界面层之前刷新宿主鼠标模式。Linux 分支先写入一条清除全部已知鼠标模式的序列，再打开 `EnableMouseCapture`：

```text
\x1b[?1006l\x1b[?1016l\x1b[?1015l\x1b[?1005l\x1b[?1003l\x1b[?1002l\x1b[?1000l\x1b[?9l
```

xterm 的 `MouseService` 在协议变化时处理监听：当新的协议不再包含“松开”事件位时，它把 document 级 `mouseup` 监听移除，只保留“应请求的事件”记录；重新开启时不会立刻把监听挂回去，因为监听是在 `mousedown` 分支里才添加的。

于是顺序变成：按下已送达、清除动作移除了监听、松开处于无人接听的空档、重新开启后再挂监听。

Herdr 的选择状态机把“按下但未移动”记为可渲染之外的起点；左键松开时才结束或清除选择。滚轮事件到来时，若存在进行中的选择，它不去滚动历史，而是滚动并扩展选区。两者叠加，就是用户看到的选中文字。

官方在 Windows 路径上修过同类问题（PR #4319，已合并），原文对环境与结论的记载：

> Windows recovery emitted a flushed disable-all sequence followed by the enable sequence. During a focus click, Alacritty could observe the button-down while capture was temporarily disabled and the button-up after capture returned, leaving a selection overlay stuck or capture desynchronized. Re-asserting enabled modes is already idempotent; the destructive clear is only required when disabling.

v0.9.5 的 Linux 分支仍保留“先清除再开启”。

## 实验对照

隔离环境：本机已有 Chromium `156.0.8078.73`，加载 sip v0.10.0 静态资源，不连接现有会话。做法是按住左键期间写入重设序列，再松开、滚动，记录程序侧收到的事件。

| 前端与条件 | 松开是否送达 |
|---|---|
| sip 内嵌 xterm，完整清除后重开 | 否 |
| sip 内嵌 xterm，只重申启用序列 | 是 |
| sip 内嵌 xterm，关闭焦点报告（`\x1b[?1004l`） | 是 |
| ttyd 实际部署前端，完整清除后重开 | 否 |
| sip Worker engine（libghostty-vt wasm） | 是 |

后两行说明两件事：问题出在“重设时序”而不是“sip 独有缺陷”；Worker engine 走另一套指针处理，不经过被移除的 document 监听。

## 判定方法

遇到“滚轮选中文字”时，按顺序排除：

1. pane 内是否运行了什么程序：空 shell 也复现时，与程序无关。
2. 是否只有单击聚焦后的第一次滚轮异常、双击后恢复：符合本机制。
3. 把渲染器换成 Worker engine 或临时关闭焦点报告（`\x1b[?1004l`）：异常消失即指向该时序。

## 规避与修复

- 浏览器侧：sip 设置面板把 Renderer 改为 `Worker engine (experimental)`，本机切换后该现象不再出现；设置保存在浏览器。重连或刷新会结束 sip 的当前 shell，Herdr 的会话记录可用 `herdr --session` 重新进入。
- 滚轮幅度：Herdr `ui.mouse_scroll_lines` 默认 3，最小 1；本机设为 1，客户端需 `menu → reload config` 读取。改动后的体感未单独确认。
- 临时手段：在页面控制台执行 `window.sipTerm.term.write('\x1b[?1004l')`，关闭该标签页的焦点报告；页面刷新或重连后失效，恢复用 `\x1b[?1004h`。
- 程序侧修复方向：捕获已开启时只重申启用状态，仅在关闭捕获或退出时清除全部模式。
- 已提交上游报告：herdrdev/herdr#6114。

## 证据边界

- 已核实：源码中的调用链与清除序列；隔离实验五组结果。
- 未核实：真实浏览器会话里的焦点与鼠标事件顺序；ttyd 与 sip 在真实使用中表现不同的具体原因（同一人工时序下 ttyd 前端也会丢失松开）。
- 本机可读 xterm 源码为 6.1.0-beta.216，sip 标称内嵌 beta.290；行为差异未逐版本比对。
- sip 服务现为 `KillMode=process`（`sip.service:8`），与 ttyd 一致。按 systemd.kill(5) 语义，重启只结束 sip 主进程，Herdr server 与 pane 程序留在原 cgroup，重连后 attach 回到原会话；此条为推断，修改后尚未实测。见 [ttyd 与 sip 并存部署](ttyd-and-sip-side-by-side.md) 的“重启波及范围”小节。

## See Also

- [sip v0.10.0 使用参考](sip-v0.10.0-usage-reference.md)
- [ttyd 与 sip 并存部署](ttyd-and-sip-side-by-side.md)
- [sip Worker engine 下使用宿主字体](sip-worker-engine-host-font.md)
