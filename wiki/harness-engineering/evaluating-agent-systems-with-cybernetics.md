# 用控制论评估 Agent 系统

> Sources: bolu.dev，2026-02-26；Rocky Ding（知乎），Unknown；铁锤001（掘金），2026-04-13；邬俊杰（腾讯云开发者/CSDN），2026-04-17；warm3snow（博客园），2026-03-19；Ryan Lopopolo（OpenAI），2026-02-11；George Zhang（X @odysseus0z），Unknown；Sam Ruby（intertwingly.net），2026-09-25；Sam Ruby（intertwingly.net），2026-09-27
> Raw: [bolu.dev 原文](../../raw/harness-engineering/2026-10-02-bolu-ai-agent-control-system.md); [知乎文章第 10 章摘录](../../raw/harness-engineering/2026-10-03-zhihu-ai-agent-harness-engineering.md); [掘金文章](../../raw/harness-engineering/2026-10-03-juejin-harness-engineering-cybernetics.md); [CSDN 文章](../../raw/harness-engineering/2026-10-03-csdn-harness-engineering-cybernetics.md); [博客园文章](../../raw/harness-engineering/2026-10-03-cnblogs-harness-engineering-openai.md); [OpenAI 原文](../../raw/harness-engineering/2026-10-03-openai-harness-engineering.md); [George Zhang 原帖存档](../../raw/harness-engineering/2026-10-03-george-zhang-harness-engineering-cybernetics.md); [Sam Ruby 两篇](../../raw/harness-engineering/2026-10-05-sam-ruby-notation-ashby.md)
> Updated: 2026-10-05

## Overview

2026 年 2 月 OpenAI 发表 harness engineering 实践后，中文技术圈出现了一批把它和控制论（cybernetics）/控制理论（control theory）联系起来的解读。本文把这批材料压缩成一个可复用的方法论：用控制论的四组问题检查一个 Agent 系统——基础部件是否齐全、规划方式是什么、状态估计与稳定性如何、多环协调与工程修复手段有没有。配套给出各篇来源的分工地图和每篇独有的证据。

## 为什么控制论适用


George Zhang 的论证：同一个模式历史上出现三次。1780s 瓦特离心调速器，工人从手拧阀门变成设计调速器；Kubernetes，工程师声明期望状态、控制器持续调和（「The same root that gave Kubernetes its name」）；现在 Harness Engineering，工程师设计环境、Agent 写代码。Wiener 1948 年命名了这个模式：cybernetics，来自希腊语 κυβερνήτης（舵手）。

> Same pattern each time. Norbert Wiener named it in 1948: cybernetics, from the Greek κυβερνήτης — steersman.

bolu.dev 给出最简主张：

> An agent is a controller wrapped around a world model and a set of actuators.

并主动限定类比边界：经典控制假设干净状态、已知动力学、显式代价，Agent 全没有——但「messy control problem」仍然是 control problem。

CSDN（邬俊杰）补上控制论成立的两个前提：被控对象必须有多种可能性（可能性空间），人可以在可能性之间做选择。AI 生成代码的可能性空间为 M，加规范约束（必须用 C++、只能基于基础库、大驼峰命名）就是在把 M 缩小到 m。

## 检查清单一：基础部件

- **控制器**：谁在做决策？知乎文章（Rocky Ding）把 Harness 定义为「围绕基础大模型构建的执行控制层」，给出系统表达式 `\text{Outcome}=F(M,H,E,T)`（M 模型、H Harness、E 环境、T 任务），并主张评估应报告 **model–harness pair** 而不是把得分全归功于模型。
- **世界模型**：系统对环境的内部预测。LLM 的训练先验就是世界模型。
- **执行器**：工具调用。掘金文章（铁锤001）的组件映射：约束机制=控制器、AI Agent=被控对象、反馈回路=传感器、控制平面=控制系统。
- **反馈回路**：CSDN 用老鹰抓兔子说明控制能力累积——每次俯冲把可能性空间从 M 缩小到 M1、M2 直到 m，总控制能力 (M/M1)*(M1/M2)*(M2/m)=(M/m)。

## 检查清单二：MPC 与规划

- **规划方式**：bolu.dev 主张正确心智模型是模型预测控制（MPC）——向前模拟几步、只执行第一个动作、从新测量重新规划（receding horizon）。
- **评估单位是轨迹不是端点**：两个系统可能都完成任务，但一个紧密收敛、另一个灾难性不稳定只是碰巧在预算用完前走运。

> Treat agent runs as trajectories, not outputs.

- **错误复合**：单步评估不够，小误差在闭环里逐步放大。

## 检查清单三：状态估计与稳定性

- **上下文管理是状态估计**：

> Summaries are not just token-budget hacks. They are your state estimator.

- **三种失败模式**（bolu.dev 与掘金文章各自独立给出）：收敛（失败数单调下降）、振荡（两种互斥局部修复间反复横跳，掘金归因为反馈过于敏感/约束冲突）、发散（每次迭代错误更多，掘金归因为正反馈；bolu.dev 指出这就是常被叫作「幻觉」的现象，但 divergence 更精确——问题不是单个信念为假，而是闭环系统在远离目标）。掘金还多给了一个：**滞后**——反馈延迟，Agent 基于过时信息决策。
- **证明 vs 工具化**：Agent 没有干净的 Lyapunov 函数，但可以日志化进度代理（失败测试数、编译错误数、diff 大小、同区域重复编辑、无新信息重复执行同命令），用来区分进展、抖动和崩溃。

## 变异度定律与规约下界

Sam Ruby 在 `Partly in the Right` 中引入 Ashby 必需变异度定律（Law of Requisite Variety），补上控制论框架缺失的「规约复杂度下界」维度。W. Ross Ashby 在 1956 年《An Introduction to Cybernetics》中表述为：

> only variety can destroy variety.

Sam Ruby 引 Chris Ford 的转述（经 Sam Ruby 转述，未独立核验 LinkedIn 原帖）：

> Ashby's Law of Requisite Variety sets a hard limit on what is possible with spec-driven development. Ashby showed that the controller must be as complex as the relevant distinctions in the state of the thing being controlled. [...] there is a lower bound on spec complexity that cannot be overcome by smarter models.

通俗说：控制一个系统的东西必须能区分至少与它需不同响应的场景一样多的状态。Ford 的例子是恒温器：它不必建模每个温度值，但必须能区分太热/太冷/正好。Sam Ruby 把 spec 当恒温器、生成代码当房间。

**六案例归并为五类×信息来源×校验方式**：Sam Ruby 在 `Partly in the Right` 中描述六人对 agent 能力的矛盾观察，其中两个移植案例（DHH 与 Sam Ruby 自己）因信息来源与校验方式相同而合并为一行。下表解释为什么这些矛盾描述都成立——每个案例的信息来源与校验方式不同。

|                                 | 信息从哪来               | 什么校验结果           |
| ------------------------------- | ------------------------ | ---------------------- |
| 移植                             | 现有系统                 | 现有系统，机械地       |
| 重构                             | 现有应用                 | 人点击，或 GIF         |
| 绿地，测试良好                   | 惯例，加 owner 意图       | 测试                   |
| 新功能，逐 PR                     | 无特定人                 | 每个 PR 各自           |
| 成熟系统，无测试                 | 无                       | 无                     |

「Port HEY to Rust」是五个词，但它不突破 Ford 的下界——它借力：现有邮件服务器持有全部信息，prompt 只是指向它。这就是为什么 37signals 的屏保 PR 把大量篇幅花在 `oracle.sh` 上。oracle 即规约。

新功能无来源可借。有人必须提供区分：该做什么、不能破坏什么、「完成」意味什么。在 Basecamp 5，每个 PR 各自被审查，损害在 PR 之间。一次看一个 PR 的审查者看不到三十个 PR 合起来的效果。更好的模型不改变这点；它产出更多需要校验的东西。

**「just trust the model」的成立条件**：不是模型问题，是信息环境问题。Obie 能信，因测试与惯例已持有大部分信息。他朋友不能，因什么都没有。同一模型，不同信息环境，不同结果。

**rigor 迁移而非消失**：Sam Ruby 在七月写过「rigor doesn't vanish when the agent writes the code, it migrates」——上游进 spec、下游进测试套件、进类型与约束。Ashby 补的是 *why*：有下界，故必须去某处。

**规约下界在 Rails 中的可见位置**：声明（`has_many`、`validates`）是惯例让你省略的部分；每个 `def` 是惯例用尽处，因为此应用需要惯例没有的东西。Ford 的下界与这条边界重合。

**注意**：Sam Ruby 第 7 篇的五项 source-of-truth 条件（适配上下文、说一次、保留意图、确定性、模型见过）与 Ashby 下界的对应关系是本会话的综合解读，非原文明说；Sam Ruby 两篇分别提了五项条件与 Ashby 下界，未做显式映射。

## 检查清单四：多环控制与工程修复

- **多速率控制**：内环做局部工作，外环决定内环何时运行；掘金给出三层版本——战略控制（人类：项目目标、资源分配）、战术控制（控制平面：任务分解、依赖协调）、执行控制（Agent 自主：代码生成、测试执行）。
- **外环采样快于内环收敛**会导致部分完成的控制片段叠加：重叠工作、过时目标、摘要反映一个已不存在的世界。
- **死区（deadband）**：忽略小偏差，防止每个小波动都触发重规划（chattering）。
- **滞回（hysteresis）**：切换模式需要比留在当前模式更强的信号，防止策略间翻飞。
- **积分饱和（integrator windup）**：工具挂了 Agent 还「更努力」重试，恢复后严重过冲；修法是钳制重试、限制反思深度、反复失败后降低编辑幅度、强制冷却或人工接管。
- **反馈设计四原则**（掘金）：及时性、准确性、可行动、适度性。
- **反馈质量问题**：验证器慢、稀疏或模糊时，Agent 大部分时间在开环飞行。

## OpenAI 实践的对应

OpenAI 原文（Ryan Lopopolo，2026-02-11）的数据：从空 git 仓库开始，five months 后仓库约 a million lines of code，roughly 1,500 pull requests，由 three engineers 驱动 Codex 完成，人均 3.5 PRs per engineer per day，团队增至 seven engineers 后吞吐量还在上升；估计用时约为手写的 1/10th。核心原则：

> Humans steer. Agents execute.

五大实践与控制论的对应（细节见博客园 warm3snow 的拆解）：

- 让应用对 Agent 可读（Git worktree 实例、Chrome DevTools、LogQL/PromQL）→ 传感器建设；Codex 单任务可持续工作超过 6 小时。
- 代码仓库即记录系统 → 状态估计外化；AGENTS.md 只是约 100 行的目录，指向 docs/ 结构化文档，OpenAI 称之为 progressive disclosure，并有 doc-gardening Agent 清理过时文档。
- 架构约束规范品味 → 约束解空间；自定义 linter 的错误信息内嵌修复指令。
- 高吞吐量改变合并理念 → 「等待的成本高于纠错的成本」，快速回滚优于严格审查。
- 对抗熵增 → 负反馈防自繁殖；团队曾每周五花 20% of every Friday 清理 "AI slop"，后来把 golden principles 编码进仓库，后台清理 Agent 持续跑重构 PR。

知乎文章的三根支柱及实证：评估闭环（CORE-Bench 修复评分 bug 后 Opus 4.5 从 42% 跳到 95%，模型未变）；架构约束（LangChain 只改 Harness 架构约束，Terminal Bench 2.0 通过率从 52.8% 到 66.5%；Vercel 删掉 80% 工具反而步骤更少、效果更好）；记忆治理（3行基础 prompt 加完善记忆治理约等于 200 行专家 prompt，且前者持续进化）。

## 资源地图

| 来源 | 角色 | 独有内容 |
|---|---|---|
| OpenAI 原文 | 源头实践报告 | 全部一手数据与五大实践 |
| 博客园（warm3snow） | 最贴近原文的中文拆解 | 黄金原则表、四个局限 |
| 知乎（Rocky Ding） | 工程体系化 | Outcome 公式、三根支柱、七层架构、实证数据 |
| 掘金（铁锤001） | 控制论组件级映射 | 稳定性三问题、反馈四原则、三层控制架构、多 Agent 协调四挑战 |
| CSDN（邬俊杰） | 控制论基础概念 | 可能性空间、自繁殖、共轭控制（曹冲称象 L-1AL）、业务相关/无关传感器、突变理论 |
| bolu.dev | 控制理论视角的 Agent 观 | MPC/退避视界心智模型、状态估计、三态失败模式、deadband/hysteresis/anti-windup |
| George Zhang | 为什么是控制论 | 三次模式、反馈回路层级、生成-验证不对称，「Agents don't learn through osmosis」 |
| Sam Ruby | 变异度定律与规约下界 | Ashby 必需变异度定律、六案例×信息来源×校验方式表格、notation 留顶、rigor 迁移而非消失 |

阅读顺序建议：George Zhang（为什么）→ OpenAI 原文（做了什么）→ 博客园（中文拆解）→ 掘金或 bolu.dev（控制论映射）→ 知乎（工程体系）→ CSDN（概念底子）→ Sam Ruby（变异度下界）。

## See Also

- [双层循环操控模型](dual-loop-steering-model.md) — 徐昊课程框架与 Böckeler harness engineering 的术语对应
