# agc Mnemopi bank 第二次 SQLite 损坏与在线修复实录

> Source: 本会话操作记录（诊断面板、integrity_check 输出、修复过程计数）
> Collected: 2026-09-24
> Published: 2026-09-24

## 事件

bank `agc-djmfd5jv3zsd` 于 2026-09-21 损坏并修复后，2026-09-24 再次物理损坏。同一 bank 三天内两次损坏。该 bank 约 41 MB，是全部 bank 中最大的（第二大 `copilot-api-3txf4siqne7xa` 约 17 MB）。

诊断面板（修复前）：`agc-djmfd5jv3zsd` 26/31 passed、1 failed、integrity FAIL；`default` 27/31、0 failed、OK。

## integrity_check 输出摘录（修复前）

- `Tree 86 page 9758: btreeInitPage() returns error code 11`
- `Tree 86 page 4272 cell 341: 2nd reference to page 9752`（多个 cell 报 2nd reference，涉及 page 9741-9761 区段）
- `Tree 86 page 4272 cell 337: Rowid 27466 out of order`
- `Tree 88 page 6024 cell 44: 2nd reference to page 9745`
- `Tree 87 page 3825` 多个 cell 报 2nd reference
- `Tree 2 page 9757/9772: btreeInitPage() returns error code 11`
- `Tree 2 page 10026 cell 2: Rowid 343 out of order`
- 多页 `never used`（9755-9780、10428-10437 区段）
- tree 86/87/88 是主损坏区（`graph_edges` 所在）；`graph_edges` 的 `COUNT(*)` 直接抛 `DatabaseError`，无法读到原始存活数

## 修复过程（后端 inert，未退出 OMP）

1. 记录线上库 `(size, sha256)` 指纹，复制 db/-wal/-shm 三件套到 /tmp 工作副本。
2. 按 `sqlite_master` rowid 顺序重放 schema（跳过 FTS shadow 表；FTS 虚拟表只建不插，靠基表触发器同步）。
3. chunked `SELECT rowid,*` 抢救各表；断在坏页的表标记 tail_lost。
4. 对 tail_lost 表逐 rowid 点查补救。
5. 建索引、`INSERT INTO fts_x(fts_x) VALUES('rebuild')` 重建 FTS、`integrity_check=ok`。
6. 复核线上指纹未变 → 原件拷入 `backup-corrupt-20260924-010643/` → 修复库 copy2 到 bank 目录内 staging → 同盘 `os.replace` → 删除残留 -wal/-shm。

后端因启动失败处于 inert 状态，无进程写该 bank，全程在线完成，不需要退出 OMP。

## working_memory 证伪过程（顾问拦截后）

初步结论曾报「working_memory 343→342，丢 1 行」。顾问指出：该表无 AUTOINCREMENT 上界、空修复库无 `MIN(rowid)` 起点，点查可能从 1 盲探被连续 miss 截停，且 `COUNT(*)` 能走索引不代表叶页全坏，要求用索引取真实 rowid 列表再点查。

执行结果：索引也坏了。`SELECT rowid FROM working_memory`（索引可满足）直接报 `database disk image is malformed`；integrity_check 同时报索引错误与表错误。因此改用穷举点查：

- 对坏库 rowid `1..200000` 逐个点查 `SELECT cols FROM working_memory WHERE rowid=?`
- 命中 342 行，rowid 连续 `1..342`，`None`（不存在/已删除）0 个
- 坏页报错 199658 个（rowid ≥ 343 全部落在物理坏页上，无法确认是否存在过）
- 线上修复库 rowid 恰为 `1..342` 连续，与点查救回集合完全一致

结论：rowid `1..342` 之间无空洞、全部救回。修复前 `COUNT(*)=343` 来自损坏索引，是虚计数。真实损失为二选一且物理上不可区分：第 343 行从不存在（索引虚增，实际零损失），或曾存在于坏页上（永久不可读）。确定事实：`1..342` 无缺失。

## 损失表（2026-09-24 事件）

| 表 | 修复后行数 | 损失 |
|---|---:|---|
| working_memory | 342 | 0 或至多 1（坏页上，物理不可读；原计数 343 系坏索引虚计数） |
| gists | 407 | 1（原 408） |
| memory_embeddings | 404 | 2（原 406） |
| graph_edges | 23938 | 无法确定（AUTOINCREMENT 高水位 27336 含已删除 rowid；派生表，可由基础事实重建） |
| 其余表（episodic_memory 49、memoria_facts 1905 等） | — | 0 |

FTS 对账：fts_episodes 49 vs 49、fts_working 342 vs 342、fts_facts 1905 vs 1905，一致。

## 全部 bank 巡检（修复后）

对 `banks/` 下 10 个 bank 加顶层 default 逐一 `PRAGMA integrity_check`（只读 URI 打开），全部 `ok`。bank 清单：agc-djmfd5jv3zsd、buntoolbox-39k216yd8twpa、copilot-api-3txf4siqne7xa、omp-judge-smoke-1vii2bcfe394k、prompts-2t19xgpxgswjj、rigor-33jj1ni6rf6i5、system-prompts-3p36hi955lqd7、tmp-1tpw73408x3e、work-8s58n2avf4fv、default（顶层）。

## 遗留

- 同一 bank 三天内两次损坏，根因未查（WSL2 磁盘 I/O、异常退出 WAL 未 checkpoint、写入并发均为候选，无证据定论）。
- agc bank 目录现有两个备份：`backup-corrupt-20260921-225304`（36 MB）与 `backup-corrupt-20260924-010643`（41 MB），可在确认新库稳定后删除。
- 官方 `sqlite3 .recover` 仍待验证（自 2026-09-21 起）。
