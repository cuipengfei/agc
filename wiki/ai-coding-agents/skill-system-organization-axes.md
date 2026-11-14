# skill 系统的两种组织轴：pstack 与 mattpocock/skills 对照

> Sources: poteto-mode SKILL.md 原文, 2026-10-05; mattpocock/skills README 与 ask-matt, 2026-10-05; 仓库树枚举与抽取（backnotprop/pstack@25abb38559ddbabec563646224d09eff9a250eca，已安装 56 个 SKILL.md 逐字节比对一致）, 2026-10-29; 两仓同名 tdd 与 teach 对照（pstack@f104aa8、mattpocock/skills@4ae2317）, 2026-11-07
> Raw: [pstack-poteto-mode-skill](../../raw/ai-coding-agents/2026-10-05-pstack-poteto-mode-skill.md); [mattpocock-skills-readme](../../raw/ai-coding-agents/2026-10-05-mattpocock-skills-readme.md); [pstack-skill-graph-extraction](../../raw/ai-coding-agents/2026-10-29-pstack-skill-graph-extraction.md); [tdd 与 teach 四份 SKILL.md 全文与换源记录](../../raw/ai-coding-agents/2026-11-07-tdd-teach-dual-repo-versions.md); [EGM 仓库一手材料](../../raw/ai-coding-agents/2026-11-14-elephant-goldfish-model.md); [本地技能栈与覆盖对照](../../raw/ai-coding-agents/2026-11-14-local-skill-stack-overlap.md)
> Updated: 2026-11-14

## Overview

pstack 与 mattpocock/skills 是同代工程 skill 集的两个代表（pstack 2026-10-05 时点 50 个技能，mattpocock 27 个），但组织轴、路由强度、编排密度都不同。pstack 按任务类型组织、强制路由；mattpocock 按调用者组织、路由可选。两者的对照维度可以套用到其他 skill 系统的评估上。

> **更新（2026-10-29）**：pstack 规模按 commit 25abb38 复核为 58 个注册技能（24 principle + 34 功能）+ 3 个 benny 自动化技能（不进 slash 菜单），共 61 个 SKILL.md；mattpocock/skills 侧未同日复核，27 仍为 2026-10-05 采集值。frontmatter 机制字段级核实：60/61 技能设 `disable-model-invocation: true`（唯一例外 setup-pstack）；typescript-best-practices 独有 `paths: ["**/*.ts", "**/*.tsx"]`。详见 [pstack 技能地图与行为](pstack-skill-map-and-behaviors.md)。

## 组织轴

- **pstack（任务类型轴）**：2026-10-05 快照 50 个 skill = 24 个 `principle-*` 决策规则 + 26 个功能 skill；2026-10-29 复核（commit 25abb38）为 58 注册 + 3 自动化，另配 23 份 playbook。每个任务先由 poteto-mode 分类到一份 playbook，playbook 再调用功能 skill，principle 在岔路口做决策。三层：路由 → 流程 → 工序/判例。
- **mattpocock（调用者轴）**：27 个 skill 分 user-invoked（编排）与 model-invoked（纪律）两层，明文规定 user-invoked 不可平级互调。流程知识集中写在 ask-matt 的一张流程图里（主线 + 三条 on-ramp + vocabulary 层），skill 自身保持小颗粒。

## 路由强度

- pstack 的 `poteto-mode` 标了 `disable-model-invocation: true`，只能显式调用，但一旦调用就是必经入口：匹配 playbook、复制其步骤为 todolist、逐条执行，无匹配时由 figure-it-out 设计定制流程。pstack 用这套字段把几乎所有技能都限制为显式调用或被其他技能调用（60/61 技能设此标志，唯一例外 setup-pstack，另有 typescript-best-practices 用 `paths` 字段在编辑 TS 文件时由宿主自动加载）。路由器是司机。
- mattpocock 的 `ask-matt` 只回答「该用哪个」，用户平时直接叫具体 skill。README 明确批评流程拥有型框架（GSD、BMAD、Spec-Kit）夺走控制。路由器是地图。

## 编排密度

- pstack 内建完整的多 agent 体系：subagent 默认后台运行、按角色配模型（代码 `grok-4.7-xhigh-fast`、判断与文书 `claude-opus-5-5-max`）、三个评审团类角色（arena runners、interrogate reviewers、cross-judge pool）、专门的多 PR 自主 playbook（autopilot-full / autopilot-stack / orchestrate）。
- mattpocock 的 subagent 集中在两处：`/implement-spec` 的并行 implementer 和 `/code-review` 的双轴并行评审，其余 skill 单线程执行。

## 自主与验证

- pstack 的 Autonomy 节：可逆操作直接做、不可逆写操作（force-push、部署、删数据、对客户发消息）必暂停；原则层含 Prove It Works、Explain the Number 等验证规则，回复连文风都被规范（短陈述句、每个论断带证据标签）。
- mattpocock 的验证文化集中在 `/tdd` 红绿循环与 `/diagnosing-bugs` 的「先要变红反馈环」；自主性靠上下文管理规则（smart zone、phase boundary、票间 `/clear`）保证质量。

## 第三种案例：工作阶段轴（EGM）

EGM 的主线按产物阶段组织：brief（brainstorm）→ draft → report（review/resolve）→ docs/designs（批准规格），每步由前一步的产物驱动；但各技能可按需单独使用，README 明确写 `You can use each skill when you need it. You do not have to follow the full sequence.` `egm-review` 标 `disable-model-invocation: true` 只表示必须显式调用，不表示阶段顺序强制；真正的硬门槛是「评审必须发生在全新上下文」——宿主无子代理工具时拒绝评审，绝不降级为同上下文评审。与 pstack 的强制路由不同，EGM 的强制点是评审隔离而不是任务类型分类；与 mattpocock 的可选导航不同，EGM 把隔离设成硬门槛。这是「对照维度可套用到其他 skill 系统」的第三个实例。详见 [EGM 设计评审插件](egm-design-review-plugin.md)。

## 适用判断（推断）

以下为从机制声明推出的判断，未经两边实战对照：想让 agent 接管长流程、多 PR 程序，pstack 的编排密度匹配；想保住对每个动作的控制、把 skill 当可组合的纪律库，mattpocock 的结构匹配。两者都装了 mattpocock 自述会冲突的点不在此处——两者的 skill 名几乎不重叠，共存的主要成本是两套入口心智。

> **Status: Disputed**（2026-11-07）
> 上文「两者的 skill 名几乎不重叠」与实测不符。pstack 与 mattpocock/skills 各有 `tdd` 与 `teach`，pstack 的 `tdd` 依赖共享安装中 matt 的那份（`poteto-help`、`poteto-mode/playbooks/bug-fix.md`、`implement`、`implement-spec` 都调用 `/tdd`）。共存成本因此包含一处同名遮蔽：一个名字只能装一个来源。两版差别见 [同名 skill 的遮蔽与选型](same-name-skills-tdd-teach.md)。

## See Also

- [pstack 移植版生态全景](pstack-ports-landscape.md)
- [mattpocock/skills：两轴分类的工程 skill 集](mattpocock-skills-system.md)
- [EGM 设计评审插件：机制与覆盖对照](egm-design-review-plugin.md)
