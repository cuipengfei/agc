# 课程概念 ↔ OMP 机制映射

> Sources: 徐昊《Agent 驾驭工程之美》归档原文（复核时点 2026-11-07）；OMP 内建文档 `omp://`、`skill://omp`、本机 `@oh-my-pi/pi-coding-agent` 源码（复核时点 2026-11-07）
> Raw: [OMP 机制核查材料](../../raw/omp/2026-11-07-omp-mechanisms-for-course-mapping.md); [双端勘误与缺口反证记录](../../raw/omp/2026-11-07-dual-sided-review-and-gap-evidence.md); [课程 22–30 讲及结束语核心材料](../../raw/geekbang-agent-harness/2026-11-07-lessons-22-30-and-closing.md)
> Updated: 2026-11-07

## Overview

把《Agent 驾驭工程之美》全课 33 篇正文（开篇词、直播回放、01–30 讲、结束语；结课测试只有题量说明）提炼出的概念，逐项对照 OMP 的真实机制。映射分四类：**✅ 直接对应**（OMP 有原生机制实现）、**⚠️ 部分对应/形态不同**（实现核心子集或以不同机制覆盖，注明未内置部分）、**❌ 真缺口**（经文档与源码反证检索仍未找到通用内置机制）、**🟦 OMP 扩展增强**（工程实现超出课程描述）。

结论：课程与 OMP 是同一工程思想的两个独立实现——前馈/反馈分离、确定性归工具、自由度刻度、人的高价值介入点，在 OMP 的 `advisor`、`ttsr`、`approval`、`compaction`、`task` 体系中有结构化对应。真正的通用缺口只有「执行期按模型置信度自动停机升级人工」；其余六项候选缺口均为部分对应。

## 33 篇正文逐项映射总表

| 篇目（课程归档 `~/geekbang-agent-harness/`） | 提炼的核心概念、想法与洞察 | 概念层级与关联 | OMP 对应机制与具体行为 | 状态 | OMP 证据出处 |
|---|---|---|---|---|---|
| **开篇词**<br/>`geekbang-1007731.txt` | Agent 四组件；前馈/反馈/状态三控制；同模型同提示词下裸跑 20 分钟失败 vs Harness 6 小时交付；三问诊断法（前馈不够/反馈不够/状态丢了）；重复工作的复利 | **元哲学 + 骨干雏形**：生发全课四骨干 | `<repo-rules>`（`AGENTS.md`）与 `RULES.md`（前馈）；`advisor`/`ttsr`/`lsp`（反馈）；`session`/`todo`/`memory`（状态） | ✅ 直接对应 | `omp://context-files.md`；`omp://advisor-watchdog.md`；`omp://session.md` |
| **直播回放**<br/>`geekbang-1010742.txt` | `Agent = LLM + Harness` 类比 `App = Runtime + Business Logic`；动态工作流；内部/外部 Harness 分野；工具既是手也是眼；Know-how 不能靠任务无限细分替代 | **元哲学**：界定第 26 讲内/外 Harness 分工 | 内部：`@oh-my-pi/pi-coding-agent` 核心 loop；外部：`.omp/` 配置树与 Skills；观测工具族 `read`/`grep`/`find`/`ast_grep`/`lsp`/`debug` | ✅ 直接对应 | `omp://cli-reference.md`；`omp://tools/read.md`；`omp://tools/lsp.md` |
| **01｜双层循环模型**<br/>`geekbang-1007794.txt` | 外层 PDCA + 内层 Steering Loop（Guides→Action→Sensors→Steer）；只有反馈会重复犯错、只有前馈会草率收工；多 Agent 编排向 Skill 编排收敛 | **运行骨架**：统摄全部坏味道与模式篇 | 内层：Agent turn loop + `steeringMode`/`followUpMode`；外层：`todo` 状态机 + `/goal` + `/loop` + `task` | ✅ 直接对应 | `omp://settings.md`；`omp://tools/todo.md`；`src/slash-commands/builtin-modes.ts` |
| **02｜内置自我纠正循环与四子系统**<br/>`geekbang-1007826.txt` | **自我纠正循环是 ReAct 的四步特殊形式**（多出自我纠正步）；计算型 vs 推断型控制分离；指令/工具技能/环境/状态四子系统 | **四子系统 + 物理法则一**：全课分类底座 | 计算型：Schema 校验 + `tool_call` 钩子 + `astCondition` + `eval`；推断型：主模型 + `advisor` + `judge` 角色（find/prewalk/TTSR question） | ✅ 直接对应 | `omp://ai-schema-normalize.md`；`omp://extensions.md`；`omp://ttsr-injection-lifecycle.md` |
| **03｜从零构建背单词 Harness**<br/>`geekbang-1009254.txt` | 外层周计划与内层练习的数据闭环；**仓库即规范**（不在仓库等于不存在）；FSRS 间隔算法下沉为确定性工具 | **内外闭环实例**：状态与工具骨干的实现 | `cwd` 工作区自动发现 `AGENTS.md`/`.omp/`；随包 `scripts/` 或 `eval` 内核执行确定性算法；项目文件与 `local://` 状态 | ✅ 直接对应 | `omp://context-files.md`；`omp://tools/eval.md` |
| **04｜封装技能**<br/>`geekbang-1009998.txt` | `SKILL.md` frontmatter + 正文四环节；显式写工具名 vs 推断式调用；`plan.json`/`progress.json` 双向状态通道 | **载体骨干 → 技能模式**：连接第 20 讲 | `skill://<name>` 加载与多 provider 发现；OMP 的工具白名单在 Subagent 定义（`tools:`），与课程示例的 Skill frontmatter `allowed-tools` 层面不同 | ⚠️ 形态略异 | `omp://skills.md`；`omp://task-agent-discovery.md` |
| **05｜六个最佳实践**<br/>`geekbang-1010541.txt` | 双层循环、仓库即规范、渐进式披露、计算型与推断型控制分离（原文给出的工程经验比例约为六成至七成计算、三成至四成推断）、最小干预、可复现性优先；防窗口边缘（edge）截断与注意力稀释 | **工程原则总纲**：引出 12/14/18/22 讲 | 渐进披露三件套：`skills` 摘要目录（`/skillful` 可关）+ `rule://` 按需规则 + `xd://` discoverable 设备与 MCP 延迟加载 | ✅ 直接对应 | `omp://skills.md`；`omp://rulebook-matching-pipeline.md`；`omp://mcp-runtime-lifecycle.md` |
| **06｜知识固化**<br/>`geekbang-1011295.txt` | 对话试错后固化进指令/状态/工具/环境；外层（`AGENTS.md`）与内层（Skill）去重重构；固化后必须做结构自检防冲突 | **知识书写命运**：连接 11/16/23 讲 | `learn` + `manage_skill`（受管技能）+ `retain` + `/omfg`（投诉转 TTSR）+ `local` 记忆 Phase 2 自动生成 `MEMORY.md` 与 `skills/` | ✅ 直接对应 | `omp://tools/learn.md`；`omp://tools/manage_skill.md`；`omp://memory.md` |
| **07｜需求模糊**<br/>`geekbang-1012101.txt` | One-shot 演示错觉；三递进诊断信号；三步提取法 → **约束条件 / 完成条件 / 边界情况**三件套 | **前馈病 1**：目标未声明 | `/guided-goal`（先访谈再立 Goal）+ `ask` 结构化追问 + `/plan`（`xd://propose` 审批交接）+ `task.solutionSpace` | ✅ 直接对应 | `omp://tools/ask.md`；`omp://resolve-tool-runtime.md`；`src/slash-commands/builtin-modes.ts` |
| **08｜隐式约定**<br/>`geekbang-1012725.txt` | 原则文档是冲突裁决框架而非规则清单；三层文件（`AGENTS.md`/`constitution.md`/ADR）；**五层优先级：红线 > 当面指令 > 项目约定 > 模块 ADR > 最佳实践** | **前馈病 2**：权衡未声明 | 层级 `AGENTS.md` + `@import` 5 跳展开 + `RULES.md` sticky + Rulebook 优先级与 `globs`/`agents` 作用域 + `sharpshooter` 决策文件 | ✅ 直接对应 | `omp://context-files.md`；`omp://rulebook-matching-pipeline.md`；`omp://memory.md` |
| **09｜信息散落**<br/>`geekbang-1013301.txt` | **过时文档比没文档更危险**（自信执行旧事实）；管理知识依赖（`SOURCE.md` + 定时拉取 Skill / 开场提醒 / OpenWiki） | **前馈/状态腐化病 3**：连接 27/29 讲 | Hindsight `mental-models` 支持 `source_query` 与合并后自动刷新；Mnemopi 记忆变更隐藏提醒；`security_scan` 锁知识库 SHA-256；**无通用外部文档 `SOURCE.md` 同步器** | ⚠️ 部分对应（缺口 A） | `src/hindsight/mental-models.ts`；`omp://mnemosyne-memory-backend.md`；`omp://tools/security_scan.md` |
| **10｜虚假胜利**<br/>`geekbang-1014410.txt` | 惰性生成三特征；生成与自评共享盲区（认知统一）；进度记原始数据不记主观评价；**分离执行与验证** | **反馈病 1**：支撑 21/23/24/30 讲 | `AdvisorRuntime`（独立模型/独立上下文）+ `/cleanse`（改后强制独立 verification pass）+ `/review` + `security_scan validate` + `TodoTracker` | ✅ 直接对应 | `omp://advisor-watchdog.md`；`src/cleanse/loop.ts`；`src/extensibility/custom-commands/bundled/review/index.ts` |
| **11｜指令文件腐化**<br/>`geekbang-1015204.txt` | 诊断看例外补丁与模糊词，不看绝对行数；规则登记表（含过期条件与状态）+ 矛盾检测 + 定期清理（标 `deprecated`） | **前馈腐化病 4**：第 06 讲固化的伴生副作用 | 加载层有 normalized containment 去重与同名 rule `first-wins` 遮蔽（`/extensions` 可查）；**无针对指令正文矛盾/模糊词/过期条件的静态审计器** | ⚠️ 部分对应（缺口 B） | `src/capability/context-file.ts`；`omp://rulebook-matching-pipeline.md` |
| **12｜前馈痴迷**<br/>`geekbang-1016080.txt` | 出错只加「必须 X」规则不加检查；**反馈优先**（把规则翻译成对结果的检查，格式归脚本、语义归独立 Agent） | **反馈病 2**：与第 13 讲互为镜像 | **TTSR 全家桶**：流式正则 `condition` + 语法树 `astCondition` + 完成态 `question` judge；`/omfg` 从失败现场造规则 | ✅ 直接对应 | `omp://ttsr-injection-lifecycle.md`；`src/modes/controllers/omfg-controller.ts` |
| **13｜反馈过载**<br/>`geekbang-1016964.txt` | 信号平权导致横跳；**成功静默，失败才输出**；**阻塞/警告/信息三级 = 责任分界**（模型必完成 / 人决定 / 转前馈）；三层封顶 | **反馈病 3**：依赖计算型检查工具 | **Advisor 三级（`blocker`/`concern`/`nit`）** + 默认沉默 + 成功 `toolResult` 折叠为单行 `⇒ ok · N lines` + 每轮条数上限与去重 | ✅ 直接对应 | `omp://advisor-watchdog.md`；`skill://omp/references/advisor.md` |
| **14｜上下文倾倒**<br/>`geekbang-1017556.txt` | 塞太多稀释注意力；**预算四法（筛选/分层/按需加载/压缩）**及各自代价；推荐顺序：**按需加载 → 压缩 → 分层 → 筛选** | **上下文经济学第 1 层**：引出 15/27/29 讲 | 按需：`read :N-M`（裸读只给声明签名）、`skill://`、`rule://`、`xd://`；压缩：`compaction` 五法 + `headroom`；分层：`task`/`scout`；筛选：provider/extension 过滤 | ✅ 直接对应 | `omp://tools/read.md`；`omp://compaction.md`；`omp://tools/task.md` |
| **15｜上下文焦虑**<br/>`geekbang-1018504.txt` | 逼近窗口上限时恐慌性草率收尾（不同于惰性生成）；外层双层循环 + **Checkpoint（必留进度/决策及理由/验证记录/未决事项四项）** + 内层预算 | **上下文经济学第 2 层**：循环内抗衰减 | ① 实验性 `context_notes` + `new_context`（阈值前提醒写笔记换窗，`history://current/full` 回查）；② `checkpoint` + `rewind`（剪除探索分支留 `branch_summary`，**不回滚文件/Git**）；③ `/handoff` | ✅ 直接对应<br/>🟦 工程强化 | `omp://compaction.md`；`omp://tools/context-notes.md`；`omp://tools/checkpoint.md`；`omp://handoff-generation-pipeline.md` |
| **16｜跨会话知识丢失**<br/>`geekbang-1019406.txt` | 进度与交付物之外缺知识通道；**用户统筹 / 发现 / 决策**三类知识及不同字段；**内层清点、外层归位**（只有外层知道知识住哪） | **状态病 1（知识流动）**：连接 06/17/27 讲 | Mnemopi（`stated`/`inferred`/`tool` 等可信度权重与只读 `[facts]`）+ Sharpshooter（自动归位 `architecture/product/style.md`）+ 子代理不跑独立 retain、由父会话统管 | ✅ 直接对应 | `omp://mnemosyne-memory-backend.md`；`omp://memory.md` |
| **17｜状态污染**<br/>`geekbang-1020113.txt` | 临时执行数据混入持久状态；两大污染源（工具误导 + 模型过度推断）；**状态分区：草稿纸（收尾重审整合）+ 双层循环结构隔离** | **状态病 2**：单 Agent 架构上限信号 | 草稿纸：`artifact://`、`local://`、Mnemopi `working` 记忆（约 12h 经 sleep consolidation 提炼为 `episodic`/`facts`）；结构隔离：Subagent 独立上下文与 git worktree | ✅ 直接对应 | `omp://blob-artifact-architecture.md`；`omp://mnemosyne-memory-backend.md`；`omp://tools/task.md` |
| **18｜环境漂移**<br/>`geekbang-1020522.txt` | 四要素（运行时/依赖/外部服务/模型）× 时空漂移；**锁定四步：`init.sh` + `lockfile` + 第三方 Skill 局部化锁版本 + MCP 吸收外部 API 变化 + Docker**；反对生产 Monkey Patching | **环境病**：第 05 讲可复现性的实现 | 有 `direnv`/`devenv` 预检与变更检测、shell rc 快照、Eval JS 依赖环境管理、插件版本锁与模型精确 pin；**无内置 `init.sh` 生成器、Skill commit 校验器或容器打包** | ⚠️ 部分对应（缺口 C） | `omp://bash-tool-runtime.md`；`src/exec/direnv.ts`；`src/eval/js/package-installer.ts` |
| **19｜模式复制漂移**<br/>`geekbang-1021042.txt` | 旧代码示范权重压倒新指令三成因；**模式基线化四步（正向范例 → 架构约束 → 存量基线冻结 → 持续清理）**及严格先后依赖 | **模式病**：直接生发第 21 讲锚定 | 有 TTSR `astCondition`（拦截新编辑中的反模式）+ `ast_grep` + `ast_edit`（批量重构旧模式）+ `/cleanse`；**无内置「全仓存量违规基线账本（Freeze Baseline）」** | ⚠️ 部分对应（缺口 D） | `omp://rulebook-matching-pipeline.md`；`omp://tools/ast-grep.md`；`omp://tools/ast-edit.md` |
| **20｜Skills 最佳实践**<br/>`geekbang-1021894.txt` | **可预测性 = 过程稳定而非输出相同**；`description` 写触发条件与负边界（模型调用 vs 用户调用）；**自由度三档映射内层四环节比例**；体积先查四环缺漏与膨胀再看 500 行/5000 token 拐点；分开需独立触发器 + 完整四环节 | **模式实践 1**：01/04/12/13 讲在 Skill 上的合成 | `skills.md` 发现与披露机制、`/skill:<name>` 显式调用、Subagent 定义中的 `tools`/`effort`/`model` 自由度收放 | ✅ 直接对应 | `omp://skills.md`；`omp://task-agent-discovery.md` |
| **21｜示例驱动与锚定**<br/>`geekbang-1022682.txt` | **输出/过程/风格/结构四角度锚定**：模板+示例（形状与标杆）、流程图+动态验证（路径，菱形=仅剩自由度）、领域模型图+静态结构测试（边界）；流程锚定 vs 双层循环四维对比 | **模式实践 2**：第 19 讲模式基线化向构造阶段延伸 | 输出：`task.outputSchema` + Skill 模板；文件快照锚定：**Hashline `[FILE#TAG]` + seen-line guard**；过程：`/green`、`/loop`、`workflowz`；结构：`astCondition` + `lsp` | ✅ 直接对应<br/>🟦 Hashline 强化 | `omp://tools/edit.md`；`omp://tools/task.md`；`omp://magic-keywords.md` |
| **22｜内建质量与人的介入**<br/>`geekbang-1023771.txt` | 方向与标准判断留给人；**五种介入 × 四维度（政策>价值>外部性>可逆性，算累计总账）**；防每小时约 20 个审批的**橡皮图章**；**工具网关 `allow/ask/deny` 强制边界**；校准后置信度异常升级 | **模式实践 3**：第 05 讲最小干预与结束语价值观的桥梁 | 工具网关：`approvalMode` 四档 + `tools.approval` + `bash.patterns` + `restrictedFolders`；提交前批准：Plannotator / `xd://propose` / `xd://resolve`；**无通用执行期低置信度自动升级人工机制**（仅 `auto-prewalk` 与 `ttsr.question` 有固定 0.70 分类门槛，`jevify` 有批量审计升级提示） | ✅ 网关直接对应<br/>❌ 通用置信度升级为真缺口（E） | `omp://approval-mode.md`；`omp://resolve-tool-runtime.md`；`src/auto-prewalk/classifier.ts:31`；`src/export/ttsr.ts:58` |
| **23｜自我改进**<br/>`geekbang-1024389.txt` | **Skill 生命周期四件事（管理/验证/抽象/维护）**；**Eval 三信号（触发精度/输出质量/效率）**；含正负例与隔离运行；**对比「卸掉 Skill 的裸模型基线」测净提升，被模型内化则退役** | **模式实践 4（演进飞轮）**：闭环 06/20 讲 | **`/ratchet`（`xd://eval/ratchet`）**：15–100 正负例、三道 hash 审批门、冻结 train/test split、确定性/Judge 评分、按 held-out paired delta 与成本护栏自动 `keep`/`revert`、停滞时 `judge_batch` 五分类归因；另有 `/autoresearch`、`learn`/`manage_skill`、`/omfg` | ✅ 直接对应<br/>🟦 `/ratchet` 工业级实现 | `src/prompts/tools/ratchet.md`；`src/ratchet/ratchet.ts`；`src/autoresearch/index.ts` |
| **24｜Loop Engineering**<br/>`geekbang-1024966.txt` | Ralph Wiggum（每轮新上下文 + `PROMPT.md`）→ Simon Willison → `/loop` 与 `/goal`；外层 PDCA 映射（`goal+done signal` / `verifier` / `state/loop.md` / **五条停止条件**）；`/goal` 只适合简单任务 | **模式实践 5**：第 01 讲外层 PDCA 的自动化形态 | `/loop [count|duration] [--until|--while '<cmd>']`（外部命令退出码做硬 verifier）+ `/goal`（带 budget 与完成状态）+ `/green`（CI 全绿循环） | ✅ 直接对应 | `src/slash-commands/builtin-modes.ts`；`src/prompts/ci-green-request.md` |
| **25｜多 Agent 编排**<br/>`geekbang-1025999.txt` | **3–10x 成本与「嫉妒税（某某-Envy）」**；仅用于**严格工作流 / 多路并发 / 上下文隔离**；TradingAgents 四层（**该结构化就结构化，该对话才对话**）；状态文件 + `/loop` 替代方案；`context: fork` Subagent | **模式实践 6**：14/17 讲分层隔离的扩展 | `task` 并发子代理（`outputSchema` 结构化交接 + worktree 隔离）+ `write agent://<id>` / `/vibe`（持久 worker 多轮对话）+ `/tan`（旁支克隆）+ `workflowz`（`eval` 内核 `agent`/`workpool` DAG） | ✅ 直接对应 | `omp://tools/task.md`；`omp://vibe-mode.md`；`omp://agent-hub.md`；`xd://eval/agents` |
| **26｜构造内部 Harness**<br/>`geekbang-1026795.txt` | **第一原则：不要自建内部 Harness**；三处差异（循环行为/上下文取舍/工具策略）；DeepSeek Harness 五环节（含「模型可见即已记录」）；**Agent Loop 三扩展点（`pre-step` / `request` / `turn-stopping`）**；高频稳定外层规则固化进代码 | **顶层架构 1**：统合内部运行时与外部配置 | Extension Runner 完整暴露三扩展点：`input`/`before_agent_start`/`tool_call`（pre-step）、`context`/`before_provider_request`/`prewalk`（request）、`turn_end`/`session_stop`（turn-stopping）；`TodoTracker` 与 checkpoint guard 固化在内核代码中 | ✅ 直接对应 | `omp://extensions.md`；`omp://prewalk.md`；`omp://tools/checkpoint.md` |
| **27｜Agent First Workspace**<br/>`geekbang-1027541.txt` | 四种打断根因（缺做什么/怎么做/当前状态/何时停）；**前置原则（运行时人答前置为工作区工件）**；**知识库四来源飞轮（人写地图/系统活水源/Agent 派生索引/Agent 沉淀踩坑）**；**两段式下发（设计令+执行令）** | **顶层架构 2**：外部 Harness 的完整基准形态 | `.omp/` + `AGENTS.md` 工作区；两段式下发：`/plan` → `xd://propose` → 执行，或 `/prewalk`（强模型调查列 `todo` → 首改自动切 `@smol` 执行） | ✅ 直接对应 | `omp://prewalk.md`；`omp://session-tree-plan.md`；`omp://context-files.md` |
| **28｜这门课的 Harness 如何构建**<br/>`geekbang-1028270.txt` | 知识库/产出物（`outlines` 与 `lessons` 分离防污染）/Harness 三职责；**知识库用于交叉验证（如舍弃重合的 `progress-mirage`）与替换保密实例**；九步流程套双层循环；核心创作与审稿判断留给人 | **顶层架构 3（实例验证）**：第 27 讲的实战样板 | `/annotate` 与 `plannotator` 浏览器逐行批注闭环；分支/目录隔离；AGC 仓库自身的 `raw/` + `wiki/` + `check_evidence.py` | ✅ 工作流同构 | `src/extensibility/custom-commands/bundled/annotate/index.ts` |
| **29｜遗留系统实践（一）**<br/>`geekbang-1029430.txt` | 业务完整前提不成立，**唯一完整事实源是代码**；AI 懂 What System Does，靠代码疑点反问人补 What System Is；**按架构压缩（骨架常驻、细节按需）**；**从 Agent 视角在微服务边界建索引**（`repo-index` → `api-contracts` → `service-map`） | **实战合成 1**：第 14 讲压缩与第 27 讲派生索引应用到遗留系统 | `read` 裸读代码默认只吐声明签名（函数/类骨架）+ `lsp symbols` + `find`；**核心未内置跨仓 API 约定配对图**，由外部 `mcp__codegraph_explore` / `mcp__graphify_*` 补齐 | ⚠️ 部分对应（缺口 F，靠 MCP 补齐） | `omp://tools/read.md`；`omp://tools/lsp.md`；`omp://tools/find.md` |
| **30｜遗留系统实践（二）**<br/>`geekbang-1029982.txt` | **知识提取任务驱动（遇缺即补）**；接口知识→行为知识（`implement-flow` 画 endpoint 调用链 = 无损压缩 = 测试提纲）；**「待确认」节点设最高优先级探针测试，跑挂是信息，与 Bug 无关，回写校准知识库**；`AGENTS.md` 升级为能力清单 | **实战合成 2（反向校准飞轮）**：闭环 09/10/16/29 讲 | 工具自身有 `write xd://report_issue`（工具行为与描述不符时上报保存）与 `/ratchet`、`/omfg`；**无业务测试挂掉后自动改写项目架构文档的内置接线**（需靠 Skill 指令引导 Agent 调 `edit`） | ⚠️ 部分对应（缺口 G） | `src/tools/report-tool-issue.ts`；`src/prompts/tools/ratchet.md` |
| **结束语 & 结课测试**<br/>`geekbang-1030948.txt`<br/>`geekbang-1030954.txt` | **「把判断外包出去，不是驾驭，是缴械」**；人握 Guides 与 Steering，Agent 跑 Action，机器守 Sensors；13 坏味道是可迁移的 Debug 诊断力（结课测试文件仅含题量分值说明，无题目正文） | **元哲学收束**：首尾呼应开篇词 | `advisor-is-not-authorization`、Plan 审批、工具网关 `approvalMode`、Plannotator 审阅 | ✅ 直接对应 | `skill://omp/references/advisor.md`；`omp://approval-mode.md` |

## 概念分层与关系网络（与映射表的对应）

课程概念抽离讲次后分五层，OMP 机制在每一层都有对应承载：

1. **元哲学与人机主权**：Agent = LLM + Harness；人握 Guides 与 Steering，Agent 跑 Action，机器守 Sensors。
   → OMP：`advisor-is-not-authorization`、Plan/工具审批、Plannotator。
2. **四个原子骨干与四大子系统**：前馈、行动载体、反馈、状态与环境。
   → OMP：`<repo-rules>`/`RULES.md`/Skills（前馈）；34 个内建工具 + MCP + custom tools（载体）；Advisor/TTSR/LSP/Bash（反馈）；Session/todo/context_notes/memory/backend（状态与环境）。
3. **双尺度运行骨架与两条物理法则**：内层 Steering Loop、外层 PDCA/Loop；计算型与推断型分离；自由度三档与启发式/照图走权衡。
   → OMP：Agent turn loop + `todo`/`/goal`/`/loop`/`task`；Schema/`tool_call`/`astCondition`/`eval` 对主模型/Advisor/judge；`/vibe` 与 `/goal`（启发式）→ `/prewalk`（半固定）→ `/loop --until`、`/green`、`workflowz`（照图走）。
4. **四大子系统的腐化与修复配对**：前馈病、反馈病、状态与上下文病、环境与模式病。
   → OMP：指令发现与 Rulebook、TTSR、Advisor、compaction/checkpoint/notes/memory、direnv/插件锁/`astCondition`/`ast_edit`；其中 09/11/18/19/29/30 为部分对应。
5. **规模化模式、工作区合成与自我演进**：Skills 写法、锚定、介入、多 Agent、内部 Harness 扩展点、Workspace、遗留系统实战、Eval 生命周期。
   → OMP：`/ratchet`、`/autoresearch`、`task`/Vibe/workflowz、Extension Runner 三扩展点、`/plan`/`/prewalk`、`xd://report_issue`。

贯穿的六类关系：合成（四骨干→内外循环）、镜像互补（前馈痴迷 vs 反馈过载）、递进（预算→Checkpoint→前置→按架构压缩）、连续谱权衡（启发式→半固定→照图走→固化进代码）、示范压倒指令（范例+约束+基线+清理→锚定）、反向校准飞轮（Eval 决定 Skill 留改退、探针测试回写知识库）。

## 七项候选缺口的反证检索与最终定性

| 缺口项 | 反证检索范围与关键词 | 命中结果 | 最终定性 |
|---|---|---|---|
| A. 外部知识依赖 `SOURCE.md` 自动更新（09 讲） | `SOURCE\.md`、`knowledge_base_paths`、`source_query`、`refresh_after_consolidation`、`stale` | `SOURCE\.md` 0 命中；`knowledge_base_paths` 仅 security_scan 入参 SHA-256；`source_query`/`refresh_after_consolidation` 在 `src/hindsight/mental-models.ts` | **⚠️ 部分对应**：有心智模型刷新与扫描哈希锁，无通用外部文档依赖清单与自动拉取器 |
| B. 指令文件语义腐化审计（11 讲） | `context-file`、`AGENTS\.md`、`cleanse`、`doctor`、`deprecated` | `capability/context-file.ts` 有归一化包含折叠；rulebook 有同名 `first-wins` 遮蔽；无正文语义矛盾/行数/过期审计器 | **⚠️ 部分对应**：有加载期去重与遮蔽可见性，无指令正文静态腐化审计工具 |
| C. 项目级 `init.sh` 与第三方 Skill 版本强校验（18 讲） | `direnv`、`devenv`、`environment`、`sandbox`、`lock`、`docker`、`init\.sh` | `init\.sh` 0 命中；`exec/direnv.ts`、`exec/bash-executor.ts` 有预检与 rc 快照；`eval/js/package-installer.ts` 有依赖环境管理 | **⚠️ 部分对应**：有 direnv/rc 快照与 Eval 依赖锁，无项目级 `init.sh` 与 Skill commit 强制校验器 |
| D. 全仓存量违规基线账本（19 讲） | `ast_grep`、`ast_edit`、`astCondition`、`rulebook`、`baseline` | `capability/rule.ts` 有 `astCondition` 实时拦截；`tools/ast-grep.ts`、`ast-edit.ts` 支持结构化搜索与改写；无存量违规冻结账本 | **⚠️ 部分对应**：有实时 AST 拦截与批量改写，无全仓存量违规冻结账本 |
| E. 通用执行期低置信度自动升级人工（22 讲） | `confidence`、`escalat`、`threshold`、`0\.70`、`0\.7\b` | 命中 `auto-prewalk/classifier.ts:31`（0.7）、`export/ttsr.ts:58`（0.7）、`prompts/system/jevify-notice.md`（批量不确定项人工复读提示）；主执行循环无「置信度低自动暂停并升级人工审批」 | **❌ 真缺口**：0.70 阈值仅用于 prewalk 路由与 TTSR 事后判定，向人提问靠模型主动调 `ask` |
| F. 跨服务边界拓扑索引（29 讲） | `codegraph`、`service-map`、`api\.contract`、`find`、`symbols` | 核心 `src/` 中 `codegraph`/`service-map` 0 命中；内置有 `find`、`lsp` symbols、`read` 声明签名；跨服务图由外部 MCP `mcp__codegraph_explore`、`mcp__graphify_*` 提供 | **⚠️ 部分对应**：内置文件骨架与 LSP 符号，跨服务边界拓扑靠外部 MCP 补齐 |
| G. 业务探针失败自动回写架构知识库（30 讲） | `ratchet`、`autoresearch`、`report_issue`、`grievance`、`learn` | 命中 `tools/report-tool-issue.ts`（`write xd://report_issue`）、`ratchet/ratchet.ts`、`autoresearch/index.ts`；无「业务测试跑挂后自动改写仓库架构文档」硬编码接线 | **⚠️ 部分对应**：有工具 QA 反向报告与 Eval 闭环，业务探针回写需由 Skill 指令引导 Agent 执行 |

## OMP 独有/超出课程描述的机制

- **Provider 与模型接入层**：多 provider、fallback 链、用量感知路由、Auth Broker/Gateway。
- **凭据与安全**：`secrets.yml` 占位符请求前替换；`security_scan` 原生与云双通道、不可变 preflight 计划、finding 验证与处置分离、SARIF 导入导出。
- **协作**：`/collab` 实时共享、E2E 加密 relay、只读/可写 guest。
- **Eval kernel**：持久 Python/JS、workpool、judge/ratchet/archive 命名空间。
- **存储工程**：blob store/artifact 外置（SHA-256、shake 引用）。
- **交互与宿主**：TUI/主题/keybindings/profile、多 launch mode（TUI/JSON/RPC/ACP/SDK）。
- **编排与模型经济学**：Vibe 持久 worker、prewalk（强模型规划→便宜模型实现的一次性交接）。
- **修改与提交协议**：Hashline `[FILE#TAG]` 快照防漂移、`ast_edit` → `xd://resolve` 延迟提交。
- **会话上下文工程**：`context_notes` 换窗、`checkpoint`/`rewind` 分支剪除、`/handoff` 原地交接（均不等于文件或 Git 回滚）。

## 证据边界

- 本表只证明复核时点本机文档与源码中的机制，不推断未来版本或上游未安装功能。
- 「真缺口」均附已检索范围；不将「未在内置文档/源码出现」扩大为「OMP 不能通过扩展实现」。
- Skill 的 `allowed-tools` 示例与 OMP Subagent `tools:` 白名单分属不同层；`bashInterceptor` 只做工具路由，不承担安全边界；`checkpoint`/`rewind` 只回滚会话树，不回滚文件或 Git。

## See Also

- [双层循环操控模型](../harness-engineering/dual-loop-steering-model.md) — 课程主框架与 22–30 讲新增小节
- [锚定：用具体例子约束 Agent 的输出](../harness-engineering/anchoring.md) — 第 21 讲专文
