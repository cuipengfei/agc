# OpenCode 从 V1 迁移（官方）

> Source: https://opencode.ai/v2/docs/migrate-v1
> Collected: 2026-09-29
> Published: Unknown

官方 OpenCode V2「Migrate from V1」页面的逐字摘录。已清理导航噪声；技术正文按读取原样保留（英文原文）。

## 安装与并存（Migrate from V1 / Install V2）

> OpenCode 1 and OpenCode 2 both use the `opencode` command and are no longer installed side by side by default. Remove a package-managed V1 installation before installing V2; the V2 curl installer replaces the V1 binary.

实用迁移步骤（逐字）：

1. Keep your existing configuration and file-based definitions.
2. Start V2 and verify models, credentials, agents, permissions, and MCP servers.
3. Port plugins, because V1 plugin implementations do not run in V2.
4. Port integrations that call the server API.
5. Convert configuration to the native V2 shape when you are ready. This step is optional.

> Keep a copy of your V1 setup while validating the migration. V1 and V2 use the same configuration locations, so do not point V1 at files after converting them to native V2-only shapes.

## 保留但无原生等价字段（Supported fields without direct native equivalents）

> Most fields that keep the same shape, including `shell`, `model`, `default_agent`, `watcher`, `formatter`, `instructions`, `enterprise`, and `tool_output`, require no migration.

> V2 accepts and preserves `lsp` configuration, but it does not run language servers, expose LSP tools, or produce LSP diagnostics. Replace workflows that depend on those capabilities with the project's lint, typecheck, or compiler commands.

V1 的 provider 过滤字段没有一对一的原生 V2 配置字段，但行为通过 policies 保留：

- `enabled_providers` becomes an internal deny-by-default provider policy followed by allows for the listed providers.
- `disabled_providers` becomes internal deny policies for the listed providers.
- `autoupdate` becomes `update`: `false` maps to `"disable"`, `"notify"` maps to `"notify"`, and `true` maps to `"auto"`.
- `small_model` becomes the `model` selection for the built-in `title` agent. Native V2 configuration should use `agents.title.model` instead.

> You may keep these fields in V1 syntax. OpenCode normalizes them without warning.

## 接受但不支持的字段（Accepted but unsupported fields）

> The V1 schema also accepted fields that have no supported V2 behavior. V2 ignores these values and emits a warning so they are not mistaken for active configuration:

- `logLevel`: use `OPENCODE_LOG_LEVEL` when starting OpenCode.
- `server`: use the V2 service and explicit server options; the server API is an intentional breaking change.
- Top-level `subagent_depth`: use `experimental.subagent_depth` instead.
- `compaction.tail_turns` and `compaction.prune`: V2 uses `compaction.keep.tokens` and checkpoint-based compaction instead.
- Agent `name` inside V1 JSON configuration.
- An enabled-only V1 MCP entry without a `type`.
- V1 experimental fields `batch_tool`, `openTelemetry`, `primary_tools`, and `continue_loop_on_deny`.
- V1 provider fields `id`, `whitelist`, and `blacklist`.
- V1 provider-model fields `release_date`, `attachment`, `reasoning`, `temperature`, `experimental`, a non-`deprecated` `status`, and boolean `interleaved`.

> Ignoring these fields is intentional and is not a compatibility regression. If V2 does not preserve behavior identified as supported elsewhere in this guide, follow the issue-reporting guidance in Troubleshooting.

## Provider、模型、变体的重命名

- 单数 `provider` 映射改名 `providers`。V1 `npm` 改为 `package`（AI SDK 包加 `aisdk:` 前缀）；`api` 改为 `settings.baseURL`；provider `options` 拆分为 `settings`、`headers`、`body`。
- 模型：`id` 改 `modelID`；`tool_call` 与 `modalities` 改 `capabilities.tools` / `capabilities.input` / `capabilities.output`；`status` 为 `"deprecated"` 改 `disabled: true`；`cache_read`/`cache_write` 移到 `cache.read`/`cache.write`；V1 变体对象改为带 `id` 的 V2 数组。
- 单数 `reference` 映射改名 `references`（V1 已接受 `references`）。

## Agent / command / skill / instruction 文件

- V1 agent 文件可位于 `agent/`、`agents/`、`mode/`、`modes/`；V2 仍全部发现。首选 `.opencode/agents/<name>.md`。V2 自动翻译旧 agent frontmatter，编辑为可选。
- V1 command 文件可位于 `command/` 或 `commands/`；V2 都发现。首选 `.opencode/commands/<name>.md`。`subtask` 改名 `subagent`；委派命令现在自动后台运行并把结果报告给父 session。
- V2 从 `.opencode/skill/` 与 `.opencode/skills/` 发现 skill。移动整个 skill 目录，不只 `SKILL.md`。
- 现有 `AGENTS.md` 保持原位。V2 发现全局 `~/.config/opencode/AGENTS.md` 与就近的 `AGENTS.md`。V2 当前只发现 `AGENTS.md`；`CLAUDE.md` 回退应并入对应的 `AGENTS.md`。

## 终端 client 配置

> V2 replaces layered V1 `tui.json(c)` files with one global terminal client configuration file:

`~/.config/opencode/cli.json`

> The terminal client owns this file; the background service does not load it. When `cli.json` is absent, the first V2 terminal client startup migrates supported global `tui.json` settings and persisted preferences while leaving V1 files unchanged. Project-local client configuration is not migrated because V2 client configuration is global.

## 插件（Plugins）

`plugin` 改名 `plugins`。包加选项的元组改为对象。V2 从 `.opencode/plugin/` 与 `.opencode/plugins/` 发现本地插件；V2 文件用 `.opencode/plugins/`。

> V1 plugin implementations do not run in V2. Moving a file or renaming its config entry is not enough.

> Port entrypoints, hooks, tools, events, and package exports with the dedicated plugin migration guide.

## Server API 与 clients

> OpenCode 2 has a revised, more ergonomic server API and a new set of clients. Integrations that call the V1 server API must migrate to the V2 API.

> Use the `@opencode/client` package to access the released V2 API.

## 验证你的配置（Verify your setup）

> Verify your model, provider credentials, agents, permissions, MCP servers, and plugins in a project before relying on V2 for regular work. Keep your V1 setup until you have confirmed the V2 behavior you need, and do not point V1 at configuration that you have converted to the native V2 shape.

## 采集备注

- 该页把插件 API、server API/client 合约、终端配置模型定性为有意的破坏变更（intentional breaking changes）。
- 该页声明 LSP 配置被保留但不运行；没有声明 LSP 被永久移除或判定无用。本摘录无 LSP 支持恢复的时间。
- 该页安装章节明确 V1/V2 默认不再并存、共用 `opencode` 命令、包管理安装 V2 前需移除 V1；curl 安装器替换 V1 二进制。
