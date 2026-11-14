# EGM（Elephant-Goldfish）：设计评审插件的机制与既有技能集的覆盖对照

> Sources: google/elephant-goldfish-model 仓库（README、docs/harnesses.md、AI_POLICY.md、skills/egm-review/SKILL.md、.claude-plugin/agents/design_critic.md），2026-11-14 采集；OpenSSF Scorecard API，2026-11-13 快照；gh api（仓库元数据、commits、PR、issues、contributors、releases），2026-11-14；本机 ~/.agents/skills 与 ~/.omp/agent/agents 清点及 pstack、mattpocock 技能正文，2026-11-14
> Raw: [EGM 仓库一手材料](../../raw/ai-coding-agents/2026-11-14-elephant-goldfish-model.md); [本地技能栈与覆盖对照](../../raw/ai-coding-agents/2026-11-14-local-skill-stack-overlap.md)
> Updated: 2026-11-14

## Overview

EGM（Elephant-Goldfish Model）是 Google 发布的开源 agent 插件（Apache-2.0，README 声明 not an officially supported Google product），把「大象持上下文起草规格、金鱼以全新上下文评审」的模式落成 7 个 skill 与一组评审人格，同一套 skill/agents/resources 通过多份宿主清单分发给 Claude Code、Codex、Antigravity、ChatGPT、omp、Muse、Windsurf 等。主线程评审对象是软件设计规格；`/egm-review-loop` 可评审其他文档，`egm-bootstrap` 与 `egm-drift-report` 面向代码库。它不替换测试与人类判断。

## 七个技能与五阶段评审

- Brainstorm：测试想法，写 `concepts_brief.md`。
- Draft：把 brief 或现有笔记变成 `design_draft.md`，每节暂停等反馈。
- Review：用全新上下文代理分五阶段评审。
- Resolve：处理评审发现并同意修改。
- Review loop：为特定评审任务跑一组配置的评审者。
- Bootstrap：为既有代码库创建或更新文档。
- Drift report：比较已提交文档与当前源码。

`egm-review`（`disable-model-invocation: true`）五阶段：Initial Zoom Out（`[egm-zoom-out, egm-inventive-catalyst]` on full file → `zoom_out_report.md`）、Comprehension Test（`egm-comprehension` 直派，保留 paraphrase → `comprehension_report.md`）、Design Critique（`egm-review-loop` on FeatureRange with `[egm-design, egm-structural, egm-style]` → `critic_report.md`）、Intermediate Zoom Out（`intermediate_zoom_out_report.md`）、Implementation Readiness Test（on DetailedRange with `[egm-implementation-readiness, egm-codebase-details, egm-style]` → `implementation_readiness_report.md`）。跨阶段按 🔴 Blocker / 🟡 Major / 🟢 Nit 汇总并写 Traceability Matrix 到 `consolidated_review_report.md`。

四个预设：Interactive review（逐段检查点）、Consolidated report（不停顿跑完整流程）、Feature spec only（只评设计不含实现）、Implementation plan only（跳到第 9 阶段）。

## 隔离：父轮次与宿主指令文件是两项独立结果

评审要求全新上下文：`A Goldfish runs in a fresh context with no conversation history`；宿主无子代理工具时 `stop and tell the user: a review in the same context is not a Goldfish review`，绝不降级为同上下文评审。但 harnesses.md 明确把「父对话轮次隔离」与「宿主指令文件排除」分成两个独立验证项：`Fresh conversation context does not mean that the host omits its instruction files`。

- Claude：适配器 `omitClaudeMd: true`，`tools: [Read, Grep, Glob]`，`model: inherit`，要求 Remain read-only and use only the task and explicitly supplied review context。
- Codex CLI 0.166.0：即使 `fork_turns: "none"`，评审者仍收到项目 `AGENTS.md` 与用户级 `~/.codex/AGENTS.md`（#237）。
- Antigravity CLI：评审者仍收到项目 `AGENTS.md` 与 `GEMINI.md`（#237）。
- 项目对 #237 的定性：`These are reported host-instruction leaks, not evidence that parent conversation turns leaked`；Codex 测试与记录的 Antigravity 运行只检查父轮次隔离，两者都不验证指令文件排除。

## 多宿主打包与验证状态

`No harness gets a fork of the skill text`：一份 `skills/`、`agents/`、`resources/`，通过 `plugin.json`（canonical，Agent Plugins 1.0.0）与各兼容清单映射。Claude 清单里 `.claude-plugin/agents/*.md` 是适配器，读取共享人格并设 Claude 只读工具与上下文隔离。

- Antigravity CLI、Claude Code、Codex：通过自动化安装与端到端 workflow fixture。
- omp（#186）：用 `.claude-plugin/plugin.json`（Claude-compatible fallback）；skill 以 `/skill:egm-<command>` 调用（omp 无 `/egm-*` 命名空间）；社区在 omp v18.12.6 验证 7 个 skill 全部可发现可解析、9 个评审人格注册为原生 task agents；端到端 fixture 未自动化。
- Muse（1.4.14）：插件有效、7 skill 与 10 个 agent adapter 全支持，但 every agent tool projection is unsupported，因此 Claude 工具白名单不限制 Muse 评审者。
- Claude Cowork（#105）、ChatGPT Work（#106）：有可用安装路径，云端 trace 验证有缺口。
- Windsurf（更名 Devin Desktop，2026-06-02，#376）：实验性 workspace 路由；Devin CLI 3000.12.43（2026-11-10）通过路由、人类暂停、只读评审者与父标记隔离，但每次文件写入被拒，工作流未跑到最终产物。

## 供应链与治理

- Scorecard 6.7（2026-11-13 快照，commit 964a4f1，scorecard v5.6.0）：Code-Review、CI-Tests（30/30 PR 有 CI）、Token-Permissions、Dangerous-Workflow、Vulnerabilities、Dependency-Update-Tool、Binary-Artifacts、License、Security-Policy、Contributors 均为 10；Pinned-Dependencies 5（0/7 pipCommand 按 hash 钉住，29/29 GitHub Action 与 3/3 npmCommand 已钉）；Branch-Protection 6（1 人 approve，无强制 status check）；Maintained（项目创建不足 90 天）、Signed-Releases、SAST（0/30 提交）、Fuzzing、CII-Best-Practices 为 0；Packaging -1（无发布 workflow）。
- 发布：v0.1.0（2026-10-27）与 v0.1.1（2026-11-06）资产只有 `egm-claude-*.zip`、`egm-openai-*.zip`、`SHA256SUMS`，无签名无 provenance。`egm-claude-0.1.1.zip` 下载 198、`egm-openai-0.1.1.zip` 下载 140。v0.1.1 `isImmutable: false`（#423）。
- #423（open）：保护 release tag、发布不可变、随资产发布构建 provenance；当前只有一条规则集且只作用于默认分支，无规则阻止 `v*` 标签被移动或删除。
- #426（closed）：把 attestation bundle 附加到 draft release（`egm-<tag>.intoto.jsonl`），已合并但尚未进入任何 release。
- AI_POLICY.md：每个 PR 必须有人类作者亲自审查、测试并验证每一行改动；贡献者必须在评审中直接答辩，禁止把 maintainer 评论拷进 LLM 再贴未验证回复；规划 feature 或大改动（>100 非测试行或 ≥3 个 `skills/`、`agents/` 核心文件）须先 Feature Inquiry（`design-ready`），再合并一份用 brainstorm/draft/review 创作的 `docs/designs/<name>.md`（`pr-ready`），最后实现 PR；禁止把单个逻辑改动拆成多个小 PR 绕阈值。
- 集中度：contributors 中 `n3wth` 123 次，`dependabot` 10，`briansuchy` 6，其余个位数；近 30 条提交 author 主要是 Oliver Newth 与 n3wth，committer 一律 GitHub；#432 的 merged_by 为 n3wth。单维护者主导，第二梯队薄。
- #439（open）：自家 PR triage bot 的 `_neutralize_bare_mentions` 在 fenced block 内一个孤立反引号下被绕过——`@mention` 中和防护的真实缺陷，自己发现并跟踪。

## 覆盖对照：设计草图、对抗评审与强制性的差别

| 环节 | 已有对应物 | 覆盖判定 |
|---|---|---|
| 设计草图生成 | pstack `architect`（Ground→Sketch→Agree→Implement→Scrap，Sketch 调 `arena` 出至少两份结构不同的草图）、`arena` 六阶段竞赛 | 已有 |
| 对抗评审 | pstack `interrogate`（每条发现必须用一次真实运行证明，主控重跑验证，只报告不修）、`grilling`/`grill-with-docs` | 已有 |
| 设计与规格产出 | mattpocock `/grill-with-docs`（产物留在 `GLOSSARY.md` 与 ADR）、`/prototype` 支线、`/to-spec` → `/to-tickets` | 已有 |
| 规格评审 | mattpocock `/code-review` 双轴，其中一轴是 Spec | 已有，面向票与实现 |
| 五阶段设计评审协议 | 无 | 缺口 |
| 书面设计文档的独立上下文评审 | 无 | 缺口 |
| 评审产物链与拒绝降级 | 无 | 缺口（与上一行同属一处） |

OMP 子代理契约本身提供「全新上下文」：`Children start blank`、子代理有独立内核、`scout` 只读、`reviewer`/`security-reviewer` 评审、`qa` 真机验证、`oracle` 架构顾问、`seance` 历史问答。本机另有 5 份自定义 agent（builder、frontend、librarian、oracle、qa）。

## 唯一缺口与最小补法

缺口是三件事捆在一起：把「对书面设计文档的独立上下文评审」做成强制门（评审默认发生在没有先前对话的独立代理里，宿主拿不出这种代理时拒绝评审）、五阶段设计评审协议（Zoom Out→Comprehension→Critique→Intermediate Zoom Out→Implementation Readiness，含检查点门与暂停/恢复、跨阶段去重与 Traceability Matrix）、以及 brief → draft → report → docs/designs 的产物链。

对照：pstack 的 `orchestrate`（多 PR 程序编排）、`multi-phase-plan`（计划即交付物，owner 逐框跑、operator 按证据审计）、`show-me-your-work`（决策账本 TSV）能拼出部分编排与审计，但没有现成的五阶段设计评审协议；mattpocock 的 `grill-with-docs`/`to-spec`/`code-review` 覆盖想法打磨、规格产出与规格评审，但没有把「评审者必须在无前情上下文里评审」做成强制门槛。设计草图、对抗评审、规格产出、规格评审四件事本机已有对应物，且 pstack 的 `interrogate` 在证据要求上比 EGM 更严格。

最小补法：在 `~/.omp/agent/agents/` 加一个 `design-reviewer` agent，只接收设计文档路径与代码路径、在无前情上下文里按 `interrogate` 的证据要求审查、产物写文件；再在项目规则里要求 `docs/designs/` 下的设计在实现前必须过一次。

## 采纳判断（推断）

不装。理由：机制无新增（子代理新上下文是本机出厂行为）；差别集中在强制门、五阶段协议与产物链，用一条规则加一个 agent 即可补齐；供应链成本（62 天项目、单维护者主导、发布无签名、omp 端到端未验证）与入口心智成本（再注入 7 个 skill 与一批人格）不值得为一份 prompt 包承担。

## 边界与未验证项

- 主线评审对象是软件设计规格；`/egm-review-loop` 可评审其他文档，`egm-bootstrap` 与 `egm-drift-report` 面向代码库。
- 未安装、未运行 EGM、未抓包；「金鱼真的看不到前情」只有设计与配置层证据，缺行为层复现（canary 实测）。
- 未验证 omp 是否执行 Claude 适配器的 `tools` 白名单与 `omitClaudeMd`；文档只记录 Muse 的 agent tool projection 不受限制。
- 23 份 pstack playbook 只按文件名判断无设计评审类，正文未逐份读。
- star 时间序列与账号年龄分布未核实（REST 404、GraphQL 边为空）。
- 165 为 `~/.agents/skills` 目录条目计数。


## See Also

- [pstack 技能地图与行为](pstack-skill-map-and-behaviors.md) — pstack 内部 skill 行为面
- [skill 系统的两种组织轴](skill-system-organization-axes.md) — 组织轴的一般视角
- [pstack 移植版生态全景](pstack-ports-landscape.md) — pstack 移植版生态
- [mattpocock/skills：两轴分类的工程 skill 集](mattpocock-skills-system.md) — 另一套可安装技能的组织方式
- [ub-mode 配套工具：安装、升级与项目运行方式](../agent-tooling/ub-mode-companion-tools.md) — 确定性质量检查工具
- [同名 skill 的遮蔽与选型](same-name-skills-tdd-teach.md) — 技能名遮蔽
