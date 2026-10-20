# Gemini 4 Argon 上下文缓存：隐式缓存的掉点现象与社区反馈

> Sources: Google 官方论坛, 2026-10-14; Google Cloud 官方文档, 2026-10-13; googleapis/python-genai issues, 2025-12 至 2026-09; OpenCode issues, 2026-08 至 2026-10
> Raw: [Argon 社区报告与官方回应](../../raw/prompt-caching/2026-10-20-gemini-4-argon-cache-community-and-official.md); [三种缓存模式官方文档](../../raw/prompt-caching/2026-10-20-gemini-caching-modes-official-docs.md)
> Updated: 2026-10-20

## Overview

`gemini-4-argon` 仅支持隐式上下文缓存（implicit caching），不支持显式缓存（explicit caching），且默认开启持久化缓存（durable caching）。社区报告表明，该模型在经 OpenCode Go、AI Studio 直连、Vertex AI Global 直连等入口调用时，存在缓存命中不稳定的现象，具体表现为各来源观察到的不同形态：AI Studio / Vertex Global 直连连续零命中（#189019）、OpenCode Go 命中率随时间段大幅波动（#55449）。Google 官方论坛确认正在排查相关问题；用户因额外费用向 Google 投诉。

## 缓存机制：implicit / durable / explicit

Google 官方文档对 Gemini 上下文缓存三种模式的定义：

| 模式 | 含义 | Argon 支持状态 | 计费 |
|---|---|---|---|
| **Implicit caching**（隐式缓存） | 不传缓存 ID，服务端自动匹配公共前缀并打折。最低 6,144 tokens，best-effort 不保证命中。 | 唯一支持的模式 | 命中部分按缓存读取价（标准输入价的 10%），未命中部分按标准输入价 |
| **Explicit caching**（显式缓存） | 手动创建缓存对象并指定 TTL，后续请求带缓存 ID 保证命中。 | 不支持（报错 400） | 按时长收存储费 + 按缓存读取价收读取费 |
| **Durable caching**（持久化缓存） | 隐式缓存原本只放内存，开启后异步转存到持久存储层（最长 24 小时）。内存缓存被淘汰或请求切到其他机器时，仍可从持久层命中较早前缀。 | 默认开启 | 不额外收费，仍按 implicit caching 规则计费 |

**关键推论**：Argon 不支持显式缓存，意味着开发者无法通过手动创建缓存来保底命中；只能依赖 best-effort 的隐式缓存 + 默认开启的持久化缓存。社区报告的零命中与命中率波动现象，与隐式缓存的 best-effort 特性一致。

## 社区报告与官方回应

- **Google 官方论坛 #189019**（2026-10-14）：Argon 发布次日，开发者报告 AI Studio 与 Vertex AI Global 直连零命中，显式缓存报错 400；Google 官方人员确认 Argon 不支持显式缓存，正在排查隐式缓存问题。
- **python-genai #1880**（2025-12 至 2026-09）：Vertex 与 AI Studio 隐式缓存命中率差异，Google 工程师复现并提交内部 bug；用户实测 Vertex 成本是 AI Studio 的 2.1 倍。
- **python-genai #2064**（2026-02 至 2026-09）：Vertex 与 Global 端点不一致，9k–17k 死区复现，Google 工程师确认内部缓存切换限制。
- **OpenCode #55449**（2026-10-14）：Argon 命中率随时间段波动（同一字节流不同时段 30/32 vs 1/6），字节级 diff 验证。
- **OpenCode #43628**（2026-08 至 2026-10）：Vertex 3.8 Flash 29 轮会话中 7 轮归零，跨模型命中率对比（Vertex Gemini 21%～29% vs 其他模型 0.3%～2.8%）。
- **Google 开发者论坛 #176445**（2026-07 至 2026-08）：开发者报告 Vertex 缓存命中率差，因接近 10 倍价差迁离生产流量。

**费用影响**：按 token 计费入口上，掉缓存的未命中部分按标准输入价计费（比缓存价贵 10 倍）。社区用户实测在 Vertex 上多付 2.1 倍成本；有开发者称这种额外费用为 "Gemini Tax" 并迁走流量。

## 归因（推断）

证据支持的排序：**Google 侧隐式缓存路由与持久化快照策略** > **接入路径的路由与配置** > 客户端本地链路。

- Argon 仅支持隐式缓存 + 默认开持久化缓存，无保底机制；社区报告的缓存不稳定现象与隐式缓存的 best-effort 特性一致。
- 同一字节流在不同时间段命中率差异巨大（OpenCode #55449），说明云端路由/分片策略是主要变量。
- 各接入路径（OpenCode Go、AI Studio、Vertex AI Global）到 Google 后端的内部转发不可见，无法与 Google 内部路由做完全切割。

## 证据边界

- 社区报告的模型版本、输入规模与接入方式各不相同，Argon 个案与 3.x 个案不可互相外推。
- 未用自有 GCP 账号直接测试 Google Cloud 上的 Argon 隐式缓存行为。
- Google 未公布全局隐式缓存命中率统计，总体发生比例无法确认。

## See Also

- [Gemini 3.8 Flash 经 Copilot 的缓存归零与恢复](gemini-38-flash-copilot-cache-drop.md)
- [Prompt Cache：前缀匹配与 cache key 的真实分工](cache-key-and-prefix-matching.md)
