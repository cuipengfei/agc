---
Sources: 本会话恢复过程实录
Collected: 2026-09-21
Published: Unknown
---

# Mnemopi SQLite 损坏恢复实录

## 初始状态

- bank: `agc-djmfd5jv3zsd`
- 路径: `/home/cpf/.omp/agent/memories/mnemopi/banks/agc-djmfd5jv3zsd/mnemopi.db`
- `PRAGMA integrity_check` 报 SQLite 页面损坏，典型错误为 `database disk image is malformed`

## 备份

存在备份目录：

```text
/home/cpf/.omp/agent/memories/mnemopi/banks/agc-djmfd5jv3zsd/backup-corrupt-20260921-225304/
```

备份内仍保留：

- `mnemopi.db`
- `mnemopi.db-wal`
- `mnemopi.db-shm`

## 恢复原则

- 停止所有写入者
- 保存 DB / WAL / SHM 三件套
- 在离线副本中处理
- 用完整主键差集计算 missing / changed / unreadable
- 无法读取内容的记录不生成 placeholder
- 重建 FTS
- 运行 `PRAGMA integrity_check`
- 原子替换线上库

## 中间错误

恢复过程中曾插入 placeholder facts 和 placeholder episodic。随后已删除这些伪造记录。

清理后核对结果：

- facts: 1866
- episodic: 44
- `fts_facts` 与 `facts` 计数一致
- `fts_episodes` 与 `episodic_memory` 计数一致
- `integrity_check=ok`

## 当前缺失身份

当前库与 `backup-corrupt-20260921-225304/mnemopi.db` 的差集：

- facts: 22
- episodic_memory: 2
- memoria_facts: 30

合计 54 条。

## 逐条点查结果

使用独立只读连接，对这 54 个主键执行 `SELECT * WHERE pk=?`：

| 表 | missing | readable | corrupt | none |
|---|---:|---:|---:|---:|
| facts | 22 | 0 | 22 | 0 |
| episodic_memory | 2 | 0 | 2 | 0 |
| memoria_facts | 30 | 0 | 30 | 0 |

结论限定：这证明 SQLite 查询层无法读取这些行的完整内容。

## 尚未完成

- 尚未对 DB + WAL 执行官方 `sqlite3 .recover`
- 因此尚未排除 WAL 中仍含额外记录的可能
- “最大恢复值”与“永久丢失”结论保持待验证状态
