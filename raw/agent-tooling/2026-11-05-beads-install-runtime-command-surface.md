# Beads 的安装、运行面、命令面与任务系统分工（2026-11-05 会话材料）

> Source: https://github.com/gastownhall/beads（README、RELEASING.md、docs/getting-started/installation.md、docs/architecture/dolt.md、docs/getting-started/sync-setup.md、docs/cli-reference/dolt.md、docs/getting-started/ide-setup.md、docs/getting-started/quickstart.md）；https://beads.gascity.com/；GitHub releases API；https://registry.npmjs.org/@beads/bd/latest；https://pypi.org/pypi/beads-mcp/json；https://formulae.brew.sh/api/formula/beads.json；https://formulae.brew.sh/api/formula/dolt.json；https://formulae.brew.sh/api/formula/icu4c@79.json；本会话在本机 WSL 的实测与文件检查；buntoolbox 工作副本的 docker/layers 与 scripts
> Collected: 2026-11-05
> Published: Unknown

## 1. 发布资产与安装包

### v1.3.4 release

- 发布时间：2026-11-04T09:22:51Z。
- Linux amd64：`beads_1.3.4_linux_amd64.tar.gz`，53,448,333 字节，sha256 `175c26904bde3ff9168d2282ff6b56f17b17f60c22fa5acb3dacc9fb3465303a`，URL `https://github.com/gastownhall/beads/releases/download/v1.3.4/beads_1.3.4_linux_amd64.tar.gz`。
- checksums.txt：881 字节，sha256 `802939da873bde8c975f8fa3c5f60bdc4e330e76f1d04f8137247a1f2a6c1f28`，URL `https://github.com/gastownhall/beads/releases/download/v1.3.4/checksums.txt`。
- 下载地址返回 302，跳转到 `release-assets.githubusercontent.com` 的签名地址。
- 同版本其他资产：darwin_amd64、darwin_arm64、linux_arm64、freebsd_amd64、windows_amd64.zip、windows_arm64.zip、android_arm64、contract_corpus、spdx.json。

### 安装脚本

- URL：`https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh`，24,156 字节。
- 查询最新版本：`https://api.github.com/repos/gastownhall/beads/releases/latest`。
- 下载对应平台的 `beads_<版本>_<系统>_<架构>.tar.gz` 与 `checksums.txt`，校验 SHA256，不一致拒绝安装。
- 安装到 `/usr/local/bin`（可写时），否则 `~/.local/bin`；创建 `beads -> bd` 符号链接。
- 没有对应平台预编译资产时回退到 `go install`，再回退到源码构建。
- WSL 会提示安装的是 Linux 版本，5 秒后继续；非交互环境直接继续。

### npm / bun

- `@beads/bd` 1.3.4 tarball：`https://registry.npmjs.org/@beads/bd/-/bd-1.3.4.tgz`。
- integrity：`sha512-vlJ30y3yVI7b5RBGKcO4XjHo5z5VD4z77sTutYUsVn0z6QvbOEgVfPx5su9bs1tukL9GBv2R/HVFKkKRSiQMdA==`。
- 解包后 18,149 字节；`dependencies` 字段不存在（0 个 npm 依赖）。
- `postinstall` 执行 `node scripts/postinstall.js`，按平台拼出 `https://github.com/gastownhall/beads/releases/download/v<版本>/beads_<版本>_<系统>_<架构>.tar.gz` 并下载。
- npm 路径不下载 `checksums.txt`，不校验哈希。
- bun 安装需要 `--trust` 才会执行 postinstall。
- CI 环境跳过二进制下载。

### Homebrew

- 公式 `beads`，版本 1.3.4，位于 homebrew/core。
- 依赖：`dolt`（2.6.2）与 `icu4c@79`（79.1）。
- x86_64 Linux bottle：
  - beads：`https://ghcr.io/v2/homebrew/core/beads/blobs/sha256:ec8f032780704bbdc0ef6b50c7e36a18b50984bc94f2c7b346783bec5c9e0c28`
  - dolt：`https://ghcr.io/v2/homebrew/core/dolt/blobs/sha256:1b9c3c68d313a6334f4526063e1e03ac46866e9d180c877073f0d56647105e0e`
  - icu4c@79：`https://ghcr.io/v2/homebrew/core/icu4c/79/blobs/sha256:8e06c733d9e465f5151d7eb76a3e8b460c8ccfa8020da3ce2b8b5e2f45435c43`
- 本机没有安装 Homebrew，未实际执行安装。

### 其他安装方式

- mise：`mise install github:gastownhall/beads`，取 GitHub release。
- go install 无 CGO：`CGO_ENABLED=0 go install github.com/steveyegge/beads/cmd/bd@latest`，产物只能 server 模式，需要外部 `dolt sql-server`。
- go install 含 CGO：`CGO_ENABLED=1 GOFLAGS=-tags=gms_pure_go go install github.com/steveyegge/beads/cmd/bd@latest`，需要 Go 1.24+ 与 C 编译器；Debian/Ubuntu 需要 `libzstd-dev`。
- 手动：下载 release 压缩包，解出 `bd` 放入 PATH。
- Windows：`irm https://raw.githubusercontent.com/gastownhall/beads/main/install.ps1 | iex`。
- Arch：AUR `beads-git`。

## 2. Dolt 的角色

### 官方文档摘录

- `docs/architecture/dolt.md` 写明嵌入式模式包含在 `bd` 二进制内，不需要单独安装 Dolt；独立 `dolt` CLI 只在 server 模式、proxied-server 模式或直接运行 `dolt sql` 时需要。
- 独立 Dolt 固定 2.6.0；`bd` 拒绝低于 2.6.0 的 `dolt`，检查路径包括 `bd dolt start`、server 模式连接、`bd dolt push/pull`、`bd bootstrap`。
- `docs/getting-started/sync-setup.md` 的前置条件：每台机器需要 `bd` 0.59.0+ 与 Dolt 2.6.0 或更新。
- git 协议远程的 `bd dolt push/pull` 使用 PATH 上的 `dolt` 二进制传输；`bd` 自己的 server 持有数据库时交给 server。
- 嵌入式模式是单写者，用文件锁；server 模式支持并发写。
- 默认数据目录：嵌入式 `.beads/embeddeddolt/`；server `.beads/dolt/`。
- 同步数据在同一个 Git 远程的 `refs/dolt/data`；新克隆运行 `bd bootstrap`。
- 升级跨结构迁移时，只由一处副本执行 `bd migrate schema` 与 `bd dolt push`，其他副本升级二进制后执行 `bd bootstrap`。

### 本机二进制实测

- `ldd /tmp/beads-bin/bd` 只列出 `libc.so.6`、`/lib64/ld-linux-x86-64.so.2` 与内核 vDSO。
- `/tmp/beads-bin/bd version` 输出 `bd version 1.3.4 (7ef2fd05e: HEAD@7ef2fd05eb0c)`。
- 解压后的 `bd` 为 148 MB；压缩包 51 MB。
- `bd setup --list` 在 1.3.4 上输出 14 个内置配方：aider、claude、codex、cody、copilot、cursor、factory、gemini、junie、kilocode、kiro、mux、opencode、windsurf。
- 本机 1.3.2（升级前）的 `ldd` 同样只依赖 libc。

## 3. beads-mcp

- PyPI 包 `beads-mcp` 1.3.4，要求 Python >=3.10。
- 直接依赖：`fastmcp==3.4.11`、`pydantic-settings==2.14.2`、`pydantic==2.13.4`。
- 直接依赖 wheel：
  - `https://files.pythonhosted.org/packages/9b/6e/9dd996052d510380a4362a081668686b73525ef70cee48b601fa0205a72b/beads_mcp-1.3.4-py3-none-any.whl`
  - `https://files.pythonhosted.org/packages/d5/fb/e6b04a2f4dbce64994f3239267b6899411e8fd9693238c39ee99fe6f2b35/fastmcp-3.4.11-py3-none-any.whl`
  - `https://files.pythonhosted.org/packages/ff/71/614669d0a0d8dea87dc0dc684650bb36793027fc409197526532f587fcab/fastmcp_slim-3.4.11-py3-none-any.whl`
  - `https://files.pythonhosted.org/packages/fd/7b/122376b1fd3c62c1ed9dc80c931ace4844b3c55407b6fb2d199377c9736f/pydantic-2.13.4-py3-none-any.whl`
  - `https://files.pythonhosted.org/packages/77/c1/6e422f34e569cf8e18df68d1939c81c099d2b61e4f7d9621c8a77560799c/pydantic_settings-2.14.2-py3-none-any.whl`
- 本机 `pip download --only-binary=:all:` 在 CPython 3.14 / linux x86_64 下解析出 69 个 wheel，`du -sh` 约 17 MB。
- 官方文档给出的上下文成本：CLI + hooks 约 1–2k tokens；MCP 工具 schema 10–50k tokens。

## 4. 本机安装来源（2026-11-05 检查）

- `/home/cpf/.local/bin/bd`：154,378,776 字节，mtime `2026-10-24 08:32:20`，birth `2026-10-25 18:16:08`。
- v1.3.2 发布包 `beads_1.3.2_linux_amd64.tar.gz`（53,348,580 字节，2026-10-24T00:43:03Z 发布）内的 `bd`：154,378,776 字节，mtime `2026-10-24 08:32`。
- birth time 是文件在本机出现的时间；mtime 来自压缩包内文件的打包时间，不能把 mtime 当作安装日期。
- `~/.local/bin/beads` 不存在。
- `~/.bun/bin/bd` 不存在；`~/.bun/install/global/node_modules/@beads/` 存在，但没有 `package.json` 与 `bin`。
- `~/.local/bin/bd.bak-1.0.2`：135,849,840 字节，birth `2026-04-30 22:12`。
- zsh 历史含 `bun add -g @beads/bd@0.28.0` 到 `@beads/bd@0.49.1` 的多条记录，以及一次 `bun remove -g @beads/bd`。
- 结论（间接证据推断）：当前 1.3.2 是从官方 release 压缩包解出后手动放入 `~/.local/bin`；没有安装日志直接记录。
- 升级：2026-11-05 将 1.3.4 复制到同一路径，保留 `~/.local/bin/bd.bak-1.3.2`；`bd version` 输出 1.3.4。

## 5. buntoolbox 的覆盖边界

- `docker/layers/10-beads.env`：`export BEADS_VERSION="${BEADS_VERSION:-1.3.2}"`。
- `docker/layers/10-beads.sh`：`curl -fsSL "https://github.com/gastownhall/beads/releases/download/v${BEADS_VERSION}/beads_${BEADS_VERSION}_linux_amd64.tar.gz" | tar -xz -C /usr/local/bin bd`。
- `Dockerfile:129-134` 与 `docker/webtop/Dockerfile:131-133` 调用该层。
- `scripts/lib/test-common-tools.sh:257` 检查 `bd --version` 与 `bd --help`。
- `scripts/check-versions.sh:251` 比较仓库固定版本与上游最新版本。
- `scripts/check-wsl-versions.sh:236-238` 解析 `bd --version`/`bd --help`；`:287` 冒烟执行 `bd --help`；`:398` 输出 `beads (bd)` 行；脚本参数只有 `-v|--verbose` 与 `--smoke`。
- `expected_or_latest` 优先使用 `docker/layers/*.env` 中的版本；当前 `BEADS_VERSION=1.3.2`，因此该脚本对 bd 1.3.2 显示 up-to-date，即使上游为 1.3.4。
- `AGENTS.md:70-72` 的工作流要求先在 WSL 手工安装并验证，再写进 Docker layer。
- `uv-bun` 的九个段落：全局 npm 包、uv 与 uv tools、self-update（herdr/umans/rtk/plannotator/witr）、apt、opencode 项目、tokscale、skills、Codex 插件、OMP 插件；没有 bd。

## 6. 1.3.4 帮助扫描

- 递归执行 `bd <path> --help`，最多 4 层；实际深度 3。
- 共 299 个帮助页：120 个一级条目（`bd` 根加 119 个顶层命令）、172 个二级命令、7 个三级命令。
- 三级命令：`dolt remote add`、`dolt remote list`、`dolt remote remove`、`dolt remote reset-data`、`mol wisp create`、`mol wisp gc`、`mol wisp list`。
- 顶层帮助使用分组标题：Working With Issues、Views & Reports、Dependencies & Structure、Sync & Data、Setup & Configuration、Maintenance、Integrations & Advanced、Additional Commands。
- 解析边界：
  - 只识别 Cobra 的 `Available Commands:` / `Additional Commands:` 时会漏掉顶层分组命令。
  - 把任意「以冒号结尾的标题」当作命令段，会把 `Environment Variables:` 下的变量名当成命令；错误输出的帮助又会再次列出命令，递归规模膨胀到 500 节点上限。
  - 命令名与描述之间可能只有一个空格（如 `recompute-blocked`），正则要求两个以上空格会漏项。
  - 最终采用顶层分组标题白名单、非顶层只用 Cobra 标准段、`Usage:`/错误输出校验、广度优先遍历。
- 顶层命令名按帮助分组：
  - Working With Issues：assign、children、close、comment、comments、create、create-form、delete、edit、gate、heartbeat、label、link、list、merge-slot、note、priority、promote、provenance、q、query、reclaim、reopen、search、set-state、show、state、tag、todo、unclaim、update。
  - Views & Reports：count、diff、find-duplicates、history、lint、stale、status、statuses、types。
  - Dependencies & Structure：dep、duplicate、duplicates、epic、graph、supersede、swarm。
  - Sync & Data：backup、branch、conflicts、export、federation、import、restore、sync、vc。
  - Setup & Configuration：bootstrap、config、context、dolt、forget、hooks、human、info、init、kv、memories、migrate-personal、onboard、prime、quickstart、recall、remember、setup、where。
  - Maintenance：batch、compact、doctor、events、flatten、gc、migrate、ping、preflight、prune、purge、recompute-blocked、rename-prefix、rules、sql、upgrade、worktree。
  - Integrations & Advanced：admin、jira、linear、repo。
  - Additional Commands：ado、audit、blocked、completion、cook、defer、formula、github、gitlab、help、init-safety、mail、metrics、mol、notion、orphans、ready、rename、schema、serve、ship、undefer、version。
- 主要子命令模式：
  - `dep`：add、cycles、list、relate、remove、tree、unrelate。
  - `dolt`：commit、killall、pull、push、remote（add/list/remove/reset-data）、set、show、start、status、stop、test。
  - `config`：apply、drift、get、list、set、set-many、show、unset、validate。
  - `gate`：add-waiter、check、create、discover、list、resolve、show。
  - `merge-slot`：acquire、check、create、release。
  - `mol`：bond、burn、current、distill、pour、progress、ready、seed、show、squash、stale、wisp（create/gc/list）。
  - `worktree`：create、info、list、remove。
  - 六个外部平台（ado、github、gitlab、jira、linear、notion）都有 pull/push/sync/status；ado/gitlab 另有 projects，github 有 repos，linear 有 teams，notion 有 init/connect。

## 7. 任务系统分工

- OMP `todo` 工具说明：操作 `init`、`start`、`done`、`rm`、`drop`、`block`、`unblock`、`append`、`view`；不能单独占一轮；3+ 步时初始化；任务用原文内容标识；同一时间只保留最早的活动任务；外部等待用 block。
- 工具说明没有提供跨会话持久化或导出到项目仓库的接口。
- beads README：提供「persistent, structured memory for coding agents」，用依赖图替代 Markdown 计划；数据在 `.beads/`；`bd ready` 找无阻塞任务；`bd update --claim` 领取；`bd close` 关闭；`bd dolt push/pull` 跨机器同步。
- 决策顺序：生命周期 → 共享范围 → 依赖关系 → 粒度 → 审计需求 → 用户意图。
- AGENTS.md 优先级规则建议（原文）：持久工作项放在 bd；本次会话的执行计划用宿主 todo 工具；todo 文本携带对应的 bd ID；bd 是状态与完成判定的唯一来源；不要为同一个步骤同时创建 bd 任务和 todo 项。
