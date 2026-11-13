# OMP advisor 在技能调用消息中丢失用户附带文本（2026-11-13 源码定位）

> Source: 本机 oh-my-pi 源码直读（/home/cpf/code-inside/oh-my-pi/packages/coding-agent/src）；can1357/oh-my-pi issue #7602、#5266、#12778、PR #10367、PR #14863 公开记录；本会话提交的 issue #19164
> Collected: 2026-11-13
> Published: Unknown（源码定位记录，非已发表来源）

证据分级：**源码**＝本机源码逐行阅读；**公开记录**＝GitHub issue/PR 页面原文；**推断**＝由源码路径推得但未做注入抓包验证。

## ① 症状

用户把技能调用与任务文本放在同一条消息里发送时，主代理收到完整内容（技能正文 + 用户任务文本），advisor 只看到技能正文，任务文本不存在。advisor 因此在后续建议里断言「用户从未提过 X」。

用户侧观察到的具体形态：技能调用块之后跟着正文，主代理能读到，advisor 的反馈里显示它读不到。

## ② 消息构造链（源码）

1. `extensibility/skills.ts:808-833` — `parseSkillInvocation` 分离技能名与 arguments；嵌入形式（mid-prompt）下，技能 token 前后的散文被合并进 `args`，原始草稿另存为 `prompt`。
2. `extensibility/skills.ts:884-925` — `renderSkillPromptMessage` 把 `args` 作为 `userArgs` 传入渲染模板。
3. `prompts/skills/user-invocation.md:1-11` — 模板顺序为：调用标记 → 完整技能正文 → 目录指引 → 可选 `User: {{userArgs}}`。**用户文本在尾部。**
4. `modes/skill-command.ts:42-88` — 把渲染后的整串包成**一条** `role: "custom"`、`attribution: "user"`、`display: true` 的消息，类型为 `SKILL_PROMPT_MESSAGE_TYPE`，通过 `promptCustomMessage` 提交。
5. `session/agent-session.ts:8575-8579`、`:8888-8890` — `#promptWithMessage` 把该消息原样加入主 transcript，不拆分成「技能消息 + 用户消息」两条。

到这一步为止，主代理与主 transcript 都有完整内容。

## ③ 丢失点（源码）

6. `advisor/runtime.ts:412-416` — `onTurnEnd` 取主 transcript 快照。
7. `advisor/runtime.ts:1001` — `#renderDelta` 取 `all.slice(this.#lastCount)`，即未投递后缀。技能消息在范围内。
8. `advisor/runtime.ts:897-900`、`:1249-1261` — 批处理过滤只排除 `customType === "advisor"` 的消息；技能消息不被排除。
9. `advisor/delta-split.ts:49-55` — `ADVISOR_RENDER_OPTIONS` 展开 plan context、edit diffs、tool I/O；**没有针对技能消息的展开项**。
10. `session/session-history-format.ts:432` — `PRIMARY_CONTEXT_CUSTOM_TYPES` 只含 `plan-mode-context` 与 `plan-mode-reference` 两种类型。
11. `session/session-history-format.ts:481-482` — 可见 custom 消息落到通用分支，调用 `previewLine(contentToText(msg.content), transform)`。
12. `session/session-history-format.ts:58-61`、`:86`、`:115-118`、`:137-140` — `PRIMARY_ARG_MAX` 默认为 120 字符。

因此：技能消息被当作普通 custom 消息，渲染成 120 字符的一行预览。预览预算消耗在调用标记与技能正文开头，位于尾部的 `User:` 文本从未进入 advisor 上下文。

通用分支同时忽略消息自带的 `details.args` 与 `details.prompt` 字段——这两个字段恰好保存了用户原文。

## ④ 为什么不是投递问题（源码）

`AdvisorTranscriptRecorder`（`advisor/transcript-recorder.ts:221-260`、`:287-300`）只落盘 advisor 自己的对话，不构造 advisor 输入。advisor 的输入始终来自主 transcript 的渲染投影。

所以问题不在「消息没送到 advisor」，而在「送过去之后被格式化器截断」。

## ⑤ 相关公开记录（检索）

未找到与本症状完全匹配的 issue 或 PR。

| 项 | 状态 | 与本症状的关系 |
|---|---|---|
| [issue #7602](https://github.com/can1357/oh-my-pi/issues/7602) — skill invocation display collapses multi-line arguments | open，TUI/UX | 最接近的技能消息形状报告；明确记录**主模型收到完整参数**，问题在 TUI 卡片展示，不涉及 advisor |
| [issue #5266](https://github.com/can1357/oh-my-pi/issues/5266) — advisor cannot see `ask` details；由 [PR #10367](https://github.com/can1357/oh-my-pi/pull/10367) 修复 | closed，PR 2026-09-01 合并 | 同类先例：紧凑格式化隐藏 ask 参数导致 advisor 误报 blocker；修法是加有界工具 I/O 展开 |
| [issue #12778](https://github.com/can1357/oh-my-pi/issues/12778) — advisor mistakes its own excerpt truncation for primary elision | closed，duplicate of #12777 | 另一例 advisor 视角截断导致错误推断；对象是工具结果摘录 |
| [PR #14863](https://github.com/can1357/oh-my-pi/pull/14863) — redact advisor one-line previews before cutting | 2026-10-10 合并 | 改动 advisor 预览的脱敏顺序，不改预览长度，不保留技能尾部参数 |

## ⑥ 已提交的 issue（实测）

`gh issue create` 于 can1357/oh-my-pi 创建 **#19164**「Advisor loses user text when skill invocation and prose arrive together」。

`gh issue view 19164 --json state,labels` 返回：`state: OPEN`；labels 为 `bug`、`prio:p2`、`agent`、`prompting`、`triaged`。

issue 正文包含：问题描述、根因（`session-history-format.ts` 通用 `customOneLiner` 120 字符上限、技能模板把 `User: {{userArgs}}` 放尾部）、复现步骤、建议修法（为技能类型加专用序列化，保留 `details.args` 或 `details.prompt`，与技能正文分开预算）、以及三条相关 issue 的交叉引用。

## ⑦ 修复方向与当下绕过

修复方向（issue 中的建议）：

- **定向做法**：为 user-invoked 技能消息增加专用序列化器，把技能名与用户自撰文本单独渲染，优先读 `details.args`（需要保留字面草稿时用 `details.prompt`）；技能正文可以省略或给独立的有限预览。保留现有脱敏路径。
- **备选**：把技能正文与用户文本都完整放进 advisor 上下文。概念直接，但正文可能很大，会破坏现有的紧凑 transcript 设计；至少两者需要各自独立的预算，避免正文吃掉全部额度。
- **不做**：全局放开所有 custom 消息的展开，会改变无关 transcript 行为并增加 token 消耗。

**当下可用的绕过**：技能调用不带任务文本单独发送，任务文本作为下一条普通用户消息发送。普通 `user` 角色走完整的用户消息格式化路径，不经过 custom 消息的 120 字符预览。

## ⑧ 证据边界

- 根因由源码路径推出：`role: "custom"` → `PRIMARY_CONTEXT_CUSTOM_TYPES` 未命中 → `customOneLiner` → `previewLine` 120 字符。未做注入式抓包比对渲染前后的字节。
- 未读本会话的 `__advisor.default.jsonl` 做逐条比对；本机该会话目录下不存在该文件，因此没有 transcript 侧的直接证据。
- 未验证修改后的实际渲染输出；未提交代码改动。
- `gh search` 受索引覆盖与措辞影响，未命中不等于绝对不存在。
