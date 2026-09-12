# OMP 配置语义手册

> Sources: can1357/oh-my-pi 源码 `/home/cpf/code-inside/oh-my-pi` (`61a692cf98`)；已安装包 `@oh-my-pi/pi-coding-agent` v18.1.18
> Raw: [配置语义源码摘录](../../raw/omp-config/2026-09-11-config-semantics.md); [Notifications、Recap、Stop、Reactions 源码取证](../../raw/omp-config/2026-09-12-notifications-recap-stop-reactions.md)
> Updated: 2026-09-12

## 这份手册讲什么

这篇只回答 4 个问题：每项设置做什么、何时触发、对 agent 有什么影响、你在结果里会看到什么。不是 diff 审计，也不是"改了什么"。

## 长上下文与缓存

| 设置 | 做什么 | 何时触发 | 影响与取舍 |
|---|---|---|---|
| `compaction.midTurnEnabled: true` | 允许 OMP 在 tool-loop 衔接点自动压缩 | 已完成一个 tool interaction、准备继续下一步时 | 长工具链任务更不容易中途撞 window；代价是更早压缩，早期细节会变 summary |
| `compaction.idleEnabled: true` | 允许空闲时自动压缩 | agent 空闲且 token 超阈值时 | 暂停回来时常已完成 context 整理；代价是部分旧细节已被摘要化 |
| `compaction.experimentalContextManagement: true` | 实验性 context 管理开关 | 开关开启 + 工具表面 + owner 绑定后生效 | 自动 compact 走 notes-backed rollover，不再调用 summarization model；显式 mode/focus 的 `/compact` 仍走旧管线 |
| `providers.cacheRetention: long` | 要求长 prompt-cache retention | provider 支持时 | 支持的 provider 用 1 小时 TTL，并关闭 keep-alive refresh；连续长会话更容易复用缓存 |

## 读文件、编辑、网页读取、Bash 输出

| 设置 | 做什么 | 何时触发 | 影响与取舍 |
|---|---|---|---|
| `read.renderMarkdown: true` | Markdown read 走格式化终端渲染 | `read` 读取 Markdown 时 | 文档更适于人看；若需要字节级原文，别把预览当源文件 |
| `read.summarize.prose: true` | prose 文件也可进入 read 摘要分支 | read 自身进入摘要逻辑时 | 长文档更快拿到结构摘要；不是所有 prose 都强制摘要 |
| `read.toolResultPreview: true` | read 结果在聊天区显示 inline preview | read tool result 渲染时 | 你能直接在 TUI 对话区看到 read 到了什么 |
| `edit.streamingAbort: true` | streamed edit 的最终 preview 报错时可中止 | native edit engine final preview 已报 error 时 | 防止被判错的流式 edit 继续提交；不是"有风险就中断" |
| `providers.fetch: auto` | 网页读取走自动 reader 顺序 | fetch HTML→Markdown 时 | 顺序为 native → trafilatura → lynx → Parallel → Firecrawl → Jina；`auto` 不等于不联网 |
| `shellMinimizer.sourceOutlineLevel: default` | Bash 打印源码时减少 aggressive 压缩 | Bash 输出源码时 | `aggressive` 更偏 outline，可能省掉 function body；`default` 保留更多实现细节 |
| `bash.allowCompoundCommands: false` | 不把 literal `cmd1 && cmd2` 拆开做分段处理 | Bash 命令包含 literal `&&` 链时 | 不是禁止执行 `&&`；整条命令仍整体处理 |

## 子 Agent、自动学习与 Todo

| 设置 | 做什么 | 何时触发 | 影响与取舍 |
|---|---|---|---|
| `task.eager: default` | 去掉"偏向委派"的 system prompt 软提示 | system prompt 组装时 | 更依赖模型自行判断是否拆分工作 |
| `task.batch: false` | task 从批量 `{context,tasks[]}` 切为单任务 flat 形态 | task tool schema 解析时 | 每次 task call 派一个 agent；批量字段不再合法 |
| `task.maxConcurrency: 4` | 限制同时运行的 child agent 数 | task workpool 调度时 | 并发更少，排队更久 |
| `task.maxEffort: high` | 限制 task 调用显式传入的 effort hint | task spawn 带 `effort` 时 | 只约束显式 hint，不表示未传 hint 的 spawn 被强制降级 |
| `autolearn.autoContinue: false` | autolearn 完成后不再自动开 continuation turn | autolearn 一轮结束时 | 减少自动延长；不删除已有 lesson，也不关闭 learn/manage_skill |
| `todo.reminders: false` | 退出前不再提醒未完成 todo | session exit 时 | 更安静；复杂任务更依赖模型自己管理计划 |
| `todo.eager: default` | 去掉创建 todo 的软提示 | system prompt 组装时 | 是否建 todo 更交给模型判断 |

## 工具暴露与安全

| 设置 | 做什么 | 何时触发 | 影响与取舍 |
|---|---|---|---|
| `browser.enabled: false` | 禁用 OMP scripted Chromium browser 工具 | tool surface 组装时 | agent 不走内置浏览器自动化链路 |
| `secrets.enabled: true` | outbound provider context 中对匹配 secret 做 obfuscation/redaction | provider request 组装时 | 主 agent 和 Advisor 的动态上下文都走 obfuscator；但 static system prompt、tool schema 原样通过 |
| `eval.tools.enabled: true` | eval 定义的 tools 可暴露给 task/agent/workpool children | task/agent/workpool 组装时 | 子 agent 可用当前会话临时定义的工具 |
| `eval.autoBackground.enabled: true` | 长时间 eval cell 自动后台化 | eval cell 运行超阈值时 | 主对话不被长 eval 阻塞 |
| `tools.xdevDocs: inline` | 所有 mounted xdev device 都成为 prompt docs 内联候选 | system prompt 组装时 | 超出 per-device / total budget 的 device 进入 `Additional devices (docs on demand)` catalog，模型需按需读 `xd://...` |
| `codexResets.autoRedeem: no` | Codex saved rate-limit reset 的自动花费策略 | Codex reset 相关流程 | `unset` 首次询问；`yes` 允许自动检查/花费；`no` 跳过 auto-redeem 检查与自动花费 |

## 通知与空闲回顾

| 设置 | 做什么 | 何时触发 | 影响与取舍 |
|---|---|---|---|
| `completion.notify: on` | Agent 正常完成一轮时触发终端通知 | `agent_end` 且非 error/abort 时 | 后台运行时知悉完成；Warp 终端因原生 UX 会跳过此通知避免重复 |
| `error.notify: on` | Agent 以 error 停止时触发终端通知 | `agent_end` 且最后 assistant `stopReason === "error"` 时 | 后台运行时立即发现故障；默认 `off`，本机已显式开启 |
| `ask.notify: on` | Agent 用 ask 工具等待输入时触发终端通知 | 每次 `ask` 执行且 `hasUI === true` 时 | 防止 agent 卡住等你而你没注意到 |
| `ask.timeout: 0` | ask 等待用户回答的自动选择倒计时（秒），`0` 禁用 | `ask` 执行时读取；plan mode 下强制禁用 | `0`（当前）最安全；设 15-120 秒可无人值守自动推进 |
| `recap.enabled: true` | 终端空闲后额外生成一次当前进展摘要 | `agent_end` 后，空闲达 `recap.idleSeconds` 时 | 显示在 TUI 状态栏 `※ recap:`，不写入持久对话记录；额外消耗一次 LLM 调用 |
| `recap.idleSeconds: 300` | 空闲多久触发 recap（秒） | 设 `setTimeout` 时；代码 clamp 到 `1-3600` | 当前 300 秒（5 分钟）比默认 240 秒长，减少 token 浪费 |

## 停顿恢复与表情反应

| 设置 | 做什么 | 何时触发 | 影响与取舍 |
|---|---|---|---|
| `features.unexpectedStopDetection: mechanical` | Agent 意外停住时自动恢复 | `stopReason === "stop"` 且无 tool call 时 | `mechanical`：仅 signed thinking-only stop 重试；`smart`：加可见文字分类；`none`：关闭此检测。最多重试 3 次 |
| `providers.unexpectedStopModel` | Smart 模式下判断是否意外停住的小模型 | 仅在 `smart` 档位且可见文字需分类时 | 默认 online TINY/smol（通常更小，实际延迟/成本取决于模型与 provider）；可选本地 on-device 模型 |
| `tui.reactions: true` | 邀请主 Agent 用 emoji 开头回复，提取为前一条用户气泡的 badge | system prompt 组装时（仅 main agent + TUI） | 开关控制的是 prompt 邀请，渲染器解析路径不受此开关门控；每条用户消息最多一个 badge |

## 关键边界

- `secrets.enabled` 只保护走 provider-context 链路的对话内容，不等于本地 session/file/log 或第三方 extension 都自动被清理。
- `edit.autoRepair` 的 smol 请求不走主 agent / Advisor 的 obfuscation 路径。
- `tools.xdevDocs` 是 system-prompt 文档策略，与 `providers.fetch` 的网页抓取后端无关。
- `compaction.experimentalContextManagement` 生效需三重门：配置开关为 true、effective tool surface 同时具备 `context_notes`/`new_context`/`read`/`grep`、调用者为 owner 且绑定 live branch。改开关后需 restart 才刷新工具列表。

- 通知路径仅支持终端分层路由（Herdr → cmux → OSC 99/9 → Bell + Linux D-Bus），未提供内置 HTTP/webhook 目标。
- `features.unexpectedStopDetection` 仅控制 signed thinking-only 与可见文字的意外停顿检测；完全空输出或未签名 thinking-only 走独立的空输出恢复机制（最多重试 3 次，停止并报错），不受此开关控制。
- `tui.reactions` 仅控制 system prompt 是否向主 Agent 注入 emoji 反应邀请；渲染器解析路径不受此开关门控，偶然的 emoji 开头回复仍可能被渲染为 badge。
- Idle Recap 不走通知路由，仅在 TUI 状态栏显示 `※ recap:` 文本。

## See Also

- [OMP Compaction Model 与 Thinking Level](compaction-model.md) — compaction effort 继承自 session thinkingLevel
- [OMP 实验性上下文管理与 OpenCode DCP 对比](experimental-context-vs-dcp.md) — rollover/notes 机制与 DCP outbound transform 的对比
- [OMP 运行时控制](runtime-controls.md) — steering / follow-up / interrupt 与 parse regression tooling
