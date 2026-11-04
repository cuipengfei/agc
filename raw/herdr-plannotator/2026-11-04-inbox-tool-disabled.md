# Plannotator Inbox 工具关闭：环境变量与配置两处改动

> Source: 本机 `~/.omp/agent/.env`、`~/.plannotator/config.json`、`~/.local/bin/plannotator` 与仓库同步结果
> Collected: 2026-11-04
> Published: Unknown

## 1. 改动

- `~/.omp/agent/.env`：`PLANNOTATOR_INBOX_TOOL` 从 `1` 改为 `0`，注释改为「plannotator inbox 工具开关：0 强制关闭，1 强制开启（Pi/OMP 主机默认关闭）」。
- `~/.plannotator/config.json`：`inboxTool` 从 `{ "pi": true, "opencode": true }` 改为 `{ "pi": false, "opencode": false }`。
- 未改动 `agentTool` 与 `PLANNOTATOR_AGENT_TOOL`，两者保持开启。
- 改动发生在 2026-11-04。

## 2. 开关解析

既有记录 [`plannotator-agent-tool-and-quick-labels.md`](../../wiki/herdr-plannotator/plannotator-agent-tool-and-quick-labels.md) 与本机可执行文件内的字符串一致：解析顺序为环境变量 → `config.json` 的 `inboxTool` → 主机默认值，环境变量优先且对所有主机生效。

在 `~/.local/bin/plannotator` 中检索到 `PLANNOTATOR_INBOX_TOOL` 与 `parseInboxToolEnv`、`resolveInboxTool` 等标识；值为 `0` 时判定关闭，不再回落到配置文件分支。

## 3. 复核

- `~/.omp/agent/.env` 解析后 `PLANNOTATOR_INBOX_TOOL=0`。
- `~/.plannotator/config.json` 解析后 `inboxTool = {'pi': False, 'opencode': False}`，`agentTool = True`。
- 当前 shell 环境变量仍为 `PLANNOTATOR_INBOX_TOOL=1`：它在会话启动时注入，与磁盘值不同。
- 仓库同步：`omp-env` 条目 `updated=1`，脱敏槽位 2 个；`plannotator-config` 条目 `updated=1`，脱敏槽位 0 个。两个条目的仓库副本各只有两行差异。

## 4. 生效边界

开关在会话启动时决定一次。已在运行的会话仍持有旧值与环境变量；新会话读取磁盘上的 `0` 后不会再注册 `plannotator_inbox`。

## 边界

- 没有重启 OMP 会话观察工具从清单中消失。
- Inbox 服务进程未停止，网页界面不受影响。
