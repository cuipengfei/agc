# Tern TSP, kitty graphics support evidence, and probe command corrections

> Source: conversation with user, 2026-10-17; docs.stencil.so/tern; github.com/verticalrectangle/tern-video-block
> Collected: 2026-10-17
> Published: Unknown

会话问答摘录，三个主题：Tern 的 TSP 与图像支持证据、autoGraph 实测、终端协议探测命令的修正过程。

## Tern：TSP 路径与图像支持证据

用户问题：「OMP 支持哪些协议？TUIOS 总共支持哪些？查一下 Tern 支持哪些？」

OMP 答案（本仓库矩阵文章与 raw 已载，本轮复述）：SIXEL、Kitty、iTerm2 三协议，由 `terminal-capabilities.ts` 的 `ImageProtocol` 枚举分发。

TUIOS 答案（矩阵文章已载）：Kitty graphics（完整渲染）+ SIXEL passthrough（实验性），无 iTerm2。

Tern 答案（本轮新查证）：

- Tern 是 Stencil 的终端，图形不走 SIXEL/iTerm2 的终端图像协议路线，而是走 **TSP（Tern Surface Protocol）**——程序把 UI 树发给 Tern，由 Tern 自己排版、绘制。
- TSP 里图像是一个 `image` 节点，官方文档定义：「An image from a blob (animations play)」，即程序发图像数据块，Tern 原生画出来并播放动画。
- omp 的 `chartFence`（`table-chart.ts`）把 SVG 作为 ```svg 围栏交给终端的 `md` 节点，由 Tern 自己绘制，不经过图像协议路径。
- **Kitty graphics 支持**：来自第三方仓库 `verticalrectangle/tern-video-block` 的 README 实测声明——「draws through the kitty graphics protocol (frames sent by file path)」「tested in Tern only」。**注意**：`awesome-tern` 也是社区整理列表，两者都非官方背书。
- **SIXEL 与 iTerm2 IIP**：在 Tern 官方文档（docs.stencil.so/tern 的 protocol/elements/transport/theme/handshake 各页与全书 print）只搜到 kitty 键盘协议，未找到支持 SIXEL 或 iTerm2 图像协议的证据。

来源：
- TSP 文档入口：https://docs.stencil.so/tern/protocol/index.html
- TSP elements（image 节点）：https://docs.stencil.so/tern/elements/index.html
- tern-video-block README：https://raw.githubusercontent.com/verticalrectangle/tern-video-block/main/README.md

## autoGraph 实测记录

用户说：「earlier you said the auto graph will show markdown table as graph, we are in tern now, lets try that」

前置检查（本机）：

- `~/.omp/agent/config.yml:144` 在 `tui:` 小节内：`tui.autoGraph: always`
- `terminal.showImages: true`、`images.autoResize: true`、`tui.maxInlineImageRows: 20` 均满足

实测：输出一张四行两数值列的 Markdown 表（产品 vs 支持的图像协议数量、其中实验性：OMP 3/0、TUIOS 2/1、ttyd 2/0、Herdr 1/0）。OMP 生成了分组条形图 SVG，图例为两个数值列，四行数据与表格逐条对应。

**证据边界（advisor 确认后修正）**：

- 用户发来的匹配 SVG 只证明**图表内容已生成**（OMP 环节成立）。
- 「Tern 是否把它画成了图」**未确认**——代理看不到用户屏幕。
- 错误判据撤回：原说「能复制出整段 SVG 源码就说明没被画成图」不成立。TSP 的 `svg` 围栏可由 `md` 节点绘制，源码仍可能可复制；源码可复制性与屏幕呈现方式无关。
- OMP 对 Tern 选择 TSP `chartFence` 路径有源码依据（docstring「`chartFence` hands a TSP terminal the SVG as an ```svg fence」），但本次实际走了哪条路径未从屏幕判定。

## 探测命令修正过程

用户问题：「give me simple commands to run in terminal to test if sixel or kitty is supported」

第一轮给出的探测命令及缺陷：

- `printf '\033[c'; sleep 0.3; echo`（DA1）、`printf '\033[?1;1;0S'; sleep 0.3; echo`（XTSMGRAPHICS）、Kitty `a=q` query——**缺陷**：`printf …; sleep; echo` 只发查询，`echo` 不读取终端回包，「同一行看到回复」的说明不可靠。
- XTSMGRAPHICS 回包按「非 `?` 即支持 SIXEL」判定——**判据撤回**，该语义未核实。

修正后（`/tmp/term-probe.sh`，语法检查通过，非 tty 时以退出码 1 拒绝运行；**成功分支未实测**——本机工具链 shell 不是 tty）：

- 把 `/dev/tty` 设为原始模式（`stty -echo -icanon min 0 time 10`，保存/恢复 `stty -g`）
- 依次发 DA1、XTSMGRAPHICS、Kitty `a=q` query 到 `/dev/tty`
- `timeout 1.5 cat </dev/tty` **实际读取**回包，`cat -v` 转可见形式打印
- 判读：`_Gi=31;OK` → kitty 支持；`_Gi=` 其他 → kitty 回了错误码；DA1 回包含属性 `4` → 终端**声明**支持 SIXEL（不代表实际支持）；XTSMGRAPHICS 只报「查询被响应/未响应」，不按回包值判定 SIXEL 支持

判读行的固有声明：DA1/查询只说明终端自述能力，**最终以 `img2sixel` 实际绘图为准**。

区分（advisor 要求保留）：

- tmux 对 Kitty/iTerm2 IIP 可用 `tmux set -g allow-passthrough on`；SIXEL 取决于 tmux 版本与 `terminal-features` 配置，非简单开关；最省事对照是先在 tmux 外测一遍再进 tmux 测。
- `img2sixel` 只能实测 SIXEL；Kitty 的实际绘图验证用 `kitty +kitten icat` 或 `chafa -f kitty`，不能拿 `img2sixel` 的结果当 Kitty 证据。
- 环境变量（`KITTY_WINDOW_ID`、`WEZTERM_PANE` 等）只说明「在哪个终端里」，不代表协议一定可用。

## 本机环境事实

- `TERM_PROGRAM=tern`（用户当前终端是 Tern）
- 已安装的图像工具只有 ImageMagick；`chafa`/`timg`/`img2sixel`/`kitty`/`wezterm`/`mpv` 均未安装
