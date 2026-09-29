# OMP web search: provider 清单、fallback 与凭证来源

> Sources: OMP pi-coding-agent dist/cli.js + types (installed, 2026-09-19); OMP pi-coding-agent source (installed, 2026-09-29)
> Raw: [web-search-provider-inventory](../../raw/omp-tips/2026-09-19-web-search-provider-inventory.md); [OMP Tavily 原生搜索与本地登录源码摘录](../../raw/omp-tips/2026-09-29-omp-web-search-tavily-source.md); [OMP Tavily 凭据设置的会话摘录](../../raw/omp-tips/2026-09-29-tavily-auth-storage-session.md)
> Updated: 2026-09-29

## Provider 清单

OMP 的 `web_search` 内置工具支持 25 个 provider，分四类：

| 类别 | Provider | 凭证 |
|---|---|---|
| 元选项 | `auto`, `parallel`, `public` | 见下 |
| LLM 原生工具 | `codex`, `anthropic`, `gemini`, `xai` | 各平台 OAuth 或 API key |
| LLM 合成 | `perplexity` | 订阅或 API key |
| API | `exa`, `tavily`, `jina`, `kagi`, `brave`, `zai`, `kimi`, `synthetic`, `ollama`, `tinyfish` | 各 API key |
| API | `firecrawl` | `FIRECRAWL_API_KEY` 或 keyless MCP |
| 自托管 | `searxng` | SEARXNG_ENDPOINT |
| 免凭证爬虫 | `startpage`, `duckduckgo`, `ecosia`, `google`, `mojeek` | 无 |

### 元选项

- `auto`：自动选第一个可用的
- `parallel`：Parallel.ai 搜索 API（`api.parallel.ai/v1beta/search`），**不是**并发编排器。有 `PARALLEL_API_KEY` 走 hosted API；无 key 且无已配置 auth 时 fallback 到 keyless MCP 通道（`search.parallel.ai/mcp`）。已配置 auth 但凭证解析失败时直接报错，不走 keyless。
- `public`：并发调 5 个免凭证爬虫引擎（startpage/google/duckduckgo/ecosia/mojeek），`Promise.all` 并发 + URL 去重合并。不碰需凭证的 provider。

## Tavily 原生搜索的凭证来源

`web/tavily` 不读取 `search-tavily` MCP URL 里的 `tavilyApiKey`。它通过 AuthStorage 读取 provider `tavily`，也可使用 `TAVILY_API_KEY` 环境变量；`isAvailable()` 只在凭据库已有 `tavily` 或环境变量有值时报告可用，没有凭据的候选会在 `web_search` 串行链中被跳过。缺钥错误提示列出的支持方式为设置 `TAVILY_API_KEY` 或给 provider `tavily` 配置 API key。

可手动执行：

```bash
omp auth-broker login tavily
```

该命令把交互输入保存到 OMP 的凭据库（本机路径 `~/.omp/agent/agent.db`）。2026-09-29 在本机 OMP `omp/18.4.3` 上验证过：凭据记录存在且启用，记录与 `search-tavily` 的 MCP URL 中的 key 相同，新进程读取 `AuthStorage.keys.source("tavily")` 可用。未验证 Tavily 服务端是否接受该 key、当前额度，以及已经运行的 OMP 会话是否自动刷新新凭据。轮换 key 时，需要同时更新 MCP URL 和 OMP 凭据库，才能让两个入口继续使用同一把 key。

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
