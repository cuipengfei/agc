# copilot_cache_control 的选点规则与 Gemini 适用性

> Sources: GitHub 公开仓库源码, 2026-11-28; CC Switch issue, 2026-11-28; 本机同账户对照, 2026-11-28
> Raw: [跨项目标记位置对比与 Gemini 证据](../../raw/prompt-caching/2026-11-28-copilot-cache-control-cross-project-placement.md); [账号绑定与交互标识对照](../../raw/prompt-caching/2026-11-28-argon-account-binding-and-interaction-id.md)
> Updated: 2026-11-28

## Overview

`copilot_cache_control: { "type": "ephemeral" }` 按消息挂载，用于给断点缓存模型标记可复用位置。多个客户端都往 Gemini 请求里塞这个字段，但选点规则各不相同，公开资料里也没有受控对照证明它对 Gemini 有收益。

## 各客户端的选点

| 项目 | 选点规则 |
|---|---|
| caozhiyuan/copilot-api | 前 2 条非空 `system` 加最后 2 条非空非 `system` |
| 本机 copilot-api | 前 2 条非空 `system` 加最后 1 条非空非 `system`，扩展到 Gemini 的 Chat 请求 |
| VS Code Copilot | 预算 4 个，自尾部向前：当前用户消息、当前工具批次末尾、所有位置不带非空 `tool_calls` 的 assistant；有余量再补开头 |
| CodeCompanion.nvim | 按估算 token 数排序，取最大的最多 4 条 |
| ghcp_proxy | 保留客户端已有标记，不自行选点 |

本机实现与 caozhiyuan 的版本同源：同一骨架，尾部条数不同。它的提交测试没有验证 Gemini 的缓存效果。

## 对 Gemini 为什么可能没用

`gemini-4-argon` 只支持隐式缓存，按内容做最长公共前缀匹配，不读取断点标记。标记在 Claude 类断点缓存模型上有明确语义，对 Gemini 更像无害的附带字段。

同账户的成对对照没有出现稳定方向的差异。CC Switch 的 issue 里，请求完全不带标记，重发相同内容时输入 219,575 tokens、命中 217,526 tokens；同一报告的长期命中率只有 27%。

这说明 Gemini 在没有标记时也可能高度命中，也说明单次高命中不能代表整体表现。

## 值得改的地方在哪里

真正决定部分掉点落点的，是前缀在哪一条消息处被改写。工具结果被裁剪、历史消息被替换，都会让缓存从改动位置截断。

对 Gemini 而言，能拿到的收益主要来自不改写既有前缀，不来自多打几个断点。中断前缀的典型来源是上下文裁剪，见 [OMP Shake 机制](../omp-slash-commands/shake-mechanics.md)。

## 本机规划中的选择

如果仍要对齐官方客户端，VS Code 的四标记选点是现有实现里证据最完整的一份：尾部优先、已有标记计入预算、内容不可标记时跳过、预算耗尽立即停止、多个入口从首次处理起使用同一策略。该规划已写成规格与票据，未落地为实现。

## See Also

- [Gemini 4 Argon 上下文缓存：隐式缓存的掉点现象与社区反馈](gemini-4-argon-copilot-cache-drop.md)
- [Prompt Cache：前缀匹配与 cache key 的真实分工](cache-key-and-prefix-matching.md)
- [OMP 缓存保温的调度、门槛与实测边界](omp-cache-warming-tuning.md)
