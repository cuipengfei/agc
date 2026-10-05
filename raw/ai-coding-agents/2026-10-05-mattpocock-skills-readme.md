# mattpocock/skills README 与 ask-matt 流程图

> Source: GitHub repo_view + README 全文（github.com/mattpocock/skills）；ask-matt SKILL.md 全文（本地安装副本 ~/.agents/skills/ask-matt，即该仓库的 skills 安装版）
> Collected: 2026-10-05
> Published: Unknown

## 仓库数据（repo_view，2026-10-05）

mattpocock/skills — "Skills for Real Engineers. Straight from my .agents directory." — Stars: 275,890 — Forks: 23139 — Primary language: Shell — Homepage: https://aihero.dev/skills

## README 哲学声明（原文摘录）

> Approaches like GSD, BMAD, and Spec-Kit try to help by owning the process. But while doing so, they take away your control and make bugs in the process hard to resolve.
> These skills are designed to be small, easy to adapt, and composable. They work with any model. They're based on decades of engineering experience.

安装方式两种：Claude Code 官方 marketplace 插件（`claude plugins install mattpocock-skills`，只读捆绑、自动更新），或 `npx skills@latest add mattpocock/skills`（可复制编辑的 skill 文件）。README 明确「installing both leaves you with every skill twice」。装完要求每个仓库跑一次 `/setup-matt-pocock-skills`（配置 issue tracker、triage 标签、文档目录）。

## Reference 节：两轴分类与 27 个 skill 清单（原文）

> These split on one axis: who can invoke them. **User-invoked** skills are reachable only when you type them (e.g. `/grill-me`); their job is to orchestrate. **Model-invoked** skills can be invoked by you _or_ reached for automatically by the agent when the task fits; they hold the reusable discipline. A user-invoked skill may invoke model-invoked skills, but never another user-invoked one.

**Engineering / User-invoked（11）**：ask-matt、grill-with-docs、triage、improve-codebase-architecture、setup-matt-pocock-skills、to-spec、to-tickets、implement、implement-spec、wayfinder、retro。

其中 ask-matt 的定义原文：

> **ask-matt**: Ask which skill or flow fits your situation. A router over the user-invoked skills in this repo.

**Engineering / Model-invoked（9）**：prototype、diagnosing-bugs、research、tdd、domain-modeling、codebase-design、code-review、pr、wizard。

其中 code-review 与 implement-spec 的 subagent 用法原文：

> **code-review**: Two-axis review of the diff since a fixed point: **Standards** ... and **Spec** ..., run as parallel sub-agents so neither pollutes the other.
> **implement-spec**: ... Works the tickets as a task graph, running implementer subagents across the ready frontier for maximum concurrency, then closes out with `/code-review`.

**Productivity / User-invoked（5）**：grill-me、handoff、teach、to-questionnaire、wait-what。

**Productivity / Model-invoked（2）**：grilling、writing-for-agents。

合计 11 + 9 + 5 + 2 = 27。

## ask-matt SKILL.md 主线流程（本地安装副本摘录）

> A **flow** is a path through the skills. Most paths run along one **main flow**, and two **on-ramps** merge onto it. Everything else is standalone, or a vocabulary layer that runs underneath.

主线 idea → ship 四步：

1. `/grill-with-docs` 访谈打磨想法（有工作目录时优先于无状态的 `/grill-me`），必要时经 `/handoff` 往返 `/prototype` 支线。
2. 多会话构建走 `/to-spec` → `/to-tickets`（tracer-bullet tickets，声明 blocking edges），然后 `/implement` 逐票实现（票间 `/clear`），或 `/implement-spec` 一把跑完整张任务图；单会话直接 `/implement`。实现由 `/tdd` 驱动、`/code-review` 收尾。
3. PR 由 `/pr` 塑形（model-invoked，agent 自动取用）。
4. `/retro` 闭环：回顾会话并建议改进 agent 的环境（导航、自动检查、coding standards、steering 文件），把机械错误变成确定性检查。

三条 on-ramp：`/triage`（只处理外来 issue，不处理 to-tickets 产出的票）、`/diagnosing-bugs`（硬 bug：先要一条能变红的反馈环）、`/wayfinder`（单次会话装不下的大工程，产出 decision tickets，清空后并入主线 `/to-spec`）。

上下文卫生规则：grilling 到 to-tickets 保持一个不断裂的上下文窗口；每票 `/implement` 全新开始；`/retro` 在被回顾的会话内运行。限制是 smart zone（约 150k tokens，原文给出 https://www.aihero.dev/ai-coding-dictionary/smart-zone）。

Phase boundaries 五选项：Continue、`/clear`、`/handoff`、Subagent、`/compact`（默认）。

Vocabulary 层：`/domain-modeling`（领域语言、GLOSSARY.md、ADR）与 `/codebase-design`（深模块词汇：module、interface、depth、seam、adapter、leverage、locality）。
