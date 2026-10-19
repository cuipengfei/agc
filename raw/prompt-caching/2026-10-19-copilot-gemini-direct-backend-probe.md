# 直连 Copilot 后端探针数值摘录（Gemini 3.8 Flash）

> Source: 本机实测（脚本 /tmp/agc-gemini-cache-probe.mjs；原始记录 /tmp/agc-gemini-cache-results.jsonl；运行输出 artifact://44）
> Collected: 2026-10-19
> Published: n/a（本机实验）

端点：`https://api.business.githubcopilot.com/chat/completions`（经 tester skill 认证，认证响应 endpoints 决定域名）。实时 `/models` 目录确认模型，响应回报 `gemini-3.8-flash`。

探针参数：固定 session、system instructions、工具定义；每轮请求前逐条断言既有 messages 序列不变，仅追加真实 assistant 回复、工具结果或继续指令；第 4 轮前等待 290 秒；流式请求、`include_usage: true`；预算最多 12 次、错误即停。

## 主实验逐轮数值（input_tokens / prompt_tokens_details.cached_tokens）

下表为第 2 次运行（新 session）的 5 轮。第 1 次运行为前置 2 次请求，独立 session，数值与下表前两行相同（93,015 / 0 与 95,767 / 90,029），两次运行不可混为同一连续会话。

| 轮次 | 与上一次完成的间隔 | input | cached | cached/input |
|---|---|---:|---:|---:|
| 1 | — | 93,015 | 0 | 0% |
| 2 | 15 秒 | 95,767 | 90,029 | 94.01% |
| 3 | 15 秒 | 95,892 | 90,023 | 93.88% |
| 4 | 4 分 50 秒 | 98,675 | 0 | 0% |
| 5 | 15 秒 | 98,819 | 94,088 | 95.21% |
## 汇总（按运行分组）

- 前置运行（第 1 次运行，独立 session，2 次请求）：input 93,015 + 95,767 = 188,782 tokens；cached 0 + 90,029 = 90,029 tokens。模型以 `stop` 结束回复而停止，未伪造续轮。
- 主实验运行（第 2 次运行，新 session，5 轮）：input 93,015 + 95,767 + 95,892 + 98,675 + 98,819 = 482,168 tokens；cached 0 + 90,029 + 90,023 + 0 + 94,088 = 274,140 tokens。取得“下降 + 恢复”证据后提前停止。
- 两次运行合计：7 次请求全部 HTTP 200；总输入 188,782 + 482,168 = 670,950 tokens；报告的缓存读取 90,029 + 274,140 = 364,169 tokens。
- 第 4 轮为暂停后零缓存，第 5 轮恢复高命中。

采集备注：仅摘录数值与参数，不粘贴完整 usage JSONL、请求正文与凭据。结构化过程记录见 `experiments/2026-10-19-gemini-38-flash-cache-drop-repro.md`。
