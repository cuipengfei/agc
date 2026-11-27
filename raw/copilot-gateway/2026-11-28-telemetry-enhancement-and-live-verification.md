# copilot-api 遥测增强与自然流量验收

> Source: 本机 copilot-api 仓库源码（`src/services/telemetry/`、`src/services/copilot/`）; 官方仓库 microsoft/vscode 的 `extensions/copilot` 源码（固定提交 `fe444ae0`）; 真实 HTTP 手动验收（4142 实例凭据）; 本机五实例 tmux 日志观察（4142–4146）
> Collected: 2026-11-28
> Published: Unknown

## 最小可接受包实测

对真实 `telemetry.business.githubcopilot.com/telemetry` 逐字段消减后确认：网关只校验信封外层 5 个字段——`name`、`time`（有效当前时间）、`iKey`、`data.baseType: "EventData"`、`data.baseData.name`（非空）。删除全部 `properties`、`measurements`、`tags` 后仍返回 `itemsReceived: 1, itemsAccepted: 1`。删除 `time`、`iKey`、`data.baseData.name` 中任何一个则 `itemsAccepted: 0`。HTTP 状态码始终 200，被拒收时响应体 `content-type` 缺少 `charset=utf-8` 后缀。`common_os`、`common_platformversion`、`common_arch` 等系统字段纯属客户端塞入的环境信息，删掉不影响网关接收。

## 官方遥测字段构造（fe444ae0）

`TelemetryData.makeReadyForSending()` 末尾的 `addRequiredProperties()` 给每条事件加 `unique_id: generateUuid()`（注释写明用于 copilot-foundations 去重/关联）、`common_extname`、`common_extversion`、`common_vscodeversion`。`fetch.ts:21-34, 73-91` 从上游响应头 `x-copilot-service-request-id` 和 `x-github-copilot-request-te` 提取 `copilotServiceRequestId` 与 `gitHubCopilotRequestTe`（注释：用于关联客户端遥测与 CAPI 服务端记录）。`userActions.ts` 与 `chatParticipantTelemetry.ts` 把 `gitHubCopilotRequestTe` 塞进 `panel_request`、`panel.edit.feedback`、`acceptedCopy`、`acceptedInsert`、`appliedCodeblock`、`inlineConversation.accept`。`telemetry.ts:81-118` 每次对话发两条消息事件：`sendUserMessageTelemetry`（`source: "user"`、`turnIndex: "0"`、`promptTokenLen`、`messageCharLen`）与 `sendModelMessageTelemetry`（`source: "model"`），都带 `conversationId` 与 `headerRequestId`。

VS Code 本体在 `commonProperties.ts:52` 用正则截断内核版本号后缀；官方 Copilot 插件在 `azureInsightsReporter.ts:121-122` 和 `githubTelemetrySender.ts:180-181` 原样直出 `os.platform()` / `os.release()`，且 `githubTelemetrySender.ts:204` 传 `replacementOptions: []` 显式关闭脱敏。

## 双通道物理隔离

GitHub 官方防火墙白名单（Copilot allowlist reference）列出的客户端遥测域名只有 `copilot-telemetry.githubusercontent.com/telemetry`、`telemetry.business.githubcopilot.com/telemetry`、`telemetry.enterprise.githubcopilot.com/telemetry` 和 `collector.github.com/*`，不含 `mobile.events.data.microsoft.com`。官方 `baseTelemetryService.ts:46-66` 中 `sendMSFTTelemetryEvent`（`{ github: false, microsoft: true }`）与 `sendGHTelemetryEvent`（`{ github: true, microsoft: false }`）物理隔离。所有驱动企业报表的事件（`panel_request`、`conversation.message`、`acceptedCopy`、`acceptedInsert`、`appliedCodeblock`、`inlineConversation.accept`、`ghostText.shown` / `ghostText.accepted`）都专门调 `sendGHTelemetryEvent()`。

## 本仓 4 项增强实现

1. **透传上游对账响应头**：`extractUpstreamTelemetryHeaders(headers)` 从真实 `Headers` 提取 `x-github-request-id`、`x-copilot-service-request-id`、`x-github-copilot-request-te`（空值省略）。`request.sent` 不含响应头（时序上响应尚未到达）；拿到上游响应后（含成功流式/非流式、重试后失败、直接失败）把对账头合入或传给遥测事件。

2. **按请求成套采样（Per-Request Sampling）**：`createMockRequestContext(requestId, model)` 在发起上游请求前调用一次，当场计算 `sampled = Math.random() <= 0.3`。同一请求的 `request.sent`、`response.success` / `response.error`、`panel_request`、两条消息、`ghostText`、反馈与后置事件全部复用同一个 `sampled` 布尔值；`sampled === false` 时不发任何请求级事件，也不创建延时定时器。独立事件 `auth.new_token` 仍走 `trackEvent()` 的 30% 采样。

3. **补发 `source: "user"` 消息事件**：`trackPanelRequest()` 在发送 `panel_request` 后依次调用 `trackUserConversationMessage(context)` 与 `trackConversationMessage(context)`。`edit` 模式发 `copilot-chat/editingSession.message`（`uiKind: "editingSession"`），其余模式发 `copilot-chat/conversation.message`（`uiKind: "panel"`），携带 `source: "user"`、`turnIndex: "0"`、`headerRequestId`、`conversationId`、合成的 `promptTokenLen` / `messageCharLen`。

4. **单次请求 `conversationId`、实际 `timeSinceIssuedMs`、每事件 `unique_id`**：`createMockRequestContext()` 生成独立 UUID 作为单请求共享 `conversationId` 并记录 `issuedAt = Date.now()`；`trackContextEvent` 传 `Date.now() - context.issuedAt`，`response.success` / `response.error` 传实际 `durationMs`，无 context 的底层 `createEnvelope` 默认兜底为 `0`。每个信封自动生成 `unique_id: crypto.randomUUID()`。

附带：成功接收计数日志——`acceptedCounts` Map 按 `eventName` 独立计数，在 `count === 1 || count % 10 === 0` 时打印 `[telemetry] accepted: <eventName> count=<N>`。

## 隐私最小化

删掉 `common_os`、`common_platformversion`、`common_arch`、`common_editorsession_id`；机器码与设备 ID 改为 `randomUUID()` 随机生成并持久化在应用目录（不再读网卡 MAC 或宿主机 `~/.cache/Microsoft/DeveloperTools/deviceid`）；停发微软 OneCollector 通道；`conversationId` 每请求随机、不持久化、不跨请求复用；`tid` 仍关联账户，服务端请求 ID 有意关联 CAPI 记录——应称「单请求关联标识」，不能称完全匿名。

## Token 权限实测

本机实例（端口 4142）GitHub Token 请求 `/copilot_internal/user` 返回正常（含 `organization_login_list`、`enterprise_list`）；请求 `/orgs/{org}/copilot/metrics/reports/users-28-day/latest` 返回 `403 Resource not accessible by integration`。OAuth scope 输出为空。需要企业管理员授权（`read:enterprise` 或 `manage_billing:copilot`）或组织级 `read:org` + Copilot Business 订阅才能读取报表。

## tmux 自然流量观察（2026-11-28）

tmux session `copilot-20261123-194505-9028`，窗口 1，五个 pane（`%0`=4142、`%2`=4143、`%3`=4144、`%4`=4145、`%5`=4146）。

重启后 4142/4143/4144/4146 持续打印 `[telemetry] accepted: ... count=N` 日志，覆盖 15/16 种事件（`request.sent`、`panel_request`、`conversation.message`、`editingSession.message`、`ghostText.shown`、`response.success`、`panel.edit.feedback`、`edit.hunk.action`、`inlineConversation.message`、`inlineConversation.accept`、`conversation.appliedCodeblock`、`conversation.acceptedCopy`、`conversation.acceptedInsert`、`ghostText.accepted`、`auth.new_token`）。4143 出现 3 次发送超时（5 秒 `AbortSignal.timeout`），之后接收计数继续增长。4145 重启后只有 3 次 `GET /usage`，无模型请求。`response.error` 未在自然窗口内触发（已有测试与手动 HTTP 验收覆盖）。

手动 HTTP 验收（4142 凭据，真实 fetch + 真实 timer）：43 个 POST / 43 有效回执 / 16 事件类型，HTTP 200 / `received: 1` / `accepted: 1` / `errors: []`。3 模式各 6 生命周期 + 6 后置定时 + 1 错误 = 39，加 auth 1、缺头/空 Te 3 = 43。`Math.random` 0.99 时 `sampled: true` 仍全送；3 组同 conv/context SHA；`source: user` / `source: model` 均存在；每组后置 6 真实定时器时间 ≥ 2000ms；缺失头真实省略。

## 代码提交

3 个 commits 已推送 `origin/dev`：
- `da1e3dfdab` — 遥测修复（移除服务端拦截、删系统指纹、停发 OneCollector、16 事件改道 GitHub `/telemetry`）
- `42ab705bb6` — 4 项增强（上游对账头透传、成套采样、补发 user 消息、`conversationId` / `timeSinceIssuedMs` / `unique_id` / 成功计数日志）
- `2e0b92ced0` — 遥测初始化修复（修复 `trackEvent()` 中 `state.copilotTelemetryEnabled` 提前返回）

全量验证：`lint:all` 0 error、`typecheck:all` 通过、`build` + `build:desktop` 通过、5272 pass / 0 fail（264 文件）。

## 剩余验证边界

- **GitHub 后台离线聚合**：`itemsAccepted: 1` 只证明接入网关收下 HTTP 包；最终验证需要等 T+2 日后查 `users-28-day/latest` 报表中的 `client_telemetry_present`、`usage_metrics_requirements.met`、`loc_suggested_to_add_sum` / `loc_added_sum` / `used_agent`。当前 Token 无权限，需等 HEET 刷新或取得授权。
- **HEET 二次过滤**：HEET 内部是否只认特定 `ide` 名或 `feature` 名未核实（无仓库访问权限）。
- **真实 VS Code 抓包**：已有源码足以核对字段构造，未抓真实用户对话包。
