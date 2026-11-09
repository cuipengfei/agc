# sandcastle：把 agent 关进进程围栏的编排库

> Sources: mattpocock/sandcastle README 与 docs/guide（getting-started、core-concepts、run、iterations、branch-strategies、init、cli、glossary、sandbox-providers、agent-providers、.out-of-scope）, 2026-11-09; src/AgentProvider.ts 与 package.json, 2026-11-09; npm 注册表查询, 2026-11-09; 本机环境检查, 2026-11-09
> Raw: [sandcastle README 与编排文档摘录](../../raw/agent-tooling/sandcastle-readme-and-orchestration-docs.md); [sandcastle 沙箱提供方、agent 提供方与围栏边界摘录](../../raw/agent-tooling/sandcastle-sandbox-and-agent-providers.md)
> Updated: 2026-11-09

## Overview

sandcastle 是一个 TypeScript 库，包名 `@ai-hero/sandcastle`，MIT 许可。一次 `run()` 调用做三件事：创建沙箱、在沙箱里启动一个 agent 进程、把它产生的提交按分支策略合回你的分支。它支持六种 agent 命令行工具与九种沙箱（`package.json` 导出十条沙箱路径，文档表格漏掉 DayTona），原生沙箱用操作系统自带的进程沙箱，可以在不建镜像、不起守护进程的前提下把 agent 关进围栏。

## 一次运行的过程

```mermaid
flowchart LR
  A[你的脚本] --> B[创建沙箱]
  B --> C[在沙箱内<br/>启动 agent]
  C --> D[收集提交]
  D --> E[按分支策略<br/>合并或保留]
```

`run()` 必填两项：`agent` 与 `sandbox`。可选 `cwd`、`prompt` 或 `promptFile`、`maxIterations`、`branchStrategy`、`hooks`、`logging`、`output`、`timeouts`。

返回的 `RunResult` 字段里，三处容易误读：

| 字段 | 实际含义 |
|---|---|
| `branch` | **目标分支**，即你调用 `run()` 时检出的那条，不是 agent 工作所用的分支 |
| `output` | **只有传入 `output` 选项时才有**，且要求 `maxIterations === 1` |
| `commits` | 本轮运行产生的提交数组，元素形如 `{ sha }` |

其余字段：`iterations`（每轮一条记录，含可选的 `sessionId`、`sessionFilePath`、`usage`、`contextWindow`）、`completionSignal`、`stdout`、`logFilePath`、`preservedWorktreePath`、`resume`、`fork`。

`promptFile` 相对 `process.cwd()` 解析，不跟随 `cwd` 选项。

## 迭代与完成信号

一次 iteration 是一次 agent 进程的完整运行，从启动到退出，`maxIterations` 默认 1。

官方两处文档对每轮提交数量的表述不一致：`core-concepts.md` 写一次 iteration “收集它产生的提交”（复数），`glossary.md` 的 Iteration 词条写“为一个任务最多一个提交”。两处原文并存，本文章不选边。

循环可以提前结束：agent 输出 `<promise>COMPLETE</promise>` 即停止，这个约定要写进你的提示词，引擎不会自己注入。信号可以换成别的字符串或字符串数组。

超时分成两段，覆盖不同阶段：

| 参数 | 默认值 | 起点 | 到点后的结果 |
|---|---|---|---|
| `idleTimeoutSeconds` | 600 | agent 尚无任何输出 | 判为卡住，抛 `AgentIdleTimeoutError` |
| `completionTimeoutSeconds` | 60 | 已看到完成信号，进程仍未退出 | 判为悬挂进程，运行成功并给出警告，提交照常返回 |

悬挂进程的成因是 agent 拉起的子进程（`gh`、git、常驻 MCP 服务器）继承了 stdout 管道。完成超时会在每一条新输出上重置，因此信号之后的尾部输出仍会被收下。

## 三种分支策略与合并时机

| 策略 | 写入位置 | 合并时机 | 默认用于 |
|---|---|---|---|
| `head` | 直接写宿主工作目录 | 无分支、无合并 | 绑定挂载提供方（含原生围栏） |
| `merge-to-head` | 临时分支加 worktree | 一轮结束合并一次 | 隔离型提供方（容器外的云端） |
| `branch` | 你指定的分支加 worktree | 不自动合并，提交留在该分支 | 需要拿 PR 分支时 |

`merge-to-head` 的两条失败路径值得记住：运行失败时临时分支被删除，除非 agent 已在上面留下提交；合并本身失败时中止合并，HEAD 保持不变，临时分支保留并打印处理方式。

worktree 建在 `.sandcastle/worktrees/`，临时分支名带时间戳（`sandcastle/<ts>`）。`copyToWorktree` 在 `head` 策略下不支持。

`createWorktree()` 把 worktree 当独立对象管理，只接受 `branch` 与 `merge-to-head`，`head` 在类型层面就不可用。它的关闭行为是有未提交改动就保留，干净才删除。`wt.createSandbox()` 的所有权是分开的：`sandbox.close()` 只停容器，worktree 由 `wt.close()` 负责；顶层 `createSandbox()` 则由 `close()` 一并处理。

## 沙箱提供方

文档表格列出九种：

| 提供方 | 类型 | 能否 `interactive()` |
|---|---|---|
| `bwrap()` | 系统进程围栏（Linux、WSL2） | 否 |
| `seatbelt()` | 系统进程围栏（macOS 14+） | 否 |
| `docker()`、`podman()` | 容器，带镜像 | 是 |
| `e2b()`、`modal()`、`sprites()`、`vercel()` | 云端微虚拟机 | `vercel()` 可以，其余不行 |
| `noSandbox()` | 不隔离 | 是 |

`package.json` 的 `exports` 里有十条沙箱路径，多出 `daytona`，README 也提到 Daytona。表格漏列这一条。

云端提供方各自的前提：

- `e2b()` 需要 Node 22.19 或更新，`E2B_API_KEY` 放 shell 而不放 `.sandcastle/.env`（后者声明的键会被转发进沙箱）；默认超时 30 分钟，免费档上限 1 小时。
- `sprites()` 需要 Node 24，基础镜像已含 git、Node 与 `claude`；进程被信号中断时由后台进程删除远端实例。
- `modal()` 以 root 运行，因此 `sudo: true` 没有差别，并设置 `IS_SANDBOX=1`；默认生命周期 1 小时。

## 原生围栏实际挡住什么

`bwrap()` 与 `seatbelt()` 每次 `exec` 都是一个新进程，跑的是宿主已有的工具，只读挂载。

| 对象 | agent 能做什么 |
|---|---|
| 仓库或 worktree、Sandcastle 挂入的 git 目录、私有临时目录、私有家目录 | 可写 |
| `PATH` 上的每个目录，以及其中符号链接可执行文件的安装根 | 可读 |
| 主目录、SSH 密钥、`~/.claude`、`~/.codex`、`~/.config/gh`、其它仓库 | 不可见 |
| 宿主 localhost 上的服务 | 可达 |
| 你的进程 | 不能发信号；它启动的进程在关闭时全部结束 |
| root | 没有，`sudo: true` 的 hook 会被拒绝 |

推论落在使用方式上：原生围栏假定 agent 用不到你已有的登录状态，凭据必须写进 `.sandcastle/.env`。你的 git 身份会被复制进去，提交仍带你的名字。

`seatbelt()` 在 macOS Keychain 上没有承诺隔离；它也没有 PID 命名空间，调用 `setsid` 或 `setpgid` 脱离进程组的进程会一直存在到你手动结束。

## 强度与不防的情况

官方自述的强度：Linux 上 `bwrap()` 与 runc 容器（即 Linux 上的 Docker）相当；macOS 上 `seatbelt()` 弱于 Docker Desktop，后者在虚拟机里跑容器。

明确不防四类：

1. 内核逃逸。原生围栏是共享内核的进程沙箱。
2. 宿主 localhost 上的服务。网络全开。
3. macOS 的进程枚举。路径作为元数据可见，能判断存在、读到大小与时间，读不到内容。
4. macOS 上脱离进程组的进程。它能继续写 worktree 与访问网络。

原生提供方在构造时检查机器能力，不行就抛 `NativeSandboxUnavailableError`，并附一条修复命令。抛错发生在创建任何 worktree 之前，官方写明绝不无沙箱回退。

## 安装、初始化与升级

安装只有一条来源：npm 注册表。

```bash
npm install --save-dev @ai-hero/sandcastle
npx @ai-hero/sandcastle init
```

注册表当前 `latest` 为 `0.14.0`，另有预发布标签 `v1-next`，最新构建 `1.0.0-v1-next.20261105145541`，共 64 个版本记录。`engines` 未声明。

`init` 写五个文件，遇到已存在的 `.sandcastle/` 直接报错：

```
.sandcastle/
├── Dockerfile      # 仅 Docker/Podman
├── main.mts        # ESM 包里改名为 main.ts
├── prompt.md
├── .env.example
└── .gitignore      # 忽略 .env、logs/、worktrees/
```

五个模板：`blank`、`simple-loop`、`sequential-reviewer`、`parallel-planner`、`parallel-planner-with-review`。任务来源三种：GitHub Issues、Beads、Custom。Docker 基础镜像 `node:22-bookworm`，另装 git、curl、jq、GitHub CLI、Claude Code CLI，并建一个非 root 的 `agent` 用户。

非 TTY 环境下 `init` 先检查全部必需 flag，缺项一次性报出，不会留下写了一半的目录。

升级换 npm 版本即可，没有守护进程需要重启。改过 Dockerfile 之后要重建镜像：

```bash
npx @ai-hero/sandcastle docker build-image
```

`cli.md` 只列出 `init`、`docker build-image`、`docker remove-image`、`podman build-image`、`podman remove-image`，没有 `run` 子命令：运行入口是你自己写的 `main.mts`，用 `npx tsx` 执行。

## 会写哪些位置

| 位置 | 内容 |
|---|---|
| `.sandcastle/` | 入口、提示词、Dockerfile、`.env` |
| `.sandcastle/worktrees/` | 隔离用的 worktree |
| `.sandcastle/logs/` | 日志文件默认去向 |
| `sandcastle/<时间戳>` | 临时分支 |
| agent 自己的目录 | 会话记录，例如 Claude Code 在 `~/.claude/projects/` |
| Docker | 镜像 `sandcastle:<仓库目录名>` |
| 云端 | 远端沙箱，`close()` 删除 |

日志默认写文件；`logging: { type: 'stdout' }` 改为终端输出。`logging.onAgentStreamEvent` 可把文本块、工具调用与原始 stdout 行转给外部系统，回调抛错会被吞掉，不影响运行。

## 官方不做的事

`.out-of-scope/` 下八份文件把边界写清楚了：

- 内置 agent 提供方与内置沙箱都不按请求增长，新增要过真实运行验收。
- 不打包大型第三方工作流模板。
- `sandcastle` 与 `.sandcastle` 前缀不可配置。
- 不做 Dockerfile 组合抽象层。
- 不为每个 `docker run` 参数加专属选项。
- 一个沙箱只支持一个仓库，多仓库列为未来版本。
- 不重试提供方错误，失败即报错。

另有两条使用层面的边界：沙箱的 git 保护只覆盖 Sandcastle 自己执行的 git 命令，它写过的仓库在你之后运行 `git status`、`git pull` 这类会读仓库配置的命令前应先审查改动；沙箱内没有 root，原生围栏装不了系统包，只能装在宿主上。

## 与 ovnfs、OMP 隔离的分层关系

三者分属不同层，可以叠加：

| 工具 | 隔离的对象 | 明确不管的 |
|---|---|---|
| [ovnfs](ovnfs.md) | 文件夹的副本 | 官方写明不是沙箱，绝对路径与符号链接可到宿主 |
| [OMP 子 agent 隔离](../omp/subagent-workspace-isolation.md) | 子 agent 的工作目录 | 进程仍以你的身份运行，主目录与登录凭据不在管辖范围 |
| sandcastle | agent 进程本身 | 不给同一份工作区做多份副本，也不做跨机器交接 |

对应到具体机制：sandcastle 的 `head` 策略与“无隔离”等价，写入直接进宿主工作目录；`merge-to-head` 用的 worktree 与 OMP 的 `rcopy` 后端属于同一种做法，差别在于 sandcastle 在这一层之上又套了进程围栏。

OMP 侧没有 sandcastle 的内置支持：仓库里搜索 `omp` 没有实质命中，内置的是 `pi()`，命令为 `pi -p --mode json --model <模型>`，`init` 在 Dockerfile 里装 `@earendil-works/pi-coding-agent`。要跑 OMP 需要自行实现 `AgentProvider`，`AgentProvider` 是公开导出的接口。

## 本机前提（2026-11-09 检查）

| 条件 | 状态 |
|---|---|
| Bubblewrap | 已装 0.11.1 |
| 非特权用户命名空间 | 可用，`unshare -Ur` 早前实测成功 |
| AppArmor 用户命名空间限制 | 无此 sysctl，也无 `/etc/apparmor.d/bwrap` |
| Docker | 已装 29.4.1，守护进程未运行 |
| Node 与 npm | 24.22.2 / 11.19.1 |
| git | 2.53.0 |
| 仓库文件系统 | ext4 家族，不在 `/mnt/c` 下 |
| agent CLI | `claude`、`codex`、`pi` 1.5.0、`opencode` 都在 |
| 任务来源工具 | `gh` 与 `bd` 都在 |

`pi` 是 `@earendil-works/pi-coding-agent` 1.5.0，正是 `pi()` 提供方与 `init` 使用的维护中包。`omp` 是另一个可执行文件，版本 18.18.3。

## 证据边界

- 未执行 `npm install`、`sandcastle init`、任何 `run()`，未构建镜像。Docker 守护进程当前未运行。
- bwrap 能否在 OMP 的会话环境里正常启动未实测。
- `.sandcastle/worktrees/` 与 `.sandcastle/logs/` 被自带 `.gitignore` 忽略，据此推断 OMP 的 `grep`/`glob` 默认不会遍历进去；未实跑。
- 星数、fork 数与 issue 数为仓库主页快照；npm 版本为 2026-11-09 查询值。
- 文档表格漏列 DayTona 一事有两处证据（`exports` 与 README），但 DayTona 提供方的具体行为未读其文档。

## See Also

- [ovnfs：面向 agent 的文件夹副本与跨机器交接](ovnfs.md)
- [OMP 子 agent 工作区隔离：原生后端、ovnfs 接入与合并时机](../omp/subagent-workspace-isolation.md)
- [AI Software Factory 概念与真工厂短名单](../software-factory/ai-software-factory-landscape.md)
