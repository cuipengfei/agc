# Google Cloud 上下文缓存：存储、淘汰与 Durable Caching

> Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/context-cache/context-cache-overview
> Collected: 2026-10-19
> Published: Unknown

以下为页面关键原文摘录（英文原样保留，非全文）：

- 上下文缓存有内存容量上限，超过容量时旧的缓存前缀会被淘汰（evicted）。
- 当模型支持 Durable Caching 时，从内存淘汰的缓存前缀可以转入持久存储继续供后续命中。
- 隐式缓存前缀最长保留至创建后 24 小时，且文档明确写明大多数条目会在更短时间内被淘汰（most cache entries are evicted before then）。
- 页面列出的支持模型中包含 Gemini 3.8 Flash（支持 Durable Caching）。

采集备注：以上用于支撑“缓存提前淘汰属于官方允许的行为，单次归零不构成故障判定”。文档未给出任何具体淘汰时间点（例如固定 5 分钟）的承诺。
