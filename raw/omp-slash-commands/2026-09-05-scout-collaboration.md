# OMP 内置 Slash 命令 — Collaboration 组（11 条）

> 源码根：`src/`（相对 `/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/`）
> 调查范围：core registry 内置命令，不含扩展/插件/用户命令。
> ACP 可用性规则（builtin-registry.ts:109-114）：spec 有 `handle` 则 ACP 文本模式可用；只有 `handleTui:` 则 TUI 专属。

---

## /advisor（无别名）
- 描述: Toggle the advisor (a second model that reviews each turn and injects notes)
- 子命令:
  - `on` — Enable the advisor（builtin-collaboration.ts:61）
  - `off` — Disable the advisor（builtin-collaboration.ts:62）
  - `status` — Show advisor status（builtin-collaboration.ts:63）
  - `dump [raw]` — Copy the advisor's transcript to clipboard；`raw` 参数输出未压缩完整版（builtin-collaboration.ts:64）
  - `configure` — Open the advisor configuration editor (TUI)（builtin-collaboration.ts:65）
- 机制:
  - 空参或 `toggle` 时调用 `session.toggleAdvisorEnabled()` 翻转开关，若启用但 advisor 角色未分配模型则提示"configured, but no model assigned"（builtin-collaboration.ts:77-87）
  - `handle`（ACP）与 `handleTui`（TUI）双实现；TUI 下 `configure` 打开交互编辑器 `ctx.showAdvisorConfigure()`，ACP 下仅返回文本提示不可用（builtin-collaboration.ts:111-114, 162-164）
  - `dump` 通过 `session.formatAdvisorHistoryAsText({ compact: !isRaw })` 格式化历史；TUI 版调用 `ctx.handleAdvisorDumpCommand(isRaw)` 写入剪贴板（builtin-collaboration.ts:105-109, 156-160）
- 场景: 需要第二模型实时 review 当前会话每轮输出时启用；想查看 advisor 历史或修改规则配置时使用子命令
- 收益: 每轮对话后获得自动 injected review notes；可 dump 历史用于复盘
- 证据: 源码实证（builtin-collaboration.ts:57-167）

> **注**：目标文件要求列出的子命令含 `export`，但源码 `acpInputHint` 与 `subcommands` 数组均只有 `on|off|status|dump [raw]|configure`，**无 `export` 子命令**，已确认 absence。

---

## /export（无别名）
- 描述: Export session to HTML file
- 子命令: 无显式子命令，参数为可选文件路径与 `--themes` 开关
- 机制:
  - 调用 `parseExportArgs(command.args)` 解析 `[--themes] [path]`（export/html/args.ts:15-20）
  - 若参数为 `--copy`/`clipboard`/`copy` 则拒绝并提示使用 `/dump`（builtin-collaboration.ts:189-191）
  - 实际导出由 `runtime.session.exportToHtml(outputPath, useUserThemes)` 完成，生成自包含 HTML（含高亮、marked、模板 CSS/JS）（builtin-collaboration.ts:192）
  - TUI 版委托 `ctx.handleExportCommand(command.text)`（builtin-collaboration.ts:196-198）
- 场景: 需要把当前会话保存为可分享的离线 HTML 文件
- 收益: 得到一个含完整对话渲染、代码高亮、主题样式的 `.html` 文件
- 证据: 源码实证（builtin-collaboration.ts:185-198, export/html/args.ts）

---

## /trace（无别名）
- 描述: Open this session's trace in the stats dashboard
- 子命令: 无
- 机制:
  - 检查 `runtime.session.sessionFile` 是否存在，若无则提示先发送消息（builtin-collaboration.ts:208-211）
  - 懒加载 `@oh-my-pi/omp-stats` 模块（保持 CLI 启动快），调用 `startServer()` 起本地服务，拼接 URL 并输出（builtin-collaboration.ts:213-220）
  - TUI 版委托 `ctx.handleTraceCommand()`（builtin-collaboration.ts:222-224）
- 场景: 想在浏览器中查看当前会话的 token 消耗、耗时、工具调用等统计 trace
- 收益: 获得一个可点击的 stats dashboard URL，带当前会话过滤参数
- 证据: 源码实证（builtin-collaboration.ts:204-224）

---

## /dump（无别名）
- 描述: Copy session transcript to clipboard (and write LLM request JSON to tmp)
- 子命令: 无
- 机制:
  - 调用 `runtime.session.formatSessionAsText()` 把会话格式化为纯文本（builtin-collaboration.ts:237）
  - 同时尝试 `runtime.session.dumpLlmRequestToTmpDir()` 把当前 LLM 请求 JSON 写入临时目录；失败静默忽略（builtin-collaboration.ts:240-244）
  - ACP 模式下直接输出文本与 sidecar 路径；TUI 版委托 `ctx.handleDumpCommand()` 写入剪贴板（builtin-collaboration.ts:248-250）
- 场景: 需要把完整会话文本复制到剪贴板，或获取最近一次 LLM 请求的原始 JSON 用于调试
- 收益: 剪贴板得到完整 transcript；临时目录得到一份可能含 secrets 的 LLM request JSON
- 证据: 源码实证（builtin-collaboration.ts:230-250）

---

## /share（无别名）
- 描述: Share session via an encrypted link (share server or secret gist)
- 子命令: 无
- 机制:
  - 调用 `shareSession()`（export/share.ts），将会话数据先走 `buildShareSnapshot()` 构建快照，再经 AES-256-GCM 加密 + gzip 密封（export/share.ts:115-503）
  - 默认上传到 share server（`POST <serverUrl>`，上限 1 MB），超大内容会被截断（先删图片、再截长字符串、最后丢弃旧条目）（export/share.ts:130-169）
  - 可选 `store: "gist"`，通过本地 `gh` CLI 创建 secret gist（export/share.ts:135-138, 504-687）
  - 返回的链接格式为 `<serverUrl>/<id>#<base64url-key>`，fragment 中的密钥不离开浏览器（export/share.ts:22-28）
  - 若启用 `share.redactSecrets`，则通过 `SecretObfuscator` 对快照中所有文本字段做脱敏（export/share.ts:37-44）
- 场景: 需要把会话以加密链接形式分享给他人查看
- 收益: 获得一个一次性加密链接， Viewer 页面在浏览器端解密渲染，服务端无法读取内容
- 证据: 源码实证（builtin-collaboration.ts:253-275, export/share.ts）

---

## /collab（无别名）
- 描述: Share this session live via a relay
- 子命令:
  - `view` — Share a read-only link (guests can watch, not prompt)（builtin-collaboration.ts:287）
  - `status` — Show link + participants（builtin-collaboration.ts:288）
  - `stop` — Stop sharing（builtin-collaboration.ts:289）
- 机制:
  - **TUI 专属**，无 `handle`（ACP 不可用）（builtin-collaboration.ts:282-393）
  - `stop` 调用 `ctx.collabHost.stop("host stopped")` 关闭 WebSocket relay 并清理状态（builtin-collaboration.ts:305-312, collab/host.ts:214-226）
  - `status` 列出参与者（含 host/guest/read-only 标识）并显示浏览器 deep link（builtin-collaboration.ts:314-329）
  - 无显式 `start` 子命令：空参或任意非保留词即视为 start；默认使用 `settings.collab.relayUrl`，无 scheme 时补 `wss://`（builtin-collaboration.ts:335-349）
  - 启动后生成 `CollabHost` 实例，通过 WebSocket 向 relay 广播 session 事件、条目、状态、agent 快照、EventBus 流量（collab/host.ts:84-213）
  - 支持读写分离：host 生成含 `writeToken` 的完整链接（可 prompt/abort/agent-cmd）与无 token 的 view 链接（只读）（collab/host.ts:72-83, 353-361）
- 场景: 需要让其他人实时观看或协同操作当前 OMP 会话
- 收益: 得到一个浏览器 deep link + 终端 join 命令；guest 可实时看到对话流、甚至发送 prompt/中断/agent 控制（若持有写链接）
- 证据: 源码实证（builtin-collaboration.ts:282-393, collab/host.ts, collab/protocol.ts）

---

## /join（无别名）
- 描述: Join a shared collab session
- 子命令: 无，参数为 `<link>`
- 机制:
  - **TUI 专属**，无 `handle`（builtin-collaboration.ts:395-418）
  - 解析 link 中的 roomId、key、writeToken，新建 `CollabGuestLink(ctx).join(link)`（builtin-collaboration.ts:411-414, collab/guest.ts:183-280）
  - Guest 端写入 host 的 snapshot 到本地 replica session 文件，通过 `/resume` 机制恢复，随后应用 live frames（entry/event/state/bus）（collab/guest.ts:1-50）
  - Guest 拥有本地 AgentRegistry 镜像（Agent Hub）、可远程 chat/kill/revive agent、读取 transcript（collab/guest.ts:130-172）
  - 若使用 view 链接（无 writeToken），则 guest 为 read-only，所有写操作被本地拒绝（collab/guest.ts:175-182）
- 场景: 作为 guest 加入别人分享的 collab 会话
- 收益: 在本地终端实时同步 host 的对话流，可像操作本地会话一样查看、甚至参与（若链接可写）
- 证据: 源码实证（builtin-collaboration.ts:395-418, collab/guest.ts）

---

## /leave（无别名）
- 描述: Leave the collab session
- 子命令: 无
- 机制:
  - **TUI 专属**，无 `handle`（builtin-collaboration.ts:420-442）
  - 若为 guest：调用 `ctx.collabGuest.leave("left")`，恢复之前的 session 文件（collab/guest.ts:183-280 中的 `#returnSessionFile`）
  - 若为 host：调用 `ctx.collabHost.stop("host stopped")` 停止广播并断开所有 guest（builtin-collaboration.ts:432-436）
- 场景: 退出当前 collab 会话（guest 离开 或 host 结束分享）
- 收益: Guest 回到原会话；Host 停止分享，所有连接断开
- 证据: 源码实证（builtin-collaboration.ts:420-442, collab/guest.ts）

---

## /browser（无别名）
- 描述: Toggle browser eval-prelude headless vs visible mode
- 子命令:
  - `headless` — Switch to headless mode（builtin-collaboration.ts:427）
  - `visible` — Switch to visible mode（builtin-collaboration.ts:428）
- 机制:
  - 同时提供 `handle`（ACP）与 `handleTui`；空参时翻转当前 `browser.headless` 设置（builtin-collaboration.ts:437-453, 466-482）
  - 修改设置后调用 `restartBrowserForModeChange()` 重启浏览器进程以应用模式变更（builtin-collaboration.ts:454, 483）
  - 若重启失败，设置已被修改但浏览器处于不一致状态，向用户提示警告（builtin-collaboration.ts:455-461, 484-490）
  - 支持别名参数：`hidden`=`headless`、`show`/`headful`=`visible`（builtin-collaboration.ts:444-446, 473-475）
  - 若 `browser.enabled` 为 false，拒绝操作并提示去 settings 启用（builtin-collaboration.ts:439-442, 468-471）
- 场景: 需要切换浏览器自动化工具的运行模式（可见窗口 vs 无头）
- 收益: 即时切换并重启浏览器进程，无需手动改配置文件
- 证据: 源码实证（builtin-collaboration.ts:424-497）

---

## /copy（无别名）
- 描述: Pick text or code from the conversation to copy
- 子命令: 无显式声明，运行时识别 `code`/`cmd`/`command`/`link`/`url`
- 机制:
  - **TUI 专属**，无 `handle`（builtin-collaboration.ts:499-541）
  - 空参时打开 `ctx.showCopySelector()` 交互选择器（builtin-collaboration.ts:501-504）
  - `code`：调用 `extractLastCodeBlock()` 从 messages 中提取最后一个代码块，写入剪贴板（builtin-collaboration.ts:506-513）
  - `cmd`/`command`：调用 `extractLastCommand()` 提取最后一条 bash/eval 命令，写入剪贴板（builtin-collaboration.ts:515-523）
  - `link`/`url`：调用 `extractLastLink()` 提取最后一个链接，写入剪贴板（builtin-collaboration.ts:525-532）
- 场景: 快速把对话中最近出现的代码块、命令或链接复制到剪贴板
- 收益: 不用手动选中，一键复制最近的相关内容
- 证据: 源码实证（builtin-collaboration.ts:499-541）

---

## /open（无别名）
- 描述: Open the last link from the conversation in your browser (or pick one with /copy)
- 子命令: 无，可选参数 `link`/`url`
- 机制:
  - **TUI 专属**，无 `handle`（builtin-collaboration.ts:543-566）
  - 调用 `extractLastLink(runtime.ctx.session.messages)` 提取最近一个链接，再通过 `openPath(link.href)` 打开系统默认浏览器（builtin-collaboration.ts:554-560）
  - 若参数非空且不是 `link`/`url`，提示正确用法（builtin-collaboration.ts:545-549）
- 场景: 想快速打开对话中最近出现的一个 URL
- 收益: 无需手动复制粘贴到浏览器，一键打开
- 证据: 源码实证（builtin-collaboration.ts:543-566）

---

## 附录：ACP 可用性汇总

| 命令 | ACP (`handle`) | TUI (`handleTui`) | 备注 |
|------|----------------|-------------------|------|
| /advisor | ✅ | ✅ | |
| /export | ✅ | ✅ | |
| /trace | ✅ | ✅ | |
| /dump | ✅ | ✅ | |
| /share | ✅ | ✅ | |
| /collab | ❌ | ✅ | 仅 TUI |
| /join | ❌ | ✅ | 仅 TUI |
| /leave | ❌ | ✅ | 仅 TUI |
| /browser | ✅ | ✅ | |
| /copy | ❌ | ✅ | 仅 TUI |
| /open | ❌ | ✅ | 仅 TUI |
