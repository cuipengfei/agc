# codegraph 与 graphify 的分工边界

> Sources: 本会话 codegraph MCP 单查询探测 + graphify 0.9.79 图谱实测, 2026-10-07
> Raw: [2026-10-07-codegraph-graphify-probe](../../raw/agent-tooling/2026-10-07-codegraph-graphify-probe.md); [graphify 0.9.79 全命令清单试用记录](../../raw/agent-tooling/2026-10-07-graphify-079-inventory-trial.md)
> Updated: 2026-10-07

## Overview

2026-10-07 在 agc 仓库做了一次对照探测：对 codegraph MCP 与 graphify 图谱问同一个文档类知识问题，观察两者返回形态的差异。可证结论只有三条（见下节）；分工建议一节是基于返回形态与机制描述的推断，codegraph 侧多数能力本次未独立验证。

## 探测证据

对两者问「prompt cache 命中条件与 TTL」——该主题在 wiki 中有覆盖（prompt-caching 文章：前缀匹配命中条件、TTL 表格）：

- **codegraph 返回 25 个代码符号、2 个源码文件**（一个扩展脚本因标识符含缓存字样命中，一个文件遍历模块属词面匹配），返回形态是逐字源码加调用方信息；**未返回任何 wiki 条目**。
- **graphify 同日重建的图谱中 wiki 节点位居高连接数**：god-nodes list 里 Wiki Log 174 条边居首，Knowledge Base Index 40 条边第二。wiki 条目之间、wiki 与代码之间是否已有边相连，本次未探测。

以上仅为该次查询的事实，不能外推（见末节）。

## graphify 侧同日已验证的能力

- graphify 侧同日已验证的能力：以下均为 2026-10-07 实测（细节见 [graphifyy 工作机制](graphify-mechanics.md)）：path / explain / affected / query 查询族可用；god-nodes / diagnose / benchmark 总览与体检可用；svg、wiki、graphml、obsidian、callflow-html、neo4j、falkordb 七种导出离线可用；merge-graphs 跨仓合并出 4,623 节点图；全局图管理命令通过空图试用（add/list/remove，跨项目查询未验证）；save-result / reflect 记忆层可用；AGENTS.md 在 affected 结果中以 references 关系出现（文档语料入图的一例）。

## 分工建议（推断层，codegraph 侧未验证）

基于返回形态与两者机制描述，一个合理的分工假设是：改代码、追符号级调用路径时 codegraph 的逐字源码+调用方返回形态更直接；问文档类知识、要可导出的图谱资产、跨仓库问题时 graphify 已验证的能力覆盖得更好。该假设待更多对照查询验证，尤其 codegraph 对 markdown 语料的索引范围、两者延迟差异，本次均未测。

## 证据边界

- 一次查询探测：不能推断 codegraph 整体不支持文档类语料，不能断言相关知识仅存在于 wiki（wiki 有覆盖、该次查询未达）。
- 性能未测：两者的延迟、吞吐均无数据。
- 功能独有性未验证：graphify 列出的能力为其实测所得；"codegraph 没有这些能力"未验证。
- graphify 侧为同日单日图谱状态；merge-driver 仅相同输入验证通过。

## See Also

- [graphifyy 工作机制](graphify-mechanics.md) — graphify 全命令清单与六条环境边界
- [MCP 配置与验证阶梯](../harness-engineering/mcp-setup-validation.md) — codegraph 与 semgrep 等 MCP 的宿主配置与三级验证
- [Prompt Cache：前缀匹配与 cache key 的真实分工](../prompt-caching/cache-key-and-prefix-matching.md) — 本次探测所用的 wiki 侧知识样例
