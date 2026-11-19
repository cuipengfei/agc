# pstack 与 matt 的同场景选型

> Sources: 本机 skills lock 计数与 SKILL.md frontmatter 逐字读取, 2026-11-20
> Raw: [同场景配对 frontmatter 摘录](../../raw/ai-coding-agents/2026-11-20-pstack-matt-same-scenario-pairs.md); [本机 22 本 playbook 逐本调用链](../../raw/ai-coding-agents/2026-11-20-pstack-playbook-call-chains.md)
> Updated: 2026-11-20

## Overview

本机同时安装 pstack（lock 计 57 个）与 mattpocock/skills（lock 计 30 个）。两族的技能名几乎不重叠，但用户处境高度重叠：跨会话接力、磨想法、做计划、写测试、并行实现、修 bug、审查、复盘，两边各有对应物。本文按 14 组同场景配对给出选型判据，并先交代两族技能的真实触发档位——frontmatter 的 `disable-model-invocation` 只挡宿主按 description 自动加载，pstack 侧真正的调度者是 `/poteto-mode` 与 playbook 正文；matt 侧无该行的是模型可自动加载。

## 触发档位

| 档 | 判据（frontmatter） | 成员（本机实测） |
|---|---|---|
| 自动 / 手调 | 无 `disable-model-invocation: true` | matt 11 个：code-review、codebase-design、diagnosing-bugs、domain-modeling、grilling、pr、prototype、research、tdd、wizard、writing-for-agents；pstack 仅 setup-pstack |
| `/poteto-mode` 内部调 | 有 disable 行，但被 poteto-mode 或 playbook 正文按名读取 | pstack 的 24 条 principle 与被路由的功能技能（how、why、architect、arena、swarm、interrogate、unslop 等）；poteto-help 原文："Only `/setup-pstack` loads from the user's words. The others load when the user types them or when `/poteto-mode` runs them, and it doesn't run every skill." |
| 宿主按 paths 加载 | disable 行 + `paths` 字段 | pstack 仅 typescript-best-practices：`paths: ["**/*.ts", "**/*.tsx"]` |
| 纯手调 | 有 disable 行且不在 poteto-mode 调度链上 | pstack 剩余功能技能与 matt 的命令流技能（recall、correct、to-spec、implement、retro、handoff 等） |

principle 的用法以 poteto-help 原文为准："The user rarely invokes one. They steer with the names instead, as in \"apply prove it works. show me the real output.\" Typing `/principle-<name>` still loads one on demand." pstack 侧全量分层与可达性见 [pstack 技能地图与行为](pstack-skill-map-and-behaviors.md)，本文不重复计数。

## 14 组同场景配对

| 你的处境 | pstack | matt | 关系 | 判据 |
|---|---|---|---|---|
| 忘了该调哪个技能 | poteto-help | ask-matt | 二选一 | 各管各家：走 pstack 体系（playbook、判例、形式化验证）问 poteto-help；走 matt 流程（追问→规格→票→红绿循环）问 ask-matt |
| 跨会话接力 | recall | handoff | 互补·先后 | 收工前用 handoff 写交接单，复工时用 recall 读历史重建现场 |
| 查清楚技术事实 | how、why | research | 互补·按对象分流 | how 管本仓库怎么运转，why 管本仓库当年为何这么写（两者 description 互指对方补位）；research 管外部一手资料 |
| 让人教懂一个主题 | teach（pstack 版，本机生效） | teach（未装，同名遮蔽） | 二选一（遮蔽已裁决） | 两版同名；本机装的是 pstack 版（当场调 how+why 讲透）；matt 版是多会话课程。见 [同名 skill 的遮蔽与选型](same-name-skills-tdd-teach.md) |
| 磨想法与提示词 | sharpen | grilling、grill-me、grill-with-docs | 互补·按阶段 | 开工前问透计划用 matt 三件套（口头用 grilling/grill-me，同文异名；落 ADR 与 GLOSSARY 用 grill-with-docs）；已写好提示词要加深用 sharpen |
| 把方案变成计划与任务 | figure-it-out | to-spec、to-tickets、wayfinder | 二选一 | 常规需求走 matt：to-spec 写规格、to-tickets 切纵向切片票、wayfinder 建跨会话决策票地图；无现成套路的深水区大活用 figure-it-out 现场定制假设循环 |
| 动手前做设计 | architect | codebase-design、domain-modeling、improve-codebase-architecture | 互补·按阶段 | 写码前画类型签名草图用 architect；日常讨论深模块、接缝与词表由 codebase-design 与 domain-modeling 自动生效；给老代码库出体检报告用 improve-codebase-architecture |
| 方案拿不准做原型 | principle-exhaust-the-design-space、arena | prototype | 二选一 | 单路快速试通用 prototype（模型可自动加载）；全新交互要做 2–3 个竞争原型并排比选用 pstack 判例加 arena |
| 写测试做红绿循环 | tdd（pstack 版未装） | tdd（matt 版，本机生效） | 二选一（遮蔽已裁决） | 本机统一走 matt 版 tdd（先确认公共接口 seam 再红绿循环）；pstack 自己的 playbook 调 /tdd 也落到它上面。见 [同名 skill 的遮蔽与选型](same-name-skills-tdd-teach.md) |
| 多代理并行实现 | swarm、poteto-mode | implement-spec | 二选一 | 手里是 to-tickets 拆好的票依赖图用 implement-spec（沿 ready frontier 开独立 worktree）；任意切片、赛跑或批量验证要严查 SHA 与方法用 swarm |
| 排查与修 bug | principle-fix-root-causes、principle-attack-the-premise | diagnosing-bugs、triage | 互补·先后 | 症状进来先由 matt diagnosing-bugs 自动生效（压紧复现循环、二分根因），要建票用 triage；连修两次卡同一关卡时用 pstack 判例 attack-the-premise 停手验前提，fix-root-causes 管修在源头 |
| 长跑与自主推进 | poteto-mode、show-me-your-work | loop-me | 二选一 | 轻量定检查点、AI 推到底交简报用 loop-me；重装后台军团加 TSV 决策账本用 poteto-mode 配 show-me-your-work |
| 提 PR 前审查 | interrogate、no-comments | code-review | 互补·按风险分级 | 日常查规范与规格由 code-review 自动生效（双轴子代理）；提交前清注释用 no-comments；高危改动派对抗子代理真跑失败输出用 interrogate（其 description 明文 "only findings proven by a run survive"） |
| 复盘与沉淀 | correct、reflect、automate-me | retro、writing-for-agents | 互补·按目的分流 | 同错两次要堵成结构卡口用 correct；常规收尾回顾用 retro；三视角挖当前对话用 reflect；跨会话挖自己的重复操作用 automate-me；修剪 AGENTS.md/CLAUDE.md 用 writing-for-agents |

## 日常点火开关（使用建议）

以下是获取方式的建议，不是 frontmatter 事实：matt 主线记 `/grill-me → /to-spec → /to-tickets → /implement`（多票 `/implement-spec`）`→ /retro`；pstack 侧只需记 `/poteto-mode <用人话说任务>` 一个总开关，另备 `/recall`、`/interrogate`、`/correct` 三个单点。判例不背名字，按 poteto-help 的用法在对话里用英文短名点名。

## 边界与未验证项

- 触发档位是从 frontmatter 与 poteto-help 原文推出的机制判断，未做运行时加载探测；实际触发取决于宿主与任务。
- 14 组配对只覆盖两族正面相遇的场景；两族各自的单方独有技能（如 pstack 的形式化验证五件、matt 的 wizard）不在此表。
- frontmatter 逐字内容与 lock 计数的证据见本文 Raw 字段；同场景判据是两份 description 对照后的归类，属从机制推断的结论。

## See Also

- [pstack 技能地图与行为](pstack-skill-map-and-behaviors.md)
- [同名 skill 的遮蔽与选型](same-name-skills-tdd-teach.md)
- [skill 系统的两种组织轴](skill-system-organization-axes.md)
- [mattpocock/skills：两轴分类的工程 skill 集](mattpocock-skills-system.md)
