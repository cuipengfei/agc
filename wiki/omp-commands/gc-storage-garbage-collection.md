# OMP gc 存储垃圾回收

> Sources: oh-my-pi 仓库 gc-cli.ts + gc-settings.ts 源码直读; 本机 omp v18.10.1 `omp gc --help` / `--json` / `--apply --json` / `--stale --apply --json` 输出直采, 2026-10-12
> Raw: [gc 存储机制源码与命令输出](../../raw/omp-commands/2026-10-12-gc-storage-mechanism.md)
> Updated: 2026-10-12

## Overview

`omp gc` 清理 OMP 自身在 `~/.omp/agent` 下积累的四类存储产物：未被引用的内容寻址 blob、过期的冷会话、SQLite WAL 文件、悬空指针与过期产物。默认全部 dry-run，加 `--apply` 才真执行。四个阶段中 blobs、archive、wal 默认开启，stale 默认关闭（因为它删的是用户可见文件）。

## 四阶段总表

| 阶段 | 清理对象 | 路径（默认 agent dir = `~/.omp/agent`） | 默认开关 |
|---|---|---|---|
| blobs | 不再被任何会话引用的 blob 文件 + 崩溃残留的 staging 文件 | `~/.omp/agent/blobs/` | 开 |
| archive | 冷会话整体从活跃区搬到归档区（连同工件目录），并清 history.db / stats.db 对应行 | 从 `~/.omp/agent/sessions/` 移到 `~/.omp/agent/archive/sessions/` | 开 |
| wal | 两个 SQLite 数据库的 WAL 文件做 checkpoint 截断 | `~/.omp/agent/history.db-wal`、`~/.omp/agent/models.db-wal` | 开 |
| stale | 悬空指针与过期产物 | 四处目录（详见下文） | 关 |

用 `--blobs`/`--archive`/`--wal`/`--stale` 中任意一个显式点名后，只跑被点名的阶段；一个都不点则按配置默认值跑（即前三项）。

## blobs 阶段

扫描全部活跃会话、归档会话、custom-session-files marker 指向的会话、terminal-sessions breadcrumb 指向的会话，收集其中 `blob:sha256:<64-hex>` 引用的 blob 哈希。`blobs/` 里哈希不在引用集合中、且修改时间超过 5 分钟写入宽限期（`GC_WRITE_GRACE_MS = 5 * 60_000`）的文件才删。崩溃残留的 staging 文件同样按 5 分钟宽限期清理。

引用扫描覆盖 `.jsonl`、`.jsonl.gz`、`.jsonl.*.bak` 三种文件。

## archive 阶段

遍历 `sessions/` 下每个项目目录的会话，按修改时间从新到旧排序。跳过条件（满足任一即保留在原位）：

1. 会话状态为 `pending` / `interrupted` / `unknown`（活跃态，`ACTIVE_STATUSES`）
2. 最近 5 分钟内有修改（写入宽限期）
3. 存在活跃的嵌套子会话
4. 全局最新 20 个非活跃会话（`retainNewestGlobal`，默认 20）
5. 每个工作目录各保留最新 10 个（`retainNewestPerCwd`，默认 10）
6. 修改时间晚于 30 天门槛（`coldArchiveAfterDays`，默认 30；设 0 表示不按年龄过滤）

通过全部过滤的会话连同其工件目录一起移动到归档区，gzip 压缩为 `.jsonl.gz`。随后删除 `history.db` 和 `stats.db` 中对应会话的行并重建 FTS 索引。

### 归档目录解析

`getArchivedSessionsDir` 实现为 `path.join(path.dirname(getSessionsDir(agentDir)), "archive", "sessions")`。默认 `getSessionsDir()` 返回 `~/.omp/agent/sessions`，因此归档目录是 `~/.omp/agent/archive/sessions`。

## wal 阶段

对 `history.db` 和 `models.db` 执行 `PRAGMA wal_checkpoint(TRUNCATE)`，带 5000ms busy_timeout。WAL 字节数非零且 checkpoint 失败会报错。

## stale 阶段

stale 阶段删除四类对象：

| 类别 | 位置 | 删除条件 |
|---|---|---|
| danglingMarkers | `~/.omp/agent/custom-session-files/` | 指针记录的会话文件已不存在、超过 1 天宽限期 |
| staleBreadcrumbs | `~/.omp/agent/terminal-sessions/` | 非 fresh 且指向的会话文件已不存在、超过 1 天宽限期 |
| expiredReports | `~/.omp/reports/` | `.tar.gz` 调试报告，保留最新 20 个，其余需超过 30 天 |
| expiredReplicas | `~/.omp/collab/` | `.jsonl` 协作副本，同上年龄与保留规则；仍有 breadcrumb 指向的跳过；删除前取会话所有权租约，有运行中的 guest 持有就跳过 |

`fresh` 的 breadcrumb 是 `/new` 的惰性边界，保留。`resolveConfigRootStores` 逻辑：默认 agent dir（`~/.omp/agent`）解析到 `~/.omp/reports/` 和 `~/.omp/collab/`；自定义 agent dir 名为 `agent` 则父目录为 config root；其他名字的 agent dir 没有 config root 可清。

## 默认配置值

| 配置项 | 默认值 |
|---|---|
| `gc.blobs` / `gc.archive` / `gc.wal` | `true` |
| `gc.stale` | `false` |
| `gc.coldArchiveAfterDays` | 30 |
| `gc.retainNewestGlobal` | 20 |
| `gc.retainNewestPerCwd` | 10 |
| `gc.staleRetainNewest` | 20 |
| `gc.staleRetainDays` | 30 |

## 安全机制

- 一切删除前先 dry-run 汇报 wouldDelete/wouldArchive 字节数，`--apply` 才执行
- 写入宽限期 5 分钟（`GC_WRITE_GRACE_MS`）：避免把正在写入的文件删掉
- 指针宽限期 1 天（`STALE_POINTER_GRACE_MS`）：刚写的 `/new` 边界不会被误删
- 协作副本删除走会话租约（session lease），运行中使用者持有期间不动
- GC 运行间有 lock 文件互斥（`gc.lock`），带 `.break` 断路机制

## 实测结果（v18.10.1，2026-10-12）

### 第一次 dry-run

- blobs: 10 个候选 blob，8 个哈希仍被引用，4 个文件待删（227634 字节）
- archive: 扫描 217 个会话，108 个跳过（活跃/宽限/有活子会话），保留全局最新 20 个 + 按每目录保留规则额外保留 57 个，16 个冷会话待归档
- wal: history.db-wal 1483232 字节 + models.db-wal 4470232 字节 = 5953464 字节
- stale（独立 `--stale`）: 5 个过期 breadcrumb（670 字节）

### apply 执行

- blobs: 删 4 个文件（227634 字节）
- archive: 归档 16 个会话，删 history.db 261 行、stats.db 3870 行，FTS 重建
- wal: 两个库均 checkpoint 成功，WAL 归零
- stale（`--stale --apply`）: 删 9 个 breadcrumb（1282 字节）——比 dry-run 的 5 个多 4 个，因为 archive 阶段刚搬走的 16 个会话使指向它们的 breadcrumb 悬空

### 第二次 dry-run

- blobs: 0 个待删
- archive: 0 个待归档
- wal: 226632 字节（checkpoint 后正常运行重新积累）
- stale: 0 个待删

## 文档页与本机 help 差异

文档页 gc flag 表只列出 9 个 flag（`--apply` 到 `--retain-newest-per-cwd`），未列出 `--stale`、`--stale-retain-newest`、`--stale-retain-days`。文档页另一处把参数写作 `--retain-newest-per-project`，本机实际 flag 名是 `--retain-newest-per-cwd`。

## See Also

- [CLI 子命令全量参考](cli-subcommands-reference.md)
- [OMP Cleanse：动态诊断修复](cleanse.md)
