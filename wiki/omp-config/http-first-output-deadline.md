# OMP HTTP 首事件与首输出的计时边界

> Sources: can1357/oh-my-pi 固定源码与 Issue #20511, 2026-11-25; 本机隔离复现与配置记录, 2026-11-26
> Raw: [OMP HTTP 首输出期限源码与复现](../../raw/omp-config/2026-11-26-http-first-output-deadline-evidence.md); [客户端取消传播、超时配置与部署记录](../../raw/copilot-gateway/2026-11-26-client-cancellation-and-timeout-deployment.md)
> Updated: 2026-11-26

## Overview

OMP 的 HTTP 首事件看门狗、流内空闲看门狗和严格首输出总期限是三种不同条件。本机把首事件设为 `45` 秒、空闲设为 `120` 秒，可以缩短部分异常等待；当前实现仍没有把 HTTP 建立、协议元数据和首个有效输出统一纳入一个剩余预算。上游需求记录在 [Issue #20511](https://github.com/can1357/oh-my-pi/issues/20511)。

## 需要区分的时间点

| 时间点或条件 | 含义 |
| --- | --- |
| HTTP 响应头到达 | 上游已经返回 HTTP 响应，模型可以尚未产生有效内容 |
| 首个协议事件 | Responses 的创建或状态事件可以满足协议进度条件 |
| 首个有效输出 | 非空文本、reasoning 或工具参数等实际模型输出 |
| 流内空闲 | 已开始接收流之后，两次有效进展之间的等待 |
| 严格首输出总期限 | 从请求开始到首个有效输出只使用一个预算，元数据不延长或取消该期限 |

严格首输出期限只约束启动阶段。有效输出开始后应撤销启动期限，继续使用空闲保护，避免把持续 reasoning、工具参数或长文本误当成停滞。

## Responses 的元数据行为

固定 main commit `b28adb50cb89afaeaa06bfc39da8b94090f0e489` 声明 `pi-ai` `19.2.1`。该快照只读核验，未运行。

`isOpenAIResponsesProgressEvent` 接受 `response.created`、`response.output_item.added` 和 `response.content_part.added`，按事件类型判断，不检查内容是否为空。`response.in_progress` 不在这个集合中。

`iterateWithIdleTimeout` 在进入迭代后创建 first-item deadline。遇到进度项后退出 first-item 状态并更新空闲进度时间。Responses HTTP 在响应头到达后清除 HTTP requestTimeout，随后 iterator 又取得完整 `firstEventTimeoutMs`。因此响应头等待与后续首事件等待可以分别占用预算。

这组结论只描述固定源码。WebSocket 的参数修正路径会复用部分首事件期限，connect 仍另有期限；该对照不等于 WebSocket 已提供严格首输出总期限。

## Chat Completions 的分阶段预算

Chat Completions 的 `requestTimeoutMs` 来自完整 `firstEventTimeoutMs`。HTTP 请求在响应头到达后清除 requestTimeout；`timedOpenaiStream` 随后把同一个完整值作为 `firstItemTimeoutMs` 传给迭代器。HTTP 建立与后续首进度等待是两个阶段。

Chat 的进度谓词与 Responses 不同：role-only 和空 chunk 不算进度，非空输出 delta、finish reason 或 usage 可以算进度。Responses 元数据切换空闲状态的行为不能推及 Chat；两种协议共同缺少的是覆盖 HTTP 建立和首输出的单一预算。

## 回环复现

`19.2.0` 的复现使用 Bun `1.4.5`、隔离 HOME 与 SQLite 环境、公开模型元数据和本地回环服务器，没有调用模型服务。两个场景各执行一次，参数为首事件 `80` 毫秒、空闲 `160` 毫秒。

| 场景 | 结果 | 总耗时 | 首文本 |
| --- | --- | ---: | ---: |
| 立即 `response.created`，随后持续 `response.in_progress`，文本计划在 `220 ms` 到达 | error | `191.49 ms` | 无 |
| 响应头在 `55 ms` 到达，立即 `response.created`，再于响应头后 `65 ms` 发文本 | stop | `133.32 ms` | `122.66 ms` |

第一个场景最终报告 `OpenAI responses stream stalled while waiting for the next event`，没有在请求的首事件 `80` 毫秒预算处结束。第二个场景只证明首文本晚于该预算仍能成功；由于 `response.created` 随响应头立即到达，它没有单独隔离第二个计时器。第二阶段预算来自源码证据。

旧 `19.1.1` 探测每场景重复五次，与上述单次结果分开保存。另有网关侧原型实现首输出期限，它不是 OMP 已实现功能。

## 当前缺口与恢复边界

本机 OMP 配置 `45/120` 不提供从请求发出到有效首输出共用 45 秒的严格期限。响应头、协议元数据和有效输出可能属于不同计时条件。

独立 CLI 证据显示，既有首事件超时可以触发两次 `auto_retry_start`，第三次请求成功，最终 `auto_retry_end` 为 `success=true`、`attempt=2`。这证明既有恢复路径有效；新首输出期限尚未接入 OMP，不能据此声称新期限的重试已经验证。

上游 Issue 请求保留合法 reasoning 和工具进度，并让看门狗过期与调用方取消保持可区分。用户选择修改本机配置和自己维护的 copilot-api，同时提交英文需求；没有修改全局安装的 OMP 包。

## See Also

- [本机链路的超时预算：OMP、Headroom 与 copilot-api](../copilot-gateway/local-hop-timeout-budget.md)
- [copilot-api 客户端取消与上游请求生命周期](../copilot-gateway/upstream-client-cancellation.md)
- [Copilot 延迟调查：社区报告、本机用量与 OMP 计时](../copilot-gateway/copilot-latency-evidence-boundaries.md)
