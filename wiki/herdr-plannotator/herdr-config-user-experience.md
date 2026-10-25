# Herdr 配置项与用户体验

> Sources: Herdr configuration docs + config-reference.json, v0.9.5, 2026-10-25; 本机配置快照与校验输出, 2026-10-25
> Raw: [Herdr 配置参考与本机快照](../../raw/herdr-plannotator/2026-10-25-herdr-config-reference-and-local-snapshot.md); [CLI reload 边界与面板优先级](../../raw/herdr-plannotator/2026-10-25-herdr-config-cli-reload-boundary-and-panel-priority.md)
> Updated: 2026-10-25

## Overview

`~/.config/herdr/config.toml` 是 Linux 与 macOS 上 Herdr 默认读取的主配置；Windows 默认在 `%APPDATA%\herdr\config.toml`。`HERDR_CONFIG_PATH` 指定其他文件。文件中没有写出的项目使用默认值。
Herdr 没有提供用于 `config.toml` 编辑器补全的标准 JSON Schema 文件（本轮在 v0.9.5 官方 docs 与仓库中未找到；`herdr api schema` 输出的是 Socket API schema，不校验 `config.toml`）。查阅与校验的入口是：

| 入口 | 能做什么 |
|---|---|
| `herdr --default-config` | 输出带注释的完整默认配置 |
| `herdr config check` | 按内置规则检查，报告未知键与类型错误 |
| [Config reference 网页](https://herdr.dev/docs/config-reference/) | 列每个 key 的类型、默认值与取值 |
| `config-reference.json` | 同一份目录的机器可读版本 |

v0.9.5 的 `config-reference.json` 共 **14 个 section、211 个 key**（General 1、Server 3、Theme 61、Terminal 4、Updates 3、Keybindings 63、UI and sidebar 33、Notifications 5、Sound 26、Session 2、Worktrees 1、Remote 1、Advanced 1、Experimental 7）。

`herdr api schema` 输出的是 Socket API 的 schema，描述脚本如何向 Herdr 发请求与收事件，不校验 `config.toml`。

### 修改后怎样生效

`herdr server reload-config` 让运行中的 server 重新读取配置；Herdr 界面的 `menu → reload config` 同时重载客户端本地与当前选中的 server。多数界面设置重载即生效，启动类设置需要重启。

reload 的配置来源分两端：

- **客户端本地**：主题、侧栏布局、复制行为等显示设置，即使 `herdr --remote` 连接远端机器也用本地配置。
- **pane 所在 server**：pane 默认值、worktree、integration、自定义命令。

CLI 只有 server 侧入口：`herdr config` 的子命令是 `check` 与 `reset-keys`，没有重载客户端本地配置的命令。客户端显示类设置（`theme.*`、`ui.*` 里的 `ui.pane_scrollbars` 这类界面项、本地键位绑定）改完后，必须在 Herdr 界面走 `menu → reload config` 才会反映到已打开的客户端；`herdr server reload-config` 只覆盖 server 那一半（`terminal.*`、`worktrees.*`、`update.*`、`[[keys.command]]`）。`herdr status client` 只报版本、channel、协议号与二进制路径，不显示配置是否已重载。

判断「改完是否已生效」要按归属分开看：写在 server 侧的键跑一次 `reload-config` 即可；写在客户端侧的键在没有界面重载前，运行中的窗口仍用旧值，即使配置文件与 `herdr config check` 都已经认可新内容。

本机校验实测：真实配置 `config: ok`；未知键报 `unknown config key ui.sidebar_wdith; ignoring key`、退出码 1；类型错误报 `invalid type: string "wide", expected u16`、退出码 1。

## 主题、颜色与界面排列

`theme.*` 决定颜色。可选内置主题，让主题随外层终端明暗模式切换，或分别调整侧栏背景、选中行、边框等颜色。明暗模式可用各自的子表覆盖。

`ui.*` 决定界面空间与显示方式：侧栏宽度、收起时是否保留窄状态条、终端窄时切到移动端单列、tab 栏放顶部或底部、是否显示 pane 边框与间距、是否把 agent 名称显示在边框上、关闭 workspace 前是否确认。

`status_indicators` 选 `dots` 或 `symbols`：后者按形状区分 blocked/working/done/idle/unknown，颜色不明显时更易辨认。符号是静态的，不开启动画。

本机：`tokyo-night`、`auto_switch=false`、`status_indicators="dots"`、`show_agent_labels_on_pane_borders=true`。

## 侧栏显示什么，怎样排列

`ui.sidebar.agents.*` 管 agent 列表，`ui.sidebar.spaces.*` 管 workspace 列表。Agent 行可用 token：`state_icon`、`state_text`、`machine`、`workspace`、`tab`、`pane`、`agent`、`terminal_title`、`terminal_title_stripped`、`$name`。Space 行另有 `branch`、`git_status`。

体验要点：

- **自由排列内容行**：第一行放位置，第二行放任务标题。
- **按 agent 类型用不同布局**：`rows_by_agent` 按 canonical agent ID（如 `omp`）覆盖 `rows`；**override 替换 `rows`，不扩展**；detection alias（如 `claude-code`）不接受。
- **每个布局最多 16 行，每行最多 16 token**；文本 token 还可配最多 16 条 `rules`（`equals`/`contains`/`starts_with`/`gt`/`lt` 条件，配 `fg`/`bold`/`dim`/`hide`）。
- **`row_gap` 默认 `0`**：条目紧贴；设 `1` 恢复旧间距；不影响 `rows` 内部行距。
- **`$name` 是动态值**：在 layout 加入后，由脚本或 plugin 经 `herdr pane report-metadata` 上报其值；不上报就消失。
- **自定义行布局只影响展开的桌面侧栏**：收起状态和移动端仍用紧凑布局。
- **两种面板排序**：`ui.agent_panel_sort` 取 `"spaces"`（默认，`"workspaces"` 是别名）时，条目按 workspace 分组、保持 workspace 出现顺序，状态变化不会让行上下跳动；取 `"priority"` 时面板变成待办队列，先按优先档位降序排（blocked → 未查看的 done → working → 已查看的 idle → unknown），同档再按最近一次状态变更排序、新的在前，序号相同才保持 workspace/pane 原顺序。`prefix+n`/`prefix+p` 按显示顺序遍历。本机保持 `"spaces"`，侧栏是静态地图而非队列。

本机为 OMP 配了三行：`["state_icon","machine","workspace","tab"]` / `["terminal_title"]` / `["agent"]`。

## Tab 栏状态信息与外层窗口标题

`ui.tab_bar_right` 在 tab 栏右侧放有序状态条目，默认空。五类：`zoom`（active tab zoomed 时显示固定 `ZOOM` pill）、`hostname`、`datetime`（`strftime` 格式，`%z`/`%s` 被拒，因为是 server 本地墙上时间）、`text`、`command`。

`command` 条目：立即运行一次，再按 `interval_seconds` 重复，不阻塞渲染也不与上次运行重叠；interval 1–31,536,000 秒，timeout 1–3,600 秒；取成功输出的最后一行，剥离 ESC 控制序列，失败/空/超时后清空；Linux 与 macOS 用 `/bin/sh -lc`，Windows 用 `cmd.exe /d /c`。`hostname`/`datetime`/`command` 都在 Herdr server 解析，所以 `herdr --remote` 显示远端机器的值。窄行时整组状态让位给 tab 与控件。`tab_bar_right_separator` 默认在可见条目间出现，设 `""` 直接拼接。

`ui.window_title` 控制 Herdr 写给承载它的外层终端的标题——这是窗口管理器与终端标签栏读到的。token：`{hostname}`、`{workspace}`、`{tab}`、`{pane}`（聚焦 pane 的手动名）、`{terminal_title}`（聚焦 pane 自己的 terminal title，已剥离 spinner）。**没有值的 token 渲染为空**，所以模板里如果留了分隔符，空标题会留下尾随分隔符——写模板时把可选标题前的分隔符去掉。`window_title = ""` 让外层标题保持不变；`client.window_title.set` 临时覆盖，`client.window_title.clear` 交还。

本机：`tab_bar_right` 放 `zoom` 与 `datetime %H:%M`，分隔符 ` · `；`window_title` 用 `{hostname}: {workspace} / {tab} {terminal_title}`（标题前用空格而非 `—`，空标题不留尾随符号）。

## 快捷键与临时工具窗口

`keys.*` 管 prefix 键（支持数组，多个键进同一 prefix mode）、indexed jumps（按数字切 tab/workspace/agent）、pane 尺寸/交换/zoom、scrollback/复制模式、reload 配置等。`[[keys.command]]` 把快捷键接到自定义命令或 plugin：

| type | 按下后发生什么 |
|---|---|
| `popup` | 打开临时浮动终端窗口；适合 `lazygit`、临时 shell；命令退出后关闭 |
| `pane` | 打开临时 zoomed pane；命令退出后关闭 |
| `shell` | 后台运行命令 |
| `plugin_action` | 执行已安装 plugin 的指定操作 |

Popup 可设宽高（字符格数或 `"80%"`）；打开期间接收全部终端输入，含 Escape，通常靠退出其中的程序关闭。

`description` 可选，写了就替换 `prefix+?` 帮助面板里的 `'custom command'` 标签。命令能拿到 `HERDR_SOCKET_PATH`、`HERDR_BIN_PATH`、`HERDR_ACTIVE_WORKSPACE_ID`、`HERDR_ACTIVE_TAB_ID`、`HERDR_ACTIVE_PANE_ID`、`HERDR_ACTIVE_PANE_CWD`；shell 命令在能检测到时从聚焦 pane 的目录运行。Windows 上命令串经 `cmd.exe /d /c` 执行，环境变量写 `%HERDR_BIN_PATH%` 这种形式。

`plugin_action` 用的是插件动作 id；动作 id 可能不唯一，此时写 `<插件 id>.<动作 id>`。插件的每个动作声明自己的 context（`pane`、`workspace`、`global`），pane 类动作需要有聚焦 pane 才有终端可写。

本机：六个 annotate 动作走 `plugin_action`（`prefix+a`、`prefix+shift+a`、`prefix+ctrl+a`、`prefix+m`、`prefix+o`、`prefix+shift+o`）；新增 `prefix+t` 起临时 shell popup（80% 宽高），`prefix+alt+b` 起运行 btop 的临时 pane。

键位会撞：本机把 `prefix+o` 绑给了 `annotate.open`（在 plannotator-tui 打开聚焦 pane 所在目录，带文件树，反馈发回该 pane 的 agent），而官方 `keys.open_notification_target` 的默认值也是 `prefix+o`。配置层面这两条占用同一个键，运行时按下去实际触发哪一条尚未实测。

## 终端默认与 worktree

`terminal.*` 决定新交互终端如何开始：

- `default_shell`：executable 名称或路径，不接受整条 shell 命令；空时按 `SHELL`→`/bin/sh`，Windows 按 `pwsh.exe`→`powershell.exe`。
- `shell_mode`：`auto`/`login`/`non_login`，影响 shell 读哪些启动配置。`auto` 只在 macOS 起登录 shell（为了让 `/usr/libexec/path_helper`、Homebrew 这类登录才跑的 PATH 初始化生效），其他平台保持非登录；`login`/`non_login` 强制指定。命令 pane、后台运行的自定义命令键位、显式 argv 启动各自走原有路径，不受这项影响。
- `new_cwd`：跟随来源 pane 目录、home、Herdr 进程目录或指定目录；创建时显式 `--cwd` 优先。

`worktrees.directory` 决定 Git worktree checkout 的根目录。`server.headless_cols`/`headless_rows` 是无客户端连接时新建布局的虚拟终端尺寸，默认 `120×40`。修改 shell 默认值不影响已运行的 shell，只对后续新建 pane 生效。

## 通知与声音

`ui.toast.delivery` 四值：`off`（关弹窗）、`herdr`（界面内 toast）、`terminal`（请外层终端发桌面通知，可跨 SSH）、`system`（调本机 OS 通知服务）。**Herdr 对 active tab 抑制弹窗**。macOS 的 `system` 先试 `terminal-notifier`，失败回退 `osascript`（Notification Center 里显示为 Script Editor，不能激活宿主终端）；Windows 的 `system` 留在 Notification Center，点击选中来源 pane 并把窗口带到前台，但不能重开已关闭的客户端或从重启的 server 选 pane。

`ui.sound.*` 与通知分开控制。声音通过本地 Herdr client 播放；自定义声音必须是 mp3，相对路径从配置文件目录解析。`path` 给所有声音，`done_path`/`request_path` 分别覆盖完成与需要输入的声音。per-agent override 接受 `default`/`on`/`off`，按检测到的 agent label（如 `claude`、`codex`、`devin`、`droid`）作 key；**droid 默认静音**。`HERDR_DISABLE_SOUND` 即使 `enabled=true` 也禁声。

本机：`delivery="herdr"`、`ui.sound.enabled=false`。

## 会话恢复与历史

`session.resume_agents_on_restore` 默认 `true`：server 重启后把有有效 native session 引用的 agent pane 恢复到原生对话。`startup_per_agent_delay_ms` 默认 `100`：自动恢复逐个启动、间隔 100 ms 减少资源竞争，第一个立即启动，设 `0` 关闭间隔。**改这两项需重启 server**；手动启动与显式 attach 不受影响。只有官方 integration 提供 native session 引用的 pane 能恢复，其他 pane 恢复为普通 shell。

`experimental.pane_history` 默认 `false`：是否把 pane 屏幕历史持久化到 `session-history.json`，供重启后重显。开启可能同时保存提示词、命令输出与敏感内容，需权衡。

`advanced.scrollback_limit_bytes` 默认 `10000000`：每个 pane 终端的 scrollback 容量；`scrollback_lines` 作为旧别名仍接受。容量大则历史多、内存也多；重启后的屏幕保存由 `pane_history` 单独控制。

本机：恢复默认开、`pane_history=false`。

## 图像、光标与输入法

`terminal.kitty_graphics` 默认 `true`：在兼容的外层终端用标准 Kitty graphics 协议渲染 pane 图像。`experimental.kitty_graphics` 是弃用别名，双设时 `terminal.kitty_graphics` 优先。**改这项需重启受影响 server 或重连客户端**；远端 session 中，server 的设置控制 Kitty graphics 解析，本地 client 的设置控制给外层终端的输出。外部 socket pane-overlay API 已移除，无替代。

`ui.host_cursor` 选 `auto`/`native`/`drawn`：WSL、Windows 下 auto 用 drawn。`experimental.reveal_hidden_cursor_for_cjk_ime`（macOS）为隐藏光标的 TUI 暴露输入法候选窗定位锚点，可经 `cjk_ime_agents` 限制适用 agent 与光标形状。`experimental.switch_ascii_input_source_in_prefix`（macOS/Windows）在使用 prefix 命令时临时切到 ASCII 输入源，返回输入区后恢复；**Windows 当前仅 Korean IME**。

本机：`kitty_graphics=false`（旧别名，仍被接受；要显示图像需改成 `terminal.kitty_graphics=true` 并重启 server，且外层终端要兼容 Kitty graphics）。

## 远程、更新与启动行为

- `remote.manage_ssh_config`：为远程连接加 SSH 保活默认值，并在支持平台复用已认证连接；用户已有 SSH 设置优先。
- `update.channel`：stable 或 preview；`update.version_check` 后台检查 Herdr 新版本；`update.manifest_check` 检查 agent 屏幕识别规则更新，让 Herdr 识别新版 agent 界面。
- `experimental.allow_nested` 默认 `false`：是否允许在 Herdr pane 内再启 Herdr。
- `onboarding`：首次设置流程；`false` 跳过。
- `server.allow_unelevated_clients`（Windows，默认 false）：允许同账户普通权限客户端控制管理员权限 server，启用会改变访问权限范围。

## 当前配置的主要体验取舍

本机选择：tokyo-night 主题、dots 状态、Herdr 内通知且声音关、`kitty_graphics` 关、`pane_history` 关、恢复默认开。新增：OMP 侧栏标题行、tab 栏时钟+zoom、外层窗口标题、临时 shell popup、btop 临时 pane。

这意味着：界面安静（无声音、无系统通知弹窗，只在 Herdr 内 toast，且 active tab 抑制）；侧栏对 OMP 显示任务标题；tab 栏显示时间与 zoom 状态；外层终端标题随聚焦 pane 变化；`prefix+t` 临时查文件、`prefix+alt+b` 看系统资源。代价：图像在 Herdr pane 内不显示（即使 OMP 强制 Kitty 协议，本机配置仍关）；重启后 pane 屏幕历史不保留（但 agent 对话按 integration 恢复）。

## 证据边界

- 文档声明：字段、默认值、取值、token 列表、约束（16 行 × 16 token、`row_gap` 默认 0、override 替换不扩展、active tab 抑制、interval/timeout 范围、kitty_graphics 别名优先级与重启要求、`shell_mode=auto` 的平台差异、客户端与 server 的配置归属）来自 Herdr v0.9.5 官方 docs 与 `config-reference.json`。
- 上游源码：`priority` 的排序键与档位表取自 `herdrdev/herdr` v0.9.5 的 `src/app/agent_view.rs` 与 `src/app/api_helpers.rs`；issue #318 正文与评论是提案记录，其同档顺序描述与发布代码不同，以源码为准。
- 本机直读：`config.toml` 全文、`herdr config check` 输出、`herdr config --help`、`herdr integration status` 与 `herdr agent explain` 输出、`config-reference.json` 的 14 section/211 key 统计与抽样、annotate 插件的 `herdr-plugin.toml` 与 README。
- 未验证：blocked 状态上报的运行时表现（代码可证、未实测）；外层窗口标题在浏览器标签页的实际显示；`prefix+t`/`prefix+alt+b` 的实际触发结果；临时客户端观察到的时钟与 OMP 标题行只证明新开客户端加载了配置，未证明原客户端已加载；`priority` 模式在本机的运行时排序（本机未切换）；客户端侧设置是否已在运行中的客户端加载（只跑过 `herdr server reload-config`，客户端需界面 `reload config`）；`prefix+o` 的键位覆盖只按配置推断，未实测按键。

## See Also

- [Herdr + Plannotator 工具链全量 Reference](toolchain-reference.md)
- [TUIOS 配置与用户体验](../terminal-multiplexers/tuios-config-user-experience.md)
- [终端图像协议支持矩阵](../terminal-graphics/terminal-image-protocol-matrix.md)
