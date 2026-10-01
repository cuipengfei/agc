# OMP find 工具的 cascade 架构：lexical 粗筛 + 三波 noul 判分

> Sources: 本会话源码直读（本机 @oh-my-pi/pi-coding-agent src/tools/jfind/* + @oh-my-pi/pi-ai src/judgment/typesafe.ts）, 2026-09-28; jevgrep README 与 docs/architecture.md 抓取（dzhng/jevgrep）, 2026-10-01
> Raw: [find-tool-cascade-source-forensics](../../raw/omp/2026-09-28-find-tool-cascade-source-forensics.md); [jevgrep-readme-and-architecture](../../raw/ai-coding-agents/2026-10-01-jevgrep-readme-and-architecture.md)
> Updated: 2026-10-01

## Overview

OMP 的 `find` 工具（语义 grep）实现在 `src/tools/jfind/`，编排类 `Cascade`（`cascade.ts:108`）。它先用确定性词法（native grep + idf 加权）粗筛候选，再分三波把候选交给 judge 判分，逐波增补信息、逐波筛掉弱者，最后吐出排序命中 + 行号区间。判分统一走注入的通用 `Judge` 接口——`judge.judge(request, {signal})`（`cascade.ts:141`），题型恒为 `NoulQuestion`。三波的编排全在客户端；请求 body 里没有 `wave` 字段。实际路由到哪个后端（TypeSafe/Jev 还是 LLM 回退）由 `resolveJudge` 上游决定，本文不断言具体后端。

## 固定四阶段，不按工作类型动态选择

`cascade.ts:1-14` 文件头 docstring 写死了流程：(1) lexical scan 排序 → (2) 文件名判分 → (3) passage 草图判分 → (4) 完整文本验证。`run()`（`cascade.ts:173`）是一条线性代码路径，无按查询类型分派的分支。无论搜什么都走这同一套。会变的只是每阶段发几个批次（取决于候选/段落数量）；某阶段无幸存 job 时那一波实际不发请求，但代码路径不变。`#dispatch`（`cascade.ts:161`）每阶段并发上限 `PARALLEL=16`，drain 完才进下一阶段。

关键常量（`cascade.ts:27-58`）：`CANDIDATES=128`（进文件名判分的候选）、`FILES=20`（读内容的文件）、`WINDOWS=24`（每文件保留窗口）、`WINDOW_BYTES=8192`、`SKETCH_BYTES=384`、`FULL_LIMIT=40`、`NAME_BATCH=64`、`CUTOFF=0.45`、`THRESHOLD=0.2`、`SCAN_TIMEOUT_MS=30000`。

## 第 0 步：lexical 粗筛（不调 judge）

关键词派生 `deriveKeywords(query, extraKeywords)`（`cascade.ts:175`）：引号短语整条保留，其余按非字母数字切词，扔掉 <3 字节、虚词、纯数字，做轻量词根还原（后缀 `ing/ed/es/s` 且剩余 ≥4 字符，spawned→spawn）去重；调用方 `grep_keywords` 规范化后并入。

`grepIndex`（`lexical.ts:39`）把关键词拼成 `kw1|kw2` 正则跑 **native grep**（忽略大小写、认 gitignore、`mode:Content`），**只扫文件内容**计命中次数（`lexical.ts:48-70`）。排名分 `fileScore`（`lexical.ts:98`）：`weights[k] * (2*inPath + log1p(counts[k]))`（`:108`）——**排名时才把关键词出现在路径里计入**（值两个额外 log 单位），命中次数取 `log1p`；`idf` 稀有词权重 clamp 到 `[0.5,6]`（`:87-88`）。按分降序取前 `CANDIDATES=128`。

**这一层不保证穷尽**：native grep 带 `timeoutMs`（`lexical.ts:57`），超大文件被单独跳过并计入 `skippedOversized`（`:72`）。find 的召回上限就卡在这一步。

## Wave 1：文件名判分

候选按 `NAME_BATCH=64` 切批（`cascade.ts:197-207`）。请求 `state` 键集合（`questions.ts` nameBatch）：`criteria{file,folder}` + `format` + `project` + `search` + `task` + `tree`；`project = path.basename(root.path)`（`cascade.ts:196`）；题键 `e000/e001`。评分员只看**文件名 + 树位置**，还没打开文件。

选读规则（`cascade.ts:225-232`）：`ranked.slice(0, min(FILES,2))` 即 **2 个 lexical 最强无条件读**；其余按 `nameScore` 降序（同分再比 lex）补足到 `FILES=20`。

## Wave 2：草图路由

选中文件读入后按 `WINDOW_BYTES=8192` 切窗，`selectWindows` 取前 `WINDOWS=24`（全窗口分为 0 时沿全文均匀抽）。`sketch()` 压出 `SKETCH_BYTES=384` 的草图，选行给含 `(` 的行加分。请求 `state`：`criteria`(SKETCH) + `files`(f0/f1→rel) + `passages`(p00→[fileKey,sketch]) + `search`；题键 `p00/p01`。

判分失败不作负判——`score: score ?? 1`（`cascade.ts:275`）把失败当 1 放行。排序后 `filter(score >= CUTOFF).slice(0, FULL_LIMIT)`（`cascade.ts:285`）：**`≥0.45` 且最多留 40 段**。

## Wave 3：完整验证

幸存 passage 按文件分组，每文件按 `VERIFY_STATE_BYTES/WINDOW_BYTES` 切批。请求 `state`：`criteria`(PASSAGE) + `file`(单文件 rel) + `passages`(p00→`plainContent(passage)`) + `search`——传的是**切出来那段的完整原文**，不是整份文件。

每 passage：`entry.score = max(entry.score, score)`（`cascade.ts:323`）；heat 用 passage 自带行号 `{start: passage.start, end: passage.end, p: score}`（`cascade.ts:324-329`）。**行号来自 passage 本身，模型只给概率**。

## 波间信息流

评分员每题只回一个 0–1 的 noul 概率，别无其他。**上一波的分数只用来挑下一波读哪些输入，不作为分数写进下一次请求**：Wave1 分数选出读哪 20 个文件；Wave2 分数选出验证哪 ≤40 段；Wave3 分数决定上榜与总分。

## 折算成结果

每文件 `contentScore = max(passage 分)`，`< THRESHOLD(0.2)` 跳过（`cascade.ts:341`），`FindHit` 带 `ranges = mergeHeat(entry.heat, THRESHOLD)`，按 contentScore 降序（`:353`）。统计行的 `requests/apiMs/tokens/cost` 在 `#ask` 累加（`cascade.ts:142-146`，`usage.input/output/cost.total`），`listed = entries.length`、`judged` 为 Wave1 noul 数、`filesRead` 递增。

## find vs grep/glob 的适用性（机制推断，未做基准）

未跑性能对照，以下按机制给适用性判断：

- **知道确切字符串/符号/正则** → 主 agent 直接 grep 通常更省：精确、即时、可复现、无阈值误杀。find 的语义层在这类任务上多延迟、有成本，`≥0.20` 卡线可能筛掉边界命中。
- **说不清确切名字、要探索、要短名单、要省主上下文** → find 通常更划算：关键词派生 + 多词 grep + 语义排序，只把蒸馏命中吐回，不把原始输出灌进主 agent 上下文。
- **共同边界**：两者都不给穷尽保证。grep 看 pattern 写得全不全；find 的召回卡在第 0 步 lexical（前 128 候选、grep 超时、跳超大文件），真命中若关键词一个都不沾或排到 129 名，find 照样漏。需要穷尽（安全审计、全量重命名）时谁都不能只靠一次调用。

find 的语义威力在**排序和过滤**，不在扩大初筛召回。

## 与 jevgrep 的入口机制对照（2026-10-01）

jevgrep（dzhng/jevgrep，独立 CLI）与 find 同属「Jev 判断 + 漏斗筛选」思路，候选产生机制不同：jevgrep 无 lexical 阶段，架构文档原文 "Hierarchical traversal uses directory metadata and content previews to decide where to explore. It does not upload the entire tree first."，靠目录级语义判断从根向下遍历，受 navigation byte budget 约束；且 "Keep files that pass relevance criteria without a fixed top-N limit."，与 find 的 CANDIDATES/FILES/FULL_LIMIT 硬名额立场相反。盲区互补：find 漏关键词不沾边的文件（召回卡在第 0 步），jevgrep 漏父目录被判负的子树（"A healthy negative file preview does not trigger an exhaustive scan of unseen source."）。jevgrep 另有声明级解析（tree-sitter 支持 Python/Go/Rust、TS compiler 支持 TS/JS）与本地答案缓存；find 的 judge 后端可回退 LLM 链，jevgrep 恒走 Jev（"Provider selection changes transport and authentication, not retrieval semantics."）。

## 证据边界

- 本次 find 实际 judge 后端、model 名、各波中间 noul 值——未捕获。
- Jev 是否有状态——无源码证据，不作断言。
- find vs grep 为机制推断，非性能实测。
- jevgrep 侧结论来自其 README 与架构文档，未本机安装运行、未逐行核对 retrieve.ts 源码。

## See Also

- [OMP judgment /v1/systemone 协议面](judgment-systemone-protocol.md)
- [OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界](judgment-provider-and-eval-judge.md)
