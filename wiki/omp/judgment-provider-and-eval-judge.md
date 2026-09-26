# OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界

> Sources: 本会话取证（本机 @oh-my-pi/pi-coding-agent 18.2.5 安装源码直读）, 2026-09-19; 本会话取证（GitHub commits/releases/compare API）, 2026-09-19; 本会话实测（eval judge() smoke）, 2026-09-19; 本会话实测（eval judge() 双语言、三题型、重复调用与 Jev 服务端日志确认）, 2026-09-20; 本会话实测（jevify 22 文件分类，实际模型 kimi-claw/k2d8-preview）, 2026-09-21; 本会话实测（18.2.8 modelRoles.judge + fallbackChains 路由层）, 2026-09-22; 本会话实测（judgeBatch await 用法，eval JS kernel gen 3 Bun 1.4.2）, 2026-09-26
> Raw: [judgment-provider-values](../../raw/omp/2026-09-19-judgment-provider-values.md); [judgment-typesafe-history](../../raw/omp/2026-09-19-judgment-typesafe-history.md); [llm-judgment-callflows](../../raw/omp/2026-09-19-llm-judgment-callflows.md); [judge-smoke-test](../../raw/omp/2026-09-19-judge-smoke-test.md); [eval-judge-jev-semantic-testing](../../raw/omp/2026-09-20-eval-judge-jev-semantic-testing.md); [Magic Keywords jevify](../../raw/omp-modes/2026-09-21-magic-keywords-jevify.md); [jev-latest-400 根因](../../raw/omp/2026-09-22-jev-latest-400-root-cause.md); [judgment-systemone-live-evidence](../../raw/omp/2026-09-20-judgment-systemone-live-evidence.md); [judgeBatch await 用法](../../raw/omp-mnemopi/2026-09-26-judgebatch-await-usage.md)
> Updated: 2026-09-26

## Overview

OMP 自 18.2.4（2026-09-17）起内置 TypeSafe（Jev）judgment 后端，由 `providers.judgmentProvider` 选择（合法值恰好 `auto`/`typesafe`/`llm` 三个，默认 `auto`）。该子系统为 OMP 自己的功能供电：auto-thinking 难度分类、smart unexpected-stop 检测、git TUI AI staging 三个自动消费方，外加 eval cell 内用户手动调用的 `judge(state, questions)` helper。本文全部结论来自本轮会话对本机安装的 18.2.5 的源码直读、GitHub API 核验与一次 eval smoke 实测；未使用真实 TypeSafe key 做端到端判定。

## 版本与发布沿革

- 源码首次 commit `5c7dc19f82b8385673df257ca33571219960f63d`（2026-09-17T07:03:40Z），commit 信息 "feat: added judgment module with TypeSafeJudge and unified judge API"；该 path 的 commit 列表只有这一条，实现自加入后未变。
- 首次正式 release 为 v18.2.4（published_at 2026-09-17T09:10:49Z），与 commit 相差约 2 小时；CHANGELOG `[18.2.4] - 2026-09-17` 记录 "`providers.judgmentProvider` as `auto`, `typesafe`, or `llm`" 并新增 `judge(state, questions)` 求值 helper。
- 18.2.5 于同日（2026-09-17T23:07:03Z）发布；本机安装即为 18.2.5（`omp --version` 实测），dist 中 grep 到 `TYPESAFE_API_KEY` 与 `judgmentProvider`，功能已在本机可用。

## judgmentProvider：三值、语义与非法值行为

合法值恰好 3 个（closed enum，`values: ["auto","typesafe","llm"] as const`）：

| 值 | 默认 | 官方语义 |
|---|---|---|
| `auto` | 是 | 已认证 TypeSafe 走 TypeSafe，否则走 LLM 桥；失败的 TypeSafe 请求沿 tiny、smol、default、会话当前模型回退 |
| `typesafe` | 否 | 优先 TypeSafe，失败沿 online 模型 role 链回退 |
| `llm` | 否 | 永不走 TypeSafe |

- `none`/`off`/`local`/`openai`/`disabled`/`chat`/`session` 均**不是**合法值（已逐一排除；注意 OMP 其他设置里存在同名的 `none`/`off` 枚举，如 `features.unexpectedStopDetection: none|mechanical|smart`，属别的键）。
- 非法值不报错、不告警：`Settings.get` 不做 enum 校验，config.yml 里的值原样返回，仅 `undefined` 时取 schema 默认 `"auto"`——即非法值碰巧静默等价 `auto`。想"关掉 TypeSafe"的正确写法是 `llm`。

## TypeSafe 后端与回退链

- `TypeSafeJudge` 把 `JudgmentRequest` 原样转发 `POST {base}/v1/systemone`，默认 `TYPESAFE_BASE_URL` 为 `https://api.typesafe.ai`、默认模型 `jev-latest`；带 401/403 key 轮换与 429/5xx 的 `retry-after` 感知退避（MAX_ATTEMPTS 3）。
- 凭据：环境变量 `TYPESAFE_API_KEY`、CLI `--api-key`、models.yml `providers.typesafe.apiKey`、`/login typesafe` 存储（key 共四条途径，源码行号与判定细节见 [OMP TypeSafe env 变量边界、.env 加载链与 zen 免费 jev 接入](judgment-typesafe-env-config.md)）；可选 `TYPESAFE_BASE_URL`、`TYPESAFE_DEFAULT_MODEL`——后两者为 **env-only**，无 config 等价物。
- TypeSafe 调用失败（网络错误、重试后仍 5xx、key 被拒）**总是**回退到 online role 链，绝不回退到 feature 自己的 local-model override。
- LLM 桥内部按 feature 的 backend 二分：backend = `"online"`（两个相关设置的默认值）→ `OnlineChatJudge`，候选链 `tiny → smol → default`，调用方传了 `sessionModel` 且不在候选中则末尾追加会话当前模型；backend 指到本地 tiny-model key → `LocalJudge`（on-device，keyword 提示词，`LOCAL_ANSWER_MAX_TOKENS=16`，reasoning 模型给 1024）。
- 完整 fallback chain：**TypeSafe（含退避与 key 轮换）→ tiny → smol → default → 会话当前模型**。`llm` 模式下永不触碰 TypeSafe；链内规则为无 API key 的候选跳过、凭据/provider 失败换下一个、caller abort/TimeoutError 直接抛、全灭才抛 `judgment: every tiny/smol candidate failed`。

## 消费方：3 个自动 + 1 个手动（18.2.5 全枚举）

对 `resolveJudge` / judgment 模块导入方全量 grep，恰好 4 个调用点，**没有第四个自动消费者**：

| 消费方 | 触发条件 | 判定形态 | 结果如何改变控制流 |
|---|---|---|---|
| auto-thinking 难度分类 | `thinking` 配成 `auto` 且入站是用户轮；模型无可控 effort 面直接跳过；`ultrathink` 关键字绕过分类器直接 Max | 单题 ChoiceQuestion（low/medium/high/xhigh，ceiling 为 Max 时用五档）；llm 链失败时 keyword judge 走 bucket 题 | resolved effort 写入本轮请求的 thinking 参数，记 `thinking_level_changed` 事件并持久化；轮次被 abort/superseded 则结果丢弃 |
| smart unexpected-stop 检测 | `features.unexpectedStopDetection` 必须为 `smart`（`none` 不跑；`mechanical` 不跑 judge，只对无文本 thinking-only turn 走重试）；排除 toolCall/空内容 turn | 单题 NoulQuestion（是/否 + P(yes)）；阈值 `noul >= 0.5` 为 true（keyword judge 只给 0/1，TypeSafe 才给中间概率） | true 则 `unexpectedStopRetryCount++`（上限 3），未超帽注入 developer reminder 并 `scheduleAgentContinue` 自动继续该 turn；超帽放弃 |
| git TUI AI staging | 用户在 unstaged 头部 wand pill 输入自然语言指令（用户触发、判定全自动）；自建 Settings/ModelRegistry，backend 硬编码 `"online"` 且未传 sessionModel | 两趟：file pass 每批 80 文件、每文件一道 NoulQuestion（`noul >= 0.5` 选入）；hunk pass 对选中文件的 hunk 再判 | 三档结果决定 `git apply --cached` 的范围；file pass 无逐条容错，一批 judge 抛错则整个 `aiStage` 抛错 |
| eval cell `judge()` | **手动**：cell 代码显式调用，经 `__judge__` bridge → `runEvalJudgment`；三个自动功能不经过它 | 用户自定义 state 与 questions | 见下节 smoke 边界 |

共同底线：两个会话内自动功能（auto-thinking、unexpected-stop）是吞错降级设计；唯一能把异常甩到用户面前的是 git TUI（错误条）与 eval cell（异常）。

## eval judge() 的行为边界（2026-09-19 至 2026-09-20 实测）

- JavaScript 与 Python eval 均可调用 `judge(state, questions)`；两种语言都已实测 `bool`、`choice`、`score`。
- `bool` 返回肯定概率；`choice` 返回选项、概率分布与 confidence；`score` 返回概率加权等级、概率分布、legend 与 confidence。
- 返回 handle 的 status / done / wait 字段可用；**output() 不支持**。
- 2026-09-20 这组调用由用户根据 API 服务端调用日志确认实际后端为 Jev。该证据只覆盖本组请求；helper 返回值本身不暴露 backend、model 或 usage，其他调用仍需运行证据确认后端。
- 完全相同的 state 与 questions 连续调用三次，choice 都是 `complete`；`complete` 概率为 0.96 至 0.97，score 为 2.78 至 2.81。类别保持一致，小数有轻微变化。
- 一次内容完整性题把自我声明判为 `complete`，概率为 0.97。该样本说明 rubric 可以产生高概率假阳性，不构成对 Jev 一般判定质量的评价。

## jevify 与 judge() 的关系（2026-09-21 实测）

`jevify` 是 OMP 的第四个 magic keyword。用户 prompt 中出现独立小写单词 `jevify` 时，OMP 向会话追加隐藏提示，引导 agent 在 eval kernel 中调用 `judge()`：先冻结 rubric，再批量分类，最后人工复核低置信度、错误或边界项。

`jevify` 本身不指定判断模型。2026-09-21 对提交 `923e731` 的 22 个文件执行 `jevify` 流程，完成通知中的实际 judge model 为 `kimi-claw/k2d8-preview`。这说明 `jevify` 只是工作流提示；实际走哪个模型由 `judgmentProvider` 和 `modelRoles.judge` 的路由决定。该次运行没有使用 Jev 模型，不能作为 Jev 模型效果证据。

详见 [OMP 工作模式与 Magic Keywords](../omp-modes/modes-and-magic-keywords.md) 和 [OMP TypeSafe env 变量边界](judgment-typesafe-env-config.md)。
## judge 模型路由：modelRoles.judge 与 fallbackChains（18.2.8 实测）

18.2.7+ 起，judge 实际用哪个模型由「角色链解析」决定：eval `judge()` 与自动 judge 共用 `resolveRoleChain("judge")`——链首取 `modelRoles.judge` 显式值；`retry.fallbackChains.judge` 缺省时改用 priority.json 默认段 `["typesafe/jev-latest", "@tiny", "@smol", "@default"]`，显式链一旦存在即整体替换默认链。本文上面描述的 judgmentProvider 三值与 LLM 桥 tiny→smol→default→session 链是 18.2.5 语义；配了 `modelRoles.judge` 后，实际链由角色解析决定。

jevify 22 文件分类实际模型 `kimi-claw/k2d8-preview` 与 zen 日志中的 jev-latest 400 可由该候选链解释：18.2.7 时期 config 无 `modelRoles.judge`、无 `typesafe-zen` provider，judge 链 = priority.json 默认、链首即 `typesafe/jev-latest`，被 `TYPESAFE_BASE_URL` 指向 zen 后，候选解析会先尝试 jev-latest 再静默改用 `@tiny`——这些尝试与日志中的 400 未逐条绑定。2026-09-21 配 `modelRoles.judge = typesafe-zen/jev-1.13`、2026-09-22 配显式 fallback 链后，链首为 Zen jev-1.13。

详见 [OMP judge 角色链解析与 jev-latest 400 根因](judge-role-chain-and-jev-latest-400.md)。


## 语义检查的使用边界

`judge(...)` 适合检查清晰度、完整性、自洽性、案例质量和文风。每个 question 应只检查一个目标，criteria 应要求可引用的具体内容；文本声称自己满足条件，不能单独作为满足条件的证据。修改前后比较时复用同一 rubric，关键判断关注分类稳定性和概率范围，不依赖某一次小数。

## judgeBatch 批量用法与常见误诊（2026-09-26 实测）

单状态用 `await judge(state, questions)`，直接返回 `{id: answer}`。两个以上 state 用 `judgeBatch`：`const ref = await judgeBatch(states, questions, concurrency, retries, min_ok, intent)` 返回 thenable，await 后拿到 JudgmentBatch，带 `drain / drainIter / results / failed / status` 方法。`await ref.drain(timeout)` 分片收取 settled items，`item.answers` 为结果，`item.error` 为失败。`judgeBatch.attach(id)` 同样返回 thenable，需 await 后才能拿到 JudgmentBatch。

文档写 `judge_batch`（snake_case），内核只暴露 `judgeBatch`（camelCase）。命名差异客观存在，接口行为与文档一致。

常见误诊：`judgeBatch` 返回未 resolve 的 thenable，在未 await 的 Promise 上探查方法（`Object.getOwnPropertyNames(Object.getPrototypeOf(b))`）只看到 `then / catch / finally`。据此断言「接口缺失」是误诊，文档方法在 resolve 后的对象上。

54 个 state 同时用 judge() 循环和 judgeBatch 跑了一遍，dest 判定 53/54 一致。唯一差异块是人工已裁定的那块。

文件存在、JSON 解析、字段出现、Markdown 结构、Git 状态和测试退出码仍使用确定性检查。报告判定结果时同时保存 state、questions 和 output；仅展示 questions 不能称为完整输入。

## 证据边界

- 本文事实来源：本机 18.2.5 安装包源码/schema/CHANGELOG 直读、GitHub commits/releases/compare API、2026-09-19 smoke 实测，以及 2026-09-20 双语言三题型与重复调用实测。
- 2026-09-20 这组请求的 Jev 后端由用户通过 API 服务端日志确认；其他 `judge(...)` 调用的实际后端仍需单独取证。
- 未验证：TypeSafe 与 keyword judge 的整体判定质量差异、429/5xx 退避在真实故障下的行为。

## See Also

- [Jev 在三宿主（OMP/Codex/OpenCode）的现成集成盘点](../ai-coding-agents/jev-host-integrations.md)
- [Jev 语义回归检查方法](../harness-engineering/jev-semantic-regression-testing.md)
- [OMP TypeSafe env 变量边界、.env 加载链与 zen 免费 jev 接入](judgment-typesafe-env-config.md)
- [OMP 配置语义手册](../omp-config/config-semantics.md)
