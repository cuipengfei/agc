# Copilot 遥测的两条通道与判定差异

> Sources: 本机 copilot-api 源码与官方 microsoft/vscode `extensions/copilot` 源码核对，2026-11-27; 本机五实例进程外只读观测，2026-11-27
> Raw: [copilot-api 的两条遥测通道](../../raw/copilot-gateway/2026-11-27-copilot-telemetry-two-channels.md)
> Updated: 2026-11-27

## Overview

Copilot 客户端把「普通使用统计」和「含聊天与代码内容的增强遥测」当成两件事，各有自己的开启条件、iKey 和上报地址。企业账号可以处于「允许普通统计、关闭增强遥测」的状态，此时普通统计照常发送。把增强遥测的服务端开关套到普通统计上，会让活跃度在整个报表里消失。

## 两条通道各看什么

普通统计走 VS Code 的 usage 等级；扩展侧 `TelemetryLogger.logUsage()` 还要求产品允许 usage。这条路径不读 Copilot 令牌里的遥测字段。

增强遥测另建 logger，条件是令牌中的 `rt` 为 `1` 且解密用户不是内部用户：

```ts
token?.getTokenValue("rt") === "1" && !this._isInternalUser
```

响应体里的 `telemetry === "enabled"` 由 `CopilotToken.isTelemetryEnabled()` 单独读取，属于第三个字段，三者不能互相替代。VS Code 的 Agent Host 同样分两条，增强侧额外看 `restrictedTelemetryEnabled`。

Microsoft 侧的 OneCollector 独立于这两套判定。

## 现场取值

本项目（copilot-api）原本在普通统计入口检查服务端状态，状态关闭时直接返回。这使企业席位上的普通统计全部被拦掉。移除该判断后，普通统计只受本地开关与采样控制，服务端状态继续写入 `auth.new_token` 的 `telemetryEnabled` 属性，用来描述「服务端下发了什么」，不再决定「发不发」。

需要注意，服务端下发的遥测主机同时服务于普通与增强两种 reporter，因此「连接到了企业遥测域名」不能推出「发的是增强遥测」；区别在 iKey、内容与开启条件。

## 一次聊天请求会发什么

聊天请求的 HTTP 成功路径上，本项目会触发五个 GitHub 事件，各自独立按 30% 采样；`panel.request` 走 Microsoft 通道，不在其中。这五个事件是 `request.sent`、`ghostText.shown`、`response.success`，以及请求结束 2–15 秒后由定时器补发的 `panel.edit.feedback` 与 `edit.hunk.action`。

字段按来源分三档：

- 真实：请求 ID、模型调用 ID、上游请求 ID、总耗时；非流式请求的 token 数与响应字节数。
- 写死：来源、发起方、传输方式、上下文窗口与 token 上限。
- 合成：入口类型随机；补全展示事件每次请求后补发；采纳与否、语言、参与者与增删行数全部随机。

因此这套数据能反映「哪个账号、哪个模型、什么时候、耗时多少」，不能反映「用户真的在编辑器里点了接受」。同一次请求的两条反馈事件原本各自抽样，会出现同一毫米内一边接受一边拒绝的矛盾，现已改为共用一次抽样。

## 判定「被接受」要看什么

收集端返回 `{"itemsReceived":1,"itemsAccepted":1,"appId":null,"errors":[]}` 表示该次提交被接收。只看 HTTP 200 不够：本会话早前的探测发现，被拒收时状态码同样是 200，区别在响应体计数；缺少外层必填字段时则连计数都不计。上报成功时不打日志，失败才打 `[telemetry]` 告警，所以「日志安静」只能说明没有已知失败。

验证是否真的被接受，见 [遥测接受的黑盒验证](telemetry-acceptance-blackbox-check.md)。

## See Also

- [遥测接受的黑盒验证](telemetry-acceptance-blackbox-check.md)
- [Copilot 延迟调查：社区报告、本机用量与 OMP 计时](copilot-latency-evidence-boundaries.md)
