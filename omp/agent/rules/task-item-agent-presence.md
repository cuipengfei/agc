---
description: "尽力阻止 task 的 tasks[] item 在原始参数中完全漏写 agent"
condition: '(?:"tasks"\s*:\s*\[\s*|\}\s*,\s*)\{(?=[^{}]*"task"\s*:)(?![^{}]*"agent"\s*:)[^{}]*\}'
scope: "tool:task"
---

## task 工具：每个 item 都应显式填写 agent

当前 `task` 调用的原始参数中，至少一个普通 `tasks[]` item 没有显式填写 `agent`。请停止这次调用，读取 `xd://task`，并在每个 item 内填写合适的非空 `agent`。

`agent` 必须放在每个 item 内，不能放在 batch 顶层：

```
task(tasks=[
  {agent="scout", task="调查 A"},
  {agent="task", task="实现 B"}
])
```

这是 schema 默认值注入前的尽力而为检查。复杂嵌套 JSON 或包含花括号的字符串可能漏过；空字符串和空白字符串由 `task-agent-required` extension 做结构化阻断。
