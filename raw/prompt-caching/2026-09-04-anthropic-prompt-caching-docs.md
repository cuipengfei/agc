# Anthropic Prompt Caching 官方文档摘录（含 GLM/Kimi 对照指针）

> Source: https://docs.claude.com/en/docs/build-with-claude/prompt-caching
> Collected: 2026-09-04
> Published: Unknown

## 1. 机制：cache_control 断点，无不透明 cache key 字段

"Cache prompt prefixes with `cache_control` to cut costs and latency, using automatic caching or explicit breakpoints with 5-minute or 1-hour TTLs."

"There are two ways to enable prompt caching: [...] The cache breakpoint automatically moves to the last cacheable block in each request, so you don't need to update any `cache_control` markers as the conversation grows."

"Automatic caching is compatible with explicit cache breakpoints. When used together, the automatic cache breakpoint uses one of the 4 available breakpoint slots."

注：Anthropic API 官方文档中不存在 `prompt_cache_key` 类参数（反方查询 "Anthropic prompt_cache_key" 无命中）。

## 2. TTL

"By default, automatic caching uses a 5-minute TTL. You can specify a 1-hour TTL at 2x the base input token price:"

```
{ "cache_control": { "type": "ephemeral", "ttl": "1h" } }
```

"Cached entries have a minimum lifetime of 5 minutes (standard) or 1 hour (extended), after which they are promptly, though not immediately, deleted."

## 3. 隔离与存储

"KV (key-value) cache representations and cryptographic hashes of cached content are held in memory only and are not stored at rest. Cache entries are isolated between organizations and, on the Claude API, Claude Platform on AWS, and Microsoft Foundry, between workspaces within an organization."

## 4. 其他 provider 对照指针（librarian 复核）

- GLM / Z.AI Context Caching（自动识别重复上下文，无显式 cache key 字段）：https://docs.z.ai/guides/capabilities/cache
- Kimi / Moonshot Context Caching（官方称无需 cache ID 或额外参数）：https://platform.kimi.ai/docs/guide/use-context-caching-feature-of-kimi-api
- Kimi 社区帖提及 `prompt_cache_key` 作为集群路由提示（官方文档与社区信息层级不同）：https://forum.moonshot.ai/t/cached-tokens-drop-when-tool-has-interleaved-thinking/216
