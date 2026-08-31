# Agent 操作结构化产物

> Sources: THU-MAIC OpenMAIC; ConardLi Garden Skills, 2026-09-01
> Raw: [OpenMAIC 仓库证据](../../raw/agent-interaction/2026-09-01-openmaic-repository-study.md); [Garden Skills 仓库证据](../../raw/agent-tooling/2026-09-01-garden-skills-repository-study.md)
> Updated: 2026-09-01

## Overview

复杂 Agent 产物若只剩最终 HTML、图片或视频，后续修改往往退化为重新生成。更可持续的模式是让 Agent 通过受约束的工具修改结构化中间产物，再由稳定 renderer 输出最终结果。OpenMAIC 提供正式 DSL/runtime；Garden Skills 提供较轻的工作流与 checkpoint。

## 两种成熟度

### Workflow contract

Garden Skills 把复杂任务拆成 source、planning、alignment、generation 和 review：

- `web-video-presentation` 生成口播、outline 与点击式网页演示。
- `beautiful-article` 把来源加工为单文件 HTML 长文。
- `web-design-engineer`、`gpt-image-2` 和 `kb-retriever` 分别覆盖视觉页面、图像和本地知识检索。

这类 Skill 能稳定协作步骤，但产物的结构化程度由具体 Skill 和宿主决定。

### Domain runtime

OpenMAIC 把课程表示为版本化 DSL，Agent 通过 typed tools 修改课程、场景、材料、教师、媒体与白板状态，再交给统一 renderer。

```text
用户意图
→ Skill 选择工作方法
→ typed tool 修改 DSL / RuntimeStore
→ schema 校验与持久化
→ renderer 投影为互动课堂
```

结构化中间层使编辑、播放、导出和恢复共享同一个领域模型，而不是各自解析一次最终 HTML。

## 什么时候值得建立 DSL

满足以下条件时，正式 schema/runtime 通常值得：

- 同一产物需要反复编辑。
- 有多个 renderer 或导出格式。
- 局部修改不能安全地靠整份重生成。
- 需要回放、版本、协作或持久恢复。
- Agent 输出会被机器流程继续消费。

一次性海报、短演示或静态文章未必需要领域 DSL；清晰的 workflow contract 已经够用。

## 安全边界

结构化工具减少任意文本执行，却不会自动解决认证和网络风险。OpenMAIC 的开发 persistence token 不提供真正用户隔离；网页材料抓取仍依赖 SSRF guard。Schema 保护数据形状，身份、权限和外部访问需要独立控制。

## See Also

- [产物可持续编辑 Genre](sustainable-artifact-editing.md) — 判断产物能否被稳定寻址和增量修改。
- [视觉人机交互全景](visual-canvas-interaction-landscape.md) — Agent 与可视化画布的交互层次。
- [mcp_excalidraw：给 Agent 一块活画布](mcp-excalidraw.md) — draw → look → adjust 的具体工具闭环。
