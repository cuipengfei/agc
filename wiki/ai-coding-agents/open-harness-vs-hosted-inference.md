# 开源 Harness 与托管推理不是一回事

> Sources: CodebuffAI Freebuff; OpenCode; OMP, 2026-09-01
> Raw: [Freebuff 仓库证据](../../raw/ai-coding-agents/2026-09-01-freebuff-repository-study.md); [OpenCode Provider 证据](../../raw/ai-coding-agents/2026-09-01-opencode-provider-evidence.md); [OMP Provider 证据](../../raw/ai-coding-agents/2026-09-01-omp-provider-evidence.md)
> Updated: 2026-09-01

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

## See Also

- [四 AI Coding Agent 对比](4-agent-comparison.md) — 从独特 harness 能力比较 OpenCode、OMP、Prime Agent 与 DSH。
- [模型 capability 与 gateway wire 参数不一致](../model-gateway-mismatch/reasoning-capability-vs-wire-parameter.md) — provider 可替换之后仍需处理协议契约。
- [Hermes vs OpenClaw 架构差异](../agent-harness/hermes-vs-openclaw-architecture.md) — 相同模型也会因 harness 不同产生行为差异。
