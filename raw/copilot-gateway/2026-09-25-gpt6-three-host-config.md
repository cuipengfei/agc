# 8787/4140 网关与三宿主配置：gpt-6-luna、gpt-6-sol 接入记录

> Source: 本机 http://localhost:8787/v1/models 与 http://localhost:4140/v1/models；本机 `~/.codex/model-catalog-4140.json`、`~/.config/opencode/opencode.jsonc`、`~/.omp/agent/models.yml`；`/v1/responses` 冒烟结果
> Collected: 2026-09-25
> Published: Unknown

## 网关模型条目

- 2026-09-25 查询 `http://localhost:8787/v1/models` 与 `http://localhost:4140/v1/models`，两者均返回 HTTP 200。
- 两个返回体字节数均为 33102，`cmp` 判定文件一致：`/tmp/model-list/gw-8787-models.json` 与 `/tmp/model-list/router-4140-models.json`。
- `gpt-6-luna` 与 `gpt-6-sol` 的 `supported_endpoints` 均只有 `/responses` 与 `ws:/responses`，没有 `/chat/completions`。
- 两个模型的 `max_context_window` 均为 1000000。
- 两个模型的 `max_output_tokens` 均为 128000。
- 两个模型的 `max_prompt_tokens` 均为 872000。
- 两个模型的 reasoning effort 档位均包含 `none`、`low`、`medium`、`high`、`xhigh`、`max`。

## 配置写入

- Codex：`~/.codex/model-catalog-4140.json` 新增 `gpt-6-luna` 与 `gpt-6-sol`。
- OpenCode：`~/.config/opencode/opencode.jsonc` 的 provider `4140` 新增 `gpt-6-luna` 与 `gpt-6-sol`；未加入 `4140-chat`。
- OMP：`~/.omp/agent/models.yml` 的 provider `c8787` 新增 `gpt-6-luna` 与 `gpt-6-sol`；未加入 `c8787-chat`。

## 数值与验证

- Codex `gpt-6-luna`：`context_window` 306667，`auto_compact_token_limit` 276000。
- Codex `gpt-6-sol`：`context_window` 500000，`auto_compact_token_limit` 400000。
- OpenCode provider `4140` 两个模型：`limit.context` 272000，`limit.output` 16000。
- OMP `gpt-6-luna`：`contextWindow` 1000000，`maxTokens` 128000。
- OMP `gpt-6-sol`：`contextWindow` 292000，`maxTokens` 16000。
- OMP 两个模型均配置 `compactionModel: c8787/gpt-5.6-luna`、`reasoning: true`、`input: [text, image]`。
- 校验结果：Codex JSON 解析通过，13 个原有模型条目与备份一致；四条 5.6/6 条目的 `instructions_template` 逐字节一致；OpenCode JSONC 解析通过且无重复模型 ID；OMP YAML 解析通过且无重复模型 ID。
- 冒烟结果：`/v1/responses` 分别调用 `gpt-6-luna` 与 `gpt-6-sol`，HTTP 均为 200，正文均返回 `OK`，usage 均显示 `output_tokens: 5`。