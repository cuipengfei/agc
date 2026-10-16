# 本机 Copilot 用量与 OMP c8787 速度调查摘录

> Source: 本次会话只读查询 copilot-api 用量数据库与 OMP stats.db；已安装 copilot-api 与 OMP 源码；本机 usage-viewer 页面
> Collected: 2026-10-17
> Published: Unknown

仅保存表定义、查询口径和汇总结果。不保存账号、凭据、会话标识、原始事件或数据库副本。

## 两种数据的边界

- copilot-api 的 `/usage` 返回账号／配额数据，`usage-viewer` 还调用 `/token-usage/summary`、`/token-usage/daily`、`/token-usage/events`。
- copilot-api `src/lib/token-usage/store.ts:212-236` 的 `token_usage_events` 含 `created_at_ms`、`model`、`output_tokens`、`total_tokens`，没有请求开始、请求持续时间或首次输出时间字段。本次调查观察到该库汇入多个账号。相邻完成事件的间隔还包括客户端本地工作、空闲和下一请求，无法将其当作请求耗时或真实 TPS。
- OMP `stats.db` 的 `messages` 表含 `provider`、`model`、`output_tokens`、`duration`、`ttft`。本次只取 `provider='c8787'`、`duration>0`、`stop_reason!='error'`；`c8787` 配置为本地 8787 的 `openai-responses` provider。
- OMP `pi-ai/src/providers/openai-responses.ts:1358-1359` 计算请求耗时与首输出等待；`pi-ai/src/providers/openai-shared.ts:3487-3491` 记录首个 `response.output_item.added` 的到达时间。因此 `ttft` 是首次输出项等待，不保证它就是用户可见文本的首字，也不能单独证明等待来自模型推理。
- 此处 TPS 口径为 `SUM(output_tokens)*1000.0/SUM(duration)`；TTFT 为 `AVG(ttft)/1000` 秒。`duration`、`ttft` 单位毫秒。OMP `omp-stats/src/rollup.ts:97-102` 另存 `tps_sum = SUM(output_tokens*1000.0/duration)` 与 `tps_n`；**两种汇总方式不同**，下表使用前述加权口径。输出 token 包括记录中的推理 token，耗时包括本地链路；均不可直接当成服务端纯生成速度。

## 2026 年 9 月与 10 月逐模型结果

时间窗口：本地时间 2026-09-01 至 2026-10-01（不含）；2026-10-01 至 2026-10-17（不含，即截至 10-16）。每格中的 `n` 为符合筛选条件的请求数；缺席月份留空。

| 模型 | 9 月 n | 9 月 TPS | 9 月 TTFT 秒 | 10 月 n | 10 月 TPS | 10 月 TTFT 秒 |
|---|---:|---:|---:|---:|---:|---:|
| gpt-5.6-luna | 14876 | 48.6 | 6.92 | 2278 | 40.5 | 7.65 |
| gpt-6-luna | 2812 | 77.4 | 13.91 | 6766 | 52.8 | 8.19 |
| gpt-6-sol | 2703 | 22.3 | 9.03 | 3437 | 39.6 | 8.42 |
| gpt-5.6-sol | 5394 | 27.9 | 10.91 | | | |
| gpt-6.1-sol | | | | 2390 | 27.1 | 13.99 |
| gpt-5.3-codex | 663 | 35.9 | 12.41 | | | |
| gpt-5.4 | 644 | 60.0 | 7.25 | | | |
| gpt-6-astra | 506 | 31.2 | 21.22 | 49 | 30.1 | 24.80 |
| gpt-5.6-terra | 83 | 21.3 | 25.39 | | | |

按 TPS 从慢到快，9 月为 `gpt-5.6-terra`、`gpt-6-sol`、`gpt-5.6-sol`、`gpt-6-astra`、`gpt-5.3-codex`、`gpt-5.6-luna`、`gpt-5.4`、`gpt-6-luna`；10 月为 `gpt-6.1-sol`、`gpt-6-astra`、`gpt-6-sol`、`gpt-5.6-luna`、`gpt-6-luna`。该名次只按月度汇总 TPS，未控制输出长度或输入上下文。

## 10 月前后两段：整体与模型用量

窗口为本地时间 10-01～10-08 与 10-09～10-16。筛选口径同上。

| 期间 | 请求数 | 加权 TPS | 平均 TTFT 秒 | 平均输出 token／请求 |
|---|---:|---:|---:|---:|
| 10-01～10-08 | 7829 | 50.55（TPM 3033） | 8.4 | 709 |
| 10-09～10-16 | 7091 | 34.63（TPM 2078） | 9.9 | 481 |

| 模型 | 10-01～10-08 请求数 | 10-09～10-16 请求数 |
|---|---:|---:|
| gpt-6-luna | 3318 | 3448 |
| gpt-6-sol | 3353 | 84 |
| gpt-6.1-sol | 0 | 2390 |
| gpt-5.6-luna | 1109 | 1169 |
| gpt-6-astra | 49 | 0 |

同一输出区间 400～800 token 内，前段与后段 `gpt-5.6-luna` 为 3201→2662 TPM，`gpt-6-luna` 为 3041→2845 TPM；后段 `gpt-6.1-sol` 为 1662 TPM。后段 `gpt-6-sol` 为 1963 TPM，但只有 22 条此输出区间的请求。输出长度与模型占比同期变化，以上记录不能证明整体下降只由新模型造成。
