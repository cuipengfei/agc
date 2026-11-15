# Alma 与 Herdr 集成：官方摘录

> Source: https://alma.now/zh/; https://alma.now/docs/zh/features/herdr; https://herdr.dev/tui/docs/integrations/#omp
> Collected: 2026-11-15
> Published: Unknown

## Alma 官网

Source: https://alma.now/zh/

> herdr 里运行的任何程序都会显示为实时终端。Claude Code、Codex 和 pi 还有完整的对话视图：步骤折叠、代码格式化，提问直接变成按钮。

> 桌面端支持 macOS（Apple Silicon 与 Intel）、Windows 和 Linux，herdr 能跑的地方都行；iPhone 通过 TestFlight、Android 通过 APK 安装，与电脑上的 Alma 配对使用。远程屏幕（在手机上查看并操控桌面）需要 Mac。

## Alma Herdr 指南

Source: https://alma.now/docs/zh/features/herdr

> Agent 照常在 herdr 里运行。Alma 连接你电脑上的 herdr 服务，把每个面板变成能读、能回复的界面。

> 1. 安装并启动 herdr（herdr.dev）。
> 2. 安装 Alma 并打开。
> 3. 用顶部的切换按钮把侧边栏切到 Agent（Mac 上是 ⌘⇧A）。

> Alma 按照 herdr 自己的方式查找它的 socket：

| 位置 | 何时使用 |
| --- | --- |
| `HERDR_SOCKET_PATH` 或 `HERDR_SOCKET` | 在 Alma 的环境或登录 Shell 中设置了它 |
| `<config>/herdr/sessions/<名称>/herdr.sock` | `HERDR_SESSION` 指定了会话 |
| `<config>/herdr/herdr.sock` | 默认会话 |

> Windows 上 herdr 监听命名管道，Alma 会连接它。

> Alma 还会读取登录 Shell 的环境变量，所以即使 Alma 是从程序坞或开始菜单打开的，也能找到在终端里启动的 herdr。

> - 直接读取 **Claude Code**、**Codex** 和 **pi** 的会话记录，工具调用、子 Agent 和文件改动按顺序排好。
> - 在输入框里输入即可回复。发送的内容会进入该面板里的 Agent，就像你在那里直接输入一样。
> - 随时切到**屏幕**视图查看真实终端。

> 侧边栏按状态给 Agent 分组：
> - **需要输入**：Agent 问了你问题，正在等待。
> - **工作中**：Agent 正在进行一轮操作。
> - **已完成**：Agent 做完了，未读的轮次会标出来。

> Agent 需要你或完成时，Alma 会发送桌面通知。不想被打扰的工作区或标签页，可以在它的菜单里静音。

> 在菜单里重命名、排序、静音和关闭工作区与标签页。关闭标签页会退出其中的 Agent，会话仍保留在电脑上。

> iPhone 版（公测中，通过 TestFlight 安装）与电脑上的 Alma 配对后，同样的 Agent 都会跟过来：
> - 阅读并回复每个 Agent，也能启动新的。
> - Agent 需要你时收到推送通知。
> - **远程屏幕**：在手机上查看并操控 Mac 的屏幕。需要在 Mac 上为 Alma 开启屏幕录制和辅助功能权限。

> 能直连时 Alma 走局域网，否则通过端到端加密的 Alma 中继连接。

## Herdr TUI 的 OMP 集成

Source: https://herdr.dev/tui/docs/integrations/#omp

> The OMP integration reports `omp` as the agent label, lifecycle state, and native session identity through Herdr’s socket API. It does not require native process detection for the `omp` executable, and Herdr can resume an OMP pane with `omp --resume=<session>` after a server restart.
