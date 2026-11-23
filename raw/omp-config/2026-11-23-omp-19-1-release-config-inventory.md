# OMP 19.1.1–19.0.1 配置项增量与本机会话迁移

> Source: https://github.com/can1357/oh-my-pi/releases/tag/v19.1.1 ; https://github.com/can1357/oh-my-pi/releases/tag/v19.1.0 ; https://github.com/can1357/oh-my-pi/releases/tag/v19.0.1 ; 本机 `@oh-my-pi/pi-coding-agent` 19.1.1 CHANGELOG 与源码；本机用户级配置和命令输出
> Collected: 2026-11-23
> Published: 2026-11-19 至 2026-11-23

## 版本与调查范围

本机 `omp --version` 输出 `omp/19.1.1`。GitHub Releases 将 v19.1.1 标为 `Latest`；NPM `@oh-my-pi/pi-coding-agent` 的 `latest` 也为 `19.1.1`。

| tag | 本机 CHANGELOG 日期 | GitHub published_at |
|---|---|---|
| v19.1.1 | 2026-11-23 | 2026-11-23T10:00:26Z |
| v19.1.0 | 2026-11-21 | 2026-11-21T05:22:51Z |
| v19.0.1 | 2026-11-19 | 2026-11-19T17:24:20Z |

调查对象为用户可配置的 `config.yml`、`models.yml`、KDL、环境变量，以及 release 明确点名的既有配置行为。普通 provider 修复不自动计入配置项。

## v19.1.1 CHANGELOG 配置相关原文

### Added

> Added the opt-in `tree` status segment, which shows a session’s position in the session tree after a rewind or on a branch; in Tern, the segment opens `/tree` when clicked.

> Providers routed through an auth gateway (`transport: pi-native`) now list the gateway's models, so models the gateway discovered at runtime (such as new Codex models) can be selected without declaring them in `models.yml`, and models the gateway cannot route are hidden.

> Added `computer.takeover` as the replacement for `computer.backgroundFallback`, with `fallback`, `foreground`, and `always` modes for controlling when the computer tool takes over the foreground window. Existing fallback behavior is preserved by default.

> Added extension todo backends through `pi.registerTodoBackend()` and the `todo.backend` setting. Registered backends can mirror the session’s complete todo list to an external store and can be selected and configured from `/settings` → Tools → Todos.

### Fixed

> Fixed startup and session model configuration so thinking levels, model-provider ordering, enabled-model allowlists, routed selections, and pinned upstream routes remain consistent across model switches, cycling, restore, plan mode, and metadata refreshes.

> Improved Magic Edit so it can search and read the current draft, retry failed replacements without losing successful edits, validate syntax before writing, and support models that emit tool calls as text.

## v19.1.0 CHANGELOG 配置相关原文

### Breaking Changes

> Replaced `xd://` tool devices with tool commands: rarely-used tools now run as bash commands (`<tool> --help`, `<tool> <args>`) while `bash` is active and are ordinary tools otherwise

> Renamed the `tools.xdev`, `tools.xdevDocs`, `tools.xdevInlineDevices` and `tools.xdevNotices` settings to `tools.commands`, `tools.commandDocs`, `tools.commandInline` and `tools.commandNotices`

> Staged previews, plan submission and Auto-QA reports now use the `resolve`, `reject`, `propose` and `report_issue` commands, and tool doc topics moved from `xd://<tool>/<topic>` to `help://<tool>/<topic>`

> Removed the `tui.completeScrollback` setting; transcript rows covered by the HUD, dialogs, or draft now always move to scrollback, and the input returns to the bottom row when overlays close.

> Browser relay hosting now runs through the omp extension's native host while Chrome is open. Removed the on-demand `omp browser-relay` server command and its `--port`, `--token`, and `--no-group` options; `browser.relayUrl` remains available for relays forwarded from another machine. Reload the omp extension once after upgrading, or restart Chrome.

### Added

> Extensions can take over a built-in provider through `registerProvider`: `stream` replaces its request adapter, `generateImage` its image generation, `webSearch` its grounded search request, and `discoverModels` its model discovery request. `rules` sets KDL rule directives (such as `prompt-perturbation`) for its models.

> Added the `magic` edit mode, which accepts Markdown bulleted change descriptions grouped under `# path` headings and uses a configurable fast model or role to generate and apply patches. It supports concise block replacement, deletion, movement, and identifier-renaming descriptions, and presents the resulting diffs.

> Added support for Unicode set mode (`v`) in slash-delimited `secrets.yml` regular expressions.

> Moved MCP servers into the omp daemon, with optional process sharing across sessions, lazy startup, idle shutdown, shared discovery caching, and `/mcp list` status including process and session information. Configure sharing with `mcp.shared` and idle shutdown with `mcp.idleStopMinutes`.

> Added notifications and waiting status when a program running in a bash `pty` is waiting for keyboard input, such as a password or confirmation prompt; disable notifications with `pty.notify`.

> Added Binary Ninja as a disassembler backend for read analysis views and the `dsm` namespace. Select it with `disassembler.backend = binja` and configure its installation with `binja.installDir` or `$BN_INSTALL_DIR`.

### Fixed

> A usage-limit reset inside `retry.maxDelayMs` is now waited out even without a `Retry-After` header.

> Prevented `--continue` and `autoResume` from attaching to a session currently being written by another omp process.

> Fixed OpenCode v2 MCP configuration discovery from `mcp.servers` while preserving support for legacy flat `mcp` entries.

> Fixed `ovnfs` commands when `ovnfs.path` contains Windows backslashes, spaces, or `$` characters.

> Fixed `web_search` to honor the search order and exclusions configured for the current session.

## v19.0.1 CHANGELOG 配置相关原文

### Added

> `snapcompactShape` on `models.yml` models, `modelOverrides` and extension `registerProvider` models sets that model's snapcompact frame shape ([#19591](https://github.com/can1357/oh-my-pi/pull/19591) by [@ryanskidmore](https://github.com/ryanskidmore))

### Fixed

> Fixed a provider routed through an auth gateway (`transport: pi-native` in `models.yml`) still listing models from the provider's own endpoint, sending the gateway key there; such providers now skip the provider's model discovery and keep their bundled and cached models ([#19646](https://github.com/can1357/oh-my-pi/pull/19646) by [@ray8828](https://github.com/ray8828))

> Fixed Codex and OpenAI API web search ignoring the `web` role's thinking level (`openai-codex/gpt-6-luna:xhigh`); the level now reaches the request as `reasoning.effort` ([#19793](https://github.com/can1357/oh-my-pi/issues/19793))

## 设置描述符与本机值

以下来自 v19.1.1 `Settings.loadReadOnly` 描述符采集和后续定向配置修改。`default` 是注册表默认值；`session final` 是本会话完成修改后的用户级配置值，不包含项目配置或其他启动器覆盖。

| 键 | default | session final | 说明 |
|---|---|---|---|
| `computer.takeover` | `fallback` | `fallback` | 桌面自动化前台接管策略 |
| `todo.backend` | `native` | `native` | Todo 保存或镜像后端 |
| `tools.commands` | `true` | `false` | 工具作为 bash 命令或顶层工具提供 |
| `tools.commandDocs` | `catalog` | `inline` | 命令帮助文本进入系统提示的方式 |
| `tools.commandInline` | `[]` | `[]` | `builtins` 模式下额外内联的动态命令 |
| `tools.commandNotices` | `true` | `true` | 命令挂载和卸载通知 |
| `edit.mode` | `hashline` | `magic` | `PI_EDIT_VARIANT=magic` 同步设置 |
| `mcp.shared` | `true` | `true` | 通过 daemon 共享 MCP 单元 |
| `mcp.idleStopMinutes` | `5` | `5` | 空闲停止时间 |
| `pty.notify` | `on` | `on` | PTY 等待键盘输入时通知 |
| `disassembler.backend` | `auto` | `auto` | 新增可选值 `binja` |
| `binja.installDir` | 空 | 空 | 自动探测 Binary Ninja |
| `binja.python` | 空 | 空 | 可加载 Binary Ninja API 的 Python 3 |
| `browser.relayUrl` | 未设置 | 未设置 | 供另一台机器转发来的 relay 使用 |
| `providers.streamFirstEventTimeoutSeconds` | `-1` | `150` | 显式本机值，不采用自动 15 分钟 |
| `providers.streamIdleTimeoutSeconds` | `-1` | `150` | 显式本机值，不采用自动 15 分钟 |
| `retry.maxDelayMs` | `300000` | `300000` | 用量重置等待上限 |
| `autoResume` | `false` | `false` | 防止连接到其他进程正在写入的会话 |
| `snapcompact.shape` | `auto` | `auto` | 全局形状设置 |
| `statusLine.preset` | `default` | `default` | 本机未启用 `tree` 段 |

四个工具键修改后逐一执行 `omp config get`，输出为：

```text
tools.commands: false
tools.commandDocs: inline
tools.commandInline: []
tools.commandNotices: true
```

执行 `env -u PI_EDIT_VARIANT omp config get edit.mode`，输出：

```text
magic
```

## `computer.takeover` 的注册表说明

来源：`packages/coding-agent/src/tools/settings.ts` v19.1.1。

| 值 | 注册表说明摘录 |
|---|---|
| `fallback` | Default: each call tries background delivery first and falls back to a brief foreground takeover when the background path is unavailable; restore the user's foreground window afterward. The agent may also explicitly request takeover. |
| `foreground` | Take over only when OMP decides: the target is already foreground or the background path is unavailable. Otherwise run in background; the agent cannot force takeover. |
| `always` | Every window and element input call runs in the foreground: activate the target, run, then restore the user's foreground window. |
| `refuse` | Never take over the foreground window: background-only delivery, fail calls that cannot be delivered in background, and deny agent-requested foreground switches, raises, and desktop-level input. |

旧 `computer.backgroundFallback` 的迁移源码位于 `packages/coding-agent/src/config/settings.ts`：`refuse` 迁移为 `takeover: refuse`，`takeover` 迁移为 `takeover: fallback`。

## `tools.commands` 的挂载边界

来源：`packages/coding-agent/src/tools/index.ts` v19.1.1。

`resolveBuiltinToolPlan()` 在 `settings.get(cfgToolsCommands) && tools.has("bash")` 时返回 command-first 计划；否则把所有另行启用的工具保留在顶层。`sdk.ts` 的注释原文：

> Skip command mounting when `tools.commands` is false, when `bash` is absent (no command channel), or when tool names are restricted — the tool allowlist already covers exactly what the model may see, so the command catalog would be both redundant and misleading.

因此 `tools.commands: false` 关闭的是 OMP 的 bash tool commands；系统本身已有的 `git`、`rg`、`python3` 等可执行程序仍可由 bash 运行。

## MCP 生命周期原文

来源：`packages/coding-agent/src/mcp/host/contract.ts` 与 `host/endpoint.ts` v19.1.1。

> Modern (no-initialize) servers never hold caller state, so sharing is a pure transport win: one stdio child or upstream connection serves every session in scope and retires once its lease count has been zero for the idle window.

> Legacy (initialize-performing) servers, by contrast, hold caller state from the handshake on, so they keep per-session isolation and linger until the last lease releases — no idle stop: with state already resident, idling would trade the next call's re-handshake for nothing.

> For both paths "idle" is a per-unit wall-clock timer (OMP daemon default five minutes), reset on activity and gated on no in-flight request and no still-open subscription — requests and subscription reads keep the connection alive without extending any session's lease.

`packages/coding-agent/src/mcp/settings.ts` 的描述符说明还规定：持有 caller state 的 server 不共享；daemon 不可用时回退到私有进程；`mcp.idleStopMinutes` 只应用于共享 server。

## Snapcompact 模型级形状源码

来源：`packages/coding-agent/src/config/models-config-schema-bundle.ts`、`packages/snapcompact/src/snapcompact.ts` v19.1.1。

`snapcompactShape` 可出现在模型、`modelOverrides` 和扩展注册模型上，包含 `variant` 与 `frameSize`。schema 原文：

> Optional Snapcompact shape override for this model. Merged with built-in defaults: explicit fields here win; omitted fields fall back to the model family's winner.

`frameSize` 的可配置范围为 `64` 至 `2576`。形状解析顺序源码：

```ts
if (shapeConfig !== "auto") {
    const forced = shapeFromVariant(shapeConfig);
    if (forced) return forced;
}
if (model.snapcompactShape) return resolveOverride(model.snapcompactShape);
if (modelFamilyWinner) return modelFamilyWinner;
if (apiFamilyWinner) return apiFamilyWinner;
```

## 提示词扰动与 Responses 兼容规则

`packages/catalog/CHANGELOG.md` v19.1.0 原文：

> Added the `prompt-perturbation` catalog axis, which opts a provider or model into per-install prompt paraphrasing.

> Added the `uncached-instructions` compatibility flag for GPT-6.2 models across all hosts, moving system prompts out of the uncached Responses `instructions` field.

`packages/ai/src/prompts/perturbation.ts` 的实现说明显示：扰动只改写静态系统提示和工具描述，按安装 ID 选择固定映射；`OMP_PROMPT_PERTURBATION=1` 强制开启，`0` 强制关闭，未设置时服从 KDL，默认关闭。

## 流看门狗默认值

来源：`packages/ai/src/utils/idle-iterator.ts` v19.1.1。

```ts
const DEFAULT_STREAM_FIRST_EVENT_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
```

配置值 `0` 禁用看门狗；`-1` 使用自动默认值。本机两个键都显式设为 `150` 秒，因此本机行为保持 150 秒。

## 网页搜索会话设置修复

来源：PR #19837，https://github.com/can1357/oh-my-pi/pull/19837 。

`web-search/settings.ts` 的 `resolveSearchOptions()` 改为接收当前 session settings，并用当前会话的 `modelRoles.web`、`retry.fallbackChains.web`、`providers.webKeyless`、`models.offline`、`providers.webSearchTimeoutSeconds`、`providers.antigravityEndpoint` 计算顺序、排除、keyless 服务和超时。这样项目配置与 sub-agent 覆盖层不会被进程全局值覆盖。

## 其他已核对配置行为

- `secrets/regex.ts` 与 `secrets/redactor.ts` 接受斜杠正则的 `v` 标志。
- `discovery/opencode.ts` 在 `mcp` 为对象时先读 `mcp.servers`，不存在时回退到扁平 `mcp`。
- Codex client version 缓存路径使用 `$XDG_CACHE_HOME/omp/codex-client-version.json`；没有 XDG 缓存目录时使用 agent 目录。
- `tui.completeScrollback` 移除前，本机旧值为 `true`，与 v19.1.0 固定行为一致。

## 证据边界

- 本机值只覆盖用户级配置与当前进程环境；项目配置、其他启动器和扩展运行时可改变结果。
- 未逐项启动 Binary Ninja、桌面接管、外部 Todo 后端或浏览器 relay 做运行实验。
- 本文件没有记录 provider key、OAuth token、网关 bearer 或 `.env` 中除 `PI_EDIT_VARIANT` 外的任何行。
