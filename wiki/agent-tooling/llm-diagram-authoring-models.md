# LLM 出图的两种作者模型：diagram-design 与 archify

> Sources: cathrynlavery/diagram-design v2.6 源码（HEAD `4451eadc484d76aa860edf3289c16fcd082dcdbf`）; 本机 archify v2.17 源码
> Raw: [diagram-design 与 archify 源码取证](../../raw/agent-tooling/2026-09-04-diagram-design-vs-archify.md)
> Updated: 2026-09-04

## 判定

两者都产出内联 SVG 的自包含 HTML，但作者模型相反：

- **diagram-design**：LLM 手写 SVG。模板与示例给可复用的坐标约定，坐标本身逐个手写。
- **archify**：LLM 写带类型的 JSON，Node 渲染器算布局与路径并校验。

要 LLM 稳定出图，archify 更容易，且只覆盖 5 类系统图。要覆盖面和像素级编辑控制，只有 diagram-design。两者职责不重叠，可同时装。

## 作者模型对照

| 维度 | diagram-design | archify |
|---|---|---|
| 作者产物 | 内联 SVG | 带类型的 JSON |
| 坐标 | 每元素手写 | 4 个 schema 无 `pos` 字段；`architecture` 有 `pos` 且示例全部手写 |
| 连线路由 | 手写 `<line>` 端点 | `geometry.mjs` 1423 行 / 40 export，自动端口与 port spread |
| 文字度量 | 无，mask 宽度靠估 | 按字宽收缩字号（`text-fit.mjs` 49 行 / 4 export） |
| 随包校验 | `self_check.py`，查 DOM 与可访问性，不读坐标 | `validate`（9 项 showcase 检查、0 error、0 warning）+ `deliver`（冻结字节、SHA-256）+ `visual-check`（真浏览器） |
| 几何校验器 | 约 40 个 `verify-*.py`/`lint-*.py` 在仓库根，**不随 skill 分发** | 在包内，是必经流程 |
| 运行时 | Python 3 标准库 | Node |
| 常驻上下文 | SKILL.md 584 行 + 一个 type 参考 | SKILL.md 137 行 + 一个 schema + 一个示例 |

## archify 的 5 类

`architecture`（组件、服务、云/安全边界、基础设施）、`workflow`（流程、审批闸、runbook、CI/CD）、`sequence`（API 调用链、请求生命周期、异步 trace）、`dataflow`（pipeline、ETL/ELT、lineage、消费方）、`lifecycle`（状态迁移、重试、等待与终态）。

无图表类型。

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

用 diagram-design 时补一步渲染反馈：出图后看一眼，或手动把仓库根的 `verify-geometry.py` 跑在自己的输出上。ADR 0005 那类缺陷渲染即可见，而随包检查恰好覆盖不到。

## 证据边界

- 全部结论来自源码、schema、示例与 ADR 直读 `[verified]`
- 未安装、未运行任一生成流程、未渲染任何输出，因此两者的实际出图质量与失败率**未测量**
- archify 的 `validate`/`deliver`/`visual-check` 行为取自 `SKILL.md` 声明，未实跑验证 `[single-source]`
- 「archify 对 LLM 更容易」的依据是作者模型与校验分层，不是对照实验
- 全部计数为**目录实际文件计数**，不是 README 宣传数量。diagram-design 侧口径为浅克隆 HEAD `4451eadc484d76aa860edf3289c16fcd082dcdbf`：`references/type-*.md` 39 个、`assets/*.html` 155 个，基础类型 53 个由 `example-*.html` 去掉 `-dark`/`-full`/`-terminal`/`-animated` 后缀去重得出。archify 侧为本机安装的 v2.17：`schemas/` 6 个文件中只有 5 个是类型 schema，第 6 个是共享的 `common.schema.json`，所以可选 diagram 类型是 5 个而不是 6 个。

## See Also

- [视觉人机交互全景](../agent-interaction/visual-canvas-interaction-landscape.md) — 该文明确把「agent 生成图表交付给人看、人只看不动」判为出局；本文正是那一类被排除的工具。
- [Agent 产出结构化产物](../agent-interaction/agent-authored-structured-artifacts.md) — 产物能否被稳定寻址与增量修改。
- [mcp_excalidraw：给 Agent 一块活画布](../agent-interaction/mcp-excalidraw.md) — draw → look → adjust 的反馈闭环，正是本文两者都缺的那一步。
