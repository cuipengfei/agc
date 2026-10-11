# Mnemopi SHM 丢锁的本地缓解（验证与应用）

> Source: 本会话缓解验证与应用（mitigation-ignore、mitigation-descent 实验；.ignore 落地）
> Collected: 2026-10-11
> Published: 2026-10-11

官方修复前的本地规避。三要素任破其一即切断损坏链（要素见 `2026-10-11-shm-lock-drop-root-cause.md`）。

## A. 给 bank 目录放 `.ignore`，让文件工具跳过 sqlite sidecar（已应用）

`.ignore` 内容（跳过的 glob）：

```
*.db
*.db-wal
*.db-shm
*.db-journal
*.sqlite
*.sqlite-wal
*.sqlite-shm
```

**验证（真实 native grep + 真实 BeamMemory 持锁）**：bank 目录放 `.ignore` 后，grep `filesSearched` 由 4 降到 2，`-shm` 不被 open，`shm:120` 锁保持 blocked，writer-B 得 `SQLITE_BUSY`，writer-A 干净提交。

**放置覆盖范围（mitigation-descent 实测，geometry = memories/mnemopi/banks/<bank>/mnemopi.db）**：

| `.ignore` 位置 | 从 work（memories 之上） | 从 memories | 从 mnemopi |
|---|---|---|---|
| 放在 memories/ | 跳过，锁保持 | 跳过，锁保持 | **不跳过，丢锁** |
| 放在 bank 目录 | 跳过，锁保持 | 跳过，锁保持 | 跳过，锁保持 |

ripgrep 从搜索根向下读 ignore 文件、不读根之上（非 git 仓库）。放在 bank 目录能覆盖"根在 bank 目录及以上"的所有搜索；只放 memories/ 覆盖不到根在 mnemopi/ 的搜索。

**已落地**：`.ignore` 放到 `~/.omp/agent/memories/`、`memories/mnemopi/` 及全部 11 个 bank 目录。**限制**：只拦遍历；对 `-shm` 完整路径的显式 `Read` 不受 ignore 约束。将来新建 bank 需补 `cp ~/.omp/agent/memories/.ignore <新bank>/.ignore`。撤销：删除这些 `.ignore`。

## B. 同一 repo 不并行跑两个 OMP 会话

切断第二个并发写入者（要素 3）。单写入者被夺锁无后果（bridge baseline 已证），损坏必须有第二个写入者趁空档写；现实里那第二个就是同 repo 的第二个 omp 进程。

## C. 让 agent 的 Grep/Read 待在项目目录，不指向 `~/.omp`

历史触发向量就是 `grep path=~/.omp/agent`（该目录套着 bank）。文件工具待在项目 cwd 则够不着 bank。可写进 CLAUDE.md/AGENTS.md 当硬规则。

## 兜底：定期安全备份

`sqlite3 <bank路径> ".backup <目标>"`（备份 API，并发下安全）。不防损坏，只让 `.recover` 恢复变便宜。坑：就地替换 bank 文件后必须重启所有在跑的 OMP 会话——打开句柄仍绑旧 inode，会一直报 malformed（出自 #8082 现场报告）。

## 不建议

把 bank 从 WAL 改成别的日志模式能消掉 `-shm`，但要改 OMP 打开数据库的方式，不是本地干净能做的，且牺牲并发。
