# Hister 仓库证据

> Source: https://github.com/asciimoo/hister
> Collected: 2026-09-01
> Published: Unknown

> Commit: `c93176b3e39ab6a138bdfb124f495aea08fca80c`

## Confirmed

- README 将 Hister 定义为对访问网页和本地文件做全文索引的私有搜索引擎，可从 Web、终端或 MCP 查询。
- `cmd/browser.go` 中的 browser import 查询浏览器历史数据库，并创建 `CrawlJob`。
- 因而旧历史导入主要从历史数据库取得 URL，再抓取当前网页内容；它不是访问时网页版本的完整归档。
- 浏览器扩展会把新访问页面的内容发送到用户配置的 Hister server，更接近访问时快照。
- 全文搜索使用 Bleve；语义搜索是可选能力，需要用户配置 embeddings endpoint。
- README 明确默认无 telemetry、无 cloud sync；启用远端 embeddings 时，文档文本会发送到该 endpoint。
- 搜索入口包括 Web、TUI、CLI 与 MCP。

## Inference

Hister 可以充当“浏览历史 RAG”的 Retrieval 层；回答生成仍由连接 MCP 的外部模型或 Agent 完成。

## Privacy boundary

全文、文件快照、索引和搜索记录比普通 URL 历史更敏感，应把数据目录、备份和访问凭据视为私人资料。
