# awesome-harness-engineering 五个同名仓库对比

> Sources: GitHub REST API 实查（stars、forks、open_issues、pushed_at、readme）；五个仓库 README 原文；2026-10-29
> Raw: [2026-10-29-five-repos-coverage-audit.md](../../raw/awesome-harness-engineering/2026-10-29-five-repos-coverage-audit.md)
> Updated: 2026-10-29

## 结论

仓库名完全等于 `awesome-harness-engineering` 的五个公开仓库，星数跨度 16 到 4988，维护状态分成两档（两个在 2026-10-28 有推送，三个停在 2026-08-19 及更早），README 去重仓库数从 61 到 752。「收录最全」由 `yenanjing` 拿到，「仍在维护且分类最详细」由 `ai-boost` 拿到，两个称号在同一批仓库里没有交集。按星数、维护时间、覆盖量三项等权打分，顺序为 `ai-boost` 75.9、`yenanjing` 66.5、`walkinglabs` 54.9、`jiji262` 15.5、`Jiaaqiliu` 5.7。

## 五仓库对照

| 仓库 | 星 | fork | 未处理 | pushed_at | README 行 | 字节 | 去重仓库 | 条目形态 | 总分 |
|---|---|---|---|---|---|---|---|---|---|
| ai-boost/awesome-harness-engineering | 4988 | 700 | 283 | 2026-10-28 | 698 | 283408 | 255 | 540 条列表项、5 行模板表格 | 75.9 |
| yenanjing/awesome-harness-engineering | 16 | 6 | 6 | 2026-10-28 | 938 | 165956 | 752 | 774 行表格（764 行含仓库链接）、24 条列表项 | 66.5 |
| walkinglabs/awesome-harness-engineering | 4496 | 454 | 58 | 2026-08-19 | 286 | 39094 | 75 | 176 条列表项、零表格 | 54.9 |
| jiji262/awesome-harness-engineering | 51 | 13 | 13 | 2026-05-30 | 477 | 31241 | 78 | 145 条列表项、零表格 | 15.5 |
| Jiaaqiliu/Awesome-Harness-Engineering | 43 | 14 | 12 | 2026-03-29 | 546 | 56845 | 61 | 264 行表格（61 行含仓库链接）、57 条列表项 | 5.7 |

五个仓库都没有发布 release。`ai-boost` 与 `walkinglabs` 的 license 字段为 NOASSERTION，`yenanjing` 与 `jiji262` 无 license，`Jiaaqiliu` 为 CC0-1.0。

二级标题数量：`ai-boost` 12、`walkinglabs` 11、`yenanjing` 15、`jiji262` 4、`Jiaaqiliu` 15。`ai-boost` 的 12 段按设计要素切分（Foundations、Design Primitives、Reference Implementations、Security, Sandbox & Permissions、Evals & Verification、Templates、Production Infrastructure & Operations、Related Awesome Lists 等），`yenanjing` 的 15 段里有 9 段是分类（Agent Harness Frameworks、CI/CD & DevOps Platforms、LLM Evaluation Harnesses、Harness Engineering Guides & Learning、Skills, Memory & Context Toolkits、Benchmarking & Testing Harnesses、Security & Fuzzing Harnesses、Awesome & Curated Lists、Miscellaneous Harness Projects），`jiji262` 只有 4 段且含中文文章分区。

## 打分口径

三项等权，算术平均：

- 星数分 $= 100 \times \dfrac{\log_{10}(\text{stars}) - \log_{10}16}{\log_{10}4988 - \log_{10}16}$
- 维护分 $= \max\left(0,\ 100 - \dfrac{\text{距 } pushed\_at \text{ 天数}}{2}\right)$，基准日 2026-10-29
- 覆盖分 $= 100 \times \dfrac{\text{去重仓库数} - 61}{752 - 61}$

| 仓库 | 距 pushed_at 天数 | 星数分 | 维护分 | 覆盖分 | 总分 |
|---|---|---|---|---|---|
| ai-boost | 1 | 100.0 | 99.5 | 28.1 | 75.9 |
| yenanjing | 1 | 0.0 | 99.5 | 100.0 | 66.5 |
| walkinglabs | 71 | 98.2 | 64.5 | 2.0 | 54.9 |
| jiji262 | 152 | 20.2 | 24.0 | 2.5 | 15.5 |
| Jiaaqiliu | 214 | 17.2 | 0.0 | 0.0 | 5.7 |

归一化基准取样本内的极值，这带来一个后果：覆盖分被 `yenanjing` 的 752 拉到上限，`ai-boost` 的 255 只得 28.1 分，于是星数满分的 `ai-boost` 总分 75.9 只比 `yenanjing` 的 66.5 高 9.4 分。若把覆盖基准改成 300 封顶（覆盖分 $= 100 \times \min(\text{去重仓库数}, 300) / 300$），`ai-boost` 覆盖分为 85.0、总分 94.8，`yenanjing` 覆盖分仍为 100.0、总分 66.5，第一名不再有争议。

维护分只认最后推送时间，不看提交密度。`ai-boost` 在 2026-10-28 当天合入多个社区 PR，`yenanjing` 同日也有更新，两者的维护分相同（99.5），差别在覆盖量和条目组织方式。

## 自报数与实测数
`yenanjing` README 第 9 行自报 `754 repositories across 9 categories`，Stats 段同样写 754，并给出语言分布 Python(267)、TypeScript(181)、JavaScript(58)、Rust(43)、Go(41)、Shell(34)、HTML(20)、Java(12)。实测分类段的仓库行 754、去重仓库 752、链接出现 764、全部表格行 774。

差额构成：764 − 752 = 12 次重复，其中 2 次来自跨分类重复收录（`trustgraph-ai/trustgraph`、`redcanaryco/atomictestharnesses` 各在两个分类出现一次，754 行去重后为 752），另 10 次来自 Stats 段 Top 10 表的 10 行对分类表已有条目的重复引用。归类一下：全部表格行 774 = 分类段 763 行 + Stats 段 11 行；分类段的 763 行里有 9 行是各分类表头，余下 754 行含仓库链接；Stats 段 11 行 = 1 行表头 + 10 行数据。含链接的表格行合计 764，与链接出现次数一致，说明每行只带一个仓库链接。自报的 754 对应分类段的仓库行数，去重后是 752；9 个分类与实测的 9 个分类段一致。

`ai-boost` 同样有重复：258 次出现、255 个去重，3 次重复来自自身仓库链接出现三次和 `langchain-ai/langgraph` 出现两次。`walkinglabs`、`jiji262`、`Jiaaqiliu` 三个零重复。

引用清单自报数字时要先确认它的计数对象是行数还是去重实体。

## 互补性

五份清单并集 1074 个去重仓库。两两交集：

| | ai-boost | walkinglabs | yenanjing | jiji262 | Jiaaqiliu |
|---|---|---|---|---|---|
| ai-boost | 255 | 10 | 66 | 31 | 19 |
| walkinglabs | 10 | 75 | 9 | 3 | 12 |
| yenanjing | 66 | 9 | 752 | 4 | 6 |
| jiji262 | 31 | 3 | 4 | 78 | 11 |
| Jiaaqiliu | 19 | 12 | 6 | 11 | 61 |

各自独有（不出现于其余四份）：`ai-boost` 149、`yenanjing` 675、`walkinglabs` 51、`jiji262` 43、`Jiaaqiliu` 30。两两 Jaccard 最高 0.103（`ai-boost` 与 `jiji262`），最低 0.005（`yenanjing` 与 `jiji262`）。

五份清单几乎没有互为副本的关系，收藏其中一份不能替代其余四份。按使用场景分工：要设计要素分类取 `ai-boost`，要单分类下的项目总量取 `yenanjing`，要指南与实践教程取 `walkinglabs`，要中文文章取 `jiji262`。

## 口径陷阱

1. **按链接数算覆盖会同时高估和低估。** `yenanjing` 752 个去重链接对应 774 行表格（其中 764 行含仓库链接）、只有 24 条列表项；`ai-boost` 255 个去重链接却有 540 条列表项，因为主条目下挂子条目。表格型清单按链接计接近真实条目数，分组型清单按链接计会低估。
2. **标题计数必须区分正则。** `^## ` 只匹配二级标题，`^##+ ` 连三级及更深一起匹配。同一个 README 两种口径能差一倍以上：`yenanjing` 15 与 16，`Jiaaqiliu` 15 与 39。写结论时要标出用的是哪一个。
3. **维护时间两种取法在本样本等价。** `pushed_at` 与首条提交的 `commit.committer.date` 在这五个仓库上完全相同；会话内另对 28 个同类清单仓库做过比对，结果同样一致。两者可互换，结论要写明用了哪一个。
4. **覆盖口径要统一。** 按全部 Markdown 统计与按 README 统计，只对目录型仓库产生差别；这五个的目录都在 README 内，两种口径数字相同。跨仓库比较前先确认口径一致。
5. **自报数字不等于去重结果。** `yenanjing` 的 754 与去掉跨分类重复后的 752 相差 2；这个 754 是分类段的仓库行数，全部表格行是 774，两者相差 20 行表头与非仓库行。

## 边界

- 星数、fork、未处理数、`pushed_at` 是 2026-10-29 的快照，会随时间变化；引用前需重新实查。
- 覆盖数按 README 中的 `github.com/{owner}/{repo}` 链接计，不校验链接可达性，也不评估条目质量。
- 五个仓库的目录都在 README 内，目录型仓库（清单拆到多个 Markdown 文件）的统计差别本次没有样本。
- 五项打分权重与归一化基准是本会话选定的参数，没有外部依据；换成其他权重，`yenanjing` 与 `ai-boost` 的先后会改变。

## See Also

- [GitHub 刷星检测工具调研](star-fraud-detection-tools.md)
- [awesome-mcp-servers 通用 MCP 筛选（3472→320）](../mcp-servers/awesome-mcp-servers-shortlist-method.md)
