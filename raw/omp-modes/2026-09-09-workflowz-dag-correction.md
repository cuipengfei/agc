# OMP Workflowz DAG 修正

> Source: can1357/oh-my-pi upstream
> Collected: 2026-09-09

## 修正点

原表述 "严格多阶段 DAG" 暗示所有节点串行，但实际 eval 的 `agent/parallel/pipeline/completion` 构建的 DAG 中：

- 依赖节点按边等待
- 独立节点仍可并行

这与 `orchestrate` 的直接 task 并行派工不同：
- `orchestrate`：多个独立任务同时跑
- `workflowz`：有依赖关系的多阶段 DAG，但独立分支并行
