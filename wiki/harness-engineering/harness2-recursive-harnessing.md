# Harness² 递归 agent harness 框架

> Sources: google-research/harness2 README、docs/EXPERIMENTS.md 与项目网站，2026；harness2 源码与 docs/SETUP.md、docs/BENCHMARKS.md，2026
> Raw: [README 与实验指南摘录](../../raw/harness-engineering/2026-11-12-harness2-readme-and-experiment-guide.md); [执行器与改进器源码摘录](../../raw/harness-engineering/2026-11-12-harness2-substrate-and-proposer-source.md)
> Updated: 2026-11-12

## 它是什么

Harness² 是 Google Cloud AI Research 与 Northwestern University 的论文配套框架（arXiv 2610.14224，Apache 2.0）。harness 指模型之外让模型能以 agent 方式工作的系统：prompt、工具、记忆、技能、编排。Harness² 在模型权重固定的前提下自动修改 harness，分两级递归：

- **任务级递归**：Propose–Probe–Compose。对当前任务提出候选 harness 编辑，分别执行探测，再根据各次执行的行为差异组合出精炼后的 harness。过程不使用 ground-truth 反馈。
- **改进级递归**：每个任务完成后，把采纳的 harness 与有证据支撑的经验写入按领域划分的 library，供同领域的后续任务读取；每个任务自身仍从基础 harness H₀ 开始。

## 八个可编辑组件

| 作用 | 组件 |
|---|---|
| 构造 context | system prompt、guardrails、memory、skills |
| 定义 tool interface | tool guidance、scripts |
| 编排 delegated work | subagents |
| 控制 middleware | plugins |

OpenCode 执行器对应的 always-on 文件为 `systemprompt.md`、`guardrails.md`、`LongTermMEMORY.md`、`tool_descriptions/tool_guidance.md`，`always_on_max = 24_000`；Codex 执行器只有 `AGENTS.md`，`always_on_max = 8_000`，且 Codex 会在 32,768 字节处静默截断。

## 两种递归模式的精确结构

两种模式都以 **k 次**基础 harness 参考执行开始。

- **parallel**：探测 k 个通用（invariant）候选与 k 个领域候选，产生 k 份独立组合，每份组合读取全部候选与执行证据。
- **sequential**：串行执行 k 个 Propose–Probe–Compose 步骤，把精炼后的 harness 与累积证据带入下一步。

同域任务顺序执行、只读更早条目，跨域可并发；library 按 benchmark、executor、mode、budget、seed 隔离。判分与报告必须与改进使用相同的 benchmark、executor、subset、k、mode、seed；改模型或任务选择要换 `HARNESS2_RUNS_DIR`，重复同一命令会恢复。

## 模型调用归属

Harness² 的 Python 包没有模型客户端，核心 `dependencies = []`。所有模型调用都发生在它启动的子进程里。

| 环节 | 执行者 | 调用方式 |
|---|---|---|
| 任务 rollout（solver） | OpenCode（默认）或 Codex | OpenCode 用固定 commit `23fb5e05`（v1.14.18）的源码经固定 Bun 运行 `packages/opencode/src/index.ts run`；Codex 用 0.144.6 CLI 连 Responses API |
| 改进器（propose / compose / reflection） | 默认 OpenCode，可选 Claude CLI | `CHANNELS = ("claude_cli", "opencode")`，默认 `opencode`；OpenCode 会话读 `MISSION.md` 并把结果写 `output/answer.md`；Claude CLI 用 `-p --output-format json` |
| 判分 | 各基准自己的 judge | `judge.py` 调 `adapter.score()`，走 LAB、JobBench、WorkBuddy-Bench 的上游判分脚本，框架不含 LLM judge |
| 方法编排 | Harness² 自身 | 递归调度、候选树、文件 staging、环境变量清理、轨迹渲染、选择、library、报告、内容寻址缓存与审计 |

改进器调用前的 `SCRUB_ENV` 会清掉宿主侧 token（ANTHROPIC、OPENAI、GEMINI、GOOGLE、GITHUB、AWS 等），每个 agent 只保留自己模型调用需要的密钥；未列入的变量原样传递。`harness2-bridge` 用 LiteLLM 把 Vertex Gemini 包装成 Codex 需要的 Responses API，端口与访问密钥生成后存在 `dependencies/codex/` 供重启复用。

对集成新执行器的含义 [推断]：接 OMP 或 Pi 需要实现 `substrate/base.py` 的 `Substrate` Protocol（`surface`、`materialise`、`execute`、`read_trajectory`、`preflight`），基准 adapter 提供 launcher；若还想让 OMP 充当改进器，需要新增 proposer 通道，因为当前通道只有 `opencode` 与 `claude_cli`。

## 集成对象

| 类别 | 对象 | 接入方式 |
|---|---|---|
| 执行器 | OpenCode（默认）、Codex CLI | `--substrate cx` 切换 |
| 模型与网关 | Vertex AI 的 Gemini、Claude；任意 Responses API 端点 | `HARNESS2_SOLVER_MODEL` / `HARNESS2_IMPROVER_MODEL` / `HARNESS2_JUDGE_MODEL`；Codex 用 `HARNESS2_CODEX_BASE_URL` / `HARNESS2_CODEX_API_KEY` / `HARNESS2_CODEX_MODEL` |
| Responses API 桥 | `harness2-bridge`（LiteLLM） | 把 Vertex Gemini 包装成 Responses API 给 Codex |
| 基准 | LAB、JobBench、WorkBuddy-Bench | 分别对应 `harveyai/harvey-labs`（法律）、`Job-Bench/job-bench-eval` + Hugging Face 数据集（职业任务）、`Tencent/workbuddy-bench` + Hugging Face 数据集（办公/网页/代码） |
| 系统依赖 | gcloud CLI、Node.js 20+、Docker、Pandoc、Poppler、uv | 凭证、执行器运行时、WorkBuddy 容器、LAB 文档处理 |

CLI 入口：`harness2`（改进）、`harness2-judge`、`harness2-report`、`harness2-setup`、`harness2-check`、`harness2-demo`、`harness2-bridge`。`harness2-demo` 用确定性编辑器与真实 Python 执行跑两种递归模式，不需要模型凭证，可先验证安装。

## 自报结果

README：在三个专业基准、四种模型–harness 配置上，单步改进使 GLM-5 与 Gemini 3.5 Flash 相对基础 harness 提升，最高 WorkBuddy-Bench +11.5 分、JobBench +4.5 分、LAB partial pass rate +11.8 个百分点。

项目网站的 WorkBuddy 结果表（Gemini 3.5 Flash / OpenCode，三次运行均值，k=5 用 parallel）：

| Method | Code | Web | Office | Average |
|---|---|---|---|---|
| Base harness | 73.4 | 69.9 | 74.0 | 72.4 |
| ReasoningBank | 72.6 | 70.7 | 76.8 | 73.4 |
| Meta-Harness | 75.5 | 75.1 | 78.6 | 76.4 |
| Harness Scaling | 74.0 | 74.0 | 77.9 | 75.3 |
| Harness² · k=1 | 76.5 | 76.4 | 79.5 | 77.5 |
| Harness² · k=5 | 80.8 | 78.3 | 83.4 | 80.8 |

JobBench 案例研究：基础 agent 未对账源文件、未复查输出；改进 harness 加入 verification guardrails、reconciliation skill 与更精确的 tool guidance，任务分从 43.1 到 77.8。

这些数字来自 README 与项目网站自报，未在本机复现。

## 使用边界

- **网络**：执行器网络不受限，Codex 关闭 sandbox。JobBench 的 `RUBRICS.json` 公开在 Hugging Face，官方验证运行中 Codex 曾自行下载当前任务的评分标准。建议评测前用出口防火墙或 DNS 策略屏蔽 `huggingface.co`、`hf.co`、`*.hf.co`、`github.com`、`raw.githubusercontent.com`；setup 本身需要这些主机下载依赖。
- **费用**：rollout 与改进阶段都产生 API 费用；LAB 全量 1,143 个任务。先用 `--only-domains` 限定领域、`--max-tasks` 按领域封顶、`--dry-run` 预览任务选择。
- **复现**：比较预算或模式时固定任务选择、executor、improver、judge 与网络访问；JobBench 数据集下载时解析、未固定 commit，报告结果要带上 setup 记录的 Hugging Face revision。`harness2-judge --bases` 可对参考执行判分，`harness2-report` 只覆盖精炼后的 harness。
- **许可**：WorkBuddy-Bench 用腾讯自定义许可证，含地域限制。仓库声明这不是 Google 官方支持产品，也不在 Google 开源漏洞奖励计划内。
- **wheel 安装**：wheel 只含 `harness2` 包；`scripts/split_tasks.py` 需要源码树。

## See Also

- [Harness 格式与上下文载体](harness-formats-and-context-carriers.md) — 编辑格式与上下文载体维度的 harness 优化
- [Behavioral Harness 的成本收益实验](behavioral-harness-cost-experiment.md) — 另一项对照实验：模型能力决定 harness 何时产生收益
- [双层循环操控模型](dual-loop-steering-model.md) — 课程视角的 harness 双层循环与自我改进
