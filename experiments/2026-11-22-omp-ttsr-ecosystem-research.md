# OMP / Pi 公开 TTSR 规则生态调研

调研日期：2026-11-22。本文为研究草稿，只读取公开资料，未安装规则、未运行候选插件、未修改本地 OMP 配置。

## 阅读图例

- `[single-source]`：结论来自一个项目的一手源码、API 或项目说明；同一项目的多个文件不算多个独立来源。
- `[unknown]`：公开资料或本轮读取不足以确定，需要保留不确定性。
- **一手源码直读**：已经读取实际 Markdown、`.mdc` 或 `package.json` 内容。
- **文档声明**：作者在 README 或官方文档中说明，本文没有复现实验。
- **推断 / 未实测**：根据触发条件、作用范围与依赖分析适用性，尚未在用户环境中运行。

**TTSR** 是 OMP 的 Time Traveling Stream Rules：模型生成内容命中特定条件时，系统投递 Markdown 提醒，部分规则还会中断生成并重试。**frontmatter** 是文件开头由 `---` 包围的 YAML 元数据。**scope** 指规则观察的输出范围；**interruptMode: never** 表示只提醒，允许当前输出或工具继续完成。**AST** 是代码的语法结构，用于识别正则较难表达的代码写法。

## 先回答用户的问题

公开规则来源比此前三份候选明显更多。本轮发现了六份值得具体阅读的新来源：`M0n7y5/slop-stop`、`themuuln/omp-config`、`kartikkabadi/no-ai-slop`、`stray-nick/terse-agent-output`、`joshuaswarren/remnic`、`tomkyser/omp-holmes`。它们都包含实际的条件规则文件；最后一份存在较明显的版本与正则兼容疑问。[single-source] 证据形态：一手源码直读。

**较接近当前目的的组合，是分别选择表达规则、证据提醒与命令提醒，避免整套配置导入。** `slop-stop` 能识别英文无证据成功措辞，`themuuln/omp-config` 提供验证、资源与重复请求提醒，`remnic` 提供具体命令和文件安全示例。这一推荐来自静态阅读，不能视为已在用户环境中验证。

**本轮没有找到可以直接证明“中文所有完成报告都有真实证据”的通用纯 Markdown 规则包。** 英文正则可以识别若干危险措辞，但无法仅凭一个“完成”词语判断是否已有执行证据。需要语义判断或执行记录关联的候选，通常依赖扩展；这些能力未计入它们的原生 TTSR 数量。[unknown]

仓库星数较高的 `FluxDown`、`remnic` 和 `eta` 主要是完整应用或工具项目。它们的 stars 不能解释为规则包的采用人数，也不能证明规则质量。

## 范围、方法与搜索来源

### 纳入标准

优先纳入实际文件带有非空 `condition`、`astCondition` 或 OMP 原生 `question` 的规则。`interruptMode`、`scope` 与 README 中的 OMP 说明用于辅助确认。

单独的 `alwaysApply: true`、`description`、`globs`，以及 `WATCHDOG.md`，不计为条件式 TTSR。扩展中存在规则加载器，也不等于仓库提供了可复用的规则文件。`.mdc` 后缀同样需要检查内容，不能自动计为 TTSR。

原生加载机制与语义判断说明，直读以下官方资料：

- https://github.com/can1357/oh-my-pi/blob/main/docs/rulebook-matching-pipeline.md
- https://omp.sh/docs/ttsr
- https://github.com/can1357/oh-my-pi/issues/17700

其中 GitHub 的匹配流程文档已经说明 `question` 与逐条 `repeatMode`；官网页面仍包含“全部规则使用全局重复策略”等较早说明。本文涉及这些字段时采用 GitHub 当前文档，不把旧网页的限制推广到所有版本。未检查用户本地 OMP 版本与对应实现。[single-source] 证据形态：文档声明。

### 实际使用的工具

使用 `web_search` 做网页发现；使用 `gh api -X GET search/repositories` 和 `search/code` 做全局仓库、代码查询；使用 `github file_read` 读取 README、具体规则与包清单；使用 `gh api repos/<owner>/<repo>` 获取 stars 和 `pushed_at`；使用 Git tree API 获取文件目录，所有用于完整计数的目录响应均为 `truncated: false`。

另外调用了一次 grep.app MCP 的 `searchGitHub`，查询 `interruptMode:` 并限制路径为 `rules`，返回内容主要是 OMP 上游规则，未提供新的独立规则包。没有主动调用 Tavily MCP；一次 `web_search` 的自动回退仍尝试 Tavily，并返回额度 432 错误，随后由 Exa 返回结果。这个回退由工具内部处理，本轮后续主要依靠 GitHub API。

网页命中数指工具实际返回的来源条数；GitHub 命中数指 API 的 `total_count`。二者均不表示有效规则包数量。超过 100 条的查询只检查首批 100 条，因此本报告不声称穷尽整个生态。

### 四轮检索

| 轮次 | 覆盖面 | 结果与下一步 |
| --- | --- | --- |
| 第一轮 | `TTSR`、完整英文名称、`.omp/rules`、`WATCHDOG.md`；网页与仓库搜索 | 发现命名重复较多，实际规则经常藏在个人配置或应用项目中；扩大至代码文件 |
| 第二轮 | `interruptMode:`、`condition:`、`scope:`、`.mdc`、`repeatMode:` | 找到表达规则包、配置导出、应用项目规则；逐个检查目录与源码 |
| 第三轮 | 中文、awesome 清单、HN / Reddit、兼容规则；候选完整目录分类 | 区分规则包、常驻规则、扩展；找到作者明确列出的误报与命令行模式限制 |
| 第四轮 | 完成证据、防循环、中文触发与反方查询 | 补充 HOLMES；确认原生正则提醒与真正证据核验之间仍有能力差异 |

读取了 `bubbleptr/awesome-pi` 的 README，包括此前被工具省略的工作流与工具章节；它提到 `code-yeongyu/pi-rules`，属于规则发现扩展，没有作为规则包纳入。`shaftoe/awesome-pi-coding-agent` 的 README 为 3.3 MB，`file_read` 未返回文件内容；仓库内 `TTSR` 代码查询只返回 `pnpm-lock.yaml`，因此这一清单的完整内容覆盖标为不足。进一步读取了中文 `hyeebeen/awesome-omp` 的 README：它主要提供机制与生态入口，不能把其扩展数量换算为规则包数量。

清单来源：

- https://github.com/bubbleptr/awesome-pi/blob/main/README.md
- https://github.com/shaftoe/awesome-pi-coding-agent/blob/main/README.md
- https://github.com/hyeebeen/awesome-omp/blob/main/README.md

HN 中确有用户表示使用个人 TTSR 禁词规则，但没有同时公布规则文件。这只能证明使用场景，不能计作公开规则包：

- https://news.ycombinator.com/item?id=49320455 ，2026-08-16 / 17 的评论，证据形态：社区原文直读。用户评价没有独立实验支持。

辅助网页来源已查但未逐条列出；未把博客转载或搜索摘要当作源码证据。

## 新候选排名

排序优先考虑用户五项需求、独立使用条件和打扰风险，stars 与 `pushed_at` 作为次要参考。此排序为**推断 / 未实测**，没有构造综合分数。星数均链接到本轮读取的一手 GitHub API；时间统一为 UTC。规则数量排除 README 与常驻说明。

### 优先阅读的六份新来源

| 排名 | 仓库完整 URL | stars | pushed_at | TTSR 数量 | 适合 OMP 的程度 | 一句话评价 |
| --- | --- | ---: | --- | --- | --- | --- |
| 1 | [M0n7y5/slop-stop](https://github.com/M0n7y5/slop-stop) | [2](https://api.github.com/repos/M0n7y5/slop-stop) | 2026-08-19T16:32:27Z | **5**，另有 5 份常驻规则 | 较高，选择使用 | 同时覆盖英文表达、虚假成功措辞、占位注释与无效测试；全套中断较多 |
| 2 | [themuuln/omp-config](https://github.com/themuuln/omp-config) | [1](https://api.github.com/repos/themuuln/omp-config) | 2026-09-23T09:26:13Z | **39**，另有 1 份常驻规则 | 较高，需要整理依赖 | `.mdc` 中确有原生触发字段，证据与资源提醒丰富，但个人环境约定很多 |
| 3 | [kartikkabadi/no-ai-slop](https://github.com/kartikkabadi/no-ai-slop) | [17](https://api.github.com/repos/kartikkabadi/no-ai-slop) | 2026-10-15T04:09:49Z | **3** | 中等，表达专题 | 两份英文表达规则和一份代码规则；正文已有“二份规则”的过期说法 |
| 4 | [stray-nick/terse-agent-output](https://github.com/stray-nick/terse-agent-output) | [13](https://api.github.com/repos/stray-nick/terse-agent-output) | 2026-08-10T14:57:03Z | **1**，另有 1 份 OMP 常驻规则 | 中等，需避开已声明限制 | 输出先给答案、保留原始错误；作者明确提醒 `-p` 模式可能挂起 |
| 5 | [joshuaswarren/remnic](https://github.com/joshuaswarren/remnic) | [235](https://api.github.com/repos/joshuaswarren/remnic) | 2026-11-22T07:34:54Z | **13**，不含目录 README | 中等，选择命令与边界规则 | 具体规则重视低误报，适合作为命令和文件安全来源；大量内容绑定 remnic |
| 6 | [tomkyser/omp-holmes](https://github.com/tomkyser/omp-holmes) | [0](https://api.github.com/repos/tomkyser/omp-holmes) | 2026-06-11T15:57:08Z | **7 份条件规则资产**，另有 1 份常驻规则 | 较低，兼容性待确认 | 确有“改动后验证”规则；完整证据核验依赖扩展，正则与配置写法有版本疑问 |

这六份来源的具体条件规则都已直读；`themuuln` 的 40 份规则资产、`remnic` 的 13 份条件规则、HOLMES 的 8 份规则资产均完成 frontmatter 分类。**条件规则数量与“当前宿主一定加载并正确触发”分开陈述**，后者未实测。

### 其他确有规则文件的新来源

| 仓库完整 URL | stars | pushed_at | 数量与读取范围 | 内容分类、依赖与适用性 |
| --- | ---: | --- | --- | --- |
| [zerx-lab/FluxDown](https://github.com/zerx-lab/FluxDown) | [5910](https://api.github.com/repos/zerx-lab/FluxDown) | 2026-11-22T06:17:36Z | `.omp/rules/` **23 份条件规则 + 1 份普通规则**；完整分类 | 中文规则、禁止命令、Rust 约定、多个客户端同步；中文最有参考价值，但项目路径、发布流程与 hook 依赖很多，不适合整包导入 |
| [0xfe-project/eta](https://github.com/0xfe-project/eta) | [281](https://api.github.com/repos/0xfe-project/eta) | 2026-11-22T09:01:48Z | **27 份 OMP 预设资产**，目录数与 README 一致；源码抽读 2 份 | Go / Rust / TypeScript 规则，README 说明复制自 OMP v18.2.11；属于上游预设副本，独立新规则价值有限 |
| [rstacruz/omp-typescript-antislop](https://github.com/rstacruz/omp-typescript-antislop) | [1](https://api.github.com/repos/rstacruz/omp-typescript-antislop) | 2026-10-10T11:16:44Z | **14**，全部条件文件直读 | 类型表达、模块模拟、复制开销；无私有脚本要求，六份默认中断、八份提醒；适合 TypeScript 专题，不覆盖中文完成报告 |
| [jvsteiner/agent-rules](https://github.com/jvsteiner/agent-rules) | [0](https://api.github.com/repos/jvsteiner/agent-rules) | 2026-10-11T10:18:53Z | **10**，`rules/` 全部文件直读 | 原生规则均为 `never`；秘密、异常、类型与调试输出；更强的完成报告与术语判断位于另一套 Jev 策略中，不能计作原生 TTSR |
| [pjsny/omp-commitwright](https://github.com/pjsny/omp-commitwright) | [9](https://api.github.com/repos/pjsny/omp-commitwright) | 2026-08-19T16:38:52Z | **1**，源码直读 | `git` / `jj` / `gh pr` 命令触发提交与 PR 写作规范；完整检查依赖 Bun、Vale、Google 样式包与扩展，中文提交不适合直接采用英文要求 |
| [autopus-ai/autopus-adk](https://github.com/autopus-ai/autopus-adk) | [109](https://api.github.com/repos/autopus-ai/autopus-adk) | 2026-11-22T09:08:47Z | **1 份 TTSR + 3 份非 TTSR**，`content/rules/` 全部直读 | 唯一条件规则 `lore-commit.md` 要求专有提交格式、Autopus 署名和 `auto check --lore`；当前需求不适合直接采用 |
| [austinm911/anti-slop](https://github.com/austinm911/anti-slop) | [0](https://api.github.com/repos/austinm911/anti-slop) | 2026-11-05T22:25:37Z | `omp/rules/` **1**，源码直读 | 阻止 `Record<string, unknown>`，限定 TypeScript edit/write；单文件不绑定私有命令，但属于较强的类型风格约束 |
| [ghost-him/ZeroLaunch-rs](https://github.com/ghost-him/ZeroLaunch-rs) | [585](https://api.github.com/repos/ghost-him/ZeroLaunch-rs) | 2026-11-21T12:08:00Z | **至少 1 份确认的 TTSR**；目录未全量分类，不能把全部 Markdown 数量称为 TTSR 数量 | 中文应用项目规则；已读禁止备份文件规则，`copy` 文件名限制较宽，且引用项目自身 `RULES.md`；更适合学习规则写法 |

补充候选数量中，`eta` 的 27 是“目录资产数 + 作者来源声明”，只对两份具体文件确认了原生字段；`ZeroLaunch-rs` 保留“至少 1”口径。其余表中明确写出完整分类的数量来自实际内容，避免用目录数量代替有效规则数量。

## 六份重点候选的机制与反方

### 1. M0n7y5/slop-stop：最接近“表达 + 不虚报”的轻量来源

**一手源码直读 [single-source]。** 五份 TTSR 为 `no-prose-slop`、`no-slop-comments`、`no-slop-commits`、`no-slop-tests`、`no-dashes`。五份常驻合同分别约束回复、评论、提交、代码和测试。

- [no-prose-slop.md](https://github.com/M0n7y5/slop-stop/blob/main/rules/no-prose-slop.md)：`scope: text`、`interruptMode: always`。除开场套话，还匹配 `should work now`、`seems to pass`、`probably works`、`I'm confident` 等成功措辞。正文要求执行验证并引用输出，或者明确说没有验证。
- [no-slop-tests.md](https://github.com/M0n7y5/slop-stop/blob/main/rules/no-slop-tests.md)：仅观察 edit/write，并通过测试文件 glob 筛选。识别永远为真的断言、空测试、用同一函数生成预期结果、睡眠式等待。
- [no-slop-comments.md](https://github.com/M0n7y5/slop-stop/blob/main/rules/no-slop-comments.md)：识别占位省略、叙述性注释与无归属 TODO；正文要求真实实现或说明缺少的前提。
- [no-dashes.md](https://github.com/M0n7y5/slop-stop/blob/main/rules/no-dashes.md)：匹配 `[—–―]`，范围包括文本和所有写入文件。
- [README](https://github.com/M0n7y5/slop-stop/blob/main/README.md) 与 [package.json](https://github.com/M0n7y5/slop-stop/blob/main/package.json)：确认 OMP 分发形态；没有把扩展本身计为规则。

**适用性推断 / 未实测。** `no-prose-slop` 与 `no-slop-tests` 值得优先阅读。不需要作者私有命令即可单独读取规则文件，但 README 建议改变全局重复策略，本文没有执行。

**反方。** 英文正则不会识别中文“已经完成”“验证通过”；匹配成功措辞也不等于核对了真实工具结果。`no-dashes` 能匹配中文标点，却可能妨碍原文引用、字符串常量和用户明确要求的文本。作者 README 已接受教程 Markdown、Ruby/YARD 文档、第三方引用及部分轮询等待的误报，说明整包强中断需要谨慎。

作者声称有 172 条回放样例和 CI；这是文档声明，本文未运行，也未独立验证其质量。

### 2. themuuln/omp-config：真正有原生 TTSR 的 `.mdc` 配置导出

**一手源码直读 [single-source]。** `agent/rules/` 共有 40 份 `.mdc`，39 份带非空 `condition`；`edit-retry-discipline.mdc` 为 `alwaysApply: true`、`condition: null`、`scope: []`，单独计作常驻规则。

- [concise-output.mdc](https://github.com/themuuln/omp-config/blob/main/agent/rules/concise-output.mdc)：文本范围、`interruptMode: never`；命中 `too long`、`less verbose` 等英文内容后提示缩短，同时保留文件路径、命令和观察结果。
- [check-health.mdc](https://github.com/themuuln/omp-config/blob/main/agent/rules/check-health.mdc)：提醒采用足够证明改动的低成本检查，要求只报告实际执行结果。
- [oracle-verification.mdc](https://github.com/themuuln/omp-config/blob/main/agent/rules/oracle-verification.mdc)：在委派结果或评审结果相关英文内容出现时提醒验证政策，限制重复验证周期。
- [provider-quota-handling.mdc](https://github.com/themuuln/omp-config/blob/main/agent/rules/provider-quota-handling.mdc)：识别配额、402、429 等内容，提醒停止无变化重复请求并原样报告错误。
- [resource-guard.mdc](https://github.com/themuuln/omp-config/blob/main/agent/rules/resource-guard.mdc)：避免重复启动测试或开发服务器。
- [cwd-awareness.mdc](https://github.com/themuuln/omp-config/blob/main/agent/rules/cwd-awareness.mdc)：观察工具参数中的 `apps/`、`packages/` 等路径，提醒核对当前工作目录。
- [edit-retry-discipline.mdc](https://github.com/themuuln/omp-config/blob/main/agent/rules/edit-retry-discipline.mdc)：常驻指导，编辑失败后重新读取，不盲目使用旧匹配内容。
- [README](https://github.com/themuuln/omp-config/blob/main/README.md)：明确这是从个人 `~/.omp` 生成的配置分发快照。

**适用性推断 / 未实测。** `never` 提醒比较适合“不打扰”。原生 `.mdc` 兼容已经有具体字段证据，无须借用 Cursor 扩展解释其形态。

**反方。** 很多 `scope: text` 的正则监视的是模型自己的输出，无法直接监听用户上一句“太长了”。如果模型没有复述英文关键词，`concise-output` 可能完全不触发。`loop-engineering` 是自动化主题提醒，并非识别所有重复行动的检测器。

部分规则绑定 `hub`、`omp-review`、`~/.omp/scripts/log-task-outcome.py`、自定义技能与 `commit-gate.sh`；`resource-guard` 甚至假定 16 GB M1 Pro，并使用 `sysctl vm.swapusage`。这些约定不适合直接搬到 WSL 环境。正文把全部 429 都归为不可重试，还把验证循环限定为一次；这些是作者政策，不能当作所有服务与所有故障的技术规律。

[agent-device-verification.mdc](https://github.com/themuuln/omp-config/blob/main/agent/rules/agent-device-verification.mdc) 的证据报告方式值得参考，但绑定 iPhone、macOS、Expo 和作者具体应用环境。

### 3. kartikkabadi/no-ai-slop：英文表达规则较完整

**一手源码直读 [single-source]。** 实际规则为三份，README 开头“two rules”与后续文件列表不同；数量以源码为准。

- [voice.md](https://github.com/kartikkabadi/no-ai-slop/blob/main/voice.md)：`scope: text`、`interruptMode: prose-only`；匹配英文企业用语、夸张表达、套话与填充词。
- [simple-english.md](https://github.com/kartikkabadi/no-ai-slop/blob/main/simple-english.md)：同样只观察文本，要求短句、直接说明、每句一个意思。
- [clean-code.md](https://github.com/kartikkabadi/no-ai-slop/blob/main/clean-code.md)：限定多个语言的 edit/write，结合正则和 AST，识别类型不安全、吞掉错误、调试残留与占位内容。
- [README](https://github.com/kartikkabadi/no-ai-slop/blob/main/README.md)：安装方式为复制三份文件到原生规则目录；验证脚本依赖 Node 与 ast-grep，规则正文没有绑定作者私有命令。

**适用性推断 / 未实测。** 更适合英文技术说明。中文回复里仍可能出现英文填充词或名称，但中文句式与禁词不受这些正则保护。

**反方。** `voice` 连 `very`、`really`、`best practice` 等普通或必要表达也匹配；讨论禁词、引用来源或写英文术语时可能误报。`clean-code` 把较多代码风格纳入统一约束，测试、脚本、示例中的调试输出未必都是问题。

`simple-english` 同时带 `alwaysApply: true` 和有效 `condition`。按 OMP 当前分组文档，它属于 TTSR，**不会同时每轮注入正文**。作者称它“always-on”的说法不能直接用于估算上下文成本。将三份文件照搬，不能保证所有新会话一开始就已经得到完整表达指导。

### 4. stray-nick/terse-agent-output：常驻表达合同与一份中断规则

**一手源码直读 [single-source]。** OMP 目录有两份规则资产，只有一份为 TTSR。

- [omp/terse.md](https://github.com/stray-nick/terse-agent-output/blob/main/omp/terse.md)：`alwaysApply: true`；要求结果在前、保持原始错误与命令、不编造版本和结果，准确性优先。
- [omp/no-forbidden-openers.md](https://github.com/stray-nick/terse-agent-output/blob/main/omp/no-forbidden-openers.md)：`scope: text`、`interruptMode: always`；正则以 `^` 开头，匹配英文开场套话。
- [omp/README.md](https://github.com/stray-nick/terse-agent-output/blob/main/omp/README.md)：明确指出 TTSR 在交互模式工作，`-p` 输出模式会挂起，依靠脚本调用时应移除这份 enforcement 规则。
- [package.json](https://github.com/stray-nick/terse-agent-output/blob/main/package.json)：npm 包的 `pi.extensions` 指向扩展；安装 Pi 扩展并不自动证明已经安装 OMP 目录中的 TTSR 文件。

**适用性推断 / 未实测。** 常驻的准确性合同与当前需求相近，单文件没有私有命令依赖。但它包含每轮报告进度、具体时间估计、末尾给下一步等要求，可能与用户“无额外播报”的习惯冲突。

**反方。** enforcement 的说明声称覆盖开场与结束套话，但整个正则有开头锚点 `^`。通常位于回复末尾的 `Hope this helps` 无法由这一模式全面覆盖。这是源码推断，未实测。对中文开场句式也没有直接覆盖。

`-p` 限制为作者文档声明，尚未确认当前 OMP 版本是否仍然复现；报告没有把它写成已经实测的现存故障。

### 5. joshuaswarren/remnic：低误报纪律与具体命令示例

**一手源码直读 [single-source]。** 13 份条件规则包含正则和 AST。源码分为文件边界、隐私、配置类型、包边界、比较器与项目 API 约定。

- [.omp/rules/README.md](https://github.com/joshuaswarren/remnic/blob/main/.omp/rules/README.md)：说明低误报优先，列出已经拒绝的候选模式，例如广泛识别 `String(err)`、`Date.parse` 或单参数 `assert.throws` 会命中大量合法代码。历史审查数量是作者自述。
- [remnic-gh-body-from-file.md](https://github.com/joshuaswarren/remnic/blob/main/.omp/rules/remnic-gh-body-from-file.md)：识别特定 `body="$(cat <<` 构造，`interruptMode: never`；提醒用 `gh pr create --body-file` 或 `gh api -F body=@...` 传入正文。
- [remnic-fs-boundary-checks.md](https://github.com/joshuaswarren/remnic/blob/main/.omp/rules/remnic-fs-boundary-checks.md)：识别 `statSync(...).isDirectory()` 和字符串前缀式路径检查，提示符号链接与目录包含关系的风险。
- [remnic-no-real-home-paths.md](https://github.com/joshuaswarren/remnic/blob/main/.omp/rules/remnic-no-real-home-paths.md)：识别 Linux、macOS、Windows 中疑似真实用户目录；提供通用测试姓名与 `HOME` 替代方式。
- [remnic-process-env-delete.md](https://github.com/joshuaswarren/remnic/blob/main/.omp/rules/remnic-process-env-delete.md)：AST 识别将 `process.env` 设为 `undefined` 的写法。

**适用性推断 / 未实测。** 不需要作者私有命令即可读取通用规则；路径、命令和代码模式与中文回复语言基本无关。但 `stubPersistExtraction`、`writeMemory`、`@remnic/*` 与特定基线文件属于项目规则，不能整体采用。

**反方。** `remnic-gh-body-from-file` 设置文件 `globs`，却没有明确 `scope: tool:bash`；直接 bash 参数不一定带关联文件路径，因此不能把这份规则称为经过验证的“所有 gh 命令保护”。而且 `never` 允许当次工具完成，不能防止当次正文已经错误提交。

其正文把带引号 heredoc 描述为普遍会展开反引号，解释范围较大；shell 的实际引用方式很关键。本文只认可“使用正文文件更容易避免引用问题”这一窄建议，不认可源码解释对所有 heredoc 都成立。未运行 shell 实验。

个人路径检测可能阻止必要的真实错误原文或用户明确要求记录的路径；保留真实错误与保护隐私需要按输出目的处理，不能只靠姓名白名单。

### 6. tomkyser/omp-holmes：方向贴近证据核验，不能把扩展能力算给七份规则

**一手源码直读 [single-source]。** 七份条件规则监视未验证假设、顺序查询计划、缺少验证的改动计划、用 eval 绕过权限等内容；另有 `RULES.md` 常驻合同。

- [edit-without-verify.md](https://github.com/tomkyser/omp-holmes/blob/main/rules/edit-without-verify.md)：`scope: text, thinking`；匹配改动计划与 `done`、`complete` 等英文组合，正文要求说明可观察验证。
- [forward-chain-guard.md](https://github.com/tomkyser/omp-holmes/blob/main/rules/forward-chain-guard.md)：提醒先说明结束条件、证据差异与观察点，再决定改动。
- [assumption-guard.md](https://github.com/tomkyser/omp-holmes/blob/main/rules/assumption-guard.md)：识别 `this should work` 等假设转行动的英文内容。
- [README](https://github.com/tomkyser/omp-holmes/blob/main/README.md)：说明真正对照工具日志、核对证据引用的结束检查由扩展完成；最多要求一次修复，仍不满足时记录软性违规后结束。不是无限制强制验证。

**适用性推断 / 未实测。** 设计目标接近“不能无证据报完成”，但单独复制七份 Markdown 只得到模式提醒。只有运行扩展才能获得 README 声称的执行记录关联；本文没有运行。

**反方与兼容缺口。** 七份正则均采用 `(?is:...)` 的局部模式组。OMP 官网只明确说明前置 `(?i)`、`(?m)`、`(?s)` 转换，未确认所有运行时对这类局部组的支持。README 还使用 `repeatMode: afterGap`，与当前官方配置写法 `after-gap` 不同。不能把这些文件标为当前版本即装即用。[unknown]

英文正则不会覆盖中文完成措辞。顺序查询规则可能打断真正有前后依赖的调查，eval 写入规则也会阻止合法脚本任务。完整框架对输出结构和权限说明要求较重，与“不打扰”目标存在明显冲突。README 声明 MIT，但本轮 API 的 license 为空，没有继续核验授权文件；公开读取不等于已经确认所有复用条件。

## 中文与兼容规则方向的实际发现

**中文项目已有原生 TTSR，中文通用表达包仍未获得足够证据。** `FluxDown` 的 [forbidden-commands.md](https://github.com/zerx-lab/FluxDown/blob/main/.omp/rules/forbidden-commands.md) 观察 `tool:bash`，匹配全量 Cargo 测试、标签推送、`--no-verify` 与降低 lint 的命令；正文为中文，同时说明另有执行前 hook。TTSR 提醒与 hook 权限检查不能混为一谈。[single-source] 证据形态：一手源码直读。

[no-meta-in-comments.md](https://github.com/zerx-lab/FluxDown/blob/main/.omp/rules/no-meta-in-comments.md) 确有中文触发词，例如“参考”“借鉴”，但限定该项目代码路径。它不是通用中文回复风格规则。[no-ignored-errors-in-rust.md](https://github.com/zerx-lab/FluxDown/blob/main/.omp/rules/no-ignored-errors-in-rust.md) 只有说明与 globs，没有触发字段，所以不计入 23 条。

`.cursor/rules/` 有对应 `.mdc` 副本，和 `.omp/rules/` 不能重复计数。源码包含原生条件字段，因此它们与只有 `alwaysApply` 的 Cursor 文本规则不同。

`eta` 的 [预设 README](https://github.com/0xfe-project/eta/blob/main/packages/TOBEREFR/eta-plugin-akhook/presets/omp/README.md) 明确：27 份规则复制自 OMP v18.2.11，在 akhook 中转换为执行前拒绝，**不保留原本 `interruptMode: never` 的提醒语义**。源码例如 [ts-set-map.md](https://github.com/0xfe-project/eta/blob/main/packages/TOBEREFR/eta-plugin-akhook/presets/omp/ts-set-map.md) 与 [go-rand-v2.md](https://github.com/0xfe-project/eta/blob/main/packages/TOBEREFR/eta-plugin-akhook/presets/omp/go-rand-v2.md) 的确保留 OMP 元数据。可以当作源码来源，不能把 akhook 使用效果推广到 OMP。

兼容规则反例：[netanelavr/agent-kit 的 kit-evidence.mdc](https://github.com/netanelavr/agent-kit/blob/main/rules/kit-evidence.mdc)，要求外部主张附活跃 URL 与日期，内容很贴近证据纪律；它只有 `alwaysApply: true`，没有条件触发，属于常驻规则。该仓库 API 为 [6 stars，pushed_at 2026-10-24T11:06:43Z](https://api.github.com/repos/netanelavr/agent-kit)。本轮未把它列为 TTSR 包。

## 排除、混合形态与旧候选校正

| 来源 | 本轮发现 | 分类处理 |
| --- | --- | --- |
| [oh-my-omp/omp-config](https://github.com/oh-my-omp/omp-config) | API：16 stars，2026-11-21T22:27:30Z；目录主要是扩展、提示词片段、watchdog、TURN-JUDGE 与常规规则 | 没有把其 `when.*` 判定表达式当作 OMP 原生 TTSR frontmatter；不计入原生规则包排名 |
| [kzarzycki/claude-mods](https://github.com/kzarzycki/claude-mods) | API：2 stars，2026-11-20T15:03:13Z；TTSR 相关部分主要是 `plugins/ttsr-rules/hooks/rules.ts` 与测试 | 宿主扩展实现；项目常规规则的 `paths` 不构成条件式 TTSR |
| [ctxr-dev/simple-language](https://github.com/ctxr-dev/simple-language) | API：5 stars，2026-10-01T06:45:16Z；规则正文无 frontmatter，README 为 OMP 安装增加 `alwaysApply: true` | 表达指导可参考，但属于常驻规则，TTSR 数量为 0 |
| [swaruplab/operon-omp](https://github.com/swaruplab/operon-omp) | API：0 stars，2026-06-18T05:05:59Z；`operon.ttsr.md` 使用 fenced `ttsr` 中的 `trigger` / `inject` / `once` | 缺少用户要求的原生 frontmatter；不认定为 OMP 即用规则 |
| [arg3t/dotfiles](https://github.com/arg3t/dotfiles) | 主线一手检查：38 stars，2026-11-05 推送；规则目录只有格式说明 README | 目录占位，实际规则数为 0；未把格式说明算为规则 |
| [wayne930242/anchorloop](https://github.com/wayne930242/anchorloop) | 搜索与包目录提到 `pi/ttsr.ts` | 扩展线索；本轮未取得可计数的原生规则文件证据，不入排名 |
| [0x56696B/agent-delivery-handbook](https://github.com/0x56696B/agent-delivery-handbook) | 一手 API 为 **0 stars、2026-11-02T08:48:25Z**；实际 `rules/` 下为 **18 份 Markdown 资产**，分 global / project | 旧候选，不能继续引用先前 7 stars / 32 条的摘要数据；未对全部 18 份做触发分类 |
| [JYeswak/omp-kit-companion](https://github.com/JYeswak/omp-kit-companion) | 一手 API：1 star、2026-11-21T14:40:21Z；`rules/` 目录为 27 份 Markdown | 旧候选，只保留基准，不占用新发现名额 |
| [lightmatmul/omp-setup](https://github.com/lightmatmul/omp-setup) | 本轮仓库搜索返回 0 stars、2026-09-01T18:36:08Z；此前以 WATCHDOG 示例为主 | 旧示例；WATCHDOG 与 TTSR 分开，不作为新规则包 |

旧 handbook 中的 [no-redundant-reverify.md](https://github.com/0x56696B/agent-delivery-handbook/blob/main/rules/global/no-redundant-reverify.md) 已直读，确有 `condition`、`scope: text, thinking`、`interruptMode: never`，适合“评审通过后不要反复验证”的窄场景。但它仍为英文触发。`BUG_FIXING.md` 无条件字段，属于按需参考文档，不能计入 TTSR 数量。

补充原文链接：

- https://github.com/rstacruz/omp-typescript-antislop/blob/main/plugins/typescript-antislop/rules/ts-no-module-mocking.md
- https://github.com/jvsteiner/agent-rules/blob/main/rules/no-bare-todo.md
- https://github.com/jvsteiner/agent-rules/blob/main/README.md
- https://github.com/pjsny/omp-commitwright/blob/main/rules/commit-pr-ste.md
- https://github.com/pjsny/omp-commitwright/blob/main/README.md
- https://github.com/autopus-ai/autopus-adk/blob/main/content/rules/lore-commit.md
- https://github.com/autopus-ai/autopus-adk/blob/main/content/rules/autonomy.md
- https://github.com/autopus-ai/autopus-adk/blob/main/content/rules/language-policy.md
- https://github.com/autopus-ai/autopus-adk/blob/main/content/rules/file-size-limit.md
- https://github.com/austinm911/anti-slop/blob/main/omp/rules/no-record-string-unknown.md
- https://github.com/ghost-him/ZeroLaunch-rs/blob/main/.omp/rules/no-backup-files.md
- https://github.com/ctxr-dev/simple-language/blob/main/rules/simple-language.md
- https://github.com/swaruplab/operon-omp/blob/main/.omp/rules/operon.ttsr.md

`jvsteiner` 的语义策略需要 TypeSafe API Key；十份原生正则规则不需要这个 Key。`pjsny` 的 README 说明 Vale 或样式缺失时部分检查不会执行，不能把“装了包”视为完整写作验证。`autopus` 的唯一条件规则要求项目专有 Lore 格式、署名与命令，另外三份文件均不计为 TTSR。

这些来源的身份与内容结论均为 `[single-source]`，证据形态：一手源码直读 / 文档声明。用途推荐属于推断 / 未实测。

## 反方查询记录与搜索覆盖

下表保存实际查询词。GitHub 的文件命中包含大量普通 Markdown、Java 并发文档与领域规则；已经逐个确认的规则才进入候选表。

| 工具 | 完整查询词 | 命中数 | 结论 |
| --- | --- | ---: | --- |
| GitHub 仓库 API | `".omp/rules" in:readme` | 121 | 广泛发现配置导出、应用仓库与规则包；仅首批 100 条逐项筛选 |
| GitHub 仓库 API | `"Time Traveling Stream Rules" in:readme` | 96 | 包含大量宿主分支和扩展，名称命中不能直接纳入 |
| GitHub 仓库 API | `"interruptMode" "condition" in:readme` | 19 | 找到 no-ai-slop 和若干 DSH 移植；有无规则文件仍需直读 |
| GitHub 仓库 API | `"WATCHDOG.md" "omp" in:readme` | 51 | 多数为监督扩展或示例；未将 watchdog 转算成 TTSR |
| GitHub 仓库 API | `"omp" "rules" in:name,description` | 42 | 补充 TypeScript 专题与规则实现，避免只靠旧候选 |
| GitHub 代码 API | `"interruptMode:" "condition:" extension:md -repo:can1357/oh-my-pi -repo:cuipengfei/agc` | 859 | 发现 FluxDown、remnic、表达包、eta 等；首批 100 条，不声称全部独立仓库都已审查 |
| GitHub 代码 API | `"when:" "scope:" "condition:" extension:md path:rules -repo:can1357/oh-my-pi -repo:cuipengfei/agc` | 7 | 主要为旧 kit 和其他领域模板；三个字段同时要求会漏掉没有 `when` 的真实原生规则 |
| GitHub 代码 API | `"repeatMode:" extension:md` | 1308 | 混有音视频重复播放配置；目录和 frontmatter 甄别不可省略 |
| GitHub 代码 API | `"alwaysApply:" extension:mdc "evidence"` | 8256 | 兼容文本来源丰富；实际读取的 kit-evidence 只有常驻标记，不是 TTSR |
| GitHub 仓库 API | `"TTSR" "中文" in:readme` | 28 | 多数是名称重复、移植或扩展；没有发现满足中文通用完成证据要求的独立即用包 |
| GitHub 仓库 API | `"TTSR" "Chinese" in:readme` | 24 | 没有给重点候选补充中文触发覆盖证据 |
| GitHub 仓库 API | `"TTSR" "rules" in:readme -fork:true` | 107 | 发现 slop-stop、terse、commitwright、HOLMES 等；超过 100 条的尾部未覆盖 |
| GitHub 仓库 API | `".mdc" "evidence" "rules" in:name,description` | 0 | 名称 / 描述字段过窄；改用上面的代码查询，不能据此断言兼容包不存在 |
| GitHub 代码 API | `"TTSR" repo:bubbleptr/awesome-pi` | 0 | 中文 Pi 清单没有直接 TTSR 命中，README 中规则发现扩展仍作辅助线索 |
| GitHub 代码 API | `"TTSR" repo:shaftoe/awesome-pi-coding-agent` | 1 | 仅 lockfile；巨型 README 未全读，保留清单覆盖不足 |
| web_search | `"TTSR" "rules" site:reddit.com OR site:news.ycombinator.com` | 10 个返回来源 | HN 有个人禁词规则使用者，但无文件分发链接；Reddit 多数同名无关内容 |
| web_search | `"OMP" "TTSR" "规则包" OR "规则集" OR "中文"` | 10 个返回来源 | 补充 ZeroLaunch-rs 中文项目线索；博客与书籍介绍不能充当规则源码 |
| web_search | `"TTSR" "rules" package false positive Chinese` | 10 个返回来源 | 同名噪声很大，没有形成中文适配或低误报的独立验证 |
| web_search | `"terse-agent-output" "print" "hang" OR "slop-stop" "false" OR "no-ai-slop" Chinese` | 3 个返回来源 | 都为其他写作技能页面；具体风险最终由候选 README 支持 |
| GitHub issue API | `repo:stray-nick/terse-agent-output hang` | 0 | 未发现公开 issue 反证；README 的 `-p` 限制仍保留，空结果不证明兼容 |
| GitHub issue API | `repo:M0n7y5/slop-stop "false positive"` | 0 | issue 无命中；README 本身明确列出接受的误报 |
| GitHub issue API | `repo:kartikkabadi/no-ai-slop Chinese` | 0 | 未发现中文适配证据，不能据此确认支持或不支持所有中文内容 |
| GitHub 仓库 API | `"TTSR" "false positive" in:readme` | 5 | slop-stop 是直接相关命中；其风险声明已读取 |
| GitHub 仓库 API | `"TTSR" "completion" "evidence" in:readme` | 18 | 部分相关语义能力来自扩展和 Jev 策略，未算作 Markdown 原生规则 |
| GitHub 代码 API | `"condition:" "done" "evidence" extension:md path:rules -repo:cuipengfei/agc -repo:JYeswak/omp-kit-companion` | 28 | 找到 HOLMES，进一步确认其规则提醒与扩展证据检查的差异 |
| GitHub 代码 API | `"condition:" "完成" extension:md path:rules -repo:cuipengfei/agc -repo:JYeswak/omp-kit-companion` | HTTP 503 | GitHub 返回 `too many shards failed`；缩小路径重查，没有把失败记为零命中 |
| GitHub 代码 API | `"condition:" "完成" path:.omp/rules` | 19 | 中文条件内容集中在 FluxDown / ZeroLaunch-rs 等项目约定，未得到通用中文报完成包 |
| GitHub 代码 API | `"condition:" "循环" extension:md path:rules -repo:cuipengfei/agc` | 2 | 为其他领域规则，未确认新的 OMP 通用防循环文件 |
| GitHub issue API | `repo:tomkyser/omp-holmes regex` | 0 | 未找到局部正则组兼容说明，问题继续标为 unknown |
| GitHub issue API | `repo:themuuln/omp-config quota` | 0 | 未取得作者“一律不重试 429”政策的独立适用性支持 |
| GitHub issue API | `repo:can1357/oh-my-pi "TTSR" "false positive"` | 12 | 命中主题误报与路径门限讨论；具体正文、状态已读取，见下文 |
| GitHub 代码 API | `"condition:" "question:" extension:md path:rules -repo:cuipengfei/agc -repo:can1357/oh-my-pi` | HTTP 503 | 语义规则搜索存在覆盖缺口，不宣称社区没有 `question` 规则 |

### 直接影响适用性的反方证据

**主题命中不能证明违规。** [OMP issue #17700](https://github.com/can1357/oh-my-pi/issues/17700) 当前为 **CLOSED / COMPLETED**。用户展示只读取 `code.txt` 或引用关键词也触发多份主题规则；官方机器人说明 `condition` 应描述违规本身，`question` 能提供事后语义判断，但不能在执行前阻止工具。本文将它作为配置与机制说明，不当作已经确认仍未修复的故障。[single-source] 证据形态：讨论原文直读 / 官方解释。

**文本范围加文件 glob 可能永远不触发。** [OMP issue #9976](https://github.com/can1357/oh-my-pi/issues/9976) 当前 **OPEN**，带 `wontfix`。官方解释是路径门限的预期行为：纯文本没有关联文件路径，非空 globs 无法通过。`themuuln` 当前已读的文本规则使用 `globs: []`，不能把历史配置问题当作这些当前文件全部失效的证据。这个机制仍影响其他带全局文件限制的命令或表达规则。[single-source] 证据形态：讨论原文直读 / 官方解释。

## 对用户五项需求的取舍

| 需求 | 有一手依据的来源 | 尚不能保证的部分 |
| --- | --- | --- |
| 表达清楚 | no-ai-slop、terse、slop-stop 的正文与英文模式 | 中文完整用词、两字形式和句式约束没有相应全面触发 |
| 有证据报完成 | slop-stop 的英文成功措辞提醒；themuuln 的验证报告要求；HOLMES 扩展说明 | 纯正则无法关联此前工具结果；“tests passed”也可能是真实报告，需要语义或执行记录判断 |
| 命令防坑 | remnic 的 gh 正文文件提醒；FluxDown 的 bash 禁令；themuuln 的路径、资源和重复请求提醒 | `never` 不能阻止当次危险操作；不同工具参数面与 globs 可能限制覆盖 |
| 防循环 | handbook 的重复验证规则；themuuln 的重复请求、资源与验证周期限制 | 这些都是窄场景，未证明能识别全部中文重复行动或模型流内重复 |
| 不过度打扰 | themuuln / jvsteiner 中的 `never`；remnic 的低误报选取原则 | 主题正则仍可能频繁投递无用提醒；强中断包会增加生成重试 |

如果之后要试用，优先选择一到三份规则并保留具体触发样例。涉及删除、推送、生产数据和权限的要求，不能仅靠事后提醒承担安全保障。这里仅给出选择原则，本轮没有安装或改变任何配置。

## 来源可信度与验证边界

**GitHub repo API：可信度高。** 直接支持本文 stars 与 `pushed_at` 快照；它不证明采用人数、星数真实性或规则效果。本文未做打星账号审计。

**候选源码：可信度高。** 直接支持文件存在、字段、作用范围和正文要求。作者选择的风格与项目环境可能让规则过于严格；源码存在不等于用户需求得到验证。

**候选 README：可信度中。** 作者有展示项目能力的利益关系，可能突出效果与测试覆盖；本轮只把其测试数量、模式限制、依赖和历史来源记为文档声明。

**社区评论：可信度中至低。** 可证明有人公开分享使用经验，缺少控制变量，无法推广为通用效果。

已完成：重点候选及明确标注完整分类候选的文件读取与元数据核验；补充规则源码抽读；中文、兼容目录、清单与社区发现；具体反方查询。

未完成：实际规则安装与发现、用户中文样例触发、误报率测量、不同模型与 provider 的行为、`-p` 限制复现、HOLMES 局部正则组兼容、候选扩展的执行记录真实性。未运行构建、测试、格式检查或 smoke；未修改本地配置、未安装插件、未提交 git。

所有“更适合”“建议选取”“可能误报”的判断均为**推断 / 未实测**。报告使用主分支原文链接，后续源码可能变化；API 时间与本文所列字段是本轮快照，不是永久状态。GitHub 503、首批 100 条限制与巨型 README 的未覆盖内容都保留为研究不足。

轮次：4，判停：a，用户关键维度均已有一手依据或明确标为 unknown；缺口集中在用户环境实测与未完整覆盖的搜索结果，不再通过增加扩展名单补足规则数量。
