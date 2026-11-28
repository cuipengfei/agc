# Copilot 网关 cache retention 字段实测与保温触发条件

> Sources: 本机 8787 API 实测, 2026-11-03; OMP 18.16.0 源码取证, 2026-11-03; OMP 会话后续核查与离线运行, 2026-11-04; 本机 stats.db 与 28 份原始会话, 2026-11-28
> Raw: [Responses cache retention 字段实测与 gpt-6-luna 命中探针](../../raw/copilot-gateway/2026-11-03-responses-cache-retention-field-probe.md); [OMP Provider 协议层配置项源码取证](../../raw/omp-config/2026-11-03-provider-protocol-config-semantics.md); [OMP Provider 配置说法核查与离线运行取证](../../raw/omp-config/2026-11-04-provider-config-claim-audit-and-runtime-probes.md); [OMP 本机 provider 端点切换](../../raw/omp-config/2026-11-28-local-provider-8787-to-4140-switch.md); [GPT-6.1 Sol 的命中与请求间隔](../../raw/copilot-gateway/2026-11-28-gpt-sol-cache-interval-from-usage-history.md); [4140 目录快照与 OMP 配置变更](../../raw/copilot-gateway/2026-11-28-4140-model-catalog-snapshot.md); [OMP 19.2.1 保温实测](../../raw/prompt-caching/2026-11-28-omp-cache-warmer-live-behavior.md)
> Updated: 2026-11-28

## Overview

本机 8787 网关 Responses 通道的 7 个成功响应模型中，6 个 GPT 在响应 body 返回 `prompt_cache_retention: "24h"`，mai-code 返回 `"in_memory"`。gpt-6-luna 经 4856 token 双请求取得了写入转命中的 usage 报告。OMP 的 `cacheWarming` 原本对这些模型不触发，根因是缺少 `promptCache` 寿命声明，而 TTL 只来自该声明，不来自响应回显；2026-11-28 已为 5 个现役 GPT 补上声明并启用保温，实际 TTL 和账单折扣仍未验证。

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

## 为什么原先不触发

OMP 的 cache warmer 只对声明了 `promptCache` 寿命的模型调度刷新。TTL 来自 `model.promptCache[tier]`（catalog 规则 `prompt-cache` 轴或 models.yml `promptCache` 字段），无声明则 `getPromptCacheTtlMs` 返回 undefined，warmer 不调度。

catalog 规则里目前只有 Anthropic、Factory Droid、Antigravity 声明了 `prompt-cache` 生命周期，OpenAI 类没有。8787 的两个 provider（`c8787`、`c8787-chat`）的模型均无 models.yml `promptCache` 字段；`openai-codex` 已于 2026-11-28 移除。

响应 body 返回的 `prompt_cache_retention: "24h"` 是档位回显，不回填 OMP 的 TTL 元数据。要让 8787 模型参与 warming，需在 models.yml 显式写 `promptCache`，但固定 `long: 86400` 时 warmer 首次调度即触发一小时安全窗并停止，不能作为启用方法；上游真实 TTL 未确认。

## cacheRetention long 的 wire 行为

`cacheRetention: long` 在 Responses 通道满足 `supportsLongPromptCacheRetention` + 有 promptCacheKey + 不支持 explicit breakpoints 时，OMP 显式发 `prompt_cache_retention: "24h"`。c8787 满足这三个条件（compat 设了 `supportsLongPromptCacheRetention: true`；promptCacheKey 由 `promptCacheKey ?? sessionId` 派生）。离线构造结果有 `"24h"`，但 8787 是否转发该字段未验证；直接探针未携带 OMP `cacheRetention`，不能证明 OMP 设置产生了该回显。

## GPT 的命中与请求间隔（2026-11-28）

统计库中 gpt-6.1-sol 共 6,612 条记录，其中 agent_type 为 main 的 5,630 条，库内最新记录为 2026-11-03；28 份原始会话补充到 2026-11-19，含 7,719 条该模型记录（7,501 条对话消息、218 条辅助请求）。库里 203 条标为 main 的记录在原始会话里是输入预测等辅助调用，会真实发往上游并可能刷新前缀，不能当普通对话样本。

剔除有中途模型调用、历史改写、跨分支和失败请求后的相邻对话对按闲置分桶：15–30 分钟 17 对（13 对有缓存、4 对无）、30–60 分钟 5 对（全部无缓存）、60–120 分钟 1 对、120–1440 分钟 22 对、1440 分钟以上 11 对，合计 56 对。没有任何中途活动的干净样本只有两组：闲置 22.038 分钟时前一次输入 153,380、本次输入 154,551、缓存读取 153,377（占 0.9924）；闲置 51.5967 分钟时前一次输入 73,167、本次输入 74,466、缓存读取 0。

宿主真实链路的保温实测是 7 次连续命中 102,728 tokens、单次费用 0.0143808、累计 0.1006656，第 8 次跨过 30 分钟闲置上限停止；同一模型改用脚本直连后端时，闲置 240.327 秒后的首次重放 cacheRead 为 0、耗时 271.859 秒、计费 0.038708。两组结论方向相反，说明保温效果必须固定在实际使用链路上测。

## 配置建议

保留 `providers.cacheRetention: long` 与 `providers.cacheWarming: idle`。Gemini 继续使用 Chat Completions；两个 Gemini 在 Responses 通道的两次请求均返回 502，长期可用性未验证。

2026-11-28 的配置对 4140 目录中现役的 5 个 GPT Responses 模型（gpt-5.3-codex、gpt-6-luna、gpt-6.1-sol、gpt-6.1-terra、gpt-6-astra）在 models.yml 声明 `promptCache: { short: 1500, long: 1500 }`，由保温扩展放行 `c8787` 下 api 为 `openai-responses` 的 `gpt-` 模型；`openai-decisions` 与 `typesafe` 两类不参与保温。同时删除目录中不存在的 gpt-5.4-mini、gpt-5.6-sol、gpt-5.6-terra、gpt-5.6-luna、gpt-6-sol，以及 fallbackChains.web 中指向 `c8787/gpt-5.6-luna` 的一行。

## See Also

- [Prompt Cache：前缀匹配与 cache key 的真实分工](cache-key-and-prefix-matching.md)
- [Gemini 4 Argon 上下文缓存：隐式缓存的掉点现象与社区反馈](gemini-4-argon-copilot-cache-drop.md)
- [OMP 配置语义手册](../omp-config/config-semantics.md) — Provider 协议层小节覆盖 cacheRetention/cacheWarming/textVerbosity/officialEndpoint 等
- [OMP 缓存保温的调度、门槛与实测边界](omp-cache-warming-tuning.md)
- [copilot_cache_control 的选点规则与 Gemini 适用性](copilot-cache-control-breakpoint-placement.md)
