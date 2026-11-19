# Antigravity 定价页、模型文档与 Orchestrator 机制快照（2026-11-20）

> Source: https://antigravity.google/pricing/ （用户提供的页面全文）；https://antigravity.google/docs/models ；https://x.com/googledevs/status/2121364688848265490 ；https://www.infoworld.com/article/4248403/google-adds-multi-model-orchestrator-gemini-4-hydrogen-to-antigravity.html ；https://www.mindstudio.ai/blog/google-gemini-carbon-hydrogen-orchestrator ；https://www.eesel.ai/blog/google-antigravity-orchestrator ；https://one.google.com/ai?g1_landing_page=75 （新加坡区）
> Collected: 2026-11-20
> Published: Unknown

## antigravity.google/pricing 页面全文（用户提供快照）

选择适合你的订阅方案：免费开始构建，搭配 Google AI Pro 或 Ultra 扩展日常 Agent 工作流，或在 Google Cloud 上部署至整个组织。

Subscription plans / Model details / Quota & credits / Workspace accounts / Enterprise setup

正式发布（GA）

个人版 $0/月，无需付费订阅，零门槛体验 Antigravity。方案包含：支持跨 Antigravity App、CLI、IDE 扩展程序和 Python SDK 访问；并行后台 Agent、子 Agent、浏览器操作与定时任务；每周刷新的基础 Agent 配额（脚注 1）。

Models included: Gemini 3.8 Flash；Claude Sonnet 4.6 (thinking)（脚注 4）；Claude Opus 4.6 (thinking)（脚注 4）；GPT-OSS-120b（脚注 4）。

For Builders — Google AI Pro：凭借更高的每 5 小时刷新配额，跨桌面应用、CLI 和 IDE 扩展程序扩展多工作区 Agent 工作流。包含个人版的所有功能，以及：每 5 小时刷新的充裕 Agent 配额与更高的每周额度上限（脚注 1）；支持 /boost 深度推理、多 Agent 团队协作与远程控制；超出基础配额后可选用 AI 积分超额用量（脚注 1）。

Models included: Gemini 4 Neon（脚注 2）；Gemini 4 Argon（脚注 2）；Gemini 4 Hydrogen（脚注 3）；Orchestrator (Neon)（脚注 2）；Orchestrator (Argon)（脚注 2）；Gemini 3.8 Flash；Claude Sonnet 5.5 (thinking)（脚注 3）；Claude Opus 5.5 (thinking)（脚注 3）；Claude Sonnet 4.6 (thinking)（脚注 4、5）；Claude Opus 4.6 (thinking)（脚注 4、5）；GPT-OSS-120b（脚注 4）。

面向开发者 — Google AI Ultra：在所有开发环境中将 Antigravity 作为您的日常主力开发工具，畅享最高配额以及旗舰级 Gemini 4 Neon 和 Gemini 4 Carbon 模型。包含 Pro 版的所有功能，以及：每 5 小时刷新的最高等级 Agent 配额与最高每周额度上限（脚注 1）；面向个人用户的 Gemini 4 Neon、Gemini 4 Carbon、Orchestrator (Neon) 和 Orchestrator (Carbon) 访问权限；全面访问第三方合作伙伴模型，并支持使用 AI 积分超额用量（脚注 1）。

Models included: Gemini 4 Neon；Gemini 4 Carbon；Gemini 4 Argon；Gemini 4 Hydrogen；Orchestrator (Neon)；Orchestrator (Carbon)；Orchestrator (Argon)；Gemini 3.8 Flash；Claude Sonnet 5.5 (thinking)；Claude Opus 5.5 (thinking)；GPT-OSS-120b（脚注 4）。

面向企业与组织 — 商业版方案，通过 Google Cloud 提供。Google Cloud 客户现可使用 Antigravity App、CLI 以及 Antigravity IDE 扩展程序。现已推出：通过 API 访问，采用按量计费模式。面向符合条件的 Gemini Enterprise 客户提供：Standard/Plus 方案每席位每月 $30 美元起；按需付费方案，享 $0 席位费并按用量计费。核心优势：受 Google Cloud 服务条款保障；支持跨 API 和订阅方案设置支出上限；符合条件的订阅方案支持集中式管理控制。

Models included: Gemini 4 Neon（脚注 6）；Gemini 4 Carbon（脚注 6）；Gemini 4 Argon（脚注 6）；Gemini 4 Hydrogen（脚注 6）；Gemini 3.8 Flash（脚注 6）；Gemini 3.7 Flash（脚注 6）；Gemini 3.6 Flash（脚注 6）；Gemini 3.1 Pro（脚注 6）；Claude Sonnet 5.5 (thinking)（脚注 7）；Claude Opus 5.5 (thinking)（脚注 7）。

使用工作账号登录？Google AI Pro and Ultra plans require a personal Google Account. Use a personal account, pay as you go with your own Google Cloud project, or set up Gemini Enterprise.

方案与模型说明：
1. 速率限制和 AI 额度池因方案和任务复杂度而异。查看方案了解详情。
2. 适用于付费 Google AI Pro 方案，或通过符合条件的高端设备体验试用版。如需切换至付费 Google AI Pro 方案，请提交申请。
3. 仅适用于非试用版的 Google AI Pro 订阅。如需取消试用并切换至付费 Google AI Pro 方案，请提交申请。
4. 将于 2026 年 11 月 18 日移除。
5. 包含在 Google AI Pro 试用订阅中；付费 Google AI Pro 订阅则包含 Claude Sonnet 5.5 和 Claude Opus 5.5。
6. 第一方 Gemini 模型在 Gemini Enterprise 中默认启用，使用共享的版本席位额度（Standard 版每月 $10，Plus 版每月 $15）或按需付费计费。
7. 第三方合作伙伴模型需在 Google Cloud Console 中由管理员手动开启，并按四个思考级别（low、medium、high 和 max）的 Token 消耗量计费。

页面横幅：新推出 — Gemini 4 Neon 与 Orchestrator 现已登陆 Google Antigravity。

## docs/models：Choose a model（Orchestrator 相关）

单选模型：整个过程由该模型完成思考和执行，并且可以使用 thinking level 调节档（Low、Medium、High；Neon 和 Hydrogen 另有 Extra）。

Orchestrator：在此选项中指定的模型（Neon、Carbon 或 Argon）负责规划，执行交给 Gemini 4 Hydrogen。规划模型先探索代码库、理清含糊的地方、写出具体的执行计划，再把执行工作交给 Hydrogen；Hydrogen 改文件、写代码、跑构建和测试，并对照计划核对结果。中途出现意外情况时，控制权回到规划模型，检查当前状态、修补计划，再把执行工作交还给 Hydrogen。这些交接都在同一次回复里自动完成。

回控触发条件：验证步骤连续失败两次；接口行为和预期不符；遇到计划里没有定下来的设计选择。

Orchestrator 不能调 thinking level，使用固定配置。文档明确 Orchestrator 不是把提示词分类后整体交给单一模型的模型路由。

使用建议（文档原文）：日常功能开发、修 bug、重构、多文件调试用 Orchestrator；需要每一步都保持最大推理深度时（从零设计复杂的分布式系统、追查并发竞态、跨多个仓库做迁移），直接选 Neon、Carbon 或 Argon。

## googledevs 公告（X）

We rolled out Gemini 4 Hydrogen inside Google @Antigravity alongside a new Orchestrator mode in the model dropdown: Orchestrator (Carbon) and Orchestrator (Argon)。Running a heavy frontier model on every small code edit slows you down and burns quota. With Orchestrator, @Antigravity automatically pairs Gemini 4 Carbon or Argon with Gemini 4 Hydrogen in the same session for an optimized balance of quality, efficiency, and latency: Carbon or Argon explores dependencies and builds the plan; Hydrogen quickly writes the code, updates packages, and runs tests; Carbon or Argon steps back in to adjust the plan if a test fails.

## InfoWorld 报道（2026 年报道，采集于 2026-11-20）

While the planner models explore the codebase, identify dependencies, and develop an implementation plan, Hydrogen handles execution, including editing files, writing code, and running builds and tests. This execution differs from conventional model routing, which typically selects a model based on a prompt and assigns it the entire task. Orchestrator, instead, transfers control between the planning and execution models as work progresses. Currently, the hyperscaler offers Orchestrator with Carbon as the planner model to Google AI Ultra subscribers, while Orchestrator with Argon as the planner is available to both Google AI Pro and Ultra subscribers.

Orchestrator has no API model id, so it has no per-token price of its own（eesel）。

## MindStudio / eesel 引述的 Google 测试数据

Google's own testing: Orchestrator reached a success rate close to using Carbon alone while consuming 24% less quota and finishing tasks 19% faster（MindStudio）。eesel TL;DR：Google Antigravity's Orchestrator pairs two models in one chat: Gemini 4 Carbon writes the plan, Gemini 4 Hydrogen makes the edits, and control swings back to Carbon when something breaks. Google claims 24% less quota and 19% faster at near-Carbon success. It is Ultra only today.（注：eesel 发布时 Orchestrator 仅 Ultra 可用；2026-11-20 定价页 Pro 列表已含 Orchestrator (Neon) 与 (Argon)。）

A router classifies your first prompt and sends the whole task to one model. Orchestrator keeps both models in the loop: Carbon plans, Hydrogen executes, and control returns to Carbon on defined triggers（eesel）。

## one.google.com/ai 新加坡区购买页（2026-11-20 采集）

- AI Plus：SGD 6.98/月；促销价 SGD 1.78/月 × 3 个月；400 GB。
- AI Pro：SGD 28.99/月；促销价 SGD 7.28/月 × 3 个月；5 TB。权益含“基础速率上限，含 Gemini 4 Neon 和 Claude Opus 5.5”。
- AI Ultra：SGD 139.99/月起（无促销）；20 TB（对应 5x 档）；“更高使用权限”“5 倍于 AI Pro 的 Gemini 用量限额”。20 TB 版本即为 Ultra 5x；20x 档价格在页面选择器内，本快照未展开记录。
- 脚注 3（Ultra 权益）：YouTube Premium 家庭方案须由家人群组的管理员购买 Ultra 才能启用。
- 促销价前 3 个月，之后回到原价，可随时取消。
