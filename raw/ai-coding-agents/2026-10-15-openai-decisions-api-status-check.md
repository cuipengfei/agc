# OpenAI Decisions API 当前发布状态与官方请求示例核验（2026-10-15 会话实测）

> Source: OpenAI Decisions guide（https://developers.openai.com/api/docs/guides/decisions，2026-10-15 直读）；OpenAI API changelog（https://developers.openai.com/api/docs/changelog，2026-10-15 直读）；OpenAI API reference Create a decision（https://developers.openai.com/api/reference/resources/decisions/methods/create，2026-10-15 直读）
> Collected: 2026-10-15
> Published: Unknown（本轮未取到页面发布日期）

证据分级标签：**文档原文**＝逐字引用；**实测**＝本会话实际抓取；**推断**＝由证据推得但未直接证实。

## ① 发布状态（2026-10-15 直读）

Decisions guide 页原文：

> "The Decisions API is in public beta, and we expect to GA in the coming weeks."

指南页底部 "Use the Decisions API" 链接指向 `api.openai.com` 前缀的 chat completions 示例（此前会话记录已指出该不一致，本 raw 不复述）。

API reference 把 Decisions 列在 **Beta APIs** 分组下。

## ② Create a decision 参考页完整请求示例（文档原文，逐字）

官方 reference 提供的 cURL 示例，请求路径 `https://api.openai.com/v1/decisions`：

```json
{
  "model": "gpt-6-luna",
  "input": "The package arrived with a broken screen.",
  "questions": [
    {
      "type": "predicate",
      "name": "damaged",
      "instructions": "Does the customer report a damaged item?"
    }
  ]
}
```

## ③ Changelog 条目（2026-10-15 直读）

OpenAI API changelog 与 Decisions 相关的最新条目：

> "Released the Decisions API in beta with `gpt-6-luna`."（2026-10-06）

页面顶部最新条目为 **Oct 8, 2026**（GPT-6.1 Sol 的 Ultrafast mode），本轮未在 changelog 找到 Decisions GA 条目。

## ④ 与 2026-10-07 记录的连续性

2026-10-07 记录（raw/ai-coding-agents/2026-10-07-openai-decisions-api-beta-schema.md）已收录状态、请求 schema、响应 schema 与定价。本 raw 不重录 schema 细节，只新增 2026-10-15 核验结论：**截至该日官方文档仍标注 public beta，GA 未宣布**。changelog 在 10-08 至 10-15 之间无 Decisions GA 条目；网页搜索与官方文档核对未发现 GA 宣告。

## ⑤ 证据边界

- changelog 抓取只到 Oct 8，**不能**据此证明 10-09 至 10-15 之间完全没有未记录的 GA 宣告（本轮未发现，不等于不存在）。
- 官方 guide 页与模型文档关于 Decisions 端点支持的表述存在内部不一致，本 raw 不推断其原因。
- 官方文档状态仅代表文档所述，未含任何推理调用验证。
