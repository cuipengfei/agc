# Agent 多轮表达一致性规则与 CLAUDE.md 跨机器配置手册

> Sources: Local `~/.claude/CLAUDE.md` & `~/.agents/.skill-lock.json`, 2026-10-24; Microsoft Research & Salesforce Research (`arXiv:2505.06120v1`), 2025; Meta AI S2A (`arXiv:2311.11829`) & CoVe; skills.sh ecosystem pages, 2026-10-24; Wikipedia `WP:AIDISCLAIMER`、Graphite Research AI Tells、The Strategic Linguist、LessWrong `n=900` 实验, 2026-10-25; 本机全局 Skill 来源记录与用户批注, 2026-10-25; 用户批准的验证条款, 2026-10-25
> Raw: [Agent 多轮表达一致性规则、外部研究与 CLAUDE.md 最终定稿摘录](../../raw/harness-engineering/2026-10-24-claude-md-expression-rules-and-multi-turn-study.md); [「不能证明」免责句式的禁令与 Best Guess 替代规则](../../raw/harness-engineering/2026-10-25-cannot-prove-ban-and-best-guess-rules.md); [不确定性写法条款：缺少什么与下一步确认](../../raw/harness-engineering/2026-10-25-uncertainty-wording-clause.md); [表达规则复刻的 Skill 依赖与来源记录](../../raw/harness-engineering/2026-10-25-expression-skill-dependency-sources.md); [按任务类型与授权范围选择验证方式](../../raw/harness-engineering/2026-10-25-task-scoped-verification-rule.md)
> Updated: 2026-10-25

## Overview

在复杂技术问答与多轮澄清中，LLM/Agent 常因换讨论对象不换代词、混用不同分类标准、漏掉结论前提、跨组件动作断链、新概念不交代来路、比较时拿共同点充当优势、以及在作废旧草稿上打局部补丁，导致读者难以建立一致心智模型。另有第 8 类由 2026-10-25 批注归纳的反模式：用「不能证明 X」的免责句替代判断。本文记录这 **8 类表达问题**、外部多轮对话退化研究与 `skills.sh` 生态对标，并给出 `~/.claude/CLAUDE.md`（同步至 `~/.omp/agent/AGENTS.md` 与 `~/.codex/AGENTS.md`）**改动后的定稿段落与前置 Skill 安装清单**，供新机器复刻。

## 八类导致读者困惑的表达模式与覆盖映射

下表汇总从实战批注中提炼的 8 类通用模式、本机已安装 Skill 原文的真实覆盖范围，以及 `~/.claude/CLAUDE.md` 常驻规则补齐的空白：

| 序号  | 表达混乱模式                                                                                     | 本机已安装 Skill 原文直接覆盖项                                                                                                   | `CLAUDE.md` 常驻规则直接补齐的空白                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **更换讨论对象，却继续使用相同指代**（“它/这里/这种方式”暗中换了对象或前提，不打招呼）           | `technical-writing`（代词指向唯一明确对象）、`asd-ste100`（一物一名）、`iso-24495`（术语一致、指代明确）、`no-bs`（禁同义词轮换） | **常驻第 1 条**：换了对象、场景或前提必须直接说清楚；多对象交替出现时用名字或小标题分开。                                                     |
| **2** | **把不同分类标准混在一组说明里**（方法、保存位置、触发时机混列，分不清是互斥方案还是可组合侧面） | 无直接命中的 Skill（`writing-shape` 与 `technical-writing` 仅要求列表语法/逻辑并列，`iso-24495` 要求一段一主题，属间接辅助）      | **常驻第 2 条**：同一组分类只按一个标准分；不同标准的分类分开讲，写明哪些能同时成立、哪些只能二选一、哪些是先后步骤。                         |
| **3** | **省略前提，把有条件的结论写成普遍结论**（前面说“不用”，后面说“必须”，适用条件隔几段才补）       | `iso-24495`、`asd-ste100`、`technical-writing`（条件前置、保留适用范围）、`no-bs`（缩短篇幅保留条件与证据）                       | **常驻第 3 条 + 发送前检查**：写“必须/不用/自动/默认”时当场带上对谁、什么情况下、在哪一步成立；发送前专门核对“都、必须、不用、任何”等全称词。 |
| **4** | **罗列零散动作，没连成完整过程**（只提生成、返回、保存，缺交接方与状态变化）                     | `technical-writing`、`asd-ste100`（主动语态、写明执行者、步骤编号）、`talk-behavior`（讲清流程输入输出与数据流）                  | **常驻第 4 条**：多方处理时按顺序写清谁拿到什么、做了什么、交给了谁、下一步怎么接着用，以及存放位置与状态变化。                               |
| **5** | **在功能、流程和内部机制之间乱跳，新概念不交代来路**                                             | `talk-behavior`（控制讲解层次，默认不下沉代码实现）、`writing-shape`（后文依赖概念须先介绍）、`no-bs`（陌生术语用一句普通话解释） | **常驻第 5 条**：提起新概念、内部机制或实现细节时，先说它用来解释前面哪个问题。                                                               |
| **6** | **要求比较差异，回答却列两边都有的共同特点**                                                     | 无直接命中的 Skill（`no-bs` 要求先比较证据、给明确倾向，`technical-writing` 要求说明取舍，均未直接规定区分共有能力与增量差异）    | **常驻第 6 条**：放在同一套条件和标准下比；两边都有的能力直接说都有；讲优势必须写清相对谁多了什么、什么情况下有用、代价是什么。               |
| **7** | **追问或纠错后只打局部补丁，不重新理顺整体关系**                                                 | `restating-complete-answers`（交付完整重述版，但原文件要求保留原结构）、`writing-shape`（检查段落承接）                           | **常驻第 7 条 + 调用说明**：重写前先分清哪些前提还成立、哪些旧说法已作废，不在作废旧草稿上贴补丁；旧结构让人看混时直接重排结构。              |
| **8** | **用「不能证明 X」的免责句替代判断**（普通命令结果被写成「这证明了……」，或在事实后追加「不代表所有场景/所有客户端/未来调用都成立」） | `humanizer` §9、`no-ai-slop`、`natural-writing` 已覆盖词级过度限定与知识截止免责；`unslop` 覆盖抽象黑话与空洞修饰 | **事实与判断陈述协议**：硬性禁用否定式免责句式，改为「当前最佳猜测／最佳解释 + 下一步怎么验证得更准」；普通结果直说结果；不确定性写成「缺少什么 + 下一步怎么确认」，事实后不追加泛化免责。 |

## 外部学术研究与 `skills.sh` 生态对标

### 1. 多轮对话退化研究与相关检查技法

- **《LLMs Get Lost In Multi-Turn Conversation》（Microsoft Research & Salesforce Research, `arXiv:2505.06120v1`）**：
  - 在 `200,000+` 场对话、15 个主流模型上实测发现：同一任务从单轮完整指令拆为多轮逐步给信息时，平均准确率从 **90%** 降至 **65%**（跨 `6` 个生成任务平均相对下降 **39%**）。
  - 记录了 4 项具体失误：① **过早作答（Premature Answer Attempts）**：前 20% 轮次就给方案的平均得分仅 `30.9`，后 20% 轮次才给方案的得分为 `64.4`；② **死守前序尝试打补丁导致答案膨胀（Answer Bloat）**：多轮最终答案比单轮长 **20%–300%**（即使拿满 `100` 分的正确 Python 代码也比单轮长 `27%`）；③ **过度关注最后一轮、遗忘中段条件**：在 `8` 轮摘要引用实验中，第 `8` 轮文档引用率（**20%**）是第 `2`、`3` 轮（**8%**）的 **2.5** 倍；④ **回复越冗长表现越差**：在 `6` 个任务中的 `5` 个上，助手回复最短的五分之一会话比最长的五分之一会话得分高 **10%–50%**。
  - **其余模式的边界**：该论文验证了多轮修补膨胀与中段条件遗忘；至于分类维度混写、比较只列共同点等模式的普遍发生频率，目前尚无同类的定量基准实验（普遍程度未验证）。
- **相关论文技法与本会话归纳的轻量检查动作**：
  - **System 2 Attention (S2A, `arXiv:2311.11829`)**：论文原方法是通过重写输入上下文以仅保留相关内容、去除无关或误导部分；我们在 `CLAUDE.md` 第 7 条借用了这一思路，加入重写前先分清哪些前提还成立、哪些旧说法已经作废、不在作废的旧草稿上贴补丁的轻量检查动作。
  - **Chain-of-Verification (CoVe)**：论文原方法为四步验证（生成初稿 → 针对初稿断言拆出核查问题 → 独立回答核查问题 → 修正定稿）；我们在 `### 发送前检查` 中借用其核查点，加入对“都、必须、不用、任何”等全称说法的核对动作。
  - **显式实体与数据流检查法（本会话归纳的实用做法，非独立论文技法）**：开头固定实体唯一名称，跨组件传递按顺序写清谁拿到什么、做了什么、交给了谁、存放在哪（对应 `CLAUDE.md` 第 1、4 条）。

### 2. `skills.sh` 外部表达与结构类 Skills 盘点（为什么无需额外安装）

2026-10-24 核查 `skills.sh` 上的 4 组外部同类 Skills，本机均无需额外安装：

| 逻辑分组与外部 Skill                                                                                          | 仓库 (`owner/repo`)                                                                                                     | `skills.sh` 安装量            | GitHub Stars      | 核心机制与本机不重复安装的理由                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **第一组：动笔前文档分型（Diátaxis）**<br>`docs-style` / `explanation-docs` / `howto-docs` / `reference-docs` | `existential-birds/beagle`                                                                                              | `171` / `142` / `129` / `114` | `84`              | 用 Action vs Cognition、Acquisition vs Application 将文档分为 Tutorial、How-To、Reference、Explanation 四类，禁混写。偏重整套软件文档；日常问答的层次控制已由 `talk-behavior` 与 `CLAUDE.md` 第 5 条覆盖。                                                                              |
| **第二组：顶层金字塔结构（Minto / BLUF）**<br>`think-pyramid-principle` / `minto` / `pyramid-principle`       | `product-on-purpose/thinking-framework-skills`<br>`olelehmann1337/claude-skills`<br>`escherize/pyramid-principle-skill` | `12` / `6` / `2`              | `20` / `18` / `1` | `pyramid-principle` 指出让 LLM 第一个 token 直接输出结论会导致准确率从 `~47%` 降至 `~33%`，要求先在隐藏 `<thinking>` 自底向上推理再输出 BLUF，并用 Read-titles test 检查动词标题；`minto` 固定输出 HTML 诊断文件。日常所需的结论先行与维度命名已由 `no-bs` 与 `CLAUDE.md` 第 2 条覆盖。 |
| **第三组：轻量技术解释消歧**<br>`ste` (Clear Technical English)                                               | `23jmo/jmo-skills`                                                                                                      | `64`                          | `142`             | 要求指明执行组件、前后依赖的想法用连贯 prose 而非孤立列表、分离已确认行为/假设/建议。核心要求已由本机 `technical-writing`、`asd-ste100`、`talk-behavior` 与事实性陈述协议覆盖。                                                                                                         |
| **第四组：读者分流门禁**<br>`clarity`                                                                         | `flowcopilot/skills`                                                                                                    | `3`                           | —                 | 按人类读者 vs Agent 读者分流，内部直接打包调用 `writing-for-agents`、`technical-writing`、`how`、`why`（本机均已安装原版）。                                                                                                                                                            |

### 3. 2026-10-25 追加：免责句式与纠偏式表述的外部观察

以下来源均为本会话直接读取原文。

- **Wikipedia `WP:AIDISCLAIMER`**（`https://en.wikipedia.org/w/index.php?title=Wikipedia:Signs_of_AI_writing&action=raw`）：把「关于来源可得性与建议用法的限定声明」列为常见 AI 写作特征；Mid-2026–present 段落记录了 `"...does not by itself establish..."` 一类句式，以及关于「preserved」「retained」信息与「avoided」错误的程序性陈述。
- **Graphite Research AI Tells**（`https://graphite.io/five-percent/research/ai-tells`，2026-09-16；`…/ai-tells-gemini-4-argon-update`，2026-10-21）：样本为 `10,000` 篇人类文章与 `90,000` 篇 AI 文章。测得 AI 讲「某事物不是什么」的频率约为人类的 `12` 倍，`not necessarily` 为 `18x`，`may provide` 为 `36x`，`distinction matters` 在人类样本中为 `0` 次。这组数字是文本频率测量，不解释生成原因。
- **Rebecca Wicker, The Strategic Linguist**（`https://thestrategiclinguist.substack.com/p/when-hedging-has-nothing-to-do-with`）：区分两种限定。一种交代具体的认知状态，例如还没看到哪份材料；另一种是披着限定外衣的免责声明，作用是保护发言者，而非传达证据强度。
- **LessWrong `Demands Are All You Need`**（2026-02-06，`n=900`）：`3×2×3` 实验中，提高指令祈使程度后，主观题 hedging 从 `M = 2.38` 降到 `M = 0.43`（`Cohen's d = 2.67`）。论文 Table 7 另记录一个个案：hedging 从答案之前迁移到答案之后。由此得到一个候选解释：提示词把限定推到句尾。检验方法是用强祈使与弱祈使两种提示词各生成同类问题，比较句尾限定的数量与位置，看这个解释是否适用于本会话的输出。

`skills.sh` 上的去 AI 腔候选（页面当前显示值）与本机已装项高度重叠：

| Skill | 仓库 | 页面显示安装量 | GitHub Stars | 处理 |
| --- | --- | --- | --- | --- |
| `@unslop` | `cursor/plugins` | `27.7K` | `13.9K` | 与本机 `backnotprop/pstack@unslop` 内容高度重叠，属不同仓库的候选，未验证同名安装会互相覆盖；不新装 |
| `@stop-slop` | `hardikpandya/stop-slop` | `18.0K` | `18.3K` | 吸收两条规则：不用 `every`／`always`／`never` 承担模糊论证；陈述事实后跳过软化、辩解与免责。不新装 |
| `@unslop` | `backnotprop/pstack` | `6.4K`（CLI 搜索显示 `6.3K`） | — | 本机已安装 |
| `@unslop` | `theclaymethod/unslop` | `4.2K` | — | 吸收一条规则：周围文字已交代冲突与不确定性时不再追加编辑。不新装 |

---

## 新机器一键复刻指南（`~/.claude/CLAUDE.md` 改动段落）

在另一台机器 clone 本仓库后，按以下 3 步即可完整复刻本套表达规则与 Skill 体系：

### 步骤 1：安装前置全局 Skills

根据实际启用的表达规则安装对应 Skill。完整复刻本文所列调用时，使用以下 11 项清单；其他用途的 Skill 不在本指南依赖范围内。`restating-complete-answers` 的当前来源为 `cuipengfei/prompts`，路径为 `skills/restating-complete-answers/SKILL.md`。

```bash
npx skills add -y -g https://github.com/danyuchn/iso-24495-skill --skill iso-24495
npx skills add -y -g https://github.com/danyuchn/asd-ste100-skill --skill asd-ste100
npx skills add -y -g https://github.com/backnotprop/pstack --skill technical-writing
npx skills add -y -g https://github.com/mattpocock/skills --skill writing-shape
npx skills add -y -g https://github.com/cuipengfei/prompts --skill talk-behavior
npx skills add -y -g https://github.com/cuipengfei/prompts --skill no-bs
npx skills add -y -g https://github.com/cuipengfei/prompts --skill restating-complete-answers
npx skills add -y -g https://github.com/blader/humanizer --skill humanizer
npx skills add -y -g https://github.com/petergyang/no-ai-slop --skill no-ai-slop
npx skills add -y -g https://github.com/backnotprop/pstack --skill unslop
npx skills add -y -g https://github.com/cuipengfei/prompts --skill natural-writing
```

### 步骤 2：确认跨 Agent 共享规则 Symlink

确保 `~/.claude/CLAUDE.md` 为唯一实体文件，且 Codex 与 OMP 的全局规则文件指向它：

```bash
ln -sfn ~/.claude/CLAUDE.md ~/.codex/AGENTS.md
ln -sfn ~/.claude/CLAUDE.md ~/.omp/agent/AGENTS.md
```

### 步骤 3：写入 `~/.claude/CLAUDE.md` 的改动段落

以下四段是 2026-10-25 改动后的文本。文件其余部分沿用原样，完整旧版见 [2026-10-24 raw](../../raw/harness-engineering/2026-10-24-claude-md-expression-rules-and-multi-turn-study.md)。

**首句**

```markdown
# 最高优先级规则

**每次回复（包括中间进度更新与最终答复）都必须以指定首句开头**

**首句**：「兄台，久候了。」
```

**验证要求：`### 工作流程` 中的验证条款**

仅替换 `### 工作流程` 中的验证条款，其他工作流程条目及「别让 skill 改掉当前任务」保持原样：

```markdown
- 对于已获授权的实现或修改，必须完成与改动相匹配的验证并处理发现的问题。代码功能应运行相关测试并验证实际行为；文档、规则和 skill 文案应检查内容、格式、引用与示例一致性。对 skill 文案进行真实模型调用、付费 API 实验、压力测试或对照抽样，须经用户明确授权。验证结果按实际执行的项目报告，不把未执行的检查写成通过。
```

复刻后，确认此条款在用户级源文件中只出现一次，并与上方文本逐字一致。用 `readlink -e ~/.claude/CLAUDE.md ~/.codex/AGENTS.md ~/.omp/agent/AGENTS.md` 核对源文件及两个共享链接，三个路径应解析至同一文件。

**表达 Skill 调用：`no-bs` 与去 AI 腔分组**

```markdown
- `no-bs`（对应第 1、3、5、6 条 + 信息不完整时的最佳判断与合理猜测）：需要直接给结论、拿现有信息给出当前最佳猜测/最佳解释（best guess / best interpretation）与下一步确认动作、去掉免责套话、把话写得像正常人说话时用。

#### 去除 AI 腔与免责套话（写长文、改稿、或发现输出带机器味时主动读取）

- `unslop`（位于 `~/.agents/skills/unslop/SKILL.md`，含 `disable-model-invocation: true`，需主动 `read`）：写技术说明、PR、文档或长回复需要砍掉抽象黑话（substrate/wedge/harness 等）、被动句和空洞修饰时用。
- `humanizer` / `no-ai-slop` / `natural-writing`：用户要求去 AI 味、改写得像人话，或自检发现回复里出现「不是 X 而是 Y」、凑三件套、句尾免责尾巴时读取。
```

**事实与判断陈述协议**

```markdown
**事实与判断陈述协议：**

- **已核实的信息**：直接写事实与证据出处（已读文件、命令输出、日志、测试结果或当前会话已获取的文档/搜索结果）。
- **信息不完整时的写法（硬性禁用「不能证明」免责句式，鼓励给出 Best Guess）**：
  - **严禁**在思考、回复或文档中写「不能证明 X」「无法证明 Y」「不能据此断定 Z」「也不代表在所有场景/所有客户端/未来调用中都成立」这类负面免责废话。永远不要去说“现有信息证明不了什么”。
  - **不要害怕猜测（Do not be afraid to guess）**：信息不完整时，不要缩回去打太极或贴免责标签，只要标明这是基于现有线索的猜测或判断（不把猜测伪装成已核实的实测结果即可），就大胆给出判断。
  - **统一按两步正面表达**：
    1. **当前最佳猜测 / 最佳解释（Best guess / Best interpretation）**：基于目前已拿到的信息，直接说出你当前最倾向的猜测或解释（「基于目前看到的 X 和 Y，当前最合理的猜测/解释是……」）。
    2. **下一步怎么验证得更准**：直接写明要让这个猜测或解释更准，下一步可以去看哪个文件、跑哪条命令或测哪个场景（「要进一步确认 Z，下一步可以看/跑……」）。
  - **不确定性的写法**：写清还缺哪项证据、它影响哪个具体判断，以及下一步用哪个文件、命令或场景确认。事实陈述结束后，不追加「不能证明」「不代表所有情况」这类泛化免责。
- **普通结果直说结果**：不要把常规操作或单次命令输出包装成「这证明了……」，直接写做了什么、看到了什么结果。
```

不确定性说明保留具体证据缺项、受影响的判断和确认动作。泛化免责句式无论位于正文、句尾或独立段落，都不使用。

## See Also

- [Plain Language 技能：ASD-STE100 与 ISO 24495-1](../agent-tooling/plain-language-skills-asd-ste100-iso24495.md) — 受控语言与简明语言两个技能的标准背景与选型边界
- [skills CLI 性能模型：目录发现比安装数量更关键](../agent-tooling/skills-cli-performance-model.md) — `.skill-lock.json` 结构与控制全局安装数量的依据
- [backpass：把会话证据回灌到指令文件](backpass-instruction-backward-pass.md) — 从会话历史提炼指令文件改动的自动化工具边界
