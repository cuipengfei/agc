# Headroom 0.42 设置项地图：生效顺序、失效项与保护名单匹配

> Sources: 本机 headroom-ai 0.42.0 源码与运行中服务实测, 2026-11-06
> Raw: [2026-11-06-headroom-042-settings-survey](../../raw/agent-tooling/2026-11-06-headroom-042-settings-survey.md)
> Updated: 2026-11-06

## Overview

0.42.0 的设置页共 63 个字段、11 个分组，基础层 16 项、高级层 47 项。页面显示的是合成后的最终值，其中由 CLI 参数形成的运行时值没有任何提示。当前部署有 5 组配置无效或不可改；工具保护名单的精确匹配规则决定了 `mcp__` 前缀的 MCP 工具必须用通配符才被保护；`/stats` 与 `savings` 不统计 WebSocket 流量，评估本机链路只能读日志 PERF 行。

## 生效顺序

每个字段的最终值按三层合成：已保存的 settings.json → 同名环境变量 → 运行时覆盖。环境变量覆盖会在页面上标出，运行时覆盖不标。

| 行为 | 结果 |
|---|---|
| 页面改值并保存 | 只写 `~/.headroom/settings.json`，重启后生效 |
| Apply & Restart | `supervised: false` 时不会重启进程，只提示手动重启 |
| CLI 参数固定的字段 | 页面上改了、重启后仍回到参数值 |
| 本机被固定的字段 | `mode`、`code_aware_enabled`、`protect_tool_results`、`anthropic_base_url`、`openai_base_url` |

## 分组地图

| 分组 | 字段数 | 覆盖内容 |
|---|---|---|
| Compression | 15 | 模式、节省档、保留比例、Kompress 各开关、保护名单、CCR 开关、压缩器白名单 |
| Limits | 4 | 每分钟请求与 token、并发上限、worker 进程数 |
| Budget | 3 | 预算数额、统计周期、估算支出的记账方式 |
| Networking | 8 | 监听地址与端口、Unix socket、连接池、HTTP/2、出站代理、空闲连接时长 |
| Logging | 2 | 是否记录消息内容、JSONL 路径 |
| CCR | 4 | Read maturation 开关与三个阈值 |
| Extensions | 1 | 加载哪些 proxy extension |
| Backend | 5 | 上游类型、any-llm provider、云区域、订阅用量轮询 |
| Timeouts | 11 | 重试次数与退避、读写连接超时、pre-upstream 并发闸 |
| Memory | 6 | 记忆库路径、项目根、工具与上下文开关、召回条数、证据门槛 |
| Endpoints | 4 | 两个上游 base URL 与两组附加请求头 |

## 当前部署下无效的配置

| 配置 | 页面表现 | 实际行为 |
|---|---|---|
| Limits 的 rpm | 显示 60 | 启动带 `--no-rate-limit`，`/health` 的 rate_limiter 为 disabled；改它不会重新开启限流 |
| Memory 六项 | 可编辑 | 启动未带 `--memory`，全部无效 |
| CCR 的 Read maturation 四项 | 可开关 | 特性限定 BETA 通道；且冻结前缀内的 Read 不会被成熟化，`--mode cache` 下很快落入冻结前缀 |
| Budget 的预算数额 | 可填 | 未定价模型不写预算记录，预算可能永不触发 |
| Extensions | 可填 | 本机 proxy extension 数量为 0，填 `*` 也不加载任何东西 |

## 保护名单的匹配规则

工具名匹配有两种方式：精确匹配（大小写不敏感）与通配符匹配。`mcp__server__tool` 这类拆出三段的名字会自动追加裸工具名作为别名；`mcp__codegraph_explore` 只有一段双下划线、拆出两段，不生成别名。

本机实测：名单写 `codegraph_explore` 时对 `mcp__codegraph_explore` 判定为不保护；写成 `mcp__*codegraph_explore*` 才命中。日志中 `function_call_output:code_aware` 出现 446 次，说明代码压缩持续作用于工具输出，其中属于 codegraph 的条数无法从日志区分。

## 归账分工

| 机制 | 改什么 | 记在哪 |
|---|---|---|
| 工具 schema 压缩 | 请求里的 tools 数组，删注解键；改后的数组就是发往上游的内容 | `tokens_saved` |
| 延迟加载 | 请求里加搜索工具与延迟标记，由上游把参数定义排除在模型上下文外 | `tool_saved` |
| turn hook 删除工具 | 真正从请求里删掉工具 | `tool_saved` |

本机 3,930 条 PERF 记录中 `tool_saved` 全部为 0，说明延迟加载与 hook 删除都未发生；schema 压缩单独出现的请求多数只省 36 token，带跨轮去重的请求总节省混有其他变换，PERF 无法拆出单项。

## 观测口径

`/stats` 的 savings ledger 与 `headroom savings` 只累计 HTTP 请求，读数停在一处旧记录上的 50 个请求。OMP 走 WebSocket，不计入。按日志实算 2026-10-31 至 11-06 共 3,930 个请求、627,159,254 input token、压缩节省 11,030,341（1.76%），缓存读取占 91.2%。

状态码需按事件行解析才有意义：200 共 4,273；500 共 123（`/v1/responses` 97、`/v1/chat/completions` 26）；204 共 27；400 共 20；404 共 18；304 共 10；408 共 5；413 共 2；502 共 2。全文关键字命中的「429」「5xx」「timeout」会把 token 数与阈值文本算进去。

压缩执行开销：`opt_ms` 中位数 9、p99 385、最大 11,350；压缩单元 316 条中 152 条判定无需改动。

## See Also

- [Headroom Extras](headroom-extras.md)
- [Headroom 版本升级与兼容性（0.39 / 0.41）](headroom-039-config-and-compat.md)
- [Responses API 工具 schema 延迟加载](../responses-api/tool-search-defer-loading.md)
