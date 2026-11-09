# 同一模型名跨两个协议面时的模型 ID 分叉

> Sources: GitHub Copilot 上游目录实测, 2026-11-09; OpenAI Decisions guide 与 Decisions create 参考页, 2026-10-25; `Ashesh3/copilot-api`、`github/gh-aw`、`github/gh-aw-firewall`、`microsoft/vscode` 公开记录, 2026-11-09
> Raw: [copilot-decisions-live-verification-1109](../../raw/ai-coding-agents/2026-11-09-copilot-decisions-live-verification.md); [gpt-6-luna-decisions-copilot-history](../../raw/ai-coding-agents/2026-11-09-gpt-6-luna-decisions-copilot-history.md)
> Updated: 2026-11-09

## Overview

当一个模型同时挂在两个不兼容的协议面上，客户端与网关通常会为其中一个面另起一个模型 ID。Copilot 的做法是把决策面单独注册为 `gpt-6-luna-decisions`，而推理完成后响应体仍回显 `gpt-6-luna`。理解这一点，才能解释为什么用常规模型 ID 请求 `/v1/decisions` 会连续得到 `model_not_supported`。

## 为什么会分叉

OpenAI 官方 guide 写的是「Send requests to `POST /v1/decisions` using `gpt-6-luna`, the only currently supported model.」（[GA raw](../../raw/ai-coding-agents/2026-10-25-openai-decisions-api-ga.md) §①）——这个名字同时也是 Responses 面的生成模型名。

任何用「模型 ID → 协议」一维表做路由的客户端或聚合网关，若直接复用 `gpt-6-luna` 作主键，就会与已有聊天条目冲突。于是网关侧另起 `gpt-6-luna-decisions` 作为决策面的键。

## 目录里的形态

Copilot 上游目录中，两个 ID 各自只有一组端点：

| ID | `supported_endpoints` | `model_picker_enabled` | `capabilities.type` |
|---|---|---|---|
| `gpt-6-luna` | `/responses`、`ws:/responses` | 真 | 生成模型类型 |
| `gpt-6-luna-decisions` | `/v1/decisions` | **假** | `decisions` |

专用条目的其余特征：`capabilities.family` 为 `gpt-6-luna`、无 `policy` 字段、`billing.token_prices` 四项单价与 `batch_size` 全为 0、`billing.restricted_to` 覆盖 pro/edu/business/enterprise/max 等档。（[实测 raw](../../raw/ai-coding-agents/2026-11-09-copilot-decisions-live-verification.md) §④）

## 请求与响应的名称不对称

请求体发 `"model": "gpt-6-luna-decisions"`，响应体回显 `"model": "gpt-6-luna"`。（[实测 raw](../../raw/ai-coding-agents/2026-11-09-copilot-decisions-live-verification.md) §⑤）

因此日志与用量记录里看到的名字可能是生成面的名字，而入口是决策面的 ID。按响应体里的 `model` 反推入口会得出错误结论。

## 诊断顺序

连续拿到 `model_not_supported` 时，按这个顺序查，比继续换请求形状更快定位：

1. 取 `/models`，把每个条目的 `supported_endpoints` 汇总成一个集合，确认目标端点是否被任何条目声明。
2. 在该端点的声明者里挑 `capabilities.type` 匹配的条目；决策面是 `decisions`，向量面是 `embeddings`。
3. 用该条目的 `id` 原样发送，不做名称映射。
4. 只有以上都确认后，才怀疑端点本身不可用。

`model_not_supported` 的报文原文是 `Model is not supported for this request.`（`code: model_not_supported`），指向的就是模型与端点不匹配这一层。

## 客户端侧的配置含义

有些客户端会为官方 `openai` provider 配一个「请求时改写成上游模型名」的字段（OMP 里是 `request-model-id`）。这类改写绑定在特定 provider 上：

- `openai/gpt-6-luna-decisions` 会改写成 `gpt-6-luna`，适合 OpenAI 原生端点。
- 挂在自定义 provider 下时不做改写，请求体保持 `gpt-6-luna-decisions`，正合 Copilot 目录要求。

详见 [OMP 判断协议与接入](../omp/judgment-provider-and-eval-judge.md)。

## 第三方记录

`github/gh-aw-firewall` 的模型清单把两个面记成两条独立条目：`openai/gpt-6-luna` 与 `copilot/gpt-6-luna-decisions`，各自带协议与来源。（[历史 raw](../../raw/ai-coding-agents/2026-11-09-gpt-6-luna-decisions-copilot-history.md) §④）

## 证据边界

- 专用条目在目录中出现的时间只能限定为 2026-11-09 当日观测到，首次出现的确切时刻未知。
- 结论来自 Copilot 与 OpenAI 的公开目录与文档；其他厂商是否采用同样做法未核对。

## See Also

- [OpenAI Decisions API：GA 状态、请求格式与 GitHub Copilot 后端探测](openai-decisions-api.md)
- [Copilot 的决策路由端点与 Auto／HydraFusion 边界](copilot-decision-routing.md)
