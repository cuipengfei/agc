# Herdr 与 OMP 自定义 Widget 位置调查

> Source: 本机源码与文档调查（Herdr 0.9.5、OMP 19.0.1，2026-11-21）
> Collected: 2026-11-21
> Published: Unknown

## Herdr 0.9.5 的自定义 Widget 位置

### 标签栏右侧状态区

位置：顶部或底部标签栏右侧。
内容：单行普通文本，使用 Herdr 自身样式。
限制：ANSI 颜色和背景被剥离。
示例：Left · Used · CPU · RAM、时钟、队列数量。
窗口过窄时可能被隐藏。

### 左侧 Agent 条目内部

位置：左侧 sidebar 的 Agent 条目。
内容：多行文本、图标、动态字段、条件颜色和加粗。
限制：不能放任意交互组件。
每个布局最多 16 行，每行最多 16 个 token。

### 左侧 workspace 条目内部

位置：左侧 sidebar 的 workspace 条目。
内容：多行文本和条件样式。
用途：项目状态、CI 结果、待办数量。

### 独立 pane 或 tab 内部

位置：任何独立 pane 或 tab。
内容：完整交互式 TUI，自行绘制布局、表格、进度和实时图形。
用途：常驻监控面板、任务看板。

### 临时 popup、overlay 或 zoomed 窗口

位置：覆盖在当前布局之上，或替换当前 pane。
内容：完整交互式 TUI。
关闭后恢复原布局。
用途：详情面板、选择器、临时仪表盘。

## OMP 19.0.1 的自定义 Widget 位置

### ctx.ui.setStatus()

写入 hook-status 行，位于编辑器上边框 segment bar 下方。
不新增 segment，只写文本。
可着色、加背景、图标、文字进度条。

### setWidget()

位置参数：aboveEditor（默认）或 belowEditor。
字符串数组最多显示 10 行。
组件 factory 无字符串截断限制。

### ctx.ui.custom()

overlay: true：覆盖对话区域，自定义布局、尺寸、位置和键盘交互。
默认模式：临时替换输入框区域，交互式表单、选择器，关闭后恢复输入框。

### setEditorComponent() / registerComposerShape()

自定义输入组件、编辑行为和输入布局。

### registerMessageRenderer()

自定义工具结果、消息卡片渲染。
可渲染表格、结构化卡片、进度等组件，随对话滚动。

### setHeader() / setFooter()

在 OMP 19.0.1 interactive 模式中无实际实现（no-op）。
不能依赖这两个 API 生效。
