# OmO 停止条件与意图检测机制：三层语义互补

> Sources: code-yeongyu/oh-my-openagent（dev 分支源码直读，2026-10-09）；DeepWiki 线索（worker 转述）
> Raw: [stop-condition-and-intent-mechanisms](../../raw/oh-my-openagent-omo/2026-10-09-stop-condition-and-intent-mechanisms.md); [ulw-skills-and-skills-cli-install](../../raw/oh-my-openagent-omo/2026-10-09-ulw-skills-and-skills-cli-install.md)
> Updated: 2026-10-09

OmO（oh-my-openagent）对 agent"何时停止"的管理分三层：代码层用显式标签与状态机做完成判定，提示词纪律层让模型自己声明意图与停止条件，门控层在子代理收工时强校验证据。三层语义互补：声明、存在性、真实性。

## 代码层：完成判定不解析自然语言

完成判定只认两样东西：

- **`<promise>` 标签**：正则 `/<promise>\s*DONE\s*<\/promise>/is` 只匹配 assistant 文本部件；tool_result 里的 `<promise>` 只有 VERIFIED 且经 oracle 确认才生效。
- **会话状态机**：子代理 poll 循环按 finish 原因、pending 部件、轮数（300 轮熔断）判定，最后 assistant 消息"看起来完成"但还在 tool-calls 里时不算完成。

负例测试把边界钉成行为契约：assistant 说 "The task is complete. All work has been finished." 这类自然语言完成声明，检测结果为 false。

## 提示词纪律层：Hephaestus intent line

执行者（Hephaestus）每轮开场声明："I detect [intent type] - [reason]. [What I'm doing now]. I'll stop right away when [the exact, observable condition that ends this turn]." 停止条件被定义为有约束力的承诺——条件一满足立刻停，停手后多做的任何事都是 defect。

三版演进：gpt-5.5 只承诺本轮做完；gpt-5.6 把停止条件升级为"声明即承诺"并新增 Stop Goal（"Every action past the stop goal is a defect, not diligence"）；gpt-6 改名 Intent Gate 并简化，新增 mid-task 规则（中途消息只是转向，不重新声明）。

这套意图行**没有任何代码消费**——全仓 grep "I detect" 只命中提示词模板。编排者（Sisyphus）用同一句式但性质不同：它的口头声明明确"不构成实现承诺"，只是路由透明。

## 门控层：弱 lint + 强证据门 + 终审

- **STOP WHEN 存在性 lint**：多节点工作流的节点协议要求 TASK/DELIVERABLE/SCOPE/VERIFY/STOP WHEN 五字段；lint 只检查节点有没有写 `STOP WHEN`，缺了出警告不拦截（"Warnings never reject"）。这是检索到的代码中唯一用正则解析 "STOP WHEN" 的地方，且只查存在性。
- **EVIDENCE_RECORDED 收据门**：Codex 子代理收工时从最后一条消息提取证据文件路径，校验四重（路径必须在 `.omo/evidence/` 内、必须是常规文件、非占位符、时间不早于 transcript 创建）。不过关就 block 打回，每会话最多 3 次，超限放行；上下文压缩过直接放行防死循环。
- **终审 gate-reviewer**：只读角色，输入是 brief/goal/success criteria/evidence/review/QA matrix，判据"找不到具体失败证据就批准"，默认怀疑一切成功声明。

## 防什么

- 防过度执行（做完还补验证、打磨、顺手清理）
- 防子代理漂过目标（缺停止条件的 spawn 会越过目标或空口报完成）
- 防不可验证的完成声明（EVIDENCE 对 STOP WHEN，不看自我报告）
- 防半成品交差（停止条件要求行为真实可观察地生效）

## 证据边界

- 全部代码与规则原文已在本会话直读核实；DeepWiki 只提供方向性线索（与直读一致）。
- grep.app 检索结果受"每查询返回前 10 项"限制，不构成穷尽证明。

## See Also

- [OmO 技能生态与 skills CLI 安装](omo-ulw-skills-ecosystem.md) — 同一机制的技能化发布形态
- [OMO 5.0：独立版与插件版](../ai-coding-agents/omo-native-vs-plugin.md) — OmO 产品形态背景
