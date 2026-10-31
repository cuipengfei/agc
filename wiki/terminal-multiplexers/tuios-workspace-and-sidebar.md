# tuios workspace 与 session rail

> Sources: tuios 0.8.5 `--skill` 官方文档; 本机实证, 2026-10-06; 本机 TUIOS 0.12.0 配置与选项元数据, 2026-10-31; 后续会话核对, 2026-11-01
> Raw: [tuios 0.8.5 workspace 与 session rail 机制摘录](../../raw/terminal-multiplexers/2026-10-06-tuios-0.8.5-workspace-sidebar.md); [TUIOS 本机配置快照](../../raw/terminal-multiplexers/2026-10-17-tuios-local-config-snapshot.md); [TUIOS 0.10.0 选项元数据](../../raw/terminal-multiplexers/2026-10-17-tuios-0.10.0-option-metadata.md); [TUIOS agent 展示与集成](../../raw/terminal-multiplexers/2026-10-31-tuios-agent-display-and-integration.md); [交互配置与标题目录显示](../../raw/terminal-multiplexers/2026-10-31-tuios-interaction-settings-and-title.md); [后续来源记录](../../raw/terminal-multiplexers/2026-11-01-tuios-agent-naming-sidebar-and-paging.md)
> Updated: 2026-11-01

## Overview

tuios 的 workspace 是窗格的编号分组，session rail 是侧栏。v0.12.1 有 sessions、terminals、files、agents、git、custom、pane 七种内容区块，另有空白布局项 spacer。

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

tuios 的侧栏叫 session rail。2026-10-06 实测配置为：

- `appearance.sidebar.enabled` = `true`
- `appearance.sidebar.position` = `right`
- `appearance.sidebar.sections` = `sessions:25,terminals,files:25,agents:34`
- `appearance.sidebar.show_counts` = `true`

历史快照记录侧栏从右侧改为左侧。当前来源设置与详细允许值见[配置参考表](tuios-config-reference.md)，本节只描述侧栏行为。

sections 指定区块顺序和高度比例，未列出的区块不绘制。spacer 可以重复，用来留白或把后续区块推向底部。

| 区块 | 内容与使用场景 |
|---|---|
| sessions | 会话列表，用于切换项目会话 |
| terminals | 按 workspace 分组的窗格，查找 shell 或程序 |
| agents | Agent 状态、当前工作与子任务 |
| files | 文件列表或树，用于打开、编辑及文件操作 |
| git | 仓库、worktree 与 Git 状态 |
| custom | 指定命令的输出，每行作为侧栏一行 |
| pane | 可交互的终端区块，只显示文字，不绘制 Kitty 图片 |

rail 的每个 agent row 显示：`now`（agent 正在做什么）、`ctx N%`（上下文 ≥80% 时）、`N subagents`、`N queued`。`model`、`cost`、`plan`、`prompt` 默认不显示，除非 `[appearance.sidebar.agent_row]` 表配置了。

## Agents 区块详情（0.12.0）

- **排序**：按 "you" 优先级分组，顺序为 Needs you（审批/提问/报错）→ Done unread → Working → At rest。
- **双行显示**：第一行状态符号 + 窗口名 + 等待时长/队列数；第二行当前工具调用（如 `Bash: go test ./...`、`Edit: src/app.tsx`）、上下文告警 `ctx N%`、缩进的 subagent 列表。
- **状态符号**：`▲` 需输入/审批，`■` 刚完成未读，`●` 运行中，`◊` 主任务空闲但后台 subagent 运行，`○` 空闲/已读，`×` 报错。
- **自动去重**：侧栏宽度 ≤ 30 列时，agent 窗口仅出现在 `agents` 区块，不会在 `terminals` 区块重复。

### 自动折叠与进程识别

`agent_rest_fold=off` 关闭主 Agent 行的自动折叠。自动折叠依据 idle、unknown、done-seen 和静置时间，不根据进程是否存活判断。行是否被识别为 Agent 由进程检测与状态上报决定。

主 Agent 行和 subagent 行分别管理。关闭主 Agent 折叠，同时限制 subagent 列表并延迟隐藏已结束的子任务，可以保留主要会话而减少子任务占用。

### 右键菜单

侧栏菜单针对会话、文件或仓库等对象；pane menu 针对终端窗格，含 Paste 等操作。终端模式有选区时普通右键打开 Selection 菜单；没有选区且程序启用 mouse tracking 时右键转发给程序；其余情况由 right_click_opens_menu 决定是否打开 pane menu。Paste 项把剪贴板内容粘贴到当前 pane。

## Agents View 驾驶舱

- 打开：`Ctrl+b i`
- 左侧按状态分组列出所有 agent，右侧显示 Live 终端画面、Thread（工具调用卡片流）、Changes（diff），底部有审批按钮（`a` 批准、`r` 拒绝、直接打字回复）。

## Agent 切换方式

- 鼠标：左键单击侧栏 agent 行（包括缩进的 subagent 行）跳转到对应窗口
- 键盘：`Ctrl+b o`（跳到 Needs you 最久）、`Ctrl+b O`（跳到最新 Done unread）、`Ctrl+b J` / `Ctrl+b K`（循环切换）
- 侧栏聚焦（`s` 或 `Ctrl+b e`）：`j`/`k` 移动，`Enter` 切换，`v` 查看 diff，`r` 队列消息

## Agent 状态上报集成

- 安装：`tuios integration install <agent>`（如 `omp claude-code codex opencode`）。不装 hook 时依赖 `daemon.agent_autodetect = true` 兜底，装 hook 后状态更准确（done/now/subagents/recovery）。
- 本机已安装：OMP（v1）、Claude Code（v3）、Codex（v1）、OpenCode（v5）均 `installed, current`（`tuios doctor agents`）。
- 安装目标：OMP `~/.omp/agent/extensions/tuios-omp-agent-state.ts`、Claude Code `~/.claude/settings.json` + skill、Codex `~/.codex/hooks.json` + skill、OpenCode `~/.config/opencode/plugins/tuios-agent-state.js` 及相关文件。

tuios 运行时目录里有自己的 herdr 二进制（`HERDR_BIN_PATH` 指向 `/run/user/1000/tuios/herdr/bin/herdr`）。herdr 在 tuios 里不是独立工具，而是 agent 状态上报的协议后端。pane 里的 agent 通过 `"$HERDR_BIN_PATH" pane report-agent` 上报状态，tuios 接收后更新 rail 的 row。

herdr CLI 只回答 `pane`、`tab`、`workspace`、`agent`、`worktree`、`notification show`、`api snapshot`；`pane.resize`、`pane.move`、`server reload-config` 等返回 `unsupported`。

## 与 herdr workspace 的本质差异

| | herdr | tuios |
|---|---|---|
| 一等公民 | workspace（命名、带 worktree、可编排） | window（pane），workspace 只是编号分组 |
| workspace 数量 | 用户创建，不限 | 固定编号 1–9 |
| workspace 名字 | 有 | 无（NAME 列空） |
| 侧栏区块 | workspace 树 + agent | 可配置七种内容区块及 spacer |
| agent 启动 | `herdr agent start <name> --kind X` | 无对应；pane 里自己起 agent，用 `integration install` 接 hook |
| 多 agent 编排 | 手动 split + start | `tuios fan N "<prompt>"` 一键开 N 个 worktree agent |

herdr 的 workspace 子命令完整表见 [Herdr + Plannotator 工具链全量 Reference](../herdr-plannotator/toolchain-reference.md)。

## See Also

- [ttyd 前端编译模型](ttyd-frontend-compilation.md)
- [Herdr + Plannotator 工具链全量 Reference](../herdr-plannotator/toolchain-reference.md)
- [四 Agent CLI 能力面对比](../ai-coding-agents/cli-capability-surface.md)
- [TUIOS 配置与用户体验](tuios-config-user-experience.md)
- [TUIOS Web 与安装升级](tuios-web-and-updates.md)

## OMP 工作时名称变为 bun

用户观察到空闲时显示 OMP，工作时显示 bun。状态读取仍为 agent=omp、state=working、身份来源 report。预期保持 OMP 名称，只改变状态标记。

[Issue #1384](https://github.com/Gaurav-Gosain/tuios/issues/1384) 是已完成的 FEATURE；[PR #1388](https://github.com/Gaurav-Gosain/tuios/pull/1388) 已合并，v0.12.1 发布说明列出 Agent names in the rail。修复针对标题优先级和同步竞态，OMP/bun 具体现象没有单独列出。后来版本读取为 0.12.1，未完成忙闲对照确认。

临时办法是 set-window 的固定名称，先确认目标 pane ID 后设置。此办法未执行，以后运行其他程序时固定名称仍保留。restart-server 会停止窗格内程序，不能当作无影响刷新。

## Page Up 与 Page Down

普通 PgUp/PgDn 交给 pane 应用。默认 Shift+PgUp/Shift+PgDn 滚动一页，但仅在普通输出主屏、程序没有启用鼠标模式时由 TUIOS 接管；alternate-screen 或鼠标模式下传给应用。

查看 TUIOS 保存的输出可按 Ctrl+B 再按 [，进入复制模式，用 PgUp/PgDn 整页翻动，Esc 返回输入。它不读取应用内部未输出的历史。此次未修改快捷键。
