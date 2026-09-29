- Source: https://herdr.dev/docs/socket-api/ + https://herdr.dev/docs/plugins/ + 本机 herdr 0.9.2 CLI/socket schema 实测（`herdr api schema --json`、`herdr --default-config`、`herdr plugin pane open --help`）
- Collected: 2026-09-29
- Published: Unknown（文档无发布日期，对应 herdr 0.9.2 tag 的 docs/next）

# Herdr 0.9.2 plugin pane placement 与打开方式 实测记录

## socket API 文档原文（v0.9.2 docs）

`plugin.pane.open` 请求示例与语义（socket-api.mdx）：

> Manifest pane `placement` defaults to `overlay`; request `placement` overrides the manifest with `overlay`, `popup`, `split`, `tab`, or `zoomed`. Overlay and popup placements use the active tiled pane as launch context. Popup terminals are session-modal and do not change the tab layout; optional `width` and `height` fields set their outer size as terminal cells or percentages such as `"80%"`. Omitted dimensions default to half the terminal size, with too-small values clamped to the popup minimum. A popup has no pane ID, remains outside all `pane.*` and agent APIs, emits no pane lifecycle events, leaves plugin focus context on the underlying tiled pane, and does not export `HERDR_PANE_ID` to its process. Popup launch returns `ok`; `popup.close` closes the active popup and returns `popup_not_open` when none exists. Split and zoomed panes target an existing pane; tab panes can target a workspace. Split, tab, zoomed, and overlay panes behave like normal Herdr panes, and `plugin.pane.focus` and `plugin.pane.close` continue to operate on those panes.

plugins.mdx Panes 节：

> Manifest pane `placement` defaults to `overlay`, which opens a temporary zoomed overlay over the active pane and restores the previous focus and zoom when it closes. A `plugin.pane.open` request can override the manifest placement with `overlay`, `popup`, `split`, `tab`, or `zoomed`.

> `placement = "popup"` opens a session-modal terminal popup without changing the tiled layout. It accepts optional `width` and `height` fields in the manifest or open request; omit them for the default half-size popup, use numbers for outer terminal-cell dimensions, or use strings like `"80%"` for a percentage of the terminal area. It receives all terminal input, including Escape, and closes when the command exits or a `popup.close` request is sent. Dimensions smaller than the popup minimum are clamped.

> A popup is a singleton session resource rather than a Herdr pane: it has no pane ID, does not change plugin focus context, emits no pane lifecycle events, and does not participate in pane, layout, persistence, or agent APIs. Its process does not receive `HERDR_PANE_ID`; the underlying tiled pane remains available through `HERDR_PLUGIN_CONTEXT_JSON`. Opening a popup returns `ui_busy` while Settings, Copy mode, or another Herdr modal is active, and `plugin.pane.open` returns an `ok` result after launch.

Manifest 声明示例（plugins.mdx）：

```toml
[[panes]]
id = "picker"
title = "Picker"
platforms = ["linux", "macos"]
placement = "popup"
width = "80%"
height = 20
command = ["sh", "picker.sh"]
```

## 本机 0.9.2 实测

`herdr api schema --json` 输出确认：`PluginPanePlacement` 枚举值为 `overlay | popup | split | tab | zoomed`（`plugin.pane.open` 请求的 `placement` 参数引用该定义）。

`herdr plugin pane open --help`（本机 0.9.2）的 `--placement` 可选值：`overlay|split|tab|zoomed` —— CLI 未暴露 `popup`（socket 请求侧与 CLI 枚举不一致，CLI 滞后）。

`herdr --default-config`（本机 0.9.2）相关键位默认值：

- `new_tab = "prefix+c"`，`prompt_new_tab_name = true`；重命名 `rename_tab = "prefix+shift+t"`；`switch_tab_1..9 = "prefix+1..9"`，前后切换 `switch_tab_next = "prefix+p"` / `switch_tab_previous = "prefix+n"`
- `zoom = "prefix+z"`（别名 fullscreen）
- 无 overlay/popup 的内建默认键位
- 新增 `[[keys.command]]` 自定义命令，三种 type：`shell`（后台运行）、`pane`（临时 pane）、`popup`（会话模态弹窗），示例：

```toml
[[keys.command]]
key = "prefix+alt+g"
type = "popup"
command = "lazygit"
width = "80%"
height = "80%"
```

- 多 prefix 键：`prefix = ["ctrl+space", "ctrl+s"]`（0.9.2 新增，#4653）
- `keys.clear_pane` 存在但默认未绑定

## 结论（2026-09-29 实测）

- placement 五值的语义分界：`split` / `tab` / `zoomed` 打开后是标准 herdr pane（有 pane ID、可 move/swap/resize/zoom、参与持久化）；`overlay` 是临时 zoomed 覆盖层（关闭后还原焦点与 zoom，有 pane ID 但生命周期随焦点）；`popup` 是 session 单例模态窗（无 pane ID、不进 pane/agent API、命令退出或 `popup.close` 关闭）。
- 用户侧打开方式：tab=`prefix+c`、zoom=`prefix+z`（对现有 pane 切换）；overlay 只能由插件 pane 默认 placement 触发；popup 可由 `[[keys.command]] type="popup"` 自定义键位触发，跑固定命令（弹通用 shell 用 `command = "$SHELL"`）。
- CLI `--placement` 枚举不含 popup；手动开 popup 走 socket JSON：`{"method":"plugin.pane.open","params":{"plugin_id":"<id>","entrypoint":"<id>","placement":"popup",...}}`，前提是插件已安装启用。
