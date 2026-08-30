> 来源: 官方文档直读; GitHub API
> 收集时间: 2026-08-30
> 工具: 数据可视化与 SaaS 视觉工作空间工具

## Honeycomb Canvas
- https://docs.honeycomb.io/investigate/canvas - 商业 SaaS
- AI 驱动的协作工作空间 + 多人无限画布
- 自然语言转结构化查询, 输出查询结果/跟踪/日志/指标可视化
- Your Chat + Team chat 在同一 investigation 内, 光标聊天临时气泡
- 画布自动保存, 可与团队共享
- 人查看/修改生成的查询, 拖动/交互数据点, 粘贴 Mermaid 生成可编辑图表
- MCP 供 Cursor/Claude Code/Amazon Q 查询/分析/可视化可观测性数据

## Observable Canvases + AI
- https://observablehq.com/documentation/canvases/ai - 商业 SaaS
- 协作白板
- AI 看到当前视口的表格/图表/选中项, 在画布空白区域创建带 prompt 标签的 frame
- 所有协作者可见/可编辑 AI 工作
- 自然语言生成表格, bar/scatter/histogram/treemap 图表, 基于现有节点做 filter/sort/group/join/SQL
- AI 只新增内容, 不原地编辑/删除（用新版本 + undo）
- AI 非多模态, 不能看绘图/照片
- 文档记录实时协作

## Cursor Canvas
- https://cursor.com/docs/agent/tools/canvas - 专有商业
- Agent 生成交互 artifact, 在聊天旁独立 canvas 渲染
- 布局 sections/stats/tables/charts, 可重新打开/编辑/迭代, 保存并刷新数据重新运行
- 用户可查看源码并手动编辑或继续让 agent 修改
- 共享 canvas 发布为 live snapshot（Pro/Teams/Enterprise, 需数据存储同意）
- "团队可打开 snapshot" 已验证; 多人实时同屏协同编辑未验证

## Deepnote Agent
- https://deepnote.com/docs/deepnote-agent - 商业云端
- 协作数据 notebook, Agent 将 notebook 变成灵活 canvas
- 在任何位置创建/编辑/删除 SQL/Python/文本块, 执行代码, 检查输出
- Edit/Ask 模式, 实时显示动作, diff 和 undo
- 图表/可视化块由 agent 直接创建
- Notebook block canvas（非自由拖拽白板）

## Hex Notebook Agent
- https://learn.hex.tech/docs/explore-data/notebook-view/notebook-agent - 商业
- 多人 notebook（SQL/Python/no-code/visuals）+ Agent
- 创建 Python/SQL/Markdown/Pivot/Input/Single-value/Chart 单元格
- 复杂请求使用并行 subagents（含图表创建）
- 所有变更按单元格需人 Confirm/Undo
- 可安排并发布应用

## Chart Canvas MCP
- https://github.com/gluip/chart-canvas - MIT, 1 star
- 本地 MCP server + Vue3/ECharts/Mermaid dashboard
- AI 使用 addVisualization/remove/clear/showCanvas/queryAndVisualize
- 浏览器 dashboard 拖拽网格, 实时 polling
- 查询 SQLite/CSV/Parquet/JSON/NDJSON, DuckDB 本地执行
- 仅 chart metadata 发给 LLM
- "AI conversation -> real-time dashboard"
- 隐私友好; 成熟度低
