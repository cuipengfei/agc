# Behavioral Harness 的成本收益实验

> Sources: Naresh Jain（martinfowler.com），2026-10-13
> Raw: [are-harnesses-worth-the-cost](../../raw/harness-engineering/2026-10-14-are-harnesses-worth-the-cost.md)
> Updated: 2026-10-14

## Overview

Naresh Jain 在 martinfowler.com「Exploring Gen AI」系列发表的对照实验：同一 BFF 服务构建任务，比较有/无 behavioral harness 时 coding agent 的表现。结果呈条件化——前沿模型 GPT-6 Sol 无论带不带 harness 都 10/10 通过外环评测，harness 对它是纯开销（约 10.5 倍 token、约 7 倍成本）；成本优化模型 GPT-6 Luna 不带 harness 仅 3/10 通过，带 harness 后 10/10，且单次成本（$0.273）比无 harness 的 Sol（$0.406）低约 33%。作者由此提出修正假设：模型能力改变的是 sensors 何时运行，而不是是否需要独立验证。

## 实验设计

**任务**：构建产品发现的 backend-for-frontend（BFF）服务——消费端 HTTP API、入参与下游响应校验、调用 Order API、搜索成功后只把第一个产品发布到 Kafka（全发会让 agent 绕过选择行为）。异常行为要求：下游创建超时 → `202` + 响应头 monitor link 供轮询；瞬时搜索失败 → `429`（带可用恢复间隔）；依赖不可用或事件发布失败 → `503`；过滤器违例 → `502`。brief 把功能、架构、技术约束、接口与失败行为写得异常详细，作者自认这是对无辅助 agent 有利的起点，尚不知道 brief 变差结果如何变化。

**内环（behavioral harness）**：借用 Birgitta Böckeler 的 guides + sensors 框架。

- Guides：OpenAPI/AsyncAPI 规格（机器可读的接口约定）、请求-响应示例（覆盖下游超时、畸形负载、过滤器违例、重试序列、Kafka 确认）、API 开发 skill（实现惯例、依赖模拟、行为验证、失败诊断）。
- Sensors：契约一致性检查、API 测试断言 HTTP 响应值、副作用断言（下游 mock 调用、Kafka 发布）、CTRF 报告、API 覆盖率报告。
- computational 控制（确定性工具执行，无 LLM 评判对错）与 inferential 控制（agent 自己解释结果、决定修法）混合使用。
- agent 通过项目测试命令调用 harness；反馈不随每次编辑自动触发，依赖 agent 主动调用。

**guides/sensors 一致性**：先跑 `examples validate` 命令校验示例负载符合规格，测试再用规格与示例检查实现。关键设计：契约与示例代表人类约定的期望，以可执行形式给出；agent 被指示保留这些输入与验证工具，只能改实现或执行环境，不许弱化期望值。这解决了「agent 自己写实现又自己写测试时，同一误读同时进两处」的问题。

**外环（evaluation harness）**：开发结束后跑 178 项组合功能检查（无效输入、下游失败、恢复序列、成功请求的消息），评测 harness 自管下游 fixture 与消息捕获，不依赖应用的开发测试。每轮运行在隔离 Docker 容器、attempt 专属的干净 Codex home（无会话、记忆、插件残留）。内环看不到评测答案。

**可接受标准**：应用成功启动 + 通过全部 178 项外部验收测试；可靠性 = 重复运行中产出可接受应用的一致程度。

## 结果

**GPT-6 Sol**（旗舰模型，低推理档，10 轮均值）：

| Harness | Tokens | Time | 估算成本 | 通过 |
|---|---|---|---|---|
| 有 | 11,331,970 | 19 mins 53 secs | ~$2.679 | 10/10 |
| 无 | 1,076,371 | 6 mins 51 secs | ~$0.406 | 10/10 |

harness 带来约 10.5 倍 token、近 3 倍时间、约 7 倍成本，但两组都 10/10 通过全部 178 项测试——未观测到任何验收差异。探索性运行中 Claude Sonnet 4.6、Claude Opus 4.6、Gemini 3.8 Flash（均低推理档）也都无辅助一次完成。

**GPT-6 Luna**（成本优化，约当早期 GPT-5 家族 nano 档，低推理档，10 轮均值）：

| Harness | Tokens | Time | 估算成本 | 通过 |
|---|---|---|---|---|
| 有 | 22,933,648 | 35 mins | ~$0.273 | 10/10 |
| 无 | 5,860,736 | 15 mins 56 secs | ~$0.086 | 3/10 |

harness 平均每轮多 17,072,912 tokens、19 分钟 4 秒自主运行时间、约 $0.187 估算成本，总 token 约为无 harness 的 3.9 倍。但对比经济学：harness 后的 Luna 单次 $0.273 vs 无 harness 的 Sol $0.406，低约 33%，且两组都是 10/10。harness 没有解锁 Luna 不具备的能力，只是把 3/10 的基线变成 10/10 的可靠性。无 harness 的 Luna 平均每轮通过 94.8% 的功能检查——栽在微妙边界，而非整体不理解任务。

## 失败分类学（无 harness 的运行）

失败的 Java 应用没有语法错误，每个仍通过至少 144/178 项检查，失败集中在延迟创建工作流与一组协议细节上：

- **延迟创建在超时边界断裂**：下游创建超时时应返回 `202 Accepted` + monitor link、后台重试、最终暴露下游 `201`。实际 4 个应用返回 `503`、2 个 `400`、1 个 `429`。多个实现靠匹配狭窄的异常类型识别超时；产物只记录了错误响应而未记录实际客户端异常，因此该机制是「可能的解释而非已证的共同原因」。
- **monitor link 缺失引发二次失败**：7 轮中错误的超时响应导致没返回 monitor URL，后续评测检查使用缺失 URL 时失败。作者把这视为 202 流程断裂的后果，不计为独立缺陷。
- **Kafka 送达成功但契约一致性失败**：3 轮中消息全部到达 Kafka 仍被拒——2 个应用用 Spring JSON 序列化器多发了 `__TypeId__` 头；1 个输出 `"categories": null`（可选字段存在时必须为数组）。机制上集成成功，线协议上违反契约。
- **错误响应未命中精确 HTTP 契约**：brief 明确要求此类无效请求返回 `400`，有应用返回惯例性的 `415` 被判违约；无效请求落到通用 `500` handler；缺失 monitor 返回错误表示。
- **集成缝配置名分歧**：生成的客户端读 `ORDER_API_API_KEY`，记录的启动脚本供给 `ORDER_API_KEY`，导致普通产品创建返回 `503` 而非 `201`。harness 运行中，契约驱动的依赖 mock 与配置检查能在部署前校验这些环境变量。

观察口径：失败出现在协议边界、弹性路径与集成缝——一个「看起来有说服力」的实现仍可能作为系统失败。

## 机制解释：executable attention

- 失败背后的行为都在需求里写明。需求可以写在 brief 里明确存在，却在实现中**失去影响力**；作者称之为 *attention lapse*（注意力松懈）：产出的代码遗漏或不完整实现了 agent 拿到的需求。
- 可能成因（库选择、样板搭建、依赖注入、异步接线在长上下文中并行争用）未被实验证实，作者明确标注未确立因果。
- *executable attention*：harness 作为外部记忆与注意力辅助，传感器变红时把丢掉的需求拉回焦点，给 agent 又一次按需求行动的机会。
- **传感器的双重角色**（依运行时机而定）：开发期间 = executable attention，引导构建、从松懈中恢复；完成时 = 验收依据，把 agent 的解释独立对照人类期望——这对每个模型都重要，Sol 的 10/10 也依赖独立评测。

## 条件化结论

模型能力改变的是 sensors 何时运行、运行多频繁，而不是是否需要独立验证门：

- **成本优化模型**：结果不一致时全程跑 behavioral harness——executable attention 在漂移发生时抓住它，把不一致的尝试变成可靠交付。
- **前沿模型**：即便首次尝试稳定通过，也保留独立验收检查；把持续检查改为验收前一次性跑自动化测试（deterministic final verification gate），以最小开销提供独立检查。该 final-gate 工作流的成本作者未测量。
- **投入清晰的规格与示例**：检查只能执行人类编码进去的期望；契约未覆盖的部分靠人工审查。
- 工程团队选模型 rarely 只看基准智能——单位经济学、延迟预算、数据隐私、本地化部署常常主导决策；若 harness 能让已满足运营约束的更轻模型可靠交付，是有吸引力的选项。

## 经济学口径与可信度边界

- 所有成本是 **API 等价估算**（按记录的 token 用量与模型单价折算），不是实际计费。
- 口径只含自主生成成本与机器时间：**不含**契约、示例、断言与 harness 的编写/审查/维护人工，也不含找到、诊断、修复不可接受结果的成本。跨实现复用接口契约可摊薄 setup 成本，但复用本身未测量。
- 样本边界：每模型 10 轮配对运行、1 个 greenfield Java 服务、低推理档；无法确立长期可靠性。
- brief 异常详细；遗留代码改造、其他语言、其他推理档、模糊需求下是否成立未测。
- guides 与 sensors 打包注入，实验无法分离两者各自贡献。
- 利益相关：作者 Naresh Jain 是 Specmatic 创始人，harness 以 Specmatic 实现（文末称等价的契约测试与服务虚拟化工具可提供同样能力）。所有结果尚无独立复现。

## See Also

- [双层循环操控模型](dual-loop-steering-model.md) — guides/sensors 框架出处及与徐昊课程内层循环的对应关系；本文是该框架的实证成本收益对照
