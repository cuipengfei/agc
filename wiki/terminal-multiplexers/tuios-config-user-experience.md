# TUIOS 配置与用户体验

> Sources: 本机 TUIOS 0.12.0 配置与选项元数据, 2026-10-31; AGC 同步与验收记录, 2026-10-31
> Raw: [list-options 完整输出](../../raw/terminal-multiplexers/2026-10-31-tuios-0.12.0-list-options-full-json.md); [配置 prune 与 0.12.0 快照](../../raw/terminal-multiplexers/2026-10-31-tuios-config-prune-and-0.12.0-snapshot.md); [TUIOS 0.12.0 配置 schema 与持久化](../../raw/terminal-multiplexers/2026-10-31-tuios-0.12.0-config-schema-and-persistence.md); [本机配置快照（0.10.0）](../../raw/terminal-multiplexers/2026-10-17-tuios-local-config-snapshot.md); [0.10.0 选项元数据](../../raw/terminal-multiplexers/2026-10-17-tuios-0.10.0-option-metadata.md); [AGC 配置纳管记录](../../raw/terminal-multiplexers/2026-10-17-agc-tuios-config-tracking.md)
> Updated: 2026-10-31

## Overview

`tuios` 与 `tuios-web` 共用 `/home/cpf/.config/tuios/config.toml`。TUIOS 0.12.0 没有发布独立 `.schema.json`，配置约束由三套机制组成。当前配置已通过 `tuios config prune` 精简，文件从 644 行降至 153 行。

逐项的路径、允许值、默认值与当前值见 [TUIOS 配置项全表（0.12.0）](tuios-config-reference.md)，本文只讲机制、生效时机与本机取舍，不再重复这些数字。

## 配置目录与优先级

| 位置 | 作用 | 优先级 |
|---|---|---|
| `$XDG_CONFIG_HOME/tuios/config.toml` | 主配置 | 最高 |
| `config.d/*.toml` | 按文件名顺序合并的分片 | 低于主配置 |
| `include = [...]` 指向的文件 | 附加配置 | 最低 |
| `themes/*.json`、`glyphs/*.json` | 自定义主题与字符集 | 独立资源 |

`tuios config path` 输出主配置路径，`tuios config files` 按优先级列出实际参与合并的文件。本机当前只有主配置一个文件，没有 `config.d` 目录，也没有 `include` 列表。

## 三套校验机制

- **选项注册表**：`internal/config/options.go` 的 `optionSpecs`，本机 `0.12.0` 为 22 个分组、271 个可设置路径。`tuios list-options --json` 输出 `{"message": ..., "options": [...]}`，每项含 `path`、`type`、`section`、`default`、可选 `accepted`、可选 `min`/`max`、`description`。`tuios set-config` 与 `tuios config browse` 按此注册表严格校验未知路径、非法枚举、越界整数与无效颜色。
- **快捷键注册表**：快捷键是动态动作映射，不在标量路径清单里，通过 `tuios keybinds list` 查询、`tuios keybinds doctor` 检查冲突与被拒绝的绑定。
- **手改容错**：`config.toml` 由 go-toml/v2 反序列化到 `UserConfig`。未知键忽略；越界数值截断到合法范围；非法枚举与颜色回退默认值；当前平台无法解析的按键由 `DropUnreadableKeys` 剔除并记入 `LoadWarnings`。`ValidateConfig` 生成的告警在 TUI 内展示。整份文件语法错误时保留正在使用的设置，并在屏幕上显示错误。

## Web 模式下的配置持久化

`tuios-web` 连接的客户端类型是 `ClientBrowser`，`internal/app/client_kind.go` 给它强制 `ConfigReadOnly = true`。当会话只有浏览器客户端连接时，设置面板（`Ctrl+b ,`）与 `tuios set-config` 都不写盘：`set-config` 把写盘动作路由给客户端 `persistSettings()`，浏览器客户端跳过写文件。原因是配置文件属于服务器操作者，多个客户端各自持有过期快照。

在纯 Web 模式下能持久化的三条途径：

| 途径 | 操作 | 机制 |
|---|---|---|
| `tuios config edit` | 在任意窗格运行，用 `$EDITOR` 打开主配置 | 直接写入磁盘 |
| `tuios keybinds preset` / `unbind` / `free` | 在任意窗格运行 | 进程内直接调用 `config.SaveUserConfig()`，不经过客户端路由 |
| 让窗格内的 agent 编辑配置 | 在 agent 对话中要求修改 | agent 直接写文件 |

`ClientBrowser` 同样启用 `startConfigWatch()` 文件监听，保存后当前会话会重新读取配置。浏览器端自己的渲染参数（传输方式、渲染器、字号）保存在 `localStorage["sip-web-settings"]`，不写回宿主的 `config.toml`。

## 生效时机

| 设置类型 | 生效时机 |
|---|---|
| 外观、侧栏、Dock、快捷键 | 保存即热重载当前会话 |
| 新窗口与新会话初值（`[startup]`、历史容量、`preferred_shell`） | 对后续新建的窗口或会话生效 |
| 放宽权限、新增主机或通知目标（`[agents.permissions]`、`[hosts]`、`[notify]`） | 需在 TUIOS 外的终端运行 `tuios config apply`（窗格内会被拒绝）或重启 daemon；收紧权限的改动由 daemon 立即应用 |
| `[daemon]` 持久历史与 daemon 级 `[hooks]` | 需重启 daemon |

`tuios config apply --help` 说明了这条分界的依据：daemon 只即时应用减少权限的改动，增加权限的改动必须显式申请，避免窗格内的进程通过写配置文件给自己扩权。

## 配置清理

`tuios config prune --yes` 移除与当前默认值相同的冗余键。本机执行后移除 431 个键，并清理已废弃的 `appearance.sidebar.workspaces`，文件从 644 行降至 153 行。保留这些冗余键会让以后升级的新默认值被旧文件遮蔽。

`tuios keybinds doctor` 检查按键冲突与被拒绝的绑定。本机曾报出 `inbox_deny_reason "n"` 已被 `0.12.0` 重新分配（`n` 改为新建 agent，该动作迁移到 `R`），清理后冲突计数为零。

## 快捷键结构

当前主前缀是 `ctrl+b`。快捷键按 window management、workspaces、layout、mode control、prefix mode、terminal mode、sidebar、inbox、mail、debug 与 Tape 等作用域分组。

值是字符串数组，一个动作可以绑定多个键：

```toml
[keybindings.system]
toggle_spotlight = ['b']

[keybindings.terminal_mode]
terminal_paste_host = ['ctrl+shift+v', 'super+v', 'shift+super+v']
```

空数组 `[]` 表示取消绑定；缺少配置行会在下次启动时恢复默认值。本机只覆盖了这两个动作，`[keybindings.navigation]` 是空表，没有额外导航覆盖。

## 本机当前配置的取舍

2026-10-31 共有 6 项调整，每项都对应一个具体场景：

| 设置 | 改为 | 理由 | 代价 |
|---|---|---|---|
| `appearance.click_to_type` | `single` | 从侧栏点击窗格后直接打字，省掉双击 | 误点窗格会立刻进入输入模式 |
| `appearance.auto_enter_terminal_on_focus` | `targeted` | 编号选择与方向键切换后自动进入输入 | 用 Tab 在控件间移动时不会自动进入；需要该行为可改为 `all` |
| `appearance.sidebar.width` | `28` | 容纳 agent 工具名与路径 | 比默认多占 4 列；超过 30 列会让 agent 窗格在两个区块重复出现 |
| `notifications.agent.notify` | `false` | 与 Herdr 的习惯一致，只用应用内提示；浏览器连接下也只能记录日志 | 窗口不在前台时可能错过 agent 完成 |
| `daemon.resume_agents` | `auto` | daemon 重启后直接接回 agent 对话 | 重启后不再询问，恢复命令会直接执行 |
| `daemon.window_size` | `latest` | 手机或浏览器短暂连入不会把桌面画面压小 | 切换操作设备会改变布局 |

其余保留现状的取向：

- 左侧栏与顶部状态栏持续提供信息，也持续占用终端空间。
- 新会话不自动创建终端，需要从空工作区手动开始。
- 焦点终端可以直接写系统剪贴板，操作方便，同时要求信任正在运行的程序。
- 界面动画全部开启，视觉反馈完整；追求立即变化时可改为 `basic` 或 `none`。
- 主题为 `tokyonight_storm`，会话边框携带会话颜色，便于跨会话并排时分清归属。

## AGC 版本化备份

AGC 的 `manifest.json` 已加入 `tuios-config`，把来源配置同步到 `tuios/config.toml`，并标记为 protected。单项策略检查显示 `tuios_redaction_slots=0`，仓库副本与来源 SHA-256 相同。

完整同步测试共运行 `19` 项并全部通过。当前条目在 `./sync.py status` 中显示 unchanged。配置文件仍是普通文件，没有新增 symlink。2026-10-31 的配置精简与 6 项调整已提交并推送为 `1495db0`。

## 证据边界

- 当前值来自本机 `0.12.0` 完整配置快照（153 行，含上游生成的注释头）。
- 合法范围与 schema 机制来自本机 `tuios list-options` 与上游源码（`internal/config/options.go`、`validation.go`、`userconfig.go`、`internal/app/client_kind.go`）。
- 生效时机来自 `tuios config apply --help` 与上游测试（`set_config_write_test.go`、`config_watch_test.go`）。
- 本文解释配置行为，没有逐项修改后做视觉对比实验。

## See Also

- [TUIOS 配置项全表（0.12.0）](tuios-config-reference.md)
- [TUIOS Tape 自动化与项目 tape 信任边界](tuios-tapes.md)
- [TUIOS Web 与安装升级](tuios-web-and-updates.md)
- [tuios workspace 与 session rail](tuios-workspace-and-sidebar.md)
- [浏览器终端链路的剪贴板路径](browser-terminal-clipboard-paths.md)
- [终端图像协议支持矩阵](../terminal-graphics/terminal-image-protocol-matrix.md)
