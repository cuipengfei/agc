# OMP agent.db 的组成、归属模块与检查方法

> Source: 本会话只读检查与代码核对（2026-11-02 至 2026-11-03）；已安装包 `@oh-my-pi/pi-coding-agent`、`@oh-my-pi/pi-ai`、`@oh-my-pi/pi-utils` 源码；`~/.omp/mem-ledger/recovery-20261102-agentdb/installation-sn4126mi/installation-status.json`
> Collected: 2026-11-03
> Published: 2026-11-03

## 用户的问法

- 「all db files ok?」之后，`agent.db` 报 `integrity_check` 失败。
- 「this db file is used for what cases? what contents stored in it? we know when and why it is broken?」

## 路径解析

`pi-utils/src/dirs.ts` 文件头注释说明：配置根使用 `PI_CONFIG_DIR`（默认 `.omp`），代理目录可由 `PI_CODING_AGENT_DIR` 覆盖；设置这些环境变量后路径改到 `$XDG_*_HOME/omp/` 下，需要先执行 `omp config migrate`。

`agent.db` 路径由 `getAgentDbPath(agentDir)` 给出（`pi-utils/src/dirs.ts` 定义；`pi-ai/src/auth-storage.ts`、`pi-ai/src/auth-broker/discover.ts`、`omp-stats/src/aggregator.ts`、`omp-stats/src/usage-windows.ts` 等 19 个源文件引用该函数）。

## 表清单与行数

数据取自 `installation-status.json` 的 `tables` 字段，时点 `2026-11-02T15:48:26.721795+00:00`，共 22 张表：

| 表 | 行数 | 负责模块（按建表语句定位） |
|---|---:|---|
| `auth_credentials` | 8 | `pi-ai/src/auth/sqlite-credential-store.ts` |
| `auth_credential_blocks` | 0 | 同上 |
| `auth_credential_refresh_leases` | 0 | 同上 |
| `auth_credential_block_mirror_guard` | 0 | 同上 |
| `auth_change_revision` | 1 | 同上 |
| `auth_schema_version` | 1 | 同上 |
| `client_usage` | 0 | 同上 |
| `clients` | 0 | 同上 |
| `usage_history` | 3267 | 建表在 `sqlite-credential-store.ts`；读取方为 `omp-stats/src/usage-windows.ts` |
| `cache` | 784 | `sqlite-credential-store.ts` |
| `model_perf` | 75 | `pi-coding-agent/src/session/agent-storage.ts` |
| `model_usage` | 129 | 同上 |
| `command_usage` | 96 | 同上 |
| `hint_usage` | 1 | 同上 |
| `notice_claims` | 0 | 同上 |
| `meta` | 2 | 同上（`omp-stats/src/db.ts` 另有同名表，属另一个库） |
| `schema_version` | 3 | 同上 |
| `settings` | 0 | 同上 |
| `stage1_outputs` | 62 | `pi-coding-agent/src/memories/storage.ts` |
| `threads` | 68 | 同上 |
| `jobs` | 87 | 同上 |
| `usage_cost_history` | 273 | 已安装 TS 源码中检索 `usage_cost_history` 命中 0 个文件 |

`memories/storage.ts` 只导出 `openMemoryDb(dbPath)`，路径由调用方给出；`src/memories/index.ts` 在 146、323、336、377、510 行都以 `getAgentDbPath(agentDir)` 传入，因此 `stage1_outputs`、`threads`、`jobs` 落在 `agent.db`。

## cache 表的键族

`cache` 是泛用键值缓存，由三条不同子系统共用同一个数据库句柄。当日本机实测出现的键前缀为 `session`、`mcp_tools`、`usage_cache`、`extension_startup`。

| 键前缀 | 定义位置 | 过期常量 |
|---|---|---|
| `session:sticky:` | `pi-ai/src/auth/affinity.ts:11`（注释：Prefix for persisted session-to-credential affinity.） | `SESSION_STICKY_TTL_SEC = 30 * 24 * 60 * 60`（`affinity.ts:13`） |
| `mcp_tools:` | `pi-coding-agent/src/mcp/tool-cache.ts:11` | `CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000`（`tool-cache.ts:12`） |
| `extension_startup:v1:` | `pi-coding-agent/src/extensibility/extensions/startup-deferral.ts:20` | `CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000`（`startup-deferral.ts:21`） |

## 打开数据库时的锁设置

`pi-coding-agent/src/memories/storage.ts:67-70`：

```ts
export function openMemoryDb(dbPath: string): Database {
	const db = new Database(dbPath);
	// Install the busy handler BEFORE any lock-taking statement. See #2421.
	db.exec("PRAGMA busy_timeout = 5000");
```

注释把「busy handler 必须先于任何取锁语句」与上游 #2421 关联。

## 检查方法与观测

- 对线上库与 `sqlite3 <db> ".backup"` 快照分别执行 `PRAGMA integrity_check`，两者输出一致，说明报告异常属于库内真实状态，可排除并发写入造成的假阳。
- 用 `immutable=1` 忽略 `-wal` 后，`quick_check` 仍报同样的索引条目数错误，说明异常位于主文件。
- FTS 完整性语句 `INSERT INTO <fts>(<fts>) VALUES('integrity-check')` 需要可写连接；对 `mode=ro` 只读连接执行时报 `OperationalError attempt to write a readonly database`。
- 用 `PRAGMA table_info` 与 `SELECT ... NOT INDEXED` / `INDEXED BY <index>` 对照，可定位索引与表数据的差异，不需要读取业务内容。

## 本次只读基线

2026-11-03 检查时 `agent.db` 的 `quick_check` 为 `ok`，`cache` 表 548 行；`history.db` 的 `quick_check` 为 `ok`，`history` 表 7954 行。
