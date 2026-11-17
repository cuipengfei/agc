# Antigravity CLI 与 OMP 接入：本机会话证据

> Source: 2026-11-17 至 2026-11-18 本机会话、OMP 18.22.0 安装包源码、agy 1.5.10 脱敏日志与用户提供的 CLI 输出；https://github.com/google-antigravity/antigravity-cli/issues/904；https://github.com/google-antigravity/antigravity-cli/issues/1180
> Collected: 2026-11-18
> Published: Unknown

## 接入与源码

本机 `omp --version` 输出 `18.22.0`；`agy --version` 输出 `1.5.10`；`nc` 存在。用户授权向 `~/.omp/agent/config.yml` 的 `enabledModels` 加入 `antigravity-cli/*`，并向 `~/.omp/agent/.env` 加入 `PI_AGY_PATH=/home/<USER>/.local/bin/agy`。`omp config get enabledModels` 包含该项。使用 OMP 的 `resolveAgyBinary()` 检查时返回指定的可执行文件路径。

OMP 18.22.0 的 `antigravity-cli/binary.ts` 优先检查 `PI_AGY_PATH`；未设置时使用 OMP 管理的安装目录和下载流程。OMP 的 `antigravity-cli/host.ts` 启动 `agy acp --agent bridge --gemini-dir <目录> --ide-mcp-port <端口> --dangerously-skip-permissions`，并经子进程 stdin/stdout 调用 ACP 的 `connection.prompt(...)`。OMP 的 `credentials.ts` 向 `https://oauth2.googleapis.com/token` 刷新凭据。登录凭据、邮箱及授权回调均未摘录。

## 服务返回与使用观察

- 2026-11-17：`agy` ACP 日志记录认证成功后出现 `403 PERMISSION_DENIED`、`UNSUPPORTED_LOCATION`、`error_number: 1008`。服务端响应没有提供其判定的国家代码。`CCPA routed this account to AICode`，并出现 `https://aicode.googleapis.com/v1alpha:fetchConfig` 请求和 `UseAICodeMendel routing switch changed: false -> true`。
- 2026-11-17：用户在 `agy -p "/usage"` 中获得 `Eligibility check failed: Get "https://www.googleapis.com/oauth2/v2/userinfo": EOF`；`agy -p "/credits"` 输出 `no credits info found`。
- 2026-11-17 至 2026-11-18：用户报告 `/usage` 输出 `Gemini Models Weekly Limit Remaining 100%` 和 `Claude and GPT models Weekly Limit Remaining 100%`；同一会话另有 `/credits` 返回 `no credits info found`。
- OMP 最小生成对照使用 `Gemini 3.8 Flash` 和美国节点；原生客户端报告 `INVALID_ARGUMENT (code 400)`，工具 schema 中 `topic.enum[2]`、`search_depth.enum[4]`、`time_range.enum[4]` 有 `cannot be empty`。测试时 `--no-tools` 未阻止 MCP 工具参与。该次请求没有返回 `1008`，完整生成与 OMP 工具调用未成功。
- OMP 会话出现 `RESOURCE_EXHAUSTED (code 429)`；`agy` 日志记录 Gemini 3.8 Flash 的 `daily-cloudcode-pa.googleapis.com/v1internal:streamGenerateContent` 返回通用资源耗尽消息，自动重试等待约 4、7.35、15.81 秒，没有给出具体限流指标或重置时间。
- 2026-11-18 原生 CLI 显示 `You do not have a valid license of this product`、`#3501`；该轮日志标记 `authMethod=consumer`、`403 PERMISSION_DENIED`、`SUBSCRIPTION_REQUIRED` 和 `error_number: 1001`。该轮还记录 `CCPA routed this account to AICode, but AICode FetchConfig failed`，原因是 `context deadline exceeded`。超时和授权拒绝的因果关系未知。
- 用户随后报告 `agy -p "hello"` 返回 `Hello! How can I help you today?`，退出码 `0`；另一次 `agy -p "can you speak chinese?"` 返回中文回复。两次为原生 CLI 的用户观察，不能替代 OMP 工具调用验证。

上游 issue 904 记录有用户在额度显示仍有剩余时报告通用 `RESOURCE_EXHAUSTED`，并描述 CLI 与 ACP 的表现差异；issue 1180 记录用户遇到 `#3501`。这些是外部用户报告，不能确定本机会话的根因。
