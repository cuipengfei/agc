# OMP agent.db 与 history.db：存储职责、表归属与索引级损坏修复

> Sources: 本会话只读检查与代码核对, 2026-11-03; 本会话排障与修复实录, 2026-11-03
> Raw: [2026-11-03-agent-db-schema-and-cache-owners](../../raw/omp/2026-11-03-agent-db-schema-and-cache-owners.md); [2026-11-03-history-and-agent-db-index-repair](../../raw/omp/2026-11-03-history-and-agent-db-index-repair.md)
> Updated: 2026-11-03

## Overview

`~/.omp/agent/` 下有两个长期使用的 SQLite 库：`agent.db` 保存凭据、泛用缓存、会话统计与记忆流水线状态；`history.db` 保存提示历史、会话标题与摘要。两个库由不同模块分别建表，同一个 `cache` 表被三条子系统共用。两者都出现过索引层损坏，可见症状分别是「缓存未命中、过期项不被清理」与「`Prompt history could not be saved` 警告」。

## agent.db 的职责

路径由 `getAgentDbPath(agentDir)` 给出，配置根默认为 `.omp`，可由 `PI_CODING_AGENT_DIR` 覆盖代理目录；改用 XDG 布局需要先执行 `omp config migrate`。

22 张表按建表语句分属三类：

| 负责模块 | 表 |
|---|---|
| `pi-ai/src/auth/sqlite-credential-store.ts` | `auth_credentials`、`auth_credential_blocks`、`auth_credential_refresh_leases`、`auth_credential_block_mirror_guard`、`auth_change_revision`、`auth_schema_version`、`client_usage`、`clients`、`cache`、`usage_history` |
| `pi-coding-agent/src/session/agent-storage.ts` | `model_perf`、`model_usage`、`command_usage`、`hint_usage`、`notice_claims`、`meta`、`schema_version`、`settings` |
| `pi-coding-agent/src/memories/storage.ts` | `stage1_outputs`、`threads`、`jobs` |

`memories/storage.ts` 只导出 `openMemoryDb(dbPath)`，路径由 `src/memories/index.ts` 以 `getAgentDbPath(agentDir)` 传入，因此记忆流水线的三张表也落在 `agent.db`。

`usage_cost_history` 在已安装 TS 源码中检索命中 0 个文件，来路未定。

## cache 表是三方共用的键值缓存

`cache` 不专属于凭据层。当日本机实测出现的键前缀有 `session`、`mcp_tools`、`usage_cache`、`extension_startup`，三条子系统写进同一个表：

| 键前缀 | 定义位置 | 过期常量 |
|---|---|---|
| `session:sticky:` | `pi-ai/src/auth/affinity.ts:11` | `SESSION_STICKY_TTL_SEC = 30 * 24 * 60 * 60` |
| `mcp_tools:` | `pi-coding-agent/src/mcp/tool-cache.ts:11` | `CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000` |
| `extension_startup:v1:` | `pi-coding-agent/src/extensibility/extensions/startup-deferral.ts:20` | `CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000` |

索引键错配时，粘性凭据的读取会拿到别的键的值。读方按凭据 ID 比对失败后丢弃并清空缓存项，可见表现是缓存未命中；本次未观察到错误路由。

## history.db 的职责

- 表：`history`、`history_fts`（含 shadow 表）、`session_titles`、`session_recaps`；触发器 `history_ai`。
- `history` 由 `history-storage.ts` 建表，`HistoryStorage.open()` 默认路径为 `getHistoryDbPath()`。
- `session_titles` 与 `session_recaps` 由 `src/session/session-index.ts` 建表，其文件头自述「Per-session index tables in history.db」。
- 消费方除了提示历史编辑器，还有输入预测：`setAddListener(syncTextPrediction)` 让预测进程在每条提示落盘后学习。
- 会话正文保存在 JSONL，不在这两个库里。

## 警告的产生链

写入失败不抛出，只记录日志并一次性通知监听器：

```ts
			logger.error("HistoryStorage add failed", { error: String(error) });
			if (!this.#writeFailureReported) {
				this.#writeFailureReported = true;
				this.#errorListener?.(error);
			}
```

监听器侧只显示一句 `Prompt history could not be saved; this prompt may be unavailable after restart.`。`#writeFailureReported` 在一次故障期内只触发一次，因此看到一次警告代表一段持续写入失败，单次偶发不会触发。

## 两次 history.db 损坏的性质不同

| 轮次 | 时间范围 | 日志特征 | 修复方式 |
|---|---|---|---|
| 第一轮 | 2026-10-20 起，2026-11-01 完成替换 | `fts5: corruption found reading blob 2611340115969 from table "history_fts"` 29 条，`database disk image is malformed` 32 条 | 恢复脚本重建（2026-11-01） |
| 第二轮 | 2026-11-02 复发 | 6 条 `HistoryStorage add failed`，全部为 `database disk image is malformed`；未出现 FTS5 错误 | 恢复脚本重建（2026-11-02） |

第二轮的损坏前原件表现：

- `PRAGMA integrity_check` 输出 9 行，首行为 `wrong # of entries in index idx_history_created_at`，其余 8 行报 78、91、99、151、240、248、479、583 行缺失。
- `history` 表 7945 行，`history_fts` 7946 条文档，全文检索可用（`MATCH 'omp'` 返回 913）。
- 逐行扫描 `idx_history_created_at` 得 7945 个不重复 rowid，与表侧比对只有 113 缺失。

`integrity_check` 的缺项清单与实际索引扫描结果不一致，说明索引结构与表数据不同步；此时逐条点查不能证伪损坏。第二轮的损坏位于索引层，全文检索本身可用。

## 修复判据：索引层与页面层分开

`agent.db` 本轮只有索引层异常，处理方式是副本上 `PRAGMA journal_mode=DELETE; REINDEX;`，随后逐表比较行数与内容摘要（22 张表全部相等），`auth_credentials` 8 行不变。装后 `cache` 索引条目数与表行数相同（548 / 548），键错配 0。

`history.db` 本轮走恢复脚本：`merge.history.merged_prompts` 7946、`ids_reassigned` 0、`max_id` 17839、`missing_from_candidate` 0、隔离行 0、`session_titles` 208、`session_recaps` 453、`fts_documents` 7946。

**未验证**：`REINDEX` 是否足以修复 `history.db` 那种索引结构不一致。本轮只对 `agent.db` 验证了 `REINDEX` 路径，`history.db` 使用恢复脚本，两条路径不能互相替代推断。

## 安装时的安全约束

两次替换都遵循同一组约束：

- 持有者闸：检测到 OMP 进程或目标库句柄时中止，要求退出后从普通 shell 运行。
- 安装前重新采集：正式安装重新复制最新 main、WAL、SHM，不复用先前构建的候选，避免丢失采集之后的写入。
- 源指纹比对：采集前后比较每个文件的 size 与 mtime，不一致即中止。
- 原件保全：替换前备份 main、WAL、SHM 并记录 SHA-256，安装状态写入 `installation-status.json`。

`history.db` 装后行数由候选 7946 增至 7949，并在 2026-11-03 达到 7954，说明重启后的真实写入恢复。`agent.db` 的 `cache` 行数由 784 降到 548，发生在重启后的清理周期内。

## 检查方法

- 完整性检查在副本上做：`sqlite3 <db> ".backup <target>"` 得到一致快照后再跑 `PRAGMA integrity_check`。线上库与快照输出一致，才能排除并发写入造成的假阳。
- `immutable=1` 可忽略 WAL 复现主文件状态，用于判断异常位于主文件还是 WAL。
- FTS 完整性语句 `INSERT INTO history_fts(history_fts) VALUES('integrity-check')` 需要可写连接；对 `mode=ro` 连接执行会报 `OperationalError attempt to write a readonly database`。
- 索引与表数据的差异用 `NOT INDEXED` 与 `INDEXED BY <index>` 对照，不需要读取业务内容。凭据表只取行数。

## 防护面的边界

`deny-mnemopi-grep.ts` 只登记 `getMemoriesDir()/mnemopi` 与 `getHistoryDbPath()` 两类受保护项，`agent.db`、`agent.db-wal`、`agent.db-shm` 不在拦截范围。对 `~/.omp/agent` 直接执行 `grep` 或 `read` 仍会打开这些文件。机制与防护层说明见 [OMP tool_call 范围防护扩展](../omp-extensibility/tool-call-range-guard-extension.md)。

## See Also

- [Mnemopi SQLite 损坏恢复](../omp-mnemopi/sqlite-corruption-recovery.md)
- [OMP predictive text engine](predictive-text-engine.md)
- [OMP tool_call 范围防护扩展](../omp-extensibility/tool-call-range-guard-extension.md)
