# Copilot Fusion 折扣真实入账：4143 实例 SQLite 逐分项核验（2026-11-11 本机实测）

> Source: 本机实测（tmux 4143 实例 scrollback、`http://localhost:4139/api/history` 与 `/api/status`、`~/.local/share/copilot-api/copilot-api.sqlite` 只读查询、`http://127.0.0.1:4143/v1/models` 目录价；目录价语义参照 `copilot-api` 仓库 `src/lib/token-usage` 的 nano AIU 计费模型：100 AIU = $1）
> Collected: 2026-11-11
> Published: 2026-11-11

## 一、背景与对象

- copilot-api 仓库 DISCOUNT-01 功能（Fusion 30% → Auto 10% → 原价降级链，commit 8ce69b5）与日志修复（commit 8a49294a）已于本日推送。
- 4143 实例（tmux pane `copilot-20261110-231547-2681:1.2`，进程 PID 181474）于本机时间 2026-11-11 01:49:12（2026-11-10 17:49:12 UTC，+08:00）重启并运行 DISCOUNT-01 代码。
- 折扣官方条款：Through November 30, 2026, users on paid Copilot plans receive a 30% discount on model costs when using Copilot Fusion（raw/ai-coding-agents/2026-10-28-copilot-fusion-ga-effort-levels.md 第 117-120 行，`<!-- expires 2026-11-30 -->` 注释内的 note）。
- 实例账号类型 business，上游主机 `api.business.githubcopilot.com`。

## 二、数据库与方法

- 数据库定位：`ls -l /proc/181474/fd` 中该进程实际打开的 SQLite 文件为 `/home/cpf/.local/share/copilot-api/copilot-api.sqlite`（含 -wal 与 -shm），经 `ps -p 181474 -o lstart=` 确认进程启动时刻与 tmux scrollback 重启时间一致。
- 查询全部只读（Bun `bun:sqlite` Database readonly 模式），无任何写入。
- 表：`token_usage_events`，计费相关列：`model`、`input_tokens`、`output_tokens`、`cache_read_input_tokens`、`cache_creation_input_tokens`、`nano_cost_input`、``+`nano_cost_output`、`nano_cost_cache_read`、`nano_cost_cache_write`、`total_nano_aiu`、`cost_source`、`created_at_ms`、`created_at_utc`、`request_outcome`。
- 目录价取自 `http://127.0.0.1:4143/v1/models`（HTTP 200）返回的 `billing.token_prices`，`batch_size: 1000000`，gpt-6.1-sol default 档 input_price 200、output_price 1000、cache_read_price 10、cache_write_price 250（AIU/百万 token）；gpt-6-luna default 档 10/50/1/12.5；gemini-4-argon 200/1000/10/0；gpt-6-astra 1000/5000/100/1250。
- 核验方法：对每条计费记录，按四个分项（input、output、cache read、cache write）分别计算 `记录分项费用 / (token 数 × 目录价 × 1e9 / batch_size)`，得到实际扣费比例；并把四分项之和与上游返回的 `total_nano_aiu` 对账。938 条计费记录中分项之和与 total 全部相等（sumMatches=true），比例全部落入 0.7 / 0.9 / 1.0 三档且逐分项一致，无一无法归类。

## 三、重启后窗口核验（本机 2026-11-11 01:49:12 至 02:02:13 +08:00，即 2026-11-10 17:49:12 至 18:02:13 UTC，13 分钟）

| 模型 | 有计费记录数 | 实际费用 USD | 按目录原价 USD | 比例 |
|---|---:|---:|---:|---|
| gpt-6.1-sol | 7 | 0.38649254 | 0.55213220 | 70% |
| gpt-6-luna | 6 | 0.0151007885 | 0.021572555 | 70% |
| gemini-4-argon | 10 | 0.51225000 | 0.51225000 | 100% |

- 21 条看板计费记录（`/api/history` 中带 `copilotUsage` 的行）按模型 + 总费 + 四分项 + 时间窗口与 SQLite 逐条匹配，全部唯一对应。
- 单价对照示例（AIU/百万 token）：gpt-6.1-sol input 200→140、output 1000→700、cache write 250→175；gpt-6-luna input 10→7、output 50→35、cache write 12.5→8.75。cache read 同为目录价 70%。

## 四、全天窗口核验（本机 2026-11-11 00:00:00 至 20:57:06 +08:00）

共 1,154 条记录，其中 938 条 `cost_source='copilot_aiu'` 有上游计费明细。

| 模型 | 30% 条数 | 10% 条数 | 原价条数 | 实际费用 USD | 按目录原价 USD |
|---|---:|---:|---:|---:|---:|
| gpt-6.1-sol | 113 | 752 | 0 | 30.92334939 | 35.36458370 |
| gpt-6-luna | 7 | 41 | 0 | 0.1639972615 | 0.187090325 |
| gemini-4-argon | 0 | 0 | 25 | 1.6695819 | 1.6695819 |

- 合计：实际 32.7569285515 USD，原价 37.221255925 USD，平均折扣 11.99%，节省 4.4643273735 USD。
- 长上下文：66 条按 long_context 档价格核算后折扣比例同为 70%（gpt-6.1-sol 59 条、gpt-6-luna 7 条）。
- 无计费明细的 216 条：gpt-6-luna-decisions 171 条（目录价全 0）、text-embedding-3-small 29 条（目录价全 0）、contoso/glm-5.2 与 contoso/family/glm-5.2 各 8 条（第三方 provider，无上游 AIU 账单）。
- 有计费记录中 `total_nano_aiu` 为 0 的条数为 0；`cancelled` 请求（Sol 248、Luna 27、Gemini 2）带已产生费用，计入上表。

## 五、10% → 30% 单向演化与重启边界

按时间排序逐条核查：

- gpt-6.1-sol：最后一条 10% 在 01:47:53.492，第一条 30% 在 01:59:03.613（+08:00），间隔 11 分钟，之间无交错，第一条 30% 之后 10% 记录为 0。
- gpt-6-luna：最后一条 10% 在 01:38:15.123，第一条 30% 在 01:51:04.399，间隔 13 分钟，无交错。
- 01:49:12 重启之后带计费记录共 134 条：30% 124 条（gpt-6.1-sol 115、gpt-6-luna 9），gemini-4-argon 原价 10 条（01:52:58.460 至 01:57:24.480），10% 记录 0 条。
- 30% 记录持续到当天 21:01:29.664（gpt-6.1-sol）与 21:00:46.748（gpt-6-luna），说明 Fusion 缓存持续命中并续期。
- 更正记录：第一轮报告曾称 25 条 gemini-4-argon 原价记录"均在重启前"，经同一查询条件复查，重启前为 15 条、重启后为 10 条，已当面更正。
- `/auto` 响应的 `discounted_costs: {"gpt-6-luna": 0.1}`（2026-11-10 探测，raw/ai-coding-agents/2026-11-10-auto-routing-response-probe.md 第 57 行）与 Auto 10% 实际入账（目录价 90%）一致。Fusion 选择类型（get-fusion-selection.ts）无 `discounted_costs` 字段；Fusion 30% 的证据链是官方条款 + 本轮四分项 0.7 比例实测。

## 六、方法补充：日志颜色取证（同会话）

- 诊断 4143 重启后日志颜色丢失时，用 `tmux capture-pane -t <pane> -p -e -S -5000` 抓取含 ANSI 转义序列的原始输出（`-e` 保留转义码），与基准提交源码逐字符对照，定位到新代码 `hit` 行用 `JSON.stringify(model)` 包裹模型名且未接 `colorizeModel`，WebSocket `miss` 漏掉事件着色。
- 现有 copilot-api skill（instances.md）只记录了无 `-e` 的 `capture-pane -p -S -5000` 用法；`-e` 对比转义码用于颜色诊断属本会话新用例。

## 七、证据边界

- 本轮全部数字来自上述 SQLite/API 实测输出，查询只读；未发起任何新的真实模型请求，未修改线上实例。
- 30%/10% 为折扣链实际扣费比例的观测结论，推测机制为上游按来源折扣出账，出账侧字段未公开，未验证。
- 目录价来自 4143 `/v1/models` 当次返回，上游可变；折扣官方有效期至 2026-11-30，之后不保证。
- 看板 `/api/history` 与 SQLite 是同一数据流的两个视图，不构成独立佐证；跨库一致性以分项对账为准。
