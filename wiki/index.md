# Knowledge Base Index

## omp-mnemopi

OMP Mnemopi 记忆后端的配置、行为验证和 consolidation 生命周期。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Mnemopi Consolidation 生命周期](omp-mnemopi/consolidation-lifecycle.md) | 三种 scoping 的写入/召回路由、模式切换与发布历史；dispose/enqueue/standalone CLI consolidation 差异 | 2026-08-31 |

## omp-prewalk

OMP Prewalk 的行为边界、模型切换机制与社区反响。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Prewalk：规划后切换模型](omp-prewalk/prewalk.md) | 规划后首次文件修改返回时切换到便宜模型、触发边界、子代理配置与社区口碑 | 2026-08-27 |

## omp-ttsr

OMP TTSR 流式行为护栏与 /omfg 规则生成入口。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP TTSR 与 /omfg：流式行为护栏](omp-ttsr/ttsr-and-omfg.md) | TTSR scope、匹配、生命周期、规则身份、keep/discard、/omfg 与活体实验 | 2026-08-29 |
| [OMP Extension 与 TTSR 分层防护](omp-ttsr/extension-and-ttsr-layering.md) | Extension/TTSR 的输入时机、职责分工、消息注入、测试方法与 task agent 案例 | 2026-08-29 |

## model-gateway-mismatch

Agent host 声明的模型 capability 与本地 gateway 上游实际接受的 wire 参数不一致时的诊断与修复。

| Article | Summary | Updated |
|---------|---------|---------|
| [模型 capability 与 gateway wire 参数不一致](model-gateway-mismatch/reasoning-capability-vs-wire-parameter.md) | reasoning capability 与 reasoning_effort wire 参数分离；compat 开关定位与幻觉修复 | 2026-08-29 |

## harness-engineering

Harness 编辑格式与上下文载体的通用设计模式。

| Article | Summary | Updated |
|---------|---------|---------|
| [Harness 格式与上下文载体](harness-engineering/harness-formats-and-context-carriers.md) | Hashline 编辑格式、Snapcompact 上下文压缩、与 RLM 控制平面的维度对比 | 2026-08-30 |

## better-harness

Better Harness 工作流审计工具。

| Article | Summary | Updated |
|---------|---------|---------|
| [Better Harness](better-harness/better-harness.md) | 12 host 支持矩阵、五维模型、与 Claude Code Insights 对比、与执行 harness 的关系 | 2026-08-30 |

## omp-modes

OMP 工作流模式、Vibe 与 Task/Hub 的对比、magic keywords 的触发与组合。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP 工作模式与 Magic Keywords](omp-modes/modes-and-magic-keywords.md) | Vibe 是 task/hub 的强制收窄包装、三个 magic keywords 的触发条件、模式组合建议 | 2026-08-27 |

## ai-coding-agents

主要 AI coding agent / IDE / 框架的横向对比。

| Article | Summary | Updated |
|---------|---------|---------|
| [TTSR keep vs discard](omp-ttsr/keep-vs-discard.md) | TTSR 上下文保留策略的证据、场景取舍与最小 A/B 测试方案 | 2026-08-26 |
| [四 AI Coding Agent 对比](ai-coding-agents/4-agent-comparison.md) | OpenCode+OMO、OMP、Prime Agent、DSH 的真正独特优势 | 2026-08-27 |

## prime-agent

Prime Agent 功能、配置、RLM、Continual Harness、长运行能力。

| Article | Summary | Updated |
|---------|---------|---------|
| [Prime Agent：功能与配置总览](prime-agent/prime-agent-overview.md) | 核心架构、主要功能、配置概览、RLM、与 OMP 的差异 | 2026-08-30 |
| [Prime Agent 技术实质](prime-agent/prime-agent-technical-reality.md) | 源码验证的 RLM kernel 类型、Continual Harness CRUD 机制、Daemon 架构细节 | 2026-08-30 |
| [Prime Agent 社区 Reception](prime-agent/prime-agent-community-reception.md) | 独立博客、竞品创始人、benchmark、社区声音的第三方评价汇总 | 2026-08-30 |

## agent-interaction

人与 agent 在视觉介质上交互（画布、产物、白板）的工具图谱与深挖。

| Article | Summary | Updated |
|---------|---------|---------|
| [mcp_excalidraw：给 Agent 一块活画布](agent-interaction/mcp-excalidraw.md) | 双 server 架构、26 工具、draw→look→adjust 迭代环、企业离线评估、与官方 MCP 的形态差异 | 2026-08-30 |
| [视觉人机交互全景](agent-interaction/visual-canvas-interaction-landscape.md) | A/B/C 三级分类、12 个 A 级真共享工具（2D/3D/工作流/设计/数据）、按场景推荐矩阵 | 2026-08-30 |
| [产物可持续编辑 Genre](agent-interaction/sustainable-artifact-editing.md) | Phodal 三支柱、五条判定标准、qoder-lottie 无独立发布的实测 | 2026-08-30 |

## agent-tooling

Agent 周边工具的安装、配置与 extras 选择。

| Article | Summary | Updated |
|---------|---------|---------|
| [Headroom Extras](agent-tooling/headroom-extras.md) | 本地 coding agent 的最小 extras 安装指南；image / memory / SDK 集成等不需要的理由 | 2026-08-31 |

## agent-harness

Agent harness 的 prompt 工程与上下文架构差异。

| Article | Summary | Updated |
|---------|---------|---------|
| [Hermes vs OpenClaw 架构差异](agent-harness/hermes-vs-openclaw-architecture.md) | 同模型表现差异的 5 个架构原因；gateway-first vs agent-first | 2026-08-30 |
