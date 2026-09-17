# Herdr + Plannotator 工具链全量 Reference

> Sources: herdr 0.9.1, plannotator 0.27.15, GitHub
> Raw: [Herdr + Plannotator 调研摘录](../../raw/herdr-plannotator/2026-09-17-herdr-plannotator-investigation.md)
> Updated: 2026-09-17

---

## 1. Herdr CLI 完整命令表

### 1.1 顶层 Flags [实测 `herdr --help`]

| Flag                                   | 说明                                                 |
| -------------------------------------- | ---------------------------------------------------- |
| `--session <name>`                     | 使用或创建命名持久 session                           |
| `--machine <label-or-id>`              | 在保存的 SSH 机器上运行 API 命令                     |
| `--remote <target>`                    | 通过 SSH attach 到远程 Herdr 服务器                  |
| `--remote-keybindings <local\|server>` | remote attach 时使用本地或服务器键绑定（默认 local） |
| `--handoff`                            | update 或 remote attach 时启用 live handoff          |
| `--default-config`                     | 打印默认配置并退出                                   |
| `--skill`                              | 打印 agent skill 文件并退出                          |
| `--version, -V`                        | 打印版本并退出                                       |
| `--help, -h`                           | 显示帮助                                             |

### 1.2 完整子命令组 [实测]

| 组             | 子命令                                                                                                                                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agent`        | `list`, `get`, `read`, `send-keys`, `prompt`, `rename`, `focus`, `wait`, `attach`, `start`, `explain`                                                                                                                                                                                       |
| `pane`         | `list`, `current`, `get`, `layout`, `process-info`, `neighbor`, `edges`, `focus`, `resize`, `zoom`, `read`, `rename`, `input`, `split`, `swap`, `move`, `close`, `send-text`, `send-keys`, `wait-output`, `run`, `report-agent`, `report-agent-session`, `release-agent`, `report-metadata` |
| `workspace`    | `list`, `create`, `get`, `focus`, `rename`, `report-metadata`, `close`                                                                                                                                                                                                                      |
| `worktree`     | `list`, `create`, `open`, `remove`                                                                                                                                                                                                                                                          |
| `tab`          | `list`, `create`, `get`, `focus`, `rename`, `close`                                                                                                                                                                                                                                         |
| `session`      | `list`, `attach`, `stop`, `delete`                                                                                                                                                                                                                                                          |
| `machine`      | `list`, `add`, `rename`, `remove`, `enable`, `disable`                                                                                                                                                                                                                                      |
| `integration`  | `install`, `uninstall`, `status`                                                                                                                                                                                                                                                            |
| `plugin`       | `install`, `uninstall`, `link`, `unlink`, `enable`, `disable`, `list`, `config-dir`, `action`, `log`, `pane`                                                                                                                                                                                |
| `notification` | `show`                                                                                                                                                                                                                                                                                      |
| `config`       | `check`, `reset-keys`                                                                                                                                                                                                                                                                       |
| `channel`      | `show`, `set`                                                                                                                                                                                                                                                                               |
| `api`          | `snapshot`, `schema`                                                                                                                                                                                                                                                                        |
| `server`       | `stop`, `reload-config`, `agent-manifests`, `update-agent-manifests`, `reload-agent-manifests`                                                                                                                                                                                              |

### 1.3 agent 子命令完整 Flags [实测]

| 命令                                       | Flags                                                                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `agent list`                               | (无 flags)                                                                                                              |
| `agent get <target>`                       | (无 flags)                                                                                                              |
| `agent read <TARGET>`                      | `--source <visible\|recent\|recent-unwrapped\|detection>` (默认 recent), `--lines N`, `--format <text\|ansi>`, `--ansi` |
| `agent send-keys <TARGET> <KEY>...`        | (无 flags); `esc` 是规范 Escape 名，`escape` 也可接受                                                                   |
| `agent prompt <TARGET> <TEXT>`             | `--wait`, `--until <STATUS>` (repeatable; idle/working/blocked/done/unknown), `--timeout <MS>`                          |
| `agent wait <TARGET>`                      | `--until <STATUS>` (repeatable), `--timeout <MS>`; 无 `--until` 时匹配 idle/done/blocked                                |
| `agent rename <TARGET> <NAME>\|--clear`    | `--clear`                                                                                                               |
| `agent focus <target>`                     | (无 flags)                                                                                                              |
| `agent attach <TARGET>`                    | `--takeover`                                                                                                            |
| `agent start <NAME> --kind KIND --pane ID` | `--timeout <MS>` (默认 30000, max 300000), `-- <AGENT_ARG>...`                                                          |
| `agent explain [TARGET]`                   | `--file PATH --agent LABEL`, `--json`, `--format <text\|json>`, `-v/--verbose`                                          |

**agent start 支持的 kind** [实测]：`pi, claude, codex, gemini, cursor, devin, agy, cline, omp, mastracode, opencode, copilot, kimi, kiro, droid, amp, grok, hermes, kilo, qodercli, qwen, letta, maki, muse`

### 1.4 pane 子命令完整 Flags [实测]

| 命令                                  | Flags                                                                                                                                                                                                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pane list`                           | `--workspace <WORKSPACE_ID>`                                                                                                                                                                                                                                           |
| `pane current`                        | `--pane <ID>`, `--current`                                                                                                                                                                                                                                             |
| `pane get <pane_id>`                  | (无 flags)                                                                                                                                                                                                                                                             |
| `pane layout`                         | `--pane <ID>`, `--current`                                                                                                                                                                                                                                             |
| `pane process-info`                   | `--pane <ID>`, `--current`                                                                                                                                                                                                                                             |
| `pane neighbor`                       | `--direction <left\|right\|up\|down>` (required), `--pane <ID>`, `--current`                                                                                                                                                                                           |
| `pane edges`                          | `--pane <ID>`, `--current`                                                                                                                                                                                                                                             |
| `pane focus`                          | `--direction <left\|right\|up\|down>` (required), `--pane <ID>`, `--current`                                                                                                                                                                                           |
| `pane resize`                         | `--direction <left\|right\|up\|down>` (required), `--amount FLOAT`, `--pane <ID>`, `--current`                                                                                                                                                                         |
| `pane zoom [PANE_ID]`                 | `--pane <ID>`, `--current`, `--toggle/--on/--off`                                                                                                                                                                                                                      |
| `pane read <PANE_ID>`                 | `--source <visible\|recent\|recent-unwrapped\|detection>` (默认 recent), `--lines N`, `--format <text\|ansi>`, `--ansi`, `--raw`                                                                                                                                       |
| `pane rename <PANE_ID> [LABEL]...`    | `--clear`                                                                                                                                                                                                                                                              |
| `pane input [PANE_ID]`                | `--pane <ID>`, `--current`, `--right-click <herdr\|pane>` (required)                                                                                                                                                                                                   |
| `pane split [PANE_ID]`                | `--pane <ID>`, `--current`, `--direction <right\|down>`, `--ratio FLOAT`, `--cwd PATH`, `--env KEY=VALUE`, `--right-click <herdr\|pane>`, `--focus/--no-focus`                                                                                                         |
| `pane swap`                           | `--direction <left\|right\|up\|down>`, `--pane <ID>`, `--current`, `--source-pane <ID>`, `--target-pane <ID>`                                                                                                                                                          |
| `pane move <PANE_ID>`                 | `--tab <TAB_ID>`, `--split <right\|down>`, `--target-pane <ID>`, `--ratio FLOAT`, `--new-tab`, `--workspace <ID>`, `--new-workspace`, `--label TEXT`, `--tab-label TEXT`, `--focus/--no-focus`                                                                         |
| `pane close <pane_id>`                | (无 flags)                                                                                                                                                                                                                                                             |
| `pane send-text <PANE_ID> <TEXT>`     | (无 flags)                                                                                                                                                                                                                                                             |
| `pane send-keys <PANE_ID> <KEY>...`   | (无 flags)                                                                                                                                                                                                                                                             |
| `pane wait-output <PANE_ID>`          | `--match TEXT` 或 `--regex PATTERN` (required), `--source <visible\|recent\|recent-unwrapped>` (默认 recent), `--lines N`, `--timeout MS`, `--raw`                                                                                                                     |
| `pane run <PANE_ID> <COMMAND>...`     | (无 flags)                                                                                                                                                                                                                                                             |
| `pane report-agent <PANE_ID>`         | `--source ID` (req), `--agent LABEL` (req), `--state <idle\|working\|blocked\|unknown>` (req), `--message TEXT`, `--seq N`, `--agent-session-id ID`, `--agent-session-path PATH`                                                                                       |
| `pane report-agent-session <PANE_ID>` | `--source ID` (req), `--agent LABEL` (req), `--seq N`, `--agent-session-id ID`, `--agent-session-path PATH`, `--session-start-source SOURCE`                                                                                                                           |
| `pane release-agent <PANE_ID>`        | `--source ID` (req), `--agent LABEL` (req), `--seq N`                                                                                                                                                                                                                  |
| `pane report-metadata <PANE_ID>`      | `--source ID` (req), `--agent LABEL`, `--applies-to-source ID`, `--title TEXT`/`--clear-title`, `--display-agent TEXT`/`--clear-display-agent`, `--state-label STATUS=TEXT`/`--clear-state-labels`, `--token NAME=VALUE`/`--clear-token NAME`, `--seq N`, `--ttl-ms N` |

### 1.5 workspace 子命令完整 Flags [实测]

| 命令                                         | Flags                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `workspace list`                             | (无 flags)                                                                              |
| `workspace create`                           | `--cwd PATH`, `--label TEXT`, `--env KEY=VALUE`, `--focus/--no-focus`                   |
| `workspace get <workspace_id>`               | (无 flags)                                                                              |
| `workspace focus <workspace_id>`             | (无 flags)                                                                              |
| `workspace rename <WORKSPACE_ID> <LABEL>...` | (无 flags)                                                                              |
| `workspace report-metadata <WORKSPACE_ID>`   | `--source ID` (req), `--token NAME=VALUE`/`--clear-token NAME`, `--seq N`, `--ttl-ms N` |
| `workspace close <workspace_id>`             | ~~`[--group]`~~ **[冲突]** 见 1.6                                                       |

### 1.6 tab 子命令完整 Flags [实测]

| 命令                             | Flags                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `tab list`                       | `--workspace <WORKSPACE_ID>`                                                                        |
| `tab create`                     | `--workspace <WORKSPACE_ID>`, `--cwd PATH`, `--label TEXT`, `--env KEY=VALUE`, `--focus/--no-focus` |
| `tab get <tab_id>`               | (无 flags)                                                                                          |
| `tab focus <tab_id>`             | (无 flags)                                                                                          |
| `tab rename <TAB_ID> <LABEL>...` | (无 flags)                                                                                          |
| `tab close <tab_id>`             | (无 flags)                                                                                          |

### 1.7 worktree 子命令完整 Flags [实测]

| 命令              | Flags                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `worktree list`   | `--workspace <ID>`, `--cwd PATH`, `--trust-repository`                                                                                     |
| `worktree create` | `--workspace <ID>`, `--cwd PATH`, `--branch NAME`, `--base REF`, `--path PATH`, `--label TEXT`, `--focus/--no-focus`, `--trust-repository` |
| `worktree open`   | `--workspace <ID>`, `--cwd PATH`, `--path PATH`, `--branch NAME`, `--label TEXT`, `--focus/--no-focus`, `--trust-repository`               |
| `worktree remove` | `--workspace <ID>`, `--force`, `--trust-repository`                                                                                        |

### 1.8 session 子命令完整 Flags [实测]

| 命令                    | Flags      |
| ----------------------- | ---------- |
| `session list`          | `--json`   |
| `session attach <NAME>` | (无 flags) |
| `session stop <NAME>`   | `--json`   |
| `session delete <NAME>` | `--json`   |

### 1.9 machine 子命令完整 Flags [实测]

| 命令                           | Flags                                               |
| ------------------------------ | --------------------------------------------------- |
| `machine list`                 | `--json`                                            |
| `machine add <SSH_TARGET>`     | `--label LABEL` (required), `--remote-session NAME` |
| `machine rename <PROFILE_ID>`  | `--label LABEL` (required)                          |
| `machine remove <PROFILE_ID>`  | (无 flags)                                          |
| `machine enable <PROFILE_ID>`  | (无 flags)                                          |
| `machine disable <PROFILE_ID>` | (无 flags)                                          |

### 1.10 integration 子命令完整 Flags [实测]

| 命令                             | Flags                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `integration install <TARGET>`   | TARGET: pi/omp/claude/codex/copilot/devin/droid/kimi/opencode/kilo/hermes/qodercli/qwen/cursor/mastracode/antigravity-cli/grok/letta |
| `integration uninstall <TARGET>` | 同上                                                                                                                                 |
| `integration status`             | `--outdated-only`                                                                                                                    |

### 1.11 plugin 子命令完整 Flags [实测]

| 命令                                   | Flags                                                                                                                                                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin install <OWNER/REPO[/SUBDIR]>` | `--ref REF`, `-y/--yes`                                                                                                                                                                                           |
| `plugin uninstall <PLUGIN>`            | (无 flags)                                                                                                                                                                                                        |
| `plugin link <PATH>`                   | `--disabled/--enabled`                                                                                                                                                                                            |
| `plugin unlink <PLUGIN_ID>`            | (无 flags)                                                                                                                                                                                                        |
| `plugin enable <PLUGIN_ID>`            | (无 flags)                                                                                                                                                                                                        |
| `plugin disable <PLUGIN_ID>`           | (无 flags)                                                                                                                                                                                                        |
| `plugin list`                          | `--plugin <ID>`, `--json`                                                                                                                                                                                         |
| `plugin config-dir <PLUGIN_ID>`        | (无 flags)                                                                                                                                                                                                        |
| `plugin action list`                   | `--plugin <ID>`                                                                                                                                                                                                   |
| `plugin action invoke <ACTION_ID>`     | `--plugin <ID>`                                                                                                                                                                                                   |
| `plugin log list`                      | `--plugin <ID>`, `--limit N`                                                                                                                                                                                      |
| `plugin pane open`                     | `--plugin <ID>`, `--entrypoint <ID>`, `--placement <overlay\|split\|tab\|zoomed>`, `--workspace <ID>`, `--target-pane <PANE>`, `--direction <right\|down>`, `--cwd PATH`, `--env KEY=VALUE`, `--focus/--no-focus` |
| `plugin pane focus <PANE_ID>`          | (无 flags)                                                                                                                                                                                                        |
| `plugin pane close <PANE_ID>`          | (无 flags)                                                                                                                                                                                                        |

### 1.12 notification/config/channel/api/server 子命令 [实测]

| 命令                            | Flags                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `notification show <TITLE>`     | `--body TEXT`, `--position <top-left\|top-right\|bottom-left\|bottom-right>`, `--sound <none\|done\|request>` |
| `config check`                  | (无 flags)                                                                                                    |
| `config reset-keys`             | (无 flags)                                                                                                    |
| `channel show`                  | (无 flags)                                                                                                    |
| `channel set <CHANNEL>`         | `stable`/`preview`                                                                                            |
| `api snapshot`                  | (无 flags)                                                                                                    |
| `api schema`                    | `--json`, `--output PATH`                                                                                     |
| `server stop`                   | (无 flags)                                                                                                    |
| `server reload-config`          | (无 flags)                                                                                                    |
| `server agent-manifests`        | `--json`                                                                                                      |
| `server update-agent-manifests` | `--json`                                                                                                      |
| `server reload-agent-manifests` | (无 flags)                                                                                                    |
| `update`                        | `--handoff`                                                                                                   |
| `completion <SHELL>`            | `bash`/`elvish`/`fish`/`powershell`/`zsh`                                                                     |
| `status`                        | `--json`, sub: `server`/`client`                                                                              |

### 1.13 文档 vs 实测冲突 [冲突]

#### `workspace close --group`

| 来源                     | 声明                                                            | 实测结果                                        |
| ------------------------ | --------------------------------------------------------------- | ----------------------------------------------- |
| 官方文档 v0.9.1 [文档]   | `herdr workspace close <workspace_id> [--group]`                | `herdr workspace close --help` 不显示 `--group` |
| Socket API schema [实测] | `WorkspaceCloseParams` 包含 `close_group: boolean`              | `herdr api schema --json` 确认存在              |
| 本机 binary 0.9.1 [实测] | `herdr workspace close --group` 被解析为 workspace_id="--group" | 返回 `workspace_not_found`，不是 flag 行为      |

**结论**：Socket API 层支持 `close_group` 参数，但 CLI 层 `--group` flag 在 0.9.1 中未正确实现为 flag（被当作 positional argument）。这是文档与实现的冲突。

---

## 2. Herdr 配置项（config.toml）

**来源：** `herdr --default-config` [实测] + https://raw.githubusercontent.com/herdrdev/herdr/v0.9.1/docs/next/website/src/data/config-reference.json [文档]

### 2.1 完整配置结构

```toml
onboarding = false

[theme]
[terminal]
[update]
[keys]
[server]
[worktrees]
[ui]
[ui.toast]
[ui.toast.herdr]
[ui.toast.clipboard]
[ui.sound]
[ui.sound.agents]
[session]
[remote]
[experimental]
[advanced]
```

### 2.2 全部配置项表

| Key                                                | 默认值                                                   | 类型       | 说明                             | 来源 |
| -------------------------------------------------- | -------------------------------------------------------- | ---------- | -------------------------------- | ---- |
| `onboarding`                                       | unset（缺省时行为为 true）                               | bool       | 首次运行显示引导                 | 文档 |
| `theme.name`                                       | `"catppuccin"`                                           | string     | 内置主题                         | 实测 |
| `theme.auto_switch`                                | `false`                                                  | bool       | 跟随系统亮/暗                    | 实测 |
| `theme.dark_name`                                  | unset                                                    | string     | auto_switch 时的暗色主题         | 实测 |
| `theme.light_name`                                 | unset                                                    | string     | auto_switch 时的亮色主题         | 实测 |
| `theme.custom.*`                                   | unset                                                    | color      | 覆盖颜色 token                   | 实测 |
| `terminal.default_shell`                           | `""`                                                     | string     | 新 pane shell；空=$SHELL→/bin/sh | 实测 |
| `terminal.shell_mode`                              | `"auto"`                                                 | enum       | auto/login/non_login             | 实测 |
| `terminal.new_cwd`                                 | `"follow"`                                               | enum       | follow/home/current/fixed path   | 实测 |
| `terminal.kitty_graphics`                          | `true`                                                   | bool       | Kitty graphics 兼容              | 实测 |
| `update.channel`                                   | `"stable"`                                               | enum       | stable/preview                   | 实测 |
| `update.version_check`                             | `true`                                                   | bool       | 后台检查更新                     | 实测 |
| `update.manifest_check`                            | `true`                                                   | bool       | 后台检查 manifest                | 实测 |
| `keys.prefix`                                      | `"ctrl+b"`                                               | string     | 前缀键                           | 实测 |
| `keys.help`                                        | `"prefix+?"`                                             | keybinding | 帮助                             | 实测 |
| `keys.settings`                                    | `"prefix+s"`                                             | keybinding | 设置                             | 实测 |
| `keys.detach`                                      | `"prefix+q"`                                             | keybinding | 分离                             | 实测 |
| `keys.new_workspace`                               | `"prefix+shift+n"`                                       | keybinding | 新 workspace                     | 实测 |
| `keys.new_worktree`                                | `"prefix+shift+g"`                                       | keybinding | 新 worktree                      | 实测 |
| `keys.open_worktree`                               | unset                                                    | keybinding | 打开 worktree                    | 实测 |
| `keys.remove_worktree`                             | unset                                                    | keybinding | 删除 worktree                    | 实测 |
| `keys.rename_workspace`                            | `"prefix+shift+w"`                                       | keybinding | 重命名 workspace                 | 实测 |
| `keys.close_workspace`                             | `"prefix+shift+d"`                                       | keybinding | 关闭 workspace                   | 实测 |
| `keys.workspace_picker`                            | `"prefix+w"`                                             | keybinding | workspace 导航                   | 实测 |
| `keys.goto`                                        | `"prefix+g"`                                             | keybinding | session 导航                     | 实测 |
| `keys.navigate_workspace_up/down`                  | `"up"`/`"down"`                                          | keybinding | navigate 模式上下                | 实测 |
| `keys.navigate_pane_left/down/up/right`            | `"h"`/`"j"`/`"k"`/`"l"`                                  | keybinding | navigate 模式方向                | 实测 |
| `keys.previous_workspace`                          | unset                                                    | keybinding | 上一个 workspace                 | 实测 |
| `keys.next_workspace`                              | unset                                                    | keybinding | 下一个 workspace                 | 实测 |
| `keys.previous_agent`                              | unset                                                    | keybinding | 上一个 agent                     | 实测 |
| `keys.next_agent`                                  | unset                                                    | keybinding | 下一个 agent                     | 实测 |
| `keys.focus_agent`                                 | unset                                                    | keybinding | 按索引聚焦 agent                 | 实测 |
| `keys.remote_image_paste`                          | `"ctrl+v"`                                               | string     | remote 图片粘贴                  | 实测 |
| `keys.new_tab`                                     | `"prefix+c"`                                             | keybinding | 新 tab                           | 实测 |
| `keys.rename_tab`                                  | `"prefix+shift+t"`                                       | keybinding | 重命名 tab                       | 实测 |
| `keys.previous_tab`                                | `"prefix+p"`                                             | keybinding | 上一个 tab                       | 实测 |
| `keys.next_tab`                                    | `"prefix+n"`                                             | keybinding | 下一个 tab                       | 实测 |
| `keys.move_tab_previous`                           | unset                                                    | keybinding | tab 前移                         | 实测 |
| `keys.move_tab_next`                               | unset                                                    | keybinding | tab 后移                         | 实测 |
| `keys.switch_tab`                                  | `"prefix+1..9"`                                          | keybinding | 切换 tab 1-9                     | 实测 |
| `keys.switch_workspace`                            | unset                                                    | keybinding | 切换 workspace 1-9               | 实测 |
| `keys.close_tab`                                   | `"prefix+shift+x"`                                       | keybinding | 关闭 tab                         | 实测 |
| `keys.rename_pane`                                 | `"prefix+shift+p"`                                       | keybinding | 重命名 pane                      | 实测 |
| `keys.edit_scrollback`                             | `"prefix+e"`                                             | keybinding | 编辑 scrollback                  | 实测 |
| `keys.focus_pane_left/down/up/right`               | `"prefix+h/j/k/l"`                                       | keybinding | 聚焦方向                         | 实测 |
| `keys.swap_pane_left/down/up/right`                | `"prefix+shift+h/j/k/l"`                                 | keybinding | 交换 pane                        | 实测 |
| `keys.cycle_pane_next`                             | `"prefix+tab"`                                           | keybinding | 循环下一个 pane                  | 实测 |
| `keys.cycle_pane_previous`                         | `"prefix+shift+tab"`                                     | keybinding | 循环上一个 pane                  | 实测 |
| `keys.last_pane`                                   | unset                                                    | keybinding | 最后聚焦的 pane                  | 实测 |
| `keys.split_vertical`                              | `"prefix+v"`                                             | keybinding | 垂直拆分                         | 实测 |
| `keys.split_horizontal`                            | `"prefix+minus"`                                         | keybinding | 水平拆分                         | 实测 |
| `keys.close_pane`                                  | `"prefix+x"`                                             | keybinding | 关闭 pane                        | 实测 |
| `keys.zoom`                                        | `"prefix+z"`                                             | keybinding | 切换 zoom                        | 实测 |
| `keys.resize_mode`                                 | `"prefix+r"`                                             | keybinding | resize 模式                      | 实测 |
| `keys.resize_pane_left/down/up/right`              | unset                                                    | keybinding | 直接 resize                      | 实测 |
| `keys.toggle_sidebar`                              | `"prefix+b"`                                             | keybinding | 切换 sidebar                     | 实测 |
| `keys.copy_mode`                                   | `"prefix+["`                                             | keybinding | copy 模式                        | 实测 |
| `keys.indexed.tabs`                                | unset                                                    | string     | tab 索引快捷键 modifier          | 实测 |
| `keys.indexed.workspaces`                          | unset                                                    | string     | workspace 索引快捷键 modifier    | 实测 |
| `keys.indexed.agents`                              | unset                                                    | string     | agent 索引快捷键 modifier        | 实测 |
| `server.headless_cols`                             | `120`                                                    | int        | 无客户端时虚拟终端宽度           | 实测 |
| `server.headless_rows`                             | `40`                                                     | int        | 无客户端时虚拟终端高度           | 实测 |
| `worktrees.directory`                              | `"~/.herdr/worktrees"`                                   | path       | worktree 检出根目录              | 实测 |
| `ui.sidebar_width`                                 | `26`                                                     | int        | sidebar 默认宽度                 | 实测 |
| `ui.sidebar_min_width`                             | `18`                                                     | int        | sidebar 最小宽度                 | 实测 |
| `ui.sidebar_max_width`                             | `36`                                                     | int        | sidebar 最大宽度                 | 实测 |
| `ui.sidebar_start_collapsed`                       | `false`                                                  | bool       | 启动时折叠 sidebar               | 实测 |
| `ui.sidebar_collapsed_mode`                        | `"compact"`                                              | enum       | compact/hidden                   | 实测 |
| `ui.mobile_width_threshold`                        | `64`                                                     | int        | 移动端布局阈值                   | 实测 |
| `ui.mouse_capture`                                 | `true`                                                   | bool       | 捕获鼠标输入                     | 实测 |
| `ui.copy_on_select`                                | `true`                                                   | bool       | 选中自动复制                     | 实测 |
| `ui.host_cursor`                                   | `"auto"`                                                 | enum       | auto/native/drawn                | 实测 |
| `ui.right_click_passthrough_modifier`              | `""`                                                     | string     | 右键透传 modifier                | 实测 |
| `ui.redraw_on_focus_gained`                        | `true`                                                   | bool       | 聚焦时重绘                       | 实测 |
| `ui.mouse_scroll_lines`                            | `3`                                                      | int        | 滚轮行数                         | 实测 |
| `ui.confirm_close`                                 | `true`                                                   | bool       | 关闭确认                         | 实测 |
| `ui.prompt_new_tab_name`                           | `true`                                                   | bool       | 新 tab 命名提示                  | 实测 |
| `ui.prompt_new_workspace_name`                     | `false`                                                  | bool       | 新 workspace 命名提示            | 实测 |
| `ui.pane_borders`                                  | `"auto"`                                                 | enum       | auto/always/off                  | 实测 |
| `ui.pane_outer_borders`                            | `true`                                                   | bool       | 外边框                           | 实测 |
| `ui.pane_scrollbars`                               | `true`                                                   | bool       | 滚动条                           | 实测 |
| `ui.pane_gaps`                                     | `true`                                                   | bool       | pane 间隙                        | 实测 |
| `ui.show_agent_labels_on_pane_borders`             | `false`                                                  | bool       | 显示 agent 标签                  | 实测 |
| `ui.hide_tab_bar_when_single_tab`                  | `false`                                                  | bool       | 单 tab 隐藏                      | 实测 |
| `ui.tab_bar_position`                              | `"top"`                                                  | enum       | top/bottom                       | 实测 |
| `ui.tab_bar_right`                                 | `[]`                                                     | array      | 右侧状态栏条目                   | 实测 |
| `ui.tab_bar_right_separator`                       | `" "`                                                    | string     | 分隔符                           | 实测 |
| `ui.window_title`                                  | `"{hostname}: {workspace}"`                              | string     | 窗口标题模板                     | 实测 |
| `ui.agent_panel_sort`                              | `"spaces"`                                               | enum       | spaces/priority                  | 实测 |
| `ui.status_indicators`                             | `"dots"`                                                 | enum       | dots/symbols                     | 实测 |
| `ui.accent`                                        | `"cyan"`                                                 | color      | 强调色                           | 实测 |
| `ui.sidebar.agents.row_gap`                        | `0`                                                      | int        | agent 行间距                     | 实测 |
| `ui.sidebar.agents.rows`                           | `[["state_icon","machine","workspace","tab"],["agent"]]` | token rows | agent 行布局                     | 实测 |
| `ui.sidebar.agents.rows_by_agent`                  | `{}`                                                     | table      | per-agent 行覆盖                 | 实测 |
| `ui.sidebar.spaces.row_gap`                        | `0`                                                      | int        | space 行间距                     | 实测 |
| `ui.sidebar.spaces.rows`                           | `[["state_icon","workspace"],["branch","git_status"]]`   | token rows | space 行布局                     | 实测 |
| `ui.toast.delivery`                                | `"off"`                                                  | enum       | off/herdr/terminal/system        | 实测 |
| `ui.toast.delay_seconds`                           | `1`                                                      | int        | 通知延迟                         | 实测 |
| `ui.toast.herdr.position`                          | `"bottom-right"`                                         | enum       | 通知位置                         | 实测 |
| `ui.toast.clipboard.enabled`                       | `true`                                                   | bool       | 剪贴板通知                       | 实测 |
| `ui.toast.clipboard.position`                      | `"bottom-center"`                                        | enum       | 剪贴板通知位置                   | 实测 |
| `ui.sound.enabled`                                 | `true`                                                   | bool       | 声音通知                         | 实测 |
| `ui.sound.path`                                    | unset                                                    | path       | 自定义 mp3                       | 实测 |
| `ui.sound.done_path`                               | unset                                                    | path       | 完成通知 mp3                     | 实测 |
| `ui.sound.request_path`                            | unset                                                    | path       | 请求通知 mp3                     | 实测 |
| `ui.sound.agents.<agent>`                          | `"default"`                                              | enum       | per-agent 声音；droid 默认 off   | 实测 |
| `session.resume_agents_on_restore`                 | `true`                                                   | bool       | 重启后恢复 agent 会话            | 实测 |
| `remote.manage_ssh_config`                         | `true`                                                   | bool       | 管理 SSH keepalive               | 实测 |
| `experimental.allow_nested`                        | `false`                                                  | bool       | 允许嵌套启动                     | 实测 |
| `experimental.pane_history`                        | `false`                                                  | bool       | 保存 pane 历史                   | 实测 |
| `experimental.kitty_graphics`                      | unset                                                    | bool       | 已废弃，移至 terminal            | 实测 |
| `experimental.switch_ascii_input_source_in_prefix` | `false`                                                  | bool       | IME ASCII 切换                   | 实测 |
| `experimental.reveal_hidden_cursor_for_cjk_ime`    | `false`                                                  | bool       | CJK IME 光标                     | 实测 |
| `experimental.cjk_ime_agents`                      | `[]`                                                     | list       | 限定 agent                       | 实测 |
| `experimental.cjk_ime_cursor_shape`                | `"steady_block"`                                         | enum       | 光标形状                         | 实测 |
| `advanced.scrollback_limit_bytes`                  | `10000000`                                               | int        | scrollback 限制                  | 实测 |

### 2.3 环境变量 [文档]

| 变量                                                    | 用途                                    |
| ------------------------------------------------------- | --------------------------------------- |
| `HERDR_CONFIG_PATH`                                     | 覆盖配置文件路径                        |
| `HERDR_SESSION`                                         | 选择命名 session                        |
| `HERDR_SOCKET_PATH`                                     | 低级 socket 路径覆盖                    |
| `HERDR_PROCESS_DETECTION`                               | Linux 进程检测策略：native/child-groups |
| `HERDR_ENV`                                             | 在 Herdr 管理的 pane 中设为 1           |
| `HERDR_PANE_ID` / `HERDR_TAB_ID` / `HERDR_WORKSPACE_ID` | 当前 pane 的公共 ID                     |
| `HERDR_BIN_PATH`                                        | 当前 herdr 二进制路径                   |
| `HERDR_LOG`                                             | 日志过滤，如 herdr=debug                |
| `HERDR_AGENT`                                           | VM/沙箱包装器 agent 提示                |

---

## 3. Plannotator CLI

### 3.1 用户可见命令 [实测 `plannotator --help`]

| 命令                                                      | 用途                    | Flags                                                                                                         |
| --------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `plannotator --help`                                      | 显示帮助                |                                                                                                               |
| `plannotator --version, -v`                               | 打印版本                |                                                                                                               |
| `plannotator [--browser <name>]`                          | 无参数 = hook 集成模式  | `--browser` 覆盖浏览器                                                                                        |
| `plannotator review [PR_URL]`                             | 审查本地 VCS 或 PR      | `--git`, `--gitbutler`, `--base <ref>`, `--diff-type <type>`, `--local/--no-local`, `--tailscale`, `--json`   |
| `plannotator annotate <file/URL/folder>`                  | 标注 UI                 | `--markdown`, `--no-jina`, `--tailscale`, `--gate`, `--json`, `--hook`, `--require-approval`, `--result-file` |
| `plannotator annotate-last`                               | 标注最后 assistant 消息 | `--stdin`, `--tailscale`, `--gate`, `--json`, `--hook`                                                        |
| `plannotator copilot-last`                                | 标注 Copilot 最后消息   | `--gate`, `--json`, `--hook`                                                                                  |
| `plannotator setup-goal <interview\|facts> <bundle.json>` | /goal UI                | `--json`                                                                                                      |
| `plannotator last`                                        | annotate-last 别名      | 同 annotate-last                                                                                              |
| `plannotator archive`                                     | 查看 plan decisions     |                                                                                                               |
| `plannotator guide list`                                  | 列出 Guided Reviews     |                                                                                                               |
| `plannotator guide export`                                | 导出 HTML               | `--id`, `--guide`, `--patch`, `--snapshot`, `--out`, `--viewer-url`                                           |
| `plannotator guide share`                                 | 分享链接                | `--id`, `--guide`, `--patch`, `--snapshot`, `--public`, `--ttl`, `--json`                                     |
| `plannotator guide unshare`                               | 删除分享                | `<id> --token <deleteToken>`                                                                                  |
| `plannotator sessions`                                    | 列出活跃 sessions       | `--open [N]`, `--clean`                                                                                       |
| `plannotator uninstall`                                   | 卸载                    | `--purge`, `--yes/-y`, `--dry-run`                                                                            |
| `plannotator improve-context`                             | PreToolUse hook         |                                                                                                               |

### 3.2 review 完整 Flags [实测]

| Flag                 | 说明                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `--git`              | 强制 git（跳过自动检测）                                                                         |
| `--gitbutler`        | 强制 GitButler（需要 but 0.21.0+）                                                               |
| `--base <ref>`       | 对比目标（branch, origin/branch, tag, commit）                                                   |
| `--diff-type <type>` | since-base, local-vs-remote, uncommitted, staged, unstaged, last-commit, branch, merge-base, all |
| `--local`            | PR review 时准备本地 checkout（默认）                                                            |
| `--no-local`         | PR review 跳过本地 checkout                                                                      |
| `--tailscale`        | 通过 tailscale serve 发布                                                                        |
| `--json`             | 输出 `{decision, message}` JSON                                                                  |

### 3.3 annotate 完整 Flags [实测]

| Flag                   | 说明                                    |
| ---------------------- | --------------------------------------- |
| `--markdown`           | HTML 输入转为 markdown                  |
| `--no-jina`            | 用 fetch+Turndown 替代 Jina Reader      |
| `--tailscale`          | 通过 tailscale serve 发布               |
| `--gate`               | 添加 Approve 按钮                       |
| `--json`               | stdout 输出结构化 JSON                  |
| `--hook`               | 输出 hook 原生 JSON（block/pass）       |
| `--require-approval`   | 除非批准否则 exit 1（需 --gate --json） |
| `--result-file <path>` | 原子发布 stdout JSON                    |

### 3.4 guide 完整 Flags [实测]

**export:**

- `--id <savedGuideId>`: 使用 Plannotator 保存的 guide
- `--guide <guide.json>`: 自定义 guide JSON（需 --patch）
- `--patch <diff.patch>`: unified diff（`-` 从 stdin）
- `--snapshot <snapshot.json>`: 完整 snapshot JSON
- `--out <file>`: 输出路径（默认 `./guided-review-<slug>.html`；`-` = stdout）
- `--viewer-url <url>`: 覆盖 viewer URL

**share:**

- 上述 export 参数
- `--public`: 不加密存储
- `--ttl <duration>`: 自动删除（秒或 30m/24h/7d）
- `--json`: 输出 `{id, url, deleteToken, expiresAt?}`

**unshare:**

- `<id>`: share ID
- `--token <deleteToken>`: 删除 token

Exit codes: 0=done, 1=error, 2=usage

### 3.5 源码内部模式 [源码]（不在 --help 中）

`apps/hook/server/index.ts` 注释列出：

| 模式                     | 说明                        | 调用方          |
| ------------------------ | --------------------------- | --------------- |
| `copilot-plan`           | Copilot CLI preToolUse hook | Copilot CLI     |
| `opencode-plan`          | OpenCode CLI fallback       | OpenCode plugin |
| `opencode-review`        | OpenCode review bridge      | OpenCode plugin |
| `opencode-annotate-last` | OpenCode annotation bridge  | OpenCode plugin |

### 3.6 环境变量 [文档+实测]

| 变量                           | 说明                                   |
| ------------------------------ | -------------------------------------- |
| `PLANNOTATOR_DATA_DIR`         | 覆盖数据目录                           |
| `PLANNOTATOR_REMOTE`           | remote/local 模式                      |
| `PLANNOTATOR_PORT`             | 固定端口                               |
| `PLANNOTATOR_SHARE=disabled`   | 禁用分享                               |
| `PLANNOTATOR_GUIDE_SHARE_URL`  | 自定义 share URL                       |
| `PLANNOTATOR_GUIDE_VIEWER_URL` | 自定义 viewer URL                      |
| `PLANNOTATOR_PRESENTER`        | 外部 presenter（herdr-plannotator 用） |

### 3.7 数据目录 [实测]

```
~/.plannotator/
  config.json           # 用户配置
  install-prefs         # 安装偏好
  plans/                # plan reviews
  history/<project>/    # annotate sessions
  sessions/             # 活跃 session 文件
  feedback/             # 反馈
  drafts/               # 草稿
  active/               # 活跃数据
  migrations/           # 迁移
  semantic-diff/        # 语义 diff
  vendor/               # vendored 依赖
```

---

## 4. Herdr 插件系统

### 4.1 核心机制 [文档 https://herdr.dev/docs/plugins/]

- 无 SDK，整个 CLI 即 API
- Manifest: `herdr-plugin.toml`
- 安装: `herdr plugin install owner/repo[/subdir]`
- 环境注入: `HERDR_BIN_PATH`, `HERDR_PLUGIN_ROOT`, `HERDR_PLUGIN_CONFIG_DIR`, `HERDR_PLUGIN_STATE_DIR`, `HERDR_PLUGIN_CONTEXT_JSON`

### 4.2 Manifest 结构 [文档]

```toml
id = "example.layout"           # 必填
name = "Layout"                 # 必填
version = "0.1.0"               # 必填
min_herdr_version = "0.7.0"     # 必填
description = "..."             # 可选
platforms = ["linux", "macos", "windows"]

[[build]]                       # 安装时运行
[[startup]]                     # server 恢复后运行一次
[[actions]]                     # 可调用 action
[[events]]                      # 事件钩子（如 worktree.created）
[[panes]]                       # 插件 pane
[[link_handlers]]               # URL 路由
```

### 4.3 插件生态发现快照 [实测 GitHub 搜索 2026-09-17]

以下是 `gh search repos "herdr-plugin"` 的搜索结果（最多 100 条，按更新时间排序）。

**边界声明**：

- 未验证 GitHub topic `herdr-plugin`
- 未验证每仓库有可解析 `herdr-plugin.toml`
- 包含非插件仓库（dotfiles、客户端、主题等）
- 仅前 100 条，非穷尽

**权威纳入标准**（Marketplace）: GitHub topic `herdr-plugin` + 默认分支有可解析 manifest。

| 仓库                                  | 描述                                         |
| ------------------------------------- | -------------------------------------------- |
| `dibin666/herdr-remote`               | 远程浏览器访问 Herdr 终端 workspace          |
| `fuad-daoud/relay`                    | planner/builder agent 间 plan/report handoff |
| `inkayat/dotfiles`                    | Herdr 插件、键绑定和设置                     |
| `karanpatel1993/herdr-nav`            | 文件导航、代码搜索、jdb 调试                 |
| `ivanarama/PromptPilot`               | Claude Code 后台任务队列                     |
| `bearylabs/herdr-autofetch`           | 自动 fetch 开放 workspace 的 Git 仓库        |
| `lamngockhuong/herdr-worktree-setup`  | 新 worktree 自动准备配置                     |
| `openclaw/crabbox`                    | warm a box, sync the diff, run the suite     |
| `ulrichanani/herdr-processes`         | Agent sidebar 显示长时间运行的命令           |
| `MIDO-ruby7/herdr-plugins-directory`  | herdr 插件链接集合                           |
| `AltanS/collie`                       | PWA 管理 herdr                               |
| `kryptamine/herdr-auto-title`         | Tab 标题自动跟随工作内容                     |
| `mgh3326/scopefuel`                   | Scope-aware headroom gauge                   |
| `gysi/my-herdr`                       | 自定义 herdr 插件                            |
| `levi-qiao/herdr-agent-quota`         | AI quota/context/cache 显示                  |
| `AltanS/herdr-cache-alert`            | Prompt-cache 倒计时                          |
| `asumaran/asgitlog`                   | git 历史浏览                                 |
| `ZviBaratz/herdr-draft`               | 新 session 创建对话框                        |
| `uwuclxdy/clauth`                     | Claude Code 多账户管理器                     |
| `aliou/herdr-cast`                    | macOS 通知、模糊 workspace 导航              |
| `yankewei/herdr-focus-notify`         | 可点击 macOS 通知                            |
| `powerfooI/roamgate`                  | Herdr 桌面/移动客户端                        |
| `smarzban/tsk`                        | 终端共享任务板                               |
| `July24/pier`                         | Pi coding-agent carrier + Herdr              |
| `KarthusLorin/herdr-turn-coordinator` | 保留交互式 agent TUI                         |
| `ananianatid/herdr-ssh-sessions`      | SSH/mosh sessions 显示为 agent rows          |
| `ponzu07/herdr-git-status`            | (无描述)                                     |
| `randomradio/herdr-ports`             | 端口转发到 localhost                         |
| `tim80411/herdr-pdf`                  | PDF viewer 插件                              |
| `openalon-org/herdr-bar`              | macOS 菜单栏                                 |
| `pangpond/herdr-theme-cobalt2`        | Cobalt2 主题                                 |
| `shunia/herdr-pane-index`             | pane 索引显示                                |
| `zenbu-labs/terminal-browser`         | 终端内浏览器                                 |
| `kadaliao/herdr-space-index`          | workspace 切换号显示                         |
| `iurysza/herdr-mosaic`                | space 颜色、agent 分组、pane 布局            |
| `madarco/agentbox`                    | 沙箱 VM 中并行运行 agent                     |
| `KamalF/herdr-busywatch`              | 是否有任务在运行                             |
| `edxeth/herdr-pi-tree`                | Pi agents 树形显示                           |
| `wxomi/herdr-session-titles`          | 丰富 session 标题                            |
| `hhdebb/herdr-radar`                  | 谁在工作、谁在等你                           |
| `vekexasia/pi-extensible-workflows`   | Pi 多 agent 工作流编排                       |
| `zbyhoo/herdr-image-gallery`          | 图片浏览                                     |
| `rhinoc/herdr-quickpad`               | Notes 和 shell 命令 popup                    |
| `fulanto/herdr-oncall`                | 浮动面板/Telegram 回复权限提示               |
| `Adroz/herdr-feedr`                   | markdown-backed to-do sidebar                |
| `asumaran/herdr-goto`                 | 树形切换器                                   |
| `deepshape-ai/herdr-hive`             | 团队共享 Herdr session                       |
| `j-chmielewski/herdr-last-tab`        | last pane/tab 导航改进                       |
| `quaywin/agys`                        | Antigravity CLI 多配置隔离                   |
| `Yassimba/loom`                       | Curated agent skills + Herdr plugins         |
| `hlouis/herdr-glab`                   | GitLab MR 集成                               |
| `houz42/herdr-whichkey`               | which-key 风格键位 popup                     |
| `j1nn0/herdr-harvest`                 | Agent 完成输出捕获到 Result Inbox            |
| `victorstein/herdr-plugin-pipeline`   | spec→review→plan→execute→CI→merge 管道       |
| `ihubanov/herdr-ui-plugin`            | Claude Code herdr 插件                       |
| `yersonargotev/tabby`                 | Tab 标签                                     |
| `m1sk9/strays`                        | Claude Code 集中管理 TUI                     |
| `aneym/herdr-voice`                   | 语音控制 herdr                               |
| `tifandotme/dotfiles`                 | dotfiles                                     |
| `yafeishi/herdr-session-history`      | Per-pane 对话历史                            |
| `EdTheBearded/herdbake`               | bitbake 菜单路由到 Herdr                     |
| `Soul-Brews-Studio/maw-herdr-plugin`  | maw herdr 集成                               |
| `rapha4lx/herdr-worktree-stack`       | (无描述)                                     |
| `m1sk9/herdr-worktree-hooks-plugin`   | worktree 自定义 hooks                        |
| `speardragon/herdr-plugin-manager`    | 插件管理 popup                               |
| `makyinmars/herdr-context.nvim`       | Neovim 上下文发送                            |
| `cobanov/herdrchat`                   | 手机控制 herdr agents                        |
| `fullerzz/herdr-plugin-sesh`          | Sesh 风格 workspace picker                   |
| `jirathip-dev/corral`                 | 只读 fleet monitor                           |
| `barnabys-drew/claude-code-skills`    | Claude Code 插件集                           |
| `aman0singh/herdr-subs`               | AI 订阅显示                                  |
| `eugenioenko/ttt`                     | TTT Editor                                   |
| `nabutabu/herdr-observr`              | OTLP 遥测                                    |
| `codergeek121/herdr-rails`            | Herdr + Rails                                |
| `stevederico/herdr-plugins`           | 本地插件集                                   |
| `timmo001/herdr-workflow-watch`       | GitHub workflow 失败指示                     |
| `Tomyail/herdr-connect`               | iPhone 监控/control                          |
| `rodeyseijkens/codey`                 | review-first Git TUI                         |
| `JJLiebig/herdr-plugins`              | 从 GitHub issue/PR 启动 agent                |
| `Seigiard/herdr-command-palette`      | 命令面板                                     |

**Marketplace 机制** [文档]: GitHub topic `herdr-plugin`，索引每 30 分钟刷新，herdr.dev/plugins 浏览。

---

## 5. `plannotator/herdr-annotate` 仓库

### 5.1 基本信息 [实测]

| 属性              | 值                                                              |
| ----------------- | --------------------------------------------------------------- |
| 仓库              | `plannotator/herdr-annotate`                                    |
| Stars             | ~500                                                            |
| Forks             | 17                                                              |
| 最新 commit       | `7c8f5a177b8285dc56efc471ef04f7ab44a2b4b6`                      |
| 版本              | 0.4.0 (herdr-annotate.version), 0.8.0 (plannotator-tui.version) |
| min_herdr_version | 0.8.0                                                           |
| 平台              | linux, macos, windows                                           |
| License           | MIT                                                             |

### 5.2 安装 [文档]

**Full**: `herdr plugin install plannotator/herdr-annotate`
**Lite**: `herdr plugin install plannotator/herdr-annotate/lite`

### 5.3 必需键绑定 [文档]

```toml
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

# Full 额外:
[[keys.command]]
key = "prefix+o"
type = "plugin_action"
command = "annotate.open"

[[keys.command]]
key = "prefix+shift+o"
type = "plugin_action"
command = "annotate.last"
```

### 5.4 功能 [文档+源码]

| 功能                | 按键             | 说明                     |
| ------------------- | ---------------- | ------------------------ |
| 标注选中终端文本    | `prefix+a`       | 评论弹窗，Ctrl+S 保存    |
| 复制所有标注        | `prefix+shift+a` | Markdown 到剪贴板        |
| 复制并归档          | `prefix+ctrl+a`  | 复制后归档               |
| 管理标注            | `prefix+m`       | 浏览/复制/归档/恢复/删除 |
| 审查文档            | `prefix+o`       | plannotator-tui 打开     |
| 审查 agent 最后回复 | `prefix+shift+o` | 提取最后消息             |

### 5.5 技术架构 [源码]

- **语言**: Rust (edition 2024, rust-version 1.96)
- **依赖**: chrono, ratatui 0.30, serde, serde_json, uuid, rustix (unix), signal-hook (unix)
- **二进制**: `bin/herdr-annotate.exe`
- **存储**: JSONL (`annotations.jsonl`, `archives.jsonl`) 在 `HERDR_PLUGIN_STATE_DIR`
- **OSC 52**: Herdr 0.9.0+ 转发 pane 输出的 OSC 52 序列
- **Handoff**: `$XDG_RUNTIME_DIR/herdr-annotate-<uid>/selection`，15 秒过期

### 5.6 文件结构 [源码]

```
herdr-annotate/
  herdr-plugin.toml       # Full manifest
  lite/
    herdr-plugin.toml     # Lite manifest
  rust/
    Cargo.toml            # Rust 项目
    src/
      main.rs             # 入口
      cli.rs              # 命令分发
      lib.rs              # 模块导出
      editor.rs           # 评论编辑器
      manager.rs          # 标注管理器
      store.rs            # JSONL 存储
      format.rs           # Markdown 导出
      clipboard.rs        # 平台剪贴板
      pane_clipboard.rs   # OSC 52
      handoff.rs          # selection 传递
      herdr.rs            # Herdr CLI 回调
      types.rs            # 数据类型
      paths.rs            # 路径解析
      archive_workflow.rs # 归档工作流
      manager_copy.rs     # 管理器复制
      edit_keys.rs        # 编辑键
      layout.rs           # 布局
      width.rs            # 宽度计算
      termination.rs      # 信号处理
  scripts/
    fetch-herdr-annotate.sh/ps1
    fetch-plannotator-tui.sh/ps1
    stage-local.sh
    lite-regression.py
    smoke.sh
    test-*.sh/ps1
  skills/
    plannotator-tui/SKILL.md
  docs/
    lite-testing.md
    windows-full-acceptance.md
  assets/
  bin/
```

### 5.7 数据类型 [源码]

```rust
// 标注
struct Annotation {
    selected_text: String,
    captured_at: String,
    context: InvocationContext,  // workspace_id, tab_id, pane_id, agent 等
    id: String,
    comment: String,
    created_at: String,
}

// 归档集
struct ArchivedAnnotationSet {
    version: u8,  // = 1
    id: String,
    archived_at: String,
    annotations: Vec<Annotation>,
}

// 调用上下文
struct InvocationContext {
    workspace_id: Option<String>,
    workspace_label: Option<String>,
    tab_id: Option<String>,
    tab_label: Option<String>,
    focused_pane_id: Option<String>,
    focused_pane_cwd: Option<String>,
    focused_pane_agent: Option<String>,
}
```

---

## 6. `plannotator/herdr-plannotator` 仓库

### 6.1 基本信息 [实测]

| 属性              | 值                                         |
| ----------------- | ------------------------------------------ |
| 仓库              | `plannotator/herdr-plannotator`            |
| Stars             | ~25                                        |
| Forks             | 1                                          |
| 最新 commit       | `e10b969ea1655dbfce25d1464eef6f27c790bb79` |
| 插件 ID           | `official.plannotator`                     |
| min_herdr_version | 0.7.5                                      |
| 平台              | linux, macos                               |
| License           | MIT                                        |

### 6.2 依赖 [README]

- Herdr 0.7.5+
- Plannotator（支持外部 presenter）
- `ogulcancelik/herdr-browser`（插件 ID `official.browser`）
- Bun
- Google Chrome / Chromium
- `experimental.kitty_graphics = true`

### 6.3 安装 [README]

```bash
herdr plugin install ogulcancelik/herdr-browser --yes
# config.toml: [experimental] kitty_graphics = true
herdr server reload-config

herdr plugin install plannotator/herdr-plannotator --yes
herdr plugin action invoke configure --plugin official.plannotator
herdr plugin log list --plugin official.plannotator --limit 1
herdr plugin action invoke doctor --plugin official.plannotator
```

### 6.4 配置机制 [源码]

修改 `~/.plannotator/config.json`:

```json
{
  "presenter": {
    "command": "/path/to/presenter",
    "when": "herdr"
  }
}
```

- 记录 ownership metadata（`_herdrPlannotator` key）
- unconfigure 恢复之前的 presenter
- `PLANNOTATOR_PRESENTER` 环境变量优先

### 6.5 工作原理 [源码]

1. Plannotator 有页面时，运行 presenter helper，传入 JSON 请求
2. Helper 要求 Herdr 打开 focused、zoomed 的 `official.browser` pane
3. Herdr 返回 pane ID
4. 审查完成后，helper 关闭 pane

### 6.6 Presenter 协议 [源码]

```typescript
// 请求
{ protocol: 1, action: "present", url: string, kind: string }
{ protocol: 1, action: "dismiss", handle: { paneId: string } }

// 响应
{ protocol: 1, ok: true, handle?: { paneId: string } }
{ protocol: 1, ok: false, error: { code, message } }
```

约束：URL 必须 HTTP loopback 无 credentials；kind 匹配 `/^[a-z][a-z0-9-]{0,63}$/`；最大 64 KiB；15 秒 deadline。

### 6.7 文件结构 [源码]

```
herdr-plannotator/
  herdr-plugin.toml       # 插件 manifest
  package.json            # Bun 项目
  bun.lock
  tsconfig.json
  bin/
    herdr-plannotator-present  # presenter 可执行文件
  src/
    actions/
      configure.ts        # 配置 action
      doctor.ts           # 诊断 action
      unconfigure.ts      # 取消配置 action
    browser-pane.ts       # Browser pane 开关
    command.ts            # 命令执行
    configuration.ts      # 配置逻辑
    constants.ts          # 常量
    herdr.ts              # Herdr 运行时解析
    integration-config.ts # 集成配置
    json-file.ts          # JSON 原子读写
    paths.ts              # 路径解析
    plannotator-config.ts # Plannotator presenter 配置
    presenter-protocol.ts # Presenter 协议
    presenter.ts          # Presenter 主逻辑
```

### 6.8 常量 [源码]

```typescript
PLUGIN_ID = "official.plannotator";
BROWSER_PLUGIN_ID = "official.browser";
BROWSER_INITIAL_URL_ENV = "HERDR_BROWSER_INITIAL_URL";
PRESENTER_PROTOCOL = 1;
MIN_HERDR_VERSION = "0.7.5";
INTEGRATION_CONFIG_SCHEMA = 2;
OWNERSHIP_KEY = "_herdrPlannotator";
MAX_PROTOCOL_BYTES = 64 * 1024;
// Timeouts (ms)
HERDR_VERSION_TIMEOUT_MS = 2000;
BROWSER_DISCOVERY_TIMEOUT_MS = 2000;
BROWSER_PANE_COMMAND_TIMEOUT_MS = 3000;
BROWSER_READY_TIMEOUT_MS = 6000;
BROWSER_READY_MATCH_TIMEOUT_MS = 5000;
```

---

## 7. 使用场景速查

| 场景                           | 工具              | 命令                                             |
| ------------------------------ | ----------------- | ------------------------------------------------ |
| 并行运行 agent                 | herdr             | `herdr`                                          |
| 控制其他 agent                 | herdr             | `herdr agent prompt <name> "..." --wait`         |
| 后台运行测试                   | herdr             | `herdr pane run <id> "npm test"` + `wait-output` |
| 审查计划                       | plannotator       | `plannotator review`                             |
| 标注 Markdown                  | plannotator       | `plannotator annotate <file>`                    |
| Herdr 中标注终端               | herdr-annotate    | `prefix+a`                                       |
| Herdr Browser 打开 Plannotator | herdr-plannotator | 配置后自动                                       |
| 导出 Guided Review             | plannotator       | `plannotator guide export`                       |
| 远程访问 Herdr                 | herdr             | `herdr --remote <host>`                          |
| 管理 worktree                  | herdr             | `herdr worktree create --branch feature-x`       |
| 自定义 Herdr 工作流            | herdr plugin      | 写 `herdr-plugin.toml`                           |

---

## Sources

| 来源                       | URL/路径                                                                                                        | 版本/Commit           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------- |
| herdr CLI                  | `herdr --help`, `herdr <cmd> --help`                                                                            | 0.9.1                 |
| herdr config               | `herdr --default-config`                                                                                        | 0.9.1                 |
| herdr 文档                 | https://herdr.dev/llms.txt                                                                                      | v0.9.1                |
| herdr CLI reference        | https://raw.githubusercontent.com/herdrdev/herdr/v0.9.1/docs/next/website/src/content/docs/cli-reference.mdx    | v0.9.1                |
| herdr config reference     | https://raw.githubusercontent.com/herdrdev/herdr/v0.9.1/docs/next/website/src/data/config-reference.json        | v0.9.1                |
| herdr plugins              | https://raw.githubusercontent.com/herdrdev/herdr/v0.9.1/docs/next/website/src/content/docs/plugins.mdx          | v0.9.1                |
| herdr marketplace          | https://raw.githubusercontent.com/herdrdev/herdr/v0.9.1/docs/next/website/src/content/docs/marketplace.mdx      | v0.9.1                |
| herdr socket API           | https://raw.githubusercontent.com/herdrdev/herdr/v0.9.1/docs/next/website/src/content/docs/socket-api.mdx       | v0.9.1                |
| herdr integrations         | https://raw.githubusercontent.com/herdrdev/herdr/v0.9.1/docs/next/website/src/content/docs/integrations.mdx     | v0.9.1                |
| herdr agents               | https://raw.githubusercontent.com/herdrdev/herdr/v0.9.1/docs/next/website/src/content/docs/agents.mdx           | v0.9.1                |
| herdr agent automation     | https://raw.githubusercontent.com/herdrdev/herdr/v0.9.1/docs/next/website/src/content/docs/agent-automation.mdx | v0.9.1                |
| herdr agent guide          | https://herdr.dev/agent-guide.md                                                                                | latest                |
| plannotator CLI            | `plannotator --help`, `plannotator <cmd> --help`                                                                | 0.27.15               |
| plannotator source         | https://github.com/backnotprop/plannotator                                                                      | commit `2a51b26e1bfa` |
| plannotator hooks          | https://github.com/backnotprop/plannotator/blob/master/apps/hook/hooks/hooks.json                               | latest                |
| plannotator server         | https://github.com/backnotprop/plannotator/blob/master/apps/hook/server/index.ts                                | latest                |
| herdr-annotate             | https://github.com/plannotator/herdr-annotate                                                                   | commit `7c8f5a177b82` |
| herdr-annotate README      | https://github.com/plannotator/herdr-annotate/blob/master/README.md                                             | latest                |
| herdr-annotate manifest    | https://github.com/plannotator/herdr-annotate/blob/master/herdr-plugin.toml                                     | latest                |
| herdr-annotate rust        | https://github.com/plannotator/herdr-annotate/tree/master/rust/src                                              | latest                |
| herdr-plannotator          | https://github.com/plannotator/herdr-plannotator                                                                | commit `e10b969ea165` |
| herdr-plannotator README   | https://github.com/plannotator/herdr-plannotator/blob/master/README.md                                          | latest                |
| herdr-plannotator manifest | https://github.com/plannotator/herdr-plannotator/blob/master/herdr-plugin.toml                                  | latest                |
| herdr-plannotator src      | https://github.com/plannotator/herdr-plannotator/tree/master/src                                                | latest                |
| GitHub plugin search       | `gh search repos "herdr-plugin"`                                                                                | 2026-09-17            |
