# Kiro 接入 OMP：ns-omp-provider-kiro 设置与验证实录

> Sources: 本会话 OMP 18.12.5 + ns-bridge 0.1.15 实测, 2026-10-22; 2026-10-23 DNS 超时与 Kiro 目录刷新修复; 本机 OMP 18.22.2 发布记录、插件代码与启动验证, 2026-11-18
> Raw: [Kiro OMP 设置实录](../../raw/omp-tips/2026-10-22-kiro-omp-setup-via-ns-bridge.md); [Kiro 模型目录刷新与 OMP 可见性排查](../../raw/omp-tips/2026-10-23-kiro-omp-model-visibility-fix.md); [Kiro 模型目录刷新验证记录](../../raw/omp-tips/kiro-omp-model-visibility-fix.md); [Kiro 认证与 SoT](../../raw/model-gateway-mismatch/2026-10-22-kiro-auth-paths-billing-sot.md); [内置 Kiro 与插件注册冲突](../../raw/omp-tips/2026-11-18-omp-kiro-builtin-plugin-conflict.md)
> Updated: 2026-11-18

## Overview

本文记录 OMP 18.12.5 的插件接入与真实请求验证，以及 OMP 18.22.2 内置 Kiro 后的插件冲突处理。使用时按版本选择对应章节。

## OMP 18.22.2：内置 Kiro 与插件冲突

OMP 18.22.2 的发布记录新增内置 Kiro provider，登录入口为 `/login kiro`。同一版本将 `kiro-api` 列为内置 API 保留名称；已安装的 `ns-omp-provider-kiro@0.5.3` 同时声明 `api: "kiro-api"` 和自定义 `streamSimple`，加载时触发：

```text
ConfigurationError: Cannot register custom API "kiro-api": built-in API names are reserved.
```

本机通过单插件禁用恢复启动：

```bash
omp plugin disable ns-omp-provider-kiro
```

命令将 `~/.omp/plugins/omp-plugins.lock.json` 中该插件的 `enabled` 改为 `false`；加载器跳过禁用插件，插件安装文件和 OMP 内置 Kiro provider 仍然保留。执行前后比较确认其他插件状态未变。

启动验证命令为 `omp --mode rpc --no-session --no-ui`，标准输入发送 `{"id":"boot-check","type":"get_state"}`。本机返回 `success: true`，进程退出码为 `0`，stdout/stderr 没有出现上述注册异常。本次验证范围为 OMP 初始化与 RPC 响应；内置 Kiro 登录、凭据迁移、模型生成请求和交互式 TUI 未执行验证。

## OMP 18.12.5 插件接入记录

> **Status: Outdated** (2026-11-18)
> 本节保留 OMP 18.12.5 的插件安装与验证记录。已安装 OMP 18.22.2 的本机出现 `ns-omp-provider-kiro@0.5.3` 与内置 API 名称冲突，处理方法见上节。

### 环境前提

- OMP 18.12.5，`bun 1.4.3`，`@ngosangns/ns-bridge@0.1.15` 已全局安装
- `kiro-cli 2.33.0`（`curl -fsSL https://cli.kiro.dev/install | bash`）已完成 GitHub 登录

### 设置步骤

1. `omp plugin install ns-omp-provider-kiro@0.5.3` — 装 OMP 专用插件（ns-bridge CLI 只是管理面，实际注册还是这个包）。
2. `ns-bridge providers status omp kiro` — 确认开关为 `omp kiro on`。
3. OMP 新进程会加载插件，`omp models kiro --json` 列出初始模型骨架（此时未认证）。
4. **登录**：OMP 会话输入 `/login kiro`；有已认证的 kiro-cli 会话时直接复用；否则提示输入 `ksk_` Key（生成页 https://app.kiro.dev/settings/api-keys）。输出 `Successfully logged in to kiro / Credentials saved to ~/.omp/agent/agent.db`。
5. `ns-bridge models refresh kiro --apply` — 拉取账号真实模型目录。
6. `~/.omp/agent/config.yml` 的 `enabledModels` 加入 `  - kiro/*`（编辑前备份 `config.yml`）。

### 验证分级

| 层级 | 命令 | 判据 |
|---|---|---|
| SDK 层 | bun + OMP `ModelRegistry`/`discoverAuthStorage`/`streamSimple` 脚本 | 文本 + 工具调用 + 流式事件 + 回传 |
| CLI 层 | `env NODE_TLS_REJECT_UNAUTHORIZED=1 omp -p --model kiro/<model> ... ...` | 真实请求、exit 0 |

> **验证记录**：2026-10-22 的 OMP SDK + CLI 真实请求已验证 `kiro/minimax-m2-1`；2026-10-23 原生 Kiro CLI 对 `claude-sonnet-4.5` 的请求返回 `MODEL_OK`。Kiro 目录刷新后列出 `claude-sonnet-4-5`、`claude-haiku-4-5`；Haiku 仅验证目录可见，未验证生成请求。其余模型仍未逐一实测。

### 历史环境注意事项

- **TLS**：本机存在某处设置的 `NODE_TLS_REJECT_UNAUTHORIZED=0` 环境；每次网络验证都要显式置回 `=1`，不处理全局。
- **MCP ECONNRESET**：OMP 启动时 `sofa` MCP server 偶发 `ECONNRESET` 警告，与 Kiro 链路无关。
- **只看 `omp models` 不够**：未认证时也能列出骨架条目；真实登录 + 刷新目录 + 最小请求三层齐备才算走通。

### 管理目录刷新与菜单可见性

- `omp models refresh` 刷新 OMP 本地模型列表；它不会重新请求 Kiro `ListAvailableModels`。要刷新 Kiro 目录，使用 `ns-bridge models refresh kiro --apply`。
- 2026-10-23 的环境中 Node 默认 DNS 查询耗时约 11 秒，IPv4 查询约 5 毫秒，IPv6 查询 10 秒后超时；undici 连接超时为 10 秒。给 Kiro management 请求使用同版 Undici `fetch` + `Agent`，并只查询 IPv4 后，目录刷新成功，返回 8 个模型。
- 当时 `enabledModels` 已含 `kiro/*`，provider 状态为 `omp kiro on`，插件已启用。用户之后报告模型菜单出现；没有捕获启动日志，菜单为何稍后显示仍未知。

## See Also

- [Kiro 后端 API 给任意 agent 用：仓库生态与 OMP 视角排名](../ai-coding-agents/kiro-backend-api-for-agents.md)
- [Kiro 认证凭据路径速查（免费 vs 付费）](../model-gateway-mismatch/kiro-auth-paths-cheatsheet.md)
