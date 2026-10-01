# OMP Snapcompact 机制

> Sources: OMP upstream source code（本地树 HEAD 73a11421fe，v18.2.11-58）；本机 copilot-api 源码；本机 OMP 配置；GitHub issue 搜索（2026-10-01）
> Raw: [Snapcompact 机制源码取证](../../raw/omp-config/2026-10-01-snapcompact-mechanics-forensics.md); [Snapcompact 活跃度与采用度取证](../../raw/omp-config/2026-10-01-snapcompact-activeness-adoption.md)
> Updated: 2026-10-01

`snapcompact` 是 OMP 的一种 compaction 方法（独立包 `@oh-my-pi/snapcompact`）：不调用 LLM 写摘要，把被裁掉的旧历史序列化成文本后**渲染成高密度 PNG 位图帧**，有视觉能力的模型直接读图恢复上下文。整个 pass 本地、确定性，光栅化与 PNG 编码走原生代码（pi-natives）。

## 问题模式（本文结构由此而来）

本文按一组真实提问的模式组织，每个模式对应后面的章节：

1. **表面矛盾要求拆穿**：「图片里也是文字，token 不都一样？」「变成图片就不算丢弃了吧？」「还是 100k 不就白压了？」→ 「被丢弃」与计费两节
2. **拒绝抽象名词，要物理形态**：「帧是什么？PNG？」→ 下一节
3. **用具体数字验证**：100k token 的思想实验 → 计费节的算账
4. **极限推演探测边界**：「为什么不永远用图片」→ 边界节
5. **从通用机制落到「那我们呢」** → 我们环境节
6. **断言要出处** → 关键结论挂行号与 issue 号

## 帧的物理形态

一帧 = 一张近似正方形的 PNG 位图：OpenAI 模型 1568px、Gemini 2048px、高清 Claude（opus 4.7+/fable/mythos）1932px。图上用像素字体把对话文本逐字印上去（X.org 8x13 字形），一帧容量按形状约 13.9k～23.8k 字符（session-maintenance.ts:3463-3464 注释列出的各形状 capacity）。内容印不下就印多张。帧存进 compaction entry 的 `preserveData.snapcompact`，之后每次重建上下文都作为 image blocks 重新挂到摘要消息后面（README How it works 第 4 步；agent CHANGELOG :767）。

## 「被丢弃的历史」丢了什么

压缩触发时会话被切成两段：最近的消息原样留在请求里，更早的消息**从发给模型的请求的消息列表中以文本形式移除**——这就是「丢弃」的准确含义。它们没有被删除：session 文件里完整保留；信息以图片形态继续留在上下文里。所以「变成图片就不算丢弃」这个推断成立：丢弃的是文本形态，信息本身换了一种编码留下。

## 为什么同样的信息占更少的 token

核心：**token 是计费单元的单位，不是信息量的单位。**图片按面积折算 visual token，与图里印了多少字无关：

- Gemini：每张图固定 1120 token，不管尺寸（snapcompact.ts 注释原文："Gemini 3.x bills a fixed 1,120-token budget per image regardless of pixels"）。
- Anthropic：按 28px patch 计费，1932×1932 帧 = (1932/28)² = 4761 个 visual token（选型刻意卡在 4784 上限内）。
- OpenAI：面积比例计费，eval 测出 1568px 最优；需 `detail: "original"` 保原生分辨率。
- kimi：1568px 的 chars/$ 最优（处理器超 1792px 会降采样）。

像素字体把一个字符压到 8x13 像素，一个 patch 的面积能塞下多个字符，所以同一批字符换载体后占的计费单元变少。模型不会把图转回文本——vision encoder 的 patch embedding 就是输入本身。eval 实测该密度下读取准确率与纯文本持平（F1 parity；opus-4.8 tool-result bench `11on16-bw` F1 .806、gemini-3.5-flash `8on22-bw` F1 .934、kimi-k3 `8on22-bw` F1 .915）。上游记录的收益：Anthropic 约 2 倍、Google 约 2.9 倍成本下降（agent CHANGELOG :767-768，旧形状数字）。

算账示例（推导，非上游验证数字）：100k 文本 token ≈ 40 万字符（cl100k 约 4 字符/token，session-maintenance.ts:3465 注释）→ Gemini 形状一帧约 23.8k 字符 → 约 17 帧 → 17 × 1120 ≈ 1.9 万 visual token。100k 变约 19k，窗口由此空出。OMP 内部记账保守按每帧 5024 token 估（FRAME_TOKEN_ESTIMATE），渲染前按当前窗口算帧数上限，装不下就少印；连保留消息都超预算时拒绝执行并落到下一方法。

目的排序：① 同样信息更低 token（省钱也省窗口，帧每轮请求重挂，节省逐轮生效）；② 压缩本身零 LLM 调用（无摘要延迟与费用，确定性）；③ 逐字保留而非有损摘要（模型读到历史原话）。

## 形状是 provider 感知的

`resolveShape` 按**模型 id** 选形状、按**实际承载请求的 API** 算计费（Claude 走 Vertex/OpenRouter 仍用 Claude 形状）。当前态：Anthropic `11on16-bw`（opus 4.7+/fable/mythos 1932px）、Google `8on22-bw`@2048、OpenAI/gpt `8on22-bw`@1568（`detail:"original"`）、kimi `8on22-bw`、glm `8on16-bw`、未知模型落到 API 家族胜者。CJK 全宽两格渲染。CHANGELOG 里的 `8x8r-bw`/`8x8r-sent`/`6x6u-sent` 是历史形态。形状由 SQuAD 召回 eval（渲染段落→提问图里内容→按标准答案算 token 重合 F1）与 tool-result 可读性 bench 实测选出；`snapcompact.shape` 配置默认 auto 可强制。中段归档换更密的 `8on16` 变体（同帧价多约 40% 字符），头尾 `HQ_EDGE_FRAMES = 3` 帧保持清晰形状，即 foveated 归档。

## 为什么不永远用图片（边界）

1. **读取有损**：冠军形状 F1 也只有 .806；冷归档允许模糊，热上下文（要改的代码、精确标识符）必须无损文本。
2. **模型不能写图**：新消息、tool call/result 都以文本流式产生，图片只能在内容冻结后整体渲染；帧是整体的，无法像文本那样逐条 shake/剪枝。
3. **prompt caching**：热上下文每轮重发，文本前缀可吃 cache；官方设置说明明确警告成像文本丢 prompt caching（settings-schema.ts `snapcompact.systemPrompt` description）。
4. **推理质量未验证对等**：F1 parity 只测召回，没有 eval 证明对图里文字的推理深度与文本对等。
5. **工程限制**：单请求图片数预算、帧字节预算（超了 413）、网关静默丢帧兜底。
6. **拒答风险**：Claude 以 reasoning_extraction 拒绝复现自身推理的文本，归档需剥 `¶think:` 段（issue #6093）；「最抗拒绝」是形状选型维度之一。

## 帧预算与可调性

单请求图片总数预算（归档帧 + system prompt 成像 + tool result 成像共用）：anthropic/amazon-bedrock 90、openai/openai-codex/google 系 200、openrouter 90、umans 10、未知 provider 兜底 5（取 5 因为已测最严主流是 Groq 约 5，防未知网关静默丢帧）。归档帧上限 = min(预算, 80)。**没有环境变量、没有配置键**可改（snapcompact 全部可调项只有 `snapcompact.systemPrompt`/`toolResults`/`shape`）；想改只能上游提 issue/PR，或本地 patch node_modules（升级即被覆盖）。

## methodOrder 语义

有序偏好链 + 运行时兜底：每次压缩触发（自动到阈值或手动 /compact）按顺序做事前能力判定，第一个当前可跑的方法执行。remote 需路由支持 server-native 压缩；snapcompact 需「/compact 显式指定」或「无 focus 指令 + 当前模型 input 含 image」；文本模型、渲染扫描不过、保留消息超预算均拒绝并落到下一方法；soft 无条件兜底。上游默认顺序 remote → snapcompact → handoff → shake → soft。

## inline imaging（同名不同物）

`snapcompact.systemPrompt`（none/agents-md/all）与 `snapcompact.toolResults`（bool）是实验性 inline imaging：把 system prompt 或大 tool result 临时渲染成图发给模型，逐请求、不持久化，省 token 但丢被成像文本的 prompt caching。与 archive 模式独立。

## 生态：活跃度与采用度

- 包 2026-06-10 创建（commit 08a941a14e 与 CHANGELOG [15.11.0] 双证），26 个版本到 18.2.9（2026-09-22）；实质 commit 6 月 78 → 7 月 24 → 8 月 22 → 9 月（至 23 日）15；最近修复 09-21（#12683）。活跃维护中，处于上线后打磨期。
- 采用度：issue 流 2026-07-16 至 09-26 连续，报告者各异，覆盖 openai-codex/Anthropic/vLLM/Copilot/自定义 provider；外部 PR #9061（@Thytu）、#10227（@lemonleks）；默认 methodOrder 第二位带来结构性采用。装机率无公开量化数据。
- 方法论教训：该本地 clone 的 `git log -- path | tail` 与 `--reverse | head` 输出顺序不按时间排（排序假象已取证），最早时间以 `--diff-filter=A` 为准。

## 我们的环境

- 我们的 `compaction.methodOrder` 是 `[shake, soft]`（config.yml:295-297），snapcompact 不会被自动选中；手动 `/compact` 显式指定可走 `explicitSnapcompact` 路径。
- gpt-6 系模型 `input` 含 `image`（models.yml:88-90 等），vision 硬性前提满足；它们挂在 `c8787` 块下 → 帧预算 5。`openai-codex` 块虽在预算表内（200 → 80 帧），但其下模型 text-only，snapcompact 不会跑。
- 帧清晰度：c8787 块**显式写了** `compat.supportsImageDetailOriginal: false`（models.yml:18-19），OMP 在自己一侧就把 `detail: "original"` 降级为 `"auto"`（compaction.ts:1484-1486 要求 `=== true` 才保留）；我们 relay 的 `normalizeInputImageDetails`（copilot-api utils.ts:203-224）是第二道改写，其类型系统只认 low/high/auto。而 OMP 源码明确记载 dense 字形活不过默认 auto 降采样（ai/types.ts:807-809），上游 Copilot 又拒绝 `"original"`（#2822）。结论：在 c8787 上 snapcompact 面临 5 帧上限 + 每帧可读性降质的双重折扣。
- 相关 open issue 值得启用前跟踪：#13393（自定义 provider 5 帧归档丢消息）、#8792（帧溢出静默丢指令）、#12854（Opus 5 拒答）。

## 已知坑（已修）

- resume 时超持久化上限的帧被截成非法 base64 → 后续请求 400（#9901，已修，从保留源文本恢复）。
- 从 snapcompact 切到 context-full 后旧帧泄漏，表观用量顶到约 60%（agent CHANGELOG 16.1.18+ 已修）。
- 下一次 LLM 摘要式压缩会把旧归档源文本折进摘要并剥离旧帧，帧不无限堆积（compaction.ts:756-767、:2026-2032）。

## See Also

- [OMP Compaction Model 与 Thinking Level](compaction-model.md) — 谁压、thinking 从哪来
- [OMP Compaction 阈值解析机制](compaction-threshold.md) — 何时触发
- [OMP Shake 机制](../omp-slash-commands/shake-mechanics.md) — 同链上的无 LLM 方法
- [OMP 配置语义手册](config-semantics.md) — compaction 各开关的触发条件
