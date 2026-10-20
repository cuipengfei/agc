# Tern Inbox 特征行为实测（0.9.4）

> Source: 本机 `tern help dev` 输出、`strings /home/cpf/.local/bin/tern`、用户提供的交互现象
> Collected: 2026-10-20
> Published: Unknown

## CLI 帮助中的 inbox 命令

`tern help dev` 的 world commands 段给出四条命令与行为说明：

```text
inbox                             Opens the inbox.
inbox go                          Goes to the inbox's selected entry.
inbox clear                       Clears the inbox.
inbox close                       Closes the inbox.
```

`tern inbox --help` 返回 `tern: inbox: No such file or directory (os error 2)`，即 `inbox` 不是 CLI 子命令，仅存在于 ctl/scenario 命令域。

## 键位证据

二进制 strings 中出现：

```text
apple:ctrl+cmd+h    Opens the inbox.
```

用户报告按 `cmd+shift+I` 可打开 inbox。`strings` 输出未直接出现 `cmd+shift+i` 或 `ctrl+shift+i`，`ctrl+cmd+h` 与 `cmd+shift+I` 的对应关系无法从二进制 strings 直接确认，可能经键位映射层或用户自定义。

## 二进制 strings 中的 inbox 相关条目

- `Inbox` 作为 UI 标签出现（ accessibility 树条目）
- `inbox` 图标（`cod-inbox`、`fa-inbox`、`md-inbox` 等）出现在图标列表
- `Priority inbox closed, shutdown.` 与 `Inbox closed, shutdown.` 出现在异步 actor 日志中，说明 inbox 有独立的消息通道
- `) and the inbox always switch.` 出现在某段 UI 切换逻辑描述中

## alert 命令族（attention 域同组）

`tern help dev` 中与 inbox 同列的 alert 命令：

```text
alert bell [<detail>]
alert done <status> <command> [<seconds>]
alert exited <status>
alert waiting <message>
alert finished [<message>]
alert failed [<message>]
```

这组命令在 scenario/ctl 域内模拟 pane 的 bell、命令完成、程序退出、等待用户等事件。inbox 与 alert 同属 attention 域，但 inbox 条目如何生成（omp 直接发送、由 alert 触发、或由 pane 事件自动产生）在当前证据中无法确认。

## 用户提供的 omp 集成现象

用户报告：omp 可以 post msgs 到 inbox 供查看。此现象的通信协议、消息格式、条目字段均未见于 `tern help dev` 或 binary strings 的可解读片段。

## omp 侧通知路由源码证据（2026-10-20 补）

oh-my-pi 源码 `/home/cpf/code-inside/oh-my-pi` 直读：

- `packages/coding-agent/src/modes/controllers/event-controller.ts:2940` — `sendErrorNotification` 构造 `TERMINAL.sendNotification({title: sessionName || "omp", body: "Stopped with error", type: "error", actions: "focus"})`
- `packages/coding-agent/src/modes/controllers/event-controller.ts:2965` — `sendCompletionNotification` 构造 `TERMINAL.sendNotification({title: sessionName || "omp", body: "Complete", type: "completion", actions: "focus"})`，仅在 `completion.notify !== "off"` 且非 Warp OSC 777 协议时发送
- `packages/coding-agent/src/tools/ask.ts:589` — ask 通知：`TERMINAL.sendNotification({title: "omp", body: "Waiting for input", type: "ask"})`
- `packages/tui/src/terminal-capabilities.ts:50-54` — `NotifyProtocol` 枚举：`Bell = "\x07"`、`Osc99 = "\x1b]99;;"`、`Osc9 = "\x1b]9;"`
- `packages/tui/src/terminal-capabilities.ts:628` — Tern 的 `TerminalInfo`：`notifyProtocol = NotifyProtocol.Osc99`
- `packages/tui/src/terminal-capabilities.ts:159-173` — `formatNotification`：OSC 99 已确认能力时发结构化通知，否则折叠为单行 OSC 99 或 OSC 9
- `packages/tui/src/terminal-capabilities.ts:175-197` — `sendNotification`：先经 `routeTerminalMultiplexerNotification`（Herdr 等多路复用器拦截），未路由则 `writeTerminalSequence` 直写 pty
- `packages/wire/src/tsp.ts:8-12` — TSP 消息格式：`ESC _ tsp ; <verb> [; <key>=<value>]* ; <body> ESC \`，程序→终端动词 `q/o/f/b/t/x`，终端→程序 `r/e`；TSP 动词集无 `inbox` 或 `alert`

结论：omp 经 `TERMINAL.sendNotification` 发 OSC 99 转义序列到 pty，Tern 作为终端接收端处理。inbox 不是 TSP 动词，Tern 侧如何把 OSC 99 通知转为 inbox 条目仍未在 Tern 源码或文档中确认。
