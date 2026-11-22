# Herdr 与 Tern：agent 侧栏与对象层级

> Sources: Herdr 0.9.5 官方 Concepts/CLI 文档与本机 CLI/config, 2026-11-22; Tern 官方 SDK 文档与 0.9.30 Web 观察, 2026-11-22
> Raw: [Herdr 0.9.5 与 Tern 0.9.30：对象层级与 agent 侧栏](../../raw/terminal-multiplexers/2026-11-22-herdr-tern-agent-sidebar.md)
> Updated: 2026-11-22

## Overview

两套工具都用 session、tab 和 pane 组织终端，但侧栏的首要浏览单位不同。Herdr 同时提供按工作区域浏览的 Spaces 与按 agent 浏览的 Agents；Tern Web 的竖向标签栏按 tab 成行。这个差异决定了两者能否一眼看到全部 agent。

## Herdr 0.9.5

Herdr 的层级是 `session → Spaces → tabs → panes → agent`。Spaces 是侧栏对 workspace 的称呼；CLI 与配置仍使用 workspace。agent 是被识别或主动报告状态的 pane 程序。普通 shell、编辑器和服务可以只占 pane，不进入 Agents 列表。

当前侧栏把这两种浏览方式并列：

- Spaces 按工作区域组织终端。
- Agents 按 agent 逐项显示，一项包含所在 machine、workspace、tab 与状态。

当前配置用 `agent_panel_sort = "spaces"` 把 Agents 按 Spaces 分组。它仍列出所有被识别的 agent，点击一项即可定位到对应 pane。

## Tern 0.9.30

Tern 的界面实例叫 window；pane 与其权威屏幕由 daemon 持有，关闭 window 后终端继续运行。从界面对象看，层级是 `session/space → tabs → panes`。`window_title` 的 `space` 字段就是当前 session 名，两者指同一层。

tab 的文字来自 focused pane：当前目录、程序与标题都由选中的 pane 提供；`panes` 存 pane 数量，`busy` 表示任一 pane 正在运行命令。官方 Chrome 文档还规定每个 pane 显示自己的程序图标，图标可按程序与状态设置样式。

## 当前 Web 竖向侧栏

Tern Web 可开启 `Vertical tabs`，左侧显示按 session 分组的 tab 列表。本次在独立 Windows Chrome 中选中一个包含 btop 与 zsh 两个 pane 的 tab：两个终端同时显示，左侧仍然只有一条 tab 记录，记录文字代表 focused pane。

通用文档说明每个 pane 有程序图标。当前页面观察没有确认每个图标可以直接点击跳转，也没有确认两个 OMP 的独立状态会怎样显示。把 tab 文字当成同 tab 全部 agent 的任务清单不成立。

## 临时总览与提醒

Tern 提供两个临时总览快捷键：

| 操作 | PC 快捷键 | 用途 |
|---|---|---|
| Peek at tabs | `Ctrl+Alt+↓` | 浮出标签列表，选择并切换 |
| Mission Control | `Ctrl+Alt+↑` | 打开临时卡片总览；当前 Web 中的卡片内容未实测 |

两者都支持方向键或 `h/j/k/l` 移动选择，`Home`/`End` 跳到首尾，`Enter` 或空格打开，`Esc` 关闭。它们会遮住界面，关闭后回到终端，与常驻左侧栏不同。

attention inbox 收集需要处理的提醒，可以跳到对应条目。它只覆盖 attention 事件；工作中的 agent、空闲 agent 与普通终端不会因存在而自动进入这张清单。

## 达到相近便利度的路线

| 路线 | 结果 | 限制 |
|---|---|---|
| 每个 agent 一个 tab，启用竖向标签并命名任务 | 当前 Tern Web 最接近逐 agent 一项，点 tab 到终端 | 失去同 tab 多 agent 分屏，仍按 tab 组织 |
| 保留分屏，使用 Peek、Mission Control 或 attention inbox | 不改变现有布局；临时查看总览，或集中处理等待与完成事项 | 临时总览不会常驻；inbox 只包含提醒，没有全部 agent 列表 |
| 修改 Tern Web 增加 Agents 侧栏 | 可以实现逐 agent 列表、状态与点击定位 | 需要 Tern Web 界面源码；Web 不运行 Lua 窗口插件 |

## See Also

- [Tern 对象模型：包含关系、数量与生命周期](../tern/object-model.md)
- [Tern 插件架构与平台边界](../tern/plugin-architecture.md)
- [ADE 选型方法](../agent-development-environments/ade-selection-method.md)
- [Herdr 配置项与用户体验](../herdr-plannotator/herdr-config-user-experience.md)
- [tuios workspace 与 session rail](tuios-workspace-and-sidebar.md)
