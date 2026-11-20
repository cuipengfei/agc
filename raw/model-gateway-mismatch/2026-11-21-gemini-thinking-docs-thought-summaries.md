# Gemini thinking 官方文档：Thought Summaries、签名回传与语言控制线索

> Source: https://ai.google.dev/gemini-api/docs/thinking; https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/thinking.md.txt; https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/thinking/thought-signatures.md.txt; https://discuss.ai.google.dev/t/gemini-thinking-in-russian-is-there-a-solution/63115
> Collected: 2026-11-21
> Published: Unknown（官方文档为持续更新页面；论坛帖为历史内容）

证据形态：**文档声明**＝官方文档页面原文摘录；**社区说法**＝论坛摘录。

## ① Thought Summary 与完整推理的分工（ai.google.dev/gemini-api/docs/thinking）

thought step 两个字段的定义（文档表格原文）：

> `signature` — An encrypted representation of the model's internal reasoning state. Always present, even when the model performs minimal reasoning.
>
> `summary` — An array of content (text and/or images) summarizing the reasoning. May be empty depending on the `thinking_summaries` config, whether the model performed enough reasoning, or the content type (for example, image latents may not have text summaries).

计费与摘要的关系（Pricing 节原文）：

> Thinking models generate full thoughts to improve the quality of the final response, and then output summaries to provide insight into the thought process. Pricing is based on the full thought tokens the model needs to generate, despite only the summary being output from the API.

> When thinking is turned on, response pricing is the sum of output tokens and thinking tokens. You can get the total number of generated thinking tokens from the `total_thought_tokens` field.

摘要可能缺席的三种情况（原文）：

> A thought block may contain **only a signature with no summary** in these cases:
>
> * Simple requests, where the model didn't reason enough to generate a summary
> * `thinking_summaries: "none"`, where summaries are explicitly disabled
> * Certain thought content types, such as images, may not have text summaries

流式传输的两种 delta（文档表格原文）：

> | `thought_summary` | Text or image summary content | One or more deltas with incremental summary |
> | `thought_signature` | The cryptographic signature | the last delta before `step.stop` |

## ② Gemini 4 Argon 的 thinking 档位与输出上限（同文档 Controlling thinking / Token limits 节）

档位表节选：

> | Model | Default Thinking | Levels Supported |
> | gemini-4-argon | On (medium) | low, medium, high |

Token 上限（原文）：

> **Shared 1M context window:** Input, thinking, and output tokens share a single 1M-token context window (`1,048,576` tokens). If your input tokens plus `max_output_tokens` exceed 1,048,576 tokens, the API automatically caps the output limit to the remaining space in the context window (`1,048,576` minus your input tokens).
>
> **Default synchronous output cap (64K):** When `background=False`, the default `max_output_tokens` cap is 65,536 tokens. A single foreground hop generates up to 65,536 tokens for streaming calls and non-streaming calls on `gemini-4-neon` and `gemini-4-hydrogen`, or up to 32,768 tokens for non-streaming calls on `gemini-4-carbon` and `gemini-4-argon`.

## ③ 跨轮推理状态的官方延续机制（thought-signatures 文档）

性质定义（原文）：

> Thought signatures are encrypted representations of the model's internal thought process. Thought signatures preserve the Gemini reasoning state during multi-turn and multi-step conversations, which can be useful when using function calling. Responses can include a `thought_signature` field within any content part (e.g., `text`, `functionCall`).

工具调用暂停与恢复（原文）：

> When a Thinking model calls an external tool, it pauses its internal reasoning process. The thought signature acts as a "save state," allowing the model to resume its chain of thought seamlessly once you provide the function's result. Without thought signatures, the model "forgets" its specific reasoning steps during the tool execution phase. Passing the signature back ensures:
>
> - **Context continuity:** The model preserves and can check the reasoning steps that justified calling the tool.
> - **Complex reasoning:** Enables multi-step tasks where the output of one tool informs the reasoning for the next.

Gemini 3 的强制校验（原文）：

> Gemini 3 models enforce stricter validation on thought signatures than previous Gemini versions because they improve model performance for function calling. To ensure the model maintains full context across multiple turns of a conversation, you must return the thought signatures from previous responses in your subsequent requests, even when using `MINIMAL` thinking levels. If a required thought signature is not returned when using Gemini 3 models, the model will return a `400` error.

默认思考保留与历史一致性（原文）：

> For Gemini 3.5 Flash and newer models, thoughts from previous turns are preserved by default. The service retains thought history in the conversation context before passing it to the model.
>
> When sending conversation history, be consistent with previous turns: either include the full context (thoughts, function calls, and responses) or omit it entirely. Providing partial context can degrade model performance.

REST 回传规则（原文）：

> - Always send the `thought_signature` back to the model inside its original `Part`.
> - Don't merge a `Part` containing a signature with one that does not. This breaks the positional context of the thought.
> - Don't combine two `Part`s that both contain signatures, because the signature strings cannot be merged.

无签名迁移场景的最后手段（原文）：

> You can set `thought_signature` to `skip_thought_signature_validator`, but, this should be a last resort as it will negatively impact model performance.

Chat Completions 协议下签名随 `tool_calls` 携带的 wire 形态（文档示例节选）：

```json
"tool_calls": [
  {
    "extra_content": {
      "google": {
        "thought_signature": "<SIGNATURE_A>"
      }
    },
    "function": {
      "arguments": "{\"flight\":\"AA100\"}",
      "name": "check_flight"
    },
    "id": "function-call-1",
    "type": "function"
  }
]
```

## ④ 社区线索：单轮 prompt 指定摘要语言（discuss.ai.google.dev）

帖子《Gemini Thinking in Russian: Is there a solution?》原文摘录：

> Has anyone found a way to influence the output of Gemini thinking? For example, to make it output thoughts only in Russian?

回复给出的写法（代码摘录）：

```python
prompt = "What is the sum of the first 50 prime numbers? Generate Answer and Thought summary in Russian"
response = client.models.generate_content(
    model="gemini-2.5-flash-preview-05-20",
    contents=prompt,
    config=types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(
            include_thoughts=True
        )
    )
)
```

该写法需要逐条消息重复声明，针对 `include_thoughts` 的 generateContent 形态；多轮工具调用与长系统提示下的稳定性无公开验证。
