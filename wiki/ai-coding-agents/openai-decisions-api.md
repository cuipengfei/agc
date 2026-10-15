# OpenAI Decisions API：当前状态、请求格式与 GitHub Copilot 后端探测

> Sources: OpenAI 官方文档, 2026-10-15; 本会话对 GitHub Copilot 上游的实测, 2026-10-15; 微软 VS Code 仓库源码与 npm 包核查, 2026-10-15
> Raw: [openai-decisions-api-status-check](../../raw/ai-coding-agents/2026-10-15-openai-decisions-api-status-check.md); [copilot-decisions-endpoint-probing](../../raw/ai-coding-agents/2026-10-15-copilot-decisions-endpoint-probing.md)
> Updated: 2026-10-15

OpenAI Decisions API 截至 2026-10-15 仍处 public beta，GA 未宣布。请求格式已公开：POST `/v1/decisions`，请求体含 `model`/`input`/`questions`（predicate/choice/score 三题型）。GitHub Copilot 上游 `/v1/decisions` 被区别处理，但官方客户端无 Decisions 请求映射，功能开放状态未知。

## 官方状态（2026-10-15 核验）

- Decisions guide 页原文："The Decisions API is in public beta, and we expect to GA in the coming weeks."（[raw](../../raw/ai-coding-agents/2026-10-15-openai-decisions-api-status-check.md) §①）
- API reference 将 Decisions 列在 Beta APIs 分组下。
- Changelog 最新 Decisions 条目为 2026-10-06："Released the Decisions API in beta with `gpt-6-luna`."；页面顶部最新条目为 Oct 8, 2026，10-08 至 10-15 之间无 Decisions GA 条目。
- 官方 Create a decision 参考页提供完整 cURL 示例：POST `https://api.openai.com/v1/decisions`，请求体含 `model`/`input`/`questions`（predicate 题型）。（[raw](../../raw/ai-coding-agents/2026-10-15-openai-decisions-api-status-check.md) §②）

## 请求格式要点

来自官方参考页（详见 [raw/ai-coding-agents/2026-10-07-openai-decisions-api-beta-schema.md](../../raw/ai-coding-agents/2026-10-07-openai-decisions-api-beta-schema.md)）：

- `model`：当前仅支持 `gpt-6-luna`。
- `input`：纯文本字符串或 user 消息数组。
- `questions`：1–200 道题目，三选一（predicate / choice / score），Predicate 必填 `instructions`。
- 响应含 `answers` 数组（按题型返回不同结构）与 `usage`。

## GitHub Copilot 后端探测

以下结论基于同一测试条件（同一上游、同一认证、同一请求头），不推广为其他账号或主机。（[raw](../../raw/ai-coding-agents/2026-10-15-copilot-decisions-endpoint-probing.md)）

| 探测项 | 结果 |
|---|---|
| 路径变体对照 | 仅 `/v1/decisions` 被区别处理；其余变体与虚构路径均 404 |
| 完整 Predicate 请求的模型校验 | 请求返回 400 `model_not_supported` |
| 异常请求错误分级 | 虚构/空/null model、字段名错误、字段类型错误、题目结构错误共 7 类，返回 4 种不同响应（含 `invalid_request_body` 与纯文本 `Bad Request`） |
| `questions` 结构校验 | 缺失、空数组、改为对象三类得到不同处理；题型与 `instructions` 未暴露专用校验错误 |
| 完整 Decisions 正文发到 Responses 路径 | HTTP 200，返回普通 Responses 结构（含 reasoning 与 message 项），无 Decisions `answers` 数组 |

**推断**：Responses 路径将 Decisions 正文按普通文本生成处理，`questions` 未被使用。此为推断，非服务端确认。

## 客户端源码与依赖

- 独立 Copilot Chat 仓库已归档，当前源码位于 VS Code 主仓库 Copilot 扩展目录。
- 主仓库锁定 `@vscode/copilot-api@0.5.2`；该版本无 Decisions 请求类型与 URL 映射，`ModelRouter` 实际映射到 `/models/session/intent`。
- DomainService 声明中存在独立 Model Lab 主机（`isModelLab` 选项控制），尚未探测。
- 公开代码搜索未找到通过 GitHub Copilot 后端调用 Decisions API 的公开实现。

## 证据边界

- 所有 Copilot 探测结果仅代表本次测试条件；不推广为全部账号或全部主机。
- `/v1/decisions` 被区别处理不等于该端点已实现可执行的 Decisions 推理；功能状态与权限条件未验证。
- 未向 Model Lab 主机发送请求；未测试其他账号。
- 探测过程产生少量 Responses 推理用量（181 tokens 与 16 tokens 各一次）。

## See Also

- [Jev 在 OMP、Codex、OpenCode 的现成集成盘点](jev-host-integrations.md)
