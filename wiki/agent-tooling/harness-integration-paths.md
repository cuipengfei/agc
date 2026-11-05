# harness 接入工具的三条通道：内置工具、配置分发、外部任务系统

> Sources: microsoft/apm README 与仓库元数据，2026-11-04；gastownhall/beads README 与 docs（ide-setup、installation、architecture/dolt、sync-setup），2026-11-04 至 2026-11-05；本机 OMP 安装树与 bd CLI 实测，2026-11-04 至 2026-11-05；Thoughtworks Technology Radar Vol 35，November 2026；buntoolbox 仓库 docker/layers 与 scripts，2026-11-05
> Raw: [APM、ast-grep、Beads 的 harness 接入面](../../raw/agent-tooling/2026-11-04-apm-ast-grep-beads-harness-paths.md); [Radar Vol 35 与三版 Adopt 清单](../../raw/technology-radar/2026-11-04-thoughtworks-radar-vol35-and-adopt-lists.md); [Beads 安装、运行面、命令面与任务系统分工](../../raw/agent-tooling/2026-11-05-beads-install-runtime-command-surface.md)
> Updated: 2026-11-05

## Overview

一个工具进入 coding agent 的工作面，常见三条通道：随 harness 一起发布的内置工具、由包管理器分发到各 harness 配置目录的资产、以及与 harness 松耦合、靠指令文件或 MCP 连接的外部系统。三条通道决定了谁负责安装、谁负责版本、以及用户在哪里看到它。本文用三个具体工具说明这三条通道的差别与各自的缺口。

## 通道一：内置工具（ast-grep）

OMP 把 ast-grep 的能力做成两个内置工具：`ast_grep` 负责结构化搜索，`ast_edit` 负责按语法改写。它们出现在 `BUILTIN_TOOL_NAMES` 常量里，会话是否暴露、审批类别与 `astGrep.enabled` 的关系见 [OMP 内建工具全集](../omp-tools/builtin-tools-and-internal-urls.md)。

引擎不依赖外部命令：`@oh-my-pi/pi-natives` 的第三方组件清单列有 `ast-grep-core 0.39.9`，随本地原生模块一起发布。另有一条使用面：TTSR 规则的 `astCondition` 字段接受 ast-grep 模式，在编辑与写入的内容流上匹配，机制见 [TTSR 与 OMFG 规则](../omp-ttsr/ttsr-and-omfg.md)。

这条通道的特点是安装与版本都由 harness 负责，用户无需单独升级；代价是能力被 harness 的发布节奏锁定。

## 通道二：配置分发（Agent Package Manager）

APM 把 agent 配置当作依赖：项目里放一份 `apm.yml` 声明 instructions、skills、prompts、agents、hooks、plugins 与 MCP servers，`apm install` 按清单装好，`apm.lock.yaml` 锁定解析结果。

它管的是「哪台机器上的哪个 harness 该拿到哪些上下文资产」：支持传递依赖、lock 文件记录内容哈希与来源、SBOM 可导出为 CycloneDX 与 SPDX、安装时扫描隐藏 Unicode、`apm-policy.yml` 限定来源与类型。支持的宿主有 9 个：GitHub Copilot、Claude Code、Grok Build、Cursor、OpenCode、Codex、Gemini、Windsurf、Kiro。

缺口有两处：OMP 不在支持列表内；项目仍是 pre-1.0、社区驱动（有大型厂商赞助），因此 Radar 把它放在 Trial。

## 通道三：外部任务系统（Beads）

Beads 是 Git 支撑的任务图，供多个 agent 共享。它不改变 harness 本身，靠两种方式接进来：

1. **指令文件**：往 `AGENTS.md` 写一段使用说明。`bd setup` 的内置配方共 14 个（claude、cursor、gemini、copilot、codex、factory、mux、opencode、aider、junie、windsurf、cody、kilocode、kiro），没有 pi 或 omp 配方；`bd onboard` 能打印一段可粘贴到任意 `AGENTS.md` 的说明。
2. **MCP 服务器**：安装 `beads-mcp` 后以 `beads` 为名注册。代价是工具描述占用 10–50k tokens 与额外延迟。

本机 OMP 侧没有任何 beads 集成：配置、扩展、插件与托管 skill 里都检索不到该名字，内置工具清单里也没有对应项。除了接入方式，Beads 还有两个使用条件：不同版本的客户端不能共用同一个库，共享的库要固定单一版本；它会往 `AGENTS.md` 写指令，写进去的内容需要审阅。

本机事实：独立 bd CLI 已在 `~/.local/bin`（2026-10-25 18:16:08 出现该文件，大小与 mtime 与 v1.3.2 包内 `bd` 一致，来源据此推断；2026-11-05 升级到 1.3.4），但 OMP 侧仍无原生集成。1.3.4 的 `bd setup --list` 已核对为同一组 14 个配方。官方同步指南要求跨机器同步的每台机器安装 Dolt 2.6.0 或更新；嵌入式模式把引擎编译在 `bd` 内，不需要独立 Dolt。安装、依赖闭包与升级细节见 [Beads 的安装与运行面](beads-install-and-runtime-surface.md)。

## 三条通道的差别

| 维度 | 内置工具 | 配置分发 | 外部任务系统 |
|---|---|---|---|
| 谁安装 | harness 发布方 | 包管理器 | 用户或脚本 |
| 版本控制 | 跟 harness 版本走 | lock 文件与内容哈希 | 各自 CLI 版本 |
| 跨 harness 复用 | 不可，绑定单一 harness | 可，一份清单分发到多个宿主 | 可，靠指令文件或 MCP |
| OMP 现状 | 已内置 ast-grep | 不在支持列表 | 无原生集成，可写 `AGENTS.md` 或挂 MCP |

## 选择建议

需要底层能力（搜索、改写、解析）并且只用一个 harness 时，内置工具省心。需要让多个 harness 与多台机器拿到同一套上下文资产时，配置分发是唯一把版本与来源记录下来的通道。需要跨 agent 共享任务状态时，外部任务系统更合适，代价是要么写指令文件（能力弱），要么挂 MCP（上下文成本高）。

## See Also

- [OMP 内建工具全集、会话暴露边界与内部地址空间](../omp-tools/builtin-tools-and-internal-urls.md) — `ast_grep`、`ast_edit` 的暴露与审批类别
- [TTSR 与 OMFG 规则](../omp-ttsr/ttsr-and-omfg.md) — `astCondition` 的流式匹配机制
- [Technology Radar 的结构、留存规则与 Vol 33–35 Adopt 清单](../technology-radar/radar-structure-and-adopt-lists.md) — 三个工具的 Radar 分级
- [skill 系统的两种组织轴](../ai-coding-agents/skill-system-organization-axes.md) — skill 分发与组织方式的对照
- [Beads 的安装与运行面](beads-install-and-runtime-surface.md) — 安装路径、Dolt 依赖与同步条件
- [Beads 1.3.4 的命令面与帮助树结构](beads-command-surface.md) — 命令分组与 299 个帮助页
- [持久任务库与会话 todo 的分工](durable-backlog-vs-session-todo.md) — 外部任务系统与内置清单的选择规则
