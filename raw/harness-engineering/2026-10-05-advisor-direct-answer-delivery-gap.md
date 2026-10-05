# OMP Advisor 直接回答的投递缺口：纯文本不渲染，只有 advise() 才渲染

> Source: 本会话实测（2026-10-05）
> Collected: 2026-10-05
> Published: Unknown

## 问题

用户直接点名 advisor（如「@advisor: 你怎么看 shim 代码？」），advisor 的第一人称纯文本回答不会渲染成 advisory 块。OMP 只把 `advise()` 工具调用的 note 渲染为 advisory 块；advisor 的纯文本 assistant 输出只写进它自己的 session jsonl（`__advisor.default.jsonl`），没有投递通道。

证据：advisor 在日志里写了完整的五点评审（「1. 模型吐出的 `<tool_call>` 里 JSON 非法时...」），但用户和主 agent 都没收到。只有走 advise() 的「停止轮询」那条送达了。

## WATCHDOG.md L22 规则

在 WATCHDOG.md L22 加了规则：

> 注意：纯文本回答不会渲染给用户，只有经 `advise` 工具发出的内容才会作为提醒块送达；因此直接点名你的回答必须同时通过 `advise` 发出（正文完整放入 note，severity 用 `nit`，除非内容本身达到更高判级），否则用户看不到。

## advisor 上下文压缩

advisor 之前读过 shim 全文并写了五点评审，但后来被压缩（compaction），丢失了先前评审的上下文。它重新搜仓库、重读 shim 才找回评审能力。这说明 advisor 的长篇评审如果只在它自己的 session 里， compaction 后会丢失——除非当时就走 advise() 发出。

## 修复后行为

advisor 被直接点名时，现在会走 advise() 发出回答（severity nit），用户能看到 advisory 块。验证：advisor 用 advise() 发了「我在，这条走的就是 _advise 通道」，成功渲染。
