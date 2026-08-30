# Knowledge Base Index

## omp-mnemopi

OMP Mnemopi 记忆后端的配置、行为验证和 consolidation 生命周期。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Mnemopi Consolidation 生命周期](omp-mnemopi/consolidation-lifecycle.md) | dispose/enqueue/standalone CLI 三条路径的行为差异、12h 门槛、开关接线状态 | 2026-08-23 |

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
