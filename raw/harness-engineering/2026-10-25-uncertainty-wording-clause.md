# 不确定性写法条款：缺少什么与下一步确认

> Source: 本机 `~/.claude/CLAUDE.md`「事实与判断陈述协议」修改段落；`cuipengfei/prompts` 仓库 `skills/natural-writing/SKILL.md` 与 `skills/exploring-generative-ai/patterns.md` 当前正文
> Collected: 2026-10-25
> Published: Unknown

## 触发原因

`~/.claude/CLAUDE.md` 的事实陈述协议禁止「不能证明 X」「无法证明 Y」「不能据此断定 Z」「也不代表在所有场景、所有客户端、未来调用中都成立」这类负面免责句式，并要求信息不完整时按两步正面表达。

`cuipengfei/prompts` 仓库的 `natural-writing` 在 2026-10-25 的改动里新增「改写边界」，要求保留原文的事实主张、归因、适用条件与不确定性；`exploring-generative-ai` 的 `patterns.md` 把泛化免责替换成具体检查动作。两份文件的共同目标与用户级规则的禁令一致，但字面容易被读成冲突：一边要求保留不确定性，一边禁止免责句式。

## 修改后的条款

新增到 `~/.claude/CLAUDE.md` 的「信息不完整时的写法」列表，位于两步正面表达之后、「普通结果直说结果」之前：

```markdown
  - **不确定性的写法**：写清还缺哪项证据、它影响哪个具体判断，以及下一步用哪个文件、命令或场景确认。事实陈述结束后，不追加「不能证明」「不代表所有情况」这类泛化免责。
```

## 条款分工

- 不确定性的正面写法：缺哪项证据、影响哪个判断、下一步确认动作。
- 泛化免责句式：无论出现在正文、句尾或独立段落，都不使用。
- 与 `natural-writing` 的关系：改写时保留原文的不确定性，并把它写成上述三项；原文没有依据的补充事实仍然不允许。

## 证据边界

本条款只界定写法，不改变任何证据要求。免责句式禁令的来源与外部研究见同目录 `2026-10-25-cannot-prove-ban-and-best-guess-rules.md`。
