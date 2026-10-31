# TUIOS 配置与用户体验

> Sources: 本机 TUIOS 0.12.0 配置与选项元数据, 2026-10-31; AGC 同步与验收记录, 2026-10-31; 后续会话核对, 2026-11-01
> Raw: [list-options 完整输出](../../raw/terminal-multiplexers/2026-10-31-tuios-0.12.0-list-options-full-json.md); [配置 prune 与 0.12.0 快照](../../raw/terminal-multiplexers/2026-10-31-tuios-config-prune-and-0.12.0-snapshot.md); [TUIOS 0.12.0 配置 schema 与持久化](../../raw/terminal-multiplexers/2026-10-31-tuios-0.12.0-config-schema-and-persistence.md); [本机配置快照（0.10.0）](../../raw/terminal-multiplexers/2026-10-17-tuios-local-config-snapshot.md); [0.10.0 选项元数据](../../raw/terminal-multiplexers/2026-10-17-tuios-0.10.0-option-metadata.md); [AGC 配置纳管记录](../../raw/terminal-multiplexers/2026-10-17-agc-tuios-config-tracking.md); [交互配置与标题目录显示](../../raw/terminal-multiplexers/2026-10-31-tuios-interaction-settings-and-title.md); [后续来源记录](../../raw/terminal-multiplexers/2026-11-01-tuios-disable-mouse-focus.md)
> Updated: 2026-11-01

## Overview

`tuios` 与 `tuios-web` 共用 `/home/cpf/.config/tuios/config.toml`。配置约束由选项注册表、快捷键注册表与 TOML 加载诊断组成。prune 后的历史快照为 153 行，后续交互调整继续加入来源文件。

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

本次累计调整 24 个键。前 23 个已进入仓库，标题格式最新一项仅在来源。逐项默认值、当前值与允许值见[配置参考表](tuios-config-reference.md)。用户用 👍 确认的项目表示批准应用；没有选择的建议保持原值。

### 输入、焦点与项目辨认

- 单击窗格内容进入输入，编号选择与方向切换也自动进入输入，减少切换后的额外按键。这两条分别管理鼠标点击和键盘焦点命令。
- 用户实际使用后选择关闭鼠标焦点跟随，来源 focus_follows_mouse=false，关联 Ctrl 暂停配置已移除。鼠标移动不再切换 pane，单击输入、键盘目标切换和非焦点压暗保留。此调整只写来源，未同步仓库。
- 标题显示原名称和工作目录，便于区分同一种 Agent 的不同项目窗口。长目录可能使标题截断。
- 普通右键在终端模式无选区且程序没有启用 mouse tracking 时打开 pane menu，Paste 项粘贴到当前 pane。有选区时打开 Selection 菜单；程序启用 mouse tracking 时，普通右键转发给程序。

### 侧栏与 Agent

- 加宽左侧栏，增加 agents 区块比例，减少 files 区块比例，便于查看多个 Agent；代价是终端内容区域和文件列表空间减少。
- 区块之间增加空行，会话前显示编号，便于辨认区块和会话。编号表示会话编号，不直接等同 workspace 快捷键。
- 关闭主 Agent 自动折叠，空闲行继续单独显示。此项只控制折叠，不保证按进程存活保留行。
- 限制单个 Agent 的 subagent 行数，上限包含 `+N more` 行；结束后延迟隐藏 subagent。主 Agent 不折叠与已结束 subagent 隐藏可同时成立。完整子任务信息需要进入 Agents View 查看。

### 提醒与恢复

- 关闭桌面通知，保留内部提醒并使用终端铃；增加 idle 提醒，便于知道 Agent 已安静下来。idle 不等同需要输入，提醒仍受延迟、焦点抑制和声音冷却规则控制。
- 自动恢复 Agent 对话，减少后台重启后的逐个确认；恢复命令会直接执行。
- 多客户端画面跟随最近输入的一方，手机连接后回到桌面操作即可重新采用桌面尺寸；操作设备变化会改变布局。

### 启动与导航

- 空会话启动时自动开终端，已有窗格时直接进入输入模式，减少启动后的操作。
- 切到空 workspace 自动开窗，并继承离开时所在窗格的目录；空工作区不再保持空白。
- 打开窗格导航器直接进入搜索，多个窗格之间查找少一步。
- 主题与会话边框颜色保留。动画保持 full；未应用 scrollbar.style=thin、states.working=true、tape.auto_review=true 或 prefix_repeat_time=1000。

## AGC 版本化备份

AGC 的 manifest.json 管理 tuios-config 来源到仓库的同步，并标记 protected。纳管时记录的脱敏和 SHA-256 检查属于历史结果；最新标题格式及关闭鼠标跟随仅修改来源，没有执行同步。

第一批 6 项提交为 1495db0；后续 12 项与五个获赞项目共 17 项提交为 9b6025e。之后来源新增标题格式、关闭鼠标跟随并移除暂停键，仓库仍保留此前快照。同步测试 19 项通过是历史记录，本次只验证文档。

## 证据边界

- 当前鼠标设置以关闭鼠标焦点 raw 的来源摘录为准；其他选择见交互配置 raw。153 行是 prune 后历史快照。
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
