# Responses API web_search 服务端执行与 usage 计量 —— 实测 probe 原始记录

> Source: 本机实测（curl 直连 Responses API 兼容端点，2026-09-19）
> Collected: 2026-09-19
> Published: 2026-09-19
> 实测环境: gpt-5.6-luna 模型经本地代理链（OMP → 8787 headroom → 4140 copilot-api → GitHub Copilot Business 后端）
> 原始文件: /tmp/codex-search-probe/（body.sse 等；含凭据相关 header 已脱敏不入库）

## 背景

问题：OMP TUI 显示 web search 工具调用结束时 metadata `in 103110 · out 6518`。一个「小 query」为何 input 有 103k？需要实测确认 input_tokens 的构成。

方法：绕过 OMP，直接 curl Responses API 兼容端点发 web_search 请求，流式（SSE）保存完整响应，逐 chunk 解析。

## Probe 请求形状（8787 与 4140 相同 body）

```json
{
  "model": "gpt-5.6-luna",
  "stream": true,
  "store": false,
  "include": ["web_search_call.action.sources"],
  "input": [{"type":"message","role":"user","content":[{"type":"input_text","text":"What is the latest Bun.js version?"}]}],
  "tools": [{"type":"web_search","search_context_size":"high"}],
  "tool_choice": {"type":"web_search"}
}
```

客户端发送的 input 只有一条 query（约 10 tokens），无任何对话历史或 system prompt。

## 实测结果 1：SSE 事件流结构（26 个 event/data frame）

按空行分隔的 SSE frame 共 26 个（HTTP 传输层底层 chunk 数无法从保存文件得知）：

| # | event | 内容 | data 记录长度(bytes) |
|---|---|---|---|
| 1 | response.created | response 元数据（id/model/instructions，reasoning 加密） | 1753 |
| 2 | response.in_progress | 进行中状态 | 1757 |
| 3 | output_item.added | reasoning block 1（encrypted_content） | 5459 |
| 4 | output_item.done | reasoning 1 完成 | 5702 |
| 5 | output_item.added | web_search_call item | 559 |
| 6 | response.web_search_call.in_progress | 搜索 1 开始 | 517 |
| 7 | response.web_search_call.searching | 搜索 1 执行中 | 515 |
| 8 | response.web_search_call.completed | 搜索 1 完成 | 515 |
| 9 | output_item.done | web_search_call 1（action.sources = 12 个 URL） | 1696 |
| 10 | output_item.added | reasoning block 2（加密） | 5459 |
| 11 | output_item.done | reasoning 2 完成 | 5927 |
| 12 | output_item.added | web_search_call item 2 | 560 |
| 13 | web_search_call.in_progress | 搜索 2 开始 | 518 |
| 14 | web_search_call.searching | 搜索 2 执行中 | 516 |
| 15 | web_search_call.completed | 搜索 2 完成 | 516 |
| 16 | output_item.done | web_search_call 2（action.sources = 13 个 URL） | 1379 |
| 17 | output_item.added | reasoning block 3（加密） | 5460 |
| 18 | output_item.done | reasoning 3 完成 | 6323 |
| 19 | output_item.added | message item | 607 |
| 20 | content_part.added | message content part | 598 |
| 21 | output_text.delta | 答案文本（本 probe 仅 1 个 delta） | 836 |
| 22 | output_text.annotation.added | url_citation 注解（github.com/oven-sh/bun/releases） | 736 |
| 23 | output_text.done | 完整答案文本 | 814 |
| 24 | content_part.done | content part 完成 | 1026 |
| 25 | output_item.done | message item 完成 | 1096 |
| 26 | response.completed | copilot_usage + 完整 response（含标准 usage） | 24187 |

观察（本 probe，不泛化）：
- 3 个 reasoning block 全部为 `encrypted_content`（Copilot 后端对 reasoning 加密，不可读）
- 2 个 web_search_call，sources 共 25 个 URL（12 + 13）
- web_search_call 的 action.sources 只回传 URL 元数据（url/title/snippet 等），不回传页面正文
- 本 probe 文本只有 1 个 output_text.delta（模型在全部搜索+推理后一次性给答案）
- usage 只在最后 response.completed

## 实测结果 2：usage 计量（8787 probe，独立无历史）

标准 usage（OpenAI Responses 格式）：

```json
{
  "input_tokens": 12475,
  "input_tokens_details": {"cache_write_tokens": 4251, "cached_tokens": 0},
  "output_tokens": 347,
  "output_tokens_details": {"reasoning_tokens": 267},
  "total_tokens": 12822
}
```

关键点：**纯独立请求（零对话历史，query 约 10 tokens）input_tokens 也有 12475**。多出的部分是服务端在执行 web search 过程中注入/产生的内容所消耗的 input——不是客户端发送的上下文。

OMP 源码佐证（`oh-my-pi/packages/coding-agent/src/web/search/providers/codex.ts`）：
- 请求 input 只含当前 query（512-518 行），不含 session 历史
- OMP 显示的 inputTokens = `input_tokens - cached_tokens`（629-635 行）

## 实测结果 3：prompt cache 存在（8787 vs 4140 对照）

同一 query 先后打 8787（经 headroom）和 4140（直连）：

- 8787 probe：`input_tokens_details.cache_write_tokens=4251`、`cached_tokens=0`（写入缓存）
- 4140 probe（随后）：`cached_tokens=4251`（命中刚才写入的缓存）

证明服务端存在 prompt cache：第一次写入、后续命中。

## 实测结果 4：Copilot 计费字段（copilot_usage，response.completed 顶层）

```json
"copilot_usage": {
  "token_details": [
    {"batch_size":1000000, "cost_per_batch":20000000000,  "model":"gpt-5.6-luna", "token_count":8224, "token_type":"input"},
    {"batch_size":1000000, "cost_per_batch":2000000000,   "model":"gpt-5.6-luna", "token_count":0,    "token_type":"cache_read"},
    {"batch_size":1000000, "cost_per_batch":25000000000,  "model":"gpt-5.6-luna", "token_count":4251, "token_type":"cache_write"},
    {"batch_size":1000000, "cost_per_batch":120000000000, "model":"gpt-5.6-luna", "token_count":347,  "token_type":"output"}
  ],
  "total_nano_aiu": 312395000
}
```

对账（按 batch_size=1M、cost_per_batch 单位 nano=1e-9）：
- input: 8224 × 20/1M = 0.16448
- cache_read: 0
- cache_write: 4251 × 25/1M = 0.106275
- output: 347 × 120/1M = 0.04164
- 合计 = 0.312395 = 312395000 nano，与 total_nano_aiu 精确一致

字段语义注：「AIU」是字段名推断的计费单位（`total_nano_aiu`），无官方文档佐证其为正式单位名。

copilot_usage.input=8224 ≠ 标准 usage.input_tokens=12475：差 4251 = cache_write_tokens。两套计量视角不同（copilot_usage 把 cache_write 从 input 拆出单列）。

## 实测结果 5：tool_usage 跟踪搜索次数

response 顶层 `tool_usage`：

```json
"tool_usage": {
  "image_gen": {"input_tokens":0, "output_tokens":0, "num_requests":0},
  "web_search": {"num_requests": 2}
}
```

- `web_search.num_requests=2`：与 SSE 里 2 个 web_search_call 一致，Copilot 后端单独跟踪搜索次数
- `image_gen` 维度存在但全 0（本 probe 未用 image gen）

## 实测结果 6：4140 直连透传的上游 headers（8787 不透传）

8787（headroom/uvicorn）只回自己的响应头；4140 直连透传 Copilot 后端 headers：

```
x-github-backend: Kubernetes
x-github-edge-region: iad
x-quota-snapshot-premium_interactions: ent=50000 rem=55.9% totRem=27978 reset=2026-10-01...
x-quota-snapshot-chat: rem=100.0
x-quota-snapshot-completions: rem=100.0
x-copilot-api-exp-assignment-context: <多个实验 ID>
```

观察：
- 后端跑 Kubernetes，边缘节点 iad（Ashburn）
- 存在 premium_interactions 配额体系（ent=50000、totRem=27978、2026-10-01 重置）
- 这些 headers 揭示基础设施与配额，但不揭示搜索的 crawl/cache/live 实现

## 实测结果 7：search_context_size 对照（low/medium/high，同 query）

| context_size | input_tokens | web_search_calls | sources 数 |
|---|---|---|---|
| high | 12475 | 2 | 25 |
| low | 11555 | 2 | 12 |
| medium | 8489 | 1 | 13 |

非单调（low 11555 > medium 8489），说明 input 大小由搜索路径深度（web_search_call 数、reasoning 深度）决定，不直接受 context_size 单调控制。不能把某次 input 定量归因于 context_size 或 sources 数。

## 未证实（黑盒）

- 搜索服务端的 crawl / index / live 抓取具体实现
- input_tokens 的确切分解（多少是网页正文、多少是隐藏 system/tool prompt、多少是搜索中间上下文）——无法从 sources URL 数推出 token 数
- 103110（session 里那次）的确切构成——无那次原始 usage
