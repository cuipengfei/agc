# OMP web search provider 完整清单与 fallback 机制

> Source: OMP pi-coding-agent dist/cli.js + dist/types/web/search/*.d.ts + pi-tui dist/types/tools/web-search.d.ts (installed, 2026-09-19)
> Collected: 2026-09-19
> Published: 2026-09-19

## Provider 清单（25 个，含 3 个元选项）

元选项：
- `auto` — 自动选第一个可用的
- `parallel` — Parallel.ai 搜索 API（非并发编排器，名字误导）
- `public` — 并发所有免凭证爬虫引擎并合并去重

LLM 原生工具型（模型自身支持 web_search tool）：
- `codex` — OpenAI（ChatGPT OAuth 或 openai-codex provider）
- `anthropic` — Claude OAuth 或 ANTHROPIC_API_KEY
- `gemini` — google-gemini-cli OAuth
- `xai` — SuperGrok OAuth 或 XAI_API_KEY

LLM 合成型（搜索+回答一体）：
- `perplexity` — Pro/Max 订阅或 API key

API 型（纯搜索 API）：
- `exa` — EXA_API_KEY
- `tavily` — TAVILY_API_KEY
- `jina` — JINA_API_KEY
- `kagi` — KAGI_API_KEY
- `brave` — BRAVE_API_KEY
- `zai` — Z.AI API key
- `kimi` — KIMI_SEARCH_API_KEY 或 kimi-code 登录
- `synthetic` — SYNTHETIC_API_KEY
- `ollama` — OLLAMA_CLOUD_API_KEY
- `tinyfish` — TINYFISH_API_KEY
- `firecrawl` — FIRECRAWL_API_KEY 或 keyless MCP

自托管：
- `searxng` — SEARXNG_ENDPOINT

免凭证爬虫型：
- `startpage`, `duckduckgo`, `ecosia`, `google`, `mojeek`

## Fallback 逻辑（串行）

`resolveProviderChain` 返回有序候选列表，执行时逐个尝试：

1. 每个 provider 先 `isAvailable()`（检查凭证/端点）
2. 不可用：auto 模式跳过；显式指定则报错
3. 搜索失败（超时/HTTP 错误/解析失败）→ 记录到 `failures[]` → 继续下一个
4. 全部失败：汇总所有失败原因输出
5. 每 provider 默认 60 秒硬超时，可配 `providers.webSearchTimeoutSeconds`（上限 300）
6. `providers.webSearchExclude` 列表中的 provider 永不使用

不支持并发多 provider + 合并结果。

## webSearchOrder 语义

配置项说明：已列 provider 优先，未列 provider 仍按内置相对顺序追加在后面。不会因为有 webSearchOrder 就丢掉没列的 provider。

## public provider 的并发实现

`public` 并发调用 5 个免凭证引擎：`["startpage","google","duckduckgo","ecosia","mojeek"]`

- 用 `Promise.all` 并发发出所有搜索
- soft timeout 后如果至少一个完成就收集结果
- 按 URL 去重合并，取最佳排名和最长摘要
- 不参与凭证型 provider

## LLM 可见的工具 schema

```json
{
  "query": "string (必填)",
  "limit": "number",
  "max_tokens": "number",
  "num_search_results": "number",
  "recency": "day | week | month | year",
  "temperature": "number"
}
```

LLM 不能选 provider。

## 查询语法增强

OMP 在发出搜索前解析 query 中的结构化约束：
- `site:github.com` — 域名过滤
- `before:` / `after:` — 日期范围
- `intitle:`, `inurl:`, `filetype:`, `"exact phrase"`, `-term`, `OR`

对支持原生过滤的 provider 映射到 API 参数；不支持的做后置过滤。

## 配置项汇总

| 配置 | 作用 |
|---|---|
| `providers.webSearchOrder` | 优先级数组 |
| `providers.webSearchExclude` | 黑名单数组 |
| `providers.webSearchTimeoutSeconds` | 每 provider 超时（默认 60s，上限 300s） |
| `providers.webSearchGeminiModel` | Gemini provider 模型 |
| `providers.antigravityEndpoint` | Antigravity 端点覆盖 |
| `PI_CODEX_WEB_SEARCH_MODEL` | 环境变量，codex provider 模型 |
