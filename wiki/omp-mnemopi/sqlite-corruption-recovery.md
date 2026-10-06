# Mnemopi SQLite 损坏恢复

> Sources: 本会话恢复实录, 2026-09-21; 本会话恢复实录, 2026-09-24; 本会话恢复实录, 2026-10-06; 本会话压测与排除实验, 2026-10-06
> Raw: [2026-09-21-mnemopi-sqlite-recovery](../../raw/omp-mnemopi/2026-09-21-mnemopi-sqlite-recovery.md); [2026-09-24-agc-bank-second-corruption](../../raw/omp-mnemopi/2026-09-24-agc-bank-second-corruption.md); [2026-10-06-agc-bank-third-corruption](../../raw/omp-mnemopi/2026-10-06-agc-bank-third-corruption.md); [2026-10-06-write-contention-repro-attempt](../../raw/omp-mnemopi/2026-10-06-write-contention-repro-attempt.md)
> Updated: 2026-10-06

## 恢复流程

Mnemopi bank 损坏时按以下顺序处理（2026-10-06 第三次实战修订）：

1. **停止写入者**：退出所有使用该 bank 的 OMP 会话，或获得明确授权后安全停止进程。若 Mnemopi 后端因启动失败已处于 inert 状态，可在线修复。
2. **保存三件套**：复制 `mnemopi.db`、`mnemopi.db-wal`、`mnemopi.db-shm`，记录 size 和 SHA-256。
3. **验备份干净**：若目录有 `mnemopi.db.backup-*`，先 `PRAGMA quick_check` 验证。干净备份是最佳基底（避免从损坏库硬重建 schema）。
4. **.recover**：对损坏副本执行官方 `sqlite3 .recover` → recovered.sql → recovered.db。FTS 虚拟表会建失败（预期），shadow 表行数不可信。
5. **逐表值级合并**：以干净备份为基底，逐表比较主键集合。新增行直接插入；同主键值差异按时间戳/时间标记裁决（recovered 侧通常更新）；无法裁决的保留备份版并记录。不搬 FTS shadow 表。
6. **FTS 重建**：`INSERT INTO fts_x(fts_x) VALUES('rebuild')` 重建 episodes/facts；working 从基表重灌。
7. **验证**：`PRAGMA integrity_check=ok`、三路 FTS MATCH 查询命中、`BeamMemory` 端到端 VERIFY_PASS（含 `remember`/`recall`）。
8. **原子替换**：复核线上指纹未变，损坏件收殓 `backup-corrupt-<ts>/`，`os.replace` 落位，删除残留 -wal/-shm。
9. **重启会话**：换 bank 文件后必须重启使用该 bank 的 OMP 会话，否则旧句柄继续报 `malformed`。

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

## 第三次损坏（2026-10-06）

bank `agc-djmfd5jv3zsd` 于 10-05 23:34 第三次物理损坏。签名与前两次一致。关键新证据：

- **同进程跨库报错**：pid 1144549 先对 mnemopi 句柄报 `malformed`（23:34），8 分钟后对 history.db 句柄报写出 `SQLITE_IOERR`（23:42）。底层全程静默（内核零记录、Windows 无事件、根 fs 可写）。
- **干净备份基底**：目录里恰有一份 `mnemopi.db.backup-20261005`（quick_check ok），以它为基底避免从损坏库硬重建 schema。
- **.recover 实战**：官方 `sqlite3 .recover` 得 10 万行，FTS 虚拟表建失败属预期。逐表值级合并：新增 5485、更新 102、零冲突、零丢失。
- **句柄陈旧陷阱**：修复落盘后，运行中的会话继续报 `malformed`（旧句柄指向损坏件）。重启会话后 `mem_retain`/`mem_recall` 恢复正常。换 bank 文件必须重启会话。

## 根因排除与压测

| 假设 | 结果 |
|---|---|
| FS 锁失效 | WSL2 锁探针 BUSY_OK（直接反证） | 排除 |
| clear() 删文件竞态 / agc 同步外部拷贝 / graphiti MCP / e6 迁移 / 备份 WAL 在途帧 | 未发现支持证据，亦未证伪 | 未定（未验证） |
| 宿主休眠/强关 | Windows 9/20-9/25 及 10-05 窗口零 41/6008（直接反证） | 排除 |
| 磁盘运行时掉线 | kern.log 静默；sdd 掉线系启动挂载舞动且 sdd≠sdf（直接反证本机路径） | 排除 |
| 纯多进程写竞争 | v1 tmpfs 24k 写 + v2 真实磁盘（带应用层 BUSY 重试，非生产形状）合计零损坏 | 压测内未复现；压测未覆盖的形状不因此排除 |
| bun:sqlite 多句柄（#7302 类） | 同进程跨库报错 + 底层静默；上游 #8082/#8351 同签名 | 头号嫌疑，未证实 |

压测详见 [raw/omp-mnemopi/2026-10-06-write-contention-repro-attempt](../../raw/omp-mnemopi/2026-10-06-write-contention-repro-attempt.md)。留档机制 `~/.omp/mem-ledger/` 持续运行，下次事件会当场记录。

 ## 上游已知 issue 对照

2026-10-06 检索 `can1357/oh-my-pi`，发现同一缺陷家族的多个公开报告：

| Issue | 与我们观察的匹配点 |
|---|---|
| [#8082](https://github.com/can1357/oh-my-pi/issues/8082)（open，macOS，agent.db） | 整页写错位：page 12 与 page 9 逐字节相同——页面缓冲写到错误文件偏移，与我们的页面双重引用/错位签名一致。WAL 校验和完好。根因同样未定。 |
| [#8351](https://github.com/can1357/oh-my-pi/issues/8351)（closed，Linux 17.2.15，mnemopi bank） | per-bank `malformed`，integrity_check 报 B-tree 错误、无效页号、rowid 乱序、重复页引用、索引不一致——与我们三次输出逐条对上。当时修复只加了 hook 边界防崩，未修产生损坏的机制。 |
| [#7302](https://github.com/can1357/oh-my-pi/issues/7302)（open） | 审计 25 个 SQLite 打开点，4 个违反 busy-handler 时序（journal_mode=WAL 先于 busy_timeout）。该 issue 指向 PR #7301（统一 opener，未合并）。注意区分：#2421/#2423 是另一对——并发恢复时 SQLITE_BUSY_RECOVERY 的初始化顺序修复（已合并 2026-06-12）。 |
| [#10509](https://github.com/can1357/oh-my-pi/issues/10509)（open，Linux 18.1.1） | 两进程并发拆机导致 agent.db 截断，机制未定（OMP/bun/SQLite/fs 四选一）。 |
| [#9082](https://github.com/can1357/oh-my-pi/issues/9082)（open，wontfix） | NFS 共享 home 上 WAL 静默损坏，与本机本地盘场景不同。 |

结论：三次损坏不是本环境孤例，属于同一未根因缺陷家族。上游没有任何已合并 PR 修过产生损坏的机制本身。

## 本机 18.6.1 代码核查（grep）

- `packages/mnemopi/src/db.ts:94-97`：`busy_timeout=5000` 在 `journal_mode=WAL` 之前——主打开点合规。
- `packages/mnemopi/src/core/query-cache.ts:108`：`openDatabase(path, { pragmas: false })` 后先 `PRAGMA journal_mode=WAL`，busy_timeout 仍为 0——**18.6.1 仍存在 #7302 报告的不合规打开点**（recall 查询缓存）。理论上打开/写查询缓存时遇并发写会立即报 BUSY 而非等待。

## 三次事件与 OMP 版本时间线

| 事件 | 时间 | 当时 OMP 版本 |
|---|---|---|
| 第一次 | 2026-09-21 22:42 | v18.2.7（当日 02:13 发布） |
| 第二次 | 2026-09-24 00:57 | v18.3.0（9-24 02:21 发布）/ v18.2.11 |
| 第三次 | 2026-10-05 23:34 | v18.6.1（10-04 发布） |

三次横跨 18.2.x→18.3.x→18.6.1 三个 minor 线，版本相关性弱；损坏间隔 3 天/12 天，与 OMP 发布节奏不吻合。


## See Also

- [Mnemopi 数据模型与 Recall/Reflect](data-model-and-retrieval.md)
