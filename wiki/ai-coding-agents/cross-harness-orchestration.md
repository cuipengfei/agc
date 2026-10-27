# 跨 Harness 编排：workflowz 与 orchestrate 的对应物

> Sources: Claude Code 官方文档，2026-10-27；Codex 官方文档，2026-10-27；OpenCode 官方文档，2026-10-27；OMO orchestration guide，2026-10-27
> Raw: [跨 Harness 编排官方文档摘录](../../raw/ai-coding-agents/2026-10-27-cross-harness-orchestration-official-docs.md); [OMO mass ulw 独立版专属证据](../../raw/oh-my-openagent-omo/2026-10-27-mass-ulw-native-only.md)
> Updated: 2026-10-27

## Overview

`orchestrate` 的核心是主 agent 逐个派发子任务，四家都有近似物。`workflowz` 的核心是把编排写成 eval 代码，由池执行；四家里只有 OMO 的 `mass ulw` 接近。Claude Code、Codex、OpenCode 的并行能力都停留在模型驱动的派发层，没有 OMP 的常驻池、批次合并、结构化 yield 与一次聚合投递。

## 对照表

| 工具 | 最接近 `orchestrate` | 最接近 `workflowz` |
|---|---|---|
| Claude Code | Subagents：主 agent 用 Agent 工具派发，内置 Explore、Plan、general-purpose，结果回主会话 | Agent teams（实验性，默认关闭）：lead 加多个独立会话、共享任务列表与邮箱；或用 Agent SDK 写代码派子 agent。没有 eval 池 |
| Codex | 原生 subagent 工作流：要求并行子 agent，`/subagents` 查看；`[agents]` 配置自定义 agent | 没有直接对应。最接近的是模型驱动的 subagent 编排，或脚本并行跑多个 `codex exec` |
| OpenCode | Subagents：内置 General 与 Explore，主 agent 自动调用或 `@` 提及；General 用于并行工作单元 | 没有直接对应。最接近的是插件或 server API 创建子会话，或并行跑 `opencode run` |
| OMO | `task` 工具加 categories，再加 background agents；`ultrawork`/`ulw` 是进入该模式的关键词 | `mass ulw`：在 eval cell 里用 `workflow` 工具定义依赖图，节点带 id、prompt、category、dependsOn，按阶段运行；`team` 模式处理重叠工作 |

## Claude Code

Subagents 在单个会话内工作，各自有上下文窗口、系统提示与工具权限，结果回到调用方。主 agent 管理全部工作，适合快速、聚焦、只要结果的委派。

Agent teams 是另一层：lead 加多个独立 Claude Code 会话，共享任务列表与邮箱，成员可以直接互相发消息、认领任务。它默认关闭，需要 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`；适合需要讨论、互相质疑、跨层协调的工作。它仍是会话级协调，没有 eval 池与批次语义。

## Codex

当前 Codex 发布默认启用 subagent 工作流：主线程要求并行子 agent，Codex 负责生成、转发后续指令、等待结果、关闭线程；`/subagents` 用于查看和切换线程。多 agent 一起跑时，Codex 等全部结果可用后合并成一条回复。

这套能力由模型驱动，官方文档没有 workpool、yield、按项结构化返回或排空聚合。需要代码级编排时，只能在外部脚本或 Agent SDK 里自行组合。

## OpenCode

OpenCode 分 primary agents 与 subagents。内置 General 用于并行工作单元，Explore 用于只读探索；主 agent 可以自动调用 subagent，用户也可以用 `@` 提及。子会话有独立上下文，可在父会话与子会话之间切换。

它没有池对象、批次合并与聚合投递。程序化编排要借助插件或 server API 创建子会话，或并行跑多个 `opencode run`。

## OMO

OMO 的主 agent 通过 `task` 工具派发：category 路由到对应 worker，另有一组只读 agent 负责研究、计划咨询与计划审查。background agents 支持并行波次，完成后回报。

`mass ulw` 是四家里最接近 `workflowz` 的：在 eval cell 里用 native `workflow` 工具定义依赖图，节点带 id、prompt、category、dependsOn；一个 run 覆盖一个阶段，失败节点可以 retry、send、amend。它只在独立版（`omo-ai`）提供；OpenCode 插件版的关键词检测没有 `mass ulw`，也没有 `tool.workflow`。

## 类比失效点

- **模型驱动与代码写定。** Claude Code、Codex、OpenCode 的并行由主 agent 在对话中决定；OMP `workflowz` 把编排写成 eval 代码，池负责调度。
- **会话级与池级。** Claude Code agent teams 与 OMO team mode 协调多个会话；OMP 池协调的是同一会话内的常驻工作者。
- **投递语义。** OMP 的批次任务默认不自动投递，排空后聚合一次；其他家没有对应的投递层。
- **结构化返回。** OMP 按项 id 组装 yield schema；其他家的 subagent 主要返回文本或线程结果。
- **能力归属。** OMO `mass ulw` 是独立版专属，插件版只有 `ultrawork`/`ulw`、`team`、`hyperplan` 等关键词。

## See Also

- [workflowz 运行机制与生命周期](../omp-modes/workflowz-runtime-and-lifecycle.md) — 池、notice、配置项与失败语义。
- [AI Coding Agent 对比：真正独特优势（19 家）](4-agent-comparison.md) — 独有性裁定与更广的 harness 对比。
- [OMO 独立版与插件版](omo-native-vs-plugin.md) — 两条产品线的能力边界。
