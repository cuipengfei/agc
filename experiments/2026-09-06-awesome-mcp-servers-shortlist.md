# awesome-mcp-servers 通用 MCP 筛选实验（3472→320）

- **Hypothesis**: awesome-mcp-servers 清单（2026-09-06 快照）中存在一批可机器+LLM 分层识别的「通用 / coding-agent 向」MCP server；用四层管线（类级机器筛 → 硬指标 → LLM 边界终审 → 描述级垂直复核）可以零遗漏筛出它们，且每条排除有可审查理由。
- **Baseline**: 清单原始形态——3472 个条目平铺在 70+ 个类里，无 star 排名、无通用/垂直区分；人工浏览无法保证覆盖。
- **Change**: 全量解析为结构化记录 + 四层筛选 + 逐桶对账；对「拿不准」的类与条目由 LLM 按固定 rubric（group/include/reason/evidence/confidence）逐条裁决，不抛给用户分拣。
- **Context**: 仓库 agc；数据源 punkpeye/awesome-mcp-servers README（会话内快照，因体积未入库；关键数据摘录见 raw/awesome-mcp-servers/session-data-excerpts.md）+ GitHub GraphQL（gh CLI 已登录）。
- **Steps**:
  1. 抽样确认条目语法（发现 `-  [` 双空格变体），写正则全量遍历 Server Implementations 区段。
  2. 解析 3472 候选；残差 0；重复 URL 7。
  3. rubric.json 类级判定：垂直业务类排除 1081，候选 2391。
  4. GraphQL 批量查 stars/pushedAt/isArchived（2375 唯一 GitHub repo 中 73 个不存在）。
  5. 阈值过滤：stars ≥ 100 且 pushedAt ≥ 2025-09-06；archived 保留并标记。
  6. 边界类 109 条 LLM 逐条终审（入 72 / 出 47，每条附理由）。
  7. 全量入选条目描述级垂直复核，剔 11 条漏网垂直项。
  8. 逐桶对账断言通过后生成报告。
- **Observations**: 入选 320；类级排除最大（1081）；阈值未过 1924 为第二大桶；对账公式「入选 + 阈值未过 + repo 消失 + 非 GitHub + 重复 + 类级排除 + 边界终审排除 + 垂直复核排除 = 3472」成立。三处过程纠偏：archived 过滤一度私自添加后撤回（用户只确认两条件）；「已核实」在未读 README 正文时说过一次后撤回；分组计数靠断言复核发现过 322≠320 的对账缺口。
- **Evidence**: raw/awesome-mcp-servers/session-data-excerpts.md（**会话结果派生摘要，非原始快照**——原始大文件 README 1.4M/parsed-entries 1.3M/candidates 876K/stars 208K 因体积已删除，当前只能复核摘录中的记录，无法回溯原始 API 响应）、rubric.json（类级判定 38 类）、candidate-duplicates.json（重复 7 组）、compare-vs-local-stack.md。
- **Verdict**: 管线在当时运行中完成并留有派生记录（session-data-excerpts.md）；当前仓库未保留完整候选清单与原始快照，无法逐条复核。四层筛选 + 逐桶对账在会话当时验证了零遗漏；零残差支持了条目语法定义先行的做法；LLM 判定层承担了机器筛不了的灰色地带且全程结构化可推翻。
- **Follow-up**: ① star 周级时序筛查数据（star-history-5repos.json、star-authenticity-screening.md）因 cwd 漂移丢失，未重建——如需 star 真实性结论需重拉（`/repos/{o}/{r}/stargazers/history`，5 仓库约 25 请求）。② 五工具（serena/codegraph/codebase-memory-mcp/repowise/graphify）对比与舆情结论未入库，候选沉淀主题见 wiki/mcp-servers/awesome-mcp-servers-shortlist-method.md。③ 刷星检测工具调研（StarScout 系）待第二个 ingest。


## 产出物：筛选报告正文

### 筛选口径

- 来源: punkpeye/awesome-mcp-servers README 快照（2026-09-06 抓取）
- 入选线: GitHub stars ≥ 100 且 pushedAt ≥ 2025-09-06；已归档仓库不排除，标 ⚠️
- 类级排除 21 个垂直业务类（1081 条）；边界类 109 条逐条终审（出 47）；描述级垂直复核再剔 11

### 对账（代码断言验证）

```
3472 解析条目 = 入选 320 + 阈值未过 1924 + repo 消失(stars unknown) 73 + 非 GitHub 10
              + 重复 6 + 类级排除 1081 + 边界终审排除 47 + 垂直复核排除 11
```

### 入选分组（320，组内 stars 降序）

| 分组 | 数量 | 代表（组内最高 star） |
|---|--:|---|
| 开发者工具 | 73 | modelcontextprotocol/servers 90104 |
| 知识与记忆 / RAG | 48 | upstash/context7 61675 |
| 数据库 | 39 | googleapis/genai-toolbox 16318 |
| 搜索与内容提取 | 35 | firecrawl/firecrawl-mcp-server 7406 |
| Coding Agent 增强 | 25 | oraios/serena 28883 |
| 聚合器与网关 | 21 | mindsdb/mindsdb 39699 |
| 云平台与基础设施 | 19 | awslabs/mcp 9664 |
| 安全 | 14 | mrexodia/ida-pro-mcp 11851 |
| 浏览器自动化 | 12 | bytedance/UI-TARS-desktop 38865 |
| 监控 | 9 | netdata/netdata 80438 |
| 执行与命令行 | 7 | pydantic/pydantic-ai 19741 |
| 文件系统 | 7 | microsoft/markitdown 178363 |
| 版本控制 | 2 | github/github-mcp-server 32741 |
| 协作与生产力 | 3 | taylorwilsdon/google_workspace_mcp 3123 |
| 数据平台 | 2 | datalayer/jupyter-mcp-server 1272 |
| 架构与设计 | 2 | awdr74100/figwright 683 |
| 研究 | 1 | pminervini/deep-research-mcp 108 |
| 其他通用 | 1 | githejie/mcp-server-calculator 157 |

### 边界组终审排除（47 条，理由全录于 rubric 落盘，此处列样本）

- verticalmedia 类：YouTube/Bilibili 字幕与内容自动化（媒体垂直）
- biomcp、mcp-opennutrition（生物医学/营养垂直）
- Apple Reminders 个人提醒、Max/MSP 音乐编程、ROS 机器人控制
- 招聘/求职、ERP、SIEM SOC、蜜罐攻防、网络抓包运维

### stars: unknown（73 个 repo 已删除/改名/私有，不参与排名）

完整清单判定依据见 raw/awesome-mcp-servers/session-data-excerpts.md（stars unknown 73 个，值为 null 的键在原始 stars 快照中，快照未入库）。

### 非 GitHub 条目（10 个，无 star 可比）

清单判定依据见 raw/awesome-mcp-servers/session-data-excerpts.md（非 GitHub 10 个、stars unknown 73 个）。
