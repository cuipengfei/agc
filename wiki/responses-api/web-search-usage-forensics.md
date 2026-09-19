# Responses API web_search 服务端执行与 usage 计量

> Sources: 本机实测（gpt-5.6-luna 经 GitHub Copilot Business 后端，2026-09-19）
> Raw: [web-search-usage-probe](../../raw/responses-api/2026-09-19-web-search-usage-probe.md)
> Updated: 2026-09-19

Responses API 的 `web_search` 工具是**服务端执行**的：客户端只发 query，搜索由上游完成。本文记录实测得到的通用规律——以 gpt-5.6-luna 经 Copilot Business 后端为实测实例，但机制面向所有实现 Responses API `web_search` 的服务端。

## 核心规律：小 query 也可能有大 input

客户端发送的 `input` 只有当前 query（约 10 tokens），但上游报告的 `usage.input_tokens` 可能上万。

实测：纯独立请求（零对话历史、零 system prompt）发 `web_search`，`input_tokens = 12475`。

多出的部分是**服务端执行搜索时注入/产生的内容**所消耗的 input——网页内容、搜索中间上下文、隐藏指令等，不是客户端发送的上下文。

**推论**：OMP/其他客户端显示的 `in <N>` 是上游报告的 input_tokens，不是客户端实际发送的字数。工具调用的「input」会随服务端搜索深度增大，与本端 session 历史无关。

## SSE 事件流结构

流式 web_search 响应的典型 frame 序列：

```
response.created → response.in_progress
  ├─ [reasoning block]（可能加密，encrypted_content 不可读）
  ├─ web_search_call: in_progress → searching → completed
  │    └─ output_item.done 附 action.sources（URL 元数据列表）
  ├─ [reasoning block] ...
  └─ message: content_part.added → output_text.delta → annotation(url_citation) → done
response.completed（含 usage）
```

要点：

- **reasoning 内容可能加密**：Copilot 后端返回 `encrypted_content`，客户端看不到推理文本。
- **sources 只回 URL 元数据**：`web_search_call.action.sources` 含 url/title/snippet，**不含页面正文**。正文 token 消耗发生在服务端，不体现在客户端可见字段里。
- **文本可能一次性流出**：本 probe 全程只有 1 个 `output_text.delta`——模型在全部搜索+推理完成后一次性给答案（属本次观察，非通用保证）。
- **usage 只在最后一个 `response.completed` frame**。

## Usage 字段与缓存

标准 `usage`（OpenAI Responses 格式）：

```json
{
  "input_tokens": 12475,
  "input_tokens_details": {"cache_write_tokens": 4251, "cached_tokens": 0},
  "output_tokens": 347,
  "output_tokens_details": {"reasoning_tokens": 267},
  "total_tokens": 12822
}
```

- **prompt cache 存在**：首次请求 `cache_write_tokens>0`（写入），后续相同前缀请求 `cached_tokens>0`（命中）。实测同 query 先后两次请求，第二次 `cached_tokens=4251` 精确命中第一次写入量。
- 部分客户端（如 OMP）显示的 input = `input_tokens - cached_tokens`。

## 服务端 tool_usage 跟踪

响应顶层 `tool_usage` 按工具类型跟踪调用：

```json
"tool_usage": {
  "image_gen": {"num_requests": 0},
  "web_search": {"num_requests": 2}
}
```

`web_search.num_requests` 与 SSE 里的 web_search_call 数一致——服务端单独跟踪搜索次数（可能用于配额/计费）。

## 扩展：Copilot 计费字段（后端特有）

Copilot 后端在 `response.completed` 附加非标准 `copilot_usage`：按 token 类型（input/cache_read/cache_write/output）分开给 `cost_per_batch`，并给可对账的 `total_nano_aiu`。实测可按 `batch_size=1M` 精确复算总额。这是 Copilot 特有扩展，非 Responses API 标准。

## 已知边界（黑盒）

- **input_tokens 的确切分解未知**：多少是网页正文、多少是隐藏 system/tool prompt、多少是搜索中间上下文——无法从 sources URL 数推算 token 数。
- **搜索深度不单调受 `search_context_size` 控制**：实测 low/medium/high 的 input_tokens 为 11555/8489/12475（非单调），由搜索路径（web_search_call 数、reasoning 深度）决定。
- **crawl/index/live 实现**：服务端搜索是预先建索引、缓存复用还是实时抓取，本文实测无法证实。

## See Also

- [OMP web search 自定义 Responses API 端点](../omp-tips/web-search-custom-responses-provider.md)
- [OMP web search provider 清单与 fallback](../omp-tips/web-search-provider-inventory.md)
