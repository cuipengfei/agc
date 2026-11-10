# `/auto` 路由实测：响应字段、多轮参数与猜测路径（本机 2026-11-10）

> Source: 本机实测（copilot-api 网关 127.0.0.1:4140 `/v1/models` + `api.business.githubcopilot.com` `/models`、`/auto` 与六条猜测路径；请求头与 `/auto` 请求体形状取自 `src/lib/api-config.ts` 与 `src/services/copilot/get-auto-selection.ts`）
> Collected: 2026-11-10
> Published: 2026-11-10

## 一、鉴权与主机

- `~/.local/share/copilot-api/tokens.json` 含 5 条记录，`accountType` 全部为 `business`，每条带 `token`；同目录另有单个 `github_token`。
- `github_token` 打 `api.githubcopilot.com/models` 返回 `unauthorized: not licensed to use Copilot`。
- 按 `accountType` 选择主机：`business → api.business.githubcopilot.com`；本次使用第一条 business 记录。
- token 经 `curl -K -`（配置文件从 stdin 读）传入，不进命令行参数；`session_token` 字段在输出中打码为 `<redacted>`。

## 二、请求头（抄自仓库源码）

`src/lib/api-config.ts`：

- `X-GitHub-Api-Version: 2026-08-01`（常量 `API_VERSION`）
- `x-interaction-type: model-access`
- `openai-intent: model-access`

调用侧再加：

- `Editor-Version: vscode/1.110.0`
- `Editor-Plugin-Version: copilot-chat/0.40.0`
- `Copilot-Integration-Id: vscode-chat`
- `Accept: application/json`

## 三、`GET /models` 实测（business 账号）

- 条目数 28（本轮重测一次，结果为 29；两次之间目录有增，属动态目录，未列入正文断言）。
- 本轮 29 条的 ID 集合含 `gemini-3.8-flash`、`gemini-4-argon`、`gpt-3.5-turbo`、`gpt-3.5-turbo-0613`、`gpt-4` 等。
- 整个 JSON 里 `fusion` 字样出现 0 次。
- 换四组 `Editor-Plugin-Version` / `Copilot-Integration-Id` 请求头，条目数与结果不变。
- 早前另一次实测同主机返回 28 条，结果一致地不含 `fusion` 字样。

## 四、`POST /auto` 实测

请求体（形状取自 `src/services/copilot/get-auto-selection.ts`）：

```json
{"prompt": "refactor a Python function to handle empty input", "tier": "balance"}
```

第一次调用缺 `X-GitHub-Api-Version` 返回 `invalid apiVersion`；补上版本头后第二次返回 200。响应键集合（值均来自实际返回）：

```
selected_model    一个模型（含 billing 单价表）
session_token     <redacted>
expires_at        <redacted>
hydra_scores      {"code_gen": 0.4032, "debugging": 0.0054, "reasoning": 0.2599, "tool_use": 0.064}
multi_turn        {"enabled": true, "sigma": {"code_gen": 0.4032, "debugging": 0.0054, "reasoning": 0.2599, "tool_use": 0.064},
                   "escalate_threshold": 2, "initial_skip": 2, "backoff_coefficient": 2,
                   "max_skip": 32, "anchor_skip": 0, "context_window": 5}
multi_turn_mode   "model_cards"
selection_reason  "Auto selected GPT-6 Luna since the task has medium complexity."
discounted_costs  {"gpt-6-luna": 0.1}
```

## 五、猜测路径探测

| 方法 | 路径 | HTTP 状态 |
|---|---|---|
| GET | `/fusion` | 404 |
| POST | `/fusion` | 404 |
| GET | `/v1/fusion` | 404 |
| POST | `/v1/fusion` | 404 |
| GET | `/auto/fusion` | 404 |
| POST | `/auto/fusion` | 404 |
| GET | `/orchestrate` | 404 |
| POST | `/orchestrate` | 404 |
| GET | `/models/fusion` | 400 |
| POST | `/models/fusion` | 405 |

`/models/fusion` 落在「按 ID 取单个模型」的路由上，GET 400、POST 405；其余猜测路径均 404。这些结果只排除被试探的具体路径，不能推出没有其它 Fusion 入口。

## 六、本机 VS Code 扩展侧

- 本机安装的 Copilot Chat 扩展版本为 `0.39.0`，安装目录位于 Windows 用户 `.vscode/extensions` 下的 `github.copilot-chat-0.39.0`。
- 定向 grep `Fusion Max|fusionTier|FUSION_|copilot-fusion|copilotFusion` 无匹配。
- 宽泛 `[Ff]usion` grep 命中均为无关词：`changelog.md` 的 `confusion`、`bundle.l10n.fr.json` 的 `fusionner`、`cli.js` 的 `coldfusion`、`extension.js` 的 `fusiontable`。
- 结论：该扩展版本里不存在与 Copilot Fusion 相关的标识符字符串。

## 七、方法说明

- token 不打印，命令行不带 token；`session_token` 字段打码。
- 本次探测共发出 `GET /models` 5 次（逐条 token）+ 1 次完整清单 + 4 次请求头变体、`POST /auto` 2 次、猜测路径 12 次，全部打在 `api.githubcopilot.com` 家族，未调用 `/chat/completions`，未消耗生成 token。
- 临时脚本 `/tmp/probe-fusion-catalog.py` 已删除；后续不再自行拿账号做探测。
