# 开源 Harness 与托管推理不是一回事

> Sources: CodebuffAI Freebuff; OpenCode; OMP, 2026-09-01; Meta Muse; Grok Bot; OpenAI Dots; Hermes; OpenClaw, 2026-10-14
> Raw: [Freebuff 仓库证据](../../raw/ai-coding-agents/2026-09-01-freebuff-repository-study.md); [OpenCode Provider 证据](../../raw/ai-coding-agents/2026-09-01-opencode-provider-evidence.md); [OMP Provider 证据](../../raw/ai-coding-agents/2026-09-01-omp-provider-evidence.md); [Hosted Agents vs Self-Hosted Agents](../../raw/agent-harness/2026-10-14-hosted-agents-vs-hermes-openclaw.md)
> Updated: 2026-10-14


## Overview

开源 coding agent 至少要拆成客户端、Agent runtime、provider 路由和模型四层。Freebuff 开源了客户端与本地 runtime，但当前推理地址绑定 Codebuff 服务；OpenCode 与 OMP 则允许用户替换 provider 或连接本地 endpoint。免费、开源、可自托管和离线是四个不同命题。

## 四层检查法

| 层 | 要问的问题 |
|---|---|
| 客户端 | TUI、CLI 和本地工具代码是否开放？ |
| Agent runtime | 循环、工具、上下文和子 Agent 是否可修改？ |
| Provider 路由 | 能否不经过厂商服务，直接选择 endpoint？ |
| 模型 | 模型本身是否开放、免费或可本地运行？ |

只满足前两层，仍可能是“开源云服务客户端”。

## Freebuff

Freebuff 通过 `FREEBUFF_MODE` 从 Codebuff 代码库构建，Agent 编排、文件编辑和 Shell 执行发生在本地。但 LLM 请求由 `getWebsiteUrl() + /api/v1` 构造，没有普通用户可配置的任意 OpenAI-compatible endpoint。

因此它是：

```text
开源客户端 + 开源本地 Agent runtime + Codebuff 托管推理入口
```

免费额度还伴随容量、模型选择、广告和数据政策。服务停止或策略改变时，公开客户端本身不能靠配置独立完成推理。

## OpenCode 与 OMP

OpenCode 和 OMP 都把 provider 作为用户可替换配置：

- 可选择商业 API。
- 可经过自建 gateway。
- 可连接 OpenAI-compatible endpoint。
- 可使用 Ollama、LM Studio、llama.cpp 或 LiteLLM 等本地/自托管路径。

这意味着 harness 不依赖某个唯一推理服务，但模型与算力仍然可能收费。

## 判断矩阵

| 产品 | 客户端/runtime 开源 | Provider 可替换 | 脱离厂商服务运行 |
|---|---:|---:|---:|
| Freebuff | 是 | 当前普通配置不支持 | 否 |
| OpenCode | 是 | 是 | 是 |
| OMP | 是 | 是 | 是 |

这里的“脱离厂商服务”只指 harness 与路由主权，不代表脱离所有第三方模型。

## 托管个人 Agent 与自托管 Agent

Muse、Grok Bot 和 Dots 的资料描述托管云端电脑、账户连接、后台任务和用户审批。Hermes 与 OpenClaw 的本次资料只证明本地 skill、Gateway 和浏览器配置路径。关于模型 provider、运行位置、数据边界和维护责任，本次材料不作结论。

Muse 和 Grok Bot 的资料明确描述云端电脑；Hermes 与 OpenClaw 的资料分别明确描述本地 skill 管理和 Gateway 浏览器控制。托管产品的其他集成，以及自托管产品的 provider、运行位置和数据边界，需要分别核实。使用云端模型时，发送给模型的上下文仍然会交给对应 provider。

Hermes 的本次资料证明了本地 skill 管理与渐进式加载，OpenClaw 的资料证明了独立浏览器和自动化路径。两者的资料都没有证明邮件、日历、每日调度、回复草拟、发送前批准和实际发送组成的完整流程已经开箱即用；这类流程需要额外工具、skill、浏览器配置或外部服务，具体集成需要单独核实。

当前没有同一任务、同一模型、同一权限条件下比较 Muse、Grok Bot、Dots、Hermes 和 OpenClaw 的可靠性数据。

## See Also

- [四 AI Coding Agent 对比](4-agent-comparison.md) — 从独特 harness 能力比较 OpenCode、OMP、Prime Agent 与 DSH。
- [模型 capability 与 gateway wire 参数不一致](../model-gateway-mismatch/reasoning-capability-vs-wire-parameter.md) — provider 可替换之后仍需处理协议契约。
- [JustWoker `/v1/messages` 实测行为](../model-gateway-mismatch/justwoker-v1-messages-observed-behavior.md) — 记录兼容端点实际返回的模型、usage、身份和环境字段。
- [Hermes vs OpenClaw 架构差异](../agent-harness/hermes-vs-openclaw-architecture.md) — 相同模型也会因 harness 不同产生行为差异。
