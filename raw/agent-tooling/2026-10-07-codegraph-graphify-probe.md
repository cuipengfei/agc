# codegraph vs graphify 单查询探测记录

> Source: 本会话实测（codegraph MCP 查询 + graphify 图谱查询），agc 仓库
> Collected: 2026-10-07
> Published: Unknown

## 探测设计

对两个工具问同一个文档类知识问题：「prompt cache 命中条件与 TTL」——该主题在 wiki 中有覆盖（prompt-caching 文章，见下）。

## codegraph 侧结果

`codegraph_explore` 查询「prompt cache 命中条件与 TTL」：

- 返回 25 个符号、2 个源码文件：`omp/agent/extensions/advisor-cache-observer.ts`（advisorCacheObserver、sanitizeAdvisorResponsesPayload、MAX_SHAPES 等，因标识符含 promptCache 字样命中）与 `src/agc_sync/manifest.py`（IGNORED_NAMES、iter_pull_files 等）。
- 未返回任何 wiki/ 下的条目；未返回 prompt-caching 主题文章。

## wiki 侧核验

该主题由 wiki/prompt-caching/cache-key-and-prefix-matching.md 覆盖（前缀匹配命中条件、TTL 表格：OpenAI 30 分钟、Anthropic 5 分钟等，2026-09-05 更新）。即：知识存在于 wiki，codegraph 此次未达。
- 仅一次查询探测；不能由此推断 codegraph 整体不支持文档类语料或其延迟特性（本次未测延迟），也不能断言相关知识仅存在于 wiki（只能说 wiki 中有覆盖、此次查询未达）。
## graphify 侧对照（同日重建的图谱）

- `god-nodes list`：Wiki Log 174 edges 居首，Knowledge Base Index 40，Entry 27——wiki 文档是图中最大枢纽。
- 2026-09-26 测量同样显示 wiki 类节点占 God Nodes 前列。

## 证据边界

- 仅一次查询探测；不能由此推断 codegraph 整体不支持文档类语料或其延迟特性（本次未测延迟）。
- codegraph 返回的 manifest.py 命中属词面匹配，「误配」说法无依据，仅能说未达 wiki 条目。
- graphify 侧为同一仓库单日图谱状态。
