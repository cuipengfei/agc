# Copilot 网关 cache retention 字段实测与 warming 不触发根因

> Sources: 本机 8787 API 实测, 2026-11-03; OMP 18.16.0 源码取证, 2026-11-03
> Raw: [Responses cache retention 字段实测与 gpt-6-luna 命中探针](../../raw/copilot-gateway/2026-11-03-responses-cache-retention-field-probe.md); [OMP Provider 协议层配置项源码取证](../../raw/omp-config/2026-11-03-provider-protocol-config-semantics.md)
> Updated: 2026-11-03

## Overview

本机 8787 网关 Responses 通道的 7 个成功响应模型中，6 个 GPT 回显 `prompt_cache_retention: "24h"`，mai-code 回显 `"in_memory"`。gpt-6-luna 经 4856 token 双请求验证了缓存命中路径。OMP 的 `cacheWarming` 对这些模型当前不触发，根因是它们没有 `promptCache` 寿命声明，而 TTL 只来自该声明，不来自响应回显。

## Responses 通道字段回显

12 个模型中 7 个返回 200：

| 模型 | 回显值 |
|---|---|
| gpt-6-astra / gpt-5.6-terra / gpt-6.1-sol / gpt-6-luna / gpt-6-sol / gpt-5.3-codex | `"24h"` |
| mai-code-1.1-flash | `"in_memory"` |

5 个返回错误，响应体无该字段：2 个 Gemini 返回 502（错误文本 `Chat Completions fallback returned a stream`），3 个 embedding 返回 400（`This model does not support the responses endpoint.`）。

Chat Completions 通道对照：2 个 Gemini 返回 200，响应体不含 `prompt_cache_retention`，缓存计量在 `usage.prompt_tokens_details.cached_tokens`。其余推理模型在 Chat 端点返回 400。

## gpt-6-luna 命中探针

对 gpt-6-luna 发两次相同的 4856 token 长前缀请求：

| | cache_write_tokens | cached_tokens |
|---|---|---|
| 第一次 | 4853 | 0 |
| 第二次 | 0 | 4853 |

首次写入 4853 token，二次全部命中。此探针只覆盖 gpt-6-luna 一个模型；其余 5 个 GPT 仅验证了字段回显，未做命中探针。

## cacheWarming 不触发的根因

OMP 的 cache warmer 只对声明了 `promptCache` 寿命的模型调度刷新。TTL 来自 `model.promptCache[tier]`（catalog 规则 `prompt-cache` 轴或 models.yml `promptCache` 字段），无声明则 `getPromptCacheTtlMs` 返回 undefined，warmer 不调度。

catalog 规则里目前只有 Anthropic、Factory Droid、Antigravity 声明了 `prompt-cache` 生命周期，OpenAI 类没有。8787 的三个 provider（`c8787`、`c8787-chat`、`openai-codex`）的模型均无 models.yml `promptCache` 字段。

响应回显的 `prompt_cache_retention: "24h"` 是上游的档位回显，不回填 OMP 的 TTL 元数据。要让 8787 模型参与 warming，需在 models.yml 显式写 `promptCache`，但上游真实 TTL 未确认。

## cacheRetention long 的 wire 行为

`cacheRetention: long` 在 Responses 通道满足 `supportsLongPromptCacheRetention` + 有 promptCacheKey + 不支持 explicit breakpoints 时，OMP 显式发 `prompt_cache_retention: "24h"`。c8787 满足这三个条件（compat 设了 `supportsLongPromptCacheRetention: true`，`officialEndpoint: true` 覆盖后 promptCacheKey 由 sessionId 派生）。OMP 请求与上游能力一致，实测回显也是 `"24h"`。

## See Also

- [Prompt Cache：前缀匹配与 cache key 的真实分工](cache-key-and-prefix-matching.md)
- [Gemini 4 Argon 上下文缓存：隐式缓存的掉点现象与社区反馈](gemini-4-argon-copilot-cache-drop.md)
- [OMP 配置语义手册](../omp-config/config-semantics.md) — Provider 协议层小节覆盖 cacheRetention/cacheWarming/textVerbosity/officialEndpoint 等
