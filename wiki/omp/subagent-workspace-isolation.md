# OMP 子 agent 工作区隔离：原生后端、ovnfs 接入与合并时机

> Sources: can1357/oh-my-pi 源码与 docs/tools/task.md, 2026-11-08; 本机 OMP 18.18.1 安装与环境检查, 2026-11-08
> Raw: [OMP 工作区隔离与 ovnfs 接入源码摘录](../../raw/omp/ovnfs-integration-and-isolation-backends.md)
> Updated: 2026-11-08

## Overview

OMP 的隔离子 agent 不是在共享检出里加锁，而是给子 agent 换一个工作目录：任务开始时物化一份独立工作区，子 agent 的读、写、编辑与 bash 全部落在那里；任务结束后把改动捕获成补丁，按配置合回父检出。后端可以来自内核的分层挂载、文件系统克隆、`git worktree` 或 ovnfs checkout。真正决定行为的是三层开关：是否允许隔离、任务是否声明 `isolated: true`、`isolation.backend` 选中哪个后端。

## 三层开关

| 层 | 配置或输入 | 默认值 | 作用 |
|---|---|---|---|
| 总开关 | `task.isolation.enabled` | `false` | 为假时任务 schema 不出现 `isolated` 字段，隔离完全不发生 |
| 单次任务 | `isolated: true` | 未声明即共享检出 | 只有声明的任务才开独立工作区 |
| 后端 | `isolation.backend` | `auto` | `auto` 下由 PAL 解析可用后端；找到 ovnfs 时优先用 checkout |

`task.isolation.apply` 默认为 `true`，表示成功后自动把改动合回父检出；设为 `false` 时只保留补丁或分支。`task.isolation.merge` 默认 `patch`，可选 `branch`。

## 后端顺序与本机可用性

Linux 的自动顺序是 btrfs、ZFS、linux-reflink、overlayfs、rcopy。`resolve` 会把可用的后端按顺序排成候选链，逐个尝试；`rcopy` 是最后兜底，在 git 工作树里执行 `git worktree add --detach`，否则递归复制整棵树。

overlayfs 的探测条件是内核支持 overlay 或者系统里有 `fuse-overlayfs`。本机可观测到的事实是：`/proc/filesystems` 含 `overlay`，`unshare` 加用户命名空间内挂载 overlay 实测成功，`stat -f -c %T` 报 `ext2/ext3` 家族，`fuse-overlayfs` 未安装。btrfs、ZFS、reflink 的 host-level 探测没有实际运行，OMP 最终是否落在 overlayfs 属于推断。overlay 挂载被拒绝时会退到 fuse-overlayfs 或 rcopy。

`ensureIsolation` 在启动后端之后调用 `detachGitDir`，把隔离工作区的 HEAD、index、refs 从源仓库分离，对象库仍通过 alternates 借用。因此私有 git 元数据在原生后端上已经成立。

## ovnfs 接入的三个作用点

找到 `ovnfs` 可执行文件（`ovnfs.path`，默认在 PATH 上找 `ovnfs`）之后，OMP 立刻在三处改变行为，其中只有第三处受隔离开关控制：

1. **系统提示词**：bash 工具可用时增加「Separate checkouts」一节，要求 agent 需要第二份副本时用 `ovnfs new`，代替 `git worktree add`、`git clone`、`cp -r`，除非用户明确要求后者。
2. **grep 与 glob**：搜索根位于 ovnfs 挂载点下时，由守护进程在内存里搜索；守护进程报错则退回原生搜索，中止与超时不退回。守护进程的状态探测最多按 `RECHECK_MS = 10_000` 缓存，单次 `status` 超过 `STATUS_TIMEOUT_MS = 5_000` 即放弃。
3. **隔离子 agent**：`task.isolation.enabled` 为真、任务声明 `isolated: true`、后端为 `auto` 时，子 agent 在 ovnfs checkout 里工作。omp 先执行 `ovnfs --json start` 确认守护进程并取得管理套接字，随后用 `new` 开 checkout、用 `rm` 删除。

管理协议版本固定为 `PROTOCOL_VERSION = 5`，版本不符时直接报错要求升级 ovnfs。checkout 的捕获就是任务起点，因此不再另做 baseline；仓库含嵌套仓库或子模块、或守护进程缺少 `new.base`/`diff.binary` 特性时，退回普通 baseline 捕获。运行目录写入 `.omp-ovnfs-checkout.json`，崩溃残留由 `omp worktree clear` 清理。

**没有静默回退**：找不到 ovnfs 时使用原生后端；一旦找到，ovnfs 启动或 checkout 失败会让隔离任务失败并说明原因。

## 运行期间：文件写到哪里

子 agent 的当前目录就是工作区（原生后端的 `~/.omp/wt` 下，或 ovnfs 的 `~/checkouts` 下）。它的 edit、write、bash、依赖安装、文件删除全部落在工作区；父检出的文件在整个运行期间不被写入。`cache` 与 `local` 类路径在 ovnfs checkout 里可能是实时视图，但 checkout 写入之后就归它自己，`apply` 不会把这些改动带回。

## 结束时的捕获与合并

| 单位 | 是什么 | 频率 |
|---|---|---|
| 一次写入 | 一次 edit、write、bash 产生的改动 | 只进工作区 |
| 一次捕获 | 每个仓库一份补丁（根仓库与每个改动过的嵌套仓库各一份） | 每次运行一次 |
| 一次合并阶段 | 根仓库补丁一次应用；每个有改动的嵌套仓库分别应用 | 每次运行结束时一次；`apply` 为 `false` 时为零次 |

捕获发生在子 agent 运行结束之后，失败或被中止的运行不应用补丁。补丁写入 `<id>.patch`，嵌套仓库另写 `<id>.nested-<n>-<path>.patch`。分支模式把改动提交到 `omp/task/<id>` 再合并。kept-alive 的子 agent 会保留工作区，捕获推迟到最终 release，并用改动指纹跳过未变化的重复提交。工作区无法写回时被保留在 `.retained-*` 同级目录，路径写进错误信息。

## git 守卫

`bash.gitGuard` 默认关闭，只有 `PI_GIT_GUARD` 为真时守卫才运行。开启后，在共享检出里 `reset --hard`、移动到其它提交的 `reset`、`switch`、`checkout <分支或提交>`、`stash`、以及整棵树的路径 `checkout`/`restore` 会被拒绝；拒绝信息里的替代做法按是否发现 ovnfs 变化：没有 ovnfs 时建议 `git worktree add`，有 ovnfs 时建议 `ovnfs new --name <name>`。在 ovnfs checkout 与链接 worktree 这类私有检出里，这些命令放行，丢弃的改动先记录到 `refs/omp/discarded`。

## 本机现状

`~/.omp/agent/config.yml` 第 426 行 `bash.gitGuard: false`，第 538 行 `task.isolation.enabled: false`；`apply: true`、`merge: patch`。本机未安装 ovnfs，安装的 OMP 为 18.18.1，发行包内含 `ovnfs/*` 与 `task/ovnfs` 模块。因此三处集成当前都不生效；装上 ovnfs 并放进 PATH 会立即启用前两处，第三处还需要打开隔离开关。

## See Also

- [ovnfs：面向 agent 的文件夹副本与跨机器交接](../agent-tooling/ovnfs.md)
- [OMP Rust/TS architecture and pi-natives](rust-ts-architecture.md)
- [4-agent-comparison](../ai-coding-agents/4-agent-comparison.md)
