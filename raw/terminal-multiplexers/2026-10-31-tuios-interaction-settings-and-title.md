# TUIOS 交互配置与标题目录显示

> Source: 当前会话用户消息与工具输出；本机 `/home/cpf/.config/tuios/config.toml`、仓库 `tuios/config.toml`；选项说明见同目录 `2026-10-31-tuios-0.12.0-list-options-full-json.md`
> Collected: 2026-10-31
> Published: Unknown

## 用户问题与选择（会话原文摘录）

> about tuios, what other config changes do you suggest, to make it more smooth user experience

> can we make it not fold? if proc still alive, keep it in there?

对 `subagent_max_rows` 的批注替换值：

> 3

> wtf, the ones i give thumbs up, are meant to be applied

> appearance.window_title_format do this one

## 动作与批次（会话记录归纳）

第一批六个键已提交为 `1495db0`：click_to_type、auto_enter_terminal_on_focus、sidebar.width、notifications.agent.notify、daemon.resume_agents、daemon.window_size。

之后十二个键加五个获赞键，共十七个键，已随用户要求提交并推送为 `9b6025e`。五个获赞键为 right_click_opens_menu、sidebar.density、sidebar.show_numbers、sidebar.subagent_hide_finished、notifications.agent.states.idle。

最新新增 window_title_format，仅修改来源文件。总计 6 + 12 + 5 + 1 = 24 个调整键。来源与仓库副本的差别只有该标题格式行。

用户未选择应用：motion=basic、scrollbar.style=thin、states.working=true、tape.auto_review=true。prefix_repeat_time=1000 只被建议，未应用。

## 当前来源配置（非注释部分逐字摘录）

```toml
[appearance]
show_clock = true
show_cpu = true
show_ram = true
theme = 'tokyonight_storm'
dock_pill_caps = true
session_border = true
clock_format = '15:04:05'
click_to_type = 'single'
auto_enter_terminal_on_focus = 'targeted'
window_title_format = '{title} · {cwd}'
dim_unfocused = 20
focus_follows_mouse = true
focus_follows_mouse_pause = 'ctrl'
right_click_opens_menu = true

[appearance.selection]
search_fg = '#F5E7C8'
match_fg = '#1C1B19'
cursor_fg = '#08222B'

[appearance.sidebar]
position = 'left'
width = 28
sections = 'sessions:20,terminals:25,files:10,agents:45'
subagent_max_rows = 3
agent_rest_fold = 'off'
density = 'roomy'
show_numbers = true
subagent_hide_finished = '30s'

[notifications.agent]
notify = false
sound = true
sound_mode = 'bell'

[notifications.agent.states]
idle = true

[keybindings]

[keybindings.system]
toggle_spotlight = ['b']

[keybindings.terminal_mode]
terminal_paste_host = ['ctrl+shift+v', 'super+v', 'shift+super+v']

[daemon]
resume_agents = 'auto'
window_size = 'latest'

[startup]
tiled = true
daemon = true
open_default_window = true
start_in_terminal_mode = true

[panes]
navigator_search = true

[workspaces]
new_window_when_empty = true
```

## 仓库副本的差别（当前读取结果）

`tuios/config.toml` 的上述非注释部分相同，但没有 `window_title_format = '{title} · {cwd}'`。前 23 个调整键已进入仓库；标题格式尚未同步。

## 最新修改检查（工具输出原文）

```text
window_title_format = {title} · {cwd}
```

检查使用 Python 标准库 tomllib 解析来源，并断言目标值等于 `{title} · {cwd}`。

## 机制核对（此前源码读取的归纳，非逐字引语）

- `internal/input/mouse_click.go`：终端模式有选区时普通右键打开 Selection 菜单；无选区而程序启用 mouse tracking 时转发给程序；没有 tracking 时默认消费点击，right_click_opens_menu=true 才打开 pane menu。Paste 项把剪贴板内容粘贴到当前 pane。
- `internal/app/sidebar_agents.go`：agent_rest_fold=off 跳过自动折叠。折叠依据 idle/unknown/done-seen 与静置时间，不按进程存活判断。主 Agent 行是否被识别与折叠开关是不同问题。
- `subagent_max_rows` 包含 `+N more` 行；`subagent_hide_finished` 控制已结束 subagent 行的显示时长。
- idle 提醒受 settle_seconds、suppress_focused 与 sound_cooldown_seconds 约束，不是固定每隔若干秒响铃。
- show_numbers 显示会话编号；workspace 编号快捷键不能直接当作会话切换快捷键。

## 体验解释（基于配置行为的推断）

窗格标题增加目录，帮助辨认同一种 Agent 在不同项目中的窗口；长标题在窄窗格中可能截断。roomy 增加区块之间空行，同时减少侧栏可用行数。关闭 Agent 自动折叠与隐藏已结束 subagent 可同时成立，分别管理主 Agent 行与子任务行。
