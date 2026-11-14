---
source: 本机 ~/.agents/skills 与 ~/.omp/agent/agents 实测清点，2026-11-14；pstack 与 mattpocock 各技能 SKILL.md 原文摘录
collected: 2026-11-14
published: Unknown
---

# 本地技能栈与 EGM 覆盖对照的一手材料

## 本机清点命令与结果

- `ls -d ~/.agents/skills/*/ | wc -l` → 165（skill 目录条目）
- `ls ~/.omp/agent/agents/*.md` → 5 份：builder.md、frontend.md、librarian.md、oracle.md、qa.md
- `ls ~/.agents/skills/poteto-mode/playbooks/*.md | wc -l` → 23
- `ls -d ~/.agents/skills/poteto-* ~/.agents/skills/principle-* | wc -l` → 26

pstack playbook 文件名（23 份，按名单；设计评审类未发现，正文未逐份读）：

authoring-a-skill.md、autonomous-run.md、autopilot-full.md、autopilot-stack.md、babysit.md、bug-fix.md、eval.md、feature.md、hillclimb.md、investigation.md、multi-phase-plan.md、opening-a-pr.md、orchestrate.md、pause-safely.md、perf-issue.md、prototype.md、refactoring.md、runtime-forensics.md、session-pickup.md、shipping.md、trace-forensics.md、visual-parity.md、worktree-cleanup.md

## OMP 子代理契约（task 工具文档摘录）

子任务从空白上下文开始：`Children start blank`；`Subagents have separate kernels`；`steps: ordered stages for one agent`（每个 stage 在前一个完成后再发）；`context: shared` 只在 `tasks[]` 顶层，不重复到每个任务。只读研究与快速分析用 `scout`（read-only, no edits），代码审查用 `reviewer` 与 `security-reviewer`，真实设备验证用 `qa`，架构顾问与计划审查用 `oracle`，历史会话问答用 `seance`。

## pstack 设计前期与对抗评审技能摘录

### architect（~/.agents/skills/architect/SKILL.md）

frontmatter：

```yaml
name: architect
description: "Sketch types, signatures, and module structure before code, then stay in the loop while implementation fills in."
disable-model-invocation: true
```

五阶段：Ground → Sketch → Agree → Implement → Scrap。

- Phase A Ground：用 how 技能建立真实心智模型；重定义所有权或分层时加跑 why。
- Phase B Sketch：跑 arena 出设计草图；要求至少两份结构不同的候选（exhaust-the-design-space）；用 design-red-flags 筛「下一个贡献者是只看已打开文件的 agent」；按接口深度选，偏好更小更简单的公开面。
- Phase C Agree：默认可直接进入实现，不设人类检查点；显式要求时可停；对草图做对抗压力测试用 interrogate。
- Phase D Implement：草图是契约，偏离是信号不是吸收的摩擦。
- Phase E Scrap：实现持续摩擦且草图无法吸收时丢弃草图重新设计，不是往错误设计上补丁。

### arena（~/.agents/skills/arena/SKILL.md）

frontmatter：

```yaml
name: arena
description: "Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it."
disable-model-invocation: true
```

六阶段：Frame → Fan out → Cross-judge → Pick → Graft → Verify。

- Frame：每个候选同一 prompt（prompt 是合同）；3-6 条可打分 rubric；每个候选独立输出位置（git worktree 或 /tmp/arena-<slug>/candidate-<n>/）。
- Fan out：`run_in_background: true` 一次发全部 N 个。
- Cross-judge：cross-judge pool 选一个非父家族模型做只读裁判。
- Pick：逐条按 rubric 打分（不看整体感觉），选未来维护者最容易扩展的基底。
- Graft：逐份重读落选者，只搬值得的一两处，手缝进基底。
- Verify：按 prove-it-works 验证产物。

### interrogate（~/.agents/skills/interrogate/SKILL.md）

frontmatter：

```yaml
name: interrogate
description: "Use for \"interrogate\", \"adversarial review\", \"multi-model review\", \"challenge this\", \"stress test this code\", \"find blind spots\", or \"tear this apart\"."
disable-model-invocation: true
```

核心：Adversaries try to break a change or a design. A finding survives only when a run proves it. Report the findings. Do not apply fixes.

- Frame：范围是用户点名，否则是分支 diff（merge base 到工作树）；先用 in-your-own-words 从用户消息、提交与 PR 描述复述意图。
- Fan out：复用 arena Phase A/B，`interrogate reviewers` 行替换 `arena runners`；每个 adversary 是 general-purpose 子代理，scope 的未提交改动复制进各自 worktree。
- 简报原文：Break this change. Prove each finding with a run against the real code, such as a failing test, a repro script, or command output that shows the wrong behavior. For a design or plan, run a prototype or probe the current tree. Keep repros in your own worktree. Report each finding with a title, the exact command, the output it printed, and the output the intent requires. Leave out anything you did not run. No findings is a valid result.
- Verify：主控重跑每条命令，输出显示失败且失败破坏意图才保留，同根因合并。
- 跳过 arena Phase C/D/E：adversaries 找的是不同失败，verdict 保留每条已验证发现，不选最优。
- Output：Intent、Findings（命令/输出/如何破坏意图/发现者）、Dropped（每个 adversary 的丢弃数与原因）。只报告不修。

## mattpocock 设计前期与规格技能摘录

### grill-with-docs（~/.agents/skills/grill-with-docs/SKILL.md）

frontmatter：

```yaml
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go.
disable-model-invocation: true
```

正文：Call the Skill tool twice, for "grilling" and "domain-modeling"。产物留在 `GLOSSARY.md` 与 ADR。

### grilling（~/.agents/skills/grilling/SKILL.md）

frontmatter：

```yaml
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea.
```

设计树映射：每个决策分支成其下的决策。按轮次推进，frontier 是前提已定的决策；每轮问整个 frontier，编号每个问题并给出推荐答案，等用户回答再进下一轮。

### to-spec（~/.agents/skills/to-spec/SKILL.md）

frontmatter：

```yaml
name: to-spec
description: "Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of what you've already discussed."
disable-model-invocation: true
```

流程：探索仓库现状 → 用领域词汇表与 ADR → 勾画测试接缝（优先已有、最高处、越少越好）→ 按模板写 spec → 发布到 issue tracker 并加 `ready-for-agent` 标签。

### code-review（~/.agents/skills/code-review/SKILL.md）

frontmatter：

```yaml
name: code-review
description: "Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes: Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/spec asked for?)."
```

双轴：Standards（是否符合仓库记录的编码标准）与 Spec（是否忠实实现发起 issue/spec）。两个轴都跑在并行子代理里以免污染上下文，每个子代理以全新上下文窗口启动；本 skill 聚合它们的结果。

## pstack 编排类技能摘录

### orchestrate（~/.agents/skills/poteto-mode/playbooks/orchestrate.md）

定位句：You run the program, never the code. Decide which agent does each piece of work, then check what each one produces. For a standing project handed to one coordinator chat: multi-day, many stacked PRs, dozens to hundreds of subagents, few human turns.

- 拓扑：一个 PR 一个 owner（唯一写者、只由它 push/rebase/retarget）；每个独立任务一个全新 worker（kickoff 带全部所需，含上游报告全文，workers 看不到兄弟）；只有一大片区域多并行 worker 时设 sub-coordinator，最多三层；fork 只在需要 worker 的内建状态时；每个 PR 配一个非作者 verifier（不同模型家族），owner 只在 verifier 对当前 head 通过后合并。
- 监督：每个 kickoff 点名证明工作完成的证据；读 diff/artifact 不只读 worker 总结；Green CI 是 verdict 的输入不是 verdict；发回偏离范围的工作；报告前用 `gh pr view`/`gh pr checks` 核对 PR 实况；停或替换停滞 worker（两次重试后 drop 并重排）；只把真实决定或 blocker 交用户。
- 回复格式：相对目标落地了什么、每个 PR 的实况与 verdict 链接、丢弃与原因、等用户的决定。

### multi-phase-plan（~/.agents/skills/poteto-mode/playbooks/multi-phase-plan.md）

定位句：You own the plan, not the code. The plan is a checklist an owner runs box by box and the operator audits from the evidence. The plan is the deliverable. Do not implement.

- 一两个文件且做法显然时跳过计划；未决问题先按 prototype.md 出原型再写；探索用 poteto-agent 子代理带显式模型；骨架填满每个占位符，写 agent store 的 `docs/` 下；正文按 technical-writing 全文、unslop 后；用 `check-plan.mjs` 逐行修复。
- 验证规则原句：Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. 每个验证块以它开头，live block 强制，十车道在 PR head 用 swarm 驱动真实表面。

### show-me-your-work（~/.agents/skills/show-me-your-work/SKILL.md）

frontmatter：`name: show-me-your-work`，description 为 Keep a reviewable decision trail for long-running or unattended work: a TSV log with one row per decision (what, why, evidence, result)。

- 单 TSV 文件、一行一决策；单元格单行；证据是指针不是段落（commit SHA、PR number、file:line、artifact/trace/screenshot 路径）。
- 列：ts、phase、decision、why、evidence、result（`tests green`/`reverted`/`pixel-diff 0`/`INCONCLUSIVE`/`open`）。
- 记录决策点与检查点，不记每个动作；跳过琐碎与自明项；用 `scripts/log.sh` 或裸 printf，注意以 `= + - @` 开头单元格的前缀引号。


## EGM 环节与已有能力的对照记录

判定依据：按上述技能正文与 OMP task 工具契约实读，不是按文件名。

| 环节 | 已有对应物 | 覆盖判定 |
|---|---|---|
| 设计草图生成 | pstack architect（Ground→Sketch→Agree→Implement→Scrap，Sketch 调 arena 出至少两份结构不同的草图）、arena 六阶段竞赛 | 已有 |
| 对抗评审 | pstack interrogate（每条发现必须用一次真实运行证明，主控重跑验证，只报告不修）、grilling/grill-with-docs | 已有 |
| 设计与规格产出 | mattpocock grill-with-docs（GLOSSARY.md、ADR）、prototype 支线、to-spec→to-tickets | 已有 |
| 规格评审 | mattpocock code-review 双轴，其中一轴是 Spec | 已有，面向票与实现 |
| 书面设计文档的独立上下文评审 | 无 | 缺口 |
| 评审产物链与拒绝降级 | 无 | 缺口（与上一行同属一处） |

## 缺口表述（修正版）

唯一缺口是三件事捆在一起：把「对书面设计文档的独立上下文评审」做成强制门（评审默认发生在没有先前对话的独立代理里，宿主拿不出这种代理时拒绝评审）、五阶段设计评审协议（Zoom Out→Comprehension→Critique→Intermediate Zoom Out→Implementation Readiness，含检查点门与暂停/恢复、跨阶段去重与 Traceability Matrix）、以及 brief → draft → report → docs/designs 的产物链。

对照：pstack 的 `orchestrate`（多 PR 程序编排）、`multi-phase-plan`（计划即交付物，owner 逐框跑、operator 按证据审计）、`show-me-your-work`（决策账本 TSV）能拼出部分编排与审计，但没有现成的五阶段设计评审协议；mattpocock 的 `grill-with-docs`/`to-spec`/`code-review` 覆盖想法打磨、规格产出与规格评审，但没有把「评审者必须在无前情上下文里评审」做成强制门槛。设计草图、对抗评审、规格产出、规格评审四件事本机已有对应物，且 pstack 的对抗评审在证据要求上比 EGM 更严格（每条发现必须跑出真实失败）。
## 证据边界

- 未安装 EGM、未运行其评审、未抓包。
- 未验证 omp 是否执行 Claude 适配器的 `tools` 白名单与 `omitClaudeMd` 两项限制；文档只记录 Muse 的 agent tool projection 不受限制（harnesses.md）。
- 23 份 playbook 只按文件名判断无设计评审类，正文未逐份读。
- 165 为 `~/.agents/skills` 目录条目计数，`ls | wc -l` 与 `ls -d */ | wc -l` 一致。
