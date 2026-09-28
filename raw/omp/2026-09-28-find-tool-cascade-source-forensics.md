# find/jfind 四阶段 cascade 架构（源码取证摘录）

> Source: 本机源码直读 @oh-my-pi/pi-coding-agent（src/tools/jfind/*）+ @oh-my-pi/pi-ai（src/judgment/typesafe.ts）
> Collected: 2026-09-28
> Published: Unknown（源码，无发布日期）

本文件是 OMP `find` 工具内部机制的源码取证摘录，脱敏，只保留承重事实与 `文件:行号` 锚点。不含真实凭据、不含会话 transcript。

## 调用接口与后端边界

- `find` 工具实现在 `src/tools/jfind/` 模块，编排类 `Cascade`（`cascade.ts:108`），入口 `runCascade`（`cascade.ts:359`）。
- 判分统一走注入的通用 `Judge` 接口：`#ask` 里 `const result = await judge.judge(request, { signal })`（`cascade.ts:141`）。`Judge` 类型 import 自 `@oh-my-pi/pi-ai`（`cascade.ts:16`）。
- 三种请求类型定义在 `questions.ts`，题型恒为 `NoulQuestion`（import 自 `@oh-my-pi/pi-ai`，`cascade.ts:16`）。
- **请求 body 无 `wave` 字段**：波次是客户端 `run()` 的线性代码顺序，不写进任何请求。
- **实际后端未验证**：`judge.judge()` 路由到 TypeSafe(Jev) 还是 LLM 回退，由 `resolveJudge` 上游决定，本文件不涉及该判定；本会话未捕获实际后端、model 名与中间 noul 值。Jev 是否有状态亦未验证。

## 固定四阶段（硬编码，非按工作类型动态）

`cascade.ts:1-14` 文件头 docstring 逐字：

```
1. Lexical scan ranks every eligible file by query keywords.
2. Filename ranking judges the top candidates by name and place in the tree.
3. Passage scoring reads the strongest files, cuts them into byte-bounded
   windows, and judges a budgeted verbatim sketch of each window.
4. Verification judges the complete text of the sketches that survived.
… the critical path is three dependent waves.
```

`run()`（`cascade.ts:173`）是一条线性路径：lexical 粗筛 → Wave1 nameBatch → 读文件切窗 → Wave2 sketchBatch → CUTOFF 筛 → Wave3 passageBatch → 上榜。无按查询类型分派的分支。

`#dispatch`（`cascade.ts:161`）每阶段并发上限 `PARALLEL` 个请求，drain 完才进下一阶段。

## 常量（`cascade.ts:27-58`，逐值）

| 常量 | 值 | 含义 |
|---|---|---|
| PARALLEL | 16 | 每阶段在飞请求数 |
| NAME_BATCH | 64 | 每个文件名判分请求装几个文件 |
| CANDIDATES | 128 | lexical 排名后进入文件名判分的候选数 |
| FILES | 20 | 真正读内容并切片的文件数 |
| WINDOWS | 24 | 每个读入文件保留的窗口数 |
| WINDOW_BYTES | 8192 | 每个窗口字节上限（含标签） |
| SKETCH_BYTES | 384 | 每张草图卡字节数 |
| FULL_LIMIT | 40 | 跨所有文件验证的完整 passage 上限 |
| CUTOFF | 0.45 | 草图概率低于此不进验证 |
| THRESHOLD | 0.2 | 验证概率达到此文件即命中 |
| READ_LIMIT | 4 * 1024 * 1024 | 单文件读入窗口化的字节上限 |
| SKETCH_STATE_BYTES | 18000 | 每请求草图 state 预算 |
| SKETCH_CARDS_MAX | 48 | 每请求草图卡硬上限 |
| VERIFY_STATE_BYTES | 24 * 1024 | 每验证请求 passage state 预算（含标签） |
| SCAN_TIMEOUT_MS | 30000 | native lexical 扫描墙钟预算 |
| FAILURES_KEPT | 5 | 报告保留的不同失败消息数 |

## 第 0 步 lexical 粗筛（`lexical.ts` + `keywords.ts`，不调 judge）

- 关键词派生 `deriveKeywords(query, extraKeywords)`（`cascade.ts:175`，`keywords.ts`）：引号短语整条保留 → 其余按非字母数字切词 → 扔掉 <3 字节、虚词、纯数字 → 轻量词根还原（后缀 `ing/ed/es/s` 且剩余 ≥4 字符，如 spawned→spawn）→ 去重。调用方 `grep_keywords`（`extraKeywords`）规范化后并入。
- `grepIndex`（`lexical.ts:39`）跑 native grep：`pattern = keywords.map(escapeRegex).join("|")`（`:49`）、`ignoreCase:true`（`:51`）、`gitignore:true`（`:53`）、`mode: Content`（`:54`）、带 `timeoutMs`（`:57`）。**只扫文件内容**计每词命中次数（`:58-70`）。
- `index.filesScanned = result.filesSearched + (result.skippedOversized ?? 0)`（`:72`）——**超大文件被单独跳过并单独计数**。grep 自身带超时（`SCAN_TIMEOUT_MS=30000`），因此 lexical 层不保证穷尽。
- `idf`（`lexical.ts:81`）：`weight = log((filesScanned+1)/(df+1))`，clamp 到 `[0.5, 6]`（`:87-88`）。
- `fileScore`（`lexical.ts:98`）：`score += weights[k] * (2*inPath + log1p(counts[k]))`（`:108`）——路径命中（inPath）值两个额外 log 单位；命中次数取 `log1p`。
- `ranked`：按 `lex` 降序、同分按 rel 比较，取前 `CANDIDATES=128`（`cascade.ts:186-192`）。

## Wave 1 nameBatch（文件名判分）

- `project = path.basename(root.path)`（`cascade.ts:196`）——非 listFiles 输出。
- 候选按 `NAME_BATCH=64` 切批（`cascade.ts:197-207`），每批一个 `nameBatch(project, query, entries)` 请求。
- `state` 键集合（`questions.ts` nameBatch）：`criteria{file,folder}` + `format` + `project` + `search` + `task` + `tree`。题键 `e000/e001`（`entryKey` 补 3 位）。
- 回填 `nameScore[node] = noul(outcome, entryKey(k))`（`cascade.ts:214-215`）。
- **选读规则**（`cascade.ts:225-232`）：`selected = ranked.slice(0, min(FILES,2))`——2 个 lexical 最强**无条件读**；其余按 `nameScore` 降序（同分再比 lex）补足到 `FILES=20`。

## 读文件切窗

- `readText(filesystem, path, READ_LIMIT)`（`cascade.ts:238`）。
- `selectWindows(windows(text, WINDOW_BYTES, keywords, weights), WINDOWS)`（`cascade.ts:239`）：切 8192 字节窗口，按关键词加权分选前 `WINDOWS=24`。`passages.ts` 里全窗口分为 0 时 `selectWindows` 沿全文均匀抽。
- `Passage.start/end` 是 1-based 行号（`passages.ts`），判分前已确定。

## Wave 2 sketchBatch（草图路由）

- 所有文件的 passage 展平成 `cards`（`cascade.ts:252-253`）。
- 每批卡数 = `min(SKETCH_CARDS_MAX, max(1, floor(SKETCH_STATE_BYTES/SKETCH_BYTES)))`（`cascade.ts:257`）。
- `sketch(passage, keywords, weights, SKETCH_BYTES)`（`cascade.ts:260`）压出 384 字节草图；选行给含 `(` 的行加分（`passages.ts`）。
- `state` 键集合（sketchBatch）：`criteria`(SKETCH) + `files`(f0/f1→rel) + `passages`(p00→[fileKey,sketch]) + `search`。题键 `p00/p01`（`passageKey` 补 2 位）。
- 判分失败不作负判：`candidates.push({..., score: score ?? 1})`（`cascade.ts:275`）——失败当 1 放行。
- 排序（`cascade.ts:278-284`）：草图分降序 → passage 内部分 → rel → start。
- **幸存**：`candidates.filter(score >= CUTOFF).slice(0, FULL_LIMIT)`（`cascade.ts:285`）——`≥0.45` 且最多 40 段。

## Wave 3 passageBatch（完整验证）

- 幸存 passage 按文件分组（`cascade.ts:287-292`），每文件按 `VERIFY_STATE_BYTES/WINDOW_BYTES` 切批（`cascade.ts:299`）。
- `state` 键集合（passageBatch）：`criteria`(PASSAGE) + `file`(单文件 rel) + `passages`(p00→plainContent(passage)) + `search`。传的是**切出来那段的完整原文**（`plainContent`），非整份文件。
- 每 passage：`entry.score = max(entry.score, score)`（`cascade.ts:323`）；heat 用 passage 自带行号 `{start: passage.start, end: passage.end, p: score, snippet: 首个非空行前100字}`（`cascade.ts:324-329`）。模型只给概率 `score`，不给行号。

## 折算成结果（`cascade.ts:336-354`）

- 每文件 `contentScore = entry.score`；`entry.score < THRESHOLD(0.2)` 跳过（`:341`）。
- `FindHit`：rel + nameScore + contentScore + `ranges: mergeHeat(entry.heat, THRESHOLD)`（`:346`）+ linesSeen + truncated。
- `hits.sort((a,b) => b.contentScore - a.contentScore)`（`:353`）降序。
- 统计（`#ask`，`cascade.ts:142-146`）：`requests++`、`apiMs`、`inputTokens += usage.input`、`outputTokens += usage.output`、`cost += usage.cost.total`。`listed = entries.length`（`:183`）、`judged`（Wave1 noul 数，`:219`）、`filesRead`（`:339`/`:352`）。

## 传输面（仅当路由到 TypeSafe，`pi-ai/src/judgment/typesafe.ts`）

- POST path 恒 `/v1/systemone`，body = `JSON.stringify({state, model, questions})`，恒带 `Authorization: Bearer <key>`。
- 响应形状 `{model, answers, usage}`；`usage` 对象必需（`:145` 直接读 `response.usage.input_tokens`），三个内层字段各自可省略（`:86-90`），`cost` 是可选 USD 数字。
- NoulAnswer = `{type:"noul", noul:number}`，noul 是 0–1 概率。

## 未验证 / 不入库

- 本次 find 实际 judge 后端、model 名、各波中间 noul 值——未捕获。
- Jev 是否有状态——无源码证据。
- find vs grep 的性能对照——未做基准，仅机制推断的适用性判断。
