# graphify 0.9.100 extras 清单与可视化产物实测

> Source: 本机 `graphifyy` 0.9.100 安装包的 `pyproject.toml`、`uv-receipt.toml`；agc 仓库四个导出命令实测；`graphify/export.py` 与 networkx 3.7 `drawing/layout.py` 源码核对
> Collected: 2026-11-02
> Published: Unknown

## extras 全表（30 个，含 `all`）

| extra | 依赖 | 作用 |
|---|---|---|
| `mcp` | mcp、starlette、anyio | MCP 服务器（stdio 与 HTTP） |
| `pdf` | pypdf、markdownify | 读取 PDF 文档 |
| `watch` | watchdog | 文件变化监视，`graphify watch` 的前提 |
| `svg` | matplotlib、pillow、numpy | 生成 `graph.svg` |
| `office` | python-docx、openpyxl | 解析 .docx / .xlsx |
| `google` | openpyxl | 导出 Google Docs/Sheets 快捷方式（配合外部 `gws`） |
| `postgres` | psycopg[binary]、tree-sitter-sql | 从活的 PostgreSQL 提取 schema 与 FK 关系 |
| `video` | faster-whisper、av、yt-dlp | 音视频转写文本 |
| `leiden` | graspologic | 用 Leiden 替代默认 Louvain 做社区检测 |
| `neo4j` | neo4j | 导出 Cypher 或推送到 Neo4j |
| `falkordb` | falkordb | 导出 Cypher 或推送到 FalkorDB |
| `gemini` | openai、tiktoken | Gemini 语义后端 |
| `openai` | openai、tiktoken | OpenAI 及兼容自建端点 |
| `anthropic` | anthropic | Anthropic 及兼容网关 |
| `kimi` | openai、tiktoken | Kimi 后端 |
| `ollama` | openai | 本地 Ollama（走 OpenAI 兼容接口） |
| `bedrock` | boto3 | AWS Bedrock |
| `chinese` | jieba | 中文分词 |
| `sql` | tree-sitter-sql | SQL 语法 |
| `pascal` | tree-sitter-pascal | Pascal 语法 |
| `dm` | tree-sitter-dm | DM 语法 |
| `terraform` | tree-sitter-hcl | HCL / Terraform 语法 |
| `ocaml` | tree-sitter-ocaml | OCaml 语法 |
| `commonlisp` | tree-sitter-commonlisp | Common Lisp 语法 |
| `robot` | robotframework | Robot Framework（自带 parser） |
| `vbnet` | tree-sitter-vb-dotnet | VB.NET 语法 |
| `r` | tree-sitter-language-pack | R 语法 |
| `erlang` | tree-sitter-language-pack | Erlang 语法 |
| `solidity` | tree-sitter-solidity | Solidity 语法 |
| `all` | 上述合集 | 全部 |

核心包已内置 bash、C、C#、C++、Elixir、Fortran、Go、Groovy、Java、JavaScript、JSON、Julia、Kotlin、Lua、ObjC、PHP、PowerShell、Python、Ruby 等 grammar。

## 本机安装状态

`~/.local/share/uv/tools/graphifyy/uv-receipt.toml`：

```
requirements = [{ name = "graphifyy", extras = ["svg", "leiden", "mcp", "sql", "postgres", "chinese"] }]
python = "3.12"
entrypoints = ["graphify", "graphify-mcp"]
```

在该 venv 中可导入：`PIL`、`numpy`、`matplotlib`、`tree_sitter_sql`、`psycopg`、`graspologic`、`jieba`、`mcp`。`watchdog`、`pypdf`、`python-docx`、`openpyxl`、`faster-whisper`、`neo4j`、`falkordb`、`anthropic`、`openai`、`boto3`、`tiktoken` 均缺失。

## 四类可视化产物

| 产物 | 生成方式 | 形态 |
|---|---|---|
| `graphify-out/graph.html` | `update` / `cluster-only` / `export html` 自动写 | vis-network 交互图：节点搜索、社区着色、悬停详情、缩放拖动、亮/暗/系统三主题 |
| `graphify-out/GRAPH_TREE.html` | `graphify tree` | D3 v7 可折叠树，按文件系统层级展开，节点出边检查器 |
| `<project>-callflow.html` | `graphify export callflow-html` | Mermaid 分节架构/调用流 |
| `graphify-out/graph.svg` | `graphify export svg` | matplotlib 静态矢量图 |

非图形导出：`export obsidian`（vault + canvas）、`export wiki`、`export graphml`、`export neo4j`、`export falkordb`。

## agc 仓库实测（2026-11-02，刷新后 9663 节点 / 11513 边 / 937 社区）

| 命令 | 耗时 | 产物大小 | 输出要点 |
|---|---|---|---|
| `graphify export html` | 0.32 秒 | 818 KB | `Graph has 9663 nodes (above 5000 limit). Building aggregated community view...`，聚合为 937 社区节点 + 1276 跨社区边 |
| `graphify tree --label agc` | 0.28 秒 | 837.6 KB | `wrote graphify-out/GRAPH_TREE.html` |
| `graphify export callflow-html --lang zh-CN` | 1.85 秒 | — | `Sections: 17 | Mermaid diagrams: 16 | Call tables: 15`，警告大图渲染可能慢、建议 `--max-sections 5` |
| `graphify export svg`（第一次） | 3 分 24 秒后失败 | 未生成 | mathtext ParseException |
| `graphify export svg`（关闭 mathtext 后） | 265 秒 | 26.0 MB | `graph.svg written - embeds in Obsidian, Notion, GitHub READMEs`，伴随大量 CJK 字形缺失警告 |

聚合阈值：`export html` 的 `--node-limit` 默认 5000，超过时折叠为社区级视图。当前 9663 节点触发聚合。

## graph.html 与 GRAPH_TREE.html 的外部依赖

- `graph.html` 仅引用 `https://unpkg.com/vis-network@9.1.6/standalone/umd/vis-network.min.js`。
- `GRAPH_TREE.html` 引用 `https://d3js.org/d3.v7.min.js`。
- 两者都没有内联脚本回退。CDN 不可达时网络图区域无法初始化，页面其余控件（标题、统计、搜索框、主题按钮）仍会显示。

## export svg 的 mathtext 崩溃与绕过

第一次运行报错原文（节选）：

```
ValueError:
B. 假 key（Bearer $$BEARERTOKEN_LK9CT9SKQIFY:L$$，合成占位符），model=jev-1.13-free —— 401
                ^
ParseException: Expected end of text, found '$'  (at char 16), (line:1, col:17)
```

`to_svg()`（`export.py:1403-1471`）把节点标签原样交给 matplotlib 绘制，默认 `text.parse_math=True` 会把 `$...$` 当作数学公式解析。仓库中存在带 `$$` 的文档节点标签，直接触发 ParseException。

绕过方式：编写 matplotlibrc 设 `text.parse_math : False`，通过 `MATPLOTLIBRC` 指向该目录，不修改安装包。matplotlib 3.11.2 支持该 rcParam。

第二次运行成功但产生大量 `UserWarning: Glyph ... missing from font(s) DejaVu Sans`，中文标签在 SVG 中显示为缺失字形。

## 布局耗时归因

`to_svg()` 调用 `nx.spring_layout(G, seed=42, k=2.0/(G.number_of_nodes()**0.5+1))`（`export.py:1431`）。

networkx 3.7 的 `spring_layout` 默认 `method='auto'`，`len(G) < 500` 用 `force`，否则用 `energy`（`networkx/drawing/layout.py:591-592`）；9663 个节点因此走 `_energy_fruchterman_reingold`（同文件 765-768、816 起）。`iterations` 默认 50，为上限。energy 实现按节点对批量计算距离，成本随节点数二次增长；按 n²×50 估算的成对计算量在十亿量级，这是估算而非计数实测。可核实的数字只有实测耗时：第一次 3 分 24 秒后崩溃，第二次 265 秒成功。

对比同期三个产物：`export html` 0.32 秒、`tree` 0.28 秒、callflow 1.85 秒，三者都只遍历图、不做布局求解。
