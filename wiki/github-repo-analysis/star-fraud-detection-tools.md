# GitHub 刷星检测工具调研（六工具）

> Sources: 六个工具仓库 README；GitHub GraphQL API；2026-09-06
> Raw: [heathdutton-StarScout.md](../../raw/github-star-fraud-detection/heathdutton-StarScout.md)；[GeckCore-star-forensics.md](../../raw/github-star-fraud-detection/GeckCore-star-forensics.md)；[alexdrydew-realstars.md](../../raw/github-star-fraud-detection/alexdrydew-realstars.md)；[truststar-app-truststar.md](../../raw/github-star-fraud-detection/truststar-app-truststar.md)；[Dmitrze-repo-trust.md](../../raw/github-star-fraud-detection/Dmitrze-repo-trust.md)；[anwen-labs-orbit-check.md](../../raw/github-star-fraud-detection/anwen-labs-orbit-check.md)；[session-data-excerpts.md](../../raw/github-star-fraud-detection/session-data-excerpts.md)
> Updated: 2026-09-06

## 结论

StarScout 论文（arXiv:2412.13459，ICSE 2026，作者含 Bogdan Vasilescu、Christian Kästner）带出六个 2026 年刷星检测工具，全部几乎零 star（0-2）、建于 2026-01 至 2026-07——一个论文催生的新品类，代码未经大规模使用检验。信号分类法、数据源、报告纪律可借用；工具本身的权重与阈值是作者启发式，暂不可信。

## 信号分类法（六工具并集）

- **账号质量**：零 repo/零 follower/无 bio、建号日期聚集、新号即打星、bot 式用户名（香农熵）、社交孤立
- **时序异常**：star 速率突刺 vs 基线、尖峰日 3σ、top-day/week 占比
- **协同模式**：lockstep（一批账号窄时间窗协同打星，CopyCatch 式）、打星重叠指纹（Jaccard，农场账号跨 campaign 复用）
- **跨平台对照**：star vs npm/PyPI 下载量失调、星/叉比失调
- **已知黑名单**：被标记的打星农场账号库

## 六工具分工（README 自述）

| 工具                    | 形态                          | 特点                                                                                                     | 输出                             |
| ----------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------- |
| heathdutton/StarScout   | 研究复现包                    | low-activity + lockstep 两启发式；BigQuery ≥20TB（约 $125+）/lockstep ≥40TB 跑一周；Zenodo 有标注数据集  | 异常标记（全平台级）             |
| GeckCore/star-forensics | CLI                           | 8 检测器（幽灵账号、建号聚集、速率突刺等）                                                               | Trust Score 0-100 + 每检测器证据 |
| alexdrydew/realstars    | 浏览器扩展 + Claude Code 插件 | 13 加权信号，含跨平台对照与打星重叠指纹；权重表公开                                                      | 贝叶斯式复合分                   |
| truststar-app/truststar | 托管服务 + API + 徽章         | 4 维 Trust Score + npm Check + Code Scan（供应链静态分析）；可自托管                                     | 0-100 + SAFE…DANGEROUS 标签      |
| Dmitrze/repo-trust      | CLI/库                        | 五模块加权（star 真实性仅 0.20）；star 模块内公式 0.55×低活跃 + 0.30×lockstep + 0.15×比率；置信度与分数分开报告；复用 OpenSSF/deps.dev 结果不重算 | 分数 + 置信度                    |
| anwen-labs/orbit-check  | CLI                           | 自我声明「不是欺诈检测器」；纯 Python 标准库零依赖；结果文件随报告 commit 可复现；维护者申诉通道         | 四级信号 tier                    |


## repo-trust methodology 精华（v0.1.0 文档声明）

- **star 真实性只是选型评估的五分之一**：Star Authenticity 0.20 | Activity Health 0.25 | Maintainer Health 0.20 | Adoption 0.20 | Security 0.15——只看 star 会漏掉四分之三的选型风险面
- **双信号合取门**：低活跃占比高（H1）**且** 滞后滑动 z 分数 ≥5（H2）同时命中才降级——单信号不降，因为真病毒事件（HN 首页）可产生 z 8-15 区间的极端值
- **滞后滑动基线**：28 天滚动均值 ±7 天滞后，逐日 z 分数取 max；这样做可减少基线选择造成误判的风险（推断，非本轮实测）。
- **样本量联动置信度**：n<100 → Medium，n<30 → Low + caveat（该工具 v0.1.0 参数，非通用规则）
- **置信度聚合取最小不平均**：权重 >10% 的模块里最低置信度拉低整体——薄数据不许被平均掉
- **生态感知**：fork/star 比按生态调（TS 库天然少于 Python 框架）；稳定工具库（release≥3 且版本一致）豁免「不活跃」降权
- **联邦不重算**：OpenSSF Scorecard / deps.dev / OSV 已算过的直接复用（ADR 0005）
- 配套 fork 增长做判别辅助：大 z + 小 fork 增长 → 怀疑；大 z + 同量 fork 增长 → 有机迹象

## 报告纪律（比检测本身更稀缺）

- 分数与置信度分开报告（repo-trust）
- 输出信号分级，永不输出真假判决（orbit-check）
- 合法解释强制检查：真实病毒事件与购买突刺在纯时序上不可区分，须结合站外事件（HN 首页、发布会、大 V 推文）裁决
- 不公开点名羞辱（StarScout 论文伦理声明：数据只标「疑似」）
- README 均承认权重待校准（star-forensics 明言 help us calibrate them）

## 已知失效与坑（会话实查记录）

- GitHub `GET /repos/{o}/{r}/stargazers` 列表端点 2026-07 起仅限 admin/collaborator——公开仓库无法逐 star 取证，`search /users` 不能绕（它只搜用户，恢复不了打星事件）
- star-history 第三方服务曾返回 503——第三方聚合服务不能当主路径
- pypistats.org 有激进 429 限速；pepy.tech v2 需鉴权

## 选型建议

- 单仓库快速体检：star-forensics（CLI 形态最成熟）
- 信号面最宽 + 浏览时顺手看：realstars
- 要 API/徽章/托管或顺带查 npm 供应链：truststar
- 方法论可辩护、写报告用：repo-trust（公式透明）+ orbit-check（措辞纪律）
- 学术研究/全平台统计：StarScout 论文 + Zenodo 数据集

## 边界

- 六工具全部 0-2 star（会话实查记录，2026-09-06）——工具成熟度本身未经社区检验，这是选型时必须计入的因子
- 各工具信号清单、检测器数量、benchmark 数字均来自 README 自述，未独立验证
- truststar 自报 benchmark（Trust Score 100%、Code Scan 94%）样本极小且为自评
