# Grok 网页版工具能力：官方文档、历史发布与 grok2api 工具调用实现

> Source: 多来源汇编（精确 URL 见各节）；https://docs.x.ai/grok/connectors.md；https://x.ai/news/grok-4-fast；https://github.com/chenyme/grok2api/pull/226；https://github.com/chenyme/grok2api/issues/557
> Collected: 2026-09-30
> Published: 见各节

本文件汇编 2026-09-30 联网研究 Grok 网页 Fast（`grok-chat-fast`）是否被设计为支持工具调用时的关键来源摘录。摘录保持原文，仅清理格式噪音。

## 1. xAI 官方文档：网页版 Connectors（自定义 MCP 工具）

来源：https://docs.x.ai/grok/connectors.md （官方产品文档，2026-09-30 直接 GET 获取）

> Connectors are available to all Grok users and let Grok access your external tools and data sources directly within a conversation.

> ## Custom MCP connectors
> With a custom MCP connector you can:
> * Define your own tools with custom schemas and logic.

> Grok will discover the tools your MCP server exposes and make them available in conversations, just like the built-in and catalog connectors.

> Your MCP server must be reachable over the public internet. If it is running on your local machine, you will need a tunneling service to make it accessible.

说明：该文档没有单独列出 Fast 模式的支持范围，也没有出现 `Fast` 或 `grok-chat-fast` 字样；它证明网页版产品整体包含自定义工具能力，不能据此保证每个模式的行为。

## 2. xAI 官方发布：Grok 4 Fast（2025-09-19）

来源：https://x.ai/news/grok-4-fast （官方发布，经 r.jina.ai 提取原文）

> ## Native Tool Use with SOTA Search
> Grok 4 Fast was trained end-to-end with tool-use reinforcement learning (RL). It excels at deciding when to invoke tools like code execution or web browsing.

> ## Unified Model: Reasoning and Non-Reasoning
> Previously, separate reasoning modes required distinct models. Grok 4 Fast introduces a unified architecture where `reasoning` (long chain-of-thought) and `non-reasoning` (quick responses) are handled by the same model weights, steered via system prompts.

> In grok.com, this results in smooth transitions: responding instantly for simple queries or engaging in extended reasoning for complex ones.

说明：发布说明没有直接写「grok.com 的 Fast 模式采用 Grok 4 Fast」。Unified Model 一节说明 grok.com 的即时/推理切换由同一模型权重承担；当时网页 Fast/Auto 采用该模型是发布语境下的合理归属，但这不是文档原句。今天 `grok-chat-fast` 对应哪个底层模型未确认——grok2api 源码（catalog.go L19）只把 `grok-chat-fast` 映射到网页 `fast` 模式，不指定底层模型版本。

## 3. grok2api 工具调用功能提交 PR #226（2026-02-24 建立，2026-02-26 合并）

来源：https://github.com/chenyme/grok2api/pull/226 （merge commit f7f8f973a07611f1890ccd282fc022ca46d4247f）

> Implements OpenAI-compatible Function Calling (`tools` / `tool_calls`) support.

> Prompt-based emulation: injects tool definitions into the system prompt and instructs the model to output tool calls using `<tool_call>` XML tags. Responses are parsed and converted to OpenAI-format `tool_calls`.

> | `tool_choice: "required"` | ✅ Returns `tool_calls` + `finish_reason: "tool_calls"` |

> ### MCP Agent Loop — 3/3 passed
> [USER] Reverse the string 'Hello MCP World!'
> tool_call: string_reverse({'text': 'Hello MCP World!'})

> | grok-4.1-mini | ✅ PASS |
> | grok-4.1-fast | ✅ PASS |
> | grok-4.1-expert | ✅ PASS |

说明：这是旧 Python 实现的作者自测声明，未独立复现；兼容表中的 `grok-4.1-fast` 是当时模型，不证明当前 Go 版与当前 `grok-chat-fast` 的行为。

## 4. 故障报告 issue #557（2026-05-29 创建，2026-06-09 关闭）

来源：https://github.com/chenyme/grok2api/issues/557

用户报告：Basic 单 SSO 账号、模型 `grok-4.20-fast`、pi 框架、旧 Python 实现；多参数 write 工具的 XML/JSON 参数转换失败、思考块内出现 XML 等。issue 已关闭，但关闭不等于修复已验证；根因分析按用户报告引用，未独立复验。
