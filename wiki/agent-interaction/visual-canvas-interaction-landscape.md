# 视觉人机交互全景：人与 Agent 共享视觉工作面

> Sources: GitHub API 元数据批量快照; Miro 官方公告与开发文档; 各项目官方 README，2026-08-30
> Raw: [全景证据](../../raw/agent-interaction/2026-08-30-visual-canvas-landscape.md); [官方 excalidraw-mcp 摘录](../../raw/agent-interaction/2026-08-30-excalidraw-official-mcp.md)
> Updated: 2026-08-30

## 判定标准

"视觉人机交互" = 人与 agent 的交互**本身**发生在视觉介质上：人点、拖、选、画、编辑视觉对象，agent 读写同一份视觉状态。判定看交互通道，不看外壳：

- 多 agent 仪表盘（Conductor、Emdash、Superset 等）外壳是图形的，但与每个 agent 的交互仍是文字聊天——**出局**
- SDK/协议（AG-UI、A2UI、MCP-UI、CopilotKit 等）是造界面的材料，不是交互方式——**出局**
- TUI（Claude Squad、Herdr）与纯后端机制（LangGraph middleware）——**出局**

## 真正符合的工具（按交互介质分组）

### 白板/无限画布

- **Miro**：商业产品里动作最大。2026-02 上官方 MCP server（Claude Code/Cursor 读写 board），2026-05 Canvas 26 加画布内 agent（Sidekicks）与自动化（Flows），并给 agent 提供 Mermaid/Markdown/HTML widget 格式。纯 SaaS；Enterprise 的 MCP 默认关、需管理员开
- **Excalidraw + mcp_excalidraw**：开源对应物，元素级控制 + 实时同步 + 迭代环。详见 [mcp_excalidraw 深挖](mcp-excalidraw.md)
- **FigJam / Whimsical / Lucidspark / Mural**：AI 停在"生成 + 总结"，agent 看不到人后来的改动，不满足"可重入、共享状态"

### 文档/代码/设计产物画布

Claude Artifacts、OpenAI Canvas、Figma Make（已发布）/ Figma Design Agent（beta）、Qoder Lottie（插件 v0.1.0）。全部纯 SaaS、单一厂商锁定。

### 画布 SDK 的成品化入口

tldraw computer（托管实验产品）与 [tldraw Agent Starter Kit](https://github.com/tldraw/agent-template)（MIT 模板，本地跑，模型自选）。

### 边界项

Plannotator（Apache-2.0，8,246 stars）：浏览器视觉化标注 plan/diff 回传结构化反馈——"文字标注 + 视觉呈现"的弱匹配，完全本地。

## 企业/离线短名单

不需外部托管的只有四个：**Excalidraw + mcp_excalidraw、tldraw Agent Starter Kit、drawio 桌面 + 社区 MCP、Plannotator**。前提：本地指视觉交互层；agent 模型后端仍需内部 LLM 网关或本地模型。

## 关键快照（2026-08-30）

协议层 stars：AG-UI 15,626 / A2UI 16,232 / MCP-UI 5,114 / CopilotKit 37,113 / Vercel AI SDK 26,496 / assistant-ui 11,925。控制台类注意两个状态变化：Crystal 已deprecated、由 Nimbalyst 接替；Vibe Kanban（27,954 stars）官方宣布 sunsetting，不宜新采用。

## See Also

- [mcp_excalidraw 深挖](mcp-excalidraw.md) — 本地画布的最完整实现
- [产物可持续编辑 genre](sustainable-artifact-editing.md) — 判定标准的思想来源
