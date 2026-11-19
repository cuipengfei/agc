# Agent 配置追踪

本仓库追踪本机 Agent 工具的配置、setup 和自定义扩展：

- Codex
- OpenCode
- OMO
- OMP
- Herdr
- Prime Agent
- Starship

## 目录映射

| 仓库目录 | 本机来源 |
| --- | --- |
| `codex/` | `~/.codex/` |
| `opencode/` | `~/.config/opencode/` |
| `omo/` | `~/.omo/` |
| `omp/` | `~/.omp/` |
| `herdr/config.toml` | `~/.config/herdr/config.toml` |
| `prime/` | `~/.prime/agent/` |
| `starship/` | `~/.config/starship.toml` |
| `plannotator/` | `~/.plannotator/` |

仓库保存来源文件的副本，不使用 symlink。同步是单向的：来源 -> 仓库。要改配置就在来源处改，再 pull 进仓库并提交，仓库只作版本化备份与变更历史。实际同步范围由 `manifest.json` 控制。

Herdr 的同步范围限定为主配置 `config.toml`，作为 protected 条目处理。

## 代码结构

同步实现位于 `src/agc_sync/`：

- manifest 与路径映射
- 凭据策略
- 文件传输与原子写入
- pull 用例
- CLI 编排

根目录 `sync.py` 仅是兼容入口。

## 同步命令

```bash
./pull.sh --dry-run
./pull.sh
./sync.py status
./sync.py diff
```

`pull` 不把来源凭据带入仓库。仓库不会写回来源，因此仓库里不应出现真实凭据。

## 不追踪

- tokens、secrets、passwords、cookies、credentials、authorization
- `.env`、私钥、数据库、日志、缓存、session、运行时状态
- `~/.codex/umans.config.toml`
- `~/.omp/agent/extensions/umans-status.ts`
- `~/.prime/agent/` 下的 `auth.json`、`telemetry.json`、`AGENTS.md`（symlink 到用户级共享规则）、sessions/logs/venv 等运行时产物

详细规则见 [`AGENTS.md`](AGENTS.md)。

## OMP Antigravity 兼容扩展

`antigravity-prompt-adapter.ts` 为 `antigravity-cli` 改写系统提示中的身份句与提交说明，保留原有操作要求。`antigravity-schema-adapter.ts` 从发送给 Antigravity 的工具枚举中移除 `null`，原工具参数校验保持不变；仅含 `null` 的枚举会明确报错。扩展从当前 Bun 全局安装的 OMP 加载 provider、schema 工具与 `json-schema-traverse`，升级后需重验这些接口。

`agy-sensitive-guard.ts` 阻断 `read`、`grep` 直接读取七个已知凭据文件，处理路径选择器、多路径和 symlink；也阻断直接调用或通过 `env` 调用的 `agy mcp list/add`。普通 shell 命令和父目录搜索不在完整防护范围内。三个扩展由 OMP 自动发现，在新进程中生效。

历史验收：OMP `18.22.2`、agy `1.5.11`、Gemini `3.8 Flash` / `medium` 下，兼容扩展完成真实 TUI 问候与一次 Tavily 搜索。

### ACP 诊断

从仓库根目录执行以下命令。默认操作只读取 `~/.omp/agent/mcp.json`，输出该文件中的服务名称、连接类型和启用状态；它不检查服务是否可连接，也不输出配置值。其他配置文件可用 `mcp-status --config FILE` 指定。

```bash
bun tools/agy-acp-diagnose/cli.ts mcp-status
```

以下命令需要当次授权。`diagnose` 启动新的无 session OMP 进程，按当前工作目录与配置捕获它实际交给 `agy` 的 system、模型、thinking 和工具声明；它不会读取当前交互会话的运行状态。OMP 启动时可能连接已配置的 MCP 服务。

```bash
bun tools/agy-acp-diagnose/cli.ts diagnose --live --max-requests 12 --model antigravity-cli/gemini-3.8-flash --thinking medium --bisect
bun tools/agy-acp-diagnose/cli.ts schema --live --server SERVER_NAME --config "$HOME/.omp/agent/mcp.json"
```

`diagnose` 固定捕获的账号、模型、thinking 和 MCP bridge，依次测试中性 system 与零工具、实际 system 与零工具、中性 system 与实际工具。`--bisect` 在实际 system 返回 429 时按行查找，最多使用 `--max-requests` 指定的请求数；报告只包含行号和长度。每次探测收到首条 429、400 或 503 后结束对应 `agy` 进程；503、网络错误、超时和意外工具调用会停止本轮对照，工具调用不会执行。

`schema --live` 只连接显式配置文件中指定的 `SERVER_NAME`，按 OMP 的 MCP 配置规则解析环境变量、header 和 `!command`，这些命令可能产生自己的副作用；它不读取 OMP 的 OAuth 数据库。输出比较来源 schema 与标准 OMP wire schema 的字段结构，不包含 description、enum 值或配置值。已有 `tools/list` JSON 也可通过 stdin 离线比较：`bun tools/agy-acp-diagnose/cli.ts schema < tools-list.json`。

诊断工具不保存捕获的 system、工具声明或认证消息。探测用的账户 token 副本与 OMP 日志放在 `/dev/shm` 的私有目录中，正常结束及 SIGINT/SIGTERM 时删除；强制终止进程可能留下该目录。OMP 启动时仍以其正常方式使用账号文件，并将 MCP 来源工具缓存写入 `agent.db`。自定义 `PI_CODING_AGENT_DIR` 的默认 profile 不支持状态隔离，诊断会拒绝启动。

扩展测试在来源目录维护，由 manifest 定向同步到 `omp/agent/extension-tests/`；诊断工具测试直接在仓库维护。CI 在相关文件变更时执行以下本地协议替身测试，不发送真实模型请求：

```bash
bun test omp/agent/extension-tests/antigravity-prompt-adapter.test.ts omp/agent/extension-tests/antigravity-schema-adapter.test.ts omp/agent/extension-tests/agy-sensitive-guard.test.ts tools/agy-acp-diagnose/*.test.ts
```

## Tern 升级辅助工具

[`tools/tern-maintain`](tools/tern-maintain/README.md) 提供官方资源校验、WASM 结构与字体定位、人工修改清单、字体清单生成、结构报告和无界面检查。它独立于配置同步，不自动改写 WASM 指令，不接触现有 pane。行为测试由 `.github/workflows/tern-maintain.yml` 执行。
