# copilot-api systemone 路由、重启流程与 OMP judge 接入冒烟

> Source: 本会话实测（copilot-api 改动与五道门禁、systemd 实例重启、OMP 配置改动、jevify 冒烟）
> Collected: 2026-11-26
> Published: Unknown

## 网关改动

新增两条等价路由：`POST/GET /systemone` 与 `POST/GET /v1/systemone`。handler 把 `{state, model, questions}` 组装后转发 Copilot 上游 `/v1/systemone`，响应原样返回。handler 无 model 白名单，直接转发 Copilot 全量 `models` 响应。双路由原因：chat-completions adapter 只对 `/v1/*` 前缀路由生效，`/systemone` 为裸路径别名。

改动文件清单：

```text
src/services/copilot/create-systemone.ts   新增：组装 wire 并发送
src/routes/systemone/route.ts              新增：两条路由 handler
src/server.ts                              注册 /systemone 与 /v1/systemone
src/lib/types/token-usage.ts               TokenUsageSource 加 "systemone"
src/services/copilot/AGENTS.md             路由维护说明
tests/decisions.test.ts                    路由测试
```

五道门禁（全绿）：

```text
lint:all        通过
build           通过
test            5256 项通过
typecheck       通过
test:frontend   通过
```

## 重启流程

```bash
for port in 4142 4143 4144 4145 4146; do systemctl --user restart copilot-api@$port; done
systemctl --user restart copilot-api-sticky-router   # 4140，必须单独重启
```

重启后保留：4142 / 4144 / 4145 disabled（`/health` 404、持续 0 rpm）。

## OMP 配置改动

models.yml 新增条目：

```yaml
c8787/microsoft-decision-1-1:
  api: typesafe
  baseUrl: http://localhost:8787    # 不带 /v1，typesafeWire 自己拼
  input: ["text"]
  cost: 全 0
```

config.yml：

```yaml
modelRoles:
  judge: c8787/microsoft-decision-1-1
retry:
  fallbackChains:
    judge:
      - c8787/gpt-6-luna-decisions
      - typesafe-zen/jev-1.13-free
      - "@tiny"
      - "@smol"
      - "@default"
```

改动前备份：`~/.omp/agent/models.yml.bak-20261126-000149` 与 `~/.omp/agent/config.yml.bak-20261126-000149`。OMP 重启后 ModelRegistry 加载零告警。

## jevify 冒烟

manifest.json 共 52 条，预过滤后剩 3 条：`omp-config` / `omp-models` / `omp-env`，3/3 全部判定。三方证据：

```text
1. OMP session JSONL model_usage: purpose=judge_batch, role=typesafe, provider=c8787, model=microsoft-decision-1-1
2. 4140 sticky-router /v1/chat/completions history: 同窗口落到 microsoft-decision-1-1
3. omp-env / omp-models 触发复核：均 review_decision，确认 omp_config + protected: true，无更正
```
