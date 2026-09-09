# Knowledge Base Index

## agent-harness

Agent harness 的 prompt、上下文架构与运行形态差异。

| Article | Summary | Updated |
|---------|---------|---------|
| [Hermes vs OpenClaw 架构差异](agent-harness/hermes-vs-openclaw-architecture.md) | 相同模型表现差异背后的 prompt、技能加载、压缩、记忆和用户建模因素 | 2026-08-30 |


## github-repo-analysis

GitHub 仓库分析：star 真实性、刷星检测与舆情评估。

| Article | Summary | Updated |
|---------|---------|---------|
| [GitHub 刷星检测工具调研](github-repo-analysis/star-fraud-detection-tools.md) | 六工具（StarScout 系）信号分类法、分工、报告纪律与选型 | 2026-09-06 |

## agent-interaction
Agent 与画布、结构化产物及可持续编辑界面的交互方式。

| Article | Summary | Updated |
|---------|---------|---------|
| [Agent 操作结构化产物](agent-interaction/agent-authored-structured-artifacts.md) | Workflow contract 与正式领域 DSL/runtime 的能力边界 | 2026-09-01 |
| [mcp_excalidraw：给 Agent 一块活画布](agent-interaction/mcp-excalidraw.md) | MCP server、画布工具与 draw → look → adjust 迭代闭环；本地设置、字体枚举、遥测审计 | 2026-09-06 |
| [产物可持续编辑 Genre](agent-interaction/sustainable-artifact-editing.md) | 稳定语义身份、增量操作和可验证反馈的判定标准 | 2026-08-30 |
| [视觉人机交互全景](agent-interaction/visual-canvas-interaction-landscape.md) | 共享视觉工作面的分级分类、工具地图与场景选择 | 2026-08-30 |

## agent-tooling

Agent 周边工具、安装配置与工作流 Skill。

| Article | Summary | Updated |
|---------|---------|---------|
| [Headroom Extras](agent-tooling/headroom-extras.md) | 本地 coding agent 的最小 extras 安装与取舍指南 | 2026-08-31 |
| [skills CLI 性能模型](agent-tooling/skills-cli-performance-model.md) | agent skill 目录发现、软链与共享更新路径对 CLI 耗时的影响 | 2026-09-03 |
| [LLM 出图的两种作者模型](agent-tooling/llm-diagram-authoring-models.md) | diagram-design 手写 SVG 与 archify 类型化 JSON 的作者模型、几何裸露面与选择 | 2026-09-04 |

## ai-coding-agents

AI coding agent、IDE 与 harness 的横向比较。

| Article | Summary | Updated |
|---------|---------|---------|
| [AI Coding Agent 对比：真正独特优势（19 家）](ai-coding-agents/4-agent-comparison.md) | 19 家 harness 的独有性裁定：真独有 4、可能独有 2，其余同轴或等价 | 2026-09-05 |
| [Grok Build](ai-coding-agents/grok-build.md) | xAI 终端 coding agent：doom-loop、LazinessDetector 与并行度真值 | 2026-09-04 |
| [开源 Harness 与托管推理不是一回事](ai-coding-agents/open-harness-vs-hosted-inference.md) | 区分客户端、runtime、Provider 主权、模型成本与端到端自托管 | 2026-09-01 |
| [Coding Agent 候选发现方法](ai-coding-agents/candidate-discovery-method.md) | wide-narrow-deep 枚举流程、README 机制词扫描、流行度的真实用途 | 2026-09-04 |
| [四 Agent CLI 能力面对比](ai-coding-agents/cli-capability-surface.md) | codex/opencode/omo/omp 递归 --help（179 页）九大功能域对比与结构差异 | 2026-09-05 |
| [Codex 特性门系统与 Code Mode](ai-coding-agents/codex-feature-flags.md) | features stage×effective 正交、removed 冻结假设、Code Mode host 架构 | 2026-09-05 |

## better-harness

Better Harness 的工作流审计模型与适用边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [Better Harness](better-harness/better-harness.md) | 多 host 支持、五维审计模型及其与执行 harness 的互补关系 | 2026-08-30 |

## copilot-gateway

本机 8787 GitHub Copilot 网关的模型目录实测规格。

| Article | Summary | Updated |
|---------|---------|---------|
| [GPT-5.6 Luna 真实规格](copilot-gateway/gpt-5.6-luna-specs.md) | 窗口 1050000（922000 prompt + 128000 output）、o200k_base、仅 /responses 端点、一个窗口两个计费档；OMP contextWindow 配总窗口的教训 | 2026-09-06 |


## harness-engineering

Harness 的编辑格式、上下文载体与人类理解闭环。

| Article | Summary | Updated |
|---------|---------|---------|
| [文档、测验与 AI 代码库的认知债务](harness-engineering/documentation-and-cognitive-debt.md) | 用文档保存意图与决策，用 Quiz 暴露理解偏差，用测试验证行为 | 2026-09-01 |
| [Reviewer Blind Spots](harness-engineering/reviewer-blind-spots.md) | 审查架构的可见性缺口：截断输入、升级语气与判决材料充分性 | 2026-09-03 |
| [Harness 格式与上下文载体](harness-engineering/harness-formats-and-context-carriers.md) | Hashline、Snapcompact 与 RLM 在编辑、压缩和控制平面上的差异 | 2026-08-30 |
| [Claude Code 上下文窗口与自动压缩控制](harness-engineering/claude-code-context-and-compaction.md) | MAX_CONTEXT_TOKENS 三情形、[1m] 客户端语义、压缩触发点与两个失效变量 | 2026-09-05 |

## mcp-servers

MCP server 清单筛选、star 真实性与生态知识。

| Article | Summary | Updated |
|---------|---------|---------|
| [awesome-mcp-servers 通用 MCP 筛选](mcp-servers/awesome-mcp-servers-shortlist-method.md) | 3472→320 四层筛选管线、逐桶对账公式与 LLM rubric 终审 | 2026-09-06 |

## model-gateway-mismatch

模型能力、SDK 解析与 gateway wire contract 不一致问题。

| Article | Summary | Updated |
|---------|---------|---------|
| [模型 capability 与 gateway wire 参数不一致](model-gateway-mismatch/reasoning-capability-vs-wire-parameter.md) | reasoning capability 与 reasoning_effort wire 参数的分离及验证方法 | 2026-09-05 |
| [Gateway catalog 是客户端配置的权威源](model-gateway-mismatch/gateway-catalog-as-config-authority.md) | claude_model_id 与计费档边界替代按窗口推算，真实窗口与计费档不可混用 | 2026-09-05 |
| [JustWoker `/v1/messages` 实测行为](model-gateway-mismatch/justwoker-v1-messages-observed-behavior.md) | 四个请求模型名的返回模型、usage、身份和环境字段实测；目录无能力字段与 UA 门槛 | 2026-09-05 |
| [免费强模型 API 候选与尝试排序](model-gateway-mismatch/free-strong-model-api-candidates.md) | 免费注册或签到、强模型名称与证据边界的候选排序 | 2026-09-04 |
| [Relay 的 chunked 流不终止：诊断与最小修复](model-gateway-mismatch/relay-unterminated-chunked-stream.md) | 缺失 chunked 终止块造成的 60 秒挂起、客户端一致性验证与本地 shim 修复 | 2026-09-05 |
| [SDK 对非标准 responses 帧的解析严格度差异](model-gateway-mismatch/sdk-strictness-on-nonstandard-responses-frames.md) | AI SDK 与 pi-ai 对同一 responses 帧的解析差异及 OpenCode/OMP 协议分配 | 2026-09-05 |

## omp-auth

OMP Auth Broker 与 Gateway：凭据集中与代理访问。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Auth Broker 与 Gateway](omp-auth/auth-broker-gateway.md) | 凭据集中、access token 服务端解析、客户端不保存 provider key | 2026-09-09 |

## omp-commands

OMP 内置命令的机制与动态发现。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Cleanse：动态诊断修复](omp-commands/cleanse.md) | 按项目文件和可用 binary 动态发现 checker，多语言支持 | 2026-09-09 |

## omp-config

OMP 配置项的源码级行为边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Compaction Model 与 Thinking Level](omp-config/compaction-model.md) | compactionModel 只换压的人，thinking effort 继承自 session thinkingLevel | 2026-09-09 |
| [OMP Managed Skills 生命周期](omp-config/managed-skills.md) | 写入路径、删除路径、没有自动清理 | 2026-09-09 |

## omp-extensibility

OMP Extension 与 Hook 的职责边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Hooks vs Extensions](omp-extensibility/hooks-vs-extensions.md) | Extension 覆盖 HookAPI 全部用例并增加 tool/provider，Hook 是 legacy 兼容层 | 2026-09-09 |

## omp-tips

OMP 启动提示与交互快捷方式。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP 启动提示全表](omp-tips/startup-tips.md) | 28 条提示（27 条 + 1 条条件提示）、加权随机、Agent Hub、yield-queue | 2026-09-09 |

## kimi-claw

Kimi Claw 专用网关（agent-gw.kimi.com）的模型目录、会员档位与 entitlement 边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [Kimi Claw 专用网关](kimi-claw/gateway-overview.md) | agent-gw.kimi.com 模型目录、会员档位 1M 门槛、k3-agent 身份证据与已知问题 | 2026-09-08 |

## omp-background-agents

OMP 后台 agent 派遣机制：/tan fork 分身、缓存 lineage 与 side-turn 隔离。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP /tan：后台 fork 分身命令](omp-background-agents/tan-command.md) | /tan 的 fork 语义、隔离指令与 session 身份分离 + cache key 共享的缓存设计 | 2026-09-05 |

## omp-mnemopi

OMP Mnemopi 的记忆 scoping、召回与 consolidation 生命周期。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Mnemopi Consolidation 生命周期](omp-mnemopi/consolidation-lifecycle.md) | 三种 scoping 的写入/召回路由、模式切换与 consolidation 边界 | 2026-08-31 |
| [OMP 记忆后端对比：Mnemopi vs Hindsight vs Sharpshooter](omp-mnemopi/memory-backends-comparison.md) | 三后端定位、安装、LLM/embedding/reranker 配置、迁移路径 | 2026-09-02 |
| [OMP Mnemopi Auto-Recall 注入机制](omp-mnemopi/auto-recall-injection.md) | 注入时机/次数、query 构造、注入位置、facts 只读与 quit/resume cache 影响 | 2026-09-06 |

## omp-modes

OMP 模式、Vibe、Task/Hub 与 Magic Keywords。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP 工作模式与 Magic Keywords](omp-modes/modes-and-magic-keywords.md) | 模式触发、能力收窄、组合关系与使用建议 | 2026-09-09 |

## omp-prewalk

OMP Prewalk 的模型切换机制与行为边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Prewalk：规划后切换模型](omp-prewalk/prewalk.md) | 规划后首次文件修改时切换模型的触发、配置与社区证据 | 2026-08-30 |

## omp-discovery

OMP 能力发现、provider 隔离与插件生命周期。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP 能力 provider 隔离边界](omp-discovery/omp-provider-isolation-boundaries.md) | disabledProviders 生效与不生效的层次、marketplace 缝隙 | 2026-09-03 |
| [OMP enabledModels glob 陷阱：带斜杠的 model id 需要双星](omp-discovery/enabledmodels-glob-slash-pitfall.md) | Bun.Glob 单星不跨斜杠导致 CLI 可见而 TUI 不可见的诊断与修复 | 2026-09-05 |

## omp-sessions

OMP session 文件格式与第三方工具兼容性。

| Article | Summary | Updated |
|---------|---------|---------|
| [JSONL 格式与第三方 pi 解析器](omp-sessions/jsonl-format-and-third-party-parsers.md) | title 首行问题、正确镜像做法、残留障碍 | 2026-09-03 |

## omp-slash-commands

OMP 内置 slash 命令的全量枚举与逐命令机制。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP 内置 slash 命令全表（82 条）](omp-slash-commands/builtin-slash-commands.md) | core registry 79 条 + bundled /green /review + SDK /autoresearch；六类分组的机制、场景、收益与 ACP 可用性 | 2026-09-06 |

## omp-ttsr

OMP TTSR 流式行为护栏、Extension 分层与上下文处置。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Extension 与 TTSR 分层防护](omp-ttsr/extension-and-ttsr-layering.md) | schema、tool_call extension 与 TTSR 的职责边界 | 2026-09-09 |
| [TTSR keep vs discard](omp-ttsr/keep-vs-discard.md) | 命中规则后保留或丢弃错误上下文的证据与取舍 | 2026-08-26 |
| [OMP TTSR 与 /omfg](omp-ttsr/ttsr-and-omfg.md) | TTSR scope、配置、生命周期、规则生成与实测边界 | 2026-08-29 |

## personal-knowledge

个人资料采集、检索、RAG 与隐私边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [浏览历史 RAG：Hister 的能力与边界](personal-knowledge/browser-history-rag.md) | 浏览历史和文件的 Retrieval、MCP 接入及旧历史重抓取限制 | 2026-09-01 |

## prime-agent

Prime Agent 的功能、技术实现与第三方评价。

| Article | Summary | Updated |
|---------|---------|---------|
| [Prime Agent 社区 Reception](prime-agent/prime-agent-community-reception.md) | 第三方评价、benchmark 与争议 | 2026-08-30 |
| [Prime Agent：功能与配置总览](prime-agent/prime-agent-overview.md) | 核心架构、主要功能、配置和与 OMP 的关系 | 2026-08-30 |
| [Prime Agent 技术实质](prime-agent/prime-agent-technical-reality.md) | RLM、Continual Harness、CRUD 与持久运行时的源码验证 | 2026-08-30 |

## prompt-caching

Provider prompt cache 的命中条件、cache key 路由语义、TTL 与隔离边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [Prompt Cache：前缀匹配与 cache key 的真实分工](prompt-caching/cache-key-and-prefix-matching.md) | 前缀精确匹配是命中必要条件；key 是概率性路由提示，不制造不保证命中、非安全边界 | 2026-09-04 |

## keyboard-input

键盘驱动指针控制、窗口与 tab 切换、输入重映射工具。

| Article | Summary | Updated |
|---------|---------|---------|
| [Keyboard-Driven Pointer Control](keyboard-input/keyboard-driven-pointer-control.md) | 三条机制路径区分、工具矩阵、Capslock 与 Windows 方案 | 2026-09-03 |

## software-testing

软件测试中的 mutation testing、test oracle、invariant 与 mutant 分类。

| Article | Summary | Updated |
|---------|---------|---------|
| [Mutation testing、test oracle 与 invariant](software-testing/mutation-testing-oracles-and-invariants.md) | 变异测试机制、oracle 关系、invariant 的位置、等价 mutant 与结果解释边界 | 2026-09-09 |
