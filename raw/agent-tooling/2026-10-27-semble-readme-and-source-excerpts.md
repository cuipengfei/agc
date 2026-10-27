# Semble README 与源码机制摘录

> Source: https://github.com/MinishLab/semble/blob/44b79754b5af5243328f65cb9f8923a55fe62f16/README.md; https://github.com/MinishLab/semble/blob/44b79754b5af5243328f65cb9f8923a55fe62f16/src/semble/index/bm25.py; https://github.com/MinishLab/semble/blob/44b79754b5af5243328f65cb9f8923a55fe62f16/src/semble/index/dense.py; https://github.com/MinishLab/semble/blob/44b79754b5af5243328f65cb9f8923a55fe62f16/src/semble/search.py
> Collected: 2026-10-27
> Published: Unknown

## 项目定位

README 首屏自述：

- “Fast and Accurate Code Search for Agents”
- “Uses ~99% fewer tokens than grep+read”
- “Semble is a code search library built for agents. It returns the exact code snippets they need instantly, using ~99% fewer tokens than grep+read.”
- “Indexing and searching a full codebase end-to-end takes under a second for most repos, matching the retrieval quality of a code-specialized transformer while indexing ~480x faster and querying ~23x faster”
- “Everything runs on CPU with no API keys, GPU, or external services.”

README 说明入口包括：

- MCP server：`search` 与 `find_related`
- CLI：`semble search`、`semble find-related`、`semble file-types`、`semble savings`、`semble clear`、`semble install`、`semble uninstall`
- Python library：`SembleIndex.from_path`、`from_git`、`merge`、`search`、`find_related`
- Agent 集成：MCP、AGENTS.md instructions、专用 `semble-search` sub-agent、skill

## README 中的工作原理

README “How it works” 原文摘录：

> “Semble splits each file into code-aware chunks using tree-sitter, then scores every query against the chunks with two complementary retrievers: static Model2Vec embeddings using the code-specialized potion-code-16M-v2 model for semantic similarity, and BM25 for lexical matches on identifiers and API names. The two score lists are fused with Reciprocal Rank Fusion (RRF).”

README 说明索引缓存与增量：

- “Indexes are cached to disk automatically on the first search.”
- “On subsequent runs, Semble walks the file tree and compares modification times; added, removed, or changed files are reindexed incrementally, without rebuilding the rest of the index.”
- “In MCP mode, the index is checked and refreshed automatically as files change, so results stay current across the session.”

README 说明模型：

- 默认模型为 `potion-code-16M-v2`。
- “Because the embedding model is static with no transformer forward pass at query time, all of this runs in milliseconds on CPU.”
- 可用 `SEMBLE_MODEL_NAME` 替换为另一个 Model2Vec-compatible 模型。

README 说明重排信号：

- symbol-like query 增加词法权重
- 定义所在 chunk 加分
- 标识符词干匹配加分
- 同文件多个 chunk 命中时文件整体加分
- test、`compat/`、`legacy/`、example code、`.d.ts` 降权

## 源码级核查

- 子代理核查 commit `44b79754b5af5243328f65cb9f8923a55fe62f16`。
- 切块目标约 750 字符；没有 grammar 时退化为按行切分。
- BM25 为项目自行实现，`k1=1.5, b=0.75`。
- 向量使用 Model2Vec 静态模型，256 维；`vicinity CosineBasicBackend` 使用 `normalize + dot + argpartition` 做精确余弦 top-k。
- 查询融合使用 RRF，`k=60`；之后有定义加分、路径惩罚、文件一致性等重排。
- 子代理报告：`uv.lock` 中没有 LSP / jedi / pyright / language-server 运行时依赖；核心检索代码没有 graph / caller / callee / edge / symbol_table 概念。
- 子代理报告：`openai / torch / transformers / sentence-transformers / tiktoken` 只出现在 benchmark extra；运行时没有 LLM 调用。
- 子代理报告：MCP 输出形状为 `{query, results:[{file_path,start_line,end_line,score,content}], repos}`。

## 边界与项目自述数字

- README 的 `~99% fewer tokens`、NDCG@10 0.855、索引约 240 ms、查询约 0.69 ms、480× 索引加速、23× 查询加速均为项目自述基准，本轮未独立复测。
- README 说明 token 节省估算方式：对每次调用记录命中文件总字符数与返回片段字符数，按 `(file chars − snippet chars) / 4` 估算。
- 子代理指出官方文档站 introduction 页写 `0.854 / 380× / 17×`，README 写 `0.855 / 480× / 23×`，两者口径不一致。
- 子代理指出单文件默认超过 1MB 跳过；`.json` / `.csv` 默认不索引，可通过 `!` 规则强制包含。
