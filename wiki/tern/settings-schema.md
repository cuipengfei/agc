# Tern 设置项全集

> Sources: 本机 tern 0.9.4 (b9ef74c) 二进制 strings 提取， 2026-10-20
> Raw: [Tern 设置 Schema：二进制内嵌结构体源码摘录](../../raw/tern/2026-10-20-settings-schema-from-binary-strings.md)
> Updated: 2026-10-20

## 存储机制与本机状态

原生实现把设置写入配置目录下的 `settings.json`（Linux 默认 `~/.config/tern`，`TERN_CONFIG_DIR` 可改），文件只保存与默认值有差异的项。Web 端设置在浏览器 localStorage，键名同为 `settings.json`，按 origin 隔离；存储细节与排查方法见 [Tern 设置存储位置](settings-storage.md)。本机 2026-10-20 时 `~/.config/tern/` 下无 `settings.json`，即全部默认。以下字段全集来自本机二进制 `tern 0.9.4 (b9ef74c)`（`tern --version` 实测）。

## 提取方法

对 `/home/cpf/.local/bin/tern` 执行 `strings -n 4` 导出全部字符串后发现：二进制内嵌了 `Settings` 及相关设置结构体的完整 Rust 源码（含每个字段的 doc 注释），位于字符串表第 879000–884300 行区。下文字段名逐字取自该区；原注释压缩为行内形式照录，个别长注释在字符串表中被截断，注释完全未提取的字段如实标注。

## 顶层字段全集

`Settings` 结构体带 `#[serde(default)]`：文件缺项时回落默认值。以下按语义分组，字段名逐字照录结构体声明。

**外观与主题**

- `theme`（ThemePref）— 外观跟随系统，或恒为浅色/深色。
- `theme_dark`（Option\<String>）— dark 外观的 omp theme；None 跟随 omp theme.dark。
- `theme_light`（Option\<String>）— light 外观的 omp theme。
- `contrast`（Contrast）— 低对比度文本颜色何时被校正。
- `material`（Material）— 玻璃、透明或纯色表面。
- `opacity`（u8）— 0..100%，Ghostty 的 background-opacity。
- `blur`（u8）— Material::Clear 背后的模糊半径。
- `density`（Density）— pane 用卡片还是紧贴平铺。

**字体**

- `font_size`（u16）— 终端字号（px）。
- `ui_font_size`（Option\<u16>）— 界面字号；None 跟随 `font_size`。
- `font_family`（String）— 网格的字族，按输入原样。
- `font_family_bold`（String）— 粗体格线的字族（注释未提取）。
- `font_family_italic`（String）— 斜体格线的字族（注释未提取）。
- `font_family_bold_italic`（String）— 粗斜体格线的字族（注释未提取）。
- `font_weight`（u16）— 网格文本的字重。
- `adjust_cell_height`（CellAdjust）— 加到网格行高上的调整量。
- `ui_font`（String）— 界面字体；空串使用内置字面。
- `code_font`（String）— 网格以外等宽文本的字体。

**滚动与指针**

- `smooth_scroll`（bool）— 鼠标滚轮步进带缓动。
- `overscroll`（bool）— 滚动越过两端时橡皮筋回弹；内置说明称此键默认开启。
- `three_finger_swipes`（bool）— 三指手势：tab peek / Mission Control / 切 tab / dismiss banners。
- `scroll_speed`（u16）— 滚动速度，系统速度的百分比。
- `scrollback_lines`（usize）— 每个终端 pane 保留的 scrollback 行数；内置说明称默认 200,000 行，修改对运行中的 pane 立即生效。
- `pointer_shape`（PointerShape）— 指针形状（注释未提取）。
- `reduce_motion`（ReduceMotion）— 动效缩减（注释未提取）。

**光标**

- `cursor`（CursorSettings）— 光标设置子结构，字段见下文子结构一节。

**链接与剪贴板**

- `copy_on_select`（bool）— 完成选区时即复制。
- `link_click`（LinkClick）— 哪次点击打开链接。
- `link_target`（LinkTarget）— web 链接在何处打开。
- `clipboard_write`（Permission）— 程序写剪贴板（OSC 52、OSC 5522）的许可级别。
- `hyperlinks`（Permission）— 程序 OSC 8 超链接的许可级别。

**通知**

- `notifications`（bool）— 程序桌面通知（OSC 9、99、777）。
- `notification_filters`（Vec\<String>）— kitty 的 filter_notification 规则。

**粘贴**

- `paste`（PasteSettings）— 粘贴行为子结构，见下文。

**窗口与布局**

- `layout`（Layout）— 窗口 chrome 布局；四个取值见下文 Layout 枚举一节。
- `tabs`（TabOrientation）— 标签列表的位置。
- `tabs_autohide`（bool）— 竖排标签列自动隐藏。
- `system_title_bar`（bool）— Linux/Windows：由系统绘制标题栏。
- `system_traffic_lights`（bool）— macOS 系统红绿灯。
- `pane_headers`（PaneHeaders）— pane 何时戴上头部。
- `status_bar`（bool）— pane 下方状态行：directory/branch/last run/scrollback/size。
- `tmux_status`（bool）— tmux 状态行画成 Tern 自己的。
- `confirm_close`（ConfirmClose）— 关闭确认（注释未提取）。
- `prefs_width`（u16）— 注释未提取。
- `park_pile`（f32）— 停靠 pane 的堆叠停靠在舞台底边的位置。
- `park_pile_size`（f32）— 堆叠大小（注释未提取）。

**渲染**

- `antialias`（bool）— 形状边缘抗锯齿。
- `snap_text`（bool）— 每个字形落在整个设备像素上。
- `msaa`（Msaa）— 多重采样抗锯齿；三个常问字段的逐字注释见下文渲染组一节。
- `sync_to_display`（bool）— 帧在显示器刷新时刻呈现（vsync）。
- `frames_queued`（u8）— GPU 可排在显示器之前的帧数。
- `renderer`（Renderer）— 由什么绘制窗口，下次启动生效。

**agent 与 surface 集成**

- `agent_command`（String）— agent 块运行什么，经登录 shell（`omp`）。
- `agent_placement`（AgentPlacement）— New agent block 在何处打开 agent。
- `native_surfaces`（bool）— TSP 程序画原生界面；off 则 Tern 不应答 hello。
- `command_lenses`（bool）— 被识别的命令（git、ls、cargo、docker）显示为原生块。
- `native_completion`（bool）— shell Tab 补全显示为原生 popover。
- `native_editing`（bool）— 程序 composer 像文本字段一样编辑。
- `program_colors`（bool）— surface 使用程序发送的调色板。
- `surface_headings`（Option\<Headings>）— 注释未提取。
- `surface_diffs`（DiffLayout）— surface 上的编辑：inline 或 split。
- `surface_tab_width`（u8）— 注释未提取。
- `surface_fold`（bool）— 工具调用与思考的折叠。
- `expand_thoughts`（bool）— omp 的 thoughts 保持展开。
- `composer_text`（ComposerText）— 注释未提取。
- `surface_chat`（Chat）— Reader、Spine 或 Console。

**插件**

- `plugins`（bool）— `<config>/plugins` 下的插件在本机加载。
- `plugins_disabled`（Vec\<String>）— 保持不加载的插件 id。

**shell 与提示符**

- `shell`（String）— 本地块运行的登录 shell；空串使用内置。
- `native_prompt`（bool）— shell 把提示符画成原生栏。
- `prompt_style`（PromptStyle）— 注释未提取。
- `prompt_parts`（Parts）— 提示符组成子结构，字段见下文。

**会话与远程**

- `new_tabs`（TabDir）— 新标签从何处开始。
- `start_folder`（String）— 无目录可继承时的启动目录。
- `new_blocks`（BlockKind）— 新标签和分屏运行什么。
- `share_sessions`（bool）— 允许本机 session 被 serve 到其他机器和浏览器。
- `reconnect_hosts`（bool）— 重连上一个窗口用过的远程主机。
- `cross_session_click`（CrossSessionClick）— 注释未提取。

**系统**

- `auto_update`（bool）— 注释未提取。
- `ask_to_move`（bool）— macOS。
- `desktop_integration`（bool）— macOS 与 Linux。

**文件与文件树**

- `files`（FileSettings）— 文件查看与编辑子结构，见下文。
- `file_tree`（FileTreeSettings）— 文件树子结构，见下文。

**子结构引用**

- `git`（GitSettings）、`cloud`（CloudSettings，桌面 only）、`sqlite`（SqliteSettings）、`notebook`（NotebookSettings）、`carly`（CarlySettings）、`agents`（AgentSettings）— 来自外部 crate 的六个设置子结构，字段见下文。

**键盘**

- `keybinds`（BTreeMap\<String, Binding>）— 覆盖默认值绑定的键位表。
- `keymap`（KeymapPreset）— 键位预设（注释未提取）。
- `keymap_prefix`（String）— tmux preset 的 prefix 键。
- `swap_ctrl_cmd`（bool）— macOS。
- `option_as_alt`（OptionKey）— macOS。
- `terminal_ime`（bool）— IME 在终端 pane 中组字。
- `editor_ime`（bool）— 同上，作用于文件块的编辑器。
- `global_hotkey`（String）— macOS 与 Windows。

**其他**

- `auto_secure_input`（bool）— macOS。
- `secure_keyboard_entry`（bool）— macOS。
- `secure_input_indication`（bool）— 注释未提取。
- `clawdi`（bool）— 桌面宠物，默认关。

## 子结构字段

以下清单逐字照录 raw 4 子结构一节，字段不增不减。

- **CursorSettings**：`shape`（Option\<CaretShape>）、`programs`、`blink`、`smooth_blink`、`glide`（u16，毫秒）、`trail`、`pulse`、`terminals`、`composer`、`editors`
- **PasteSettings**：`quote_urls_at_prompt`、`confirm`、`confirm_if_large`、`replace_dangerous_control_codes`、`replace_newline`
- **FileTreeSettings**：`open`、`width`、`hidden`、`ignored`、`search_ignored`、`compact`、`reveal`、`preview_click`
- **FileSettings**：`markdown_rendered`、`wrap_code`、`wrap_prose`、`line_numbers`、`tab_width`、`auto_save`、`attachments`
- **AgentSettings**：`auto_acp`（终端输入 agent CLI 时以 ACP 打开）、`keep_tui`、`custom`（CustomAgent{id,name,command,args,env}）、`mcp`（McpServer{name,enabled,agents,transport}，支持 stdio/http/sse，`${VAR}` 读环境变量）、`show_claude_thinking`、`own_tools`
- **CarlySettings**：`model`、`heartbeat`（分钟，0 关闭）、`voice`、`voice_on_open`
- **NotebookSettings**：`python`、`start_on_open`、`stop_on_error`、`ask_restart`、`autosave_secs`（默认 120，0 关闭）、`record_timing`、`line_numbers`、`wrap_code`、`complete_while_typing`、`scroll_outputs_lines`（默认 100）、`figure_format`、`interactive_html`
- **CloudSettings**：`provider`、`self_hosted`（SelfHosted{domain,api_url,sandbox_url,template}）、`size`、`pause_after_min`、`send_sign_ins`、`github`、`include`、`rebuild_after_days`
- **GitSettings**（共 37 字段）：`auto_fetch_minutes`、`auto_prune`、`default_branch_name`、`pull_mode`、`initial_commits`、`lazy_load_commits`、`profiles`、`profile`、`use_local_ssh_agent`、`ssh_private_key`、`ssh_public_key`、`external_editor`、`gpg_program`、`gpg_key_id`、`sign_commits_by_default`、`sign_tags_by_default`、`notify_operation_success`、`notify_operation_failure`、`use_git_executable`、`git_executable`、`show_commit_author`、`show_commit_date`、`show_commit_sha`、`encoding`、`gitflow`、`sidebar_folded`、`ref_column_width`、`graph_column_width`、`message_column_width`、`inspector_width`、`diff_split`、`diff_file_view`、`diff_hunk_view`、`diff_wrap`、`diff_whitespace`、`path_tree`、`ai_model`
- **SqliteSettings**（raw 标注约 60 字段，按原分组照录）：General（`location`、`location_dir`、`last_dir`、`max_recent`、`recent`、`recent_ro_keys`、`file_types`、`reopen_on_restore`、`ask_sql_tabs`）；Database（`encoding`、`foreign_keys`、`hide_line_breaks`、`prefetch`、`rows_limit`、`default_field_type`、`structure_font`、`watch_read_only`、`startup_sql`、`dont_ask_collation`）；Data browser（`browse_font`、`browse_font_size`、`symbol_limit`、`complete_threshold`、`image_preview`、`cell_word_wrap`、`filter_delay_ms`、`filter_escape`、`null_text`、`blob_text`、`null_colors`、`blob_colors`、`regular_colors`、`formatted_colors`、`indent_compact`、`sort_keys`、`auto_switch_mode`、`editor_word_wrap`、`drop`{select_query,insert,qualified,quoted}）；SQL（`editor_font`、`editor_font_size`、`results_font_size`、`tab_size`、`indent_tabs`、`wrap`、`quotes`、`completion`、`keyword_case`、`error_indicators`、`horizontal_tiling`、`close_buttons`、`editor_split`、`results_split`）；Extensions（`extensions`、`disable_regex`、`load_extension`）；Plot（`plot_line_type`、`plot_point_shape`）；Dialogs（`dialog_memory` 一族 csv_*/export_*/json_pretty/sql_* 字段）
- **Parts**（prompt 组成）：`palette`、`fill`、`shape`、`frame`、`line_end`、`gap`、`char`、`separator`、`git`、`dir`、`icons`、`spaced`、`clock`、`layout`、`collapse`

## Layout 枚举

官方描述逐字如下：

> How much chrome frames the terminals, switched at runtime (palette, …). Every layout is terminal-first (the window is the terminal, a tab bar above it) and shows the same tabs and panes.
>
> - Rail — Arc: two-line tabs down the left edge on the glass, no top bar.
> - Float — Zen: the terminal fills the window; a glass pill holds the tabs and fades while you type.
> - Tiles — Tiling: every pane its own card on the glass: the default.
> - Studio — Studio: tabs as pills inside a 38px titlebar, every pane headed (title, split buttons), the whole window one tinted surface.

`Tiles` 带 `#[default]` 标记，即默认布局。tab 图标差异的官方描述：Whether its tab bar shows each tab's Deck icon: Rail and Studio do, Float and Tiles name tabs in text alone——Rail 与 Studio 的标签栏显示每个标签的 Deck 图标，Float 与 Tiles 纯用文字命名标签。

体验取舍的定性解读（推断，raw 无对应原文）：四种布局共享同一份终端优先的窗格结构，差异只在 chrome 的多少与形态；图标版（Rail、Studio）用 38px 标题栏或左侧栏换取更强的多标签导航感，文字版（Float、Tiles）把标签压到玻璃药丸或卡片上，终端可视面积更大。默认落在 Tiles，兼顾分屏可见性与最小 chrome。

## 渲染组

三个常问字段的官方注释逐字如下：

> - `msaa`: "Multisample anti-aliasing: shapes shaded per sample."
> - `sync_to_display`: "Frames present on the display's refresh (vsync), the default; off presents at once (may tear)."
> - `frames_queued`: "Frames the GPU may queue ahead of the display (1..MAX_FRAMES_QUEUED)."

行为解释：`msaa` 控制形状按采样点着色（多重采样抗锯齿）；`sync_to_display` 开启时帧按显示器刷新节拍呈现（vsync，默认），关闭则立即呈现、可能撕裂；`frames_queued` 限制 GPU 可提前排队的帧数，取值范围 1..MAX_FRAMES_QUEUED，其中 `MAX_FRAMES_QUEUED` 的数值本次未提取。同组另有 `antialias`（形状边缘抗锯齿）、`snap_text`（字形对齐整个设备像素）与 `renderer`（绘制窗口的后端，下次启动生效）。

## 键盘与其他

键盘组的跨字段观察：平台注释把 `swap_ctrl_cmd`、`option_as_alt` 限定在 macOS，`global_hotkey` 覆盖 macOS 与 Windows；`keymap_prefix` 的注释写明它服务于 tmux preset，换用其他 `keymap` 预设时该键无对应语义。`keybinds` 是覆盖默认绑定的键位表，`terminal_ime` 与 `editor_ime` 分别控制终端 pane 与文件块编辑器内的 IME 组字。

secure 系列里 `auto_secure_input` 与 `secure_keyboard_entry` 标注 macOS，`secure_input_indication` 未附注释。`clawdi` 是桌面宠物，默认关闭。

## See Also

- [Tern 设置存储位置](settings-storage.md)
- [Tern 对象模型](object-model.md)
