# Claude Code 上下文窗口与自动压缩控制

> Sources: Claude Code 官方文档 env-vars 与 model-config 页（2026-09-05 取）; 本机已安装 claude 二进制字符串扫描与 `claude -p` 实测（2026-09-05）
> Raw: [Claude Code 上下文窗口与自动压缩相关环境变量（官方文档摘录）](../../raw/harness-engineering/2026-09-05-claude-code-context-window-docs.md); [claude 二进制中的压缩阈值与 `[1m]` 处理证据](../../raw/harness-engineering/2026-09-05-claude-binary-compaction-probe.md)
> Updated: 2026-09-05

## 核心判断

把 Claude Code 指向自建网关或中转站时，「它假设的窗口是多少」和「它在哪压缩」由三个不同变量控制，而 `CLAUDE_CODE_MAX_CONTEXT_TOKENS` 只在三种 model ID 情形中的一种下生效。不确认自己落在哪一档，就会设一个完全无效的值。

## 三情形：`MAX_CONTEXT_TOKENS` 何时生效

官方 model-config 把它明确分成三种互斥情形：

| 情形 | ID 形态 | 变量是否生效 | 客户端假设的窗口 |
|---|---|---|---|
| 1 | 不以 `claude-` 开头、不含 `[1m]`、无法解析成 Claude 模型 | 直接生效，proactive compaction 按声明窗口继续 | 声明值 |
| 2 | 不以 `claude-` 开头但含 `[1m]`、无法解析成 Claude 模型 | 单独不生效 | 1M |
| 3 | 以 `claude-` 开头或能解析成 Claude 模型 | 只在同时设 `DISABLE_COMPACT` 时生效（那会禁掉全部压缩） | 模型内置窗口 |

情形 2 要既修正窗口又保留 proactive compaction，官方要求同时设 `CLAUDE_CODE_DISABLE_1M_CONTEXT=1`；声明窗口高于 200K 时会出现启动警告，官方说明该警告在这种配置下是预期的。

情形 3 是中转站场景的陷阱：`claude-opus-5` 这类 ID 会被解析成真 Claude 模型，声明 1M 无效。官方举的例子包括 `anthropic/claude-opus-4-8` 与 `us.anthropic.claude-…-v1:0`，并且明确 `claude-opus-4-8[1m]` 即使设了 `CLAUDE_CODE_DISABLE_1M_CONTEXT` 也仍被解析成 Opus 4.8。

对完全不认识的 model ID，另有 `CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT=1`，让 Claude Code 改为等 API 返回 too-long 错误后再压缩；但网关若改写了错误措辞，这条恢复路径不会触发。

## `[1m]` 是客户端 alias，不是网关模型名

二进制里 `context-1m-2025-08-07` 与 `interleaved-thinking-2025-05-14`、`context-management-2025-06-27` 等并列出现在同一组 beta 标识串中。

线路侧的两条观测必须配对看：

- 直接向本机网关 `POST /v1/messages` 发 `"model":"gpt-5.4-mini[1m]"` → HTTP 502 `{"error":"no instance serves model: gpt-5.4-mini[1m]"}`；发 `"model":"gpt-5.4-mini"` → HTTP 200。
- 同一份环境变量下 `claude -p "reply with the single word ok"` → 可见回答含 `ok`，同时遥测行出现 `code:unrecognized_model] {"model":"gpt-5.4-mini[1m]","query_source":"sdk"}`。

只看 502 会得出「网关不支持该后缀所以不能用」的错误结论；只看 `claude -p` 成功会以为网关认这个 ID。两条一起才说明后缀是客户端侧处理掉的。

## 压缩点不是你设的那个数

`CLAUDE_CODE_AUTO_COMPACT_WINDOW` 的官方约束：取值 `100000` 到 `1000000`，只接受纯整数（`500k` 会被读成 `500` 再夹到 100K 最小值），有效窗口还会被模型上下文窗口再 cap 一次，且优先于 `/autocompact` 命令、`--autocompact` 标志和 `autoCompactWindow` 设置。

二进制里的触发点计算（offset 183821621 附近）：

```js
function ZPe(e,t){let r=e-13000,o=t.testPctOverride;if(o!==void 0&&!isNaN(o)&&o>0&&o<=100)return Math.min(Math.floor(e*(o/100)),r);return r}
function rst(e,t,r,o=t,d){let f=d??ZPe(t,r),y=r.enabled?f:t,E=y-20000,...
```

据此，默认触发点是窗口减 13000，不是窗口本身；`warn` 档在触发点再往前 20000。相邻标识符还包括 `windowSize`、`defaultEntry`、`precomputeBufferFraction`、`replacesDefault`，说明存在一张按窗口大小查的表，本文未提取该表的具体数值。

## 状态栏百分比与压缩时机脱钩

官方对 `CLAUDE_CODE_AUTO_COMPACT_WINDOW` 的说明里有一句容易漏掉的后果：状态栏的 `used_percentage` 始终按模型完整窗口计算，一旦设了这个变量，那个百分比就不再指示压缩何时发生。

二进制里对应的状态栏字符串是 `% context used`、`% until auto-compact` 与 `Context low (…% remaining) · Run /compact to compact & continue`，邻域出现 `pctLeft`、`effectiveWindow`、`DISABLE_COMPACT`。

## 两个不值得设的变量

`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 官方说明是设定压缩触发所在的百分比（1-100），并明确它抬不高阈值、高于默认百分比的值会被忽略。二进制里的实现与这句一致：`Math.min(Math.floor(e*(o/100)), r)`，`r` 即默认触发点，`min` 保证只能往前挪。所以把它默认设成 100 等于没设，只有想更早压缩（如 50）才有意义。

`CLAUDE_CODE_CONTEXT_LIMIT` 在 env-vars 页检索无命中，在本机 claude 二进制里 0 命中；同期 `CLAUDE_CODE_MAX_CONTEXT_TOKENS` 有 9 处、`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 有 6 处。可以认为它已废弃，为它写屏蔽逻辑没有作用。

## 其他相关取舍

`CLAUDE_CODE_MAX_OUTPUT_TOKENS` 对不认识的 model ID 默认 32000，高于模型上限的值会被降到上限；官方明确抬高它会减少压缩前可用的上下文。所以按真实上限设它不是白赚，是拿上下文换输出长度。

官方还提到 `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1` 可以让 model picker 直接从网关 `/v1/models` 填充；用环境变量固定模型的场景不需要它。

## 常见错误

- 不确认 model ID 落在哪一情形就设 `MAX_CONTEXT_TOKENS`，尤其中转站的 `claude-*` ID。
- 把 `AUTO_COMPACT_WINDOW` 当成精确触发点（实际还要减 13000）。
- 设了 `AUTO_COMPACT_WINDOW` 之后继续用状态栏百分比判断何时会压缩。
- 用单一信号断言线路行为：curl 与 `claude -p` 发的不是同一个请求。
- 给 `PCT_OVERRIDE` 设 100 并以为提高了阈值。

## See Also

- [Gateway catalog 是客户端配置的权威源](../model-gateway-mismatch/gateway-catalog-as-config-authority.md) — 这三个变量的值该从网关哪些字段取
- [Reviewer Blind Spots](reviewer-blind-spots.md) — 判决材料充分性：单一信号不足以定论
