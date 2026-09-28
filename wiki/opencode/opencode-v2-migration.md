# OpenCode V2 迁移：发布、破坏变更与本机兼容性

> Sources: OpenCode docs, 2026-09-29; Local investigation, 2026-09-29
> Raw: [从 V1 迁移（官方）](../../raw/opencode/2026-09-29-opencode-v2-migrate-v1-official.md); [本地迁移调查](../../raw/opencode/2026-09-29-opencode-v2-local-migration-audit.md)
> Updated: 2026-09-29

## 概览

OpenCode V2 以新的 npm 包 `@opencode/cli` 发布（latest `2.0.18`，最近发布 `2026-09-28`）；V1 包 `opencode-ai` 无 `2.x` 线，停在 `1.18.33`。V2 自动归一化大部分 V1 配置（providers、models、agents、commands、skills、instructions、provider 过滤），但强制三个有意的破坏变更：插件 API、server API/client 合约、终端配置模型。它保留 `lsp` 配置但不运行语言服务器。迁移的真正阻碍是插件：本机 8 个插件文件用 V1 插件包，6 个第三方插件包中 5 个没有 V2 代码。启动一次 V2 会触发 V1→V2 会话数据库迁移并写入，所以这次切换不是纯配置替换。

## 包与二进制

- V2 包：`@opencode/cli`，npm latest `2.0.18`（627 个版本，主版本线 `0` 与 `2`，最近发布 `2026-09-28T12:38:24.793Z`）。
- V1 包：`opencode-ai`，npm latest `1.18.33`（主版本线 `0` 与 `1`，无 `2.x`）。迁移前全局安装是 `opencode-ai@1.18.33` + `@opencode-ai/cli@1.18.18`。
- `@opencode/cli` 安装两个二进制 `opencode` 与 `opencode2`。V1 的 `opencode-ai` 同样提供 `opencode`，两者同时全局安装会在 `opencode` 命令名上冲突。
- 官方安装说明：「OpenCode 1 and OpenCode 2 both use the `opencode` command and are no longer installed side by side by default. Remove a package-managed V1 installation before installing V2; the V2 curl installer replaces the V1 binary.」验证阶段官方建议「Keep a copy of your V1 setup while validating the migration.」

## 三个有意的破坏变更

官方把这三点定性为有意，而非回归：

1. **插件 API。**「V1 plugin implementations do not run in V2. Moving a file or renaming its config entry is not enough.」配置键 `plugin`→`plugins`；entrypoints、hooks、tools、events 与 package exports 都要按 plugin migration guide 移植。V2 入口是 `setup()` 函数，V1 用的是 `server()`（本机一个双模 herdr 插件注释可证：「V1 (1.18.29+) calls server(). V2 calls setup() instead.」）。
2. **server API / clients。**「OpenCode 2 has a revised, more ergonomic server API and a new set of clients. Integrations that call the V1 server API must migrate to the V2 API.」V1 顶层 `server` 字段现在被接受但忽略并告警。
3. **终端配置模型。** V2 用一个全局 `~/.config/opencode/cli.json` 取代分层的 `tui.json(c)`，该文件归终端 client 所有，后台服务不加载它。

架构上 V2 从 V1 的单进程模型改为后台服务 + client 模型（后台服务持有 sessions、plugins、permissions、tools 等共享状态；此因果框架为推断，官方页面只把三处列为有意破坏变更，未逐字陈述该动因）。本机可见 `opencode.exe serve --service` 脱离终端运行（PPID 1），另有一个终端 client。（`opencode.exe` 是原生 `ELF 64-bit LSB executable`；`.exe` 只是文件名，不是 Windows 二进制。）

## 配置兼容（多数自动）

无需重写、自动归一化：`shell`、`model`、`default_agent`、`watcher`、`formatter`、`instructions`、`enterprise`、`tool_output`；provider 过滤（`enabled_providers`、`disabled_providers`、`autoupdate`、`small_model`）映射到 policies；`provider`→`providers`、`reference`→`references`、模型字段改名（`id`→`modelID`、`cache_read/write`→`cache.read/write`、变体对象→数组）。agent/command/skill/AGENTS 文件在新旧目录名下都被发现。

**接受但忽略（会告警）：** `logLevel`、`server`、顶层 `subagent_depth`、`compaction.tail_turns` 与 `compaction.prune`（V2 用 `compaction.keep.tokens` 与 checkpoint 压缩），以及若干 V1 experimental/provider/model 字段。

### LSP 被保留但不生效

> "V2 accepts and preserves `lsp` configuration, but it does not run language servers, expose LSP tools, or produce LSP diagnostics. Replace workflows that depend on those capabilities with the project's lint, typecheck, or compiler commands."

官方没有说 LSP 无用，也没有宣布永久移除；只声明当前 V2 运行时不运行它。「为什么移除」在该来源中未说明。

### tui.json 迁移是有条件的

自动 `tui.json`→`cli.json` 迁移只在「When `cli.json` is absent」时发生。在已存在 `cli.json` 的机器上该条件不满足，现有 `tui.json*` 内容是否并入未确认。

## 本机插件兼容性

| 插件 | 版本 | 状态 | 证据 |
|------|------|------|------|
| `umans-status-tui`、`hello-world-tui`、`rtk`、`win-ntf-notify`、`chinese-compaction`、`auto-memory`、`prefer-background-subagent`、`claude-leaderboard` | 本地文件 | 需重写 | 导入 `@opencode-ai/plugin`（V1 包） |
| `herdr-agent-state.js`、`herdr-opencode/tui.js` | 本地文件 | 已双模 | 同时导出 `server()`/`setup()`；带 `opencode-tui-v2` 标记 |
| `@tarquinen/opencode-dcp` | `3.2.0` | 有 V2 代码 | 存在导入 `@opencode/plugin` 的文件 |
| `context-mode` | `1.0.169` | 仅 V1 | 无 `@opencode/plugin` 代码 |
| `oc-tweaks` | `0.11.3` | 仅 V1 | 无 `@opencode/plugin` 代码 |
| `@plannotator/opencode` | `0.27.21` | 仅 V1 | 无 `@opencode/plugin` 代码 |
| `@dietrichgebert/ponytail` | `4.10.0` | 仅 V1 | 无 `@opencode/plugin` 代码 |
| `oh-my-openagent` | 全局 `5.0.1` / 缓存 `4.19.0` | 仅 V1 | 无 `@opencode/plugin` 代码；实际加载副本未确认 |

官方建议的迁移验证：在一个项目里检查 model、provider credentials、agents、permissions、MCP servers、plugins，再依赖 V2。

## 启动触发会话数据库迁移（写入）

即便短暂启动 V2 也会运行 V1→V2 会话数据库迁移并写入：

- DB 写入时间（本地 +0800）：`opencode.db` `2026-09-29 00:55:10`，`opencode.db-wal`/`-shm` `2026-09-29 00:55:57`。
- 10 条 schema migration 在 `2026-09-28T16:54:14.980Z`–`2026-09-28T16:54:15.021Z` 完成（如 `import_legacy_credentials`、`clear_v1_session_permission`）。
- 581 行日志 `Skipped V1 migration row`（`reason=invalid-part`，多为 `-subagent-marker` part）——部分 V1 数据未迁入。
- 行数：`session` 4436，`message` 130564，`part` 531635。启动显示 `Migrating sessions 183/4438` 后被约 15 秒终止，完整度未确认。
- 配置目录唯一新文件：`service.json`（约 64 bytes，单个 `password` 服务凭据）。它是运行时 secret，不应纳入版本控制。`opencode.jsonc`/`cli.json`/`tui.json*` 的 mtime 未变（V2 归一化在读取时进行，不回写）。

实践含义：把任何 V2 启动都当作会写状态、需要授权的动作；若 V1 历史重要，先备份 `opencode.db*` 再让迁移运行。

## 本次迁移暴露的操作风险

- shell 默认带 `NODE_TLS_REJECT_UNAUTHORIZED=0`（TLS 校验关闭）。生效期间取得的任何 npm/registry 证据不可信；移除后需重新采集。
- 用文件读取工具读取未脱敏的 `opencode.jsonc`，把两个 MCP URL 的 API key（Exa、Tavily）泄漏进工具输出。读取 agent 配置只能走脱敏脚本，输出键名与结构，绝不输出原始值。

## See Also

- [OMO Native vs plugin](../ai-coding-agents/omo-native-vs-plugin.md)
