# Headroom 0.42.0 设置页全量调查：字段分布、生效顺序与失效项

> Source: 本机 headroom-ai 0.42.0 site-packages 源码（~/.local/share/uv/tools/headroom-ai/lib/python3.13/site-packages/headroom/）+ 运行中服务 GET http://localhost:8787/settings/schema + 进程启动参数 + ~/.headroom/logs/proxy-8787.log
> Collected: 2026-11-06
> Published: Unknown

## 运行形态

- 版本：`headroom --version` → 0.42.0
- 启动参数（`ps` 实读）：`headroom proxy --anthropic-api-url http://localhost:4140 --openai-api-url http://localhost:4140 --code-aware --protect-tool-results codegraph_explore --no-rate-limit --mode cache`
- `GET /settings/schema` 返回 `supervised: false`，即前台/nohup 启动，非守护托管。
- `~/.headroom/settings.json` 为空，未保存过任何页面修改。
- 字段总数 63，分组 11 个；按层级 `basic` 16 项、`advanced` 47 项。

| 分组 | 字段数 | 字段键 |
|---|---|---|
| Compression | 15 | mode, savings_profile, target_ratio, disable_kompress, lossless, code_aware_enabled, protect_tool_results, no_ccr, ccr_inline_resolve, no_ccr_proactive_expansion, compression_max_workers, disable_kompress_fallback, disable_kompress_anthropic, disable_kompress_openai, compressors |
| Limits | 4 | rpm, tpm, limit_concurrency, workers |
| Budget | 3 | budget, budget_period, budget_estimated_basis |
| Networking | 8 | host, port, uds, max_connections, max_keepalive_connections, http2, http_proxy, keepalive_expiry |
| Logging | 2 | log_messages, log_file |
| CCR | 4 | read_maturation, read_maturation_quiesce_turns, read_maturation_max_hold_turns, read_maturation_min_size_bytes |
| Extensions | 1 | proxy_extensions |
| Backend | 5 | no_subscription_tracking, subscription_poll_interval, backend, anyllm_provider, region |
| Timeouts | 11 | retry_max_attempts, retry_base_delay_ms, retry_max_delay_ms, request_timeout, connect_timeout_seconds, write_timeout_seconds, upstream_tcp_keepalive_seconds, anthropic_buffered_request_timeout_seconds, anthropic_pre_upstream_concurrency, anthropic_pre_upstream_acquire_timeout_seconds, anthropic_pre_upstream_memory_context_timeout_seconds |
| Memory | 6 | memory_db_path, memory_project_root, no_memory_tools, no_memory_context, memory_top_k, min_evidence |
| Endpoints | 4 | anthropic_base_url, openai_base_url, anthropic_extra_headers, openai_extra_headers |

## 值来源与生效顺序

`settings_store.py:1057` 的 `effective_values(` 按三层合成每个字段的最终值：已保存的 settings.json → 同名环境变量 → 运行时覆盖（进程内由 CLI 参数形成的值）。响应里 `env_override`（`settings_store.py:1136`）与 `runtime_override`（`settings_store.py:1139`）分别标记这两种来源。

页面显示的是最终值。环境变量覆盖在页面上有黄色提示；运行时覆盖没有任何提示，因此由 CLI 参数固定的字段看起来和普通字段一样。

保存只写 `~/.headroom/settings.json`，重启代理后生效。`supervised: false` 时页面的 Apply & Restart 不会重启进程，只返回手动重启提示。

本机被 CLI 参数固定的字段：`mode`（cache）、`code_aware_enabled`（true）、`protect_tool_results`（codegraph_explore）、`anthropic_base_url` 与 `openai_base_url`（均 http://localhost:4140）。这五项在页面上改了保存、重启后仍回到参数值。

## 当前部署下无效的字段

1. **Limits 的 rpm**：页面显示 60，但启动参数带 `--no-rate-limit`，`/health` 的 `rate_limiter` 为 disabled。页面数值不参与判定，改它不会重新开启限流。
2. **Memory 六个字段**：启动未带 `--memory`，`/health` 显示 memory disabled。`no_memory_tools`、`no_memory_context`、`memory_top_k`、`min_evidence`、`memory_db_path`、`memory_project_root` 在本机全部无效。
3. **CCR 的 read_maturation 四个字段**：`rollout.py:116-121` 定义该特性的 `available_in=RolloutChannel.BETA`。stable 通道下不经 beta/dev 通道无法启用。即使启用，`transforms/read_maturation.py:193-195` 说明冻结前缀内的 Read 已经按原样写入缓存，不会被成熟化，而本机 `--mode cache` 会让 Read 很快进入冻结前缀。
4. **Budget 的 budget**：成本表查不到价格的模型不写预算记录，因此只有当模型被定价时预算才可能触发。
5. **Extensions 的 proxy_extensions**：本机 `headroom.proxy_extension` entry point 数量为 0，设为 `*` 也不会加载任何扩展。

## 工具保护名单的匹配规则

`config.py:373-379` 的 `_tool_name_aliases` 负责给工具名生成别名：只有 `mcp__server__tool` 这种拆出三段的名字（`split("__", 2)`，`config.py:376`，取 `parts[2]`，`config.py:379`）才会追加裸工具名。`mcp__codegraph_explore` 只有一段双下划线，拆出两段，不生成别名。

匹配方式有两种：`config.py:589` 精确匹配（大小写不敏感），`config.py:615` 通配匹配（`*` 展开为正则）。

用安装包里的函数实测：

```python
_tool_name_aliases('mcp__codegraph_explore')            # ('mcp__codegraph_explore',)
is_tool_excluded('mcp__codegraph_explore',
                 DEFAULT_EXCLUDE_TOOLS | {'codegraph_explore'})      # False
is_tool_excluded('mcp__codegraph_explore',
                 {'mcp__*codegraph_explore*'})                      # True
```

结论：本机启动参数 `--protect-tool-results codegraph_explore` 从未命中 OMP 实际发出的工具名 `mcp__codegraph_explore`。日志中 `function_call_output:code_aware` 出现 446 次，说明代码压缩持续作用于工具输出；日志不记录工具名，具体哪几条属于 codegraph 未核实。

## 工具 schema 压缩与延迟加载的归账分工

- `proxy/handlers/openai.py:2917` 调用 tools 数组压缩，`openai.py:2921` 把结果赋回 `working`，`openai.py:2924` 打上 `openai:responses:tool_schema_compaction` 标签，`openai.py:2928` 按压缩前后 token 差累加进 `tokens_saved`。压缩后的数组就是发往上游的内容。
- WebSocket 路径同一逻辑：`openai.py:8428` 压缩，`openai.py:8470` 判断是否改动，`openai.py:8476` 替换待发送的内层载荷。
- `proxy/outcome.py:827` 调用 `tool_schema_saved_from_tags` 计算 `tool_saved`；该函数只累加 `tool_search_deferred_tokens` 与 `turn_hook_tools_saved_tokens` 两个标签（`proxy/tool_schema_savings_policy.py:161-163`）。
- `tool_schema_savings_policy.py:6-10` 明确写明 schema 压缩的节省已在 `tokens_saved` 内，不得重复累加。

日志读数（2026-11-06，`proxy-8787.log` 全文件）：PERF 行 3,930 条，`tool_saved` 非零的为 0 条；transform 只含 `openai:responses:tool_schema_compaction` 的 3,277 条中，总节省为 36 token 的最多（1,483 条），另有 267、194、71、667 等值；带 `router:responses_cross_turn_dedup` 的 33 条节省更高（最高 8,121）。PERF 只记录合并后的 `tokens_saved`，无法从中拆出单次 schema 压缩的数值。

推论：`tool_saved=0` 说明延迟加载与 hook 删除都没有发生，schema 压缩的收益记在 `tok_saved` 里。

## 压缩超时按客户端分档

`openai.py:144` 定义 codex 客户端在 WebSocket 路径上的压缩等待上限 5 秒，`openai.py:8432-8434` 在实际调用处使用；其他客户端走 `helpers.py:1434-1435` 读取的默认值 30 秒。日志里 ONNX 单次推理 1.1 到 13.1 秒，超过 5 秒的部分走 passthrough。

## 观测口径：账本只计 HTTP

`GET /stats` 的 savings ledger 与本机 `headroom savings` 只累计 HTTP 请求，读数停在 2026-10-19，只有 50 个请求。OMP 走 WebSocket（日志中为 `WS /v1/responses`），这部分不进账本。

按日志 PERF 行实算：

| 日期 | 请求数 | 输入 token | 压缩节省 | 节省比例 | 缓存读取占比 |
|---|---|---|---|---|---|
| 2026-10-31 | 566 | 116,052,535 | 714,889 | 0.62% | 91.2% |
| 2026-11-01 | 1,140 | 224,573,964 | 4,917,665 | 2.19% | 91.0% |
| 2026-11-02 | 1,135 | 152,068,089 | 3,502,846 | 2.30% | 91.8% |
| 2026-11-03 | 438 | 59,817,293 | 364,691 | 0.61% | 93.0% |
| 2026-11-04 | 331 | 43,397,534 | 1,035,742 | 2.39% | 89.9% |
| 2026-11-05 | 309 | 30,293,597 | 494,184 | 1.63% | 88.1% |
| 2026-11-06 | 11 | 956,242 | 324 | 0.03% | 78.2% |
| 合计 | 3,930 | 627,159,254 | 11,030,341 | 1.76% | 91.2% |

状态码分布（按 `event=proxy_inbound_response ... status=` 解析）：200 共 4,273；500 共 123（`/v1/responses` 97、`/v1/chat/completions` 26）；204 共 27；400 共 20；404 共 18；304 共 10；408 共 5；413 共 2；502 共 2。

重试与超时按事件行解析：`Request failed (attempt N)` 与 `Connection error to upstream API (attempt N/M)` 合计 5 条；`ReadTimeout` 实际 1 条；`upstream streaming error` 行 131 条。

方法论教训：全文关键字命中的「429」「5xx」「timeout」计数会把 token 数、时间戳、阈值文本算进去，不能当作状态统计；必须按事件格式解析。

## 压缩执行开销

同一日志读数：压缩单元 316 条，其中 `modified=False` 152 条；`opt_ms` 中位数 9、p99 385、最大 11,350。

## 结论

页面的 63 项里，5 组在当前启动方式下无效或不可改；保护名单因大小写敏感的精确匹配与 `mcp__` 别名拆分条件而全部落空；OMP 的流量不计入 `/stats` 与 `savings`，评估该链路只能读日志 PERF 行。

## See Also

- [Headroom Extras](headroom-extras.md)
- [Headroom 版本升级与兼容性（0.39 / 0.41）](headroom-039-config-and-compat.md)
