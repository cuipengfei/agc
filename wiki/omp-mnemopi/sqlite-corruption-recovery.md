# Mnemopi SQLite 损坏恢复

> Sources: 本会话恢复实录, 2026-09-21; 本会话恢复实录, 2026-09-24; 本会话恢复实录, 2026-10-06; 本会话压测与排除实验, 2026-10-06; 本会话第四次损坏取证, 2026-10-09; 本会话根因复现与机制实验, 2026-10-11; 本会话缓解验证与应用, 2026-10-11; 本会话第五次损坏实况取证, 2026-10-11; 本会话恢复流程与陷阱, 2026-10-11; 本会话 embedding 重建排查, 2026-10-11
> Raw: [2026-09-21-mnemopi-sqlite-recovery](../../raw/omp-mnemopi/2026-09-21-mnemopi-sqlite-recovery.md); [2026-09-24-agc-bank-second-corruption](../../raw/omp-mnemopi/2026-09-24-agc-bank-second-corruption.md); [2026-10-06-agc-bank-third-corruption](../../raw/omp-mnemopi/2026-10-06-agc-bank-third-corruption.md); [2026-10-06-write-contention-repro-attempt](../../raw/omp-mnemopi/2026-10-06-write-contention-repro-attempt.md); [2026-10-09-agc-bank-fourth-corruption](../../raw/omp-mnemopi/2026-10-09-agc-bank-fourth-corruption.md); [2026-10-11-shm-lock-drop-root-cause](../../raw/omp-mnemopi/2026-10-11-shm-lock-drop-root-cause.md); [2026-10-11-shm-lock-drop-mitigations](../../raw/omp-mnemopi/2026-10-11-shm-lock-drop-mitigations.md); [2026-10-11-fifth-corruption-live-forensic](../../raw/omp-mnemopi/2026-10-11-fifth-corruption-live-forensic.md); [2026-10-11-recovery-procedure-and-pitfalls](../../raw/omp-mnemopi/2026-10-11-recovery-procedure-and-pitfalls.md); [2026-10-11-embedding-rebuild-after-recovery](../../raw/omp-mnemopi/2026-10-11-embedding-rebuild-after-recovery.md)
> Updated: 2026-10-11

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

## 第四次损坏（2026-10-09）

bank `agc-djmfd5jv3zsd` 第四次物理损坏。最早 operation-error 事件 `2026-10-09T23:23:36.927+08:00`（ledger `2026-10-10 23:32:59` 是补录，非发生时刻）。agc 错误事件涉及多个 PID（35587 等共 10 个）；causation 不断言——corruption 字符串无法证明是 live DB 操作还是历史读取，health 扫描的 quick_check 损坏无归属 PID。

隔离字节副本 + 官方 sqlite 3.53.4 取证（从不打开 live bank，来源 SHA256 前后一致）：26945 页、page_size 4096，损坏在 main（immutable 主视图与含 WAL 视图错误相同，WAL 不 shadow 损坏），freelist 203。

- 跨树共享页（fts_working_data 损坏 × memory_embeddings overflow）：12000、12002、12038、12058、12059、12064、12065。
- 同树重复引用页：12942、12972、12974、12975、16268。

详见 [raw](../../raw/omp-mnemopi/2026-10-09-agc-bank-fourth-corruption.md)。

## 第五次损坏（2026-10-11，实况）

当天「坏→修→再坏」：11:30–11:56 多次 malformed（pid 744736）→ 11:57:04 恢复后 HEALTH `quick_check=ok wm_rows=750` → 傍晚诊断 `file is not a database`（NOTADB，比前四次的 malformed 更靠近头页）。

实况抓到**两个 omp 会话 cwd 均为 agc**（早 998268/1019908，晚 1123800/1124841），共享同一个 main（inode 803596）却各绑不同 `-wal`/`-shm`（998268 绑 deleted 旧 sidecar、还对 main 开两个句柄）；锁仅 1019908 持 READ/共享。顺序证据：main `mtime 17:45:59`，当前 `-shm`/`-wal` ctime `19:07` —— split-shm 晚于 main 末次写入约 1h20m，**因果未定**，可能是症状而非成因。

由此浮现第二条可达机制：**替换/重建 bank 后旧会话不重启 → 共享 main、分裂 `-shm`**。详见 [raw](../../raw/omp-mnemopi/2026-10-11-fifth-corruption-live-forensic.md)。

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

> **Status: Outdated（2026-10-11）** — 本节「bun:sqlite 多句柄（#7302 类）头号嫌疑，未证实」的判定已被下文「根因（类层面已定位；逐次归因未证）」取代：已证可达机制含 OMP 进程内 `Grep`/`Read` 打开 bank `-shm` 释放本进程 WAL-index POSIX 锁、叠加并发写直接产生物理 malformed（当前 SQLite 3.53.4 一手复现），以及替换 bank 未重启会话导致的分裂 `-shm`。保留本节记录当时的排除过程。

## 根因（类层面已定位；逐次归因未证）

> **Status: Disputed（2026-10-11 晚）** — 本节原标题「已定位」就 grep/read 为唯一根因过强。第五次实况证实「同 repo 两 omp 进程」在场，并浮现第二条可达机制（替换未重启→分裂 `-shm`）。修正框架：**根因在类层面 = 多写入者 + `-shm` 协调失效，两条已证可达路径（① grep/read 进程内夺锁；② 替换 bank 未重启会话导致分裂 `-shm`）**。下文 grep/read 机制为一手复现的可行机制，但未证为任一历史事件的实际凶手；split-shm 因果未定。保留下文原始实验记录。

**机制**：同一进程对 bank 的 `-shm`（WAL-index）做一次 `open()`+`close()`，释放该进程在该 inode 上的全部 POSIX advisory 锁（SQLite howtocorrupt §2.2）。`/proc/locks` 实测为 `POSIX ADVISORY WRITE`，非 OFD——OFD 才对 close 他 fd 免疫。打开者是 OMP 暴露给 LLM 的 `Grep`（native ripgrep，遍历目录 `fs.open` 每个普通文件含 32KB 的 `-shm`）与 `Read`（`Bun.file().bytes()` 读 `-shm`）；两者都在 OMP 主进程内，与 live Mnemopi 连接同进程。只读 sqlite 连接不释放锁。

**grep-lock 2×2（真实 native grep + 真实 BeamMemory 持 BEGIN IMMEDIATE）**：无 grep → 锁保持、writer-B `SQLITE_BUSY`；默认 grep `filesSearched=4` → `shm:120` blocked→available、writer-B 提交、writer-A 丢失、integrity ok（静默丢更新）；`glob=*.txt` 不碰 `-shm` → 锁保持；`glob=*-shm` 只碰 `-shm` → 锁释放。触发点精确隔离到 `-shm` 的 open 本身。

**grep-lock-bridge（丢锁 + 并发第二写入者）**：对照臂（无 grep）干净、无重复页；lockdrop 臂 **3/3 运行 `SQLITE_CORRUPT: database disk image is malformed`**，final 落盘运行 `lockDrops=43`、`committedA=34`、`committedB=360710`，一次报 `fts5: corruption found`。封闭了「锁释放 → 物理损坏」，损坏类同现场。

**排除**：WAL-reset 竞态在当前 SQLite 3.53.4 不复现（`mmap=1073741824`、400 轮、`committed=674245`、`race_hit=false`、integrity ok；旧 3.51.2 同负载约 2014/4000 轮即 malformed）；CVE-2026-11822 FTS5 为读侧、需 DB 预先损坏、3.53.4 已含修复，不解释 on-disk 跨树重复页。

**必要条件（三者同窗口叠加）**：① 进程内一条连接正处写事务握 `-shm` 锁；② **同一进程**调 `Grep`/`Read` 开该 bank 的 `-shm` 撤本进程锁（故调工具的进程须正好是握锁者）；③ 第二个并发写入者（另一连接或同 repo 第二个 omp 进程，bank 按项目分=同文件）趁空档写。单写入者被夺锁无后果。

**证据边界**：机制、2×2、桥接、排除均一手实测（Bun 1.4.3 / SQLite 3.53.4）。未逐页复现历史事件的具体页面指纹，只复现同类；历史肇事 tool-call 与 PID 不可考（WAL 帧已清零）。详见 [raw](../../raw/omp-mnemopi/2026-10-11-shm-lock-drop-root-cause.md)。

## 缓解（官方修复前）

三要素破其一即断链。详见 [raw](../../raw/omp-mnemopi/2026-10-11-shm-lock-drop-mitigations.md)。

- **给 bank 目录放 `.ignore`（已应用）**：列 `*.db`/`*.db-wal`/`*.db-shm`/`*.sqlite*`，让文件工具遍历时跳过 sidecar。实测 grep `filesSearched` 由 4 降到 2、`-shm` 不被 open、锁保持、writer-B BUSY。放在 bank 目录覆盖「根在 bank 目录及以上」的所有搜索；只放 memories/ 覆盖不到根在 mnemopi/ 的搜索。已落地到 `memories/`、`memories/mnemopi/` 与全部 11 个 bank 目录；新建 bank 需补放。限制：不拦对 `-shm` 完整路径的显式 `Read`。
- **同一 repo 不并行跑两个 OMP 会话**：切断第二写入者。
- **让 Grep/Read 待在项目目录、不指向 `~/.omp`**：历史触发向量就是 `grep path=~/.omp/agent`。
- **兜底**：`sqlite3 <bank> ".backup <目标>"` 定期备份；替换 bank 文件后必须重启所有使用该 bank 的会话（旧句柄绑旧 inode 会一直报 malformed）。

## 恢复流程与陷阱（2026-10-11）

一键 `repair-agc-memory.sh` 自带：等静默→备份当前库→`.recover`→与指纹锁定的 `candidate.db` 合并→原子换 main→删 sidecar→复查；失败均在 `os.replace` 之前，不动真库。本次实测：checkpoint 闸 `PRAGMA wal_checkpoint(TRUNCATE)` 返回 `[(0, 0, 0)]` 通过；但合并步在 `merge-recovery.py` 的 `json.loads`（列名 `_json`/`temporal_tags`）对空串抛 `JSONDecodeError` 中止——该校验器是 10-10 专用，当前数据有它不接受的行。

绕开合并直接恢复：pristine 字节备份 → 对最新损坏 main `.recover` → `INSERT INTO <fts>(<fts>) VALUES('rebuild')` 清掉 `.recover` 带入的 fts5 损坏 → `journal_mode=DELETE` + VACUUM → 安全脚本（拒绝任何 omp 持有者）原子换 main。产出 `recovered-final.db` size `106975232`；装后 integrity/quick_check ok，`working_memory 760`、`facts 3453`、`memoria_facts 5501`、`graph_edges 93076`。详见 [raw](../../raw/omp-mnemopi/2026-10-11-recovery-procedure-and-pitfalls.md)。

陷阱：① 替换 bank 后必须重启所有用该 bank 的会话（旧句柄绑 deleted inode / 分裂 shm）；② 别覆盖指纹锁定的 `candidate.db`；③ 读 live 库计数用 `mode=ro`（`immutable=1` 看不到 WAL，同刻读到 256 vs 257）。

### embedding 重建（恢复后）

恢复后 `memory_embeddings` 由约 900 掉到 257：模型变更触发的重建（`from:[""]`、`to:"text-embedding-3-small"`，count 885/629），非丢数据（`gists`≈900 可重算），但停滞在 257、无 error、语义召回暂降级，需 embedding 后端可达 + 会话活动驱动跑完。详见 [raw](../../raw/omp-mnemopi/2026-10-11-embedding-rebuild-after-recovery.md)。


 ## 上游已知 issue 对照

2026-10-06 检索 `can1357/oh-my-pi`，发现同一缺陷家族的多个公开报告：

| Issue | 与我们观察的匹配点 |
|---|---|
| [#8082](https://github.com/can1357/oh-my-pi/issues/8082)（open，macOS，agent.db） | 整页写错位：page 12 与 page 9 逐字节相同——页面缓冲写到错误文件偏移，与我们的页面双重引用/错位签名一致。WAL 校验和完好。根因同样未定。**2026-10-11 已向该 issue [追加根因评论](https://github.com/can1357/oh-my-pi/issues/8082#issuecomment-6107512539)**：in-process `-shm` 丢锁 + 并发写，当前 3.53.4 一手复现。 |
| [#8351](https://github.com/can1357/oh-my-pi/issues/8351)（closed，Linux 17.2.15，mnemopi bank） | per-bank `malformed`，integrity_check 报 B-tree 错误、无效页号、rowid 乱序、重复页引用、索引不一致——与我们三次输出逐条对上。当时修复只加了 hook 边界防崩，未修产生损坏的机制。 |
| [#7302](https://github.com/can1357/oh-my-pi/issues/7302)（open） | 审计 25 个 SQLite 打开点，4 个违反 busy-handler 时序（journal_mode=WAL 先于 busy_timeout）。该 issue 指向 PR #7301（统一 opener，未合并）。注意区分：#2421/#2423 是另一对——并发恢复时 SQLITE_BUSY_RECOVERY 的初始化顺序修复（已合并 2026-06-12）。 |
| [#10509](https://github.com/can1357/oh-my-pi/issues/10509)（open，Linux 18.1.1） | 两进程并发拆机导致 agent.db 截断，机制未定（OMP/bun/SQLite/fs 四选一）。 |
| [#9082](https://github.com/can1357/oh-my-pi/issues/9082)（open，wontfix） | NFS 共享 home 上 WAL 静默损坏，与本机本地盘场景不同。 |

结论：五次损坏属同一缺陷家族。根因在**类层面**定位：多写入者 + `-shm` 协调失效，两条已证可达路径（grep/read 进程内夺锁；替换 bank 未重启会话导致分裂 `-shm`）。两条都与 OMP 版本无关（POSIX 锁语义 + 对 `-shm` 的进程内 open 或替换）。**逐次归因不可考**（各次当时 WAL 帧已清零）。上游没有任何已合并 PR 修过产生损坏的机制本身。

## 本机 18.6.1 代码核查（grep）

- `packages/mnemopi/src/db.ts:94-97`：`busy_timeout=5000` 在 `journal_mode=WAL` 之前——主打开点合规。
- `packages/mnemopi/src/core/query-cache.ts:108`：`openDatabase(path, { pragmas: false })` 后先 `PRAGMA journal_mode=WAL`，busy_timeout 仍为 0——**18.6.1 仍存在 #7302 报告的不合规打开点**（recall 查询缓存）。理论上打开/写查询缓存时遇并发写会立即报 BUSY 而非等待。

## 五次事件与 OMP 版本时间线

| 事件 | 时间 | 当时 OMP 版本 |
|---|---|---|
| 第一次 | 2026-09-21 22:42 | v18.2.7（当日 02:13 发布） |
| 第二次 | 2026-09-24 00:57 | v18.3.0（9-24 02:21 发布）/ v18.2.11 |
| 第三次 | 2026-10-05 23:34 | v18.6.1（10-04 发布） |
| 第四次 | 2026-10-09 23:23 | 事件期版本未精确核 |
| 第五次 | 2026-10-11（11:30–11:56 malformed → 11:57 修复 → 傍晚 NOTADB） | 事件期版本未精确核 |

五次横跨多个 minor 线，版本相关性弱；根因是版本无关的 POSIX 锁语义 + 工具开 `-shm` / 替换未重启，不随 OMP 版本变化。


## See Also

- [Mnemopi 数据模型与 Recall/Reflect](data-model-and-retrieval.md)
