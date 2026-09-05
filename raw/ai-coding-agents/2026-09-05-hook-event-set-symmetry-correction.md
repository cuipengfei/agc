# Claude Code 与 Codex hook 事件集不对称断言的证伪扫描

- Source: 本 repo 研究会话，主会话对本机安装二进制的补充扫描
- Collected: 2026-09-05
- Published: Unknown
- 关系：本文是 [Claude Code 与 Codex 入列](2026-09-05-claude-code-and-codex-enrollment.md) 的更正补编。那份记录的「主会话裁决」第 17 条写下时未做对应扫描，属未核验断言；本文补做扫描并证伪其前半句。原记录不改动，按 `raw/` 不可变处理。
- 被更正的原句（引自 enrollment 记录第 17 条）：「Codex 事件集比 Claude 多 `post_compact` 与 `subagent_start`；Claude 有 Codex 未见的 `PermissionDenied` + `retry:true`（告诉模型可以重试）。两边互有增补，是共同演化而非单向抄袭。」

## 扫描方法

对两个本机二进制提取可打印 ASCII 串（`[\x20-\x7e]{6,200}`），按大小写无关子串统计命中数并留样例。目标文件：

- Claude Code `2.1.261`：`/home/cpf/.bun/install/global/node_modules/@anthropic-ai/claude-code-linux-x64/claude`
- Codex CLI `0.153.4`：`/home/cpf/.bun/install/global/node_modules/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/bin/codex`

## 结果一：前半句证伪 —— Claude Code 同样有这两个 hook

在 Claude Code 二进制中：

| 探针 | 命中数 | 样例（逐字） |
|---|---|---|
| `post_compact` | 23 | `post_compact`、`post_compact_cleanup`、`tengu_post_compact_survey`、`tengu_post_compact_survey_event` |
| `PostCompact` | 59 | `executePostCompactHooks`、`consumePostCompaction`、`markPostCompaction`、`postCompact` |
| `subagent_start` | 0 | —— |
| `SubagentStart` | 24 | `SubagentStart`、`executeSubagentStartHooks`、`SubagentStart hooks cancelled (control stream closed)`、`SubagentStart:` |

`executePostCompactHooks` 与 `executeSubagentStartHooks` 这两个函数名足以判定 Claude Code 存在对应的 hook 执行路径。snake_case 探针命中 0 而 PascalCase 命中，说明差异只是命名风格。

**结论：「Codex 事件集比 Claude 多 post_compact 与 subagent_start」作废。**

## 结果二：后半句只余弱证据

在 Codex 二进制中：

| 探针 | 命中数 | 语境判定 |
|---|---|---|
| `PermissionDenied` | 2 | 均非 hook 事件。样例落在错误枚举串内：`PermissionDeniedAddrNotAvailableimds_load_region.aws/login/cache` |
| `permission_denied` | 2 | 均非 hook 事件。一处在 `bypass_hook_trust` 附近的字段名串，一处在 gRPC 状态名串 `deadline_exceeded unauthenticated permission_denied` 内 |
| `"retry"` | 0 | —— |
| `may retry` | 1 | 语境为自动审批超时提示：`The automatic permission approval review did not finish before its deadline. Do not assume the action is unsafe based o`（扫描处截断），与 hook 重试语义无关 |

对照 Claude Code 侧的原文证据（见 enrollment 记录）：`Return {"hookSpecificOutput":{"hookEventName":"PermissionDenied","retry":true}} to tell the model it may retry.`

**结论：「Codex 无 PermissionDenied hook 事件」只能记作「已查材料中未找到」，不能记作确证。** 不排除以其他命名实现，也不排除该逻辑不落可打印字符串。

## 对上层结论的影响

这次更正**加强**而非削弱「hook 线格式跨厂商收敛」的判断：两家 hook 事件集比原判断更接近，差异集中在命名风格（snake_case 与 PascalCase），不在事件覆盖面。原记录第 16 条（`ClaudeHooksEngine`、wire 字段同名）不受影响。

同时暴露一个方法问题：enrollment 记录第 17 条是在没有扫描支撑的情况下写下的对称性断言。凡「A 有 B 没有」形式的句子，必须先对 B 侧做定向扫描或检索，否则只能写「未在已查材料中找到」。
