# 浏览历史 RAG：Hister 的能力与边界

> Sources: asciimoo/hister, 2026-09-01
> Raw: [Hister 仓库证据](../../raw/personal-knowledge/2026-09-01-hister-repository-study.md)
> Updated: 2026-09-01

## Overview

Hister 可以被理解为浏览历史与本地文件的 Retrieval 层：它保存正文、建立全文与可选向量索引，并通过 MCP 交给外部 Agent 检索。它不是模型，也不是可靠的历史网页归档系统。

## 数据流

```text
浏览器历史 URL ─→ 重新抓取网页 ─┐
浏览器扩展 ─────→ 当前页面内容 ─┤
本地文件 ───────→ 内容提取 ─────┘
                              ↓
                   全文索引 + 可选向量索引
                              ↓
                    Web / TUI / CLI / MCP
                              ↓
                         外部 LLM 生成回答
```

## 旧历史不是旧网页快照

浏览器历史数据库主要记录 URL、访问时间和次数。Hister 导入旧历史时创建 crawl job，抓取网页当前内容。因此搜索结果可能与当年访问时看到的页面不同。

若希望保存接近访问时的内容，应让浏览器扩展在访问时发送页面正文。即便如此，它也不是完整 WARC 归档，动态资源、登录态与后续页面变化仍需另行考虑。

## RAG 的准确位置

Hister 提供：

- 文档采集；
- 全文检索；
- 可选 embedding 检索；
- MCP `search`、preview 和 history 等查询入口。

连接它的 Codex、Claude 或其他 Agent 才负责综合和生成答案。故它更准确的定位是“个人搜索引擎 + RAG retrieval backend”。

## 隐私代价

普通浏览器历史只暴露访问地址；Hister 还可能保存网页正文、本地文件快照、HTML、索引和搜索记录。启用远端 embedding endpoint 后，文档文本还会发送到该服务。

默认无 telemetry 与 cloud sync 是好边界，但仍需保护：

- 数据目录与备份；
- server 访问凭据；
- embeddings endpoint；
- MCP 调用方及其模型数据政策。

## See Also

- [OMP Mnemopi Consolidation 生命周期](../omp-mnemopi/consolidation-lifecycle.md) — 另一类个人 Agent 记忆与召回生命周期。
- [Harness 格式与上下文载体](../harness-engineering/harness-formats-and-context-carriers.md) — Retrieval 与长会话上下文压缩的区别。
