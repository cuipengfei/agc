# Tern Web 侧栏与 agent 状态

> Source: 当前 OMP 会话的 Tern 0.9.30 Web 实测、官方 Tern 文档与本地帮助记录
> Collected: 2026-11-22
> Published: Unknown

## 用户问题与结论

用户问 Tern Web 能否像 Herdr 一样，在左侧总览所有运行中的 agent 的状态。结论是：**能按官方文档在左侧标签上查看各窗格 agent 的工作、等待、完成或失败状态**；但要先说清，它不是 Herdr 的「Spaces + Agents」独立清单，也不是一键枚举所有 agent 状态的专用面板。

## 官方行为

官方标签导航文档列出 `tabs [horizontal|vertical|toggle]`，可把标签列竖向显示；命令面板里对应的入口是 `Vertical tabs`。该文档同时列出 `tabs autohide`、`filter`、`status-bar` 和 `pane-headers`，并说明竖向标签列可设置在窗口边缘。官方图标与 chrome 文档说明，每个标签按窗格显示程序图标；OMP 在编程 agent 程序键列表中，图标可反映正在处理、等待、完成或失败。

官方平台文档说明：Tern Web 不运行桌面 Lua 窗口逻辑，而是渲染 daemon 产生的插件块；`Rail` 布局属于桌面端布局能力，Web 没有原生对应项。由此，Web 上可以呈现现有窗格和标签状态，但没有 Lua chrome 状态段、Rail 栏或桌面窗口格式化器来拼出一个原生「agent 总览」。

## 本机实测

本机 0.9.30 的 `tern help dev` 包含 `Vertical tabs`、`Show/hide sidebar` 与 `Rail` 描述；`tern --version` 为 `0.9.30 (fe54a4c)`。在独立 Windows Chrome 打开 `http://127.0.0.1:8378/`，命令面板搜索 `Vertical tabs` 后可见单个命令项，且该项可直接执行。截图在 `/tmp/tern-web-capability-filtered.png` 与 `/tmp/tern-web-capability-vertical.png`。

执行后，左侧实际呈现 session/tab 树，而不是 Herdr 那种独立的 Agents 列表。可见条目包括 `Default`、`agc`、`buntoolbox` 与子层 tab；有 `Filter tabs` 输入框和 `w1`、`w2` 标记。未观察到 Herdr 式「Spaces / Agents」标题、每个 agent 的独立运行行、或单独的 agent 状态徽标。

## 证据边界

官方文档支持「按窗格图标显示 agent 状态」，也支持「竖向标签列可用」；本机截图支持「Web 可执行 Vertical tabs」。本次没有触发 OMP 的 working/waiting/done 状态变化，也没有看到独立的 agent 总览；所以「Tern Web 有 Herdr 式 agent 列表」不成立，「Tern Web 可通过标签与窗格图标查看 agent 状态」成立。
