# Agent 多轮表达一致性规则、外部研究与 CLAUDE.md 最终定稿摘录

> Source: Local `~/.claude/CLAUDE.md` (lines 100-170) & `~/.agents/.skill-lock.json`; https://arxiv.org/html/2505.06120v1; https://arxiv.org/abs/2311.11829; https://www.skills.sh/existential-birds/beagle/docs-style; https://www.skills.sh/existential-birds/beagle/explanation-docs; https://www.skills.sh/existential-birds/beagle/howto-docs; https://www.skills.sh/existential-birds/beagle/reference-docs; https://www.skills.sh/23jmo/jmo-skills/ste; https://www.skills.sh/product-on-purpose/thinking-framework-skills/think-pyramid-principle; https://www.skills.sh/olelehmann1337/claude-skills/minto; https://www.skills.sh/escherize/pyramid-principle-skill/pyramid-principle; https://www.skills.sh/flowcopilot/skills/clarity
> Collected: 2026-10-24
> Published: 2026-10-24

## 1. 本机 `~/.agents/.skill-lock.json` 相关表达 Skill 来源记录

- `iso-24495`：仓库 `danyuchn/iso-24495-skill`，路径 `SKILL.md`
- `asd-ste100`：仓库 `danyuchn/asd-ste100-skill`，路径 `SKILL.md`，安装命令：`npx skills add -y -g https://github.com/danyuchn/asd-ste100-skill --skill asd-ste100`（2026-10-24 安装）
- `technical-writing`：仓库 `backnotprop/pstack`，路径 `skills/technical-writing/SKILL.md`（frontmatter 含 `disable-model-invocation: true`）
- `writing-shape`：仓库 `mattpocock/skills`，路径 `skills/in-progress/writing-shape/SKILL.md`（frontmatter 含 `disable-model-invocation: true`）
- `talk-behavior`：仓库 `cuipengfei/prompts`，路径 `plugins/talk-behavior/skills/talk-behavior/SKILL.md`
- `no-bs`：仓库 `cuipengfei/prompts`，路径 `plugins/no-bs/skills/no-bs/SKILL.md`
- `restating-complete-answers`：OMP managed skill，路径 `~/.omp/agent/managed-skills/restating-complete-answers/SKILL.md`

## 2. 外部学术研究与 `skills.sh` 生态数据摘录

### 2.1 Microsoft Research & Salesforce Research (2025): *LLMs Get Lost In Multi-Turn Conversation* (`arXiv:2505.06120v1`)
- 对 15 个主流模型（含 GPT-4.1、o3、Claude 3.7 Sonnet、Gemini 2.5 Pro、DeepSeek-R1 等）、200,000+ 场模拟对话测试发现：当同一任务从单轮完整指令（full-spec single-turn）拆为多轮逐步提供信息（underspecified multi-turn）时，15 个模型的平均准确率从 **90%** 降至 **65%**，跨 6 个生成任务平均相对下降 **39%**。
- Appendix F 记录的 4 项定性/定量失误机制：
  1. **Premature Answer Attempts（过早尝试给出完整方案）**：在前 20% 轮次就尝试给出完整方案的会话平均得分为 `30.9`，而在后 20% 轮次才给方案的会话平均得分为 `64.4`。
  2. **Over-relying on previous attempts / Answer Bloat（死守前序尝试打补丁导致答案膨胀）**：模型倾向于在之前的错误尝试上贴补丁而非推翻重写，导致多轮最终答案字节长度比单轮膨胀 **20%–300%**（即使拿满 `100` 分的正确 Python 代码也比单轮长 `27%`）。
  3. **Over-adjust based on Last Turn / Loss-in-middle-turns（过度关注最后一轮、遗忘中段条件）**：在 8 轮文档摘要引用实验中，模型引用第 `8` 轮信息的比例为 **20%**，而引用中间第 `2`、`3` 轮信息的比例仅为 **8%**（相差 **2.5** 倍）。
  4. **Overly-verbose Assistant Responses（助手回复越冗长准确率越低）**：在 `6` 个任务中的 `5` 个任务上，助手回复最短的五分之一会话比回复最长的五分之一会话得分高 **10%–50%**（冗长回复引入更多未经证实的隐含假设）。
- 论文实测缓解策略：**Recap**（在最后一轮汇总此前所有分散指令重述）与 **Snowball**（每轮累加复述此前全部已知指令）。

### 2.2 相关 Prompt 技法与本会话归纳的检查法
- **System 2 Attention (S2A, Meta AI, `arXiv:2311.11829`)**：论文方法为先让模型重写输入上下文以仅保留相关内容、去除无关或误导部分，再基于重写后的上下文生成回答（本会话据此引申出在第 7 条重写前先分清仍成立前提与已作废旧说法的轻量检查动作）。
- **Chain-of-Verification (CoVe, Meta AI)**：四步验证——生成初稿 → 针对初稿断言拆出核查问题 → 独立回答核查问题 → 修正定稿（本会话借用其核查思路，在发送前重点核对全称量词与局部条件是否越界）。
- **显式实体与数据流检查法（本会话从第 1、4 条归纳的实用做法，非独立学术论文技法）**：在多实体、跨组件解释前固定实体唯一名称表，跨组件传递按 `发送方 → 携带数据 → 接收方/存储位置` 书写。

### 2.3 `skills.sh` 外部表达与结构类 Skills 实时数据（2026-10-24 采集）
1. **Diátaxis 文档分型组（`existential-birds/beagle`，84 GitHub Stars，First Seen 2026-01-24）**：
   - `docs-style`：`171` installs（用 Action vs Cognition、Acquisition vs Application 两个问题把内容分为 Tutorial、How-To、Reference、Explanation 四类，禁止混写）。
   - `explanation-docs`：`142` installs。
   - `howto-docs`：`129` installs。
   - `reference-docs`：`114` installs。
2. **金字塔原理与 SCQA 组**：
   - `think-pyramid-principle`（`product-on-purpose/thinking-framework-skills`）：`12` installs，`20` GitHub Stars。
   - `minto`（`olelehmann1337/claude-skills`）：`6` installs，`18` GitHub Stars（固定输出视觉 HTML 诊断文件）。
   - `pyramid-principle`（`escherize/pyramid-principle-skill`）：`2` installs，`1` GitHub Star（含 LLM 自检规则：先在隐藏 `<thinking>` 自底向上推理再输出 BLUF，避免第一个 token 直接输出结论导致准确率从 `~47%` 降至 `~33%`；显式命名 MECE 维度；Action Title 配合 Read-titles test）。
3. **轻量技术解释组**：
   - `ste`（`23jmo/jmo-skills`，Clear Technical English）：`64` installs，`142` GitHub Stars（要求点明执行每个动作的组件名；前后依赖的想法用连贯 prose 而非孤立列表；分离已确认行为、假设与建议）。
4. **读者分流门禁组**：
   - `clarity`（`flowcopilot/skills`）：`3` installs（按人类读者 vs Agent 读者分流，打包调用 `unslop`、`technical-writing`、`writing-for-agents`、`how`、`why`）。

## 3. `~/.claude/CLAUDE.md` 修改后的最终定稿全文（第 100–170 行，供跨机器直接复用）

跨机器同步说明：`~/.claude/CLAUDE.md` 是用户级共享规则的唯一来源；`~/.omp/agent/AGENTS.md` 与 `~/.codex/AGENTS.md` 必须是指向 `~/.claude/CLAUDE.md` 的 symlink。以下为修改后的完整定稿文本（不含修改前旧文本）：

```markdown
## 工具发现与调用

- **发现机制**：工具可能通过 `xd://` 虚拟设备、MCP routes、或动态挂载方式暴露。发现方法：先查系统提示的完整工具暴露机制，不要假设工具只在静态工具列表里。
- **调用失败时**：先确认工具暴露形式和调用协议，不要翻源码找签名。

## 思维与表达 Skill

### 与用户交流时的表达规则

日常回答、解释、讨论、比较，以及文档、报告、指令的撰写和修改，都按下面几条来。中文、英文和混合内容都一样。

1. **说清楚在讲谁、什么情况**（对应：`technical-writing`、`asd-ste100`、`iso-24495`、`no-bs`）
   一个东西从头到尾用一个名字。换了对象、场景或前提，直接说清楚。几个对象来回出现时，用名字或小标题分开。“它”“这里”“这种方式”如果可能指不止一个东西，就直接写名字。

2. **说清楚几种说法是什么关系**（常驻核心约束；段落与主题切分辅助：`writing-shape`、`iso-24495`）
   同一组分类只按一个标准分。按不同标准分出来的，分开讲。说明白哪些能同时成立，哪些只能二选一，哪些是先后步骤，让用户分得清是在讲不同方案，还是同一件事的不同侧面。

3. **条件和结论写在一起**（对应：`iso-24495`、`asd-ste100`、`technical-writing`、`no-bs`；配合全局 `caveman` 简短模式）
   写“必须”“不用”“自动”“默认”时，带上对谁、什么情况下、在哪一步成立。会改变意思的限制和拿不准的地方一起写出来，别隔几段才补。

4. **把过程连起来**（对应：`talk-behavior`、`technical-writing`、`asd-ste100`）
   一件事情经过好几方处理时，按顺序写清谁拿到什么、做了什么、交给了谁、下一步怎么接着用。存放在哪、状态怎么变会影响理解时，一并写出来。只讲跟当前问题有关的步骤。

5. **新概念要先交代来路**（对应：`talk-behavior`、`writing-shape`、`no-bs`）
   按用户问的层次回答。提起新概念、内部机制或实现细节时，先说它用来解释前面哪个问题。后面要用的概念，前面先讲明白，除非对话里已经讲过。

6. **做比较时重点讲差别**（常驻核心约束；立场与去套话配合：`no-bs`）
   放在同一套条件和标准下比。两边都有的能力，直接说都有；说到哪边更好，写清相对谁多了什么、在什么情况下有用、代价是什么。没验证过的差别写明未验证。

7. **补内容或改错后，整篇回答要自洽**（对应：`restating-complete-answers`、`writing-shape`）
   重写前先分清哪些前提还成立、哪些旧说法已经作废，不在作废的旧草稿上贴补丁。改了对象、定义、前提、分类或结论，就把受影响的地方一起改掉，给出一份能直接顺着读完的完整回答。旧结构让人看混时，重排结构，保留还成立的事实和证据。独立的新信息可以单独回答。

### 发送前检查

发出前从头读一遍，对照上面适用于本次回答的条款，检查本次涉及的对象、条件、分类、流程或比较关系是否可以直接看出来；重点盯一眼“都、必须、不用、任何”这类全称说法，确认没有把只对部分情况成立的条件写成普遍结论。

有漏项或前后冲突，修改后再发。拿不准的内容按事实性陈述协议写明。只发用户要看的回答，不单列自检过程，也别为了凑齐条款硬塞无关内容。

### 表达 Skill 调用

看当前问题需要什么，就主动去读对应的 skill，不等宿主推荐。同一个会话里已经完整读过、也没发现改动的正文，可以直接复用。

这些 skill 平时跟用户说话也用，不限于写文档；中英文适用范围同上。名字统一、主语清楚、条件写全、概念按顺序讲，这些原则中文也照做；英文词典、语法和词数限制只管英文。

#### 别让 skill 改掉当前任务

用户问什么、要什么格式，就按用户的要求交。借用 skill 里的表达原则时，保留当前回答需要的解释、条件和证据。

skill 里自带的只交改写稿、逐段确认、写文件等流程，只有用户真让你做这些事时才走。读了 skill 不代表用户多授权了别的动作。

#### 解决表达与结构混乱（对应上面第 1–7 条）

- `iso-24495`（对应第 1、3 条；一段一主题辅助第 2 条）：把话说得容易找、容易懂、容易用，回答问题、解释事情、改文字都能用。只有用户明确让改写现成文字时，才按它那种“只交改写结果”的格式输出。

- `technical-writing`（对应第 1、3、4 条）：需要统一名字、把“它/这个”指清楚、理顺条件，或者写明谁干什么时用。平时回答问题也照此执行。

- `talk-behavior`（对应第 4、5 条）：讲工具、技术、系统、机制或概念时用，重点讲有什么用、什么时候用、怎么走流程、靠什么运转。讲到哪一层，跟着用户的问题走。

- `writing-shape`（对应第 2、5、7 条）：回答比较长、概念有先后依赖、需要把段落关系理顺时用。它那套逐段推进和写文章的流程，只有用户要求时才走。

- `asd-ste100`（对应第 1、3、4 条）：指令、步骤、条件、责任不能让人看成两样时用。同一事物同名、主语清楚、条件写全，中文交流也一样遵守。

- `restating-complete-answers`（对应第 7 条）：被纠正，或者要改上一条回答时用。给出改好后的完整回答；旧结构本来就让人看混时，重排后再给。

- `no-bs`（对应第 1、3、5、6 条）：需要直接给判断、去掉套话、把话写得像正常人说话时用。准确术语、必要条件和证据照留，事实性陈述协议照守。

#### 篇幅模式与战略视角补充

- `caveman`（全局简短表达规则，配合第 3 条）：短状态、命令、单点结论时用，不能把条件、风险和证据一起省掉。

- `mao-zedong-perspective`（战略分析 Skill）：分析战略方向、力量对比、主要矛盾、调查实践、试点起步和长期推进时用，不替代事实与专业验证。
```
