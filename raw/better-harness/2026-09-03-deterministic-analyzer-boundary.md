# Better Harness 确定性分析器的产出边界

> Source: Better Harness v0.6.6 安装目录
>         `~/.omp/plugins/cache/plugins/better-harness___better-harness___0.6.6`
> Collected: 2026-09-03

## 采集层 vs 判断层的分工

Better Harness 的流水线分两层：

1. **确定性采集层**（`session-analysis` 下的 `.mjs`，facts 路径）：读 session JSONL、git 历史、源码、agent 资产元数据，产出结构化 envelope。该路径用正则+状态机+计数器，不调用 LLM。但同一目录下也有 `claude-facets.mjs` 等会调 `modelClient.generateJson` 的文件，属于可选的 LLM 增强路径。
2. **判断层**（由宿主 agent 执行，本次由本仓库主 agent 完成）：消费 envelope，写 `findings.json`，再交给 renderer 生成报告。

**本次三条 finding 全部来自判断层，采集层产出 0 条缺陷。**

## 采集层的实际产出

### Session Evidence

`scripts/harness-analysis/evidence-bundle/session-evidence.mjs:62-70`：

```
62:
63: export async function collectSessionEvidence(context, options = {}, dependencies = {}) {
64:   const create = dependencies.createAnalyzer ?? createAnalyzer;
65:   const analyzer = await create(context.provider);
66:   const population = dependencies.sessionPopulation ?? null;
67:   const data = await analyzer.analyze({
68:     command: "facts",
69:     ...analyzerOptions(context, options),
70:     selection: "all-eligible",
```

`command: "facts"` 路径纯确定性：正则 + 状态机 + 计数器，无 LLM 调用。

session evidence 在 stripped 镜像下的实际产出：

```
eligibleSessions: 5
selectedSessions: 5
taskEpisodes: 24
distinctRequests: 19
candidates: 5
availableClasses: boundary-change, operation-control, read-only-work, validation-repair
emittedClasses: 同上（各 5 条）
withChanges: 0
flags: portfolio-truncated, population-portfolio-divergence, no-change-evidence, no-reviewed-relevant-check-evidence
```

### Project Harness

- `historyProfile`: 23 天历史（窗口 2026-07-01 起）
- `coreAnalysis`: candidateCount=4, highConfidence=0, mediumConfidence=1
- `diffImpact`: baseRef=HEAD, changedFiles=0, changedLines=0
- `changeDrift`: findingCount=0
- `evidenceSources`: tests passed=UNVERIFIED, CI status=UNVERIFIED, runtime behavior=UNVERIFIED

### Agent Customize

三个 envelope 全 available，但 findings 均为 0：

| envelope | status | findings | errors | warnings |
|---|---|---|---|---|
| lint | available | 0 | 0 | 0 |
| inventory | available | 0 | — | 0 |
| integrity | available | 0 | — | 0 |

`inventory` 的 `projectAssets=1`（仅 `AGENTS.md`），`userAssets=0`，`pluginAssets=0`（`--include-user-home` 未授权）。

## 判断层的产出

本次三条 finding 全部由 sub-agent 读仓库源码 + 主 agent 写 fixture 复现得出：

| # | 发现 | 来源 |
|---|---|---|
| 1 | `backup.py` 秒精度目录名导致同秒覆盖 | 读 `backup.py:14` + 临时目录 fixture 复现 |
| 2 | `policy.py` 按出现序号配对同名敏感键导致错位 | 读 `policy.py:171-184` + 隔离 fixture 复现 |
| 3 | `_iter_files` 目录缺失时静默成功 | 读 `manifest.py:78-79` + 隔离 fixture 复现 |

## 可选的 LLM 路径（本次未触发）

`scripts/session-analysis/claude-facets.mjs:170-177`：

```
170:   if (!analyzer || typeof analyzer.analyze !== "function" || typeof analyzer.readSession !== "function") {
171:     throw new Error("claude-facets requires a session analyzer");
172:   }
173:   if (!modelClient || typeof modelClient.generateJson !== "function") {
174:     throw new Error("claude-facets requires a JSON model client");
175:   }
176:
177:   const runContext = createFactsRunContext(options, platform);
```

`claude-facets` 调用 `modelClient.generateJson`，是 LLM 路径。本次未触发（`quick`/`normal` mode 默认走 facts 路径）。

## 真正约束判断质量的是什么

不是代码，是 prose：

- `SKILL.md:69-73`：`Launch exactly three fresh, read-only agents in parallel`
- `references/findings-review.md:28-34`：unavailable evidence 留在 evidence boundary，不硬造 finding
- `references/findings-review.md:86`：adequately reviewed 的 no-candidate window 不要求资产
- `references/findings-review.md:95-100`：证据稀疏时允许少于五条，拒绝 unsupported absence claims
- 五维天花板模型（Present→74, Wired→84, Exercised→94, Outcome-supported→100）

这些约束在本次执行中实际生效：
- 拦掉了我想跳过 Session Evidence agent 的行为（`SKILL.md:71` 写死 exactly three）
- 拦掉了我想给 Learning Capture 造 fallback finding 的行为（`findings-review.md:28-34`）
- 把 Project Harness 候选 2（无 CI）defer 掉（AGENTS.md 已自行声明边界）

## Renderer 的硬约束

`harness render` 的 schema 校验（本次触发 3 次）：

1. `locale` 必须是 `en` 或 `zh-CN`
2. 维度 label 必须字面匹配预设列表
3. `reason` 里不能出现 `~/` 开头的 home 路径
4. run-dir 必须是排他的（只允许 `findings.json`、`report.html`、`report.md`）

这些约束阻止了格式错误进入最终报告，但不影响 finding 内容本身。

## 未验证边界

- 未观测 `claude-facets` 在实际触发时的 LLM 输出质量。
- 未验证 `quick` vs `normal` vs `deep` 三种 depth 下 facts 路径的产出差异。
- 未验证 `portfolio-truncated` flag 的精确含义（candidate 从 50 条抽 5 条，但未说明截断标准）。
