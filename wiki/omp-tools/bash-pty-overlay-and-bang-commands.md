# OMP bash 工具的 PTY 浮层与 `!` 命令的 PTY 路径

> Sources: 本机会话源码阅读与实测（OMP 19.0.1）, 2026-11-20
> Raw: [OMP bash 工具的 PTY 浮层与 `!` 命令的 PTY 路径](../../raw/omp/2026-11-20-bash-pty-overlay-vs-bang-command.md)
> Updated: 2026-11-20

## Overview

OMP 有两套 PTY 入口，能力不同。`bash` 工具的 `pty: true` 在当前 TUI 里打开全屏浮层，键盘直接交给程序；用户输入的 `!` 命令走 headless PTY，输出在聊天里回放。全屏交互程序只能用前者。

## `pty: true`：交互浮层

工具声明里带 `pty: true` 时，OMP 创建 `BashInteractiveOverlayComponent` 与 `PtySession`，把键盘输入写进该进程。这是当前窗口内的浮层，不是后台进程：用户能直接操作它，程序绘制的内容也在浮层里。环境不支持浮层时，工具提示已降级为无终端执行。

浮层的生命周期跟随这次工具调用，超时或关闭即结束进程。需要临时看一眼的交互程序（btop、另一个 omp 实例）适合这种方式；长期挂着的用独立终端或 tmux 面板。

门控有三层：无交互界面的会话不暴露 `pty` 字段；`pty` 为 false 时不走浮层；`PI_NO_PTY=1` 时禁用。

## `!`：headless PTY

`!` 后面的整段文本作为命令交给 shell，没有参数位可以指定 pty。

是否分配 PTY 由执行层按条件判断：使用用户 shell、shell 为 zsh 或 fish、`PI_NO_PTY` 未设为 1、命令不是 `cd`。源码给出的原因是这些 shell 的 `!` 命令需要 TTY 支撑 zle、job control 与彩色输出。本机 `SHELL` 为 `/usr/bin/zsh`，条件成立，因此 `!` 已自动获得 PTY。

呈现方式决定了它的适用范围：输出在聊天里的 bash 组件做 vterm 回放，程序主动读 stdin 时才转发按键。它适合普通命令与需要 TTY 的 shell 内建，不适合持续重绘整屏的程序。实测在 `!` 中运行 `btop` 得到 `[Command cancelled]`。

## 选择依据

| 需求 | 入口 |
|---|---|
| 全屏交互、需要实时键盘响应 | `bash` 工具 `pty: true` |
| 普通命令、管道、脚本 | `bash` 工具或 `!` |
| 需要 TTY 的 zsh/fish 内建与彩色输出 | `!` |
| 长时间运行的监控面板 | 独立终端或 tmux 面板 |

## See Also

- [OMP 内建工具全集、会话暴露边界与内部地址空间](builtin-tools-and-internal-urls.md)
- [OMP 环境变量参考](../omp/env-variables-reference.md)
- [OMP bash 命令行折叠标记与 /dev/null 语义](bash-shell-visualization-idioms.md)
