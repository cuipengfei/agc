# 双层循环操控模型

> Sources: 徐昊（极客时间《Agent 驾驭工程之美》），2026-09; Birgitta Böckeler（martinfowler.com），2026-04-02
> Raw: [课程核心概念摘录](../../raw/geekbang-agent-harness/2026-09-30-course-concepts.md)
> Updated: 2026-10-02

## Overview

徐昊课程的核心框架：Agent 驾驭通过两层循环实现——外层 PDCA 管任务分解与进度追踪，内层操控循环（Steering Loop）管具体执行中的质量控制。操控循环由前馈（Guides）、行动（Action）、反馈（Sensors）、调整（Steer）四个环节组成。这个框架与 Birgitta Böckeler 在 Fowler 网站上提出的 harness engineering（guides/sensors/steering loop）高度对应，但术语来源不同：徐昊借自控制论（control theory），Böckeler 用工程语言。

## 自我纠正就是 ReAct

自我纠正循环没有额外机器。OMP 的 `#runLoop` 里没有任何叫「纠正」的部件——工具失败被包成 `isError: true` 的 toolResult 追加进历史，下一次请求带着它，模型自己决定换做法。全过程就是循环的「观察」环节碰巧观察到了错误。

观察分两类：

1. **显式失败**：工具返回错误（TypeError、exit code 非 0）。模型想不看见都难。
2. **隐性质量缺口**：工具成功了但结果不对。没有 `isError` 标记，模型必须自己从成功输出的内容里读出「这不行」。

第 2 类才是自我纠正的难点。要触发第 2 类，需要有人把质量缺口变成可观察的信号——这就是反馈控制（Sensors）的作用。没有传感器制造观察，循环转得再好也看不到该纠正什么。

## Steering 是操控循环的第四步

操控循环四步：

1. **Guides**（前馈）：告诉 Agent 要做什么、怎么做
2. **Action**（行动）：Agent 执行任务
3. **Sensors**（反馈）：检查结果是否符合标准
4. **Steering**（调整）：根据反馈决定下一步——继续、重做、修正、还是求助

如果 Agent 做完一步就等人来指出错误，那它自己就没有在执行第四步——调整的工作被人包办了，Steering 这个设计环节就空转了。

## Edge 是窗口截断边界

课程原文（第 5 讲）说「多余的信息会把真正重要的指令挤到窗口边缘，随着对话进行被截断或压缩」。edge 是**上下文窗口的截断边界**——内容掉出窗口，信息丢失。具体到 OMP 的实现（源码核验）：system prompt / 指令是 pinned 的，不会被驱逐；溢出时丢弃或压缩的是最早的非固定对话轮次，最近的尾部和固定的头部都保留。

这与「注意力漂移」是两个独立机制：

- **上下文溢出**：窗口物理上限，内容被截断/压缩，信息丢失
- **注意力漂移**：窗口够大、内容还在，但注意力被无关信息稀释，响应质量下降

## Guides vs Sensors 的融合边界

Böckeler 的做法是把修正指引**写进 sensor 的输出**——lint 报错消息本身包含「优先重构，提高阈值是绝对例外」。这不是写在 AGENTS.md 里的独立 Guide，而是通过 sensor 这个反馈通道传递的前馈内容。

所以「这是 feedforward 还是 sensor？」的准确答案是：**内容上是 feedforward（告诉 Agent 该怎么做），传递方式上是通过 sensor（反馈通道）**。Böckeler 的核心创新就是这个融合——把修正指引嵌入反馈信号里，让 Agent 在看到错误的同时也看到怎么改。

## Feedforward 术语起源

Feedforward 这个术语是 I. A. Richards 在 1951 年第八届 Macy 控制论会议（Macy Conference on Cybernetics）上创造的，明确作为 feedback 的对应词。OED 记录了这个起源。起源在 cybernetics 内部，后传入 control theory。

Cybernetics（控制论）是 Wiener 1948 年创立的跨学科领域，研究一切系统的控制与通信。Control theory（控制理论）是工程学分支，专门研究动态系统的数学建模与控制器设计。前馈/反馈的明确区分来自 control theory，但术语本身起源于 cybernetics。

## 概念对应关系

| 徐昊（控制论术语） | Böckeler（工程术语） | 含义 |
|---|---|---|
| 前馈（Feedforward） | Guides | 执行前告诉 Agent 该做什么、怎么做 |
| 反馈（Feedback） | Sensors | 执行后检查结果是否符合标准 |
| 调整（Steer） | Steering loop | 根据反馈决定下一步 |
| 自我纠正循环 | Self-correction loop | ReAct 的特殊形式，观察改为自我纠正 |

## See Also

- [Harness 格式与上下文载体](harness-formats-and-context-carriers.md) — 编辑格式与上下文载体的具体机制
- [Claude Code 上下文与 Compaction](claude-code-context-and-compaction.md) — 上下文截断与压缩的具体实现
