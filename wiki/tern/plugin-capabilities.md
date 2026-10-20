# Tern 插件能力全集

> Sources: Stencil official Tern Plugin SDK documentation, 2026-10-20
> Raw: [Concepts、Guides、Reference、Examples 官方摘录与调研笔记](../../raw/tern/2026-10-20-official-docs-concepts-guides-reference.md)
> Updated: 2026-10-20

## Overview

Tern 插件的能力面分九域：块类型、命令 lens、pane 与 spawn filter、命令/键位/override/route、chrome 三槽、样式、layout 与 workspace、Carly 扩展、canvas，外加跨半共享 API。本文按域给出清单，再整理事件两域、动作五形态、spawn filter 语义、运行预算与容量全表、生命周期、错误通道、信任模型，最后以七个官方示例收束为机制组合配方。

## 能力清单

各能力归属 host 半还是 window 半、为什么如此分工，见 [Tern 插件架构与平台边界](plugin-architecture.md)；本文只按域列举能力面本身。

### 块类型

块类型是 manifest 里一段 `[[blocks]]` 声明加上 `tern.block.define` 实现（raw 行 129）。块是 daemon pane，程序是一张 Lua table，经 surface protocol 绘制（行 17）。类型的全名 kind 为 `<plugin>.<block>`（如 `k8s.pods`），route 决策、`cx:new_block` 与 `launch.block` 都取它（行 53）。入口有五处：调色板、"Open with"、route 决策、`cx:new_block`、workspace（行 17）。块 handler 拿到的 block cx 成员：`pane`、`cwd`、`cols`、`rows`、`render`、`save`、`exit`、`frame`、`blob`（行 123）。`files` globs 对文件名忽略 ASCII 大小写，lens 的 `match` globs 对命令区分大小写（行 115）。

### 命令 lens

Lens 是插件对命令输出的原生视图：manifest 的 `match` globs 决定认领哪个命令，host 半的 `open`、`line`、`finish`、`view` 把捕获的行变成显示在 lens 块里的视图（行 21）。认领规则：按 id 取第一个 Ready 插件，再取其 manifest 顺序中 glob 匹配 `program args…` 的第一个 lens（行 27）；认领是声明式的，每个副本依据 catalog 各自得出同一决定（行 27、262）。Lens id 为 `plugin.<plugin>.<lens>`，块的 role 是 `lens.` 加该 id（行 131）。Lens 的 `open` 返回的 state 由 worker 保存，每插件保留最近 256 条 capture，rehydration 时重建（行 71）。Lens 的 `open` 与 `event` 拿到的是 effect cx，只有 `toast`、`open`、`copy`（行 125）。命令运行期间 host 把产生的视图发给每个副本，每块至多每 250 ms 一次、结束时再发一次（行 264）；capture 一旦转交互（alternate screen、键盘或鼠标模式、光标位置查询）或超过 16 MiB，块被丢弃、已捕获内容回放进终端网格（行 278）。

### Pane 与 spawn filter

Host 侧能力围绕 pane 展开：块与权威屏幕副本都住在 daemon 的 pane table，像 shell 一样（行 17、254）。Block cx 向块 handler 暴露 `pane`、`cwd`、`cols`、`rows`（行 123）。`tern.pane.write(pane, text)` 可向伪终端打字（调研笔记口径，行 319）。Spawn filter 单独在下文展开。

### 命令、键位、override 与 route

命令是调色板的一行；内置命令有 id（`split_right`），插件用 `tern.command` 注册自己的命令，名为 `plugin.<plugin>.<id>`（行 97）。`tern.bind` 把 chord 绑到 action，chord 写法如 `cmd+shift+h`，序列如 `ctrl+a>c`（行 99、101）。Override 是 window handler，在内置命令之前运行（`tern.override`），返回真值即跳过内置（行 93）；多插件按 id 序轮流、首个真值获胜（调研笔记口径，行 316）。Route 在 Tern 打开文件（`tern.route.open`）或点击链接（`tern.route.link`）之前征询，第一个决策获胜（行 95）；决策返回 `{block = kind, args?}`、`{url = …}`、`{path = …, how?}` 或 `{handled = true}`，`nil` 表示放弃（行 119）。`how` 取值：`default`、`beside`（或 `split`）、`below`、`tab`、`replace`、`preview`（行 121）。Route 先于内置打开逻辑，来源覆盖调色板、文件、拖放、链接、系统、CLI、Carly 等（调研笔记口径，行 317）。

### Chrome 三槽

包住 pane 的窗口 chrome——标签标题、窗口标题、状态行——由三个槽位的 formatter 计算：`tern.chrome.tab_title`、`window_title`、`status`（行 43、45）。Formatter 是纯 window 函数：拿一张小输入表、没有 `cx`、预算 4 ms，结果按输入缓存，直至 `tern.chrome.refresh()` 或 reload（行 45）。`status` 的每个 segment 是文本加可选 icon、tone、点击动作（行 47）；点击 segment 会运行一个 action（行 99）。Formatter 与 override、route、spawn filter、认领、window 事件一样，按插件 id 序轮流（行 85、238）。

### 样式与 `tern.css`

Manifest 的 styles 拼成一张全局 sheet `plugin:local:<id>:styles`；`tern.css` 添加的 sheet 名为 `plugin:local:<id>:<name>`；远程 host 的插件样式为 `plugin:<host>:<id>:styles`（行 139）。所有 styles 拼接后总量 256 KiB（行 149）。级联顺序上 Tern 自带 sheet 在前、插件在后，同特异性下插件赢；顺序随 reload 变化，文档不承诺（调研笔记口径，行 321）。

### Layout 与 workspace

Window 半用 `cx.layout` 构建标签页布局，通常从 `window_start` 事件开始（行 49、186）。官方 workspaces 示例读取 `.tern/workspace.json` 描述的标签页与分屏，用 `cx.layout:tab` 布局，并示范 `new_tab` override 与 status segment（行 293）；`TERN_WORKSPACE` 环境变量在启动时恢复 workspace（调研笔记口径，行 338）。

### Carly 扩展

Carly 侧扩展全部来自调研笔记：桌面端 Carly 在独立会话 VM 中运行（行 331）；插件经 `cx:ask_carly` 与 `tern.carly.schedule` 提供任务，任务数、过期与 check 执行方式各有官方限制（行 320）；`tern.carly.export` 导出的工具数量有限，名字限定小写字母、数字、下划线（行 331）；`tern.carly.context` 提供上下文，按每插件与全局两级设字符预算（行 331）。精确数值见官方 Reference 页，raw 未逐字摘录。

### Canvas

Canvas 能力由官方 Canvas Dashboard 示例给出：`cx.canvas` 所有权、副本读取（replica reads）、keyed patches、owner-only `canvas_action` handler（行 294）。窗口侧 `canvas_action` 事件载荷为 `{pane, owner, act, node, value?, mods?, text?, title?, about?}`，`owner` 字段即所有权归属（行 186）。

### 共享 API

两半共享数据目录 `<state>/plugin-data/<id>/`，`tern.kv` 存在其中的 `kv.json`，reload 后不变（行 89、242）。文件与进程：`tern.fs.read` 读文件（示例中行 290；`tern.fs` 同步阻塞所在线程——调研笔记口径，行 322）；`tern.process.run` 异步跑进程、可带超时（行 289、322），每流输出上限 16 MiB（行 173），iOS 不可用（行 176）；`tern.fetch` 从上下文所在机器发出（调研笔记口径，行 322），响应体 16 MiB、默认超时 30 s 除非 `timeout_ms`、重定向 10 次（行 174）。解析与序列化：`tern.parse.json_tree` 节点上限 5000（行 166）；`tern.json.encode` 嵌套 128 层、整数精确到 2^53（行 175），`tern.json.array()` 保留空数组、`tern.json.null` 显式 null（调研笔记口径，行 328）。`tern.now()` 返回单调毫秒（调研笔记口径，行 327）。环境经 `TERN_*` 变量进入插件：`TERN_WINDOW_KEY`、`TERN_PLUGIN_DATA`、`TERN_DAEMON_SOCKET`（行 29、89、224）。

## 事件

Host 事件与 window 事件是两个独立集合：host 事件描述一台机器上运行的 pane，由该机的 host 半收听；window 事件描述一个 Tern 窗口显示的内容，由该窗口的 window 半收听（行 182）。

### Host 事件（6 个）

| 事件 | 载荷 |
| --- | --- |
| `spawn` | 无载荷；同步 filter，语义见下文专节 |
| `command_started` | `{pane, line, cwd?}` |
| `command_finished` | `{pane, line, status, took_ms}` |
| `cwd` | `{pane, path}` |
| `title` | `{pane, title}` |
| `pane_exited` | `{pane, status}` |

### Window 事件（11 个）

| 事件 | 载荷 |
| --- | --- |
| `window_start` | 无载荷 |
| `focus` | `{pane, tab}` |
| `pane_created` | `{pane}` |
| `pane_closed` | `{pane}` |
| `tab_created` | `{tab}` |
| `tab_closed` | `{tab}` |
| `command_started` | `{pane, line}`（无 `cwd`） |
| `command_finished` | `{pane, line, status, took_ms}` |
| `cwd` | `{pane, path}` |
| `title` | `{pane, title}` |
| `canvas_action` | `{pane, owner, act, node, value?, mods?, text?, title?, about?}` |

### 同名事件的语义差异

`command_started`、`command_finished`、`cwd`、`title` 两侧同名，描述同一事实的不同侧面（行 188）。差异一在载荷：host 侧 `command_started` 带 `cwd?`，window 侧同名事件不带（行 184、186）。差异二在来源：host 侧需要 shell 集成上报 OSC 133;C 才触发，没有 shell 集成的 pane 永远不触发（行 190）；window 侧来自窗口镜像。开两个窗口的 window half，每个 window 事件在每个窗口各听一次（行 188）。

### 分发时序

Session 把事件排队；每次 render 后窗口把队列交给插件：按事件顺序，每个事件内插件按 id 序、插件内 handler 按注册序，每个 handler 拿到一个全新的 `cx`（行 192）。Web client 不运行任何 Lua，它的窗口什么都听不到（行 196）。

## 动作与键位

### 动作五形态

Action 是键位可运行名字的更大集合，包含全部命令（行 200）。名称形态共五种（行 202-208）：

| 名称形态 | 示例 | `tern.bind` | `tern.override` / `cx:command` |
| --- | --- | --- | --- |
| 命令 id | `new_tab`, `layout:rail` | 可以 | 可以 |
| 仅键位 action | `palette`, `goto_tab:3`, `text:\e` | 可以 | 不行 |
| view chord | `editor.toggle_comment`, `sqlite.write` | （表格截断，形式存在） |  |
| 插件命令 | `plugin.hello.say_hi` | 可以 | 不行（拒绝） |
| 插件函数绑键 | `plugin.hello.bind.0` | （由 `tern.bind` 函数式注册产生） | 不行 |

插件命令 `say_hi` 在 `hello` 插件中成为 action `plugin.hello.say_hi`；它属于内置命令之外的插件命令，`tern.override` 与 `cx:command` 会拒绝它（行 210）。传给 `tern.bind` 的函数得到 action 名 `plugin.<id>.bind.<n>`，`n` 从 0 起数该插件的函数绑键（行 210）。

### 键位四层与只增规则

键位分四层：Defaults → Preset → Plugin binds → User keybinds，用户层总是赢（调研笔记口径，行 318）。插件绑定位于 Tern 默认与键盘预设之上、用户 `keybinds` 之下；插件只能增键：绑到默认或预设已占用的键、或与其序列互为起始/被起始的绑定会被丢弃（行 212）。

## Spawn filter 语义

`spawn` host 事件是一个同步 filter，覆盖该 host 即将启动的每个进程 pane（shell 与以命令启动的 pane），可在启动前重写 program、arguments、directory、environment（行 41、194）。插件块不过滤（行 194）。Pane 对每个插件的答案最多等 50 ms，超时答案被丢弃（行 194、157）。多插件按插件 id 序链式轮流（行 85）。

## 预算与容量

官方 Limits 页逐条给出运行时的固定上限、超时与默认，全部不可配置（行 143）。全表如下：

| 项目 | 限制 | 越界时 |
| --- | --- | --- |
| `plugin.toml` 大小 | 64 KiB | Problem `plugin.toml is larger than 64 KiB` |
| Manifest schema | `1` | Problem `unsupported schema N` |
| 插件、块、lens 的 id | `^[a-z][a-z0-9-]{0,31}$`（1–32 字节） |  |
| 插件 `name` | 1–64 个 Unicode 字符 |  |
| `styles` 总大小 | 拼接后 256 KiB |  |
| 每 host 插件数 | 64 个有效包，按 id |  |
| 默认 icon | `puzzle` |  |
| 每 VM 内存 | 256 MiB |  |
| Host 调用预算 | 每次调用 2 s，含运行 `host.luau` | 该 hook 在此 VM 禁用至 reload |
| Window 调用预算 | 每次调用 50 ms | hook 禁用 |
| Chrome formatter 与 `available` | 每次调用 4 ms | hook 禁用 |
| 被禁用的 hook | 至 VM 被 reload 替换 |  |
| `spawn` filter 等待 | 每插件 50 ms | 该插件的答案被丢弃 |
| Reload 时 worker 退休 | 3 s 释放其块 |  |
| 一次调用后的 `cx` 请求轮数 | 8 |  |
| 每插件 lens capture 状态数 | 256；finished 先丢、最近最少用先丢 | 被丢的 capture 在该块下次事件时从输出重建 |
| Host 记忆的 lens 块数 | 4096 |  |
| `tern plugin reload` 等待 | 60 s | `the session daemon did not answer`，退出码 124 |
| 命令运行中的 view tick | 每块每 250 ms 一次 `view`，仅在新行之后 |  |
| 每命令捕获输出 | 16 MiB | 捕获被放弃，输出保持普通终端文本 |
| 等待其块的 lens view | 5 s |  |
| `tern.parse.json_tree` 节点 | 5000 |  |
| 内置 lens 行数 | 同样停在 5000 行，追加 `tern.ui.overflow(n)` 行 |  |
| Frame 消息大小 | 64 KiB | 拆成块 |
| Pane 待处理输入 | 16 MiB |  |
| CSI 或 SS3 键序列 | 64 字节 |  |
| Chrome formatter 缓存 | 每 formatter 256 个输入 |  |
| Lua 中的 pane 与 tab id | host 自己的 id 低于 2^44；远程 host 的 tag 高于它 |  |
| `tern.process.run` 输出 | 每流 16 MiB |  |
| `tern.fetch` 响应体 | 16 MiB；超时 30 s 除非 `timeout_ms`；重定向 10 次 |  |
| `tern.json.encode` 嵌套 | 128 层；整数精确到 2^53 |  |
| iOS 上的 `tern.process` | 不可用 |  |
| 变化批处理 | 300 ms；回退轮询间隔 2 s；轮询指纹深度 8 层目录、10,000 条目 |  |
| 日志文件轮转 | 每文件 16 MiB，保留两个旧文件；默认过滤器 `warn,stencil=info` |  |

Hook 是调用进 Lua 时所用的名字（如 `pods.view`、`command <id>`、`focus`、`timer`），出现在失败 toast 里，也是预算 trip 后禁用的单位（行 109）；被禁用的 hook 到下次 reload 前在该 VM 一律跳过（行 111）。

## 生命周期

插件在运行它们的进程启动时加载，目录变化或有人请求时整体 reload；reload 替换该上下文的每个 VM，运行中的块凭保存的状态延续，运行中的 lens capture 在原地跑完（行 230）。两半从同一次插件目录扫描出发：包按 id 排序、problem 单独放置、被设置关闭的 id 标记 Disabled（行 232）。Host 半在 session daemon 启动时加载，先于恢复已保存的 pane，恢复的块因此找得到块类型（行 234）；window 半在窗口创建时加载，位于 Tern 自带样式之后、键位首次应用之前（行 236）。

监视：macOS FSEvents 递归；Linux inotify（包目录最深 8 层）；Windows ReadDirectoryChangesW；iOS 与 watch 失效处 2 s 轮询（8 层、10,000 条目）；变化 300 ms 批处理；任何变化重载该上下文全部插件（行 240）。

Reload 后的存活情况（行 242）：运行中的块迁到新 worker，以 `save` 最后返回的状态重启，跑 `init(cx, args, saved)`；运行中的 lens capture 在旧 worker 上用旧代码跑完；已完成的 capture 的 Lua 状态随旧 VM 消失，该块下次事件时在新 worker 上重建；hook、spawn filter、定时器、待处理的 process 与 fetch 回调随旧 VM 结束；`tern.kv` 与数据目录文件不变。

Daemon 重启：daemon 发现前一任留下的 state file（退出、崩溃或机器重启）时，先加载插件、再恢复保存的 pane；shell 以 login shell 回归；插件块以同一类型、按最后 `save` 状态、最后尺寸、空白屏幕回归（行 244）。

Unix 原地升级：升级把 daemon 交给新构建而不结束任何程序——shell 保住伪终端、屏幕与 scrollback；插件块没有伪终端，交接前停止，最后保存的状态被保留，新 daemon 从它重启每个块（行 246）。

Lens rehydration：lens 状态只活在 worker 的 VM 里，每插件保留最近 256 条 capture。Reload、daemon 重启或升级、capture 被逐出之后，块仍持有命令行、工作目录、原始输出、宽度与退出状态；该块发来事件时，worker 用本插件的 `match` globs 重新认领：仍认领则依次跑 `open`、按块宽逐行重放输出跑 `line`、命令已结束则跑 `finish`，然后处理事件的 handler 并发送新视图；globs 不再认领则什么都不运行（行 248）。

## 错误通道

调研笔记把插件错误呈现概括为五条通道（raw 行 332，调研笔记口径）：handler raise 的报错、handler toast、problem 条目、Failed 状态、CLI stderr。其中 Failed 状态（entry 抛错或预算超限，或声明的块/lens 未实现，行 135）与 Problem（目录里不可用的条目及原因，行 81）有逐字定义；CLI 退出码 0 成功、1 verb 失败（reload 后新 catalog 有 Failed/problem 也退 1）、2 usage error、124 daemon 60 s 未应答 reload，逐字见 Command Line 节（行 222）。Handler 失败 toast 文案与 entry 加载失败文案（`Plugin x: hook failed`、`failed to load`）仅见于调研笔记（行 306）。

## 信任模型

调研笔记口径（raw 行 309）：安装插件即信任插件——无审查、无签名、无权限清单；`tern` API 可及用户能及的一切。官方建议手动 clone 并 checkout 之后再安装目录。

## 官方示例：机制的组合配方

SDK 的 `plugins/examples/` 附带七个完整插件（行 284），每行示例演示一组机制面：

| 示例 | 做什么 | 演示的机制面 |
| --- | --- | --- |
| Terraform Plans（`terraform`） | 把 `terraform plan` 与 `tofu plan` 显示为按动作分组的摘要徽章、诊断与资源，点击复制地址 | `match` globs 认领的命令 lens、逐行解析、徽章 tone、可折叠段、经 lens `event` cx 的点击动作、role 作用域 manifest CSS |
| Review Queue（`review-queue`） | 轮询 `gh`，列出等待你评审的 PR | 带键、事件与保存状态的块；带超时的 `tern.process.run`；`tern.timer` 轮询；错误视图；用 `cx:new_block` 打开块的面板命令与键绑 |
| JSON Explorer（`jsonx`） | 以可折叠树浏览 JSON 文件并复制 jq 路径 | `files` globs 与 launch args 支撑的文件块；尺寸检查后的 `tern.fs.read`；列表选择与滚动；保存状态；开关存于 `tern.kv` 的 `tern.route.open` |
| Long-Running Commands（`longrun`） | 命令完成时 toast 慢命令并保留历史 | `command_started`/`command_finished` host hook、toast、带实时时钟的历史块、status segment、两半共享模块 |
| Directory Variables（`dirvars`） | 把 `.tern-env` 文件载入每个新 shell 的环境 | spawn filter 及其时限、提示文件变化的 `cwd` hook、解析模块 |
| Project Workspaces（`workspaces`） | 打开 `.tern/workspace.json` 描述的标签页与分屏 | `cx.layout:tab` 布局、`window_start`、`new_tab` override、status segment、manifest CSS |
| Canvas Dashboard（`canvas-demo`） | 用 Refresh 动作维持常驻 dashboard | `cx.canvas` 所有权、副本读取、keyed patches、owner-only `canvas_action` handler |

## See Also

- [Tern 插件架构与平台边界](plugin-architecture.md)
- [Tern 命令 lens](command-lenses.md)
- [Tern Surface Protocol 官方规范要点](tsp-official-spec.md)
- [Tern 官方文档地图](official-docs-map.md)
