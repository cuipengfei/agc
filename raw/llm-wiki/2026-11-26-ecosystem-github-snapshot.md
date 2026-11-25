# Karpathy LLM Wiki 生态 GitHub 检索快照

> Source: GitHub 搜索 API（search_repos，查询见下）；逐仓库 README / package.json 读取记录见文末
> Collected: 2026-11-25（UTC）
> Published: 2026-11-25（快照性质，star 会随时间变化）

## 检索口径

- 查询：`llm-wiki sort:stars`（30 条）、`topic:karpathy-llm-wiki sort:stars`（40 条）、`topic:llm-wiki sort:stars`（20 条）、`topic:llm-wiki-personal-knowledge-base sort:stars`（23 条）、`karpathy knowledge base wiki sort:stars`（15 条）。
- 档位定义：L0 单个文档/清单/语料库；L1 skill 包；L2 插件或技能集；L3 CLI/MCP/编译器；L4 桌面或 web 应用；L5 平台。
- 署名证据分级：R-full（README 全文读过）、R-part（README 片段）、D（仅 GitHub 描述字段）、Pkg（只读 package.json）。

## 衍生排名表（star 为 2026-11-25 搜索 API 原值）

| 档 | 项目 | Stars | 署名证据 |
|---|---|---|---|
| L0 | cclank/Hermes-Wiki | 660 | D |
| L0 | helloianneo/obsidian-ai-second-brain | 326 | D |
| L0 | gavischneider/awesome-llm-wiki | 297 | D（清单引用 gist） |
| L0 | coleam00/cole-medin-knowledge-base | 166 | D（Karpathy + OKF） |
| L0 | SrsBlack/ict-knowledge-library | 89 | D |
| L0 | zhurudong/andrej-karpathy-llm-wiki | 33 | D |
| L0 | OferBlum/personal-digital-brain-with-ai | 6 | D 未署名 |
| L0 | xiaoyuze88/karpathy-llm-wiki-boilerplate | 6 | D |
| L0 | tuanduongdn1504/agentic-ai-brain-for-trending | 4 | D |
| L0 | makaele27/BibleLLM | 2 | D |
| L1 | Astro-Han/karpathy-llm-wiki | 2,804 | R-full（README+SKILL.md；本仓在用的分支） |
| L1 | sdyckjq-lab/llm-wiki-skill | 2,607 | R-part（README 前 49 行） |
| L1 | lewislulu/llm-wiki-skill | 656 | D |
| L1 | shannhk/llm-wikid | 434 | D |
| L1 | praneybehl/llm-wiki-plugin | 125 | D |
| L1 | 6eanut/llm-wiki | 51 | D |
| L1 | BogdanovychA/llm-wiki | 25 | D |
| L1 | TrueHOOHA/LLM-Wiki | 22 | R-full（README 前 40 行 + OKF v0.1 声明） |
| L1 | SriSatyaLokesh/copilot-llm-wiki | 20 | D |
| L1 | DamonChen-anan/autodidact-skill | 13 | R-full（README 前 40 行，原文 built on Karpathy's LLM Wiki） |
| L1 | Huangmr0719/llm-wiki-starter | 1 | D |
| L1 | adev175/llm-wiki | 0 | D |
| L1 | mikolajkozlowskiii/claude-lift | 0 | D |
| L1 | Thenolypus/claude-code-cv-wiki | 0 | D |
| L1 | jlbgit/PersonalKnowledgeBaseCreator | 0 | D |
| L2 | AgriciDaniel/claude-obsidian | 16,756 | R-part（README；inbox/ + SHA-256 单事务 + journal 回滚 + wiki-lint） |
| L2 | Ar9av/obsidian-wiki | 3,816 | R-full（39 skill + pip CLI + web viewer 3114 + MCP） |
| L2 | kytmanov/obsidian-llm-wiki-local | 856 | D |
| L2 | GD4AI/obsidian-llm-wiki | 813 | D |
| L2 | NicholasSpisak/second-brain | 786 | D |
| L2 | jason-effi-lab/karpathy-llm-wiki-vault | 746 | D |
| L2 | ussumant/llm-wiki-compiler | 332 | D |
| L2 | IssacW228/student-llm-wiki | 182 | D |
| L2 | Oshayr/LLM-Wiki | 51 | D 未署名 |
| L2 | tonydzi/second-brain-starter-kit | 15 | D |
| L2 | daniel8824-del/claude-wiki-verbs | 4 | D |
| L2 | esxr/product-wiki | 1 | D |
| L3 | SamurAIGPT/llm-wiki-agent | 3,730 | D 未署名 |
| L3 | atomicstrata/llm-wiki-compiler | 2,277 | Pkg + D（Inspired by Karpathy's LLM Wiki pattern） |
| L3 | axoviq-ai/synthadoc | 2,002 | D 未署名 |
| L3 | nvk/llm-wiki | 1,570 | D 未署名 |
| L3 | kiwifs/kiwifs | 853 | D 未署名 |
| L3 | swarmclawai/swarmvault | 740 | D |
| L3 | xoai/sage-wiki | 662 | D 未署名 |
| L3 | zosmaai/pi-llm-wiki | 634 | D（原生 OKF v0.2） |
| L3 | Pratiyush/llm-wiki | 403 | D |
| L3 | crow-hq/llm-wiki-v2 | 325 | D 未署名（自述 99.5% 读取正确、1.6× 摄入、少 63% token） |
| L3 | Lyra-stellAI/BYO-LLM-WIKI | 276 | D 未署名 |
| L3 | mduongvandinh/llm-wiki | 221 | D |
| L3 | frankchu91/mindbase-llm-wiki | 140 | D |
| L3 | AyanbekDos/memoriki | 123 | D 未署名 |
| L3 | tonydzi/sqlite-graph-memory | 17 | D |
| L3 | etinpres/mindvault | 15 | D |
| L3 | mxmzb/autowiki | 5 | D |
| L3 | SauronHan/KnowledgeOS | 2 | D |
| L3 | buraksenyurt/rust-llm-wiki | 2 | D（已归档） |
| L3 | MinhMPA/llm-wiki | 1 | D |
| L4 | nashsu/llm_wiki | 21,887 | R-part（首 50 行 + 380–520 行 + Tech Stack 表；Tauri/Rust + LanceDB 可选向量 + MCP + 127.0.0.1:19828；目录含 purpose.md/schema.md/raw/wiki/{index,log,overview,entities,concepts,sources,queries,synthesis,comparisons}；GPLv3） |
| L4 | inkeep/open-knowledge | 4,906 | R-part（README 前 40 行；桌面+web+CLI+MCP） |
| L4 | lucasastorian/llmwiki | 1,794 | R-full（Next.js+Python API+MCP+Chrome 扩展；VaultFS：本地 SQLite/托管 Postgres+S3；llmwiki.app；Apache 2.0） |
| L4 | wannong/ruezz | 4 | D |
| L5 | PKU-DAIR/AutoSci | 1,742 | D（Karpathy's LLM-Wiki vision, fully realized） |
| L5 | yuezhiai/jonex | 1,750 | D（LLM Wiki-Driven） |
| L5 | agents-flex/agents-flex | 1,059 | D（LLM Wiki 列在特性清单） |

## 同名能力，未见源流证据（移出衍生排名）

| 项目 | Stars | 证据边界 |
|---|---|---|
| Tencent/WeKnora | 38,209 | README 全文 460 行，检索 `Karpathy\|LLM-Wiki\|llm-wiki` 零命中；无 raw/wiki 分层、schema、index.md/log.md 约定；自有 wiki 子系统：页面修订（v0.7.2）、wiki 图（v0.8.3）、摄取扩到 4 万文档（v0.5.2）、进度（v0.9.1）；Go，v0.9.1，MIT |
| TencentCloud/TencentDB-Agent-Memory | 31,175 | README 全文 592 行无 wiki 字样；分层记忆 L0 对话→L1 原子→L2 场景→L3 人格；LLM-Wiki 四类资产分类只在仓库描述字段 |
| agents-flex/agents-flex | 1,059 | 同上表；Java agent 框架特性清单含 LLM Wiki，未提 Karpathy |

## 排除项（topic 命中但形态不同）

- Egonex-AI/Understand-Anything 94,345：代码知识图谱，打 karpathy-llm-wiki topic，与 raw→wiki 编译无关。
- eugeniughelbur/obsidian-second-brain 5,459、ClaudioDrews/memory-os 1,399、nduckmink/arkon 1,529：agent 记忆/知识中枢。
- vouchdev/vouch 67、synpulse8-opensource/pulse8-ai-cortex-knowledge-vault 15、daniele-chiappa/gosidian 3、aswin-pn/Personal-wiki-using-Gemma-4 3：描述不提该模式、结构不对应。

## 已读文件与关键事实（本仓可复核）

- 本仓 `~/.agents/skills/karpathy-llm-wiki`：README 徽章链接指向 github.com/Astro-Han/karpathy-llm-wiki；LICENSE 为 Copyright (c) 2026 Yuhan Lei；scripts/check_evidence.py；references/ 四个模板。本仓特有规则：AGENTS.md 学习记录节允许更正 raw 已核实错误；tools/wiki-check/check_evidence.py 存在。
- Ar9av README 原文："The pattern comes from Andrej Karpathy's LLM Wiki gist"。
- lucasastorian README 原文："heavily inspired by Andrej Karpathy's LLM Wiki concept"。
- TrueHOOHA README：`wiki/` 树 conforms to Open Knowledge Format (OKF) v0.1，附 SPEC.md。
- autodidact README："An autonomous research agent built on Karpathy's LLM Wiki"。
- 向量检索直接证据仅 nashsu：README Tech Stack `optional vector (LanceDB)`；atomicstrata package.json 依赖无专用向量库；lucasastorian 为 SQLite index.db 全文 + 引用图。
- HN item 47640875：score 296、descendants 95、time 1775321865（2026-04-04）。
- 反例记录：Ar9av 与 lucasastorian 在 GitHub 描述中未署名、README 正文署名（读全文后修正）。
