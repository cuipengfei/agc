# TUIOS Tape 自动化与项目 tape 信任边界

> Sources: Gaurav-Gosain/tuios `docs/PROJECT_TAPES.md`, 2026-10-31; 本机 tuios 0.12.0 `tape --help`, 2026-10-31
> Raw: [项目 tape 文档与 CLI 帮助](../../raw/terminal-multiplexers/2026-10-31-tuios-project-tapes.md)
> Updated: 2026-10-31

Tape 是 TUIOS 的自动化脚本格式，文件扩展名 `.tape`，逐行写命令、按键与延迟。按用途分两类，两者的文件位置、触发方式与信任规则都不同。

## 两类 tape

| 类型 | 文件位置 | 触发方式 | 管理入口 |
|---|---|---|---|
| 录制式 tape | tape 录制目录，名字自定 | 手动播放 | `Ctrl+B` `T` `r` 录制；`tuios tape list / show / play / exec / delete / validate` |
| 项目 tape | 项目目录下固定文件名 `.tuios.tape` | 焦点 shell 进入该目录时检测 | `Ctrl+B` `T` `t` 或命令面板打开审查对话框 |

录制式 tape 的七个子命令分工：

| 子命令 | 作用 |
|---|---|
| `play <file.tape>` | 在可见 TUI 中播放，可以看着自动化一步步发生 |
| `exec <file.tape>` | 在运行中的会话内执行 |
| `validate <file.tape>` | 只校验语法，不运行 |
| `list` | 列出已保存的 tape 录制 |
| `show <name>` | 显示某个 tape 的内容 |
| `delete <name>` | 删除一个 tape 录制 |
| `dir` | 显示 tape 录制目录路径 |

## 项目 tape 的信任模型

项目 tape 的内容等同任意命令执行（`Type "curl x | sh" Enter` 是合法 tape），因此功能围绕一条信任边界建立：未信任的 tape 完全静止。TUIOS 只读取一次、计算哈希、把内容显示给你，在你审查并选择运行或信任之前不会执行任何东西。

信任按（真实路径，内容哈希）两个要素授予：

- 路径是 tape 的 `realpath`，哈希是对文件字节计算的 SHA-256。
- 文件被编辑后哈希变化，自动回到未信任状态。一次 `git pull` 改动了已信任的 tape，会显示为「信任后已改动」，不会静默执行。
- 审查与执行使用同一份内存字节。TUIOS 读取一次、对缓冲区计算哈希、显示该缓冲区、执行该缓冲区；审查到执行之间不再读取磁盘，因此替换文件或符号链接目标都不影响将要执行的内容。
- 信任记录存放在 `$XDG_DATA_HOME/tuios/tape-trust.toml`，权限 0600。这是本机状态，不随 dotfile 同步。

## 运行前的资格检查

在提供信任之前，tape 必须先通过卫生检查，规则与 `sshd` 对 `authorized_keys` 的要求类似：

- 必须是常规文件（解析符号链接之后），归你所有，且组或其他用户不可写；
- 到该文件的路径上没有无 sticky bit 的 world-writable 目录；
- 不超过 64 KiB。

任一条不满足即判定为不具备资格。对话框会说明原因，只提供「关闭」一个选项，没有强行运行的入口。

## 三种 autorun 模式

| 模式 | 行为 |
|---|---|
| `off` | 不扫描目录、不显示任何提示，功能等同不存在 |
| `ask`（默认） | 检测开启，每次遇到都显示被动横幅与 Dock 徽标。你不打开对话框并选择运行，什么都不会执行 |
| `auto` | 已信任且未编辑的 tape 进入目录即自动执行。未信任或已改动的 tape 与 `ask` 表现一致：横幅、徽标、对话框，从不自动执行 |

没有任何模式会让未审查的内容执行。环境变量 `TUIOS_TAPE_AUTORUN` 可对单次运行覆盖配置，例如 `TUIOS_TAPE_AUTORUN=off tuios ...`，适用于 CI 或试用可疑代码。

## 审查对话框

对话框只在明确动作下打开：`Ctrl+B` `T` `t`、命令面板，或在 `auto` 模式下针对仍未信任的 tape 走被动路径。输入 `cd` 不会抢占焦点。对话框显示：

- tape 的规范路径与信任状态，包括「信任后已改动」；
- 运行它会做什么的一行摘要（例如 `session "myproject"`），来自不执行任何命令的头部解析；
- tape 的完整内容，可用上下键滚动。这是安全边界：你批准的是你能看到的内容。

对话框中的四个选择：`r` 只运行一次、`t` 信任并运行、`n` 永不提示该路径、`Esc` 暂时关闭。选择「永不」只按路径记录，不带哈希，因此编辑文件不会重新弹出提示；被拒绝的路径不显示横幅、徽标与对话框，直到你清除该记录。

## auto_review 与 show_status

`tape.auto_review` 默认关闭。关闭时检测到 tape 只显示被动横幅与 Dock 徽标，由你按键打开对话框。开启后检测到就直接弹出审查对话框，省一次按键，信任边界不变，仍需你选择运行或信任。对话框每个目录每个会话最多自动打开一次，只对焦点窗格生效，tape 播放期间不打开。不具备资格的 tape 只保留被动提示。

`tape.show_status` 默认开启。播放期间显示 RUNNING 胶囊与进度消息，`tuios tape exec` 显示「Remote: running a tape」。用 tape 录制屏幕时关闭它，录像里只留下应用画面。tape 失败时仍显示错误。

## tape 头部指令

| 指令 | 含义 | 默认 |
|---|---|---|
| `Session "name"` | 目标会话名 | 项目目录名 |
| `Scope session\|current` | tape 在哪里运行 | `session` |
| `Workspace N` | 在哪个工作区构建 | 无 |
| `Require "command"` | 缺少该命令时跳过并提示 | 无 |

头部指令必须出现在正文命令之前。写在正文之后会被当作正文处理。没有头部的 tape 按默认值运行。

## tape 正文指令

| 指令 | 效果 |
|---|---|
| `Type "text" [Enter]` | 向焦点窗格输入文本，可选 `Enter` 提交 |
| `Run "cmd"` | `Type "cmd" Enter` 的简写 |
| `Enter` | 在焦点窗格提交一行 |
| `Split vertical\|horizontal\|left\|right\|up\|down` | 把焦点窗格切出一个新平铺窗格，方向表示新窗格出现的位置 |
| `NewWindow ["name"]` | 新建一个平铺窗格 |
| `RenameWindow "name"` | 给焦点窗格命名 |
| `Focus "name"` | 按名称聚焦窗格 |
| `Sleep <duration>` | 暂停，例如 `500ms`、`1s` |
| `EnableTiling` / `DisableTiling` | 开合平铺 |

空行与 `#` 开头的行忽略，无法识别的指令也忽略。每次 `Split` 或 `NewWindow` 之后会插入一段等待，确保异步创建的窗格准备好后再继续输入。

一个典型项目 tape：

```
# .tuios.tape for myproject
Session "myproject"
Require "pnpm"

RenameWindow "edit"
Type "nvim ." Enter

Split vertical
RenameWindow "serve"
Type "pnpm dev" Enter

Split horizontal
RenameWindow "sh"

Focus "edit"
```

## Scope 语义

`Scope session` 是默认值。运行时 TUIOS 先推导会话名（头部 `Session`，否则项目目录名），再按以下规则处理：

- 同名会话已存在，切换到它，不重建。会话是持久产物，tape 是一次性的构建器，重复进入项目不会复制窗格。
- 不存在则创建会话，在项目根目录起一个窗格，按正文构建布局，然后切换过去。

会话作用域要求 daemon 支撑的会话（`tuios new ...`）。不在该环境时，TUIOS 退回当前会话执行 tape 并给出提示。

`Scope current` 是可选的最佳努力模式。tape 作用于当前会话，从焦点窗格开始，与已有状态叠加，适合很小的 tape，例如「切一次，运行 `make watch`」。

`Require "pnpm"` 在 `pnpm` 不在 `PATH` 时跳过整个 tape 并提示，避免向无法运行该命令的 shell 输入命令。

## 安全属性

- 只有已信任且未编辑的 tape 能在没有按键的情况下运行（`auto` 模式）。
- 「只运行一次」与「信任并运行」作用于你在对话框中审查过的内容。
- 执行使用审查时哈希的那份字节，不重新读取文件。
- 被拒绝的路径既不提示也不运行。
- 信任后编辑过的 tape 回到未信任状态并重新提示，不会静默执行旧的已信任版本。
- tape 运行期间完全抑制检测，本次已处理的项目根目录不会再次触发，因此 tape 中 `cd` 到别处无法串联出下一次运行。
- 远程 SSH shell 被忽略：TUIOS 无法读取或验证远程文件，既不提示也不运行。

## 证据边界

- 两类 tape、信任模型、资格检查、三种模式、头部与正文指令、Scope 语义与安全属性逐字来自 `docs/PROJECT_TAPES.md` 摘录，见 Raw。
- 七个子命令与示例来自本机 `tuios tape --help` 输出。
- 未在本机创建 tape 做实际执行实验；`autorun = auto` 的自动执行行为依据文档描述。

## See Also

- [TUIOS 配置项全表（0.12.0）](tuios-config-reference.md)
- [TUIOS 配置与用户体验](tuios-config-user-experience.md)
