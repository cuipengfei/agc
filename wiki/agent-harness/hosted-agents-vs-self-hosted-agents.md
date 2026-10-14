# 托管个人 Agent 与自托管 Agent：Muse、Grok Bot、Dots、Hermes、OpenClaw

> Sources: Meta Newsroom, 2026-09-08; Meta AI Research, 2026-09-08; xAI/Cursor Grok Bot documentation, 2026-10-14; OpenAI ChatGPT Dots, 2026-10-14; Nous Research Hermes documentation, 2026-10-14; OpenClaw documentation, 2026-10-14; XDA Developers, 2026-10-14
> Raw: [Hosted Agents vs Self-Hosted Agents：来源摘录](../../raw/agent-harness/2026-10-14-hosted-agents-vs-hermes-openclaw.md)
> Updated: 2026-10-14

## Overview

Muse、Grok Bot 和 Dots 把持续运行的云端电脑、账户连接、后台任务和用户审批做成托管产品。Hermes 与 OpenClaw 的本次资料证明了本地 skill、Gateway 和浏览器配置路径。两组产品在后台任务、浏览器控制、记忆和可复用技能上有明显重叠。托管产品由服务商维护运行环境，并提供厂商组合好的集成；自托管产品需要操作者管理具体配置。当前来源没有证明它们在相同任务上更准确或更可靠。

## 两种产品形态

### 托管产品

Muse 官方资料描述的是每位用户一台云端 Muse Secure VM，包含浏览器、文件、凭据存储和后台执行环境。用户通过应用或 WhatsApp 与 Muse 交流，关闭应用后任务仍可继续，遇到发送邮件或购买等操作时请求批准。

Grok Bot 官方文档描述的是具有持久云端电脑、浏览器、文件系统和终端的具名 Bot。多个 Bot 可以并行运行、互相发送消息、共享上下文并转交任务。用户演示一次流程后，Bot 可以保存成 skill 并按计划重新运行。

Dots 的官方页面把它定位为持续运行的 ChatGPT agent，强调学习用户优先事项、承接持续任务并在对话之间继续推进工作。

这些产品把运行环境交给服务商维护。用户主要配置任务、账户连接和批准范围。

### 自托管产品

Hermes 的官方文档把 skill 定义为按需加载的知识文档。skill 存放在本地目录，用户或 agent 可以创建、修改和删除。它支持外部 skill 目录和渐进式加载。

OpenClaw 的官方浏览器文档描述了由 Gateway 管理的独立 Chromium 浏览器，也支持连接已有的登录浏览器会话。浏览器可以由 agent 打开标签页、读取页面、点击和输入。

这些资料证明 Hermes 支持本地 skill 管理，OpenClaw 支持由 Gateway 管理的独立浏览器。关于模型 provider、凭据管理、完整运行环境控制和数据边界，本次材料不作结论。使用云端模型时，发送给模型的上下文仍然会交给对应 provider。

## 核心能力的重叠

| 能力 | 托管产品 | Hermes / OpenClaw | 当前判断 |
|---|---|---|---|
| 后台持续运行 | 官方资料明确支持云端持续执行 | 可通过持续运行的本机或服务器环境实现 | 能力方向重叠，运维方式不同 |
| 浏览器操作 | 云端浏览器或云端电脑 | OpenClaw 有独立浏览器；Hermes 的本次资料未证明完整浏览器方案 | OpenClaw 已有直接资料，Hermes 需按具体工具确认 |
| 记忆与上下文 | 产品提供持久上下文和账户级状态 | Hermes 有 skill 与跨会话能力；OpenClaw 有本地会话和工具状态 | 方向重叠，数据控制权不同 |
| 可复用流程 | Grok Bot 可从演示保存 skill 和 routine | Hermes 支持 agent 创建 skill；OpenClaw 支持 skill 与自动化扩展 | 方向重叠 |
| 运行环境 | 托管云端电脑 | Hermes：本地 skill 目录；OpenClaw：Gateway 管理的浏览器 | 具体运行责任需按部署确认 |

单独具备后台执行、记忆、skills 或浏览器控制，不能证明产品存在重大能力差异。当前资料能直接支持的差别集中在托管云端电脑、账户集成和浏览器配置；维护成本没有经过同任务实测。

## 三个托管产品的具体差异

### Muse

Muse 的官方资料把重点放在个人事务、账户连接和安全控制：

- 每位用户拥有专属云端 VM。
- Sentinel 负责连接器操作和网络出口的授权。
- 主 agent 不直接看到真实 token。
- 用户可以查看操作记录，并在敏感操作前批准。
- Stripe Link 提供一次性支付卡，避免把真实卡号交给 agent。
- 官方资料声称支持记忆、浏览器操作、后台任务和自定义连接器。

Muse Confidential VM 在官方安全文章中仍是计划推出的功能。当前资料支持 Meta 对数据隔离和访问控制的产品设计说明，不能把“Meta 无法访问用户数据”当作现有功能结论。

### Grok Bot

Grok Bot 的主要产品化差异是具名 Bot 和共享云电脑：

- 每个 Bot 保留自己的名称、角色、记忆、文件、浏览器会话和偏好。
- 多个 Bot 可以并行工作、互相交接任务。
- 所有 Bot 共享账户下同一台云电脑的文件、浏览器会话和登录状态。
- 用户可以演示流程，让 Bot 保存成 skill 或 routine。
- 网站阻止自动化或要求人工操作时，Bot 会把步骤交给用户。

这里的共享电脑同时带来便利和边界：Bot 之间可以直接交接，放在共享电脑里的数据也会对同一账户下的其他 Bot 可见。

### Dots

Dots 的已核实定位是 ChatGPT 内的持续运行 agent，官方页面强调持续任务、用户优先事项和跨对话推进。XDA 的个人体验报告把它与 OpenClaw 对比，认为 Dots 减少了部署和维护工作。

该体验报告只能证明一个人的使用经历。它不构成 Muse、Grok Bot、Dots、Hermes 与 OpenClaw 之间的准确率、可靠性或总成本基准测试。

## 自托管产品的实际增量

Hermes 与 OpenClaw 的价值主要在控制权：

- 可以管理本地 skill、Gateway 或浏览器配置，具体范围需要按版本和配置确认。
- 可以检查、编辑和版本化部分记忆、skill 与配置内容。
- 可以自行选择工具、浏览器、消息渠道和审批策略。
- 可以根据自己的网络、数据和维护要求建立集成。

代价是配置、升级、凭据保护、网络暴露、沙箱和故障处理由操作者承担。OpenClaw 文档明确提供独立浏览器配置，但安全边界仍取决于部署方式和具体配置。Hermes 的 skill 文档明确支持本地 skill 管理，但本次材料没有证明它已经自带 Gmail 与 Calendar 的完整集成。

## Gmail 与 Calendar 工作流的证据边界

以下组合流程需要同时具备账户读取、每日调度、内容整理、草拟回复、发送前批准和实际发送能力。本文把它作为核查范围示例，不把它当作任何产品已经提供的功能。

Muse、Grok Bot 和 Dots 的资料明确支持托管 agent、账户连接或持续任务方向，但本次没有对三者逐项运行该完整流程。

Hermes 的资料证明了 skill、消息渠道和调度相关能力，未证明现成的 Gmail 与 Calendar 集成及完整审批流程。OpenClaw 的资料证明了浏览器控制和自动化路径，未证明上述完整工作流开箱即用。两者可以通过额外工具、skill、浏览器配置或外部服务继续扩展，具体集成仍需单独核实。

## 选择含义

已经能够维护 Hermes 或 OpenClaw 的使用者，从 Muse、Grok Bot 或 Dots 获得的主要增量是：

- 更少的部署和升级工作。
- 厂商预先组合的账户连接。
- 产品内置的审批界面和托管运行环境。
- 某些产品提供的云端电脑、支付或多 Bot 协作界面。

自托管产品提供的主要增量是：

- 可以管理本地 skill、Gateway 或浏览器配置，具体范围需要按版本和配置确认。
- 对 skill、记忆、工具和审批策略的修改权。
- 对运行成本和系统行为的直接观察能力。

当前资料直接支持：Muse 和 Grok Bot 使用厂商提供的云端电脑；Hermes 与 OpenClaw 的资料要求操作者管理本地 skill、Gateway 或浏览器配置。当前资料不支持“托管产品整体更聪明”或“自托管产品整体更可靠”。需要同一任务、同一模型条件、同一工具权限和多次重复运行，才能比较任务成功率。

## See Also

- [Hermes vs OpenClaw：同模型表现差异的架构原因](hermes-vs-openclaw-architecture.md) — 两个自托管 agent 在 prompt、技能加载、上下文压缩和记忆架构上的差异。
- [开源 Harness 与托管推理不是一回事](../ai-coding-agents/open-harness-vs-hosted-inference.md) — 客户端、runtime、provider 路由和模型需要分开判断。
