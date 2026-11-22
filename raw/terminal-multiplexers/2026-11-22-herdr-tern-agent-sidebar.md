# Herdr 0.9.5 与 Tern 0.9.30：对象层级与 agent 侧栏

> Source: Herdr 官方 Concepts 与 CLI 文档 v0.9.5；Herdr 本机 CLI 与配置输出，2026-11-22；Tern 官方 SDK 文档；Tern 本机 0.9.30 CLI 与独立 Windows Chrome 页面观察，2026-11-22；详细研究记录 `docs/research/2026-11-22-herdr-tern-agent-sidebar-research.md`
> Collected: 2026-11-22
> Published: Unknown

## 用户问题

用户询问 Herdr 的 `session → Spaces → tabs → panes → agent` 是否准确；Tern 是否只有 session、tabs、panes，以及 Tern Web 左侧栏能否像 Herdr 一样常驻显示全部 agent 并直接跳转。用户要求先核对判断，再回答 Tern 能否做到同样的便利。用户的目标表述为「每个 agent 一项、扫一眼状态、直接过去」。

## Herdr 0.9.5

本机 `herdr --version` 输出 `herdr 0.9.5`。当前 client 与 server 都是 0.9.5，server 正在运行。

`herdr --default-config` 包含以下侧栏设置与说明：

```toml
# Agent panel ordering: "spaces" (grouped by space) or "priority" (attention queue).
# "workspaces" is accepted as an alias for "spaces".
# agent_panel_sort = "spaces"
```

```toml
# [ui.sidebar.agents]
# [ui.sidebar.spaces]
```

当前 `~/.config/herdr/config.toml` 设置 `agent_panel_sort = "spaces"`，并为 `omp` 配置了 `state_icon`、`machine`、`workspace`、`tab`、`terminal_title`、`agent` 等行。这个设置改变 Agents 的排序；Agents 列表仍列出被识别的 agent，当前空间过滤属于用户扩展方向。

本机 `herdr workspace list` 返回 4 个 workspace，其中当前 workspace 为 `w7`、label `agc`、pane_count 2、tab_count 2、agent_status working。`herdr agent list` 返回 1 个 `omp` agent：

```json
{"agent":"omp","agent_status":"working","focused":true,"pane_id":"w7:p1Q","tab_id":"w7:tG","workspace_id":"w7","screen_detection_skipped":true}
```

CLI 的对象关系为 session 包含 workspace，workspace 包含 tabs，tab 包含 panes；agent 是被识别的 pane 程序。普通 shell、编辑器、日志和服务可以占用 pane，只有被识别或主动报告状态的 agent 进入 Agents 列表。侧栏把 workspace 显示为 Spaces，并提供独立的 Agents 列表。用户所述的 `session → Spaces → tabs → panes → agent` 使用模型成立；agent 不作为 pane 下面的一层布局容器。

## Tern 0.9.30

本机 `tern --version` 输出 `tern 0.9.30 (fe54a4c)`。

Tern 官方 Session 定义是一组 tab：

> Session — A named set of tabs in a window, as `cx.session` reads it; a window can hold several.

Tern 的 `window` 是浏览器页面或桌面窗口的界面实例；daemon 持有 pane 与每个 pane 的权威屏幕，窗口关闭后 pane 继续运行。`window_title` 的输入表用 `space` 字段表示当前 session 的名称，因此 Tern 的 space 与 session 指同一层。

从界面对象看，Tern 是 `session/space → tabs → panes`。session 与 tab 之间没有额外的 Herdr 式分组层。tab 的 `cwd`、`program`、`title` 来自 focused pane，`panes` 是 pane 数量，`busy` 表示任一 pane 有命令运行。

官方 Chrome 文档写明：

> Each tab shows an icon per pane for the program it runs

这句话说明通用界面会给每个 pane 显示程序图标。它不包含以下实测结果：当前 Web 页面中的每个图标是否可以直接点击跳转，以及真实 OMP 的 working、blocked、idle、done 状态是否逐项显示。

Tern Web 可执行 `Vertical tabs`，左侧显示按 session 分组的 tab 列表。独立 Windows Chrome 客户端打开 `http://127.0.0.1:8378/`，开启竖向标签并选中一个已有 btop 与 zsh 双 pane 的 tab；两个 pane 同时显示在右侧，左侧仍只有一条对应 tab 的记录，记录文字以 focused pane 为代表。该客户端挂载成功，页面报告的错误为 null。

Tern 的竖向侧栏单位是 tab。当前页面没有证明存在 Herdr 那种按 agent 逐项列出名称、状态和位置的常驻列表。

## Tern 的临时总览入口

官方 Built-in Actions 表把 `peek` 标为 **Peek at tabs**，PC 快捷键为 `Ctrl+Alt+↓`；把 `mission_control` 标为 **Mission Control**，PC 快捷键为 `Ctrl+Alt+↑`。两者都支持用方向键或 `h/j/k/l` 移动选择，`Home`/`End` 选第一张或最后一张卡片，`Enter` 或空格打开选中项，`Esc` 关闭。

这两个入口都是临时总览。`peek` 用于查看标签并切换，`mission_control` 打开临时卡片总览。官方资料给出了卡片选择键位，当前 Web 中的卡片具体内容未实测。它们不会常驻左侧，也不提供 Herdr Agents 区那种按 agent 分节的实时列表。

## 相同目标下的可选路线

| 路线 | 得到什么 | 代价 |
|---|---|---|
| Herdr Agents 区 | 每个被识别的 agent 独立一项，显示所在 machine、workspace、tab 和状态，点击跳到 pane | 只覆盖被识别或报告状态的 agent；终端和普通程序仍在 Spaces 与 tab 中 |
| Tern 一个 agent 一个 tab，启用 Vertical tabs 并命名 tab | 当前 Tern Web 中最接近逐 agent 一项的体验；点 tab 即可到对应终端 | 放弃同 tab 多 agent 的分屏；仍按 tab 组织，没有 Herdr 的独立状态队列 |
| Tern 保留分屏，使用 Peek、Mission Control、attention inbox | 保留现有 pane 布局；Peek 与 Mission Control 提供临时总览，inbox 用来处理需要介入的事件 | 没有常驻全部 agent 列表；inbox 只包含 attention 事件 |
| 修改 Tern Web 增加 Agents 侧栏 | 有机会达到逐 agent 列表与点击定位 | 需要 Tern Web 自身代码；Web 不运行 Lua 窗口插件，AGC 仓库没有这份界面源码 |

## 证据边界

- 已直接核实：Herdr 0.9.5 client/server 版本、默认与当前侧栏配置、workspace 与 omp agent 关系；Tern 0.9.30 版本、官方对象定义、官方图标说明、当前 Web 竖向标签与双 pane tab 的列表显示。
- 未实测：Herdr blocked、done、idle 的具体状态转换；Tern 单个 pane 图标的点击跳转；Tern 中两个 OMP 的独立状态；查看后 done 状态如何变化。
- 未执行：创建 agent、创建或移动 pane、修改上述任一产品的配置、安装插件或修改代码。
- 便捷性排序由侧栏组织方式与可用点击路径推导，没有进行点击次数或视觉查找耗时测试。
