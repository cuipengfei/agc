# Herdr 0.9.5 与 Tern 0.9.30：对象层级、全部 agent 的侧栏总览与直接跳转

> 研究目标：不逐个打开 tab，就能看见正在运行的 agent，并直接去到它所在的终端。
>
> 研究对象是用户**当前运行的 Herdr 0.9.5** 与 **Tern 0.9.30（fe54a4c）Web 客户端**。Herdr 的 session、Spaces、tabs、panes、Agents 都在研究范围内；Spaces 是当前侧栏对 workspace 的称呼，不能因为官网另有 Herdr App 就把当前 Herdr 排除出去。
>
> 证据包括固定版本官方文档／源码、本机 CLI 帮助、研究代理的一次 Herdr agent 快照，以及主代理补充的本机配置／client/server 版本和独立 Tern Web 客户端观察。Tern 公开文档滚动发布，不冒充固定到 0.9.30 的源码快照。

## 图例与术语

- `[single-source]`：来自该产品的一手文档、官方源码或本机 CLI。同一项目的多份资料互相核对，不算多个独立来源。
- `[unknown]`：本次没有确认的功能细节或运行结果。
- `[INFERENCE]`：由证据推导的便利性与方案判断，不是操作实测。
- **证据形态：文档声明／一手直读／主代理实测转述／推断**：区分官方说明、直接读取源码或 CLI、主代理报告的本机结果与分析。
- **session**：终端软件组织、保留运行环境的会话；不要与 OMP 自己保存对话的 session 混用。
- **Spaces／workspace**：本文当前 Herdr 的同一对象；Spaces 是侧栏术语，workspace 是 CLI／数据名，不是两层嵌套容器。
- **tab**：标签页，里面是一套分屏布局。**pane**：分屏中输入输出所在的一块终端区域。**agent**：在 pane 中被识别或报告状态的程序，不是每个 pane 必有的布局容器。
- **window**：Tern 的浏览器页面／桌面窗口 UI 实例；pane 程序与权威屏幕由 daemon 保留。
- **peek／Mission Control**：Tern 的临时概览入口，不等于常驻 Agents 侧栏。**attention inbox**：需要关注的事件收件箱，不保证列出所有 live agent。
- **OSC 7501**：程序向终端报告“工作中／等待输入／空闲”等语义状态的终端控制序列。

## 先给结论

1. **用户对当前 Herdr 的结构理解基本正确：`session → Spaces（workspace）→ tabs → panes → agent`。** 最后一段表示 pane 内运行的 agent，不是 pane 必须拥有的额外容器。Spaces 与 Agents 则是两种浏览视角：前者按项目工作区域，后者按 agent。[H1][H3][H4][C1][C4]
2. **当前 Herdr 已有用户要的常驻 agent 索引。** Agents 区每个 agent 独立一项，带它的 pane/tab/workspace 关系，点击或 `agent focus` 直达 pane，不需要先逐 tab 点开。当前配置采用 `agent_panel_sort="spaces"`，是按 Spaces 分组／排序，不是仅显示当前 space。[H4][H6][C1][C4]
3. **Tern session 与 space 在相关接口里指同一层。** `window_title` 的 `space` 字段明确是当前 session 的名称；没有发现 session 和 tab 中间另有一层 Herdr 式 Spaces。window 是 UI 实例，不是固定嵌套在 session 下面的保活容器。[T1][T2][T4][T5][C2]
4. **Tern Web 竖向侧栏目前按 tab 列行，不是每 agent 一行。** 主代理在已有 btop＋zsh 双 pane tab 上确认：两个 pane 同时可见，侧栏仍只有一条对应 tab 记录，文字以 focused pane 为代表。官方通用文档说每 pane 有程序图标，但当前截图没有验证每个图标都可单独点击跳转，也没有验证真实 OMP 状态切换。[T1][T3][C3]
5. **如果只为实现“每个 agent 一项、看到就跳转”，当前 Herdr 比当前 Tern Web 更直接。** Tern 的近似办法是一个 agent 一个 tab 并按任务命名；保留分屏则可用 Mission Control／Peek／attention inbox 临时总览。真正同等的常驻 Web Agents 区需要 Tern Web 自身实现；Web 不运行 Lua window half，不能直接套桌面插件办法。[T5][T6][C5]

第 5 点的便利性比较与可选路线属于 `[INFERENCE]`。没有进行点击次数、视觉查找耗时或状态识别准确率测试，也没有实施任何布局改动。

## 1. 用户各个假设的真伪

| 用户假设 | 判断 | 准确说法与证据 |
| --- | --- | --- |
| 当前 Herdr 是 `session → Spaces → tabs → panes → agent` | **基本成立。** | session 是持久 server namespace；Spaces 对应 workspace；tab 是其中的布局；pane 是终端；agent 是 pane 中被识别／报告的程序。当前 client/server 均为 0.9.5，CLI 确实返回 workspace、tab、pane 与 omp 关系。[H1][C1][C4] |
| Herdr 的 Spaces 与 workspace 是不同层级 | **不成立。** | 当前 UI 用 Spaces，CLI 用 workspace；默认配置同时有 `ui.sidebar.spaces` 与 `ui.sidebar.agents`。这是界面称呼与数据名的差别。[H3][C4] |
| Spaces 列表与 Agents 列表是两个层级 | **不是。** | Spaces 按工作区域浏览；Agents 跨区域按 agent 建项。两份列表指向同一批终端的不同关系，不是把 agent 从 workspace 搬出。[H3][H4] |
| 每个 pane 下面必有 agent | **不成立。** | pane 可以只是 shell、日志、测试或服务器。被识别的 agent 才进入 Agents 区；普通 terminal 仍可从 Goto picker 查看。[H1][H2][H6] |
| Tern 是 `session → tabs → panes`，没有额外 Spaces | **成立于已读公开模型。** | session 包含 tabs，tab 分成 panes。`window_title.space` 是 session 名；文档里 workspace 示例建立的是一个分屏 tab，不是新增容器。[T1][T2][T4][T5] |
| Tern window 是 session 下面固定的一层 | **不宜这样画。** | window 是浏览器页面／桌面 UI 实例，持有当前选择与可访问 sessions；daemon 持有 pane。多个客户端可展示同一 session，focus 属于各自 window。[T5][T6][C2] |
| Tern 侧栏 tab 只显示选中 pane | **文字代表信息成立；不能据此断定图标也只有一个。** | tab 的 cwd/program/title 来自 focused pane；pane 数量与 busy 另有汇总。通用文档说每 pane 有程序图标；当前 Web 截图只确认 tab 行，没有验证逐图标全部展开与动作。[T1][C3] |
| Herdr 不逐 tab 点开就能看全部运行 agent 并直跳 | **在被识别／报告、未被自定义过滤的范围内成立。** | Agents 按 agent 建项，可直接 focus；默认 spaces 排序不是 current-space 过滤。长列表仍要滚动，一项可有多行文字。[H4][C4] |
| 当前 Tern Web 有与 Herdr 相同的常驻 Agents 总览 | **本次未发现；当前页面没有。** | 竖向列表单位是 tab；attention inbox 是事件列表，不是全部 agent 清单。Mission Control／Peek 是临时概览。[T3][T6][C3] |
| Tern 跳某 pane 必然先点 tab，再点 pane | **不能作此断言。** | CLI 已提供按 block 的 `focus`。侧栏单图标直跳没有实测，canvas 页面也没有可读的逐图标 DOM 动作。[C2][C3] |

证据形态：官方文档声明、固定源码直读、本机 CLI 帮助直读与主代理实测转述。对“没有额外层级／没有某入口”的判断限定于已查模型和当前页面，不证明私有实现永远没有同名字段或未来能力。

## 2. 当前 Herdr 0.9.5：结构与两种常驻列表

### 2.1 session、Spaces、tab、pane、agent 的关系

```text
persistent session（独立 Herdr server namespace）
└─ Spaces / workspace（项目工作区域）
   └─ tab（分屏布局）
      └─ pane（真实终端）
         └─ agent 或普通程序

Spaces 列表：按 workspace 浏览
Agents 列表：按被识别／报告的 agent 浏览，指向上述具体 pane
```

`[single-source]` 官方 Concepts 把 workspace 定义为项目容器，拥有 tabs 和 panes；tab 是 workspace 中的一套 layout；pane 才是真实 terminal。agent 由前台进程、屏幕检测规则或集成识别。session 是完全独立的 panes/sockets/persisted runtime namespace，不是 OMP 对话文件。[H1]

**Agent 不是新增的空间层。** 一个 pane 没有 agent 仍然存在；同一个 tab 可以有多个 agent pane。Agents 区的作用是为这些 agent 建直接入口，而不是要求用户按这棵树逐层找终端。[H1][H2][H4]

### 2.2 本机当前证据：默认值、用户配置与运行状态分开

| 来源 | 已确认内容 | 边界 |
| --- | --- | --- |
| 研究代理 CLI 直读 | `HERDR_ENV=1`；`herdr --version` 为 0.9.5；帮助有 session/workspace/tab/pane/agent 命令组。 | 没有启动或连接新的 session。 |
| 主代理后续本机核实 | 当前 herdr、client、server **均为 0.9.5**。 | 使用主代理报告，不重新运行命令来“确认”其结果。 |
| 主代理读取 `herdr --default-config` | 有 `[ui.sidebar.agents]`、`[ui.sidebar.spaces]`；`agent_panel_sort="spaces"`，`"workspaces"` 是 alias。 | 默认配置是发行版预设，不是用户完整当前值。 |
| 主代理读取当前用户配置 | 用户也设置 `agent_panel_sort="spaces"`，并有 OMP-specific agent 行配置。 | 不猜测或复制未提供的具体自定义行内容。 |
| 主代理 `herdr workspace list` | 返回 workspaces。 | CLI 名称 workspace 不推翻侧栏称呼 Spaces。 |
| 研究代理一次 `herdr agent list`，及主代理后续核实 | 当前 `omp` 是 working，带 pane/tab/workspace 关系；研究代理快照中 `screen_detection_skipped=true`，session source 为 `herdr:omp`。 | 只证明已观察的 OMP 报告链与 working 快照，不证明全部状态切换均已实测。 |

`[single-source]` 证据形态：研究代理一手直读＋主代理实测转述。[C1][C4]

### 2.3 Spaces 列表显示什么

`[single-source]` 0.9.5 官方默认展开侧栏为两行：[H3]

```toml
[ui.sidebar.spaces]
rows = [
  ["state_icon", "workspace"],
  ["branch", "git_status"],
]
```

- 第一行是工作区域名称与汇总状态。
- 第二行显示 Git branch，以及有值时的 ahead/behind 信息。
- 状态由这个 workspace 中的 agents 向上汇总；被 blocked 的 agent 会让其 tab/workspace 显示需要关注。[H2][H8]
- **Spaces 不是逐 pane 清单。** 它回答“哪个项目需要我”，不是“每个 agent 各在做什么”。

默认值与用户当前显示分开：当前用户可能调整了行布局；本次确认其 Spaces/Agents 配置区真实存在，不把默认两行当成已截图确认的当前每个字段。

### 2.4 Agents 列表显示什么

`[single-source]` 官方默认 agent 项为两行：[H3]

```toml
[ui.sidebar.agents]
rows = [
  ["state_icon", "machine", "workspace", "tab"],
  ["agent"],
]
```

**“每 agent 一行”应理解为每 agent 独立一项，不是强制一个字符行。** 配置允许每项显示多行文字，也可单独给 OMP 设置行内容。可用信息包含状态、workspace、tab、pane 名、agent 名、terminal title、自定义 metadata；不需要打开 tab 才获取该 agent 的位置。[H3][C4]

`[single-source]` 0.9.5 源码从 snapshot agents 生成列表项，保留具体 pane ID。正常 `spaces`／`priority` 排序路径不是“只留 focused pane”。有自定义 `agent.view` 时，才可安装过滤／排序投影；所以“按 space 排序”与“只显示当前 space”必须区分。[H4]

当前用户的 **`agent_panel_sort="spaces"`** 让 agent 按工作区域组织。想按需要关注程度浏览，可用 Priority；本研究没有改动用户排序。[H3][H4][C4]

### 2.5 为什么能直接跳到 agent

`[single-source]` agent 行点击目标绑定 **pane ID**，不是仅绑定 tab。CLI 的 `herdr agent focus <target>` 也接受唯一 live agent 名或承载它的 pane ID，直接到目标 pane，无需先执行 workspace focus 再 tab focus。[H4][C1]

作用范围仍是所选持久 session/server。两个 session 可以有相似名称／ID；`agent list` 不是一次列尽所有独立 session 的无边界总表。跨已连接机器可汇总，但不需要引入手机或另一个 Herdr 产品来解释用户当前能力。[H1][H4]

### 2.6 OMP 状态：集成报告与 Herdr 完成标记分开

`[single-source]` 官方 Agents 文档明确 **OMP state requires integration**。OMP 集成通过 socket 报 `omp`、生命周期和原生 OMP session 引用；报告存在时优先于屏幕猜测，不要求靠 omp executable 的 native process detection 才获得状态。[H2][H5]

| 状态 | 用户含义 | 官方 OMP 集成／Herdr 的处理 |
| --- | --- | --- |
| `working` | 正在进行工作 | agent start；已安排 continuation 时不提前结束；可重试 provider error 有短暂保留窗口。 |
| `blocked` | 需要用户介入或错误待处理 | 审批请求、ask 工具、blocked 事件；重试保留窗口到期也可能 blocked。不是所有 blocked 都等于授权弹窗。 |
| `idle` | 没在工作／等待新输入 | agent end 后短暂防抖；仍有 pending blocked 时优先 blocked。 |
| `done` | 工作结束但此客户端还没有看到完成内容 | **不是 OMP 集成另报一个 done。** 集成报 idle；Herdr 依据 completion 与 seen 状态投影 done/idle。 |
| `unknown` | 无法确信分类 | Herdr 支持此态，不是“完成”的同义词。 |

证据形态：固定 v0.9.5 OMP integration 与 completion projection 源码直读。[H7][H8]

`[single-source]` 每个 client 记录自己是否看过完成；CLI/API 用 server seen 状态。因此某个 client 的 Done badge 不必和 CLI 相同。读屏幕不等于 focus，也不意味着已清除所有客户端的完成提示。[H1][H8]

**本机实测仅覆盖 working 快照与关系。** 未诱发审批、错误、完成事件，也没有实测 done→idle 切换。即使标 idle/done，遇到陌生真实审批仍应查看终端，不以状态为自动批准依据。[H2][C1][C4]

OMP 集成还避免 nested OMP 覆盖 pane root 的身份。因此 Agents 项不等于 OMP 内部每个子任务：没有独立 terminal/pane 的内部工作，本次不能宣称都会形成独立项。[H7]

## 3. Tern 0.9.30 Web：session/tab/pane 与竖向列表

### 3.1 window 是视图实例，daemon 保留 pane

```text
session daemon（保留 pane 程序与权威屏幕）
             ↕ 展示／交互连接
window（浏览器页面或桌面窗口 UI 实例）
└─ 可访问的 sessions，选中其中一个
   └─ tabs
      └─ panes / blocks（终端、agent、文件、浏览器等）
```

`[single-source]` 官方 session 文档明确 session 组织 tabs；tab 可以 split。daemon 持有 pane 与屏幕，window 持有 UI、选择、focus。结构改动可复制到展示同 session 的客户端；focus 是各 window 自己的。[T2][T5][T6]

0.9.30 CLI 帮助明确：命令作用于 **一个 window 的 sessions**；`--window KEY` 可选实例，缺省按调用 pane 的 window／继承 key／第一个 window 解析。`new session NAME` 与 `new tab [SESSION]` 是两种对象操作。[C2]

### 3.2 “Tern 没有 Spaces”如何准确表达

`[single-source]` Tern 没有查到位于 session 与 tab 之间的独立 Herdr 式 Spaces 层，但不能因此说完全没有 `space` 这个名称：

- `window_title` 的输入 **`space` 就是当前 session 的名称**，在该接口里两者指同一层。[T1]
- **Layout and Workspaces** 示例通过 `cx.layout:tab(spec)` 建一套命名分屏 tab；workspace 是完整工作布局的说法，不是新增容器。[T4]
- session/tab/pane 是对象关系；window 是查看它们的 UI 实例，不适合硬塞成 `session → window → tab` 的唯一树。[T2][T5][T6]

### 3.3 一个 tab 的文字与图标不是相同粒度

`[single-source]` 官方 Chrome 文档将它们分开：[T1]

| 信息 | 来源／粒度 |
| --- | --- |
| tab `cwd`、`program`、`title` | **该 tab 的 focused pane**；用户命名／formatter 还可覆盖 tab 标题。 |
| tab `panes` | tab 的 pane 总数量。 |
| tab `busy` | 是否有命令在其中任一 pane 运行，不是全部 agent 各自语义状态。 |
| 程序图标 | 官方通用文档说 **每个 pane 一份**：有图标的 tab 用 tile，text-only tab 用 flat symbol。 |
| 图标身份／状态 | 文档有 `data-program`、`data-pane`，以及 `data-st=waiting/failed/working/done/bell`。 |

**标题只代表 focused pane，不等于另一个 pane 不存在；有每 pane 图标的通用机制，也不等于当前 Web 每个图标的可见性、点击动作与状态已实测。** 特别是两个相同 OMP 图标，仍不能从一个 tab 标题得到两份完整任务名。

### 3.4 当前 Web 双 pane 观察

`[single-source]` 证据形态：主代理实测转述与现有截图。[C3]

主代理在独立 Windows Chrome 客户端打开已有 Web 服务，使用 Vertical tabs，通过 `Ctrl+1` 选择一个**已有双 pane tab**。只读 inspect 确认是 **btop pane＋zsh pane**。两块内容同时可见，左侧仍按 session 下的 **tab 行**组织；两个 pane 没有变成两条逐 pane／逐 agent 记录。

画面中的可见列表为三条 tab；文字与程序图标没有提供两份独立 agent 任务条目。该观察确认了**浏览单位是 tab**，不是全部 agent 的常驻索引。

限定：

- btop＋zsh 不是两个 OMP。没有在 Tern 中启动 agent，所以不能声称测试了两个 OMP 的独立任务名或各态转换。
- 没有点击单个 pane 图标，**侧栏图标直跳仍未实测**。
- Web 是 canvas 绘制，DOM 没有可供核验的逐图标 `data-pane`／role；不能拿文档 CSS 字段当实际页面动作证据。
- 没有改变用户 pane 的创建、关闭、位置或运行程序。

有效本地截图只引用，不复制／重写：

- [双 pane 画面与竖向侧栏](../../tern-web-twopane-sidebar.png)：`tern-web-twopane-sidebar.png`。
- [竖向 tab 列表](../../tern-web-sidebar-multipane.png)：`tern-web-sidebar-multipane.png`。
- `tern-web-multipane-view.png` 的选 tab 未成功，明确排除，不作成功切换证据。

### 3.5 竖向列表、直接选择与临时总览

`[single-source]` 官方 navigation 有 horizontal/vertical orientation、竖向列表 filter/autohide，以及跨 session 单击 `switch`／`stay`。stay 下 double click 或显式选择仍会切换。**点击的结果可能受设置影响**，不要把一个默认叙述泛化到每种配置。[T3]

能确认的入口：

- **竖向侧栏**：按 tab 找工作，不是按 agent 分节的常驻列表。[T3][C3]
- **CLI `tern focus BLOCK`**：让目标 block 的 window 显示它；目标可用精确 ID、`SESSION/BLOCK`、标题或程序名。帮助确认语法，未执行 focus。[C2]
- **Mission Control／Peek**：内置临时 overview，可在保留 tab 分屏时查看工作概况；不是固定在侧边的 agent 清单。[T6]
- **Needs-attention inbox／attention inbox**：关注事件入口，`inbox go` 到选中条目的 pane；它不是所有 working/idle agent 的完整列表。[T6][C5]

`[unknown]` 当前每种 layout 的单 pane 图标点击、跨 session 图标与 switch/stay 组合、真实 OMP 的 working/blocked/done/idle 转换，本次未测试。不能因为 CLI 可以 block focus，就声称当前图标也已验证同一行为。

### 3.6 状态不能与 Herdr 五态机械对齐

`[single-source]` 图标 styling hook 有 waiting/failed/working/done/bell；inbox 记录 bell、命令完成、程序退出、请求关注、agent completion；程序还可用 OSC 7501 报 working/blocked/idle，这也影响关闭确认。[T1][T6][T7]

因此程序身份、当前工作状态、历史 attention 是不同东西：

- 两个 OMP 图标不代表两者状态相同。
- tab busy 不代表每个 pane 都工作中。
- inbox 为空不代表全部 agent 已结束。
- waiting/failed 不能未经事件／源码核对就严格映射为 Herdr blocked。

`[unknown]` 未核验 Tern 0.9.30 各态优先级、“查看后清除 done”的完整状态机，也没有诱发审批／错误／完成。这里只报告文档语义与已有画面。

### 3.7 版本与 Web 扩展边界

Tern 官方索引规定 reference 优先于 guide。当前 API reference 的 `tabs()` 覆盖 window 所有 sessions，`panes()` 包括 tab 内与 parked panes；较旧 guide 描述更窄。范围判断采用 reference＋0.9.30 CLI，不拼接互相不同的版本叙述。[T0][T5][C2]

已查 SDK main 为 `ca9fff91fc519af13b47a9cea52846f106f3533d`，2026-11-21 同步来源为 `2ca1884b3759b7d51131ecefa212ac5a89b3f191`，不是本机 binary 的 fe54a4c。tags 只有 Go SDK tags，本次没有找到 terminal 0.9.30 的固定文档 tag。[T8]

**Web 不运行 Lua。** daemon 侧插件产出的 pane 内容可以到 Web，但 window-half 自定义侧栏／导航插件不能根据桌面 SDK 就假定在 Web 可用。[T5][T6]

主代理后续检查：**AGC 仓库没有 Tern Web UI 源码**，Plannotator plans 目录也没有相关旧方案。[C5] 因此本研究不能在这里提供假实现或宣称可以直接改一个 AGC Lua 插件得到原生 Web Agents 侧栏。真正实现需定位 Tern Web 自身代码与入口，再单独设计／授权实施。

## 4. 相同目标下的操作步骤与可选路线

下面是使用说明／可选方案，除明确记载的快照与独立客户端观察外，**不是本次已执行的操作**。不创建 agent，不拆分、不移动、不关闭用户 pane。

### 4.1 当前 Herdr：直接用已有 Agents 区

1. 查看 **Agents** 常驻区。当前配置按 `spaces` 组织，各 workspace 的 agent 仍独立成项。
2. 扫描 agent 状态与 OMP 自定义行；列表长时滚动，不需要逐 tab 打开。
3. 点击目标 agent 项，直接 focus 到该 agent 所在 pane；或者查 `herdr agent list` 后由用户执行 `herdr agent focus <唯一-agent-name-or-pane-id>`。
4. 想按状态快速筛选时，用默认 `Ctrl+B` 后 `g` 的 Goto picker；`w` 看 working，`b` 看 blocked，`i/d` 看 idle/done，`a` 恢复全部 terminals。搜索名称／路径，Enter 到目标。
5. 到终端后查看真实提示再回答。状态不是批准授权的替代品。

`[single-source]` Goto 每 agent/terminal 一项、split tab 不隐藏 pane、Enter 直跳，来自固定文档；行 target 与 focus 来自源码／CLI。[H4][H6][C1]

当前 namespace 不等于所有独立 session；需要其他 session 时在 CLI 指定 `--session <name>`。本次没有实际执行 focus 或 picker，也没有改变排序。

### 4.2 Tern：先用已有入口，不把 tab 标题当全集

1. 在现有竖向 tab 列表扫描 tab 文字与图标／attention；文字只代表 focused pane，不当作同 tab 所有任务的完整清单。
2. 若当前图标提供明确 pane-focus 动作，可用它到目标 pane；否则选 tab 再选 pane。**这是一条待实际动作验证的分支，不是成功单击结论。** 跨 session 注意 switch/stay。
3. 保留当前分屏时，可临时打开 **Mission Control／Peek** 查看概况；只处理需要介入／完成事件时用 attention inbox。
4. 知道精确目标后，CLI 用户操作是 `tern ls --json` 查该 window 的 sessions/tabs/blocks，再 `tern focus <block-id>`；同名目标用精确 ID 或 `SESSION/BLOCK`，其他 window 用 `--window KEY`。

来源为官方文档和 CLI 帮助。[T1][T3][T6][C2] 研究代理没有执行 Tern daemon 的 list/focus；主代理只读 inspect 与独立页面观察另见 [C3]。

### 4.3 三条路线的得失

| 路线 | 能满足什么 | 代价／不足 | 本次状态 |
| --- | --- | --- | --- |
| **当前 Herdr Agents 区** | 每 agent 独立项、位置与状态、直接 focus pane。 | 只覆盖被识别／报告的 agent；长列表要滚动，自定义过滤可改变范围。 | 已有能力；配置与 working 快照已核实，未改配置。 |
| **Tern 一个 agent 一个 tab＋Vertical tabs＋任务名** | tab 与 agent 一一对应后，侧栏最接近“每 agent 一项、点任务即到终端”。 | **牺牲同 tab 多 agent 分屏**；仍以 tab 而非 agent 语义组织，不自动获得 Herdr 式全部状态分节。 | `[INFERENCE]` 可选近似方案；没有创建、移动或改名任何 tab/pane。 |
| **Tern 保留分屏，用 Mission Control／Peek／inbox** | 无需重排现有 pane，临时 overview 或处理 attention 后去终端。 | 不常驻；inbox 不是全 agent 清单，不能看到工作中/空闲全集就当它是 Agents。 | 官方内置入口；本次未实际打开验证全部条目和跳转。 |
| **真正的 Tern Web Agents 侧栏** | 有机会做到每 agent 一项、跨 tab 状态总览与 pane-focus。 | 需 Tern Web 自身代码；Web 不跑 Lua window half，AGC 无该 UI 源码，不能仅改本仓配置实现。 | 尚无实现；本研究不写代码、不建立假 API 或占位功能。 |

`[INFERENCE]` 如果用户主要诉求是“不要逐 tab 检查，看到全部 agent 的任务与状态，直接过去”，**当前 Herdr 已更贴合**。Tern 的问题不是必须缺 space，而是当前 Web 的常驻侧栏浏览单位是 tab。加 space-like 分组也不会自动把同 tab 两个 agent 变成两条入口。

### 4.4 简明差异表

| 相同需求 | 当前 Herdr 0.9.5 | 当前 Tern 0.9.30 Web |
| --- | --- | --- |
| 顶层组织 | session 内 Spaces/workspaces。 | session，相关 `space` 字段就是 session 名。 |
| 常驻侧栏浏览单位 | Spaces 看项目；Agents 看每个 agent。 | session 下的 tab 行。 |
| 同 tab 多 agent | 每个识别到的 agent 独立项，不只 focused pane。 | 一条 tab 文字代表 focused pane；通用逐 pane 图标不等于两份完整任务名。 |
| 状态扫描 | working/blocked/done/idle/unknown；当前 spaces 排序，priority 可用。 | 图标／attention 与 tab busy；未确认等价的常驻全 agent 分节。 |
| 直接定位 | agent 项指具体 pane；CLI agent focus。 | CLI block focus；侧栏逐图标直跳未实测。 |
| 不重排布局的总览 | 常驻 Agents 与临时 Goto picker。 | Mission Control／Peek／attention inbox 临时入口。 |
| 状态可信范围 | OMP integration 与实际 terminal；内部子任务不自动独立成项。 | 图标身份、busy、attention 不能当全部 OMP 各态全集。 |
| 本次实测 | 当前版本／配置／workspace 关系、OMP working 快照。 | 既有 btop＋zsh 双 pane、竖向 tab 行；未实测两 OMP 状态转换。 |

## 5. 逐条一手证据

### 当前 Herdr 0.9.5 官方资料

- **[H1] Concepts，固定 v0.9.5。** <https://raw.githubusercontent.com/herdrdev/herdr/v0.9.5/docs/next/website/src/content/docs/concepts.mdx>。workspace/tab/pane/agent/session 定义、五态、seen 与多 client。可信度高；官方定义，与本机关系对照，不把 agent 对话 session 与 runtime namespace 混用。
- **[H2] Agents，固定 v0.9.5。** <https://raw.githubusercontent.com/herdrdev/herdr/v0.9.5/docs/next/website/src/content/docs/agents.mdx>。识别／integration、OMP state requires integration、状态汇总、未知审批／tmux 边界。可信度高；官方有明确失败条件，不把“全部”泛化为系统任意进程。
- **[H3] Configuration，UI and sidebar／Sidebar row layouts。** <https://raw.githubusercontent.com/herdrdev/herdr/v0.9.5/docs/next/website/src/content/docs/configuration.mdx>。Agents/Spaces 默认行、token、状态形状与配置范围。可信度高；默认行不冒充用户全部当前自定义值。
- **[H4] Agents renderer 与跨 endpoint 列表，固定 v0.9.5。** <https://github.com/herdrdev/herdr/blob/v0.9.5/src/client/shell/agent_sidebar.rs>；<https://github.com/herdrdev/herdr/blob/v0.9.5/src/client/shell/endpoint_agents.rs>。snapshot agents 建项、Spaces/Priority 排序、agent.view 投影、pane ID 点击目标。可信度高；自定义过滤会改变列表范围，正常 spaces 排序不是 current-space 过滤。
- **[H5] Integrations，OMP。** <https://raw.githubusercontent.com/herdrdev/herdr/v0.9.5/docs/next/website/src/content/docs/integrations.mdx>。OMP socket 报 agent/state/session，不依赖 omp executable 的 native process detection。可信度高；安装说明只读，未安装或改配置。
- **[H6] Keyboard，Goto picker。** <https://raw.githubusercontent.com/herdrdev/herdr/v0.9.5/docs/next/website/src/content/docs/keyboard.mdx>。每 agent/terminal 独立项，split tab 不隐藏 pane，搜索、b/w/i/d/a、Enter 直跳。可信度高；默认 binding，用户自定义可不同。
- **[H7] OMP integration 源码，固定 v0.9.5。** <https://github.com/herdrdev/herdr/blob/v0.9.5/src/integration/assets/omp/herdr-agent-state.ts>。working/blocked/idle，approval/ask、retry/continuation、root/nested OMP 防覆盖。可信度高；读状态机不等于本机实测每个转换。
- **[H8] Completion／seen 投影，固定 v0.9.5。** <https://github.com/herdrdev/herdr/blob/v0.9.5/src/client/shell/endpoint_agent_state.rs>。completion/acknowledged 与 idle/done 投影，tab/workspace 聚合。可信度高；CLI/server/client 的 seen authority 分开。
- **[H9] 官方稳定文档索引。** <https://herdr.dev/llms.txt>。研究时返回 stable 0.9.5 与以上固定原文 URL。滚动官网产品首页不覆盖当前本机取证。

### Tern 官方文档与 SDK

- **[T0] SDK 索引，Documentation conventions。** <https://docs.stencil.so/tern/index.md>。reference 优先于 guide，SDK 文档滚动发布。可信度高；扩展能力不误写为默认 Web UI。
- **[T1] Chrome and Styling。** <https://docs.stencil.so/tern/guides/chrome.md#inputs>；<https://docs.stencil.so/tern/guides/chrome.md#program-icons>；<https://docs.stencil.so/tern/guides/chrome.md#useful-selectors>。focused-pane 文字、space=session 名、icon per pane、data-pane/data-st。可信度高；通用机制不冒充当前 canvas 的可读动作。
- **[T2] Sessions and Blocks，Sessions。** <https://docs.stencil.so/tern/scripts/sessions.md#sessions>。session 包含 tabs、选择与 agent blocks。可信度高；脚本示例用于理解模型，没有执行。
- **[T3] Tabs and Navigation，Tabs and chrome。** <https://docs.stencil.so/tern/scripts/navigation.md#tabs-and-chrome>。orientation、filter/autohide、cross-session-click switch/stay。可信度高；可配行为不等于本机当前全部取值。
- **[T4] Layout and Workspaces。** <https://docs.stencil.so/tern/guides/layout.md#workspaces>。workspace API 建分屏 tab，不是 session 与 tab 中间新增容器。可信度高；较窄 guide 范围用当前 reference 限定。
- **[T5] Window API。** <https://docs.stencil.so/tern/reference/api-window.md#session-cx>；<https://docs.stencil.so/tern/reference/api-window.md#sessions-and-split-trees>。window 所有 sessions/tabs/panes、parked、TabInfo.session、Web 不运行 Lua。可信度高；未单测本机 0.9.30 完整 SDK 覆盖。
- **[T6] Architecture 与 Attention/overview。** <https://docs.stencil.so/tern/concepts/architecture.md#why-the-split-exists>；<https://docs.stencil.so/tern/scripts/terminal.md#attention-and-overview>。daemon 权威 pane、window UI、inbox go、Mission Control／Peek／parked。可信度高；测试 alert 注入命令未运行。
- **[T7] Surfaces，Open and close。** <https://docs.stencil.so/tern/protocol/surfaces.md#open-and-close>。OSC 7501 working/blocked/idle 与关闭策略，不作为完整侧栏状态机证据。
- **[T8] SDK revision 与 tags。** <https://github.com/stencil-hq/tern-sdk/commit/ca9fff91fc519af13b47a9cea52846f106f3533d>；<https://api.github.com/repos/stencil-hq/tern-sdk/tags?per_page=100>。2026-11-21 同步来源 2ca1884…，没有 terminal 0.9.30 固定文档 tag。
- **[T9] 官方产品展示。** <https://stencil.so/tern#daemon>；<https://stencil.so/tern#top>。pane 程序不随 window 关闭、布局与多 pane 展示。可信度高；营销演示不当本机运行观测。

### 本机帮助与运行证据

本机输出没有公开 permalink。保留命令、观察与官方对照；**公开 URL 不是本机命令输出的伪造出处**。

- **[C1] 研究代理 Herdr CLI 一手直读。** `HERDR_ENV=1`；执行 `herdr --version`、`herdr --help`、`herdr session`、`herdr workspace`、`herdr tab`、`herdr pane`、`herdr agent`、一次 `herdr agent list`。确认 0.9.5、agent focus target 与 omp working/pane/tab/workspace，screen detection skipped、source herdr:omp。没有 focus/start/split/close；不公开完整对话路径或 session identity。官方 CLI 参考：<https://raw.githubusercontent.com/herdrdev/herdr/v0.9.5/docs/next/website/src/content/docs/cli-reference.mdx>。
- **[C2] 研究代理 Tern 0.9.30 帮助直读。** `tern --version`、`tern --help`、`tern help`、`tern ls --help`、`tern inspect --help`、`tern focus --help`、`tern new --help`、`tern move --help`、`tern process --help`、`tern events --help`、`tern plugin --help`。确认 fe54a4c、一个 window 的 sessions、--window、focus BLOCK、new session/tab；这些都是帮助，没有由研究代理实际 list/inspect/focus。对照 <https://docs.stencil.so/tern/reference/api-window.md#session-cx>；<https://docs.stencil.so/tern/scripts/sessions.md>；<https://docs.stencil.so/tern/scripts/terminal.md>。
- **[C3] 主代理 Tern Web 观察。** 独立 Windows Chrome 打开既有 `http://127.0.0.1:8378/`，Vertical tabs＋Ctrl+1 选择已有双 pane tab，只读 inspect 为 btop＋zsh。截图 `/home/cpf/code-inside/agc/tern-web-twopane-sidebar.png`、`/home/cpf/code-inside/agc/tern-web-sidebar-multipane.png`；没有单图标点击，没有两 OMP 各态实测；canvas 没有可读逐图标 DOM 属性。机制对照 <https://docs.stencil.so/tern/guides/chrome.md#program-icons>、<https://docs.stencil.so/tern/scripts/navigation.md#tabs-and-chrome>。
- **[C4] 主代理后续当前 Herdr 核实。** 当前 herdr/client/server 均 0.9.5；`herdr --default-config` 有 `ui.sidebar.agents`、`ui.sidebar.spaces`、agent_panel_sort="spaces"（workspaces 为 alias）；当前用户配置也为 spaces 并设置 OMP-specific 行；workspace list 返回 workspaces，agent list 返回 omp working 与 pane/tab/workspace 关系。证据形态：主代理一手检查的转述。本次恢复未为重复确认而重跑命令。对照 [H1][H3][H4] 的完整官方 URL。
- **[C5] 主代理仓库与方案检查。** AGC 没有 Tern Web UI 源码；Plannotator plans 目录没有相关旧方案。本次恢复的是研究文件，不是恢复一个已批准实现计划。没有可公开 permalink 的本机检查；Web 不运行 Lua 的一手依据为 <https://docs.stencil.so/tern/reference/api-window.md> 与 <https://docs.stencil.so/tern/concepts/architecture.md>。

### 初次取证中保留的官网产品命名资料

这些原始 URL 保留为来源审计，**不拿它们替换用户当前 Herdr 0.9.5 的证据，也不把另一个产品、手机或 pane-less helper 作为当前操作建议**。目前官网首页另介绍 Herdr App；这解释文档命名差异，不影响本机 Spaces/workspace/Agents 已核实关系。

- **[A0] 官网 FAQ。** <https://herdr.dev/>。App 与 TUI 的产品区别；该 FAQ 本身位于首页，没有独立文档 URL。可信度高；厂商倾向推广新 App，不能据此否定当前 Herdr。
- **[A1] 固定 App README。** <https://github.com/herdrdev/herdr-app/blob/317e673f1f1568b876cbaa0b41dabeb9153ecbea/README.md#find-your-work>。App 自身 spaces/tabs/panes 与 agents 说明；不作为当前 Herdr CLI 的模型。
- **[A2] 固定 App 模型说明。** <https://github.com/herdrdev/herdr-app/blob/317e673f1f1568b876cbaa0b41dabeb9153ecbea/defaults/AGENTS.md#the-model-spaces-tabs-terminals>。
- **[A3] 固定 App Agents renderer。** <https://github.com/herdrdev/herdr-app/blob/317e673f1f1568b876cbaa0b41dabeb9153ecbea/defaults/mods/agents/main.js>。
- **[A4] 固定 App Spaces renderer。** <https://github.com/herdrdev/herdr-app/blob/317e673f1f1568b876cbaa0b41dabeb9153ecbea/defaults/mods/spaces/main.js>。不能拿该 renderer 的展开／收窄差别描述用户当前 0.9.5 侧栏。
- **[A5] 固定 App Commands。** <https://github.com/herdrdev/herdr-app/blob/317e673f1f1568b876cbaa0b41dabeb9153ecbea/docs/commands.md#panefocus>；<https://github.com/herdrdev/herdr-app/blob/317e673f1f1568b876cbaa0b41dabeb9153ecbea/docs/commands.md#terminalpeek>。
- **[A6] App 版本依据。** <https://github.com/herdrdev/herdr-app/blob/317e673f1f1568b876cbaa0b41dabeb9153ecbea/Cargo.toml>；<https://github.com/herdrdev/herdr-app/commit/317e673f1f1568b876cbaa0b41dabeb9153ecbea>。0.1.16、2026-11-18；不冒充用户本机版本。
- 初次研究还只读 `hc --version`／`hc --help`，观察 0.1.21 与 core terminal 对象；没有运行程序。原分工来源保留：<https://github.com/herdrdev/herdr-app/blob/317e673f1f1568b876cbaa0b41dabeb9153ecbea/defaults/AGENTS.md#two-programs>。不将 hc 命令作为当前 `herdr agent focus` 的替代。

## 6. 反方检索与验证边界

### 反方检索记录

本报告不使用 `[verified]`；两产品主要证据分别来自自身官方项目，不以同项目多个页面充当独立三源。以下是初次研究实际执行的反方向检索；恢复时保留记录，不为主代理已核实的本机观察重复搜索或重跑检查。

| 工具／完整 query | 命中数 | 结论与处理 |
| --- | --- | --- |
| `web_search`：`site:docs.stencil.so/tern "focused pane" "icon per pane"` | 5 | Chrome 同时规定 focused-pane 文字与 icon-per-pane 通用机制；必须再区分当前 Web 截图与动作未实测。[T1][C3] |
| `web_search`：`site:docs.stencil.so/tern "spaces" "session"` | 5 | 命中 session/布局/协议，没有额外 Spaces 容器依据；API 的 space 字段等于 session 名。[T1][T2][T5] |
| `web_search`：`site:herdr.dev "spaces" "session" "agents"` | 2 | 命中当前 Herdr 配置／插件；官网另有 App 不覆盖用户当前 Herdr 0.9.5 的本机事实。[H1][H3][C4] |
| `web_search`：`site:github.com/herdrdev/herdr "Agents" "current workspace" "filter"` | 最终来源列表 1 | 官方仓库 Discussion #1406：current-space filter 是用户原型／插件，维护者指向 agent.view API；v0.9.5 正常 spaces 排序不是默认 current-space 过滤。[H4] |
| `web_search`：`site:docs.stencil.so/tern "pane" "click" "tab" "icon"` | 3 | 确认逐 pane 图标文档，未找到独立证明所有布局图标点击 focus 的说明；不把 CSS 身份字段当成功切换。 |

Discussion 原文与维护者答复：<https://github.com/herdrdev/herdr/discussions/1406#discussioncomment-17691898>。可信度中；参与者偏好 current-space filter，且讨论早于 0.9.5，仅作反例线索。初次已直读完整讨论，当前判断以固定源码与当前配置为准。

工具限制：Tavily search/extract 返回 432 usage limit，改用 web_search、Context7 与 URL 直读。Context7 找到 Herdr 与 Herdr App 的独立索引；Tern 只返回同名数据库迁移器，因此不用它证明终端事实。辅助发现来源已查但未逐条列出。一次 site 搜索摘要夹入站外项目，已 report_issue 并丢弃无关摘要，只用 scope 内真实正文。

### 事实／推断／未知

- **事实**：当前 Herdr 0.9.5 的 session→Spaces/workspace→tab→pane 使用模型成立；Agents 按 agent 建项、spaces 排序不是只看当前 space；当前 omp working 与关系已观察。Tern space 字段等于 session 名；window 是 UI 实例，daemon 持 pane；当前双 pane Web 仍按 tab 列行，文字代表 focused pane。
- **推断**：常驻逐 agent 任务／状态导航时，当前 Herdr 更贴近用户目标；Tern 一 agent 一 tab 可近似，但牺牲同 tab 分屏；额外 project/space 分组本身不解决逐 agent 条目问题。
- **未知**：Tern 当前各 layout 单图标直接跳转、跨 session 组合行为、真实 OMP 各态与 seen 清除；无独立 terminal 的 OMP 内部子任务是否另有聚合；真正 Tern Web Agents 侧栏的源码修改点和实现方案。

### 验证边界

1. **研究代理已一手直读**：固定 Herdr 0.9.5 文档、Agents renderer、OMP integration、completion projection；Tern 官方架构/chrome/navigation/API/protocol；本机 CLI 版本／帮助与一次 Herdr agent working 快照。其他官网产品源码保留为命名审计，不占当前行为结论。
2. **主代理已一手核实的补充**：当前 Herdr/client/server 版本、默认／用户 sidebar 配置、workspace/agent 关系；独立 Web 客户端既有双 pane＋竖向列表；AGC 无 Tern Web UI 源码、plans 无旧方案。恢复时采用报告，不重复检查来“确认”。
3. **没有声称已实测**：Herdr blocked/done/idle 转换，Tern 两个 OMP 独立状态，单图标点击 focus、查看后清除 done。Ctrl+1 选择既有 tab 不冒充 agent 状态转换。
4. **没有实施可选路线**：未创建 agent，未创建/关闭/移动用户 pane，未安装 integration/plugin，未改产品配置文件；恢复研究代理没有操作浏览器／daemon。主代理的独立客户端显示选择与只读观察已如实记录。
5. **文件边界**：仅恢复指定研究 Markdown，未改 wiki/raw/index/log/配置/截图或其他用户文件。现有截图仅引用；没有重建相关 Plannotator 计划。没有 build/test/lint/formatter/smoke。

轮次：3（原研究），判停：a——对象层级、常驻浏览单位、OMP 状态来源、直接定位、同目标操作路线与一手 URL 已覆盖；恢复按主代理后续事实更新当前 Herdr 范围，未实测的 Tern 图标与状态明确保留，不制造成功结论。
