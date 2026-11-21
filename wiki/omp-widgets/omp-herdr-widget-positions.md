# Herdr 与 OMP 自定义 Widget 位置

> Sources: 本机源码与文档调查（Herdr 0.9.5、OMP 19.0.1）, 2026-11-21
> Raw: [Herdr 与 OMP 自定义 Widget 位置调查](../../raw/omp-widgets/2026-11-21-omp-herdr-widget-positions.md)
> Updated: 2026-11-21

## Overview

Herdr 提供五个自定义显示位置，从单行文本到完整交互式 TUI；OMP 提供六个扩展入口，从单行状态栏到覆盖层和输入框替换。Herdr 侧栏条目有行数和 token 数限制；OMP 的 `setHeader()` / `setFooter()` 在 interactive 模式无实际实现。

## Herdr 的五个 Widget 位置

| 位置 | 显示能力 | 限制 |
|---|---|---|
| 标签栏右侧 | 单行普通文本，Herdr 自身样式 | ANSI 颜色被剥离；窗口过窄时隐藏 |
| Agent 条目内部 | 多行文本、图标、条件颜色 | 每布局最多 16 行 × 16 token；无交互组件 |
| workspace 条目内部 | 多行文本、条件样式 | 同上 |
| 独立 pane / tab | 完整交互式 TUI | 无 |
| popup / overlay | 完整交互式 TUI | 关闭后恢复原布局 |

标签栏右侧适合放简短状态（CPU、RAM、时钟）。Agent 条目内部适合放 Agent 状态、进度、用量。独立 pane 和 overlay 适合常驻监控面板和交互式详情。

## OMP 的六个 Widget 入口

| 入口 | 位置 | 显示能力 |
|---|---|---|
| `ctx.ui.setStatus()` | hook-status 行（segment bar 下方） | 单行文本，可着色、背景、图标 |
| `setWidget()` | 输入框上方或下方 | 多行文本或组件；字符串数组 ≤10 行 |
| `ctx.ui.custom()` | 覆盖对话区域或替换输入框 | 自定义布局、键盘交互 |
| `setEditorComponent()` | 输入框本身 | 自定义输入组件 |
| `registerComposerShape()` | 输入框布局 | 自定义输入行为 |
| `registerMessageRenderer()` | 对话消息区域 | 工具结果卡片、进度组件 |

`setWidget()` 使用字符串数组时最多显示 10 行；使用组件 factory 时无此限制。`ctx.ui.custom()` 开启 `overlay` 时覆盖对话区域，不开启时临时替换输入框。

`setHeader()` / `setFooter()` 在 OMP 19.0.1 interactive 模式无实际实现，不应依赖。

## 选择建议

需要在 Herdr 中显示丰富内容（多行、图标、条件颜色）时，用 Agent 条目内部或独立 pane。需要在 OMP 中显示动态状态（用量、进度）时，用 `setStatus`；需要交互式面板（选择器、表单）时，用 `ctx.ui.custom()` 或 `setWidget()` 的组件模式。
