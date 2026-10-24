> Source URLs:
> - https://raw.githubusercontent.com/herdrdev/herdr/v0.9.5/docs/next/website/src/content/docs/configuration.mdx
> - https://raw.githubusercontent.com/herdrdev/herdr/v0.9.5/docs/next/website/src/data/config-reference.json
> - https://raw.githubusercontent.com/herdrdev/herdr/v0.9.5/docs/next/website/src/content/docs/cli-reference.mdx
> - https://raw.githubusercontent.com/herdrdev/herdr/v0.9.5/docs/next/website/src/content/docs/integrations.mdx
> - https://raw.githubusercontent.com/herdrdev/herdr/v0.9.5/docs/next/website/src/content/docs/agents.mdx
> - https://raw.githubusercontent.com/herdrdev/herdr/v0.9.5/docs/next/website/src/content/docs/session-state.mdx
> - https://raw.githubusercontent.com/herdrdev/herdr/v0.9.5/docs/next/website/src/content/docs/add-herdr-support.mdx
> - 本机 ~/.config/herdr/config.toml 与 herdr config check 输出, 2026-10-25
> Collected: 2026-10-25
> Published: 2026-10-25 (v0.9.5 docs); 本机实证 2026-10-25

## A. config-reference.json 统计与抽样（v0.9.5）

文件结构：`{ "sections": [ {id, title, keys: [{key, type, default, description, values?}]} ] }`。

共 14 个 section，211 个 key。各 section 的 key 数：

- General: 1
- Server: 3
- Theme: 61
- Terminal: 4
- Updates: 3
- Keybindings: 63
- UI and sidebar: 33
- Notifications: 5
- Sound: 26
- Session: 2
- Worktrees: 1
- Remote: 1
- Advanced: 1
- Experimental: 7

抽样 key 原文（按 config-reference.json 字段照抄）：

- `ui.tab_bar_right` | array | default `[]` | "Configure ordered right-aligned tab bar entries. Supported types are zoom, hostname, datetime, text, and command." | values: zoom, hostname, datetime, text, command
- `ui.window_title` | string | default `"{hostname}: {workspace}"` | "Title Herdr writes to the terminal it runs in. Tokens: {hostname}, {workspace}, {tab}, {pane}, {terminal_title}. Empty leaves the outer title alone."
- `terminal.kitty_graphics` | boolean | default `true` | "Render pane images in Kitty graphics-compatible outer terminals. ... Set false to disable graphics rendering. Restart the server or reattach the client to apply."
- `experimental.kitty_graphics` | boolean | default `unset` | "Deprecated compatibility key for terminal.kitty_graphics. Existing true and false values remain supported; terminal.kitty_graphics takes precedence when both are set."
- `session.resume_agents_on_restore` | boolean | default `true` | "Resume supported AI-agent panes into their native conversation sessions when restoring a Herdr session."
- `advanced.scrollback_limit_bytes` | integer | default `10000000` | "Maximum scrollback buffer size in bytes retained per pane terminal. The legacy key name `scrollback_lines` is accepted as an alias."
- `server.headless_cols` | integer | default `120` | "Virtual terminal width used for layout and newly created panes when no client is attached. Must be greater than zero."
- `ui.toast.delivery` | enum | default `"off"` | "Popup notification delivery. off disables popups, herdr shows in-app toasts, terminal asks the outer terminal for a desktop notification, system asks the OS notification service directly." | values: off, herdr, terminal, system
- `ui.sound.enabled` | boolean | default `true` | "Play sounds when agents change state in background workspaces."
- `ui.host_cursor` | enum | default `auto` | "Host cursor policy." | values: auto, native, drawn
- `experimental.pane_history` | boolean | default `false` | "Persist pane screen history to session-history.json."
- `terminal.default_shell` | string | default `""` | "Executable used for new interactive panes. Empty means SHELL, then /bin/sh; on Windows, pwsh.exe when present on PATH, otherwise powershell.exe."
- `experimental.allow_nested` | boolean | default `false` | "Allow launching herdr inside an existing herdr pane."

## B. configuration.mdx 原文片段（v0.9.5）

### B.1 Config file / Reload config

```
Herdr reads config.toml ... On Linux and macOS the default is ~/.config/herdr/config.toml; on Windows %APPDATA%\herdr\config.toml.

Reload a running server after editing `config.toml`:

    herdr server reload-config

You can also open the global menu in Herdr and choose `reload config`.

Reload applies most UI settings without restarting panes. Startup-only settings still need a restart.

Themes, sidebar layouts, copy behavior, and other presentation settings come from the client's local config, including when viewing an SSH machine. Pane defaults, worktrees, integrations, and custom commands belong to the server where the panes run. The UI's `reload config` action reloads both the client's local settings and the selected server's config. Local keybindings reload too; `--remote-keybindings server` instead uses the selected server's keybindings.
```

### B.2 Headless terminal size

```
When no client is attached, the server uses a 120×40 virtual terminal for layout and newly created panes. Change that fallback for headless orchestration with:

    [server]
    headless_cols = 160
    headless_rows = 50
```

### B.3 UI and sidebar — tab_bar_right

```
Configure an ordered tmux-style status area at the right edge of the tab row:

    [ui]
    tab_bar_right = [
      { type = "zoom" },
      { type = "hostname" },
      { type = "datetime", format = "%H:%M" },
      { type = "text", text = "prod" },
      { type = "command", command = "~/.config/herdr/status.sh", interval_seconds = 5, timeout_seconds = 2 },
    ]
    tab_bar_right_separator = " · "

The status area is empty by default. Add `zoom` to show a fixed `ZOOM` pill while the active tab is zoomed; the existing per-tab `Z` markers remain independent. `hostname`, `datetime`, and `command` resolve on the Herdr server, so `herdr --remote` shows the remote machine's values. Datetime entries use `strftime` formatting; directives that require a UTC offset or Unix timestamp, such as `%z` and `%s`, are rejected because the value is server-local wall-clock time.

Command entries run immediately and then at `interval_seconds` without blocking rendering or overlapping a previous run. The interval can be 1–31,536,000 seconds and the timeout can be 1–3,600 seconds. ... removes ESC-prefixed terminal control sequences instead of interpreting styles, clears the entry after failure, empty output, or `timeout_seconds` ... Commands are supported on Linux, macOS, and Windows, using `/bin/sh -lc` on Linux and macOS and `cmd.exe /d /c` on Windows.

Separators appear only between visible entries. Set `tab_bar_right_separator = ""` for direct concatenation. On a narrow tab row, the complete status area yields to the tabs and their controls.
```

### B.4 Outer terminal window title

```
Herdr emulates the terminals in its panes, so an `OSC 0`/`OSC 2` title written inside a pane stops at Herdr. Herdr writes its own title to the terminal it runs in, which is what window managers and terminal tab bars read:

    [ui]
    window_title = "{hostname}: {workspace}"

Tokens are `{hostname}`, `{workspace}`, `{tab}`, `{pane}` (the focused pane's manual name), and `{terminal_title}` (the focused pane's own terminal title with spinner frames stripped). Write `{{` and `}}` for literal braces. A token with no value renders empty.

The title renders on the Herdr server, so `{hostname}` names the machine the panes run on, including when you attach with `herdr --remote` or run `herdr` over SSH. Set `window_title = ""` to leave the outer terminal title alone.

`client.window_title.set` overrides the configured title until `client.window_title.clear` hands it back.
```

### B.5 Sidebar row layouts

```
Agent rows accept these built-in tokens:
- `state_icon` — colored icon for the agent's semantic state.
- `state_text` — `idle`, `working`, `blocked`, `done`, or `unknown`, including a reported display label when present.
- `machine` — machine label when the client has multiple machines; omitted for a single local machine.
- `workspace` — workspace name.
- `tab` — tab name when available.
- `pane` — pane name when available.
- `agent` — detected or reported agent display name.
- `terminal_title` — latest OSC 0/2 terminal title after safety normalization.
- `terminal_title_stripped` — the terminal title with one recognized leading activity or spinner glyph and its following whitespace removed.
- `$name` — custom pane metadata named `name`.

Space rows accept these built-in tokens:
- `state_icon` — colored icon for the space's rolled-up agent state.
- `state_text` — text for the rolled-up agent state.
- `workspace` — workspace name.
- `branch` — Git branch when available.
- `git_status` — Git ahead and behind counts when nonzero.
- `$name` — custom workspace metadata named `name`.

Tokens render in their configured order. Herdr normally separates adjacent values with ` · ` and uses a single space after `state_icon`. Missing values and their separators disappear; a row disappears when none of its tokens have a value. ... Each layout may contain at most 16 rows, with at most 16 tokens in each row.

... Text-valued tokens also accept up to 16 ordered `rules`. Each rule contains exactly one condition—`equals`, `contains`, `starts_with`, `gt`, or `lt`—and optional `fg`, `bold`, and `dim` overrides ...

`row_gap` controls the blank terminal rows between entries, independently for the Agent and Space panels. It defaults to `0`, which packs entries together; set it to `1` to restore the previous spacing. It does not add spacing between the content lines declared in `rows`. Consecutive indented worktree children remain packed as one Space group.

Override the complete Agent layout for a known agent under `rows_by_agent`:

    [ui.sidebar.agents]
    rows = [
      ["state_icon", "agent", "state_text"],
      ["workspace", "tab"],
    ]

    [ui.sidebar.agents.rows_by_agent]
    claude = [
      ["state_icon", "agent", "state_text"],
      ["terminal_title_stripped"],
      ["workspace", "tab"],
    ]

An override replaces `rows`; it does not extend it. Override keys are case-sensitive canonical agent IDs such as `claude`, `codex`, and `pi`. Detection aliases such as `claude-code` are not accepted. Agents without an override, including custom reported agents, use `rows`.

Custom `$name` tokens are dynamic values, not literal text. Add the token to a layout, then report its value from a script or plugin:

    herdr pane report-metadata <pane_id> \
      --source my-agent-hook \
      --token model=opus \
      --token summary="reviewing authentication"

... Sidebar row settings affect only the expanded desktop sidebar. Collapsed and mobile views keep their compact layouts.
```

### B.6 Notifications

```
Choose `herdr` for an in-app toast, `terminal` for an outer-terminal notification that also works over SSH, `system` for the local OS notification service, or `off` to disable popups. Herdr suppresses popups for the active tab.

On macOS, `system` tries `terminal-notifier` first and falls back to `/usr/bin/osascript` when it is unavailable or fails. ... Install `terminal-notifier` with `brew install terminal-notifier`. ...

On Windows, `system` notifications remain in Notification Center. Clicking one selects its originating pane in the running Herdr client and brings its terminal window forward when Windows exposes that window. A click cannot reopen a closed client or select a pane from a restarted server. Windows Terminal can bring the owning window forward, but cannot reliably select a different outer terminal tab.
```

### B.7 Sound

```
Sound notifications play through the local Herdr client. Custom sounds must be mp3 files; Herdr resolves relative paths from the config file's directory.

    [ui.sound]
    path = "sounds/notification.mp3"
    done_path = "sounds/done.mp3"
    request_path = "sounds/request.mp3"

`path` sets one sound for all sound notifications. `done_path` and `request_path` override only the finished and needs-input sounds.

Per-agent sound overrides accept `default`, `on`, or `off`. Use detected agent labels such as `claude`, `codex`, `devin`, or `droid` as keys. Droid is muted by default.
```

### B.8 Kitty graphics

```
Applications and plugins integrate through the standard Kitty graphics protocol emitted in pane terminal output. Herdr renders these images by default in compatible outer terminals. The external socket pane-overlay API has been removed; there is no replacement socket image API.

... On local Unix Ghostty clients, it can send image data through temporary files instead of encoding it into terminal output. ...

For eligible local clients, native RGBA images travel from server to client as paths to Herdr-owned snapshots rather than pixel bytes. Unsupported clients and failed transfers fall back to inline delivery. Remote server paths are never forwarded to the local terminal.

On Linux, whole-file, uncompressed RGBA uploads can use copy-on-write snapshots before Herdr reads their pixels. ... Snapshots are limited to 16 MiB each and 64 MiB total; animation and unsupported clients read their pixels when needed.

To disable Kitty graphics rendering:

    [terminal]
    kitty_graphics = false

The legacy `experimental.kitty_graphics` setting remains accepted for existing configurations. `terminal.kitty_graphics` takes precedence when both are set.

Changing this setting requires restarting the affected Herdr server or reattaching the client. In remote sessions, the server's setting controls Kitty graphics parsing, while the local client's setting controls output to the outer terminal.
```

### B.9 Agent session restore

```
Herdr resumes supported Agent conversations after a server restart by default:

    [session]
    resume_agents_on_restore = true
    startup_per_agent_delay_ms = 100

Automatic restores start one agent at a time, 100 milliseconds apart by default, to reduce startup contention. The first eligible agent starts immediately. Set `startup_per_agent_delay_ms = 0` to disable spacing. Manual launches and explicit terminal attaches are unaffected. Restart the Herdr server to apply changes.

Only panes with a valid native session reference from an official integration can resume; other panes restore as normal shells.
```

### B.10 IME cursor tracking / Prefix input source switching

```
On macOS, AI Agent TUIs that hide the hardware cursor can prevent native input-method candidate windows from following the focused pane. Reveal a cursor anchor for those panes with:

    [experimental]
    reveal_hidden_cursor_for_cjk_ime = true
    cjk_ime_agents = ["claude", "pi", "codex"]

On macOS and Windows, Herdr can temporarily switch to an ASCII-capable input source while prefix commands and prefix-launched modes are active:

    [experimental]
    switch_ascii_input_source_in_prefix = true

On macOS this switches to the current ASCII-capable keyboard layout; on Windows it switches the IME to English (ASCII) input. ... This setting has no effect on other platforms.

On Windows, support is currently limited to the Korean IME. With an IME for any other language, this setting leaves the input source unchanged.
```

### B.11 Environment variables

```
| HERDR_CONFIG_PATH        | Override the config file path. |
| HERDR_SESSION           | Select a named session for CLI commands. |
| HERDR_SOCKET_PATH       | Low-level socket path override. |
| HERDR_PROCESS_DETECTION | Linux process detection strategy: `native` (default) or opt-in `child-groups`. |
| HERDR_LOG               | Set log filtering, for example `HERDR_LOG=herdr=debug`. |
| HERDR_DISABLE_SOUND     | Disable sound playback even when `[ui.sound] enabled = true`. |
```

## C. cli-reference.mdx 片段（v0.9.5）

```
herdr --default-config        # print default config
...
herdr server reload-config
`herdr server` runs the headless server explicitly. Use it for supervised or service-style setups. `reload-config` applies reloadable settings without restarting panes.
...
herdr pane report-metadata <pane_id> \
  --source ID [--token NAME=VALUE] [--clear-token NAME] [--seq N] [--ttl-ms N]
```

## D. 本机配置快照（~/.config/herdr/config.toml，2026-10-25）

```
onboarding = false

[theme]
name = "tokyo-night"

auto_switch = false
[ui]
show_agent_labels_on_pane_borders = true
agent_panel_sort = "spaces"
status_indicators = "dots"
tab_bar_right = [
  { type = "zoom" },
  { type = "datetime", format = "%H:%M" },
]
tab_bar_right_separator = " · "
window_title = "{hostname}: {workspace} / {tab} {terminal_title}"

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

## E. 本机校验输出（herdr config check，2026-10-25）

真实配置：

```
config: ok
```

未知键（`[ui] sidebar_wdith = 26`）：

```
config: issues found
unknown config key ui.sidebar_wdith; ignoring key
```

退出码 1。

类型错误（`[ui] sidebar_width = "wide"`，`sidebar_width` 期望 u16）：

```
config: issues found
config parse error: TOML parse error at line 2, column 17
  |
2 | sidebar_width = "wide"
  |                 ^^^^^^
invalid type: string "wide", expected u16
; using defaults
```

退出码 1。

## F. OMP 集成与 multiplexer 证据（2026-10-25）

`herdr integration status`：`omp: current (v10)`。

`herdr agent explain <pane>` 输出包含 `state=working`、`screen_detection_skipped=true`、`screen_detection_skip_reason=full_lifecycle_hook_authority`。

OMP 源码（`packages/tui/src/terminal-multiplexer.ts` 与 `packages/coding-agent/src/subprocess/terminal-launch/`）登记的 multiplexer：herdr、tmux、zellij、cmux、orca、screen、wmux。其中 terminal launch provider 标记 supported：herdr、tmux、zellij、cmux、orca；screen 与 wmux 仅识别，不提供启动实现。

OMP Herdr 适配行为：通知走 `herdr notification show`；`/fork pane` 走 `herdr pane split`，`/fork window`/`/fork tab` 走 `herdr tab create`；命令以临时自删除 `/bin/sh` 脚本经 `herdr pane run` 输入，兼容非 POSIX shell；Windows 不可用。识别条件读 `HERDR_ENV`/`HERDR_PANE_ID`/`HERDR_TAB_ID`/`HERDR_WORKSPACE_ID`；Herdr pane 内自动图像协议关闭（`imagesRequireOverride`），需显式 `PI_FORCE_IMAGE_PROTOCOL` 才尝试。

## G. 证据边界

- 文档声明（Herdr 官方 docs v0.9.5）：A、B、C 节全部字段与默认值来自 config-reference.json 与 configuration.mdx / cli-reference.mdx 原文。
- 本机直读：D 节 config.toml 全文、E 节三组 `herdr config check` 输出、`herdr integration status` 与 `herdr agent explain` 输出。
- 未验证：blocked 状态上报的运行时表现（代码可证、未实测）；外层窗口标题在浏览器标签页的实际显示；新快捷键 `prefix+t`/`prefix+alt+b` 的实际触发结果；临时客户端观察到的时钟与 OMP 标题行只证明新开客户端加载了配置，未证明原客户端已加载。
