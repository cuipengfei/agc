# tuios workspace 与 session rail

> Sources: tuios 0.8.5 `--skill` 官方文档; 本机实证, 2026-10-06
> Raw: [tuios 0.8.5 workspace 与 session rail 机制摘录](../../raw/terminal-multiplexers/2026-10-06-tuios-0.8.5-workspace-sidebar.md)
> Updated: 2026-10-06

## Overview

tuios 的 workspace 是编号 1–9、无名字的分组，一等公民是 window（pane）；herdr 的 workspace 是带 worktree 和 agent 编排的一等实体。两者同名不同物。tuios 的侧栏叫 session rail，由 `appearance.sidebar.sections` 配置的 sessions/terminals/files/agents 四区块组成，是 herdr sidebar 的真正对应物。

## workspace：编号分组，不是一等实体

`tuios list-workspaces` 列出编号 1–9 的 workspace，每个只有 `WS` 编号和 `WINDOWS` 计数列，`NAME` 列全空。`tuios list-windows` 里每个 window 有一列 `WS` 标明它属于哪个 workspace。

本机实测（2026-10-06）：9 个 workspace，WS1 有 2 个窗口（一个跑 OMP、一个普通 shell），其余 8 个全空。

tmux shim 把 tmux window 映射成 tuios workspace（`@N`）、tmux pane 映射成 tuios window（`%N`），进一步印证 workspace 只是 window 的分组属性，而非独立可编排的实体。

## window（pane）才是一等公民

`tuios list-windows` 的列：`IDX`、`ID`、`NAME`、`WS`、`SIZE`、`AGENT`。`AGENT` 列显示 tuios 识别出的 agent 状态（`working`、`none` 等）。每个 window 有自己的 UUID 和尺寸，workspace 只是它的一个属性。

在 pane 里直接敲命令操作（不需要 TUI 焦点）：

```bash
tuios list-workspaces
tuios list-windows
tuios focus-window --relative next
tuios move-window 2 -w build --follow   # 把窗口挪到 workspace 2 并跟过去
tuios select-workspace 2
tuios split-window vertical -w build --name logs
tuios capture-pane                       # 抓当前 pane 屏幕文本
```

## session rail：herdr sidebar 的对应物

tuios 的侧栏叫 session rail，当前实测配置（全为 default）：

- `appearance.sidebar.enabled` = `true`
- `appearance.sidebar.position` = `right`
- `appearance.sidebar.sections` = `sessions:25,terminals,files:25,agents:34`
- `appearance.sidebar.show_counts` = `true`

`sessions:25,terminals,files:25,agents:34` 表示四个区块自上而下、百分比是高度占比。一个名字从列表里去掉，对应区块就不画。四区块：

| 区块 | 对应 herdr sidebar 的 | 内容 |
|---|---|---|
| sessions | 机器列表 | 远端 SSH host 连接状态（`tuios hosts`） |
| terminals | workspace 列表 | 本机所有终端窗口，按 workspace 分组 |
| files | （herdr 无） | 当前目录文件树，可增删改 |
| agents | agent 列表 | 每个窗口的 agent 及状态徽章 |

rail 的每个 agent row 显示：`now`（agent 正在做什么）、`ctx N%`（上下文 ≥80% 时）、`N subagents`、`N queued`。`model`、`cost`、`plan`、`prompt` 默认不显示，除非 `[appearance.sidebar.agent_row]` 表配置了。

## herdr 二进制内嵌为上报协议

tuios 运行时目录里有自己的 herdr 二进制（`HERDR_BIN_PATH` 指向 `/run/user/1000/tuios/herdr/bin/herdr`）。herdr 在 tuios 里不是独立工具，而是 agent 状态上报的协议后端。pane 里的 agent 通过 `"$HERDR_BIN_PATH" pane report-agent` 上报状态，tuios 接收后更新 rail 的 row。

herdr CLI 只回答 `pane`、`tab`、`workspace`、`agent`、`worktree`、`notification show`、`api snapshot`；`pane.resize`、`pane.move`、`server reload-config` 等返回 `unsupported`。

## 与 herdr workspace 的本质差异

| | herdr | tuios |
|---|---|---|
| 一等公民 | workspace（命名、带 worktree、可编排） | window（pane），workspace 只是编号分组 |
| workspace 数量 | 用户创建，不限 | 固定编号 1–9 |
| workspace 名字 | 有 | 无（NAME 列空） |
| 侧栏区块 | workspace 树 + agent | sessions/terminals/files/agents 四区块 |
| agent 启动 | `herdr agent start <name> --kind X` | 无对应；pane 里自己起 agent，用 `integration install` 接 hook |
| 多 agent 编排 | 手动 split + start | `tuios fan N "<prompt>"` 一键开 N 个 worktree agent |

herdr 的 workspace 子命令完整表见 [Herdr + Plannotator 工具链全量 Reference](../herdr-plannotator/toolchain-reference.md)。

## See Also

- [ttyd 前端编译模型](ttyd-frontend-compilation.md)
- [Herdr + Plannotator 工具链全量 Reference](../herdr-plannotator/toolchain-reference.md)
- [四 Agent CLI 能力面对比](../ai-coding-agents/cli-capability-surface.md)
