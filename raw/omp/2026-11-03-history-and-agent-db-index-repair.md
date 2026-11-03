# OMP history.db 与 agent.db 损坏实录与索引修复

> Source: 本会话排障与修复实录（2026-11-02 至 2026-11-03）；`~/.omp/agent/` 下的线上库与保留原件；`~/.omp/logs/omp.2026-11-0*.log`；`~/.omp/mem-ledger/recovery-20261102-history/`、`~/.omp/mem-ledger/recovery-20261102-agentdb/` 的 `installation-status.json` 与 `report.json`
> Collected: 2026-11-03
> Published: 2026-11-03

## 用户的问法

- 「lately, i have been getting this warning: `Warning: Prompt history could not be saved; this prompt may be unavailable after restart.` when using omp, lets find out what is wrong」
- 「the broken db files had been fixed, but i just saw the warning again」
- 「i see, i think we had fixed other db files for mnemopi, but not for the history db file」
- 「query this repo wiki contents about db files broken and fix」
- 「then lets fix the history db file as well」
- 「ok, all db files ok?」
- 「this db file is used for what cases? what contents stored in it? we know when and why it is broken?」
- 「ok,lets fix it as well」
- 「done now」「check」「all ok now?」

## 警告的产生链

`pi-coding-agent/src/session/history-storage.ts` 的写入方法与错误上报（正文注释原文摘录）：

```ts
	add(prompt: string, cwd?: string, sessionId?: string): Promise<void> {
		const trimmed = normalizePrompt(prompt);
		if (!trimmed) return Promise.resolve();
		const session = sessionId ?? this.#sessionResolver?.();
		try {
			this.#insertBatch([{ prompt: trimmed, cwd: cwd ?? undefined, sessionId: session || undefined }]);
		} catch (error) {
			logger.error("HistoryStorage add failed", { error: String(error) });
			if (!this.#writeFailureReported) {
				this.#writeFailureReported = true;
				this.#errorListener?.(error);
			}
			return Promise.resolve();
		}
		this.#writeFailureReported = false;
		this.#addListener?.();
		return Promise.resolve();
	}
```

方法上方注释写「Failures are logged, not thrown; the error listener is notified once per outage until a write succeeds.」

`pi-coding-agent/src/modes/interactive-mode.ts` 的监听器与提示文本：

```ts
			this.historyStorage.setErrorListener(() => {
				this.showWarning("Prompt history could not be saved; this prompt may be unavailable after restart.");
			});
```

同一段还有 `this.historyStorage.setAddListener(syncTextPrediction);`，注释写「The prediction daemon learns from history.db; nudge it once each prompt is durable.」

## history.db 的组成

- 表：`history`、`history_fts`（含 shadow 表）、`session_titles`、`session_recaps`；触发器 `history_ai`；候选库 `user_version` 为 1，`journal_mode` 为 `delete`。
- `history` 由 `history-storage.ts` 建表；`session_titles` 与 `session_recaps` 由 `src/session/session-index.ts` 建表，该文件第 2 行注释原文为「Per-session index tables in history.db, keyed by session id:」。
- `HistoryStorage.open()` 默认路径为 `getHistoryDbPath()`（`history-storage.ts:182`）。

## 第一轮：2026-10-20 起的 FTS5 损坏

- 目录里保留着自动隔离件 `history.db.corrupt-1792496726838-2821df07-1e36-4df6-a56b-0ab73ede1fc8`，5935104 字节，时间 2026-10-20 19:45。
- 日志中 `SQLiteError: fts5: corruption found reading blob 2611340115969 from table "history_fts"` 首次出现于 `2026-11-01T00:09:59.872+08:00`，共 29 条。
- 日志中 `SQLiteError: database disk image is malformed` 首次出现于 `2026-11-01T00:44:39.066+08:00`，共 32 条。
- 该轮于 2026-11-01 用恢复脚本完成替换，装后 `integrity/FK/FTS ok`（记录见 `raw/omp-mnemopi/2026-11-01-three-db-recovery-and-install.md`）。

## 第二轮：2026-11-02 复发（索引层）

日志中 `HistoryStorage add failed` 共 6 条，全部为 `SQLiteError: database disk image is malformed`：

| 时间戳 | pid |
|---|---|
| `2026-11-02T22:55:30.063+08:00` | 1276970 |
| `2026-11-02T22:57:09.233+08:00` | 1278428 |
| `2026-11-02T23:06:44.761+08:00` | 1255819 |
| `2026-11-02T23:09:34.509+08:00` | 1278428 |
| `2026-11-02T23:15:25.999+08:00` | 1292259 |
| `2026-11-02T23:15:30.240+08:00` | 1276970 |

修复前保留原件（`installation-custf4vr/pre-install-backup/history/original.db`，7102464 字节，SHA-256 `d8a8a701e65c1f7c232b3270cf24b329e59da7328199df098130bc7bea4fb3dc`）的只读实测：

- `PRAGMA integrity_check` 输出 9 行，首行为 `wrong # of entries in index idx_history_created_at`，其余 8 行为 `row 78/91/99/151/240/248/479/583 missing from index idx_history_created_at`。
- `history` 表 7945 行，`history_fts` 7946 条文档。
- `SELECT count(*) FROM history INDEXED BY idx_history_created_at` 得 7945 行、去重后 7945 个 rowid、无重复；与表侧 rowid 集合比对只有 113 缺失。
- 全文检索可用：`SELECT count(*) FROM history_fts WHERE history_fts MATCH 'omp'` 返回 913。
- 结论边界：`integrity_check` 报告的缺项清单与实际索引扫描结果不一致，说明索引结构与表数据不同步，逐条点查不能证伪。本轮未出现 FTS5 blob 错误。

## history.db 的修复方式（.recover 流程）

复用 `~/.omp/mem-ledger/recovery-20261101-j0hocaaa/recover-history.py`，输入为安装程序在持有者闸之后重新采集的源库。

`report.json` 关键字段：

| 字段 | 值 |
|---|---|
| `merge.history.merged_prompts` | 7946 |
| `merge.history.ids_reassigned` | 0 |
| `merge.history.max_id` | 17839 |
| `merge.history.containment.source.missing_from_candidate` | 0 |
| `merge.session_titles.merged` | 208 |
| `merge.session_recaps.merged` | 453 |
| `loss.quarantined_rows_total` | 0 |
| `loss.recap_records_without_usable_id` | 0 |
| `candidate.checks.integrity_check` | ok |
| `candidate.checks.foreign_key_check` | [] |
| `candidate.checks.fts_integrity_check` | ok |
| `candidate.checks.tables` | history 7946、session_titles 208、session_recaps 453 |
| `candidate.checks.fts_documents` | 7946 |
| 三视图行数 | wal 与 main 均为 7945、7946、7946 |

安装时间 `2026-11-02T15:15:48.393000+00:00`。

装后验证：

- `PRAGMA integrity_check` 为 `ok`，`PRAGMA foreign_key_check` 0 条，FTS 完整性语句通过。
- 装后首轮：`history` 7949 行、`history_fts` 7949 条，较候选 7946 增长 3 条，来自重启后的真实写入。
- 2026-11-03 再检：`history` 7954 行，`quick_check` 为 `ok`。
- 装后 `HistoryStorage add failed` 为 0 条。

## agent.db 的索引层损坏

修复前保留原件（`recovery-20261102-agentdb/installation-sn4126mi/pre-install-backup/agent/original.db`）的只读实测：

- `PRAGMA integrity_check` 首两行为 `wrong # of entries in index idx_cache_expires` 与 `wrong # of entries in index sqlite_autoindex_cache_1`。
- `cache` 表 784 行。
- `sqlite_autoindex_cache_1` 扫描得 786 条、去重后 783 个 rowid，重复 rowid 为 1300、1302、1303，键重复 0 个。
- 键错配 3 条，全部落在这三个 rowid 上：1300 与 1302 的索引值为 `session:sticky:tavily:01…`，表内为 `session:sticky:kimi-code…`；1303 的索引值为 `usage_cache:report:kiro:…`，表内为 `session:sticky:kimi-code…`。
- `idx_cache_expires` 扫描得 787 条、去重后 785 个 rowid，重复 rowid 为 1300、1302；过期值与表内不一致 17 条。
- `auth_credentials` 8 行；表总数 22。
- 线上库与 `.backup` 快照的 `integrity_check` 输出一致；`immutable=1` 忽略 WAL 后 `quick_check` 复现同样错误。

## agent.db 的修复方式（REINDEX）

修复仅在副本上执行 `PRAGMA journal_mode=DELETE; REINDEX;`，然后按表逐行比较内容。

- 逐表比较方法：对每张表取全部行，`repr` 后排序，比较行数与 SHA-256；22 张表全部相等。
- 安装时间 `2026-11-02T15:48:26.721795+00:00`。
- 装后：`integrity_check` 为 `ok`，外键错误 0，`cache` 548 行，`idx_cache_expires` 与 `sqlite_autoindex_cache_1` 各 548 条，逐条比对键错配 0、过期值陈旧 0，`auth_credentials` 8 行。
- `cache` 行数由 784 降到 548，发生在重启后的清理周期内。
- 未验证：`REINDEX` 是否足以修复 `history.db` 那种索引结构不一致；本轮 `history.db` 未使用该方式。

## 安装程序的设计要点

- 持有者闸：检测到任何 OMP 进程或目标库句柄时以 `RuntimeError` 中止，要求退出后从普通 shell 运行。
- 安装前重新采集：正式安装时重新复制最新 main、WAL、SHM，先前构建的候选不复用。
- 源指纹比对：采集前后比较每个文件的 size 与 mtime，不一致即中止。
- 逐表内容比对：候选与源逐表比较行数与内容摘要，不一致即中止（`agent.db` 使用）。
- 原件保全：替换前把 main、WAL、SHM 复制到 `pre-install-backup/`，记录 SHA-256；安装状态写入 `installation-status.json`。

## 防护面的当前边界

`~/.omp/agent/extensions/deny-mnemopi-grep.ts` 的注册段只有两条受保护项：

```ts
	pi.on("tool_call", createGrepGuard([
		{ path: path.join(getMemoriesDir(), "mnemopi"), kind: "directory" },
		{ path: getHistoryDbPath(), kind: "sqlite-family" },
	]));
```

`~/.omp/agent/agent.db`、`agent.db-wal`、`agent.db-shm` 不在其中。

## 工具与方法备忘

- 对 `mode=ro` 连接执行 `INSERT INTO history_fts(history_fts) VALUES('integrity-check')` 报 `OperationalError attempt to write a readonly database`；FTS 完整性检查需要可写副本。
- `sqlite3 <db> ".backup <target>"` 可得到一致快照，用于 `REINDEX` 与内容比对。
- 只读核查不应读取业务内容：`history` 表只取行数与时间戳，`auth_credentials` 只取行数。
