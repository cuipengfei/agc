# GitHub Copilot 平台 `/v1/decisions` 端点行为探测（2026-10-15 会话实测）

> Source: 本会话对 GitHub Copilot 上游的实际 HTTP 请求与响应；微软 VS Code 仓库源码；npm 包 `@vscode/copilot-api` 发布包
> Collected: 2026-10-15
> Published: Unknown（探测记录，非已发表来源）

证据分级标签：**文档原文**＝逐字引用；**实测**＝本会话实际抓取；**推断**＝由证据推得但未直接证实。

本 raw 不含任何主机名、账号标识、认证 token、cookie、模型 ID 或完整内部响应 ID。

## ① 探测目标与认证

探测目标：GitHub Copilot 上游 `POST /v1/decisions`。  
认证：使用会话中运行的 Copilot 代理实例，经 OAuth token 交换取得 Copilot token；token 值未保存、未写入任何文件。

测试正文采用 OpenAI Decisions API 官方文档示例格式（`model`/`input`/`questions` 结构，predicate 题型）。

## ② 路径变体对照（实测）

| 路径 | HTTP | 响应 |
|---|---|---|
| `/v1/decisions` | **400** | `{"error":{"message":"Model is not supported for this request.","code":"model_not_supported","param":"model","type":"invalid_request_error"}}` |
| `/decision` | 404 | `404 page not found` |
| `/v1/decision` | 404 | `404 page not found` |
| `/decisions` | 404 | `404 page not found` |
| 虚构路径对照 | 404 | `404 page not found` |

**实测结论**：只有 `/v1/decisions` 被区别处理；其余变体与虚构路径一致 404。

## ④ 异常请求错误分级（实测）

同一端点，逐次改变单个字段：

| 条件 | HTTP | 响应 |
|---|---|---|
| 虚构模型 ID，其余正常 | 400 | `The requested model is not supported.` |
| `model: ""`，其余正常 | 400 | 纯文本 `Bad Request` |
| `model: null`，其余正常 | 400 | 纯文本 `Bad Request` |
| 所有字段名写错 | 400 | 纯文本 `Bad Request` |
| 正常模型、其余字段名写错 | 400 | 纯文本 `Bad Request` |
| 字段名正确、类型错误（`input: 12345`，`questions: "not-an-array"`） | 400 | `invalid_request_body`：`The request body is not valid JSON.` |
| 正常模型与文本、题目 type 虚构、name/instructions 类型错误 | 400 | `invalid_request_body`：`The request body is not valid JSON.` |
| 删除 `questions` | 400 | 纯文本 `Bad Request` |
| `questions: []` | 400 | 纯文本 `Bad Request` |
| `questions` 从数组改为对象 | 400 | `invalid_request_body` |
| Predicate 删除 `instructions` | 400 | `model_not_supported` |
| 题目 type 改为虚构值 | 400 | `model_not_supported` |
| `input` 改为官方允许的 user message 数组 | 400 | `model_not_supported` |

**实测结论**：后端对 `questions` 存在性、空数组和类型有区别处理；对题型与 `instructions` 没有暴露专用校验错误。`invalid_request_body`/`not valid JSON` 报文不区分 JSON 语法错误与字段类型错误（请求经 JSON.stringify 编码为合法 JSON）。

## ⑤ 完整 Decisions 正文发到 Responses 路径的交叉对照（实测）

将完整 Decisions 请求体（含 `model`、`input`、`questions`）POST 到同一上游的 Responses 路径：

- 返回 HTTP **200**。
- 响应为普通 Responses 结构：`status: "completed"`，输出数组含 reasoning 项与 assistant message 项，文本位于 `content[].text`。
- **响应中不存在 Decisions 的 `answers` 数组或 `probability` 字段**。
- 用量记录：本次请求 181 tokens（含 99 reasoning tokens），属普通文本生成用量。

**推断**：Responses 路径将该正文按普通 Responses 请求处理，`questions` 未被使用。此为推断，非服务端确认。

## ⑥ 客户端源码与依赖包核查（文档原文＋实测）

- 独立 Copilot Chat 仓库已 **Archived**，README 说明项目迁入 VS Code 主仓库。当前 Copilot 源码位于 VS Code 主仓库的 Copilot 扩展目录。
- 主仓库 lockfile 将 `@vscode/copilot-api` 锁定在 **0.5.2**（实测：直接读取该文件中的锁定条目）。
- `@vscode/copilot-api@0.5.2` 发布包：**没有 Decisions 请求类型与 URL 映射**。请求类型枚举包含 ChatResponses、ChatCompletions、ChatMessages、Models、Auto；另有 `ModelRouter`，URL 映射为 `/models/session/intent`。
- DomainService 声明中存在独立 Model Lab 主机，由 `isModelLab` 选项控制模型目录与生成请求路由；**本 raw 未向该主机发送任何请求**。

## ⑦ 公开检索记录

对 Copilot Decisions API 的公开实现进行了网页搜索、Tavily、GitHub code search 与 grep.app 检索，**未找到**通过 GitHub Copilot 后端调用 Decisions API 的公开代码仓库，也未找到支持模型 ID、请求头要求或启用条件。零命中不等于不存在，仅说明在所查范围内未发现。

## ⑧ 证据边界

- 所有探测结果仅代表本次会话的测试条件（同一上游、同一认证、同一请求头组合）；不推广为其他账号、其他主机或其他条件。
- `/v1/decisions` 被区别处理不等于该端点已实现可执行的 Decisions 推理；功能状态与权限条件未验证。
- `invalid_request_body` 报文的实际触发条件（字段类型 vs 语法）未在服务端确认，本 raw 只记录观测到的对应关系。
- 响应头 `x-github-request-id` 可用于向官方排查，值未写入本 raw。
