# Copilot 上游 `/v1/decisions` 复测与 Responses 路径 payload 校验对照（2026-10-25 会话实测）

> Source: 本会话对 GitHub Copilot 上游的实际 HTTP 请求与响应（2026-10-25）；OpenAI Responses create 参考（https://developers.openai.com/api/reference/resources/responses/methods/create）；OpenAI Text generation guide（https://developers.openai.com/api/docs/guides/text）；microsoft/vscode 仓库 `extensions/copilot` 目录
> Collected: 2026-10-25
> Published: Unknown（探测记录，非已发表来源）

证据分级标签：**文档原文**＝逐字引用；**实测**＝本会话实际抓取；**推断**＝由证据推得但未直接证实。

本 raw 不含账号标识、认证 token、cookie 或完整内部响应 ID。Copilot 被测模型一律以匿名代号表述：**基线模型**（先前多次验证可用）、**被测模型 A/B/C**。上游地址以 `https://api[.<account-type>].githubcopilot.com` 形态记录。

## ① 探测条件

与 10-15、10-18 一致：同一上游、同一认证流程（OAuth token 交换取得 Copilot token）、同一请求头组合。测试正文采用 OpenAI Decisions 官方示例格式（`model`/`input`/`questions`，predicate 题型）。

## ② 三路复测（实测，GA 后）

| 请求 | HTTP | 结果 |
|---|---|---|
| `POST /v1/decisions` + 基线模型 + 完整 Predicate 正文 | **400** | `{"error":{"message":"Model is not supported for this request.","code":"model_not_supported","param":"model","type":"invalid_request_error"}}` |
| `POST /v1/zzz-not-a-real-endpoint`（虚构对照） | 404 | `404 page not found` |
| `POST /responses` + 同一 Decisions 正文 | **200** | 普通 Responses 结构，无 `answers` 数组 |

**实测结论**：OpenAI 侧 2026-10-22 GA 之后，Copilot 上游对 `/v1/decisions` 的拒绝行为与 10-15、10-18 逐字一致，未随 GA 放行。本次结果只覆盖这组认证与上游。

## ③ OpenAI Responses 是否列出 `questions`（文档原文核验）

- `Create a model response` 参考页全文（本会话抓取共 16919 行）中 grep `questions`：**0 命中**。
- `Text generation` 指南的 Responses 请求示例只含 `model`、`input`、`instructions`、`reasoning` 等字段，无 `questions`。

**限定表述**：Responses create 的 schema 未列出 `questions`。这只能说明该字段不在官方请求参数清单里，不等于 OpenAI 运行时一定拒绝它。

## ④ VS Code 官方仓库是否有 Decisions 调用（实测检索）

检索范围 `microsoft/vscode` 的 `extensions/copilot` 目录（GitHub code search 与 grep.app）：

| 检索词 | 结果 |
|---|---|
| `/v1/decisions` | 无命中 |
| `decisions` | 命中全部是普通英文词（注释、文档措辞），无 API 调用点 |
| `questions` | 命中全部是 `vscode_askQuestions` 工具的 UI 问题轮播（`questionCarousel`），属聊天界面向用户提问的机制，非请求体字段 |

**实测结论**：当前官方 Copilot 扩展源码中未发现以 Decisions 形状调用后端的位置。

## ⑤ 伪造 payload 对照（实测，全部发往 `/responses`）

| 请求体 | HTTP | 响应 |
|---|---|---|
| `model` + `input` + `questions`（Decisions 形状） | **200** | 普通生成，无 `answers` |
| **`model` + `input` + `foo_bar_baz`（未知字段对照）** | **200** | 普通生成，无 `answers` |
| `model` + `input: 12345`（类型错误） | **400** | `invalid_request_body`，报文明确 `Invalid type for 'input': expected one of a string or array of input items` |
| `moddelll` / `innnput` / `quessstions`（字段名全错） | 400 | `model_not_supported` |
| `nonsense` / `foo` / `bar`（纯随机字段） | 400 | `model_not_supported` |
| 只有 `questions`（缺 `model`） | 400 | `model_not_supported` |

**归因要求**：后三行的 400 因缺少合法 `model` 而触发，不能用来判断字段形状是否被区别处理。唯一观察到的严格校验在 `input` 类型上。

## ⑥ 结论：200 不等于兼容

在核心字段相同（合法 `model` + `input`）的前提下，加 `questions` 与加 `foo_bar_baz` 的行为**无差异**，都是 200 普通生成。

因此 `/responses` 接受 Decisions 正文只说明：`model` 与 `input` 恰好合法，请求退化为普通文本生成。

`questions` 在内部被丢弃、被忽略还是被透传后未使用——**属推断，未经服务端确认**。实测能确认的只有：该字段未产生任何 Decisions 语义（无 `answers`、无概率、无题目处理），且与一个明显的未知字段结果一致。

## ⑦ 方法论记录

- **一个看似被接受的 200 可能是误导项。** 判定某形状是否被兼容，必须带明确的未知字段对照组；本例中 `foo_bar_baz` 与 `questions` 行为相同，直接推翻了「Copilot 认识这个 payload」的假设。
- **必填字段写错时的 400 只能说明请求无效**，无法用于判断某个可选字段是否被区别处理。归因前要先固定所有必填字段。

## ⑧ 证据边界

- 所有结果仅代表本次测试条件（同一上游、同一认证、同一请求头）；不推广为其他账号、其他主机或其他条件。
- `/v1/decisions` 被区别处理不等于该端点已实现可执行的 Decisions 推理；开放条件未验证。
- 未测试其他账号；未向 Model Lab 主机发送请求。
- 本轮共 9 次请求：3 次返回 200（均产生推理用量，其中两次为同一 Decisions 正文发往 Responses 路径、一次为未知字段对照）、5 次返回 400、1 次返回 404（虚构路径）。400 与 404 均无推理用量。
