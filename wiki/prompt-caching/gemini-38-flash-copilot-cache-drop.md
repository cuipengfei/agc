# Gemini 3.8 Flash 经 Copilot 的缓存归零与恢复

> Sources: GitHub docs, 2026-10-19; Google Cloud docs, 2026-10-19; googleapis/python-genai issues, 2026; OmniRoute, 2026-09-11; Google 开发者论坛, 2026-08-28; Cursor 论坛, 2026-10-16; 本机实测, 2026-10-19
> Raw: [GitHub 模型托管](../../raw/prompt-caching/2026-10-19-github-copilot-model-hosting.md); [Google 缓存淘汰规则](../../raw/prompt-caching/2026-10-19-gemini-durable-cache-eviction.md); [社区报告](../../raw/prompt-caching/2026-10-19-gemini-cache-community-reports.md); [直连后端探针](../../raw/prompt-caching/2026-10-19-copilot-gemini-direct-backend-probe.md); [本机链路证据](../../raw/prompt-caching/2026-10-19-gemini-cache-local-chain-evidence.md)
> Updated: 2026-10-19

## Overview

经 GitHub Copilot 使用 Gemini 3.8 Flash 时，观测到一个可复现的缓存现象：多轮请求维持高缓存读取，暂停约五分钟后缓存读取归零，紧接的下一轮恢复高命中。本机逐跳排查排除了 OMP、Headroom 与本机 copilot-api 作为该现象的必要条件；直连 Copilot 真实后端的受控实验独立复现了同一形态。当前归因（推断）为 Google 侧缓存保留/淘汰或路由策略，其次是 Copilot 接入路径的配置；未确认任一方存在故障。

## 现象与本机会话证据

链路为 OMP → 8787（Headroom）→ 4140（sticky-router）→ 4142（唯一启用实例）。4139 的 `/api/history` 受源码 `DEFAULT_HISTORY_LIMIT = 200` 限制，两次取数合并窗口为 11:44:09–12:01:32 UTC，GPT 序列另有 12:23:45 UTC 的后续记录。

按完整 session 与模型分组、剔除 `composer-prediction` 辅助请求（其缓存 78,252 tokens、81.44%）后：

| 同会话序列 | 请求数 | 缓存读取量下降 |
|---|---|---|
| Gemini 3.8 Flash 主对话 | 39 | 3 次：69,684→42,668→77,665；93,901→0→94,022；101,937→98,098→105,976 tokens |
| GPT 6.1 Sol（排除首次冷请求） | 57 | 0 次，加权缓存读取比例 98.65% |

主对话排除首次后的加权比例为 91.54%。第一次下降的相邻请求间隔约 18 秒；零缓存轮（11:51:31 UTC）之前 4142 于 11:51:29、11:51:30 连续记录两次 `ECONNRESET`。

## 逐跳排除

- **OMP**：会话 JSONL `compactionEpoch` 恒为 0；工具结果 `prunedAt` 均为 11:59:07，晚于全部低点；`system-prompt-digest` 在 Gemini 期间无变更记录。本机压缩与摘要改写不能解释低点。
- **Headroom**：11:44:46 的低点请求日志记录 freeze 19/20 条 messages、`compressed=0`、`tool_saved=0`、`cache_read=42668`；前后请求的 `tool_schema_compaction` 均节省 730 tokens。该低点前后未见历史内容改写。
- **copilot-api**：router 原样转发请求体；chat handler 只处理模型名、输出上限与会话标识，不改写 messages；低点附近无 reasoning 剥除重试记录。
- 其他模型的下降反例：gpt-5.6-sol 缓存 99,072→51,968 tokens 而输入 100,092→100,517 tokens（原因未核实）；gpt-6-luna 的一次零缓存伴随输入从约 86,000 降至 35,728 tokens（上下文已变化）。

## 直连后端复现

按 `copilot-backend-tester` skill 直连 `https://api.business.githubcopilot.com/chat/completions`，固定 session 标识、system 与工具定义，每轮断言既有消息逐条不变，仅追加真实回复与工具结果。实验分两次运行：前置 2 次请求为第 1 次运行（独立 session，因模型以 `stop` 结束回复而停止），主实验 5 轮为第 2 次运行（新 session）；前置数值与主实验前两轮相同，但来自不同运行，两者不可混为同一连续会话。

| 轮次（第 2 次运行） | 与上一次完成的间隔 | input | cached | 比例 |
|---|---|---:|---:|---:|
| 1 | — | 93,015 | 0 | 0% |
| 2 | 15 秒 | 95,767 | 90,029 | 94.01% |
| 3 | 15 秒 | 95,892 | 90,023 | 93.88% |
| 4 | 4 分 50 秒 | 98,675 | 0 | 0% |
| 5 | 15 秒 | 98,819 | 94,088 | 95.21% |

分组总计：前置运行 input 188,782、cached 90,029 tokens；主实验运行 input 482,168、cached 274,140 tokens；两次运行合计 7 次请求全部 HTTP 200、总输入 670,950 tokens、报告缓存读取 364,169 tokens。取得下降与恢复证据后提前停止。结构化过程见 [实验记录](../../experiments/2026-10-19-gemini-38-flash-cache-drop-repro.md)。**绕过全部本地组件仍复现，本地链路不是该现象的必要条件。**

## 托管关系与官方机制

GitHub 官方文档确认 Copilot 的 Gemini 托管于 Google Cloud Platform 并采用 Google Durable Caching。Google Cloud 缓存文档说明：缓存有内存容量上限、超额前缀会被淘汰；支持 Durable Caching 的模型可将淘汰前缀转入持久存储；隐式缓存前缀最长保留至创建后 24 小时，且大多数条目更早被淘汰。**提前淘汰属于官方允许的行为，单次归零不构成故障判定。** 文档未承诺任何固定淘汰时间点。

## 社区已知报告

- python-genai #2064：原报告为 `gemini-3-flash-preview`；评论者在 `gemini-3.5-flash` 上绕过 SDK 直连原生 HTTP、间隔 3 秒，约 5,915/6,453 tokens 输入命中而约 9,423/10,686 tokens 归零；另一评论称 Vertex 未复现。
- python-genai #1880：Vertex 用户报告高命中→零命中→恢复，回复称将提交内部 bug；具体模型为 `gemini-3.1-flash-lite-preview`。
- python-genai #2508：报告者怀疑 `google-genai` 的 streaming 工具历史被拆成多个 `model` 消息，合并后自述解决；issue 以 stale/not planned 关闭，属客户端线索。
- Google 开发者论坛 2026-08-28 第 4 帖：3.7 Flash 在约 12k tokens 以上才出现隐式缓存、工具调用并非每次命中；线程中 Google 回复称隐式缓存为 best-effort，少量请求样本不足以判定。
- OmniRoute #13305（2026-09-11）：同一账户同一 `agy/gemini-3.8-flash-medium`，经 OmniRoute 5 次约 40k tokens 请求全部无缓存复用，经 CLIProxyAPI 从第 2 次起约 92%；随机 `sessionId` 嫌疑的修复未解决问题。
- Cursor 论坛 2026-10-16：3.7 Flash 讨论中的 855K 为 123 次调用的累计值、95.3% 由缓存提供，属累计口径，非单请求下降证据。

未找到将“Copilot 通道上 Gemini 3.8 Flash 暂停后归零”登记为已确认缺陷的公开报告。

## 归因（推断）

证据支持的排序：**Google 侧缓存保留/淘汰或路由策略** > **Copilot 接入路径的路由与配置** > 本地链路（已排除为必要条件）。本地三组件在直连实验中完全绕过，其嫌疑最低。社区中“同一模型经不同代理 0% 与 92%”的对照表明接入路径会显著影响命中，因此不能仅凭“托管在 Google”将责任全部判给 Google；Copilot 到 Google 之间的项目、区域与请求转换未观测。

## 证据边界

- `cache_read / input` 是 usage 字段口径，不等同于后端请求级 cache miss 率；Headroom 日志的 `cache_hit_pct=100` 是其冻结前缀自算指标，口径不同。
- 一次直连复现证明该路径能够产生此现象，不证明故障，也不证明每次低点同因；原会话约 18 秒间隔的短间隔下降在直连实验中未复现。
- 社区报告的模型版本、输入规模与接入方式各不相同，不能互相替代或外推为 3.8 的统计结论。
- 未做 Google 原生入口对照（无 GCP 凭据），具体责任层仍待区分。

## See Also

- [Prompt Cache：前缀匹配与 cache key 的真实分工](cache-key-and-prefix-matching.md)
- [Copilot 延迟调查：社区报告、本机用量与 OMP 计时](../copilot-gateway/copilot-latency-evidence-boundaries.md)
