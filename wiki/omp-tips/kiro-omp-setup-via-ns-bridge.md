# Kiro 接入 OMP：ns-omp-provider-kiro 设置与验证实录

> Sources: 本会话 OMP 18.12.5 + ns-bridge 0.1.15 实测, 2026-10-22
> Raw: [Kiro OMP 设置实录](../../raw/omp-tips/2026-10-22-kiro-omp-setup-via-ns-bridge.md); [Kiro 认证与 SoT](../../raw/model-gateway-mismatch/2026-10-22-kiro-auth-paths-billing-sot.md)
> Updated: 2026-10-22

## Overview

在 OMP 上把 Kiro 后端模型接入的上手路径。一次真实走通全过程：从安装插件、GitHub 登录、白名单加模型、TLS 警报响应，到 SDK 与 CLI 层的真实请求验证。

## 环境前提

- OMP 18.12.5，`bun 1.4.3`，`@ngosangns/ns-bridge@0.1.15` 已全局安装
- `kiro-cli 2.33.0`（`curl -fsSL https://cli.kiro.dev/install | bash`）已完成 GitHub 登录

## 设置步骤

1. `omp plugin install ns-omp-provider-kiro@0.5.3` — 装 OMP 专用插件（ns-bridge CLI 只是管理面，实际注册还是这个包）。
2. `ns-bridge providers status omp kiro` — 确认开关为 `omp kiro on`。
3. OMP 新进程会加载插件，`omp models kiro --json` 列出初始模型骨架（此时未认证）。
4. **登录**：OMP 会话输入 `/login kiro`；有已认证的 kiro-cli 会话时直接复用；否则提示输入 `ksk_` Key（生成页 https://app.kiro.dev/settings/api-keys）。输出 `Successfully logged in to kiro / Credentials saved to ~/.omp/agent/agent.db`。
5. `ns-bridge models refresh kiro --apply` — 拉取账号真实模型目录。
6. `~/.omp/agent/config.yml` 的 `enabledModels` 加入 `  - kiro/*`（编辑前备份 `config.yml`）。

## 验证分级（关键）

| 层级 | 命令 | 判据 |
|---|---|---|
| SDK 层 | bun + OMP `ModelRegistry`/`discoverAuthStorage`/`streamSimple` 脚本 | 文本 + 工具调用 + 流式事件 + 回传 |
| CLI 层 | `env NODE_TLS_REJECT_UNAUTHORIZED=1 omp -p --model kiro/<model> ... ...` | 真实请求、exit 0 |

> **仅 `kiro/minimax-m2-1` 完成真实请求验证**：文本 `KIRO_OMP_OK`/`KIRO_CLI_OK`、工具调用 `sum_integers(19,23)`→`42` 正确往返。目录中另有 `deepseek-3-2`、`glm-5`、`minimax-m2-5`、`qwen3-coder-next` 共 5 个模型，其余 4 个未经逐一请求验证。

## 陷阱

- **TLS**：本机存在某处设置的 `NODE_TLS_REJECT_UNAUTHORIZED=0` 环境；每次网络验证都要显式置回 `=1`，不处理全局。
- **MCP ECONNRESET**：OMP 启动时 `sofa` MCP server 偶发 `ECONNRESET` 警告，与 Kiro 链路无关。
- **只看 `omp models` 不够**：未认证时也能列出骨架条目；真实登录 + 刷新目录 + 最小请求三层齐备才算走通。

## See Also

- [Kiro 后端 API 给任意 agent 用：仓库生态与 OMP 视角排名](../ai-coding-agents/kiro-backend-api-for-agents.md)
- [Kiro 认证凭据路径速查（免费 vs 付费）](../model-gateway-mismatch/kiro-auth-paths-cheatsheet.md)
