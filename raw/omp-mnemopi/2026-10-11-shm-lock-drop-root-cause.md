# Mnemopi bank SHM 丢锁根因：机制与隔离复现

> Source: 本会话根因复现与机制实验（grep-lock、grep-lock-bridge、walrace-bun、read-path、/proc/locks 采样、源码核查）
> Collected: 2026-10-11
> Published: 2026-10-11

## 机制

同一进程对 bank 的 `-shm`（WAL-index）文件做一次 `open()`+`close()`，会释放该进程在该 inode 上的全部 POSIX advisory 锁（SQLite howtocorrupt §2.2）。`/proc/locks` 实测该锁为 `POSIX ADVISORY WRITE`，不是 OFD；OFD 锁才对 close 他 fd 免疫。本机 bun:sqlite 3.53.4 用的是 POSIX fcntl advisory 锁，因此 close 任一指向该 inode 的 fd 即丢本进程全部该 inode 锁。

两个 `-shm` 的打开者是 OMP 暴露给 LLM 的工具（在 OMP 主进程内运行，N-API worker 线程仍同进程）：
- `Grep`（native ripgrep 绑定，GrepTool 所调）遍历目录时 `fs.open()` 每个普通文件嗅探内容，含 32KB 的 `-shm`（二进制，遇 null 字节 BinaryDetection 退出，但 open+close 已发生）。
- `Read` 读 `-shm` 走 `Bun.file().bytes()`，同样是进程内 open+close。
- 只读 sqlite 连接（sqlite-reader 路径）不释放该锁；危险的是任意对 `-shm` 的字节级 open+close。

## grep-lock 2×2 对照（真实 native grep + 真实 BeamMemory 持 BEGIN IMMEDIATE，writer-B 独立进程 busy_timeout=0）

| action | filesSearched | shm:120 锁 before→after | writer-B | 最终 content | integrity |
|---|---|---|---|---|---|
| baseline（无 grep） | — | blocked→blocked | SQLITE_BUSY | [writer-A] | ok |
| grepDefault（默认遍历） | 4 | blocked→available | committed | [writer-B]（writer-A 丢失） | ok |
| grepTxtGlob（glob=*.txt） | 1 | blocked→blocked | SQLITE_BUSY | [writer-A] | ok |
| grepShmGlob（glob=*-shm） | 1 | blocked→available | committed | [writer-A] | ok |

glob 是 walk 时过滤：不匹配的文件不被 open。`*.txt` 不碰 `-shm` → 锁保持；`*-shm` 只碰 `-shm` → 锁释放。触发点精确隔离到 **`-shm` 的 open 本身**，不是目录枚举、不是 main 文件 open。grepDefault 丢锁后 writer-B 挤入提交、writer-A 的行被覆盖丢失，而 integrity_check 仍报 ok（静默丢更新）。

## grep-lock-bridge：丢锁 + 并发写 → 物理损坏

两个写入者对同一 bank（schema = content b-tree + fts5 虚拟表 + blob overflow，模拟真实跨结构）。lockdrop 臂每轮用真实 native grep drop 一次锁，第二个进程往空档写。

- baseline 臂（无 grep）：integrity ok，`dbstat` 无重复页，writer-B 被正常串行化。
- lockdrop 臂：**3/3 次运行均 `SQLITE_CORRUPT: database disk image is malformed`**。final 落盘运行：`lockDrops=43`、`committedA=34`、`committedB=360710`；各轮 writer-B 在 DB 变 malformed 前提交量在 10^5–10^6 量级。其中一次运行报 `fts5: corruption found`。

封闭了"锁释放 → 物理损坏"这一环，损坏类同现场（跨结构、FTS）。

## 排除项

- **WAL-reset 竞态**：walrace-bun 在 Bun 1.4.3 / SQLite 3.53.4，`mmap_size=1073741824`、`attempts=400`、`committed=674245`、`race_hit=false`、`lost=0`、`integrity=ok` → 当前构建不复现物理损坏。旧 SQLite 3.51.2 同负载约 2014/4000 轮即 malformed。
- **CVE-2026-11822（FTS5 内存破坏）**：读侧堆越界，仅 MATCH 遍历已损坏 FTS5 数据时触发，无页分配权，需 DB 预先损坏（与 healthy→corrupt 方向相反），<3.53.2 已修，3.53.4 含修复 → 不解释 on-disk 跨树重复页损坏。

## 必要条件（三者同一时间窗口叠加）

1. OMP 进程内一条连接正处写事务，握着 `-shm` 写锁；
2. **同一进程**调 `Grep`/`Read` 打开该 bank 的 `-shm`，撤掉本进程的锁（close 只撤本进程锁，故调工具的进程必须正好是握锁者）；
3. 第二个并发写入者（另一连接，或同 repo 的第二个 omp 进程——bank 按项目分，同 repo = 同文件）趁空档写入。

单写入者被夺锁无后果（下次写时自取回锁）；损坏需要第二个写入者。

## 版本

Bun 1.4.3（+c6da4a4d3），内嵌 SQLite 3.53.4（sourceid 2026-07-24）。历史事件运行版本未知，不能倒推。

## 上游

已向 `can1357/oh-my-pi` #8082 追加根因评论：https://github.com/can1357/oh-my-pi/issues/8082#issuecomment-6107512539

## 证据边界

机制、2×2 隔离、桥接损坏、排除项均为一手实测。未逐页复现历史事件的具体页面指纹，只复现同类（位移/重复页、malformed、fts5 corruption）。历史某次事件的肇事 tool-call 与 PID 不可考（当时 WAL 帧已 checkpoint 清零）。
