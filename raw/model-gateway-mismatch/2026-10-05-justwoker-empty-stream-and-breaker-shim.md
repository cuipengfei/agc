# JustWoker 流式空响应诊断与断路器 Shim 设计

> Source: 本会话实测（2026-10-04 至 2026-10-05）
> Collected: 2026-10-05
> Published: Unknown

## 空流问题的发现

OMP 报告错误：`Assistant returned an empty stop after retry cap, but the provider billed 17 output tokens for it`。实测确认：justwoker 的 `POST /v1/messages` 在 `stream: true` 下返回 HTTP 200 SSE，但整个流里只有三个信封事件（`message_start`、`message_delta`、`message_stop`），零个内容块事件（`content_block_start`、`content_block_delta`、`content_block_stop`）。usage 里 output_tokens 照计（81、18、17 等），内容从未投递。

非流式同参数请求返回完整内容（thinking + text 两块齐全）。

## 指纹

- 响应头：`x-oneapi-request-id`（new-api 面板）
- 流式 `message_start` 里 `input_tokens: 0`（kiro2api v0.14.1 修的正是这个）
- 间歇性 403 Cloudflare 拦截页（路径级 WAF 规则）
- `served claude-quince · requested claude-opus-4-8`（模型字段与实际服务模型不一致）

## 断路器设计

本地 Bun 代理（127.0.0.1:4151）实现三态断路器：

- CLOSED：流式透传，旁路扫描内容标记（text_delta / input_json_delta）。空流计数，窗口内达到阈值（默认 2 次 / 10 分钟）打开断路器。
- OPEN：全部走非流式回退，本地合成 SSE 序列（message_start → content_block_* → message_delta → message_stop），等待期间每 10 秒发 ping 保活（OMP 的解析器把 ping 当进度信号，重置 300 秒空闲超时）。
- 半开：冷却结束（默认 30 分钟）后第一个请求试流式，有内容回 CLOSED，仍空重新冷却。

## 关键实测数据

| 请求 | 结果 |
|---|---|
| 流式 `hello?` ×3 | 2 次空流（out 207、158），1 次 403 |
| 流式 + thinking | 空流（out 144），thinking 块也没有 |
| 非流式同参数 | 正常，文本 291 字符，out 97 |
| 非流式 + 完整 OMP 负载 | thinking 97ch + text 42ch 都到达，out 71-74 |

## Bun 环境坑

- Bun fetch 对死端口无限挂起（实测 6 秒无 ECONNREFUSED），需 `AbortSignal.timeout` 兜底。
- Clash TUN MITM 导致间歇性 `UNKNOWN_CERTIFICATE_VERIFICATION_ERROR`，`--use-system-ca` 修复。
- `--use-system-ca` 不能解决 MITM 情形（WSL 系统库无 Clash CA），只覆盖信任锚更全的一般情形。
