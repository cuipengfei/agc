# Agent 配置追踪

本仓库追踪本机 Agent 工具的配置、setup 和自定义扩展：

- Codex
- OpenCode
- OMO
- OMP
- Prime Agent

## 目录映射

| 仓库目录 | 本机来源 |
| --- | --- |
| `codex/` | `~/.codex/` |
| `opencode/` | `~/.config/opencode/` |
| `omo/` | `~/.omo/` |
| `omp/` | `~/.omp/` |
| `prime/` | `~/.prime/agent/` |

仓库保存来源文件的副本，不使用 symlink。实际同步范围由 `manifest.json` 控制。

## 代码结构

同步实现位于 `src/agc_sync/`：

- manifest 与路径映射
- 凭据策略
- 文件传输与原子写入
- 备份
- pull / push 用例
- CLI 编排

根目录 `sync.py` 仅是兼容入口。

## 同步命令

```bash
./pull.sh --dry-run
./pull.sh
./push.sh --dry-run
./push.sh
./sync.py status
./sync.py diff
```

`pull` 不把来源凭据带入仓库；`push` 保留目标位置已有凭据，并在覆盖前创建备份。

## 不追踪

- tokens、secrets、passwords、cookies、credentials、authorization
- `.env`、私钥、数据库、日志、缓存、session、运行时状态
- `~/.codex/umans.config.toml`
- `~/.omp/agent/extensions/umans-status.ts`
- `~/.prime/agent/` 下的 `auth.json`、`telemetry.json`、`AGENTS.md`（symlink 到用户级共享规则）、sessions/logs/venv 等运行时产物

详细规则见 [`AGENTS.md`](AGENTS.md)。
