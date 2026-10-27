# CodeGraph README 与核心源码摘录

> Source: https://github.com/colbymchenry/codegraph/blob/69af19ace270f2e940444d514de6dde971df12df/README.md; https://github.com/colbymchenry/codegraph/blob/69af19ace270f2e940444d514de6dde971df12df/src/db/queries.ts; https://github.com/colbymchenry/codegraph/blob/69af19ace270f2e940444d514de6dde971df12df/src/context/index.ts; https://github.com/colbymchenry/codegraph/blob/69af19ace270f2e940444d514de6dde971df12df/src/mcp/server-instructions.ts
> Collected: 2026-10-27
> Published: Unknown

## 项目定位与入口

- 仓库 README 自述：`Pre-indexed code knowledge graph, auto syncs on code changes`，面向 Claude Code、Cursor、Codex、OpenCode、Gemini、GitHub Copilot 等。
- 核心卖点是“fewer tokens, fewer tool calls, 100% local”。
- CLI 覆盖 `install / init / index / sync / status / query / explore / node / files / callers / callees / impact / affected / daemon / telemetry / upgrade`。
- MCP 默认只暴露一个工具：`codegraph_explore`；其余 `codegraph_node / codegraph_search / codegraph_callers / codegraph_callees / codegraph_impact / codegraph_files / codegraph_status` 默认不列出，可用 `CODEGRAPH_MCP_TOOLS` 重新打开。
- README 描述 MCP 工具输出为“the relevant symbols' verbatim source grouped by file, plus the call paths between them and a blast-radius summary”。

## README 中的工作原理

README “How It Works” 原文摘录：

1. “Extraction — a native Rust kernel parses source with tree-sitter grammars compiled into it, extracting nodes (functions, classes, methods) and edges (calls, imports, extends, implements) for 20 languages; remaining languages and per-file fallbacks use the same extraction logic on the portable engine, producing identical graphs.”
2. “Storage — Everything goes into a local SQLite database (`.codegraph/codegraph.db`) with FTS5 full-text search.”
3. “Resolution — After extraction, references are resolved: function calls → definitions, imports → source files, class inheritance, and framework-specific patterns.”
4. “Auto-Sync — The MCP server watches your project using native OS file events. Changes are debounced (2-second quiet window), filtered to source files only, and incrementally synced.”

README 关键特性表摘录：

- “Full-Text Search: Find code by name instantly across your entire codebase, powered by FTS5”
- “Impact Analysis: Trace callers, callees, and the full impact radius of any symbol before making changes”
- “Always Fresh: File watcher uses native OS events (FSEvents/inotify/ReadDirectoryChangesW) with debounced auto-sync”
- “100% Local: No data leaves your machine. No API keys. No external services. SQLite database only”

## 词法查询与图遍历

- 子代理核查 `src/db/queries.ts:1992-2058`，命中：

  ```sql
  SELECT nodes.*, bm25(nodes_fts, 0, 20, 5, 1, 2) as score
  ```

  并说明这是 SQLite FTS5 内建 BM25，列权重为 name 20、qualified_name 5、docstring 1、signature 2。
- 子代理核查 `src/context/index.ts:167-200, 477-620`，描述为“精确名 → 前缀/Title-Case 定义匹配 → 逐词 FTS”的播种路径，包含同文件共现加权，之后由 `buildContext` 进行图扩展、代码块抽取和 markdown 格式化。
- 子代理核查 `src/types.ts:22-100`，记录 `EDGE_KINDS` 为 `contains / calls / imports / exports / extends / implements / references / type_of / returns / instantiates / overrides / decorates / navigates`。

## 边界

- `src/mcp/server-instructions.ts` 的 agent 指令原文，子代理摘录：
  - “Explore matches names and indexed code words lexically, not by meaning”
  - “No live correctness validation”
  - “Cross-file resolution is best-effort name matching; ambiguous calls may return multiple candidates”
- 子代理报告：全仓 LSP 相关命中只有 `src/mcp/session.ts` 注释 “client-provided rootUri / workspaceFolders (LSP-style)”，没有语言服务器客户端依赖。
- 子代理报告：`embedding` 相关命中主要是 Go struct embedding、SVG font embedding 和一个没有调用点的 `VectorError`；未见向量检索实现。
- 子代理报告：依赖清单没有 AI SDK；唯一出网端点是匿名 telemetry：`https://telemetry.getcodegraph.com/v1/events`，可关闭。
- README 的性能数字为项目自述，本轮未独立复测。

## 版本与快照

- 子代理报告所查 commit：`69af19ace270f2e940444d514de6dde971df12df`。
- 子代理报告 npm 最新 `@colbymchenry/codegraph@1.6.2` 的 gitHead 是 `6560052a6f856855d3f71eee838fd66ccfa4285d`，因此发行版与 main HEAD 可能不同。
- 主代理在同一 commit `69af19ace270f2e940444d514de6dde971df12df` 直接读取 README 时观察到 916 行；另一个子代理报告过 1058 行，两者不一致。总行数不作为本文事实依据。
