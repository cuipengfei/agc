# Antigravity 周额度窗口锚点规律实测

> Source: 本机 Antigravity CLI 1.5.10 会话与日志、官方文档与论坛原文摘录，2026-11-17/18
> Collected: 2026-11-18
> Published: Unknown

## 问题与实测时间线

账号 `<ACCOUNT_EMAIL>`（consumer），`agy` 1.5.10，同一代理配置（美国节点出口）。

用户观察到 `/usage` 输出从 99%（重置 11-24 23:54）变成两组 100%（重置 11-25 20:06），随后复测与连续查询形成以下时间线：

| 查询/事件时间 | Gemini 组 | Claude/GPT 组 | 说明 |
|---|---|---|---|
| 11-17 23:51 首次成功 | 100%，reset 11-24 23:54 | 100%，reset 11-24 23:58 | 首次成功请求约在 23:54 |
| 11-18 00:01 | 99%，reset 11-24 23:54 | 100%，reset 11-25 00:10 | Gemini 组锚点不动 |
| 11-18 20:06 | 100%，reset 11-25 20:06 | 100%，reset 11-25 20:06 | 两组锚点 = 本次查询时刻 |
| 11-18 20:17 | 100%，reset 11-25 20:17 | 100%，reset 11-25 20:17 | 锚点再次随查询前移 |
| 11-18 20:22:31 | `streamGenerateContent`（ResponseID gpj9au7FHpKhytMPl_SuiAg） | — | 真实生成，用掉约 2% |
| 11-18 20:23:19 起另有多次 `streamGenerateContent`（同批运行） | — | — | 同批追加用量 |
| 11-18 20:31 查询 | 98%，reset `2026-11-25T12:22:26Z` | 100%，reset 20:31 | Gemini 锚点 = 用量时刻 + 7 天 |
| 11-18 20:38 查询 | 98%，reset `2026-11-25T12:22:26Z` | 100%，reset 20:38:46 | Gemini 锚点不动；本次前一次 `/usage` 运行（20:38:12 启动）报 `Eligibility check failed: ... userinfo: EOF`，重试恢复 |
| 11-18 20:40 查询 | 98%，reset `2026-11-25T12:22:26Z` | 100%，reset 20:40 | Gemini 锚点不动 |
| 11-18 21:02 查询 | 98%，reset `2026-11-25T12:22:26Z` | 100%，reset `2026-11-25T13:02:27Z` | 零用量组锚点 = 本次查询时刻（21:02:27）+ 7 天；有用量组锚点保持 20:22:26 |

## 结论模型

- **组内有用量**：显示的重置时间 = 首笔未滚出用量的发生时刻 + 7 天，连续查询不移动。
- **组内零用量**：显示的重置时间 = 本次查询时刻 + 7 天，每查一次前移一次；可读作「假设现在用，这份用量 7 天后滚出窗口」。
- 剩余百分比 = 窗口内尚未滚出的用量占比。
- 观察跨度：20:22:26 + 7 天的锚点在 20:31、20:40、21:02 三次查询中保持不变；完整恢复周期未观察。

## 日志证据

`cli-20261118_200604.log`（20:06 运行）：

```text
73  Print mode: not authenticated, trying silent auth
74  keyringAuth: loaded token, expired=false
75  ChainedAuth: authenticated via keyring (effective: keyring)
88  CCPA routed this account to AICode, but AICode FetchConfig failed, serving CCPA's flags
89  UseAICodeMendel routing switch changed: false -> true
86  doRefreshQuota: starting reload (force=true)
103 Print mode: running slash command /usage
106 retrieveUserQuotaSummary: context canceled
```

要点：silent auth 每次打印模式运行都执行（`cli-20261117_235835.log` 第 88–103 行同一序列），token 在有效期内，没有登录流程；`routing switch changed` 出现在每一次运行，属于进程初始化，不能作为窗口变化的证据。

`cli-20261118_202207.log`（20:22 运行）：

```text
159 loadCodeAssist Trace: 0x4787148a839e208e
160 streamGenerateContent?alt=sse Trace: 0x1bb0972ff273b5ec ResponseID: gpj9au7FHpKhytMPl_SuiAg  (20:22:31)
161 streamGenerateContent?alt=sse Trace: 0xc778124094651bd1 ResponseID: iJj9ar-nDYu8xdIP_ZbysAY  (20:22:36)
162 Print mode: soft-denying tool confirmation "McpTool" at step 4
```

20:38 复测中出现一次 `Eligibility check failed: ... userinfo: EOF`（`www.googleapis.com` 网络抖动），重试恢复。

## 官方与社区原文

- 官方 plans 文档：免费档 "A meaningful quota, refreshed weekly; A weekly rate limit"；Pro "A high, generous quota, refreshed every five hours until the weekly limit is reached"；Ultra "The most generous quota, refreshed every five hours; Highest weekly rate limits"。
- 官方 /usage 文档："The models in a group share a weekly limit and a five-hour limit."
- 论坛 topic 114980 版主回复："your account has exhausted its rolling weekly allowance"。
- 支持社区线程（Ultra 档）：5 小时刷新 "is a rolling window, not a hard reset at a specific time of day"。
- Gemini Enterprise 配额文档（同族产品）：月度配额 "enforced on a rolling seven-day basis as a shared pool"。

## 证据边界

- 20:06 时 Gemini 组显示 100% 只说明当时服务端用量记录为空；清空原因（服务端批量重置是否命中、记录存活期）日志查不到，未定。
- 逐笔用量 7 天后各自滚出、分步恢复是滚动窗口的标准读法，锚点规律一致；完整恢复周期本机未观察。
- 免费档 weekly 沿用滚动机制无官方原文，由实测、版主用词、Enterprise 文档共同支撑。
- 结论来自单个账号、单台机器、2026-11-17/18；不推广到其他套餐、地区或长期节点稳定性。
