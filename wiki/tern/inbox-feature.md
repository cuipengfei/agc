# Tern Inbox 特征行为

> Sources: 本机 tern 0.9.4 (b9ef74c) `help dev` 输出与 binary strings 实测，2026-10-20; oh-my-pi 源码 `/home/cpf/code-inside/oh-my-pi` 直读，2026-10-20；OSC 99 直写 pty 实测， 2026-10-20
> Raw: [Tern Inbox 特征行为实测](../../raw/tern/2026-10-20-inbox-feature-evidence.md); [OSC 99 inbox 实测](../../raw/tern/2026-10-20-osc99-inbox-test.md)
> Updated: 2026-10-20

## Overview

Inbox 是 Tern 窗口的 attention 域组件：聚合 pane 事件与外部消息，以列表形式呈现，支持选中跳转与清空。四条命令在 ctl/scenario 域可用，无 CLI 子命令。

## 命令与行为

`tern help dev` 的 world commands 段逐字给出：

```text
inbox                             Opens the inbox.
inbox go                          Goes to the inbox's selected entry.
inbox clear                       Clears the inbox.
inbox close                       Closes the inbox.
```

`inbox go` 的“跳转”暗示条目与 pane 或事件源存在关联，但关联字段与跳转目标未在帮助中说明。

## 键位

二进制 strings 中 `apple:ctrl+cmd+h` 紧邻字符串 `Opens the inbox.`，为 macOS 默认键位。用户报告 `cmd+shift+I` 也可打开；`strings` 输出未直接出现 `cmd+shift+i` 或 `ctrl+shift+i`，该键位与 `ctrl+cmd+h` 的对应关系（重映射、平台差异或用户自定义）当前无法确认。

## 与 alert 命令族的关系

`tern help dev` 将 inbox 与 alert 命令列在同一段：

```text
alert bell [<detail>]
alert done <status> <command> [<seconds>]
alert exited <status>
alert waiting <message>
alert finished [<message>]
alert failed [<message>]
```

alert 命令在 scenario/ctl 域内模拟 pane 的 bell、命令完成、程序退出、等待用户等事件。inbox 与 alert 同属 attention 域。

## omp 到 inbox 的消息通道（2026-10-20 补）

omp 源码给出通知的完整发送链：

1. `event-controller.ts:2940` — 错误时 `TERMINAL.sendNotification({title: sessionName || "omp", body: "Stopped with error", type: "error", actions: "focus"})`
2. `event-controller.ts:2965` — 完成时 `TERMINAL.sendNotification({title: sessionName || "omp", body: "Complete", type: "completion", actions: "focus"})`（`completion.notify` 为 `off` 或 Warp OSC 777 已激活时不发）
3. `ask.ts:589` — 等待用户输入时 `TERMINAL.sendNotification({title: "omp", body: "Waiting for input", type: "ask"})`
4. `terminal-capabilities.ts:628` — Tern 的 `TerminalInfo` 声明 `notifyProtocol = NotifyProtocol.Osc99`
5. `terminal-capabilities.ts:175-197` — `sendNotification` 先经 `routeTerminalMultiplexerNotification`（Herdr 等拦截），未路由则 `writeTerminalSequence` 直写 pty
6. `terminal-capabilities.ts:159-173` — `formatNotification` 在 OSC 99 能力已确认时发结构化通知，否则折叠为单行 OSC 99 或 OSC 9

TSP 动词集（`wire/src/tsp.ts:31`：`q/o/f/b/t/x/r/e`）无 `inbox` 或 `alert`。omp 不用 TSP 发 inbox 消息，而是写 OSC 99 转义序列到 pane 的 pty。

Tern 侧处理链：二进制 strings 显示 Tern 内置 `Inbox` UI 标签、`Priority inbox closed, shutdown.` 异步通道日志、`apple:ctrl+cmd+h` 键位标注 `Opens the inbox.`。Tern 如何把收到的 OSC 99 通知转为 inbox 条目（是否所有通知都进 inbox、是否有过滤、条目字段如何映射）在 Tern 源码与文档中未确认。

## OSC 99 直写 pty 实测（2026-10-20 补）

在当前 Tern web mode 窗口的 shell pane 里直写三条 OSC 99 结构化通知（JSON body），无任何一条出现在 inbox，窗口无可见变化。用户随后报告 OMP 完成通知确实出现在 inbox。

当前 shell 环境无 `HERDR_ENV` / `HERDR_PANE_ID` 等 Herdr 标识变量，OMP 通知未走 Herdr 通道。直写 OSC 99 与 OMP 通知在 inbox 行为上的差异来源待查，可能原因：

1. Tern web mode 对 shell pane 与 agent 块 pane 的通知处理不同
2. OMP 通知经 Tern 的 `alert` scenario 命令而非 OSC 99
3. OSC 99 结构化 JSON 需要 Tern hello 协商确认后才被解析

## 未验证项

- Tern 侧通知 → inbox 条目的转换逻辑（是否全部通知都进 inbox、过滤规则、字段映射）
- `inbox go` 的跳转目标（pane、tab、scrollback 位置）
- inbox 条目是否有已读/未读状态、是否持久化、是否随 daemon 重启保留
- 条目数量上限与自动清理策略
- OMP 通知实际走哪条通道到达 inbox

## See Also

- [Tern 脚本与自动化面](scripting-surface.md) — inbox 命令在脚本域的位置
- [Tern 对象模型](object-model.md) — attention 域与窗口 UI 状态的关系
