# awesome-mcp-servers 通用 MCP 筛选（3472→320）

> Sources: punkpeye/awesome-mcp-servers README；GitHub GraphQL API；2026-09-06
> Raw: [session-data-excerpts.md](../../raw/awesome-mcp-servers/session-data-excerpts.md)；[rubric.json](../../raw/awesome-mcp-servers/rubric.json)
> Updated: 2026-09-06

## 结论

从 punkpeye/awesome-mcp-servers 清单（2026-09-06 会话快照，Server Implementations 区段）解析出 3472 个候选条目，四层筛选后 320 个入选「通用 / coding-agent 向 MCP」；计数与星数为**本次筛选记录**（原始大文件因体积未入库，当前仅存会话结果派生摘要，见 Raw 字段）；完整名单与排除清单见派生报告 `experiments/2026-09-06-awesome-mcp-servers-shortlist.md`。

## 解析与对账

- 候选 3472 = 唯一 URL 3465 + 重复 7；无残差（所有含链接的列表项都被条目语法覆盖，含 `-  [` 双空格变体）。
- 桶完备公式：入选 + 阈值未过 + repo 消失（stars unknown）+ 非 GitHub + 重复 + 类级排除 + 边界终审排除 + 垂直复核排除 = 3472。
- 类级排除（垂直业务类）1081；候选 2391 = GitHub 唯一 2375 + 非 GitHub 10 + 重复 occurrence 6。

## 四层筛选管线

1. **类级机器筛**：垂直业务类（Finance、Gaming、Marketing 等）整类排除，判定写入 rubric.json（每类附 group/include/reason/evidence/confidence）。
2. **硬指标**：GraphQL 查 stars + pushedAt + isArchived；入选线 stars ≥ 100 且近一年有 push（阈值由用户在研究会话中确认）；repo 不存在的标 stars unknown 不参与排名；archived 不排除只标记。
3. **LLM 边界终审**：拿不准的类（109 条）逐条裁决，结构化输出 reason。
4. **描述级垂直复核**：全量入选条目再过一遍描述，剔漏网垂直项（生物医学、媒体平台、个人提醒类）。

防漏不靠「认真看」，靠逐项对账公式 + 三桶完备 + 残差可见。

## 分组分布（入选 320）

开发者工具 73、知识与记忆 48、搜索提取 35、数据库 39、coding agent 增强 25、聚合器 21、云基础设施 19、浏览器自动化 12、安全 14、监控 9、执行命令行 7、文件系统 7、版本控制 2、协作生产力 3、架构设计 2、数据平台 2、研究 1、其他 1（计数以 experiments 报告为准）。

## star 高位样本（会话内 GraphQL 实查记录）

- microsoft/markitdown 178363（文件系统）
- netdata/netdata 80438（监控）
- upstash/context7 61675（知识与记忆）
- oraios/serena 28883（coding agent 增强）
- mrexodia/ida-pro-mcp 11851（安全）

星数随时间变化，引用需重新实查。原始快照（3.8MB）因体积未入库，当前仅存会话结果派生摘要 [session-data-excerpts.md](../../raw/awesome-mcp-servers/session-data-excerpts.md)（非原始数据）。

## 边界

- LLM 判定层（三、四层）是主观裁决，理由落盘可推翻；「通用/coding 相关」口径是研究时点的判断。
- 73 个 repo 已删除/改名（stars unknown），不参与排名，完整清单在 experiments 报告。
- 非GitHub 条目（npm/PyPI 分发）无 star 可比，单列。

## See Also

- [五工具对比待办清单](../../raw/awesome-mcp-servers/compare-vs-local-stack.md)
