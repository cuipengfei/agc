# GPT-6 Luna 与 Sol（8787 Copilot 网关）三宿主接入记录

> Sources: 本机 8787/4140 `/v1/models` 实测与三宿主配置校验, 2026-09-25
> Raw: [gpt6-three-host-config](../../raw/copilot-gateway/2026-09-25-gpt6-three-host-config.md)
> Updated: 2026-09-25

## 一句话

`gpt-6-luna` 与 `gpt-6-sol` 已在 Codex、OpenCode、OMP 三宿主登记为仅走 Responses 通道的 Copilot 网关模型；两个网关端点返回同一份模型目录，且冒烟调用均成功。

## 网关实测规格（2026-09-25）

- `http://localhost:8787/v1/models` 与 `http://localhost:4140/v1/models` 均返回 HTTP 200。
- 两个返回体均为 33102 字节，`cmp` 判定一致。
- `gpt-6-luna` 与 `gpt-6-sol` 的 `supported_endpoints` 均只有 `/responses` 与 `ws:/responses`。
- 两个模型的 `max_context_window` 均为 1000000。
- 两个模型的 `max_output_tokens` 均为 128000。
- 两个模型的 `max_prompt_tokens` 均为 872000。
- reasoning effort 档位均包含 `none`、`low`、`medium`、`high`、`xhigh`、`max`。

## 三宿主配置

| 宿主 | 落点 | 数值 |
|---|---|---|
| Codex catalog | `gpt-6-luna` / `gpt-6-sol` | Luna: context 306667，auto compact 276000；Sol: context 500000，auto compact 400000 |
| OpenCode provider `4140` | `gpt-6-luna` / `gpt-6-sol` | context 272000，output 16000 |
| OMP provider `c8787` | `gpt-6-luna` | contextWindow 1000000，maxTokens 128000 |
| OMP provider `c8787` | `gpt-6-sol` | contextWindow 292000，maxTokens 16000 |

- OMP 两个模型均配置 `compactionModel: c8787/gpt-5.6-luna`、`reasoning: true`、`input: [text, image]`。
- OpenCode `4140-chat` 与 OMP `c8787-chat` 未加入这两个模型。

## 验证

- Codex JSON 解析通过；13 个原有模型条目与备份一致。
- 四条 5.6/6 条目的 `instructions_template` 逐字节一致。
- OpenCode JSONC 解析通过，未产生重复模型 ID。
- OMP YAML 解析通过，未产生重复模型 ID。
- `/v1/responses` 分别调用 `gpt-6-luna` 与 `gpt-6-sol`，HTTP 均 200，正文均返回 `OK`，usage 均显示 `output_tokens: 5`。

## 注意

OMP 进程在启动时读取 `models.yml`；当前 OMP 会话需重启后才能选到这两个新模型。OpenCode 与 Codex 在下次启动时读取新配置。