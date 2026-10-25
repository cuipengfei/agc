# OpenAI Decisions API：GA 状态、请求格式与 GitHub Copilot 后端探测

> Sources: OpenAI 官方文档, 2026-10-25; 本会话对 GitHub Copilot 上游的实测, 2026-10-25; 微软 VS Code 仓库源码与 npm 包核查, 2026-10-25
> Raw: [openai-decisions-api-ga](../../raw/ai-coding-agents/2026-10-25-openai-decisions-api-ga.md); [copilot-decisions-retest-and-payload-validation](../../raw/ai-coding-agents/2026-10-25-copilot-decisions-retest-and-payload-validation.md); [openai-decisions-api-status-check-1018](../../raw/ai-coding-agents/2026-10-18-openai-decisions-api-status-check.md); [copilot-decisions-endpoint-probing-1018](../../raw/ai-coding-agents/2026-10-18-copilot-decisions-endpoint-probing.md); [openai-decisions-api-status-check-1015](../../raw/ai-coding-agents/2026-10-15-openai-decisions-api-status-check.md); [copilot-decisions-endpoint-probing-1015](../../raw/ai-coding-agents/2026-10-15-copilot-decisions-endpoint-probing.md)
> Updated: 2026-10-25

## Overview

OpenAI Decisions API 于 2026-10-22 正式 GA，仍只支持 `gpt-6-luna`，端点 `POST /v1/decisions`，请求体含 `model`/`input`/`questions`（predicate/choice/score 三题型）。GitHub Copilot 上游 `/v1/decisions` 被路由层区别处理，但在 10-15、10-18、10-25 三次复测中被测模型全部被拒，未随 OpenAI GA 放行。把 Decisions 正文发往 Copilot 的 Responses 路径会返回 200，但该结果在未知字段对照下被证伪为普通文本生成。

## 官方状态（2026-10-25 核验）

**已 GA。** Changelog 条目日期 Oct 22，分类为 `Update · Model: gpt-6-luna · API: v1/decisions`，正文宣告正式可用，并把单请求题目上限由 public beta 期间的 200 提升到 400。

Decisions guide 页首段（10-25 直读）：

> "The Decisions API is now generally available. Review what's new since the public beta."

guide 仍写明 `gpt-6-luna` 是唯一支持模型，端点为 `POST /v1/decisions`。（[raw](../../raw/ai-coding-agents/2026-10-25-openai-decisions-api-ga.md) §①）

### GA 后新增能力

guide "What's new" 节列出九项：prompt caching、题目级图片、`input_json` 结构化输入、单请求题目上限提升、托管图片 URL、对话历史（含函数调用与工具输出）、组织用量报告、GPT-Live 原生集成、Private Link。（[raw](../../raw/ai-coding-agents/2026-10-25-openai-decisions-api-ga.md) §②）

其中题目上限为 **400**，公开 beta 期间为 200。

### 三次状态对照

| 日期 | 官方状态 | 依据 |
|---|---|---|
| 2026-10-15 | public beta，"expect to GA in the coming weeks" | guide 直读 |
| 2026-10-18 | 同上，逐字一致 | guide 直读 |
| 2026-10-22 | GA | changelog 条目 |
| 2026-10-25 | GA | guide 与 changelog 直读 |

> **Status: Outdated** (2026-10-22)
> 上文两次记录的「public beta，预计未来数周 GA」已被 2026-10-22 changelog 条目取代：Decisions API 正式 GA，仍只支持 `gpt-6-luna`。证据见 [openai-decisions-api-ga raw](../../raw/ai-coding-agents/2026-10-25-openai-decisions-api-ga.md)。

## 请求格式要点

来自官方 guide 与参考页（schema 细节详见 [raw/ai-coding-agents/2026-10-07-openai-decisions-api-beta-schema.md](../../raw/ai-coding-agents/2026-10-07-openai-decisions-api-beta-schema.md)）：

| 字段 | 用途 |
|---|---|
| `model` | 执行评估的模型，当前仅支持 `gpt-6-luna` |
| `input` | 题目共享的证据：文本字符串，或消息/工具调用/工具输出的有序数组 |
| `questions` | 要评估的内容，含每题类型、指令及允许选项或评分档位 |

三种题型：`predicate` 返回 0 到 1 的概率；`choice` 返回用户提供的某个值；`score` 返回档位序号的概率加权平均。响应含 `answers` 数组，以题目 `name` 标识。（[raw](../../raw/ai-coding-agents/2026-10-25-openai-decisions-api-ga.md) §③④）

## GitHub Copilot 后端探测

以下结论基于同一测试条件（同一上游、同一认证、同一请求头），不推广为其他账号或主机。模型以匿名代号表述：基线模型、被测模型 A/B/C。

| 探测项 | 结果 |
|---|---|
| 路径变体对照（10-15） | 仅 `/v1/decisions` 被区别处理；其余变体与虚构路径均 404 |
| 完整 Predicate 请求的模型校验（10-15） | 400 `model_not_supported` |
| 异常请求错误分级（10-15） | 虚构/空/null model、字段名错误、字段类型错误、题目结构错误共 7 类，返回 4 种不同响应 |
| `questions` 结构校验（10-15） | 缺失、空数组、改为对象三类得到不同处理；题型与 `instructions` 未暴露专用校验错误 |
| `/v1/decisions` 复测（10-18） | 基线模型与多个被测模型全部 400 `model_not_supported` |
| Responses 路径多模型对照（10-18） | 被测模型 A、B 返回 200 普通生成、无 `answers`；被测模型 C 返回 400 `unsupported_api_for_model` |
| **`/v1/decisions` 复测（10-25，GA 后）** | **基线模型 400 `model_not_supported`，与 10-15、10-18 逐字一致** |
| **虚构路径对照（10-25）** | **404，不变** |

**GA 未改变 Copilot 侧行为**：OpenAI 于 10-22 GA 之后，10-25 复测的拒绝报文与前两次完全相同。这组证据只覆盖本次认证与上游，不能证明其他账号或其他调用条件也不支持。（[raw 10-25](../../raw/ai-coding-agents/2026-10-25-copilot-decisions-retest-and-payload-validation.md) §②）

## Responses 路径的返回值不等于兼容性

把完整 Decisions 正文（`model` + `input` + `questions`）发往 Copilot 的 Responses 路径会返回 200。这个结果容易读成「Copilot 接受 Decisions 形状」，实测对照推翻了该解读。

同一认证下六组请求：

| 请求体 | HTTP | 响应 |
|---|---|---|
| `model` + `input` + `questions` | 200 | 普通生成，无 `answers` |
| `model` + `input` + `foo_bar_baz`（未知字段） | 200 | 普通生成，无 `answers` |
| `model` + `input: 12345`（类型错误） | 400 | `invalid_request_body`，明确报 `input` 类型错误 |
| 字段名全错 | 400 | `model_not_supported` |
| 纯随机字段 | 400 | `model_not_supported` |
| 只有 `questions`（缺 `model`） | 400 | `model_not_supported` |

在核心字段相同的前提下，加 `questions` 与加 `foo_bar_baz` 的行为**无差异**。因此 200 只说明 `model` 与 `input` 恰好合法，请求退化为普通文本生成。

`questions` 在内部被丢弃、忽略还是透传后未使用，属推断。实测能确认的只有：它没有产生任何 Decisions 语义（无 `answers`、无概率、无题目处理），且与一个明显的未知字段结果一致。（[raw](../../raw/ai-coding-agents/2026-10-25-copilot-decisions-retest-and-payload-validation.md) §⑤⑥）

同时，OpenAI 官方 `Create a model response` 参考页全文（16919 行）中 grep `questions` 为 0 命中，`Text generation` 指南的 Responses 示例也无该字段——即 Responses 的 schema 未列出 `questions`，但这不等于 OpenAI 运行时会拒绝它。

### 归因纪律

- 必填字段写错时的 400 只能说明请求无效，不能用来判断某个可选字段是否被区别处理。归因前要固定所有必填字段。
- 一个看似被接受的 200 可能是误导项。判定兼容性必须带明确的未知字段对照组。

## 客户端源码与依赖

- 独立 Copilot Chat 仓库已归档，当前源码位于 VS Code 主仓库 `extensions/copilot/`。
- 在该目录检索 `/v1/decisions`：无命中；检索 `decisions`：命中均为普通英文词；检索 `questions`：命中均为 `vscode_askQuestions` 工具的问题轮播 UI，非请求体字段。（[raw](../../raw/ai-coding-agents/2026-10-25-copilot-decisions-retest-and-payload-validation.md) §④）
- 主仓库锁定 `@vscode/copilot-api@0.5.2`；该版本无 Decisions 请求类型与 URL 映射，`ModelRouter` 映射到 `/models/session/intent`。
- DomainService 声明中存在独立 Model Lab 主机（`isModelLab` 选项控制），尚未探测。

## 证据边界

- 所有 Copilot 探测结果仅代表本次测试条件；不推广为全部账号或全部主机。
- `/v1/decisions` 被区别处理不等于该端点已实现可执行的 Decisions 推理；开放条件未验证。
- 未向 Model Lab 主机发送请求；未测试其他账号。
- 推理用量：10-15 两次（181 tokens 与 16 tokens 各一次）；10-18 三次成功；10-25 三次成功、五次 400、一次 404 虚构路径。

## See Also

- [Copilot 的决策路由端点与 Auto／HydraFusion 边界](copilot-decision-routing.md)
- [Jev 在 OMP、Codex、OpenCode 的现成集成盘点](jev-host-integrations.md)
