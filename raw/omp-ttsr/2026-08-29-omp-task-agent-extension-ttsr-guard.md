# OMP task agent 显式声明防护研究

> Source: 本会话可复现行为、oh-my-pi 当前源码、OMP 官方 TTSR 文档、TTSR Injection Lifecycle 文档
> Collected: 2026-08-29
> Published: Unknown

## 背景

用户要求防止 `task` 工具本应使用专用 agent 时静默回落到 generic `task` worker。目标策略不是选择某个固定 agent，而是要求 `tasks[]` 中的每个 item 都显式填写非空 `agent`。

## 原始问题形态

错误的调用把 `agent` 放在 batch 顶层：

```text
task(
  agent="scout",
  tasks=[
    { task="调查 A" },
    { task="调查 B" }
  ]
)
```

batch 顶层只接受 `context` 与 `tasks`。正确写法是在每个 item 内填写：

```text
task(
  tasks=[
    { agent="scout", task="调查 A" },
    { agent="scout", task="调查 B" }
  ]
)
```

省略 item 级 `agent` 时，当前实现会使用默认 agent `task`。

## task 工具的参数契约

当前 `task` 工具要求：

- 顶层 `context` 为必填字符串。
- 顶层 `tasks` 为必填数组。
- 每个 item 的 `task` 为必填字符串。
- 每个 item 的 `agent` 是可选字符串；省略时使用 spawn-policy 默认值，当前默认是 `task`。
- `agent` 必须放在每个 `tasks[]` item 内，不能放在 batch 顶层。

## TTSR 验证阶段发现

最初的规则用 text scope 匹配散文式 `task(...)` 文本，不能覆盖真实工具参数流。

后续使用 `scope: "tool:task"`。隔离测试可以命中简单 JSON payload，但真实调用层可能把省略字段规范化成 `agent: "task"`，导致“手工省略字段的 payload 会触发”不等于“live 调用一定触发”。

TTSR regex 无法严格解析任意 JSON 结构。实测边界：

- item 漏写 `agent` 且含嵌套 `outputSchema`：漏拦。
- item 的 `task` 字符串包含 `{}`：漏拦。
- `tasks[]` 之外的空 `agent`：误拦。

结论：TTSR 可以做缺失字段的尽力而为拦截，但不能作为严格的结构化 schema 校验。

## TTSR 规则名和注入状态

官方文档明确：规则文件名 stem 就是规则名。frontmatter 中的 `name:` 不会改名，也不会影响注入状态身份。

已触发过的规则名会恢复 injected 状态。`repeatMode: after-gap` 下，`canTrigger` 在 scope 和 regex 匹配之前执行，因此旧规则名可能直接阻止继续触发。

正确的测试顺序是正向放行先于负向阻断，或使用全新 session 分别测试；同一 session 先跑负向会把规则标记为 injected，随后正向放行可能被 repeat gate 掩盖。

## Extension 验证阶段发现

结构化 `tool_call` extension 可以在工具执行前读取 `event.input.tasks` 并逐项检查。

OMP 当前执行顺序是：

```text
模型生成参数
→ task schema validation/defaulting
→ extension tool_call event
→ task 工具执行与 subagent 调度
```

`task` item schema 会把省略的 `agent` 默认补成 `"task"`。因此 extension 无法区分：

```json
{"agent":"task","task":"A"}
```

是模型显式写的，还是 schema 自动补的。

extension 可以可靠阻断空字符串或全空白 `agent`；不能严格证明原始调用中每个 item 都显式提供了 `agent`。

## 最终分层方案

保留两个机制，但职责分开：

1. TTSR `task-item-agent-presence.md`
   - 在 schema 默认值注入之前检查序列化原始参数。
   - 尽力拦截普通 item 完全漏写 `agent`，以及 `agent` 错放在 batch 顶层。
   - 明确承认复杂嵌套 JSON 和字符串花括号可能漏过。

2. Extension `task-agent-required.ts`
   - 在结构化参数上阻断 `agent: ""` 或全空白。
   - 对 `agent: "task"` 放行当前调用，并通过 `sendMessage(..., { deliverAs: "nextTurn", triggerTurn: false })` 在下一自然 turn 注入中文提醒。
   - 当前调用不被 block；不会额外强行启动一轮。

## Live 验证结果

- 新 TTSR 在重启后注册，规则名为 `task-item-agent-presence`，scope 为 `tool:task`。
- 显式 `agent:"task"` 的调用正常启动 generic worker，未被 block。
- `agent:""` 的调用被 extension 阻断，错误文本为：
  `task-agent-policy：tasks[] 中索引为 0 的 item 使用了空 agent`
- 空 agent 阻断后没有生成 worker job。
- 下一自然 turn 中实际出现提醒文本：
  `tasks[] 中索引为 0 的 item 解析为 agent:"task"。如果你原本想调用专用 agent，请下次在每个 item 中显式填写 tasks[].agent。再次调用 task 前，先读取 xd://task。`
- session JSONL 中出现：
  `type: custom_message`、`customType: task-agent-reminder`、`display: true`、`attribution: agent`。

## Gist

两个最终工件已发布为公开 Gist：

https://gist.github.com/cuipengfei/fa06a4a46561b0b51b4e9e8efad444d2

Gist 描述：

`OMP task agent 防护：TTSR 拦漏填，extension 拦空值并提醒`

远端核验：`public: true`；文件为 `task-agent-required.ts` 和 `task-item-agent-presence.md`；中文提醒和中文 TTSR 说明存在；被替换的英文消息不存在。

## 证据边界

- TTSR 缺失字段检查是 regex 近似，不是严格 JSON parser。
- Extension 只能看见 schema defaulting 后的参数，不能证明字段最初是否被模型显式提供。
- 真正严格要求每个 item 显式提供 `agent` 需要修改 OMP task schema，或让 extension hook 同时暴露验证前原始参数。
- 本记录没有提交 Git，也没有改变 manifest 同步边界。
