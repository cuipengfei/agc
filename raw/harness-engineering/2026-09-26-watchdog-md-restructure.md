# WATCHDOG.md 重构与 jevify 盘点

> Source: `~/.omp/agent/WATCHDOG.md` 编辑前后全文；jevify 54 块盘点结果（`/tmp/jevify-watchdog.json`）；advisor advisory 三条原文
> Collected: 2026-09-26
> Published: 2026-09-26

## 五处改动

1. 「工具结果可能被折叠」小节按 18.3.2 实际渲染改写：成功结果带 `Tool result:` 有界正文（8 KiB / 80 行，中间截断，diff 放宽到 300 行）；失败结果 `error` 首行预览（120 字符上限）加同样有界正文；参数摘要 120 字符截断；保留 shaken/elided 标记说明。
2. 高危直通规则合并为唯一「高危情况」节。原文散在第 24-26 行（高危情况本体）和第 160 行（in-progress 时高危立即提醒）。后者删除从句，改为引用「高危情况」节。
3. 第 148-176 行发送时机散规合并为唯一「发送条件」有序散文列表：高危立即、用户直接呼叫、非高危 blocker 确认后发、in-progress 暂存、重复抑制、证据不足 concern、其他 concern、nit。
4. 提醒写法拆分：「其他规则」四条拆成前两条（同一问题只提醒一次、不拆多条）进发送条件，后两条（diff 直看、nit 才提）留在提醒写法。
5. 「项目特定」节两行 HTML 注释占位换为可见扩展说明。

diff +20/-20。

## jevify 54 块盘点

rubric 冻结：四项改动作为 framing，每个内容块判定去处（keep / rewrite_facts / consolidate_send / consolidate_highrisk / prune / mixed / other）。

升级规则：top_p < 0.75、mixed、error、send_timing=true 但 dest 非 consolidate_send/highrisk/keep。

初判结果：keep 32、consolidate_send 10、rewrite_facts 3、other 6、prune 2、consolidate_highrisk 1。32 块触发升级规则。

人工复核推翻 8 处、拆分 2 处、逮漏网 1 处。

推翻：L25-26 是高危情况本体（保留并扩写，judge 误归为合并对象）；L96-97、L110-111、L137-138、L141-142、L145-146、L129-130 是判级定义与示例的标题行（保留）；L47-48、L52-53、L71-72 是 lead-in 引导句（保留）。

拆分：L147-151「其他规则」四条，前两条进发送条件，后两条留提醒写法。L158-163 系统标记列表整体保留，但 in-progress 条目内嵌的高危重复句剥出并入高危情况节。

漏网分支：L21-22「用户直接叫你时立即第一人称回答，不受静默、重复和最终回复限制」。原提案发送条件列表里没有它的位置。jevify 逮住了 advisor 两轮 advisory 没逮的第三条漏网。

## advisor advisory 折入

1. 非高危 blocker 无发送路径（adv 连抓两次）：补「非高危 blocker：确认一次后发送」。
2. 未验证观察每轮最多一条：在 nit 行保留「同一轮最多一条」。
3. 改动 1 截断措辞修正：正文被截会带截断标记，无正文说明工具输出为空，不是被截。
4. 合并前走查从批准后提前到定稿前：十条路径走查在定稿前完成。
5. quarantine 渲染路径引用纠正：Session update 走 runtime.ts:832 的 ADVISOR_RENDER_OPTIONS（expandToolIO: true），不是 session-advisors.ts:1276 那个 quarantine 源文本渲染。

## 十条路径走查

高危、普通 blocker、证据不足 concern、重复 concern、普通 nit、未验证观察、用户直接呼叫、in-progress 挂起、最终回复兜底、其余静默。全部有去处，无不可达、无互吞。

## watchdog-soft-decision-table skill 删除

用户决定不再用表格/决策树形式（LLM 不是编译器）。skill 从 managed-skills 删除。有用内容三条吸收进 watchdog-structured-control-flow skill：终端静默门在前、高危例外在 in-progress 等待之前、宽规则不得吞升级路径。形式约定改为有序散文短句。
