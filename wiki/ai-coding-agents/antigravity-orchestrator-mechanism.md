# Antigravity Orchestrator 机制

> Sources: Google Antigravity docs（Choose a model），2026-11-20 采集；googledevs 发布公告；InfoWorld、MindStudio、eesel 报道，2026-11-20 采集
> Raw: [2026-11-20 定价页与 Orchestrator](../../raw/ai-coding-agents/2026-11-20-antigravity-plans-models-orchestrator.md)
> Updated: 2026-11-20

## Overview

Antigravity 模型选择器提供三个 Orchestrator 形态——Orchestrator (Neon)、(Argon)、(Carbon)，其余模型（Flash、Claude 系列、GPT-OSS）只有单选。单选时该模型全程负责思考和执行，可用 thinking level 调节推理深度；选 Orchestrator 时指定的模型只负责规划，执行交给 Gemini 4 Hydrogen，控制权在两者之间按触发条件自动来回交接。这是官方文档明确区别于传统模型路由的机制。

## 单模型与 Orchestrator 的差别

| 选择项 | 谁负责规划与审阅 | 谁负责改文件、写代码、跑测试 | thinking level |
|---|---|---|---|
| Gemini 4 Neon（单选） | Neon 全程 | Neon | 可调（Low、Medium、High、Extra） |
| Orchestrator (Neon) | Neon | Gemini 4 Hydrogen | 固定配置，不可调 |

Orchestrator 的工作流程：规划模型先探索代码库、理清含糊的地方、写出具体的执行计划，再把执行工作交给 Hydrogen；Hydrogen 改文件、写代码、跑构建和测试，并对照计划核对结果；中途出现意外情况时控制权回到规划模型，检查当前状态、修补计划，再把执行工作交还给 Hydrogen。这些交接都在同一次回复里自动完成。

控制权回到规划模型的三条触发条件：验证步骤连续失败两次；接口行为和预期不符；遇到计划里没有定下来的设计选择。

官方文档明确 Orchestrator 不是模型路由：路由在开头把提示词分类后整体交给一个模型；Orchestrator 的两个模型在同一个任务里来回交接。Orchestrator 没有 API model id，没有自己的按 token 价格；两半的价格分别为 Hydrogen 与规划模型各自的价格（eesel）。

## 官方使用建议

日常功能开发、修 bug、重构、多文件调试用 Orchestrator；需要每一步都保持最大推理深度时（从零设计复杂的分布式系统、追查并发竞态、跨多个仓库做迁移），直接选 Neon、Carbon 或 Argon。

Google 自测数据（MindStudio、eesel 引述）：Orchestrator 完成率接近全程单用 Carbon，配额少用 24%，速度快 19%。这是量级参考，非承诺值。

## 档位可用性

Orchestrator 上线时（googledevs 公告）只推出 Orchestrator (Carbon) 和 Orchestrator (Argon) 两个形态，eesel 记录当时 Carbon 规划限 Ultra。2026-11-20 定价页快照：Orchestrator (Neon) 已列入 Pro 模型清单（脚注 2，付费 Pro 或符合条件的设备试用），与 Orchestrator (Argon) 同列；Orchestrator (Carbon) 只在 Ultra 清单。InfoWorld 记录：Carbon 作规划模型面向 Ultra 订阅者，Argon 作规划模型对 Pro 和 Ultra 都可用。企业档（Gemini Enterprise）的模型清单不含任何 Orchestrator 形态。

## See Also

- [Google Antigravity：套餐、模型、额度与地区](google-antigravity-plans-and-regions.md) — 各档模型清单与额度
- [Antigravity CLI 用量查询与配额/许可证错误分层](antigravity-cli-usage-and-quota-errors.md) — 用量入口与错误分层
