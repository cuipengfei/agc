# awesome-harness-engineering 五个同名仓库覆盖度审计（派生记录）

> Source: GitHub REST API（gh CLI，`repos/{owner}/{repo}`、`commits`、`releases`、`readme`）；五个仓库 README 原文
> Collected: 2026-10-29
> Published: Unknown
> Type: session-derived summary

**性质声明**：本文件是会话内用 `gh api` 实查并计算的**结果记录（派生记录）**，不是外部文章的逐字摘录。README 原始快照未入库，数字来自当次 API 响应；需要核查时按可复现路径重跑：`gh api repos/{owner}/{repo}` 取 stars/forks/open_issues/pushed_at/license，`gh api repos/{owner}/{repo}/readme -H "Accept: application/vnd.github.raw"` 取 README，再按文末正则统计。抓取日 2026-10-29。

## 筛选口径

仓库名小写后完全等于 `awesome-harness-engineering` 的五个仓库入选。名单来源为本次会话的 GitHub 搜索（`gh search repos "awesome harness" --sort stars` 与四组 `search_repos` 关键词交叉核对），未纳入名字带后缀或在名称其他位置出现该词组的仓库。

## 元数据（2026-10-29 API 单点实查）

| 仓库 | stars | forks | open_issues | pushed_at | 首条提交日期 | license | releases |
|---|---|---|---|---|---|---|---|
| ai-boost/awesome-harness-engineering | 4988 | 700 | 283 | 2026-10-28 | 2026-10-28 | NOASSERTION | 0 |
| walkinglabs/awesome-harness-engineering | 4496 | 454 | 58 | 2026-08-19 | 2026-08-19 | NOASSERTION | 0 |
| yenanjing/awesome-harness-engineering | 16 | 6 | 6 | 2026-10-28 | 2026-10-28 | none | 0 |
| jiji262/awesome-harness-engineering | 51 | 13 | 13 | 2026-05-30 | 2026-05-30 | none | 0 |
| Jiaaqiliu/Awesome-Harness-Engineering | 43 | 14 | 12 | 2026-03-29 | 2026-03-29 | CC0-1.0 | 0 |

`pushed_at` 与 `commits?per_page=1` 首条提交的 `commit.committer.date` 在这五个仓库上完全相同；会话内另对 28 个同类清单仓库做过同样比对，结果同样全部一致。

## README 计量

统计规则：`readme_lines` 用 `wc -l`；`readme_bytes` 用 `wc -c`；`link_occurrences` 统计 `github.com/{owner}/{repo}` 的出现次数（小写化并去掉结尾 `.git`）；`unique_repos` 为同一规则去重后的数量；`all_table_rows` 统计以 `|` 开头且不是分隔行的全部表格行；`linked_table_rows` 是其中含 `github.com/` 的行；`bullets` 统计 `^[[:space:]]*[-*] `；`h2` 用 `^## `，`h3_plus` 用 `^### `，`h2_plus` 用 `^##+ `。

| 仓库 | 行 | 字节 | 链接出现 | 去重仓库 | 全部表格行 | 含链接表格行 | 列表项 | h2 | h3+ | h2+ |
|---|---|---|---|---|---|---|---|---|---|---|
| ai-boost | 698 | 283408 | 258 | 255 | 5 | 0 | 540 | 12 | 16 | 28 |
| walkinglabs | 286 | 39094 | 75 | 75 | 0 | 0 | 176 | 11 | 22 | 33 |
| yenanjing | 938 | 165956 | 764 | 752 | 774 | 764 | 24 | 15 | 1 | 16 |
| jiji262 | 477 | 31241 | 78 | 78 | 0 | 0 | 145 | 4 | 13 | 17 |
| Jiaaqiliu | 546 | 56845 | 61 | 61 | 264 | 61 | 57 | 15 | 24 | 39 |

`all_table_rows` 与 `linked_table_rows` 的差额是表头行与不含仓库链接的行。yenanjing 774 行 = 分类段 763 行 + Stats 段 11 行；分类段 763 行里有 9 行是各分类的表头（`| Repository | Stars | Language | Description |`），余下 754 行含仓库链接；Stats 段 11 行 = 1 行表头 + 10 行 Top 10 数据。含链接表格行合计 754 + 10 = 764，等于链接出现次数，说明每行只带一个仓库链接。Jiaaqiliu 264 行里 61 行含仓库链接，其余 203 行是表头行与 shields.io 徽章、文章链接等非仓库行；ai-boost 的 5 行全部是 templates 表，链接指向仓库内文件。

链接重复（出现次数减去找重数）：

- ai-boost：258 − 255 = 3；重复键为自身仓库链接 3 次、`langchain-ai/langgraph` 2 次
- yenanjing：764 − 752 = 12；分类段 754 行去重后为 752（`trustgraph-ai/trustgraph`、`redcanaryco/atomictestharnesses` 各在两个分类出现一次，计 2 次重复），另 10 次来自 Stats 段 `### 🏆 Top 10 by Stars` 表的 10 行对分类表已有条目的重复引用
- walkinglabs、jiji262、Jiaaqiliu：出现次数等于去重数，零重复

## yenanjing 自报数与实测数

README 第 9 行为 `Collected <strong>754</strong> repositories across <strong>9</strong> categories`。Stats 段自报内容：

- `Total repositories`: 754
- `Categories`: 9
- `Top languages`: Python(267), TypeScript(181), JavaScript(58), Rust(43), Go(41), Shell(34), HTML(20), Java(12)
- `Last updated`: 2026-10-28

实测分类段的仓库行 754、去重仓库 752、链接出现 764、全部表格行 774。自报的 754 等于分类段的仓库行数（9 个表头行不计），不等于去重仓库数，也不等于全部表格行数：全部表格行 774 还要加上 Stats 段的 11 行，其中 10 行是 Top 10 数据、1 行是表头；含链接的表格行合计 764，就是链接出现次数。实测二级标题 15 个，其中 9 个是分类段，与自报的 9 categories 一致；唯一的三级标题是 Stats 段下的 `### 🏆 Top 10 by Stars`。

## 章节结构（二级标题）

- ai-boost（12）：Contents、Foundations、Design Primitives、Reference Implementations、Security, Sandbox & Permissions、Evals & Verification、Templates、Production Infrastructure & Operations、Related Awesome Lists、Contributing、License、Acknowledgments
- walkinglabs（11）：内部另有 22 个三级标题，零表格
- yenanjing（15）：Table of Contents、About、Agent Harness Frameworks、CI/CD & DevOps Platforms、LLM Evaluation Harnesses、Harness Engineering Guides & Learning、Skills, Memory & Context Toolkits、Benchmarking & Testing Harnesses、Security & Fuzzing Harnesses、Awesome & Curated Lists、Miscellaneous Harness Projects、Stats、Star History、Contributing、License
- jiji262（4）：Articles、Chinese & WeChat Articles、Reference Implementations & Open Source Tools、Security, Evals & Related Lists
- Jiaaqiliu（15）：另有 24 个三级标题、264 个表格行（其中 61 行含仓库链接）

## 打分

公式（三项等权，算术平均）：

- 星数分 = 100 × (log10(stars) − log10(16)) / (log10(4988) − log10(16))
- 维护分 = max(0, 100 − 距 pushed_at 天数 / 2)，基准日 2026-10-29
- 覆盖分 = 100 × (unique_repos − 61) / (752 − 61)

| 仓库 | 距 pushed_at 天数 | 星数分 | 维护分 | 覆盖分 | 总分 |
|---|---|---|---|---|---|
| ai-boost | 1 | 100.0 | 99.5 | 28.1 | 75.9 |
| yenanjing | 1 | 0.0 | 99.5 | 100.0 | 66.5 |
| walkinglabs | 71 | 98.2 | 64.5 | 2.0 | 54.9 |
| jiji262 | 152 | 20.2 | 24.0 | 2.5 | 15.5 |
| Jiaaqiliu | 214 | 17.2 | 0.0 | 0.0 | 5.7 |

敏感性：覆盖分基准取样本最大值 752 时，255 个去重仓库只得 28.1 分；若把基准改为 300 封顶（覆盖分 = 100 × min(unique_repos, 300) / 300），ai-boost 覆盖分为 85.0、总分 94.8，yenanjing 覆盖分仍为 100.0、总分 66.5。

## 五份清单的重叠

并集 1074 个去重仓库。两两交集：

| | ai-boost | walkinglabs | yenanjing | jiji262 | Jiaaqiliu |
|---|---|---|---|---|---|
| ai-boost | 255 | 10 | 66 | 31 | 19 |
| walkinglabs | 10 | 75 | 9 | 3 | 12 |
| yenanjing | 66 | 9 | 752 | 4 | 6 |
| jiji262 | 31 | 3 | 4 | 78 | 11 |
| Jiaaqiliu | 19 | 12 | 6 | 11 | 61 |

各自独有（不出现于其余四份）：ai-boost 149、yenanjing 675、walkinglabs 51、jiji262 43、Jiaaqiliu 30。两两 Jaccard 最高 0.103（ai-boost 与 jiji262），最低 0.005（yenanjing 与 jiji262）。

## 口径教训

1. `pushed_at` 与首条提交日期在本样本一致，两者可互换；结论需写明用了哪一个。
2. 覆盖数按全部 Markdown 与按 README 统计，只对目录型仓库产生差别；这五个的目录都在 README 内，两种口径数字相同。
3. 覆盖数不等于条目数：yenanjing 去重仓库 752、含链接表格行 764、全部表格行 774、列表项 24；ai-boost 去重仓库 255、列表项 540（主条目下有子条目）。
4. 自报条目数可能等于某一层的行数而非去重实体：yenanjing 自报 754 等于分类段的仓库行数（全部表格行 774 减去分类表头 9 行与 Stats 段 11 行），去重后为 752，相差 2 来自跨分类重复收录。
5. 统计标题必须区分 `^## ` 与 `^##+ `：前者只匹配二级标题，后者包含三级及更深；同一 README 两种口径可差一倍以上（yenanjing 15 与 16，Jiaaqiliu 15 与 39）。
