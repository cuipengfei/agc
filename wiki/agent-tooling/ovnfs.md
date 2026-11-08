# ovnfs：面向 agent 的文件夹副本与跨机器交接

> Sources: stencil-hq/ovnfs README 与 docs（limitations、configuration、checkouts、remote）, 2026-11-08; ovnfs install.sh、update.go、daemon.go, 2026-11-08; 构建服务元数据查询, 2026-11-08
> Raw: [ovnfs README、官方文档与安装脚本摘录](../../raw/agent-tooling/ovnfs-readme-docs-and-installer.md)
> Updated: 2026-11-08

## Overview

ovnfs 是一个 Go 写的守护进程加命令行工具，给任意文件夹（git 仓库或普通目录）开出一份写时复制的 checkout：打开时不复制内容，agent 在 checkout 里工作，宿主目录在 `apply` 之前不被它写入。一个守护进程把所有 checkout 呈现为单个挂载点下的子目录，Linux 走 FUSE，macOS 走 NFSv3，Windows 走 SMB 或 WinFsp，不需要 root。它面向的主要对象是同时在一个仓库上工作的多个 coding agent。

## 给谁用、什么场景

| 场景 | 用法 |
|---|---|
| agent 改代码，人审后合并 | `ovnfs new` 进入 checkout，改完 `ovnfs diff` 审阅，`ovnfs apply` 合回 |
| 多个 agent 各干一份互不覆盖 | 每个 agent 一份 checkout |
| 干净地跑一次构建或测试 | `ovnfs run -- make test`，结束即删除 |
| 从某个提交而不是工作区起步 | `ovnfs new --rev main` |
| 跨机器继续同一份工作区 | `attach`、`send`、`pull`、`push` |
| 在 checkout 里搜索 | `ovnfs grep`、`ovnfs glob` 在守护进程内部执行 |
| 清理 | `ovnfs ls`、`ovnfs prune . --idle 7d` |

## 路径分类与写入去向

打开文件夹时每个路径会被分到四类之一：

| 类别 | checkout 里看到什么 | 是否随远程传输 |
|---|---|---|
| `source` | 打开时的捕获内容 | 按内容 id 传输 |
| `cache` | 实时目录，直到 checkout 写入该路径 | 远端到达时是空目录，需重建 |
| `local` | 实时目录，直到 checkout 写入该路径 | 不传输 |
| `hidden` | 不存在 | 不传输 |

只有 `source` 的字节会离开本机。`apply` 只合并 `source` 路径，`cache` 与 `local` 的改动不会写回。内置规则把 `.env`、私钥、`.ssh` 等归为 `local`，把 `node_modules`、`.venv`、`.next` 等目录归为 `cache`，把超过 `size > 100MB` 的文件归为 `local`。规则可由 `.o2/ovnfs.yml` 与 `--rule` 覆盖，`ovnfs explain PATH` 指出是哪条规则生效。

写入进 checkout 自己的写时复制层。ovnfs 不会改写源目录；用户或其他进程仍可以直接改写源目录，此时 checkout 视图是尽力而为的，不保证冻结在打开那一刻。

## 成本与速度

- 守护进程捕获过该文件夹之后，后续 create 复用捕获：官方给的数字是 49k 文件的仓库打开约 1 秒，3,000 文件仓库上预先准备的 create 约 15 ms。
- git 仓库里的 checkout 有私有 git 目录：HEAD、refs、config、index 是打开时的副本，对象通过 alternates 借用源仓库。提交留在 checkout 里，源仓库的 refs 不变。
- 快照把上层改名为只读层，`fork` 从快照再开一份，`new --from SNAP` 可以重新打开；`rm` 删除 checkout 但保留快照。

## 官方限制

- 不是沙箱：绝对路径与符号链接可以到达宿主机。
- 视图是尽力而为，不是冻结快照：用户同时改写源文件时，agent 可能读到任一版本。
- 远程 checkout 没有 git 目录，也不能再被 attach 下去；改动要回到源机器 `pull`，再在本地 `apply`。
- NFSv3 无法推送缓存失效，`cache`、`local` 路径的改动最多 60 s 后才被客户端看见。
- 一条链路服务一份 checkout，冷读大量文件受链路吞吐限制。
- Linux 需要 `fusermount3`（fuse3 包）。

## 安装与升级

安装脚本 `https://stencil.so/ovnfs.sh` 先请求构建服务的元数据接口，再按返回的预签名地址下载：

| 用途 | 地址 |
|---|---|
| 最新稳定版 | `https://build.stencil.so/api/products/ovnfs/latest/<平台>-<架构>?channel=stable` |
| 指定版本 | `https://build.stencil.so/api/products/ovnfs/versions/<版本>/<平台>-<架构>` |

目标名只有 `linux-x86_64`、`linux-arm64`、`macos-x86_64`、`macos-arm64`。脚本会校验 SHA-256、`chmod 755`、先执行一次 `ovnfs version` 验证能运行，全部通过才原子替换目标文件。它不用 sudo、不改 shell 配置、不启动守护进程、不写配置。2026-11-08 查询到的稳定版是 `0.2.6`。

安装目录默认 `~/.local/bin`。该目录在 PATH 上时，OMP 会在下一次会话立刻发现 ovnfs 并启用两处集成，详见 [OMP 子 agent 工作区隔离](../omp/subagent-workspace-isolation.md)。只想观察、暂不让 OMP 使用时，把安装目录指到 PATH 之外：

```bash
curl -fsSL https://stencil.so/ovnfs.sh | OVNFS_INSTALL_DIR="$HOME/opt/ovnfs" sh
```

升级用 `ovnfs update`。它按二进制自身的构建信息分三条路径：官方发布二进制从构建服务取最新版；`go install` 装出来的用 `go install` 重建；在克隆里 `go build` 出来的被拒绝。替换完成后，只有升级前守护进程确实在运行时才需要 `ovnfs restart` —— `runRestart` 在没有守护进程时也会启动一个新的。用 `ovnfs status` 判断：

```bash
ovnfs update
ovnfs status
ovnfs restart   # 仅在 status 显示有守护进程运行时执行
```

## 独有的远程能力

`attach` 把一份 checkout 连到另一台机器：远端先按提供的条目重建目录树，列表与 stat 不移动内容，第一次打开某个文件才通过链路取回并校验。`send` 通过 ssh 把一份文件夹送到新机器，必要时先安装 ovnfs 并加入 mesh。`pull` 把远端的改动取回本地 checkout，`push` 让远端把之后还会读的内容全部取走，从而在源机器休眠、离线或停止守护进程后继续工作。

链路在源守护进程运行期间会退避重连；源守护进程不在时，远端已缓存的内容可读，未缓存的内容读取失败。这就是必须在源机器离线前运行 `push` 的原因。

## See Also

- [OMP 子 agent 工作区隔离：原生后端、ovnfs 接入与合并时机](../omp/subagent-workspace-isolation.md)
