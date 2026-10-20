# Tern 脚本与自动化面

> Sources: Stencil official Tern documentation（Scripts 章节）, 2026-10-20; 本机 tern 0.9.4 (b9ef74c) help dev 输出实测， 2026-10-20
> Raw: [Scripts、Elements、Styles 官方摘录与调研笔记](../../raw/tern/2026-10-20-official-docs-scripts-elements-styles.md); [Tern Inbox 特征行为实测](../../raw/tern/2026-10-20-inbox-feature-evidence.md)
> Updated: 2026-10-20

## Overview

Tern 窗口可以被脚本驱动：控制端点监听 Unix socket 或 127.0.0.1 TCP 端口，每行命令换一行 JSON 回复。命令按域组织——会话与块、终端与窗格、画中画等；`tern ctl state` 按主题导出应用状态 JSON，构成自动化的状态面。

## 控制端点与脚本三路径

控制端点是 Unix socket 或 127.0.0.1 TCP 端口，默认 `/tmp/tern.sock`；协议为一行命令换一行 JSON 回复。脚本是每行一条命令的纯文本，有三种执行路径：`tern shot`、`serve` 与 `ctl --file`。

## 会话与块命令族

`session new [<name>]` 创建会话、切换到它并打开其第一个 tab；省略或空白名字产生 unique random two-word name。`session switch <name>`、`session rename <name>`、`session close`、`session lock`、`sessions [<query>]` 覆盖切换、改名、关闭、锁定与查询。

lock 拒绝关闭该会话及其 tabs 与 blocks：触发时弹 toast，脚本本身不会失败。关闭唯一会话时它仍然存在，只是没有 tabs。

关闭策略 `confirm-close never|running|always`，默认 `running`：当将要结束的是 idle shell 之外的程序——运行中的命令、编辑器、进行到一半（mid-turn）的 agent——会先询问；idle shell 与回合间隙的 agent 直接关闭。

`block shell|agent` 打开显式选定的块类型并聚焦；`agent-command <text>` 设置未来 agent 块运行的命令（默认 `omp`）；`new-blocks shell|agent` 决定新 tab / 分屏打开的块类型。agent 块遵循 agent-placement 偏好：默认右侧分屏，也可选新 tab 或替换该 tab 唯一的 idle shell。

等待语义：real-work waits 20 秒后失败；`session close` 与 `sessions` settle 450 ms。

## 终端与窗格命令族

`split right|down`、`close`、`zoom`（切换聚焦 pane 的缩放）、`equalize`、`focus left|right|up|down|next|prev`、`resize`、`tab new|next|prev|close|<n>`、`rename`、`palette`、`find`、`context pane|tab`。

`layout rail|float|tiles|studio` 切换窗口布局，布局名大小写不敏感。

字体族命令：`font-weight <weight>` 被钳制在 100–900；`adjust-cell-height` 的结果行高被限制在未经调整行高的半倍到三倍之间。`theme [dark|light] "<name>"`：改一种外观的主题时，另一种外观的选择保持不变。

attention 系列：`alert bell [<detail>]`、`alert done <status> <command> [<seconds>]`、`alert exited <status>`、`alert waiting <message>`、`alert finished [<message>]`、`alert failed [<message>]`；`inbox` / `inbox go` / `inbox clear` / `inbox close`；`peek [strip|mission|close]` 打开 tab strip 或 Mission Control、或返回终端，默认 `strip`。

### Inbox 命令族（2026-10-20 补）

四条命令来自 `tern help dev` 的 world commands 段：

| 命令 | 行为 |
|------|------|
| `inbox` | 打开 inbox |
| `inbox go` | 跳转到选中条目 |
| `inbox clear` | 清空全部条目 |
| `inbox close` | 关闭 inbox 视图 |

注意 `inbox` 不是 CLI 子命令：`tern inbox --help` 返回 `No such file or directory`，四条命令只在 ctl/scenario 域可用。

二进制 strings 显示默认键位 `ctrl+cmd+h` 标注为 "Opens the inbox."（macOS 侧）；用户报告 `cmd+shift+I` 也可打开，对应关系未从 strings 直接确认。

omp 向 inbox 发送消息的现象由用户提供，通信协议与消息格式当前无证据。

## PiP 命令族

`pip` 命令创建并排列悬浮在活动 tab 中某个 owner 块之上的块。corners 取 `tl` / `tr` / `bl` / `br`。

- `pip float [<corner>]`：把聚焦的分屏块浮到接管其空间的块之上；聚焦块无法浮起时失败——它需要另一个 eligible 块来拥有它。
- `pip new [<corner>] ["<address>"]`：在聚焦块上创建 browser card。
- `pip focus` / `pip expand` / `pip dock [left|right|up|down]`：把聚焦 card 变回 owner 旁边的分屏；dock 会把 card 从 `pips` 中移除。
- `pip drag` / `pip release` / `pip fling`：落点可以改变 corner、把 card rebind 到另一个 owner、dock 或在边缘 stash。
- `pip stash|unstash|stash-all|fan|see|menu`。

多数 pip 命令 settle 650 ms 动画时间；`drag` settle 50 ms。

## 其余脚本域

其余命令域一行一个（定性，出自调研笔记；`harness` 域在本批摘录中缺席，暂不列出）：

- `remote`：面向远程 Host（name/address/state/sessions/identity/tern 版本/update）。
- `prefs`：设置页（prefs kind：main 为全页、layer 为右侧 dock sheet）。
- `control`：控制端点自身，即 `tern ctl state` 的状态导出。
- `status`：account gate / update / kickoff 的可编排模拟状态；kickoff 桌面专属。
- 各块类型域与同名块一一对应：browser、files、file、procs、screen、git、sqlite、notebook、board、profile、carly，见下表。

web 客户端不跑多数 script runner。

## 状态暴露面

`tern ctl state` 输出应用状态 JSON，按主题暴露 panes / tabs / sessions / settings 及各 block 类型一项。逐字区给出的字段明细：

- `sessions`：每个会话的 `name`、tab count 与 `current` 标记。
- `panes`：终端尺寸；`focused.id` 标识焦点。
- `tabs`：标题、pane 数、active 与 zoomed 标记；`decks` 描述排列。
- `pips`：`id`、`owner`、`corner`、`slot`、`rect`；`mode` 为 `glance`、`focus`、`expanded` 或 `hidden`；laid out 时 `deck` 为 `whole`、`peek` 或 `hidden`。

不进 state 的：session lock——逐字原文 "The lock is not exposed in state."；`confirm-close` 的当前值同样不在上述主题与字段清单中。

## 块类型脚本能力概览

各内建块的可脚本性（定性，调研笔记口径）与平台归属：

| 块 | 脚本能力 | 平台 |
| --- | --- | --- |
| browser | 地址归一化：显式 scheme 保留、点分主机补 `https://`、`localhost` 与 IP 补 `http://`、其余变搜索 | 通用 |
| files | block 旁的目录树面板，per-tab 钉 root；大目录限可视行数与选中路径数（具体限额未逐字核对） | 通用 |
| file | rendered / source / hex / image / text 多模式，带 git 改动区 | 通用 |
| task-manager | 实时进程列表，列本 pane 所属 host 的进程 | 通用 |
| screen | host 显示器共享 | iOS / web 只读 |
| git | graph / changes / diff | 桌面专属 |
| sqlite | Structure / Browse / Execute / Pragmas 四区，cell / plot 侧栏 | 通用 |
| notebook | 真实 kernel | 桌面专属 |
| board | Markdown 任务板，lanes / cards | 通用 |
| profile | 火焰图：macOS sample、Linux perf、Windows 采样器 | 通用 |
| carly | 内置助手，接真实工具 | 桌面专属 |

桌面专属合计：git、notebook、carly、kickoff。

## See Also

- [Tern 视图元素与样式体系](elements-and-styles.md)
- [Tern 对象模型](object-model.md)
- [Tern inbox 特征行为](../tern/../tern/inbox-feature.md)
- [Tern 官方文档地图](official-docs-map.md)
