# LLM 出图的作者模型：diagram-design、archify、answer-me-with-html 与 visual-explainer

> Sources: cathrynlavery/diagram-design v2.6 源码（HEAD `4451eadc484d76aa860edf3289c16fcd082dcdbf`）; 本机 archify v2.17 源码; QingYunA/answer-me-with-html v0.5.0 SKILL.md + README + docs/reference.md; nicobailon/visual-explainer v0.12.0 SKILL.md
> Raw: [diagram-design 与 archify 源码取证](../../raw/agent-tooling/2026-09-04-diagram-design-vs-archify.md); [answer-me-with-html 与 visual-explainer 摘录](../../raw/agent-tooling/2026-10-10-amwth-and-visual-explainer.md)
> Updated: 2026-10-10

## 判定

四个 skill 都产出自包含 HTML，但作者模型分四轴：

- **diagram-design**：LLM 手写 SVG。模板与示例给可复用的坐标约定，坐标本身逐个手写。
- **archify**：LLM 写带类型的 JSON，Node 渲染器算布局与路径并校验。
- **answer-me-with-html**（amwth）：LLM 只写 Markdown 稿件，`am` CLI 算全部版面、主题与图表坐标。
- **visual-explainer**：LLM 手写全部 HTML + CSS + JS + inline SVG。模板与 style guide 给约定，坐标逐个手写。

archify 的 LLM 输出是带类型的 JSON，由渲染器 schema 校验并计算路由，覆盖 5 类系统图。diagram-design 覆盖面最广（SKILL.md 自述 44 种，实测 `type-*.md` 39 个、基础类型 53 个）。amwth 用 Markdown 草稿由 CLI 生成整页，README 基准称对比手写 HTML 减少 token（4893→612、31→12 秒），未测量与其他三个 skill 的对照。visual-explainer 全手控整页叙述，figure-led 风格。四者职责不重叠，可同时装。

## 作者模型对照

| 维度 | diagram-design | archify | answer-me-with-html | visual-explainer |
|---|---|---|---|---|
| 作者产物 | 内联 SVG | 带类型的 JSON | Markdown 稿件 | HTML + CSS + JS + inline SVG |
| 坐标 | 每元素手写 | 4 个 schema 无 `pos`；architecture 有 `pos` 且手写 | CLI 算（dagre 布局） | 每元素手写 |
| 连线路由 | 手写 `<line>` 端点 | `geometry.mjs` 自动端口与 port spread | CLI 算 | 手写 SVG 路径 |
| 文字度量 | 无，mask 宽度靠估 | 按字宽收缩字号 | CLI 处理 | 模型自行处理 |
| 随包校验 | `self_check.py`，查 DOM 与可访问性，不读坐标 | `validate` + `deliver` + `visual-check` | STE 写作检查（默认警告，strict 拒绝） | 无自动几何校验 |
| 几何校验器 | 约 40 个 `verify-*.py` 在仓库根，**不随 skill 分发** | 在包内，必经流程 | 无几何校验器 | 无几何校验器 |
| 执行入口 | Python 3 写文件 | Node CLI | Node CLI（`am.mjs` 单文件，无 `npm install`） | Pi `prepare`→`render`；MCP render tools；其他平台直接写文件 |
| 图表类型 | 44 种 type 参考（SKILL.md 自述；实测 `type-*.md` 39 个） | 5 类 schema | SKILL.md 自述 12 种组件 | 手绘 SVG，无预设类型 |
| 主题 | 客户 profile 系统 | 无主题切换 | blueprint/shadcn/paper，各有明暗 | Instrument/Blueprint/Paper/Editorial register |
| 常驻上下文 | SKILL.md 584 行 + 一个 type 参考 | SKILL.md 137 行 + 一个 schema + 一个示例 | SKILL.md 182 行 | SKILL.md 151 行 + style-guide + templates（SKILL.md 声明） |
| 离线 | 是 | 是 | 是（无 CDN） | 否（CDN 字体与库） |
| 视频 | 可选动画 | 无 | `am video`（旁白+动画播放页） | scene player + MP4 导出 |
| 交互 | 无 | pan/zoom/搜索/追踪/导出 WebM | 页面内 ask/comment/Reply 回传 | plan 页面回答回传 |

## archify 的 5 类

`architecture`（组件、服务、云/安全边界、基础设施）、`workflow`（流程、审批闸、runbook、CI/CD）、`sequence`（API 调用链、请求生命周期、异步 trace）、`dataflow`（pipeline、ETL/ELT、lineage、消费方）、`lifecycle`（状态迁移、重试、等待与终态）。

无图表类型。

## answer-me-with-html 的组件（SKILL.md 自述「12 种」）

amwth 的组件选择按信息形状匹配，语法写在 Markdown fence 块里，CLI 解析后算坐标。SKILL.md §4 的选择表按信息形状列 16 行，含 table、image、code、diff 与 plan/refactor 标记，其中几行复用同一组件（flow/tree/er 加变更标记、code 两种用途），自述数为 12 种：

| 组件 | 用途 | CLI 算什么 |
|---|---|---|
| `flow [LR]` | 架构、决策分支 | dagre 布局、节点位置、连线路径 |
| `er [LR]` | 数据模型与关系 | 实体框位置、关系线 |
| `sequence [num]` | 多方消息时序 | 生命线位置、间距、激活条 |
| `tree [list]` | 目录、分类层级 | 缩进转树形布局 |
| `timeline [v]` | 历史、阶段 | 时间轴位置 |
| `limits` | 值与上限 | 柱状刻度 |
| `annot` | 逐词批注 | 批注框位置 |
| `kv [cols=2]` | 元数据标题块 | 网格摆位 |
| `callout` | 结论、警告 | 面板样式 |
| `ask [multi]` | 用户决策回传 | 选项布局 |
| table | 多维对比 | 状态徽章（ok→✓ no→✗ warn→!） |
| code | `src=` `lines=` 从仓库读真实代码 | 无坐标，嵌入原文 |
| image | 真实界面截图（`![描述](/abs/path.png)`） | 无坐标，嵌入图片 |

amwth 的 Markdown 输入不含坐标语法，flow 的 dagre 布局与 sequence 的间距全部由 CLI 在渲染时计算。archify 的 `geometry.mjs` 也自动算路由与端口，但 architecture schema 的 `pos` 字段仍由 LLM 手写。

## visual-explainer 的 figure-led 交付

visual-explainer 以图为主干，文字是说明。页面结构遵循：

- 每张图一个 `<figure>`，`<figcaption>` 写该图要证明的结论。
- 图先于文字。多数段以图开头，推理段可以文字开头，随后在有帮助时配图。
- 首屏即答案：主图加一句结论。
- 画机制不画名称：标注请求穿过缓存的路径，胜过画一个标 "cache" 的方框。
- 每个数字都要有图。

四种 register（风格组合）对应不同内容类型：Instrument（评审指标）、Blueprint（架构）、Paper（概念阅读）、Editorial（复盘幻灯片）。SKILL.md 声明模型选 register 后从 `templates/page.html` 复制 token、kit CSS、scripts 与组件。交付方式按平台不同：Pi 走 `visual_explainer` `prepare`→`render`，MCP 走 render tools（默认 `open:false`），其他平台直接写文件。另有 quick mode（`render.mjs`）和 plan 渲染（`plan/render.mjs`）。

与 diagram-design 一样，坐标逐个手写；但 diagram-design 做单张图，visual-explainer 做整页叙述。

## diagram-design 的 39 个类型参考

按用途分组（`references/type-*.md` 共 39 个）：

| 组 | 类型 |
|---|---|
| 量化/空间/规划图（11） | `bar`、`line`、`scatter`、`sankey`、`treemap`、`radar`、`polar`、`venn`、`quadrant`、`pyramid`、`gantt` |
| 流程与决策（6） | `flowchart`、`process`、`swimlane`、`sequence`、`state`、`loop` |
| 结构与层次（7） | `tree`、`nested`、`layers`、`org-chart`、`dependency`、`uml-class`、`architecture` |
| 数据建模（2） | `er`、`db-schema` |
| 数据平台专用（5） | `high-level`、`data-flow`、`medallion`、`dp-integration`、`dp-security-matrix` |
| 基础设施（2） | `deployment`、`it-state` |
| 产品与规划（5） | `journey`、`story-map`、`kanban`、`timeline`、`wardley` |
| 分析（1） | `fishbone` |

这 11 项不是同一种轴图：`bar`/`line`/`scatter` 是连续轴，`sankey`/`treemap` 是量占比，`venn`/`quadrant`/`pyramid` 是空间关系，`gantt` 是时间区间。

示例侧比参考侧多：`assets/*.html` 共 155 个，去后缀得到 53 个基础类型，其中 47 个三变体齐全。14 项有示例但无专属 `type-*.md`，含 `beeswarm`、`bubble`、`bump`、`ridgeline`、`slopegraph`、`datalake`、`paved-road`、`policy-trace`、`queue` 等。

## diagram-design 的变体与皮肤

`SKILL.md` §10 的三个基线变体：

| 变体 | 文件模式 |
|---|---|
| Minimal light（默认） | `template.html`、`example-<type>.html` |
| Minimal dark | `template-dark.html`、`example-<type>-dark.html` |
| Full editorial | `template-full.html`、`example-<type>-full.html` |

另有 quadrant 专属的 Consultant special（`example-quadrant-consultant.html`）。

三项可选项不属于基线变体，性质各不相同：

- **Sketchy**：可叠加在任一变体上的手绘位移滤镜，不改布局
- **Terminal**：替代整页皮肤，自带 `terminal-*` token（`style-guide.md` 标为 `Terminal skin (opt-in alternate)`）
- **Animation**：可选展示层，`none`（默认）/`reveal`/`step`/`loop`

`primitive-icons.md`（24×24 单色图标库）与 `primitive-annotation.md`（编辑体旁注）是 primitive，不是皮肤。

风格 token 层：语义色角色 10 个（`accent` 每图最多 1–2 处），多系列图表专用 series 调色板 5 个，客户 profile 支持 `save`/`load`/`switch`/`list`/`show`/`update`/`reset`/`delete`。

## 坐标约定不是统一坐标空间

`template.html` 的 `viewBox` 是 `0 0 1000 600`，但示例按类型和尺寸各用不同值：`0 0 1000 500` 47 个、`0 0 1000 480` 13 个、`0 0 1000 600` 9 个、`0 0 1000 460` 6 个，还有 `0 0 1040 680`、`0 0 980 664` 等。

宽度约 1000 是共同约定，legend 与 source 基线一类的常量**不跨类型通用**。可复用的是模板与示例提供的坐标约定，不是一个统一坐标空间。

## 几何是 diagram-design 的裸露面

类型文档基本不给坐标脚手架：39 个 `type-*.md` 里坐标属性合计出现 49 次，集中在需要讲轴换算的图表类型，`quadrant`、`sankey`、`fishbone`、`uml-class`、`loop` 为 0 次。文档给的是文字约定，例如菱形出口不超过 3 个、合流点用 `r=4` 实心点。

ADR 0005 是该仓库自己的证据：架构图与泳道图共 **9 个已发布示例**带着 label mask 被后绘制节点覆盖的缺陷发布，`lint-skin.py`（查颜色字体）与 `self_check.py`（查 DOM 与 motion 契约）全部通过，原文写明两者都不读坐标，缺陷只在渲染时可见。修复靠 `verify-geometry.py` 解析 `<rect>` 坐标并按文档顺序判定，其形状启发式为节点 ≥ 60×40、mask 20–200 × 8–14（宽度上限原为 120，因 `example-sequence-oauth.html` 的等宽长条为 128 而放宽）。

该校验器不随 skill 分发。

archify 在同一处堵了两道：4 个类型的 schema 连坐标字段都不给；`text-fit.mjs` 的注释点名要关闭的失效模式正是「过长值静默压过邻居、校验仍报干净收据」。

但 archify 不是全自动布局——`grid.mjs` 首行自写 `Not auto-layout — fixed cell math only`，architecture 示例的每个组件都手写 `pos`。它自动的是路由、文字适配与几何检查。

## diagram-design 的反向校验设计

图表类型把数据用 `data-*` 属性声明在 SVG 里，例如 ridgeline 的 `data-baseline="320"` 与 `data-bins="0,1,6,17,21,14,8,6,7,9,7,4,0"`，`verify-ridgeline.py` 由此推出唯一振幅并核对每个顶点。

这是先手画、再声明数据、再验证一致性的反向路径，是该仓库最接近 diagram-as-code 的设计。方向与 schema→渲染相反，且同样不随 skill 分发。

## 选择

| 需求 | 选 |
|---|---|
| 架构图 / 流程图 / 时序图 / 数据流 / 状态机 | archify |
| 任何图表，或 archify 5 类之外的类型 | diagram-design（唯一选项） |
| 品牌 token、客户 profile、手绘/终端风格 | diagram-design |
| 读者需 pan/zoom/搜索/追踪链路，或导出 WebM | archify |
| 用 Markdown 草稿由 CLI 生成整页 | answer-me-with-html |
| 全手控整页叙述，figure-led 风格 | visual-explainer |
| 页面内评论与决策回传 agent | answer-me-with-html |
| 3Blue1Brown 风格解说视频 | answer-me-with-html（`am video`）|
| 手绘 SVG 动画场景播放器 | visual-explainer |

用 diagram-design 时补一步渲染反馈：出图后看一眼，或手动把仓库根的 `verify-geometry.py` 跑在自己的输出上。ADR 0005 那类缺陷渲染即可见，而随包检查恰好覆盖不到。

amwth 的设计目标是减少模型手写 HTML 所需 token。README 基准只覆盖 amwth 与手写 HTML 的对比（4893→612 token、31→12 秒），未测量与 diagram-design、visual-explainer 或 archify 的对照。

## 证据边界

- diagram-design 与 archify 结论来自源码、schema、示例与 ADR 直读 `[verified]`；两者未安装运行、未渲染任何输出，实际出图质量与失败率**未测量**
- archify 的 `validate`/`deliver`/`visual-check` 行为取自 `SKILL.md` 声明，未实跑验证 `[single-source]`
- archify 的「带类型 JSON + 渲染器校验计算路由」是作者模型与校验分层的直读事实，四者约束量多少未做对照实验，不作排序
- 全部计数为**目录实际文件计数**，不是 README 宣传数量。diagram-design 侧口径为浅克隆 HEAD `4451eadc484d76aa860edf3289c16fcd082dcdbf`：`references/type-*.md` 39 个、`assets/*.html` 155 个，基础类型 53 个由 `example-*.html` 去掉 `-dark`/`-full`/`-terminal`/`-animated` 后缀去重得出。archify 侧为本机安装的 v2.17：`schemas/` 6 个文件中只有 5 个是类型 schema，第 6 个是共享的 `common.schema.json`，所以可选 diagram 类型是 5 个而不是 6 个。
- amwth 结论来自安装版 0.5.0 的 SKILL.md 与 GitHub README + docs/reference.md 直读；本会话用 `am render` 渲染了 3 个页面成功产出 `[verified]`；README 基准数字（4893/612 token、31/12 秒）来自 README 自述，未独立复现 `[single-source]`
- visual-explainer 结论来自 v0.12.0 的 SKILL.md 直读；其 `references/` 目录（style-guide、diagrams、slides、video）未逐条直读，内部机制为 SKILL.md 声明 `[single-source]`
- 四个 skill 之间无运行时性能对照测量；选择建议基于作者模型与功能覆盖面的分析，不是基准测试

## See Also

- [视觉人机交互全景](../agent-interaction/visual-canvas-interaction-landscape.md) — 该文明确把「agent 生成图表交付给人看、人只看不动」判为出局；本文正是那一类被排除的工具。
- [Agent 产出结构化产物](../agent-interaction/agent-authored-structured-artifacts.md) — 产物能否被稳定寻址与增量修改。
- [mcp_excalidraw：给 Agent 一块活画布](../agent-interaction/mcp-excalidraw.md) — draw → look → adjust 的反馈闭环，正是本文两者都缺的那一步。
