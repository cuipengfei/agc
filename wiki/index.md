# Knowledge Base Index

## agent-harness

Agent harness 的 prompt、上下文架构与运行形态差异。

| Article | Summary | Updated |
|---------|---------|---------|
| [Hermes vs OpenClaw 架构差异](agent-harness/hermes-vs-openclaw-architecture.md) | 相同模型表现差异背后的 prompt、技能加载、压缩、记忆和用户建模因素 | 2026-08-30 |
| [SoL-Pi 与 OMP 兼容性](agent-harness/sol-pi-omp-compat.md) | SoL-Pi 四机制核查、推广文章三处错漏、pi→oh-my-pi 身份链、Action Fusion 机制与 OMP 兼容矩阵：装得上但 actionFusion 开必崩 | 2026-09-19 |


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
| [Reverify：确定性验证的适用边界与 rollover 实际价值](agent-tooling/reverify.md) | Verifier 以二进制 bytes 初始化、SUPPORTED 含 functions_equiv/exebench claim；窄契约 34 组整数输入；rollover 形状校验/receipt 消费/宿主差异；issue #22 未修复 | 2026-09-19 |

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
| [Coding Agent 的短反馈闭环：逐轮 Advisor](ai-coding-agents/short-feedback-loop-advisors.md) | OMP、Pi 与 DSH 的第二模型逐轮审查和 advice 回流机制 | 2026-09-11 |
| [Jev 在 OMP/Codex/OpenCode 的现成集成盘点](ai-coding-agents/jev-host-integrations.md) | OMP 原生集成已发布且本机核验；Codex/OpenCode 仅社区 MCP 可配方案（本轮未安装运行）；instruction skill 与 SDK/provider 分层 | 2026-09-19 |
| [Jev 七渠道定价与 OMP systemone 兼容性判定](ai-coding-agents/jev-omp-systemone-channel-compatibility.md) | 七渠道定价与免费条款核验、zen 429 与四组对照实验、OMP /v1/systemone 兼容性判定（仅 zen 已实测可用）、OpenRouter「免费 allowance」更正；UTC 午夜重置推断已被 2026-09-20 证据推翻（Status: Outdated）；Zen 模型目录 2026-09-21 实测 | 2026-09-21 |

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


## responses-api

Responses API 兼容端点的服务端行为实测：web_search 服务端执行、usage 计量、缓存与配额。

| Article | Summary | Updated |
|---------|---------|---------|
| [Responses API web_search usage 计量](responses-api/web-search-usage-forensics.md) | 服务端执行搜索、小 query 大 input 的成因、SSE 事件流结构、prompt cache 实测、tool_usage 跟踪 | 2026-09-19 |

## harness-engineering

Harness 的编辑格式、上下文载体与人类理解闭环。

| Article | Summary | Updated |
|---------|---------|---------|
| [文档、测验与 AI 代码库的认知债务](harness-engineering/documentation-and-cognitive-debt.md) | 用文档保存意图与决策，用 Quiz 暴露理解偏差，用测试验证行为 | 2026-09-01 |
| [Jev 语义回归检查方法](harness-engineering/jev-semantic-regression-testing.md) | 原子 question、可引用 criteria、基线复用、重复调用与完整输入输出记录 | 2026-09-20 |
| [Reviewer Blind Spots](harness-engineering/reviewer-blind-spots.md) | 审查架构的可见性缺口：截断输入、升级语气与判决材料充分性 | 2026-09-20 |
| [Watchdog Review Design](harness-engineering/watchdog-review-design.md) | 三桶审查框架与证据链设计，结构化 Advisor 自审 | 2026-09-20 |
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
| [OMP 配置语义手册](omp-config/config-semantics.md) | 33 项设置的触发条件、agent 行为影响、用户可见结果与取舍；streamingAbort 中断/F5/自动 retry 边界 | 2026-09-14 |
| [OMP 实验性上下文管理与 OpenCode DCP 对比](omp-config/experimental-context-vs-dcp.md) | rollover/notes 机制与 DCP outbound transform 的对比与选型 | 2026-09-12 |
| [OMP 运行时控制](omp-config/runtime-controls.md) | steering / follow-up / interrupt 队列语义与 parse regression 记录/修复 | 2026-09-11 |
| [OMP 动态 Session Identity 与 Sticky Routing](omp-config/dynamic-session-identity-sticky-routing.md) | prompt_cache_key 归一化与 Chat compat gate、未声明 compat 键 keep 语义、4140 body fallback、三条路线排除理由 | 2026-09-14 |
| [OMP Advisor 防过时三旋钮](omp-config/advisor-freshness-knobs.md) | syncBacklog/immuneTurns/maxNotesPerUpdate 语义、backlog 与 note 两条丢弃路径、防过时最强组合与代价 | 2026-09-19 |
| [OMP Advisor Concern 投递策略](omp-config/advisor-concern-delivery-policy.md) | mid-turn concern 的 admission defer 现状与 blocker-only 行为、git 沿革、upstream opt-in 变更请求 #9074/#9576/#10600 | 2026-09-19 |
| [OMP /model 模型浏览器：角色解析与 kind 过滤](omp-config/model-browser-role-resolution.md) | 已配置角色按 enabledModels 受限集合解析、范围外即 `—` 且无兜底；15 内置角色 + 10 kind 清单 | 2026-09-23 |
| [OMP Advisor 上下文标记](omp-config/advisor-context-markers.md) | `**user**:`/`**agent**:` 角色标记、会话更新状态头、工具结果截断与 shaken 压缩边界 | 2026-09-20 |

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
| [OMP web search 自定义 Responses API 端点](omp-tips/web-search-custom-responses-provider.md) | codex provider 接入兼容 /codex/responses 的端点：路径拼接、请求形状、凭证分支、实测 | 2026-09-19 |
| [OMP web search provider 清单与 fallback](omp-tips/web-search-provider-inventory.md) | 25 个 provider 四类分级、串行 fallback、public 并发合并、webSearchOrder 追加语义 | 2026-09-19 |
| [OMP 扩展自动加载机制](omp-tips/omp-extension-auto-loading.md) | OMP 四路合并自动扫描全部 `*.ts`/`*.js` 扩展、config.yml 声明非加载开关、canary 实测与禁用正确方法 | 2026-09-19 |

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
| [OMP Mnemopi Auto-Recall 注入机制](omp-mnemopi/auto-recall-injection.md) | 注入时机/次数、query 构造、注入位置、facts 只读与 quit/resume cache 影响 | 2026-09-21 |
| [Mnemopi 数据模型与 Recall/Reflect](omp-mnemopi/data-model-and-retrieval.md) | 表职责、working→episodic→facts 关系、recall/reflect 查询路径、FTS 与 embedding 辅助表 | 2026-09-21 |
| [Mnemopi SQLite 损坏恢复](omp-mnemopi/sqlite-corruption-recovery.md) | 停止写入者、保存 DB/WAL/SHM、完整主键差集、逐条点查、离线 staging、FTS 重建、原子替换；.recover 待验证 | 2026-09-21 |

## omp-modes

OMP 模式、Vibe、Task/Hub 与 Magic Keywords。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP 工作模式与 Magic Keywords](omp-modes/modes-and-magic-keywords.md) | 模式触发、能力收窄、组合关系与使用建议；jevify magic keyword | 2026-09-21 |

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
| [OMP TTSR 与 /omfg](omp-ttsr/ttsr-and-omfg.md) | TTSR scope、配置、生命周期、规则生成与实测边界；deferred 注入竞态（#12057） | 2026-09-14 |

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
| [Mutation testing、test oracle 与 invariant](software-testing/mutation-testing-oracles-and-invariants.md) | 变异测试机制、oracle 关系、invariant 的位置、等价 mutant 与结果解释边界 | 2026-09-19 |

## proxy-ops

专有代理客户端迁移与代理节点出口指纹的通用取证方法（不含具体服务商信息）。

| Article | Summary | Updated |
|---------|---------|---------|
| [专有代理客户端迁移到标准 Clash：通用取证方法](proxy-ops/proprietary-client-to-clash-migration.md) | 内核指纹识别、本地登录态、面板 flag 格式参数突破、HTTPS 边界 | 2026-09-16 |
| [代理出口 IP 指纹批量测量与形态分类](proxy-ops/exit-ip-fingerprint-measurement.md) | external-controller 批量测出口、BGP origin 收敛 ASN 冲突、命名审计 | 2026-09-16 |

## llm-proxy-sse

LLM API SSE 流式调用在 Clash Verge/mihomo + 机场链路上的长连接机制、链路影响与配置边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [LLM API SSE 流式调用：Clash Verge/mihomo + 机场链路的机制、影响与配置](llm-proxy-sse/llm-api-sse-proxy-chain.md) | SSE=单条长生命周期响应流、mihomo 透明转发无害、url-test 拨号时刻选路不杀已有流；keep-alive 键名三证定版、idle 调长更不安全（15 优于 30）；select 组固定出口 + 客户端读超时/重试兜底 | 2026-09-19 |

## herdr-plannotator

Herdr 终端 workspace 管理器与 Plannotator 可视审查/标注工具链的 CLI、配置、插件机制与集成方式。

| Article | Summary | Updated |
|---------|---------|---------|
| [Herdr + Plannotator 工具链全量 Reference](herdr-plannotator/toolchain-reference.md) | Herdr 0.9.1 + Plannotator 0.27.15 完整 CLI flags、配置项、插件生态、两个集成仓库机制（925行） | 2026-09-17 |

## omp

OMP judgment 子系统、TypeSafe/Jev 集成与 eval 求值 helper 的行为边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界](omp/judgment-provider-and-eval-judge.md) | 18.2.4 起内建 TypeSafe judgment：三值 provider、回退链、3 自动+1 手动消费方，judge() 双语言三题型与重复调用实测；jevify magic keyword 与 judge() 路由分离 | 2026-09-21 |
| [OMP TypeSafe env 变量边界、.env 加载链与 zen 免费 jev 接入](omp/judgment-typesafe-env-config.md) | 三变量边界（key 四途径、BASE_URL/DEFAULT_MODEL env-only）、4 个 .env 加载点与只补不盖优先级、/zen 不带 /v1 拼接坑实测裁定、unexpectedStopDetection smart 一行修改；DEFAULT_MODEL 2026-09-20 已切 jev-1.13 付费通道，UTC 午夜重置推断已推翻（Status: Outdated） | 2026-09-20 |
| [OMP judgment /v1/systemone 协议面：题型 schema、传输参数、观测点与兼容端点](omp/judgment-systemone-protocol.md) | 三题型官方逐字 schema 与 pi-ai 类型同构、eval bool 是 noul 呈现层、传输参数（MAX_ATTEMPTS 3、min(hinted,5000)、429 transient）、观测面（model_usage 仅 auto-thinking 写、请求级零日志、失败回退链）、zen 已实测兼容（服务端自认 typesafe 转发）与 OpenRouter 不兼容 | 2026-09-20 |
