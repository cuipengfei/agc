# Google Antigravity：套餐、模型、额度与地区

> Sources: Google Antigravity pricing、plans、models、enterprise 与 FAQ 页面，2026-11-14 采集；Google 套餐调整公告，2026-05-19；CodeAgentSwarm 美国区价格整理，2026-10-31；Forbes 设备试用报道，2026-10-25；Google 开发者论坛与 Reddit 用户报告，2026-03 至 2026-11；OMP `pi-ai` 18.19.0 版本说明，2026-11-12
> Raw: [套餐与模型](../../raw/ai-coding-agents/google-antigravity-plans-models-2026-11-14.md); [地区与用户报告](../../raw/ai-coding-agents/google-antigravity-regions-quota-reports-2026-11-14.md); [OMP 认证与额度记录](../../raw/omp-auth/omp-antigravity-auth-headers-2026-11-14.md)
> Updated: 2026-11-14

## 套餐和价格

Antigravity 个人用户可以免费使用，也可以通过 Google AI 套餐获得更多额度。下表的美国区月费来自 CodeAgentSwarm 于 **2026-10-31** 整理的价格；本次抓取 Google One 页面时，部分价格没有显示。地区价格与税费应以购买页面为准。

| 个人档位 | 美国区月费 | Antigravity 额度 |
|---|---:|---|
| Individual / Free | $0 | 每周刷新，有周上限 |
| Google AI Plus | $4.99 | Google 将其归入非 Pro、非 Ultra 的每周额度组 |
| Google AI Pro | $19.99 | 每 5 小时刷新，另有周上限；可购买 AI credits 用于超额使用 |
| Google AI Ultra 5x | $99.99 | 每 5 小时刷新，另有周上限；可购买 AI credits 用于超额使用 |
| Google AI Ultra 20x | $199.99 | 每 5 小时刷新，另有周上限；可购买 AI credits 用于超额使用 |

Free 和 Plus 在官方模型表中使用同一列。官方计划文档将两者归入同一额度类别，但没有给出各自的绝对额度。

企业用户可以通过 Gemini Enterprise Standard／Plus 座位，或具备相应条件的 Google Cloud project 按用量计费。Antigravity 定价页称 Standard／Plus 从每座位每月 **$30 USD** 起，按用量方案没有座位费。Enterprise 文档称首方 Gemini 使用共享座位额度，Standard 为每月 **$10**、Plus 为每月 **$15**；第三方模型须由管理员开启并按 token 用量计费。

## 各档模型

下表是 Google 模型文档在 **2026-11-14** 的内容。Enterprise 的 Claude 5.5 需要管理员开启第三方模型。

| 模型或选项 | Free / Plus | Google AI Pro | Google AI Ultra | Enterprise |
|---|---|---|---|---|
| Gemini 4 Hydrogen、Gemini 3.8 Flash | 可用 | 可用 | 可用 | 可用 |
| Gemini 4 Carbon | — | — | 可用 | 可用 |
| Gemini 4 Argon | — | 付费订阅或符合条件的设备试用 | 可用 | 可用 |
| Orchestrator (Carbon) | — | — | 可用 | — |
| Orchestrator (Argon) | — | 付费订阅或符合条件的设备试用 | 可用 | — |
| Gemini 3.7 Flash、Gemini 3.6 Flash、Gemini 3.1 Pro | — | — | — | 可用 |
| Claude Sonnet 5.5、Claude Opus 5.5 | — | 非试用订阅 | 可用 | 可用 |
| Claude Sonnet 4.6、Claude Opus 4.6 | 可用 | 可用 | — | — |
| GPT-OSS-120b | 可用 | 可用 | 可用 | — |

官方文档当时计划在 **2026-11-18** 移除 Claude 4.6 和 GPT-OSS-120b。模型选择器和当前文档决定实际可选项。

Google 没有在本次查阅的资料中列出完整的 `eligible premium devices` 名单。Forbes 作者于 **2026-10-25** 报告，他的促销试用账号中出现 Argon、Claude Opus 5.5 和 Sonnet 5.5；该报道描述的是账号上的可见情况，Google 文档对 Pro 档 Claude 5.5 写的是非试用订阅。

## 额度怎么计算

Google 将额度与 agent 完成的工作量关联：任务越复杂，使用量可能越高。官方提供相对额度和刷新方式，没有给出各套餐固定的每月 token 数或固定请求次数。

Google **2026-05-19** 的公告称，$100／月的 Ultra 档相对 $20／月 Pro 有 **5X** token 额度，$200／月档为 **20X**；公告同时按模型 API 价格说明共享额度。不同模型以及 input、output 和 cache read 的比例会影响能完成多少工作。

Google 当时的公告称 Gemini Flash 与 Gemini Pro 共用额度，非 Gemini 模型使用独立额度。随后 OMP `pi-ai` **18.19.0** 的版本说明记录：Gemini 4 Argon 使用专属周额度，Gemini 3.x 不消耗该额度；Argon 不消耗 `gemini-weekly`。这是 OMP 的额度判断规则记录，具体账号的用量以服务返回和产品页面为准。

Pro／Ultra 的 AI Credit Overages 设置可选 `Never` 或 `Always`。选 `Never` 时等待对应额度刷新；选 `Always` 时额度耗尽后自动使用 credits，按 Gemini Enterprise 的标准用量价格计算。

### 近期用户报告

- **2026-10-21**：一位用户称，运行 Gemini 3.8 Flash 约 15 分钟后触及周额度，随后尝试 Sonnet 也受到限制。帖子未给出套餐档位和完整用量数据。
- **2026-11-09**：一位用户称 Claude Opus 在 CSV 任务中消耗 `2500 tokens` 并在不到 30 分钟触及 5 小时限制，任务最多启动了 8 个 subagents。该用户未注明套餐，报告中的 `2500 tokens` 含义也未进一步说明。

这些是个人使用报告，不能换算成每个套餐的固定 token 数。

## 地区与账号资格

Google FAQ 的 **2026-11-14** 名单包括日本、新加坡和台湾，亚洲名单未列中国大陆、香港和澳门。Antigravity 支持某地区与 Google AI 套餐能否在该地区购买是两个条件：FAQ 另列了不可购买 Google One AI 套餐的地区，其中包括 Brunei 和 Türkiye。

| 用户关心的地区 | FAQ 名单 | 会话中查到的情况 |
|---|---|---|
| 中国大陆 | 未列出 | 论坛回复称账号关联地区由多种信号决定，注册时使用美国 VPN 不一定改变关联地区 |
| 香港 | 未列出 | 一位付费 Pro 用户报告 Antigravity 拒绝访问 |
| 日本 | 列出 | 一位账号关联日本的用户报告 OAuth 登录成功，但模型请求返回 `403 UNSUPPORTED_LOCATION`，错误号 `1008` |
| 新加坡 | 列出 | 一位用户报告人在新加坡、账号关联新加坡且直连，仍遇到 `1008`；截至其 2026-11-12 回复仍未解决 |

Google FAQ 要求个人账号关联到支持的国家或地区，并提供 [Terms 页面](https://policies.google.com/terms)查看地区、[Country Association 表单](https://policies.google.com/country-association-form)申请更正。论坛回复称请求的网络位置也会参与资格检查，代理显示的出口地区可能与 Google 判定结果不同。

本次会话观察到地区更正表单包含“经常使用 VPN”的选项，没有提交申请，审批结果和通过率未知。GPS 或浏览器定位是否参与 Antigravity 判定没有查证；没有在中国大陆使用特定代理或节点调用 Claude Opus 5.5 的实测。

`403 UNSUPPORTED_LOCATION` 是案例中报告的资格错误。账号被暂停属于另外的处理：Google 对第三方客户端使用 Antigravity 账号的限制与 OMP 版本行为见下文的关联文章。

## See Also

- [OMP Antigravity 认证与社区 API](../omp-auth/google-antigravity-auth-and-api.md) — 登录提示、第三方客户端风险和接口证据
