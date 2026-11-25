# OMP HTTP 首输出期限：公开 Issue、源码与复现记录

> Source: can1357/oh-my-pi Issue #20511；固定 main commit b28adb50cb89afaeaa06bfc39da8b94090f0e489 源码；本机隔离回环复现输出
> Collected: 2026-11-26
> Published: 2026-11-25

## 已发布 Issue

URL：https://github.com/can1357/oh-my-pi/issues/20511

标题：

> Support an HTTP first-output deadline for Responses and Chat Completions

Issue 类型为 enhancement / behavior clarification。发布后独立读取了标题与正文，确认正文同时包含 Responses、Chat Completions 和 HTTP 分阶段预算证据。没有另开重复 Issue。

Issue 的 Description 原文：

> I need a bounded wait for the first meaningful output from OpenAI Responses and Chat Completions HTTP streaming requests. The wait should include HTTP setup. Once output starts, a healthy stream should be allowed to continue beyond that initial budget.

> The existing first-event and idle options do not express that policy. Two separate mechanisms matter.

> These are distinct findings. Chat Completions filters out role-only and empty chunks; I am not attributing the Responses metadata-to-idle behavior to Chat Completions. The shared issue is the absence of one first-output deadline covering HTTP setup and the subsequent stream wait.

> I am reporting a missing timeout policy or a need to clarify the supported configuration, not claiming that this is a new regression. Current documentation explicitly preserves HTTP's existing first-event semantics.

Proposed Solution 原文：

> Provide a supported way to enforce one absolute deadline from request start until the first meaningful output for both Responses and Chat Completions HTTP streams.

> - HTTP setup and metadata-only events must not extend or satisfy that deadline.
> - Once qualifying output begins, disarm the startup deadline. Keep the existing idle protection. Do not terminate an active stream merely because its total duration exceeds the startup budget.
> - Define qualifying progress for text, reasoning, and tools. This is not a request to wait for final answer text while ignoring legitimate reasoning or tool progress.
> - Keep watchdog expiry distinguishable from caller cancellation so existing OMP recovery can handle the failure, subject to its normal retry and replay-safety rules.

## 固定源码版本

默认分支 `main` 的固定 commit 为 `b28adb50cb89afaeaa06bfc39da8b94090f0e489`，标题为 `chore: bump version to 19.2.1`，commit 时间为 `2026-11-25T14:31:06Z`。该快照的 `packages/ai/package.json` 声明 `@oh-my-pi/pi-ai` 为 `19.2.1`。本次只读该 commit，未运行该 commit。

## Responses 进度判定

源码：

https://github.com/can1357/oh-my-pi/blob/b28adb50cb89afaeaa06bfc39da8b94090f0e489/packages/ai/src/utils/websocket.ts

`isOpenAIResponsesProgressEvent` 接受 `response.created`、`response.output_item.added`、`response.content_part.added` 这些事件类型。它不检查 message 的 content、part 的 text 或 delta 是否为空。`response.in_progress` 不在该集合中。

迭代器源码：

https://github.com/can1357/oh-my-pi/blob/b28adb50cb89afaeaa06bfc39da8b94090f0e489/packages/ai/src/utils/idle-iterator.ts

`iterateWithIdleTimeout` 在进入迭代后计算 `Date.now() + firstItemTimeoutMs`。`isProgressItem(item)` 为真时退出 first-item 状态并更新 lastProgressAt。

Responses HTTP 源码：

https://github.com/can1357/oh-my-pi/blob/b28adb50cb89afaeaa06bfc39da8b94090f0e489/packages/ai/src/providers/openai-responses.ts#L974-L1069

HTTP 在请求前设置 requestTimeout，headers 到达后 clear。HTTP 的 iterator 又得到完整 firstEventTimeoutMs，因此 header 等待和后续 first-event 等待可能叠加。

WebSocket 路径的 `webSocketFirstEventDeadline` 在有界参数修正尝试间复用剩余时间，connect 另有期限。该对照不表示 WebSocket 已有涵盖 connect 的首有效输出绝对期限，也不表示 WebSocket 忽略 metadata。

传输文档：

https://github.com/can1357/oh-my-pi/blob/b28adb50cb89afaeaa06bfc39da8b94090f0e489/docs/provider-streaming-internals.md#request-preparation-and-lifetime

文档明确 HTTP 保留 headers watchdog 和现有 first-event 语义。

## Chat Completions 的分阶段预算

源码：

https://github.com/can1357/oh-my-pi/blob/b28adb50cb89afaeaa06bfc39da8b94090f0e489/packages/ai/src/providers/openai-completions.ts#L995-L1116

- L995–999 将 `requestTimeoutMs` 设为完整的 `firstEventTimeoutMs`。
- L1039 定义 `createCompletionsStream`。
- L1073 设置 `requestTimeout`。
- L1108 收到 headers 后清除。
- L1114 在 `finally` 中再次清除。

迭代阶段：

https://github.com/can1357/oh-my-pi/blob/b28adb50cb89afaeaa06bfc39da8b94090f0e489/packages/ai/src/providers/openai-completions.ts#L1498-L1506

L1498 的 `timedOpenaiStream` 调用 `iterateWithIdleTimeout`，L1500 传入 `firstItemTimeoutMs: firstEventTimeoutMs`。结合 iterator 在开始迭代时建立新 deadline 的实现，HTTP 等待与随后首进度等待可叠加。

Chat 进度谓词：

https://github.com/can1357/oh-my-pi/blob/b28adb50cb89afaeaa06bfc39da8b94090f0e489/packages/ai/src/providers/openai-completions.ts#L735-L777

`isOpenAICompletionsProgressChunk` 不把 role-only 或空 chunk 当作进度；非空输出 delta、finish reason 或 usage 可计为进度。Responses 的 metadata 转 idle 问题只归于 Responses。

## 19.2.0 缩减复现

本机通过隔离 runner 执行 `repro.mjs`。环境：

- `@oh-my-pi/pi-ai` `19.2.0`。
- `@oh-my-pi/pi-catalog` `19.2.0`。
- Bun `1.4.5`。
- WSL，HOME 与 SQLite 环境隔离。
- 依赖通过 symlink 使用已安装包，没有联网安装。
- 使用公开内置模型元数据、非秘密占位 key 和回环服务器，没有调用模型服务。
- 每个场景只执行一次，进程退出码为 `0`。

参数：`streamFirstEventTimeoutMs` 为 `80`，`streamIdleTimeoutMs` 为 `160`。

| Fixture | Result | Elapsed | First text |
| --- | --- | ---: | ---: |
| Immediate `response.created`, then `response.in_progress` every 20 ms, text scheduled at 220 ms | `stopReason: error` | `191.49 ms` | None |
| Headers after 55 ms, immediate `response.created`, text 65 ms after headers, completion 75 ms after headers | `stopReason: stop`, no error | `133.32 ms` | `122.66 ms` |

metadata-only case 的错误为：

> OpenAI responses stream stalled while waiting for the next event

Issue 对 split-budget 的限制说明：

> The split-budget fixture demonstrates output after that budget. It does not isolate the second first-event timer, because `response.created` arrives with the headers. The timer restart is a source observation below.

## 19.1.1 旧探测

旧探测使用相同超时设置，每场景重复五次。下表为中位数，与 19.2.0 的单次运行分开。

| Fixture | Native result | Median elapsed | Median first text |
| --- | --- | ---: | ---: |
| Metadata-only fixture | Timeout, 0 of 5 complete | `161.92 ms` | None |
| Split-budget fixture | Success, 5 of 5 complete | `132.02 ms` | `122.05 ms` |
| Text starts after 15 ms and continues every 20 ms, completion at 240 ms | Success, 5 of 5 complete | `241.71 ms` | `16.40 ms` |

另有 gateway-side first-output-deadline 原型：前两个 fixture 的 elapsed 中位数为 `80.31 ms` 和 `80.35 ms`，active-output control 为 `241.29 ms`。该原型不是 OMP 已实现功能，也不是 OMP 集成验证。

## 现有恢复路径

独立保存的 CLI 证据中，两次 first-event timeout 产生两次 `auto_retry_start`，第三次请求成功。CLI `exitCode=0`，`timedOut=false`，总耗时 `5339.666026 ms`，`auto_retry_end` 为 `success=true`、`attempt=2`。

前两次上游请求分别在 `1004 ms`、`1001 ms` 后取消，第三次在 `20 ms` 完成，最终文本为 `LOCAL_AUTORETRY_RECOVERED`。

该证据证明既有超时恢复路径有效。新首输出期限没有接入 OMP，不能用该证据证明新期限的恢复已经通过。

## 本地修改边界

用户明确不修改全局安装的 OMP 包。执行只修改本机配置、自己维护的 copilot-api 仓库，以及上游英文 Issue。当前 Issue 是需求和现有行为说明，不声称已有获批实现或上游修复。

本次没有运行 Chat Completions 19.2.0 复现；其 HTTP 分阶段预算来自固定 commit 的源码。19.2.1 也没有运行验证。
