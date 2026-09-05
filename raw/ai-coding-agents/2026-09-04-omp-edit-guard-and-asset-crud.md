# OMP 编辑防护与 agent 资产 CRUD

> Source: 已安装包 `@oh-my-pi/pi-coding-agent` 的 `dist/types` 类型声明；本机 OMP `hub` 工具自述文本
> Collected: 2026-09-04
> Published: Unknown

验证级别：`[TYPES]` = 读已安装包 `.d.ts` 类型声明；`[TOOLDOC]` = 本会话内 OMP 工具自述文本；`[UNVERIFIED]` = 未测。

本文件用于回答两个问题：

1. jcode 的 swarm 读集冲突通知，OMP 是否有等价物？
2. Prime Agent 的 Continual Harness（`/refine` 资产 CRUD + rollback），OMP 是否有等价物？

DSH、jcode、Prime Agent 本次均未安装、未运行，其机制描述沿用先前 raw。

---

## A. OMP 的并发编辑防护：session 内容哈希，不是跨 agent 读集

`[TYPES]` `dist/types/edit/store.d.ts` 开头注释原文：

```
 * Session-scoped native edit state: full-file snapshots that mint hashline
 * tags (recorded by `read`/`search`/`write`), `CUT`/`PUT` clipboard
 * registers, and the byte-identical no-op loop guard. One store per
 * {@link ToolSession}; every {@link EditSession} the edit tool opens shares it.
```

`[TYPES]` 相关导出：

- `dist/types/tools/hashline-format.d.ts`：`computeFileHash(text)`、`formatHashlineHeader(path, tag)`
- `dist/types/tools/read-format.d.ts`：`readHashlineHeaderContext`、`hashlineHeaderContextForText`、`prependHashlineHeader`
- `dist/types/edit/renderer.d.ts`：`displayErrorText` 注释提到 `HashlineMismatchError` 携带 `displayMessage`
- `dist/types/tools/index.d.ts`：`hasEditTool` —— `Whether an edit-capable tool is available in this session (controls hashline output)`

机制形状：`read`/`search`/`write` 为文件全文铸造一个短哈希 tag，edit 必须带上该 tag；文件在此期间变动则 tag 不匹配，编辑被 `HashlineMismatchError` 拒绝。

关键限定：store 的注释明写 **Session-scoped**、**One store per ToolSession**。它保护的是「这个 agent 自己读过的版本还在不在」，触发点在**该 agent 尝试写入时**。

`[TOOLDOC]` OMP `hub` 工具自述文本中关于并发的原文：

```
Same-file edits are not guaranteed to merge. Have siblings coordinate through
hub before editing shared files.
```

即：跨 agent 的同文件协调由 agent 自己通过 hub 消息完成，不是 harness 自动完成。

`[TYPES]` 在 extension/hook 的事件清单中未发现「某文件被他人修改」类通知事件；`settings-schema.d.ts` 的 `Supersede Stale Reads`（`Prune older read results when the same file is read again`）是压缩期去重，与冲突通知无关。

对比结论（对 jcode 主张）：OMP 有**编辑时的内容哈希拒绝**（per-agent、reactive），没有**服务端读集追踪 + 主动通知同侪**（cross-agent、proactive）。两者不是同一机制。

未验证：是否存在类型声明之外的跨 agent 通知路径；未读实现源码。`[UNVERIFIED]`

---

## B. OMP 的 agent 资产 CRUD：有 CRUD，未发现 rollback

`[TYPES]` `dist/types/tools/manage-skill.d.ts`：

```
declare const manageSkillSchema: ... FluentType<{
    action: "create" | "delete" | "update";
```

同文件注释：`Direct create/update/delete of isolated managed skills. Gated behind autolearn.enabled; backend-independent (the skill side is standalone).`
工具名 `manage_skill`，`approval: "write"`。

`[TYPES]` `dist/types/autolearn/controller.d.ts`：`buildAutoLearnInstructions` 接受 `{ manageSkill: boolean; learn: boolean }`。

`[TYPES]` `dist/types/extensibility/skills.d.ts`：`isNameClaimedByAuthoredSkill` —— managed skill 在发现顺序中排最后，authored skill 同名者优先；`manage_skill` create 会据此提前拒绝。

`[TYPES]` `/omfg` 侧（TTSR 规则创作）：

- `dist/types/modes/controllers/omfg-controller.d.ts`：`OmfgController`
- `dist/types/modes/controllers/omfg-rule.d.ts`：`OmfgRuleSourceLevel = "project" | "user"`、`buildOmfgRuleForPath`、`parseGeneratedRule`、`validateRuleAgainstAssistantHistory`
- `dist/types/modes/components/omfg-panel.d.ts`：`OmfgPanelState = "generating" | "validating" | "confirming" | "saving" | "saved" | "rejected" | "aborted" | "error"`

机制形状：规则由抱怨文本生成 → 对 assistant 历史做校验 → 用户确认 → 落盘到 project 或 user 级。

rollback 检索结果：在 `dist/types` 中检索 `rollback|revert|checkpoint|snapshot` 命中的相关项为
`advisor/runtime.d.ts` 的 `rollbackTo?(count: number)`（advisor transcript 回退）与
`git-tui/diff-pane.d.ts` 的 `buildLineSelectionPatch(..., intent: "apply" | "revert")`（git 暂存/丢弃行选择）。
**未发现针对 skill / rule / agent 资产的版本化或 rollback 接口。** `[TYPES]`

对比结论（对 Prime 主张）：OMP 有 agent 资产 CRUD（skill 全 CRUD，rule 创建带校验与确认），未发现资产 rollback。Prime 的优势应收窄到 rollback/版本化这一维，而非整个「资产可持续修正」能力类。

未验证：Prime Agent `/refine` 的实际行为本次未取证；OMP 是否有未文档化的资产版本化路径未排除。`[UNVERIFIED]`

---

## C. 证据边界

- OMP 侧全部来自已安装包类型声明与工具自述文本，未读实现源码，未做行为实测。
- 未安装或运行 jcode、Prime Agent、DSH 作对照。
- 类型声明反映的是公开 API 形状，不能证明实现细节或运行时行为。
