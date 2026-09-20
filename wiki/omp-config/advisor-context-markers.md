# advisor-context-markers

> Sources: raw/omp-config/2026-09-20-advisor-context-markers.md
> Raw: [顾问上下文标记摘录](../../raw/omp-config/2026-09-20-advisor-context-markers.md)
> Updated: 2026-09-20

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

- 运行时生成的会话更新和工具结果被截断至 ≤120 字符（它们重复主历史，可能嵌入大工具输出）。
- Advisor 的 prose、thinking 和 advise deliveries 保留完整文本（不截断）。
- 当内容超出上下文窗口时，被 `[shaken ~163 tokens — recover: artifact://…]` 标记替代，表示原文可通过 artifact 系统回收；标记表示可见性不完整，而非内容不存在。真实示例见 advisor-bounded.md:3373。

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