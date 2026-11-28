> Source: 本机实测与源码阅读——headroom-ai 0.45.0 安装包源码（`~/.local/share/uv/tools/headroom-ai/`）、`~/.headroom/logs/proxy-8787.log*`、`~/.headroom/savings_events.jsonl`、`~/.headroom/proxy_savings.json`、`127.0.0.1:8787/stats`、`127.0.0.1:4140/token-usage` 与 `token-usage/events`、只读查询 `~/.local/share/copilot-api/copilot-api.sqlite` 的 `token_usage_events` 表、GitHub Copilot 官方定价页 `https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing`
> Collected: 2026-11-28
> Published: 2026-11-28

# Headroom 压缩率偏低的原因与节省金额的重算

## 一、起点问题

会话开始于一个疑问：为什么 Headroom 对 chat completion 接口的压缩率这么低，是 bug 还是默认设计。随后问题转为：它实际替用户省了多少钱，缓存折扣不计入，只算压缩带来的减少。第三轮质疑展示金额是否夸大，第四轮要求给出最可信的数字。

## 二、压缩率偏低的三处设计门

### 2.1 cache 模式冻结历史前缀

进程启动横幅记录 `Mode: cache`、`Prefix freeze: strict (all prior turns immutable)`、`Mutations: latest turn only`。

六个轮转日志文件里，2,537 条带 router 记录的 chat 消息中冻结比例为 99.65%，每条请求通常只有最后一条消息可改。`/stats` 的 `summary.uncompressed_requests.prefix_frozen` 记录 128 条请求，软件自身的提示文本写明 “Most requests are prefix-frozen”。

冻结的理由是保住上游前缀缓存：同一会话窗口内 `prefix_cache.compression_savings_usd` 为 2.65，缓存折扣为 47.12。

### 2.2 Read/Glob 结果在保护名单内

2,537 条 chat 请求中有 1,059 条的 router 记录为 `{'excluded_tool': 1}`，即唯一可改的那条消息正是 Read/Glob 的结果。日志样例：

```
Pipeline: freezing first 515/516 messages (prefix cached by provider)
[router] route_counts={'excluded_tool': 1} compressed=0 frozen=515 msgs=516
PERF model=gemini-4-argon ... tok_saved=0
```

Read/Glob/Grep/Write/Edit 属于 `headroom/transforms/content_router.py` 的 `DEFAULT_EXCLUDE_TOOLS`，Read 另受字节精确保护。原因是模型要用原文匹配编辑器的 `old_string`，压缩这段内容会让后续编辑匹配失败。

### 2.3 流式 chat 不注入取回工具

`headroom/proxy/handlers/openai.py` 的 `_should_inject_openai_chat_ccr_tool` 在流式请求下返回 False，`cross_turn_dedup_recoverable` 随之关闭，跨轮去重不执行。

2,589 条 chat 请求中 2,579 条为 `text/event-stream`。

取舍理由：在 SSE 里注入 `headroom_retrieve` 后，模型若真去调用，该工具调用会顺着数据流漏给未注册此工具的客户端；要让代理截住并自行完成取回，就得把整段流式回复攒在内存里，破坏边生成边出字。上游 issue #3815 记录了这个限制，默认关闭的 `--ccr-buffered-chat-streaming` 是可选补偿。

### 2.4 其余零节省轮次与上游状态

- 202 条记录为 `ratio_too_high`（压缩结果未变小）、200 条为 `shell_small_result`（小段 shell 输出）、30 条为 `error_protected`（错误输出）。
- 日志中 Kompress 的 ratio 在 0.98–1.0 附近，说明进入 ML 压缩的文本本身可压空间有限。
- 上游 #3363（Kompress 权重未加载）已修复；本机 0.45.0 日志有 `Kompress slow compress backend=onnx`，无 `Kompress model not ready`。

### 2.5 各口径读数

| 口径 | 读数 | 说明 |
|---|---:|---|
| `/stats` `avg_compression_pct` | 6.6% | 只对发生过压缩的 119/247 条请求求平均 |
| `/stats` `savings_percent` | 4.98% | 每轮把完整历史计入分母 |
| chat completions 日志聚合 | 0.81% | 2,259 条有 PERF 记录的 gemini-4-argon 请求，51% 请求为零 |
| `/v1/responses` 日志聚合 | 4.50% | 17,019 条，24% 请求为零 |
| gemini-4-argon 账本 | 0.74% | 按整段历史分摊 |
| gpt-6.1-sol 账本 | 4.37% | 同上；按新增内容算为 47.8% |

## 三、账本把金额报高的机制

### 3.1 同一段历史在后续每轮重复计钱

连续三轮请求都记“省下 19,725 token”，每轮计入约 0.049 美元，后两轮新增输入只有 520、539 token，其余绝大部分命中缓存。

| 19,725 token 的计价方式 | 金额（美元） |
|---|---:|
| Headroom 记入的节省 | 0.04926 |
| 按该次请求的 Copilot 新内容写入价 | 0.03452 |
| 若全部为重复历史，按该次缓存读取价 | 0.00138 |

同一批 token，属于新增内容还是重复历史，金额相差 25 倍。账本没有保留两者各自的数量，把消息压缩统一按新内容价格计。

### 3.2 目录价与实际扣费价不同

`headroom/pricing/counterfactual.py` 读取的是 LiteLLM 本地价格表。本机实测与它不一致：

| 模型 | 账本采用（美元/百万 token） | Copilot 实际扣费（美元/百万 token） |
|---|---:|---:|
| gpt-6.1-sol 写入 | 2.50 | 1.75 |
| gemini-4-argon 输入 | 3.00（默认兜底） | 2.00 |

### 3.3 一处需要更正的理解

会话中途曾把多出的 25% 判为“错误费用”，这条判断作废。GPT-5.6+ 的缓存写入价本来就是未缓存输入价的 1.25 倍，是官方定价而非错误。真实的错在 3.1 的重复计价。

`/stats` 的 `savings_basis` 为 `unpriced`；30 天账本中 21,900 条有目录级价格依据，6,629 条只能按平铺价兜底。

## 四、重算方法

1. 读取 `~/.headroom/savings_events.jsonl` 全部事件（30,336 条，覆盖 2026-07-07 起）。
2. 只读打开 `~/.local/share/copilot-api/copilot-api.sqlite`，取 `token_usage_events` 中同一区间的行。
3. 按模型与时间窗一对一匹配：先按缓存读取量相等、再按输入总量相等、再按时间接近排序，每个账本事件与每条用量行都只用一次。匹配结果 30,597 次请求，覆盖 4142 用量库中 98.36% 的付费金额。
4. 逐请求取当时实际扣费率：从 `nano_cost_input` / `nano_cost_cache_write` / `nano_cost_cache_read` / `nano_cost_output` 除以对应 token 数得到，保留历史窗口中的 0.7 / 0.9 / 1.0 折扣档与长上下文档位。
5. 把每条事件的 `saved` 分成新增内容与重复历史：同一会话串流内按缓存读取量的变化查找前序请求，相近者取差额；没有前序时按该轮缓存读取占输入总量的比例分摊。
6. 新增内容按该轮的输入价与写入价加权，重复历史按该轮缓存读取价，两者相加得字数节省。
7. 单次请求原长度超过 272,000 token 而压缩后未超过时，计入该请求实际输入侧费用作为档位规避收益（含输出侧的 0.5 权重）。

费率实测值（美元/百万 token）：Sol 写入 1.75、读取 0.07；Terra 0.875 / 0.035；Luna 0.125 / 0.01；Gemini 输入 2.00、读取 0.10。

## 五、重算结果

窗口为页面口径的 Last 7 days 与 Last 30 days，按北京时间，截止 2026-11-28 13:40。

| 范围 | 实际支出 | 压缩节省 | 日均支出 | 日均节省 |
|---|---:|---:|---:|---:|
| 最近 7 天（11/22–11/28） | 210.08 | 7.96 | 30.01 | 1.14 |
| 最近 30 天（10/30–11/28） | 773.73 | 39.56 | 25.79 | 1.32 |

节省金额的两部分：

| 范围 | 字数节省 | 272K 档位规避 | 合计 |
|---|---:|---:|---:|
| 7 天 | 4.63 | 3.33 | 7.96 |
| 30 天 | 23.57 | 15.99 | 39.56 |

30 天的做题尺度校验：输入总量 43.5 亿 token，输入花费 656.10 美元；压缩掉 146,013,363 token，占 3.36%，按总比例粗算约 22.79 美元，与逐请求重算的 23.57 美元吻合。

新旧内容构成：30 天节省的 146,013,363 token 中，新增内容占 7.2%，重复历史占 92.8%。

按模型（30 天）：

| 模型 | 重算后 | 账本展示 | 倍数 |
|---|---:|---:|---:|
| gpt-6.1-sol | 36.42 | 233.72 | 6.4 |
| gpt-6.1-terra | 6.91 | 55.46 | 8.0 |
| gemini-4-argon | 5.88 | 15.11 | 2.6 |
| gpt-6-luna | 1.35 | 3.81 | 2.8 |

账本展示合计 308.11 美元，重算后 39.56 美元。

## 六、被推翻的旧口径

会话早期给出的三组金额作废，理由都是按 `cost_effective_usd` 直接求和：全部历史 2,370.73 美元、最近 30 天 307.85 美元、最近 7 天 86.51 美元。作废原因是第三节的重复计价与目录价偏差。

`deferred` 与 `saved_tool_schema` 在全部 30,336 条事件中均为 0，`tool_tokens_saved` 与 `tool_schema_savings_usd` 同为 0，因此 `saved − deferred` 等于 `saved`。
`ccr_retrievals` 为 0，没有取回动作产生的返工。

## 七、证据边界

- 新增内容与重复历史的数量分摊是按每轮 `new_input` 与缓存读取比例近似，账本没有直接字段；这是重算中唯一靠推断的一步。
- 逐请求匹配的成功率不是 100%，未匹配的少数记录按邻近同模型的实际费率补估。
- Fusion 30% 折扣在 2026-11-30 之前仍有效，所有金额都是在折扣后的实际扣费口径下测得，不能与目录价口径直接比较。
- 图表与表格里的日级数字来自按北京时间切分的自然日，与页面 Last N days 的滚动窗口起点相差数小时。
- Copilot 扣费是 AIU 额度，压缩减少的是额度消耗；是否转成现金支出取决于额度是否超额。
- 汇率与额度换算口径 `nano AIU / 1e11 = USD` 取自 `copilot-api` 的计费模型。
