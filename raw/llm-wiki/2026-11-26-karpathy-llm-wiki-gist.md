# LLM Wiki（Karpathy gist 摘录）

> Source: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f （页面显示 5,000+ stars）
> Collected: 2026-11-26
> Published: Unknown（Atlan 二手文章称 2026-04-03；gist API 两次返回 502，未获得一手创建时间）

## Hacker News 一手数据（hn.algolia / Firebase API）

item 47640875：title "LLM Wiki – example of an \"idea file\""，score 296，descendants 95，by tamnd，time 1775321865（对应 2026-04-04）。

## 核心主张摘录（gist 原文）

- "A pattern for building personal knowledge bases using LLMs."
- "This is an idea file, it is designed to be copy pasted to your own LLM Agent (e.g. OpenAI Codex, Claude Code, OpenCode / Pi, or etc.)."
- 对 RAG 的批评："the LLM is rediscovering knowledge from scratch on every question. There's no accumulation."
- 三层：**raw sources**（immutable，LLM reads but never modifies）、**the wiki**（LLM owns entirely）、**the schema**（e.g. CLAUDE.md for Claude Code or AGENTS.md for Codex）。
- 三操作：**Ingest**（"A single source might touch 10-15 wiki pages"）、**Query**（"good answers can be filed back into the wiki as new pages"）、**Lint**（contradictions、stale claims、orphan pages、missing cross-references）。
- index.md："works surprisingly well at moderate scale (~100 sources, ~hundreds of pages) and avoids the need for embedding-based RAG infrastructure."
- log.md：条目前缀示例 `## [2026-04-02] ingest | Article Title`，"grep \"^## \\[\" log.md | tail -5 gives you the last 5 entries"。
- 维护成本论证："The tedious part of maintaining a knowledge base is not the reading or the thinking — it's the bookkeeping." "LLMs don't get bored, don't forget to update a cross-reference, and can touch 15 files in one pass."
- Memex 联系："related in spirit to Vannevar Bush's Memex (1945) — a personal, curated knowledge store with associative trails between documents."
- Obsidian 隐喻："Obsidian is the IDE; the LLM is the programmer; the wiki is the codebase."
- 配套工具提示：[qmd](https://github.com/tobi/qmd)（local search engine for markdown，BM25/vector hybrid + MCP）。
