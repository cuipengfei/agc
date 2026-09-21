# Mnemopi SQLite 损坏恢复

> Sources: 本会话恢复实录
> Raw: [2026-09-21-mnemopi-sqlite-recovery](../../raw/omp-mnemopi/2026-09-21-mnemopi-sqlite-recovery.md)
> Updated: 2026-09-21

## 恢复流程

Mnemopi bank 损坏时按以下顺序处理：

1. **停止写入者**：退出所有使用该 bank 的 OMP 会话，或获得明确授权后安全停止进程。
2. **保存三件套**：复制 `mnemopi.db`、`mnemopi.db-wal`、`mnemopi.db-shm`，记录 size 和 SHA-256。
3. **离线工作**：在 `/tmp` 副本上操作，不直接改线上库。
4. **完整差集**：用 SQL 主键集合计算当前库与备份的 missing / changed / unreadable，不用截断列表。
5. **逐条点查**：对每条缺失主键用独立只读连接 `SELECT * WHERE pk=?`，分类 readable / corrupt / none。
6. **staging**：只把可读的原始字段写入独立 staging 库，计数确认后再处理。
7. **离线合并**：在副本中执行，重建 `fts_working`、`fts_episodes`、`fts_facts`。
8. **验证**：`PRAGMA integrity_check=ok`，FTS 计数与基表一致。
9. **原子替换**：复核线上指纹未变，创建新备份，同目录 `os.replace`，删除 WAL/SHM 前确认无进程使用。

## 本次 agc bank 状态

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

## 待验证

备份目录仍保留 `mnemopi.db-wal` 和 `mnemopi.db-shm`。官方 `sqlite3 .recover` 尚未对 DB + WAL 执行。因此"最大恢复值"与"永久丢失"结论保持待验证状态。

## See Also

- [Mnemopi 数据模型与 Recall/Reflect](data-model-and-retrieval.md)
