# OpenAI Decisions API：GA 状态、请求格式与 GitHub Copilot 后端探测

> Sources: OpenAI 官方文档, 2026-10-25; 对 GitHub Copilot 上游的实测, 2026-10-25 与 2026-11-09; 微软 VS Code 仓库源码与 npm 包核查, 2026-10-25; `github/gh-aw`、`github/gh-aw-firewall`、`microsoft/vscode` 公开提交记录, 2026-11-09
> Raw: [openai-decisions-api-ga](../../raw/ai-coding-agents/2026-10-25-openai-decisions-api-ga.md); [copilot-decisions-retest-and-payload-validation](../../raw/ai-coding-agents/2026-10-25-copilot-decisions-retest-and-payload-validation.md); [copilot-decisions-follow-up-research](../../raw/ai-coding-agents/2026-10-25-copilot-decisions-follow-up-research.md); [openai-decisions-api-status-check-1018](../../raw/ai-coding-agents/2026-10-18-openai-decisions-api-status-check.md); [copilot-decisions-endpoint-probing-1018](../../raw/ai-coding-agents/2026-10-18-copilot-decisions-endpoint-probing.md); [openai-decisions-api-status-check-1015](../../raw/ai-coding-agents/2026-10-15-openai-decisions-api-status-check.md); [copilot-decisions-endpoint-probing-1015](../../raw/ai-coding-agents/2026-10-15-copilot-decisions-endpoint-probing.md); [copilot-decisions-live-verification-1109](../../raw/ai-coding-agents/2026-11-09-copilot-decisions-live-verification.md); [gpt-6-luna-decisions-copilot-history](../../raw/ai-coding-agents/2026-11-09-gpt-6-luna-decisions-copilot-history.md); [copilot-api-decisions-route](../../raw/ai-coding-agents/2026-11-09-copilot-api-decisions-route.md)
> Updated: 2026-11-09

## Overview

OpenAI Decisions API 于 2026-10-22 正式 GA，端点 `POST /v1/decisions`，请求体含 `model`/`input`/`questions`（predicate/choice/score 三题型）。Copilot 上游在 2026-10-15、10-18、10-25 三次测试中用常规 `gpt-6-luna` 请求该端点，均返回 `model_not_supported`。2026-11-09 同一上游的目录中出现专用条目 `gpt-6-luna-decisions`：`capabilities.type` 为 `decisions`，`supported_endpoints` 只有 `/v1/decisions`，`model_picker_enabled` 为 `false`。改用该 ID 请求得到 HTTP 200 与结构化 `answers`，同一条件下带图请求也通过。

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

以下结论基于各次测试条件（同一上游、同一认证、同一请求头），不推广为其他账号或主机。10-15 至 10-25 的探测用常规 `gpt-6-luna`；11-09 改用目录中的专用模型 ID。

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
| **常规 `gpt-6-luna` 重测（11-09）** | **400 `model_not_supported`，与前三次逐字一致** |
| **目录端点集合（11-09）** | **四项：`/chat/completions`、`/responses`、`/v1/decisions`、`ws:/responses`** |
| **专用 ID `gpt-6-luna-decisions`（11-09）** | **200，`answers` 含 `probability: 1`，`output_tokens` 为 0** |

**GA 未改变 Copilot 侧行为**：OpenAI 于 10-22 GA 之后，10-25 复测的拒绝报文与前两次完全相同。这组证据只覆盖本次认证与上游，不能证明其他账号或其他调用条件也不支持。（[raw 10-25](../../raw/ai-coding-agents/2026-10-25-copilot-decisions-retest-and-payload-validation.md) §②）

### 2026-11-09：端点绑定专用模型 ID

目录中声明 `/v1/decisions` 的模型只有一个，其条目要点：`id` 为 `gpt-6-luna-decisions`，`name` 为 `GPT-6 Luna Decisions`，`capabilities.type` 为 `decisions`，`capabilities.family` 为 `gpt-6-luna`，`supported_endpoints` 只有 `/v1/decisions`，`model_picker_enabled` 为 `false`，无 `policy` 字段，`billing.token_prices` 的四项单价与 `batch_size` 全为 0。（[raw](../../raw/ai-coding-agents/2026-11-09-copilot-decisions-live-verification.md) §④）

用该 ID 的 Predicate 请求返回 200，响应体顶层只有 `answers`、`model`、`usage`；`model` 回显为 `gpt-6-luna`；`input_tokens` 为 167，`output_tokens` 为 0；响应体不含 `copilot_usage`。（[raw](../../raw/ai-coding-agents/2026-11-09-copilot-decisions-live-verification.md) §⑤）

带图请求同样通过：内联 base64 `input_image` 配 predicate 与 choice 两题，返回 200，`has_red_circle` 的 `probability` 为 1.0，`shape_type` 选中 `circle`、`confidence` 为 1.0，`input_tokens` 为 396。（[raw](../../raw/ai-coding-agents/2026-11-09-copilot-decisions-live-verification.md) §⑥）

`choice` 题型的报文格式有硬性要求：`choices` 每项必须是对象且含 `value`；传字符串数组得到 `Invalid type for 'questions[1].choices[0]': expected an object, but got a string instead.`，传 `{ name, description }` 得到 `Missing required parameter: 'questions[1].choices[0].value'.`。

**归因修正**：此前三次的 `model_not_supported` 是模型与端点不匹配的字面意思，不是端点整体不可用。2026-10-15 至 10-25 期间 `/v1/decisions` 是否已服务无法回溯确认——当时目录中没有该专用条目。（[raw](../../raw/ai-coding-agents/2026-11-09-copilot-decisions-live-verification.md) §⑧）

### 计费状态（2026-11-09）

该模型的目录单价全为 0，响应头只有账户级额度快照、无请求级价格，`github/gh-aw-firewall` 记录的外部报错为 `Model "gpt-6-luna-decisions" has no AI credits pricing and no default pricing is configured`。GitHub 官方计费文档未列出该模型。**推断**：计费层尚未为该模型配置单价。（[raw](../../raw/ai-coding-agents/2026-11-09-copilot-decisions-live-verification.md) §⑦；[历史 raw](../../raw/ai-coding-agents/2026-11-09-gpt-6-luna-decisions-copilot-history.md) §④⑤）

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

## 为什么模型上架不代表 Decisions 端点接入

OpenAI 与 GitHub 的官方 changelog 都记录了 2026-09-22 的模型发布与 Copilot 上架；OpenAI 另于 2026-10-22 将 Decisions API GA。前者是现有 Responses/Chat Completions 生成模型的可用性，后者是独立的 `/v1/decisions` API surface，包含专用请求与结构化答案。（[OpenAI changelog](https://developers.openai.com/api/docs/changelog)；[GitHub Copilot 公告](https://github.blog/changelog/2026-09-22-openais-gpt-6-sol-and-gpt-6-luna-now-available/)）

VS Code Copilot 的公开模型端点类型列出 Chat Completions、Responses、WebSocket Responses、Messages，没有 Decisions。（[endpointProvider.ts](https://github.com/microsoft/vscode/blob/main/extensions/copilot/src/platform/endpoint/common/endpointProvider.ts)）三次探测也只在各自测试条件下得到 `model_not_supported`，不能扩展为所有 Copilot 产品或账号都不支持。（[后续跟进分析 raw](../../raw/ai-coding-agents/2026-10-25-copilot-decisions-follow-up-research.md)）

**最佳判断（推断）**：模型上架不会自动带来新 API surface 支持。Decisions 需要单独接入端点能力及结构化请求/响应处理；Copilot 的聊天与编码入口暂时没有明显的通用 bounded-question 产品位置，因此该集成很可能优先级较低。GitHub 未公开说明内部原因或排期；本次检索范围内也未找到 Copilot 跟进声明。

> **Status: Outdated** (2026-11-09)
> 上段「该集成很可能优先级较低」的推断已被推翻：Copilot 已在目录中加入专用条目 `gpt-6-luna-decisions`，并在同一上游实际执行 `/v1/decisions` 返回 200。接入方式是不进模型选择器的内部条目，未向产品界面开放。证据见 [11-09 实测 raw](../../raw/ai-coding-agents/2026-11-09-copilot-decisions-live-verification.md)。

## 证据边界

- 所有 Copilot 探测结果仅代表本次测试条件；不推广为全部账号或全部主机。
- `model_not_supported` 表示模型与端点不匹配，不能据此判断端点整体不存在；判定端点可用性要先读目录中该模型的 `supported_endpoints`。
- 未向 Model Lab 主机发送请求；未测试其他账号。
- 推理用量：10-15 两次（181 tokens 与 16 tokens 各一次）；10-18 三次成功；10-25 三次成功、五次 400、一次 404 虚构路径；11-09 两次成功（167 与 396 input tokens）与一次连接层 `ECONNRESET`。
- 11-09 的结果只覆盖本次认证与上游；其他账号类型的可用范围未核验。

## See Also

- [Copilot 的决策路由端点与 Auto／HydraFusion 边界](copilot-decision-routing.md)
- [Jev 在 OMP、Codex、OpenCode 的现成集成盘点](jev-host-integrations.md)
- [同一模型名跨两个协议面时的模型 ID 分叉](copilot-decisions-model-identity.md)
