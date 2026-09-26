# advisor-context-markers

> Sources: raw/omp-config/2026-09-20-advisor-context-markers.md, 2026-09-20; 本机 OMP 18.3.2 源码直读, 2026-09-26; advisor 第一手确认, 2026-09-26
> Raw: [顾问上下文标记摘录](../../raw/omp-config/2026-09-20-advisor-context-markers.md); [advisor.evictStaleResults 与渲染预算](../../raw/omp-config/2026-09-26-advisor-evict-stale-results.md)
> Updated: 2026-09-26

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

## 对 Advisor 自审的影响

通过在会话流中显式角色与来源，Advisor 可以：

- 区分用户指令与自身假设。
- 验证某个断言是否源自可观测数据（会话更新）还是内部思考（推测）。
- 信任看到的 `**user**: …` 正是用户输入的内容，无下游截断。

## 另见

- advisor-freshness-knobs.md — Advisor 检查新主会话内容的频率
- advisor-concern-delivery-policy.md — concern 如何转发给 Main
- reviewer-blind-spots.md — Advisor 自审时的常见盲区
- omp-sessions/jsonl-format-and-third-party-parsers.md — 第三方解析器如何看待 JSONL 格式

---

文章遵循 karpathy-llm-wiki 模板；raw 不可变；仅在新证据迫使结论变更时更新文章。