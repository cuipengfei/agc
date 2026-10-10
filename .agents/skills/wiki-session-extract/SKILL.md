---
name: wiki-session-extract
description: 当用户要求把本次会话沉淀到 wiki、做会话提炼、或说「wiki 提炼」「沉淀本次会话」「总结并提案入库」时使用。输出会话总结与 wiki 入库提案，等用户批准后才写入任何文件。
---

# Wiki 会话提炼

将当前会话提炼为 Karpathy LLM Wiki 的入库提案。本 skill 只到提案为止；写入 raw/、wiki/ 必须等用户明确批准。

## 步骤

1. **识别用户问题并总结做了什么**：列出用户在本次会话中提出的与主题相关的问题、疑虑和关切，再按时间顺序列出本会话的动作与改动。问题是轴心，动作围绕问题组织——写每个动作时关联它回答了哪个问题。只写有证据的，不凭记忆补全。
2. **围绕问题提炼学到什么**：从动作里抽象出可复用事实、决策、证据边界、方法论教训，但以用户问题为骨架组织：每个问题引发了什么探索、得出了什么结论。区分「源材料可查证的事实」与「从机制推断的结论」。
3. **加载 skill://karpathy-llm-wiki**，按其 Ingest 流程判定：复用哪个 raw/ 子目录、Dispositions 是 New / Update / Disputed / No material。
4. **输出提案**，逐项列出：
   - 每个 raw 文件的路径与内容要点
   - 每篇 wiki 文章的新建或更新及改动范围
   - index.md / log.md 的对应改动
   - 已存在的重叠 skill 或文章（如有）及去重理由
   结尾明确等待批准，不写入任何文件。

## 边界

- 本 skill 不产生文件改动；用户批准后，写入阶段遵循 karpathy-llm-wiki 的 Grounding Invariant 与 raw 冻结规则。
- 若用户随后要求存档查询结果，转用 karpathy-llm-wiki 的 Archive 流程。
