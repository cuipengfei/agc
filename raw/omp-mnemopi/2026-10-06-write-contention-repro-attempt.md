# Mnemopi SQLite 损坏：多进程写竞争压测与根因排除实验记录

> Source: 本会话压测脚本、运行器输出、Windows 事件日志查询、内核日志分析
> Collected: 2026-10-06
> Published: 2026-10-06

## 目的

验证「多进程 WAL 写竞争导致 bank 损坏」假设，并记录根因排除过程。

## 压测设计

- **v1（tmpfs）**：4 进程并发写同一 scratch bank（`/tmp/wal-repro/bank`），每进程 1200 次 `remember` × 20 轮，每轮 `integrity_check`。scratch 为一次性库，不在 `~/.omp`，真实会话碰不到。
- **v2（真实磁盘）**：3 进程 × 双 `BeamMemory` 句柄 + 共享 `history.db` 风格 sidecar，180 迭代预算 × 6 轮，每轮 `quick_check`。目录 `~/wal-repro-disk/run-<pid>-<ts>`，零递归清除（advisory 阻断后整改）。
- 驱动：直接 import 已安装的 `@oh-my-pi/pi-mnemopi` 的 `BeamMemory`（file:// URL），走真实 opener、pragma、写入、checkpoint 路径。

## 结果

- **v1**：20/20 轮全部完整完成（每轮 4 worker 满额、零失败、零超时），共 24000 次并发写入零损坏。
- **v2**：6 轮全 `INCOMPLETE(CLEAN)`。每轮 3 worker 均撞 240s 预算停（实际各完成 ≥150 迭代），`errKinds` 仅 BUSY（带应用层重试），bank+sidecar `quick_check` 全 ok。

## Advisory 纠偏记录

1. **INCOMPLETE 判级**：`DONE` 行打印请求次数非实际完成数；worker 未满额/有失败/超时即标 INCOMPLETE。
2. **BUSY 重试改变生产形状**：mnemopi 只设 `busy_timeout=5000`，生产无应用层重试；v2 结论须标「带重试的压力测试」。
3. **tmpfs 不覆盖真实磁盘**：v1 在 /tmp（内存盘），v2 补真实磁盘路径。

## 根因排除记录

| 假设 | 证据 | 结论 |
|---|---|---|
| FS 锁失效 | WSL2 锁探针 BUSY_OK | 排除 |
| clear() 删文件竞态 | 未发现支持证据，亦未证伪 | 未定（未验证） |
| agc 同步外部拷贝 | 未发现支持证据，亦未证伪 | 未定（未验证） |
| graphiti MCP | 未发现支持证据，亦未证伪 | 未定（未验证） |
| e6 迁移 | 未发现支持证据，亦未证伪 | 未定（未验证） |
| 备份 WAL 在途帧 | 未发现支持证据，亦未证伪 | 未定（未验证） |
| 宿主休眠/强关 | Windows 9/20-9/25 及 10-05 窗口零 41/6008 | 排除 |
| 磁盘运行时掉线 | kern.log 静默；sdd 掉线是启动挂载舞动（非运行中，且 sdd≠sdf） | 排除 |
| 纯多进程写竞争 | v1 tmpfs 24k 写全完整通过；v2 真实磁盘 6 轮全 INCOMPLETE（带应用层 BUSY 重试，非生产形状） | 压测内未复现；压测未覆盖的形状不因此排除 |

## 结论

远超生产强度的高压下软件层未复现损坏。非复现不是无罪证明。bun:sqlite 多句柄缺陷（#7302 类）保持头号嫌疑，需等下次事件（留档机制会抓）或换对照实现（node:sqlite / 原生 SQLite）做二分。

## 产物

- 压测脚本：`/tmp/wal-repro/driver.ts`、`/tmp/wal-repro/run.py`、`/tmp/wal-repro/driver2.ts`、`/tmp/wal-repro/run2.py`
- 留档机制：`~/.omp/mem-ledger/scan-once.py` + `start-watcher.sh`（60s 轮询，flock 防多实例）
