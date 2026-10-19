# 本机链路缓存取证摘录（4139 历史 / 4142 日志 / Headroom 日志 / OMP 会话）

> Source: 本机实测（4139 `/api/history` 与 `router/state.ts`；4142 tmux 终端日志；Headroom `proxy-8787.log`；OMP 会话 JSONL）
> Collected: 2026-10-19
> Published: n/a（本机观测）

链路：OMP → 8787（Headroom，`--mode cache --code-aware --no-rate-limit`）→ 4140（sticky-router）→ 4142（唯一启用实例）。

## 4139 历史接口

- `router/state.ts` 中 `DEFAULT_HISTORY_LIMIT = 200`；`/api/history` 只返回进程内最近 200 条。
- 两次取数合并窗口：11:44:09–12:01:32 UTC（GPT 序列另有 12:23:45 UTC 的后续记录）。

## 同一会话的 Gemini 主对话与 GPT 6.1 Sol

按完整 `sid + model` 分组、剔除 `composer-prediction` 辅助请求后：

- Gemini 3.8 Flash 主对话 39 次请求，3 次缓存读取量下降：
  - 69,684 → 42,668 → 77,665 tokens（相邻请求间隔约 18 秒）
  - 93,901 → 0 → 94,022 tokens（其前 4142 于 11:51:29、11:51:30 记录两次 `ECONNRESET`；零值轮为 11:51:31）
  - 101,937 → 98,098 → 105,976 tokens
- 排除首次请求后主对话加权缓存读取比例 91.54%。
- GPT 6.1 Sol：首次请求 0%（冷启动），其后 57 次请求缓存读取量无下降，加权 98.65%，观察至 12:23:45 UTC。
- `composer-prediction` 辅助请求 78,252 tokens 缓存、81.44%，为独立辅助调用，不计入主对话序列。

## 逐跳排查证据

- **OMP**：会话 JSONL `compactionEpoch` 恒为 0；工具结果 `prunedAt` 均为 11:59:07（晚于全部低点）；`system-prompt-digest` 在 Gemini 期间无变更记录。→ 本机压缩/摘要改写不能解释低点。
- **Headroom**：11:44:46 的低点请求，`proxy-8787.log` 记录 freeze 19/20 条 messages、`compressed=0`、`tool_saved=0`、`cache_read=42668`；前后请求的 `tool_schema_compaction` 均为节省 730 tokens。→ 该低点前后未见历史内容改写。
- **copilot-api**：`router/state.ts` 将原始请求体字节转发（fetch 使用原 body）；`chat-completions/handler.ts` 只处理模型名、`maxTokens` 与会话标识，不改写 messages；低点附近日志无 reasoning 剥除重试（auto-session retry）记录。
- **4142**：零缓存轮前 2 秒内两次 `ECONNRESET`（11:51:29、11:51:30，UTC）。

## 其他模型的下降反例

- gpt-5.6-sol：缓存 99,072 → 51,968 tokens，同期输入 100,092 → 100,517 tokens（输入仍增长），原因未核实。
- gpt-6-luna：一次零缓存伴随输入从约 86,000 降至 35,728 tokens（上下文已变化），不构成“前缀稳定下的下降”反证。

采集备注：`cache_read / input` 比例是 usage 字段口径，不等同于后端请求级 cache miss 率；Headroom 日志的 `cache_hit_pct=100` 是其冻结前缀自算指标，与上游口径不同。
