# OMP web search: provider 清单与 fallback 机制

> Sources: OMP pi-coding-agent dist/cli.js + types (installed, 2026-09-19)
> Raw: [web-search-provider-inventory](../../raw/omp-tips/2026-09-19-web-search-provider-inventory.md)
> Updated: 2026-09-19

## Provider 清单

OMP 的 `web_search` 内置工具支持 25 个 provider，分四类：

| 类别 | Provider | 凭证 |
|---|---|---|
| 元选项 | `auto`, `parallel`, `public` | 见下 |
| LLM 原生工具 | `codex`, `anthropic`, `gemini`, `xai` | 各平台 OAuth 或 API key |
| LLM 合成 | `perplexity` | 订阅或 API key |
| API | `exa`, `tavily`, `jina`, `kagi`, `brave`, `zai`, `kimi`, `synthetic`, `ollama`, `tinyfish`, `firecrawl` | 各 API key |
| 自托管 | `searxng` | SEARXNG_ENDPOINT |
| 免凭证爬虫 | `startpage`, `duckduckgo`, `ecosia`, `google`, `mojeek` | 无 |

### 元选项

- `auto`：自动选第一个可用的
- `parallel`：Parallel.ai 搜索 API（`api.parallel.ai/v1beta/search`），**不是**并发编排器。有 `PARALLEL_API_KEY` 走 hosted API；无 key 且无已配置 auth 时 fallback 到 keyless MCP 通道（`search.parallel.ai/mcp`）。已配置 auth 但凭证解析失败时直接报错，不走 keyless。
- `public`：并发调 5 个免凭证爬虫引擎（startpage/google/duckduckgo/ecosia/mojeek），`Promise.all` 并发 + URL 去重合并。不碰需凭证的 provider。

## Fallback 逻辑

串行链：按顺序逐个尝试，失败换下一个。

1. `isAvailable()` 检查凭证/端点 → 不可用则 auto 跳过、显式指定则报错
2. 搜索失败 → 记录到 `failures[]` → 继续下一个
3. 全部失败 → 汇总输出
4. 每 provider 默认 60 秒超时，上限 300 秒（`providers.webSearchTimeoutSeconds`）

**不支持**并发多 provider + 合并结果。fallback 是串行的，一次只试一个。

## webSearchOrder 语义

已列 provider 优先；**未列 provider 仍按内置相对顺序追加**。不会因为有 webSearchOrder 就丢掉没列的 provider。

## LLM 可见的工具 schema

LLM 只能传 `query`（必填）、`limit`、`max_tokens`、`num_search_results`、`recency`、`temperature`。**不能选 provider**。

## 查询语法增强

OMP 解析 query 中的 `site:`、`before:`/`after:`、`intitle:`、`inurl:`、`filetype:`、`"exact phrase"`、`-term`、`OR`。支持原生过滤的 provider 映射到 API 参数；不支持的做后置过滤。

## See Also

- [自定义 Responses API 端点接入](web-search-custom-responses-provider.md)
