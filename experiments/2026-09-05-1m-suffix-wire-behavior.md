# `[1m]` 后缀到底发到了网关还是被客户端剥掉

## Hypothesis

Claude Code 收到 `ANTHROPIC_MODEL=<id>[1m]` 时，不会把带后缀的字符串原样发给上游网关；后缀由客户端解析处理，网关收到的是裸 `id`。

## Baseline

`cc-launch` 迁移自旧 zsh `cc()`，沿用「模型窗口 > 200000 就给 ID 拼 `[1m]`」的规则。此前只知道该配置能正常启动 Claude Code，未验证网关侧实际收到什么。

## Change

不改 launcher，只做两组对照观测：直接 `curl` 网关 vs 真实 `claude -p`。

## Context

- host: WSL2 Linux
- agent: Claude Code CLI（`~/.bun/bin/claude`）
- model: `gpt-5.4-mini`（本机网关目录中 `claude_model_id` 与 `id` 相同，即网关未声明该模型带 `[1m]`）
- repo: agc
- cwd: /home/cpf/code-inside/agc
- date: 2026-09-05

## Steps

1. 向 `http://localhost:4140/v1/messages` POST `{"model":"gpt-5.4-mini","max_tokens":8,"messages":[{"role":"user","content":"hi"}]}`，记录状态码。
2. 同上，把 `model` 换成 `gpt-5.4-mini[1m]`，记录状态码与错误体。
3. 设 `ANTHROPIC_BASE_URL=http://localhost:4140`、`ANTHROPIC_AUTH_TOKEN=dummy`、`ANTHROPIC_MODEL=gpt-5.4-mini[1m]`、`ANTHROPIC_DEFAULT_HAIKU_MODEL=gpt-5.4-mini[1m]`，运行 `claude -p "reply with the single word ok"`，记录输出尾部。
4. 扫描已安装 claude 二进制，检索 1M 相关 beta 标识串。

## Observations

| 步骤 | 结果 |
|---|---|
| 1 | HTTP 200 |
| 2 | HTTP 502，体为 `{"error":"no instance serves model: gpt-5.4-mini[1m]"}` |
| 3 | 可见回答含 `ok`；同一次输出出现遥测行片段 `code:unrecognized_model] {"model":"gpt-5.4-mini[1m]","query_source":"sdk"}` |
| 4 | `context-1m-2025-08-07` 与 `interleaved-thinking-2025-05-14`、`context-management-2025-06-27` 并列于同一组 beta 标识串（offset 97728376 附近） |

步骤 2 与步骤 3 的组合是关键：网关明确拒绝带后缀的 `model` 值，而同一份带后缀的环境变量下客户端仍能拿到正常回答。

## Evidence

- `raw/harness-engineering/2026-09-05-claude-binary-compaction-probe.md`
- `raw/model-gateway-mismatch/2026-09-05-copilot-gateway-catalog-fields.md`

## Verdict

works —— 假设成立。后缀在客户端侧被处理，网关收到裸 ID。

边界：本实验只证明「带后缀的 env 能正常工作」且「网关直收后缀会 502」，没有抓到 Claude Code 改写请求的具体代码位置，也没有抓包确认线路上的 `model` 字段字面值。步骤 3 的 `unrecognized_model` 遥测说明客户端不认识这个 ID，但这不影响请求成功。

## Follow-up

- 若要闭环，需在网关侧打印收到的 `model` 字段，或对 `claude` 做 HTTP 层抓包。
- 单一信号会误判：只看步骤 2 会得出「不能用带后缀的 ID」，只看步骤 3 会以为网关认这个 ID。类似形态的断言都应配两个方向的观测。
