---
source-url: https://github.com/code-yeongyu/oh-my-openagent/blob/dev/packages/omo-opencode/src/hooks/ralph-loop/constants.ts, https://github.com/code-yeongyu/oh-my-openagent/blob/dev/packages/omo-opencode/src/hooks/ralph-loop/completion-promise-detector.ts, https://github.com/code-yeongyu/oh-my-openagent/blob/dev/packages/omo-codex/plugin/components/rules/bundled-rules/hephaestus/gpt-5.6.md, https://github.com/code-yeongyu/oh-my-openagent/blob/dev/packages/omo-senpi/src/components/task/dag-lint.ts, https://github.com/code-yeongyu/oh-my-openagent/blob/dev/packages/omo-codex/plugin/components/lazycodex-executor-verify/src/codex-hook.ts
collected: 2026-10-09
published: Unknown
---

# OmO 停止条件与意图检测机制（三层）

2026-10-09 在线调查 `code-yeongyu/oh-my-openagent`（OmO）dev 分支。以下为已直接核实原文的摘录；DeepWiki 线索为 worker 转述，单独标注。

## 代码层：完成判定 = `<promise>` 标签正则，无自然语言语义解析

`packages/omo-opencode/src/hooks/ralph-loop/constants.ts`（raw 直读）：

```ts
export const COMPLETION_TAG_PATTERN = /<promise>(.*?)<\/promise>/is
export const DEFAULT_COMPLETION_PROMISE = "DONE"
export const ULTRAWORK_VERIFICATION_PROMISE = "VERIFIED"
```

`completion-promise-detector.ts` 用 `buildPromisePattern` 构造 `/<promise>\s*DONE\s*<\/promise>/is` 纯正则匹配，只查 assistant 的 text 部件；`tool_result` 里的 `<promise>` 只有 promise=VERIFIED 且经 `isOracleVerified` 确认才行。

负例测试 `completion-promise-session-negative.test.ts`，describe 块名 "#given natural language completion text without explicit promise"，断言 assistant 说 "The task is complete. All work has been finished." 时 `detected === false`。

## 代码层：子代理会话状态机

`packages/omo-opencode/src/tools/delegate-task/sync-session-poller.ts` 的 `pollSyncSession` 循环停止条件依次是：终态错误 → `!isActive && isSessionComplete(messages)` → 300 轮熔断（`DEFAULT_MAX_ASSISTANT_TURNS = 300`）→ 无 finish 但有非空文本的 fallback → 超时。`isSessionComplete` 是纯结构判定：最后 assistant 消息带 finish 原因且不在 tool-calls/unknown、无 pending tool 部件。注释原文："a busy child whose last assistant turn merely looks finished is still working"。

## 提示词纪律层：Hephaestus intent line（无代码解析）

grep.app 全仓搜 `I detect`，所有命中都在 agent prompt 模板字符串里（`packages/omo-opencode/src/agents/` 下 sisyphus、hephaestus 各模型变体），没有任何 hook/verifier/planner 读取 assistant 输出中的 "I detect" 或 "I'll stop right away when" 做路由或停机判定。

`packages/omo-codex/plugin/components/rules/bundled-rules/hephaestus/gpt-5.5.md`：

> "I detect [intent type] - [reason]. [What I'm doing now]."

只承诺本轮做完，无停止条件、无 Stop Goal 章节（只有 Success Criteria and Stop Rules）。

`gpt-5.6.md`（用户引用的原文）：

> "I detect [intent type] - [reason]. [What I'm doing now]. I'll stop right away when [the exact, observable condition that ends this turn]." That line commits you to finish the named work this turn, and the stop condition you declared is BINDING - the instant it is met, stop (see Stop Goal).

新增 `# Stop Goal` 四条件："STOPPING IS MANDATORY AND IMMEDIATE - not a judgment call"；"**Every action past the stop goal is a defect, not diligence.**"

`gpt-6.md`：改名 `## Intent Gate`："I read this as [intent] - [plan]. I'll stop right away when …"；停止条件浓缩成一段，同样宣称 stop 后补做都是 defect；新增 mid-task 规则——中途来的消息只是转向当前任务，不重新声明路由行。

## 提示词纪律层：Sisyphus 的弱绑定（对比）

`packages/omo-opencode/src/agents/sisyphus-dynamic-prompt-role.ts:42`：

> "Verbalization does **NOT** commit to implementation - only the user's explicit request does that"

Sisyphus（编排者）的 "I detect" 只是路由透明；Hephaestus（执行者）的意图行被定义为有约束力的承诺。措辞相似，性质不同，两边都不被代码解析。

## 门控层：STOP WHEN 存在性 lint（弱，warning 不拦截）

`packages/omo-senpi/src/components/task/dag-lint.ts`（raw 直读）：

```ts
const TASK_MARKER = /TASK:/
const STOP_MARKER = /STOP WHEN/
```

mass-ulw 的 DAG 节点提示词协议是 TASK / DELIVERABLE / SCOPE / VERIFY / STOP WHEN 五字段。lint 检查每个节点有没有 `TASK:` 和 `STOP WHEN`，缺了只出 warning 不拒绝执行（注释 "Warnings never reject"）。这是本会话检索到的代码中唯一用正则解析 "STOP WHEN" 的地方，且只查"有没有"。

## 门控层：EVIDENCE_RECORDED 收据门（强，block 打回）

`packages/omo-codex/plugin/components/lazycodex-executor-verify/src/codex-hook.ts`（raw 直读）。Codex 的 `SubagentStop` 事件触发，只门控 lazycodex-worker-low/medium/high 三个执行者：

- 从子代理最后一条 assistant 消息用 `/EVIDENCE_RECORDED:\s*(\S+)/` 提取证据文件路径
- 校验链：路径必须在 `<cwd>/.omo/evidence/` 内（resolve + realpath 双重防目录穿越、拒符号链接）→ 必须是常规文件 → trim 后 ≥40 字符（否则当 placeholder）→ mtime 不早于 transcript 创建时间（否则当 stale）
- 失败返回 `decision: block` 并附 directive.md 渲染的催办说明，把子代理打回去；每会话最多 3 次尝试，超限放行（逃生舱）；transcript 里出现 7 个上下文压力标记之一（context compacted 等）直接放行，防死循环

配套 `directive.md` 原文（韩语）开头："你刚才声称完成了工作，那是谎话。这是第 N 次声称完成。在证据被记录之前，你的完成报告不被信任。"

## 终审层：lazycodex-gate-reviewer（只读，默认怀疑）

`lazycodex-gate-reviewer.toml`：输入含 original brief / goal / success criteria / executor evidence / code review / manual QA matrix，判据 "APPROVE unless you can cite a specific success criterion the artifact fails"；角色描述 "Assume every success claim is unverified until you reproduce it from the artifacts"。属提示词纪律层，靠模型判断。

## 机制要防的四个问题（规则文本中的动机）

- 防过度执行："No extra validation loop, no re-polish, no bonus refactor, no drive-by cleanup"
- 防子代理漂过目标："A spawn missing any label is a defect: **the child wanders past its goal, overworks, or reports 'done' you cannot verify.**"
- 防不可验证的完成声明："Judge a child by its returned EVIDENCE against its STOP WHEN, **never by its self-report**"
- 防半成品交差（对称问题）：Stop Goal 要求 no partial delivery + 手工 QA Gate 本轮通过

## 证据边界

- 已直读原文：constants.ts、completion-promise-detector.ts、negative 测试、sync-session-poller.ts、dag-lint.ts、codex-hook.ts、gpt-5.5/5.6/6.md、sisyphus-dynamic-prompt-role.ts、gate-reviewer.toml。
- DeepWiki 线索（worker 转述，未直读页面）：指出核心文件位置与"无自然语言停止信号识别"的方向性结论，与直读结果一致。
- grep.app 检索结论限定为"检索到的结果"：该工具每次只返回前 10 项，不构成穷尽证明。
