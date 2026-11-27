# Copilot 遥测的两条通道与判定差异

> Sources: 本机 copilot-api 源码与官方 microsoft/vscode `extensions/copilot` 源码核对（固定提交 `fe444ae0`），2026-11-27–28; 本机五实例进程外只读观测与 tmux 日志观察，2026-11-27–28
> Raw: [copilot-api 的两条遥测通道](../../raw/copilot-gateway/2026-11-27-copilot-telemetry-two-channels.md); [遥测增强与自然流量验收](../../raw/copilot-gateway/2026-11-28-telemetry-enhancement-and-live-verification.md)
> Updated: 2026-11-28

## Overview

Copilot 客户端把「普通使用统计」和「含聊天与代码内容的增强遥测」当成两件事，各有自己的开启条件、iKey 和上报地址。企业账号可以处于「允许普通统计、关闭增强遥测」的状态，此时普通统计照常发送。把增强遥测的服务端开关套到普通统计上，会让活跃度在整个报表里消失。

## 两条通道各看什么

普通统计走 VS Code 的 usage 等级；扩展侧 `TelemetryLogger.logUsage()` 还要求产品允许 usage。这条路径不读 Copilot 令牌里的遥测字段。

增强遥测另建 logger，条件是令牌中的 `rt` 为 `1` 且解密用户不是内部用户：

```ts
token?.getTokenValue("rt") === "1" && !this._isInternalUser
```

响应体里的 `telemetry === "enabled"` 由 `CopilotToken.isTelemetryEnabled()` 单独读取，属于第三个字段，三者不能互相替代。VS Code 的 Agent Host 同样分两条，增强侧额外看 `restrictedTelemetryEnabled`。

Microsoft 侧的 OneCollector 独立于这两套判定，已在本次改动中停发。

## 现场取值

本项目（copilot-api）原本在普通统计入口检查服务端状态，状态关闭时直接返回。这使企业席位上的普通统计全部被拦掉。移除该判断后，普通统计只受本地 `getConfig().telemetry === true` 与按请求成套采样控制，服务端状态继续写入 `auth.new_token` 的 `telemetryEnabled` 属性，用来描述「服务端下发了什么」，不再决定「发不发」。

需要注意，服务端下发的遥测主机同时服务于普通与增强两种 reporter，因此「连接到了企业遥测域名」不能推出「发的是增强遥测」；区别在 iKey、内容与开启条件。

## 隐私最小化

删掉了 `common_os`、`common_platformversion`、`common_arch`、`common_editorsession_id` 四个系统/指纹字段；机器码与设备 ID 改为 `randomUUID()` 随机生成并持久化在应用目录（不再读网卡 MAC 或宿主机 `~/.cache/Microsoft/DeveloperTools/deviceid`）；停发微软 OneCollector 通道。`conversationId` 每请求随机、不持久化、不跨请求复用；`tid` 仍关联账户，服务端请求 ID 有意关联 CAPI 记录——应称「单请求关联标识」，不能称完全匿名。

## 一次聊天请求会发什么

一次成功的对话请求最多扇出 12 条候选事件（含新增的 `source: "user"` 消息），按请求成套采样（`createMockRequestContext` 一次性决定 `sampled`）：

| # | 事件 | 触发时机 |
|---|---|---|
| 1 | `copilot-chat/request.sent` | 发起上游请求前 |
| 2 | `copilot-chat/panel_request` | 上游响应到达后 |
| 3 | `copilot-chat/conversation.message`（`source: "user"`） | `trackPanelRequest` 内连带 |
| 4 | `copilot-chat/conversation.message`（`source: "model"`） | `trackPanelRequest` 内连带 |
| 5 | `copilot/ghostText.shown` | 上游响应到达后 |
| 6 | `copilot-chat/response.success` / `response.error` | 上游成功或失败 |
| 7 | `copilot-chat/panel.edit.feedback` | 定时器 2–15 秒后 |
| 8 | `copilot-chat/edit.hunk.action` | 同上定时器 |
| 9 | `copilot-chat/inlineConversation.message` | 后置定时器 |
| 10 | `copilot-chat/inlineConversation.accept` | 同上 |
| 11 | `copilot/ghostText.accepted` | 同上 |
| 12 | `copilot-chat/conversation.acceptedCopy` / `acceptedInsert` / `appliedCodeblock` | 同上（三选一） |

`edit` 模式下 `source: "user"` 消息走 `copilot-chat/editingSession.message`（`uiKind: "editingSession"`），其余模式走 `copilot-chat/conversation.message`（`uiKind: "panel"`）。

字段来源分三档：

- **真实**：请求 ID、模型调用 ID、上游对账响应头（`gitHubRequestId`、`copilotServiceRequestId`、`gitHubCopilotRequestTe`）、总耗时、`timeSinceIssuedMs`（实际计算）。
- **写死**：来源、发起方、传输方式、上下文窗口与 token 上限。
- **合成**：`conversationId`（每请求独立 UUID）、`unique_id`（每事件独立 UUID）、入口类型随机、采纳与否与行数随机。

## 4 项增强

1. **透传上游对账响应头**：`extractUpstreamTelemetryHeaders()` 从真实 `Headers` 提取 `x-github-request-id`、`x-copilot-service-request-id`、`x-github-copilot-request-te`（空值省略）。`request.sent` 不含响应头；拿到上游响应后把对账头合入遥测事件。
2. **按请求成套采样**：`createMockRequestContext()` 一次性计算 `sampled`，同一请求的全部事件复用；`sampled === false` 时不发任何请求级事件，也不创建定时器。
3. **补发 `source: "user"` 消息**：`trackPanelRequest()` 在 `panel_request` 后依次调用 `trackUserConversationMessage()` 与 `trackConversationMessage()`，携带 `source: "user"`、`turnIndex: "0"`、`conversationId`、合成的 `promptTokenLen` / `messageCharLen`。
4. **`conversationId` + `timeSinceIssuedMs` + `unique_id`**：每请求独立 UUID 作为共享 `conversationId`；`timeSinceIssuedMs` 按实际经过毫秒计算；每事件独立 `unique_id` 遵循官方 `addRequiredProperties` 模式。

## 判定「被接受」要看什么

收集端返回 `{"itemsReceived":1,"itemsAccepted":1,"appId":null,"errors":[]}` 表示该次提交被接收。只看 HTTP 200 不够：被拒收时状态码同样是 200，区别在响应体计数；缺少外层必填字段时则连计数都不计。

成功接收时打印 `[telemetry] accepted: <eventName> count=<N>`（第 1 次及每 10 次），失败时打 `[telemetry]` 告警。验证是否真的被接受，见 [遥测接受的黑盒验证](telemetry-acceptance-blackbox-check.md)。

## 后台聚合与报表验证边界

`itemsAccepted: 1` 只证明接入网关收下 HTTP 包，不代表后台离线 ETL 会把事件算进 `users-28-day/latest` 报表。最终验证需要等 T+2 日后查报表中的 `client_telemetry_present`、`usage_metrics_requirements.met`、`loc_suggested_to_add_sum` / `loc_added_sum` / `used_agent`。本机实例 Token 无企业报表读取权限（`403 Resource not accessible by integration`），需等 HEET 刷新或取得授权。HEET 内部是否有二次过滤逻辑未核实（无仓库访问权限）。

## See Also

- [遥测接受的黑盒验证](telemetry-acceptance-blackbox-check.md)
- [Copilot 延迟调查：社区报告、本机用量与 OMP 计时](copilot-latency-evidence-boundaries.md)
