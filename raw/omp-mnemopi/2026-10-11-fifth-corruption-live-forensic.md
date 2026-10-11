# agc Mnemopi 第五次损坏（2026-10-11，实况取证）

> Source: 本会话实况取证（进程/句柄/锁快照、ledger、session 日志、恢复后复查）
> Collected: 2026-10-11
> Published: 2026-10-11

bank `agc-djmfd5jv3zsd` 第五次损坏，当天经历「坏→修→再坏」循环。memory diagnostics 报 `agc-djmfd5jv3zsd: open_or_inspect: file is not a database`（NOTADB），与前四次的 `malformed` 不同、更靠近头页损坏。

## 当天时间线（ledger + 日志）

- 11:30–11:56 多次 `database disk image is malformed`（pid 744736，startup consolidation / scoped recall / retention）。
- 11:57:04 恢复替换后 HEALTH：`db=agc-djmfd5jv3zsd size=115183616 quick_check=ok wm_rows=750`。
- 其后又被写坏；傍晚诊断显示 NOTADB。

## 两个 omp 进程、同一个 repo（实况，非推断）

两次快照都抓到两个 omp 会话 cwd 均为 `/home/cpf/code-inside/agc`：

- 早快照：pid 998268、pid 1019908。
- 晚快照：pid 1123800（`--resume 01a1114a`）、pid 1124841（`--resume 01a125b6`）。

句柄状态（早快照，`/proc/<pid>/fd`）：

- pid 1019908：fd63→`mnemopi.db`、fd64→`mnemopi.db-wal`、fd65→`mnemopi.db-shm`，全指当前 inode（wal 1038113 / shm 1038114）。
- pid 998268：fd35 与 fd64 两个句柄→`mnemopi.db`（当前）；fd65→`mnemopi.db-wal (deleted)`、fd66→`mnemopi.db-shm (deleted)`。

即：两进程**共享同一个 main（inode 803596）**，却各绑**不同的 `-wal`/`-shm`**——998268 绑在被删除的旧一代 sidecar 上，998268 还对 main 开了两个句柄。

锁（`/proc/locks`，仅 1019908 持有，且是 READ/共享）：

```
POSIX  ADVISORY  READ 1019908 08:50:1038114 128 128
POSIX  ADVISORY  READ 1019908 08:50:803596 1073741826 1073742335
```

## 顺序证据（因果未定）

`stat` live 文件：main `mtime=2026-10-11 17:45:59`；当前 `-shm` `ctime=2026-10-11 19:07:10`、`-wal` `ctime=2026-10-11 19:07:24`。当前 sidecar 比 main 末次写入晚约 1 小时 20 分。

因此观察到的「分裂 `-shm`」是 main 冻结之后（约 19:07，恰逢 memory diagnostics/inspect）产生的后发状态。证明不了 split-shm 先于并导致本次 NOTADB；它可能是症状。causation：未定。

## 结论边界

- 「同 repo 两个 omp 进程、共享同一 bank」此刻实证在场（不再是推断）。
- 「split-shm 导致本次损坏」未证；顺序证据反而不支持其为成因。
- 第二条可达机制由此浮现：替换/重建 bank 文件后旧会话不重启 → 共享 main、分裂 `-shm`。真实可达、今日在场，但未证致损。
