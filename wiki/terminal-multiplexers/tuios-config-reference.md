# TUIOS 配置项全表（0.12.0）

> Sources: 本机 tuios 0.12.0 `list-options` 与 `config.toml`, 2026-10-31; Gaurav-Gosain/tuios `docs/CONFIGURATION.md`
> Raw: [list-options 完整输出](../../raw/terminal-multiplexers/2026-10-31-tuios-0.12.0-list-options-full-json.md); [配置 prune 与 0.12.0 快照](../../raw/terminal-multiplexers/2026-10-31-tuios-config-prune-and-0.12.0-snapshot.md); [项目 tape 文档](../../raw/terminal-multiplexers/2026-10-31-tuios-project-tapes.md)
> Updated: 2026-10-31

可设置项共 271 个路径，本页按用户感知顺序分 20 章，每个路径只出现一次。默认值与允许值逐字取自 raw 中的完整 JSON；「当前值」来自本机 `config.toml`，标「默认」表示文件中未写、正在使用内置默认值。体验一栏依据 JSON 的 `description` 与源码语义撰写。

## 1. 启动与会话（7 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `startup.daemon` | true / false | `true` | `true` | 直接运行 tuios 时是否连到后台会话。关闭后每次启动独立进程，不共享窗格与会话。TUIOS_NO_DAEMON=1 或 --standalone 可临时覆盖。配置缺少 [startup] 表时按 false 处理 |
| `startup.tiled` | true / false | `true` | `true` | 新会话采用平铺还是浮动窗口 |
| `startup.layout` | bsp / master-stack / scrolling | `bsp` | 默认 | 新会话的初始布局。bsp 递归二分，master-stack 固定主窗格加堆叠，scrolling 横向长条可滚动。已存在的会话保留自己的布局 |
| `startup.open_default_window` | true / false | `false` | 默认 | 会话为空时是否自动开一个终端，省去手动新建 |
| `startup.start_in_terminal_mode` | true / false | `false` | 默认 | 启动时若已有窗口，是否直接进入终端输入模式 |
| `startup.session` | 会话名 / 空 | `空` | 默认 | 直接运行 tuios 时连到哪个会话；不存在则创建。空值连到最近使用的会话 |
| `startup.window` | 窗格名或 id / 空 | `空` | 默认 | 启动时聚焦哪个窗格。没有同名窗格时焦点不变 |

## 2. 平铺、主窗格与滚动布局（16 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `appearance.tiling_scheme` | spiral / longest_side / alternate / smart_split | `spiral` | 默认 | 工作区首次平铺时插入新窗口的切分方案。spiral 轮流沿最长边，longest_side 始终沿最长边，alternate 横竖交替，smart_split 依当前比例选择。已平铺的工作区保留自己的方案 |
| `appearance.master_count` | 1–9 | `1` | 默认 | master-stack 布局中固定作为主窗格的个数 |
| `appearance.master_position` | left / right / top / bottom / center | `left` | 默认 | 主窗格占据的一侧。center 让堆叠分布在两侧 |
| `appearance.master_ratio` | 10–90（百分比） | `50` | 默认 | 主窗格占屏幕宽度的比例。比例越大，堆叠窗格越窄 |
| `appearance.master_grid` | true / false | `true` | 默认 | 只有一个左侧主窗格时，四个以上窗格改画成网格，避免堆叠过于细长 |
| `appearance.gap` | 0–8（单元格） | `0` | 默认 | 相邻平铺窗格之间保留的空行空列。0 为完全贴合 |
| `appearance.shared_borders` | true / false | `false` | 默认 | 相邻平铺窗格共用一条边线，省掉并排的双层线，画面更紧凑 |
| `appearance.focus_wrap` | true / false | `false` | 默认 | 焦点键在平铺边缘处绕到对侧窗格，形成环游 |
| `appearance.scroll_column_width` | 20–100（百分比） | `55` | 默认 | 滚动布局中一列占屏幕宽度的比例 |
| `appearance.scroll_column_max` | 20–100（百分比） | `90` | 默认 | 滚动布局中列的宽度上限。100 允许一列占满屏幕，代价是下一列只在边缘露头 |
| `appearance.scroll_lines` | 1–50（行） | `3` | 默认 | 滚轮一格滚动多少行 |
| `appearance.niri_click_reveals` | true / false | `true` | 默认 | 滚动布局中点击半露在边缘外的列，是否把整列拉进视野 |
| `appearance.niri_hover_reveals` | true / false | `true` | 默认 | 开启焦点跟随鼠标时，悬停半露的列是否拉进视野 |
| `appearance.niri_reverse_scroll` | true / false | `false` | 默认 | 反转滚动布局中的滚轮方向 |
| `appearance.niri_scroll_cells` | 1–200（单元格） | `8` | 默认 | 滚轮一格推动横向条带多少格 |
| `appearance.niri_scroll_snap` | true / false | `false` | 默认 | 滚动停止时吸附到最近一列，避免停在两列之间 |

## 3. 拖动落点、放大与浮层（14 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `appearance.drop_preview` | fill / outline / off | `fill` | 默认 | 拖动窗格时落点如何提示：fill 画带底色的框，outline 只画框，off 不提示 |
| `appearance.drop_preview_delay` | 时长，如 120ms / 0 | `120ms` | 默认 | 指针在落点停留多久才显示提示。快速拖过不会闪烁；0 为立即显示 |
| `appearance.alt_drag` | true / false | `true` | 默认 | Alt 加左键拖动能移动窗格 |
| `appearance.zoom_size` | 50–100（百分比） | `95` | 默认 | 放大窗格占屏幕的比例。低于 100 时四周仍能看到原布局 |
| `appearance.zoom_max_width` | 单元格数 / 0 | `0` | 默认 | 放大窗格的宽度上限。0 表示铺满屏幕 |
| `appearance.zoom_borderless` | true / false | `false` | 默认 | 放大窗格铺满整个窗格区域，去掉边框与标题栏。此时 zoom_size 与 zoom_max_width 不生效 |
| `appearance.zoom_animation` | true / false | `true` | 默认 | 放大与还原时播放滑动过程，关闭则一帧切换 |
| `appearance.zoom_follows_focus` | true / false | `true` | 默认 | 放大状态下移动焦点，放大对象跟随到新窗格 |
| `appearance.pane_overlays` | true / false | `false` | 默认 | 弹窗与面板按窗格样式绘制，边框取焦点窗格颜色，视觉上归属该窗格 |
| `appearance.frame_panels` | true / false | `false` | 默认 | 给命令面板等较大浮层加边框，便于与内容区分 |
| `appearance.panel_padding` | 1–6（列） | `2` | 默认 | 浮层内容左右留白列数 |
| `appearance.modal_dim` | 0–90（百分比） | `30` | 默认 | 模态面板背后压暗程度。0 不压暗 |
| `appearance.popup_dim` | 0–90（百分比） | `0` | 默认 | 普通弹窗背后压暗程度。0 不压暗；popup --dim 可单次覆盖 |
| `appearance.overlay_border_color` | 颜色 / 空 | `空` | 默认 | 所有浮层边框颜色，接受 #RRGGBB、槽位名或角色名。空值保留浮层自身颜色；pane_overlays 开启时取焦点窗格边框色 |

## 4. 画中画与临时终端（5 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `pip.corner` |  | `bottom-right` | 默认 |  |
| `pip.width` | 12–200（单元格） | `40` | 默认 | 画中画宽度，含边框 |
| `pip.height` | 3–100（单元格） | `12` | 默认 | 画中画高度，含边框 |
| `scratch.width` | 单元格数 / 百分比，如 60、80% | `80%` | 默认 | 下拉临时终端的宽度 |
| `scratch.height` | 单元格数 / 百分比，如 20、80% | `80%` | 默认 | 下拉临时终端的高度 |

## 5. 边框、标题栏与按钮（19 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `appearance.border_style` | rounded / normal / thick / double / block / outer-half-block / inner-half-block / ascii / hidden / glyphs | `rounded` | 默认 | 每个窗格边框的线条样式。rounded 圆角、normal 直角、thick 粗线、double 双线、block 实心块、两个 half-block 取半块字符、ascii 纯 ASCII、hidden 无边框、glyphs 用自定义字符集 |
| `appearance.border_focused_color` | 颜色 / 空 | `空` | 默认 | 焦点窗格边框颜色总控。接受 #RRGGBB、槽位名或角色名，空值跟随主题 |
| `appearance.border_focused_color_window` | 颜色 / 空 | `空` | 默认 | 窗口模式下焦点边框颜色，优先级高于总控 |
| `appearance.border_focused_color_terminal` | 颜色 / 空 | `空` | 默认 | 终端模式下焦点边框颜色，优先级最高 |
| `appearance.border_unfocused_color` | 颜色 / 空 | `空` | 默认 | 非焦点窗格边框颜色 |
| `appearance.border_focused_gradient` | 两个以上颜色，空格分隔 / 空 | `空` | 默认 | 焦点边框按若干颜色渐变。空值只画单色 |
| `appearance.border_gradient_angle` | 0–359（度） | `45` | 默认 | 渐变方向。0 从左到右，90 从上到下 |
| `appearance.session_border` | true / false | `false` | `true` | 每个窗格边框都带所属会话的颜色，跨会话并排时一眼分清归属 |
| `appearance.session_colors` | true / false | `true` | 默认 | 给每个会话分配独立颜色，用于侧栏与切换器 |
| `appearance.hide_window_buttons` | true / false | `false` | 默认 | 隐藏最小化、最大化、关闭三个按钮 |
| `appearance.window_button_position` | left / right | `left` | 默认 | 标题栏按钮靠哪一端 |
| `appearance.window_button_style` | pill / dots | `dots` | 默认 | 按钮画成实心胶囊，或 macOS 三色灯样式 |
| `appearance.window_button_zoom` | true / false | `true` | 默认 | 平铺窗格是否保留第三个按钮，用于放大 |
| `appearance.window_title_position` | top / bottom / hidden | `top` | 默认 | 标题画在窗格上边、下边或隐藏 |
| `appearance.window_title_style` | pill / tab / plain | `pill` | 默认 | 标题形状。pill 圆角胶囊，tab 直角色块，plain 直接写在边框上 |
| `appearance.window_title_align` | auto / left / center / right | `auto` | 默认 | 标题水平位置。auto 自动避开窗口按钮 |
| `appearance.window_title_format` | 模板 / 空 | `空` | 默认 | 标题模板，接受 {title}、{index}、{cwd}。可用来在标题上显示当前目录 |
| `appearance.zen_mode` | disabled / always / mouse | `disabled` | 默认 | 窗口边框何时隐藏：从不、始终，或鼠标静止时隐藏、移动后恢复 |
| `appearance.glyphs` | 字符集名 | `default` | 默认 | 边框、控件、分隔线与侧栏标记使用的字符集 |

## 6. 主题、背景与配色（13 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `appearance.theme` | 主题名 / 空 / none | `空` | `tokyonight_storm` | 配色主题。空值在安装了 Omarchy 时跟随它，否则沿用终端配色；none 始终沿用终端配色 |
| `appearance.theme_light` | 主题名 / 空 | `空` | 默认 | 终端处于亮色环境时使用的主题。空值表示两种环境都用 theme |
| `appearance.theme_transition` | none / circle / fade | `none` | 默认 | 切换主题时的转场：直接切换、从屏幕中央圆形扩散、淡入 |
| `appearance.theme_transition_duration` | 100–2000（毫秒） | `450` | 默认 | 一次主题切换的时长，按动画速度 100 计 |
| `appearance.background` | off / theme / 颜色 | `off` | 默认 | 所有未单独设色的表面统一底色，覆盖窗格内容、桌面、窗口外观与状态栏。off 让终端底色透出，也可给 #RRGGBB、0–255 调色板号、槽位名或角色名 |
| `appearance.desktop_background` | off / theme / 颜色 / 空 | `空` | 默认 | 窗格之间、空隙与空工作区的底色。空值跟随 appearance.background |
| `appearance.pane_background` | off / theme / 颜色 / 空 | `空` | 默认 | 窗格内容背后的底色。off 为透明，空值跟随 appearance.background |
| `appearance.window_chrome_background` | off / theme / 颜色 / 空 | `空` | 默认 | 边框、标题栏与共享边框之间线条下面的底色。空值跟随 appearance.background |
| `appearance.image_symbols` | auto / octant / sextant / quadrant / half / off | `auto` | 默认 | 终端没有图形协议时，用块字符近似绘制图片。各取值指定块精度，off 不绘制 |
| `appearance.kitty_placeholders` | auto / on / off | `auto` | 默认 | 是否绘制程序用 kitty Unicode 占位符定位的图片 |
| `appearance.dim_unfocused` | 0–90（百分比） | `0` | 默认 | 非当前窗格淡出程度。0 不淡出，数值越大当前窗格越突出 |
| `appearance.dim_foreground` | true / false | `true` | 默认 | 淡出时连文字一起变淡，关闭则只压暗背景 |
| `appearance.dim_multifocus` | true / false | `false` | 默认 | 多焦点集合之外的窗格是否也按非当前窗格淡出 |

## 7. 动画、帧率与视觉强度（4 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `appearance.max_fps` | 10–240 / 0 / auto | `0` | 默认 | 重绘频率上限。终端与显示器能显示的帧数可能更低，设置更高不会更流畅。0 采用 60 帧，auto 采用显示器刷新率 |
| `appearance.motion` | none / basic / full | `full` | 默认 | 动画总量。none 完全不动，basic 保留窗格滑动与复制扫光，full 还包括浮层淡入与运行中 agent 的微光 |
| `appearance.animation_speed` | 25–400（百分比） | `100` | 默认 | 动画播放速度。100 为原速，200 两倍速，50 半速 |
| `appearance.calm` | true / false | `false` | 默认 | 平静模式：任何东西不动不闪，状态栏只显示需要你处理的消息 |

## 8. 鼠标、键盘焦点与输入（21 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `appearance.click_to_type` | single / double / off | `double` | `single` | 在窗口管理模式下，点击窗格内容的行为。single 单击即进入输入，double 需要双击，off 点击不改变模式。只影响鼠标点击 |
| `appearance.auto_enter_terminal_on_focus` | off / targeted / all | `off` | `targeted` | 键盘焦点命令移到窗格时是否进入输入。off 不自动，targeted 在编号选择与方向切换时进入，all 连 Tab 也算。只影响键盘命令 |
| `appearance.focus_follows_mouse` | true / false | `false` | 默认 | 鼠标移到哪个窗格就聚焦哪个 |
| `appearance.focus_follows_mouse_pause` | off / ctrl / alt | `off` | 默认 | 按住指定键时，鼠标移动不改变焦点，避免经过时误抢 |
| `appearance.copy_on_select` | true / false | `true` | 默认 | 松开鼠标即把选中文字复制到剪贴板 |
| `appearance.word_characters` | 字符集合 | `@-./_~?&=%+#` | 默认 | 双击选中单词时，哪些标点算作词的一部分 |
| `appearance.right_click_opens_menu` | true / false | `false` | 默认 | 终端模式下普通右键打开窗格菜单，便于先粘贴再操作 |
| `appearance.links` | off / marked / all | `all` | 默认 | 指针能识别哪些链接。off 不识别，marked 只认带标记的，all 普通网址也认 |
| `appearance.link_click` | both / ctrl / shift / off | `both` | 默认 | 用什么键配合点击打开链接。both 为 Ctrl 或 Shift 均可 |
| `appearance.link_hover` | safe / always | `safe` | 默认 | 悬停高亮。safe 跳过自己处理鼠标的程序，避免干扰 vim、less 这类界面；always 在所有窗格绘制 |
| `appearance.link_opener` | 命令 / 空 | `空` | 默认 | 打开网页链接的命令。空值依次使用 $BROWSER 与系统默认打开方式 |
| `appearance.preferred_shell` | shell 路径 / 空 | `空` | 默认 | 新窗格运行的 shell。空值按平台选择 |
| `appearance.new_window_inherit_cwd` | true / false | `true` | 默认 | 新窗格从当前焦点窗格的工作目录开始 |
| `appearance.new_window_follow_ssh` | true / false | `false` | 默认 | 从运行 ssh 的窗格拆分或新建时，新窗格运行同一个 ssh 目标 |
| `appearance.confirm_quit` | true / false | `false` | 默认 | 退出时始终确认。关闭时只在有进程运行时确认 |
| `appearance.prefix_repeat_time` | 0–5000（毫秒） | `500` | 默认 | 可重复命令执行后，前缀键保持待命的时长。0 关闭保持 |
| `appearance.nvim_navigation` | true / false | `false` | 默认 | 允许 Neovim 导航插件把终端焦点键交回 TUIOS |
| `appearance.wrap_lists` | true / false | `true` | 默认 | 列表首行按上键跳到末行，末行按下键跳到首行 |
| `appearance.scrollback_lines` | 100–1000000（行） | `10000` | 默认 | 每个窗格保留的历史行数。窗格创建时取值，改动只影响新窗格；daemon 在启动时读取 |
| `appearance.global_session` | true / false | `true` | 默认 | 第二台机器可达后，侧栏提供一个聚合多机窗格的会话 |
| `appearance.hide_scrollbar` | true / false | `false` | 默认 | 隐藏窗格边框上的滚动条滑块 |

## 9. 侧栏（有效项）（33 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `appearance.git_dirty` | true / false | `true` | 默认 | 侧栏 git 区显示已暂存、已修改、未跟踪的路径数量。这是该区唯一需要遍历工作树的统计 |
| `appearance.sidebar.enabled` | true / false | `true` | 默认 | 是否显示侧栏 |
| `appearance.sidebar.position` | left / right / hidden | `right` | `left` | 侧栏停靠的一侧，或收起 |
| `appearance.sidebar.width` | 列数 | `24` | `28` | 宽屏下侧栏的首选宽度。不超过 30 列时，运行 agent 的窗格只在 agents 区块出现一次 |
| `appearance.sidebar.sections` | 逗号分隔的名称:百分比 | `sessions:25,terminals,files:25,agents:34` | 默认 | 侧栏区块的堆叠顺序与高度占比。写出的名称才绘制，spacer 表示空白块，可重复 |
| `appearance.sidebar.density` | normal / roomy | `normal` | 默认 | 区块间距。roomy 在除第一个之外每个区块前留一行空白 |
| `appearance.sidebar.header_case` | lowercase / uppercase | `lowercase` | 默认 | 区块标题大小写。lowercase 更低调，uppercase 更像标题 |
| `appearance.sidebar.header_style` | auto / plain / rule / pill / icon | `auto` | 默认 | 区块标题的绘制方式，icon 用该区块图标 |
| `appearance.sidebar.row_style` | bar / marker / underline / pill | `bar` | 默认 | 标记当前行的方式：左侧竖条、标记符号、下划线或高亮块 |
| `appearance.sidebar.cursor_background` | 颜色 / 空 | `空` | 默认 | 侧栏获得键盘焦点时，光标所在行的背景色。空值沿用主题 |
| `appearance.sidebar.background` | off / theme / 颜色 / 空 | `空` | 默认 | 侧栏底色。空值跟随 appearance.background |
| `appearance.sidebar.show_counts` | true / false | `true` | 默认 | 会话行显示窗格数量 |
| `appearance.sidebar.show_glyphs` | true / false | `true` | 默认 | 每行显示 agent 状态符号 |
| `appearance.sidebar.show_numbers` | true / false | `false` | 默认 | 会话名前显示切换编号 |
| `appearance.sidebar.show_windows` | true / false | `true` | 默认 | 是否绘制 terminals 区块 |
| `appearance.sidebar.peek` | true / false | `true` | 默认 | 指针或侧栏光标停在某个会话行时，terminals 区块预览该会话的窗格 |
| `appearance.sidebar.marquee` | true / false | `true` | 默认 | 悬停时滚动显示超出宽度的标题 |
| `appearance.sidebar.tooltips` | true / false | `true` | 默认 | 悬停收起状态的侧栏时显示说明 |
| `appearance.sidebar.files_style` | list / tree | `list` | 默认 | 文件区块的展示方式。list 一次显示一个目录，tree 在同一根下就地展开 |
| `appearance.sidebar.file_icons` | true / false | `true` | 默认 | 按文件类型显示 Nerd Font 图标 |
| `appearance.sidebar.file_icon_colors` | true / false | `true` | 默认 | 图标按文件类型上色 |
| `appearance.sidebar.file_actions` | true / false | `true` | 默认 | 允许在文件区块内新建、改名、删除、复制、粘贴 |
| `appearance.sidebar.file_delete` | trash / permanent | `trash` | 默认 | 删除文件时送往回收站，或直接清除。permanent 无法恢复 |
| `appearance.sidebar.file_drag` | true / false | `true` | 默认 | 把文件行拖进窗格即粘贴其路径 |
| `appearance.sidebar.folder_click` | navigate / cd / both | `navigate` | 默认 | 点击文件夹行的行为。navigate 只在侧栏展开，cd 让当前窗格切换目录，both 两者都做 |
| `appearance.sidebar.editor` | 命令 / 空 | `空` | 默认 | 在侧栏打开文本文件使用的编辑器。空值依次使用 $EDITOR、$VISUAL、vi |
| `appearance.sidebar.group_main` | true / false | `false` | 默认 | 把仓库主检出连同 worktree 收进仓库行下面，仓库标题改为打开主检出的会话 |
| `appearance.sidebar.agent_rest_fold` | 时长，如 1h / off | `1h` | 默认 | agent 行静止多久后折叠成一行。静止指空闲、未知，或已完成且已查看 |
| `appearance.sidebar.subagent_collapse` | off / expanded / collapsed | `off` | 默认 | agent 的 subagent 列表是否带标题行并支持开合，以及初始展开或收起 |
| `appearance.sidebar.subagent_fields` | 逗号列表：mark, name, type, time, note | `mark,name,time,note` | 默认 | 每个 subagent 行显示的字段 |
| `appearance.sidebar.subagent_hide_finished` | 时长，如 30s / off | `off` | 默认 | subagent 结束后其行保留多久。off 表示一直保留到 daemon 丢弃 |
| `appearance.sidebar.subagent_max_rows` | 0–16（行） | `0` | 默认 | 单个 agent 的 subagent 最多占几行，含 +N more 行。0 不限 |
| `appearance.sidebar.subagent_rows` | rows / tree / count | `rows` | 默认 | subagent 的呈现方式：各自一行、用树线连接，或只显示数量 |

## 10. 已废弃键（加载时折叠）（10 项）

这些键仍在注册表中，但加载时折叠进有效键，`set-config` 会拒绝写入。

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `appearance.animations_enabled` | — | `true` | 默认 | 已废弃，加载时折叠进 appearance.motion |
| `appearance.hide_clock` | — | `false` | 默认 | 已废弃，改用 appearance.show_clock |
| `appearance.sidebar.show_agents` | — | `true` | 默认 | 已废弃，改由 appearance.sidebar.sections 控制 |
| `appearance.sidebar.workspaces` | — | `空` | 默认 | 已废弃，侧栏不再绘制工作区条带 |
| `appearance.sidebar_enabled` | — | `false` | 默认 | 已废弃，加载时折叠进 appearance.sidebar.enabled |
| `appearance.sidebar_position` | — | `空` | 默认 | 已废弃，加载时折叠进 appearance.sidebar.position |
| `appearance.sidebar_show_counts` | — | `true` | 默认 | 已废弃，加载时折叠进 appearance.sidebar.show_counts |
| `appearance.sidebar_show_glyphs` | — | `true` | 默认 | 已废弃，加载时折叠进 appearance.sidebar.show_glyphs |
| `appearance.sidebar_show_windows` | — | `true` | 默认 | 已废弃，加载时折叠进 appearance.sidebar.show_windows |
| `appearance.sidebar_width` | — | `0` | 默认 | 已废弃，加载时折叠进 appearance.sidebar.width |

## 11. Dock 状态栏（19 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `appearance.dockbar_position` | top / bottom / hidden | `top` | 默认 | 状态栏停靠的一侧，或隐藏 |
| `appearance.dock_compact` | true / false | `false` | 默认 | 状态栏压成一行并去掉分隔线，窗格多出一行 |
| `appearance.dock_background` | off / theme / 颜色 / 空 | `空` | 默认 | 状态栏底色。空值跟随 appearance.background |
| `appearance.dock_pill_caps` | true / false | `true` | `true` | 状态栏所有胶囊使用圆角端点：模式块、工作区标签与最小化窗口。关闭后为平头 |
| `appearance.dock_prefix_indicator` | pill / badge | `pill` | 默认 | 前缀键按下后的提示方式：模式块变色，或单独显示标记 |
| `appearance.dock_mode_pill` | tiling / input | `tiling` | 默认 | 平铺开启时模式块显示什么：平铺图标，或终端与窗口图标 |
| `appearance.dock_mode_icon_tiling` | 图标名 / 空 / default | `default` | 默认 | 平铺模式下模式块的图标。空值不显示，default 使用字符集自带图标 |
| `appearance.dock_mode_icon_window` | 图标名 / 空 / default | `default` | 默认 | 窗口模式下模式块的图标 |
| `appearance.dock_mode_icon_terminal` | 图标名 / 空 / default | `default` | 默认 | 终端模式下模式块的图标 |
| `appearance.dock_mode_split_letter` | true / false | `true` | 默认 | 平铺图标后显示 V 或 H，提示下一次切分方向 |
| `appearance.dock_workspace_tabs` | true / false | `true` | 默认 | 状态栏显示可点击的工作区条 |
| `appearance.dock_workspace_label_max` | 0–200（单元格） | `12` | 默认 | 工作区标签截断前最多占多少格。0 表示画完整名称并改为滚动条带 |
| `appearance.dock_workspace_tab_format` | 模板，接受 {index}、{name}、{icon}、{zoom} / 空 | `空` | 默认 | 工作区标签模板。空值为 {name} |
| `appearance.dock_workspace_tooltip` | true / false | `true` | 默认 | 标签被截断或未显示名称时，悬停显示完整名称 |
| `appearance.show_clock` | true / false | `false` | `true` | 显示时钟浮层 |
| `appearance.clock_format` | Go 时间布局 | `15:04` | `15:04:05` | 时钟绘制使用的格式，例如 15:04 或 Mon 3:04PM |
| `dock.clock.format` | Go 时间布局 / 空 | `空` | 默认 | 时钟渲染格式。空值为 15:04；不含秒的格式每分钟刷新一次 |
| `appearance.show_cpu` | true / false | `false` | `true` | 状态栏显示 CPU 曲线 |
| `appearance.show_ram` | true / false | `false` | `true` | 状态栏显示内存占用 |

## 12. 选中、复制与剪贴板（19 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `appearance.selection.bg` | 颜色 | `#45475A` | 默认 | 选中文字的背景色 |
| `appearance.selection.fg` | 颜色 / 空 | `空` | 默认 | 选中文字的前景色。空值保留原色 |
| `appearance.selection.bold` | true / false | `false` | 默认 | 选中文字除上色外是否加粗 |
| `appearance.selection.flash` | true / false | `true` | 默认 | 复制后扫过一道光提示。把 motion 设为 none 可关闭 |
| `appearance.selection.flash_color` | 颜色 / 空 | `空` | 默认 | 扫光使用的颜色 |
| `appearance.selection.flash_ms` | 80–3000（毫秒） | `420` | 默认 | 一次扫光耗时 |
| `appearance.selection.flash_style` | diagonal / diagonal-reverse / horizontal / vertical | `diagonal` | 默认 | 扫光方向与形状 |
| `appearance.selection.cursor_bg` | 颜色 | `#39C5CF` | 默认 | 复制模式光标块的背景色 |
| `appearance.selection.cursor_fg` | 颜色 / 空 | `#08222B` | `#08222B` | 复制模式光标下的文字颜色。空值保留原色 |
| `appearance.selection.copy_entry` | cursor / center | `cursor` | 默认 | 进入复制模式时光标位置：终端光标处，或屏幕中央 |
| `appearance.selection.copy_command` | 命令 / 空 | `空` | 默认 | 每次复制内容送入该命令的标准输入，其输出写入剪贴板。空值直接复制选中内容 |
| `appearance.selection.multi_format` | plain / markdown / json | `plain` | 默认 | 多选复制时输出的格式 |
| `appearance.selection.search_bg` | 颜色 | `#8A6D2F` | 默认 | 所有搜索匹配的背景色 |
| `appearance.selection.search_fg` | 颜色 / 空 | `#F5E7C8` | `#F5E7C8` | 搜索匹配的文字颜色。空值保留原色 |
| `appearance.selection.match_bg` | 颜色 | `#E5A93D` | 默认 | 光标所在那处匹配的背景色 |
| `appearance.selection.match_fg` | 颜色 / 空 | `#1C1B19` | `#1C1B19` | 光标所在匹配的文字颜色。空值保留原色 |
| `appearance.selection.osc52_write` | off / ask / focused / on | `focused` | 默认 | 窗格内程序写系统剪贴板的许可级别。off 一律拒绝，ask 每次询问，focused 只允许焦点窗格、其余询问，on 任何窗格都允许 |
| `paste_buffers.limit` | 0–1000 | `20` | 默认 | 保留多少次复制内容供再次粘贴。满时丢弃最旧的，0 不保留 |
| `paste_buffers.max_kb` | 0–262144（KiB） | `16384` | 默认 | 所有粘贴缓存合计容量上限，最大 256 MiB。满时丢弃最旧的，0 采用 16384 |

## 13. 滚动条（4 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `appearance.scrollbar.style` | thin / track | `track` | 默认 | 滚动条形态：覆盖在内容列的细线滑块，或占满高度的轨道 |
| `appearance.scrollbar.thumb` | 单个字符 / 空 | `空` | 默认 | 滑块使用的字符。空值使用样式自带字符 |
| `appearance.scrollbar.track` | 单个字符 / 空 / none | `空` | 默认 | 轨道使用的字符。空值使用样式自带字符 |
| `appearance.scrollbar.tint` | quiet / border / muted / 颜色 | `quiet` | 默认 | 滚动条配色取向，也可直接给颜色值 |

## 14. 屏幕辅助导航（12 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `hints.all_panes` | true / false | `false` | 默认 | 提示键标注工作区所有窗格，而非只有焦点窗格 |
| `hints.alphabet` | 字符序列 | `asdfghjkl` | 默认 | 生成提示标签使用的字母，靠前的先被使用 |
| `hints.builtins` | all / none / 名称列表，如 url,path,sha | `all` | 默认 | 提示模式自动识别的内置模式 |
| `hints.dim` | 10–90（百分比） | `60` | 默认 | 提示标签周围文字丢失的亮度比例 |
| `hints.open` | true / false | `true` | 默认 | Ctrl 加标签直接打开网址或路径。远程客户端上不生效 |
| `panes.label_keys` | 字符序列 | `1234567890` | 默认 | 窗格标签使用的按键，第一个标签对应第一个窗格 |
| `panes.navigator_layout` | tree / flat / cards | `tree` | 默认 | 窗格导航器打开时的列表形式 |
| `panes.navigator_search` | true / false | `false` | 默认 | 打开窗格导航器时直接进入搜索输入 |
| `panes.drag_and_drop` | true / false | `false` | 默认 | 通过 kitty 拖放协议在窗格之间拖拽内容 |
| `path_picker.show_hidden` | true / false | `false` | 默认 | 路径选择器是否列出隐藏文件。面板内 Alt+h 可临时切换 |
| `appearance.whichkey_enabled` | true / false | `true` | 默认 | 按下前缀键后显示可用快捷键弹窗 |
| `appearance.whichkey_position` | bottom-right / bottom-left / top-right / top-left / center / 空 | `空` | 默认 | 快捷键弹窗出现的角落。空值为右下 |

## 15. 通知（28 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `notifications.level` | info / warning / error | `info` | 默认 | 状态栏至少显示哪一级消息。info 全部显示，warning 只显示警告与错误，error 只显示错误。agent 与窗格提醒不受此项约束 |
| `notifications.style` | full / plain | `full` | 默认 | 状态栏消息外观。full 带侧条与倒计时行，plain 只显示图标与文字 |
| `notifications.duration` | 0–3600（秒） | `0` | 默认 | 普通信息停留时长。设为 0 时采用内置的 2 秒 |
| `notifications.warning_duration` | 0–3600（秒） | `0` | 默认 | 警告停留时长。设为 0 时采用内置的 8 秒 |
| `notifications.error_duration` | 0–3600（秒） | `0` | 默认 | 错误停留时长，仅在 error_sticky 为假时生效。设为 0 时采用内置的 15 秒 |
| `notifications.error_sticky` | true / false | `true` | 默认 | 错误消息一直保留，直到按 Esc |
| `notifications.log_hidden` | true / false | `true` | 默认 | 低于显示级别的消息写入日志查看器。关闭后这些消息不保留；警告与错误始终进入日志 |
| `notifications.bell` | toast / forward / both / off | `toast` | 默认 | 窗格响铃时的处理：状态栏提示、转发给终端、两者都做，或忽略 |
| `notifications.agent.enabled` | true / false | `true` | 默认 | agent 提醒总开关 |
| `notifications.agent.notify` | true / false | `true` | `false` | 向已连接的终端发送系统桌面通知 |
| `notifications.agent.dock` | true / false | `true` | 默认 | 在状态栏显示提醒，点击可跳到对应窗格 |
| `notifications.agent.sound` | true / false | `false` | 默认 | 提醒是否发声 |
| `notifications.agent.sound_mode` | audio / bell / both / 空 | `空` | 默认 | 发声方式：提示音、终端铃，或两者。空值按平台默认 |
| `notifications.agent.sound_cooldown_seconds` | 0–3600（秒） | `3` | 默认 | 两次发声的最短间隔。0 采用 3 秒 |
| `notifications.agent.command` | shell 命令 / 空 | `空` | 默认 | 提醒时执行的外部命令，可用来推送到手机。空值不执行 |
| `notifications.agent.quiet_hours` | HH:MM-HH:MM / 空 | `空` | 默认 | 不发出任何提醒的时段 |
| `notifications.agent.settle_seconds` | 0–3600（秒） | `2` | 默认 | 等待多少秒再提醒。期间窗格状态又变化则丢弃这次提醒 |
| `notifications.agent.suppress_focused` | true / false | `true` | 默认 | 终端有焦点时，对当前窗格不提醒 |
| `notifications.agent.states.done` | true / false | `true` | 默认 | agent 报告完成时提醒 |
| `notifications.agent.states.errored` | true / false | `true` | 默认 | agent 因错误停止时提醒 |
| `notifications.agent.states.needs_input` | true / false | `true` | 默认 | agent 等待你输入时提醒 |
| `notifications.agent.states.idle` | true / false | `false` | 默认 | agent 转为安静时提醒 |
| `notifications.agent.states.working` | true / false | `false` | 默认 | agent 开始工作时提醒 |
| `notifications.mail.enabled` | true / false / 未设置 | `空` | 默认 | 邮件提醒开关。未设置时跟随 notifications.agent.enabled |
| `notifications.mail.dock` | true / false / 未设置 | `空` | 默认 | 邮件提醒是否进入状态栏。未设置时跟随 notifications.agent.dock |
| `notifications.mail.notify` | true / false / 未设置 | `空` | 默认 | 邮件是否发系统桌面通知。未设置时跟随 notifications.agent.notify |
| `notifications.mail.sound` | true / false / 未设置 | `空` | 默认 | 邮件提醒是否发声。未设置时跟随 notifications.agent.sound |
| `notifications.mail.between_agents` | true / false | `false` | 默认 | agent 之间互发消息时是否也提醒 |

## 16. Agent、任务与 Tape（6 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `agents.enabled` | true / false | `true` | 默认 | Agent、Inbox、邮件与审批的总开关。关闭后只保留多路复用功能 |
| `agents.fold_working` | true / false | `false` | 默认 | Agents View 的 Working 分组默认折叠。F 键可开合单个分组，视图保留该选择 |
| `tasks.auto_stage` | true / false | `true` | 默认 | 观察到任务对应工作推进时自动移动任务卡：计划获批、fan 检查、拉取请求。关闭后每个阶段都由你手动推进 |
| `tape.autorun` | off / ask / auto | `ask` | 默认 | 进入含项目 tape 的目录时的行为。off 不扫描不提示，ask 显示被动横幅与徽标，auto 对已信任且未编辑的 tape 直接执行；未信任或已改动的仍走提示 |
| `tape.auto_review` | true / false | `false` | 默认 | 检测到 tape 时直接打开审查对话框，省去一次按键。信任边界不变，仍需你选择运行或信任 |
| `tape.show_status` | true / false | `true` | 默认 | 播放时显示 RUNNING 胶囊与进度消息。录制屏幕时关闭，录像里只留下应用画面 |

## 17. 后台守护进程（8 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `daemon.agent_autodetect` | true / false | `true` | 默认 | 识别窗格前台运行的 agent 命令行并设置状态符号 |
| `daemon.agent_detect_seconds` | 整数秒；0 采用内置的 2 秒；负数关闭 | `0` | 默认 | 检测窗格前台 agent 的轮询间隔 |
| `daemon.resume_agents` | ask / auto / off | `ask` | `auto` | daemon 重启后如何处理每个窗格的 agent 对话。ask 逐个询问，auto 直接恢复，off 都不恢复 |
| `daemon.window_size` | smallest / largest / latest | `latest` | `latest` | 多个客户端同时连接时的画面尺寸。latest 跟最后有输入的那个，smallest 按最小客户端，largest 按最大客户端 |
| `daemon.persist_scrollback` | true / false | `true` | 默认 | 保存每个窗格的历史，daemon 重启后再显示。改动在 daemon 下次启动时生效 |
| `daemon.persist_scrollback_lines` | 0–1000000（行） | `0` | 默认 | 单个窗格保存的历史行数上限。设为 0 时采用内置的 1000 行。改动在 daemon 下次启动时生效 |
| `daemon.persist_scrollback_kb` | 0–1048576（KiB） | `0` | 默认 | 单个窗格保存的历史在磁盘上的容量上限。设为 0 时采用内置的 2048 KiB。改动在 daemon 下次启动时生效 |
| `daemon.log_level` | off / errors / basic / messages / verbose / trace | `off` | 默认 | daemon 记录日志的详细程度，trace 最详细 |

## 18. 截图（15 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `screenshot.format` | png / svg / ansi / html / txt | `png` | 默认 | 截图默认输出格式。png 便于分享，svg 与 html 保留矢量与样式，ansi 与 txt 保留终端文本 |
| `screenshot.directory` | 路径 | `~/Pictures/tuios` | 默认 | 截图文件保存目录 |
| `screenshot.copy` | true / false | `true` | 默认 | 截图后尝试复制到剪贴板 |
| `screenshot.preview` | true / false | `true` | 默认 | 截图后打开预览面板 |
| `screenshot.frame` | window / plain / none | `window` | 默认 | 截图外围装饰：窗口卡片、平卡片，或没有装饰 |
| `screenshot.controls` | auto / macos / glyphs / none | `auto` | 默认 | 卡片上的窗口控制标记：自动、macOS 三色灯、自定义字符集，或不画 |
| `screenshot.title_format` | 模板，接受 {title}、{index}、{cwd} | `{title}` | 默认 | 卡片标题栏文字 |
| `screenshot.background` | auto / none / 十六进制颜色 / hex..hex | `auto` | 默认 | 卡片背后的底色。auto 由主题推导，hex..hex 画渐变 |
| `screenshot.padding` | 0–128（像素） | `48` | 默认 | 卡片四周留白 |
| `screenshot.radius` | 0–32（像素） | `10` | 默认 | 卡片圆角半径 |
| `screenshot.shadow` | true / false | `true` | 默认 | 卡片下方绘制柔和阴影 |
| `screenshot.scale` | 1–4 | `2` | 默认 | PNG 尺寸倍数 |
| `screenshot.cursor` | true / false | `false` | 默认 | 截图中是否画出光标所在格 |
| `screenshot.font_family` | 字体族 | `JetBrains Mono, monospace` | 默认 | 终端未报告所用字体时，绘制截图使用的字体 |
| `screenshot.font_file` | 字体文件路径 / 空 | `空` | 默认 | 绘制 PNG 使用的字体文件，并嵌入 SVG 与 HTML。优先级高于其他字体设置 |

## 19. 屏保与 Spotlight（10 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `screensaver.enabled` | true / false | `false` | 默认 | 长时间无输入后是否播放动画 |
| `screensaver.idle_minutes` | 1–240（分钟） | `10` | 默认 | 触发屏保所需的空闲时长 |
| `screensaver.effect` | random 加 36 个具名效果 | `random` | 默认 | 播放哪种动画。random 每次随机；具名效果见下表 |
| `screensaver.while_busy` | true / false | `false` | 默认 | 窗格正在运行命令或 agent 时是否也启动屏保 |
| `spotlight.enabled` | true / false | `false` | 默认 | 照亮屏幕局部并压暗其余部分 |
| `spotlight.follow` | mouse / cursor | `mouse` | 默认 | 光束跟随鼠标，或跟随焦点窗格的光标。cursor 发给远程客户端的字节更少 |
| `spotlight.radius` | 2–200（行） | `10` | 默认 | 光束半高，数值越大照亮范围越高 |
| `spotlight.dim` | 10–95（百分比） | `75` | 默认 | 未照亮区域丢失的亮度比例 |
| `spotlight.edge` | hard / soft | `hard` | 默认 | 光束边缘硬切，或渐隐。渐隐在光束每次移动时发送约三倍字节 |
| `spotlight.shake` | true / false | `false` | 默认 | 快速左右移动鼠标切换聚光灯。晃动不移动光束，位置仍由 follow 决定 |

## 20. 工作区、启动器与其他（8 项）

| 键 | 允许值 | 默认 | 当前 | 体验 |
|---|---|---|---|---|
| `workspaces.new_window_when_empty` | true / false | `false` | 默认 | 切到没有窗格的工作区时自动开一个窗格，并从上一个窗格的目录开始 |
| `workspaces.return_when_empty` | true / false | `true` | 默认 | 屏幕上工作区的最后一个窗格关闭时，回到上一个工作区。关闭后显示启动画面 |
| `worktree.path` | 模板 / 空 | `空` | 默认 | 新 worktree 的存放位置，模板接受 {repo_path}、{repo}、{branch}，加竖线加 slug 可生成单层文件夹名。相对路径从 repo_path 起算。空值放在 $XDG_DATA_HOME/tuios/worktrees |
| `launcher.gui_command` | 命令 / 空 | `空` | 默认 | 启动图形桌面项目时使用的命令，桌面项的 argv 会追加其后。应使用接受 argv 的命令，例如 tuios-wayland launch --；不要使用把参数拼成 shell 行的命令，例如 swaymsg exec -- |
| `launcher.keep_open` | true / false | `false` | 默认 | 启动器拉起的程序退出后是否保留窗格，输出下方显示退出状态。需要 daemon 会话 |
| `mermaid.theme` | tuios / 主题名，如 flexoki、nord、rose-pine | `tuios` | 默认 | Mermaid 图表配色。tuios 表示跟随当前主题 |
| `mermaid.background` | theme / none | `theme` | 默认 | 图表底色：主题色，或终端自身背景 |
| `debug.show_key_events` | true / false | `false` | 默认 | 屏幕上显示最近按键，用于排查快捷键问题 |

## 结构型配置

以下结构不在 `list-options` 的标量清单中，由 `UserConfig` 直接解析，没有逐项命令行校验。

| 表 / 字段 | 作用 |
|---|---|
| `include = [...]` | 引入其他 TOML 配置文件，优先级最低 |
| `[keybindings]` | `leader_key`、`preset`（`tuios` 或 `tmux`）、29 个作用域子表、`[[keybindings.command]]`、`[[keybindings.copy_pipe]]` |
| `[dock]` | 状态栏左、中、右三段显示哪些模块 |
| `[hooks]` | 会话与窗格创建、关闭、聚焦等生命周期事件触发的外部命令 |
| `[agents.permissions]` | 给窗格内 agent 分配控制权限 |
| `[hosts.<名称>]`、`[tailscale]` | 跨机器连接与节点发现过滤 |
| `[notify.<名称>]` | 推送到手机或外部推送服务 |
| `[plugins]` | Herdr 兼容插件目录 |
| `[ssh]` | 内置 ssh 服务器的连接与限制参数 |

## screensaver.effect 的 37 个取值

`random` 每次随机；其余 36 个为具名效果，取值名即效果名。本页只保证取值完整，未逐个播放观察画面。

`random` / `binarypath` / `blackhole` / `bouncyballs` / `bubbles` / `burn` / `crumble` / `decrypt` / `errorcorrect` / `expand` / `fireworks` / `highlight` / `laseretch` / `matrix` / `middleout` / `orbittingvolley` / `overflow` / `pour` / `print` / `rain` / `randomsequence` / `rings` / `scattered` / `slice` / `slide` / `smoke` / `spotlights` / `spray` / `swarm` / `sweep` / `synthgrid` / `thunderstorm` / `tuffbaby` / `unstable` / `vhstape` / `waves` / `wipe`

## 校验与修改入口

```bash
tuios list-options --section sidebar     # 按分组查看路径、类型、默认值
tuios list-options --search scrollback   # 按关键词搜索
tuios set-config appearance.gap 1        # 严格校验后写入 config.toml
tuios config browse                      # 交互式浏览与修改
tuios config prune --dry-run             # 预览可移除的默认值键
tuios keybinds doctor                    # 检查快捷键冲突与废弃绑定
```

`set-config` 对未知路径、非法枚举、越界数值与无效颜色直接拒绝。手改 `config.toml` 时未知键忽略、越界数值截断到合法范围、非法枚举与颜色回退默认值，无法解析的按键被剔除并记入告警。

## 证据边界

- 271 个路径、默认值、`accepted`、`min`/`max` 逐字来自 raw 中的完整 `list-options --json` 输出。
- 当前值来自本机 `config.toml`（153 行，含上游生成的注释头）。
- 体验一栏依据 `description` 原文与源码语义撰写，属推断；未逐项做视觉对照实验。
- `screensaver.effect` 的 36 个具名效果未逐个观察画面。

## See Also

- [TUIOS 配置与用户体验](tuios-config-user-experience.md)
- [TUIOS Tape 自动化与项目 tape 信任边界](tuios-tapes.md)
- [tuios workspace 与 session rail](tuios-workspace-and-sidebar.md)
