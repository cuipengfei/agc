# agc Mnemopi 恢复流程与陷阱（2026-10-11）

> Source: 本会话恢复实操（备份、.recover 多路对比、FTS 重建、一键脚本失败、安全直装、复查）
> Collected: 2026-10-11
> Published: 2026-10-11

记录本次把第五次损坏库恢复上线的实际流程与踩到的陷阱。恢复脚本位于用户自有目录 `~/.omp/mem-ledger/`，非 OMP 包自带。

## 一键脚本（repair-agc-memory.sh → install-recovery.py）行为

`repair-agc-memory.sh` 仅 exec `recovery-20261010-225833/install-recovery.py`。该安装器自带整套：等静默（有任何 omp 持有者即等/超时中止）→ 备份当前库 → 对备份跑 `.recover --ignore-freelist` → 用 `merge-recovery.py` 与基线 `candidate.db`（指纹锁，须与 `candidate-manifest.json` 一致）合并 + 补 `field-restorations.json` → verify + smoke → 原子 `os.replace` 换 main → 删 `-wal`/`-shm` → 复查。失败模式安全：任何中止都在 `os.replace` 之前，不动真库。

### 实测闸门结果

- **checkpoint 闸通过**：照 `install-recovery.py:95-100` 在损坏库副本上 `sqlite3.connect` + `PRAGMA wal_checkpoint(TRUNCATE)`（Python sqlite 3.46.1）返回 `[(0, 0, 0)]`，首列 0=成功，不会抛 "could not be checkpointed"。损坏在深层 b-tree，不在 WAL 协调层。
- **合并步失败**：`merge-recovery.py:40` 的 `validate_row` 对列名 `endswith('_json')` 或 `== 'temporal_tags'` 的值强制 `json.loads`，当前库 `.recover` 出的某行该列是空串 → `JSONDecodeError: Expecting value: line 1 column 1 (char 0)` → 整条合并 raise、安装中止、真库未动。该校验器是 10-10 事件专用，当前数据有它不接受的行。

## 直接恢复（绕开坏掉的合并）

字节级 pristine 备份三文件（`cp --preserve`，从不 sqlite 打开 live 库；跨进程 `cp` 不会夺 omp 持锁进程的 POSIX 锁）。

`.recover`（官方 `/opt/sqlite-3.53.4/bin/sqlite3`）多路对比，取最全：

| 源 | facts | memoria_facts | working_memory | memory_embeddings | graph_edges | annotations | integrity |
|---|---|---|---|---|---|---|---|
| A：19:24 备份 main + WAL | 3454 | 5499 | 758 | 898 | 93072 | 1533 | ok |
| B：19:24 main only（immutable） | 3446 | 5494 | 756 | 896 | 93047 | 1533(≈) | ok |
| freshest：一键 19:36 备份 main（sha `384ec3b6`） | 3453 | 5501 | 760 | 902 | 93076 | 1537 | 带 fts5 corruption |

freshest main 最全（WAL 已 checkpoint 进 main）。其 `.recover` 带入 fts5 损坏（`fts5: corruption found reading blob ...`），用 `INSERT INTO <fts>(<fts>) VALUES('rebuild')` 从 content 重建三个 fts5（`fts_working`/`fts_episodes`/`fts_facts`）后 `integrity_check=ok`；再 `PRAGMA journal_mode=DELETE; VACUUM;`。产出 `recovered-final.db`，sha `a09192a53375225c99b6313bd757ebefdb5cfa7bec88535a0f02366d82df6435`，size `106975232`。

## 安全直装脚本

`~/.omp/mem-ledger/install-recovered-final.sh`：候选 sha/integrity 校验 → 拒绝任何 omp 持有者（pgrep + `/proc/*/fd` 扫描）→ 备份当前库 → 原子 `mv -f` 换 main、删 `-wal`/`-shm` → verify → chmod 600。安装后 live main integrity/quick_check=ok；核心表 `working_memory 760`、`episodic_memory 125`、`facts 3453`、`memoria_facts 5501`、`graph_edges 93076`。损坏库备份留在 `backup-corrupt-20261011-194329-safeinstall`。

## 陷阱清单

- **替换 bank 后必须重启所有使用该 bank 的会话**：旧句柄绑 deleted inode / 分裂 `-shm`，不重启会一直报坏、也会制造并发损坏条件。
- **指纹锁**：一键的 `candidate.db` 被 `candidate-manifest.json` 指纹校验，别覆盖它。
- **读 live 库选对模式**：`immutable=1` 只读 main、看不到 WAL 里的未 checkpoint 写入，量会偏旧；要看实时量用 `mode=ro`（跨进程只读，不夺 omp 的锁）。实测同一时刻 immutable 读到 256、mode=ro 读到 257。
