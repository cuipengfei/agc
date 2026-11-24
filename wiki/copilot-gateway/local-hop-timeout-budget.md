# 本机链路的超时预算：OMP、Headroom 与 copilot-api

> Sources: 本机 `~/.omp/agent/config.yml`、`~/.headroom/settings.json`、`~/.local/share/copilot-api/config.json` 与会话内读取，2026-11-25
> Raw: [copilot-api 失败诊断与本机链路超时取值摘录](../../raw/copilot-gateway/2026-11-25-copilot-api-failure-diagnostics.md)
> Updated: 2026-11-25

## Overview

一次 Chat Completions 请求在本机依次经过 OMP、Headroom 与 copilot-api 三层，再到 Copilot 后端。三层各自监视不同条件：首事件到达、流内空闲、整次请求时长、响应头到达。判断谁先触发，要先看每个键计的是什么，再看各自限时。

## 当前取值

| 层 | 位置 | 键 | 值 |
|---|---|---|---|
| OMP | `~/.omp/agent/config.yml` | `providers.streamFirstEventTimeoutSeconds` | `420` |
| OMP | `~/.omp/agent/config.yml` | `providers.streamIdleTimeoutSeconds` | `420` |
| Headroom | `~/.headroom/settings.json` | `request_timeout` | `330` |
| Headroom | `~/.headroom/settings.json` | `retry_max_attempts` | `1` |
| copilot-api | `~/.local/share/copilot-api/config.json` | `upstreamTransport.headersTimeoutMs` | `300000` |
| copilot-api | `~/.local/share/copilot-api/config.json` | `upstreamTransport.streamInactivityTimeoutMs` | `300000` |

OMP 两项在 2026-11-25 之前为 `150` 秒。`0` 关闭看门狗、`-1` 使用自动值，语义见 [OMP 19.1.1–19.0.1 配置项增量](../omp-config/release-config-changes-19-1-1-to-19-0-1.md)。

## 各层限时对应的条件

- copilot-api 的 `headersTimeoutMs` 计到响应头到达，`streamInactivityTimeoutMs` 计流内两次数据之间的空闲，两项都是 `300000` 毫秒。
- Headroom 的 `request_timeout` 为 `330` 秒；按字段名，它约束整次请求的时长。
- OMP 两项是流式看门狗，分别管首事件与事件间空闲，各 `420` 秒；`0` 关闭、`-1` 使用自动值，语义见上文链接。
- 重试上限 `1` 只作用于 Headroom 的重试；加大次数会成倍放大客户端等待。

## 条件重叠时的先后

- 上游拖过 `300000` 毫秒仍未给出响应头时，copilot-api 先失败，错误会带着上游事件写入本地日志；Headroom 的整次上限 `330` 秒还没到。
- 流内空闲达到 `300000` 毫秒时结束请求；空闲出现在请求已经进行一段时间之后时，Headroom 的 `330` 秒整次上限可能先到。请求持续有数据、总时长超过 `330` 秒时，同样由 Headroom 截断。
- 网关静默时由 Headroom 的 `330` 秒结束，OMP 的 `420` 秒看门狗不会抢先放弃。

## 证据边界

取值来自本机文件与会话内读取，2026-11-25；先后关系按各键的计时对象与数值推断。未对真实长思考请求做端到端计时，也未在 420 秒边界上触发超时。

## See Also

- [Copilot Chat 生成失败：跨协议传递、用量保留与 OMP 重试边界](../model-gateway-mismatch/copilot-chat-generation-failure-and-omp-retry.md) — 失败事件的形态与客户端收尾
- [LLM API SSE 流式调用：Clash Verge/mihomo + 机场链路的机制、影响与配置](../llm-proxy-sse/llm-api-sse-proxy-chain.md) — 网络链路层的空闲超时与连接中断
- [sticky-router 模型目录与重启状态](sticky-router-model-discovery-and-restart.md) — 同一组本地实例的维护检查
