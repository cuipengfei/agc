# OpenAI Responses instructions 缓存与 GPT-6.2 绕过规则

> Sources: 本机 `@oh-my-pi/pi-catalog` 与 `@oh-my-pi/pi-ai` 19.1.1 源码, 2026-11-23; openai/codex#62312, 2026-11-18
> Raw: [OpenAI Responses instructions 缓存与 OMP GPT-6.2 绕过规则](../../raw/omp-config/2026-11-23-openai-responses-instructions-cache.md)
> Updated: 2026-11-23

## Overview

OMP v19.1.1 对 OpenAI revision 6.2 启用 `uncached-instructions`，在 `openai-responses` 请求中把系统提示从顶层 `instructions` 移到 `input` 开头的 `developer` 消息。公开复现报告显示，这种写法让 GPT-6.2 Sol/Astra 的系统提示从第二轮开始命中缓存；GPT-6.1 Sol 在同一测试中两种写法都能缓存。

这是复现数据驱动的兼容处理。相关 issue 在采集时仍为 OPEN，尚无 OpenAI 官方根因说明。

## 两种 Responses 请求形状

系统提示可以放在顶层：

```json
{
  "instructions": "system prompt",
  "input": []
}
```

也可以作为 `input` 的前置消息：

```json
{
  "input": [
    { "role": "developer", "content": "system prompt" }
  ]
}
```

OMP 的 `openai-responses.ts` 在两种情况下选择第二种：当前端点策略要求 `developer`，或模型的 `compat.uncachedInstructions` 为真。其他 Responses 端点保留顶层 `instructions`，兼容只接受该形状的第三方代理。

## OMP 规则的适用范围

`openai.kdl` 对 `revision "=6.2"` 设置：

```kdl
revision "=6.2" {
    uncached-instructions #true
}
```

`axes.ts` 将该轴声明为：

```ts
"uncached-instructions": wire("uncachedInstructions", ["openai-responses"]),
```

因此，已核实的代码路径是 `openai-responses`。不能仅凭这条规则推断 `openai-codex-responses` 或其他 API 路由也使用同一写法。

## 复现数据

openai/codex#62312 引用的测试使用固定 `prompt_cache_key`、约 9.2K-token 系统提示和五个工具。下表为逐步请求的 `cached_tokens / input_tokens`：

| Endpoint | Model | `instructions` | leading `developer` message |
|---|---|---|---|
| API key | gpt-6.2-sol | 0/9637, 0/9670, 0/9706, 0/9746 | 0/9635, 9632/9663, 9660/9694, 9691/9733 |
| API key | gpt-6.2-astra | 0/9641, 0/9669, 0/9712 | 0/9645, 9642/9674, 9671/9705, 9702/9757 |
| API key | gpt-6.1-sol | 0/9641, 9638/9674, 9671/9709, 9706/9762 | 0/9645, 9642/9674, 9671/9705, 9702/9757 |

报告还记录了一个不一致现象：GPT-6.2 的 `instructions` 请求在 OpenAI cache diagnostics 中出现 `cache_hit`，但 usage 中 `cached_tokens` 和 `cache_write_tokens` 都为 `0`。

在另一个约 148,000 字符系统提示的连续请求测试中，缓存量与 input 同步增长，但一直保持约 64–72K token 的差值，接近 `instructions` 的大小。切换到 GPT-6.1 Sol 后，第二轮起缓存命中率达到 `99.7%`、`99.8%`。

## 其他模型怎样理解

| 对象 | 本文能支持的判断 |
|---|---|
| GPT-6.2 Sol / Astra | 公开测试中顶层 `instructions` 的 `cached_tokens` 持续为 `0`，前置 `developer` 从第二轮开始命中 |
| GPT-6.1 Sol | 同一组测试中两种写法都能缓存 |
| 其他 Responses 模型或第三方代理 | 没有本次数据，不推广结论；OMP 默认仍按各模型和端点策略选择写法 |
| 非 Responses API | 请求结构中没有同样的顶层 `instructions`，本文不评价其缓存行为 |

## 证据边界

- OMP 规则和请求构造来自本机 v19.1.1 源码直读。
- 缓存数据来自 openai/codex#62312 及其引用的 opencode PR #64542，本会话没有重新发送这些付费请求。
- 「OpenAI 服务端缓存回归」是根据复现行为作出的判断；OpenAI 官方根因和修复状态仍待确认。
- 该问题涉及重复输入的计费或配额消耗，具体节省取决于系统提示大小、缓存命中和 provider 计费方式。

## See Also

- [OMP 19.1.1–19.0.1 配置项增量](release-config-changes-19-1-1-to-19-0-1.md)
- [OMP 配置语义手册](config-semantics.md)
