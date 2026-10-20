# Tern 设置 Schema：二进制内嵌结构体源码摘录

> Source: 本机 tern 0.9.4 (b9ef74c) 二进制（/home/cpf/.local/bin/tern，`tern --version` 实测）内嵌的 Rust 结构体源码字符串
> Collected: 2026-10-20
> Published: Unknown

## 提取方法

`strings -n 4` 导出二进制全部字符串后发现：二进制内嵌了 `Settings` 及相关设置结构体的完整 Rust 源码（含每个字段的 doc 注释），位于字符串表第 879000–884300 行区。以下为逐字摘录（保留原始注释文字，含个别被字符串表截断处）。

另：设置存储机制见既有结论——原生设置写入配置目录 `settings.json`（Linux 默认 `~/.config/tern`，`TERN_CONFIG_DIR` 可改），文件只保存与默认值有差异的项；Web 端设置在浏览器 localStorage，按 origin 隔离。本机 2026-10-20 时 `~/.config/tern/` 下无 `settings.json`，即全部默认。

## Settings 顶层字段（逐字，注释即官方说明）

```rust
/// Everything Tern remembers between launches.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
	pub theme:                   ThemePref,   // Appearance: follow the system, or always light or dark
	pub theme_dark:              Option<String>,   // dark 外观的 omp theme；None 跟随 omp theme.dark
	pub theme_light:             Option<String>,   // light 外观的 omp theme
	pub copy_on_select:          bool,        // Finishing a selection copies it
	pub smooth_scroll:           bool,        // Eased mouse-wheel steps
	pub overscroll:              bool,        // Scrolling rubber-bands past the ends
	pub three_finger_swipes:     bool,        // 三指手势开 tab peek / Mission Control / 切 tab / dismiss banners
	pub scroll_speed:            u16,         // 滚动速度，系统速度的百分比
	pub cursor:                  CursorSettings,
	pub pointer_shape:           PointerShape,
	pub reduce_motion:           ReduceMotion,
	pub link_click:              LinkClick,   // Which click opens a link
	pub link_target:             LinkTarget,  // Where web links open
	pub clipboard_write:         Permission,  // Programs writing the clipboard (OSC 52, OSC 5522)
	pub hyperlinks:              Permission,  // Programs' OSC 8 hyperlinks
	pub notifications:           bool,        // Programs' desktop notifications (OSC 9, 99, 777)
	pub notification_filters:    Vec<String>, // kitty's filter_notification rules
	pub paste:                   PasteSettings,
	pub confirm_close:           ConfirmClose,
	pub contrast:                Contrast,    // When low-contrast text colors are corrected
	pub layout:                  Layout,      // Window chrome
	pub font_size:               u16,         // The terminal's font size (px)
	pub ui_font_size:            Option<u16>, // 界面字号；None 跟随 font_size
	pub font_family:             String,      // The grid's font families as typed
	pub font_family_bold:        String,
	pub font_family_italic:      String,
	pub font_family_bold_italic: String,
	pub font_weight:             u16,         // The grid's text weight
	pub adjust_cell_height:      CellAdjust,  // Added to the grid's row height
	pub ui_font:                 String,      // 界面字体；empty uses the built-in face
	pub code_font:               String,      // monospace text outside the grid
	pub agent_command:           String,      // What an agent block runs, through the login shell (`omp`)
	pub tabs:                    TabOrientation,     // Where the tab list sits
	pub tabs_autohide:           bool,        // 竖排标签列自动隐藏
	pub system_title_bar:        bool,        // Linux/Windows: system draws title bar
	pub system_traffic_lights:   bool,        // macOS
	pub pane_headers:            PaneHeaders, // When panes wear their headers
	pub status_bar:              bool,        // pane 下方状态行：directory/branch/last run/scrollback/size
	pub tmux_status:             bool,        // tmux status line drawn as Tern's own
	pub material:                Material,    // Glass, clear or solid surfaces
	pub opacity:                 u8,          // 0..100%，Ghostty's background-opacity
	pub blur:                    u8,          // The blur radius behind Material::Clear
	pub density:                 Density,     // Pane cards or flush panes
	pub native_surfaces:         bool,        // TSP 程序画原生界面；off 则 Tern 不应答 hello
	pub command_lenses:          bool,        // Recognized commands (git, ls, cargo, docker) show native blocks
	pub plugins:                 bool,        // Plugins under <config>/plugins load on this machine
	pub plugins_disabled:        Vec<String>, // Plugin ids that stay unloaded
	pub native_completion:       bool,        // shell Tab 补全显示为原生 popover
	pub native_editing:          bool,        // Program composers edit like text fields
	pub program_colors:          bool,        // Surfaces use the palette the program sends
	pub surface_headings:        Option<Headings>,
	pub surface_diffs:           DiffLayout,  // Edits on surfaces: inline or split
	pub surface_tab_width:       u8,
	pub surface_fold:            bool,        // 工具调用与思考的折叠
	pub expand_thoughts:         bool,        // omp's thoughts stay open
	pub composer_text:           ComposerText,
	pub surface_chat:            Chat,        // Reader, Spine or Console
	pub shell:                   String,      // 本地块运行的登录 shell；empty 用内置
	pub scrollback_lines:        usize,       // Lines of scrollback each terminal pane keeps
	pub native_prompt:           bool,        // Shells draw their prompt as a native bar
	pub prompt_style:            PromptStyle,
	pub prompt_parts:            Parts,
	pub new_tabs:                TabDir,      // Where new tabs start
	pub start_folder:            String,      // 无目录可继承时的启动目录
	pub new_blocks:              BlockKind,   // What new tabs and splits run
	pub agent_placement:         AgentPlacement, // Where New agent block opens the agent
	pub cross_session_click:     CrossSessionClick,
	pub share_sessions:          bool,        // 允许本机 session 被 serve 到其他机器和浏览器
	pub reconnect_hosts:         bool,        // Reconnect to the remote hosts the last window used
	pub auto_update:             bool,
	pub ask_to_move:             bool,        // macOS
	pub desktop_integration:     bool,        // macOS and Linux
	pub prefs_width:             u16,
	pub park_pile:               f32,         // Where the parked panes' pile rests on the stage's bottom edge
	pub park_pile_size:          f32,
	pub antialias:               bool,        // Shape edges are anti-aliased
	pub snap_text:               bool,        // Every glyph lands on a whole device pixel
	pub msaa:                    Msaa,        // Multisample anti-aliasing: shapes shaded per sample
	pub sync_to_display:         bool,        // Frames present on the display's refresh (vsync), the default; off presents at once (may tear)
	pub frames_queued:           u8,          // Frames the GPU may queue ahead of the display (1..MAX_FRAMES_QUEUED)
	pub renderer:                Renderer,    // What draws the windows, from the next start
	pub files:                   FileSettings,
	pub file_tree:               FileTreeSettings,
	pub git:                     stencil_git::settings::GitSettings,
	pub cloud:                   cloud::CloudSettings,  // 桌面 only（非 wasm32/iOS/Android）
	pub sqlite:                  sqlite::SqliteSettings,
	pub notebook:                notebook::NotebookSettings,
	pub carly:                   carly::CarlySettings,
	pub agents:                  agents::AgentSettings,
	pub keybinds:                BTreeMap<String, Binding>, // Keys bound over the defaults
	pub keymap:                  KeymapPreset,
	pub keymap_prefix:           String,      // tmux preset 的 prefix 键
	pub swap_ctrl_cmd:           bool,        // macOS
	pub option_as_alt:           OptionKey,   // macOS
	pub terminal_ime:            bool,        // IME composes in terminal panes
	pub editor_ime:              bool,        // The same for file blocks' editors
	pub global_hotkey:           String,      // macOS and Windows
	pub auto_secure_input:       bool,        // macOS
	pub secure_keyboard_entry:   bool,        // macOS
	pub secure_input_indication: bool,
	pub clawdi:                  bool,        // 桌面宠物，Off by default
}
```

（字段注释经压缩为行内形式；语义与原文一致，个别长注释省略号截断。）

## Layout 枚举（逐字）

```rust
/// How much chrome frames the terminals, switched at runtime (palette, …).
/// Every layout is terminal-first (the window is the terminal, a
/// tab bar above it) and shows the same tabs and panes.
pub enum Layout {
	/// Arc: two-line tabs down the left edge on the glass, no top bar.
	Rail,        // #[op("rail")]
	/// Zen: the terminal fills the window; a glass pill holds the tabs and
	/// fades while you type.
	Float,       // #[op("float")]
	/// Tiling: every pane its own card on the glass: the default.
	Tiles,       // #[default] #[op("tiles")]
	/// Studio: tabs as pills inside a 38px titlebar, every pane
	/// headed (title, split buttons), the whole window one tinted surface.
	Studio,      // #[op("studio")]
}
/// Whether its tab bar shows each tab's Deck icon: Rail and Studio do,
/// Float and Tiles name tabs in text alone
```

## 渲染组三个常问字段的注释（逐字）

- `msaa`: "Multisample anti-aliasing: shapes shaded per sample."
- `sync_to_display`: "Frames present on the display's refresh (vsync), the default; off presents at once (may tear)."
- `frames_queued`: "Frames the GPU may queue ahead of the display (1..MAX_FRAMES_QUEUED)."（`MAX_FRAMES_QUEUED` 的数值本次未提取）

## 子结构字段清单（字段名逐字，注释压缩）

- **CursorSettings**：`shape`（Option<CaretShape>）、`programs`、`blink`、`smooth_blink`、`glide`（u16 ms）、`trail`、`pulse`、`terminals`、`composer`、`editors`
- **PasteSettings**：`quote_urls_at_prompt`、`confirm`、`confirm_if_large`、`replace_dangerous_control_codes`、`replace_newline`
- **FileTreeSettings**：`open`、`width`、`hidden`、`ignored`、`search_ignored`、`compact`、`reveal`、`preview_click`
- **FileSettings**：`markdown_rendered`、`wrap_code`、`wrap_prose`、`line_numbers`、`tab_width`、`auto_save`、`attachments`
- **AgentSettings**：`auto_acp`（终端输入 agent CLI 时以 ACP 打开）、`keep_tui`、`custom`（CustomAgent{id,name,command,args,env}）、`mcp`（McpServer{name,enabled,agents,transport}，支持 stdio/http/sse，`${VAR}` 读环境变量）、`show_claude_thinking`、`own_tools`
- **CarlySettings**：`model`、`heartbeat`（分钟，0 关闭）、`voice`、`voice_on_open`
- **NotebookSettings**：`python`、`start_on_open`、`stop_on_error`、`ask_restart`、`autosave_secs`（默认 120，0 关闭）、`record_timing`、`line_numbers`、`wrap_code`、`complete_while_typing`、`scroll_outputs_lines`（默认 100）、`figure_format`、`interactive_html`
- **CloudSettings**：`provider`、`self_hosted`（SelfHosted{domain,api_url,sandbox_url,template}）、`size`、`pause_after_min`、`send_sign_ins`、`github`、`include`、`rebuild_after_days`
- **GitSettings**（37 字段）：`auto_fetch_minutes`、`auto_prune`、`default_branch_name`、`pull_mode`、`initial_commits`、`lazy_load_commits`、`profiles`、`profile`、`use_local_ssh_agent`、`ssh_private_key`、`ssh_public_key`、`external_editor`、`gpg_program`、`gpg_key_id`、`sign_commits_by_default`、`sign_tags_by_default`、`notify_operation_success`、`notify_operation_failure`、`use_git_executable`、`git_executable`、`show_commit_author`、`show_commit_date`、`show_commit_sha`、`encoding`、`gitflow`、`sidebar_folded`、`ref_column_width`、`graph_column_width`、`message_column_width`、`inspector_width`、`diff_split`、`diff_file_view`、`diff_hunk_view`、`diff_wrap`、`diff_whitespace`、`path_tree`、`ai_model`
- **SqliteSettings**（约 60 字段，分组）：General（`location`、`location_dir`、`last_dir`、`max_recent`、`recent`、`recent_ro_keys`、`file_types`、`reopen_on_restore`、`ask_sql_tabs`）；Database（`encoding`、`foreign_keys`、`hide_line_breaks`、`prefetch`、`rows_limit`、`default_field_type`、`structure_font`、`watch_read_only`、`startup_sql`、`dont_ask_collation`）；Data browser（`browse_font`、`browse_font_size`、`symbol_limit`、`complete_threshold`、`image_preview`、`cell_word_wrap`、`filter_delay_ms`、`filter_escape`、`null_text`、`blob_text`、`null_colors`、`blob_colors`、`regular_colors`、`formatted_colors`、`indent_compact`、`sort_keys`、`auto_switch_mode`、`editor_word_wrap`、`drop`{select_query,insert,qualified,quoted}）；SQL（`editor_font`、`editor_font_size`、`results_font_size`、`tab_size`、`indent_tabs`、`wrap`、`quotes`、`completion`、`keyword_case`、`error_indicators`、`horizontal_tiling`、`close_buttons`、`editor_split`、`results_split`）；Extensions（`extensions`、`disable_regex`、`load_extension`）；Plot（`plot_line_type`、`plot_point_shape`）；Dialogs（`dialog_memory` 一族 csv_*/export_*/json_pretty/sql_* 字段）
- **Parts**（prompt 组成）：`palette`、`fill`、`shape`、`frame`、`line_end`、`gap`、`char`、`separator`、`git`、`dir`、`icons`、`spaced`、`clock`、`layout`、`collapse`

## 内置说明文本中的设置相关散句（逐字）

- "Scrolling (`overscroll` in settings.json, on by default)"
- "Scrolling, `scrollback_lines` in settings.json, 200,000 lines by default) for how many lines each pane keeps; a change applies to running panes at once"
- "The settings changed from their defaults, as JSON. Reload applies edits made by hand."（设置页对 settings.json 的说明）
- "Root keys match settings.json; terminal.font_size also aliases font_size. nil clears options."
- "Added `notification_filters` in settings.json to drop matching program notifications"（changelog）
- "`settings.json` keeps only the settings you changed, so improved defaults reach you"（changelog）
- Settings 页面清单（changelog）："Added Settings pages for appearance, keyboard, prompt and hosts, with live Reload settings from settings.json"

## 附：本机进程拓扑实测（2026-10-20）

验证方法：`ps -o pid,ppid,tty,cmd` + `pstree -ps <pid>`。

```text
systemd(1)---python3(1180314)---tern(1180316)---zsh(1180349)---omp(1530955)
```

即当前 omp 会话（pts/42）由 tern daemon（`tern daemon --socket /run/user/1000/tern/daemon.sock`）拉起的 shell 运行。同机另一 omp（pid 1312107，pts/6）父进程为普通 zsh（2057），不在 tern 之下。同时运行：`tern web serve --listen 127.0.0.1:8378 --token /home/cpf/.config/tern/web-token --assets /home/cpf/.local/share/tern-web-0.9.4`。

二进制与资产版本：`tern --version` 输出 `tern 0.9.4 (b9ef74c)`；web 资产目录 `tern-web-0.9.4`。
