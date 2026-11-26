# copilot-api 的两条遥测通道：判定条件、事件清单与接受验证

> Source: 本机 copilot-api 仓库源码（`src/services/telemetry/`、`src/services/copilot/`）; 官方仓库 microsoft/vscode 的 `extensions/copilot` 与 `src/vs/platform/telemetry`; 本机五实例的进程外只读观测
> Collected: 2026-11-27
> Published: Unknown

## 上游仓库位置

旧独立仓库 `microsoft/vscode-copilot-chat` 的 README 声明该仓库已归档，Copilot 插件开发进入 `microsoft/vscode` 的 `extensions/copilot`。本次核对使用后者，固定提交 `8cfcc55c1513c25a9550ce261c260ef6c7683701`。

## 两类遥测的不同判定

普通使用统计（GitHub 侧）：经过 VS Code 的 usage 等级检查，扩展侧 `TelemetryLogger.logUsage()` 还要求产品允许 usage；这条路径不读取 Copilot 令牌里的遥测字段。

增强内容遥测（GitHub 侧另建 logger）：创建条件是令牌中的 `rt` 值为 `1` 且解密用户非内部用户，即

```ts
token?.getTokenValue("rt") === "1" && !this._isInternalUser
```

`CopilotToken.isTelemetryEnabled()` 单独读取响应体里的 `telemetry === "enabled"`，与上述判断不是同一个字段。

VS Code 的 Agent Host 同样分两条：普通 GitHub 事件看 usage 等级，增强事件额外检查 `restrictedTelemetryEnabled`。

Microsoft 侧走 OneCollector，独立于上述两套判定。

## 两组 iKey 与端点

- 普通 GitHub 统计：`7d7048df-6dd0-4048-bb23-b716c1461f8f`
- 增强 GitHub 遥测：`3fdd7f28-937a-48c8-9a21-ba337db23bd1`

服务端下发的 `endpoints.telemetry` 会作为上报主机；企业席位指向企业遥测域名，普通与增强 reporter 都使用该地址。

## 本仓事件清单与真实度

聊天请求（`/chat/completions` 的 HTTP 路径）依次触发五个 GitHub 事件，各自独立采样 `Math.random() <= 0.3`：

| 事件 | 触发位置 |
|---|---|
| `copilot-chat/request.sent` | `src/services/copilot/create-chat-completions.ts:116` |
| `copilot/ghostText.shown` | `src/services/copilot/create-chat-completions.ts:161` |
| `copilot-chat/response.success` | `src/services/copilot/create-chat-completions.ts:174` 与 `:193` |
| `copilot-chat/panel.edit.feedback` | `src/services/telemetry/telemetry.ts:498`（请求后 2–15 秒定时器） |
| `copilot-chat/edit.hunk.action` | `src/services/telemetry/telemetry.ts:522`（同一定时器） |

`trackPanelRequest` 走 Microsoft 通道（`src/services/telemetry/telemetry.ts:580` 调用 `trackMsftEvent`）。

字段真实度三档：

- 真实透传或计算：审计用请求 ID、模型调用 ID、上游请求 ID、总耗时；非流式 `/chat/completions` 与 `/responses` 的输入输出 token 数与响应字节数。
- 写死：`source` 为 `panel`、`initiatorType` 为 `user`、`transport` 为 `http`、`totalTokenMax` 为 `128000`、`tokenCountMax` 为 `8192`。
- 合成：`uiKind` 在四种入口中随机；`ghostText.shown` 每次请求成功后补发；采纳与否、语言、参与者、命令与增删行数由 `Math.random()` 生成。

## 修复内容

删除 `trackEvent()` 中的服务端状态提前返回后，普通统计只受本地 `getConfig().telemetry === true` 与 30% 采样控制；服务端状态继续写入 `auth.new_token` 的 `telemetryEnabled`。

同一提交内另有：两条通道删除系统、架构与内核字段；机器与设备标识改为应用目录内随机生成并持久化；成功与失败事件的 `apiType` 改为 `chatCompletions`、`messages`、`responses`；未提供首包时间时估计值不超过总耗时；反馈事件在定时器里只抽样一次并共享给两条事件。

## 接受验证方法与结果

观测手段：以管理员权限从进程外只读进程驻留内存页（先按内核页面标志过滤共享零页），按 UTF-8 与 UTF-16-LE 两种编码搜索以 `"itemsReceived"` 起始的 JSON 对象，并要求对象同时含 `itemsReceived`、`itemsAccepted`、`appId`、`errors` 四个键。Microsoft 通道另按 HTTP 响应解析，读取响应头与响应体。

对照实验：先对干净实例做基线全驻留扫描，再用 `max_tokens: 1` 的极小请求触发（每轮 6 个），每轮后等待 8 秒复扫，出现 `itemsAccepted >= 1` 且 `errors` 为空即停止。

结果：

| 实例端口 | 基线 | 触发 | 复扫结果 |
|---|---|---|---|
| 4142 | 零条 | 一轮 6 个请求全 200 | 1 条 `itemsReceived: 1, itemsAccepted: 1, errors` 0 |
| 4143 | 1 条（16 位形式） | 一轮 6 个请求全 200 | 新增 1 条（8 位形式），共两条记录 |
| 4144 | 零条 | 一轮 6 个请求全 200 | 1 条，`errors` 0 |
| 4145 | 零条 | 一轮 6 个请求全 200 | 1 条，`errors` 0 |
| 4146 | 零条 | 第一轮 6 个未命中，第二轮再 6 个 | 1 条，`errors` 0 |

Microsoft 通道：4146 内存中出现完整 HTTP 响应，响应头 `Server: Microsoft-HTTPAPI/2.0`，响应体 `{"acc":1}`，服务端时间随采样推进。

## 已知缺口

- 回执只含计数，不含事件名，无法判定被接受的是五个事件中的哪一个。
- 回执条数低于实际发送量：采样式发送与内存回收都会让回执不再驻留。
- 回执与具体请求的对应关系按时间先后推断，非逐请求对齐。
- 两次尝试过的动态观测在本机内核上不可用：按 PID 过滤的 syscall tracepoint 因内核助手返回无效参数而失效；对 libc 复制函数的动态探针不触发，因为运行时解析到的是未导出的实现。syscall 层本身只能看到 TLS 密文。

## 结论

GitHub 普通遥测在移除服务端状态拦截后正常发出并被收集端接受；Microsoft 通道同时被接受。两条通道的接受都以收集端返回的计数为证，未经报表侧核对。

## 过程注意

读取配置文件做核对时，工具输出可能回显管理密钥等敏感值；核对配置应只取所需键，避免回显整份文件。
