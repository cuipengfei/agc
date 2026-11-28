# Gemini Copilot Chat 四标记策略的实现与官方边界

> Source: copilot-api 提交 6945dda1、规格文件 `.scratch/gemini-copilot-cache-breakpoints/spec.md`、`src/services/copilot/context-cache.ts`；microsoft/vscode `cacheBreakpoints.ts`
> Collected: 2026-11-28
> Published: Unknown

## 一、规格里的判定与预算

规格以模型 metadata 为 Gemini 判定依据：按请求解析后的 `payload.model` 在模型列表中精确查找，以 `capabilities.family` 匹配大小写不敏感的 Gemini family 规则。规格原文：

> 模型 ID 中含 `gemini` 或存在别名，不能单独作为启用依据。

总预算是 4 个消息级 `copilot_cache_control` 标记。规格原文：

> helper 只读现有 `messages` 顺序、role、内容资格、`tool_calls` 和已有标记来选择目标；唯一允许的写入是在选中的消息上补充缺失的 `copilot_cache_control`。

> 输入已有标记超过 4 个时全部保留且不再新增。相同请求或序列化重放再次经过 helper 时不增加标记。

内容资格沿用本机既有 helper：非空字符串或非空 content 数组；空字符串、`null`、空数组不可新增。

规格要求 Messages→Chat 在第一次应用前确定策略：

> Messages→Chat 必须在第一次 helper 应用前确定 Gemini 策略，不得先按非 Gemini 旧规则加标再由 service 修补。非 Gemini 的 Messages→Chat 仍沿用现行 2+1 规则。

## 二、实现源码摘录

`src/services/copilot/context-cache.ts`：

```ts
const GEMINI_MODEL_FAMILY = /^gemini(?:-|$)/iu
const GEMINI_CACHE_MARKER_LIMIT = 4

type CopilotContextCacheStrategy = "gemini" | "legacy"

export const isCopilotGeminiModel = (modelId: string): boolean => {
  const model = state.models?.data.find((model) => model.id === modelId)
  return (
    model !== undefined && GEMINI_MODEL_FAMILY.test(model.capabilities.family)
  )
}

export const applyCopilotContextCache = (
  payload: ChatCompletionsPayload,
  strategy: CopilotContextCacheStrategy,
): void => {
  const { messages } = payload
  if (strategy === "legacy") {
    let systemMarkers = 0
    let lastNonSystem: Message | undefined
    for (const message of messages) {
      if (!isCopilotContextCacheEligible(message)) continue
      if (message.role !== "system") {
        lastNonSystem = message
      } else if (systemMarkers < 2) {
        message.copilot_cache_control ??= { type: "ephemeral" }
        systemMarkers++
      }
    }
    if (lastNonSystem) {
      lastNonSystem.copilot_cache_control ??= { type: "ephemeral" }
    }
    return
  }

  let remaining = GEMINI_CACHE_MARKER_LIMIT
  for (const message of messages) {
    if (message.copilot_cache_control !== undefined) remaining--
  }
  if (remaining <= 0) return

  let isBelowCurrentUser = true
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    const isCurrentUser = isBelowCurrentUser && message.role === "user"
    const isLastToolResult =
      isBelowCurrentUser
      && message.role === "tool"
      && messages[index + 1]?.role !== "tool"
    if (message.role === "user") isBelowCurrentUser = false
    const isAssistantWithoutTools =
      message.role === "assistant" && !message.tool_calls?.length
    if (
      (isCurrentUser || isLastToolResult || isAssistantWithoutTools)
      && message.copilot_cache_control === undefined
      && isCopilotContextCacheEligible(message)
    ) {
      message.copilot_cache_control = { type: "ephemeral" }
      remaining--
      if (remaining === 0) return
    }
  }

  for (const message of messages) {
    if (message.role !== "system" && message.role !== "user") break
    if (
      message.copilot_cache_control !== undefined
      || !isCopilotContextCacheEligible(message)
    )
      continue
    message.copilot_cache_control = { type: "ephemeral" }
    remaining--
    if (remaining === 0) return
  }
}

const isCopilotContextCacheEligible = (message: Message): boolean => {
  if (typeof message.content === "string") {
    return message.content.length > 0
  }

  return Array.isArray(message.content) && message.content.length > 0
}
```

两个调用方分别传入策略：`src/routes/messages/api-flows.ts` 在 Messages→Chat 首次应用时按模型判定传入 `"gemini"` 或 `"legacy"`；`src/services/copilot/create-chat-completions.ts` 对 Gemini 传 `"gemini"`。

## 三、提交与验证

```
6945dda1 feat: align Gemini Copilot chat cache markers
 docs/local-features.md                          |  12 +-
 src/routes/messages/api-flows.ts                |  10 +-
 src/services/copilot/context-cache.ts           |  98 ++++--
 src/services/copilot/create-chat-completions.ts |  17 +-
 tests/copilot-context-cache-local-http.test.ts  | 377 ++++++++++++++++++----
 tests/copilot-context-cache.test.ts             | 408 +++++++++++++++++++++++-
 tests/create-chat-completions.test.ts           | 304 +++++++++++++++++-
 7 files changed, 1112 insertions(+), 114 deletions(-)
```

提交前的验证：12 个相关测试文件，497 项通过、0 项失败，2807 次断言；`bun run typecheck` 与改动文件的 lint 通过；helper 行覆盖率 100%。

## 四、官方实现的两处边界

`extensions/copilot/src/extension/intents/node/cacheBreakpoints.ts`（commit `2627b28b85b730e82b0121f013aca1e3f78d8d38`，与本地 `.vendor/vscode` 内容一致）：

```ts
	let count = MaxCacheBreakpoints - countCacheBreakpoints(messages);
	let isBelowCurrentUserMessage = true;
	const reversedMsgs = [...messages].reverse();
	for (const [idx, msg] of reversedMsgs.entries()) {
		const prevMsg = reversedMsgs.at(idx - 1);
		const hasCacheBreakpoint = msg.content.some(part => part.type === Raw.ChatCompletionContentPartKind.CacheBreakpoint);
		if (hasCacheBreakpoint) {
			continue;
		}

		const isLastToolResultInRound = msg.role === Raw.ChatRole.Tool && prevMsg?.role !== Raw.ChatRole.Tool;
		const isAsstMsgWithNoTools = msg.role === Raw.ChatRole.Assistant && !msg.toolCalls?.length;
		if ((isBelowCurrentUserMessage && (isLastToolResultInRound || msg.role === Raw.ChatRole.User) || isAsstMsgWithNoTools) && supportsCacheBreakpoint(msg)) {
			count--;
			msg.content.push({
				type: Raw.ChatCompletionContentPartKind.CacheBreakpoint,
				cacheType: CacheType
			});

			if (count <= 0) {
				break;
			}
		}

		if (msg.role === Raw.ChatRole.User) {
			isBelowCurrentUserMessage = false;
		}
	}
```

第一处：`if (hasCacheBreakpoint) { continue; }` 在 `if (msg.role === Raw.ChatRole.User) { isBelowCurrentUserMessage = false; }` 之前。最新 user 已经带标记时被跳过，标志位不会置为 false，更早的 user 与 tool 结果仍在“当前 user 下方”的候选范围内。本机实现把“是否越过当前 user”与“是否已有标记”分开判断，重放不会把历史消息当成当前 user。

第二处：逆扫循环入口没有 `count <= 0` 检查，只在新增后检查。输入已有 4 个标记时 `count` 从 0 开始，命中第一个候选后仍会补上第 5 个。本机实现在进入逆扫前 `if (remaining <= 0) return`。

两处都与官方一致的部分：候选集合（当前 user、当前 user 下方每个连续 tool 批次在原始顺序中的最后一条、所有位置不带非空 `tool_calls` 的 assistant）、已有标记计入预算、前缀补位遇到其他 role 即停止、预算耗尽立即停止。
