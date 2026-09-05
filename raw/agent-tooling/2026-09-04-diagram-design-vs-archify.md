# diagram-design 与 archify 源码取证

> Source: 本机直读两个 skill 包源码
> - `cathrynlavery/diagram-design` — `https://github.com/cathrynlavery/diagram-design`，浅克隆 HEAD `4451eadc484d76aa860edf3289c16fcd082dcdbf`
> - `archify` — 本机 `~/.agents/skills/archify`，`metadata.version: "2.17"`，`author: tt-a1i`，`based_on: Cocoon-AI/architecture-diagram-generator (MIT, v1.0)`
> Collected: 2026-09-04
> Published: Unknown

全部条目来自源码、schema、示例文件与 ADR 直读。未做安装、未运行两者的生成流程、未渲染任何输出。

---

## 1. diagram-design：作者模型

`skills/diagram-design/SKILL.md`，`metadata.version: "2.6"`，584 行。

`assets/template.html` 的 SVG 主体为空，仅含 CSS 变量、三个 `<marker>` 定义、背景 `<rect>`，然后是注释：

```
<!-- Draw arrows first, then nodes. Replace with your content. -->
```

`assets/example-flowchart.html` 的连线为逐条硬编码坐标，例：

```
<line x1="500" y1="88" x2="500" y2="120" .../>
```

并带人工注释如 `<!-- Diamond 1 "YES" down -->`。

`SKILL.md` §10 "Templates & Variants" 原文给出的变体表：

| Variant | File pattern |
|---|---|
| **Minimal light** (default) | `assets/template.html`, `example-<type>.html` |
| **Minimal dark** | `assets/template-dark.html`, `example-<type>-dark.html` |
| **Full editorial** | `assets/template-full.html`, `example-<type>-full.html` |
| **Consultant special** (quadrant only) | `example-quadrant-consultant.html` |

同节对另外三项的定位原文：

- Sketchy：`**Sketchy variant** (optional, applied to any of the above)`
- Terminal：`**Terminal variant** (optional, replaces any of the above)`
- Animation：`**Animation** (optional presentation layer)`，模式为 `none`（默认）、`reveal`、`step`、`loop`

`references/primitive-sketchy.md`（43 行）自述：`Optional displacement filter that wobbles every stroke and edge slightly — turns any minimal variant into a hand-drawn "editorial" register without changing layout.`

`references/primitive-terminal.md`（76 行）自述：`Optional full-page skin that wraps any diagram in a fake terminal window`。

`references/primitive-icons.md`（827 行）自述：`A monochrome 24×24 icon library for IT/cloud diagrams.`

`references/primitive-annotation.md`（36 行）自述：`Use for editorial asides`。

## 2. diagram-design：类型与示例清点

- `references/type-*.md`：39 个
- `assets/*.html`：155 个
- 从 `example-*.html` 去掉 `-dark`/`-full`/`-terminal`/`-animated` 后缀得到的基础类型：53 个
- 同时具备无后缀 / `-dark` / `-full` 三个文件的类型：47 个
- 有示例但无专属 `type-*.md` 的 14 项：`beeswarm`、`bubble`、`bump`、`datalake`、`high-level-vertical`、`import-drawio`、`import-mermaid`、`paved-road`、`policy-trace`、`quadrant-consultant`、`queue`、`ridgeline`、`sequence-oauth`、`slopegraph`
- 有 `type-*.md` 但无示例的：0 项
- 模板文件 5 个：`template.html`、`template-dark.html`、`template-full.html`、`template-motion.html`、`template-terminal.html`

39 个 `type-*.md` 的名称：`architecture`、`bar`、`data-flow`、`db-schema`、`dependency`、`deployment`、`dp-integration`、`dp-security-matrix`、`er`、`fishbone`、`flowchart`、`gantt`、`high-level`、`it-state`、`journey`、`kanban`、`layers`、`line`、`loop`、`medallion`、`nested`、`org-chart`、`polar`、`process`、`pyramid`、`quadrant`、`radar`、`sankey`、`scatter`、`sequence`、`state`、`story-map`、`swimlane`、`timeline`、`tree`、`treemap`、`uml-class`、`venn`、`wardley`

## 3. diagram-design：坐标空间不统一

`assets/template.html` 的 `viewBox` 为 `0 0 1000 600`。

`example-*.html` 的 `viewBox` 分布（前 8）：

| viewBox | 文件数 |
|---|---|
| `0 0 1000 500` | 47 |
| `0 0 1000 480` | 13 |
| `0 0 1000 600` | 9 |
| `0 0 1000 460` | 6 |
| `0 0 1040 680` | 4 |
| `0 0 980 664` | 3 |
| `0 0 1000 420` | 3 |
| `0 0 1032 540` | 3 |

抽样确认：`example-architecture.html` 为 `0 0 1000 480`，`example-bar.html` 与 `example-line.html` 为 `0 0 1000 500`，`example-sankey.html` 为 `0 0 1000 560`，`example-swimlane.html` 为 `0 0 1000 480`。

## 4. diagram-design：类型文档里的坐标脚手架密度

对 39 个 `references/type-*.md` 统计形如 `x=`/`y=`/`x1=`/`y1=` 后接数字的属性出现次数，合计 49 次，集中在需要讲轴换算的图表类型；`quadrant`、`sankey`、`fishbone`、`uml-class`、`loop` 为 0 次。

`references/type-line.md` 含节奏与刻度换算的文字规则（如 nice-number 取整、像素换算）；`references/type-flowchart.md` 为纯文字约定，例如椭圆 `rx=20` 表示起止、菱形为判断且出口不超过 3 个、合流点用 `r=4` 的实心点。

## 5. diagram-design：脚本分层

随 skill 分发的 `skills/diagram-design/scripts/` 只有 3 个：`self_check.py`、`mermaid_extract.py`、`drawio_extract.py`。

`SKILL.md` §11 的导入规则原文包含 `Extract, don't render` 与 `Redraw — never convert`。

仓库根 `scripts/` 另有约 40 个 `verify-*.py` / `lint-*.py` 及其配对测试，其中包括 `verify-geometry.py`、`verify-sankey.py`、`verify-treemap.py`、`verify-polar.py`、`verify-bump.py`、`verify-ridgeline.py`、`verify-slopegraph.py`、`verify-beeswarm.py`、`verify-bubble.py`、`verify-dumbbell.py`、`lint-skin.py`、`lint-render.py`。这些文件不在 `skills/diagram-design/` 目录内。

## 6. diagram-design：ADR 0005 原文摘录

`docs/adr/0005-label-geometry-is-verified.md`：

> label mask that lands partly inside a node is covered by the node fill: the text renders as a

> Nine shipped examples across two types (architecture, swimlane) had shipped this way. Every
> existing gate passed on all of them — `lint-skin.py` checks colors, fonts, and the accessible
> SVG contract; `self_check.py` checks DOM structure and the motion contract; neither reads
> coordinates. The defect is only visible when the file is rendered, so it survived review in

> 2. The rule is enforced by `scripts/verify-geometry.py`, which parses `<rect>` coordinates and
> reports a mask that overlaps a node **declared later in the document**. Document order is
> the criterion, not overlap alone

> - The heuristics are shape-based (node ≥ 60×40, mask 20–200 × 8–14) and match the shipped

> (The width cap was originally 120; the long mono plates in example-sequence-oauth.html
> are 128 wide and fell outside the window, so every mask past 120 — including the wider

## 7. diagram-design：data-* 反向校验

`assets/example-ridgeline*.html` 中的路径带数据声明属性，例：

```
<path data-ridge="checkout-api" data-baseline="320" data-bins="0,1,6,17,21,14,8,6,7,9,7,4,0"
      d="M320,320 L350,317.6 L380,305.6 ..." />
```

`scripts/verify-ridgeline.py` 从 `data-bins` 推出唯一振幅并核对每条 ridge 的顶点。该脚本位于仓库根 `scripts/`，不随 skill 分发。

## 8. diagram-design：风格 token

`references/style-guide.md`（160 行）定义语义色角色 10 个：`paper`、`paper-2`、`ink`、`muted`、`soft`、`rule`、`rule-solid`、`accent`、`accent-tint`、`link`。原文注明 `accent` 用途为 `Focal / 1–2 max per diagram`。

多系列图表专用 series 调色板 5 个：`series-1` sage `#7c8f6f`、`series-2` dusty-blue `#5e7a9b`、`series-3` mustard `#b8915a`、`series-4` rust-brown `#9c6b50`、`series-5` slate `#6e6479`。

Terminal skin 段标题原文为 `Terminal skin (opt-in alternate)`，含 `terminal-page` `#0a0a0a`、`terminal-paper` `#141414`、`terminal-bar` `#1b1b1b`、`terminal-border` `#2b2b2b`、`terminal-ink` `#f5f5f5` 等 token。

`references/profiles.md`（183 行）定义客户 profile 的动词流程：`save`、`load`、`switch`、`list`、`show`、`update`、`reset`、`delete`，按项目 marker 解析。

## 9. diagram-design：多宿主插件形态

仓库含 4 份插件 manifest：`.claude-plugin/plugin.json`、`.codex-plugin/plugin.json`、`.factory-plugin/plugin.json`、`.agents/plugins/marketplace.json`，共享同一 plugin root（`docs/adr/0008`）。`commands/` 与 `prompts/` 各含同 5 个 slash command 的两种宿主格式。`docs/adr/` 共 9 条 ADR。

仓库无 `package.json`、无 `Makefile`、无 `pyproject.toml`；脚本为 Python 3 标准库。

`references/onboarding.md` 指从网站/设计系统提取品牌 token，与代码库 onboarding 无关。

---

## 10. archify：作者模型

`~/.agents/skills/archify/SKILL.md`，137 行。首段原文：

> Create a self-contained, interactive HTML diagram from a small typed JSON specification.

Type router 表列出 5 个类型：`architecture`、`workflow`、`sequence`、`dataflow`、`lifecycle`。

`schemas/` 共 6 个文件：5 个类型 schema（`architecture`、`workflow`、`sequence`、`dataflow`、`lifecycle`）加 1 个共享的 `common.schema.json`。可选的 diagram 类型只有 5 个。

`examples/` 共 14 个 JSON，按 `<slug>.<type>.json` 命名，按类型分布为 architecture 5（`brand-aware-delivery`、`checkout-platform.base`、`checkout-platform.head`、`production-deployment`、`web-app`）、workflow 3、sequence 2、dataflow 2、lifecycle 2。

## 11. archify：schema 中的坐标字段

对 5 个类型 schema 检查 `"pos"` 字段是否存在：

| schema | 含 `pos` |
|---|---|
| `architecture.schema.json` | 是 |
| `workflow.schema.json` | 否 |
| `sequence.schema.json` | 否 |
| `dataflow.schema.json` | 否 |
| `lifecycle.schema.json` | 否 |

`examples/` 中的 architecture 示例，其 `components[]` 每一项都写有 `pos`。

`renderers/architecture/grid.mjs`（62 行，4 个 export）首行注释原文：

```
/** Grid placement for architecture IR (#8). Not auto-layout — fixed cell math only. */
```

## 12. archify：几何与文字适配由代码承担

`renderers/shared/geometry.mjs`：1423 行，40 个 export。头部注释原文：

```
// Geometry helpers shared by all typed renderers. Every function here is
// pure; renderers own their layout tables and pass measured rects
// ({x, y, width, height, cx, cy}) in.
```

`renderers/shared/text-fit.mjs`：49 行，4 个 export。头部注释原文：

```
// Single-line node text fitting, shared by every renderer.
//
// Node text (`label`, `sublabel`, `tag`) renders as one <text> element with
// text-anchor="middle" and is never wrapped. Left unmeasured, an over-long
```

`SKILL.md` 提到 Automatic Port Spread 为 architecture、workflow、data-flow、lifecycle 的默认渲染器行为，且原文写明它会跳过显式 `via`、`channelX`、`channelY`、`labelAt` 或非 `auto` 路由；自动路由不得产生小于 8px 的线段或小于 16px 的内转角；architecture 另在偏移小于 16px 时把对向自动端口对齐到同一轴。

## 13. archify：校验与交付命令

`SKILL.md` 给出的三条命令：

```bash
node bin/archify.mjs validate <type> <candidate.json> --quality showcase --json
node bin/archify.mjs deliver <type> <candidate.json> <output.html> --quality showcase --json
node bin/archify.mjs visual-check <output.html> --json
```

原文对验收门槛的规定：

> A receipt with only 4 artifact checks is basic validation, never showcase acceptance. A showcase pass must report all 9 artifact checks with 0 composition errors and 0 warnings.

`deliver` 的行为原文：

> Delivery freezes the exact specification bytes into a private same-directory snapshot, renders and checks that snapshot, atomically commits the HTML, and reports SHA-256 plus byte counts for both specification and artifact.

三种证据的界限原文：

> Keep the three claims separate: `deliver` proves deterministic artifact checks, `visual-check` proves bounded behavior in a real browser, and perceptual visual review requires an actual human or image-capable reviewer.

## 14. archify：作者约束

- 首个候选起手规模原文：`at most 12 primary nodes`
- 交付前需在真实 HTML 上检查的桌面视口：`1440×900`、`1600×1000`、`1920×1080`，面向大屏时另加 `2048×1320`
- 每个视口需满足 `document.documentElement.scrollWidth <= window.innerWidth` 与 `scrollHeight <= window.innerHeight`
- 原文禁止用 `overflow: hidden`、裁切内容、内部滚动条、拉伸 SVG 高度或缩小字号来伪造通过
- 新 workflow 使用 `schema_version: 2`；保留 `schema_version: 1` 仅用于维持既有 workflow 的固定几何
- 原文限制读取时机：`Do not read renderers/shared/geometry.mjs, renderer source, validator source, tests, or benchmarks before the first candidate.`
- `meta.animation: "trace"` 为 opt-in；`meta.views` 可选且建议不超过 5 个 chapter
- Mermaid 输入映射：`flowchart`/`graph` → `workflow` 或 `architecture`，`sequenceDiagram` → `sequence`，`stateDiagram` → `lifecycle`；原文要求读取拓扑与语义后重新编写 archify JSON，而非机械渲染 Mermaid 样式

## 15. 两侧包体与常驻规模

| 项 | diagram-design | archify |
|---|---|---|
| SKILL.md 行数 | 584 | 137 |
| 版本 | 2.6 | 2.17 |
| 运行时 | Python 3 标准库 | Node |
| 随包脚本 | 3 个 | `bin/archify.mjs` + `renderers/` + `scripts/check-update.mjs` |

`archify/SKILL.md` 另定义 `scripts/check-update.mjs` 的更新提示流程，原文强调 `The notice is information, not permission`，且该 v0.1 流程从不下载、安装或执行更新。
