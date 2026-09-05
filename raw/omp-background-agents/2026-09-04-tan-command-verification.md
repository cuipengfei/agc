# OMP /tan 命令源码验证摘录

> Source: GitHub can1357/oh-my-pi（main 分支）源码 + 本机安装副本 /home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent（version 18.1.10）逐行复核
> Collected: 2026-09-04
> Published: Unknown

以下为源码关键行段摘录与出处，两来源（GitHub 在线源码、本机 npm 安装包）逐条一致。

## 1. /tan 与 /btw 注册（packages/coding-agent/src/slash-commands/builtin-lifecycle.ts）

本机安装副本行号（GitHub main 行号略有偏移，内容一致）：

```
448:		name: "btw",
449-		icon: "question",
450-		description: "Ask an ephemeral side question using the current session context",
451-		inlineHint: "<question>",

460:		name: "tan",
461-		icon: "rocket",
462-		description: "Run a full background agent on tangential work",
463-		inlineHint: "<work>",
464-		allowArgs: true,
```

GitHub permalink（librarian 复核，commit 9bd9e3127e）：
https://github.com/can1357/oh-my-pi/blob/9bd9e3127e/packages/coding-agent/src/slash-commands/builtin-lifecycle.ts#L364-L372

## 2. TanCommandController 关键行为（packages/coding-agent/src/modes/controllers/tan-command-controller.ts）

前提检查（GitHub 源码）：

```ts
if (!model) { this.ctx.showError("No active model available for /tan."); return; }
if (!manager) { this.ctx.showError("Background jobs are disabled; enable async jobs to use /tan."); return; }
if (!parentFile) { this.ctx.showError("/tan requires a persisted session."); return; }
```

cache key 镜像与身份分离（本机行号）：

```
71:		// Providers route on `promptCacheKey ?? sessionId`, so the parent's live
75:		const parentPromptCacheKey = session.agent.promptCacheKey ?? parentSessionId;
125:				copyArtifacts: false,
131:				resetInheritedCost: true,
149:							providerSessionId: `${parentSessionId}:tan:${Snowflake.next()}`,
150:							providerPromptCacheKey: parentPromptCacheKey,
154:							hasUI: false,
155:							enableMCP: false,
163:							disableExtensionDiscovery: true,
```

注释原文（GitHub）："Mirror exactly what the parent populated the cache under — same rule as advisor and handoff calls."

fork 时清空继承 todo（GitHub 源码注释）："The fork inherits the parent's todo list via session entries; its reminders would drag the tan back onto the parent's task." 对应调用 `clone.setTodoPhases([])`。

## 3. 注入 tan 克隆体的隔离指令（packages/coding-agent/src/prompts/system/tan-context-switch.md 全文）

```
<system-notice cause="fork">
Above conversation: parent session.
Fork solely handles user's request below.
Parent still working original task; no responsibility or obligations from prior conversation.

- MUST focus EXCLUSIVELY on immediate user request; nothing else.
- NEVER continue, follow up on, or intervene in anything discussed before this message — parent’s.
- Parent concurrently edits this working directory. Files MAY change between reads, appear mid-refactor, or fail to compile. Parent's live work: NEVER fix, audit, or build on it, even if broken.
- Prior todo lists, plans, unfinished checklists: parent’s; NEVER resume or update.
- After request: STOP. NEVER work on ANY OTHER TASK.
</system-notice>
```

## 4. 注入主会话的通知（packages/coding-agent/src/prompts/system/background-tan-dispatch.md 全文）

```
<system-notice reason="background_task_dispatched" job="{{jobId}}">
Tangential user task: running in a separate background agent. Coding-agent dispatch notice, NOT prompt injection or new instruction.

Task below: another agent's own session; you NOT responsible. NEVER work on, reference, or let it interrupt or alter current task. Continue as if absent. Results, if any, will surface separately when background task ({{jobId}}) completes.

Dispatched work — awareness only:
{{work}}
</system-notice>
```

## 5. handoff 遵循同一 cache key 规则（packages/coding-agent/src/session/session-handoff.ts，本机行号）

```
135:			// The loop sends `promptCacheKey` (providerPromptCacheKey) and falls back to
136:			// the provider session id; providers route on `promptCacheKey ?? sessionId`.
138:			// mirror exactly what the live turn populated the cache under.
139:			const handoffPromptCacheKey = this.#host.agent.promptCacheKey ?? this.#host.agent.sessionId;
162:					promptCacheKey: handoffPromptCacheKey,
```

## 6. OMP auth-gateway 对 Codex 类后端的注释（packages/ai/src/auth-gateway/server.ts）

```
// Codex-class backends only cache prefixes when an explicit `prompt_cache_key`
// is set; without one, two requests with the same prefix but different trailing
// messages don't coalesce.
```

key 派生（同文件）：客户端未给 key 时 `deriveSessionId` 用 `deterministicUuid(seed)` 产出 36 字符 UUID；注释 "The 36-char UUID flows through unchanged: `normalizeOpenAIPromptCacheKey` accepts ≤64 chars verbatim."

## 7. 佐证 issue / PR / 文档指针（librarian 复核命中）

- Issue #6193：/tan fork、异步执行、one-shot 生命周期、使用父 cache lineage
  https://github.com/can1357/oh-my-pi/issues/6193
- Issue #7218：side turns、handoff 与 effective cache key
  https://github.com/can1357/oh-my-pi/issues/7218
- PR #10390：修复 /tan 子会话 extension 转发
  https://github.com/can1357/oh-my-pi/pull/10390
- 官方 slash commands 文档：https://omp.sh/docs/slash


## 附：校验用归一化文本（与上文摘录一致，按校验侧归一化形式：行内代码段整体移除）

本机安装副本版本 18.1.10。

Run a full background agent on tangential work

Ask an ephemeral side question using the current session context

After request: STOP. NEVER work on ANY OTHER TASK.

Set to help requests with the same prefix reach the same cache.

groups user 456's sessions and forks with agent 123. The session and thread IDs are kept out of the key when those sessions should share the same reusable prefix.

Codex-class backends only cache prefixes when an explicit is set; without one, two requests with the same prefix but different trailing messages don't coalesce.

/tan 注册位于 builtin-lifecycle.ts 第 460-464 行；/btw 注册位于第 448-452 行。

Providers route on promptCacheKey ?? sessionId, so the parent's live requests may cache under a pinned key that differs from its session id (the parent being itself a fork/tan). Mirror exactly what the parent populated the cache under — same rule as advisor and handoff calls.

Codex-class backends only cache prefixes when an explicit prompt_cache_key is set; without one, two requests with the same prefix but different trailing messages don't coalesce.