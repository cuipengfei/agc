# advisor.evictStaleResults 与工具结果渲染预算（18.3.2 源码 + advisor 第一手确认）

> Source: 本机 OMP 18.3.2 安装包源码直读（`@oh-my-pi/pi-coding-agent`）
> Collected: 2026-09-26
> Published: 2026-09-26

## advisor.evictStaleResults 键定义

文件 `src/advisor/settings.ts:85-98`：

boolean，default `true`，`protocolDefault: ["rpc", "acp"]`，条件 `advisorEnabled`。

## 清理算法

文件 `src/advisor/tool-result-eviction.ts`。

每次 advisor 评审前运行，在压缩判定之前。从后向前扫描 advisor 自己的会话历史（`advisor.agent.state.messages`）。

清理对象：advisor 自己在更早评审中产生的 read/grep/glob 工具输出。这三类工具想再要可以重新调一次拿回来。recall 等记忆查询结果永不清理。

规则：
- 最近一次评审的输出保留（最后一条非 synthetic user 消息之后的部分不动）。
- 只清理 >= 50 token 的结果（`MIN_PRUNE_TOKENS = 50`）。
- 已经 prune 过的不重复处理。
- 命中的消息原地改写：内容替换成 `[Stale result elided - N tokens]`，打 `prunedAt` 标记，作废该消息的缓存。

切割点选择：最大化 `margin = saved - rewrite`。saved 是切割点之后可清理候选的（原 token - 占位符 token）之和；rewrite 是切割点之后所有不可清理消息的全量加候选的占位符总量。严格变大才更新切割点，平局取较浅的。

副作用：`prunedAt` 标记会作废切割点之后所有消息的缓存。在 prefix-bound thinking 模型上，会丢掉切割点之后所有 assistant 的签名思考（含最近评审的），但那些推理已经被备注和增量覆盖。

注释原文："advisor re-sends its own investigation output on every later request"。

## 工具结果渲染预算

文件 `src/session/session-history-format.ts`，函数 `toolCallLine` 与 `boundedFencedToolContext`。

Session update 文本由 `src/advisor/runtime.ts:832` 用 `ADVISOR_RENDER_OPTIONS` 渲染，其中 `expandToolIO: true`。

成功结果：`→ tool(args) ⇒ ok · N lines`，后面跟着 `Tool result:` 正文段。正文上限 8 KiB / 80 行，超出从中间截断。edit 的 diff 放宽到 300 行。

失败结果：`→ tool(args) ⇒ error · N lines — <首行预览>`。首行预览上限 120 字符（`PRIMARY_ARG_MAX = 120`）。后面同样跟着有界正文段。

参数摘要超过 120 字符时截断为 `…`。

四种截断标记：
- `…`（参数或错误首行超 120 字符）
- `[shaken ~N tokens — recover: artifact://N]`（主会话压缩标记，原文可回收）
- `[…Nln elided…]`（read 输出截断）
- `[…content elided to fit advisor context…]`（正文超预算）

## advisor 第一手确认

本次会话（2026-09-26）中 advisor 收到的 Session update 里：

- 成功的 read/grep 结果带完整 `Tool result:` 围栏正文（no-bs skill 那次 256 行、各 wiki 读取、各 grep 输出都看到了正文）。
- 失败结果（被 Blocked 的 grep）error 首行预览之后也跟了完整有界正文。
- 参数/错误首行 120 截断、`[shaken…]`/`[…elided…]` 标记与代码及实际所见一致。

advisor 原文："我实际收到的 Session update 里，成功的工具结果是带正文的，只是有界。"

## 与主会话 shake 的区别

shake（`src/session/session-maintenance.ts`）：压力驱动（上下文逼近阈值、溢出、或最新一轮太大导致压缩无从下口时触发）。把主历史里的大块内容原文存进 artifact 文件，原地换成 `[shaken ~N tokens — recover: artifact://N]`。占位符带回收地址，原文可取回。服务对象是主代理的上下文。

eviction：定时触发（每次评审前固定跑，与阈值压力无关）。只清 advisor 自己早轮的 read/grep/glob 结果。占位符 `[Stale result elided - N tokens]` 没有回收地址，原文不存任何地方，因为这三类工具可以重跑。服务对象是 advisor 的上下文。
