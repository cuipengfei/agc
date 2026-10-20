# Gemini 三种上下文缓存模式官方文档摘录

> Source: Google Cloud 官方文档（docs.cloud.google.com / ai.google.dev / cloud.google.com/blog）
> Collected: 2026-10-20
> Published: 逐条标注

以下为 Google 官方文档对 Gemini 模型上下文缓存三种模式的关键定义与计费规则摘录。

## Implicit Context Caching（隐式上下文缓存）

- Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/4-argon
- Published: 2026-10-13（Argon 模型文档首次发布）
- 定义：无需手动创建缓存对象，由服务端自动检测请求前缀是否与之前计算过的内容匹配。匹配成功则自动按缓存读取折扣价计费。
- 最低长度：6,144 tokens（Argon 文档明确标注）。
- 性质：best-effort（尽力而为），不保证每次请求都能命中。
- 计费：命中的前缀按缓存读取价（约为标准输入价的 10%）计费，未命中部分按标准输入价计费。
- Argon 支持状态：仅支持 implicit caching，不支持 explicit caching。

## Explicit Context Caching（显式上下文缓存）

- Source: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/overview
- Published: Unknown（长期有效文档）
- 定义：开发者主动调用 API 创建缓存对象（`cachedContent`），上传一段大文本/视频/系统提示词并指定保留时长（TTL）。后续请求显式传入该缓存 ID，服务端保证命中该段内容。
- 计费：按缓存存储时长收取存储费（Storage Fee），不按 token 数计费；同时按缓存读取价收取读取费。
- Argon 支持状态：不支持。尝试创建显式缓存会报错 `400: Explicit caching is not supported for models/gemini-4-argon`（来源：Google 开发者论坛 #189019 官方确认）。

## Durable Caching（持久化缓存）

- Source: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/overview
- Published: Unknown（长期有效文档）
- 定义：普通隐式缓存只放在推理机器的高速内存（RAM/HBM）中，容量满了很快被淘汰。开启 Durable Caching 后，Google 会将缓存前缀异步转存到持久存储层（最长保留 24 小时，多数更早淘汰）。
- 作用：当请求落到未持有最新热缓存的机器时，仍有机会从持久层命中较早保存的缓存前缀，避免从零重算。
- Argon 支持状态：默认开启（enabled by default）。
- 官方原文：`Implicit context caching has a minimum of 6,144 tokens and is best-effort.`

## 计费对比（以 Gemini 2.5 及以上模型为例）

- Source: https://cloud.google.com/blog/products/ai-machine-learning/vertex-ai-context-caching
- Published: Unknown（官方博客）
- 缓存读取价：标准输入价的 10%（即未命中部分比命中部分贵 10 倍）。
- 缓存写入价：标准输入价的 25%（首次计算缓存时收取）。
- 显式缓存存储费：按时长计费，与 token 数无关。

## 未公开的细节

Google 官方文档未公开以下信息，标注为未验证：
- 隐式缓存的具体驱逐算法（LRU 或其他策略）。
- 单机内存缓存容量上限。
- 持久化缓存的分片策略与同步延迟。
- 请求路由到不同后端实例时的缓存亲和性机制。
