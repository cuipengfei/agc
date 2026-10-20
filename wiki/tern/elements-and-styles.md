# Tern 视图元素与样式体系

> Sources: Stencil official Tern documentation（Elements、Styles 章节与 Reference › Glossary）, 2026-10-20
> Raw: [Scripts、Elements、Styles 官方摘录与调研笔记](../../raw/tern/2026-10-20-official-docs-scripts-elements-styles.md); [Concepts、Guides、Reference、Examples 官方摘录与调研笔记](../../raw/tern/2026-10-20-official-docs-concepts-guides-reference.md)
> Updated: 2026-10-20

## Overview

块与 lens 经 surface 协议绘制结构化视图：view 是 node 组成的树，node 形如 `{k, p, c}`，落在 block 视图的 `main` / `dock` / `layer` 三区之一。元素按 kind 分九族；样式由 Tern 自绘引擎接受的 CSS 子集描述，sheet 按固定 cascade 顺序叠加。

## 视图模型

- view：block 的 `view` 或 lens 的 `view` 返回值——block 返回若干 region 的 node，lens 返回一个 node。
- node：`{k = kind, p = props, c = children}`，用 `tern.ui` 构建。
- region：`main` 是块的区域，`dock` 是其下的一条，`layer` 在其上。

## kind 分族

九族清单与行为要点（调研笔记口径，定性）：

- 布局：col / row / card / section / rule / spacer。col 子节点多或超出视口时自动虚拟化；card 折叠状态按 key 本地记忆。
- 文本：text / md / code / diff / ansi / rows / math。md 支持 callouts、GFM 表、task lists、数学、mermaid、流式渲染与长文档虚拟化；code 长文虚拟化；ansi 只画视口行。
- 数据：kv / table / tree / badge / kbd / icon / image。
- 列表：list / item / tabs / picker。list 在大列表或 `virtual=true` 时池化虚拟行；picker 为数据驱动的模态玻璃 sheet。
- 动效：spinner / shimmer / elapsed / rate / progress / meter / chart / effort。
- 输入：editor / input。editor 是多行字段（vim mode chip、ghost text）；input 是单行。
- 框架：status / seg / toast / overlay。overlay 永不夺键盘。
- 工作：tool / agent / checklist / block / prefs。prefs 是设置页 kind：main 为全页、layer 为右侧 dock sheet。
- 裸元素：el，固定标签白名单。

## 文本与输入的行为模型

文本归程序所有：所有键盘先到 key handler；focus 走原始 op；native editing 按 hello features 开关；IME 在隐藏 textarea 中合成（调研笔记口径，定性）。

## 本地状态模式

折叠、树开合、el 控件翻转、Native/Raw 切换均按 key 在兄弟节点间记忆本地状态；程序发送不同 prop 才覆盖（调研笔记口径，定性）。

## 虚拟化

大列表与长内容只挂载可视区：col 子节点过多、md 与 code 长文、list 大列表都会自动虚拟化；ansi 只画视口行（调研笔记口径，定性；具体阈值未逐字核对）。

## span 与 tone

Span 是 node 中一段带样式的文本：`{t = text, s = style?}`。Tone 是 span、badge、row、segment 共用的语义色名——逐字区列举 `accent`、`success`、`warning`、`error`、`info`、`muted` 等；调研笔记补齐为九值：neutral / accent / info / success / warning / error / pending / muted / user（调研笔记口径），经 `data-tone` 落到 `--tc` 变量（调研笔记口径）。

## sheet 来源与 cascade

Tern 用自己的引擎绘制插件视图，接受一个定义的 CSS 子集加少量 Stencil 扩展。sheet 三种来源（逐字表）：

| Source | Sheet name | Scope |
| --- | --- | --- |
| Manifest `styles` | `plugin:<host>:<id>:styles`（本机为 `plugin:local:<id>:styles`） | Global author sheet |
| `tern.css(name, source)` | `plugin:local:<id>:<name>` | Global author sheet |
| A TSP program's surface sheets | `tsp:<scope>:<name>` | Confined to its surface |

cascade 顺序（逐字）：1. Tern 的 user-agent sheet；2. author rules（Tern 内建 sheets，然后插件 sheets），先按 specificity，再按 sheet 顺序，再按 sheet 内位置——插件 sheet 注册在 Tern 之后，等特异性下插件规则赢；3. 元素的 inline style；4. `!important` 声明按同样顺序再来一遍。

插件块的 surface 自带 `data-surface="plugin.<plugin>.<block>"` 属性；稳定样式挂钩为 `.sf-*`、`[data-id/role/tone]`、`[data-surface]`，inner class 版本间可变（调研笔记口径）。把插件 sheet 的选择器收在 `[data-surface="plugin.<插件>.<块>"]` 前缀下，即可把规则限制在单个插件 surface 内。

## 长度单位、数学函数与 at-rule

长度单位白名单：`px`、`em`、`vw`、`vh`、`%`、裸 `0`；`rem`、`ch`、`ex`、`lh`、`vmin`、`vmax`、`dvh`、`cm`、`pt` 等一律 rejected with `unsupported length unit`。`calc()` / `min()` / `max()` / `clamp()` 可用且可嵌套。`revert` / `revert-layer` 不支持。`@media` 仅支持 max-width / max-height（px）加三个偏好特性；`@import` / `@layer` / `@supports` / `@container` 等 at-rule 被拒绝（逐字）。

## 变量、palette 与 chat skin

变量三层（调研笔记口径）：kit 默认 → 主题内联 → 区域网格指标。程序 palette 在区域内联 `--sf-p-*` 变量并加 `.sf-pal` 类声明；Tern 对 palette 做对比度校正（调研笔记口径：正文 ≥4.5:1，静默 token 3:1，未逐字核对）；插件 surface 无 palette。chat skin（Reader / Spine / Console）作用于 inline 与 screen surface；flow 输出与 lens block 无皮肤（调研笔记口径）。

## 动画时钟

双时钟（调研笔记口径）：CSS keyframes 走文档时钟；`elapsed` / `rate` 走视图 tick（age 锚定）。reduce-motion 的停动级别细节在本批 raw 摘录中缺席。

## See Also

- [TSP 官方协议摘录](tsp-official-spec.md)
- [Tern 对象模型](object-model.md)
- [Tern 脚本与自动化面](scripting-surface.md)
