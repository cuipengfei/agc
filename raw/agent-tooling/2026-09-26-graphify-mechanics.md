# graphifyy 工作机制（CLI / skill / MCP 三层、语料类型、提取分支、update 触发、watch、install 平台、skills.sh 兼容性）

> Source: ~/.claude/skills/graphify/SKILL.md + references/*.md（graphifyy 0.9.x）；本地 graphify-out/ 实测产物
> Collected: 2026-09-26
> Published: Unknown

## 来源与读取范围

- `~/.claude/skills/graphify/SKILL.md`（主 skill 定义，719 行）
  - L45-47：语料类型描述（code/docs/papers/images/video）
  - L53：Fast path（graph.json 已存在时的行为）
  - L157-215：Step 3 两段式提取（Part A + Part B）
  - L163：code-only corpus 定义与 Part B 跳过条件
  - L168-170：Semantic LLM 后端选择与 API key 规则
  - L204：Part B fast path（code-only 写空 semantic 文件）
  - L701-703：`/graphify add` 与 `--watch` 的引用点
- `~/.claude/skills/graphify/references/extraction-spec.md`
  - L3：Part B 触发条件（"pure-code corpus skips Part B"）
  - L13-15：EXTRACTED / INFERRED / AMBIGUOUS 语义定义
  - L19：rationale 作为 concept 节点属性，`file_type:"rationale"`
  - L47-58：confidence_score 离散取值规则
  - L64：edge schema（source/target/relation/confidence/confidence_score/...）
- `~/.claude/skills/graphify/references/update.md`
  - L64：code-only 变更 → 跳过 Part B
  - L66：非 code-only 变更 → 视频先转写、跑完整 Steps 3A-3C
  - L206：`--cluster-only` 只重聚类，不重跑 Steps 5-9
- `~/.claude/skills/graphify/references/add-watch.md`
  - L29-35：`/graphify add` 支持的 URL 类型
  - L41-55：`--watch` 行为
- 本地 `graphify-out/` 实测产物（`graph.json`、`GRAPH_REPORT.md`、`manifest.json`）
- skills.sh 官方目录条目：`https://skills.sh/Graphify-Labs/graphify/graphify`
- 上游 GitHub：`https://github.com/graphify-labs/graphify`

## 定位

graphifyy（Python 包名 `graphifyy`，CLI 名 `graphify`）把任意目录 → 知识图谱，输出 `graphify-out/graph.json`、`graph.html`、`GRAPH_REPORT.md`、`manifest.json`。

三种调用方式：

| 方式 | 载体 | 用途 |
|------|------|------|
| CLI | `graphify <cmd>` | 终端手动运行 |
| Skill | SKILL.md | agent 读取后按步骤执行 bash 块 |
| MCP | `graphify-mcp` | 宿主 MCP 协议调用 |

MCP 也依赖 `graphify-out/graph.json`（需先构建），不提供实时查询能力。

## 语料支持类型

`SKILL.md:47`："Drop any folder of code, docs, papers, images, or video into graphify"。

`references/update.md:66` 补充 video/audio 先通过 `references/transcribe.md` 转录成文本再作为 doc 处理。

`graphify detect` 扫描目录，按类型分类（决定哪些受支持文件进入语料）：

- code：受 tree-sitter 支持的编程语言源文件
- document：Markdown、reStructuredText 等文本
- paper：论文（PDF、TeX 等）
- image：图片
- video / audio：音视频（先转录）

## 提取路径：Part A vs Part B

`SKILL.md:161`："This step has two parts: **structural extraction** (deterministic, free) and **semantic extraction** (LLM, costs tokens)."

- **Part A**（AST 结构性提取，确定性、免费）：tree-sitter 解析 code 文件，产出 imports / calls / method / contains 等明确关系。
- **Part B**（Semantic 提取，LLM 语义化）：处理 docs、papers、images。目标：概念、实体、引用、rationale、跨文件语义相似性。

**Part B 触发条件**（`references/extraction-spec.md:3` 与 `SKILL.md:204`）：
- 只有 code 文件的语料（"pure-code corpus"）→ **跳过 Part B**，写空 `.graphify_semantic.json` 供 Part C 合并
- 含 docs / papers / images 任一类 → Part A 和 Part B 并行（`SKILL.md:172`）

**Semantic LLM 后端选择**（`SKILL.md:168-170`）：
- `GEMINI_API_KEY` 或 `GOOGLE_API_KEY` 已设置 → 走 `graphify.llm.extract_corpus_parallel(files, backend="gemini")`（默认模型 `gemini-3-flash-preview`，可用 `GRAPHIFY_GEMINI_MODEL` 覆盖）
- 未设置 → host agent 本身就是 LLM；宿主支持 subagent 派发（如 Claude Code）就按 Part B 流程分块派发 subagent；宿主不支持 subagent（如终端直接跑 CLI）→ code-only corpus 无 semantic 工作，直接写空 semantic 文件；含 docs/papers/images 时要么配 Gemini key 要么 inline 提取；永远不询问 `ANTHROPIC_API_KEY`

**API key 读取规则**（`SKILL.md:163`、`SKILL.md:170`）：graphify **只读** `GEMINI_API_KEY` / `GOOGLE_API_KEY`，**不读** `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` 或其他 provider key。

## Code-only corpus 定义

`SKILL.md:163` 原文：

> a code-only corpus (the common `/graphify .` on a repo) skips semantic extraction entirely

code-only corpus 指语料中**只含 code 文件**（`graphify detect` 分类后 doc/paper/image/video 都是空）。这既不是自动判断的默认分支，也不是"不需要 LLM 的语料"，就是文件类型的严格定义。

含任意 doc/paper/image 的语料就是**混合语料**，走完整 Part A + Part B。

## update 触发机制

**默认不自动**：修改文件后必须手动 `graphify update <path>`。

`references/update.md:64`：code-only 变更 → 跳过 Part B（无 LLM）。
`references/update.md:66`：含 video 变更 → 先跑 `transcribe.md`，把转录结果从 `files['video']` 移到 `files['document']`。

`--cluster-only`（`references/update.md:206`）：跳过 Steps 1-3，只重聚类、命名社区、重新生成报告；不重跑 Steps 5-9，因为它们的中间文件（`.graphify_extract.json`、`.graphify_detect.json`、`.graphify_analysis.json`）已被 Step 9 清理，重跑会 `FileNotFoundError`。

**可选 `--watch` 模式**（`references/add-watch.md:41-55`）：

```
python -m graphify.watch <root> --debounce 3
```

- 代码文件变更（.py / .ts / .go 等）：立即重跑 AST + rebuild + cluster，`graph.json` 与 `GRAPH_REPORT.md` 自动更新，不用 LLM。
- 文档/论文/图片变更：只写 `graphify-out/needs_update` flag + 打印提示，需要手动 `/graphify --update` 触发 LLM semantic 重提取。
- `--debounce` 默认 3s，等文件活动停止才触发，避免 agent 批量写入每文件都触发重建。
- Ctrl+C 停止。

用途：agent 工作流把 `--watch` 放后台，agent 波间自动同步代码变更；docs/notes 变更仍需手动 `/graphify --update`。

## /graphify add

`references/add-watch.md:29-35` 支持的 URL 类型：

| URL 类型 | 处理方式 |
|---------|---------|
| YouTube / 任意视频 | yt-dlp 下载音频 → 下次跑时转录成 .txt（需 `pip install 'graphifyy[video]'`）|
| Twitter/X | oEmbed 抓 → 存 .md（含 tweet 文本 + 作者）|
| arXiv | 抓摘要 + 元数据 → 存 .md |
| PDF | 下载 .pdf |
| Images (.png/.jpg/.webp) | 下载，下次跑时 Claude vision 提取 |
| 任意网页 | html2text 转 markdown |

抓完保存到 `./raw/`，然后自动跑 `--update` 合并入图谱。

## Edge schema

`references/extraction-spec.md:64` 定义了 edge 的 schema 字段：

- `source` / `target`：node id
- `relation`：关系类型（`calls` / `implements` / `references` / `cites` / `conceptually_related_to` / `shares_data_with` / `semantically_similar_to` / `rationale_for` 等）
- `confidence`：字符串三值 `EXTRACTED` / `INFERRED` / `AMBIGUOUS`
- `confidence_score`：数值（EXTRACTED 恒 1.0；INFERRED 从 {0.95, 0.85, 0.75, 0.65, 0.55} 取值；AMBIGUOUS 0.1-0.3）
- `source_file`：源文件路径
- `source_location`：位置信息
- `weight`：权重

**边置信度定义**（`references/extraction-spec.md:13-15`）：
- EXTRACTED：relationship explicit in source（import、call、citation、"see §3.2"）
- INFERRED：reasonable inference（shared data structure、implied dependency）
- AMBIGUOUS：uncertain，标记待审，不省略

**`confidence_score` 取值规则**（`references/extraction-spec.md:47-58`）：
- EXTRACTED：1.0
- INFERRED 五档：0.95 direct structural evidence / 0.85 strong inference / 0.75 reasonable inference / 0.65 weak inference / 0.55 speculative but plausible
- AMBIGUOUS：0.1-0.3
- 生产分布是双峰（>50% at 0.5，>40% at 0.85+），因此用离散取值指导

**`file_type` 合法值**（`references/extraction-spec.md:19`）：`code` / `document` / `paper` / `image` / `rationale` / `concept`，其他值被拒。

## Node ID 格式

`references/extraction-spec.md:61`：小写，只 `[a-z0-9_]`，无点无斜杠。格式 `{stem}_{entity}`，stem 是完整 repo-relative 路径去扩展名、每段 `_` 连接并转小写、非字母数字替换 `_`。保留所有目录层级，同名文件在不同目录仍不同。

示例：`src/auth/session.py` + `ValidateToken` → `src_auth_session_validatetoken`；`lib/utils/helpers.py` + `parse_url` → `lib_utils_helpers_parse_url`。

## 本次实测统计（agc 仓库）

| 项 | 值 |
|----|----|
| 节点 | 3,309 |
| 边 | 3,644 |
| 社区 | 289（262 shown + 27 thin omitted） |
| 文件 | 334（~162,578 词） |
| 未分类 | 9（.jsonc 3 / .archived 2 / 无扩展名 3） |
| 节点类型 | document 3061 / code 216 / concept 23 / rationale 9 |
| 边置信度 | EXTRACTED 3611 / INFERRED 33 / AMBIGUOUS 0 |
| 提取比例 | 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS |
| INFERRED 平均置信 | 0.94 |
| Token cost | 0 input · 0 output |

God Nodes Top 5：Wiki Log (129) / Knowledge Base Index (35) / OMP 内置 Lifecycle Slash 命令 (26) / Entry (24) / Claude Code 与 Codex CLI 入列 (23)。

INFERRED 边分布（33 条）：references 23 / uses 8 / indirect_call 2；来源 AGENTS.md 12 / toolchain-reference.md 3 / 其余各 1-2。

## install --platform 支持平台

`graphify install --platform <name>` 支持的宿主：claude / codex / opencode / agents / pi（不含 omp）。

OMP 没有原生 install 目标；OMP 通过 `enableAgentsUser=true` 与 `enableAgentsProject=true`（默认）自动扫描 `~/.agents/skills/` 和 `~/.pi/agent/skills/` 目录，发现 skill 后即注册。

## skills.sh 兼容性

skills.sh 官方目录有条目：`https://skills.sh/Graphify-Labs/graphify/graphify`。

但 `npx skills add https://github.com/graphify-labs/graphify --skill graphify` 失败：仓库实际结构是 `graphify/skill.md`（子目录 + 小写），`skills` CLI 期望根目录大写 `SKILL.md`。

**结论**：`graphify install --platform` 是官方支持路径；`skills` CLI 当前不兼容该仓库结构。

## 版本

- graphifyy：0.9.x（`~/.claude/skills/graphify/.graphify_version` 记录当前 skill 版本）
- 主仓库：VetonyDev/graphifyy（skills.sh 指向 graphify-labs/graphify，两个仓库并存）
