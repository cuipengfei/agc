# SkillEvaluator 的计分与门禁机制

> Sources: NVIDIA SkillEvaluator 官方文档（docs.nvidia.com/skills/skillevaluator），2026-11-16 采集；NVIDIA/SkillEvaluator 源码（main 分支），2026-11-16 采集
> Raw: [SkillEvaluator 官方文档摘录](../../raw/agent-tooling/2026-11-16-skillevaluator-official-docs.md); [计分与门禁源码摘录](../../raw/agent-tooling/2026-11-16-skillevaluator-scoring-and-gating-source.md)
> Updated: 2026-11-16

## Overview

SkillEvaluator 是 NVIDIA 开源的独立命令行工具，检查 AI agent skill（`SKILL.md` 及配套目录）并测量 skill 对 agent 任务结果的影响。三档互相独立：Tier 1 静态检查、Tier 2 语义去重、Tier 3 沙箱真机对比。本文记录三档的计分与门禁机制、安装与凭据形态，以及与 OMP 的衔接边界。工具的效度边界（分数能不能信）另见 [SkillEvaluator 的效度边界](skillevaluator-validity-boundaries.md)。

## 三档分工与外部依赖

| 档 | 回答的问题 | 外部依赖 |
| --- | --- | --- |
| Tier 1 静态检查 | skill 是否安全、格式正确、兼容各 harness | 全覆盖需外部扫描器；配了 provider 才启用 LLM 检查 |
| Tier 2 语义去重 | 内容是否重复或撞车 | embedding 服务必需；单 skill 内去重另需聊天模型 |
| Tier 3 真机对比 | skill 是否帮上 agent | provider、被测 agent、沙箱（默认 Docker） |

每个 tier 单独安装 extra（`llm`/`tier2`/`tier3`），`all` 打包前三者。

**Tier 1 默认会用模型**：配置了 provider 时 `tier1 PATH` 自动跑 rubric judging、LLM 安全分析、finding 复核；纯静态要显式 `--no-llm`，`--llm` 则是强制要求 provider。`--no-llm` 不解除扫描器要求。

## Tier 1 质量分

四个维度各自从 100 分起扣固定分值，下限 0，加权求和：Correctness 0.35、Discoverability 0.25、Reliability 0.25、Efficiency 0.15。等级线 A≥90、B≥80、C≥70、D≥60、F 以下；分数门禁默认 70，可用 `--min-score` 调整。

扣分表要点：

- **Correctness**：frontmatter 出现 XML 标签 −15（name/description 同级处理）、name 非法或含保留词 anthropic/claude 各 −15、缺 `metadata.author`/`metadata.tags` 各 −5、Windows 路径 −10、SKILL.md 链接 README.md −5、无示例 −5，另加类型专属检查。
- **Discoverability**：描述短于 20 字符 −20、含 vague 词 −15、第一/二人称 −15、无触发词 −10、超过 200 字符 −5、无 `## Purpose` −5。
- **Reliability**：全文无错误处理词（error/fail/validate 等 17 个整词）−10、缺 `## Prerequisites`/`## Limitations`/`## Troubleshooting` 各 −5、脚本无 try/except 也无标记词 −5。
- **Efficiency**：估算 token 超预算 −15（估算方法是字符数除以 4，`total_tokens = len(content) // 4`）、说明段无动作动词 −15、深层引用 −10、行重复 −10、企业黑话 −5。

类型专属检查按检测到的 skill 类型只触发一块：script-based/hybrid（缺 `scripts/` 或 `tools/` 目录 −25、目录里没有可执行脚本 −10、脚本没写成表格 −10、说明没提 `run_script` −10，全部脚本都是 Node 脚本时 `run_script` 一项免检）、lib-based、resource-based、guide-only（正文少于 20 行 −15）。因此跨 skill 类型的分数不可比。

头部匹配是大小写敏感的原始子串匹配：`heading in content`。仓库测试用九个参数化用例把这个语义钉住了——prose 或代码块里出现 `## Security` 字样算满足，`# Security`（浅一级）、`## security`（大小写）、setext 标题（`Security\n====`）不算。

`--quality-config` 可整体换掉 expected_headers 与错误处理规则，逐条 `points: 0` 可关掉单条扣分。说明段（`## Instructions`/`## Usage`）的切分用 `content.split(f"\n{heading}\n", 1)`，所以 `### Usage` 下面的正文不会被当成说明段。

## rubric judge

九条标准（5 high、3 medium、1 low）各打 0–10 分，judge 返回 JSON（schema 要求 checks 数组，每条 id/criterion/pass/score/notes）。聚合在本地算：重要性加权（3/2/1）均值 ×10，保留 1 位小数。judge 自报的 `score` 和 `overall_pass` 只记进 metadata，不参与判定。

通过条件是双门槛：加权分 ≥60（`RUBRIC_MIN_SCORE`）且每条标准 ≥7（`_CRITERION_PASS_SCORE`）——任何一条 6 分整体就挂。无效回复重试一次（带上具体问题），第二次仍无效则失败关闭，不会用残缺证据打分。

## 门禁的两条独立失败路径

质量检查有两条互相独立的失败路径：

1. **分数低于 `--min-score`**：走 `fail_gate` 记入 `gate_failures`，docstring 明写「severity overrides cannot waive」。文档同口径：override 不改分数、不免除 min_score 要求，`QUALITY.*: info` 也救不回低于 70 的分数。
2. **error 级质量问题映射的 HIGH finding**：`_validate_single_skill` 按 `sev_map = {"error": HIGH, "warning": MEDIUM, "info": LOW}` 映射后 `add_finding`，HIGH/CRITICAL 使 `passed=False`。但这条路径按 override 后的级别参与 gating：`apply_policy` 改写 finding.severity 后调 `recalculate_from_findings()` 重建 `passed`（gate_failures 固定计错，其余按当前级别重算），所以 operator 把某条降级到 info 后该项不再使检查失败。

`recalculate_from_findings` 开头 `self.passed = not self.is_incomplete`，先逐条把 gate_failures 计错，再按当前严重级别重算各 finding。

## Tier 3 信号、维度与判定

六个信号里三个确定性（security 三级阶梯 1.0/0.5/1.0 之外的 0.0、skill_execution 四子检查均值、skill_efficiency 两子检查均值），三个 LLM judge（accuracy 五布尔除以 5、goal_accuracy 单布尔、behavior_check 逐步判定）。token_efficiency 刻意排除在维度之外，代码注释写明理由：纳入会让 token 用量单独改变质量判定。

五个维度取映射信号的加权均值（只有 Effectiveness 是 goal_accuracy/behavior_check 各 0.5），Overall = 五维等权均值。attempt 判定顺序：先 goal_accuracy 必须 1.0，再 security 必须 1.0（unsupported-wrapper 例外豁免），最后 Overall ≥ `--pass-threshold`（默认 0.50）。behavior_check 只警告不改变判定。

**Skill Lift** = 双臂共有 case 基线上 with−without 的 Overall 差，判定带 PASS ≥ +0.05 / FAIL ≤ −0.10，判定带是刻意放宽的（低 attempt 数时噪声大）。配对 bootstrap：种子 0、至少 2000 次重采样、95% 置信、Hesterberg 展开尾部；单个配对 case 不报区间。两臂被不同模型判卷的 case 从该指标 lift 中剔除并计入 `judge_mixed_cases`——所以报告的 lift 可能与两个臂分数直接相减不一致，偶尔连符号都不同。

dataset_sufficiency 三条件：至少 10 个 case 含 1 个负例、Wilson 通过率区间半宽 ≤0.20、至少 10 个双边 case。autopilot 默认生成 1 个 case，`--n-attempts` 默认 1。

## 安装、扫描器与凭据

安装用 uv 或 pip，装完提供 `skillevaluator` 命令。Tier 1 自备扫描器：找不到可执行文件时首次运行下载 SkillSpector 2.13.4 轮子与 Gitleaks 8.30.0 到运行时目录并校验 SHA-256 后经 `uv tool run` 执行，首次需访问 GitHub 与 PyPI，之后走 uv 缓存；Semgrep 可选。已装的扫描器优先。必需扫描器缺证据时检查报 `INCOMPLETE` 且退出码非零，`--skip` 跳过某检查后该 run 无法 certify Tier 1。

凭据只从 operator 的宿主环境变量解析：`.env` 与 `.env.local` 不加载（Harbor 在 evaluator 自有的空工作目录启动），skill 的 `evals/config.yml` 不能提供、改名或转发凭据，`harbor.runtime_env` 里写操作者凭据名会在运行时被拒绝。设 `SKILL_EVAL_LLM_PROVIDER=nv_build` + `NVIDIA_API_KEY` 时一把 key 覆盖 Tier 1 LLM 检查、Tier 2 embedding 与 chat、以及 Docker/Kata/local 下三个被测 agent；evaluator provider 与被测 agent 同源（anthropic+claude-code、openai+codex）时自动共用。只有跨 provider 或 Harbor 云后端（daytona/e2b 等）才需要另配 agent 原生凭据与显式模型。

## 被测 agent 与 OMP 衔接

Tier 3 支持的 agent 是 `claude-code`（Harbor 装 2.1.292）、`codex`（0.161.0）、`opencode`（1.19.5），加实验性 `hermes`（v2026.9.24，仅 Docker + NVIDIA Build）。默认 `--env-mode docker`，Harbor 在沙箱里装这些固定版本 CLI；本机已装的同名 CLI 只在 `--env-mode local` 被使用。共 27 种环境模式（26 种 Harbor 原生后端 + local）。**支持列表没有 OMP**。

因此对 OMP 用户，Tier 1 与 Tier 2 可直接指向 `~/.agents/skills/<name>`（OMP 的 `enableAgentsUser: true` 扫描该目录；`~/.omp/agent/managed-skills` 是 autolearn 生成的独立目录），Tier 3 无法测「OMP 自己加载这个 skill 后的表现」，只能用 claude-code/codex/opencode 作为被测宿主取近似。

## See Also

- [SkillEvaluator 的效度边界](skillevaluator-validity-boundaries.md) — 分数与 lift 在什么条件下能信
- [skills CLI 性能模型](skills-cli-performance-model.md) — skill 安装、目录发现与共享存储 `~/.agents/skills`
- [OMP Managed Skills 生命周期](../omp-config/managed-skills.md) — managed-skills 目录与 `~/.agents/skills` 的边界
