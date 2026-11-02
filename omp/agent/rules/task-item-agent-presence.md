---
description: "尽力阻止 task 的 tasks[] item 漏写 agent 或回落到通用 task"
condition: '\{(?=[^{}]*"task"\s*:)(?:(?![^{}]*"agent"\s*:)|(?=[^{}]*"agent"\s*:\s*"task"[,\s\}]))[^{}]*\}'
scope: "tool:task"
---

## task 工具：为每个 item 选对 agent

当前 `task` 调用的原始参数中，至少一个 `tasks[]` item 没有显式填写 `agent`，或被写成 `agent:"task"`。这会让 OMP 用默认的通用 task agent 跑这件工作，而通用 agent 往往既不是最便宜也不是最合适的那个。

请停止这次调用，读取 `task` 工具的参数说明（或重新查看可用 agent 列表），为每个 item 选择最具体的那个。没有合适的专用 agent 时才用 `task`。

`agent` 必须放在每个 item 内，不能放在 batch 顶层：

```
task(tasks=[
  {agent="scout", task="调查 A"},
  {agent="task", task="实现 B"}
])
```

这是 schema 默认值注入前的尽力而为检查。复杂嵌套 JSON 或包含花括号的字符串可能漏过；空字符串和空白字符串由 `task-agent-required` extension 做结构化阻断；已选具体 agent 的 item 不会触发本规则。
这是 schema 默认值注入前的尽力而为检查。复杂嵌套 JSON 或包含花括号的字符串可能漏过；空字符串和空白字符串由 `task-agent-required` extension 做结构化阻断。
