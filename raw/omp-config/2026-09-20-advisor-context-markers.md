> Sources: OMP advisor session investigation, 2026-09-20
> Collected: 2026-09-20
> Published: Unknown
>
> ## 顾问上下文标记证据
>
> ### `**user**:` 和 `**agent**:` 标记
> 来自 `advisor-bounded.md`（JSONL 行）：
>
> - 第 17 行：`### Session update **user**: dump this locally and fully read it: https://github.com/Da1sypetals/AGENTS.md/blob/main/AG…`
> - 第 23 行：`### Session update **agent**: _thinking:_ I want to save this file locally and read it fully, weighing whether to use ctx_fetch_and_index …`
> - 第 37 行：`### Session update **agent**: _thinking:_ Let me open the file and read through its full contents. // read dumped AGENT…`
>
> 这些标记清晰区分用户输入和顾问内部思考/发言，使 Advisor 在自审时能分辨谁在说些什么。
>
> ### 会话更新状态标记
> - 第 13 行：`## 2026-09-19T14:58:53.225Z · JSONL 3 · session-update · 2c2d36a2`
> - 第 19 行：`## 2026-09-19T14:58:53.236Z · JSONL 4 · session-update · e42f2fb3`
> - 第 57 行：`## 2026-09-19T14:59:40.171Z · JSONL 9 · assistant · d0bceb21`
> - 第 51 行：`## 2026-09-19T14:59:27.334Z · JSONL 8 · session-update · 5a419af8`
>
> 模式 `## <timestamp> · JSONL <行> · 角色 · <id>` 出现在有界 transcript 中，表明 Advisor 收到带嵌入角色信息的结构化会话更新。
>
> ### 工具结果截断与压缩
> - 运行时生成的会话更新和工具结果被截断至 ≤120 字符（它们重复主历史，可能嵌入大工具输出）。
> - Advisor 的 prose、thinking 和 advise deliveries 保留完整文本（不截断）。
> - 真实示例见 `advisor-bounded.md` 第 3373 行：`[shaken ~163 tokens — recover: artifact://…]`
>
> ### FIFO advisory 投递队列
> 参见 `advisory-correlation.json`（2026-09-20），它将 advisor 的 `advise` 工具调用映射到主会话投递；FIFO 顺序解释了为什么较早的 advisory 可能在较新的之后到达。