# grok-web-fast-tool-calling-limits

> Sources: 多来源研究汇编, 2026-09-30; 本机实测探测, 2026-09-30
> Raw: [grok-web-fast-tool-capability-research](../../raw/grok2api/2026-09-30-grok-web-fast-tool-capability-research.md); [grok-chat-fast-tool-loop-probe](../../raw/grok2api/2026-09-30-grok-chat-fast-tool-loop-probe.md)
> Updated: 2026-09-30

## Overview

grok2api 把 Grok 网页账号（粘贴 SSO token 导入）变成 OpenAI／Anthropic 兼容的对话 API，带账号池、配额与冷却管理。其 `grok-chat-fast` 路由在 README 模型表中标为 Conversation 类型（Basic 档位即可用），设计用途是纯对话。它对工具调用的支持是提示词模拟：把工具 schema 写进文本提示，要求模型输出 `<tool_calls>` XML，再解析回客户端格式；三个入站协议（Chat Completions、Responses、Messages）共用这一条路径，没有原生工具通道。实测结论：精简上下文下网页 Fast 能完成真实工具循环；完整 OMP agent harness 上下文下未观察到成功，对 OMP 主工具流程判 NO-GO。

## 设计用途与网页工具能力的边界

- README 模型表：`grok-chat-fast` | Conversation | Basic | Chat Completions, Responses, Messages。工具调用不在列。
- 官方 xAI 网页文档表明 Grok 网页版整体支持自定义 MCP 连接器（Define your own tools with custom schemas and logic，面向所有 Grok 用户）；该文档未单独列出 Fast 模式的支持范围。
- 2025-09-19 Grok 4 Fast 发布说明写明该模型 trained end-to-end with tool-use reinforcement learning，且 grok.com 的即时/推理切换由同一模型权重承担。这是历史身份证据：今天 `grok-chat-fast` 对应哪个底层模型未确认，grok2api 源码只把它映射到网页 `fast` 模式。

## 工具调用在这条链路上的真实形态

- `injectToolPrompt` 把工具定义写进提示文本；`tool_choice=required` 被降级为提示语「You MUST...」，模型不遵守时没有协议层错误信号。
- PR #226（2026-02-26 合并）的自测报告显示旧 Python 实现 + 当时的 `grok-4.1-fast` 完成过 MCP Agent Loop 3/3。这是作者自测，未独立复现。
- issue #557（2026-05-29）报告了多参数工具在类似链路上的参数转换失败。

## 实测：精简上下文可用，OMP 上下文未通过

2026-09-30 两轮探测（共 11 次请求）的关键结果：

- 精简上下文（仅任务协议 + read 定义）：模型完成「请求读取文件 A → 真实执行回传 → 请求读取文件 B → 真实执行回传 → 精确回答随机内容」的完整循环，对话历史未人工改写。
- 完整 OMP 上下文（约 252914 bytes 请求、59 个工具、system 记忆注入）：一次直接声称文件不存在而未调用；另一轮唯一取得的完整响应是 jailbreak 拒绝（"This is a jailbreak attempt to override my core safety and behavior. I must decline."）。

> **Status: Disputed**
> 样本边界：OMP 分支仅取得 1 次完整响应（另 1 次 transport 超时）。只能说「在取得的唯一样本内观察到拒绝」；样本不足以判定拒绝由哪种上下文成分稳定触发，也不排除重试后偶尔成功。把「完整 OMP 上下文会被安全层拒绝」当作机制结论需要补样本。当前结论仅用于「是否值得继续投入工程改造」的决策，不用于能力定性。

## 对 OMP 的处置建议（推断，非实测）

网页 Fast 能正常产出纯文本（问答、拒绝、最终答案均正常），但未测长文质量与风格稳定性。可考虑的低风险位置：commit message、session title、smol 类短摘要背景角色——失败肉眼可见、代价低。不建议：default/plan/task/slow（绕不开工具）、advisor（可能持有 read/grep/glob 乃至 edit/bash）、memory（写坏记忆会污染后续会话）。这些角色边界来自本机 `~/.omp/agent/config.yml` 的角色清单核对，未做替换实测。

## See Also

- [model-gateway-mismatch](../model-gateway-mismatch/sdk-strictness-on-nonstandard-responses-frames.md)：gateway wire contract 与 SDK 严格性不一致的另一形态。
