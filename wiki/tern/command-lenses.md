# Tern 命令透镜（command lens）

> Sources: Stencil official Tern documentation (Guides › Command Lenses; Concepts › Architecture、Lifecycle and Reload; Reference › Limits、Glossary), 2026-10-20
> Raw: [Tern 官方文档：Concepts / Guides / Reference / Examples 摘录与调研笔记](../../raw/tern/2026-10-20-official-docs-concepts-guides-reference.md)
> Updated: 2026-10-20

## 定义与行为

> A lens turns the output of a shell command into a native view: a table, a chart, a list of diagnostics. The plugin's manifest decides which command lines it claims, and its host half reads the output line by line and returns a view, while Tern keeps the raw output one click away.

透镜（lens）是插件对命令输出的原生视图：表格、图表、诊断列表。manifest 决定认领哪些命令行；host half 逐行读输出并返回视图，视图显示在透镜块（lens block）中。透镜块保存认领命令的 raw output 并展示透镜视图；切到 Raw 即显示输出原文，原始输出始终一键可达。推断（raw 逐字区未覆盖复制路径）：由于 raw output 始终保留在块内，从块内复制拿到的仍是输出原文，视图只改变显示形态。

## 认领的流程

三步（官方描述逐字）：

1. Tern reads the line as a simple command. A line that isn't one stays plain terminal output.
2. It tries the plugins' `match` globs. On a match, the command's output is diverted into a block that the claiming lens reads.
3. Otherwise it asks the built-in lenses, and with no taker the output stays plain terminal output.

认领的判定顺序：the first Ready plugin by id, then its first lens in manifest order whose glob matches `program args…`——先按插件 id 取第一个 Ready 插件，再取该插件 manifest 顺序中第一个 glob 匹配 `program args…` 的透镜。

命令行解析规则（逐字）：leading `VAR=value` assignments are skipped；wrapper programs are skipped with their options：`sudo`、`doas`、`exec`、`time`、`nice`、`nohup`、`env`、`command`、`builtin`、`caffeinate`、`npx`、`bunx`、`pnpx`、`uvx`、`pipx`；the program loses its directories；redirections of stderr and stdin are removed。即：行首 `VAR=value` 赋值被跳过；包装程序连同其选项被跳过；程序名去掉目录部分；stderr 与 stdin 重定向被移除。

以下形态永不进入透镜（逐字）：pipelines（`du -sh * | sort -h`）、lists（`clear; du`、`make && du`）、stdout redirections（`du > sizes.txt`）、subshells、heredocs、and command substitution in the program word。原因：屏幕上的输出不只属于一个程序。

## 边界与上限

交互与体积边界（逐字）：A capture that turns interactive (the alternate screen, keypad or mouse modes, a cursor position query) or passes 16 MiB is aborted: the block is dropped and everything captured is replayed into the terminal grid.——捕获一旦转为交互（备用屏幕、键盘或鼠标模式、光标位置查询）或超过 16 MiB 即中止：块被丢弃，已捕获的内容全部回放进终端网格。Limits 查找表对同一 16 MiB 边界的描述：Captured output per command: 16 MiB → the capture is abandoned; the output stays ordinary terminal text。

视图节奏：View tick while the command runs: One `view` per 250 ms per block, and only after new lines。Architecture 的补充描述：host 把捕获的行喂给插件 worker，把产生的视图作为独立消息发给每个副本，命令运行期间每块每 250 ms 至多一次、结束时再发一次。

透镜状态：Lens capture states per plugin: 256 — finished captures dropped first, least recently used first; a dropped capture is rebuilt from the block's output on its next event。每个插件的 worker 只保留最近 256 个 capture 的 Lua 状态，先丢已完成的、再按最久未用丢；被丢的 capture 在其块的下一个事件时从块保存的输出重建。

内建透镜同样封顶：Built-in lenses also stop at 5000 rows and add `tern.ui.overflow(n)`'s line。Limits 中 `tern.parse.json_tree` 的节点上限同为 5000，内建透镜与之对齐，超出的行以 `tern.ui.overflow(n)` 汇总。

## 透镜块与插件块对照

| 维度 | 插件 block | 命令透镜（lens block） |
| --- | --- | --- |
| 画面归属 | daemon pane，与 shell 同级，程序是 Lua table 而非进程（"A plugin block is a daemon pane like a shell, except that its program is a Lua table instead of a process"） | pane 的输出属于 shell；每个副本（daemon 屏幕、各窗口镜像、iOS、web tab）解析同一份字节，在命令启动那一刻自行判定输出是否变为透镜块 |
| 视图传输 | 经 surface protocol 绘制（"draws through the surface protocol"） | host 把捕获行喂给插件 worker，视图作为独立消息发给每个副本：运行时每块每 250 ms 至多一次，结束时一次 |
| 原始输出 | 无「原始输出」概念：块程序本身产出画面 | 块保存认领命令的 raw output；Raw 视图直接显示输出原文 |
| 产生方式 | 由调色板、"Open with"、route 决定、`cx:new_block` 或 workspace 启动 | 命令启动时由 manifest 的 `match` globs 认领，输出被导入认领透镜读取的块 |

## Rehydration

Glossary 定义（逐字）：Rebuilding a lens block's state after the worker lost it (reload, daemon restart, eviction): the host replays the block's saved command and raw output through `open`, `line` and `finish` before handling the block's event.——worker 丢失透镜块状态（重载、daemon 重启、逐出）后，host 在处理该块的事件之前，先用 `open`、`line`、`finish` 重放块保存的命令与 raw output。

Lifecycle 的补充（逐字）：透镜状态只存在于 worker 的 VM 中，每插件保留最近 256 个 capture。透镜块比状态活得久：重载、daemon 重启或升级、或 capture 被逐出之后，块仍保存着命令行、工作目录、raw output、宽度和退出状态。这种块发来事件时，worker 用插件的 `match` globs 重新判定该命令；若仍认领，则运行 `open`，然后按块的宽度重放保存输出的每一行 `line`，命令已结束则运行 `finish`，再处理事件的 handler，最后发送新视图。若 globs 不再认领该命令，什么都不会运行。

## 关闭粒度

官方原表逐字：

| 粒度 | 做法 |
| --- | --- |
| One block | Switch it to Raw |
| Every lens, built-in and plugin | Turn off Settings › Terminal › Native command output |
| One plugin's lenses | Turn the plugin off in Preferences › Plugins (it adds the id to `plugins_disabled` in `settings.json`) |
| One lens | Narrow or remove its `match` patterns in the manifest; there is no per-lens switch |

即：单个块切 Raw；全部内建与插件透镜关闭 Settings › Terminal 的 Native command output；某插件的全部透镜在 Preferences › Plugins 关闭该插件（id 写入 `settings.json` 的 `plugins_disabled`）；单个透镜只能收窄或删除 manifest 中的 `match` 模式，没有独立的透镜开关。

## 为什么认领是声明式的

Architecture 的论证（逐字）：command lens 读取 shell 命令的输出并以原生视图替代显示；与 block 不同，pane 的输出属于 shell，pane 的每个副本（daemon 的屏幕、每个窗口的镜像、iOS、web tab）解析同一份字节，并在命令启动那一刻自行判定输出是否变为透镜块。Only the host runs Lua, so the decision cannot depend on Lua. Whether a command gets a plugin lens is decided by the manifest's `match` globs alone, which every replica has from the host's catalog.——只有 host 运行 Lua，所以判定不能依赖 Lua；是否认领只由 manifest 的 `match` globs 决定，而每个副本都从 host 的 catalog 拿到这些 globs。Glossary 对 claim 的总结：Claims are declarative so every replica reaches the same decision.——认领是声明式的，好让每个副本得出相同结论。

## See Also

- [Tern 对象模型](object-model.md)
- [Tern 插件能力](plugin-capabilities.md)
