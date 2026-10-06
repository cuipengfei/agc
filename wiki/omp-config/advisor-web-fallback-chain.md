# OMP advisor fallback 链解析与 web 角色 effort 层级坑

> Sources: 本会话取证（本机 @oh-my-pi/pi-coding-agent 18.6.3 安装源码直读 + 探针复现）, 2026-10-07
> Raw: [advisor-web-fallback-chain-root-cause](../../raw/omp-config/advisor-web-fallback-chain-root-cause.md)
> Updated: 2026-10-07

## Overview

18.4.5 起 OMP 给 `retry.fallbackChains` 加了 effort 层级（commit `5f012e314d`，修 #13789）。这个改动带来一个坑：advisor 角色没有自己的 fallback 链时，`resolveRetryFallbackChainKey` 的 step3 会按 effort 层级匹配到 web 角色键（同模型 :high），把 advisor 路由到 web 检索链。web 检索链的 provider 全是 `web-search` API，advisor 的 LLM 请求走 `mapOptionsForApi` 时全部报 `Unhandled API in mapOptionsForApi: web-search`，最终 `Advisor "default" unavailable for web/ollama`。

## 根因链

源码直读确认（18.6.3）：

1. `recoverAdvisorTurn` roleHint="advisor" 无链
2. `resolveRetryFallbackChainKey` step3 effort 层级命中 web 角色键（同模型 :high）
3. advisor 走 web 链，19 个 web-search provider 全部报 `Unhandled API in mapOptionsForApi: web-search`
4. 最终 `Advisor "default" unavailable for web/ollama`

探针复现输出：`resolved chain key for advisor: web`。

## effort 层级来源

commit `5f012e314d`（修 #13789），v18.4.5 起携带。安装版 18.6.3 = 本地 fork HEAD。

## 本地修法

- `modelRoles.web` 从 `c8787/gpt-6-luna:high` 改为 `web/firecrawl`
- `retry.fallbackChains.web` 显式链（删除与链头重复的 web/firecrawl 项）
- `retry.fallbackChains.advisor` 加 `c8787/gpt-5.6-luna`

有效链顺序探针验证：当前模型 = web/firecrawl 时，解析到 web 链，实际候选序列 `web/tavily → web/exa → c8787/gpt-6-luna → web/duckduckgo → …`。

## 上游 issue

- #13158：同机制，closed wontfix，维护者留话"复现就 reopen"
- #13789：5 天后加 effort 层级，使 #13158 原关闭理由失效
- #13187：同角色共享链为 by-design
- 无人报过 advisor+web 检索链形态

## 证据边界

- 根因链、effort 层级来源、探针复现、本地修法、有效链顺序：源码直读 + 探针复现，已验证
- pull 方向异常（live 配置被剥掉多处 luna 条目）：来源无法确认，已补回
