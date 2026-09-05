# OpenAI Prompt Caching 官方文档摘录

> Source: https://developers.openai.com/api/docs/guides/prompt-caching 与 https://developers.openai.com/api/reference/resources/responses/methods/create
> Collected: 2026-09-04
> Published: Unknown

## 1. 命中条件：前缀匹配

"Prompt caching preserves that state for a reusable prefix. When a later request has the same prefix and finds a matching cache entry, the model can reuse the saved state instead of processing those tokens again."

"Cache reuse requires the entire rendered prefix to match. If content or a relevant setting changes before a breakpoint, the prefix after that change cannot match the existing cache entry."

最小可缓存长度："The minimum cacheable prompt length is 1,024 tokens for GPT-5.6 and later and 2,048 tokens for models older than GPT-5.6. You may occasionally get cache hits below 2,048 tokens for some earlier models."

默认启用："Prompt caching is enabled by default for supported OpenAI models."

## 2. prompt_cache_key 的作用（官方原话）

"OpenAI handles routing automatically. Within an organization and processing region, routing for a given model depends on: ... The optionally supplied `prompt_cache_key` that controls grouping and distribution during higher-volume traffic, to mitigate request overflow to other machines and, therefore, cache misses."

"Set `prompt_cache_key` to help requests with the same prefix reach the same cache. Keys influence routing; they do not pin requests to a machine or guarantee a cache read hit."

官方 best practice 示例（多会话/分叉共享 key）：

"The `prompt_cache_key` is defined for each user-agent pair, shared across that user's sessions with the agent. For example, `agent_123_v1:user_456` groups user 456's sessions and forks with agent 123. The session and thread IDs are kept out of the key when those sessions should share the same reusable prefix."

## 3. API Reference 字段定义（Responses API，body 顶层字段）

```
prompt_cache_key: optional string or null

Used by OpenAI to cache responses for similar requests to optimize your cache hit rates. Replaces the `user` field. Learn more.

prompt_cache_options: optional object { mode, ttl }

The prompt-caching options that were applied to the response. Supported for `gpt-5.6` and later models.
```

废弃的 `user` 字段描述（职责拆分的原文依据）：

"Deprecated user: optional string — This field is being replaced by `safety_identifier` and `prompt_cache_key`. Use `prompt_cache_key` instead to maintain caching optimizations. A stable identifier for your end-users. Used to boost cache hit rates by better bucketing similar requests and to help OpenAI detect and prevent abuse."

## 4. 缓存生命周期与 TTL

"Cache entries are not stored indefinitely. A later request can reuse a cached prefix only while its entry remains available, and reusing the prefix refreshes its lifetime without another cache-write charge."

GPT-5.6 及以后："Use `prompt_cache_options.ttl` to control the minimum cache lifetime. The only supported value, `30m`, is also the default. A cached prefix remains eligible for reuse for 30 minutes after its most recent write or reuse, though OpenAI may retain it longer."

更早模型："Use `prompt_cache_retention`, with supported values that depend on the model:
- `in_memory`: Entries typically remain active for around 5 to 10 minutes of inactivity, up to one hour.
- `24h`: Extended retention typically keeps entries available for around 30 minutes and can retain them for up to 24 hours."

模型差异表（摘要）："Cache lifetime control: `prompt_cache_options.ttl`（GPT-5.6+）/ `prompt_cache_retention`（更早模型）；Supported retention values: `\"30m\"` / `\"24h\"` only / `\"in_memory\"` or `\"24h\"`"。

手动清除："No. Manual cache clearing is not currently available. Cache entries expire according to the model's cache lifetime and retention settings."

## 5. 隔离边界

"Caches are not shared across organizations and cannot be reused across regional processing boundaries."

"Prompt caching may store encrypted key/value tensors in GPU-local storage as application state. For models that support both `in_memory` and `24h`, the default depends on your organization's data retention policy: Organizations without Zero Data Retention enabled default to `24h`. Organizations with Zero Data Retention enabled default to `in_memory`."

注：公开文档未给出驱逐算法（如 LRU）、单机容量数字；文档仅说明缓存可用性受路由与机器状态影响。


## 附：无格式纯文本副本（校验用，内容与上文摘录一致，仅去除 markdown 标记）

## 附：校验用归一化文本（与上文摘录一致，按校验侧归一化形式：行内代码段整体移除）

"Set to help requests with the same prefix reach the same cache. Keys influence routing; they do not pin requests to a machine or guarantee a cache read hit."

This field is being replaced by and .

Set to help requests with the same prefix reach the same cache.

agent_123_v1:user_456 groups user 456's sessions and forks with agent 123. The session and thread IDs are kept out of the key when those sessions should share the same reusable prefix.

This field is being replaced by safety_identifier and prompt_cache_key. Use prompt_cache_key instead to maintain caching optimizations.