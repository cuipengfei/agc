# GitHub Copilot 平台 `/v1/decisions` 端点行为复测（2026-10-18 会话实测）

> Source: 本会话对 GitHub Copilot 上游的实际 HTTP 请求与响应（2026-10-18）
> Collected: 2026-10-18
> Published: Unknown（探测记录，非已发表来源）

证据分级标签：**文档原文**＝逐字引用；**实测**＝本会话实际抓取；**推断**＝由证据推得但未直接证实。

本 raw 不含任何主机名、账号标识、认证 token、cookie 或完整内部响应 ID。Copilot 被测模型一律以匿名代号表述：基线模型（先前验证可用）、被测模型 A、被测模型 B、被测模型 C。

## ① 探测目标与认证

与 10-15 探测条件一致：同一上游、同一认证流程、同一请求头组合。测试正文采用 OpenAI Decisions API 官方文档示例格式（`model`/`input`/`questions` 结构，predicate 题型）。

## ② 完整 Decisions 正文发到 Responses 路径的多模型对照（实测）

将完整 Decisions 请求体（含 `model`、`input`、`questions`）POST 到 Responses 路径，分别使用多个被测模型：

| 被试对象 | HTTP | 结果 |
|---|---|---|
| 被测模型 A、B | **200** | 普通 Responses 结构：`status: "completed"`，文本位于 `content[].text`，**无 `answers` 数组或 `probability` 字段** |
| 被测模型 C | **400** | `unsupported_api_for_model`（该模型不支持 Responses API） |

**实测结论**：被测模型 A、B 对 Decisions payload 的处理方式与基线模型一致——按普通 Responses 请求处理、`questions` 被忽略、无 `answers`。被测模型 C 在 Responses 路径直接拒绝。

## ③ `/v1/decisions` 端点重测（实测）

使用基线模型与多个其他被测模型，POST 完整 Decisions 请求体到 `/v1/decisions`：

- 基线模型：400 `model_not_supported`（与 10-15 一致）
- 被测模型 A、B：400 `model_not_supported`
- 被测模型 C：400 `model_not_supported`

**实测结论**：`/v1/decisions` 对全部被测模型的拒绝行为与 10-15 完全一致，三天内无变化。

## ④ 基线模型复测（实测）

基线模型 + 完整 Decisions payload 发到 Responses 路径，2026-10-18 复测：

- HTTP **200**，普通 Responses 结构，`status: "completed"`，文本为客服回复，**无 `answers`**。
- 与 10-15 基线一致：`questions` 未被使用（推断）。

## ⑤ 推理用量（实测）

本轮共产生 **3 次成功**的 Responses 推理请求（被测模型 A、B 各 1 次、基线模型 1 次），均为普通文本生成。被测模型 C 请求返回 400，未产生推理用量。

## ⑥ 证据边界

- 所有探测结果仅代表本次测试条件（同一上游、同一认证、同一请求头组合）；不推广为其他账号、其他主机或其他条件。
- `/v1/decisions` 被区别处理不等于该端点已实现可执行的 Decisions 推理；功能状态与权限条件未验证。
- 未测试其他账号；未向 Model Lab 主机发送请求（10-15 已记录该主机存在）。
- 响应头 `x-github-request-id` 可用于向官方排查，值未写入本 raw。