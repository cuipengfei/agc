# Mnemopi SQLite 损坏恢复

> Sources: 本会话恢复实录, 2026-09-21; 本会话恢复实录, 2026-09-24
> Raw: [2026-09-21-mnemopi-sqlite-recovery](../../raw/omp-mnemopi/2026-09-21-mnemopi-sqlite-recovery.md); [2026-09-24-agc-bank-second-corruption](../../raw/omp-mnemopi/2026-09-24-agc-bank-second-corruption.md)
> Updated: 2026-09-24

## 恢复流程

Mnemopi bank 损坏时按以下顺序处理：

1. **停止写入者**：退出所有使用该 bank 的 OMP 会话，或获得明确授权后安全停止进程。若 Mnemopi 后端因启动失败已处于 inert 状态，无进程写该 bank，可在线修复，不需要退出 OMP（2026-09-24 实测）。
2. **保存三件套**：复制 `mnemopi.db`、`mnemopi.db-wal`、`mnemopi.db-shm`，记录 size 和 SHA-256。
3. **离线工作**：在 `/tmp` 副本上操作，不直接改线上库。
4. **完整差集**：用 SQL 主键集合计算当前库与备份的 missing / changed / unreadable，不用截断列表。
5. **逐条点查**：对每条缺失主键用独立只读连接 `SELECT * WHERE pk=?`，分类 readable / corrupt / none。
6. **staging**：只把可读的原始字段写入独立 staging 库，计数确认后再处理。
7. **离线合并**：在副本中执行，重建 `fts_working`、`fts_episodes`、`fts_facts`。
8. **验证**：`PRAGMA integrity_check=ok`，FTS 计数与基表一致。
9. **原子替换**：复核线上指纹未变，创建新备份，同目录 `os.replace`，删除 WAL/SHM 前确认无进程使用。

## 第一次损坏恢复后状态（2026-09-21）

bank `agc-djmfd5jv3zsd` 曾出现 SQLite 页面损坏。恢复过程中曾插入 placeholder 记录，随后全部删除。当前状态：

| 指标 | 值 |
|---|---|
| facts | 1866 |
| episodic | 44 |
| `fts_facts` vs `facts` | 一致 |
| `fts_episodes` vs `episodic_memory` | 一致 |
| `integrity_check` | ok |

## 缺失身份与可读性

与备份 `backup-corrupt-20260921-225304/mnemopi.db` 的完整差集：

| 表 | missing | readable | corrupt | none |
|---|---:|---:|---:|---:|
| facts | 22 | 0 | 22 | 0 |
| episodic_memory | 2 | 0 | 2 | 0 |
| memoria_facts | 30 | 0 | 30 | 0 |

54 个主键逐条 `SELECT *` 均报 `database disk image is malformed`。这证明 SQLite 查询层无法读取这些行的完整内容。

## 禁止事项

- 禁止用 placeholder 补位缺失记录。
- 禁止在活跃 WAL 或旧 inode 上直接合并。
- 禁止凭计数差推断具体丢失的主键。
- 禁止把 `integrity_check=ok` 当作内容完整性的证明。
- 禁止用损坏索引产出的 `COUNT(*)` 或索引扫描结果判定丢失行数；索引同坏时以穷举点查为终审。

## 待验证

备份目录仍保留 `mnemopi.db-wal` 和 `mnemopi.db-shm`。官方 `sqlite3 .recover` 尚未对 DB + WAL 执行。因此"最大恢复值"与"永久丢失"结论保持待验证状态。

## 第二次损坏（2026-09-24）

bank `agc-djmfd5jv3zsd` 于 2026-09-21 修复后三天再次物理损坏，诊断面板 integrity FAIL。这是同一 bank 三天内第二次损坏；该 bank 约 41 MB，是全部 bank 中最大的（第二大 copilot-api bank 约 17 MB）。根因未查，重复故障不是偶发。

本次主损坏区仍为 tree 86/87/88（`graph_edges` 所在）：integrity_check 报大量 `btreeInitPage() returns error code 11`、`2nd reference to page`、`Rowid out of order` 与成段 `never used`。`graph_edges` 的 `COUNT(*)` 直接抛 `DatabaseError`，原始存活数无法确定；其 AUTOINCREMENT 高水位 27336 含已删除 rowid，不代表存活数。

后端 inert，全程在线修复完成，未退出 OMP。修复后该 bank integrity_check `ok`，并对全部 10 个 bank 加顶层 default 逐一只读巡检，全部 `ok`。

损失表：

| 表 | 修复后行数 | 损失 |
|---|---:|---|
| working_memory | 342 | 0 或至多 1（坏页上物理不可读） |
| gists | 407 | 1 |
| memory_embeddings | 404 | 2 |
| graph_edges | 23938 | 无法确定（派生表，可重建） |
| 其余表 | — | 0 |

FTS 三表与基表行数一致（49/342/1905）。agc bank 目录现有两个备份（`backup-corrupt-20260921-225304`、`backup-corrupt-20260924-010643`）。

## 索引同坏时的证伪方法

损坏可能同时波及表和索引，此时两类常规依据都不可信：

- `COUNT(*)` 可走索引，索引坏则计数虚高——本次修复前 `working_memory` 的 `COUNT(*)=343` 即坏索引虚计数，真实救回 342 行。
- `SELECT rowid FROM t`（索引可满足）在索引同坏时直接报 `database disk image is malformed`，拿不到"真实 rowid 列表"。

终审手段是穷举点查：对足够宽的 rowid 区间逐个点查 `SELECT cols FROM t WHERE rowid=?`，命中即救回、`None` 即不存在、报错即坏页。本次对 `working_memory` 点查 `1..200000`：命中 342 行且 rowid 连续 `1..342`，`None` 0 个，rowid ≥ 343 全部落在坏页上（199658 个点查报错）。由此确定 `1..342` 之间无空洞；至于 rowid 343 是"从不存在"还是"存在于坏页"，物理上不可区分，如实报两种可能。

推论：无 AUTOINCREMENT 上界的表、空修复库无 `MIN(rowid)` 起点时，从 1 盲探会被连续 miss 提前截停——先证明索引是否可读，索引坏则直接转穷举点查，不要先试索引扫描。

## See Also

- [Mnemopi 数据模型与 Recall/Reflect](data-model-and-retrieval.md)
