# 视觉人机交互全景：人与 Agent 共享视觉工作面

> Sources: GitHub API 元数据; tldraw 官方文档; Figma 官方帮助/开发者文档; Blender 官方 lab 页面; Spline 官方; Honeycomb/Observable/Deepnote/Hex 官方文档; 各项目 README
> Raw: [全景证据](../../raw/agent-interaction/2026-08-30-visual-canvas-landscape.md); [tldraw 生态深挖](../../raw/agent-interaction/2026-08-30-tldraw-ecosystem-deep-dive.md); [3D 空间工具](../../raw/agent-interaction/2026-08-30-3d-spatial-tools.md); [数据可视化与 SaaS](../../raw/agent-interaction/2026-08-30-data-viz-saas-tools.md); [Figma 生态](../../raw/agent-interaction/2026-08-30-figma-ecosystem.md); [Sim workflow 画布](../../raw/agent-interaction/2026-08-30-sim-workflow-canvas.md); [官方 excalidraw-mcp 摘录](../../raw/agent-interaction/2026-08-30-excalidraw-official-mcp.md)
> Updated: 2026-09-10

## 判定标准

"视觉人机交互" = 人与 agent 的交互**本身**发生在视觉介质上：人点、拖、选、画、编辑视觉对象，agent 读写同一份视觉状态。判定看交互通道，不看外壳：

- 多 agent 仪表盘（Conductor、Emdash、Superset 等）外壳是图形的，但与每个 agent 的交互仍是文字聊天——**出局**
- SDK/协议（AG-UI、A2UI、MCP-UI、CopilotKit 等）是造界面的材料，不是交互方式——**出局**
- TUI（Claude Squad、Herdr）与纯后端机制（LangGraph middleware）——**出局**
- Agent 生成图片/图表后交付给人看，人只看不动——**出局**

## A 级：真共享可编辑视觉空间

人与 agent **同时读写同一视觉空间**，agent 的修改立即落入人可继续编辑的状态。

### 2D 无限画布

| 工具 | Stars | 许可 | 人与 Agent 共享模式 | 维护健康度 |
|---|---|---|---|---|
| **mcp_excalidraw** | 2,362 | MIT | 本地 Excalidraw 画布，26 MCP 工具元素级 CRUD，截图反馈闭环，WebSocket 多 agent 并发 | 巴士因子 ≈1-2 |
| **tldraw Agent Starter** | 34 | MIT 模板 | 无限画布，agent 流式 action，人 chat panel + 直接编辑 | **依赖 tldraw SDK，生产需 license** |
| **tldraw MCP App** | — | 生产需 license | MCP Apps iframe 内嵌，agent `exec` JS 改 live editor，人直接点 widget | 官方产品，活跃 |
| **tldraw offline** | — | 免费桌面 | 桌面 .tldraw 文件，agent raw JS 端口驱动，人本地编辑 | 官方桌面版 |

### 3D 空间

| 工具 | Stars | 许可 | 人与 Agent 共享模式 | 维护健康度 |
|---|---|---|---|---|
| **Blender MCP** | 26,505 | MIT | Blender viewport，agent 操作 scene/材质/节点，人实时观察修正 | 社区项目，Blender 成熟 |
| **threejs-devtools-mcp** | 88 | MIT | 浏览器 live Three.js scene，agent inspect/modify，人 devtools overlay 操作 | 早期，v0.4.1 |

### 工作流/节点画布

| 工具 | Stars | 许可 | 人与 Agent 共享模式 | 维护健康度 |
|---|---|---|---|---|
| **Sim** | 29,491 | Apache-2.0 | 可视化 workflow canvas，agent 改节点/边，人拖放审批，团队实时协作 | 产品级，v0.8.17 |

### 设计画布

| 工具 | 许可 | 人与 Agent 共享模式 | 备注 |
|---|---|---|---|
| **Figma Design Agent** | SaaS | 人 on-canvas/sidebar 对话，agent 直接改 layout/组件/变量/样式 | Full seat 可写，View/Dev 只读 |
| **Figma MCP (use_figma)** | SaaS | 外部 agent 经 MCP 写回原生 Figma 内容，人审阅/Undo/继续编辑 | remote endpoint，需 Full seat |

### 数据画布

| 工具 | 许可 | 人与 Agent 共享模式 | 备注 |
|---|---|---|---|
| **Honeycomb Canvas** | SaaS | 人拖数据点/粘 Mermaid，agent 生成查询可视化，team chat 同一 investigation | 可自部署？否 |
| **Observable Canvases AI** | SaaS | AI 读 viewport 在空白处新增 frame，所有协作者可见可编辑 | AI 只新增不修改 |

### 3D SaaS

| 工具 | 许可 | 人与 Agent 共享模式 | 备注 |
|---|---|---|---|
| **Spline AI Agent** | SaaS | agent 创建/排列 objects/材质，人实时 art-direct/调灯光动画 | [vendor claim] |

## B 级：Agent 生成，人后接管（非实时共享编辑）

| 工具 | 说明 |
|---|---|
| **Figma Make** | prompt→app/prototype，人点选预览/属性面板/代码；Make→Design 是脱钩 snapshot，不回同步 |
| **Meshy 3D Agent** | 对话生成可编辑模型，人下载后接管，非同时编辑 |
| **官方 excalidraw-mcp** | 5207 stars，one-shot diagram 生成，无持久元素级多轮工作台 |
| **Cursor Canvas** | agent 生成交互 artifact，人可改；团队 snapshot 共享，未证实多人实时同屏 |
| **Deepnote Agent** | 共享 notebook canvas，agent 创建 chart/code block，人逐 cell 确认/undo；block 画布非自由白板 |
| **Hex Notebook Agent** | 同上，notebook 类；逐 cell confirm |

## C 级：仅生成或查看视觉产物（出局）

| 工具 | 说明 |
|---|---|
| **excalidraw/excalidraw** | 核心画布无内置 agent，需外部桥接 |
| **tldraw/tldraw** | 生产部署需 license key |
| **AFFiNE** | MCP 写入布局仍 roadmap，agent 创建块全在 (0,0) |
| **xyflow** | SDK 工具包，需自建 agent 桥接 |
| **antvis/mcp-server-chart** | 仅生成 chart 输出，无持久共享画布 |
| **VisActor vchart** | 交互图表后端，无共享画布 |
| **Mermaid MCP** | diagram-only，偏流程图 |
| **KyuRish MCP Dashboards** | 对话内嵌交互 UI，非独立共享 canvas |

## 按场景推荐

| 场景 | 首选 | 备选 | 避免 |
|---|---|---|---|
| Coding agent 画架构图/流程图 | **mcp_excalidraw** | tldraw Agent Starter | Sim, Blender |
| 3D 建模/场景 | **Blender MCP** | threejs-devtools-mcp | mcp_excalidraw |
| 自动化工作流编排 | **Sim** | — | mcp_excalidraw |
| 数据可视化分析 | Honeycomb/Observable (SaaS) | Deepnote/Hex (SaaS) | 开源方案不成熟 |
| UI/UX 设计协作 | Figma Design Agent + MCP (SaaS) | — | 无真开源替代 |
| 通用 2D 白板 | **mcp_excalidraw** | tldraw MCP App | excalidraw-mcp (one-shot) |

## 关键风险

- **mcp_excalidraw**：巴士因子 ≈1-2（yctimlin 单人维护）
- **tldraw MCP App**：生产需 license，非纯开源
- **Blender MCP**：LLM 代码执行无沙箱，可能删数据/外传
- **threejs-devtools-mcp**：仅 88 stars，成熟度低
- **Sim**：节点画布 ≠ 自由白板，不能画架构图

## See Also

- [mcp_excalidraw 深挖](mcp-excalidraw.md) — 本地画布的最完整实现
- [产物可持续编辑 genre](sustainable-artifact-editing.md) — 判定标准的思想来源
