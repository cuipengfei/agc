---
name: managed-skill-merge-first
description: "Before creating a new managed skill via learn, manage_skill, or a SKILL.md write under managed-skills, list existing skills and prefer merging into one"
condition: ["action[^a-zA-Z]{1,6}create[^a-zA-Z]", "skill[^a-zA-Z]{1,5}\\{", "description:"]
scope: ["tool:learn", "tool:manage_skill", "tool:write(**/managed-skills/*/SKILL.md)", "tool:edit(**/managed-skills/*/SKILL.md)"]
---

这不是禁令，是工作方式提醒。创建新 managed skill 之前，按顺序做：

1. 先 `ls ~/.omp/agent/managed-skills/` 列出现存 skill，逐个看它们的 description 覆盖域。
2. 新经验落在任何一个现有 skill 的主题域内 → 不要 create。改为往该 skill 的 `references/<主题>.md` 追加内容，并在其 SKILL.md 索引里补一行指针（manage_skill 只能写正文，references/ 用文件写工具直接改）。
3. 所有现存 skill 都盖不住这个主题、经验可复用且有知识增量 → 才允许 create。
4. 一次性事件记录（已修完的某个具体 bug、已完成的某次迁移，不会复现）不铸 skill，只用 learn 的 memory 通道存长期记忆。

目标是把路由面维持在少量高辨识度的 skill 上；新增一个 skill 是最后手段，不是默认动作。