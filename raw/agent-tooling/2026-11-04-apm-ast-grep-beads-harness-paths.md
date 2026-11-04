# APM、ast-grep、Beads 的 harness 接入面

> Source: https://github.com/microsoft/apm（README 与仓库元数据）；https://github.com/gastownhall/beads（README 与 docs/getting-started/ide-setup.md）；https://ast-grep.github.io/ ；本机 OMP 18.x 安装树（dist 与 pi-natives）
> Collected: 2026-11-04
> Published: Unknown

## 1. Agent Package Manager（APM）

仓库：`https://github.com/microsoft/apm`，主页 `https://microsoft.github.io/apm/`。仓库元数据：主语言 Python，`Stars: 4205`，`Forks: 414`，Public。

README 自述：「An open-source, community-driven dependency manager for AI agents.」以及「Think `package.json`, `requirements.txt`, or `Cargo.toml` — but for AI agent configuration.」

支持的目标宿主（README 首屏列出）：GitHub Copilot | Claude Code | Grok Build | Cursor | OpenCode | Codex | Gemini | Windsurf | Kiro。OMP（pi-coding-agent）不在列表内。

行为要点（README）：

- 项目里放一份 `apm.yml`，声明 instructions、skills、prompts、agents、hooks、plugins、MCP servers。
- `apm install` 复现同一套配置；`apm.lock.yaml` 锁定解析结果。
- 支持传递依赖、GitHub/GitLab/Bitbucket/Azure DevOps 等来源、marketplace、打包成 zip 或 `plugin.json`。
- 安全侧：安装时扫描隐藏 Unicode；锁文件记录内容哈希与来源；`apm lock export --format cyclonedx|spdx` 导出物料清单；`apm audit` 做漂移检测；传递引入的 MCP server 需要显式同意。
- 治理侧：`apm-policy.yml` 限定来源、范围与类型，`apm install` 强制执行。

Thoughtworks Radar Vol 35 对它的描述（Trial，Tools）：manifest 声明 plugins、skills、instructions 与 MCP servers；把它当作 supply chain 处理，安装时从 Git 仓库或 agent plugin marketplace 取件并扫描隐藏 Unicode；锁文件记录内容哈希与来源，SBOM 可导出为 CycloneDX 与 SPDX；审计能发现漂移，策略文件约束来源、范围与基本单元。原文同时注明：仍是 pre-1.0、社区驱动，但有大型厂商赞助，因此放在 Trial 而不是 Adopt，并预期出现竞争方案。

## 2. ast-grep

官方站：`https://ast-grep.github.io/`。Radar 描述：命令行工具，做结构化代码搜索、检查与改写；模式写成带通配符的普通代码，匹配语法树；用 tree-sitter 覆盖 20 多种语言；检查与改写规则用 YAML 声明。原文强调它不建索引、不依赖语言服务器，所以是大型代码库采用更重工具前的低门槛第一步；与 Comby 覆盖范围相近。

本机 OMP 侧事实：

- `BUILTIN_TOOL_NAMES` 常量包含 `ast_grep` 与 `ast_edit`（`dist/types/tools/builtin-names.d.ts`）。
- TTSR 规则支持 ast-grep 模式，字段名为 `astCondition`；类型注释原文：「ast-grep pattern condition(s) that can trigger TTSR interruption (edit/write streams only)」。
- 引擎随 OMP 本地原生模块发布：`@oh-my-pi/pi-natives` 的 `THIRD-PARTY-NOTICES.txt` 第 12104 行列有 `ast-grep-core 0.39.9 (https://github.com/ast-grep/ast-grep)`。
- `pi-coding-agent` 的 package.json 中没有名称含 `ast-grep` 的依赖项；全局 node_modules 里另有独立的 `@ast-grep/napi` 与 `@ast-grep/cli` 包。

## 3. Beads

仓库：`https://github.com/gastownhall/beads`，文档 `https://beads.gascity.com/`。README 首句：「Distributed graph issue tracker for AI agents, powered by Dolt.」

Radar Vol 35 描述（Trial，Tools）：Git 支撑的 issue tracker，供多个 coding agent 共享，替代临时写的 Markdown 计划；把任务与依赖和代码放在一起，使计划与途中发现的新任务能跨会话与上下文压缩保留；每个 agent 领取下一个可用任务且不冲突。原文另记：已到达 1.0 并迁到 Gas Town Hall 组织；Dolt 是唯一存储后端；新增 HTTP API、工作租约与存储间同步，使它比早期版本更重；升级会就地迁移结构，不同版本的客户端不能共用同一个库，因此共享库要固定单一版本，并且要审阅它写进 `AGENTS.md` 的指令。它能与 Linear、Jira、GitHub Issues 双向同步。

README 与 `docs/getting-started/ide-setup.md` 的接入面：

- `bd init` 默认创建或更新 `AGENTS.md`，并安装 Claude Code、Codex、Cursor 三套集成，除非传 `--skip-agents` 或 `--stealth`。
- `bd setup` 的内置配方共 14 个：`claude`、`cursor`、`gemini`、`copilot`、`codex`、`factory`、`mux`、`opencode`、`aider`、`junie`、`windsurf`、`cody`、`kilocode`、`kiro`。没有 `pi` 或 `omp` 配方。
- 通用兜底：`bd onboard` 打印一段可直接粘贴的说明，写进任何读取 `AGENTS.md` 的助手。
- MCP 通道：`pip install beads-mcp`，在 MCP 配置里注册 `beads`；文档说明它的代价是工具描述占用 10–50k tokens 与额外延迟。

本机 OMP 侧：`~/.omp/agent` 的配置、扩展、插件与托管 skill 中检索不到 `beads` 字样；OMP 的内置工具清单里没有 beads 相关工具。

## 边界

- APM 未在本机安装，行为来自 README 与 Radar 描述，没有实测。
- Beads 未在本机安装，配方清单来自官方 `ide-setup.md` 表格；`bd setup --list` 的实际输出未核对。
- OMP 的 `ast_grep` 已在本会话工具表面存在，但未对 `ast-grep-core 0.39.9` 做行为测试。
