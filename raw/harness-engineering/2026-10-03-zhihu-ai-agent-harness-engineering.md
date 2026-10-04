# 深入浅出完整解析AI Agent（AI智能体）的核心基础知识（第 10 章 Harness Engineering 摘录）

> Source: https://zhuanlan.zhihu.com/p/1919046969076195976
> Collected: 2026-10-03
> Published: Unknown

![ZhiHu logo](https://static.zhihu.com/heifetz/assets/wechat-share-logo.39ea9ecd.png)

[直答](https://zhida.zhihu.com/)

![深入浅出完整解析AI Agent（AI智能体）的核心基础知识](data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'></svg>)

# 深入浅出完整解析AI Agent（AI智能体）的核心基础知识

[![Rocky Ding](https://picx.zhimg.com/v2-b1adfbd84348f1ef0457f230539908c8_l.jpg?source=172ae18b)](//www.zhihu.com/people/RockyDing)

[Rocky Ding](//www.zhihu.com/people/RockyDing)
[​![](https://picx.zhimg.com/v2-2ddc5cc683982648f6f123616fb4ec09_l.png?source=32738c0c)](https://www.zhihu.com/question/48510028)

[... 前文第 1-9 章略，见原始 URL ...]

## 10. AI Agent中Harness Engineering的核心基础知识

> **AIGC/LLM大模型决定AI Agent“可能有多聪明”，Harness Engineering决定这份聪明能否被稳定地调度、约束、恢复、验证和规模化。Prompt 是一句工作要求，Context 是上下文阶段性材料，Harness 则是把一个聪明但会遗忘、会犯错的大模型，组织成可靠AI Agent生产系统的整套运行机制。**

很多团队都经历过一个相似场景。

同一个大模型、同一份需求、同一套工具，在 Demo 里十分钟跑通；换到实际生产环境，任务执行到第 N 步突然中断。重新启动后，AI Agent不知道邮件是否已经发出，于是又发了一遍；它记得“要改代码”，却忘了“不能改变外部 API”；它说测试通过了，实际只运行了最容易通过的那一组；它调用工具没有报错，外部系统却因为超时只完成了一半。

这时，继续升级大模型可能有帮助，却不能自动解决问题。因为真正坏掉的不是某一次推理，而是大模型外面的执行系统：状态没有持久化，工具结果没有沉淀，权限没有边界，工具结果没有统一语义，失败没有归因，完成也没有独立验收。

**Harness Engineering 正是在解决这类问题。**

Rocky认为，Harness Engineering 真正具备跨周期价值的原因也在这里：大模型会更新迭代，工具框架会被重写，但**“如何让一个AI大模型持续、可控地改变确定的现实世界”的整体思想**，不会因为AI技术的更新迭代而淘汰。

**Harness Engineering说白了，就是给我们的AI Agent搭一套专属「操作系统」。**先给所有人砸一个核心公式，记住这句话，我们对AI Agent的理解直接超过行业80%的人：

> **AI Agent = Model + Harness Engineering**

### 10.1 Harness Engineering原理介绍

总的来说，我们可以把一套AI Agent系统，完完全全想象成我们手里的电脑：

* 大模型 = CPU，只负责提供原始算力，是那个脑子好使的核心。
* 上下文窗口 = 内存，只能临时存点东西，一关程序就全没了。
* AI Agent = 我们电脑里的APP，不管是写代码、做报表还是订机票，是真正要落地干活的。
* 那Windows、macOS是什么？**就是Harness，这套AI Agent的操作系统。**

就好比没有操作系统，我们手里哪怕有一块世界顶级的i9芯片，我们也不能直接对着硅片敲PPT、做表格。同样的道理，没有Harness，我们的大模型哪怕再聪明，我们让它连续干8小时的复杂任务，可能也无法稳定、高效、持久的胜任。它中途丢失上下文怎么办？它写了一堆有bug的垃圾代码如何评估？它犯了低级错误自己都意识不到怎么办？

**这些问题，没有一个是「换一个更聪明的AI大模型」能解决的。**

这就是为什么2026年，Harness成了AI Agent的胜负手：2024年大家还在卷谁的大模型做题更厉害，到了今天，顶级闭源模型之间的智商差距已经微乎其微，同一道题，GPT和Claude的得分差不了几个点。

但我们让它们连续一周、每天8小时落地干活，差距立刻就拉开了。**这个差距，从来不在大模型本身，而在大模型外层的Harness Engineering。**

但Harness Engineering又不完全等于传统计算机操作系统。它还包含很多更靠近应用和质量工程的能力，例如：

* 如何向大模型组装当前上下文；
* 如何定义工具 schema 和错误返回；
* 如何编排 Planner、Executor、Evaluator；
* 如何根据任务风险请求人工批准；
* 如何把失败轨迹变成回归测试；
* 如何在大模型升级后删除已经不再需要的脚手架。

所以，更准确的理解是：**Harness是AI Agent的运行时、控制器、质量系统和治理层的总和。**

OpenAI的Codex团队有个数据：他们用Codex做完整的产品，5个月写了100万行代码，零行手写。整个过程里他们发现，瓶颈早就不是「大模型能不能写代码」，而是「人类能不能赶得上审查代码的速度」。

大模型的产出速度，已经远超人类的把控能力了。这时候我们的重点是质量把控、流程约束、风险兜底、经验沉淀——而这些，全都是Harness Engineering要干的事。

总的来说，我们可以把 Agent Harness 定义为：

> **围绕基础大模型构建的执行控制层。它负责准备上下文、暴露工具、推进生命周期、持久化状态、限制权限、记录轨迹、处理失败、验证结果，并把反馈重新送回下一轮决策。**

如果写成一个更严谨的系统表达式，AI Agent 的行为不是模型 M 的单变量函数，而是：

\text{Outcome}=F(M,H,E,T)

其中：

* M 是大模型及其推理能力；
* H 是 Harness，包括控制流、状态、工具、权限、评估和恢复；
* E 是执行环境及其真实状态；
* T 是任务定义、约束和验收标准。

![](https://pic3.zhimg.com/v2-14e86edf8e409cb25d4bd6e4c831f256_1440w.jpg)


Harness 把任务、上下文、模型决策、工具执行、环境反馈和独立验证连成闭环，并在外层加入权限、沙箱、预算与审计

因此，同一个大模型换一套 Harness，结果可能完全不同；同一套 Harness 换大模型，也可能改变最佳工具粒度、上下文策略和验证深度。更严谨的AI Agent 评估应该报告 **model–harness pair**，而不是把全部得分都归功于大模型。

### 10.2 Harness Engineering的三根核心支柱模块

总的来说，Harness Engineering的核心永远是三件事：

1. 评估闭环——AI Agent不能自己给自己打分
2. 架构约束——约束越多，反而越可靠
3. 记忆治理——能持续进化的AI Agent，才真正有壁垒

**【第一根支柱：评估闭环——AI Agent不能自己给自己打分】**

这是Anthropic最核心的看家本领，也是所有Harness的底线。

我们举个生动的例子：我们让一个实习生写一份项目报告，写完我们让他自己评价写得好不好，他大概率会说“还行吧，该写的都写了”。**我们永远不能让做事的人，自己给自己当裁判**。

AI Agent也是一模一样的道理。

Anthropic把这套方法叫「评估驱动开发」，说白了就是**AI Agent版的TDD（测试驱动开发）**：先定义清楚什么叫“做得好”，先把验收标准、测试用例写死，再让AI Agent去干活，干完之后，由一个完全独立的评估器来打分。

这个评估器，不是随便看看内容就给分。它会真的去跑流程、测功能：比如AI Agent写了个预订机票的程序，它就真的用Playwright去点按钮、填表单、跑完整的预订流程，完全按照我们定的标准，一条一条测试验证。

这里有个特别有意思的案例：Anthropic的Opus 4.5在做航班预订测试的时候，直接发现了预订政策里的漏洞，找到了一个比人类给的标准答案更省钱、更合规的解法。结果呢？评估器直接判它「任务失败」。

为什么？因为人类写的评估标准里，只认那一个标准答案。AI Agent聪明到能跳出人类的认知找最优解，反而被死板的评估体系扣了分。

1. 今天的大模型，已经聪明到超出绝大多数人的预期了。
2. 90%的情况下，不是大模型不行，而是对应的Harness Engineering配套能力跟不上。

还有个数据更直接：CORE-Bench测试里，Opus 4.5初始得分只有42%，后来团队只是修复了评分bug、放宽了不合理的评估限制，什么都没改，模型还是那个模型，得分直接跳到了95%。

这是OpenAI Codex团队玩到极致的东西，也是最反直觉的一个点。

**OpenAI的做法简单到粗暴，又有效到离谱：**把所有的架构规则，全写进linter和CI流程里。只要他的代码违反了分层规则，系统直接给他打回，连人工review的机会都没有。

他们的代码分层是死的：Types → Config → Service → UI，每一层只能依赖上一层，绝对不能反向依赖。这个规则不是写在开发手册里让人自觉遵守的，是写在程序里，机械执行、零容错的。

更绝的是什么？这些检查规则的linter，本身也是Codex自己生成的。**AI Agent自己给自己定规矩，然后自己严格遵守。**

Martin Fowler看完OpenAI的实践之后，说了一句话，**Rocky建议所有做AI Agent的人都刻在电脑上，这个经验也和机器学习领域本质的思想不谋而合：**

> “增加信任和可靠性，需要约束解空间。这意味着放弃一些「生成任何东西」的灵活性。”

* LangChain做了一组对照实验，大模型完全不换，只优化Harness的架构约束，Terminal Bench 2.0的通过率直接从52.8%跳到了66.5%；
* Vercel更狠，直接把AI Agent的工具删掉了80%，结果任务步骤更少、执行速度更快、最终效果反而更好。

“工具越多越厉害”，这是很多人对AI Agent最大的误解。就像我们给一个实习生开了全公司的系统权限，他不仅干不好活，还大概率给我们捅出大篓子。真正高效的执行，永远是在明确的边界里，做精准的动作。

**【第三根支柱：记忆治理——能持续进化的AI Agent，才真正有壁垒】**

这根支柱，聊的人最少，但长期来看，它是决定AI Agent天花板的核心。

首先我们问一个问题：多个AI Agent共享一个知识库，AI Agent A往里面写了一条错误的经验，AI Agent B读到了，直接当成真理用了，会发生什么？

答案是：**一个AI Agent的幻觉，会通过共享知识库，污染整个系统里的所有AI Agent。**

那怎么解决？PrismerCloud的做法，给整个行业打了个样：他们做了一套「进化引擎」，Agent的每一次经验，先记录为「信号」，信号经过反复验证、确认有效之后，才能提炼为「基因」，只有「基因」，才能进入正式的知识库，被所有AI Agent调用。

简单说：**没被跨周期反复验证过的，都只是道听途说；只有被长期实践证明有效的，才叫知识。**

这里有个数据，直接把卷了好几年的prompt engineering按在地上摩擦：

> 3行基础prompt，加上一套完善的记忆治理系统，效果约等于200行精心打磨的专家prompt。而且前者会越跑越好、持续进化，后者写完的那一刻，就已经固定死了上限。

这意味着什么？意味着未来我们根本不需要熬几个通宵，去抠prompt里的每一个词、写几百行的指令。只要我们的记忆系统做得好，AI Agent会自己在干活的过程中，沉淀经验、修正错误、持续进化。

### 10.3 AI Agent掉的链子，本质都是Harness Engineering的漏洞

什么意思？AI Agent系统跑久了，一定会自然腐化：文档过期了、架构规则被绕过了、知识库里堆了一堆过时的垃圾信息。就像一个公司运转久了，流程会慢慢变形、制度会慢慢松懈、部门墙会越来越厚。

OpenAI有一句话，Rocky认为是整个Harness Engineering的核心心法：

> “当AI Agent遇到困难时，我们把它当作信号：找出缺什么，然后反馈到代码库中，始终让Codex自己写修复。”

**AI Agent出了问题，不要去修AI Agent，要去修Harness Engineering。**

**每一次翻车，都是完善我们这套操作系统的机会**。我们的Harness越完善，AI Agent的下限就越高，就越难翻车。

Anthropic的Claude Code + Agent SDK，是目前通用Harness的标杆，核心就是那套评估驱动的方法论，他们已经用这套体系做深度研究、视频创作、全流程开发；OpenAI的Codex，是架构约束的极致实践，百万行零手写代码的“神话”，全靠这套体系撑着。

**Rich Sutton写过一篇经典的论文，叫《苦涩的教训》，核心意思是：长期来看，利用计算能力的通用方法，永远会打败人类精心设计的特定方法。**

这个教训，在AI Agent领域，正在再一次应验。

Manus团队6个月里，把自己的Harness重构了5次，同样的模型，5种架构，每一次重写，效果都有质的飞跃；LangChain一年里，核心架构重新设计了3次；Vercel直接删掉了Agent 80%的工具，反而迎来了效果的暴涨。

**他们都在做同一件事：Build to Delete，为删除而构建。**

Phil Schmid有一句话，Rocky觉得是2026年AI Agent领域最值得记住的一句话：

> **竞争优势不再是prompt，而是我们的Harness Engineering捕获的轨迹。同时每次AI Agent的成功和失败，都是训练下一代的数据。**

我们的Harness跑得越久，积累的轨迹越多，我们的AI Agent就越强。这个壁垒，不是靠换一个最新的大模型就能追上的。

* Prompt Engineering，解决的是「说什么」，管的是单次交互的效果；
* Context Engineering，解决的是「知道什么」，管的是给模型足够的信息支撑；
* Harness Engineering，解决的是「怎么持续、稳定、大规模地干活」，管的是AI Agent的下限、上限和长期壁垒。

这三个概念经常被写成一条“旧技术淘汰、新技术上位”的时间线。这样的说法方便传播，却不够严谨。Harness Engineering 并没有让 Prompt Engineering 和 Context Engineering 失效，而是把它们纳入了更大的系统边界。

| 工程层 | 核心问题 | 主要对象 | 典型失败 |
| --- | --- | --- | --- |
| Prompt Engineering | 应该怎样向模型表达任务？ | 指令、例子、格式、角色 | 模型误解目标、输出格式漂移 |
| Context Engineering | 这一轮模型应该看到什么？ | 文件、历史、检索、摘要、工具结果 | 噪声过多、关键约束丢失、上下文过期 |
| Harness Engineering | 模型应该怎样持续行动并被控制？ | 工具、状态机、沙箱、权限、观测、评估、恢复 | 重复副作用、越权、失控循环、假完成、不可恢复 |

一个简单问题可以只靠 Prompt；一个需要阅读十份材料的任务需要 Context；一个持续数小时、会写文件、发消息、调用生产 API 的任务，就必须进入 Harness Engineering。

真正的升级不是“从写 Prompt 改成写 Harness”，而是工程优化对象发生了变化：

1. 从优化一次回答，转向优化完整执行轨迹；
2. 从让大模型“感觉自己做对了”，转向让环境提供可验证证据；
3. 从依赖单次上下文，转向维护跨步骤、跨进程和跨会话的真实任务状态；
4. 从无限增加模型自由度，转向为不同风险配置不同能力边界。

### 10.4 Harness的七层核心架构

![](https://pic3.zhimg.com/v2-912e59f7da361116b5cf1cad334b61e0_1440w.jpg)

**10.4.1 E——Execution Environment，执行环境与沙箱**

真正的执行环境不是一个 `subprocess.run()`。它至少需要资源配额、超时、文件边界、进程清理、网络策略、凭证隔离和环境快照。对于高风险任务，还要使用容器、microVM 或远程沙箱降低爆炸半径。

**10.4.2 T——Tool Interface，工具接口与协议**

MCP、Function Calling 或自定义 RPC 只是连接协议。工具是否好用，还取决于语义是否清晰、schema 是否稳定、结果是否足够简洁、错误是否可恢复。

**10.4.3 C——Context and Memory，上下文与记忆**

**10.4.4 L——Lifecycle and Orchestration，生命周期与编排**

这一层回答：任务怎样从接收、规划、执行、暂停、恢复走到完成？单 Agent、子 Agent 和人类如何交接？

核心对象不是“消息”，而是状态机：`CREATED → RUNNING → WAITING_APPROVAL → RECOVERING → VERIFYING → COMPLETED/FAILED`。

**10.4.5 O——Observability and Operations，可观测与运行运营**

没有 Trace 的 Agent，出了问题只能读最终对话猜原因；有 Trace 但没有指标、关联 ID 和失败分类，也只是在收集更昂贵的日志。

**10.4.6 V——Verification and Evaluation，验证与评估**

**10.4.7 G——Governance and Security，治理与安全**

这一层回答：Agent 代表谁行动？谁授权？能访问什么？哪些动作必须人工批准？发生事故后能否追责和撤销？

权限、身份、策略、审计和信息流控制不是上线前补的 Guardrail，而是AI Agent行动能力的一部分。

Harness Engineering 很容易产生一种新的泡沫：过去大家售卖“万能 Prompt”，现在开始售卖“万能 Agent 框架”。但开源一套循环、插件系统或 Memory，并不自动形成商业壁垒。

**Harness也会过时，越复杂不等于越先进。**这是 Harness Engineering 最容易被忽略的另一半。每个 Planner、上下文重置、重试规则、工具限制和 Evaluator 都编码了一个假设：模型目前无法可靠完成某件事，所以系统替它加一层控制。当模型能力提升，这个假设可能失效，旧 Harness 会从保护装置变成额外延迟和错误源。

大模型会持续变强，也会持续降价。工具红利会被平台吸收，Prompt 技巧会被新模型吃掉，今天复杂的 Planner 可能明天就可以删除。但 Harness Engineering 里最本质的东西——状态、边界、证据、恢复、反馈与责任——不会过时。

**大模型能力决定上限，Harness Engineering决定下限；而一个AI Agent 产品真正的商业价值，最终取决于它能否在现实世界里把同一件事长期持续做对。**

## 11. 推荐阅读

**Rocky会持续分享AIGC的干货文章、实用教程、商业应用/变现案例以及对AIGC行业的深度思考与分析**，欢迎大家多多**点赞、喜欢、收藏和转发**，给Rocky的义务劳动多一些动力吧，谢谢各位！

Rocky一直在运营**技术交流群**（WeThinkIn-技术交流群），这个群的初心主要聚焦于AI行业话题的讨论与研究，包括但不限于算法、开发、竞赛、科研以及工作求职等。群里有很多AI行业的大牛，欢迎大家入群一起交流探讨～（请备注来意，添加小助手微信Jarvis8866，邀请大家进群～）

### 11.1 深入浅出完整解析扩散模型DDPM、DDIM、Score-Based、SDE、LDM、Classifier/Classifier-Free Guidance、Rectified Flow核心基础知识

**Rocky对扩散模型的本质原理与和核心基础知识进行了全面系统的深入浅出分析讲解**，同时不断跟进补充扩散模型的最新技术发展，希望能给大家带来帮助：

### 11.2 深入浅出完整解析FLUX.2、Seedream（即梦）、Z-image、GLM-Image核心基础知识

**Rocky对AIGC时代“中场时刻”之后的主流AIGC创作大模型的核心基础知识进行了全面系统的深入浅出分析讲解**，力求让大家通俗易懂理解AIGC时代的技术浪潮的本质价值：

### 11.3 深入浅出完整解析FLUX.1 Kontext和FLUX.1 Krea核心基础知识

Rocky对**FLUX.1 Kontext和FLUX.1 Krea的核心基础知识**作了全面系统的梳理与解析：

### 11.4 深入浅出完整解析DeepSeek系列核心基础知识

Rocky对**DeepSeek系列模型的核心基础知识**作了全面系统的梳理与解析：

### 11.5 深入浅出完整解析Stable Diffusion 3（SD 3）和FLUX.1系列核心基础知识

Rocky对**Stable Diffusion 3和FLUX.1的核心基础知识**作了全面系统的梳理与解析：

### 11.6 深入浅出完整解析Stable Diffusion XL（SDXL）核心基础知识

Rocky对**Stable Diffusion XL的核心基础知识**作了全面系统的梳理与解析：

### 11.7 深入浅出完整解析Stable Diffusion（SD）核心基础知识

Rocky对**Stable Diffusion 1.x-2.x系列模型的核心基础知识**做了全面系统的梳理与解析：

### 11.8 深入浅出完整解析Stable Diffusion中U-Net的前世今生与核心知识

Rocky对Stable Diffusion中**最为关键的U-Net结构**进行了深入浅出的全面解析，包括其在传统深度学习中的价值和在AIGC中的价值：

### 11.9 深入浅出完整解析LoRA（Low-Rank Adaptation）模型核心基础知识

对于AIGC时代中的**“ResNet”——LoRA模型**，Rocky进行了深入浅出的全面讲解：

### 11.10 深入浅出完整解析ControlNet核心基础知识

AIGC图像创作开源社区已经形成以Stable Difffusion/FLUX为核心，ConrtolNet和LoRA作为首要AI辅助工具的变化万千的AIGC图像创作工作流。

ControlNet正是让AI图像创作社区无比繁荣的关键一环，**它让AIGC图像创作过程更加的可控，更有助于广泛地将AIGC算法解决方案应用到各行各业中：**

### 11.11 深入浅出完整解析Sora、Seedance、keling等AI视频大模型核心基础知识

AI绘画和AI视频是两个互相促进、相互交融的领域，2024年无疑是AI视频领域的爆发之年，**Rocky对AI视频领域核心的Sora、Seedance、Keling等大模型进行了全面系统的梳理与解析：**

### 11.12 深入浅出完整解析AIGC时代Transformer核心基础知识

在AIGC时代中，Transformer为AI行业带来了深刻的变革。**Transformer架构正在一步一步重构所有的AI技术方向，成为AI技术架构大一统与多模态整合的关键核心基座，大有一统“AI江湖”之势**。Rocky对Transformer模型进行持续的深入浅出梳理与解析：

### 11.13 深入浅出完整解析ComfyUI、Diffusers、Stable Diffusion WebUI等主流AIGC创作框架核心基础知识

**AIGC创作框架正是AIGC算法工作流的运行载体，目前主流的AIGC创作框架有ComfyUI、Diffusers、Stable Diffusion WebUI等**。在传统深度学习时代，PyTorch、TensorFlow以及Caffe是传统深度学习模型的基础运行框架，到了AIGC时代，**Rocky相信ComfyUI就是AIGC时代的“PyTorch”、Stable Diffusion WebUI就是AIGC时代的“TensorFlow”、Diffusers就是AIGC时代的“Caffe”：**

### 11.14 手把手教你成为AIGC/LLM/AI Agent算法/开发工程师，斩获AIGC/LLM/AI Agent算法/开发offer！

在AIGC时代中，如何快速转身，入局AIGC产业？如何成为AIGC/LLM/AI Agent算法/开发工程师？如何在学校中系统性学习AIGC/LLM/AI Agent知识，斩获心仪的AIGC/LLM/AI Agent算法/开发offer？

**Don‘t worry，Rocky为大家总结整理了全面的AIGC/LLM/AI Agent算法/开发工程师成长秘籍**，为大家答疑解惑，希望能给大家带来帮助：

### 11.15 AIGC产业的深度思考与分析

2023年3月21日，微软创始人比尔·盖茨在其博客文章《The Age of AI has begun》中表示，自从1980年首次看到图形用户界面（graphical user interface）以来，以OpenAI为代表的科技公司发布的AIGC模型是他所见过的最具革命性的技术进步。

那么，在此基础上，我们该如何更好的审视AIGC的未来？我们该如何更好地拥抱AIGC引领的革新？**Rocky准备从技术、产品、商业模式、长期主义等维度持续分享一些个人的核心思考与观点，希望能帮助各位读者对AIGC有一个全面的了解：**

### 11.16 AI算法工程师的独孤九剑秘籍

为了**方便大家实习、校招以及社招的面试准备，同时帮助大家提升扩展技术基本面**，Rocky将符合大厂和AI独角兽价值的算法高频面试知识点撰写总结成**《三年面试五年模拟》之独孤九剑秘籍**，并制作成**pdf版本**，大家可在公众号**WeThinkIn**后台**【精华干货】菜单**或者回复关键词**“三年面试五年模拟”**进行取用：

### 11.17 深入浅出完整解析AIGC时代中GAN（Generative Adversarial Network）系列模型核心基础知识

GAN系列模型作为传统深度学习时代的最热门生成式Al模型，在AIGC时代继续繁荣，作为Stable Diffusion/FLUX系列大模型的“得力助手”，广泛活跃于AlGC图像创作的产品与工作流中：

编辑于 2026-08-25 20:38・浙江

[![Rocky Ding](https://picx.zhimg.com/v2-b1adfbd84348f1ef0457f230539908c8_l.jpg?source=172ae18b)](//www.zhihu.com/people/RockyDing)

[Rocky Ding](//www.zhihu.com/people/RockyDing)

[​](https://zhuanlan.zhihu.com/p/96956163)

北京科技大学 工学硕士
