# OMP advisor fallback 链根因调查

> Source: 本会话调查取证（本机 @oh-my-pi/pi-coding-agent 18.6.3 安装源码直读 + 探针复现 + 本机配置核验）
> Collected: 2026-10-07
> Published: Unknown

## 故障现象

Advisor(c8787/gpt-6-luna:xhigh) 故障，报 `Advisor "default" unavailable for web/ollama`。

## 根因链（源码直读确认）

- `recoverAdvisorTurn` roleHint="advisor" 无链
- `resolveRetryFallbackChainKey` step3 effort 层级命中 web 角色键（同模型 :high）
- advisor 走 web 链，19 个 web-search provider 全部报 `Unhandled API in mapOptionsForApi: web-search`
- 最终 `Advisor "default" unavailable for web/ollama`

## effort 层级来源

commit `5f012e314d`（修 #13789），v18.4.5 起携带。安装版 18.6.3 = 本地 fork HEAD（已 fast-forward，落后 3445 已清）。

## 探针复现

探针输出：`resolved chain key for advisor: web`。

## 本地修法

- `modelRoles.web` 从 `c8787/gpt-6-luna:high` 改为 `web/firecrawl`
- `retry.fallbackChains.web` 显式链（删除与链头重复的 web/firecrawl 项）
- `retry.fallbackChains.advisor` 加 `c8787/gpt-5.6-luna`

## 有效链顺序验证

当前模型 = web/firecrawl 时，解析到 web 链，实际候选序列探针输出为 `web/tavily → web/exa → c8787/gpt-6-luna → web/duckduckgo → …`，与意图一致。探针已删。

## 上游 issue

- #13158：同机制，closed wontfix，维护者留话"复现就 reopen"
- #13789：5 天后加 effort 层级，使 #13158 原关闭理由失效
- #13187：同角色共享链为 by-design
- 无人报过 advisor+web 检索链形态

## pull 方向异常

live 配置在会话期间被剥掉多处 luna 条目（含 web 链 gpt-5.6-luna），来源无法确认。靠 pull 方向比对发现差异，补回后 pull 退出码 0、字节一致。
