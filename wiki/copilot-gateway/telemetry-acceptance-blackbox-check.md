# 遥测接受的黑盒验证

> Sources: 本机五实例进程外只读观测与 tmux 日志观察，2026-11-27–28
> Raw: [copilot-api 的两条遥测通道](../../raw/copilot-gateway/2026-11-27-copilot-telemetry-two-channels.md); [遥测增强与自然流量验收](../../raw/copilot-gateway/2026-11-28-telemetry-enhancement-and-live-verification.md)
> Updated: 2026-11-28

## Overview

确认运行中的服务是否真的被上游接收，有两种互补方法：进程外只读扫描驻留内存里的收集端回执（不加日志、不重启进程），以及利用代码自带的成功计数日志做 tmux 自然流量观察。

## 进程外只读内存扫描

要确认运行中的服务是否真的被上游接收，但又不想加日志、不想重启进程，可以读进程自己的内存：上游响应被解析成字符串后会短暂驻留，那里能看到原始响应体。方法的关键不在扫描本身，而在对照——先用干净实例取基线，再触发请求，再复扫，出现的才是这次收到的。

### 为什么不用动态追踪

两条常见路线在本机内核上都不成立：

- 按 PID 过滤的 syscall tracepoint：内核助手返回无效参数，探针体全部失效，连接与接收的关联拿不到。
- 对 libc 复制函数挂探针：运行时把该符号解析到未导出的实现，探针挂在导出符号上永不触发，计数器恒为零。

syscall 层即便可用，看到的也是 TLS 密文，到不了响应体。相比之下，读进程内存不侵入、不暂停进程，还能直接看到解密后的正文。

### 步骤

1. 选定一个不承载其他流量的实例，避免把别处写入的文本当成回执。
2. 基线扫描：以管理员权限遍历进程的可写映射，先按内核页面标志剔除共享零页，避免把保留地址空间当成真实数据。
3. 触发请求：`max_tokens: 1` 的极小请求即可，每个请求会带出若干遥测事件。
4. 等待数秒后复扫，比较基线。
5. 命中判据：找到同时含 `itemsReceived`、`itemsAccepted`、`appId`、`errors` 四个键的 JSON 对象；`itemsAccepted` 大于零且 `errors` 为空即为被接受。

同一段文本可能以原始字节（UTF-8）和 16 位字符串（UTF-16-LE）两种形式驻留，所以两种编码都要找；按编码各记一次会高估条数。

### 有效性的前提

扫描命中的文本要能排除「代码或测试里本来就有的字面量」。这次排除了两类干扰：应用源码不含该 JSON 结构；测试夹具虽含 `itemsReceived`，但启动路径不加载测试，且夹具缺少 `appId` 与 `errors` 字段，与真实响应格式不同。

触发前后的对照是核心：基线为零、触发后出现，才说明它是这次收到的响应。

## 成功计数日志

`sendTelemetryEnvelope()` 在 `res.ok` 且 `accepted > 0` 时累加 `acceptedCounts` Map（按 `eventName` 独立计数），在 `count === 1 || count % 10 === 0` 时打印：

```text
[telemetry] accepted: copilot-chat/panel_request count=1
[telemetry] accepted: copilot-chat/panel_request count=10
```

每种事件第 1 次成功时立即可见（确认通道存活），之后每 10 次成功打 1 行；失败情况照旧每次都打 `consola.warn`。计数仅保存在进程内存中，服务重启后从 1 重新开始。

## tmux 自然流量观察

tmux session `copilot-20261123-194505-9028` 窗口 1 的五个 pane 对应 4142–4146 五个实例。重启后观察到：

| 端口 | `request.sent` | `response.success` | `conversation.message` | 发送超时 |
|---|---|---|---|---|
| 4142 | ≥1 | ≥1 | ≥1 | 0 |
| 4143 | ≥10 | ≥10 | ≥20 | 3 |
| 4144 | ≥1 | ≥1 | ≥10 | 0 |
| 4145 | 无记录 | 无记录 | 无记录 | 0 |
| 4146 | ≥20 | ≥20 | ≥30 | 0 |

计数为日志显示的下限（代码仅在第 1、10、20、30 次打印）。4146 的 `panel_request`、`panel.edit.feedback`、`edit.hunk.action`、`inlineConversation.message`、`inlineConversation.accept`、`ghostText.accepted` 均增长到 20，后置定时事件正常运行。4143 在 02:03:59 两次、02:04:21 一次发生遥测发送超时（5 秒 `AbortSignal.timeout`），之后接收计数继续增长。4145 重启后只有 3 次 `GET /usage`，无模型请求。

15/16 种事件出现有效接收日志；`response.error` 未在自然窗口内触发（已有测试与手动 HTTP 验收覆盖）。

## 结论强度

能证明：该实例向收集端发过请求，且收到了接受回执。

不能证明：回执对应的是哪个事件——回执只有计数，没有事件名；也不能逐请求对齐，因为采样会让大部分事件根本未发送，内存回收又会让部分回执消失。因此「抓到一条」只说明链路通，不能当作发送量的度量。

成功计数日志解决了「静默成功」的盲区，但计数是进程内存中的累计值，重启后归零；日志只含事件名和计数，不含载荷字段（响应头、`source`、`conversationId`、`timeSinceIssuedMs` 需靠测试与手动 HTTP 验收覆盖）。

## See Also

- [Copilot 遥测的两条通道与判定差异](telemetry-two-channel-gating.md)
- [变异测试、测试预言与不变量](../software-testing/mutation-testing-oracles-and-invariants.md)
