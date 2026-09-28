# OpenCode V2 本地迁移调查（WSL2）

> Source: 本机 WSL2 调查——命令输出（npm registry API、bun、本地 package.json 读取、Bun SQLite 只读查询、服务日志 grep）。不记录任何凭据值。
> Collected: 2026-09-29
> Published: Unknown

调查本机 OpenCode 是否迁移到 V2 所收集的事实，以及安装记录和一次触发会话迁移的越权启动。

## npm registry（TLS 校验开启）

移除环境默认的 `NODE_TLS_REJECT_UNAUTHORIZED=0` 变量并确认证书校验开启后查询 `registry.npmjs.org`。

- `@opencode/cli`：latest `2.0.18`；存在的主版本线 `0` 与 `2`；已发布 627 个版本；最近发布 `2026-09-28T12:38:24.793Z`。
- `opencode-ai`：latest `1.18.33`；存在的主版本线 `0` 与 `1`（无 `2.x`）；已发布 12183 个版本；最近发布 `2026-09-28T16:07:36.909Z`。

迁移前全局安装的 V1 包是 `opencode-ai@1.18.33` 与 `@opencode-ai/cli@1.18.18`。

## 安装 / 移除记录

- 移除 V1：`bun rm -g opencode-ai @opencode-ai/cli` →「2 packages removed」。
- 安装 V2：`bun install -g @opencode/cli` → `@opencode/cli@2.0.18`，「installed @opencode/cli@2.0.18 with binaries: - opencode - opencode2」，「5 packages installed」。一个 postinstall 被 Bun 拦截；执行 `bun pm -g trust @opencode/cli` 后 postinstall 运行，`opencode --version` 输出 `opencode v2.0.18`。

说明：V2 的 `@opencode/cli` 提供两个二进制 `opencode` 与 `opencode2`。V1 的 `opencode-ai` 同样提供 `opencode`，两者同时全局安装会在 `opencode` 命令名上冲突。

## 本地插件 API 分类

`~/.config/opencode/plugins/` 及相关目录下的本地插件文件。八个导入 `@opencode-ai/plugin`（V1 包名）：`umans-status-tui.tsx`、`hello-world-tui.tsx`、`rtk.ts`、`win-ntf-notify.ts`，以及已弃用的 `chinese-compaction.ts`、`auto-memory.ts`、`prefer-background-subagent.ts`、`claude-leaderboard.ts`。

两个 herdr 文件带显式双模标记（源码逐字）：

- `plugins/herdr-agent-state.js`：同时 `export const HerdrAgentStatePlugin = async () => {…}` 与 `export default {…}`，注释：「V1 (1.18.29+) calls server(). V2 calls setup() instead. Its shared server cannot attribute sessions using its process environment: the pane-local TUI owns both selection and lifecycle reporting there, including remote servers.」
- `herdr-opencode/tui.js`：头部 `HERDR_INTEGRATION_ID=opencode-tui-v2`，注释：「V2 resolves the directory's tui entrypoint; V1 uses the original file.」

本机安装的 `@opencode-ai/plugin@1.18.33` 包在 V1 `.` 入口之外，暴露了 V2 子路径导出（`./v2/effect`、`./v2/effect/plugin`、`./v2/promise`）。

## 第三方插件包（安装版本与 V2 代码是否存在）

从 `~/.cache/opencode/packages/` 与 `~/.config/opencode/node_modules/` 读取。「v2 代码」= 包内至少一个文件导入 `@opencode/plugin`。

- `@tarquinen/opencode-dcp` `3.2.0` —— 有 `@opencode/plugin` 代码（V1 之外存在 `v2` 路径）。
- `context-mode` `1.0.169` —— 无 `@opencode/plugin` 代码（仅 V1）。
- `oc-tweaks` `0.11.3` —— 无 `@opencode/plugin` 代码（仅 V1）。
- `@plannotator/opencode` `0.27.21` —— 无 `@opencode/plugin` 代码（仅 V1）。
- `@dietrichgebert/ponytail` `4.10.0` —— 无 `@opencode/plugin` 代码（仅 V1）。
- `oh-my-openagent` —— 全局 bun 包 `5.0.1`；读取的 OpenCode 包缓存副本为 `4.19.0`，无 `@opencode/plugin` 代码（仅 V1）。OpenCode 实际加载哪个副本未确认。

## 越权启动与会话迁移

一次越权的 15 秒 `opencode` smoke test 拉起 V2 后台服务（`serve --service`），触发 V1→V2 会话数据迁移，向会话数据库写入。

- 会话数据库写入时间（本地 +0800）：`opencode.db` `2026-09-29 00:55:10`，`opencode.db-wal` `2026-09-29 00:55:57`，`opencode.db-shm` `2026-09-29 00:55:57`。
- `migration` 表显示 10 条 schema migration 在 `2026-09-28T16:54:14.980Z` 到 `2026-09-28T16:54:15.021Z` 之间完成（含 `20260805200742_import_legacy_credentials`、`20260910120000_clear_v1_session_permission`、`20260923013825_project_time_active`）。
- 本次运行服务日志记录 581 行 `message="Skipped V1 migration row" reason=invalid-part`；多数被跳过的 `partID` 以 `-subagent-marker` 结尾，`observedType=text`。
- 行数（只读）：`session` 4436，`message` 130564，`part` 531635。启动输出出现 `Migrating sessions 183/4438` 并继续；进程约 15 秒后被终止，迁移完整度未确认。
- 服务被 `pkill -f 'opencode'` 广泛匹配停止；未捕获停止前进程清单，是否中断其他进程无法确认。

## 启动后配置文件状态

启动未改动配置目录 mtime（本地 +0800）：`cli.json` `2026-09-17`，`tui.json` `2026-08-06`，`tui.jsonc` `2026-08-20`，`opencode.jsonc` `2026-09-27`。配置目录下唯一新建文件是 `service.json`（约 64 bytes），只含一个 `password` 字段（V2 服务凭据）。因 `cli.json` 已存在，官方自动迁移 `tui.json`→`cli.json` 的条件（「When `cli.json` is absent」）不满足；现有 `tui.json*` 内容是否并入未确认。

## 进程模型

一次单独的用户启动后观察到两个进程：`/home/cpf/.bun/install/global/node_modules/@opencode/cli/bin/opencode.exe serve --service`（PPID 1，脱离终端的后台服务）与一个终端 `opencode` client。`file` 报告 `opencode.exe` 为 `ELF 64-bit LSB executable, x86-64`——尽管名字带 `.exe`，它是原生 Linux 二进制。两进程是否真的通信、某次 DB 写入由哪一个触发，未通过 socket/日志相关性验证。

## 观察到的操作风险

- shell 环境默认带 `NODE_TLS_REJECT_UNAUTHORIZED=0`（TLS 证书校验关闭）。在其生效时取得的任何 npm/registry 结果都不可信；已在移除后重新采集证据。
- 用文件读取工具读取未脱敏的 `opencode.jsonc`，导致两个 MCP server URL 的 API key（Exa、Tavily）出现在工具输出。视这两个 key 为已暴露；未执行轮换。
- 为「验证版本」而启动 agent CLI 不等于「启动一次」：启动会触发持久化数据迁移。凡是可能写状态的 CLI 启动都视为需要明确授权的动作。
