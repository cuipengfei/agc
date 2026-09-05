# OMP 内置 Slash 命令 —— Marketplace / Control 组

> 源码根：/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/
> 文件：slash-commands/builtin-marketplace.ts + slash-commands/builtin-control.ts

---

## /marketplace（无别名）

- **描述:** Manage marketplace plugin sources and installed plugins
- **ACP 可用:** 是（既有 handle 也有 handleTui）
- **子命令:**
  - add <source> — 添加一个 marketplace 源（如 owner/repo），builtin-marketplace.ts:97
  - remove <name> / rm — 移除指定名称的 marketplace 源，builtin-marketplace.ts:98
  - update [name] — 重新拉取指定或全部 marketplace 的插件目录，builtin-marketplace.ts:99
  - list — 列出已配置的 marketplace 源，builtin-marketplace.ts:100
  - discover [marketplace] — 浏览某个/全部 marketplace 中的可用插件，builtin-marketplace.ts:101
  - install [--force] [--scope user|project] <name@marketplace> — 安装插件；TUI 无参时打开交互式插件浏览器，builtin-marketplace.ts:102-103
  - uninstall [--scope user|project] <name@marketplace> — 卸载插件；TUI 无参时打开交互式卸载选择器，builtin-marketplace.ts:104
  - installed — 列出已安装的市场插件，builtin-marketplace.ts:105
  - upgrade [name@marketplace] — 升级指定或全部过时插件，builtin-marketplace.ts:106
  - help — 显示用法指南，builtin-marketplace.ts:107
- **机制:**
  - ACP 文本模式通过 createMarketplaceManager(runtime) 创建管理器（builtin-marketplace.ts:127），再按子命令分发到 MarketplaceManager 的增删改查/安装/卸载/升级方法；操作成功后调用 runtime.reloadPlugins() 使变更生效（install/uninstall/upgrade 路径）。
  - TUI 模式下无参或 /marketplace install 无参时，调用 runtime.ctx.showPluginSelector("install") 打开图形化插件浏览器（builtin-marketplace.ts:224-232）；/marketplace uninstall 无参时同理打开卸载选择器（builtin-marketplace.ts:374）。
  - reloadPlugins() 会触发 reloadTuiPluginState，其内部清理插件根目录缓存、重新发现技能/文件 slash 命令/任务 agent、重置 capability 缓存、重连 MCP 服务器（builtin-marketplace.ts:22-34）。
- **场景:** 需要浏览/安装/卸载/升级来自远程 marketplace（如 anthropics/claude-plugins-official）的插件时。
- **收益:** 用户无需手动编辑配置文件即可管理第三方插件源和插件生命周期，安装后即时生效。
- **证据:** 源码实证

---

## /plugins（无别名）

- **描述:** View and manage installed plugins
- **ACP 可用:** 是
- **子命令:**
  - list — 列出所有已安装插件（npm + marketplace），builtin-marketplace.ts:393
  - enable <name@marketplace> — 启用某个被禁用的 marketplace 插件，builtin-marketplace.ts:394
  - disable <name@marketplace> — 禁用某个 marketplace 插件，builtin-marketplace.ts:395
- **机制:**
  - handle 通过 parseSubcommand 解析子命令（builtin-marketplace.ts:398）。enable/disable 调用 MarketplaceManager.setPluginEnabled() 并随后 runtime.reloadPlugins()（builtin-marketplace.ts:405-409）。
  - 默认行为（无子命令或 list）列出两类插件：npm 插件（通过 PluginManager.list() 获取）和 marketplace 插件（通过 MarketplaceManager.listInstalledPlugins() 获取），并标注 disabled/shadowed 状态（builtin-marketplace.ts:411-429）。
  - TUI 模式的 handleTui 逻辑与 handle 对应，但输出到状态栏（runtime.ctx.showStatus）（builtin-marketplace.ts:441-489）。
- **场景:** 想快速查看当前装了哪些插件、或临时启用/禁用某个 marketplace 插件而不卸载时。
- **收益:** 一站式查看 npm 与 marketplace 插件的混合清单，支持快速启停。
- **证据:** 源码实证

---

## /reload-plugins（无别名）

- **描述:** Reload all plugins (skills, commands, hooks, tools, agents, MCP)
- **ACP 可用:** 是
- **子命令:** 无
- **机制:**
  - ACP 文本模式直接调用 runtime.reloadPlugins()，然后输出 "Plugins reloaded."（builtin-marketplace.ts:497-500）。
  - TUI 模式调用 reloadTuiPluginState()，该函数依次：清理插件根缓存 → 刷新 agent 发现 → 刷新技能状态 → 刷新 slash 命令状态 → 重置 capability → 重连 MCP 服务器（builtin-marketplace.ts:504-507、22-34）。
- **场景:** 手动修改了插件文件、或 marketplace 操作后想要立即生效而不重启 OMP 时。
- **收益:** 热重载插件运行时，无需退出 OMP 即可使技能、命令、MCP 等变更生效。
- **证据:** 源码实证

---

## /force（别名: force:）

- **描述:** Force next turn to use a specific tool
- **ACP 可用:** 是（文本模式）；TUI 有独立的 handleTui
- **子命令:** 无
- **机制:**
  - 解析命令参数：空格前为 toolName，空格后为可选 prompt（builtin-control.ts:21-23、35-37）。
  - 调用 runtime.session.setForcedToolChoice(toolName) 强制下一轮模型调用使用该工具（builtin-control.ts:26、42）。
  - 若提供了 prompt，则作为 { prompt } 返回供后续流程使用；否则返回 commandConsumed()（builtin-control.ts:29-30、49-50）。
  - TUI 下若未提供 toolName 则显示错误并清空编辑器（builtin-control.ts:38-40）。
- **场景:** 需要强制模型下一轮必须使用某个特定工具（如覆盖自动工具选择）时。
- **收益:** 精确控制下一轮的工具调用目标，可附带自定义 prompt。
- **证据:** 源码实证

---

## /live（无别名）

- **描述:** Start Codex-backed realtime voice mode
- **ACP 可用:** 否（仅 TUI；无 handle，只有 handleTui）
- **子命令:** 无
- **机制:**
  - 清空编辑器文本，调用 runtime.ctx.handleLiveCommand() 启动实时语音会话（builtin-control.ts:56-59）。
  - 未确认 handleLiveCommand 的具体实现路径（不在本文件内）。
- **场景:** 在 TUI 环境下需要语音交互时。
- **收益:** 进入 Codex 支持的实时语音模式。
- **证据:** 源码实证（入口）；handleLiveCommand 内部实现未确认

---

## /pause（无别名）

- **描述:** Freeze all agents (main, subagents, advisor) until resumed
- **ACP 可用:** 否（仅 TUI；无 handle，只有 handleTui）
- **子命令:** 无
- **机制:**
  - 清空编辑器文本，调用 runPauseScreen(runtime.ctx) 显示暂停界面（builtin-control.ts:62-65）。
  - 未确认 runPauseScreen 的恢复逻辑细节（不在本文件内）。
- **场景:** 需要临时冻结所有 agent 活动（主 agent、子 agent、advisor）时。
- **收益:** 暂停整个 agent 运行时，防止任何自动执行继续。
- **证据:** 源码实证（入口）；runPauseScreen 内部实现未确认

---

## /quit（别名: q）

- **描述:** Quit the application
- **ACP 可用:** 否（仅 TUI；无 handle，只有 handleTui）
- **子命令:** 无
- **机制:**
  - 直接委托给 shutdownHandlerTui（builtin-control.ts:68），该函数定义在 builtin-lifecycle.ts 中（本文件未展开）。
  - 未确认具体是优雅关闭还是强制退出。
- **场景:** 退出 OMP TUI 会话。
- **收益:** 关闭应用程序。
- **证据:** 源码实证（入口）；shutdownHandlerTui 内部实现未确认

---

*文件生成完毕，共覆盖 7 条顶层命令。*
