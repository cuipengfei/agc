# pstack 技能地图与行为（backnotprop/pstack@25abb38）

> Sources: backnotprop/pstack 仓库树枚举与 SKILL.md 逐个读取（commit 25abb38559ddbabec563646224d09eff9a250eca，2026-10-29）；已安装的 56 个 SKILL.md 与 `~/.agents/.skill-lock.json`（version 3）逐条比对一致，2026-10-29
> Raw: [pstack-skill-graph-extraction](../../raw/ai-coding-agents/2026-10-29-pstack-skill-graph-extraction.md); [pstack-skill-behaviors](../../raw/ai-coding-agents/2026-10-29-pstack-skill-behaviors.md); [poteto-mode 原文摘录](../../raw/ai-coding-agents/2026-10-05-pstack-poteto-mode-skill.md)
> Updated: 2026-10-29

## Overview

backnotprop/pstack（cursor/plugins/pstack 的 harness 中立镜像）在 commit 25abb38（2026-10-29）共有 61 个 `SKILL.md`：`skills/` 下 58 个注册技能 + `automations/benny/skills/` 下 3 个 Slack 自动化专用技能（不进 slash 菜单）。注册技能 = 24 个 `principle-*` 判例 + 34 个功能技能。全部技能的 frontmatter 除 `setup-pstack` 外都设 `disable-model-invocation: true`——模型不能自由触发它们，只有用户显式调用或技能间按正文指令调用。执行路由分三层：入口（poteto-mode / poteto-help / setup-pstack）→ 流程（poteto-mode 的 23 份 playbook）→ 工序（功能技能）与判例（principle）。按 179 条执行边重算，三个入口可达 47 个注册技能，11 个功能技能只能由用户直接点名；本机 `.skill-lock.json` 记录的 56 条 pstack 条目全部已安装且与该 commit 逐字节一致，`tdd`、`teach` 两个技能因本机同名目录来自 mattpocock/skills 而未被 pstack 版占用装上。

## 判定标准

| 概念 | 判据 | 出处 |
| --- | --- | --- |
| root 入口 | README `get started` 段声明的三个 | `README.md:114-123` |
| 可模型自动触发 | frontmatter 无 `disable-model-invocation: true` | 61 中 60 设 true，唯一例外 setup-pstack |
| 宿主文件范围自动加载 | frontmatter `paths` 字段 | 仅 typescript-best-practices 设 `paths: ["**/*.ts", "**/*.tsx"]` |
| 用户公开入口 | root 三者 + README 技能表列出的 31 个 | `README.md:205-240` |
| 仅内部 | 无用户入口声明、只被其他技能按规则读取 | 24 个 principle（poteto-mode/SKILL.md:41 命名规则） |
| 自动化指令 | `automations/benny/` 下三个 | benny README:5「do not appear as slash skills」；FOR_AGENTS.md:31「direct automation instructions, not registered plugin skills」 |

## 编成与执行边

从原文行抽取共 442 条边、13 类（asset-reference 103、help-recommendation 79、playbook-instruction 60、entry-declaration 50、body-instruction 41、principle-naming-rule 24、playbook-dispatch 23、slash-invocation 20、readme-dependency 16、trigger-route 11、shared-dependency-declaration 8、path-reference 4、automation-instruction 3）。其中 7 类共 179 条为执行边。

- **poteto-mode 触发器路由**（SKILL.md:20-37）：Non-negotiables 把特定情形固定路由到 how（研究）、architect（跨函数边界写码）、swarm/arena（并行扇出/方案竞赛）、interrogate（争议设计）、unslop（任何成文表面）、technical-writing（文档类）、no-comments（评审前）、benchmark-checklist（报数字前）、show-me-your-work（自主长任务）、principle-model-the-domain（任何代码）、Shipping playbook（落地绿色栈）。
- **playbook 分派**（SKILL.md:136）：23 份 playbook，其中 16 份有自己的技能出边；7 份（orchestrate、autopilot-stack、babysit、pause-safely、visual-parity、authoring-a-skill、runtime-forensics）不含技能调用，纯自述步骤。
- **principle 命名规则**（SKILL.md:41-80）：标题转 kebab-case 加 `principle-` 前缀；`sequence-verifiable-units` 是唯一也顺带给出显式括号 slug 的（L69）。
- **README 与正文矛盾**：README:46-48 自述一批技能「不调用其他 pstack 技能」，但正文有 why→how、architect→how、blast-radius→(how, why, arena, unslop)、ketchup→bro、ketchup-video→ketchup 的执行边；README:52-64 的「Also install」依赖表与正文一致，以正文为准。

### 可达性（执行边口径）

- 三 root 经执行边可达 47 个注册技能（poteto-mode 44 + setup-pstack 生成链 create/maintain-verification-skill、create/maintain-formal-verification-skill、statechart + bro 经 ketchup，合并）。
- poteto-help 执行出边 0：它的 79 条斜杠提及是「回答问题、给可发送的提示词、停」（poteto-help/SKILL.md:9、:64），单列为 help-recommendation。
- 11 个只能用户直接点名：automate-me、blast-radius、correct、in-your-own-words、ketchup-video、make-bot-ui、recall、reflect、sharpen、teach、typescript-best-practices。
- benny 三个走 `automations/benny/FOR_AGENTS.md`（行 65/87 指示读 setup-benny、triage-issue-reports、reproduce-and-fix-issues），主图不可达。

## 安装核对（本机，2026-10-29）

`~/.agents/.skill-lock.json` 共 155 条 skills 条目；`source == backnotprop/pstack` 56 条。

| 状态 | 名单 | 备注 |
| --- | --- | --- |
| 已装且一致 | 56/56 | 按 skillPath 末级目录匹配全部命中；SKILL.md 与 commit 25abb38 逐字节一致；56 条 key 与目录名一致 |
| 未装（同名遮蔽） | tdd、teach | 本机这两个目录来自 mattpocock/skills（锁定条目 source: mattpocock/skills）；pstack 版 tdd 为「仅在明确要求或 bug 有廉价本地测试路径时使用」，mattpocock 版为通用 red-green-refactor，语义不同 |
| 未装（设计如此） | setup-benny、triage-issue-reports、reproduce-and-fix-issues | benny 自动化，不发布为 slash 技能 |

匹配口径说明：lock key 是显示名概念，目录名应按 skillPath 末级比对（本批 56 条两者恰一致，不构成差异风险）。

## 行为面（61 个技能被叫到后做什么）

以下每条基于正文指令，原文摘录绑定 raw；结论绑定 commit 25abb38。

### 入口三个

- **poteto-mode**：任务总控。先复述用户目标与最小改动（L19）；按任务匹配 23 份 playbook，把 playbook 步骤原样抄成 todo list 逐条执行，无匹配时交 figure-it-out 现场设计（L136-140）；触发器在岔路口路由功能技能（见上文）；自主规则「可逆直接做、不可逆写必停」（L84-86）；子代理一律后台、按角色配模型（代码默认 `grok-4.7-xhigh-fast`，判断与文书默认 `claude-opus-5-5-xhigh`，L96）。
- **poteto-help**：前台咨询。回答 pstack 使用问题，给一段可发送的提示词与来源链接，明确不替用户开工（pstack 运行花费真实 tokens）；只有用户让它干活时才读 poteto-mode 并在其下执行（L9、L11）；推荐前先读被推荐的技能（L64）。
- **setup-pstack**：配置员。探测可用模型 slug，问四档预算（unlimited/large/medium/small），按模型家族与别名（inherit-parent/auto）映射角色写规则文件（Cursor 写 `~/.cursor/rules/pstack-models.mdc`、Claude Code 写 `~/.claude/rules/pstack-models.md`、其他写 `~/.agents/pstack-models.md`，L10-14）；重跑幂等（L45）；可选触发 create-verification-skill（L80）与 create-formal-verification-skill（L84）。

### 理解四

- **how**：回答「怎么工作」。简单问题派一个只读 explainer 一次讲完；跨文件的复杂问题把问题切成 2-4 个角度并行扇出 explorer（模型行 `how explorer`，默认 grok-4.7-xhigh-fast），再综合进一个 explainer（`how explainer`，默认 claude-opus-5-5-xhigh）；输出 Overview / Key Concepts / How It Works / Where Things Live / Gotchas（L11、L17-18、L26、L30、L38）。
- **why**：回答「为什么这样设计」。先 git blame/log + gh pr view 建代码锚点；枚举当前连接的 MCP 并按七类证据来源归位（源码历史、issue 跟踪、长篇文档、团队聊天、基础设施观测、错误追踪、产品分析仓库），每类一个 investigator 并行（`why investigators`，默认 grok-4.7-xhigh-fast），返回 null 也记录； synthesizer 汇总为「找到什么/合理推断/竞争假设/不知道什么/来源/信心分级」，信心措辞不许被改写（L13、L37-49、L81-94）；后续要改代码则把发现转 Preserve/Change/Avoid/Risk 约束（L96）。
- **teach**：how+why 的讲解包装。自己先读码定向，再并行跑 how 与 why，把发现织成一段按对方节奏的大白话解释；why 的信心 hedge 是发现不是风格，保留（L11-14）；复杂流程画逐步叠图（L17）。
- **recall**：开工/复工前重建上下文。分片读自己聊天记录（并行子代理，`ls -t` 顺序，拒绝按 UUID 排序）；主题具名时把同一主题交给 why 通道扫用户报症状与回滚史；用 git/gh 核对 PR/分支/工单现状；按 Capsule（≤5 条）/Threads（状态标签）/Problems（≤5 条）/Next move 合同输出（L23-27、L32-37）。

### 设计四

- **architect**:五阶段 Ground→Sketch→Agree→Implement→Scrap。Ground 跑 how（必要时 why）做真实心智模型；Sketch 调 arena 出至少两份结构不同的类型/签名/模块草图（用 design-red-flags 筛「下个 agent 只看局部文件会不会写错」与接口深度）；默认不等签字；实现遇摩擦反复出现同一形状（特判重复、类型逃逸舱、调用方懂内部规则）判定草图错了，Scrap 重跑（L13-20、L23、L29-40、L43-47、L59-66、L70-75）。
- **arena**：六阶段 Frame→Fan out→Cross-judge→Pick→Graft→Verify。同一 prompt 是合同；3-6 条可打分 rubric；候选各自独立输出位置；N 个模型并行做候选 + 1 个非同家族 cross-judge；按 rubric 逐条打分选底子最好的做基底，把落选者里值得搬的一两处手工嫁接；完全收敛即共识（L9、L13-18、L22、L28、L32-40、L44）。
- **interrogate**：对抗评审。复用 arena 扇出机制，任务换成「打破这个改动，每条发现必须用一次真实运行证明（失败测试/复现脚本/命令输出）」；主控重跑每条命令验证，跑不出失败就丢，同根因合并；保留所有已验证发现不选最优（arena 跳过 C/D/E）；只报告不修（L9、L13、L17-25、L28-31）。
- **blast-radius**：回答「会在别处弄坏什么」。不满足于 grep 调用方；找「这个改动为何安全的那一个事实」，并用真实运行的脚本证明它；确信度阶梯 1-5（我说了→指了行号→推演过→跑过→运行应用里复现过）；看 grep 看不到的（库版本与补丁、微任务时序、JSON 字段、DB 列、feature flag、三跳外下游）；大改动用 arena 多模型合并答案（L11、L13、L17、L23-27、L34-38、L42-47）。

### 并行验证四

- **swarm**：并行包工头。Frame 定 done 判定与形状（切片/赛跑/混合）；测量任务必须附确切 SHA 与方法；扇出后统一收 PASS/ISSUES/BLOCKED 报告；能证明的缺陷全列不挑第一个；没交 SHA-方法的打回一次，再不行记 gap，gap 不算通过（L13-16、L20-23、L27、L33、L39、L43）。
- **tdd**：bug 有廉价本地测试路径时用。先写最小失败测试，修前跑它确认按预期原因失败，再做最小生产修改后重跑通过；测试要贵/脆弱/慢时明确不写，改用最接近的可执行回归检查，宁缺毋滥（L9、L11、L17-20、L26、L40-42）。
- **benchmark-checklist**：报任何性能数字前的七问拦截器（limiter 是什么/两边按生产方式调优了吗/突破物理上限了吗/算错误了吗/交替跑 5 次可复现吗/端到端有意义吗/计时区内工作真发生了吗）；答不上 limiter 或没查 4、7 必须 verdict inconclusive；答不出 limiter 就不能宣布更快/更慢（L11、L21-27、L31-33）。
- **show-me-your-work**：决策账本。单 TSV 文件逐条追加 ts/phase/decision/why/evidence/result（evidence 是指针如 SHA、file:line、artifact 路径，不写段落）；append-only，错了补更正行不删历史；收尾对照 transcript 审计，再派一个不同模型家族的审读 agent 回 Attention 一节，格式 `reviewed by <model>`（L15-22、L52-53、L63、L67-74）。

### 文字六

- **unslop**：按编号规则清扫 AI 文风（规则 id 是稳定编号，被其他技能引用）：AI 高频词表、抽象隐喻名词表（substrate/vector/locus/paradigm/north star/flywheel → 换具体词）、「说它做什么不说感觉」（说出机制或数字）、破折号与冒号滥用、强行三件套、谄媚语气、被动转主动、删填充短语等（L9、L13、L22、L31、L52、L56-63）。
- **technical-writing**：Diátaxis 定单一模式（教程/操作指南/参考/解释），再加 Google developer style 句子规则、STE 一句一指令、Global English 消歧义；「代码库是词表」，别造行话；不混模式（L13、L17、L19、L30-49）。
- **no-comments**：派 Comment Sicko 审查 diff 注释与代码异味；接受的发现当场修（需要形状的跑一次 architect 停在 sketch）；`MUST KILL`/`do not remove` 类约束注释先跑 how 或 why 查证再决定去留；能被类型/测试/lint 强制的，提出来等批准后编码再删注释；报告删除数、恢复数、REVIEW keeps、编码提议、未落实约束（L9、L15-24）。
- **bro**：把上一条消息用大白话重说，去行话（全文一句话，L7）。
- **ketchup**：接上离开这段时间会话里发生的事，列所有只有你能做的决定；用 bro 的声音但做自己任务；本轮只读；行动项含链接、影响、证据、风险、建议，原则「回复单独就能拍板」（L9-17、L23-33）。
- **ketchup-video**：同 ketchup 收集与决策列举，把「发生了什么」做成带字幕、幻灯式短视频（≤10 张，静默横屏 mp4，字幕烧进帧里，每张 ≥1s/3 词 hold）；渲染失败一行报错、只给行动项（L9、L13、L27、L29）。

### 生成器与维护五

- **create-verification-skill**：给项目生成 `<skills>/verify-<app>/` 本地技能（launch/doctor/drive/evidence/cleanup/helpers 六节 + 功能地图），采访仓库而非用户；写完必须按自己的指令真的跑一个功能拿到证据，没跑过就算草稿（L7-9、L13-19、L23-32、L38-40）。
- **maintain-verification-skill**：keep 诚实的回路。每个 feature 文件派一个只读子代理从源码核对（source wave），再由主控开真实实例驱动每个 feature 至少一次（live pass，强 doctor 不变式）；分诊为文档过时（改地图）、驱动缺口（修工具）、产品真坏了（只报告）；最多发一个只含已证实修正的 PR（L13-17、L21、L29、L33-37）。
- **create-formal-verification-skill**：找「承诺重要而测试到不了」的地方（并发/重试/状态机/解析器/unsafe），按问题选工具（事件时序默认 TLA+），生成项目本地 verify skill（属性、跑法、覆盖记录、sync commit）；必须在故意弄坏的代码变体上看到检查失败过才算数；TLA+ 结果指定用 /statechart 读（L7-9、L13-19、L23-29、L35、L39）。
- **maintain-formal-verification-skill**：把 formal 验证拉回与代码同步。结果分 in sync / updated / bug / blocked；「看起来像证明的 pass」是危险情形，因为它描述的代码可能不存在了；逐个改动分类为无影响/不再描述/承诺有意改变（需证据）/可能破坏（bug 候选）；按代码而非按结果更新模型，只改验证不改产品（L9、L13-18、L22-24、L30-38）。
- **statechart**：跑 TLC，把系统状态迁移画 Mermaid 状态图，违规规则状态打 `breaks`/`mayBreak` 标记并给出每个的最短路径；spec 原则「绝不弱化规则让它通过」；图描述代码时必须把每条违规路径在真实代码上重放，重放不出来先怀疑模型（L11-21、L25-27、L64-69、L78-82）。

### 个人化与元六

- **automate-me**：把用户工作习惯变成专属 `<handle>-mode` 技能。分片并行挖用户 transcript（≥2 分片重复才算高可信）+ 结构化选择题直问 + 聚类成规则草稿 + create-skill 写出 + unslop 过稿 + 反复迭代后开 PR；不 overfit 单会话（L7-13、L31、L39-48、L73-77、L94-104）。
- **correct**：从 agent 反复犯的错误（同错两次算一类）改仓到下一个 agent 无法再犯；按架构（状态单 owner、隐藏 internals、删旧路）→ 类型（错误无法编译）→ lint/CI（报错指名正确做法）→ 行为测试→ 文档规则的优先级修；每个新检查在真实历史错误上证明会失败，本地与 CI 都过；维护「规则↔强制手段」对照表（L7-9、L15、L19-22、L26、L28-30）。
- **reflect**：任务结束后提炼教训。定位并并行派三个评审（judgment/tooling/divergent，模型行 `reflect judgment, divergent, synthesizer` 与 `reflect tooling`）；synthesizer 校引后给 Accepted/Rejected/Backlog 三栏；可结构化的降到 Backlog；Accepted 修改必须等用户明确批准，绝不 auto-apply、不 push（L7-9、L41-45、L53-59、L63）。
- **sharpen**：改写提示词为更深入而非更大：四问（顶尖人会做什么你没要求的/最原始材料是什么/用什么方法与工具/什么能证明对）后按答案重写，把选择留给你（全文 L7-16）。
- **in-your-own-words**：用自己的话复述目标与问题（全文一句话）。
- **typescript-best-practices**：读写 `.ts/.tsx` 时宿主自动加载（paths 字段）；先读 type-system-discipline 原则，然后按一张规则表写 TS（可辨识联合、品牌类型、非法状态不可构造、unknown 优于 any、schema 优先、禁裸 `as`、穷尽性、边界解析等，L10-29）。

### 24 个 principle（判例，无用户入口）

24 个 `principle-*` 不出现在 README 技能表，没有用户入口声明。它们的引用方式有两类（执行边实据）：poteto-mode 的 Principles 清单按 `principle-<title>` 命名规则引用全部 24 条（poteto-mode/SKILL.md:41-80）；8 个 playbook 正文直接按名引用其中 9 条——refactoring 引 8 条（foundational-thinking、redesign-from-first-principles、subtract-before-you-add、laziness-protocol、migrate-callers-then-delete-legacy-apis、prove-it-works、minimize-reader-load、model-the-domain）、feature 引 model-the-domain、session-pickup 引 guard-the-context-window 与 prove-it-works、trace-forensics 与 worktree-cleanup 各引 guard-the-context-window，其余见 raw 抽取的执行边表。principle 正文之间另有相对路径引用（如 attack-the-premise → laziness-protocol），按资产路径引用记录。

下表「判定时机」与「决策」两列取自 poteto-mode 原清单逐字句（原文摘录见 raw behaviors）：

| principle | 判定时机（清单原文前半） | 决策（清单原文后半） |
| --- | --- | --- |
| laziness-protocol | Refactoring, sizing a diff, or tempted to add abstractions, layers, or signal threading. | Bias to deletion and the smallest change that solves the problem. |
| foundational-thinking | Before writing logic: core types and data structures, scaffold-vs-feature sequencing, what concurrent actors share. | Get the data structures right so downstream code becomes trivial. |
| redesign-from-first-principles | Integrating a new requirement into an existing design. | Redesign as if it had been foundational from day one. |
| attack-the-premise | Two or more fixes that share one premise have failed the same gate. | Write the premise down and test it directly before you write another fix that assumes it. |
| subtract-before-you-add | Sequencing an addition, refactor, or rewrite. | Remove dead weight first, then build on the simpler base. |
| minimize-reader-load | Reviewing or shaping code that's hard to trace. | Count layers and hidden state, collapse one-caller wrappers, shrink mutable scope. |
| outcome-oriented-execution | Planned rewrites and migrations with explicit phase boundaries. | Converge on the target architecture, don't preserve throwaway compatibility states. |
| experience-first | Product, UX, or feature-scope tradeoffs. | Choose user delight over implementation convenience. |
| exhaust-the-design-space | A novel interaction or architectural decision with no precedent. | Build 2-3 competing prototypes and compare before committing. |
| build-the-lever | Any non-trivial work. | Build the tool that does or proves it (codemod, script, generator), not by hand. |
| model-the-domain | Writing stateful logic, or code that branches a lot or repeats a shape assumption across files. | Encode the domain in a structure instead of scattered conditionals. |
| boundary-discipline | Wiring validation, error handling, or framework adapters. | Guards at system boundaries, trust internal types, keep business logic pure. |
| type-system-discipline | Designing types or a signature in any typed language. | Make illegal states unrepresentable, brand primitives, parse external data at boundaries. |
| make-operations-idempotent | Designing commands, lifecycle steps, or loops that run amid crashes and retries. | Converge to the same end state. |
| migrate-callers-then-delete-legacy-apis | Introducing a new internal API while old callers exist. | Migrate and delete in one wave. |
| separate-before-serializing-shared-state | Concurrent actors might write the same file, branch, key, or object. | Eliminate the sharing first. |
| prove-it-works | After a task, before declaring done. | Verify against the real artifact, not a proxy or "it compiles". |
| fix-root-causes | Debugging. | Trace each symptom back to the first place the system went wrong and fix it there. |
| sequence-verifiable-units | Multi-step work and how you stack commits and PRs. | Break work into small units that each end in a check, verify each before the next. |
| test-behavior-not-implementation | Writing, changing, or keeping a test. | Assert what the code's users can observe, so the test fails when that behavior breaks. |
| explain-the-number | Before you measure, and before you trust, report, or act on a number you measured. | Find what limits it, and rule out that it measured something other than the work you think. |
| guard-the-context-window | Context fills up: large outputs, long files, repeated reads, fan-out planning. | Route bulk to subagents, keep summaries in the main thread. |
| never-block-on-the-human | Tempted to ask "should I do X?" on reversible work. | Proceed, present the result, let the human course-correct. |
| encode-lessons-in-structure | You catch yourself writing the same instruction a second time. | Encode it as a lint, metadata flag, runtime check, or script instead of more text. |

### benny 三个（自动化专用）

- **setup-benny**：把整个 automation pack 合并到目标仓库 `.cursor/automations/benny/`（保留目标已有文件与用户自有配置），启用 pstack 共享技能，收集 Slack/工单/仓库/模型/预算配置，引导分别创建两个 Cursor automation 草案；「Do not create or update an automation until the user explicitly asks」（SKILL.md L15），draft PR 不合并不部署（FOR_AGENTS.md:36）。
- **triage-issue-reports**：Slack 新报告触发。冻结原帖坐标，分类，用 how/why 做有限源码与历史排查，工单查重，只在原帖线程发唯一结论（带 `[benny:bug]`/`[benny:performance]`/`[benny:other]` 标记）；只有明确新 bug 才建工单；硬规则「coordinator 是唯一 Slack poster、子代理 read-only 且 prompt 显式禁一切 Slack 写」（SKILL.md L13-28）。
- **reproduce-and-fix-issues**：等可信 triage 标记后启动。通过配置的 control adapter 在真实 UI 上把症状复现两次；先查有没有 PR/commit 已修（有就转 verify 模式，不覆盖）；确认复现才允许一次有界根因修复（可用 tdd），做前后对照证明，只开草稿 PR（SKILL.md L13-28；FOR_AGENTS.md:21、:36）。

## 边界与未验证项

- 层级是文档指令的重建模型，未做运行时路由探测；边的存在性有 `file:line` 原文依据，实际触发取决于宿主与任务。
- 结论绑定 commit 25abb38（2026-10-29 main）；上游 cursor/plugins/pstack 与本镜像同节奏 sync（MIRROR.md 有流程），后续 commit 需重新核对。
- 本机 `tdd`/`teach` 的同名遮蔽未在真实会话里验证路由到哪一版；两版 frontmatter 与语义均不同，实际影响取决于用户调用的是哪个接线。
- poteto-help 的 read/recommend 去重对数为 33（同技能多条边合并），与 79 条原始边为两种口径。

## See Also

- [pstack 移植版生态全景](pstack-ports-landscape.md)
- [skill 系统的两种组织轴：pstack 与 mattpocock/skills 对照](skill-system-organization-axes.md)
- [mattpocock/skills：两轴分类的工程 skill 集](mattpocock-skills-system.md)
