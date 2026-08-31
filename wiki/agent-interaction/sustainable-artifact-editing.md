# 产物可持续编辑：Agentic Artifact Genre

> Sources: Phodal《Agentic Programming Artifact》; npm/GitHub API 实测，2026-08-30
> Raw: [Phodal 文章与 qoder-lottie 验证](../../raw/agent-interaction/2026-08-30-phodal-agentic-artifact.md)
> Updated: 2026-08-30

## 核心命题

"生成"不重要，"可持续编辑"才是核心。让产物成为 Agentic Loop 中的工作对象，而不是一次性输出。

## Genre 五条判定标准

产物有稳定身份；可版本化（expectedRevision + stateDigest）；可重入；可验证；人机共享同一工程状态。

## Phodal 三支柱（Qoder Lottie 插件 0.1.0）

1. **Agentic DSL（MotionProgram）**：JS API 表达完整创作程序，而非零散工具调用
2. **CLI over MCP**：MotionRuntime 稳定语义、CLI 稳定入口，MCP 后加协议
3. **Canvas**：人的视觉选择 → 语义地址 → agent 修改 → 重新预览。语义地址：`(source.key, node.key)` → track → phase + expectedRevision + stateDigest

## 实测结论

qoder-lottie CLI **无独立发布**（2026-08-30 验证）：npm 404，@qoder-ai scope 只有 qodercli v1.1.37，GitHub QoderAI org 34 仓库无 lottie。只随 Qoder Marketplace 插件分发。

## 同属 genre

Zerolang（Vercel Labs，agent 操作语义图节点/graph hash，pre-1.0 无现成集成）；arXiv 2605.12087（学术框架，无实现）。接近但不严格满足：Claude Artifacts（字符串匹配无稳定语义身份）、Figma AI（图层有稳定 ID 但主要 agent→canvas 单向）。

## See Also

- [视觉人机交互全景](visual-canvas-interaction-landscape.md) — 按交互通道过滤的工具地图
- [mcp_excalidraw 深挖](mcp-excalidraw.md) — 本地画布路线
- [Agent 操作结构化产物](agent-authored-structured-artifacts.md) — Workflow contract 与正式领域 DSL 的区别
