# Google One 家庭共享条款、额度社区估算与低价渠道核查（2026-11-20）

> Source: https://support.google.com/googleone/answer/9004015 ；https://support.google.com/googleone/answer/16286513 ；https://x.com/shimritby/status/2001175050444317089 ；linux.do 额度帖（3078561、3034696，经 Tavily 摘录）；O's World 实测锚点（经搜索摘录）；https://www.goofish.com/search （登录墙实测）；https://zhuanlan.zhihu.com/p/2104293099329660293 ；https://linux.do/t/topic/3157621 ；https://linux.do/t/topic/3130496 ；https://one.google.com/about/plans ；https://one.google.com/about/google-ai-plans
> Collected: 2026-11-20
> Published: Unknown

## support.google.com/googleone/answer/9004015（家庭共享，官方原文摘录）

与最多 5 位家庭成员共享 Google One 权益，加上自己最多 6 个账号。家庭组管理人须年满 18 岁；受邀家人须与管理人员住在同一个国家。

Antigravity 和 Flow 的用量限额由整个家庭组共享（官方原文标注“重要”）：家人没有各自独立的额度。Gemini 聊天应用：每个家人有自己的模型用量。

全家都能用的权益：存储空间（家人共用订阅的存储池）、Gemini 应用和 Google Antigravity 等 AI 权益、AI credits、Workspace 高级功能（AI Plus 2 TB 及以上）、Google Health Premium（限 AI Pro 或更高、部分地区）。

只归管理人、家人拿不到的权益：Google Developer Program premium（Pro 每月 $10 / Ultra 每月 $40 的 Google Cloud credits 也在其中）、Google Home Premium、Google Colab 的算力单元、YouTube Premium Lite（个人计划）、YouTube Premium 加购。

AI credits 全家共享，可用于 Antigravity 和 Flow 超额用量，但只有管理人能购买、升级或降级。

## x.com/shimritby（Google 订阅负责人）

每个家人有自己的 Gemini 模型用量（Gemini 聊天应用按人）。

## support.google.com/googleone/answer/16286513（AI Pro/Ultra 权益）

Google Developer Program premium：Pro 每月 $10、Ultra 每月 $40 的 Google Cloud credits。此权益仅归管理人。

## one.google.com/about/plans、/about/google-ai-plans（美国区）

Google AI plans 详细对比表将 Antigravity agent requests 分四级：Plus 为 Limited；Pro 为 Expanded；Ultra 5x 为 Higher（5x Pro）；Ultra 20x 为 Highest（20x Pro）。

one.google.com 购买页各档主打模型标注：AI Plus 卡片含 `Includes Gemini 4 Hydrogen`；AI Pro 卡片含 `Includes Gemini 4 Neon`（权益行另写"基础速率上限，含 Gemini 4 Neon 和 Claude Opus 5.5"）；AI Ultra 卡片含 `Includes Gemini 4 Carbon`。每档只标注一个主打模型，Antigravity 的完整模型目录只列在 antigravity.google/pricing。

美国区价格（详细对比表与购买页）：AI Plus $4.99/月起（400 GB 版；2 TB 版更贵）；AI Pro $19.99/月（年付 $199.99，5 TB）；AI Ultra 5x $99.99/月（20 TB，仅月付）；AI Ultra 20x $199.99/月（30 TB，仅月付）。免费档 15 GB。

普通 Gemini 使用额度的倍数基准：Plus 为非 AI 计划的 2 倍；Pro 为非 AI 计划的 4 倍；Ultra 5x、20x 相对 Pro。

## linux.do 额度逆向估算（经 Tavily 摘录，2026-11-20 采集）

社区按“等效 API 美金池”逆向：每个档位一个按 API 官方价格扣减的池子，5 小时滚动上限 + 周上限双重封顶。基准场景为 Gemini 4 Argon、高缓存命中的编程任务。

- AI Plus：周上限约 $15。
- AI Pro：5 小时上限约 $4-10（flash 与 argon 分池计量）；周上限两个实测帖分别为约 $15 与约 $40。
- Ultra 5x：5 小时上限约 $50；周上限约 $200。
- Ultra 20x：5 小时上限约 $200；周上限约 $800。
- 免费档：官方未公布，无可靠社区估算。
- 2026 年 10 月 Google 提额近一倍，此前数值更低；Google 会悄悄调整。

## O's World 实测锚点（经搜索摘录）

一个真实编程日：45 次调用、约 480 万 token，按 API 计价约 $3（Gemini 4 Argon、高缓存命中场景）。

## goofish.com（闲鱼网页版）核查（2026-11-20 实测）

- goofish.com/search?q=antigravity 与 q=反重力：不登录只显示站点框架，看不到商品列表。
- h5.m.goofish.com/search 端点：404。
- 搜索引擎收录的 goofish.com 商品页四轮检索（关键词：gemini ultra 拼车 代充、谷歌 gemini 账号、gemini pro 拼车 反重力 ide 代开、antigravity）：无任何一条 Google AI Pro/Ultra 或 Antigravity 账号/车位商品。
- “反重力”一词在 goofish 收录页被护肤品商品名（“h6反重力胶囊 2.0”，La Prairie/雅诗兰黛，¥300-600）占据。
- 同类 AI 订阅交易仍活跃：Cursor Ultra 账号（¥150-1400，大量）；Kimi / GLM / Minimax / opencode / Kiro 拼车或 key（¥33-200/人）；Bybit 虚拟卡（¥27，用于自行订阅海外 AI）。
- 边界：登录后的实时商品列表本次未核实；商品可能使用规避词（“谷子”“G家”）未收录。

## 渠道现状报告（2026-11，社区）

- 知乎 2026-11-12 亲历（zhuanlan.zhihu.com/p/2104293099329660293）：淘宝找 Google AI Ultra 家庭组拼车，约 300 元人民币/月；第一家没货；第二家付 20x 的钱被拉进 5x 的组，组内额度已被用光，交涉后第二天换到正常 20x 组。
- linux.do 2026-11-11（topic/3157621）：拼车的 Gemini Ultra 二十倍成员掉订阅，谷歌账号弹验证需申诉。
- linux.do 2026-11（topic/3130496）：“刚上车土区 google ai ultra 30T”，土区自购+拼车仍是省钱路线；土耳其区约 3000₺/月。
- 社区报告（2026-01 时期）：闲鱼几十元 Ultra 独立账号一般几天内被封；反代（reverse proxy）接 Antigravity 会封号。
