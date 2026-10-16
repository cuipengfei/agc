# Copilot 延迟调查：社区报告、本机用量与 OMP 计时

> Sources: 2026 年 10 月 Copilot 用户问题与 Reddit 帖子；本机 copilot-api 用量记录与 OMP c8787 统计，2026-10-17
> Raw: [10 月社区延迟报告](../../raw/copilot-gateway/2026-10-17-copilot-october-community-latency-reports.md); [本机用量与速度测量](../../raw/copilot-gateway/2026-10-17-local-usage-and-omp-speed-measurements.md)
> Updated: 2026-10-17

## 用户感到变慢时，三种证据各能回答什么

社区有人报告 VS Code Copilot chat 要等数分钟，也有人报告 CLI 后台 agent 追问或自动压缩耗时。它们是不同工作流程中的用户观察，不能直接推断模型服务端统一变慢。VS Code 的用户对照显示同版切换 Local harness 可恢复响应；CLI 的后台派发与压缩问题也不等于一次模型请求的生成速度。参见社区 raw 中对应原帖。

本机 copilot-api 的 `usage-viewer` 能展示账号配额和 token 用量。`token_usage_events` 保存完成事件的时间戳、模型与 token 数，却没有请求起始、持续时间和首次输出时间。数据库还有多个账号的记录。**不能用相邻完成事件的时间差冒充一次请求耗时**：中间可能有客户端工具操作、等待或并发。因此，仅靠这张表无法回答自己的 TPS 是否下降。

OMP 的 `stats.db` 保存每次请求的 `duration` 与 `ttft`。本次只分析 `provider='c8787'` 的成功请求，用 `SUM(output_tokens)*1000/SUM(duration)` 计算加权 TPS，用 `AVG(ttft)/1000` 计算首次输出项等待秒数。计时从 OMP 客户端出发，包含本地转发链路；TTFT 记录首个输出项，不保证是用户看见的首字。该 TPS 衡量整次请求输出 token 与总耗时的比值，不能直接解释为服务端纯解码速率。OMP rollup 的 `tps_sum/tps_n` 使用逐请求速率的平均口径，与这里的加权口径不同。

## c8787 模型速度：9 月与 10 月

本地时间 9 月为 2026-09-01～09-30；10 月为 2026-10-01～10-16，后者只覆盖半个月。只取 `duration>0` 且 `stop_reason!='error'` 的请求。空格表示该月未出现该模型。

| 模型 | 9 月 TPS | 9 月 TTFT（秒） | 10 月 TPS | 10 月 TTFT（秒） |
|---|---:|---:|---:|---:|
| gpt-5.6-luna | 48.6 | 6.92 | 40.5 | 7.65 |
| gpt-6-luna | 77.4 | 13.91 | 52.8 | 8.19 |
| gpt-6-sol | 22.3 | 9.03 | 39.6 | 8.42 |
| gpt-5.6-sol | 27.9 | 10.91 | | |
| gpt-6.1-sol | | | 27.1 | 13.99 |
| gpt-5.3-codex | 35.9 | 12.41 | | |
| gpt-5.4 | 60.0 | 7.25 | | |
| gpt-6-astra | 31.2 | 21.22 | 30.1 | 24.80 |
| gpt-5.6-terra | 21.3 | 25.39 | | |

按月度 TPS 从慢到快，9 月为 `gpt-5.6-terra`、`gpt-6-sol`、`gpt-5.6-sol`、`gpt-6-astra`、`gpt-5.3-codex`、`gpt-5.6-luna`、`gpt-5.4`、`gpt-6-luna`；10 月为 `gpt-6.1-sol`、`gpt-6-astra`、`gpt-6-sol`、`gpt-5.6-luna`、`gpt-6-luna`。名次反映各模型实际处理的请求组合，不能当作固定任务的模型速度排名。

## 10 月后段的变化及边界

`c8787` 的全部模型加权 TPS 在 10-01～10-08 为 50.55（7829 条请求），在 10-09～10-16 为 34.63（7091 条请求）。同两段的平均 TTFT 为 8.4 秒与 9.9 秒，平均输出为每次 709 与 481 token。`gpt-6-sol` 的请求数从 3353 降至 84；`gpt-6.1-sol` 从 0 增至 2390。同期 `gpt-5.6-luna` 在 400～800 输出 token 区间的 TPM 由 3201 降至 2662；`gpt-6-luna` 由 3041 降至 2845。这说明新模型的加入、原有模型表现与请求长度变化同时发生。

**测量结论：**本机 OMP 的 `c8787` 后段混合请求吞吐下降，`gpt-6.1-sol` 在 10 月的月度加权 TPS 低于同月 `gpt-6-luna`。由于任务、输出长度、上下文和时间段并未配对，这些数据不能确定下降由新模型造成的比例，也不能证明 Copilot 服务端限速。需要隔离上游生成速度时，应针对相同模型和可比输入保存请求起始、首次输出项、完成时间，并另测本地转发耗时。

## See Also

- [GPT-6 Luna 与 Sol 三宿主接入记录](gpt-6-luna-sol-config.md) — 模型目录与配置；本文记录运行时的测量边界。
