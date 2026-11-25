# Copilot 网关 systemone 路由与 OMP judge 主备链接入

> Sources: 本会话实测（copilot-api 改动与五道门禁、五账号 /v1/systemone 实测、systemd 重启、jevify 冒烟）, 2026-11-26
> Raw: [systemone 路由与重启流程](../../raw/copilot-gateway/2026-11-26-systemone-route-and-restart-procedure.md); [microsoft-decision-1-1 实测](../../raw/omp/2026-11-26-microsoft-decision-1-1-copilot-systemone-live-test.md)
> Updated: 2026-11-26

## 8787 网关新增 systemone 路由（2026-11-26）

copilot-api 新增两条等价路由 `POST/GET /systemone` 与 `POST/GET /v1/systemone`：把 `{state, model, questions}` 组装后转发到 Copilot 上游 `/v1/systemone`，响应原样返回。handler 无 model 白名单，直接转发 Copilot 全量 `models` 响应，Copilot 目录新增的判定模型自动可用。双路由的原因：chat-completions adapter 只对 `/v1/*` 前缀路由生效，`/systemone` 是裸路径别名。`token-usage` 类型新增 `"systemone"`。

改动落在 `src/services/copilot/create-systemone.ts`、`src/routes/systemone/route.ts`、`src/server.ts`、`src/lib/types/token-usage.ts`、`src/services/copilot/AGENTS.md`、`tests/decisions.test.ts`；lint:all / build / test（5256 项）/ typecheck / test:frontend 五道门禁全绿。

## 模型身份

Copilot 上游对该模型命名两端不一致：请求 ID 与目录名是 `microsoft-decision-1-1`（连字符），响应 body 的 `model` 字段回显 `microsoft-decision-1.1`（点号）。OMP models.yml 注册用连字符名。判定质量与图片限制见 [OMP judgment /v1/systemone 协议面](../omp/judgment-systemone-protocol.md)。

## 重启流程

配置改动后先按顺序重启五个实例（`copilot-api@4142` 至 `@4146`），再单独重启 `copilot-api-sticky-router`（4140）：sticky-router 不随实例重启，漏掉它会让 4140 继续跑旧配置。4142 / 4144 / 4145 的 disabled 状态（`/health` 404、0 rpm）在流程中保留。OMP 侧改完 `models.yml` / `config.yml` 重启后 ModelRegistry 加载零告警。

## OMP 接入形态

`modelRoles.judge` = `c8787/microsoft-decision-1-1`，`fallbackChains.judge` = `c8787/gpt-6-luna-decisions` → `typesafe-zen/jev-1.13-free` → `@tiny` → `@smol` → `@default`（链解析机制见 [OMP judge 角色链](../omp/judge-role-chain-and-jev-latest-400.md)）。jevify 冒烟：manifest 52 条预过滤剩 3 条（`omp-config` / `omp-models` / `omp-env`），3/3 判定；session `model_usage`（`purpose=judge_batch`、`role=typesafe`、`provider=c8787`）与 4140 网关 history 三方证实命中。
