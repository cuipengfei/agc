# OMP 配置语义 源码取证

> 来源：can1357/oh-my-pi 源码 `/home/cpf/code-inside/oh-my-pi` (`61a692cf98`)，读取日期 2026-09-11
> 采集日期：2026-09-11

本 raw 记录当前 staged `omp/agent/config.yml` 相对 commit `90bde33` 的值级行为变更，每项均给出 schema 定义与实际消费路径。

## 上下文长度与缓存

- `compaction.midTurnEnabled`：schema 布尔值默认 `true`；在 mid-run maintenance 中消费，当 `compactionSettings.midTurnEnabled === false` 时跳过 — `settings-schema.ts:2635`、`session/session-maintenance.ts:2076`
- `compaction.idleEnabled`：schema 布尔值默认 `false`；由 idle auto-compaction 消费 — `settings-schema.ts:2755`、`modes/controllers/event-controller.ts:2311`
- `compaction.experimentalContextManagement`：schema 布尔值默认 `false`；仅当为 true 且实验 rollover tools 可用、调用者为 owner 时生效 — `settings-schema.ts:2623`、`session/session-maintenance.ts:412-417`、`tools/context-notes.ts:41-72`
- `providers.cacheRetention`：schema 枚举 `auto|short|long`；`long` 对应 1 小时 TTL 并关闭 keep-alive refresh — `settings-schema.ts:5848`、`providers/settings-stream-fn.ts:48`

## 读取、编辑、网页读取、Bash 输出

- `read.renderMarkdown`：schema 布尔值默认 `false`；Markdown 渲染路径消费 — `settings-schema.ts:3788`、`tools/read-format.ts:628`
- `read.summarize.prose`：schema 布尔值默认 `false`；read tool 的 prose 摘要条件 — `settings-schema.ts:3810`、`tools/read.ts:1661-1666`
- `read.toolResultPreview`：schema 布尔值默认 `false`；chat transcript 中 read 结果 inline preview — `settings-schema.ts:3878`、`modes/components/chat-transcript-builder.ts:219-227`
- `edit.streamingAbort`：schema 布尔值默认 `false`；native engine final preview 报 error 时中止 streamed edit — `settings-schema.ts:3694`、`session/stream-guards.ts:94-105`
- `providers.fetch`：schema 枚举含 `trafilatura`、`auto` 等；`auto` 按 native → trafilatura → lynx → Parallel → Firecrawl → Jina 顺序尝试，有过质量门 — `settings-schema.ts:5942`、`tools/fetch.ts:592-617,642-710`
- `shellMinimizer.sourceOutlineLevel`：schema 枚举 `default|aggressive`；`aggressive` 在 Bash 输出源码时剥离更多内容 — `settings-schema.ts:4071`、`exec/bash-executor.ts:249`
- `bash.allowCompoundCommands`：schema 布尔值默认 `false`；`false` 时不将 literal `&&` chain 拆入 literal+segments 路径 — `settings-schema.ts:3980`、`tools/bash.ts:596-605`

## 子 Agent、自动学习与 Todo

- `task.eager`：schema 枚举 `default|preferred`；`preferred` 在 system prompt 中注入软性委派鼓励 — `settings-schema.ts:5123`、`sdk.ts:3073-3074`
- `task.batch`：schema 布尔值默认 `true`；`false` 将 task tool 从批量 `{context,tasks[]}` 改为单任务 flat schema — `settings-schema.ts:5144`、`tools/task/types.ts:170-260`、`tools/task/index.ts:195`
- `task.maxConcurrency`：schema 数值默认 `5`；task workpool 消费 — `settings-schema.ts:5168`、`tools/task/workpool.ts:144`
- `task.maxEffort`：schema 枚举，仅约束显式传入的 effort hint — `settings-schema.ts:5287-5289`、`task/executor.ts:3307-3317`
- `autolearn.autoContinue`：schema 布尔值默认 `false`；autolearn 完成一轮后停止额外 continuation turn — `settings-schema.ts:3133`、`autolearn/controller.ts:129`
- `todo.reminders`：schema 布尔值默认 `true`；session exit 时提醒未完成 todo — `settings-schema.ts:4239`、`session/todo-tracker.ts:213`
- `todo.eager`：schema 枚举 `default|preferred`；`preferred` 在初始 system prompt 中鼓励创建 todo — `settings-schema.ts:4267`、`session/todo-tracker.ts:136`

## 工具暴露、安全、eval、xdev、Codex 重置

- `browser.enabled`：schema 布尔值默认 `false`；禁用 OMP scripted Chromium browser tool — `settings-schema.ts:4595`、`tools/browser.ts:154`
- `secrets.enabled`：schema 布尔值默认 `false`； outbound provider context 中对匹配 secret 做 obfuscation/redaction；advisor 动态上下文同样经过 obfuscator — `settings-schema.ts:5445`、`sdk.ts:1479-1484,3406-3411`、`advisor/runtime.ts:713-736,777-790`、`session/session-advisors.ts:928,1107`
- secret 边界：user/toolResult/user-authored developer/assistant replay 被 transform；static system prompt 与 tool schema 原样通过 — `secrets/message-transform.ts:241-287`
- `eval.tools.enabled`：schema 布尔值默认 `true`；eval 定义的 tools 可暴露给 task/agent/workpool 子 agent — `settings-schema.ts:4110`、`tools/task/eval-tools.ts:79`
- `eval.autoBackground.enabled`：schema 布尔值默认 `false`；长时间 eval cell 自动后台化 — `settings-schema.ts:4134`、`tools/eval.ts:291,457`
- `tools.xdevDocs`：schema 枚举 `builtins|inline`；`inline` 使所有 mounted xdev device 成为 prompt docs 内联候选，受 per-device 与 total budget 限制；overflow 进入 `Additional devices (docs on demand)` catalog — `settings-schema.ts:4819`、`tools/xdev.ts:324-361,386-395`
- `codexResets.autoRedeem`：schema 枚举 `unset|yes|no`；`unset` 首次询问，`yes` 允许自动检查/花费，`no` 跳过 auto-redeem 评估与花费 — `settings-schema.ts:5967`、`session/codex-auto-reset.ts:147-153`、`session/agent-session.ts:10165-10213`
