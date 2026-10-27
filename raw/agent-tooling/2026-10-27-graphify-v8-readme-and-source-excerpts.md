# Graphify v8 README 与核心源码摘录

> Source: https://github.com/Graphify-Labs/graphify/blob/dac063456bc1f5d92354ec3936fd9dd1513a83f3/README.md; https://github.com/Graphify-Labs/graphify/blob/dac063456bc1f5d92354ec3936fd9dd1513a83f3/graphify/serve.py; https://github.com/Graphify-Labs/graphify/blob/dac063456bc1f5d92354ec3936fd9dd1513a83f3/graphify/extract.py; https://github.com/Graphify-Labs/graphify/blob/dac063456bc1f5d92354ec3936fd9dd1513a83f3/graphify/cluster.py
> Collected: 2026-10-27
> Published: Unknown

## 项目定位

README v8 自述：

- “Type `/graphify` in your AI coding assistant and it maps your entire project (code, docs, PDFs, images, videos) into a knowledge graph you can query instead of grepping through files.”
- “Code is parsed with tree-sitter AST: deterministic, no LLM, nothing leaves your machine. (Docs, PDFs, images and video use your assistant's model, or a configured API key, for a semantic pass.)”
- “Every edge is explained. Each connection is tagged `EXTRACTED` (explicit in the source) or `INFERRED` (resolved by graphify)”
- “Not a vector index. No embeddings, no vector store: a real graph you traverse.”
- 本地产物为 `graphify-out/graph.html`、`GRAPH_REPORT.md`、`graph.json`。
- 支持 CLI、`/graphify` skill 和 MCP。README 的 MCP 工具说明在其他版本中列出 `query_graph` 等工具；子代理在 v8 源码 `serve.py:2303-2422` 核查到 10 个 MCP 工具：`query_graph`、`get_node`、`get_neighbors`、`get_community`、`god_nodes`、`graph_stats`、`shortest_path`、`list_prs`、`get_pr_impact`、`triage_prs`。

## README 中的能力表

- “God nodes: The most-connected concepts”
- “Communities: The graph split into subsystems (Leiden), with LLM-free labels”
- “Cross-file links: `calls` / `imports` / `inherits` / `mixes_in` resolved across ~40 languages via tree-sitter AST”
- “Query, path, explain: Ask a question, trace the path between two things, or explain one concept, all against `graph.json`”
- “Rationale + doc refs: `# NOTE:` / `# WHY:` comments and ADR/RFC citations become first-class nodes linked to the code”
- “Beyond code: Docs, PDFs, images, and video/audio all map into the same graph”
- “Local-first: Code is parsed locally with tree-sitter (no LLM, nothing leaves your machine); only the semantic pass over docs/media calls a backend, and only if you configure one”

## 查询机制

子代理核查 `graphify/serve.py`：

- `_search_tokens` 负责分词；`_query_terms` 处理停用词；`_compute_idf` 计算 IDF；字符 trigram 用于候选预筛。
- `_score_query` 使用“精确 +1000 / 前缀 +100 / 子串 +1”的分级匹配，乘以 IDF 与覆盖率平方。
- `_pick_seeds` 选择种子节点；`_bfs` / `_dfs` 进行图遍历；度数达到 p99（最高 50）的 hub 不作为中转节点展开。
- `_query_graph_text` / `_render_query` 将子图按 token 预算渲染为文本；CLI `query` 与 MCP `query_graph` 共用实现。
- `path` 使用 NetworkX `shortest_path`。
- `explain` 返回节点详情、社区、度数与逐条关系。

子代理强调：查询路径没有 BM25，没有向量检索，也没有模型调用；最终自然语言回答由宿主 AI 助手完成。

## 建图与 LLM 边界

子代理核查 `graphify/extract.py`：

- `_DISPATCH` 覆盖 117 个后缀、56 个不同 `extract_*` 提取器。
- 代码文件通过 Tree-sitter 逐文件 AST 提取节点与边；SQL、配置、Terraform、清单文件使用对应结构化提取器。
- `# NOTE:` / `# WHY:` / `# HACK:` 等注释和 docstring 会成为 `file_type=rationale` 的节点。
- 代码提取路径没有导入 `graphify.llm`。

子代理核查 `graphify/llm.py`：

- 非代码材料的语义提取会输出带 `EXTRACTED / INFERRED / AMBIGUOUS` 标记的 JSON 片段。
- 输入包在 `<untrusted_source>` 中做提示注入隔离。
- 社区命名可由模型覆盖；默认社区命名按最高度数 hub，确定性完成。
- `--dedup-llm` 只仲裁 Jaro-Winkler 相似度灰区。
- `prs --triage` 使用模型排序评审队列。

子代理核查 `graphify/cluster.py`：

- 社区检测三级回退：`graspologic_native.leiden` → `graspologic.partition.leiden` → `networkx` Louvain。
- 超大社区（>25% 且 ≥10 节点）二次 Leiden 拆分；低内聚社区（<0.05 且 ≥50 节点）再拆。
- 默认 hub 命名无 LLM；配置 backend 后模型名称才可能覆盖。

## 边界

- README 明确 “No embeddings, no vector store”。
- 子代理在产品 Python 代码中检索 `bm25` 为 0；BM25 只出现在 benchmark 对照说明中。
- 子代理在产品 Python 代码中检索向量库与 embedding 相关词，命中均为 `tokenomics`、Go 接口嵌入或字符串嵌入说明，未见向量检索实现。
- README 的 benchmark 数字为项目自述；子代理报告 v8 仓库没有 `memory/` 与 `crosstool/` 目录，复现 harness 不在仓库内。
- 子代理记录所查 commit 为 `dac063456bc1f5d92354ec3936fd9dd1513a83f3`，包版本 `graphifyy 0.9.96`。
