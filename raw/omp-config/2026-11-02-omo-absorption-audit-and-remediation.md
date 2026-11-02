# OMO 吸收核查与补齐

> Source: OMO oh-my-openagent 5.1.57 安装包 dist/cli-node/index.js、dist/index.js、packages/omo-codex/plugin/components/ultrawork/agents/*.toml、packages/shared-skills/skills/debugging/references/methodology/04-oracle-triple.md；五个 scout task-result（ColourfulOwl、SmallLynx、PartialTurtle、CivicAmphibian、ComplicatedAngelfish）；本机 ~/.omp/agent/agents/*.md 当前内容
> Collected: 2026-11-02
> Published: Unknown

## 核查方法

并行派五个 scout，每个对照一个自定义 agent 与其 OMO 原型。方向错误一次：首批 scout 被派去查 OMP 内置 agent（用户说的是 OMO），全部作废重派。五个 scout 逐个读取 OMO 安装包中的原始定义（dist/cli-node/index.js 的 fallbackChain 与 category 定义、packages/omo-codex 的 TOML、shared-skills 的 Oracle Triple skill），与当前 agent .md 全文对比。

## oracle（对应 OMO oracle + momus + metis）

OMO 把架构咨询、计划审查、前置分析拆成三个角色：

- **oracle**（dist/cli-node/index.js:9419-9438）：模型 fallback chain，没有独立 TOML prompt。
- **metis**（packages/omo-codex/.../agents/metis.toml:1-52）：Plan Consultant，前置缺口分析，检查维度包括需求矛盾、代码冲突、执行风险。
- **momus**（packages/omo-codex/.../agents/momus.toml:1-38）：Plan Critic，计划可执行性审查，三种 verdict（OKAY/ITERATE/REJECT）。
- **Oracle Triple**（packages/shared-skills/skills/debugging/references/methodology/04-oracle-triple.md:1-126）：三路并行调查，触发条件是连续多轮假设失败或调查超两小时。

补齐前状态：oracle.md 只有通用咨询与 Blocker 审查，没有 Metis 前置分析、Momus ITERATE 修补机制、Oracle Triple 三路调查。

补齐内容（f0f2645）：
- 第 2 节「计划制定前的缺口分析（Metis 职责）」：结构化缺口报告，每条注明位置、描述、修复方向。
- 第 3 节「计划与方案审查（Momus 职责）」：Verdict 三态 OKAY/ITERATE/REJECT，ITERATE 最多两轮自动修补。
- 第 4 节「深层排障：Oracle Triple」：路 A（显而易见）、路 B（系统边界）、路 C（可能错误的不变量），综合后找跨路一致与分歧。

未覆盖：OMO 的模型 fallback chain（OMP 用 modelRoles 路由，机制不同）；OMO 的双 reviewer 并行审查门（ulw-plan workflow 强制 Metis 分析后 Momus + 独立 Codex 双审，OMP 没有内置编排）。

## librarian（对应 OMO librarian）

OMO 原型（dist/index.js:179827-180138）：四类请求分类（A 概念与用法、B 上游实现、C 变更历史、D 综合深挖）、文档核验、检索/引用原则、失败恢复分支。另有 useWhen 触发路由元数据（dist/index.js:178564-178579）注入主 agent prompt。

补齐前状态：保留了四类分类与证据标准，缺年份门槛、逐条 permalink、失败恢复分支。

补齐内容（f0f2645）：
- 年份检索门槛：每次搜索前核对当前年份，检索词携带当前年份。
- 逐条 permalink：每个关键结论都带可点回的源码行链接。
- 失败恢复分支：GitHub API 限流改本地克隆、仓库不存在找 fork/mirror、sitemap 失败尝试备用路径、不确定时明说假设。

未覆盖：OMO 的 useWhen 触发路由元数据（OMP 没有等价的路由注入机制，主代理靠 description 自行判断）；OMO 的模型 fallback chain。

## frontend（对应 OMO visual-engineering category）

OMO 原型（dist/cli-node/index.js:9580-9604,11487-11602）：模型配置、promptAppend 全文。promptAppend 包含设计系统探索（至少 5–10 个组件）、缺系统时先建立并保存、组件组合硬规则（扩展现有原语，禁止一次性 div 结构）、正向审美方向（大胆、非对称、鲜明配色）、逐项视觉验收门、每次改动后即观察。

补齐前状态：保留了设计系统调研主线，缺强制探索数量下限、先建立并保存设计系统、组件组合硬规则、逐项验收门、逐次观察。

补齐内容（f0f2645）：
- 组件数量下限：至少查看 5–10 个现有 UI 组件。
- 强制建立设计系统：缺系统时先提取设计决策、建立可复用系统并保存，再做 UI。
- 组件组合硬规则：扩展现有原语，禁止一次性 div 结构或行内样式。
- 逐项验收门：声明完成前逐项确认颜色、间距、组件组合、整体一致性。
- 逐次观察：每次视觉改动后渲染或截图，下一次改动前检查。

未覆盖：OMO 的 category 模型与 fallback chain（OMP 用 @designer role）；OMO 的正向审美方向具体描述（大胆、非对称、鲜明配色）未逐字照搬，因为 frontend.md 的「避开廉价 AI 模板感」已覆盖反面约束。

## qa（对应 OMO lazycodex-qa-executor）

OMO 原型（packages/omo-codex/.../agents/lazycodex-qa-executor.toml:1-22）：专用 agent 名、模型 gpt-6-astra、reasoning effort high、developer_instructions。ulw-loop 集成约定输出 manualQa 矩阵与落盘 artifact。

补齐前状态：保留了真机验证与对抗场景，缺既有证据核查、场景 ID 引用、产物引用。

补齐内容（f0f2645）：
- 既有证据核查：给出判定前先亲自检查已有执行者的主张、日志与证据摘要引用的原始产物。
- 场景 ID 与验收标准引用：每个验证场景写明对应哪条验收标准。
- 产物引用：PASS 必须引用非空产物文件路径，不只写文字结论。

未覆盖：OMO 的 manualQa 矩阵落盘格式（OMP 没有 ulw-loop 的 currentAttemptDir 目录结构）；OMO 的 tmux/screenshot 证据通道（OMP 没有 tmux transcript 工具）。

## builder（对应 OMO quick + unspecified-low）

OMO 原型（dist/cli-node/index.js:11768-11777,11819-11825）：
- quick：gptLunaFast low，单文件机械改动，效率心态（最小可用、跳过抽象、直接紧凑）。
- unspecified-low：claudeSonnet medium，无专用分类的中等工作量，Selection_Gate（没有更对口的专业角色时才用）。

核查结论：builder 不是 quick + unspecified-low 的完整合并。quick 的单文件机械改动由 sonic 承担，builder 只覆盖 unspecified-low。builder 新增了 OMO 没有的工作契约（先读后改、只改必需、必须实测、证据回报）和 ESCALATE 协议。

Caller_Warning（要求派发者写清步骤、禁区、验收）未覆盖，原因同 builder raw 所述。

## 方向错误记录

首批 scout 被派去查 OMP 内置 agent（scout.md、reviewer.md、task.md），因为原始消息写的是「omp repo」，用户随后更正为「i said omo」。首批 scout 返回的 OMP 内置 agent 对比结果全部作废，不影响最终 OMO 核查结论。
