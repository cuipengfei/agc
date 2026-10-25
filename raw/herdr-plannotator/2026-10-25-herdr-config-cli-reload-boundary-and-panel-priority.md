# Herdr 配置：CLI 重载边界、面板优先级与插件键位

> Source URLs:
> - https://raw.githubusercontent.com/herdrdev/herdr/v0.9.5/docs/next/website/src/content/docs/configuration.mdx
> - https://github.com/herdrdev/herdr/issues/318
> - https://raw.githubusercontent.com/herdrdev/herdr/v0.9.5/docs/next/website/src/data/config-reference.json
>
> Collected: 2026-10-25
> Published: Unknown
> 说明：本文件只收本次新增的证据。同日的 `2026-10-25-herdr-config-reference-and-local-snapshot.md` 已提交冻结，不追加。

## A. configuration.mdx v0.9.5：shell_mode 原文

```
`shell_mode = "auto"` starts login shells on macOS so login-only PATH setup such as `/usr/libexec/path_helper` and Homebrew shell initialization runs in new panes. On other platforms, it keeps the existing non-login shell behavior. Use `"login"` to force login-shell startup or `"non_login"` to force non-login startup. Command panes, detached custom command keybindings, and explicit argv launches keep their existing command execution paths.
```

## B. configuration.mdx v0.9.5：reload config 原文（含客户端与 server 归属）

```
Reload a running server after editing `config.toml`:

    herdr server reload-config

You can also open the global menu in Herdr and choose `reload config`.

Reload applies most UI settings without restarting panes. Startup-only settings still need a restart.

Themes, sidebar layouts, copy behavior, and other presentation settings come from the client's local config, including when viewing an SSH machine. Pane defaults, worktrees, integrations, and custom commands belong to the server where the panes run. The UI's `reload config` action reloads both the client's local settings and the selected server's config. Local keybindings reload too; `--remote-keybindings server` instead uses the selected server's keybindings.
```

## C. `herdr config --help` 输出（本机 0.9.5）

```
Manage local configuration

Usage: herdr config [COMMAND]

Commands:
  check       Validate config.toml and print diagnostics
  reset-keys  Reset custom keybindings
```

子命令只有 `check` 与 `reset-keys`，没有客户端重载入口。

## D. `herdr --default-config` 相关注释原文（本机 0.9.5）

```
# Agent panel ordering: "spaces" (grouped by space) or "priority" (attention queue).
# "workspaces" is accepted as an alias for "spaces".
# agent_panel_sort = "spaces"
```

```
# Popup width and height accept terminal cells or percentages such as "80%".
# On Windows, command strings run through cmd.exe /d /c.
# [[keys.command]]
# key = "prefix+alt+g"
# type = "popup"
# command = "lazygit"
# width = "80%"
# height = "80%"

# Legacy indexed shortcut config is still parsed for compatibility.
# Prefer switch_tab, switch_workspace, and focus_agent for new configs.
# [keys.indexed]
# tabs = ""       # e.g. "ctrl" makes ctrl+1..9 switch tabs directly
# workspaces = "" # e.g. "ctrl+shift" makes ctrl+shift+1..9 switch workspaces directly
# agents = ""     # e.g. "alt" makes alt+1..9 focus agent rows directly
```

### D.1 configuration.mdx：keys.command 的 description、环境变量与 Windows 外壳原文

```
`description` is optional. When set, it appears in the keybind help panel (opened with `prefix+?`) instead of the default `'custom command'` label.

Custom commands receive `HERDR_SOCKET_PATH`, `HERDR_BIN_PATH`, `HERDR_ACTIVE_WORKSPACE_ID`, `HERDR_ACTIVE_TAB_ID`, `HERDR_ACTIVE_PANE_ID`, and `HERDR_ACTIVE_PANE_CWD` when those values are available. Shell commands run from the focused pane's working directory when Herdr can detect it.

On Windows, custom command strings use `cmd.exe /d /c`, so environment variables use `%HERDR_BIN_PATH%` syntax. To run PowerShell syntax, invoke it explicitly, for example `powershell.exe -NoProfile -Command "..."`.
```

```
`type = "pane"` opens a temporary zoomed pane and closes it when the command exits.

`type = "shell"` runs detached in the background.

`type = "plugin_action"` invokes an installed plugin action id. Use the
qualified id when action ids are not globally unique:

    [[keys.command]]
    key = "prefix+l"
    type = "plugin_action"
    command = "example.layout.apply"
    description = "apply layout"
```

## E. config-reference.json v0.9.5：ui.agent_panel_sort 条目

```json
{"key": "ui.agent_panel_sort", "type": "enum", "default": "\"spaces\"", "description": "Agent sidebar ordering. Saved values are \"spaces\" or \"priority\"; \"workspaces\" is accepted as an alias for \"spaces\".", "values": ["spaces", "priority"]}
```

## F. GitHub issue #318 原文（feat: sort agents panel by attention priority）

State: CLOSED / COMPLETED。Created: 2026-05-27T13:54:09Z。Updated: 2026-06-24T13:47:28Z。Author: @akopanev。

Body 摘录：

```
## Current behavior

The agents panel lists panes in workspace-iteration order — panes grouped by their workspace, in the order workspaces appear. Status (blocked, done, working, idle) does not affect the order.

A blocked agent at the bottom of the list stays at the bottom until scanned for.

## Proposed change

Add a `sort` option under `[ui.agent_panel]` (or wherever fits the existing config layout):

- `workspace` (default): current behavior, unchanged.
- `priority`: sort by attention priority — blocked > idle/unseen (done) > working > idle/seen > unknown. Stable sort within a status, so workspace order remains a natural tiebreaker.

The priority function `workspace_attention_priority` (`src/ui/sidebar.rs:264`) is already used by `space_aggregate_state` to roll up worktree-group state. Same priority hierarchy, applied to the panel sort.
...

Workspaces, tabs, drag-and-drop are unaffected. Opt-in only; default behavior unchanged. With `sort = "priority"`, cycling next/prev agent (`prefix+n`/`prefix+p`) traverses the new order.
```

维护者评论摘录（@akopanev，2026-06-13）：

```
bucket order (blocked > done/unseen > working > idle/seen > unknown) matches `workspace_attention_priority` so users trained on the rollup get the panel sort immediately.
```

发布记录（@kangal-bot，2026-06-24T13:47:26Z）：

```
<!-- herdr:released:v0.7.1 -->
Released in [v0.7.1](https://github.com/ogulcancelik/herdr/releases/tag/v0.7.1).
```

## G. 本机 config.toml 当前头部（2026-10-25，含本轮两处显式 true）

```toml
onboarding = false

[theme]
name = "tokyo-night"

auto_switch = true
[ui]
show_agent_labels_on_pane_borders = true
agent_panel_sort = "spaces"
status_indicators = "dots"
pane_scrollbars = true
tab_bar_right = [
  { type = "zoom" },
  { type = "datetime", format = "%H:%M" },
]
tab_bar_right_separator = " · "
window_title = "{hostname}: {workspace} / {tab} {terminal_title}"
copy_on_select = true

[ui.sidebar.agents.rows_by_agent]
omp = [
  ["state_icon", "machine", "workspace", "tab"],
  ["terminal_title"],
  ["agent"],
]

[ui.sound]
enabled = false

[ui.toast]
delivery = "herdr"

[session]
resume_agents_on_restore = true

[experimental]
pane_history = false
switch_ascii_input_source_in_prefix = false
kitty_graphics = false

[[keys.command]]
key = "prefix+a"
type = "plugin_action"
command = "annotate.capture"

[[keys.command]]
key = "prefix+shift+a"
type = "plugin_action"
command = "annotate.copy-context"

[[keys.command]]
key = "prefix+ctrl+a"
type = "plugin_action"
command = "annotate.copy-archive"

[[keys.command]]
key = "prefix+m"
type = "plugin_action"
command = "annotate.manage"

[[keys.command]]
key = "prefix+o"
type = "plugin_action"
command = "annotate.open"

[[keys.command]]
key = "prefix+shift+o"
type = "plugin_action"
command = "annotate.last"

[[keys.command]]
key = "prefix+t"
type = "popup"
command = 'exec "${SHELL:-/bin/sh}"'
description = "临时 shell"
width = "80%"
height = "80%"

[[keys.command]]
key = "prefix+alt+b"
type = "pane"
command = "btop"
description = "系统监视器"
```

八条 `[[keys.command]]` 中，`prefix+t` 是 popup 类型，宽与高都写成 80%。

`herdr config check` 对上述内容返回 `config: ok`；`herdr server reload-config` 返回 `applied`，无诊断。

## H. dump-settings 四态统计（`herdr-configs` skill，2026-10-25）

```
{'total': 212, 'reference': 211, 'unset': 193, 'defaultExplicit': 7, 'customized': 11, 'unknown': 0, 'localOnly': 1}
```

`customized` 的 11 项为官方键；本地扩展键 `keys.command` 单独计入 `localOnly`，其状态同为 `customized`，因此界面已修改项共 12 条 `customized` 记录（11 官方 + 1 本地扩展）。

## I. 默认 shell 实测（本机，2026-10-25）

```
SHELL=/usr/bin/zsh
getent passwd cpf -> /usr/bin/zsh
herdr status client -> version: 0.9.5 / channel: stable / protocol: 22 / binary: /home/cpf/.local/bin/herdr
```

`terminal.default_shell` 在 `config.toml` 中未出现（`unset`），新建 pane 的子进程为 `/usr/bin/zsh`。

## J. annotate 插件动作清单（`~/.config/herdr/plugins/github/annotate-9c299759567c/herdr-plugin.toml`）

插件身份：`id = "annotate"`、`version = "0.4.0"`、`min_herdr_version = "0.8.0"`。`herdr-annotate.version` 为 `0.1.0`，`plannotator-tui.version` 为 `0.8.0`。

| action id | title | contexts | command |
|---|---|---|---|
| `capture` | Annotate selection | `pane` | `./bin/herdr-annotate.exe capture` |
| `copy-context` | Copy annotations as context | `global` | `./bin/herdr-annotate.exe copy-context` |
| `copy-archive` | Copy annotations as context and archive them | `global` | `./bin/herdr-annotate.exe copy-archive` |
| `manage` | Manage annotations | `global` | `./bin/herdr-annotate.exe manage` |
| `open` | Annotate: open here | `workspace`, `pane` | `./bin/plannotator-tui.exe herdr open` |
| `open-link` | Annotate this file | `pane` | `./bin/plannotator-tui.exe herdr open` |
| `last` | Annotate: agent's last message | `pane` | `./bin/plannotator-tui.exe herdr last` |

清单原文注释：

```
# Both actions run the launcher, which reads Herdr's invocation context: the focused pane's
# folder (open) or the clicked file:// link (open-link), and the focused pane's agent as
# the target the review is sent back to.
```

README 键位表原文：

```
| Key | Opens |
|---|---|
| `Ctrl+B O` | this folder, with a file tree |
| `Ctrl+B Shift+O` | the agent's recent replies |
| Ctrl-click a `file://…md` link | that file |
```

README 关于跨 pane 动作的说明原文：

```
the machine you are viewing from even when the plugin runs on a remote server with no clipboard tool
installed; `Ctrl+B Shift+A` and `Ctrl+B Ctrl+A` do not, because those actions run outside a pane and
have no terminal to write to.
```

## K. v0.9.5 源码：priority 的排序键与档位表

`src/app/agent_view.rs`（v0.9.5）：

```rust
    if matches!(
        app.agent_panel_sort,
        crate::app::state::AgentPanelSort::Priority
    ) {
        entries.sort_by_key(|entry| {
            (
                std::cmp::Reverse(super::api_helpers::tab_attention_priority(
                    entry.state,
                    entry.seen,
                )),
                std::cmp::Reverse(entry.last_agent_state_change_seq),
            )
        });
    }
```

`src/app/api_helpers.rs`（v0.9.5）：

```rust
pub(super) fn tab_attention_priority(state: crate::detect::AgentState, seen: bool) -> u8 {
    match (state, seen) {
        (crate::detect::AgentState::Blocked, _) => 4,
        (crate::detect::AgentState::Idle, false) => 3,
        (crate::detect::AgentState::Working, _) => 2,
        (crate::detect::AgentState::Idle, true) => 1,
        (crate::detect::AgentState::Unknown, _) => 0,
    }
}
```

排序键是二元组：优先档位降序，其次 `last_agent_state_change_seq` 降序。`entries` 的初始顺序按 workspace/pane 生成，`sort_by_key` 为稳定排序，所以只有状态变更序号相同时才保留 workspace/pane 原顺序。issue #318 正文写的「Stable sort within a status, so workspace order remains a natural tiebreaker」是提案阶段描述；维护者评论中提议的 `last_state_change_at` 次级排序已进入发布代码，实际行为以上面源码为准。
## L. 证据边界

- 文档声明：A、B、E 节来自 Herdr v0.9.5 官方 docs 与 `config-reference.json` 原文；D 节来自本机 `herdr --default-config` 输出。
- 上游声明：F 节来自 GitHub issue #318 正文与评论，属提案与实现讨论记录，与 K 节源码在次级排序上有差异，以源码为准。
- 上游源码：K 节直接取自 `herdrdev/herdr` v0.9.5 的 `src/app/agent_view.rs` 与 `src/app/api_helpers.rs` 原始文件。
- 本机直读：G 节配置内容与校验输出、H 节统计、I 节 shell 与 client 状态、J 节插件清单与 README。
- 未验证：`priority` 模式在本机的运行时排序（本机 `agent_panel_sort = "spaces"`，未切换）；`ui.copy_on_select` 在当前已打开客户端是否已加载（只跑过 `herdr server reload-config`，客户端需界面 `reload config`）；`prefix+o` 与官方 `keys.open_notification_target` 的键位覆盖在运行时是否只剩一条生效（按配置推断，未实测按键）。
