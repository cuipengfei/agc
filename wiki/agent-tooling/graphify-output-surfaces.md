# graphify 的图谱产物形态与导出限制

> Sources: graphify 0.9.100 extras 与可视化产物实测, 2026-11-02
> Raw: [graphify 0.9.100 extras 清单与可视化产物实测](../../raw/agent-tooling/2026-11-02-graphify-extras-and-visual-outputs.md)
> Updated: 2026-11-02

## Overview

`graphify-out/` 下面向人看的产物有四类：交互网络图 `graph.html`、折叠树 `GRAPH_TREE.html`、Mermaid 调用流 `<project>-callflow.html`、静态矢量图 `graph.svg`。只有第一类会在每次重建时自动刷新，其余三类各自需要一条导出命令。四类都直接读同一份 `graph.json`，因此都可以离线生成，不依赖构建期网络（HTML 的渲染脚本除外）。

## 四类产物

| 产物 | 命令 | 形态 | 自动刷新 |
|---|---|---|---|
| `graph.html` | `update` / `cluster-only` / `export html` | vis-network 交互图：节点搜索、社区着色、悬停详情、缩放拖动、亮/暗/系统三主题 | 是 |
| `GRAPH_TREE.html` | `graphify tree` | D3 v7 可折叠树，按文件系统层级展开，节点出边检查器 | 否 |
| `<project>-callflow.html` | `graphify export callflow-html` | Mermaid 分节架构/调用流 | 否 |
| `graph.svg` | `graphify export svg` | matplotlib 静态矢量图 | 否 |

另有面向机器的导出：`export obsidian`（每节点一页 vault + canvas）、`export wiki`、`export graphml`、`export neo4j`、`export falkordb`。

## graph.html 的聚合阈值

`export html` 的 `--node-limit` 默认 5000。超过阈值的图会折叠成社区级视图：agc 仓库 9663 个节点变成 937 个社区节点加 1276 条跨社区边，导出耗时 0.32 秒。要看节点级全貌，把 `--node-limit` 提高到实际节点数以上，或者走 `export obsidian`。

`export html` 在 9663 节点上的耗时是 0.32 秒，产物 818 KB；`graphify tree` 全部输出 837.6 KB，耗时 0.28 秒；`export callflow-html --lang zh-CN` 耗时 1.85 秒，产出 17 节、16 张 Mermaid 图、15 张调用表。三者都只遍历图，不做布局求解。

## 外部依赖

`graph.html` 只引用 `https://unpkg.com/vis-network@9.1.6/standalone/umd/vis-network.min.js`；`GRAPH_TREE.html` 引用 `https://d3js.org/d3.v7.min.js`。两者都没有内联脚本回退。CDN 不可达时网络图区域无法初始化，页面其余控件（标题、统计、搜索框、主题按钮）仍会显示。

## export svg 的 mathtext 缺陷

`to_svg()`（`export.py:1403-1471`）把节点标签原样交给 matplotlib 绘制，默认 `text.parse_math=True` 会把 `$...$` 当数学公式解析。图谱中存在带 `$$` 的文档节点标签时，导出在完成布局后崩溃：

```
ParseException: Expected end of text, found '$'  (at char 16), (line:1, col:17)
```

绕过方式：写一个 matplotlibrc 设 `text.parse_math : False`，用 `MATPLOTLIBRC` 指向该目录，不改安装包。matplotlib 3.11.2 支持该 rcParam。修好公式解析后仍会出现大量 `UserWarning: Glyph ... missing from font(s) DejaVu Sans`，中文标签在 SVG 中显示为缺失字形。

## 布局耗时

`to_svg()` 调用 `nx.spring_layout(G, seed=42, k=2.0/(G.number_of_nodes()**0.5+1))`。networkx 3.7 的 `spring_layout` 默认 `method='auto'`，节点数小于 500 用 `force`，否则用 `energy`；9663 个节点走 energy 实现，按节点对批量计算距离，成本随节点数二次增长，`iterations` 默认 50 为上限。

实测可核实的数字：第一次导出 3 分 24 秒后因 mathtext 崩溃，第二次 265 秒成功，产物 26.0 MB。n²×50 的成对计算量只是估算，没有计数实测。

## 打开方式

产物是自包含 HTML，直接浏览器打开，不需要服务器。WSL2 下用 `wslview graphify-out/graph.html` 或 `explorer.exe`。

## See Also

- [graphifyy 工作机制](graphify-mechanics.md)
- [codegraph 与 graphify 的分工边界](codegraph-vs-graphify.md)
