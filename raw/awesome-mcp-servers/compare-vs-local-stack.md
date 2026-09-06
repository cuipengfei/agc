# 待与本机栈对比的代码智能候选短清单

> 创建：2026-09-06，来源 awesome-mcp-servers 筛选（见 awesome-mcp-servers-shortlist.md）
> 待办：后续与 **graphify** 一并做三方/四方对比

## 对比轴（本机已有）

- **CodeGraph**（本机已装，MCP）：tree-sitter AST + SQLite 预计算知识图谱，只读探索（源码/调用路径/blast radius）
- **graphify**（本机已装）：任意输入→知识图谱，--code-only 无 LLM 建图，god nodes/社区检测/query/path/explain

## 候选

| 候选 | Stars | 与本机栈的关系 | 独特点（README 声明） |
|---|--:|---|---|
| [oraios/serena](https://github.com/oraios/serena) | 28.9k | 互补：CodeGraph 只读探索，serena 读写兼有（graphify 读写面未验证） | LSP 符号级**编辑**（rename/replace symbol/insert around）+ JetBrains 断点调试；也有完整只读工具 |
| [DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) | 42.4k | 与 CodeGraph 同生态位（重叠最高） | + 向量语义搜索、死代码检测、路由节点↔调用点、Cypher、跨 repo 边、3D UI、ADR |
| [repowise-dev/repowise](https://github.com/repowise-dev/repowise) | 6.3k | 图谱层重叠，主体在图谱之外 | + git 历史（hotspot/co-change/bus factor）、49 个代码健康检测器、diff→受影响测试清单、PR bot |

## 对比待办

- [ ] graphify 建图产物 vs CodeGraph/CBM 图谱的覆盖与查询能力对比（公平方法见 graphify 相关 skill：--code-only 口径）
- [ ] serena 只读工具集 vs CodeGraph 查询面的逐项对照
- [ ] repowise 健康检测器/PR 风险评估是否有本机等价物（目前无）

