# OMP Turn、Run 与中途消息投递模式

> Sources: 本机 OMP 19.0.1 源码直读, 2026-11-21; oh-my-pi GitHub 提交记录, 2026-11-16 与 2026-05-22
> Raw: [turn 与 run 生命周期源码摘录](../../raw/omp-turn/2026-11-21-omp-turn-lifecycle-source.md); [中途消息投递模式源码摘录](../../raw/omp-turn/2026-11-21-omp-midrun-message-modes-source.md)
> Updated: 2026-11-21

## Overview

OMP 中 `turn` 是一次模型 HTTP 响应及其产生的工具调用和结果；`run` 是 OMP 处理一次用户指令的完整过程，可包含多个 `turn`。非 Goal 模式下长任务的步数由模型自主决定，没有预设最大步数上限。用户中途发消息有三种底层队列：steering（打断当前批次）、followUp（等内层循环停下后注入）、aside（非打断旁注）。`run` 的结束由 AgentSession 统一判定，只在无任何唤醒源时发出 `agent_end`。

## Turn 的生命周期

一个 `turn` 从 OMP 发起 HTTP 请求开始，到 `turn_end` 事件登记结束（`agent-loop.ts:1392-1865`）。

正常流程中一个 `turn` 对应一次 HTTP 请求和流式响应。模型在同一条响应里可以同时输出 `text` 块和 `toolCall` 块。OMP 提取 `toolCall` 后执行工具，执行完毕发出 `turn_end`，然后根据 `hasMoreToolCalls` 决定是否开启下一个 `turn`。

`stopReason` 的语义需要区分：API 返回 `"stop"` 只表示模型停止生成文字，不表示工具循环结束。只要消息中包含未截断的 `toolCall` 块，即使 `stopReason === "stop"`，OMP 仍会执行这些工具并进入下一个 `turn`（`agent-loop.ts:1677-1701`）。只有 `stopReason === "length"`（达到 max_tokens 截断）时，尾部不完整的 `toolCall` 才会被放弃。

## Run 的生命周期

一个 `run` 从 `agent_start` 开始，经过多个 `turn`，最终发出 `agent_end`（`agent-loop.ts:1925`）。

在 2026-11-16 的提交 `07308793` 之前，每次模型循环停下都会发出 `agent_end`，导致界面状态栏、RPC 客户端等模块误以为整个 `run` 已结束。该提交将"模型循环停下"与"整个 `run` 结束"分开：中间停止发出 `agent_pause`，只有没有任何唤醒源时才发出 `agent_end`。

唤醒源（wakeSources）共四类：当前会话启动的后台 `bash` 作业、排队待投递的异步结果或子代理消息、仍在运行的子代理、子代理通信锁。只要存在唤醒源，`run` 就不会结束，而是进入 `agent_pause` 状态，终端标题保持 `running`。

外部 RPC、JSON 输出和扩展插件通过 `loop-end-wire.ts` 兼容层接收 `agent_end` 消息，但标记 `isTerminal: false` 代表"中途暂停"；`run` 真正结束才发送 `isTerminal: true`。

## 非 Goal 长任务的步数控制

非 Goal 模式下，模型自主决定每一步调用什么工具。外层 `while (true)` 循环没有预设最大步数上限。只要模型在每个 `turn` 的响应中继续输出 `toolCall`，OMP 执行完工具就会自动开启下一个 `turn`。

`onBeforeYield` 是宿主在模型停止后的最后一个续行检查点（`agent-loop.ts:1901-1902`）。如果 OMP 需要注入续行指令（例如 JEV decision API 判定模型提前停止），通过 `config.onBeforeYield` 或 `followUp` 队列实现。

## 中途消息投递模式

用户在 `run` 运行中途发消息时，根据发送方式进入不同的底层队列：

| 模式 | 键盘入口 | 何时进入 HTTP 请求 | 是否打断当前工具批次 | 底层队列 |
|---|---|---|---|---|
| steering | `Enter` | 当前 `turn` 结束时 | 是（打断 interruptible 工具） | `#steeringQueue` |
| followUp | `Ctrl+Enter` | 内层工具循环停下后（`onBeforeYield` 之后） | 否 | `#followUpQueue` |
| aside | 无直接入口 | 下一个 `turn` 边界顺带捎入 | 否（不打断工具批次） | IRC aside 队列 |
| btw / `?问题` | `?` 或 `/btw` | 不进主会话队列 | 完全旁路 | 独立问答面板 |
| nextTurn | 扩展 API | 下一个 `turn` 开始时 | 否 | 扩展内部队列 |

### steering 模式

steering 消息在入队时带 `steering: true` 标记（`agent-session.ts:10805-10814`）。OMP 在下一个 `turn` 开头取出时，给消息套上高优先级提示框（`messages.ts:771-773`、`user-interjection.md:1-4`）：

```xml
<system-notice>
User interjection during work: priority; supersedes conflicting prior instructions. Re-read; ensure current work reflects user intent.
</system-notice>
你的原话
```

当前 `turn` 正在执行的工具批次中，纯等待类工具（`interruptible: true`，如 `wait`、`vibe`）会被跳过并标记 `Skipped due to queued user message`；普通 side-effecting 工具（`bash`、`edit`、`read`）不会被跳过，继续执行完毕（`agent-loop.ts:3597-3616`）。支持协作让位的长耗时 `bash` 会收到 `steeringSignal` 自动转入后台。

### followUp 模式

followUp 消息不带 `steering: true` 标记，也不加 `<system-notice>` 外框。OMP 不会在两个工具 `turn` 之间插队，而是等模型把手头所有连续的 `toolCall` 全部跑完、内层循环原本准备停下时，才从队列取出放进下一个 `turn`。

### aside 模式

aside 队列没有用户键盘入口，由三类调用方使用：子代理 IRC 通信（`#irc.queueAside`）、Advisor 温和提醒（`advise-tool.ts:76`）、扩展插件 `deliverAs: "aside"`。aside 消息在下一个 `turn` 边界顺带捎入上下文，不打断当前工具批次，除唤醒纯等待的 `wait` 外不会触发 `steeringSignal`。

### joinActiveTurn 的 admission 边界

外部客户端（如 ACP 桥）调用 `joinActiveTurn` 时，OMP 只在客户端 `prompt` 的 `run` 仍然存活期间才接受消息，否则返回 `false` 让调用方保留内容（`agent-session.ts:10556-10621`）。

### steeringMode / followUpMode 配置

`steeringMode` 和 `followUpMode` 各有 `"all"` 和 `"one-at-a-time"` 两种取值。`"all"` 在到达边界时把队列里攒的多条消息一次性全放进同一个 HTTP 请求；`"one-at-a-time"` 每次 `turn` 只取一条（`agent.ts:138-140,460-461`）。

## See Also

- [OMP 内建工具全集、会话暴露边界与内部地址空间](../omp-tools/builtin-tools-and-internal-urls.md)
- [OMP 工具调用循环防护与 exemptTools](../omp-config/tool-call-loop-guard.md)
- [OMP hook-status footer：主题着色与变化提示](../omp-extensibility/hook-status-footer-patterns.md)
