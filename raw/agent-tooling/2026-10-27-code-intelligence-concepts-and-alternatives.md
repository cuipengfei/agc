# 代码智能相关概念与相邻方案摘录

> Source: https://microsoft.github.io/language-server-protocol/; https://tree-sitter.github.io/tree-sitter/; https://arxiv.org/abs/2005.11401; https://microsoft.github.io/graphrag/; https://oraios.github.io/serena/01-about/000_intro.html; https://sourcegraph.com/docs/api/mcp; https://github.com/DeusData/codebase-memory-mcp; https://github.com/abhigyanpatwari/GitNexus; https://github.com/tirth8205/code-review-graph; https://github.com/zilliztech/claude-context; https://github.com/vitali87/code-graph-rag
> Collected: 2026-10-27
> Published: Unknown

## LSP

官方页面原文：

> “The Language Server Protocol (LSP) defines the protocol used between an editor or IDE and a language server that provides language features like auto complete, go to definition, find all references etc.”

> “A Language Server is meant to provide the language-specific smarts and communicate with development tools over a protocol that enables inter-process communication.”

> “The idea behind the Language Server Protocol (LSP) is to standardize the protocol for how such servers and development tools communicate.”

官方页面还提到 LSIF：

> “The goal of the Language Server Index Format (LSIF, pronounced like \”else if\“) is to support rich code navigation in development tools or a Web UI without needing a local copy of the source code.”

## Tree-sitter

官方介绍原文：

> “Tree-sitter is a parser generator tool and an incremental parsing library. It can build a concrete syntax tree for a source file and efficiently update the syntax tree as the source file is edited.”

官方目标：

- “General enough to parse any programming language”
- “Fast enough to parse on every keystroke in a text editor”
- “Robust enough to provide useful results even in the presence of syntax errors”
- “Dependency-free so that the runtime library ... can be embedded in any application”

## RAG

arXiv 2005.11401 题为 “Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks”。摘要原文：

> “We explore a general-purpose fine-tuning recipe for retrieval-augmented generation (RAG) -- models which combine pre-trained parametric and non-parametric memory for language generation.”

> “We introduce RAG models where the parametric memory is a pre-trained seq2seq model and the non-parametric memory is a dense vector index of Wikipedia, accessed with a pre-trained neural retriever.”

这说明 RAG 的关键在于检索到的内容参与后续语言生成；原始论文的检索器使用 dense vector index，但该概念本身不强制向量检索。

## GraphRAG

Microsoft GraphRAG 官方首页原文：

> “GraphRAG is a structured, hierarchical approach to Retrieval Augmented Generation (RAG), as opposed to naive semantic-search approaches using plain text snippets.”

> “The GraphRAG process involves extracting a knowledge graph out of raw text, building a community hierarchy, generating summaries for these communities, and then leveraging these structures when perform RAG-based tasks.”

Indexing overview 原文：

- “extract entities, relationships and claims from raw text”
- “perform community detection in entities”
- “generate community summaries and reports at multiple levels of granularity”
- “embed text into a vector space”

## Serena

官方介绍原文：

> “Serena provides essential semantic code retrieval, editing, refactoring and debugging tools that are akin to an IDE's capabilities, operating at the symbol level and exploiting relational structure.”

> “Serena's agent-first tool design involves robust high-level abstractions, distinguishing it from approaches that rely on low-level concepts like line numbers or primitive search patterns.”

> “Serena can extend the functionality of your existing AI client via the model context protocol (MCP).”

> “Serena provides the necessary tools for coding workflows, but an LLM is required to do the actual work, orchestrating tool use.”

## Sourcegraph MCP

官方文档原文：

> “The Sourcegraph Model Context Protocol (MCP) Server provides AI agents and applications with programmatic access to your Sourcegraph instance's code search, navigation, and analysis capabilities through a standardized interface.”

- `/.api/mcp`：Core Sourcegraph search, repository, history, and Deep Search reading tools
- `/.api/mcp/all`：Full suite of Sourcegraph tools
- `/.api/mcp/deepsearch`：Deep Search agent tools only
- 支持 OAuth 2.0 / Dynamic Client Registration / access token。
- 文档列出的导航工具包括 `go_to_definition`、`find_references`，并说明 `go_to_definition` 支持 “Cross-repository support” 和 “compiler-level accuracy”。

## codebase-memory-mcp

子代理一手核查记录：

- 仓库：https://github.com/DeusData/codebase-memory-mcp
- 提供约 17 个 MCP 工具，包括 `search_graph`、`trace_path`、`get_architecture`、`detect_changes`、`manage_adr`、`index_repository`。
- 使用 162 个 vendored tree-sitter 语法编译进纯 C 二进制。
- “Hybrid LSP” 是纯 C 重写的类型解析算法，不启动 language server 进程；源码注释说明目标是与 JDT-LS 暴露的行为一致，但 “without shelling out to javac”。
- 存储为 SQLite 图；查询包括 FTS5 BM25、结构正则、语义向量和 Cypher 子集。
- 内置语义向量模型为 Nomic `nomic-embed-code` 768 维 int8。

## GitNexus

子代理一手核查记录：

- 仓库：https://github.com/abhigyanpatwari/GitNexus
- 自述 “Zero-Server Code Intelligence Engine”。
- CLI 示例为 `npx gitnexus analyze`。
- 工具包括 query、context、impact、trace、detect_changes、rename。
- 建立的是 symbol / call / dependency / execution-flow 图。
- 其混合检索细节在本轮只读到 README 前 300 行，未逐个源码核对。

## code-review-graph

子代理一手核查记录：

- 仓库：https://github.com/tirth8205/code-review-graph
- 主题标签自述包含 tree-sitter、knowledge-graph、incremental。
- 机制为 Tree-sitter → SQLite 图 → blast radius / 风险分。
- 提供 GitHub Action 与 hook。
- 面向 PR 审查。

## Claude Context

子代理一手核查记录：

- 仓库：https://github.com/zilliztech/claude-context
- MCP 四工具：`index_codebase`、`search_code`、`clear_index`、`get_indexing_status`。
- 另有 VSCode 扩展与 `@zilliz/claude-context-core` 库。
- 机制为 AST 切块 → embedding（OpenAI / VoyageAI / Ollama / Gemini）→ Milvus 或 Zilliz Cloud。
- hybrid 检索为 BM25 + dense vector。
- 使用 Merkle tree 做增量重索引。
- 没有符号图或调用关系。

## Code-Graph-RAG

子代理一手核查记录：

- 仓库：https://github.com/vitali87/code-graph-rag
- 文档：https://docs.code-graph-rag.com
- CLI 为 `cgr start [--update-graph]`，另有 MCP server 与 Python SDK。
- 机制为 Tree-sitter 提取函数、类、方法、模块与关系，可选 libclang、Go types、Roslyn、javac、Jedi 等编译器级前端，可选运行时 trace。
- 默认图数据库为 embedded SQLite，可选 Memgraph / Neo4j。
- 查询由 LLM 将自然语言翻译为 Cypher。
- 编辑路径包括 AST patch 与 diff 预览。
