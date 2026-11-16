# omp gc 的 compress 与 strip 阶段

> Source: 本机 OMP 18.20.3 源码直读（`src/cli/gc-auto-compress.ts`、`src/cli/gc-compress.ts`、`src/cli/gc-cli.ts`、`src/cli/gc-settings.ts`）+ 设置注册表 + 本机文件系统勘查（`findmnt`、`chattr(1)`）
> Collected: 2026-11-16
> Published: Unknown

## 阶段集合

`resolveOptions` 从 `gc.*` 读取默认阶段：`blobs`、`archive`、`wal`、`stale`、`compress`、`strip`。用 `--blobs` / `--archive` / `--wal` / `--stale` / `--compress` / `--strip` 任意一个显式点名后，只跑被点名的阶段；一个都不点则按配置默认值跑。

| 键 | 类型 | 默认值 | 本机值 | 作用 |
|---|---|---|---|---|
| `gc.compress` | boolean | `false` | `false`（未显式） | 默认 `omp gc` 计划是否包含透明压缩阶段 |
| `gc.compressAfterDays` | number | `7` | `7`（未显式） | 可压缩 session 的闲置天数阈值 |
| `gc.autoCompress` | boolean | `false` | `true`（显式） | 交互启动时拉起后台压缩 |
| `gc.strip` | boolean | `false` | `true`（显式） | 默认计划是否包含 replay 数据剥除 |
| `gc.stripAfterDays` | number | `30` | `30`（未显式） | 可剥除 session 的闲置天数阈值 |

`--apply` 才会写入磁盘；不带 `--apply` 只统计。

## 透明压缩：平台判定

`compressMethod(dir)` 只在两个平台给出方法名：

- `darwin`：`isApfsVolume(dir)` 为真时返回 `"apfs"`；判定方式是比较 `fs.stat(dir).dev` 与 `/sbin/mount` 输出中挂载类型为 `apfs` 的条目。
- `win32`：`isCompressingNtfsVolume(dir)` 为真时返回 `"ntfs"`；用 `GetVolumePathNameW` + `GetVolumeInformationW` 读取卷名与标志，要求文件系统名为 `NTFS` 且带 `FILE_FILE_COMPRESSION`（`0x10`）标志。

其他平台、其他文件系统（函数注释列出 exFAT、SMB、NFS、ReFS、FAT、Linux 文件系统）或目录不存在时返回 `undefined`。

`compressionWorks(dir, method)` 再做一次真实探测：在目标目录建一个临时目录，写入 `.omp-gc-compress-owner` 标记与一个约 170 KB 的可压缩文本文件，走一遍压缩并检查分配块是否真的变小。设置界面与 release 正文都记录过 macOS 27 上 `ditto --hfsCompression` 返回成功却写出普通副本的情况，所以卷类型判定不足以证明压缩有效。

## 两种压缩实现

- APFS：`ditto --hfsCompression` 把每个目录的候选文件复制到旁边的 scratch 目录，比较大小与 SHA-256，再在原文件未被改动时用 rename 替换；带 session header 的 transcript 在 session publish lock 下替换。写入过的文件会重新以未压缩形式保存。
- NTFS：`compact /c /i /a /q` 就地对文件启用 LZNT1 压缩，保留 inode 与时间戳；后续追加也按压缩存储。注释说明选 LZNT1 而不用 `/exe`（WOF），因为 WOF 在下次写入时会把整个文件解压，恢复会话就失去收益。

批大小：`DITTO_BATCH = 256`、`COMPACT_BATCH = 64`、`HASH_CONCURRENCY = 8`。候选条件：普通文件、单链接、大小超过一个文件系统块、未被压缩、扩展名不在已压缩列表内。

## 后台自动压缩

`scheduleGcAutoCompress(agentDir)`：

1. 检查 `gc-auto-compress.log` 的 mtime，距上次不足 `GC_AUTO_COMPRESS_INTERVAL_MS`（`24 * 60 * 60 * 1000`）则返回。
2. 用文件锁认领本次运行；拿到锁后再检查一次是否到期。
3. 前台只做卷类型判定；不支持时把原因写入日志并返回：`compress skipped: unsupported on this filesystem (APFS or NTFS only)`。因此这项检查每天最多执行一次，交互启动不受影响。
4. 支持时启动 detached 子进程 `omp gc --compress --apply --agent-dir <agentDir>`，输出重定向到同一日志，并把子进程优先级设为 `PRIORITY_LOW`。

`gc.autoCompress` 与 `gc.compress` 的分工：前者只管是否在交互启动时拉起后台压缩，后者只管默认 `omp gc` 计划是否包含压缩阶段。两者都没有改变平台限制。

## 本机文件系统勘查

- `findmnt -T ~/.omp/agent/sessions` 输出 `/ ext4 /dev/sdf rw,relatime,discard,errors=remount-ro,data=ordered`；根文件系统为 ext4，设备 `/dev/sdf`。
- 直接调用 `compressMethod("/home/cpf/.omp/agent/sessions")` 返回 `null`。
- `chattr(1)`（e2fsprogs 1.47.2）在 BUGS AND LIMITATIONS 段写明：

> The 'c', 's', and 'u' attributes are not honored by the ext2, ext3, and ext4 file systems as implemented in the current mainline Linux kernels.

结论：本机把 `gc.autoCompress` 设为 `true` 后，每次到期运行只会写一行跳过原因到 `~/.omp/agent/gc-auto-compress.log`，不会压缩任何 session。

## Linux 上仍可用的压缩路径

`gc.archive` 阶段用 `createGzip({ level: 9 })` 把冷 session 写成 `.jsonl.gz` 并移动到归档目录，与文件系统透明压缩无关，在 Linux 上正常工作。

## strip 阶段

`gc.strip` 处理闲置 session 的 provider replay 数据。相关常量与行为：

- `REPLAY_KEY_RE` 匹配的键：`providerPayload`、`requestControls`、`inputTransformations`、`thinkingSignature`、`itemId`、`redactedThinking`、`thoughtSignature`、`partialArgs`、`streamIndex`、`providerFile`。一行若不含其中任何键，直接跳过，不解析 JSON。
- `planStrip(file, idleBeforeMs)`：文件在阈值之后被修改过、不是普通文件、硬链接数大于一、或最新 replay 回合之外没有 replay 数据时返回空。
- `protectedTurnLines(entries)`：计算活动分支上最新 replay 回合占用的物理行号，这些行不剥除，保证最近一次可重放请求完整。
- 正在被进程持有的 session 计入 `skippedLive`，不改动。
- `applyStrip` 把剥除后的内容按 `WRITE_CHUNK_BYTES`（1 MiB）分批写到旁边的 staging 文件，校验 inode、大小、mtime 与链接数未变后用 rename 替换；权限位保留（`FILE_PERMISSION_MODE` 掩码 `0o7777`）。
- 归档的 `.jsonl.gz` 也会被扫描（解压后处理），其字节数按未压缩计。

本机 `gc.strip` 为 `true`、`gc.stripAfterDays` 为默认 `30`。本次没有执行 `omp gc`，也没有运行 `omp gc --apply`；strip 只会在用户手动执行带 `--apply` 的 gc 时生效。

## 证据边界

- 阶段选择、常量、平台判定与剥除算法来自本机 18.20.3 源码；release 正文记录 `gc.compress`（v18.10.4）、`gc.autoCompress`（v18.13.2）与对应修复。
- 本机文件系统结论来自 `findmnt` 输出与一次 `compressMethod` 调用；未在 Linux 上尝试 Btrfs 或 ZFS 等其他文件系统。
- `gc.archive` 在 Linux 可用这一结论来自实现（Node `zlib` 的 gzip 流），本次未运行归档阶段。
