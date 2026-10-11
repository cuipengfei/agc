# agc Mnemopi bank 第四次 SQLite 损坏取证

> Source: 本会话第四次损坏取证（事件时间线工具 event-timeline、隔离物证检查 checked-event4、page-evidence）
> Collected: 2026-10-11
> Published: 2026-10-09

## 事件

bank `agc-djmfd5jv3zsd` 第四次物理损坏。前三次：2026-09-21、2026-09-24、2026-10-05/06。

最早的 operation-error 事件时间戳 `2026-10-09T23:23:36.927+08:00`（basis：operation-error.event_ts）。ledger 回填时间 `2026-10-10 23:32:59`，是补录，不是发生时刻。examined 窗口自 `2026-10-09T00:00:00+08:00` 起。

在 agc 错误事件里出现的 PID：35587、351491、364016、486049、510335、516224、575640、623625、658622、744736。`direct_bank_actions_before_earliest` 为空（examined 窗口内没找到对该 bank 的直接动作）。

**causation：not-asserted（只有时间线与交集，不断言触发者）。** toolResult 里的 corruption 字符串无法证明是 live DB 操作还是历史读取，除非其 origin_call 是对该 bank 的 sqlite-open/手工复制/重启；否则未知。health 扫描的 quick_check 损坏没有归属 PID（scanner 是只读观察者）。

## 物理取证（隔离字节副本，官方 sqlite 3.53.4）

对恢复源 `~/.omp/mem-ledger/recovery-20261010-225833/source` 的三件套做字节级复制后，用官方 `sqlite3` 检查复制件（一份 `-readonly` 带 WAL，一份 `immutable=1` 忽略 WAL），从不打开 live bank。来源三件套 SHA256 复制前后一致（`source_hashes_matched_manifest: true`），只修改隔离工作目录。

- `page_count` 26945，`page_size` 4096。
- 主文件 immutable 视图与含原始 WAL 的视图输出**相同**的结构错误；当前 WAL 不改变检测结果——损坏在 main，不在 WAL。
- `freelist_count` 203。

### 跨树共享页（fts_working_data 损坏 × memory_embeddings overflow）

| page | fts_working_data path | memory_embeddings path |
|---|---|---|
| 12000 | /000/00c/ | /0e1/003+000006 |
| 12002 | /000/00d/ | /0e1/003+000005 |
| 12038 | /000/00e/ | /0e1/003+000004 |
| 12058 | /000/00f/ | /0e1/003+000000 |
| 12059 | /000/010/ | /0e1/003+000001 |
| 12064 | /000/011/ | /0e1/003+000002 |
| 12065 | /000/012/ | /0e1/003+000003 |

### 同树重复引用页

12942、12972、12974、12975、16268。

大数值 rowid（如 FTS5 segment 编码）不证明随机损坏；out-of-order 才是已观察的结构错误。

## 证据边界

未确认触发者、触发时刻或导致页面重复归属的机制。不能仅凭此认定并发或 SQLite 版本为根因（`causal_status`）。本文件只记录事件取证；机制与复现见 `2026-10-11-shm-lock-drop-root-cause.md`。
