# OMP bash 工具的 PTY 浮层与 `!` 命令的 PTY 路径

> Source: 本机会话源码阅读（OMP 19.0.1 `@oh-my-pi/pi-coding-agent`）与实测，2026-11-20
> Collected: 2026-11-20
> Published: 2026-11-20

## 两条互不相通的 PTY 路径

`bash` 工具的 `pty: true` 走交互浮层；用户输入的 `!` 命令走 headless PTY 加 vterm 回放。二者共用底层 PTY 能力，但入口、呈现和门控不同。

## bash 工具 `pty: true`

`src/tools/bash-interactive.ts:43-46` 的注释说明：在伪终端上运行时，用户通过 overlay 驱动；`:75-82` 创建 `BashInteractiveOverlayComponent` 与 `PtySession`；`:100-110` 的处理器把键盘输入 `session.write(data)` 写进该进程。

调用入口在 `src/tools/bash.ts:2260-2263`；环境不支持浮层时返回提示 `pty requested but unavailable in this environment; ran without a terminal`。

`runInteractiveBashPty` 在整个源码中只有一个调用点：`src/tools/bash.ts:1041`。

门控：

- `src/tools/bash-pty-selection.ts:10-13`：`pty` 为 false 时不走浮层；`PI_NO_PTY=1` 时禁用；
- `src/tools/bash.ts:474-514`：schema 中 `pty` 字段仅在具备交互界面的会话暴露。

浮层的生命周期跟随本次工具调用，超过 `timeout` 或浮层关闭时进程被结束。

## `!` 命令

`src/modes/controllers/command-controller.ts:1929-1945`：`!` 之后的整段文本作为命令交给 shell，没有把 `pty` 当参数解析。

`:1944-1958`：该路径使用 `useUserShell: true` 并带上 PTY 配置。

`src/exec/bash-executor.ts:736-746` 判定 `usePty` 的条件：使用用户 shell、shell 不是 bash、属于 zsh 或 fish、`PI_NO_PTY` 未设为 1、命令不是 `cd`。源码注释说明原因：zsh/fish 的 `!` 命令需要 TTY 来支撑 zle、job control 与彩色输出。

`command-controller.ts:2002-2013`：输出在聊天里的 bash 组件做 vterm 回放；程序要读 stdin 时才把按键转发给它。

本机 `SHELL=/usr/bin/zsh`（从运行中的 OMP 进程 745123、753359、757964 的环境变量读取），因此 `!` 在上述条件下自动获得 PTY，但没有全屏浮层。

## 适用判断

全屏交互程序（btop、less 之外的 TUI、另一个 omp 实例）需要持续占用整屏并响应键盘，走 `pty: true` 的浮层。用户实测在 `!` 里运行 `btop` 得到 `[Command cancelled]`。

普通命令、需要 TTY 的 zsh/fish 内建、以及输出可回放的工具，走 `!` 更直接。

## 相关环境变量

`PI_NO_PTY=1` 同时关闭上述两条 PTY 路径（`bash-pty-selection.ts:12`、`bash-executor.ts:745`）。
