# TUIOS 配置与用户体验

> Sources: 本机 TUIOS 0.12.0 配置与选项元数据, 2026-10-31; AGC 同步与验收记录, 2026-10-31
> Raw: [本机配置快照（0.10.0）](../../raw/terminal-multiplexers/2026-10-17-tuios-local-config-snapshot.md); [0.10.0 选项元数据](../../raw/terminal-multiplexers/2026-10-17-tuios-0.10.0-option-metadata.md); [AGC 配置纳管记录](../../raw/terminal-multiplexers/2026-10-17-agc-tuios-config-tracking.md); [TUIOS 0.12.0 配置 schema 与持久化](../../raw/terminal-multiplexers/2026-10-31-tuios-0.12.0-config-schema-and-persistence.md); [TUIOS 配置 prune 与 0.12.0 快照](../../raw/terminal-multiplexers/2026-10-31-tuios-config-prune-and-0.12.0-snapshot.md)
> Updated: 2026-10-31

## Overview

`tuios` 与 `tuios-web` 共用 `/home/cpf/.config/tuios/config.toml`。TUIOS 0.12.0 没有发布独立 `.schema.json`，配置约束由三套机制组成（见下文）。当前配置已通过 `tuios config prune` 精简，文件从 644 行降至 153 行。

## 启动与新会话

| 设置 | 当前值与体验 | 可取值 |
|---|---|---|
| `startup.daemon` | `true`：直接启动时接入后台会话，关闭客户端后 pane 继续存在 | `true`、`false` |
| `startup.open_default_window` | `false`：新会话不会自动创建终端 | `true`、`false` |
| `startup.tiled` | `true`：新窗口进入平铺布局 | `true`、`false` |
| `startup.layout` | `bsp`：新会话使用二分平铺 | `bsp`、`master-stack`、`scrolling` |
| `startup.start_in_terminal_mode` | `false`：启动后先处于窗口管理模式 | `true`、`false` |

这些设置主要影响新会话。已有会话会保留自己的窗口和布局。

## 平铺、主窗口与滚动布局

| 设置 | 当前值与体验 | 可取值 |
|---|---|---|
| `appearance.tiling_scheme` | `spiral`：BSP 新窗口按螺旋方向分割 | `spiral`、`longest_side`、`alternate`、`smart_split` |
| `appearance.master_position` | `left`：主窗口位于左侧 | `left`、`right`、`top`、`bottom`、`center` |
| `appearance.master_ratio` | `50`：主窗口占一半 | `10`–`90` |
| `appearance.master_count` | `1`：一个主窗口 | `1`–`9` |
| `appearance.gap` | `0`：窗口间没有额外空隙 | `0`–`8` 个单元格 |
| `appearance.scroll_column_width` | `55`：滚动布局列宽为屏幕的 55% | `20`–`100` |
| `appearance.scroll_column_max` | `90`：滚动列最多占屏幕的 90% | `20`–`100` |
| `appearance.niri_scroll_cells` | `8`：每次滚动移动 8 个单元格 | `1`–`200` |
| `appearance.niri_reverse_scroll` | `false`：不反转方向 | 布尔值 |

主窗口参数在 `master-stack` 中生效，滚动列参数在 `scrolling` 中生效。当前默认布局是 BSP，因此切换布局后才会看到对应变化。

## 缩放、画中画和临时终端

| 设置 | 当前值与体验 | 可取值 |
|---|---|---|
| `appearance.zoom_size` | `95`：缩放后占据大部分屏幕，仍保留周围上下文 | `50`–`100` |
| `appearance.zoom_max_width` | `0`：不设置单独宽度上限 | 非负整数 |
| `pip.width` | `40`：画中画宽 40 列 | `12`–`200` |
| `pip.height` | `12`：画中画高 12 行 | `3`–`100` |
| `pip.corner` | `bottom-right`：优先位于右下角 | 四个屏幕角 |
| `scratch.width` | `80%`：临时终端使用大部分宽度 | 单元格数或百分比 |
| `scratch.height` | `80%`：临时终端使用大部分高度 | 单元格数或百分比 |

画中画适合持续观察另一个任务，临时终端适合执行一次操作后收起。

## 边框、标题栏与按钮

| 设置 | 当前值与体验 | 可取值 |
|---|---|---|
| `appearance.border_style` | `rounded`：圆角边框 | `rounded`、`normal`、`thick`、`double`、`block`、`outer-half-block`、`inner-half-block`、`ascii`、`hidden`、`glyphs` |
| `appearance.zen_mode` | `disabled`：始终显示边框 | `disabled`、`always`、`mouse` |
| `appearance.window_title_position` | `top`：标题在顶部 | `top`、`bottom`、`hidden` |
| `appearance.window_title_format` | 空：使用默认标题 | 可含 `{title}`、`{index}`、`{cwd}` |
| `appearance.hide_window_buttons` | `false`：显示窗口按钮 | 布尔值 |
| `appearance.window_button_style` | `dots`：点状按钮 | `pill`、`dots` |
| `appearance.window_button_position` | `left`：按钮位于左端 | `left`、`right` |
| `appearance.session_border` | `true`：边框颜色帮助辨认会话 | 布尔值 |
| `appearance.border_focused_color` | 空：焦点边框沿用主题 | 空或 `#RRGGBB` |
| `appearance.border_unfocused_color` | 空：非焦点边框沿用主题 | 空或 `#RRGGBB` |

`zen_mode=mouse` 会在鼠标静止时隐藏边框，移动后恢复，适合减少静止画面的视觉元素。

## 状态栏、主题和背景

状态栏当前位于顶部，显示时钟、CPU 和内存，并使用圆头标签：

| 设置 | 当前值 | 可取值 |
|---|---|---|
| `appearance.dockbar_position` | `top` | `top`、`bottom`、`hidden` |
| `appearance.show_clock` | `true` | 布尔值 |
| `appearance.show_cpu` | `true` | 布尔值 |
| `appearance.show_ram` | `true` | 布尔值 |
| `appearance.clock_format` | `15:04:05` | Go 时间格式 |
| `appearance.dock_workspace_tab_format` | 空 | 可含 `{index}`、`{name}`、`{icon}`、`{zoom}` |
| `appearance.dock_pill_caps` | `true` | 布尔值 |
| `appearance.hide_clock` | `false` | 布尔值；由 `show_clock` 取代 |

颜色与背景：

| 设置 | 当前值与体验 | 可取值 |
|---|---|---|
| `appearance.theme` | `tokyonight_storm`：统一使用这套主题 | 已安装主题名；空或 `none` 使用终端颜色 |
| `appearance.glyphs` | `default`：使用内置符号 | 已安装符号集 |
| `appearance.background` | `off`：背景由终端或浏览器透出 | `off`、`theme`、`#RRGGBB` |
| `appearance.pane_background` | 空：跟随总背景 | 空、`off`、`theme`、`#RRGGBB` |
| `appearance.desktop_background` | 空：跟随总背景 | 同上 |
| `appearance.window_chrome_background` | 空：跟随总背景 | 同上 |
| `appearance.dock_background` | 空：跟随总背景 | 同上 |

四个区域背景为空时，修改总背景可以同时改变终端内容区、窗口之间、窗口外观和状态栏。

## 动画与视觉强调

| 设置 | 当前值与体验 | 可取值 |
|---|---|---|
| `appearance.motion` | `full`：启用全部界面动画 | `none`、`basic`、`full` |
| `appearance.max_fps` | `0`：使用内置帧率上限 | `0`、`auto` 或 `10`–`240` |
| `appearance.modal_dim` | `30`：弹窗出现时背景按该数值降低亮度 | `0`–`90` |
| `appearance.panel_padding` | `2`：弹窗左右留两列 | `1`–`6` |
| `appearance.dim_unfocused` | `0`：非焦点终端保持正常亮度 | `0`–`90` |
| `appearance.dim_multifocus` | `false`：多焦点集合不按普通非焦点处理 | 布尔值 |

`basic` 保留主要移动和复制反馈，`none` 让变化立即完成。提高非焦点变暗程度可以让当前终端更醒目，也会降低同时阅读多个终端的便利性。

## 鼠标、输入和快捷键提示

| 设置 | 当前值与体验 | 可取值 |
|---|---|---|
| `appearance.links` | `all`：识别标记链接与普通 URL | `off`、`marked`、`all` |
| `appearance.click_to_type` | `single`：单击终端内容即进入输入 | `single`、`double`、`off` |
| `appearance.auto_enter_terminal_on_focus` | `targeted`：编号选择与方向切换自动进入输入 | `off`、`targeted`、`all` |
| `appearance.preferred_shell` | 空：自动选择 shell | 空或 shell 命令 |
| `appearance.prefix_repeat_time` | `500`：前缀状态保留 500 毫秒 | `0`–`5000`；`0` 关闭 |
| `appearance.whichkey_position` | 空：提示位于默认位置 | 空、四个角或 `center` |

`targeted` 会在明确选择终端和方向切换时进入输入，`all` 还包括 Tab。`single` 与 `targeted` 组合让从侧栏或方向键切到目标窗口后可以直接打字。

## 历史、滚动条和图像

| 设置 | 当前值与体验 | 可取值 |
|---|---|---|
| `appearance.scrollback_lines` | `10000`：新终端保留一万行内存历史 | `100`–`1000000` |
| `appearance.scroll_lines` | `3`：滚轮每次移动三行 | `1`–`50` |
| `appearance.hide_scrollbar` | `false`：显示滚动条 | 布尔值 |
| `appearance.scrollbar.style` | `track`：显示完整轨道 | `thin`、`track` |
| `appearance.scrollbar.thumb` | 空：使用默认滑块 | 空或一个单元格字符 |
| `appearance.scrollbar.track` | 空：使用默认轨道 | 空、一个单元格字符或 `none` |
| `appearance.scrollbar.tint` | `quiet`：较低强调度的颜色 | `quiet`、`border`、`muted`、`#RRGGBB` |
| `appearance.kitty_placeholders` | `auto`：根据环境决定 Kitty 占位图像行为 | `auto`、`on`、`off` |

更大的历史容量方便追查长日志，同时会增加每个终端的内存占用。该设置在新终端创建时采用，不会重建旧终端的历史。

## 选择、搜索、复制和 OSC52

当前普通选择、全部搜索匹配、当前匹配和复制模式光标使用不同颜色，可以在扫描长输出时区分状态。

| 设置 | 当前值与体验 | 可取值 |
|---|---|---|
| `appearance.selection.copy_entry` | `cursor`：从终端光标位置进入复制模式 | `cursor`、`center` |
| `appearance.selection.multi_format` | `plain`：多段复制使用普通文本 | `plain`、`markdown`、`json` |
| `appearance.selection.osc52_write` | `focused`：焦点终端直接写剪贴板，后台终端需要询问 | `off`、`ask`、`focused`、`on` |
| `appearance.selection.flash` | `true`：复制后显示扫光反馈 | 布尔值 |
| `appearance.selection.flash_ms` | `420`：反馈持续 420 毫秒 | `80`–`3000` |
| `appearance.selection.flash_style` | `diagonal`：沿对角方向扫光 | `diagonal`、`diagonal-reverse`、`horizontal`、`vertical` |

颜色项接受 `#RRGGBB`，普通选择的前景可以为空以保留原文字色。`osc52_write=on` 允许所有后台终端写剪贴板，`off` 全部禁止，`ask` 每次询问。

## 侧栏

| 设置 | 当前值与体验 | 可取值 |
|---|---|---|
| `appearance.sidebar.enabled` | `true`：显示侧栏 | 布尔值 |
| `appearance.sidebar.position` | `left`：侧栏位于左侧 | `left`、`right`、`hidden` |
| `appearance.sidebar.width` | `28`：优先使用 28 列 | 正整数 |
| `appearance.sidebar.sections` | 依次显示 sessions、terminals、files、agents，高度比例为 `25`、剩余、`25`、`34` | 可组合 `sessions`、`terminals`、`files`、`agents`、`git`、`spacer` |
| `appearance.sidebar.agent_rest_fold` | `1h`：静止或已读完结果的 agent 一小时后折叠 | `off` 或时长 |
| `appearance.sidebar.folder_click` | `navigate`：点击目录只浏览内容 | `navigate`、`cd`、`both` |
| `appearance.sidebar.file_delete` | `trash`：删除时进入回收站 | `trash`、`permanent` |
| `appearance.sidebar.editor` | 空：按环境变量和 `vi` 顺序选择编辑器 | 空或编辑器命令 |
| `appearance.sidebar.background` | 空：跟随总背景 | 空、`off`、`theme`、`#RRGGBB` |

侧栏持续提供会话、终端、文件和 agent 状态，同时占用 28 列。宽度不超过 30 列时，运行 agent 的窗口只在 `agents` 区块出现一次。`file_delete=permanent` 会绕过回收站。

## 通知和 agent 提醒

普通通知的 `duration`、`warning_duration` 和 `error_duration` 当前都是 `0`，使用内置显示时长；三者都接受 `0`–`3600` 秒。

Agent 通知已关闭宿主机系统桌面弹窗（`notify = false`），只保留 TUIOS 内部 Dock 与 Inbox 提醒。命令、安静时段和自定义声音仍为空：

| 设置 | 可取值 |
|---|---|
| `notifications.agent.notify` | `false`：不发宿主机系统桌面通知 | 布尔值 |
| `notifications.agent.sound_mode` | 空、`audio`、`bell`、`both` |
| `notifications.agent.command` | 空或 shell 命令 |
| `notifications.agent.quiet_hours` | 空或 `HH:MM-HH:MM` |
| `notifications.agent.sounds.done` | 空或音频文件路径 |
| `notifications.agent.sounds.needs_input` | 空或音频文件路径 |
| `notifications.agent.states` | 可分别设置 `done`、`needs_input`、`errored`、`idle`、`working` |

外部命令适合接入自己的提醒方式，安静时段适合控制夜间主动提醒。邮件通知可以继续细化状态栏、桌面和声音行为。

## Daemon、恢复与多客户端

| 设置 | 当前值与体验 | 可取值 |
|---|---|---|
| `daemon.log_level` | `off`：不记录常规后台日志 | `off`、`errors`、`basic`、`messages`、`verbose`、`trace` |
| `daemon.agent_detect_seconds` | `0`：使用默认两秒检查间隔 | `0`、正整数秒；负数关闭周期检查 |
| `daemon.agent_binaries` | `[]`：不添加自定义 agent 识别项 | 可执行文件名称数组 |
| `daemon.resume_agents` | `auto`：后台重启后自动恢复已识别的 agent | `ask`、`auto`、`off` |
| `daemon.persist_scrollback_lines` | `0`：使用默认 1000 行 | `0`–`1000000` |
| `daemon.persist_scrollback_kb` | `0`：使用默认 2048 KiB | `0`–`1048576` |
| `daemon.respond_from_shell` | `false`：shell 不参与对应响应处理 | 布尔值 |
| `daemon.window_size` | `latest`：多客户端跟随最近操作的设备 | `smallest`、`largest`、`latest` |

多客户端尺寸直接影响手机与桌面同时使用时看到的内容：

- `smallest`：桌面可能按手机尺寸显示，布局较窄。
- `largest`：按最大客户端布局，小屏幕需要适应较大的内容。
- `latest`：最近输入的设备控制尺寸，切换设备时布局可能变化。

持久历史还受每个 pane 的行数和字节预算共同约束。

## Tape、截图和演示辅助

| 功能 | 当前配置与体验 | 主要可取值 |
|---|---|---|
| Tape | `autorun=ask`：发现项目 Tape 时询问；`auto_review=false` | `off`、`ask`、`auto`；审阅为布尔值 |
| 截图 | PNG、保存到 `~/Pictures/tuios`、带窗口外观、不包含光标 | 格式为 `png`、`svg`、`ansi`、`html`、`txt` |
| 空闲动画 | 十分钟满足空闲条件，效果随机 | `1`–`240` 分钟；`random` 或具体效果 |
| 聚光 | 跟随鼠标、半高 10 行、外部变暗数值为 75、硬边缘 | `mouse`、`cursor`；`hard`、`soft` |
| 文本提示 | 识别全部内置目标，使用主键区字母，只标当前 pane | `all`、`none` 或自定义列表 |

截图字体使用 `JetBrains Mono, monospace`，可以通过 `.ttf` 文件明确指定。聚光适合演示时集中观众注意力，`soft` 边缘更平滑。

## 快捷键

当前主前缀是 `ctrl+b`。快捷键按 window management、workspaces、layout、mode control、prefix mode、terminal mode、sidebar、inbox、mail、debug 和 Tape 等作用域分组。

值是字符串数组，因此一个动作可以绑定多个键：

```toml
new_window = ['n']
split_vertical = ['|', '\']
```

空数组 `[]` 表示取消绑定；缺少配置行会在下次启动时恢复默认值。当前 `[keybindings.navigation]` 是空表，没有额外导航覆盖。

## 配置 schema、校验与持久化（0.12.0）

TUIOS 没有发布独立 `.schema.json`；`.schema.json` 只用于 TML 界面标记与教程。`config.toml` 的约束来自三套机制：

- **选项注册表**：`internal/config/options.go` 的 `optionSpecs`，本机 `0.12.0` 为 22 个分组、271 个可设置路径。`tuios list-options --json` 输出 `{"message": ..., "options": [...]}`，每项含 `path`、`type`、`section`、`default`、可选 `accepted`、可选 `min`/`max`、`description`。`tuios set-config` 与 `tuios config browse` 按此注册表严格校验未知路径、非法枚举、越界整数与无效颜色。
- **快捷键注册表**：快捷键是动态动作映射，不在标量路径清单里，通过 `tuios keybinds list` 查询、`tuios keybinds doctor` 检查冲突与被丢弃的绑定。
- **手改容错**：`config.toml` 由 go-toml/v2 反序列化到 `UserConfig`。未知键忽略；越界数值截断到合法范围；非法枚举与颜色回退默认值；当前平台无法解析的按键由 `DropUnreadableKeys` 剔除并记入 `LoadWarnings`。`ValidateConfig` 生成的告警在 TUI 内展示。整份文件语法错误时保留正在使用的设置，并在屏幕上显示错误。

Web 模式（纯浏览器连接）下配置只读：

- `internal/app/client_kind.go` 给 `ClientBrowser` 强制 `ConfigReadOnly = true`，设置面板（`Ctrl+b ,`）与 `tuios set-config` 都不写盘，因为 `set-config` 把落盘动作路由给客户端 `persistSettings()`，浏览器客户端跳过。
- 落盘方式：`tuios config edit`；`tuios keybinds preset` / `unbind` / `free`（进程内直接调用 `config.SaveUserConfig()`）；或让 pane 里的 agent 直接编辑 `config.toml`。
- `ClientBrowser` 同样启用 `startConfigWatch()`，保存后当前会话热重载。

生效时机按设置类型分层：

| 设置类型 | 生效时机 |
|---|---|
| 外观、侧栏、Dock、快捷键 | 保存即热重载当前会话 |
| 新窗口/新会话初值（`[startup]`、历史容量、`preferred_shell`） | 对后续新建的窗口或会话生效 |
| 放宽权限、新增主机或通知目标（`[agents.permissions]`、`[hosts]`、`[notify]`） | 需在 TUIOS 外的终端运行 `tuios config apply`（pane 内会被拒绝）或重启 daemon；收紧权限的改动由 daemon 立即应用 |
| `[daemon]` 持久历史与 daemon 级 `[hooks]` | 需重启 daemon |

配置清理：`tuios config prune --yes` 移除与当前默认值相同的冗余键（本机移除 431 个，并清理已废弃的 `appearance.sidebar.workspaces`），`tuios keybinds doctor` 用于检查冲突与废弃绑定。

## 当前配置的主要体验取舍

- 左侧栏与顶部状态栏持续提供信息，也持续占用终端空间。
- 新会话不自动创建终端，需要从空工作区手动开始。
- 手机与桌面同时连接时，`latest` 让最后操作的设备决定画面尺寸，切换设备会改变布局。
- 焦点终端可以直接写系统剪贴板，操作方便，同时要求用户信任正在运行的程序。
- Agent 恢复采用自动模式，重启后直接接续上次会话。
- 所有界面动画开启，视觉反馈完整；追求立即变化时可以改为 `basic` 或 `none`。

## AGC 版本化备份

AGC 的 `manifest.json` 已加入 `tuios-config`，把来源配置同步到 `tuios/config.toml`，并标记为 protected。单项策略检查显示 `tuios_redaction_slots=0`，仓库副本与来源 SHA-256 相同。

完整同步测试共运行 `19` 项并全部通过。当前条目在 `./sync.py status` 中显示 unchanged。配置文件仍是普通文件，没有新增 symlink。2026-10-31 的配置精简与 6 项调整已提交并推送为 `1495db0`。

## 证据边界

- 当前值来自本机 `0.12.0` 完整配置快照（153 行，含上游生成的注释头）。
- 合法范围与 schema 机制来自本机 `tuios list-options` 与上游源码（`internal/config/options.go`、`validation.go`、`userconfig.go`、`internal/app/client_kind.go`）。
- 生效时机来自 `tuios config apply --help` 与上游测试（`set_config_write_test.go`、`config_watch_test.go`）。
- 本文解释配置行为，没有逐项修改后做视觉对比实验。

## See Also

- [TUIOS Web 与安装升级](tuios-web-and-updates.md)
- [tuios workspace 与 session rail](tuios-workspace-and-sidebar.md)
- [浏览器终端链路的剪贴板路径](browser-terminal-clipboard-paths.md)
- [终端图像协议支持矩阵](../terminal-graphics/terminal-image-protocol-matrix.md)
