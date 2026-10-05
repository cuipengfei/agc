# skill 系统的两种组织轴：pstack 与 mattpocock/skills 对照

> Sources: poteto-mode SKILL.md 原文, 2026-10-05; mattpocock/skills README 与 ask-matt, 2026-10-05
> Raw: [pstack-poteto-mode-skill](../../raw/ai-coding-agents/2026-10-05-pstack-poteto-mode-skill.md); [mattpocock-skills-readme](../../raw/ai-coding-agents/2026-10-05-mattpocock-skills-readme.md)
> Updated: 2026-10-05

## Overview

pstack 与 mattpocock/skills 是同代工程 skill 集的两个代表，规模相近（50 vs 27 个 skill），但组织轴、路由强度、编排密度都不同。pstack 按任务类型组织、强制路由；mattpocock 按调用者组织、路由可选。两者的对照维度可以套用到其他 skill 系统的评估上。

## 组织轴

- **pstack（任务类型轴）**：50 个 skill = 24 个 `principle-*` 决策规则 + 26 个功能 skill，另配 23 份 playbook。每个任务先由 poteto-mode 分类到一份 playbook，playbook 再调用功能 skill，principle 在岔路口做决策。三层：路由 → 流程 → 工序/判例。
- **mattpocock（调用者轴）**：27 个 skill 分 user-invoked（编排）与 model-invoked（纪律）两层，明文规定 user-invoked 不可平级互调。流程知识集中写在 ask-matt 的一张流程图里（主线 + 三条 on-ramp + vocabulary 层），skill 自身保持小颗粒。

## 路由强度

- pstack 的 `poteto-mode` 标了 `disable-model-invocation: true`，只能显式调用，但一旦调用就是必经入口：匹配 playbook、复制其步骤为 todolist、逐条执行，无匹配时由 figure-it-out 设计定制流程。路由器是司机。
- mattpocock 的 `ask-matt` 只回答「该用哪个」，用户平时直接叫具体 skill。README 明确批评流程拥有型框架（GSD、BMAD、Spec-Kit）夺走控制。路由器是地图。

## 编排密度

- pstack 内建完整的多 agent 体系：subagent 默认后台运行、按角色配模型（代码 `grok-4.7-xhigh-fast`、判断与文书 `claude-opus-5-5-max`）、三个评审团类角色（arena runners、interrogate reviewers、cross-judge pool）、专门的多 PR 自主 playbook（autopilot-full / autopilot-stack / orchestrate）。
- mattpocock 的 subagent 集中在两处：`/implement-spec` 的并行 implementer 和 `/code-review` 的双轴并行评审，其余 skill 单线程执行。

## 自主与验证

- pstack 的 Autonomy 节：可逆操作直接做、不可逆写操作（force-push、部署、删数据、对客户发消息）必暂停；原则层含 Prove It Works、Explain the Number 等验证规则，回复连文风都被规范（短陈述句、每个论断带证据标签）。
- mattpocock 的验证文化集中在 `/tdd` 红绿循环与 `/diagnosing-bugs` 的「先要变红反馈环」；自主性靠上下文管理规则（smart zone、phase boundary、票间 `/clear`）保证质量。

## 适用判断（推断）

以下为从机制声明推出的判断，未经两边实战对照：想让 agent 接管长流程、多 PR 程序，pstack 的编排密度匹配；想保住对每个动作的控制、把 skill 当可组合的纪律库，mattpocock 的结构匹配。两者都装了 mattpocock 自述会冲突的点不在此处——两者的 skill 名几乎不重叠，共存的主要成本是两套入口心智。

## See Also

- [pstack 移植版生态全景](pstack-ports-landscape.md)
- [mattpocock/skills：两轴分类的工程 skill 集](mattpocock-skills-system.md)
