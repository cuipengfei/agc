# Beads 的安装与运行面：嵌入式 Dolt、独立依赖与同步条件

> Sources: gastownhall/beads README 与 docs（installation、architecture/dolt、sync-setup、cli-reference/dolt、ide-setup、quickstart），2026-11-04 至 2026-11-05；GitHub releases API，2026-11-05；npm registry，2026-11-05；PyPI，2026-11-05；Homebrew formula API，2026-11-05；本机 WSL 实测，2026-11-05；buntoolbox 仓库 docker/layers 与 scripts，2026-11-05
> Raw: [Beads 安装、运行面、命令面与任务系统分工](../../raw/agent-tooling/2026-11-05-beads-install-runtime-command-surface.md)
> Updated: 2026-11-05

## Overview

Beads 的核心是一个 Go 二进制 `bd`，Dolt 引擎编译在里面，默认以嵌入式方式运行。独立 Dolt 只在跨机器同步、server 模式和无 CGO 的 `go install` 产物中出现。安装路径的差别主要在于下载物、校验方式和是否连带安装 Dolt；MCP 组件带一整套 Python 依赖。

## 安装路径与下载物

### 安装脚本

- 脚本地址：`https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh`，24,156 字节。
- 脚本先查询 `https://api.github.com/repos/gastownhall/beads/releases/latest`，再下载对应平台的压缩包与 `checksums.txt`。
- 1.3.4 的 Linux amd64 压缩包为 53,448,333 字节，SHA256 为 `175c26904bde3ff9168d2282ff6b56f17b17f60c22fa5acb3dacc9fb3465303a`；`checksums.txt` 为 881 字节。
- 下载地址返回 302，实际文件从 `release-assets.githubusercontent.com` 的签名地址取得。
- 脚本校验 SHA256，不一致时拒绝安装。
- 安装位置优先 `/usr/local/bin`，不可写时用 `~/.local/bin`；安装后创建 `beads -> bd` 符号链接。
- 没有对应平台的预编译资产时，回退到 `go install`，再回退到源码构建。

### npm 与 bun

- npm 包 `@beads/bd` 1.3.4 的 tarball 为 `https://registry.npmjs.org/@beads/bd/-/bd-1.3.4.tgz`，解包后 18,149 字节。
- 包的 `dependencies` 字段不存在，也就是 0 个 npm 依赖。
- `postinstall` 按平台拼出 `https://github.com/gastownhall/beads/releases/download/v<版本>/beads_<版本>_<系统>_<架构>.tar.gz` 并下载。
- npm 路径不下载 `checksums.txt`，也不校验哈希。
- bun 安装需要 `--trust` 才会执行 postinstall；CI 环境跳过二进制下载。

### Homebrew

- 公式 `beads` 版本 1.3.4，位于 homebrew/core。
- 公式声明两个运行时依赖：`dolt` 2.6.2 与 `icu4c@79` 79.1，即使嵌入式模式不需要独立 Dolt。
- x86_64 Linux 的 bottle 地址：
  - beads：`https://ghcr.io/v2/homebrew/core/beads/blobs/sha256:ec8f032780704bbdc0ef6b50c7e36a18b50984bc94f2c7b346783bec5c9e0c28`
  - dolt：`https://ghcr.io/v2/homebrew/core/dolt/blobs/sha256:1b9c3c68d313a6334f4526063e1e03ac46866e9d180c877073f0d56647105e0e`
  - icu4c@79：`https://ghcr.io/v2/homebrew/core/icu4c/79/blobs/sha256:8e06c733d9e465f5151d7eb76a3e8b460c8ccfa8020da3ce2b8b5e2f45435c43`

### 其他方式

- mise 从 GitHub release 取件：`mise install github:gastownhall/beads`。
- `go install` 有两种模式。无 CGO 的产物只能 server 模式，需要外部 `dolt sql-server`；含 CGO 的产物把嵌入式引擎编译进去，需要 Go 1.24+、C 编译器，Debian/Ubuntu 还要 `libzstd-dev`。
- 手动安装只需下载 release 压缩包，解出 `bd` 放入 PATH。
- Windows 使用 PowerShell 安装脚本；Arch 有 AUR 包 `beads-git`。

## 嵌入式 Dolt 与独立 Dolt

默认的 `bd init` 创建嵌入式数据库，数据在 `.beads/embeddeddolt/`，Dolt 在 `bd` 进程内运行。本机 1.3.4 二进制的 `ldd` 只列出 `libc.so.6`、动态加载器和内核 vDSO，没有外部数据库依赖。嵌入式模式是单写者，用文件锁保证同一时刻只有一个进程写。

独立 `dolt` 出现在这些场景：

- 跨机器 `bd dolt push/pull`。git 协议远程的传输由 PATH 上的 `dolt` 二进制执行。
- server 模式与 proxied-server 模式，多个 agent 并发写。
- 无 CGO 的 `go install` 产物。

官方同步指南把 Dolt 2.6.0 或更新列为每台机器的前置条件；`bd` 会拒绝低于 2.6.0 的 `dolt`。同步数据放在同一个 Git 远程的 `refs/dolt/data`，新克隆运行 `bd bootstrap`。跨结构迁移时，只由一处副本执行 `bd migrate schema` 与 `bd dolt push`，其他副本升级二进制后执行 `bd bootstrap`。

单人单机、不执行 push/pull、不使用 server 模式时，不需要安装独立 Dolt。

## MCP 组件与依赖闭包

`beads-mcp` 1.3.4 要求 Python 3.10 或更新，直接依赖固定为：

- `fastmcp==3.4.11`
- `pydantic-settings==2.14.2`
- `pydantic==2.13.4`

在本机 CPython 3.14、Linux x86_64 条件下，`pip download --only-binary=:all:` 解析出 69 个 wheel，合计约 17 MB。换 Python 版本时，传递依赖的版本与 wheel 标签会变化，三个直接固定版本不变。

官方给出的上下文成本：CLI 加 hooks 约 1–2k tokens；MCP 工具 schema 占 10–50k tokens。有 shell 时用 CLI，MCP 留给没有 shell 的环境。

## 本机安装来源与升级

本机 `/home/cpf/.local/bin/bd` 的大小为 154,378,776 字节；文件在本机出现的时间是 2026-10-25 18:16:08，mtime 为 2026-10-24 08:32:20。v1.3.2 发布包内的 `bd` 同样为 154,378,776 字节，mtime 为 2026-10-24 08:32。mtime 来自压缩包内文件的打包时间，不能当作安装日期。

其他证据：

- `~/.local/bin/beads` 符号链接不存在，官方安装脚本会创建它。
- `~/.bun/bin/bd` 不存在；`@beads` 目录只剩残留，没有 `package.json` 与 `bin`。
- `bd.bak-1.0.2` 为 135,849,840 字节，出现于 2026-04-30 22:12。
- zsh 历史包含 `bun add -g @beads/bd@0.28.0` 到 `@beads/bd@0.49.1` 的多条记录，以及一次 `bun remove -g @beads/bd`。

结论是间接证据推断：当前 1.3.2 是从官方 release 压缩包解出后手动放入 `~/.local/bin`，没有安装日志直接记录。2026-11-05 已将 1.3.4 复制到同一路径，保留 `bd.bak-1.3.2`，`bd version` 输出 1.3.4。

## buntoolbox 与 uv-bun 的覆盖边界

buntoolbox 的 Docker 镜像完整覆盖安装：`docker/layers/10-beads.env` 固定 `BEADS_VERSION=1.3.2`，`docker/layers/10-beads.sh` 下载同一 GitHub release 压缩包并解到 `/usr/local/bin`；`latest`、`i3`、`kde` 共用该层，镜像测试会执行 `bd --version` 与 `bd --help`。

WSL 侧只有 `scripts/check-wsl-versions.sh`，读取本机版本并与仓库目标比较，没有安装或升级分支。脚本优先使用 `docker/layers/*.env` 中的版本；当前目标是 1.3.2，所以即使上游是 1.3.4，检查结果仍是 up-to-date。仓库的 AGENTS.md 工作流要求先在 WSL 手工安装并验证，再写进 Docker layer。

`uv-bun` 的九个段落（全局 npm 包、uv 与 uv tools、self-update、apt、opencode 项目、tokscale、skills、Codex 插件、OMP 插件）没有 bd。当前 bd 也不是全局 bun 包，因此 `uv-bun` 不覆盖它的升级。

## 遥测

`bd` 默认开启匿名遥测。每个命令生成一条 `cli_command` 事件，只带命令名、bd 版本与操作系统平台；设备标识是机器派生并经过 HMAC 保护的值。关闭命令为 `bd metrics off`。

## See Also

- [harness 接入工具的三条通道](harness-integration-paths.md) — 指令文件与 MCP 两条接入路
- [Beads 1.3.4 的命令面与帮助树结构](beads-command-surface.md) — 命令分组与递归帮助扫描
- [持久任务库与会话 todo 的分工](durable-backlog-vs-session-todo.md) — bd 与会话清单的选择规则
- [uv 工具发现机制与 uv-receipt.toml](uv-tool-discovery-and-receipts.md) — 包管理器是否拥有某个二进制的判定方式
