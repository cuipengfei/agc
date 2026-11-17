# OMP `antigravity-cli`：把 Google Antigravity CLI 包装成 ACP provider

> Sources: `can1357/oh-my-pi` v18.20.2 `docs/providers.md` 与 provider 源码、Google Antigravity CLI 官方文档，2026-11-15 查阅；OMP 18.22.0 源码、agy 1.5.10 日志与用户会话输出，2026-11-17 至 2026-11-18
> Raw: [OMP antigravity-cli provider 摘录](../../raw/omp-auth/2026-11-15-omp-antigravity-cli-acp-provider.md); [本机会话：接入与错误](../../raw/omp-auth/2026-11-18-antigravity-cli-session-routing-and-errors.md)
> Updated: 2026-11-18

## 它解决什么

`antigravity-cli` 让 OMP 使用 Google Antigravity 账号提供的模型。OMP 负责当前对话、工具执行与权限确认；模型请求经由本机的 Google Antigravity CLI（`agy`）发出。它和 OMP 内置的直连 OAuth provider `google-antigravity` 是两个独立条目。

适合已有 Antigravity 账号、希望在 OMP 里用该账号模型的人。文档写明模型目录跟随 `agy` 1.5.9 的模型选择器，实际可用范围仍取决于登录账号。

## 使用流程

1. 运行 `/login antigravity-cli` 或 `omp login antigravity-cli`。
2. 完成 `agy` 的 Google 登录，粘贴授权码或回调地址。
3. 选择模型，例如 `antigravity-cli/gemini-4-carbon` 或 `antigravity-cli/claude-sonnet-5-5`。

## 二进制与凭据

OMP 从 Google 的发布清单下载 `agy`，用 SHA-512 校验，把带版本号的程序放在数据目录下（通常是 `~/.omp/antigravity-cli/bin`）。最多每 24 小时检查一次更新，不改动 shell 配置。设置环境变量 `PI_AGY_PATH` 可以改用已有的可执行文件。CLI 的 IDE 工具通道要求 `PATH` 上有 `nc`（netcat）。

清单地址为 `https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests`，只接受指向 `storage.googleapis.com` 的 HTTPS 下载链接。压缩包里取名为 `antigravity` 的可执行文件，保存到磁盘时命名为 `agy`（Windows 为 `agy.exe`）。

登录结果进入 OMP 的凭据库，之后由常规刷新与 broker 分发管理。ACP 子进程使用独立、按账号隔离的原生凭据文件，不改动你平时使用的 `agy` 登录。文档明确不要用 `--api-key` 传入访问令牌。

## 指令与工具怎么归属

这是这套接入最需要注意的部分。

OMP 通过 ACP 与 IDE MCP 桥把 system prompt 和工具 schema 交给 `agy`。工具名在 OMP 内保持原名，`agy` 呈现给模型时加前缀，形如 `mcp_ide-tools_<name>`。

OMP 写入一个专用 agent 定义，字段为 `name: bridge`、`mainAgent: true`、`subagent: false`、`tools: []`、`inheritCustomizations: false`、`excludeDefaultComponents: true`。该定义写到 `agy` 配置目录下的 `config/agents/bridge.md`。

效果是按设计让模型主要遵循 OMP 的指令、使用 OMP 的工具：内置 agent prompt 与 coding tools 被排除。`agy` 的 `manage_task` 与 MCP resource 工具仍由 `agy` 内部处理。交给 OMP 的工具，其执行与审批留在 OMP 侧。

system prompt 通过 ACP 元数据传入，形状为 `{ antigravity: { systemPrompt: { append: system } } }`。

## 会话保持与工具超时

传输层在多步模型调用之间保留 `agy` 的会话，包括 OMP 执行工具的期间。编辑、分支或上下文变化时，尽量恢复到匹配的已保存 turn 边界；恢复不了就把保留的 transcript 交给一个新会话。

`agy` 的 MCP 超时为三分钟。更长的工具操作需要取消它正在等待的 turn，把完成的结果作为后续消息交付。

OMP 源码里的相关常量为：启动超时 `60_000` 毫秒、工具宣告等待 `2_000` 毫秒、工具挂起上限 `HOLD_LIMIT_MS = 165_000` 毫秒、取消确认超时 `5_000` 毫秒。构造器拒绝 `holdLimitMs + cancelTimeoutMs >= 180_000` 的配置，报错原文为 `Antigravity CLI cancellation must finish before its 180s MCP deadline`。

启动参数为 `agy acp --agent bridge --gemini-dir <目录> --ide-mcp-port <端口> --dangerously-skip-permissions`，环境里带 `AGY_CLI_DISABLE_AUTO_UPDATE=1`。

## 模型与思考等级

目录列出七个模型：

| model id | 上下文 | 输出上限 | 思考 |
|---|---:|---:|---|
| `gemini-4-carbon` | 1048576 | 262144 | low/medium/high |
| `gemini-4-argon` | 1048576 | 65536 | low/medium/high |
| `gemini-4-hydrogen` | 1048576 | 262144 | low/medium/high/xhigh |
| `gemini-3.8-flash` | 1048576 | 65536 | low/medium/high |
| `claude-opus-5-5` | 1000000 | 128000 | low/medium/high |
| `claude-sonnet-5-5` | 1000000 | 128000 | low/medium/high |
| `gpt-oss-120b-medium` | 131072 | 32768 | 无（id 固定 medium） |

默认模型为 `gemini-4-carbon`。所有模型价格字段为零，来源说明为套餐用量、无 token 单价。`gpt-oss-120b-medium` 标记为不支持推理参数。

## 限制

- ACP 支持模型与思考等级选择，不支持由调用方指定 temperature、stop sequence 或输出 token 上限。
- token 统计在原生 turn 结束时才到达；中间步骤报告的是已占用上下文。
- 登录前会显示 Google 的账号政策提示。
- Google FAQ 称第三方软件访问 Antigravity 违反其服务条款，可能导致账号被暂停或终止；这一点与 OMP 内置的直连 provider 相同，见 [OMP Antigravity 认证与社区 API](google-antigravity-auth-and-api.md)。

## 本机状态（2026-11-15 至 2026-11-17）

2026-11-15 核对时 OMP 为 `18.20.2`，`enabledModels` 未包含 `antigravity-cli/*`，`nc` 存在。2026-11-17 核对时 OMP 为 `18.22.0`、`agy` 为 `1.5.10`；用户授权加入 `enabledModels` 和 `PI_AGY_PATH`，配置读取与 `resolveAgyBinary()` 返回结果均已检查。

## 本机调用与错误观察（2026-11-17 至 2026-11-18）

OMP 启动本机 `agy acp` 子进程，经 stdin/stdout 发送 ACP `connection.prompt(...)`；`agy` 向模型服务发起请求。OMP 自身还向 `oauth2.googleapis.com/token` 刷新凭据。普通 `agy` 与 OMP 的 ACP 子进程使用隔离的原生凭据目录。

| 观察 | 当次证据与范围 |
|---|---|
| `403 UNSUPPORTED_LOCATION / 1008` | ACP 登录成功后的服务端拒绝；响应未提供最终采用的国家代码 |
| `429 RESOURCE_EXHAUSTED` | Gemini 3.8 Flash 的流式生成返回通用资源耗尽消息；日志未给出具体限流指标或重置时间 |
| `403 SUBSCRIPTION_REQUIRED / 1001` | 原生 CLI 提示 `#3501`；当次日志同时记录 AICode `FetchConfig` 超时，两者因果关系未知 |
| `400 INVALID_ARGUMENT` | OMP 最小请求进入 MCP 工具参数 schema 校验；`--no-tools` 未阻止 MCP 工具参与，完整生成未成功 |

用户随后报告两次原生 `agy -p` 得到英文和中文回复，其中一次退出码为 `0`。原生成功对应这两次请求；OMP 的完整工具调用尚未验证。`/usage` 曾报告 Gemini 与 Claude/GPT 每周剩余均为 `100%`；另一次 `/credits` 返回 `no credits info found`。

## 证据边界

早期文档与源码观察见 2026-11-15 原始材料；2026-11-17 至 2026-11-18 的 CLI 输出和日志见会话原始材料。`excludeDefaultComponents` 在 Google 侧对最终 prompt 的裁剪结果尚未验证。

## See Also

- [OMP Antigravity 认证与社区 API](google-antigravity-auth-and-api.md)
- [Google Antigravity：套餐、模型、额度与地区](../ai-coding-agents/google-antigravity-plans-and-regions.md)
- [OMP 环境变量全量参考](../omp/env-variables-reference.md)
