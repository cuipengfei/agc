# Knowledge Base Index

## agent-harness

Agent harness 的 prompt、上下文架构与运行形态差异。

| Article | Summary | Updated |
|---------|---------|---------|
| [Hermes vs OpenClaw 架构差异](agent-harness/hermes-vs-openclaw-architecture.md) | 相同模型表现差异背后的 prompt、技能加载、压缩、记忆和用户建模因素 | 2026-08-30 |

## agent-interaction

Agent 与画布、结构化产物及可持续编辑界面的交互方式。

| Article | Summary | Updated |
|---------|---------|---------|
| [Agent 操作结构化产物](agent-interaction/agent-authored-structured-artifacts.md) | Workflow contract 与正式领域 DSL/runtime 的能力边界 | 2026-09-01 |
| [mcp_excalidraw：给 Agent 一块活画布](agent-interaction/mcp-excalidraw.md) | MCP server、画布工具与 draw → look → adjust 迭代闭环 | 2026-08-30 |
| [产物可持续编辑 Genre](agent-interaction/sustainable-artifact-editing.md) | 稳定语义身份、增量操作和可验证反馈的判定标准 | 2026-08-30 |
| [视觉人机交互全景](agent-interaction/visual-canvas-interaction-landscape.md) | 共享视觉工作面的分级分类、工具地图与场景选择 | 2026-08-30 |

## agent-tooling

Agent 周边工具、安装配置与工作流 Skill。

| Article | Summary | Updated |
|---------|---------|---------|
| [Headroom Extras](agent-tooling/headroom-extras.md) | 本地 coding agent 的最小 extras 安装与取舍指南 | 2026-08-31 |
| [skills CLI 性能模型](agent-tooling/skills-cli-performance-model.md) | agent skill 目录发现、软链与共享更新路径对 CLI 耗时的影响 | 2026-09-03 |

## ai-coding-agents

AI coding agent、IDE 与 harness 的横向比较。

| Article | Summary | Updated |
|---------|---------|---------|
| [六 AI Coding Agent 对比](ai-coding-agents/4-agent-comparison.md) | OpenCode、OMP、Prime Agent、DSH、jcode 与 OpenClaude 的真正独特能力 | 2026-09-01 |
| [开源 Harness 与托管推理不是一回事](ai-coding-agents/open-harness-vs-hosted-inference.md) | 区分客户端、runtime、Provider 主权、模型成本与端到端自托管 | 2026-09-01 |

## better-harness

Better Harness 的工作流审计模型与适用边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [Better Harness](better-harness/better-harness.md) | 多 host 支持、五维审计模型及其与执行 harness 的互补关系 | 2026-08-30 |

## harness-engineering

Harness 的编辑格式、上下文载体与人类理解闭环。

| Article | Summary | Updated |
|---------|---------|---------|
| [文档、测验与 AI 代码库的认知债务](harness-engineering/documentation-and-cognitive-debt.md) | 用文档保存意图与决策，用 Quiz 暴露理解偏差，用测试验证行为 | 2026-09-01 |
| [Harness 格式与上下文载体](harness-engineering/harness-formats-and-context-carriers.md) | Hashline、Snapcompact 与 RLM 在编辑、压缩和控制平面上的差异 | 2026-08-30 |

## model-gateway-mismatch

模型能力、SDK 解析与 gateway wire contract 不一致问题。

| Article | Summary | Updated |
|---------|---------|---------|
| [模型 capability 与 gateway wire 参数不一致](model-gateway-mismatch/reasoning-capability-vs-wire-parameter.md) | reasoning capability 与 reasoning_effort wire 参数的分离及验证方法 | 2026-08-29 |
| [JustWoker `/v1/messages` 实测行为](model-gateway-mismatch/justwoker-v1-messages-observed-behavior.md) | 四个请求模型名的返回模型、usage、身份和环境字段实测 | 2026-09-01 |
| [免费强模型 API 候选与尝试排序](model-gateway-mismatch/free-strong-model-api-candidates.md) | 免费注册或签到、强模型名称与证据边界的候选排序 | 2026-09-02 |

## omp-mnemopi

OMP Mnemopi 的记忆 scoping、召回与 consolidation 生命周期。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Mnemopi Consolidation 生命周期](omp-mnemopi/consolidation-lifecycle.md) | 三种 scoping 的写入/召回路由、模式切换与 consolidation 边界 | 2026-08-31 |
| [OMP 记忆后端对比：Mnemopi vs Hindsight vs Sharpshooter](omp-mnemopi/memory-backends-comparison.md) | 三后端定位、安装、LLM/embedding/reranker 配置、迁移路径 | 2026-09-02 |

## omp-modes

OMP 模式、Vibe、Task/Hub 与 Magic Keywords。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP 工作模式与 Magic Keywords](omp-modes/modes-and-magic-keywords.md) | 模式触发、能力收窄、组合关系与使用建议 | 2026-08-27 |

## omp-prewalk

OMP Prewalk 的模型切换机制与行为边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Prewalk：规划后切换模型](omp-prewalk/prewalk.md) | 规划后首次文件修改时切换模型的触发、配置与社区证据 | 2026-08-30 |

## omp-discovery

OMP 能力发现、provider 隔离与插件生命周期。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP 能力 provider 隔离边界](omp-discovery/omp-provider-isolation-boundaries.md) | disabledProviders 生效与不生效的层次、marketplace 缝隙 | 2026-09-03 |

## omp-sessions

OMP session 文件格式与第三方工具兼容性。

| Article | Summary | Updated |
|---------|---------|---------|
| [JSONL 格式与第三方 pi 解析器](omp-sessions/jsonl-format-and-third-party-parsers.md) | title 首行问题、正确镜像做法、残留障碍 | 2026-09-03 |

## omp-ttsr

OMP TTSR 流式行为护栏、Extension 分层与上下文处置。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Extension 与 TTSR 分层防护](omp-ttsr/extension-and-ttsr-layering.md) | schema、tool_call extension 与 TTSR 的职责边界 | 2026-08-29 |
| [TTSR keep vs discard](omp-ttsr/keep-vs-discard.md) | 命中规则后保留或丢弃错误上下文的证据与取舍 | 2026-08-26 |
| [OMP TTSR 与 /omfg](omp-ttsr/ttsr-and-omfg.md) | TTSR scope、配置、生命周期、规则生成与实测边界 | 2026-08-29 |

## personal-knowledge

个人资料采集、检索、RAG 与隐私边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [浏览历史 RAG：Hister 的能力与边界](personal-knowledge/browser-history-rag.md) | 浏览历史和文件的 Retrieval、MCP 接入及旧历史重抓取限制 | 2026-09-01 |

## prime-agent

Prime Agent 的功能、技术实现与第三方评价。

| Article | Summary | Updated |
|---------|---------|---------|
| [Prime Agent 社区 Reception](prime-agent/prime-agent-community-reception.md) | 第三方评价、benchmark 与争议 | 2026-08-30 |
| [Prime Agent：功能与配置总览](prime-agent/prime-agent-overview.md) | 核心架构、主要功能、配置和与 OMP 的关系 | 2026-08-30 |
| [Prime Agent 技术实质](prime-agent/prime-agent-technical-reality.md) | RLM、Continual Harness、CRUD 与持久运行时的源码验证 | 2026-08-30 |
