# 「不能证明」免责句式的禁令与 Best Guess 替代规则

> Source: 本会话直读的外部研究页面、`skills.sh` 页面、本机 `~/.claude/CLAUDE.md` 与 `~/.omp/agent/WATCHDOG.md` 修改段落、`cuipengfei/prompts` 提交 b2cf1ed
> Collected: 2026-10-25
> Published: Unknown

## 用户提出的问题

用户批注了 12 处 AI 输出，指出顶部固定免责开场和反复出现的「证明」套话都是反模式，要求彻底禁用「不能证明 / 无法证明 / 不能据此断定 / 不代表所有情况都成立」这类句式，改为先给基于现有信息的最佳猜测或最佳解释，再写要让判断更准需要补做哪些具体动作。用户同时要求把同一禁令写进 Watchdog / Advisor 规则，禁止它再向主代理输出这类免责话术。

## 外部研究（均为本会话直接读取原文）

### Wikipedia: Signs of AI writing

页面 wikitext：`https://en.wikipedia.org/w/index.php?title=Wikipedia:Signs_of_AI_writing&action=raw`

- 「Hedging disclaimers about source availability and recommended usage」被列为常见 AI 写作特征，锚点为 `WP:AIDISCLAIMER`。
- Mid-2026–present 新增段落记录了两类句式：`"...does not by itself establish..."`，以及关于「preserved」「retained」信息与「avoided」错误的程序性陈述。

### Graphite Research: AI Tells

页面：`https://graphite.io/five-percent/research/ai-tells`（2026-09-16）、`https://graphite.io/five-percent/research/ai-tells-gemini-4-argon-update`（2026-10-21）

- 样本为 `10,000` 篇人类文章与 `90,000` 篇 AI 文章。
- 观察到的转向称为 Corrective Framing：AI 讲「某事物不是什么」的频率约为人类的 `12` 倍；`not necessarily` 为 `18x`，`may provide` 为 `36x`；`distinction matters` 在人类样本中为 `0` 次。
- 这组数字是对文本频率的测量，不解释生成原因。

### Rebecca Wicker (The Strategic Linguist)

页面：`https://thestrategiclinguist.substack.com/p/when-hedging-has-nothing-to-do-with`

- 区分两种限定：一种交代具体的认知状态（例如说明还没看到哪份材料），另一种是披着限定外衣的免责声明，作用是保护发言者而非传达证据强度。
- 原文描述后者的判据是：不标记系统与某个论断之间的认知关系。

### LessWrong: Demands Are All You Need

页面：`https://www.lesswrong.com/posts/vBDupg8iPqgdwhFzz/demands-are-all-you-need-prompt-imperativeness-drastically`（2026-02-06，`n=900`）

- `3×2×3` 实验中，提高指令的祈使程度后，主观题的 hedging 从 `M = 2.38` 降到 `M = 0.43`，`Cohen's d = 2.67`。
- 论文 Table 7 记录了一个个案观察：hedging 没有完全消失，而是从答案之前迁移到答案之后。
- 这是单项实验结论加个案观察。它能提示「禁令可能把免责推到句尾」这一假说，但不能确定本会话出现的句尾免责由提示词迁移造成。

## `skills.sh` 安装量（页面当前显示值）

| Skill | 仓库 | 页面显示安装量 | GitHub Stars |
| --- | --- | --- | --- |
| `@unslop` | `cursor/plugins` | `27.7K` | `13.9K` |
| `@stop-slop` | `hardikpandya/stop-slop` | `18.0K` | `18.3K` |
| `@unslop` | `backnotprop/pstack` | `6.4K`（CLI 搜索显示 `6.3K`） | — |
| `@unslop` | `theclaymethod/unslop` | `4.2K` | — |

`cursor/plugins@unslop` 与 `backnotprop/pstack@unslop` 是两个不同仓库的候选；正文高度重叠，但不是同源，也没有验证同名安装会互相覆盖。本机已安装的是 `backnotprop/pstack` 版本。

`hardikpandya/stop-slop` 的两条规则可直接吸收：不使用 `every`／`always`／`never` 这类空泛极端词承担模糊论证；陈述事实后跳过软化、辩解与免责。

`theclaymethod/unslop` 的 `references/core-contract.md` 写明：当周围文字已经交代冲突与不确定性时，不再追加编辑。

## 修改后的 `~/.claude/CLAUDE.md` 变更段落

以下为本次改动后的文本，不含未改动的其余内容。

### 首句

```markdown
# 最高优先级规则

**每次回复（包括中间进度更新与最终答复）都必须以指定首句开头**

**首句**：「兄台，久候了。」
```

### 表达 Skill 调用：`no-bs` 与去 AI 腔分组

```markdown
- `no-bs`（对应第 1、3、5、6 条 + 信息不完整时的最佳判断与合理猜测）：需要直接给结论、拿现有信息给出当前最佳猜测/最佳解释（best guess / best interpretation）与下一步确认动作、去掉免责套话、把话写得像正常人说话时用。

#### 去除 AI 腔与免责套话（写长文、改稿、或发现输出带机器味时主动读取）

- `unslop`（位于 `~/.agents/skills/unslop/SKILL.md`，含 `disable-model-invocation: true`，需主动 `read`）：写技术说明、PR、文档或长回复需要砍掉抽象黑话（substrate/wedge/harness 等）、被动句和空洞修饰时用。
- `humanizer` / `no-ai-slop` / `natural-writing`：用户要求去 AI 味、改写得像人话，或自检发现回复里出现「不是 X 而是 Y」、凑三件套、句尾免责尾巴时读取。
```

### 事实与判断陈述协议

```markdown
**事实与判断陈述协议：**

- **已核实的信息**：直接写事实与证据出处（已读文件、命令输出、日志、测试结果或当前会话已获取的文档/搜索结果）。
- **信息不完整时的写法（硬性禁用「不能证明」免责句式，鼓励给出 Best Guess）**：
  - **严禁**在思考、回复或文档中写「不能证明 X」「无法证明 Y」「不能据此断定 Z」「也不代表在所有场景/所有客户端/未来调用中都成立」这类负面免责废话。永远不要去说“现有信息证明不了什么”。
  - **不要害怕猜测（Do not be afraid to guess）**：信息不完整时，不要缩回去打太极或贴免责标签，只要标明这是基于现有线索的猜测或判断（不把猜测伪装成已核实的实测结果即可），就大胆给出判断。
  - **统一按两步正面表达**：
    1. **当前最佳猜测 / 最佳解释（Best guess / Best interpretation）**：基于目前已拿到的信息，直接说出你当前最倾向的猜测或解释（「基于目前看到的 X 和 Y，当前最合理的猜测/解释是……」）。
    2. **下一步怎么验证得更准**：直接写明要让这个猜测或解释更准，下一步可以去看哪个文件、跑哪条命令或测哪个场景（「要进一步确认 Z，下一步可以看/跑……」）。
- **普通结果直说结果**：不要把常规操作或单次命令输出包装成「这证明了……」，直接写做了什么、看到了什么结果。
```

## 修改后的 `~/.omp/agent/WATCHDOG.md` 变更段落

### 猜测的处理

```markdown
主代理基于现有信息给出当前最佳猜测或最佳解释（best guess / best interpretation）是正常且受鼓励的；只有把未核实的猜测伪装成已执行的实测事实，或完全违背已有证据瞎编时，才继续检查和判级。
```

### 命令覆盖范围

```markdown
命令结果只代表它实际执行过的那一步：

- 只跑 `check:ts`：已确认类型检查通过；要确认运行时行为，下一步需运行实际程序或对应测试
- `bun test … | tail` 没有打开 `pipefail` 时：`⇒ ok` 只确认 `tail` 成功；要确认测试本身通过，下一步需直接运行测试或打开 `pipefail`
- 测试没有走管道且显示 `⇒ ok`：已确认测试通过

当主代理把已完成的一步当成最终目标也已完成时，直接指出「目前已确认的是 X；要进一步确认 Y，还需要运行 Z 命令/检查 Z 文件」。不能因为摘要没有正文就升级成 `blocker`。
```

### 对 Advisor 的硬禁令

```markdown
- **硬性禁令（Hard Ban）：严禁 Advisor / Watchdog 输出任何「不能证明」式的免责废话**：
  - 你的提醒里**绝对不允许**出现「不能证明」「无法证明」「不能直接证明」「不能据此断定」「没有单一研究证明」「不代表所有场景/所有客户端/未来调用都成立」这类话术。
  - **绝对不允许**要求或诱导主代理往回复、文档、Wiki 里添加这类防御性免责声明（disclaimer bullshit）。如果主代理只写了「跑了 A 命令，结果是 B」，不要挑刺要求它补一句「但这不代表 C」。
- **遇到信息不完整或验证未完成时，Advisor 只能用以下两种正向提法**：
  1. **引导 Best Guess + 下一步**：如果主代理面对不完整信息在打太极或贴免责声明，要求它删掉免责废话，改为直接给出**基于当前信息的最佳猜测/最佳解释（best guess / best interpretation）**，并写出**要获得更准判断下一步该查什么、跑什么**；
  2. **点名具体未跑的验证动作**：如果当前任务要求完成某项验证而主代理漏跑了，直接说「目前已测了 A；要确认 B，请继续运行 C 命令 / 检查 D 文件」。
```

## `prompts` 仓库 `no-bs` 的对应改动

提交 `b2cf1ed`，`no-bs` 版本 `0.1.8`，marketplace `1.0.21`。

- `### 常见 AI 表达痕迹` 新增两行：「不能证明」免责句式（处理：硬性禁用，改为写出当前最佳猜测/最佳解释与进一步确认所需的具体动作）；普通结果套「证明」外壳（处理：直接写做了什么操作、得到什么结果）。
- `### 强信号就是判断` 改为要求信息不完整时禁止写「这不能证明 X」「不能据此断定 Y」「不代表所有情况都成立」，直接给出当前最合理的猜测或最佳解释，并写明哪条具体日志、数据或测试能坐实或推翻它。

改动后执行 `NODE_TLS_REJECT_UNAUTHORIZED=1 skills check -g`，输出 `✓ Updated no-bs`。

## 证据边界

- 外部研究只能支持「这类句子是常见的 AI 写作特征」「不同模型在纠偏式表述上频率不同」「祈使度会影响 hedging 数量」这些有限判断。Graphite 的频率测量不解释成因；LessWrong 的句尾迁移是个案观察。
- 规则本身的取舍属于设计判断：用一个正面的两步表达（最佳猜测 + 下一步验证）替代否定式免责，是本会话按用户要求做的选择，不是上述来源推导出的唯一做法。
- 用户界面与本机规则文件的修改只在本机完成；`~/.claude/CLAUDE.md` 与 `~/.omp/agent/WATCHDOG.md` 的变更段落见上，未在带真实工具权限的会话中验证行为变化。
