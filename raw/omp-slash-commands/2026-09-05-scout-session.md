# OMP 内置 Slash 命令调查报告 — Session 组

> 调查范围：builtin-session.ts 中注册的 19 条顶层命令  
> 源码根：`src/`（以下文件路径均相对 src/）  
> 版本：@oh-my-pi/pi-coding-agent v18.1.10  
> ACP 判定规则：spec 有 `handle` → ACP 文本模式可用；只有 `handleTui` → TUI 专属。

---

## /todo
- 描述: "View or modify the agent's todo list"
- ACP: 可用（有 `handle`）
- TUI: 可用（有 `handleTui`）
- 子命令:
  - `edit` — 在 $EDITOR 中打开 todo（Markdown 往返），TUI 专属，helpers/todo.ts:190-193
  - `copy` — 复制 todo 为 Markdown 到剪贴板，helpers/todo.ts:78-84
  - `expand` — 在 HUD 中展开显示所有 phase/task，TUI 专属
  - `collapse` — 恢复 HUD 的有限预览，TUI 专属
  - `export [<path>]` — 将 todo 写入 Markdown 文件（默认 TODO.md），helpers/todo.ts:86-96
  - `import [<path>]` — 从 Markdown 文件替换 todo（默认 TODO.md），helpers/todo.ts:98-110
  - `append [<phase>] <task...>` — 追加任务；phase 模糊匹配或自动创建，helpers/todo.ts:112-136
  - `start <task>` — 标记任务为 in_progress（模糊匹配），helpers/todo.ts:138-146
  - `done [<task|phase>]` — 标记任务/phase/全部完成，helpers/todo.ts:148-175
  - `drop [<task|phase>]` — 标记任务/phase/全部废弃，helpers/todo.ts:148-175
  - `rm [<task|phase>]` — 移除任务/phase/全部，helpers/todo.ts:148-175
- 机制:
  - ACP 模式：由 `handleTodoAcp` 统一分发（slash-commands/helpers/todo.ts:178-225），解析 verb 后调用各子命令 handler；所有变更通过 `commitTodos` 写入 session（`runtime.session.setTodoPhases` + `sessionManager.appendCustomEntry` 类型 `USER_TODO_EDIT_CUSTOM_TYPE`），helpers/todo.ts:64-68。
  - TUI 模式：委托 `runtime.ctx.handleTodoCommand` → `TodoCommandController.handleTodoCommand`（modes/controllers/todo-command-controller.ts:148-180），支持 expand/collapse/edit（外部编辑器）等 TUI 专属操作。
  - 模糊匹配：`findPhaseFuzzy` 先精确匹配 → 前缀匹配 → 子串匹配；`findTaskFuzzy` 先精确 → 子串 → 若多结果则取唯一 active 项，helpers/todo.ts:38-62。
- 场景: 管理 agent 的任务列表；在 ACP 中通过文本命令批量操作，在 TUI 中用 HUD 可视化跟踪进度。
- 收益: 用户获得结构化的任务追踪（phase→task），支持导入/导出和 Markdown 编辑。
- 证据: 源码实证

---

## /session
- 描述: "Session management commands"
- ACP: 可用（有 `handle`）
- TUI: 可用（有 `handleTui`）
- 子命令:
  - `info` — 显示会话信息和统计，builtin-session.ts:215-221 / 248-249
  - `delete` — 删除当前会话并返回选择器，builtin-session.ts:222-236 / 233-236
  - `pin [account]` — 将当前 provider 固定到存储的 OAuth 账户，builtin-session.ts:237-245 / 238-244
- 机制:
  - `info`：ACP 输出 `sessionId`/`sessionName`/`cwd`；TUI 调用 `handleSessionCommand` → `CommandController.handleSessionCommand`（modes/controllers/command-controller.ts:327-403），渲染 provider、消息统计、token、成本、append-only 状态等完整面板。
  - `delete`：ACP 直接调用 `runtime.sessionManager.dropSession(sessionFile)`（先关闭 persist writer 再删除文件，避免幽灵复活），builtin-session.ts:227-231；TUI 调用 `SelectorController.handleSessionDeleteCommand`（modes/controllers/selector-controller.ts:1930-1965），先确认再 detach 再删除。
  - `pin`：调用 `handleSessionPinCommand`，加载当前 provider 的 OAuth 账户列表，支持按序号/邮箱/accountId 选择并固定；TUI 无参数时打开交互选择器 `showSessionPinSelector`，builtin-session.ts:242-243。
- 场景: 查看会话元数据、清理不需要的会话、强制锁定特定 OAuth 账户避免切换模型时掉凭证。
- 收益: 会话生命周期管理 + 多账户环境下的身份稳定性。
- 证据: 源码实证

---

## /jobs
- 描述: "Show async background jobs status"
- ACP: 可用（有 `handle`）
- TUI: 可用（有 `handleTui`）
- 子命令: 无
- 机制:
  - 调用 `session.getAsyncJobSnapshot({ recentLimit: 5 })`（session/agent-session.ts:2053-2074），从 `#asyncJobManager` 取 running + recent + delivery 状态。
  - ACP：文本列表输出 running/recent job 的 id、type、status、label、持续时间，builtin-session.ts:267-291。
  - TUI：调用 `CommandController.handleJobsCommand`（modes/controllers/command-controller.ts:579-607），用 `presentCommandOutput` 渲染主题化面板。
  - 状态栏实时描述：`getTuiAutocompleteDescription` 动态计算 running/recent 数量，builtin-session.ts:262-265。
- 场景: 检查后台异步任务（长时 bash、debug、task subagent）是否完成。
- 收益: 避免阻塞等待，随时查看后台工作进度和最近结束的任务。
- 证据: 源码实证

---

## /usage
- 描述: "Show provider usage and limits"
- ACP: 可用（有 `handle`）
- TUI: 可用（有 `handleTui`）
- 子命令:
  - `show` — 显示 provider 用量和限制（默认子命令）
  - `reset [account|active]` — 消耗一个保存的 Codex rate-limit reset，builtin-session.ts:311-312
- 机制:
  - `show`：ACP 调用 `buildUsageReportText`（slash-commands/helpers/usage-report.ts:137-160），优先尝试 `session.fetchUsageReports()` 获取 provider 上报的限额数据（含 rate-limit reset 余额、窗口重置时间），失败则回退到本地 `sessionManager.getUsageStatistics()` 的 input/output/cache/premiumRequests/cost 统计。TUI 调用 `handleUsageCommand` → `CommandController.handleUsageCommand`（modes/controllers/command-controller.ts:616-642），打开 usage dashboard 面板。
  - `reset`：调用 `handleUsageResetCommand`（builtin-session.ts:35-76），通过 `session.listResetCredits()` 列出可用重置额度，匹配目标账户后调用 `session.redeemResetCredit` 执行消耗，builtin-session.ts:73-76。
- 场景: 监控 API 配额消耗、在 Codex rate limit 时快速花费 saved reset 恢复工作。
- 收益: 用量透明 + 紧急 quota 恢复能力。
- 证据: 源码实证

---

## /stats
- 描述: "Launch the local stats dashboard"
- ACP: 可用（有 `handle`）
- TUI: 未确认（无 `handleTui`，可能 fallback 到 handle 的文本输出）
- 子命令: 无（参数：`--port` / `--host`）
- 机制:
  - 解析参数后调用 `launchStatsDashboard`（slash-commands/helpers/stats-dashboard.ts:62-85），先 `stats.syncAllSessions()` 同步会话文件到 stats DB，再 `stats.startServer(port, host)` 启动本地 HTTP 服务（默认 127.0.0.1:3847），最后 `openUtils.openPath(url)` 用系统默认浏览器打开面板。单例保护：若服务已运行则复用，忽略新地址请求，slash-commands/helpers/stats-dashboard.ts:69-73。
- 场景: 需要可视化查看历史会话统计、token 消耗趋势、成本分析。
- 收益: 本地启动持久化 stats 面板，浏览器访问图形化报表。
- 证据: 源码实证

---

## /changelog
- 描述: "Show changelog entries"
- ACP: 可用（有 `handle`）
- TUI: 可用（有 `handleTui`）
- 子命令:
  - `full` — 显示完整 changelog
- 机制:
  - 调用 `getChangelogPath()` 和 `parseChangelog()`（utils/changelog.ts，未读具体行号），默认只展示最近条目（`RECENT_CHANGELOG_ENTRY_LIMIT`）。TUI 由 `CommandController.handleChangelogCommand`（modes/controllers/command-controller.ts:654-662）渲染带边框的 TranscriptBlock。
- 场景: 快速查看 OMP 版本更新内容。
- 收益: 了解新功能、修复和破坏性变更。
- 证据: 源码实证

---

## /hotkeys
- 描述: "Show all keyboard shortcuts"
- ACP: 不可用（无 `handle`）
- TUI: 专属（只有 `handleTui`）
- 子命令: 无
- 机制:
  - 调用 `CommandController.handleHotkeysCommand`（modes/controllers/command-controller.ts:663-665），通过 `buildHotkeysMarkdown` 生成快捷键文档，再用 `showMarkdownPanel` 以 Markdown 面板形式展示。
- 场景: TUI 中忘记快捷键组合时快速查阅。
- 收益: 无需离开终端即可查看完整键位映射。
- 证据: 源码实证

---

## /tools
- 描述: "Show tools currently visible to the agent"
- ACP: 可用（有 `handle`）
- TUI: 可用（有 `handleTui`）
- 子命令: 无
- 机制:
  - ACP：直接调用 `session.getActiveToolNames()` 和 `session.getAllToolNames()`，以 `* active / - inactive` 文本列表输出，并追加 `~ xd://` 的 xdev tools，builtin-session.ts:412-418。
  - TUI：`CommandController.handleToolsCommand`（modes/controllers/command-controller.ts:665-671）渲染 Markdown 面板，含工具描述和 xdev 挂载项。状态栏通过 `getTuiAutocompleteDescription` 实时显示 active/all 数量，builtin-session.ts:409-411。
- 场景: 确认当前会话有哪些工具可用、排查工具未激活问题。
- 收益: 工具可见性透明化，快速识别可用能力集。
- 证据: 源码实证

---

## /context
- 描述: "Show estimated context usage breakdown"
- ACP: 可用（有 `handle`）
- TUI: 可用（有 `handleTui`）
- 子命令: 无
- 机制:
  - ACP：`buildContextReportText`（slash-commands/helpers/context-report.ts:14-56）调用 `computeContextBreakdown`（modes/utils/context-usage.ts，未读）生成 rich breakdown：按 category 的 token 分布、auto-compact buffer、free slack、snapcompact 估计节省（text→image 的 wire savings）。若 breakdown 失败则回退到 `session.getContextUsage()` 的最小输出。
  - TUI：`CommandController.handleContextCommand`（modes/controllers/command-controller.ts:673-685）渲染主题化的 Context Usage 面板，含 ASCII 条形图。
  - 状态栏：`getTuiAutocompleteDescription` 实时显示 `percent% (used/window)`，builtin-session.ts:433-436。
- 场景: 诊断上下文窗口是否逼近上限、评估 snapcompact 节省效果。
- 收益: 精确的 token 占用分解 + 压缩策略效果可视化。
- 证据: 源码实证

---

## /extensions（别名: /status）
- 描述: "Open Extension Control Center dashboard"
- ACP: 不可用（无 `handle`）
- TUI: 专属（只有 `handleTui`）
- 子命令: 无
- 机制:
  - 调用 `runtime.ctx.showExtensionsDashboard()` → `SelectorController.showExtensionsDashboard`（modes/controllers/selector-controller.ts:416-466），创建 `ExtensionDashboard`，展示所有 provider 和扩展的统一视图，替换旧 `/status` 命令。
- 场景: 管理扩展（启用/禁用/配置）、查看 provider 状态。
- 收益: 图形化扩展控制中心，比命令行更高效地管理复杂扩展生态。
- 证据: 源码实证

---

## /agents
- 描述: "Open the agents hub (per-agent model, prewalk, and advisor)"
- ACP: 不可用（无 `handle`）
- TUI: 专属（只有 `handleTui`）
- 子命令: 无
- 机制:
  - 调用 `runtime.ctx.showAgentsDashboard()` → `SelectorController.showAgentsDashboard`（modes/controllers/selector-controller.ts:471-530），全屏 alternate-screen 界面，展示 scope sidebar、agent rows、chip strips，可进入 model browser 为每个 agent 配置模型、prewalk 和 advisor。
- 场景: 为多 agent 会话配置不同角色的模型路由和前置检查清单。
- 收益: 可视化 per-agent 模型映射和 advisor 绑定，避免手动编辑配置。
- 证据: 源码实证

---

## /git
- 描述: "Open the git UI (split diff viewer, staging, commit composer)"
- ACP: 不可用（无 `handle`）
- TUI: 专属（只有 `handleTui`）
- 子命令: 无（参数：`[revision]` 可选）
- 机制:
  - 调用 `runtime.ctx.showGitUi(revision)` → `SelectorController.showGitTui`（modes/controllers/selector-controller.ts，未读具体行号），打开全屏 Git TUI：split diff、stage/unstage、commit composer。
- 场景: 在 OMP 内部完成代码审查、暂存、提交，无需切换到外部终端。
- 收益: 内联 Git 工作流，保持开发上下文不中断。
- 证据: 源码实证（具体行号未读）

---

## /hub
- 描述: "Open the live Agent Hub"
- ACP: 不可用（无 `handle`）
- TUI: 专属（只有 `handleTui`）
- 子命令: 无
- 机制:
  - 调用 `runtime.ctx.showAgentHub({ initialSection: "activity" })` → `SelectorController.showAgentHub`（modes/controllers/selector-controller.ts:2321-2382，未完全读取），传入 `SessionObserverRegistry` 和选项，打开实时 Agent Hub，默认展示 activity 分区。
- 场景: 观察当前运行的 subagent、task agent 的活动状态。
- 收益: 实时监控分布式 agent 工作负载和输出。
- 证据: 源码实证（行号未完全确认）

---

## /branch（别名: /rewind）
- 描述: "Rewind to a previous message, keeping the old path as a branch"
- ACP: 不可用（无 `handle`）
- TUI: 专属（只有 `handleTui`）
- 子命令: 无
- 机制:
  - 调用 `runtime.ctx.showUserMessageSelector()` → `SelectorController.showUserMessageSelector`（modes/controllers/selector-controller.ts:1273-1310），从 `sessionManager.getBranch()` 过滤出 message 条目，创建 `RewindSelectorComponent` 全屏 overlay，用户选择消息后调用 `#rewindFromTranscript(entryId, done)` 回退到该消息点，旧路径保留为 branch。
  - 快捷键映射：`app.session.fork` 键绑定到 `showUserMessageSelector`，modes/controllers/input-controller.ts:557。
- 场景: 想从对话中间某条消息重新尝试不同方向，同时保留原有对话分支。
- 收益: 非破坏性时间旅行，支持多分支并行探索。
- 证据: 源码实证

---

## /fork
- 描述: "Create a new fork from a previous message"
- ACP: 不可用（无 `handle`）
- TUI: 专属（只有 `handleTui`）
- 子命令: 无
- 机制:
  - 调用 `runtime.ctx.handleForkCommand()` → `CommandController.handleForkCommand`（modes/controllers/command-controller.ts:1112-1129），检查非 streaming 后调用 `session.fork()` 创建新会话文件（从当前 leaf 复制），成功后刷新状态栏并显示确认消息。
- 场景: 基于当前会话的某个状态点创建独立副本，用于实验性修改。
- 收益: 快速克隆会话上下文，主会话不受影响。
- 证据: 源码实证

---

## /tree
- 描述: "Navigate session tree (switch branches)"
- ACP: 不可用（无 `handle`）
- TUI: 专属（只有 `handleTui`）
- 子命令: 无
- 机制:
  - 调用 `runtime.ctx.showTreeSelector()` → `SelectorController.showTreeSelector`（modes/controllers/selector-controller.ts:1462-1590，未完全读取），获取 `sessionManager.getTree()` 和 `getLeafId()`，用 `TreeSelectorComponent` 展示会话树；选择节点后可能触发 branch summarization（按 `branchSummary.enabled` 设置），支持 Shift+Enter 预答 "Summarize"。
  - 快捷键：`app.session.tree` 键绑定到 `showTreeSelector`，modes/controllers/input-controller.ts:554。
- 场景: 在复杂多分支会话中切换分支、查看历史路径。
- 收益: 可视化会话树导航，支持分支摘要以减少上下文膨胀。
- 证据: 源码实证（具体行号未完全确认）

---

## /login
- 描述: "Login with OAuth provider"
- ACP: 不可用（无 `handle`）
- TUI: 专属（只有 `handleTui`）
- 子命令: 无（参数：`[provider|redirect URL]`）
- 机制:
  - 调用 `SelectorController.showOAuthSelector(mode, providerId)`（modes/controllers/selector-controller.ts:2136-2192，未完全读取）。
  - 若参数匹配已知 provider id → 启动该 provider 的登录流；若参数是 URL → 作为 OAuth callback 提交给 `oauthManualInput.submit(args)`；无参数 → 打开 provider 选择器。
  - 防重入：若已有 pending OAuth 登录，提示用户粘贴 redirect URL。
- 场景: 为当前会话添加 OAuth 凭证（Codex、Claude、OpenCode 等）。
- 收益: 内置 OAuth 流程，无需手动配置 API key。
- 证据: 源码实证（具体行号未完全确认）

---

## /logout
- 描述: "Logout from OAuth provider"
- ACP: 不可用（无 `handle`）
- TUI: 专属（只有 `handleTui`）
- 子命令: 无（参数：`[provider]`）
- 机制:
  - 调用 `SelectorController.showOAuthSelector("logout", providerId)`（modes/controllers/selector-controller.ts:2136-2192）。
  - 若指定 provider → 直接进入该 provider 的登出流程；无参数 → 打开选择器让用户挑选。
- 场景: 切换账户、清理凭证、解决 auth 冲突。
- 收益: 安全移除本地存储的 OAuth token。
- 证据: 源码实证（具体行号未完全确认）

---

## /mcp
- 描述: "Manage MCP servers (add, list, remove, test)"
- ACP: 可用（有 `handle`）
- TUI: 可用（有 `handleTui`）
- 子命令:
  - `add <name> [--scope project|user] [--url <url> --transport http|sse] [--token <token>] [-- <command...>]` — 添加 MCP server（stdio/http/sse），helpers/mcp.ts:326-346
  - `list` — 列出所有配置的 server（合并 user + project 配置），helpers/mcp.ts:390-427
  - `remove <name> [--scope project|user]` — 移除 server，helpers/mcp.ts:468-479
  - `test <name>` — 测试连接并列出 tools 数量，helpers/mcp.ts:285-302
  - `reauth <name>` — TUI 专属：重新授权 OAuth
  - `unauth <name>` — TUI 专属：移除 OAuth 授权
  - `enable <name>` — 启用 server，helpers/mcp.ts:440-466
  - `disable <name>` — 禁用 server，helpers/mcp.ts:440-466
  - `smithery-search <keyword>` — 搜索 Smithery registry，helpers/mcp.ts:348-388
  - `smithery-login` — TUI 专属：登录 Smithery
  - `smithery-logout` — TUI 专属：登出 Smithery
  - `reconnect <name>` — TUI 专属：重连指定 server
  - `reload` — 强制重载 MCP runtime tools，helpers/mcp.ts:511
  - `resources` — 列出所有 connected server 的 resources，helpers/mcp.ts:252-268
  - `prompts` — 列出所有 connected server 的 prompts，helpers/mcp.ts:270-283
  - `notifications` — TUI 专属：显示通知能力和订阅
  - `help` — 显示帮助
- 机制:
  - ACP：由 `handleMcpAcp` 统一分发（helpers/mcp.ts:493-533），按 verb 路由到各 handler。`test/resources/prompts` 通过 `withPreparedMcpConnection` 建立临时连接（注入 authStorage 以支持 OAuth refresh），验证后断开，helpers/mcp.ts:220-247。
  - `list` 读取 user + project 的 MCP 配置文件（`getMCPConfigPath`），合并去重，隐藏 URL 中的 query/userinfo 避免泄露 key，helpers/mcp.ts:390-427。
  - `enable/disable` 先尝试修改 project config，再尝试 user config，最后操作 disabled list，helpers/mcp.ts:440-466。
  - TUI：委托 `runtime.ctx.handleMCPCommand(command.text)` → 新建 `MCPCommandController` 处理，modes/interactive-mode.ts:5662-5664。
  - `TUI_ONLY_MCP_VERBS`（reauth/unauth/smithery-login/smithery-logout/reconnect）在 ACP 返回错误，helpers/mcp.ts:487-490。
- 场景: 配置和管理外部 MCP 工具源（如文件系统、数据库、搜索）；测试连接可用性。
- 收益: 动态扩展 agent 工具集，支持 stdio/SSE/HTTP 三种传输，整合 Smithery 生态。
- 证据: 源码实证

---

## 附：机制来源速查表

| 功能 | 主要实现文件 | 关键函数/行号 |
|------|------------|--------------|
| Todo ACP | slash-commands/helpers/todo.ts | handleTodoAcp :178 |
| Todo TUI | modes/controllers/todo-command-controller.ts | handleTodoCommand :148 |
| Session info TUI | modes/controllers/command-controller.ts | handleSessionCommand :327 |
| Session delete TUI | modes/controllers/selector-controller.ts | handleSessionDeleteCommand :1930 |
| Session pin | slash-commands/builtin-session.ts | handleSessionPinCommand :35 |
| Jobs | session/agent-session.ts | getAsyncJobSnapshot :2053 |
| Usage report | slash-commands/helpers/usage-report.ts | buildUsageReportText :137 |
| Stats dashboard | slash-commands/helpers/stats-dashboard.ts | launchStatsDashboard :62 |
| Context report | slash-commands/helpers/context-report.ts | buildContextReportText :14 |
| MCP ACP | slash-commands/helpers/mcp.ts | handleMcpAcp :493 |
| MCP TUI | modes/interactive-mode.ts | handleMCPCommand :5662 |
| Git TUI | modes/controllers/selector-controller.ts | showGitTui（未读行号） |
| Agent Hub | modes/controllers/selector-controller.ts | showAgentHub :2321 |
| Extensions | modes/controllers/selector-controller.ts | showExtensionsDashboard :416 |
| Agents Dashboard | modes/controllers/selector-controller.ts | showAgentsDashboard :471 |
| Branch/Rewind | modes/controllers/selector-controller.ts | showUserMessageSelector :1273 |
| Tree | modes/controllers/selector-controller.ts | showTreeSelector :1462 |
| Fork | modes/controllers/command-controller.ts | handleForkCommand :1112 |
| Login/Logout | modes/controllers/selector-controller.ts | showOAuthSelector :2136 |


[You have received this identical output 3 times. Re-reading 'agent://SessionCmds?q=.report' will not change it — use a narrower selector (path:A-B), or proceed with the edit.]