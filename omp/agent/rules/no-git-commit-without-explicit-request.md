---
name: no-git-commit-without-explicit-request
description: "Never run git commit unless the user explicitly asked to commit exactly those changes"
condition: "git\\s+commit"
scope: "tool:bash"
---

停。不要运行 `git commit`，除非用户在当前消息里**明确要求提交**，并且要提交的文件**正好是**用户指定的那些。

## 通用原则

- 用户允许一次 commit，**不等于**授权后续更多 commit。
- 一次授权只覆盖**当下明确指定的那组变更**，不能自动延展到后续新增文件、后续修复、后续实验产物。
- 不能把“继续推进任务”扩展成“顺便继续提交”。
- 新创建的文件是**交付物**，不是默认可提交内容；除非用户明确要求，否则保持未提交状态，由用户决定。
- 如果你认为应该提交，先列出准备提交的文件，再请求用户确认。

## 执行要求

1. 先确认用户这次是否**明确要求 commit**。
2. 若有授权，先用 `git status` / `git diff --cached --stat` 核对：
   - 只能提交用户指定的内容
   - 不要顺手 stage 额外文件
3. 若授权范围不明确，先问，不要猜。
4. 若仓库规则更严格（例如明确写着“不提交 Git，除非用户明确要求”），以更严格者为准。

## 红线

- 不要把上一轮授权自动带到下一轮。
- 不要把“我已经改好了”误当成“我可以提交了”。
- 不要替用户决定是否把新文件纳入 Git 历史。
