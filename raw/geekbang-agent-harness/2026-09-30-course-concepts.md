# 徐昊《Agent 驾驭工程之美》课程核心概念摘录

> Source: 极客时间专栏 https://time.geekbang.org/column/intro/1428
> Collected: 2026-10-02
> Published: 2026-09

## 双层循环模型（第 1 讲，article/1007794）

操控循环（Steering Loop）四个环节：

- 前馈控制（Feedforward/Guides）：预判 Agent 的行为，在它行动之前就加以引导。前馈能够提高 Agent 在第一次尝试时就产生好结果的概率。常见的前馈控制有参考文献（Reference doc）、提示词（Prompt）、原则说明（Principles）等
- 行动（Action）：Agent 在前馈控制下执行任务
- 反馈控制（Feedback / Sensors）：在 Agent 行动之后观察结果。常见的反馈控制有测试（Tests）、静态分析（Static Analysis）、日志（Logs）等
- 调整（Steer）：Agent 根据收集到的反馈，决定是否继续执行现在的任务。这是 Agent 系统中自我纠正系统（self-correction）在发挥作用

前馈控制和反馈控制缺一不可。只有反馈控制，Agent 可能会重复犯同一个错误；而只有前馈控制，Agent 则会过于草率地结束任务。

## 四子系统（第 2 讲，article/1007826）

构成 Harness 的四个子系统是：指令（Instructions）、工具与技能（Tools & Skills）、环境（Environment）和状态（State）。

- 指令（Instructions）：告诉 Agent 做什么
- 工具与技能（Tools & Skills）：给 Agent 做事的途径
- 环境（Environment）：Agent 运行的真实条件
- 状态（State）：让 Agent 记住过去

自我纠正循环是推理行动循环（ReAct）的一个特殊形式。推理行动循环遵循"推理-行动-观察"的三步模式。自我纠正循环将观察改为自我纠正，模式为"推理-行动-观察-自我纠正"。

推断型（Inferential）控制依赖大模型的推理能力，结果是非确定性的。计算型（Computational）控制通过确定的规则或代码来执行，通过大模型的工具调用能力实现。

## 渐进式信息披露与截断机制（第 5 讲，article/1010541）

多余的信息不只是浪费空间，它还会把真正重要的指令挤到窗口边缘，随着对话进行被截断或压缩。这就是为什么大模型在执行的过程中，会跳过一些步骤或是忘记执行一些子任务。

注意力漂移比上下文溢出更隐蔽。即使上下文窗口足够大，模型在不同信息块之间的注意力也会被稀释。当大量无关内容混杂在上下文中时，模型对关键指令的响应质量会逐轮下降。

## 知识固化（第 6 讲，article/1011295）

知识固化是指将存在于对话中的、临时性的知识逐步写入文件，变成持久的、可复用的规则和工具的过程。

当我们发现 Agent 反复犯同一个错误，你在对话中纠正它，几轮试错后找到了有效的做法。把这条规则写进 AGENTS.md，就是一次改进中的固化。每一次改进的本质都是一轮新的固化：试错找到有效做法，写入文件让它持久生效。没有固化，改进就永远是临时补丁；有了固化，每一轮改进都在让 Harness 变得更完善。

坏味道是指在 Harness 中潜在的、影响 Agent 输出质量，造成 Agent 输出不稳定的特征。重构就是有针对性的消除坏味道的过程。

## Feedforward 术语起源（本会话查证）

> Source: OED via Wikipedia "Feedforward" 条目; Macy Conference on Cybernetics transactions, 1952

Feedforward 这个术语是 I. A. Richards 在 1951 年第八届 Macy 控制论会议（Macy Conference on Cybernetics）上创造的，明确作为 feedback 的对应词。OED 记录了 1951 年为该词的英语起源。起源在 cybernetics 内部，后传入 control theory。

Cybernetics（控制论）是 Wiener 1948 年创立的跨学科领域，研究一切系统的控制与通信。Control theory（控制理论）是工程学分支，专门研究动态系统的数学建模与控制器设计。前馈/反馈的明确区分来自 control theory，但术语本身起源于 cybernetics。

## Böckeler 的对应概念（本会话查证）

> Source: martinfowler.com/articles/harness-engineering.html (Birgitta Böckeler, 2026-04-02)

Birgitta Böckeler 在 Martin Fowler 网站发表的文章（2026-04-02）中使用 Guides（前馈）和 Sensors（反馈）术语，与课程的前馈/反馈对应。Böckeler 将修正指引嵌入 sensor 输出（如定制 lint 消息），融合了前馈内容和反馈通道。课程作者徐昊称这些概念来自「前同事 Martin Fowler」，但公开文字的作者是 Böckeler。
