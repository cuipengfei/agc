# Knowledge Base Index

## agent-harness

Agent harness 的 prompt、上下文架构与运行形态差异。

| Article | Summary | Updated |
|---------|---------|---------|
| [Hermes vs OpenClaw 架构差异](agent-harness/hermes-vs-openclaw-architecture.md) | 相同模型表现差异背后的 prompt、技能加载、压缩、记忆和用户建模因素 | 2026-08-30 |
| [托管个人 Agent 与自托管 Agent](agent-harness/hosted-agents-vs-self-hosted-agents.md) | Muse、Grok Bot、Dots 与 Hermes、OpenClaw 的托管云端电脑、账户集成、浏览器配置与证据边界 | 2026-10-14 |
| [SoL-Pi 与 OMP 兼容性](agent-harness/sol-pi-omp-compat.md) | SoL-Pi 四机制核查、推广文章三处错漏、pi→oh-my-pi 身份链、Action Fusion 机制与 OMP 兼容矩阵：装得上但 actionFusion 兼容修复 #11991 未进入 18.3.0 | 2026-09-25 |
| [OmO 停止条件与意图检测机制](agent-harness/omo-stop-condition-mechanisms.md) | OmO 三层停止机制：代码层 &lt;promise&gt; 标签正则+会话状态机（不解析自然语言）、提示词纪律层 Hephaestus intent line 三版演进（5.5 承诺做完→5.6 停止条件声明即承诺+Stop Goal→6 Intent Gate）、门控层 STOP WHEN 存在性 lint+EVIDENCE_RECORDED 四重校验收据门+gate-reviewer 终审；防过度执行/漂移/假完成/半成品 | 2026-10-09 |
| [OMP 默认系统指令](agent-harness/omp-default-system-instruction.md) | v18.9.0 默认 system-instruction 的 bundle 位置、`cts` 模板结构、渲染关系、尺寸与 `SYSTEM.md` 覆盖边界 | 2026-10-11 |
| [OmO 技能生态与 skills CLI 安装](agent-harness/omo-ulw-skills-ecosystem.md) | skills.sh 官方发布 44 技能 10.2K 安装；ulw 家族停止条件定义者差异（loop/ultrawork 目标级、mass-ulw 节点级、execute 继承）；意图行无技能复刻；skills CLI 单次观察 13 vs 44 差异与直接路径安装绕过、lock 跟踪、PromptScript 不支持全局 | 2026-10-09 |


## github-repo-analysis

GitHub 仓库分析：star 真实性、刷星检测、舆情评估与 awesome 清单的覆盖/维护度量化对比。

| Article | Summary | Updated |
|---------|---------|---------|
| [GitHub 刷星检测工具调研](github-repo-analysis/star-fraud-detection-tools.md) | 六工具（StarScout 系）信号分类法、分工、报告纪律与选型 | 2026-09-06 |
| [awesome-harness-engineering 五个同名仓库对比](github-repo-analysis/awesome-harness-engineering-list-ranking.md) | 同名 5 仓库：stars 16–4988、pushed_at 2026-03-29 至 2026-10-28、README 去重仓库 61–752；三因子打分与归一化敏感性；自报 754 与实测 752 的重复构成；并集 1074、两两交集 3–66 | 2026-10-29 |

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
| [Headroom Extras](agent-tooling/headroom-extras.md) | 本地 coding agent 的最小 extras 安装与取舍指南；Rust 核心随 wheel 发布、独立 Rust 代理未发布 | 2026-10-15 |
| [skills CLI 性能模型](agent-tooling/skills-cli-performance-model.md) | agent skill 目录发现、symlink 与共享更新路径；lock 匹配和批量卸载；2026-10-24 全局核对：18 项有安装记录，8 项更新、10 项已最新，另 17 项未见全局记录；2026-11-07 增安装模式判定（`-y` 加单 agent 静默转复制）与共享存储 `~/.agents/skills` | 2026-11-07 |
| [Plain Language 技能：ASD-STE100 与 ISO 24495-1](agent-tooling/plain-language-skills-asd-ste100-iso24495.md) | 受控语言与简明语言选型；中文适配边界；本机 skill 文案案例：保留数值上限、区分证据/凭据/授权条件；免责句式禁令的落点 | 2026-10-25 |
| [LLM 出图的作者模型](agent-tooling/llm-diagram-authoring-models.md) | diagram-design 手写 SVG、archify 类型化 JSON、amwth Markdown→CLI 排版、visual-explainer 全手写 HTML+SVG 四轴作者模型；amwth 含 image 的组件清单（SKILL.md 自述 12 种）、diagram-design SKILL.md 自述 44 种 type（实测 39）、archify 5 类 schema、figure-led register；几何裸露面与选择；2026-10-10 补 amwth 与 visual-explainer | 2026-10-10 |
| [Reverify：确定性验证的适用边界与 rollover 实际价值](agent-tooling/reverify.md) | Verifier 以二进制 bytes 初始化、SUPPORTED 含 functions_equiv/exebench claim；窄契约 34 组整数输入；rollover 形状校验/receipt 消费/宿主差异；issue #22 未修复 | 2026-09-19 |
| [Headroom 版本升级与兼容性（0.39 / 0.41）](agent-tooling/headroom-039-config-and-compat.md) | 0.38→0.39 无破坏升级、Timeouts 全清单、记忆超时跨 handler 范围、PROTECT_READS 命令白名单与 OMP 守卫交集、脚本唯一改动；v0.41.0（2026-10-13）新功能与关键修复；0.42 设置项另见专文 | 2026-11-06 |
| [Headroom 0.42 设置项地图](agent-tooling/headroom-042-settings-map.md) | 63 字段 11 组；settings.json→环境变量→运行时三层合成、CLI 固定项无提示；五组无效配置（rpm、memory、Read maturation、预算、extensions）；`mcp__` 工具须通配符才被保护；schema 压缩记 tokens_saved、延迟加载记 tool_saved；/stats 与 savings 不计 WebSocket（3,930 请求、1.76%） | 2026-11-06 |
| [graphifyy 工作机制](agent-tooling/graphify-mechanics.md) | 语料类型与两段式提取、code-only corpus、edge schema；0.9.79 全命令清单实测；2026-11-02 补 0.9.100：23 平台与 30 个 extras、OMP 三层集成（skill/MCP/guard）、guard 拦截面与 strict 条件、MCP 十工具与 project_path、skill 自动刷新、hooks 五件事与 merge driver、watch 进程模型、全局图 | 2026-11-02 |
| [graphify 的图谱产物形态与导出限制](agent-tooling/graphify-output-surfaces.md) | 四类可视化产物的生成命令与自动刷新差别；5000 节点聚合阈值；HTML 的 CDN 依赖；export svg 的 mathtext 崩溃与 rcParam 绕过；spring_layout 在 9663 节点上选 energy 的耗时归因 | 2026-11-02 |
| [Semgrep MCP：工具清单、传输条件与实测边界](agent-tooling/semgrep-mcp.md) | 主 CLI 子命令形态、9 注册 7 实见、daemon 与 token 两个前提；2026-10-07 复核 1.179.0：自定义规则须相对路径、p/default 拉取也超时、非安全规则（print）实测命中 | 2026-10-07 |
| [codegraph 与 graphify 的分工边界](agent-tooling/codegraph-vs-graphify.md) | 符号级索引 vs 混合语料地图：单查询探测 codegraph 未达 wiki 条目而 graphify 以 wiki 为枢纽；分层分工、选用建议与证据边界；2026-10-27 补横向对比入口 | 2026-10-27 |
| [代码智能工具全景与选型](agent-tooling/code-intelligence-tool-landscape.md) | CodeGraph、Semble、Graphify 的机制核对、相似方案、概念分层与编码 agent 选型；含 OMP find 对比，该部分标注 2026-10-01 前源码快照 | 2026-10-27 |
| [Anatomy skill：物理装置隐喻的交互式等距出图机制与自解释成品](agent-tooling/anatomy-skill-mechanics.md) | 概念→可交互物理装置的一对一映射；几何 audit + line check 双重门槛；Standalone HTML/静态 SVG/React/gallery 四交付；136 solids 自解释成品的 iframe srcdoc + Bun bundle 嵌入方式与后续改动走手动编辑的合规流程 | 2026-10-18 |
| [uv 工具发现机制与 uv-receipt.toml](agent-tooling/uv-tool-discovery-and-receipts.md) | uv per-tool receipt 与浅层同步；补 Git 工具隔离环境、mutator 的 --with crapper 导入依赖、upgrade --all 与 Updated/Nothing to upgrade 两阶段输出及实测边界 | 2026-11-12 |
| [ub-mode 配套工具：安装、升级与项目运行方式](agent-tooling/ub-mode-companion-tools.md) | crapper/dryer/mutator CLI 与可选 uml-viewer；uv Git 安装、extras 与 Clojure 前提；语言注册矩阵与 dryer 的 JavaScript 两层缺口（PR #16/#19）；CRAP、变异、相似度三种信号的读法与覆盖率归属失真；作者仓库自用证据；agc 修复前后实测 | 2026-11-13 |
| [harness 接入工具的三条通道](agent-tooling/harness-integration-paths.md) | 内置工具、配置分发、外部任务系统三条通道的判据与缺口；ast-grep 引擎随 `pi-natives` 发布（`ast-grep-core 0.39.9`）；APM 的 manifest、lock、SBOM 与 policy 及 9 个支持宿主（不含 OMP）；Beads 的 14 个 `bd setup` 配方（不含 pi/omp）与 `AGENTS.md`、`beads-mcp` 两条接入路；本机 bd 1.3.4 已装，同步与 server 模式需要独立 Dolt 2.6.0+ | 2026-11-05 |
| [Beads 的安装与运行面](agent-tooling/beads-install-and-runtime-surface.md) | 一个 bd 二进制内含 Dolt 引擎；安装脚本/npm/brew 的下载物与校验差异；独立 Dolt 只在同步与 server 模式需要（2.6.0+）；beads-mcp 三个直接 pin 与 69 个 wheel 闭包；本机手动安装证据与 1.3.4 升级；buntoolbox Docker 安装 vs WSL 只检查版本；bd init auto-commit 与 bd prime 空库行为 | 2026-11-06 |
| [Beads 1.3.4 的命令面与帮助树结构](agent-tooling/beads-command-surface.md) | 1.3.4 递归 --help 共 299 页（120 一级、172 二级、7 三级；一级含 bd 根）；任务循环、依赖、同步、维护、集成分组；帮助树解析的三个边界 | 2026-11-05 |
| [持久任务库与会话 todo 的分工](agent-tooling/durable-backlog-vs-session-todo.md) | 会话 todo 记执行步骤，bd 记持久交付项；按生命周期、共享范围、依赖关系、审计需求判定；混合流程与 AGENTS.md 优先级规则 | 2026-11-05 |
| [bd init auto-commit 陷阱](agent-tooling/bd-init-auto-commit-gotchas.md) | bd init 默认自动 git commit，无 --no-commit；#5654 staged 文件被卷入、#3495 reinit-local 无 opt-out、#1989 讨论默认开启；规避方式与建议 | 2026-11-06 |
| [Reason Network：跨机器的 agent 团队目录与消息总线](agent-tooling/reason-network.md) | 团队目录加消息总线：push/turn/pull 三档投递、签名名册与邀请门禁、iroh 直连与中继、自建中继不接触 n0、消息 64 KB、离线最多一天、M0–M3 完成 M4 未开始 | 2026-11-06 |
| [agent-browser 与 chrome-devtools MCP 对比](agent-tooling/agent-browser-vs-chrome-devtools-mcp.md) | 同 CDP 的双工具对照：agent-browser 按快照 ref 驱动、点击诚实失败（遮挡/隐藏/禁用即报错）、auth vault + 域名白名单 + 动作策略 + confirm/deny、stream/dashboard、pdf/record/diff、Lightpanda/Obscura/iOS Safari、五家云端 provider、skill 与 CLI 版本对齐；chrome-devtools-mcp 1.12.0 为 uid 快照、fill_form 多元素填写、性能 trace + CrUX、14 个堆快照工具（--memoryDebugging）、logpoints/CSS/Lighthouse、isolatedContext、WebAuthn/PWA/扩展/WebMCP 旗标与 service worker 求值；本机条目 enabled:false 指向 9333（2026-11-07 检查无监听）、agent-browser 未安装，含自动启动与外接两条启用路；2026-11-12 加引擎层交叉引用 | 2026-11-12 |
| [ovnfs：面向 agent 的文件夹副本与跨机器交接](agent-tooling/ovnfs.md) | 写时复制 checkout、单挂载点呈现（FUSE/NFSv3/SMB）、四类路径与 apply 边界；49k 文件仓库打开约 1 秒、3,000 文件 create 约 15 ms；安装脚本的构建服务地址与校验步骤、`update` 三条路径、`restart` 会启动不存在的守护进程；远程 attach 与 `push` 的离线条件 | 2026-11-08 |
| [sandcastle：把 agent 关进进程围栏的编排库](agent-tooling/sandcastle.md) | TypeScript 编排库：`run()` 建沙箱、起 agent、收提交；三种分支策略的工作区差别（`head` 无 worktree、`merge-to-head` 结束时自动合并、`branch` 提交留在指定分支），进程围栏与三者互不影响；九种沙箱（导出十条，文档漏列 DayTona）、六个 agent 提供方；原生围栏隐藏主目录与登录凭据、网络全开、无 root，Linux 上强度约等于 runc；抛错不回退、提供方错误不重试；`init` 按提供方生成 4 或 5 个文件、npm 包 0.14.0；`RunResult.branch` 为目标分支，`output` 需显式开启 | 2026-11-09 |
| [OMP computer use 与 agent-desktop 对照](agent-tooling/omp-computer-use-vs-agent-desktop.md) | 进程内 Eval 预置对象与独立二进制两类形态；投递三档对 headless/headed 两档（后台物理输入只在 OMP，坐标点击在 agent-desktop 需前台）；引用寿命：OMP 随工作进程清空，agent-desktop 在命名空间内写盘续用、换会话作废；审批分类不等于询问，默认 `yolo`；agent-desktop 60 个命令名 56 可用、按住类缺席；含未实测项 | 2026-11-09 |
| [ABKit：面向 agent 的 WebKit 浏览器引擎](agent-tooling/abkit-agent-browser-engine.md) | WebKit WPE 派生引擎与 ABHost：`u32` LE 加 JSON 帧、block 操作表、页面身份与 `identity`、macOS `present` 与 `ABView`、Linux/Windows 仅 `capture` 或进程内加载；八目标构建、glibc 2.35 与 musl 1.2.5、`~/.o2/lib/abkit` 安装；omp 18.19.0 优先后端与 Tern 引擎；build.stencil.so 发行 API；omp docs 最轻路径与浏览器自动化边界 | 2026-11-12 |

## ai-coding-agents

AI coding agent、IDE 与 harness 的横向比较。

| Article | Summary | Updated |
|---------|---------|---------|
| [AI Coding Agent 对比：真正独特优势（19 家）](ai-coding-agents/4-agent-comparison.md) | 19 家 harness 的独有性裁定：真独有 4、可能独有 2；2026-09-27 直读 omo-ai 5.0.0 新增 OMO Kibitzer/Dream 两项单源候选（制品直读无运行时观测）；关键词与多 agent 编排行指向跨 harness 编排 | 2026-10-27 |
| [跨 Harness 编排：workflowz 与 orchestrate 的对应物](ai-coding-agents/cross-harness-orchestration.md) | Claude Code subagents/agent teams、Codex subagents、OpenCode subagents、OMO `task`/`mass ulw` 与 OMP 两个关键词的映射；`mass ulw` 为独立版专属 | 2026-10-27 |
| [Kiro 后端 API 给任意 agent 用](ai-coding-agents/kiro-backend-api-for-agents.md) | 20 仓库筛选 + 4 强排名（ns-bridge/kirocc/kiro.rs/kiro-lb）；pi-provider-kiro 与 OMP 钩子断层 PR #170 未合并；ksk_ 资格与 Billing FAQ SoT 边界 | 2026-10-22 |
| [omo native 合法 agent 名册与配置三层](ai-coding-agents/omo-native-agent-roster.md) | 10 categories 实配状态与内置默认、具名 subagent 的 categories 绑定耦合、三层配置分工 | 2026-09-27 |
| [Grok Build](ai-coding-agents/grok-build.md) | xAI 终端 coding agent：doom-loop、LazinessDetector 与并行度真值 | 2026-09-04 |
| [开源 Harness 与托管推理不是一回事](ai-coding-agents/open-harness-vs-hosted-inference.md) | 区分客户端、runtime、Provider 主权、模型成本与端到端自托管，并补充托管个人 Agent 与自托管 Agent 的边界 | 2026-10-14 |
| [Coding Agent 候选发现方法](ai-coding-agents/candidate-discovery-method.md) | wide-narrow-deep 枚举流程、README 机制词扫描、流行度的真实用途 | 2026-09-04 |
| [四 Agent CLI 能力面对比](ai-coding-agents/cli-capability-surface.md) | codex/opencode/omo/omp 递归 --help（179 页）九大功能域对比与结构差异 | 2026-10-06 |
| [Codex 特性门系统与 Code Mode](ai-coding-agents/codex-feature-flags.md) | features stage×effective 正交、removed 冻结假设、Code Mode host 架构 | 2026-09-05 |
| [Coding Agent 的短反馈闭环：逐轮 Advisor](ai-coding-agents/short-feedback-loop-advisors.md) | OMP、Pi 与 DSH 的第二模型逐轮审查和 advice 回流机制 | 2026-09-11 |
| [Jev 在 OMP/Codex/OpenCode 的现成集成盘点](ai-coding-agents/jev-host-integrations.md) | OMP 原生集成已发布且本机核验；Codex/OpenCode 仅社区 MCP 可配方案（本轮未安装运行）；instruction skill 与 SDK/provider 分层；OpenAI Decisions API 2026-10-06 进 public beta（端点 `POST /v1/decisions`、字段级 schema 已公开，"端点未公开"结论已标 Outdated）；补 jevgrep（agent 无关 CLI + skill，README 层面未运行）；Jev 非唯一判断后端，原生 wire 已增至五条（`typesafe`、`openrouter-decisions`、`workers-ai-systemone`、`openai-decisions`、`google-decisions`），`box` 只有 `typesafe` 与 `openrouter-decisions` 支持，图片限制按 wire 不同 | 2026-11-13 |
| [OpenAI Decisions API：GA 状态、请求格式与 GitHub Copilot 后端探测](ai-coding-agents/openai-decisions-api.md) | 2026-10-22 GA（题目上限 400，新增九项能力）；Copilot 在 10-15、10-18、10-25 用常规 `gpt-6-luna` 全部 `model_not_supported`；2026-11-09 目录出现专用条目 `gpt-6-luna-decisions`（`capabilities.type: decisions`、只声明 `/v1/decisions`、不进模型选择器），用该 ID 得到 200 与结构化 `answers`，带图与三题型请求亦通过；`choice` 选项必须含 `value`；目录单价全为 0、无 `copilot_usage`；2026-11-13 复测 Gemini chat 模型与 `gemini-decision-1` 全部被拒、`/v1beta/decisions` 路径 404 | 2026-11-13 |
| [Copilot 的决策路由端点与 Auto／HydraFusion 边界](ai-coding-agents/copilot-decision-routing.md) | 产品面无 system-one 式决策入口；上游 `POST /auto`（每请求选模型，tier 四档）与 `POST /models/session/intent`（意图路由）题目固定；2026-11-09 起上游 `/v1/decisions` 亦可调用，绑定在不对选择器开放的专用条目；Auto 选模型 vs HydraFusion 选工作流并协调多模型，该区分已于 2026-10-28 随 Copilot Fusion GA 合并（旧「research preview 选择器条目」行标 Outdated）；Fusion 上游地址仍未公开，`hydra_scores` 归属 `/auto`/Auto V2；`/auto` 已实测返回 `hydra_scores`/`multi_turn_mode`/`discounted_costs` 并经 2026-11-11 扣费核验确证 | 2026-11-11 |
| [Copilot Fusion：effort 档位、按计划可用性与计费](ai-coding-agents/copilot-fusion.md) | 2026-10-28 GA，合并 HydraFusion 编排与 Auto 模型选择；三种执行模式 Single/Cascade/Critique，Cascade 为 draft→judge→可选 repair，Critique 为 draft+N 路并行评审+revision；四档 effort（Standard/High/Max 可选，Fast 只在 VS Code inline chat）；可用性矩阵 Pro 只有 Standard、High 与 Max 需 Pro+/Max/Business/Enterprise；按模型标准价计费、无独立费用，被丢弃草稿不豁免，Cascade 通过路径两份、升级路径三份，Critique draft+N+revision，2026-11-30 前实际扣费为标准价 70%；2026-11-11 网关实测四分项单价均为目录价 70%、长上下文同折、10%→30% 单向演化零回退、链外模型保持原价；选择器缺 Fusion 与缺 Fusion Max 的两种成因；本地模型限 Standard 档且需 experimental；Fusion 实际请求路径与编排执行的一侧未公开 | 2026-11-11 |
| [同一模型名跨两个协议面时的模型 ID 分叉](ai-coding-agents/copilot-decisions-model-identity.md) | 同一模型挂在两个不兼容协议面时网关另起 ID 的普遍做法；Copilot 目录中 `gpt-6-luna` 与 `gpt-6-luna-decisions` 的端点、picker 与 `capabilities.type` 对照；请求名与响应回显名不对称；按 `supported_endpoints` 逐级排查 `model_not_supported` 的诊断顺序 | 2026-11-09 |
| [Gemini Decisions API：身份、报文差异、生态接入与 Copilot 支持状态](ai-coding-agents/gemini-decisions-api.md) | Google 2026-11-11 原生发布 `POST /v1beta/decisions` + `gemini-decision-1`；认证用 `x-goog-api-key`、`questions` 为对象 map、题型 `noul`/`choice`/`score`、262,144 input tokens 与 0 output tokens、1,000 题上限；与 OpenAI Decisions 逐项报文差异（`predicate` 对 `noul`、数组对 map、`probability` 对概率加 confidence）；生态按落地状态分两组：已实现十余项（Vercel AI SDK、Pydantic AI、Discourse、Forem、OpenClaw、Parlant、Windmill、Pipecat、Ax、Swarms、Everruns、OpenCode 自有 System One 网关）与提案/issue 阶段（LangChain4j、Arize Phoenix、Kestra、Strands Agents、claude-code-templates PR #1530 待合并），无任何项目指向 Copilot 后端；Copilot 上游 2026-11-13 实测四组全拒、唯一 decisions 条目仍是 `gpt-6-luna-decisions`；OMP PR #19060 的 `google-decisions` wire 为 opt-in | 2026-11-13 |
| [OMO 5.0：独立版与插件版](ai-coding-agents/omo-native-vs-plugin.md) | 5.0 把 omo 从 OpenCode 插件升级为自带 senpi 引擎的独立包 omo-ai；同版本号不对等、插件版 degraded support；metis/momus 别名取消、deep-low 默认换 gpt-5.6-sol-fast；CodeMode 与 Codex Code Mode 同轴等价性未验证；native models.json 按 API 协议分别配置 provider（c8787/c8787-chat）、baseUrl 需带 /v1、8787 与 4140 同一网关；`mass ulw` 经源码核对为独立版专属 | 2026-10-27 |
| [pstack 移植版生态全景](ai-coding-agents/pstack-ports-landscape.md) | 原版为 Lauren Tan cursor/plugins；20+ 移植按 star 排行（1103/944 两强断层）；backnotprop 内部结构已验证：commit 25abb38 实测 61 个 SKILL.md（58 注册 = 24 principle + 34 功能 + 3 benny 自动化不进 slash）、60/61 设 disable-model-invocation、playbook 23；补 ub-mode 官方声明的 pstack 精简衍生关系 | 2026-11-12 |
| [pstack 与 ub-mode 的作者归属及原则来源](ai-coding-agents/pstack-ub-mode-authorship-and-principle-origins.md) | pstack 上游、作者与镜像归属；ub-mode 的 Robert C. Martin 初始提交和 LICENSE 署名及官方派生声明；Attack the Premise 的 PR #329/#633 文本历史；Type System Discipline 与 Alexis King 2019 年文章的概念先例；直接引用与全部原则思想史未确认 | 2026-11-12 |
| [pstack 技能地图与行为](ai-coding-agents/pstack-skill-map-and-behaviors.md) | 判定标准（root=README get started 三者、模型自动=无 disable-model-invocation、paths 单列）；三层结构与 179 条执行边、13 类边、7 个无出边 playbook；安装核对 56 条全中、tdd 同名遮蔽、teach 已于 2026-11-07 换 pstack 源、benny 3 未装；61 技能行为面逐个重述 + 24 principle 触发表；README 自述互不调用与正文矛盾以正文为准；2026-11-09 复核本机 57 个分五层（3 根 / 15 一层 / 5 二层 / 24 判例 / 10 直呼）、边表 170 条（t80/b23/r67）、23 本 playbook 按调用强度分四档；2026-11-10 四档可达性口径（严格 t/b 36 / 加判例条件派发 48 / 排除 help 的任何提及 49 / 含 help 的任何提及 57）、24 条判例逐条带触发条件、reflect 只被提及无运行指令、typescript-best-practices 经判例指针可达；未做运行时路由探测 | 2026-11-10 |
| [skill 系统的两种组织轴](ai-coding-agents/skill-system-organization-axes.md) | pstack 任务类型轴强制路由 vs mattpocock 调用者轴可选导航；编排密度与自主验证对照；2026-10-29 复核 pstack 58 注册 + 3 自动化、mattpocock 27 仍为 10-05 采集值；2026-11-07 标记「skill 名几乎不重叠」为争议（tdd、teach 两仓同名）；2026-11-14 补 EGM 工作阶段轴作为第三种案例 | 2026-11-14 |
| [EGM 设计评审插件：机制与既有技能集的覆盖对照](ai-coding-agents/egm-design-review-plugin.md) | 七技能五阶段评审、父轮次与宿主指令文件两层隔离、一份技能文本多宿主清单、omp v18.12.6 验证到可发现可解析且 9 人格注册为 task agents 但端到端未自动化、Scorecard 6.7 明细（Pinned-Dependencies 5、Packaging -1、Maintained/Signed-Releases/SAST/Fuzzing/CII 0）与未签名发布、单维护者集中度；主线评审对象是软件设计规格，另有 review-loop、bootstrap、drift-report 三条旁路；与 pstack/mattpocock/ub-mode/OMP 子代理的覆盖对照，唯一缺口是独立上下文强制评审门、五阶段设计评审协议与产物链 | 2026-11-14 |
| [同名 skill 的遮蔽与选型](ai-coding-agents/same-name-skills-tdd-teach.md) | 一个名字一个来源，lock 只有一条、磁盘只有一个目录；pstack 与 mattpocock 各有 tdd、teach；两版定位、触发、流程与收尾对照；pstack tdd 依赖共享安装中 matt 那份；换源用 remove 加 add 两个 agent | 2026-11-07 |

## better-harness

Better Harness 的工作流审计模型与适用边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [Better Harness](better-harness/better-harness.md) | 多 host 支持、五维审计模型及其与执行 harness 的互补关系 | 2026-08-30 |

## copilot-gateway

本机 8787 GitHub Copilot 网关的模型目录、路由状态与使用记录。

| Article | Summary | Updated |
|---------|---------|---------|
| [GPT-5.6 Luna 真实规格](copilot-gateway/gpt-5.6-luna-specs.md) | 窗口 1050000（922000 prompt + 128000 output）、o200k_base、仅 /responses 端点、一个窗口两个计费档；OMP contextWindow 配总窗口的教训 | 2026-09-06 |
| [GPT-6 Luna 与 Sol 三宿主接入记录](copilot-gateway/gpt-6-luna-sol-config.md) | 8787/4140 模型目录一致；Codex/OpenCode/OMP 数值、Responses-only、模板与解析校验、两模型冒烟 200；OpenCode provider 名 4140 实指 8787；OMO native 作为第四宿主；2026-10-01 复测 limits 嵌套形态与 c8787 家族 8 模型 maxTokens 等比提升（contextWindow 不动的用户决策） | 2026-10-01 |
| [Copilot 延迟调查：社区报告、本机用量与 OMP 计时](copilot-gateway/copilot-latency-evidence-boundaries.md) | 区分社区延迟报告、copilot-api 用量事件与 OMP c8787 客户端计时；9 月和 10 月 TPS／TTFT 对比及归因限制 | 2026-10-17 |
| [sticky-router 模型目录与重启状态](copilot-gateway/sticky-router-model-discovery-and-restart.md) | 模型目录的启动发现与过期、实例停用状态的重启影响、维护时的流量和状态检查 | 2026-11-14 |


## responses-api

Responses API 兼容端点的服务端行为实测：web_search 服务端执行、usage 计量、缓存与配额。

| Article | Summary | Updated |
|---------|---------|---------|
| [Responses API web_search usage 计量](responses-api/web-search-usage-forensics.md) | 服务端执行搜索、小 query 大 input 的成因、SSE 事件流结构、prompt cache 实测、tool_usage 跟踪 | 2026-09-19 |
| [Responses API 工具 schema 延迟加载](responses-api/tool-search-defer-loading.md) | `tool_search` 与 `defer_loading` 必须成对（单独 400）；三道注入门（≥12 工具、客户端非 codex/opencode、模型≥5.4）与两个客户端被排除的成因；实测 4,949→3,601（27%）、极小工具集反亏 356；服务端执行搜索的往返；缓存读数随调用顺序变化；未验证客户端对搜索条目的处理 | 2026-11-06 |

## harness-engineering

Harness 的编辑格式、上下文载体与人类理解闭环。

| Article | Summary | Updated |
|---------|---------|---------|
| [文档、测验与 AI 代码库的认知债务](harness-engineering/documentation-and-cognitive-debt.md) | 用文档保存意图与决策，用 Quiz 暴露理解偏差，用测试验证行为 | 2026-09-01 |
| [Jev 语义回归检查方法](harness-engineering/jev-semantic-regression-testing.md) | 原子 question、可引用 criteria、基线复用、重复调用与完整输入输出记录；jevify 批量分类工作流（冻结 rubric、升级规则、人工复核、双通道验证） | 2026-09-26 |
| [Reviewer Blind Spots](harness-engineering/reviewer-blind-spots.md) | 审查架构的可见性缺口：截断输入、升级语气与判决材料充分性 | 2026-09-20 |
| [Watchdog Review Design](harness-engineering/watchdog-review-design.md) | 三桶审查框架与证据链设计、发送条件有序散文列表、jevify 盘点验证方法；2026-11-05 与 CLAUDE.md 对齐 6 条共用反免责清单、10 项禁用短语与 concern/nit 判级钩子，完成报告与验证要求按当前任务分派 | 2026-11-05 |
| [Claude Code 上下文窗口与自动压缩控制](harness-engineering/claude-code-context-and-compaction.md) | MAX_CONTEXT_TOKENS 三情形、[1m] 客户端语义、压缩触发点与两个失效变量 | 2026-09-05 |
| [三家宿主 MCP 配置、验证阶梯与凭据事故](harness-engineering/mcp-setup-validation.md) | stdio 配置与验证阶梯；HTTP OAuth 的宿主认证、调用与发布状态边界；凭据安全及状态命令副作用 | 2026-10-17 |
| [双层循环操控模型](harness-engineering/dual-loop-steering-model.md) | 徐昊课程全 30 讲主框架：双层循环（PDCA+操控循环）、四子系统、前馈/反馈/调整三环节；自我纠正循环是 ReAct 的特殊形式；edge 是窗口截断边界；Böckeler 的 guides/sensors 对应；feedforward 起源（Richards 1951 Macy Conference）；13 种坏味道（07–19）与重构手法；Skills 最佳实践（20）、锚定（21）；新增 22 人的介入、23 Eval 驱动自我改进、24 Loop Engineering、25 多 Agent 编排、26 内部 Harness 三扩展点、27 Agent First Workspace、28 写课实例、29–30 遗留系统实战与结束语；含全课概念五层结构与六类关系网络 | 2026-11-07 |
| [用控制论评估 Agent 系统](harness-engineering/evaluating-agent-systems-with-cybernetics.md) | 控制论四组检查清单（基础部件/MPC 与规划/状态估计与稳定性/多环控制与工程修复）；OpenAI 一手数据与五大实践的控制论对应；各来源资源分工地图；Ashby 变异度定律与规约复杂度下界 | 2026-10-05 |
| [锚定：用具体例子约束 Agent 的输出](harness-engineering/anchoring.md) | 徐昊课程第 21 讲：四角度（输出/过程/风格/结构）+ 三种锚定方式（模板+示例/流程图+前馈反馈/领域模型图+前馈反馈）；流程锚定与双层循环的四点对比；真实案例表（wryan14 模板、Superpowers 流程、LangGraph 图、ArchUnit 结构、SysMARA 实验、OpenAI 未验证） | 2026-10-13 |
| [Behavioral Harness 的成本收益实验](harness-engineering/behavioral-harness-cost-experiment.md) | Naresh Jain 对照实验（martinfowler.com）：同一 BFF 任务有/无 behavioral harness，GPT-6 Sol 两种条件均 10/10（harness 纯开销）、GPT-6 Luna 3/10→10/10 且单次 $0.273 低于无 harness Sol 的 $0.406 约 33%；失败分类学（202 流程断裂/Kafka 契约/HTTP 契约/配置名）；executable attention 机制；条件化结论：模型能力决定 sensors 何时运行而非是否运行；含经济学口径与利益相关边界（作者为 Specmatic 创始人，n=10 无独立复现） | 2026-10-14 |
| [backpass：把会话证据回灌到指令文件](harness-engineering/backpass-instruction-backward-pass.md) | 输入会话与执行分析的 harness 相互独立；`--harness pi` 读 OMP 存储但 `--analysis-agent pi` 启动上游 pi；acpx 可注册 `omp acp` 自定义 agent，backpass 0.1.36 的覆盖允许清单只含 pi/grok/claude/codex/opencode，故 OMP 暂不能当分析工人；OMP ACP 公布 882 个模型，`openai/gpt-5.6-*` 不在其中；近期加权抽样与 seed 语义；缓存不含模型须 `--force` | 2026-10-19 |
| [Agent 多轮表达一致性规则与 CLAUDE.md 跨机器配置手册](harness-engineering/agent-expression-coherence-and-claude-md-rules.md) | 8 类表达问题（含「不能证明」免责句式）、微软/Salesforce 多轮退化数据与 S2A/CoVe 对标、Wikipedia/Graphite/Strategic Linguist/LessWrong 的纠偏式表述观察、`skills.sh` 安装量对比、本机 Skills 覆盖映射，以及 `~/.claude/CLAUDE.md` 改动定稿与新机器 3 步复刻指令；自然化防免责陈述协议、CLAUDE.md 与 WATCHDOG.md 共用 6 条反免责清单与同一组 10 项禁用短语、按任务与授权范围验证、推断判级条件与完成报告范围对齐、11 项表达相关 Skill 依赖 | 2026-11-05 |
| [Harness² 递归 agent harness 框架](harness-engineering/harness2-recursive-harnessing.md) | 8 组件与两级递归；parallel/sequential 均以 k 次参考执行开始；模型调用全在外部 CLI 子进程（OpenCode/Codex 执行器、OpenCode/Claude CLI 改进器）；判分走基准上游脚本；自报 WorkBuddy +11.5 / JobBench +4.5 / LAB +11.8；网络与费用边界 | 2026-11-12 |


## grok2api

Grok 网页/Build/Console 账号的对话 API 网关；网页 Fast 的工具调用边界实测。

| Article | Summary | Updated |
|---------|---------|---------|
| [Grok 网页 Fast 工具调用边界](grok2api/grok-web-fast-tool-calling-limits.md) | 提示词模拟无原生通道；精简上下文实测通过完整工具循环，OMP 上下文唯一样本遭拒；NO-GO 与样本边界 | 2026-09-30 |

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
| [JustWoker `/v1/messages` 实测行为](model-gateway-mismatch/justwoker-v1-messages-observed-behavior.md) | 四个请求模型名的返回模型、usage、身份和环境字段实测；目录无能力字段与 UA 门槛；流式丢内容块、tools 与 system 被运行时替换、quince 代号溯源；2026-10-09 流式恢复探测（并列观测，稳定性未验证） | 2026-10-09 |
| [免费强模型 API 候选与尝试排序](model-gateway-mismatch/free-strong-model-api-candidates.md) | 免费注册或签到、强模型名称与证据边界的候选排序 | 2026-09-04 |
| [Relay 的 chunked 流不终止：诊断与最小修复](model-gateway-mismatch/relay-unterminated-chunked-stream.md) | 缺失 chunked 终止块造成的 60 秒挂起、客户端一致性验证与本地 shim 修复 | 2026-09-05 |
| [SDK 对非标准 responses 帧的解析严格度差异](model-gateway-mismatch/sdk-strictness-on-nonstandard-responses-frames.md) | AI SDK 与 pi-ai 对同一 responses 帧的解析差异及 OpenCode/OMP 协议分配；senpi(OMO) 共享同套 adapter 与不补 /v1 规则 | 2026-09-27 |
| [justwoker-shim 设计](model-gateway-mismatch/justwoker-shim-design.md) | 断路器状态机、SSE 合成、文本协议工具仿真、路由（带工具无条件走 emulation）、断路器饥饿修复、工具描述不截断、非法 JSON 回退 | 2026-10-05 |
| [Kiro 认证凭据路径速查](model-gateway-mismatch/kiro-auth-paths-cheatsheet.md) | 免费社交登录 vs 付费 ksk_、凭据落点与 Billing FAQ SoT；Free 计划下原生 Sonnet 4.5 请求通过，目录含 Haiku，Opus/GPT 请求不可用；IP 因果未受控 | 2026-10-23 |
| [用 Anthropic thinking signature 判断网关实际服务的模型](model-gateway-mismatch/anthropic-signature-model-verification.md) | signature 明文头三层结构（outer/envelope/header）、field 6 模型 ID 与 field 8 块类型、解析链与 128 字节长度门、版本 4 格式无 field 6 返回 undefined、不校验密码学有效性 | 2026-10-26 |
| [Copilot Chat 生成失败：跨协议传递、用量保留与 OMP 重试边界](model-gateway-mismatch/copilot-chat-generation-failure-and-omp-retry.md) | CAPI 以 `finish_reason: "error"` 或顶层 `error` 结束仍返回 HTTP 200、无 `native_finish_reason`；三条下游协议各自收尾与「先用量后单次错误」的顺序约束；`Provider returned error finish_reason` 文案决定 OMP 可重试；`validated` 仅在 Gemini 3 由官方客户端改写，Argon 实测接受但映射未确认；`compat.extraBody` 覆盖 `tool_choice: "none"` | 2026-11-11 |

## openai-api

OpenAI API 协议层传输模式与事件语义。

| Article | Summary | Updated |
|---------|---------|---------|
| [Responses API WebSocket 模式](openai-api/responses-websocket-mode.md) | `response.create` 帧、`stream_id` 通道与 16/32 上限、连接内内存缓存与 `previous_response_id` 续接、`store=false` 兼容、60 分钟寿命与三条重连路径、四个错误码、SDK 版本门；条目来自 OpenAI 平台指南 | 2026-10-24 |
| [OpenAI Responses API Remote Compaction 与客户端 Normal Compaction 对比](openai-api/responses-compaction-vs-normal-compaction.md) | 四个核心定义、三条固定方案路径（`normal compact`、无状态 `/responses/compact`、`/responses` 内联自动压缩）、本地保留完整记录省 Token 原理、共有能力 vs 增量差异与代价、Kangwook Lee 提示词同源性观察与跨模型 Agent 取舍 | 2026-10-24 |

## omp-auth

OMP 认证、MCP OAuth、凭据管理，以及 Auth Broker/Gateway 的代理访问。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Auth Broker 与 Gateway](omp-auth/auth-broker-gateway.md) | 凭据集中、access token 服务端解析、客户端不保存 provider key | 2026-09-09 |
| [SOFA 官方 MCP：OMP 接入、维护与验证](omp-auth/sofa-mcp-maintenance.md) | 连接配置与凭据归属、Clash 规则查找、回调机制、工具验证及私有草稿发布边界 | 2026-10-17 |

## omp-commands

OMP 内置命令的机制与动态发现。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Cleanse：动态诊断修复](omp-commands/cleanse.md) | 按项目文件和可用 binary 动态发现 checker，多语言支持 | 2026-09-09 |
| [CLI 子命令全量参考](omp-commands/cli-subcommands-reference.md) | omp v18.10.1 的 launch 入口形态、启动 flags 七组、子命令八组及网页文档差异；browser-relay 行指向 browser prelude 架构 | 2026-10-26 |
| [gc 存储垃圾回收](omp-commands/gc-storage-garbage-collection.md) | omp gc 四阶段存储清理：blobs/archive/wal/stale 的路径、阈值、保留额度与安全机制 | 2026-10-12 |

## omp-config

OMP 配置项的源码级行为边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Compaction Model 与 Thinking Level](omp-config/compaction-model.md) | compactionModel 只换压的人，thinking effort 继承自 session thinkingLevel | 2026-09-09 |
| [OMP Compaction 阈值解析机制](omp-config/compaction-threshold.md) | 阈值基数只有 contextWindow（固定值/百分比/reserve 三模式，默认 -1 走 reserve = max(15%, 16384)）；maxTokens 不参与阈值，只做摘要输出预算 | 2026-10-01 |
| [OMP Snapcompact 机制](omp-config/snapcompact-mechanics.md) | 无 LLM 位图帧归档：帧=PNG 物理形态、面积计费为何省 token、帧预算表（未知 provider 兜底 5）、methodOrder 偏好链语义、detail:"original" 链与我们 c8787 显式降级 | 2026-10-01 |
| [OMP Compaction Methods & History URI Tool Support](omp-config/compaction-methods-and-history-uri.md) | 五种压缩方法（remote/snapcompact/handoff/shake/soft）的 fallback chain、soft vs handoff 的 LLM 调用差异、实验性 rollover 机制、history://current/full 支持 read/grep/find（需 experimentalContextManagement=true）；实验 rollover 还要求四项工具都在生效工具表面，Vibe mode 收缩工具表面；换窗前有 clamp(12.5% × 阈值, 8,192, 32,000) 的前瞻带宽，裁剪保护 16,000 tokens 尾部与 8,000 tokens 后缀、整段刷写等 90 分钟空闲 | 2026-11-01 |
| [OMP Managed Skills 生命周期](omp-config/managed-skills.md) | 写入路径、删除路径、没有自动清理；createIf 门槛（autolearn.enabled 默认 false）、参数校验、Auto-Learn 系统提示注入出处；本机目录布局实测（无 ~/.omp/agent/skills，用户级 skills 在 ~/.agents/skills）；捕获回合由分离 agent 执行、产物三类（含无产物） | 2026-10-28 |
| [OMP 配置语义手册](omp-config/config-semantics.md) | 33 项设置的触发条件与行为影响；streamingAbort 中断/F5/自动 retry 边界；18.4.2 核验 cacheWarming 门槛、checkpoint 与双击 Escape 分工、sessionAccent 配色算法；tools.xdev 控制 discoverable 工具挂载与 prewalk false positive；browser.enabled 与 computer.enabled 的 prelude 语义；subagent 并行度四道闸门（maxConcurrency、async.maxJobs、maxInFlightRequests、batch）与 autolearn 六跳过条件；实验性 rollover 的四工具门与裁剪保护区对前缀缓存的影响；18.16.0 provider 协议层（cacheRetention 四值 wire 映射、cacheWarming TTL 触发条件、openaiLiveSteering 三条件、textVerbosity 写入门、officialEndpoint 已核对的四项 Responses 相关行为、tools.format 取值、inlineToolDescriptors 三态、task.file 校验与哈希记录）；2026-11-04 复核补入实际 warmer 调度矩阵、cache key 独立于 officialEndpoint、statefulResponses 与服务端存储/prompt cache 区别、文本工具方言不发送原生 tools、taskFile 审批与父历史边界、8787 verbosity 与 TTL 证据边界；2026-11-11 补入模型级 `compat.extraBody` 的合并时机与覆盖 `tool_choice: "none"`、绕过 supportsToolChoice 的后果，以及 gemini-4-argon 的 `validated` 实测边界；18.19.0 核验 task.steps 有序阶段执行（MAX_STEPS=4 分组、yield 推进、turn 口径）与 task.autoParallel（off/suggest/on 三值、judge 依赖） | 2026-11-12 |
| [Auto-Learn capture 管线与可观测产物](omp-config/autolearn-capture-pipeline.md) | capture 是分离 agent（无 SessionManager、独立 sessionId 不落盘、不写 model_usage）；触发六条件；产物三类（learn 记忆行、managed skill、无产物）；`coding-agent-learn` 记录查询方法与本次运行时间线；记录内容未经复核的边界；配置变更与生效边界（同进程改值未触发、新 PID 才触发、`startWatching()` 对 autolearn 键未取证） | 2026-11-04 |
| [OMP nvidia 模型剪枝机制](omp-config/omp-nvidia-model-pruning.md) | nvidia 缓存只增不减根因：四源合并 + retainModelIds 仅在 dynamicModelsAuthoritative=true 时执行、nvidia 未设该编译期内置标志（对照 deepinfra/novita/umans）、用户配置无法打开；实测 176 缓存/81 在线/95 差集构成（52 models.dev/4 内置/39 残留）；上游一行改动方案（暂不提 PR） | 2026-10-05 |
| [OMP 实验性上下文管理与 OpenCode DCP 对比](omp-config/experimental-context-vs-dcp.md) | rollover/notes 机制与 DCP outbound transform 的对比与选型 | 2026-09-12 |
| [OMP 运行时控制](omp-config/runtime-controls.md) | steering / follow-up / interrupt 队列语义与 parse regression 记录/修复 | 2026-09-11 |
| [OMP 动态 Session Identity 与 Sticky Routing](omp-config/dynamic-session-identity-sticky-routing.md) | prompt_cache_key 归一化与 Chat compat gate、未声明 compat 键 keep 语义、4140 body fallback、三条路线排除理由 | 2026-09-14 |
| [OMP Advisor 防过时三旋钮](omp-config/advisor-freshness-knobs.md) | syncBacklog/immuneTurns/maxNotesPerUpdate 语义、backlog 与 note 两条丢弃路径、防过时最强组合与代价 | 2026-09-19 |
| [OMP Advisor Concern 投递策略](omp-config/advisor-concern-delivery-policy.md) | mid-turn concern 的 admission defer 现状与 blocker-only 行为、git 沿革、upstream opt-in 变更请求 #9074/#9576/#10600 | 2026-09-19 |
| [OMP /model 模型浏览器：角色解析与 kind 过滤](omp-config/model-browser-role-resolution.md) | 已配置角色按 enabledModels 受限集合解析、范围外即 `—` 且无兜底；15 内置角色 + 10 kind 清单 | 2026-09-23 |
| [OMP per-call model 与许可机制](omp-config/per-call-model-and-allowlist.md) | task.perCallModel off/eval/on 三态（本机已 on）与 project 只降不升；按次 model 须单一精确 provider/model-id[@upstream][:level]，role 别名/数组/glob 拒绝；许可来自 operator chat 角色、bundled/user agent frontmatter、父会话单一选择器路由、^标记 m<N>；perCallModelAllow 双层收窄；agentModelOverrides 并用冲突、seance 不受理、无 retry fallback/prewalk、task.maxEffort 档位上限；本机 broadcast 6 个许可选择器与两次拒绝实测；v18.5.0 旧设计（role 别名+候选数组）已撤回 | 2026-11-02 |
| [OMP 自定义 sub-agent：定义、工具名适配与验证](omp-config/custom-subagent-deployment.md) | 用户级 agents/*.md 的 frontmatter 连字符与 camelCase 等效（`rawKeys=false` 归一，官方文档写 read-summarize/thinking-level）；跨机复刻三处替换（模型 provider、MCP 注册名、manifest 归属）；本机 5 agent + architect/designer/balanced 三 role（16 键，per-call 许可 7 个 selector）；selector 的 `:level` 后缀优先于 thinkingLevel，中间档须用无后缀 role；`spawns: []` 仍注入 task 工具，省略才真正没有；验证两段（loadReadOnly+discoverAgents 断言、五条冒烟自报模型 ID）；TTSR+扩展双层 task agent 选择引导（不硬编码清单）；OMO 5.1.57 原型吸收与四份补齐（Metis/Momus/Oracle Triple、年份门槛/permalink/恢复分支、组件下限/设计系统/验收门、既有证据核查/产物引用）；18.19.0 工具面解析（五类自动补齐，`wait` 由执行器追加；`alwaysInclude` 使 MCP 与扩展工具不受 frontmatter 约束；`restrictToolNames` 三来源为 seance、plan mode、受限父会话，任一命中即关闭 MCP；只读判定为 16 名白名单成员关系）与提示词分层冲突（`# 2. Hand-off` 禁子代理自行跑构建测试）；五 agent 实测内置工具数 24/20/19/14/13，builder 省略 tools 加 spawns:* 与 task 逐项相同 | 2026-11-12 |
| [OMP Advisor 上下文标记](omp-config/advisor-context-markers.md) | `**user**:`/`**agent**:` 角色标记、会话更新状态头、工具结果渲染预算、evictStaleResults 清理、Advisor 直接回答的投递缺口；技能调用消息走 `customOneLiner` 的 120 字符预览，`User:` 尾部被截掉；#19164 的机器人修复分支与当时受阻的 PR 检查 | 2026-11-13 |
| [OMP 配置键全量清单与凭据遮蔽边界](omp-config/config-key-census.md) | 18.3.1 起 512 键、128 键无 ui 文字须读源码、isCredential 只覆盖 8 键须按值形态补遮蔽、枚举 API、指纹盲区；18.4.2 达 515 键 | 2026-09-28 |
| [OMP advisor fallback 链解析与 web 角色 effort 层级坑](omp-config/advisor-web-fallback-chain.md) | 18.4.5 effort 层级（#13789）使 advisor 无链时命中 web 角色键 → web-search provider 全部 Unhandled API；探针复现；本地修法（modelRoles.web 改 firecrawl + 显式 fallbackChains.web/advisor） | 2026-10-07 |
| [OMP cfg:// 配置解析：合并视图与 source 归属](omp-config/cfg-url-resolution.md) | cfg:// 三层下钻键发现、合并视图 vs yaml、default/global config/项目/会话四层 source 归属、写入 session-only + save 持久化 | 2026-10-11 |
| [OMP Codex WebSocket 传输判定与回退](omp-config/websocket-transport-policy.md) | 仅 `openai-codex-responses` 有 WebSocket 路径；三处开关与五步判定（模型级 false 挡住环境变量、全局 off 位于环境变量之后）；状态函数与 `lastTransport` 用途区分；V2 beta 头、帧内走 `client_metadata`、致命错误触发 `disableWebsocket` 回退 | 2026-10-24 |

## omp-context-files

OMP 上下文文件的发现顺序、provider 优先级、作用域组合与 system-instruction 覆盖方式。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP 上下文文件发现与优先级](omp-context-files/context-file-discovery-and-priority.md) | AGENTS.md、RULES.md、APPEND_SYSTEM.md、SYSTEM.md 的作用、搜索顺序、provider shadow、@path 导入与 `/extensions` 验证 | 2026-10-11 |

## omp-tools

OMP 内建工具全集、会话暴露边界、审批类别与内部地址空间。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP 内建工具全集、会话暴露边界与内部地址空间](omp-tools/builtin-tools-and-internal-urls.md) | 30+3 核心常量 vs 文档 6 能力型 vs 会话 27 暴露；分组作用对象/可用性/审批类别表；github gh 登录态、security_scan 受限子代理、report_issue 本地+qa.omp.sh 三机制核验；内部地址 scheme 动作矩阵；Unix/一切皆文件设计观察；browser 与 computer 的运行时交叉引用；ast-grep 引擎随 `pi-natives` 发布（`ast-grep-core 0.39.9`） | 2026-11-04 |
| [OMP browser prelude 与 relay 架构](omp-tools/browser-prelude-and-relay-architecture.md) | prelude 定位与启用条件；四后端八顺位路由表；relay 端点鉴权矩阵（token 只管 /ext，/cdp 无校验）与 loopback 边界；扩展来源与 Chrome 136 限制；标签页借用与冻结范围；跨系统上传回退与下载 perTab 分支；Kerberos 落在浏览器进程；WSL 双向回环实测与扩展握手待验证；API/CLI 与界面选型顺位；2026-11-12 补 ABKit/WebKit 后端：18.19.0 优先随包引擎、SHA-256 自动安装与 Chromium 回退 | 2026-11-12 |
| [OMP computer prelude 与桌面自动化](omp-tools/computer-prelude-desktop-automation.md) | AX 与像素双路径、坐标系禁止混用；DesktopSession 四层结构；本机 WSL 能力矩阵（capture false、ax true、0 显示器 0 窗口）；快照上限 800/24 与 find 5000/24、默认 100 条；审批分类与接管语义；2026-11-09 补档位解析：是否询问取决于 `tools.approvalMode`，默认 `yolo`，前台控制另走确认；Windows UIA 框架覆盖表（Win32 逐类、WPF、WinForms 两档、Java、自绘）；Electron 与 VS Code 的激活与连接条件 | 2026-11-09 |
| [OMP bash 命令行折叠标记与 /dev/null 语义](omp-tools/bash-shell-visualization-idioms.md) | `🔇 out`/`🔇 err`/`🔇 silent` 与 `+err` 的四类重定向映射（idioms 层默认开）；命令文本来源链（模型 → rtk 扩展改写 `event.input.command`，6 次 rewrite 实测中 2 次带重定向均原样保留）；丢弃验证 `echo hidden-line >/dev/null` 不进工具结果；同区域 `⇡ first N`/`⇣ last N`/`⟵ ↓`/`⟦..↓⟧`/`⏱`/`# stop on first error` 等词汇表；`display.shellVisualization` 默认开；v18.18.0 tag 取证与未验证项 | 2026-11-07 |

## omp-extensibility

OMP Extension 与 Hook 的职责边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Hooks vs Extensions](omp-extensibility/hooks-vs-extensions.md) | Extension 覆盖 HookAPI 全部用例并增加 tool/provider，Hook 是 legacy 兼容层 | 2026-09-09 |
| [OMP tool_call 范围防护扩展：执行前阻断危险 Grep](omp-extensibility/tool-call-range-guard-extension.md) | `tool_call` 阶段返回 `block`/`reason` 的范围拦截；受保护集合、父目录候选枚举、排除项与 symlink 归一、未注册 URI 拒绝、失败关闭；23 项边界回归、6 项真实执行验收与 strace 证据；只覆盖 Grep | 2026-11-02 |

## omp-tips

OMP 启动提示与交互快捷方式。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP 启动提示全表](omp-tips/startup-tips.md) | 28 条提示（27 条 + 1 条条件提示）、加权随机、Agent Hub、yield-queue | 2026-09-09 |
| [OMP web search 自定义 Responses API 端点](omp-tips/web-search-custom-responses-provider.md) | codex provider 接入兼容 /codex/responses 的端点：路径拼接、请求形状、凭证分支、实测 | 2026-09-19 |
| [OMP web search provider 清单与 fallback](omp-tips/web-search-provider-inventory.md) | 25 个 provider 四类分级、串行 fallback、public 并发合并、webSearchOrder 追加语义、Tavily MCP 与原生 `web/tavily` 凭证来源差异 | 2026-09-29 |
| [OMP 扩展自动加载机制](omp-tips/omp-extension-auto-loading.md) | OMP 四路合并自动扫描全部 `*.ts`/`*.js` 扩展、config.yml 声明非加载开关、canary 实测与禁用正确方法 | 2026-09-19 |
| [Kiro 接入 OMP 设置与验证实录](omp-tips/kiro-omp-setup-via-ns-bridge.md) | ns-omp-provider-kiro 设置与模型验证；Node AAAA 查询约 11s 触发 undici 10s 超时，Kiro 管理请求 IPv4 dispatcher 修复；刷新后目录 8 模型，菜单原因未知 | 2026-10-23 |

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
| [OMP task 工具中的 seance 历史会话咨询](omp-background-agents/task-seance-historical-consult.md) | 主 agent 派遣指引、参数范围、历史 fork、模型选择与上下文检索边界 | 2026-10-22 |

## omp-mnemopi

OMP Mnemopi 的记忆 scoping、召回与 consolidation 生命周期。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Mnemopi Consolidation 生命周期](omp-mnemopi/consolidation-lifecycle.md) | 三种 scoping 的写入/召回路由、retain scope:"global" 参数与实测、模式切换与 consolidation 边界；自动 retain 每 4 个用户轮与 extract 边界、整合 `llm_used: 0` 的源码依据 | 2026-10-27 |
| [OMP 记忆后端对比：Mnemopi vs Hindsight vs Sharpshooter](omp-mnemopi/memory-backends-comparison.md) | 三后端定位、安装、LLM/embedding/reranker 配置、迁移路径；外部叠加方案 ai-memory（非第五个后端、并存需先关 memory.backend） | 2026-10-27 |
| [OMP Mnemopi Auto-Recall 注入机制](omp-mnemopi/auto-recall-injection.md) | 注入时机/次数、query 构造、注入位置、facts 只读与 quit/resume cache 影响；一次性注入的三处标志位与 8/5000/3 取值 | 2026-10-27 |
| [Mnemopi 数据模型与 Recall/Reflect](omp-mnemopi/data-model-and-retrieval.md) | 表职责、working→episodic→facts 关系、recall/reflect 查询路径、FTS 与 embedding 辅助表、facts 只读（memory_edit 不可改）；分层打分与默认权重 0.5/0.3/0.2 | 2026-10-27 |
| [Mnemopi SQLite 损坏恢复](omp-mnemopi/sqlite-corruption-recovery.md) | 恢复流程、五次损坏实录（9-21/9-24/10-06/10-09/10-11）、索引同坏时穷举点查证伪法；根因类层面定位（多写入者 + `-shm` 协调失效，两条可达：grep/read 进程内夺锁、替换 bank 未重启致分裂 shm），逐次归因不可考，WAL-reset/FTS5 CVE 已排除；恢复流程与陷阱、embedding 重建停滞；缓解 `.ignore` 跳 sidecar（已应用）、同 repo 不并行；2026-11-01 三库恢复与安装；2026-11-02 history.db 复发（索引层，全文检索可用）与 agent.db 索引层 REINDEX 修复、安装约束；Grep 范围防护扩展已应用（提交 `71d2304`，只覆盖 Grep，不含 agent.db） | 2026-11-03 |

## omp-modes

OMP 模式、Vibe、Task/Hub 与 Magic Keywords。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP 工作模式与 Magic Keywords](omp-modes/modes-and-magic-keywords.md) | 模式触发、能力收窄、组合关系与使用建议；各模式系统指令对照（plan/vibe/goal/orchestrate/workflowz/loop）；orchestrate 的 10 条规则、7 步 workflow、7 条 anti-patterns；Vibe fast/good 固定映射与 agentModelOverrides 共享边界；magic keywords 四词与单开关（含 `magicKeywords.workflow`）、ultrathink 旁路 `autoThinkingMaxEffort`、HTML/XML 元素内容按配对屏蔽与 expanded prompt 匹配；workflowz 以 workpool 规则描述并指向专题 | 2026-11-02 |
| [workflowz 运行机制与生命周期](omp-modes/workflowz-runtime-and-lifecycle.md) | 触发与 notice 位置、池对象与批次、配置项默认值、投递与截断、匹配边界、历史与文档/测试落差；交叉引用并行度四道闸门与 maxInFlightRequests 关系 | 2026-10-27 |

## omp-prewalk

OMP Prewalk 的模型切换机制与行为边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Prewalk：规划后切换模型](omp-prewalk/prewalk.md) | 规划后首次文件修改时切换模型的触发、配置与社区证据；`/prewalk off`、`/prewalk restart` 子命令与 todo gate；xd:// 挂载导致 MCP 工具 prewalk false positive 及 `tools.xdev: false` 缓解 | 2026-10-10 |

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
| [OMP 内置 slash 命令全表（v18.1.10 快照 82 条；当前 core registry 85 条）](omp-slash-commands/builtin-slash-commands.md) | 口径一 v18.1.10 快照 82 条（core 79 + bundled /green /review + SDK /autoresearch）；口径二 2026-10-10 当前 blob core registry 85 条七类：Mode 21 / Collab 11 / Session 19 / Lifecycle 25 / Marketplace 3 / Skills 1 / Control 5；2026-10-10 补 Mode 类 `/slow` `/ratchet` `/modelpreset` `/effort` | 2026-10-10 |
| [OMP Shake 机制](omp-slash-commands/shake-mechanics.md) | 无 LLM 外科裁剪：tool result + 消息内 ≥400 token 围栏/XML 块，散文骨架保留；protectTokens 16000/4000/0 三档、useless 豁免、toolCall 不碰、artifact 占位符可回收；`/shake thinking` 自 18.18.2 起保留原生重放轮次（`openai-responses`、`openai-codex-responses`、默认走 Responses 的 `openrouter`），冷会话按三条件回落，与 copilot-api 的 `belong` 剥除重试无因果 | 2026-11-09 |
| [OMP 会话内导航：/branch 与 /tree](omp-slash-commands/branch-vs-tree-navigation.md) | 同一会话文件内的 leaf 移动：`/branch` 回放当前分支最新约 600 条、`a` 展开全部、`f` 过滤、有兄弟分支时左右键导航兄弟条、草稿覆盖编辑器、固定不摘要；`/tree` 五档过滤（`default` 隐藏 `model_change` 等簿记条目）、草稿仅在编辑器为空时回填、摘要受 `branchSummary.enabled` 控制默认关、`ask` 结果重答；双击 Esc 空编辑器按 `doubleEscapeAction` 默认 `rewind`；与 `/fork`、`/resume`、`AgentSession.branch()` 的边界 | 2026-11-03 |

## omp-ttsr

OMP TTSR 流式行为护栏、Extension 分层与上下文处置。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP Extension 与 TTSR 分层防护](omp-ttsr/extension-and-ttsr-layering.md) | schema、tool_call extension 与 TTSR 的职责边界；TTSR 两类规则（流式条件 vs `question` 判定）的适用范围 | 2026-10-08 |
| [TTSR keep vs discard](omp-ttsr/keep-vs-discard.md) | 命中规则后保留或丢弃错误上下文的证据与取舍 | 2026-08-26 |
| [OMP TTSR 与 /omfg](omp-ttsr/ttsr-and-omfg.md) | TTSR scope、配置、生命周期、规则生成与实测边界；deferred 注入竞态（#12057）；2026-10-08 补 ttsr.judge 三值配置行 | 2026-10-08 |
| [OMP TTSR 判定机制与 question 规则](omp-ttsr/ttsr-and-judge.md) | Rule.question 分流开关；claim() 语义（NO 不消耗 once 状态、请求次数=pre-filter 命中数）；ttsr.judge 三值；omp ttsr test 不调 judge 的 CLI 边界；judge 可见性边界；规则发现路径与 omp-rules 同步边界；加 question 的评估方法 | 2026-10-08 |

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
| [Prompt Cache：前缀匹配与 cache key 的真实分工](prompt-caching/cache-key-and-prefix-matching.md) | 前缀精确匹配是命中必要条件；key 是概率性路由提示，不制造不保证命中、非安全边界 | 2026-10-19 |
| [Gemini 3.8 Flash 经 Copilot 的缓存归零与恢复](prompt-caching/gemini-38-flash-copilot-cache-drop.md) | 暂停约五分钟后缓存归零、下一轮恢复的直连后端复现与逐跳排除；归因倾向 Google 缓存策略，接入路径未排除 | 2026-10-19 |
| [Gemini 4 Argon 上下文缓存：隐式缓存的掉点现象与社区反馈](prompt-caching/gemini-4-argon-copilot-cache-drop.md) | Argon 仅支持隐式缓存且不支持显式缓存；社区报告经 OpenCode Go、AI Studio、Vertex AI 直连均存在缓存命中不稳定与掉点；用户因额外费用投诉；本机 copilot-api 对 Gemini family 自动补消息级缓存标记（前 2 条 system + 最后 1 条非 system），同账户成对对照无稳定收益，跨账户同正文请求会互相命中 | 2026-11-01 |
| [Copilot 网关 cache retention 字段实测与 warming 不触发根因](prompt-caching/copilot-gateway-cache-retention-forensics.md) | 8787 Responses 通道 7 个成功响应模型的 prompt_cache_retention 回显（6 GPT `24h`、mai-code `in_memory`）；gpt-6-luna 单模型双请求 usage 从写入转命中（cache_write 4853→cached 4853），TTL/账单/字段来源未验证；OMP cacheWarming 对无 promptCache 声明的自定义模型不触发，固定 `long: 86400` 首次调度即触发一小时安全窗停止 | 2026-11-04 |

## keyboard-input

键盘驱动指针控制、窗口与 tab 切换、输入重映射工具。

| Article | Summary | Updated |
|---------|---------|---------|
| [Keyboard-Driven Pointer Control](keyboard-input/keyboard-driven-pointer-control.md) | 三条机制路径区分、工具矩阵、Capslock 与 Windows 方案 | 2026-09-03 |

## software-factory

AI software factory 的概念判据、部署形态、真工厂短名单与机械关卡参照。

| Article | Summary | Updated |
|---------|---------|---------|
| [AI Software Factory 概念与真工厂短名单](software-factory/ai-software-factory-landscape.md) | 判据五要素（输入标准化、工序固定、程序或人判定、失败可退回、可度量）；四类部署形态；三千星以上短名单 OpenHands 92184、Multica 54233、Superplane 8379、Mission Control 6410（2026-10-29 API）；关卡只到 guardrail/Aegis/review gate 一层；关联 roboomp 工作流专文 | 2026-11-13 |
| [Factory Gate 参照标准](software-factory/factory-gate-reference.md) | Goossaert 七阶段（grill→apply-docs→plan→atdd→implement→review→review-correctness）与 gate 检查清单（red-confirmation、hermetic-verify、mutation 下限、forbidden-patterns、testing-the-judge）；max_retries=3 后 flag for a human | 2026-10-29 |
| [roboomp：自托管 GitHub 维护流程](software-factory/roboomp-github-maintenance-factory.md) | GitHub 事件、OMP 会话、Issue 与外部 PR 工作流、Bun 检查及跳过条件、#19164 历史处理、源码部署与网络查询边界 | 2026-11-14 |

## software-testing

软件测试中的 mutation testing、test oracle、invariant 与 mutant 分类。

| Article | Summary | Updated |
|---------|---------|---------|
| [Mutation testing、test oracle 与 invariant](software-testing/mutation-testing-oracles-and-invariants.md) | 变异测试机制、oracle 关系、invariant 的位置、等价 mutant 与结果解释边界 | 2026-09-19 |

## technology-radar

行业技术雷达的版本结构、环位口径与条目留存规则。

| Article | Summary | Updated |
|---------|---------|---------|
| [Technology Radar 的结构、留存规则与 Vol 33–35 Adopt 清单](technology-radar/radar-structure-and-adopt-lists.md) | 四象限四环口径（Vol 33 用 Hold）；Vol 35 共 117 条与各象限环位计数、四个主题；三版 Adopt 合计 12/17/11 与逐条清单；FAQ 的一期留存规则与归档不更新；content negotiation、象限 summary 页、PDF 环位目录块三种取数方式；同一 URL 的 Tavily 版本差异（原因未查证） | 2026-11-04 |

## terminal-multiplexers

浏览器/终端复用器的前端编译模型、workspace 抽象与侧栏机制。

| Article | Summary | Updated |
|---------|---------|---------|
| [ttyd xterm.js 渲染色块与渲染器选择](terminal-multiplexers/ttyd-xterm-renderer-corruption.md) | 色块症状与 WebGL 字形缓存损坏机制、三渲染器选择对比（webgl/canvas/dom）、本机 RTX 3050 + Chrome 156 事实链、Chromium 两条 workaround 无 driver_version 区间的结论、驱动 580.88→621.14 升级路径、enableSixel 待验证分支 | 2026-11-07 |
| [ttyd 前端编译模型与 xterm 版本锁定](terminal-multiplexers/ttyd-frontend-compilation.md) | 前端编译与版本锁定、剪贴板定制、图形协议；链接到用户认可的完整 Tokyo Night Storm 配色 URL | 2026-11-01 |
| [tuios workspace 与 session rail](terminal-multiplexers/tuios-workspace-and-sidebar.md) | 七种侧栏内容及 spacer；Agent 显示、命名报告 #1384/#1388、v0.12.1；普通输入与复制模式翻页、鼠标处理边界 | 2026-11-01 |
| [TUIOS Web 与安装升级](terminal-multiplexers/tuios-web-and-updates.md) | Web 独立运行、安装与认证、持久化；本次 WebTerm 渲染、进程祖先与浏览器入口区分、Kitty 图片输出和 Maple 字体入口 | 2026-11-01 |
| [TUIOS 配置与用户体验](terminal-multiplexers/tuios-config-user-experience.md) | 配置机制与交互取舍；24 项调整后用户选择关闭鼠标跟随，仅来源更新；标题目录与其他既有配置保留 | 2026-11-01 |
| [TUIOS 配置项全表（0.12.0）](terminal-multiplexers/tuios-config-reference.md) | 271 路径默认值、允许值及来源当前值；鼠标跟随关闭，暂停键移除；版本基线与当前选择分别记录 | 2026-11-01 |
| [TUIOS Tape 自动化与项目 tape 信任边界](terminal-multiplexers/tuios-tapes.md) | 录制式与项目 tape 的区别、七个子命令、路径加 SHA-256 双要素信任、四个资格条件、三种 autorun 模式行为、auto_review 与 show_status、头部与正文指令、Scope 语义、安全属性 | 2026-10-31 |
| [ttyd Tokyo Night Storm 配色链接](terminal-multiplexers/ttyd-tokyo-night-storm-theme.md) | 用户认可的完整可复制 URL，字号14、完整调色板、Maple 字体继承、默认色与 ANSI/RGB 分层 | 2026-11-01 |
| [浏览器终端链路的剪贴板路径](terminal-multiplexers/browser-terminal-clipboard-paths.md) | copy/paste 两条不对称路径（前端 paste 事件 vs 应用自读）；omp 剪贴板三条环境门控读取路线；WSL 会话环境缺口与 WAYLAND_DISPLAY 修复；herdr 一会话一 server | 2026-10-16 |

## terminal-graphics

终端图像协议（SIXEL、Kitty graphics、iTerm2 IIP）在 ttyd、Herdr、TUIOS、OMP 中的支持矩阵与链路兼容性，含历史矢量协议全景、探测测试方法与 Tern TSP 专题。

| Article | Summary | Updated |
|---------|---------|---------|
| [终端图像协议支持矩阵](terminal-graphics/terminal-image-protocol-matrix.md) | ttyd、Herdr、TUIOS、OMP 协议能力与转换方向；新增 v0.12.1 WebTerm 链路和 PNG 演示，区分源码能力、工具输出与浏览器目视结果 | 2026-11-01 |
| [Tern Surface Protocol](terminal-graphics/tern-surface-protocol.md) | Tern 的 TSP UI 树绘制路径与 image 节点；kitty graphics 支持来自第三方插件声明（非官方）；SIXEL/iTerm2 未找到证据 | 2026-10-17 |

## tern

Tern 终端、Web 客户端、插件架构、设置存储与维护工具。

| Article | Summary | Updated |
| [Tern 升级辅助工具与验收边界](tern/maintenance-toolkit.md) | 官方资源校验、字体与时间定位、确定性构建、写流失败取消输入、真实 Windows Chrome 复现与 viewport 重绘判据、checkJs 机械检查、CI 测试作用域、test:receipt、0.9.7–0.9.18 描述符结构波动与 Geist 字体观察、WSL headless GPU adapter 三种开关实测、Bun 钩子默认 5 秒预算与超时报错边界、正式进程身份检查 | 2026-11-12 |
| [Tern 官方文档地图](tern/official-docs-map.md) | 官方文档站 82 页结构、获取方式、九分区页数、七个示例插件与概念导航 | 2026-10-20 |
| [Tern 对象模型：包含关系、数量与生命周期](tern/object-model.md) | 核心对象定义、数量与包含关系、所有权、生命周期、进程拓扑实测与术语冲突记录 | 2026-10-20 |
| [Tern 设置项全集](tern/settings-schema.md) | 本机 0.9.4 二进制内嵌设置结构体全字段、提取方法与分组整理 | 2026-10-20 |
| [Tern 命令透镜（command lens）](tern/command-lenses.md) | 透镜定义、认领流程、block/lens 分工与声明式认领的架构论证 | 2026-10-20 |
| [Tern 插件能力全集](tern/plugin-capabilities.md) | 九域能力清单、事件、动作形态、预算与容量表、生命周期、信任模型与示例配方 | 2026-10-20 |
| [Tern Surface Protocol 官方规范要点](tern/tsp-official-spec.md) | TSP 核心实体、三种 mode、握手、流控、驱逐、blob、主题、安全边界与 SDK | 2026-10-20 |
| [Tern 脚本与自动化面](tern/scripting-surface.md) | 控制端点、脚本三路径、命令域、状态导出与块类型脚本能力 | 2026-10-20 |
| [Tern 网页字体修改与版本迁移](tern/web-maple-font-rebuild.md) | 原版字体验收、descriptor 注入、0.8.3/0.9.3/0.9.5/0.9.7/0.9.8/0.9.9/0.9.10/0.9.12/0.9.18 证据、BerkeleyMono 到 Ioskeley 的字体族更换、0.9.12 起含 Geist UI 字体、描述符单副本与多副本的版本间波动、合并分配、`--bundle` 与 `--official` 两种资产装配、字体与时间补丁边界 | 2026-11-12 |
| [Tern 时间 API 补丁与验收](tern/time-api-patch-and-verification.md) | calendar、Instant、elapsed 语义与 ABI；按版本静态证据；0.9.7–0.9.18 的 `panicFunctions` 总数与时间调用数；Markdown 冻结及字体注入的独立验收边界 | 2026-11-12 |
| [Tern 跨机器补丁手册](tern/portable-patching-runbook.md) | 本机原版获取、固定 recipe 重建、完整包迁移、仅字体装配、真实页面检查、重启后的启动路径、site 目录核对、0.9.18 验收形态与 GPU adapter 实测、跨版本 pane 只陈述观测不推断丢失原因，以及未知版本和平台限制 | 2026-11-12 |
| [Tern 设置存储位置](tern/settings-storage.md) | 原生配置目录与 Web localStorage 的区别、origin 隔离和主机插件开关范围 | 2026-10-20 |
| [Tern 插件架构与平台边界](tern/plugin-architecture.md) | 插件包、host/window 分工、平台能力矩阵、Web tab 与 tern plugin 行为、生命周期与预算 | 2026-10-20 |
| [Tern：TSP 与 browser 后端](tern/tsp-and-browser-backend.md) | TSP 原生渲染、browser 后端、wire 协议、CLI 帮助参数的副作用边界与官方协议章要点；2026-11-12 补 ABKit 引擎与 Tern 网页视图 | 2026-11-12 |
| [Tern Inbox 特征行为](tern/inbox-feature.md) | 四条 ctl/scenario 命令、默认键位、OSC 99 直写 pty 实测不进 inbox、Herdr 已排除、真实通道待查 | 2026-10-20 |
| [Tern 网页 Markdown 中文触发无响应](tern/web-markdown-cjk-freeze.md) | 旧版冻结报告与 0.8.4 浏览器 panic；0.9.6 原版与 0.9.7 仅字体版均未复现；viewport 重绘判据与 `not_run` 边界；按 `file`/`id` 关闭目标 pane 的恢复步骤 | 2026-10-29 |

## proxy-ops

代理客户端迁移、域名定向规则与出口指纹的取证方法。

| Article | Summary | Updated |
|---------|---------|---------|
| [专有代理客户端迁移到标准 Clash：通用取证方法](proxy-ops/proprietary-client-to-clash-migration.md) | 内核指纹识别、本地登录态、面板 flag 格式参数突破、HTTPS 边界 | 2026-09-16 |
| [代理出口 IP 指纹批量测量与形态分类](proxy-ops/exit-ip-fingerprint-measurement.md) | external-controller 批量测出口、BGP origin 收敛 ASN 冲突、命名审计 | 2026-09-16 |
| [域名定向代理规则：把指定域名固定到代理组](proxy-ops/domain-targeted-proxy-rules.md) | 前置 DOMAIN 完整域名与首条匹配停止、填组名跟随组内选择 vs 填节点名锁定、option.rules → profiles/UID.yaml 的 prepend、clash-verge.yaml 才是生成配置、controller /rules 与 /connections 核对 | 2026-10-26 |

## llm-proxy-sse

LLM API SSE 流式调用在 Clash Verge/mihomo + 机场链路上的长连接机制、链路影响与配置边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [LLM API SSE 流式调用：Clash Verge/mihomo + 机场链路的机制、影响与配置](llm-proxy-sse/llm-api-sse-proxy-chain.md) | SSE=单条长生命周期响应流、mihomo 透明转发无害、url-test 拨号时刻选路不杀已有流；keep-alive 键名三证定版、idle 调长更不安全（15 优于 30）；select 组固定出口 + 客户端读超时/重试兜底 | 2026-09-19 |

## herdr-plannotator

Herdr 终端 workspace 管理器与 Plannotator 可视审查/标注工具链的 CLI、配置、插件机制与集成方式。

| Article | Summary | Updated |
|---------|---------|---------|
| [herdr-core 安装配置与 WSL2/Tailscale 手机接入](herdr-plannotator/herdr-core-install-config-wsl2-tailscale.md) | install.sh 行为（~/.local/bin、SHA256、hc 链接条件、HC_VERSION）与 hc update 升级；config.toml 11 项完整表与两类错误行为；WSL2+Tailscale 部署清单（Tailscale 装在 WSL 内、/usr/local/bin/hc 链接、tailscaled 自启、手机三步）；100.x 地址分配与来源；本机 tailscale ssh 自测 refused 的机制（入站流量内接管 22、issue #11097）与跨设备验证前提；uv-bun --up 集成 | 2026-11-13 |
| [Herdr App、herdr-core 与手机](herdr-plannotator/herdr-app-core-mobile.md) | Herdr App、herdr-core、Herdr TUI 与手机 App 各自负责什么；core 的后台运行、CLI、选择菜单和普通程序支持；手机经 SSH 访问 core 管理的终端，agent 在电脑执行；plain JSON-RPC → hello framed → terminal.attach 的顺序；手机自动列表不显示 Herdr TUI agent，但可在电脑 shell 中运行 `herdr` 或 `herdr session attach <name>` 手动显示 TUI；WSL 场景 Tailscale 须装在 WSL 内、Windows 宿主部署的 --via 拓扑与重启后前提；桌面自然语言定制、手机快捷键栏与真实终端；Android 内部调用、GMS 依赖与华为兼容性未确认 | 2026-11-13 |
| [Herdr + Plannotator 工具链全量 Reference](herdr-plannotator/toolchain-reference.md) | Herdr TUI 0.9.1 基线 + 0.9.2 增量实测（placement 五值、popup、`keys.command`、graphics API 删除）；Plannotator 0.27.15 完整 CLI flags、配置项、插件生态、两个集成仓库机制；第 8 节补 2026-10-01 混版故障类；第 9 节补 0.28.12 agent 工具与 Quick Labels 指引；第 10 节补 Kitty graphics only 与 SIXEL NOT_PLANNED；第 2 节补 0.9.5 复核（14 section/211 key、`ui.toast.delivery` 默认 off、`tab_bar_right` 取值与 interval/timeout、侧栏 16×16/`row_gap` 默认 0/`rows_by_agent` 替换语义、`startup_per_agent_delay_ms` 默认 100、`config check`/`--default-config` 入口、`experimental.kitty_graphics` 别名优先级）；开头说明 TUI 范围并链接 App/core/手机文章 | 2026-11-12 |

| [Herdr 配置项与用户体验](herdr-plannotator/herdr-config-user-experience.md) | Herdr TUI v0.9.5 `config.toml` 主配置与校验入口（本轮在官方 docs 与仓库中未找到 JSON Schema；`herdr config check`/`--default-config`/Config reference/`config-reference.json` 14 section 211 key）；按主题/侧栏/tab 栏与外层标题/快捷键与临时工具/终端默认/通知与声音/会话恢复与历史/图像光标输入法/远程更新启动九维度讲当前值、可取值与体验含义；补 CLI 只有 server 侧重载入口（`herdr config` 仅 `check`/`reset-keys`，客户端显示类设置须界面 `reload config`）、`agent_panel_sort` 两模式（priority 档位 blocked→未查看 done→working→已查看 idle→unknown，同档按最近状态变更）与 `prefix+n/p` 跟随、`shell_mode=auto` 仅 macOS 登录 shell、`keys.command` 的 `description`/`HERDR_*` 变量/Windows `cmd.exe`、`prefix+o` 与 `keys.open_notification_target` 撞键；本机取舍（tokyo-night、dots、Herdr 内通知且声音关、kitty_graphics 关、pane_history 关、恢复开、新增 OMP 标题行与时钟与 popup/btop 快捷键）与证据边界；开头说明 TUI 范围并链接 App/core/手机文章 | 2026-11-12 |
| [Plannotator OMP 插件运行机制](herdr-plannotator/plannotator-omp-plugin-mechanism.md) | slash command 双通道归属（插件 `pi.registerCommand` 四命令 vs `~/.claude/skills` skill 调独立 CLI）、agent 工具通道（`pi.registerTool`，0.28.12 起）、进程内 HTTP 服务链路（createServer/listenOnPort、`/api/approve`+`/api/feedback`）、node-pty 缺 linux-x64 预编译产物的 node-gyp 编译门与常驻决策、health check 只验存在性 | 2026-10-11 |
| [Plannotator agent tool 注入与 Quick Labels 机制](herdr-plannotator/plannotator-agent-tool-and-quick-labels.md) | agent 工具开关链（env → config.agentTool → 主机默认，Pi 默认关）、OMP .env 注入通道、Quick Labels cookie 存储与 Settings 编辑能力（👍 硬编码例外）、config.json 38 键清单、脱敏实测 | 2026-10-11 |
| [Plannotator Inbox 通知与标注面](herdr-plannotator/plannotator-inbox-notifications-and-annotations.md) | 通知只由打开的 Inbox 标签页发出：新线程必通知、线程内新问题通知（正看着的线程除外）、普通进展不通知；单条与合并文案、`FRONT_BURST_MS` 30 秒内合并、多标签页只弹一次；铃声仅对新问题、仅当无标签页在前台、30 秒一批、需一次点击或按键后才可播放；`notifyStatus` 五种状态文案与 `reachText` 五种“Notifications reach you”结果、静默失败五来源、权限按来源地址；标签页冻结与回收的提示条件（冻结超过 60 秒）；标注面（agent 消息正文可选中评论、工具栏只有 Comment 与 👍、问题卡片与行动事项卡片包在 `annotation-exclude` 内不可评论、Markdown/文本/Mermaid/Graphviz/HTML/图片/视频可评论、视频评论带时间点与暂停帧路径、评论存为待发送随一次 Send 发出）；回复组织顺序与 👍 确认 | 2026-10-31 |
| [Plannotator Inbox 与 OMP 接通](herdr-plannotator/plannotator-inbox-omp-connection.md) | 开关链（`PLANNOTATOR_INBOX_TOOL` 环境变量 → config.json `inboxTool` → 主机默认，Pi/OMP 默认关）与注册门（`inbox/inbox.json` 存在才注册、会话启动时决定一次、`inboxReminder` 提示行）；本机启用现状（`{ "pi": true }` 与 `PLANNOTATOR_INBOX_TOOL=1`、两分支解析为 true、`.env` 权限 600、Inbox 首启 `http://localhost:42583/` pid 88355），2026-11-04 起标为过时；本会话先无工具后 `read_thread` 可用的时序记录；stdio 通道（`plannotator inbox mcp`、8 个工具、`agent_session` 填充规则、`idempotency_key`）；`wait_for_reply` 50 秒返回 waiting 与 cursor；各宿主唤醒差异表；Board 项目语义与本机建卡移卡；2026-11-04 两处开关关闭（环境变量 `0` 压过配置） | 2026-11-04 |

## omp

OMP judgment 子系统、TypeSafe/Jev 集成与 eval 求值 helper，输入预测引擎、Rust/TS 架构与 Node-API 绑定的行为边界，界面图标三档预设与字形注入，`/model` 内置端侧模型目录，全量环境变量参考，`agent.db`/`history.db` 两个长期存储库的表归属与索引级修复，从源码本地构建的依赖、步骤、产物与验证，以及子 agent 工作区隔离与 ovnfs 后端接入。

| Article | Summary | Updated |
|---------|---------|---------|
| [OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界](omp/judgment-provider-and-eval-judge.md) | 18.2.4 起内建 TypeSafe judgment：三值 provider、回退链、4 自动+1 手动消费方（后续加 TTSR judge），judge() 双语言三题型与重复调用实测；jevify magic keyword 与 judge() 路由分离；18.2.8 起 modelRoles.judge + fallbackChains 路由层；judgeBatch 批量用法与常见误诊；2026-11-09 补四条原生 wire 的 `box` 与图片限制对照、`openai-decisions` 题型映射、10 个 `resolveJudge` 消费点、自定义 provider 下 `request-model-id` 不改写；2026-11-13 补第五条 wire `google-decisions`（PR #19060，`x-goog-api-key`、位置化问题键、`noul` criteria 形态、图片按解码字节 75,000,000、opt-in 不进默认链） | 2026-11-13 |
| [课程概念 ↔ OMP 机制映射](omp/course-concepts-omp-mapping.md) | 徐昊全课 33 篇正文逐项映射到 OMP 机制：四骨干/四子系统/双层循环/计算推断分离/Advisor 三级反馈/TTSR/工具网关/Eval 闭环等直接对应；七项候选缺口经源码反证定为 6 项部分对应（09 外部文档同步、11 指令腐化审计、18 init.sh、19 存量违规基线、29 跨服务拓扑、30 探针回写）+ 1 项真缺口（通用执行期低置信度自动升级人工）；含概念分层关系网络、OMP 独有机制与证据边界 | 2026-11-07 |
| [OMP 环境变量全量参考](omp/env-variables-reference.md) | 官方 runtime reference（691 行 11 组）+ 源码扫描补遗 Mnemopi/Stencil/TUI 调试与构建期；`.env` 五层加载链与 `OMP_*`→`PI_*` 镜像；UA 伪装只限 gemini-cli/google-antigravity 两 provider；三处文档-源码校正（websocket 8 参数、concurrent summaries、antigravity 2.19.1）、126 名未收录变量判定名册；WebSocket 变量补条件说明 | 2026-10-24 |
| [OMP TypeSafe env 变量边界、.env 加载链与 zen 免费 jev 接入](omp/judgment-typesafe-env-config.md) | 三变量边界（key 四途径、BASE_URL/DEFAULT_MODEL env-only）、4 个 .env 加载点与只补不盖优先级、/zen 不带 /v1 拼接坑实测裁定、unexpectedStopDetection smart 一行修改；DEFAULT_MODEL 已切 jev-1.13 付费通道；18.2.8 解除 api: typesafe 版本限制 | 2026-09-22 |
| [OMP judgment /v1/systemone 协议面：题型 schema、传输参数、观测点与兼容端点](omp/judgment-systemone-protocol.md) | 三题型官方逐字 schema 与 pi-ai 类型同构、eval bool 是 noul 呈现层、传输参数、观测面、zen 已实测兼容与 OpenRouter 不兼容；2026-11-09 补与 `openai-decisions` 的字段对照（`state` 对 `input`、对象 map 对数组加 `name`、`noul` 对 `predicate`）与 `cost` 位置差异；2026-11-13 补 Google Decisions 为第三套报文（对象 map、键名关联、`noul` 同名但认证头不同） | 2026-11-13 |
| [OMP judge 角色链解析与 jev-latest 400 根因](omp/judge-role-chain-and-jev-latest-400.md) | modelRoles.judge + retry.fallbackChains 角色链解析（显式链整体替换 priority.json 默认段）、内置 typesafe catalog provider 被 TYPESAFE_BASE_URL 劫持生成 jev-latest 400、ChainJudge 失败语义（timeout 不继续 fallback）、显式链修复模式 | 2026-09-22 |
| [OMP predictive text engine](omp/predictive-text-engine.md) | 18.3.3 引入统一输入预测引擎：spelling.autocomplete 枚举（off/auto/ngram/smollm/apple）、Linux auto 走 ngram、幽灵文字 Tab/→ 接受；SmolLM2-135M 按需下载（145MB GGUF Q8_0、sha256）；预测 daemon 进程模型（broker spawn、detached:false、idle 15min 退出、从 history.db 与 Claude/Codex 历史学习）；autocompleteMaxVisible 是下拉列表非幽灵文字 | 2026-09-27 |
| [OMP Rust/TS architecture and pi-natives](omp/rust-ts-architecture.md) | TS(Bun) 编排 + pi_natives 原生插件（Rust，cargo-about 证据）执行；12 个 crate 清单、pi-builtins 103 内建命令、pi-natives 28 模块、index.js 20 类导出；职责多为按名推断并标注；pi-iso 为隔离后端选择层，Linux 候选顺序 btrfs、ZFS、linux-reflink、overlayfs、rcopy | 2026-11-08 |
| [OMP find 工具的 cascade 架构：lexical 粗筛 + 三波 noul 判分](omp/find-tool-cascade.md) | jfind 固定四阶段（lexical + 文件名/草图/完整验证三波）、native grep + idf 加权粗筛（带超时、跳超大文件、不保证穷尽）、波间筛选常量（CANDIDATES=128/FILES=20/CUTOFF=0.45/THRESHOLD=0.2）、走注入的通用 judge 接口且请求无 wave 字段、实际后端未验证、find vs grep 适用性为机制推断；补与 jevgrep 入口机制对照 | 2026-10-01 |
| [Node-API and napi-rs in OMP](omp/napi-node-api.md) | Node-API（原 N-API）稳定 ABI 逐字定义与边界（限 Node.js、不跨平台）；Bun 属 napi-rs best-effort（continue-on-error）非 Node-API 保证；napi-rs 构建链（Rust 1.88+、#[napi]、平台分包）；pi-natives 用 @napi-rs/cli 3.7.2、napi_register_module_v1 证据 | 2026-09-27 |
| [OMP judgment 对 chat 类 judge 的无 schema 文本解析机制](omp/judgment-chat-llm-parsing.md) | 普通 chat 模型当 judge 时不发 response_format/json_schema/text.format；temperature 0 + disableReasoning + maxTokens 4096 首次裸文本，prompt 约定关键词回答，三组解析器（choice/noul/score）取最早合法关键词，解析失败重试才挂 submit_judgment tool；与 jev /v1/systemone 路由分界；2026-11-09 起本机 judge 为 `c8787/gpt-6-luna-decisions`，chat 类 judge 因 native-only 规则不再参与 | 2026-11-09 |
| [OMP 本地构建：依赖、步骤、产物与验证](omp/local-build.md) | Ubuntu x86_64 的 v18.8.7 构建流程：系统依赖先安装、Bun 1.4.3/rustup 与当前 shell PATH、HTTPS 源码/tag 检查、nightly-2026-10-06、Cargo ci stripped addon 与 Bun compile；内部 worker（daemon broker/LSP mux/text predict）随同一入口打包，SmolLM 权重与 tiny-model 运行库按需下载非构建产物；全局安装保持不变，源码/绑定/资源对照与 GLIBC 2.43/2.17 边界；隔离 shell 和 --version/--help 已验证，另一台机器完整复现未验证 | 2026-10-11 |
| [OMP /model 内置端侧模型目录（local-inference）](omp/bundled-local-models.md) | 14 个端侧模型清单（三标题/五记忆/五听写/一朗读）、local.kdl seed 条目（api/base/bundle 原文）与各 dtype 的实测下载量组件分解、local://inference 子进程传输、设备 14 值与 [请求设备, cpu] 回退、Qwen3 ONNX 拒绝与 sherpa/kokoro 无 CUDA 路径；WSL2 RTX 3050 实测：驱动可见、CUDA 13 运行时库缺失、条件式回退结论 | 2026-10-26 |
| [OMP agent.db 与 history.db：存储职责、表归属与索引级损坏修复](omp/agent-storage-databases.md) | `agent.db` 22 张表按建表模块三分（凭据与缓存、会话统计、记忆流水线）、`cache` 表被凭据粘性/MCP 工具/扩展启动延迟三方共用与 30 天过期常量、`history.db` 表组成与提示历史消费方；警告链路（写失败只记日志并一次性通知监听器）；两轮 history.db 损坏分开记录（FTS5 层与索引层）、agent.db 索引层 REINDEX 修复与逐表摘要判据、安装时持有者闸与重新采集；REINDEX 只在 agent.db 验证、防护扩展不含 agent.db | 2026-11-03 |
| [OMP 界面图标：三档 symbolPreset 与 Glyph Protocol](omp/symbol-presets-and-glyph-protocol.md) | `symbolPreset` 枚举 unicode/nerd/ascii（默认 unicode，本机 nerd）；277 个符号键分 24 类；nerd 档仅图标换私有区码位、制表符与进度条仍为 Unicode；自带 270 个轮廓（JetBrainsMono NFM 2.304 / Nerd Fonts 3.5.1，upm 1000、aw 600、lh 1320）；APC `25a1` 四动词握手、三段私有区、确认码位 0xf0d57（icon.omp）；与 emoji 短码表分界；未实跑切换效果 | 2026-11-07 |
| [OMP 子 agent 工作区隔离：原生后端、ovnfs 接入与合并时机](omp/subagent-workspace-isolation.md) | 三层开关与生效条件；Linux 后端顺序与本机 overlay 可用性；ovnfs 三个作用点、管理协议版本与无静默回退；运行期间写入工作区、结束时一次捕获，合并阶段根仓库一次、嵌套仓库分别应用；`detachGitDir` 使原生隔离拥有独立 git 元数据；`bash.gitGuard` 默认关闭；本机 18.18.1 两个开关均关 | 2026-11-08 |

## tokscale

多 coding agent 用量采集器：53 个 client 的本地会话扫描、定价计价与 submit 上传。

| Article | Summary | Updated |
|---------|---------|---------|
| [tokscale 采集 omo native 用量](tokscale/senpi-omo-native-collection.md) | SENPI_CODING_AGENT_DIR 缺失时 senpi 被静默丢弃的根因、软链修复与跨根目录去重实证、~/.senpi 目录沿革、OMP mirror 退役 | 2026-09-27 |

## nvidia-build

NVIDIA Build 注册、短信验证与 API key 配置的后续上下文。

| Article | Summary | Updated |
|---------|---------|---------|
| [NVIDIA Build 中国短信验证故障](nvidia-build/nvidia-build-china-sms-verification.md) | 官方短信故障状态、支持邮箱；2026-09-29 Resolved 实证与注册/OMP 配置完成记录 | 2026-10-05 |

## opencode

OpenCode V2 迁移：包身份、破坏变更、配置与插件兼容性、会话迁移事故。

| Article | Summary | Updated |
|---------|---------|---------|
| [OpenCode V2 迁移：发布、破坏变更与本机兼容性](opencode/opencode-v2-migration.md) | V2 包 `@opencode/cli` 2.0.18（v1 `opencode-ai` 无 2.x）；三个有意破坏变更（插件 API、server API、终端配置）；LSP 保留不运行；配置多数自动归一化、`server`/`compaction.prune` 被忽略；本机 8 个 v1 插件 + 5/6 第三方仅 V1；启动触发会话迁移写入 DB（581 行 skip、完整度未确认）与凭据暴露教训 | 2026-09-29 |

## video-generation

HTML 驱动的 agent 视频生成工具链。

| Article | Summary | Updated |
|---------|---------|---------|
| [HyperFrames：HTML 写视频的 agent 管线](video-generation/hyperframes-html-video.md) | 59K+ stars、HTML 即视频、确定性渲染可进 CI；组合契约（时间轴协议、禁 opacity 初始态与 `<br>`、字体 lint）；WSL 实操（预览走用户浏览器、渲染需 headless Chrome）、core set 10 技能装法 | 2026-10-08 |

## wsl-windows

WSL2 在 Windows 宿主侧的内存/swap 配置、内存回收工具行为、标准账户降低物理内存占用的可达范围，以及 Docker 退出对发行版生命周期的影响。

| Article | Summary | Updated |
|---------|---------|---------|
| [WSL2 内存与 swap 配置](wsl-windows/wsl2-memory-and-swap-config.md) | `.wslconfig` 三段（`[wsl2]`/`[general]`/`[experimental]`）；内存默认主机 50%、swap 默认内存 25%、swapFile 默认 C 盘 Temp；swap 扩容并迁移到 D 盘的转义写法；autoMemoryReclaim=dropCache 空闲回收；改动需 `wsl --shutdown` 生效 | 2026-10-10 |
| [Windows 内存回收工具与 WSL swap](wsl-windows/windows-memory-reclamation-and-wsl-swap.md) | 清理≠压缩（压缩是内核 Memory Compression，自 Windows 10 RTM 起内置）；RAMMap（分析，Empty 菜单五项 `-Ew`/`-Es`/`-Em`/`-Et`/`-E0`，作用范围与权限未核实）、Mem Reduct（清理）、Process Lasso（CPU 优化，内存清理未验证）；"正在使用腰斩"= WS 塌缩而 Private 不变、Commit 不降反升（vmmem WS 1768MB vs Private 12171MB）；页离开工作集后按修改位去 Modified 或 Standby，配合 2026-10-25 四时间点实测；pagefile 与 WSL swap 两层换页、单 NVMe 下 C:/D: 同盘；删 VHD 前 handle.exe、删除成功≠无占用 | 2026-10-25 |
| [标准用户降低 Windows 物理内存占用的可达范围](wsl-windows/nonadmin-physical-memory-reduction.md) | 按进程清空工作集的调用条件（`PROCESS_SET_QUOTA` + `PROCESS_QUERY_INFORMATION`，本次脚本另按 SID 筛自有进程，API 无所有者条件）；RAMMap Empty 五项的作用范围与权限未核实；本机实测清空 146 个进程后 3 秒「使用中」降 1,362 MB、可用升 1,362 MB、工作集 3,726→556 MB，63 秒可用低于基线 657 MB，提交占用未测；适用场景与定期清理的收益边界 | 2026-10-25 |
| [Docker Desktop 退出与 WSL2 发行版存活](wsl-windows/docker-desktop-quit-and-wsl2-lifecycle.md) | 后端日志证 Docker 退出只终止 docker-desktop 发行版、不执行 `wsl --shutdown`；用户发行版消失归因于空闲超时（instanceIdleTimeout 默认 15000ms、`-1` 禁用；vmIdleTimeout 默认 60000ms）为推断；给出验证方法 | 2026-10-10 |
| [WSL 服务排障手法](wsl-windows/wsl-service-debug-playbook.md) | 四个反复使用的手法：`LD_LIBRARY_PATH` 隔离对照判定「库还是程序」、`ss -ltnp` 验证监听地址（`-i lo` 在 WSL 可能解析为 `10.255.255.254`）、`apt-cache policy` 与 `showhold` 看版本来源与锁定、`journalctl` 与 `NRestarts` 确认崩溃循环；每式含适用场景、命令模板、预期输出、误判陷阱 | 2026-11-08 |

## ubuntu-packaging

Ubuntu 的 apt 来源优先级、第三方 PPA 回归的定位与长期防护，以及 Ubuntu Pro ESM 的版本与启用取舍。

| Article | Summary | Updated |
|---------|---------|---------|
| [apt 来源优先级与第三方 PPA 回归](ubuntu-packaging/apt-source-priority-and-ppa-regression.md) | 默认 500 下 apt 取版本号最大者，`4.3.5-3xtradeb1.2604.1` 因此顶掉官方 `4.3.5-3ubuntu1.1`；ttyd 关闭 HTTP 连接时 SIGSEGV（`__lws_close_free_wsi_final` 跳到 `0x61`），用同一二进制换 `LD_LIBRARY_PATH` 对照 3 次请求证实差异在库；三层防护为包级 pin `-1`、`-i 127.0.0.1`（`-i lo` 在本机解析成 `10.255.255.254`）、ESM `+esm1` 修复；ESM 510 高于 500，hold 会连安全更新一起拦住；`esm-apps`/`esm-infra` 启用、`landscape` 关闭 | 2026-11-08 |

## agent-development-environments

多 Agent 工作台（ADE）候选发现、筛选与选型。

| Article | Summary | Updated |
|---------|---------|---------|
| [ADE 候选清单](agent-development-environments/ade-candidate-inventory.md) | 27 个公开仓库（2026-10-26 增 ThinkRail）+ Tern + Orca/Air 桌面过滤；Paseo/bb/Ekko/T3/Nodeterm 源码复核；stars 与 pushed_at 来自 GitHub API 快照（候选表 2026-10-18，ThinkRail 行 2026-10-26）；另登记四个非 ADE 的真工厂方案（2026-10-29） | 2026-10-29 |
| [ADE 选型方法](agent-development-environments/ade-selection-method.md) | 核验纪律、排除项、Tern 插件型归类；本机排序 TUIOS→Paseo→Agent Deck→bb；Provider 适配边界与未实测项 | 2026-10-18 |
| [ThinkRail 与 JetBrains 的 ADE 版图](agent-development-environments/thinkrail-and-jetbrains-air.md) | ThinkRail 深挖：worktree 工作区、自托管浏览器模式、update 无版本比较、遥测与回环边界、WSL 实测；Air 2026-03 预览接管 Fleet 平台；Gateway WSL2 原生客户端；Projector 独立版暂停；CodeCanvas 停止开发 | 2026-10-26 |

## vscode

VS Code（含 serve-web）的设置分层、Web 客户端存储与 Remote 配置位置。

| Article | Summary | Updated |
|---------|---------|---------|
| [VS Code serve-web 的设置分层：浏览器 User 与 WSL Remote](vscode/serve-web-settings-layers.md) | Web 客户端用户设置存于浏览器 IndexedDB（`vscode-web-db` / `vscode-userdata-store`）；serve-web 以请求 Host 作为 `remoteAuthority`，Remote 层读取服务端 `data/Machine/settings.json`；优先级 User < Remote < Workspace < Policy；`window.title` 默认 scope 为 WINDOW，Workspace 层接受、Folder 层不接受；Remote 层值为 `${rootName}`，最终生效值未验证 | 2026-10-21 |

## horizon

AI 驱动的新闻聚合器：多源抓取、profile 评分、双语简报与多渠道投递。

| Article | Summary | Updated |
|---------|---------|---------|
| [Horizon 架构与部署方式](horizon/horizon-architecture-and-deployment.md) | 四阶段流水线（抓取→AI 分析过滤→补充→生成投递）、10 种信息源、4 个内置 profile、11 种 AI provider、三种定时方式（GitHub Actions / 本地 cron / Docker+主机 cron）、四条投递渠道在 GitHub Actions 下的实际可用性边界（模板默认仅 Pages+webhook 飞书，邮件需额外配置且订阅者状态不持久化，微信需交互式登录且会话文件无法跨 run 保留）、Actions 免费额度与模型 API 费用区分、MCP Server 7 个工具 | 2026-11-04 |

## webtop

浏览器访问的 Linux 桌面在 WSL 上的组件构成、与 Webtop 的对应关系、免登录入口的剩余边界、i3 Sway 变体的配置错误横幅修复、窗口模式 Ctrl Alt modifier 调整、Selkies 指针尺寸链路、KDE Wayland 输入法启动器与私有桌面可见性边界。

| Article | Summary | Updated |
|---------|---------|---------|
| [Webtop 移植到 WSL：组件、偏离与原因](webtop/webtop-on-wsl-architecture.md) | Selkies 2.2.1 + 嵌套 KWin 6.6.6 / Qt 6.10.2 + Plasma 的画面与输入链路；沿用 Webtop 提交 f33b8d0 的应用与模板、selkies-layers 补丁来源；WSL 侧重写为原生安装、私有 D-Bus/XDG/音频、普通 kcminit、QPA 显式 loader、X11 bind mount 与 systemd 静态单元；补丁按宿主 ABI 构建（build_id cc7e51e、libkwin.so.6 SHA-256 d9a4a76）；2166 包与 11 服务、5 配置身份精确不变；窗口模式 Ctrl+Alt modifier 调整按 i3-banner 文章为准；CPU 编码依据与帧率未测量，21 项视觉待用户 | 2026-11-08 |
| [免登录本机桌面入口：去掉认证与 TLS 之后剩下什么边界](webtop/passwordless-loopback-desktop-access.md) | 成立三条件（`127.0.0.1` 监听、`--enable-https=false` 与 `--enable-basic-auth=false`、七字段 profile）；仍有效防护（普通用户权限、回环、restore 前置 profile 校验、来源 SHA-256 与 provenance）与已失去防护（网络认证、TLS、可区分主体）；停止后资源读数 `null`、`unit_resources=not_run`、整体 `blocked` 的报告语义；7 项访问检查与真实返回值；apply 记录 20261107T145751、恢复记录 20261107T150052、旧记录 20261107T140937 被拒且无副作用 | 2026-11-07 |
| [Selkies 指针尺寸链路与浏览器时序（HiDPI 嵌套会话）](webtop/selkies-cursor-scaling-chain.md) | 指针消息线格式 `cursor,<JSON>` 与字段语义（width/height 前端不读、handle 0 隐藏）；canvas 分支 buffer 取 ImageBitmap 实际像素、CSS ÷ density、移动只改 translate，CSS 分支 image-set 归一而 fallback 不归一；density/DPI 换算链路；服务端两条来源 Pixelflux named default 24px（不乘输出 scale）与嵌套 Sway surface 原始 buffer（只按 cap 缩小），Smithay 进出 focus 发 default；两处已证实浏览器时序缺陷（旧解码迟到覆盖新图 48→24、hide 被覆盖）；本机 scale 2、2744x1724/1372x862、120 秒单条 48x48 样本；根因 unconfirmed、用户确认恢复 | 2026-11-08 |
| [i3 Sway 变体的配置错误横幅：重复键位与修复](webtop/i3-sway-config-error-banner.md) | swaynag 红色 error in config file 横幅由 `Mod4+Return` 重复产生 binding overwrite 触发；唯一定义 `bindsym $mod+Return exec /usr/bin/st` 与 upstream.json 生成硬约束；窗口模式 modifier 调整为 `Control+Mod1` 键盘 + `Mod1` 鼠标（避免 Win 键宿主冲突），native IPC 同 PID reload；capture 收据 20261108T032036-fe44effc6f14 与 20261108T100156-2cb8f075aceb；doctor ok、13 desktop tests、HTTP 200；用户确认消失；与 KDE 变体单端口互斥（wsl-webtop-us2） | 2026-11-08 |
| [KDE Wayland 输入法启动器与 Fcitx 归属](webtop/kde-wayland-input-method-launcher.md) | 警告根因是项目直启 Fcitx 加 `QT_IM_MODULE=fcitx` 全局污染；按官方改 `kwinrc` `[Wayland] InputMethod=/usr/share/applications/fcitx5-wayland-launcher.desktop`，KWin 拥有 socket、私有 D-Bus 激活单一 Fcitx；取消 `QT/GTK/SDL_IM_MODULE`、保留 `XMODIFIERS`；`-platformpluginpath` 方案因 QPA 搜索路径差异被否；重启授权后 `available:false→true`、协议 1、1 IC、无 LD/QT 路径；`[Wayland] InputMethod` 进 capture 白名单；拼音组合输入未实测（用户目视验收项） | 2026-11-08 |
| [私有桌面的共享边界：字体、应用入口与命令路径](webtop/private-desktop-visibility.md) | 同一 WSL，搜索路径不同：系统程序与系统字体共用；配置/数据/D-Bus/音频私有；`terminal-fonts.py` 把 `~/.local/share/fonts` 导入项目 Fontconfig 且 `monospace` 与 `Liberation Mono` 别名选 Maple Mono NF CN（Starship 8 个 codepoint `E0B0 E0B4 E0B6 F418 F432 F43A F0079 F0548` 全覆盖，DejaVu/Liberation 全缺）；`session.environment` 接入既有用户命令目录与 `XDG_DATA_DIRS`（项目数据目录优先）；实测 `wmenu-run` 按命令 PATH 列项、KDE 菜单走 `.desktop` 入口，命令解析成功不等于菜单逐项可见；`.local/bin` 里 `pnpm/pnpx` 损坏链接等为宿主遗留 | 2026-11-08 |
