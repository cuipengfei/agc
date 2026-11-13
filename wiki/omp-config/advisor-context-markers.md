# advisor-context-markers

> Sources: raw/omp-config/2026-09-20-advisor-context-markers.md, 2026-09-20; 本机 OMP 18.3.2 源码直读, 2026-09-26; advisor 第一手确认, 2026-09-26; 本会话实测, 2026-10-05; 本机 oh-my-pi 源码直读（session-history-format、skills、skill-command、advisor/runtime）, 2026-11-13; can1357/oh-my-pi issue #19164, 2026-11-13
> Raw: [顾问上下文标记摘录](../../raw/omp-config/2026-09-20-advisor-context-markers.md); [advisor.evictStaleResults 与渲染预算](../../raw/omp-config/2026-09-26-advisor-evict-stale-results.md); [Advisor 直接回答的投递缺口](../../raw/harness-engineering/2026-10-05-advisor-direct-answer-delivery-gap.md); [advisor 技能调用文本截断](../../raw/omp-config/2026-11-13-advisor-skill-invocation-text-truncation.md); [roboomp 源码与会话证据](../../raw/software-factory/2026-11-13-roboomp-self-hosted-factory.md)
> Updated: 2026-11-13

Advisor 通过会话更新中的角色标记区分用户输入与自身思考，从而在自审时避免混淆。

## 证据

### `**user**:` 和 `**agent**:` 标记

有界 advisor transcript 中，会话更新以 `**user**:` 和 `**agent**:` 前缀区分角色：

- `### Session update **user**: dump this locally and fully read it: https://github.com/Da1sypetals/AGENTS.md/blob/main/AG…`
- `### Session update **agent**: _thinking:_ I want to save this file locally and read it fully, weighing whether to use ctx_fetch_and_index …`
- `### Session update **agent**: _thinking:_ Let me open the file and read through its full contents. // read dumped AGENT…`

这些标记使 Advisor 能在自审时精确区分用户说了什么与自己想了什么。

### 会话更新状态标记

有界 transcript 中出现一致的头部模式：
`## <timestamp> · JSONL <行> · 角色 · <id>`
其中角色可以是 `session-update`、`assistant`、`thinking` 等。该模式证明 Advisor 收到带嵌入角色信息的结构化会话更新。

### 工具结果截断与压缩

- 运行时生成的会话更新和工具结果曾经被描述为"截断至 ≤120 字符"。实际截断行为分两层：参数摘要（`PRIMARY_ARG_MAX = 120`）和错误首行预览上限 120 字符，但工具结果正文有独立预算。

> **Status: Outdated** (2026-09-26)
> 18.3.2 源码核验与 advisor 第一手确认：成功结果带 `Tool result:` 正文段（上限 8 KiB / 80 行，中间截断，edit diff 放宽到 300 行）；失败结果首行预览（120 字符）后同样跟有界正文。Session update 由 `advisor/runtime.ts:832` 用 `ADVISOR_RENDER_OPTIONS`（`expandToolIO: true`）渲染。来源：本机 18.3.2 源码直读 + advisor 本次会话第一手确认。

- 成功结果：`→ tool(args) ⇒ ok · N lines`，后面跟着 `Tool result:` 正文段，上限 8 KiB / 80 行，超出从中间截断；edit 的 diff 放宽到 300 行。
- 失败结果：`→ tool(args) ⇒ error · N lines — <首行预览>`，首行预览上限 120 字符，后面同样跟着有界正文段。
- Advisor 的 prose、thinking 和 advise deliveries 保留完整文本（不截断）。
- 当内容超出上下文窗口时，被 `[shaken ~163 tokens — recover: artifact://…]` 标记替代，表示原文可通过 artifact 系统回收。标记表示可见性不完整，而非内容不存在。真实示例见 advisor-bounded.md:3373。

### Advisor 上下文自动清理（18.3.2 新增）

`advisor.evictStaleResults`（boolean，默认 `true`）在每次 advisor 评审前运行，清理 advisor 自己在更早评审中产生的 read/grep/glob 工具输出。最近一轮评审的输出保留；只清理 >= 50 token 的结果；命中消息原地替换成 `[Stale result elided - N tokens]`，打 `prunedAt` 标记。recall 等记忆查询结果不清理。

切割点选择最大化 `margin = saved - rewrite`：省下的 token 减去切割点之后不可清理消息的重写代价。平局取较浅切割点。

与主会话 shake 的区别：shake 是压力驱动（上下文逼近阈值时触发），把原文存进 artifact 文件、占位符带回收地址；eviction 是定时触发（每次评审前固定跑），占位符没有回收地址，因为 read/grep/glob 可以重跑。

### FIFO advisory 投递队列

参见 `advisory-correlation.json`（2026-09-20），它将 advisor 的 `advise` 工具调用映射到主会话投递；FIFO 顺序解释了为什么较早的 advisory 可能在较新的之后到达。

## Advisor 直接回答的投递缺口（2026-10-05 新增）

用户直接点名 advisor（如「@advisor: 你怎么看 shim 代码？」），advisor 的第一人称纯文本回答**不会渲染成 advisory 块**。OMP 只把 `advise()` 工具调用的 note 渲染为 advisory 块；advisor 的纯文本 assistant 输出只写进它自己的 session jsonl（`__advisor.default.jsonl`），没有投递通道。

**WATCHDOG.md L22 规则**：被直接点名时，第一人称回答必须同时通过 `advise` 发出（正文完整放入 note，severity 用 `nit`，除非内容本身达到更高判级），否则用户看不到。

**advisor 上下文压缩的影响**：advisor 之前读过 shim 全文并写了五点评审，但后来被压缩（compaction），丢失了先前评审的上下文。它重新搜仓库、重读 shim 才找回评审能力。长篇评审如果只在 advisor 自己的 session 里，compaction 后会丢失——除非当时就走 advise() 发出。

## 对 Advisor 自审的影响

通过在会话流中显式角色与来源，Advisor 可以：

- 区分用户指令与自身假设。
- 验证某个断言是否源自可观测数据（会话更新）还是内部思考（推测）。
- 信任看到的 `**user**: …` 正是用户输入的内容。这条对普通 `user` 角色成立，对 custom 类型消息不成立，见下节。

## 技能调用消息的渲染截断（2026-11-13）

普通 `user` 角色的文本完整进入 advisor 上下文。技能调用是另一种消息类型，不吃这条保证。

用户调用技能时，OMP 把调用标记、完整技能正文、目录指引、以及可选的 `User: {{userArgs}}` 渲染成**一条** `role: "custom"`、`attribution: "user"` 的消息（`modes/skill-command.ts:42-88`），原样进入主 transcript（`session/agent-session.ts:8575-8579`、`:8888-8890`），不拆分成「技能消息 + 用户消息」两条。

advisor 渲染这条消息时：

1. `advisor/runtime.ts:897-900`、`:1249-1261` 只过滤 `customType === "advisor"` 的消息，技能消息不被排除。
2. `session/session-history-format.ts:432` 的 `PRIMARY_CONTEXT_CUSTOM_TYPES` 只含 `plan-mode-context` 与 `plan-mode-reference`，技能类型不在其中。
3. 于是落到通用分支 `customOneLiner`（`:481-482`），调用 `previewLine(contentToText(msg.content), transform)`。
4. `PRIMARY_ARG_MAX` 默认 120 字符（`:58-61`、`:86`、`:115-118`、`:137-140`）。

结果是技能消息被渲染成 120 字符的一行预览。技能模板把 `User: {{userArgs}}` 放在正文之后，用户任务文本位于尾部，因此最先被截掉。通用分支同时忽略消息自带的 `details.args` 与 `details.prompt` 字段，而这两个字段恰好保存了用户原文。

主代理不受影响：它拿到的是完整消息。丢失只发生在 advisor 的渲染投影里。

### 影响

advisor 会基于不完整上下文给建议，包括断言「用户从未提出过 X」——而 X 就在被截断的尾部。

### 绕过

技能调用不带任务文本单独发送，任务文本作为下一条普通用户消息发送。普通 `user` 角色走完整用户消息格式化路径，不经过 custom 消息的 120 字符预览。

### 上游状态

2026-11-13 的公开快照中，can1357/oh-my-pi#19164 的状态为 OPEN，labels 含 `bug`、`prio:p2`、`agent`、`prompting`。检索未发现完全匹配的既有报告；#7602 是最接近的技能消息形状 issue，但属 TUI 展示且明确记录主模型收到完整参数；#5266 / PR #10367 是同类「advisor 视角信息丢失导致误判」的已修先例。

同日，`roboomp` 报告已复现并推送修复提交 [`82a48562`](https://github.com/can1357/oh-my-pi/commit/82a48562)。机器人报告定向测试与 `bun check` 通过，完整测试失败；由于无法核验默认分支存在相同故障，创建 PR 的检查当时未获豁免，也没有创建 PR。机器人随后评论 “Issue closed”，同一次抓取的 GitHub 状态为 OPEN。上述测试结果来自机器人报告，后续合并状态未核查。处理流程见 [roboomp：自托管 GitHub 维护流程](../software-factory/roboomp-github-maintenance-factory.md)。

## 另见

- advisor-freshness-knobs.md — Advisor 检查新主会话内容的频率
- advisor-concern-delivery-policy.md — concern 如何转发给 Main
- reviewer-blind-spots.md — Advisor 自审时的常见盲区
- omp-sessions/jsonl-format-and-third-party-parsers.md — 第三方解析器如何看待 JSONL 格式

---

文章遵循 karpathy-llm-wiki 模板；raw 不可变；仅在新证据迫使结论变更时更新文章。
