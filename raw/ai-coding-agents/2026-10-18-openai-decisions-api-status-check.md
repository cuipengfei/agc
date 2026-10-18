# OpenAI Decisions API 发布状态复查（2026-10-18 会话实测）

> Source: OpenAI Decisions guide（https://developers.openai.com/api/docs/guides/decisions，2026-10-18 直读）；OpenAI API changelog（https://developers.openai.com/api/docs/changelog，2026-10-18 直读）
> Collected: 2026-10-18
> Published: Unknown（本轮未取到页面发布日期）

证据分级标签：**文档原文**＝逐字引用；**实测**＝本会话实际抓取；**推断**＝由证据推得但未直接证实。

## ① 发布状态（2026-10-18 直读）

Decisions guide 页原文，与 2026-10-15 核验时逐字一致：

> "The Decisions API is in public beta, and we expect to GA in the coming weeks."

页面仍写明当前唯一可用模型为 `gpt-6-luna`，专用端点为 `POST /v1/decisions`。API reference 仍将 Decisions 列在 **Beta APIs** 分组下。

网页搜索与官方文档核对仍未发现 GA 宣告；官方未给出具体 GA 日期。

## ② Changelog 新增条目（2026-10-18 直读）

与 10-15 相比，changelog 页面顶部最新条目推进到 **Oct 16, 2026**（prompt-to-voice）。与 Decisions 相关的新增条目：

| 日期 | 条目 | 类型 |
|---|---|---|
| Oct 15 | GPT-Live 增加原生 Decisions 集成（语音会话中委托决策） | Feature |
| Oct 6 | 发布 Decisions API in beta（`gpt-6-luna`） | Feature（10-15 已记录） |

10-15 至 10-18 之间无 Decisions GA 条目。Oct 15 的 GPT-Live 集成说明 Decisions 在扩大应用面，但官方仍标注 beta。

## ③ 指南页新增内容（2026-10-18 直读）

- SDK 四语言示例新增图片输入示例（检查产品照片损坏场景）。
- 存在 Decisions Playground（`platform.openai.com/decisions`）。

## ④ 与既有记录的差异

| 项 | 10-15 记录 | 10-18 复查 |
|---|---|---|
| 指南页状态措辞 | public beta / coming weeks | 逐字未变 |
| changelog 顶部 | Oct 8 | Oct 16（prompt-to-voice） |
| Decisions 相关条目 | 仅 Oct 6 beta 发布 | 新增 Oct 15 GPT-Live 集成 |
| SDK 示例 | 文本输入 | 新增图片输入 |
| GA 宣告 | 未发现 | 仍未发现 |

## ⑤ 证据边界

- 官方文档状态仅代表文档所述，未含任何推理调用验证。
- changelog 抓取只到 Oct 16；不能据此证明其后完全没有未记录的 GA 宣告（本轮未发现，不等于不存在）。
- 官方 guide 页底部 "Use the Decisions API" 链接指向 chat completions 示例，与 Decisions 端点路径不一致，原因未验证（10-15 已记录）。