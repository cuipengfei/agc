# Kiro 后端 API 可被第三方 agent 消费的仓库生态

> Source: GitHub API + GraphQL 实测（快照 2026-10-22）
> Collected: 2026-10-22
> Published: 2026-10-22

## 背景

Kiro 付费订阅后端可直接调（无需 Kiro IDE/CLI 常驻）。主流是「从官方登录态 / `KIRO_API_KEY` 认证 → 本地网关翻译成 Anthropic/OpenAI 兼容协议 → 供任意 agent 调用」。

## 20 项候选（按 star）与筛选

| repo | ★ | 最后 push | 筛选结果 |
|---|--:|---|---|
| justlovemaki/AIClient2API | 8907 | 2026-10-21 | 留（活跃，但背 Kiro 风控警告 issue #395） |
| jwadow/kiro-gateway | 2327 | 2026-05-18 | 出（>1k 但 3 月无 push） |
| hj01857655/kiro-account-manager | 2035 | 2026-10-21 | 留（管理器 + 内置网关） |
| hank9999/kiro.rs | 1963 | 2026-10-08 | 留（PR 悬空 37% 合并率） |
| chaogei/Kiro-account-manager | 1467 | 2026-10-14 | 留（无新版跟进） |
| Quorinex/Kiro-Go | 1186 | 2026-07-29 | 留过筛（流式 bug #158 未修） |
| ZyphrZero/kiro.rs | 489 | 2026-10-20 | 留（<1k 但近 3 月有 push） |
| TsinHzl/kiro2cc-proxy | 223 | 2026-10-21 | 留（真实上游实测 PR） |
| caidaoli/kiro2api | 639 | 2026-06-16 | 出（双不满足） |
| xu-yuanhao/KiroProxy | 392 | 2026-05-11 | 出 |
| lulistart/Kiro2api-Node | 118 | 2026-02-06 | 出 |
| mikeyobrien/pi-provider-kiro | 106 | 2026-10-02 | 留（pi 生态 provider） |
| dangweilinshinidie/kiro-reverse-api | 72 | 2026-01-01 | 出 |
| d-kuro/kirocc | 68 | 2026-10-21 | 留（Anthropic 兼容本地网关） |
| AAEE86/kiro2api-deno | 45 | 2026-01-28 | 出 |
| vagmr/kiro2api-rs | 35 | 2026-02-25 | 出 |
| minpeter/kiro-lb | 31 | 2026-10-17 | 留（浏览器/device-code 登录） |
| tanu360/kiro-reverse-api | 16 | 2026-10-10 | 留 |
| xwteam/kiro2api | 13 | 2026-08-19 | 留（近 3 月有 push） |
| chasedputnam/go-kiro-gateway | 12 | 2026-10-19 | 留（PR 量严重失真，按下限看） |

筛选规则（用户指定）：star ≥ 1k 或近 3 个月有 push → 保留；否则出局。

## OMP 视角的最终 4 强排名

| 排名 | repo | ★ | 建仓 | 最后 push | PR总/合 | issue总/关 |
|--:|---|--:|---|---|--:|--:|--:|--:|---|
| 1 | ngosangns/ns-bridge（OMP 专用）| 3 | 2026-09-04 | 2026-10-21 | 13/13 | 2/2 |
| 2 | d-kuro/kirocc（Anthropic 网关）| 68 | 2026-01-13 | 2026-10-21 | 147/124 | 30/19 |
| 3 | ZyphrZero/kiro.rs（多协议网关）| 489 | 2026-05-21 | 2026-10-20 | 71/61 | 56/36 |
| 4 | minpeter/kiro-lb（OAuth 网关）| 31 | 2026-07-29 | 2026-10-17 | 105/97 | 14/13 |

## 资格认证

- `ns-bridge` 是唯一 OMP 原生钩子适配（fetchDynamicModels）的方案；老 host 包 `ns-omp-provider-kiro@0.5.3` 已 deprecated，但统一 CLI 安装仍可用。
- `kirocc`/`kiro-lb`/`kiro.rs` 是本地网关形态，OMP 用通用 Anthropic/OpenAI 端点对接，独立于 pi 扩展层。
- OMP 官方明确不计划内置 Kiro（#1571、#4676 closed）。
