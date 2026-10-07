# graphifyy 工作机制

> Sources: graphifyy skill (SKILL.md + references/, 0.9.x), 2026-09-26; 本地 graphify-out/ 实测产物, 2026-09-26; graphify 0.9.79 CLI 全命令清单实测, 2026-10-07
> Raw: [graphifyy 工作机制一手摘录](../../raw/agent-tooling/2026-09-26-graphify-mechanics.md); [graphify 0.9.79 全命令清单试用记录](../../raw/agent-tooling/2026-10-07-graphify-079-inventory-trial.md)
> Updated: 2026-10-07

## Overview

graphifyy（包名 `graphifyy`，CLI 名 `graphify`）把任意目录 → 知识图谱。产物：`graphify-out/graph.json`、`graph.html`、`GRAPH_REPORT.md`、`manifest.json`。三种调用：CLI、agent Skill、MCP 服务器。定位是**持久、增量、有审计线**的图谱工具，不是实时查询索引——先构建，再查询。

## 语料类型

`graphify detect` 按类型分类目录里受支持的文件：

- **code** — tree-sitter 支持的语言源文件
- **document** — Markdown、reStructuredText 等文本
- **paper** — PDF、TeX 等论文
- **image** — 图片
- **video / audio** — 先转录成文本再作为 document 处理

分类结果决定后续走哪些提取步骤。含任意 doc/paper/image/video 的语料是**混合语料**；只有 code 文件的语料是 **code-only corpus**。

## 两段式提取

`SKILL.md:161`："structural extraction (deterministic, free) and semantic extraction (LLM, costs tokens)"。

- **Part A**（AST 结构性提取）：tree-sitter 解析 code，产出 imports / calls / method / contains 等明确关系。确定性、免费、无 LLM。
- **Part B**（Semantic 提取）：处理 docs / papers / images，产出概念、实体、引用、rationale、跨文件语义相似性。

**Part B 触发条件**（`extraction-spec.md:3`、`SKILL.md:204`）：
- 纯 code 语料 → 跳过 Part B，写空 `.graphify_semantic.json` 供合并阶段读入
- 含 docs/papers/images 任一类 → Part A 与 Part B 并行（`SKILL, 172`）

**Semantic 后端选择**（`SKILL.md:168-170`）：
- `GEMINI_API_KEY` 或 `GOOGLE_API_KEY` 已设置 → 走 `graphify.llm.extract_corpus_parallel`，默认模型 `gemini-3-flash-preview`，`GRAPHIFY_GEMINI_MODEL` 可覆盖
- 未设置 → host agent 本身是 LLM；宿主支持 subagent 派发就按 Part B 流程分块派发；不支持（如终端跑 CLI）时纯 code 语料写空 semantic 文件，含文档语料要么配 Gemini key 要么 inline 提取
- 只读 `GEMINI_API_KEY` / `GOOGLE_API_KEY`，**不读** `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` 或其他 provider key

## Code-only corpus

`SKILL.md:163` 定义："a code-only corpus (the common `/graphify .` on a repo) skips semantic extraction entirely"。

code-only corpus 就是**只含 code 文件**的语料（`detect` 分类后 doc/paper/image/video 都是空）。含任意 doc/paper/image 就是混合语料，走完整 Part A + Part B。这个"code-only"是文件构成条件，不是提取路径选择器——不是"不需要 LLM 的语料"。

## update 触发机制

**默认不自动**：改文件后必须手动 `graphify update <path>`。

`references/update.md:64-66`：
- 只有 code 变更 → 跳过 Part B（无 LLM）
- 含 video 变更 → 先跑 `transcribe.md`，把转录结果从 `files['video']` 移到 `files['document']`

`--cluster-only`（`references/update.md:206`）：跳过 Steps 1-3，只重聚类、命名社区、重新生成报告。不重跑 Steps 5-9，因为它们的中间文件（`.graphify_extract.json`、`.graphify_detect.json`、`.graphify_analysis.json`）已被 Step 9 清理，重跑会 `FileNotFoundError`。

**`--watch` 可选后台监听**（`references/add-watch.md:41-55`）：

```
python -m graphify.watch <root> --debounce 3
```

- 代码文件变更（.py / .ts / .go 等）→ 立即重跑 AST + rebuild + cluster，`graph.json` 和 `GRAPH_REPORT.md` 自动更新
- 文档/论文/图片变更 → 只写 `graphify-out/needs_update` flag + 打印提示，需要手动 `/graphify --update` 触发 LLM semantic 重提取
- `--debounce` 默认 3s，等文件活动停止才触发，避免 agent 批量写入每文件都触发重建

用途：agent 工作流把 `--watch` 放后台，agent 波间自动同步代码变更；docs/notes 变更仍需手动。

## /graphify add

抓 URL 入语料（`references/add-watch.md:29-35`），保存到 `./raw/`，然后自动跑 `--update` 合并入图谱。支持：

- YouTube / 任意视频 URL → yt-dlp 下载音频，下次跑时转录（需 `pip install 'graphifyy[video]'`）
- Twitter/X → oEmbed 抓 → 存 .md
- arXiv → 摘要 + 元数据 → 存 .md
- PDF → 下载 .pdf
- 图片 → 下载，下次跑时 Claude vision 提取
- 任意网页 → html2text 转 markdown

## Edge schema

`references/extraction-spec.md:64` 定义 edge 字段：`source` / `target` / `relation` / `confidence` / `confidence_score` / `source_file` / `source_location` / `weight`。

**Edge 置信度**（`extraction-spec.md:13-15`）：

- **EXTRACTED**：relationship explicit in source（import、call、citation、"see §3.2"）
- **INFERRED**：reasonable inference（shared data structure、implied dependency）
- **AMBIGUOUS**：uncertain，标记待审

**`confidence_score` 取值**（`extraction-spec.md:47-58`）：

- EXTRACTED：恒 1.0
- INFERRED 五档离散取值：0.95 direct structural evidence / 0.85 strong inference / 0.75 reasonable inference / 0.65 weak inference / 0.55 speculative but plausible
- AMBIGUOUS：0.1-0.3

**`file_type` 合法值**：`code` / `document` / `paper` / `image` / `rationale` / `concept`（其他值被拒）。

## Node ID 格式

`extraction-spec.md:61`：小写，只 `[a-z0-9_]`。格式 `{stem}_{entity}`，stem 是完整 repo-relative 路径去扩展名、每段 `_` 连接并转小写、非字母数字替换 `_`。保留所有目录层级，同名文件在不同目录仍不同。

例：`src/auth/session.py` + `ValidateToken` → `src_auth_session_validatetoken`。

## install --platform

`graphify install --platform <name>` 支持的宿主：claude / codex / opencode / agents / pi（**不含 omp**）。

OMP 没有原生 install 目标，通过 `enableAgentsUser=true` 与 `enableAgentsProject=true`（默认值）自动扫描 `~/.agents/skills/` 和 `~/.pi/agent/skills/` 目录，发现 skill 后即注册。

## skills.sh 兼容性

skills.sh 目录有条目 `https://skills.sh/Graphify-Labs/graphify/graphify`，但 `npx skills add https://github.com/graphify-labs/graphify --skill graphify` 失败：仓库实际结构是 `graphify/skill.md`（子目录 + 小写），`skills` CLI 期望根目录大写 `SKILL.md`。

`graphify install --platform` 是官方支持路径。

## 本次实测（agc 仓库）

- 节点 3,309 / 边 3,644 / 社区 289（262 shown + 27 thin omitted）
- 文件 334（~162,578 词）；未分类 9（.jsonc 3 / .archived 2 / 无扩展名 3）
- 节点类型：document 3061 / code 216 / concept 23 / rationale 9
- 边置信度：EXTRACTED 3611 / INFERRED 33 / AMBIGUOUS 0
- 提取比例：99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS
- INFERRED 平均置信 0.94
- Token cost：0 input / 0 output

God Nodes Top 5：Wiki Log (129) / Knowledge Base Index (35) / OMP 内置 Lifecycle Slash 命令 (26) / Entry (24) / Claude Code 与 Codex CLI 入列 (23)。

INFERRED 边 33 条分布：references 23 / uses 8 / indirect_call 2；来源 AGENTS.md 12 / toolchain-reference.md 3 / 其余各 1-2。

## 2026-10-07 全命令清单实测（skill 0.9.69 → 包 0.9.79）

先记一个操作副作用：**实测 `--version` 与 `--help` 两条命令触发用户级 skill 自动刷新**（Claude、OpenCode、Agents 三处，各留 SKILL.md.bak）；`detect` 只给版本不一致警告、无刷新输出；是否所有命令都触发未验证。不想被刷就设 `GRAPHIFY_NO_AUTO_REFRESH=1`。

`graphify update .` 重建 agc 仓库：4,620 节点 / 5,079 边 / 397 社区（2026-09-26 为 3,309 / 3,644 / 289），11 个 code 文件无符号产出，旧产物自动备份到 graphify-out/ 下的日期目录。全命令清单逐项实测结果：

- **查询类全部可用**：path（有向；`--undirected` 可忽略方向）、explain（节点档案：来源行、社区、度数、逐条关系）、affected（反向影响，深度 2）、query（自然语言词面匹配定起点，BFS 扩两轮；问 "redaction" 命中脱敏主题带出 12 节点）、god-nodes list（Wiki Log 174 边居首）、tree emit（交互 HTML 树）。
- **体检/度量**：diagnose multigraph 报无重复边、无悬空端点、3 条自指边；benchmark 估算查图谱相对读全文的 token 压缩比（仅沙箱 3 节点图测得 5.3 倍，不代表真实仓库）。
- **合并与协作**：merge-graphs 把小图并大图成 4,623 节点跨仓库图，秒级；merge-driver 仅在相同输入上验证通过（退出码 0），不同分支合并行为未验证；clone 拉公开仓库进 ~/.graphify/repos。
- **导出实测七种、全部离线可用**：svg、wiki（每社区一篇文章）、graphml、obsidian 画布、callflow-html、neo4j / falkordb（生成 cypher 脚本，无需真实连接）；export html 未单独运行（graph.html 由构建直接产出）。
- **记忆与全局**：save-result 存问答结论（`--question` + `--answer` + `--outcome`，不带 save 子命令）、reflect 聚合成 LESSONS.md、global add/list/remove 管理跨项目全局图（按图文件加、按仓库名删；已复原为空）、provider 管理语义后端。
- **平台安装**：aider install/uninstall 在沙箱成对验证（写/删 AGENTS.md 段）；pi、copilot install 在假 HOME 下静默无操作，成功路径未验证；hook status 在非 git 目录如实报错。通用 uninstall、hook install/uninstall、其余十余平台 install/uninstall 未试（写真实用户级配置）。
- **受阻的六条环境边界**：
  - `add` 抓 URL：防内网守卫拦截 198.18.x 伪 IP——所试 example.com 与 raw.githubusercontent.com 均被拦（本机 Clash TUN 伪 IP 环境）；是否所有域名均失效未验证。
  - `watch`：缺 watchdog 组件（提示 pip install watchdog）。
  - `extract` / `label`：缺 openai Python 包（语义后端），label 退回 Community N 占位命名。
  - `prs`：需要 gh CLI 已登录。
  - `update --force` 的少节点防护未触发（删空沙箱代码后普通 update 直接重建空图），防护条件未验证。
  - `benchmark` 的 token 压缩比仅在 3 节点沙箱图测过一次。

## See Also

- [Headroom 0.39 配置与兼容性](headroom-039-config-and-compat.md) — 同 topic 下 agent-tooling 层工具
- [codegraph 与 graphify 的分工边界](codegraph-vs-graphify.md) — 符号级索引与混合语料地图的对照
