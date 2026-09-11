# OpenCode DCP 官方项目摘录

> 来源：[Opencode-DCP/opencode-dynamic-context-pruning](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning)
> 采集日期：2026-09-11

## 定位

官方 README 将 DCP 描述为 OpenCode 的 dynamic context pruning plugin。它处理 outbound message transform，用 summary/placeholder 替换当前请求中可裁剪的旧内容；不是直接删除 session history 本身。

## 保护语义

- `turnProtection.turns` 保护 tool invocation 后最近若干 message turns 的 tool outputs，而非泛化的"最近 N 个 user turns"。
- `protectUserMessages: true` 单独保护 user messages。
- `minContextLimit` 是提醒下限；`maxContextLimit` 是 soft upper limit / compression nudge 条件。

## 裁剪语义

`deduplication`、`purgeErrors` 等能力应理解为发给模型的视图被裁剪/替换，而不是用户历史被删除。

## 证据边界

本 raw 仅记录官方 README/项目页的公开描述；本轮未运行 DCP 的实际 transform。
