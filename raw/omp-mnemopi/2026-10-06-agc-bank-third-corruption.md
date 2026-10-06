# agc Mnemopi bank 第三次 SQLite 损坏与修复实录

> Source: 本会话操作记录（ledger.log 摘录、.recover 输出、合并统计、BeamMemory 验证）
> Collected: 2026-10-06
> Published: 2026-10-06

## 事件

bank `agc-djmfd5jv3zsd` 于 2026-10-05 深夜第三次物理损坏。前两次：2026-09-21、2026-09-24（同一 bank）。

## 损坏时间线（ledger.log，全部本地时间 +08:00）

- 10-02 起：`legacy bank probe failed: malformed JSON` 反复出现（语义未查清，可能 10-02 已异常）
- 10-05 23:34:16：首个 `retain failed: database disk image is malformed`
- 10-05 23:42：`Session recap journal write failed: disk I/O error`（OS 层写拒绝；recap journal = `history.db` 的 `session_recaps` 表）
- 10-05 23:50、23:57、10-06 00:02-00:39：级联——`retain`/`recall` 失败、`HistoryStorage add failed`（error 级）、`Cleanup callback failed`
- 涉及进程：pid 1144549（首个 malformed 与 history.db IOERR 同出此进程）、1266979、1269060、1272206（4+ 并发 OMP 进程）

签名与前两次一致：`btreeInitPage() error code 11`、页面双重引用、`rowid out of order`、`never used` 区段。

## 关键证据

同一进程（pid 1144549）先对自己的 mnemopi 句柄报 `malformed`，8 分钟后对 history.db 句柄报写出 `SQLITE_IOERR`。损坏窗口内核日志零记录（kern.log 覆盖 10-05 01:04 至今）、Windows 无电源/磁盘事件、根文件系统全程可写。一个进程、多个 `bun:sqlite` 句柄、跨库先后出事、底层完全静默——与上游 bun:sqlite #7302 类多句柄缺陷吻合，与"磁盘掉线"不吻合（掉线会留内核记录）。

## 修复过程

1. **捕获现场**：复制 db/-wal/-shm + `mnemopi.db.backup-20261005` 到 `/tmp/mnemopi-forensics/agc-repair-20261006/src/`。
2. **验证备份干净**：`mnemopi.db.backup-20261005` quick_check ok，22662 页（92.8MB），page_size=4096。损坏库 23002 页（94.2MB），多 340 页（10-06 新写入）。
3. **.recover**：对损坏副本执行官方 `sqlite3 .recover`，得 recovered.sql（100k 行）→ recovered.db。构建时 3 条 `INSERT INTO sqlite_schema` 失败（FTS 虚拟表），4 条其余错误（重复行/NOT NULL，可忽略）。FTS shadow 表行数与干净备份不同——不搬 shadow 表，后续重建。
4. **逐表值级合并**：以干净备份为基底，对 recovered.db 逐表比较。新增 5485 行（graph_edges +4918、memoria_facts +384、facts +130、annotations +24 等）；更新 102 行（episodic 17 + working_memory 85，全部按时间戳/时间标记裁决，recovered 侧为更新版本；其中 60 条 `consolidated_at` 差异逐条核实为备份后的固化标记，已裁决）。零冲突、零备份侧丢失（bak_only=0）。
5. **FTS 重建**：`fts_episodes`/`fts_facts` 外部内容 rebuild；`fts_working` 从 `working_memory` 重灌。三路 MATCH 查询验证命中。
6. **安装**：损坏件收殓 `backup-corrupt-20261006-232712/`；新库 `os.replace` 落位。
7. **验证**：quick_check ok；BeamMemory 端到端 VERIFY_PASS（wm 659、检索可用）。

## 句柄陈旧陷阱

修复落盘后，正在运行的 agc OMP 会话（句柄仍指向损坏件）继续报 `malformed`。重启会话后 `mem_retain`/`mem_recall` 恢复正常。教训：换 bank 文件后必须重启使用该 bank 的会话。

## 全量巡检

14 个 .db：3 个 tomb 里的历史损坏件（20260921、20260924、20261006）BAD；其余 11 个全 ok。

## 损失评估

本次以干净备份为基底，.recover 补齐备份后全部新行，零永久丢失。前两次的 54 条实质丢失维持原判（物理坏页不可读）。

## 遗留

- 根因未定：头号嫌疑 bun:sqlite 多句柄缺陷（#7302 类）；存储层无直接证据（kern.log 静默）。压测（见 `2026-10-06-write-contention-repro-attempt.md`）未复现。
- `mnemopi.db.backup-20261005` 制造者与时机未查清（干净、与损坏件同目录，恰在事件前后）。
- 10-02 起 "malformed JSON" 探针失败语义未查清。
- `~/.omp/mem-ledger/` 留档机制持续运行。
