# 本机链路的超时预算：OMP、Headroom 与 copilot-api

> Sources: 本机 OMP、Headroom 与 copilot-api 配置和运行读取, 2026-11-25 至 2026-11-26; can1357/oh-my-pi 固定源码与 Issue #20511, 2026-11-25
> Raw: [copilot-api 失败诊断与本机链路超时取值摘录](../../raw/copilot-gateway/2026-11-25-copilot-api-failure-diagnostics.md); [客户端取消传播、超时配置与部署记录](../../raw/copilot-gateway/2026-11-26-client-cancellation-and-timeout-deployment.md); [OMP HTTP 首输出期限源码与复现](../../raw/omp-config/2026-11-26-http-first-output-deadline-evidence.md)
> Updated: 2026-11-26

## Overview

一次 Chat Completions 请求在本机经过 OMP、Headroom 与 copilot-api，再到 Copilot 后端。三层分别监视首事件、流内空闲、请求处理和响应头。判断异常时谁先结束，需要同时核对计时条件、保存值和进程已加载值。

## 当前保存值与运行值

| 层 | 位置 | 键 | 值 |
|---|---|---|---|
| OMP | `~/.omp/agent/config.yml` | `providers.streamFirstEventTimeoutSeconds` | `45` |
| OMP | `~/.omp/agent/config.yml` | `providers.streamIdleTimeoutSeconds` | `120` |
| Headroom | `~/.headroom/settings.json` | `request_timeout` | `150` |
| Headroom | `~/.headroom/settings.json` | `retry_max_attempts` | `1` |
| copilot-api | `~/.local/share/copilot-api/config.json` | `upstreamTransport.headersTimeoutMs` | `50000` |
| copilot-api | `~/.local/share/copilot-api/config.json` | `upstreamTransport.streamInactivityTimeoutMs` | `130000` |

OMP 两项由原生 CLI 和当前会话设置读取确认。网关由 fresh config-store loader 确认。Headroom 重启后的 settings/schema 为 stored=150、runtime=150。

## 先前快照

| 层 | 位置 | 键 | 值 |
|---|---|---|---|
| OMP | `~/.omp/agent/config.yml` | `providers.streamFirstEventTimeoutSeconds` | `420` |
| OMP | `~/.omp/agent/config.yml` | `providers.streamIdleTimeoutSeconds` | `420` |
| Headroom | `~/.headroom/settings.json` | `request_timeout` | `330` |
| Headroom | `~/.headroom/settings.json` | `retry_max_attempts` | `1` |
| copilot-api | `~/.local/share/copilot-api/config.json` | `upstreamTransport.headersTimeoutMs` | `300000` |
| copilot-api | `~/.local/share/copilot-api/config.json` | `upstreamTransport.streamInactivityTimeoutMs` | `300000` |

> **Status: Outdated** (2026-11-26)
> 这些值属于 2026-11-25 较早快照。随后五项改为上表数值。首次保存后、重启前，Headroom stored=150、runtime=330；网关旧进程也尚未加载新源码。旧 raw 中保存值和运行值一致的描述属于当时快照，继续保留。

OMP 两项更早曾为 `150` 秒，之后改为 `420` 秒，再改为当前 `45`/`120` 秒。`0` 关闭看门狗、`-1` 使用自动值，语义见 [OMP 配置项增量](../omp-config/release-config-changes-19-1-1-to-19-0-1.md)。

## 各层限时对应的条件

- copilot-api 的 `headersTimeoutMs` 计响应头到达，`streamInactivityTimeoutMs` 计流内数据空闲。
- Headroom 的 `request_timeout` 当前为 `150` 秒，按字段名指向整次请求时长，具体触发仍以运行实现和实际错误为准。
- OMP 首事件与流内空闲看门狗分别为 `45` 秒和 `120` 秒。
- Headroom 的重试上限为 `1`，与 OMP 重试分别统计。

## 条件重叠时的先后

不能仅按数值给所有请求排出固定先后。OMP 45 秒首事件可能收到协议元数据，HTTP 响应头等待与后续迭代等待也可能分别计时；严格首输出总期限见 [OMP HTTP 首输出期限](../omp-config/http-first-output-deadline.md)。网关响应头上限为 50000 毫秒，OMP 首事件为 45 秒，但两者起点和进度条件不同。输出开始后的 OMP 空闲为 120 秒，网关流内空闲为 130000 毫秒，Headroom 请求期限为 150 秒；实际先后取决于各层是否观察到数据、请求已经进行多久以及错误是否向上传递。

## 生效边界

- 保存配置不等于运行进程已加载；需核对进程和运行值。
- 五个网关的重启本地时间为 23:47:50–23:48:01，Headroom 为 23:50:30。
- Headroom 重启前 stored=150、runtime=330，重启后为 stored=150、runtime=150。
- 客户端取消传播提交 `6663ff5570` 需要重启网关才能生效。

## 证据边界

取值来自本机配置、原生 CLI、fresh loader、settings/schema 与进程时间。OMP 首事件与首输出的区别来自固定上游源码和本地回环复现。未用真实长思考请求逐项触发当前超时，也未测量真实上游收到取消后的计算停止时间。

## See Also

- [Copilot Chat 生成失败：跨协议传递、用量保留与 OMP 重试边界](../model-gateway-mismatch/copilot-chat-generation-failure-and-omp-retry.md) — 失败事件的形态与客户端收尾
- [LLM API SSE 流式调用：Clash Verge/mihomo + 机场链路的机制、影响与配置](../llm-proxy-sse/llm-api-sse-proxy-chain.md) — 网络链路层的空闲超时与连接中断
- [sticky-router 模型目录与重启状态](sticky-router-model-discovery-and-restart.md) — 同一组本地实例的维护检查
- [上游客户端取消传播](upstream-client-cancellation.md) — 客户端取消与网关部署
- [OMP HTTP 首输出期限](../omp-config/http-first-output-deadline.md) — 首事件与严格首输出期限的区别
