# OMP TTSR 判定机制与 question 规则

> Sources: can1357/oh-my-pi 源码（本机 fork 736ce1d99a，2026-10-08 直读）；`docs/ttsr-injection-lifecycle.md` §10；本机 `omp ttsr test` 实测输出
> Raw: [OMP TTSR 判定机制源码取证](../../raw/omp-ttsr/2026-10-08-omp-ttsr-judge-mechanism.md); [TTSR judge 规则同步边界与迁移](../../raw/omp-ttsr/2026-10-08-ttsr-judge-config-migration.md)
> Updated: 2026-10-08

## Overview

TTSR 有两条独立路径：正则/AST 条件匹配（`condition`/`astCondition`，流中命中即中断）与 judge 判定（`question`，输出完成后问 judge）。分流开关是 `Rule.question` 字段是否存在（`packages/coding-agent/src/export/ttsr.ts:745-785`）。带 question 的规则从不参与流匹配——`#matchBuffer`（`ttsr.ts:992-998`）里 `if (entry.question || !this.#canTrigger(name)) continue;` 把它彻底过滤掉。

judge 路径不中断运行。命中的判定被渲染为 `ttsr-warning.md` 模板（`reason="rule_violation"`），走 `deliverAs: "aside"` 送达：运行中合入下一步，空闲时启动一轮。正则命中的 `ttsr-interrupt.md` 走 `agent.abort` + `scheduleAgentContinue`，是硬中断，两者完全分离。

## 判定触发与请求打包

`onAssistantMessageEnd`（`ttsr-coordinator.ts:240-244`）→ `#judgeCompletedMessage`（`:545-559`）。跳过条件：`stopReason` 是 `aborted` 或 `error`——这两个 stop 的 output 从未生效，问了也没意义。

一条 assistant message 被拆成多个 `TtsrOutput`（`ttsr-outputs.ts:135-168`）：

- 所有 text 块合成一条 `text` output
- 所有 thinking 块合成一条 `thinking` output
- 每个 tool call 走 `#toolCallOutputs`：如果 tool 暴露 `matcherEntries`，**每个文件单独产出**（`ttsr-outputs.ts:156-161`）；否则合并为一条（`:163-167`）

每个 output 单独一次 judge 请求（`ttsr-coordinator.ts:564-590`）。请求打包在 `ttsr.ts:85-103` `judgeRules`：

```ts
const questions: Record<string, NoulQuestion> = {};
for (const [index, candidate] of candidates.entries()) {
  questions[`q${index}`] = { type: "noul", instructions: candidate.question };
}
const { answers } = await judge.judge({
  state: { output: output.subject, content: jevPrefix(output.content, JUDGED_CONTENT_MAX_TOKENS) },
  questions,
});
return candidates.filter((_, i) => answers[`q${i}`].noul >= JUDGED_RULE_THRESHOLD).map(c => c.rule);
```

同一个 output 的多个候选问题**共享一次 state 计费**，Jev 只算一次 `state` 的 tokens。`JUDGED_CONTENT_MAX_TOKENS = 32_000`（`ttsr.ts:63`），超出用二分找最长前缀（`jevPrefix` 函数，`ttsr.ts:66-79`），不跨半个 surrogate pair。32000 是 Jev 端 `~33k` 拒收阈值（`max_tokens_exceeded`）以下的安全值。

## 阈值与 claim() 语义

阈值 `JUDGED_RULE_THRESHOLD = 0.7`（`ttsr.ts:57`），`noul >= 0.7` 算违规。

`claim()`（`ttsr.ts:985-989`）是关键的计费边界：

```ts
claim(rules: readonly Rule[]): Rule[] {
  const claimed = rules.filter(rule => this.#canTrigger(rule.name));
  this.markInjected(claimed);
  return claimed;
}
```

**只有被判违规（`noul >= 0.7`）的规则才进入 `claim()` 并被标 injected。NO 判定不消耗 `once` 状态**——`#injectionRecords` 只在 `markInjected` 里被写，而它只在 `claim()` 内部被调用。

推论——请求次数的正确模型：

- 每个通过 pre-filter 的 output 触发一次 judge 请求
- 违规规则的 verdict 被 `claim()` 标 injected，`repeatMode: once` 下本会话不再问
- **NO 判定的候选规则在下一个匹配的 output 上会再次进入候选、再次提问**

**不是**「规则数 × 会话数」或「每规则每会话最多一次」。请求数取决于首次 YES 到达的位置：全 NO 时等于 pre-filter 命中数（NO 判定不 claim、`#canTrigger` 恒为 true、下一个匹配 output 会再提问）；一旦有 YES 触发 `claim()`，该规则标 injected，剩余通过 pre-filter 的 output 因 `#canTrigger` 返回 false 不再进入候选。例：一条规则 pre-filter 命中 20 个 output，前 15 个 NO、第 16 个 YES——请求数 = 16，剩余 4 个不会再问。

前置过滤（`ttsr.ts:948-985` `judgedCandidates`）在请求前先跑一遍：`scope` + `globs` + repeat gate + pre-filter（若同一规则还声明了 `condition`/`astCondition`，用它对 completed content 做 regex/AST 匹配）。pre-filter 命中率直接决定 judge 请求量——弱 pre-filter（宽泛 regex）会让请求数在长会话中显著放大。

## Judge 的可见性边界

`state` 只有两个字段（`ttsr.ts:96`）：`output.subject`（`"reply"`、`"reasoning"`、`` `edit` call on `src/a.ts` `` 等）和 `content`（受 32000 Jev tokens 上限）。

结构性看不到：

- 对话历史、用户消息
- 其他 turn 的产物
- 外部状态（skill 库、文件系统、外部文档索引）

判断题的目标条件如果落在 output 之外，加 `question` 会**结构性误报**。适合加 judge 的目标条件是**「回复/参数自身是否 X」**：X 的字面形式（文件行号、URL、命令输出引用、具体测量值等）都出现在 output 里，可扫描。

## `ttsr.judge` 三值

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

`agent-session.ts:2973-2987` `ruleJudge()`：

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

- `off`：`ruleJudge()` 直接 undefined。`#judgeOutput`（`ttsr-coordinator.ts:570`）在 `if (!judge) return` 处停。`question` 规则永不触发。
- `auto`（默认）：要求 `hasNativeJudge` 为 true（`packages/coding-agent/src/judgment/index.ts:206-209`：`judgeRoleChain` 链首 `kindOf === "native"`，即 TypeSafe jev 这类原生 System One）。链首不是原生时同 `off`。
- `on`：无条件返回。judge 解析到什么模型都用（含普通 chat 模型，走 chat 无 schema 文本解析）。

`question` 规则无论 `ttsr.judge` 取何值都注册到 `#rules`（`ttsr.ts:745-785`），只是 `ruleJudge()` 返回 undefined 时不会调用。

本机配置：`modelRoles.judge: typesafe-zen/jev-1.13` + `ttsr.judge: "on"`——每次判定的实际后端是 `typesafe-zen/jev-1.13`。

## 观测

`purpose: "ttsr"`（`agent-session.ts:2982`）是 judgment 子系统里**唯一**专属于 TTSR 的取值，与 auto-thinking / eval / unexpected-stop / ai-stage / find 分开。`omp usage` 里按 `purpose` 过滤可单独看 TTSR judge 消耗。

失败与超时（`ttsr-coordinator.ts:552-558`、`:232-241`）：

- Judge 抛错：`logger.warn("TTSR judged rule check failed")` 后 `.finally()` 清理 pending set，不重投
- 未决请求：`settleJudgments()` 在 `onBeforeYield` 处 `withTimeout(Promise.all(pending), 5_000)`，超时的请求继续跑，判决到达时仍作为 aside 送达
- 代际切换：`sessionGeneration()` 变化后旧 verdict 丢弃（`:572`）

## CLI 验证边界

`packages/coding-agent/src/cli/ttsr-cli.ts:283-288`：

```ts
// A judged rule's conditions only gate its question; a condition hit is not a violation.
if (rule.question !== undefined) return false;
```

`omp ttsr test` 对带 `question` 的规则**直接过滤、不调 judge**。输出只显示问题文本：`:493-494` `question (judged at runtime, not tested): <question text>`。

CLI 能验证的：YAML 解析成功、`condition` regex 是否命中（对带 question 的规则此检查跳过）。**不能验证**：judge 是否会判对、阈值 0.7 是否合适、`condition` 作为 pre-filter 的命中率。

要验证 question 规则是否 work，必须在真实会话中观察 `omp usage` 里 `purpose=ttsr` 的请求数与命中情况，或读 session JSONL 里的 `ttsr_triggered` 事件。

## 规则文件发现路径与同步边界

OMP 发现 TTSR 规则的路径来自 `packages/coding-agent/src/discovery/builtin.ts:58-74` `getConfigDirs`：同时读 project（`ctx.cwd/.omp`）和 user（`ctx.agentDir ?? getAgentDir()`，默认 `~/.omp/agent`）两个目录的 `<dir>/rules/*.md|*.mdc`（`builtin.ts:393-395`）。但 `TtsrManager.addRule()` 对已存在的规则名直接返回 false（`ttsr.ts:749-750`），同名规则**不会同时注册**——先加载到的那份胜出，遍历顺序未查证。

agc 仓库 `manifest.json` 只有一条 rule 同步条目 `omp-rules`：`~/.omp/agent/rules` → `omp/agent/rules`。`.omp/rules/` 不在任何 manifest 条目的 `source` 或 `repo` 里。

推论：

- 加规则到 `.omp/rules/` 只在单一仓库生效，`./pull.sh` 不会同步到 `~/.omp/agent/rules/`
- 加规则到 `~/.omp/agent/rules/` 后 `./pull.sh` 会同步到 `omp/agent/rules/`，纳入版本化
- 把 `.omp/rules/` 下的规则删掉、再放到 `~/.omp/agent/rules/`，pull 会自动走 git rename 路径（`git status` 显示 `renamed:`）

本机 `verify-before-mechanism-claims` 是本机第一条带 `question` 的规则，走的是上述「项目级 → 用户级」的迁移路径，见 commit `bb2dcc7`。

## 加 question 的评估方法

判断一条 TTSR 规则是否适合加 `question`，看目标条件是否**在 output 自身可判**：

| 目标条件的信息位置 | 适合加 question？ |
|---|---|
| output 的正文里可扫描的字面形式（证据、URL、行号、具体测量值） | 适合 |
| tool call 的参数本身（`tool:edit` 的 arguments、`tool:bash` 的 command） | 适合，judge 直接看 args |
| 需要 output 之外的上下文（用户是否授权、之前是否查过文档、skill 库当前状态） | 不适合，结构性误报 |
| regex 已精确断言的（比如 AST 命中特定语法构造） | 不适合，无增量 |

## 已知成本风险

`verify-before-mechanism-claims` 是本机第一条带 question 的规则。它的 regex 抓「绝对化措词 + 机制名词」（"一定/必然/永远/肯定/…/就是" 与 "源码/配置/机制/实现/行为/加载/默认/provider/模型/规则" 共现），在正常中文技术讨论里命中率不低。每次 NO 判定都会重新提问，直到 YES 才 claim。长会话下 `purpose=ttsr` 请求数上限**未实测**，需要观察几轮实际会话后按 `omp usage` 数据决定该规则是否值得保留。

judge 的 aside warning 模板明确要求 agent 遇到 false positive 时继续，不会打断当前 turn——误报的代价是多一次 LLM 调用（agent 读到 warning 后要自查），不是打断。

## 相关

- [OMP TTSR 与 /omfg](ttsr-and-omfg.md) — TTSR 的配置、正则/AST 匹配路径、/omfg 规则生成
- [OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界](../omp/judgment-provider-and-eval-judge.md) — 判断子系统整体架构，TTSR 是其中一个消费方
- [OMP judgment /v1/systemone 协议面](../omp/judgment-systemone-protocol.md) — Jev 端 wire 协议、题型 schema
- [OMP judge 角色链解析](../omp/judge-role-chain-and-jev-latest-400.md) — `hasNativeJudge` 与 `modelRoles.judge` 链首
- [TTSR keep vs discard](keep-vs-discard.md) — 正则命中后的上下文处置，与 judge 的 aside 投递不同通道
- [OMP Extension 与 TTSR 分层防护](extension-and-ttsr-layering.md) — TTSR 与 schema 校验的分层边界
