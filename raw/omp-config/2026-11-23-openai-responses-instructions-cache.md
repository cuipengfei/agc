# OpenAI Responses instructions 缓存与 OMP GPT-6.2 绕过规则

> Source: 本机 `@oh-my-pi/pi-catalog` 与 `@oh-my-pi/pi-ai` 19.1.1 源码；https://github.com/openai/codex/issues/62312
> Collected: 2026-11-23
> Published: 2026-11-18 至 2026-11-23

## OMP 的模型规则

来源：`packages/catalog/src/compat/rules/classes/openai.kdl`。

```kdl
// GPT-6.2 never prompt-caches the Responses `instructions` field, on any host
// (OpenAI + third-party proxies); re-homes system prompts to a leading
// developer input item so the large system prompt actually caches.
// Tracked upstream in openai/codex#62312.
revision "=6.2" {
    uncached-instructions #true
}
```

来源：`packages/catalog/src/compat/axes.ts`。

```ts
"uncached-instructions": wire("uncachedInstructions", ["openai-responses"]),
```

该兼容轴声明只应用于 `openai-responses`。不能仅凭这条 KDL 推断 OMP 的 `openai-codex-responses` 或其他 API 路由也采用同一写法。

## 请求构造位置

来源：`packages/ai/src/providers/openai-responses.ts`。

```ts
if (systemPrompts.length > 0) {
    if (policy.messages.systemRole === "developer" || model.compat.uncachedInstructions) {
        // Reasoning models on known OpenAI-compatible endpoints require the
        // `developer` role, and models that never prompt-cache top-level
        // `instructions` (GPT-6.2) need it on every host, proxies included.
        // Send all system prompts inline in `input`.
        messages.unshift(
            ...systemPrompts.map(systemPrompt => ({ role: "developer" as const, content: systemPrompt })),
        );
    } else {
        // All other endpoints (including third-party /v1/responses proxies) use
        // the canonical top-level `instructions` field so that proxies that
        // reject `input[{role:"system"}]` work out of the box.
        systemInstructions = systemPrompts.join("\n\n");
    }
}
```

因此有两种触发路径：已知端点的策略选择 `developer`，或模型的 `uncachedInstructions` 为真。其他 Responses 端点保留顶层 `instructions`。

`packages/catalog/CHANGELOG.md` v19.1.0 的对应条目：

> Added the `uncached-instructions` compatibility flag for GPT-6.2 models across all hosts, moving system prompts out of the uncached Responses `instructions` field.

## openai/codex#62312 的报告状态与复现

Issue 标题：`GPT-6.2 Sol never caches the Responses instructions field (API key and ChatGPT sign-in both affected): cached_tokens stays 0 while OpenAI's own cache diagnostics report cache_hit`。

采集时状态：`OPEN`；创建于 `2026-11-18T16:30:29Z`；标签包含 `bug`、`rate-limits`。

报告摘要原文：

> On `gpt-6.2-sol` (and `gpt-6.2-astra`), the top-level **`instructions` field of a Responses request is never written to or read from the prompt cache**. `input_tokens_details.cached_tokens` stays 0 for that content on every step, while the surrounding `input` prefix is cached normally.

> The **same system-prompt text sent as a leading `developer` message inside `input` caches from the second step on.** GPT-6.1 Sol caches both shapes.

报告同时指出，OpenAI 的 cache diagnostics 与 usage 不一致：6.2 的 `instructions` 请求在 diagnostics 中出现 `cache_hit`，但 `cached_tokens` 和 `cache_write_tokens` 都为 `0`。

### 独立复现表摘录

报告引用 opencode PR #64542 的原始流式请求测试。条件为 `store: false`、每轮固定 `prompt_cache_key`、约 9.2K-token 系统提示和五个工具；单元格是逐步请求的 `cached_tokens / input_tokens`。

| Endpoint | Model | `instructions` | leading `developer` message |
|---|---|---|---|
| API key | gpt-6.2-sol | 0/9637, 0/9670, 0/9706, 0/9746 | 0/9635, 9632/9663, 9660/9694, 9691/9733 |
| API key | gpt-6.2-astra | 0/9641, 0/9669, 0/9712 | 0/9645, 9642/9674, 9671/9705, 9702/9757 |
| API key | gpt-6.1-sol | 0/9641, 9638/9674, 9671/9709, 9706/9762 | 0/9645, 9642/9674, 9671/9705, 9702/9757 |
| ChatGPT sign-in | gpt-6.2-sol | 0/9639, 0/9672, 0/9708, 0/9752 | 0/9635, 9472/9663, 9472/9694, 9472/9738 |
| ChatGPT sign-in | gpt-6.2-astra | 0/9643, 0/9671, 0/9709 | 0/9639, 9472/9667, 9472/9698, 9472/9698 |
| ChatGPT sign-in | gpt-6.1-sol | 0/9645, 9472/9678, 9600/9709, 9600/9758 | 0/9639, 9472/9672, 9600/9707, 9600/9763 |

### 大系统提示的时间序列摘录

同一报告的 ChatGPT/Codex OAuth 第三方客户端测试中，约 148,000 字符的系统提示放在 `instructions`，连续 53 个请求没有 compaction 或重试。缓存量与 input 同步增长，但保持约 64–72K token 的差值，接近 `instructions` 的大小。

| time | input | cached | gap |
|---|---|---|---|
| 10:02 | 80,166 | 14,080 | 66,086 |
| 10:03 | 93,918 | 23,552 | 70,366 |
| 10:30 | 133,577 | 67,840 | 65,737 |
| 11:00 | 165,440 | 100,608 | 64,832 |
| 11:08 | 175,895 | 111,616 | 64,279 |

同一线程切换到 6.1 Sol 后：

```text
6.2 Sol  input 133,491  cached  68,608   51.4%
6.1 Sol  input  76,529  cached       0    0.0%   <- first request after model switch
6.1 Sol  input  76,626  cached  76,416   99.7%
6.1 Sol  input  76,692  cached  76,544   99.8%
```

## 可以确认与不能扩大的范围

可以确认：

- OMP v19.1.1 对 OpenAI class 的 revision 6.2 设置了 `uncached-instructions`。
- 该轴适用于 `openai-responses`，请求构造会把系统提示放到 `input` 的前置 `developer` 消息。
- 公开 issue 给出了 API key 和 ChatGPT sign-in 两种认证方式的对照数据；GPT-6.1 Sol 在该测试中两种形状都能缓存。

不能扩大为官方事实：

- 该 issue 是复现报告，采集时仍为 OPEN；没有 OpenAI 官方根因说明或修复公告。
- 「OpenAI 服务端缓存回归」是根据服务端 usage 行为和 OMP 兼容规则作出的判断，不能写成 OpenAI 已确认的根因。
- 非 Responses API 没有同样的顶层 `instructions` 字段，因此本报告不评价它们的缓存行为。
- 本材料没有独立重发这些付费请求；数据来自上述 issue 与其引用的复现。
