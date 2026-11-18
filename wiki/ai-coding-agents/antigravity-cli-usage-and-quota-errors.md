# Antigravity CLI 用量查询与配额/许可证错误分层

> Sources: 本机 Antigravity CLI 1.5.10 会话与日志，2026-11-17/18；Google Antigravity CLI `/usage`、`/credits` 文档；官方 plans 文档与支持论坛表述
> Raw: [2026-11-18 实测摘录](../../raw/ai-coding-agents/2026-11-18-antigravity-cli-usage-quota-routing.md); [2026-11-18 出口与域名对照](../../raw/proxy-ops/2026-11-18-antigravity-egress-and-domain-routing.md); [2026-11-18 会话证据](../../raw/omp-auth/2026-11-18-antigravity-cli-session-routing-and-errors.md); [2026-11-18 窗口锚点实测](../../raw/ai-coding-agents/2026-11-18-antigravity-quota-window-anchoring.md)
> Updated: 2026-11-18

## Overview

用量、配额与 credits 是三条查询路径，对应三套后端记录。错误按层分：1008 是地区资格，1001 是订阅许可证，no credits 是 credits 记录缺失，404 是请求方法不匹配。规则命中只证明路由，不证明出口被服务端接受；旧 TUI 会话可能保留失败状态。

## 用量入口

| 入口 | 结果 |
|---|---|
| TUI `/usage` 或 `/quota` | 打开交互面板，可滚动翻页 |
| `agy -p "/usage"` | 打印文本摘要 |
| IDE Settings → Models | 列出各模型组剩余配额 |
| `/credits` | 打开 credits 面板，打印模式 `agy -p "/credits"` |

打印模式默认展开 slash 命令，`--disable-slash-commands` 关闭。`/usage` 与 `/credits` 在打印模式下都能执行。

## 周额度窗口机制

成功输出按模型组显示周额度与重置时间。付费档另有 5 小时窗口，输出中未出现即未启用。周额度与 credits 是两套数据：周额度用尽后可以手动或自动使用 credits，没有 credits 记录时 `/credits` 报错。

重置时间的显示分两种状态（本机 2026-11-17/18 实测）：

| 组的状态 | 显示的重置时间 | 实测 |
|---|---|---|
| 组内零用量 | 本次查询时刻 + 7 天，每查一次前移一次 | 20:06 查询显示 11-25 20:06；20:17 查询显示 11-25 20:17；20:38 的 Claude/GPT 组显示 11-25 20:38 |
| 组内有用量 | 首笔未滚出用量的发生时刻 + 7 天，连续查询不移动 | 20:22:31 发起一次 Gemini 生成（日志 `streamGenerateContent`）后，20:31、20:40、21:02 三次查询都显示 98%、reset `2026-11-25T12:22:26Z`；21:02 的零用量组锚点为 `2026-11-25T13:02:27Z`（= 查询时刻 + 7 天） |

滚动 vs 日历周的判据：固定窗口下重置时间应当是不随查询时间变化的常量，实测零用量组的锚点随查询时刻前移，排除日历周与永久锚点。滚动窗口的标准读法是逐笔用量 7 天后各自滚出、分步恢复（锚点规律与实测一致），完整的恢复周期未观察。本机已有的一段对应观察：20:22:31 的生成记入用量后，20:31、20:40、21:02 查询的剩余均为 98%，锚点保持在 20:22:26 + 7 天。

例：周一 10:00 用掉 50%，周三 15:00 用掉 30%，之后停用——周二查询显示 20%、reset 下周一 10:00；下周一 10:00 后显示 70%、reset 下周三 15:00；下周三 15:00 后回到 100%、reset 恢复为「查询时刻 + 7 天」。

Pro 档为双层结构：5 小时池按会话首个请求滚动（支持社区原话 "is a rolling window, not a hard reset at a specific time of day"），叠加周封顶；撞顶后的等待等于最早一笔用量滚出窗口的剩余时间，论坛用户报的「等 3–6 天」即此（topic 114980，版主原话 "exhausted its rolling weekly allowance"）。

验证方法：先产生一笔真实用量（如一次生成），再连续查询两次；有用量组的重置时间应保持不变，零用量组每次都前移。仅靠连续查询验证不了锚点稳定性——零用量组每次都会前移。20:38 复测中出现一次 `Eligibility check failed: ... userinfo: EOF`（`www.googleapis.com` 网络抖动），重试恢复。

## 错误分层

### 1008：地区资格

`UNSUPPORTED_LOCATION` 表示账号或请求网络位置不在支持名单。错误域为 `cloudaicompanion.googleapis.com`，`error_number: 1008`。账号国家与请求出口是两项独立输入：账号与付款资料均为新加坡、请求出口为香港时仍返回 1008。

### 1001：订阅许可证

`SUBSCRIPTION_REQUIRED` 表示当前会话没有有效许可证，帮助链接指向 `https://cloud.google.com/gemini/docs/codeassist/request-license`。同一账号旧 TUI 会话报 1001，几分钟后新进程生成成功；属于瞬态状态，重试或重新登录可能恢复。

### no credits：credits 记录缺失

`agy -p "/credits"` 日志显示 `GetG1Credits: starting fetch` 后 18 微秒返回 `no credits info found`，期间没有 HTTP 请求。二进制存在 `GetG1Credits: paidTier is nil` 分支。当前账号没有 credits 记录，以 1 退出；配额与生成不受影响。

### 404：请求方法不匹配

浏览器 GET `https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary` 返回 404。无认证 `curl -X POST` 返回 401。该地址是只接受 POST 的 gRPC 方法路径（`v1internal:<method>` 是 custom verb 写法），GET 没有注册路由。

## 出口路由

规则命中与出口合规是两件事。Clash `/rules` 显示 daily 域名命中新加坡节点规则，`/connections` 显示链路为该节点；隔离测量确认该节点出口为新加坡，仍返回 1008。换成美国节点后 `/usage` 成功。节点名不反映真实出口地区，服务端判定以请求发出的网络位置为准。

本机调用涉及的主机：

- 核心：`daily-cloudcode-pa.googleapis.com`、`cloudcode-pa.googleapis.com`
- 实验开关：`aicode.googleapis.com`
- 登录与账号信息：`oauth2.googleapis.com`、`accounts.google.com`、`www.googleapis.com`
- 遥测：`play.googleapis.com`

`aicode` 的 `fetchConfig` 超时后回退到 CCPA `ListExperiments`，不影响配额与生成。

## 证据边界

- 窗口机制：逐笔滚出、分步恢复是标准读法；20:06 时 Gemini 组显示 100% 只说明当时服务端用量记录为空，清空原因（服务端批量重置、记录存活期或其他）查不到。
- 新加坡节点出口已确认为新加坡，仍返回 1008；美国节点出口已确认为美国，`/usage` 成功。节点出口地区与 Google 资格判定分别记录。
- 1001 的具体触发点没有日志证据；旧 TUI 与新进程对照确定瞬态性。
- Antigravity 使用 Code Assist 后端由请求契约、错误域与社区协议确认；Google 未公开架构文档。
- 窗口结论来自单个账号、单台机器、2026-11-17/18；不推广到其他套餐、地区或节点稳定性。


## See Also

- [Google Antigravity：套餐、模型、额度与地区](google-antigravity-plans-and-regions.md)
- [OMP Antigravity 认证与社区 API](../omp-auth/google-antigravity-auth-and-api.md)
- [域名定向代理规则：把指定域名固定到代理组](../proxy-ops/domain-targeted-proxy-rules.md)
