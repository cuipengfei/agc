# Harness² README 与实验指南摘录

> Source: https://github.com/google-research/harness2（README.md 与 docs/EXPERIMENTS.md，原文合并摘录）
> Collected: 2026-11-12
> Published: 2026（arXiv 2610.14224 与仓库 README，无独立发布日期）

以下为英文原文摘录，保留原意与数值。

## Harness 定义与两级递归（README.md）

A **harness** is the system around a model that enables it to act as an agent:
prompts, tools, memory, skills, orchestration, and more. **Harnessing** is the
process of optimizing that system.

Harness² is a plug-and-play framework for **recursive agent harnessing** in an
open world, where agents encounter tasks unseen during harness design. It
connects two levels of recursion while keeping model weights fixed:

* **Task-level recursion** refines the execution harness for the current task
  through a contrastive **Propose–Probe–Compose** step: propose edits, probe
  their effects on the same task, and compose a refined harness from behavioral
  contrasts between executions, without ground-truth feedback.
* **Harnessing-level recursion** updates a persistent *improvement harness*
  with adopted harnesses and evidence-supported lessons from each task to guide
  future refinement.

## 自报增益（README.md）

Across three professional benchmarks and four model–harness configurations, a
single Harness² step improves GLM-5 and Gemini 3.5 Flash over their base
harnesses, with gains of up to 11.5 points on WorkBuddy-Bench, 4.5 points on
JobBench, and 11.8 percentage points on LAB's partial pass rate. Increasing the
task-level recursion budget brings further gains.

The release supports **parallel and sequential recursion**, **OpenCode and
Codex executors**, and **JobBench, LAB, and WorkBuddy-Bench**.

## 八个可编辑组件（README.md）

Harness² exposes eight editable components around the model: **system prompt,
guardrails, memory, tool guidance, subagents, skills, scripts, and plugins**.
They control context construction, the tool interface, delegation, and behavior
inside the tool loop.

配图 assets/components.png 的分组说明：system prompt、guardrails、memory、skills 构造
context；tool guidance 与 scripts 定义 tool interface；subagents 编排 delegated work；
plugins 控制 middleware。

## 安装与运行（README.md）

Use **Linux, Python 3.12, and uv**.

```bash
uv venv --python 3.12 .venv
source .venv/bin/activate
uv pip install -e '.[render]'
harness2-demo --output runs/demo --k 2
```

The local demo runs both recursion modes with deterministic editors and real
Python executions. It requires no model credentials.

For model-backed benchmarks, install **Node.js 20+, the Google Cloud CLI**, and
the benchmark dependencies. LAB needs Pandoc and Poppler; WorkBuddy-Bench needs
Docker. Then configure your models（复制 .env.example 到 .env，运行
gcloud auth application-default login）。

Run a benchmark 示例：

```bash
harness2-setup lab
harness2-check --bench lab
harness2 --bench lab --k 1 --mode parallel \
  --only-domains antitrust-competition --max-tasks 1
harness2-judge --bench lab --k 1 --mode parallel
harness2-report --bench lab --k 1 --mode parallel
```

Judging and reporting must use the same benchmark, executor, subset, `--k`,
`--mode`, and seed as the refinement run. Add `--dry-run` to `harness2` to
preview task selection without model calls.

| Benchmark | Tasks | Install |
|---|---|---|
| JobBench | Professional work | `harness2-setup jb` |
| LAB | Legal work | `harness2-setup lab` |
| WorkBuddy-Bench | Office, web, and code | `harness2-setup wb` |

Choose one benchmark per command. WorkBuddy also takes `--subset office`,
`--subset web`, or `--subset code` on every command after setup.

## 递归模式（README.md 与 EXPERIMENTS.md）

README：Scale task-level recursion in two ways: **parallel recursion** explores
multiple candidate harnesses and composes refinements from their execution
evidence; **sequential recursion** carries the refined harness and accumulated
evidence through successive Propose–Probe–Compose steps.

EXPERIMENTS.md：**Both modes start with `k` reference executions of the same
base harness.**

- **Parallel recursion** proposes and probes `k` general (invariant) candidates
  and `k` domain-specific candidates. Each of `k` independent compositions uses
  the full candidate pool and execution evidence to produce a refined harness.
- **Sequential recursion** runs `k` Propose–Probe–Compose steps, carrying the
  refined harness and accumulated execution evidence into the next step.

After adoption, reflection stores the adopted harness and evidence-supported
lessons in a per-domain library. Tasks within a domain run in order and read
only earlier entries; different domains can run concurrently. Libraries are
separated by benchmark, executor, mode, budget, and seed.

| Option | Behavior |
|---|---|
| `--k 1` | One Propose–Probe–Compose step, followed by reflection after adoption |
| `--k K --mode parallel` | Explore `K` candidates per scope and produce `K` compositions |
| `--k K --mode sequential` | Refine the harness through `K` successive steps |
| `--workers N` | Run `N` domains concurrently; tasks within each domain stay ordered |
| `--substrate cx` | Use Codex instead of the default OpenCode executor |
| `--seed N` | Shuffle the task stream reproducibly; does not control model sampling |

Use the same benchmark, executor, subset, `k`, mode, and seed for refinement,
judging, and reporting. Use a separate output root when changing the budget or
mode to keep experiments easy to distinguish.

## 任务选择与费用（EXPERIMENTS.md）

Model-backed runs incur API costs for executor rollouts and improvement stages.
The full LAB task stream contains 1,143 tasks. Start with a small selection and
review model pricing before launching a full run.

- `--only-domains` restricts the run to the named domains.
- `--max-tasks` caps tasks **per domain**, not across the whole run.
- `--dry-run` previews selected tasks and available domains without model calls.

每个基准另有 scripts/run_lab.sh、scripts/run_jobbench.sh、scripts/run_workbuddy.sh
按顺序执行检查、改进、判分与报告；通过 SUBSTRATE、K、MODE、SUBSET 环境变量配置。

## 可复现性（EXPERIMENTS.md）

When comparing budgets or modes, keep task selection, executor, improver, judge,
and web access fixed. Use a distinct `HARNESS2_RUNS_DIR` when changing models or
task selection; the saved configuration prevents incompatible resumes.

JobBench's dataset is resolved at download time rather than pinned to a commit.
Setup records the downloaded Hugging Face revision in
`dependencies/job-bench-eval/dataset/main/.harness2-download.json`. Report that
revision alongside JobBench results.

任务划分：`python scripts/split_tasks.py --bench lab --seed 42 --output splits/lab.json`，
默认 train fraction 0.5，生成的划分是本地文件，脚本拒绝覆盖已存在文件。

## 基线评测（EXPERIMENTS.md）

`harness2-judge --bases` scores a run namespace's reference executions, writing
`base_judged.json` beside `judged.json` for the base-harness comparison.
`harness2-report` covers the refined harness only.

## 网络访问（README.md 与 EXPERIMENTS.md）

README：Executor network access is unrestricted, and Codex runs with its sandbox
disabled. Public benchmark rubrics may be accessible online. Before evaluation,
configure network restrictions to prevent access to benchmark answers and
grading criteria.

EXPERIMENTS.md：All three benchmarks are public, and JobBench publishes each
task's `RUBRICS.json` on Hugging Face. An executor with network access can
therefore retrieve grading criteria. In a validation run of this release, a
Codex rollout on JobBench downloaded its task's rubric without being instructed
to.

The release does not restrict network access. After setup, block the following
hosts for the executor to reduce access to benchmark data and grading criteria:

- `huggingface.co`, `hf.co`, and `*.hf.co`
- `github.com` and `raw.githubusercontent.com`, for benchmark repositories

Setup itself needs these hosts to download dependencies and data. Codex runs
with its sandbox disabled, so apply restrictions at the network level, such as
an egress firewall or DNS policy on the executor host, rather than relying on a
tool setting. Report the restrictions used alongside results.

## 结果与恢复（EXPERIMENTS.md）

The default output roots are `runs/lab/`, `runs/jb/`, and `runs/wb/<subset>/`.
They contain task summaries, execution artifacts, adopted harnesses, reflection
notes, and graded results.

Repeat the same command to resume. Failed evaluations remain unscored rather
than being counted as zero. Use a new `HARNESS2_RUNS_DIR` when changing models
or task selection.

Refinement, judging, and reporting use `harness2`, `harness2-judge`, and
`harness2-report`; each supports `--help`.

## 许可与声明（README.md）

Harness² is licensed under Apache 2.0. Third-party code under `third_party/`,
benchmarks, and datasets retain their upstream licenses.

This is not an officially supported Google product. This project is not
eligible for the Google Open Source Software Vulnerability Rewards Program.

## arXiv 2610.14224 摘要补充（项目网站 harness2.github.io）

项目网站展示的逐基准结果示例（单步改进、同一模型–执行器配置）：
- Gemini 3.5 Flash / OpenCode 在 WorkBuddy 上从 72.4 升到 77.5（k=1），k=5 parallel 到 80.8。


网站 results 表（WorkBuddy，Gemini 3.5 Flash / OpenCode，reported means across three
runs，k = 5 使用 parallel recursion；Average 为 Code、Web、Office 的宏平均）：

| Method | Code | Web | Office | Average |
|---|---|---|---|---|
| Base harness | 73.4 | 69.9 | 74.0 | 72.4 |
| ReasoningBank | 72.6 | 70.7 | 76.8 | 73.4 |
| Meta-Harness | 75.5 | 75.1 | 78.6 | 76.4 |
| Harness Scaling | 74.0 | 74.0 | 77.9 | 75.3 |
| Harness² · k=1 | 76.5 | 76.4 | 79.5 | 77.5 |
| Harness² · k=5 | 80.8 | 78.3 | 83.4 | 80.8 |

Task-level scaling 说明：WB-CODE 上从 k = 1 到 k = 5 提升 +4.3。

JobBench 案例研究（Gemini 3.5 Flash / OpenCode）：基础 agent 未对账源文件、未复查
输出；改进后的 harness 加入 verification guardrails、reconciliation skill 与更精确
的 tool guidance，任务分从 43.1 提升到 77.8。

作者署名（论文）：Ruiyao Xu、Yanfei Chen、Zhongying CuiZhu、Bhavana Dalvi Mishra、
Yifei Ming、Han Yu、Rujun Han、Chen-Yu Lee、Tomas Pfister；机构为 Google Cloud AI
Research 与 Northwestern University。
