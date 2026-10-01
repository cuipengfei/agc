# 8787 网关 /v1/models 实测 limits 与 OMP c8787 家族 maxTokens 调整

> Source URL: http://localhost:8787/v1/models（GET，Authorization 运行时注入）
> Collected: 2026-10-01
> Published: Unknown

## 网关返回形态

返回 18 个模型，每个带 `limits` 对象：`{"limits":{"context_window":...,"max_output":...,"max_prompt":...,"vision":{...}}}`，另有 `supports_structured_outputs` 布尔。

注意：与 2026-09-25 同端点抓取（raw/copilot-gateway/2026-09-25-gpt6-three-host-config.md 对应的 `max_context_window`、`max_output_tokens`、`supported_endpoints` 平铺字段）形态不同，网关响应结构已变为 `limits` 嵌套对象。

## 各模型实测 limits（逐字）

| id | context_window | max_output | max_prompt |
|---|---|---|---|
| gpt-6-astra | 1050000 | 128000 | 1050000 |
| gemini-3.8-flash | 1048576 | 65536 | 983040 |
| gemini-3.7-flash | 1000000 | 64000 | 936000 |
| gpt-5.4 | 1050000 | 128000 | 922000 |
| gpt-5.5 | 1050000 | 128000 | 922000 |
| gpt-5.6-luna | 1050000 | 128000 | 922000 |
| gpt-5.6-sol | 1050000 | 128000 | 922000 |
| gpt-5.6-terra | 1050000 | 128000 | 922000 |
| gpt-6-luna | 1000000 | 128000 | 872000 |
| gpt-6-sol | 1000000 | 128000 | 872000 |
| gpt-5.3-codex | 400000 | 128000 | 272000 |
| gpt-5.4-mini | 400000 | 128000 | 272000 |
| kimi-k2.7-code | 256000 | 32000 | 224000 |
| gpt-5-mini | 264000 | 64000 | 128000 |
| mai-code-1.1-flash | 256000 | 128000 | 128000 |
| text-embedding-3-small | null | null | null |
| text-embedding-3-small-inference | null | null | null |
| text-embedding-ada-002 | null | null | null |

## 与 OMP models.yml 当时配置的对比（c8787 / c8787-chat）

- 一致无需调整：gpt-5.6-luna（1050000/128000）、gpt-6-luna（1000000/128000）、gemini-3.7-flash（1000000/64000）、gemini-3.8-flash（1048576/65536）、kimi-k2.7-code（256000/32000）。
- 不一致 8 个：gpt-5.4（272000/16000）、gpt-5.5（272000/16000）、gpt-5.3-codex（272000/16000）、gpt-5.4-mini（272000/16000）、gpt-5.6-sol（292000/16000）、gpt-5.6-terra（272000/16000）、gpt-6-sol（292000/16000）、gpt-6-astra（292000/16000）。配置里的 272000/292000 与网关 `max_prompt` 或旧目录窗口值吻合。

占比：16000/272000 = 5.88%；16000/292000 = 5.48%；网关 gpt 系 128000/1050000 = 12.19%，128000/1000000 = 12.80%，128000/400000 = 32.00%。

## 用户决策（逐字指令）

1. "calculate current percentage of out/cw" / "calculate out/cw of this as well"（要求先算占比）
2. "no, not like that, after calculate percentage, then align 16k up to what ever percentage of the actual, get it? propose again"（按 16k 当前占比等比放大到真实窗口）
3. "do not move context window up , do not touch that, get it?"（contextWindow 一律不动）
4. "only move output tokens up, to align percentage, get it?"（只提输出上限）

## 实际落入 ~/.omp/agent/models.yml 的 8 处修改（2026-10-01，contextWindow 全部保持原值）

| 模型 | maxTokens 原值 → 新值 | 计算 |
|---|---|---|
| gpt-5.4 | 16000 → 62000 | 1050000 × 5.88% ≈ 61765 取千位 |
| gpt-5.5 | 16000 → 62000 | 同上 |
| gpt-5.6-terra | 16000 → 62000 | 同上 |
| gpt-5.6-sol | 16000 → 58000 | 1050000 × 5.48% ≈ 57534 取千位 |
| gpt-6-astra | 16000 → 58000 | 同上 |
| gpt-6-sol | 16000 → 55000 | 1000000 × 5.48% ≈ 54795 取千位 |
| gpt-5.3-codex | 16000 → 24000 | 400000 × 5.88% ≈ 23529 取千位 |
| gpt-5.4-mini | 16000 → 24000 | 同上 |

git diff 验证：models.yml 恰好 8 处 maxTokens 变更、0 处 contextWindow 变更。pull 同步另带入 3 个来源侧漂移文件（config.yml、omp-plugins.lock.json、package.json 各 1 行）。
