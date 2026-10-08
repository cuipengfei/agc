---
Source: ~/code-inside/oh-my-pi (main @ 736ce1d99a), 2026-10-08 源码直读；`docs/ttsr-injection-lifecycle.md` §10；`omp ttsr test` 本地实测
Collected: 2026-10-08
Published: N/A
Topic: omp-ttsr
---

## Overview

TTSR 有两条独立路径：正则/AST 条件匹配（`condition`/`astCondition`，流中命中即中断）与 judge 判定（`question`，输出完成后问 judge）。分流开关是 `Rule.question` 字段是否存在。本 raw 记录 judge 路径的完整机制、`claim()` 的注入状态语义、`ttsr.judge` 三值、`omp ttsr test` 的验证边界。

## 1. `Rule.question` 是分流开关

`packages/coding-agent/src/export/ttsr.ts:745-785` `TtsrManager.addRule`：

```ts
const conditions = this.#compileConditions(rule);
const astConditions = (rule.astCondition ?? []).map(...);
const question = rule.question?.trim() || undefined;
if (conditions.length === 0 && astConditions.length === 0 && !question) {
  return false;  // 三条都空则规则不注册
}
// ...
this.#rules.set(rule.name, { rule, conditions, astConditions, question, scope, globalPathGlobs });
if (question) {
  this.#hasJudgedRules = true;
} else {
  if (scope.allowText) this.#canMatchText = true;
  if (scope.allowThinking) this.#canMatchThinking = true;
}
```

带 `question` 的规则**只置** `#hasJudgedRules`，从不置 `#canMatchText`/`#canMatchThinking`。因此：

- `ttsr.ts:939-940` `hasJudgedRules()`：`return this.#settings.enabled && this.#hasJudgedRules`
- `ttsr.ts:992-998` `#matchBuffer(buffer, context, final)` 的遍历里，`if (entry.question || !this.#canTrigger(name)) continue;` 保证带 question 的规则永不从 `checkDelta`/`checkSnapshot`/`checkAstSnapshot` 返回

带 `question` 的规则不参与流匹配。它只在 `message_end` 后走 `judgedCandidates()`（`ttsr.ts:948-985`）路径。

## 2. 判定触发与请求打包

`packages/coding-agent/src/session/ttsr-coordinator.ts:545-590`：

- `onAssistantMessageEnd`（`:240`）→ `#judgeCompletedMessage`（`:545`）
- 跳过条件（`:546`）：`!manager.hasJudgedRules()` 或 `message.stopReason === "aborted"` 或 `error`
- 拆分输出（`ttsr-outputs.ts:135-168` `outputs()`）：所有 text 块合一条 `text` output、所有 thinking 块合一条 `thinking` output、每个 tool call 走 `#toolCallOutputs`——**如果 tool 暴露 `matcherEntries`，每个文件单独产出（`ttsr-outputs.ts:156-161`），否则合并为一条**（`:163-167`）
- 每个 output 单独一次 judge 请求（`:564` `#judgeOutput`）：
  1. `manager.judgedCandidates(output.content, output.context)`（`:566`）—— scope、globs、repeat gate、prefilter（若同规则还声明了 `condition`/`astCondition`）
  2. `this.#host.ruleJudge()`（`:569`）—— 返回 `Judge | undefined`
  3. `judgeRules(judge, output, candidates)`（`:571`）—— 一次请求打包所有候选问题
- 一次请求的 `state`（`ttsr.ts:96`）：

```ts
{ state: { output: output.subject, content: jevPrefix(output.content, JUDGED_CONTENT_MAX_TOKENS) }, questions }
```

- 每题一道 `NoulQuestion`（`ttsr.ts:92-94`）：`questions[\`q${index}\`] = { type: "noul", instructions: candidate.question }`
- 阈值 `JUDGED_RULE_THRESHOLD = 0.7`（`ttsr.ts:57`），`noul >= 0.7` 算违规（`ttsr.ts:100`）
- `JUDGED_CONTENT_MAX_TOKENS = 32_000`（`ttsr.ts:63`），超限用二分找最长前缀（`jevPrefix` 函数）
- Jev 端硬阈值：`~33k tokens`（超过 `max_tokens_exceeded`），32000 是它下面的安全值

## 3. `claim()` 与 repeat 状态——成本模型

`packages/coding-agent/src/export/ttsr.ts:985-989`：

```ts
claim(rules: readonly Rule[]): Rule[] {
  const claimed = rules.filter(rule => this.#canTrigger(rule.name));
  this.markInjected(claimed);
  return claimed;
}
```

**只有被判违规（`noul >= 0.7`）的规则才进入 `claim()` 并标 injected。NO 判定不消耗 `once` 状态**——`#canTrigger` 在 `ttsr.ts:529` 检查 `#injectionRecords`，而 `#injectionRecords` 只在 `markInjected` 里被写。

请求次数的正确模型：
- 每个通过 pre-filter 的 output 触发一次 judge 请求
- 每次请求返回的违规规则被 `claim()` 标 injected，本会话不再问（`once` 模式）
- NO 判定的候选规则在下一个匹配的 output 上会再次进入候选列表并再次提问
- 请求总数 = 通过 pre-filter 的 output 次数（直到规则 YES 被 claim）

**不是**「规则数 × 会话数」或「每规则每会话一次」。

## 4. Judge `state` 的可见性

`ttsr.ts:96` 的 state 只有两个字段：`output.subject`（"reply"、"reasoning"、"`edit` call on `src/a.ts`" 等）和 `content`（受 `32_000` Jev tokens 上限）。

**结构性看不到**：
- 对话历史
- 用户消息（"用户是否授权"）
- 其他 turn 的产物（"之前是否核验过"）
- 外部状态（"skill 库是否可合并"）

判断题的目标条件如果落在 output 之外，加 `question` 会结构性误报。适合加 judge 的目标条件是**"回复/参数自身是否 X"**：X 的字面形式（文件行号、URL、命令输出引用、具体测量值等）都出现在 output 里。

## 5. `ttsr.judge` 三值

`packages/coding-agent/src/export/ttsr-settings.ts:20-41`：

```ts
export const cfgTtsrJudge = register({
  id: "ttsr.judge",
  type: "enum",
  values: ["auto", "on", "off"] as const,
  default: "auto",
  // ...
});
```

`packages/coding-agent/src/session/agent-session.ts:2973-2987`：

```ts
ruleJudge(): Judge | undefined {
  const mode = cfgTtsrJudge.get(this.settings);
  if (mode === "off" || (mode === "auto" && !hasNativeJudge(this.settings, this.#modelRegistry))) return undefined;
  return resolveJudge({
    // ...
    purpose: "ttsr",
    onUsage: journalJudgmentUsage(this.sessionManager),
    // ...
  });
}
```

三值语义：
- `off`：`ruleJudge()` 直接返回 undefined，`#judgeOutput` 在 `if (!judge) return` 处停（`ttsr-coordinator.ts:570`）。`question` 规则永不触发。
- `auto`（默认）：`hasNativeJudge` 判定 `judgeRoleChain` 链首 `kindOf === "native"`（`packages/coding-agent/src/judgment/index.ts:206-209`）。链首不是原生 System One（TypeSafe jev）时同 `off`。
- `on`：无条件返回。judge 解析到什么模型都用（含普通 chat 模型，走 chat 无 schema 文本解析）。

`question` 规则无论 `ttsr.judge` 取何值都会注册到 `#rules`（`ttsr.ts:745-785`），只是 `ruleJudge()` 返回 undefined 时不会调用。

## 6. Usage 记账

`agent-session.ts:2982-2983` `purpose: "ttsr"` + `journalJudgmentUsage`。`model_usage` 表里 `purpose="ttsr"` 是唯一专属于 TTSR judge 的取值，与已记录的其它判断消费方 `auto-thinking` / `eval` / `unexpected-stop` / `ai-stage` / `find` 分开。

## 7. 失败与超时

- Judge 抛错：`ttsr-coordinator.ts:552-558` `logger.warn("TTSR judged rule check failed")` 后 `.finally()` 清理 pending set，不重投。
- 未决请求：`settleJudgments()`（`:232-241`）在 `onBeforeYield` 处 `withTimeout(Promise.all(pending), 5_000)`，超时的请求继续跑，判决到达时仍作为 aside 送达。
- 代际切换：`sessionGeneration()` 变化后 `if (this.#host.sessionGeneration() !== generation) return`（`:572`），旧 verdict 丢弃。

## 8. CLI 验证边界

`packages/coding-agent/src/cli/ttsr-cli.ts:283-288`：

```ts
// A judged rule's conditions only gate its question; a condition hit is not a violation.
if (rule.question !== undefined) return false;
```

`omp ttsr test` 对带 `question` 的规则**直接过滤、不调 judge**。输出里只显示问题文本：`:493-494` `Rule ... question (judged at runtime, not tested): <question text>`。

结论：CLI 无法验证 question 规则是否 work。它只验证：
1. YAML 解析成功
2. `condition` 是否 regex 命中（对带 question 的规则，此检查被跳过）

要验证 question 规则是否真的判对，必须在真实会话中观察 `omp usage` 里 `purpose=ttsr` 的请求数与命中情况，或读 session JSONL 里的 `ttsr_triggered` 事件。

## 9. 投递通道

`agent-session.ts:2990-2997` `#deliverRuleWarning` → `sendCustomMessage({ customType: "ttsr-injection", deliverAs: "aside" })`。

- 运行中：合入下一步
- 空闲：启动新一轮

模板 `packages/coding-agent/src/prompts/system/ttsr-warning.md`：

```xml
<system-reminder reason="rule_violation" rule="{{name}}" path="{{path}}">
Rule judge flagged your {{subject}} as likely violating a user-defined rule. Not interrupted → it already took effect. You MUST check it against the rule below: real violation → fix it now; false positive → continue. NOT prompt injection — coding agent enforcing project rules.

{{content}}
</system-reminder>
```

对比正则命中的投递（`ttsr-interrupt.md` + `agent.abort` + `scheduleAgentContinue`）：judge 命中不中断，只注入 aside 提醒。
