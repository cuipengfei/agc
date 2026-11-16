# SkillEvaluator 效度证据材料（metrics-reference、grader-validation、论文摘要、discussion #205）

> Source: https://docs.nvidia.com/skills/skillevaluator/metrics-reference ; https://docs.nvidia.com/skills/skillevaluator/grader-validation ; https://arxiv.org/abs/2608.20614 ; https://github.com/NVIDIA/SkillEvaluator/discussions/205
> Collected: 2026-11-16
> Published: 论文 2026-08-20；docs.nvidia.com 持续更新；discussion #205 发起于 2026-10-16

## docs.nvidia.com/skills/skillevaluator/metrics-reference（节录）

### 两套互不相干的评分系统

> * **There are two unrelated scoring systems.** Tier 1's *Quality Score* is a static-analysis score from 0 to 100 computed from `SKILL.md` without running anything. Tier 3's *dimensions*, *Overall Score* and *Skill Lift* are measured from live agent runs on a 0.0–1.0 scale. They share four dimension names and nothing else. Neither is an input to the other.

### 六个 Tier 3 信号（What is measured）

| Signal | Source of truth | Varies between identical runs? |
| --- | --- | --- |
| `security` | Pattern and path checks over recorded commands, tool calls and output | No, for a fixed trajectory |
| `skill_execution` | Structural checks over the recorded tool-call sequence | No, for a fixed trajectory |
| `skill_efficiency` | Classification of each recorded tool call | No, for a fixed trajectory |
| `token_efficiency` | Token counters | No, for fixed counters |
| `accuracy` | LLM judge, 5 booleans | **Yes** — model variance |
| `goal_accuracy` | LLM judge, 1 boolean (or RAGAS) | **Yes** — model variance |
| `behavior_check` | LLM judge per expected step; declared checks are programmatic | **Yes** for judged steps, no for declared checks |

> The judged signals feed Correctness and Effectiveness, which are two of the five equally weighted dimensions. So roughly two-fifths of the Overall Score, and the Skill Lift derived from it, carries LLM judge variance.

### accuracy 的判定

> **Formula** — the share of five boolean criteria the judge marked true:
>
> ```text
> accuracy = (number of the 5 criteria judged true) / 5
> ```
>
> The five criteria are `ACTION_CORRECT`, `FACTUALLY_ACCURATE`, `TASK_ADDRESSED`, `ACTIONABLE` and `FORMAT_FOLLOWED`. They are fixed: every case and both arms use the same five, and none of them asks whether the agent used the skill — `skill_execution` measures that.
>
> **Range and units:** exactly one of 0.0, 0.2, 0.4, 0.6, 0.8, 1.0; unitless.
>
> **Data behind it:** one call to the configured judge model with the question, the expected answer and the agent's final response. The judge returns only the five booleans and a reason, against a JSON schema that rejects a missing, extra or non-boolean criterion. **A `score` field in a judge reply is ignored** — the verifier does the arithmetic. An invalid reply is retried once with the problem named; a second invalid reply, a refusal or a timeout records `status: "error"` with no score, which fails the trial.

### Overall Score 与维度

> ```text
> overall = mean(Security, Correctness, Discoverability, Effectiveness, Efficiency)
> ```
>
> Equal weight, five terms, no exceptions. Dimensions that are N/A for the arm are left out of the mean; they are not counted as 0 or 1.
>
> Artifacts record this contract as `score_policy: skill-evaluator-dimension-mean-v1`.

> The same aggregate drives per-attempt pass\@k, Skill Lift, cross-agent comparison and best-agent selection, so all of them move together.

Insights 文案对数字零贡献：

> The report's **Insights** narrative — conclusions and recommendations in prose — is LLM-written on top of deterministic baselines, but it contributes no number.

### Attempt 判定与 pass@k

> An attempt passes only after three checks, in this order:
>
> 1. **Goal.** A scored `goal_accuracy` must be `1.0`. Below that, the attempt fails with a goal-not-met reason, whatever the Overall Score is.
> 2. **Security.** A scored `security` must be `1.0`. Below that, the attempt fails with a security reason — unless the finding is only the unsupported-wrapper evaluator limitation, which is exempt.
> 3. **Overall.** Otherwise the attempt passes when `overall >= pass_threshold` (`--pass-threshold`, default `0.50`).

Wilson 区间公式与 z 值：

> with `z = 1.959963984540054`, `p = passed_cases / total_cases` and `n = total_cases`:
>
> ```text
> center = (p + z^2 / 2n) / (1 + z^2 / n)
> margin = z * sqrt((p(1-p) + z^2 / 4n) / n) / (1 + z^2 / n)
> interval = [center - margin, center + margin]     clamped to [0, 1]
> ```

McNemar 限制：

> With five or fewer discordant pairs no two-sided exact result can fall below 0.05 at all; the report labels that case resolution-limited rather than reporting it as evidence of no effect.

### Skill Lift

> **Formula:**
>
> ```text
> Skill Lift = overall(with skill) - overall(without skill)
> ```
>
> Both sides are computed on a **shared basis**: only the cases both arms ran and only the metrics both arms scored, with the same denominator on each side. Cases whose two arms happened to be judged by different models are excluded from that judge metric, and the count is recorded in `judge_mixed_cases`. This is why the reported lift can differ from subtracting the two displayed arm scores, and occasionally differ in sign.

> **Verdict bands** (`constants.py`): PASS at `>= +0.05`, NEUTRAL between `-0.10` and `+0.05`, FAIL at `<= -0.10`. The bands are deliberately wide because live agent runs are noisy at low attempt counts. They color-code the lift as diagnostic evidence; they do not determine the run's verdict, which comes from the five dimensions.

bootstrap 区间（含单 case 限制）：

> Where paired per-case scores are available, the run also reports an interval for the mean paired lift: whole cases are resampled with replacement from a seeded stream (seed `0`, at least 2,000 resamples, 95% confidence), using Hesterberg's expanded percentile tails because a plain percentile bootstrap over 5–10 cases is overconfident. It is deterministic for a given input: the same results produce the same interval. With a single paired case no interval is reported, because a zero-width one would look final.

> Lift needs both arms. With `--skip-baseline` there is no lift to report, and the report says `no baseline` rather than `0.00`.

### Tier 1 Quality Score

> ```text
> each area starts at 100
> each triggered finding subtracts its fixed deduction, floored at 0
>
> Quality = 0.35 * Correctness
>         + 0.25 * Discoverability
>         + 0.25 * Reliability
>         + 0.15 * Efficiency
> ```

> **Range and units:** 0–100 points. Grades are A at 90 or above, B at 80, C at 70, D at 60, F below. The default `--min-score` is 70, and the minimum is an independent gate that policy severity overrides cannot waive.

> **Estimated tokens** in the Tier 1 report are `len(SKILL.md) // 4` — characters divided by four, not tokenizer output. `metrics.estimate_method` records the method. Dense files usually have fewer than four characters per token, so the estimate runs low.

### dataset_sufficiency（PR #400 一节）

> Every Tier 3 result now carries a `dataset_sufficiency` block under policy `dataset-sufficiency-v1`, which labels the result **sufficient** or **provisional** and says why. The three checks are: at least 10 distinct cases including at least 1 negative case; a 95% Wilson pass-rate interval half-width no wider than 0.20; and at least 10 cases scored by both arms for the lift comparison. A check that cannot be assessed — a skipped baseline, for instance — keeps the result provisional. The status changes no verdict, score or exit code; it is there so a result from four cases stops looking as authoritative as one from forty. The thresholds are documented defaults, not derived from a power analysis.

### 单次小规模 run 的定位（What a single run can and cannot support）

> **With `--n-attempts 1` and a handful of cases, a run is a smoke test, not a benchmark.** One attempt per case gives pass\@1 with no repeatability signal at all, and the Wilson interval on four cases has a half-width of up to 0.35 — well over the 0.20 the dataset-sufficiency policy asks for, which is why such a result is marked provisional. The narrowest a 4-case interval ever gets is 0.2449, at 0/4 or 4/4, which is still wider than the policy allows.

### 未测量项（What has not been established）

> * **There is no published inter-rater agreement study against human-labeled trajectories.** No kappa, no agreement statistic against independent human raters, no calibration curve.
> * **The dimension and signal definitions are design decisions, not validated constructs.** Nothing demonstrates that `skill_execution` measures "discoverability" as a user would understand it, that the 0.5/0.5 split inside Effectiveness is the right weighting, or that equal weighting of the five dimensions is the right aggregate.
> * **The thresholds are conventions.** The 0.50 pass threshold, the 0.40/0.50 verdict bands, the +0.05/−0.10 lift bands, the 10-case sufficiency minimum and the 200,000-token efficiency constant are defaults chosen for discussion, not values derived from a measured error model.
> * **There is no control arm for instruction presence.** The comparison is skill versus no skill. A run does not isolate the effect of the skill's *content* from the effect of having been given an additional instruction at all.
> * **A statistical interval is not a generalization claim.** The Wilson and bootstrap intervals describe the cases in one configured run with one dataset, agent, model and environment.

## docs.nvidia.com/skills/skillevaluator/grader-validation（节录）

套件描述：

> The bundled suite contains 14 assessment and 2 tuning cases with hand-written calculator trajectories. It demonstrates every category, including recovery, missing evidence, correct non-use, a baseline without the skill and mixed per-step behavior. It is intentionally small and is not a reliability benchmark.

阈值默认（Reading the report 节）：

> Scores at or above the metric threshold pass. Defaults are accuracy 0.8, goal accuracy 1.0, security/execution/efficiency/behavior 1.0, and overall 0.5 (the Harbor pass threshold). Suite thresholds override defaults.

accuracy 部分分说明：

> Accuracy still averages five criteria: if only `FORMAT_FOLLOWED` is false, its score is 0.8 and passes the default accuracy threshold.

实测基线（同节）：

> A live format diagnostic at commit `0d5e356583fee63c3d12e4930581c7dfb3352911` (0.9.0), using `nv_build` / `nvidia/nemotron-3.5-bolt-e4b`, measured Behavior false passes of 9/12 and false fails of 3/18 over 10 distinct synthetic cases with three dependent repeats (30 attempts). A separately frozen 20-case author-labelled set, also repeated three times (60 attempts), measured 15/33 false passes and 3/27 false fails; it contains 18 format cases and two semantic controls. Both had zero unjudgeable Behavior attempts. These labels are **not independent human labels**. The wording and narrow synthetic coverage limit these findings; they establish a known natural-language format limitation, not representative judge reliability or an agreed acceptance threshold.

composite overall 的已知失败任务放行（同节）：

> `overall` is the score policy's dimension mean, compared with the default 0.5 threshold. The shipped policy averages security, accuracy, skill execution, goal achievement (the mean of goal_accuracy and behavior_check), and skill efficiency. N/A metrics are omitted from their dimension; dimensions with no scored metrics are omitted from the overall mean. A known task failure with clean deterministic dimensions can therefore still receive an overall pass. The suite reports this as a false pass against the independent overall label rather than hiding it or changing the verifier's scoring.

metrics-reference 对同一实测的概括（What the project has done about judge reliability，PR #383 段）：

> The measured baseline it publishes is unflattering and is published anyway: on the bundled assessment split, both tested judge models passed every known task failure at the composite `overall` threshold (15/15 false passes), and `accuracy` gave partial credit to wrong-format and false-success answers. See [Grader Validation] for the full table. Those figures describe that suite, that scorer and those models only.

Wilson 区间在 rate 报告中的角色（Reading the report 节）：

> Rates include numerator, denominator and a Wilson 95% interval. Zero denominators produce null rates and intervals, not zero. Attempt-level intervals treat attempts as independent; repeated grades of one case are dependent, so these are descriptive bounds, not a substitute for independent case sampling.

## arXiv 2608.20614 摘要（原文）

> On 145 real skills from internal enterprise repositories and public catalogs, scan-only gates surface useful authoring issues but measure complementary facets (structural versus LLM-judge Spearman $ρ= 0.14$). Across 947 scored paired cases from 58 of 64 production skills and four primary harnesses, mean composite Skill Lift is 0.2134 (95\% paired-case CI [0.1967, 0.2301]); mean outcome-only lift, the average of accuracy and goal accuracy, is 0.1799. Composite lift is positive in 72.8\% of paired cases. The largest process-metric gains appear in skill execution, behavior check, and skill efficiency---signals about discovery, routing, workflow following, and tool use that document scans cannot observe. An open-source implementation of the methodology is available in NVIDIA SkillEvaluator.

（论文标题：Evaluating Skills, Not Just Agents: Agentic Continuous Evaluation of Skills；作者 Christopher Kevin 等；发表 2026-08-20。）

## GitHub discussion #205（Research collaboration inquiry: LLM judge calibration for Skill Lift）

发起者 GBX-Max1220，2026-10-16，General 分类，0 条回复，1 名参与者。

> I read the ACES paper and the Tier 3 evaluation documentation. One point in Section 7 caught my attention: live trajectory inter-judge agreement, human calibration, and uncertainty propagation are still unmeasured. I've also looked at #62 and PR #124, so I'm not proposing to duplicate the existing uncertainty reporting or scoring fixes. I'm interested in studying how judge disagreement affects paired Skill Lift estimates, especially whether the same agent trajectories can lead to different conclusions about whether a skill helps. A small pilot could use public paired trajectories, independent human ratings, and multiple judge evaluations, with the underlying agent runs held fixed. Before building anything, I wanted to ask whether this is a direction your team would find useful, and whether there's a publicly shareable paired-run subset or a recommended way to generate one from the reference skills. If there's a fit, I'd be interested in contributing the experimental design, analysis, and writing as a research collaborator. Best, Baixin Guo (Max)

（截至 2026-11-16 采集时点：0 comments、0 回复。）

## 本机复算与功效计算记录（会话产物，非外部来源）

以下数字为本会话用一次性 Python 脚本（标准库）按上述 raw 材料复算，公式与组件均可回溯到本文引用的原文：

- text-analyzer 88.8/100 复现：扣分为 metadata.tags −5（`SKILL_SPEC recommended field missing: 'metadata.tags'`）、脚本表格 −10、`run_script` −10、描述超 200 字符 −5、无 `## Prerequisites` −5；四维 75/95/95/100，按权重 0.35/0.25/0.25/0.15 加权得 88.75，`round(88.75, 1) = 88.8`（Python 银行家舍入），等级 B（≥80）。组件（各扣分值、权重、等级线）全部位于上文 raw 引用中。
- 功效核算组件来源：lift 0.2134、CI [0.1967, 0.2301]、947 配对 case、72.8% 为正——来自 arXiv 摘要原文；由 CI 半宽 (0.2301−0.1967)/2=0.0167 与 z=1.959963984540054（Wilson 公式节）反推单 case 配对差标准差 sd = 0.0167/1.959963984540054 × √947 ≈ 0.26；80% 功效（z_beta=0.8416）检测 0.2134 需 n≈12（配对均值检验）或 n≈38（符号检验，p=0.728）；autopilot 默认 1 个 case 时，真实 lift 0.2134 下判定落 NEUTRAL/FAIL 的概率约 27%（P(X < 0.05)，X~N(0.2134, sd)）。
- Wilson 半宽复算：n=10、p=0.5 时半宽 0.26；n=20 时 0.2007（超过 0.20）；n=21 时 0.1966（达标）——dataset_sufficiency 的 0.20 半宽规则最少需 21 个 case，公式与 z 值来自 Wilson 区间节。
