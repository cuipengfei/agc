# OMP Extension 与 TTSR：执行护栏的分层方法

> Sources: OMP Extension authoring 文档与当前源码；OMP 官方 TTSR 文档；TTSR Injection Lifecycle 参考
> Raw: [Extension 生命周期与设计模式](../../raw/omp-extensions/2026-08-29-omp-extension-lifecycle-patterns.md); [TTSR 生命周期与设计模式](../../raw/omp-ttsr/2026-08-29-ttsr-lifecycle-and-design-patterns.md); [task agent 防护案例](../../raw/omp-ttsr/2026-08-29-omp-task-agent-extension-ttsr-guard.md); [OMP Extension 与 Hook 关系修正](../../raw/omp-extensibility/2026-09-09-extension-hook-relationship.md)
> Updated: 2026-09-09

## 核心判断

先看输入是什么，再决定机制：

| 需要检查的东西 | 合适的位置 |
|---|---|
| 工具的通用字段类型、必填关系和默认值 | tool schema |
| 已解析对象中的字段、数组和对象关系 | `tool_call` extension |
| 模型输出流里的固定文本模式 | TTSR |
| 工具如何执行、如何路由和如何处理业务语义 | tool implementation |
| 给模型的长期工作方式 | AGENTS.md / CLAUDE.md |

TTSR 和 extension 都能做护栏，但不是同一种护栏：TTSR 看文本流，extension 看结构化参数。

## Extension 的职责和生命周期

新 authoring 应优先使用 ExtensionAPI；Extension 覆盖 HookAPI 的全部用例，但两套 API 不是完全 drop-in。不要把 "Extension 是 Hook 的严格超集" 当成精确描述——能力覆盖成立，接口不兼容。
OMP 会从项目目录、用户目录、配置路径、CLI `--extension`/`-e` 和插件 manifest 发现 extension。文件名 stem 是 extension 的派生名称。Extension 应在加载阶段注册 handler，不要在模块加载时调用 runtime action。

### `tool_call` 适合什么

`tool_call` handler 适合执行前的本地政策：

```ts
pi.on("tool_call", async (event) => {
  if (event.toolName !== "target") return;
  if (violatesPolicy(event.input)) {
    return { block: true, reason: "Blocked by local policy" };
  }
});
```

它可以放行、阻断，或按接口支持的形式改写 input。handler 抛错时是 fail-closed，工具调用会被阻断。

### 消息注入

`pi.sendMessage` 的 delivery mode 有不同语义：

- `steer`：中断当前 run。
- `followUp`：当前 run 完成后排队。
- `nextTurn`：保存到下一次 user prompt。
- `triggerTurn`：在适用状态下额外启动 turn 或 continuation。

提醒类消息应避免无意中重启模型。使用 `nextTurn` 时，必须在下一自然 turn 验证消息真的进入 session；仅看到 `sendMessage` 被调用不够。

### Schema defaulting 的陷阱

Extension 的关键限制是输入时机。当前 OMP 先做 schema validation/defaulting，再触发 extension `tool_call`。如果 schema 把缺失字段补成默认值，extension 无法判断字段原来是否存在。

因此：

```text
需要知道“字段是否显式出现” → schema required/raw-input hook
只能知道“当前解析值是什么” → extension
```

如果 handler 需要后台定时工作，使用 `ctx.setInterval`/`ctx.setTimeout`，不要让未捕获的 raw timer 异常击穿 session。

## TTSR 的职责和生命周期

TTSR 按 condition 匹配模型输出流。可用 scope 包括文本、thinking、tool/toolcall、`tool:<name>` 和带 glob 的工具 scope。它适合：

- 固定词法模式。
- 模型正在生成的危险命令片段。
- 简单的 serialized tool payload。
- 需要在流式阶段尽快提醒或中断的模式。

它不适合用 regex 严格解析任意 JSON。嵌套对象、字符串中的花括号、字段顺序和同名字段都会制造漏报或误报。

### 规则身份和 repeat gate

规则名来自规则文件名 stem，不是 frontmatter 中的 `name`。命中状态会进入 injected state。`repeatMode: after-gap` 会在达到规定的 completed-turn 间隔前阻止同一规则再次触发，而且这个 gate 先于 scope/condition 判断。

所以 live 测试要正向先、负向后，或用两个全新 session。负向先命中后，后面的“正向没触发”可能只是 repeat gate 的结果。

## 两者如何组合

推荐的 defense-in-depth 组合如下：

```text
原始流式文本
  → TTSR：尽力拦截简单 lexical/serialized pattern
  → schema：通用结构契约
  → tool_call extension：检查结构化本地政策
  → tool implementation：执行与路由
```

两层不要重复承担同一职责：

- TTSR 负责早期文本级 best-effort guard。
- Extension 负责结构化值的 block、rewrite 或 reminder。
- Schema 负责工具通用契约。
- Implementation 负责真正执行。

## Worked example：`tasks[].agent`

原始问题是把 `agent` 放在 batch 顶层，或者漏写 item 级字段：

```text
task(
  agent="scout",
  tasks=[{task="调查 A"}, {task="调查 B"}]
)
```

正确写法是每个 item 都显式填写：

```text
task(tasks=[
  {agent="scout", task="调查 A"},
  {agent="task", task="实现 B"}
])
```

当前 task schema 会把省略的 `agent` 默认成 `task`。因此本地组合策略是：

1. TTSR 尽力拦截原始 JSON 中简单的漏写形态。
2. Extension 阻断空字符串或全空白 agent。
3. Extension 对已经解析为 generic `task` 的调用放行，并在下一 turn 提醒模型下次显式填写 agent。

这能减少错误，但不是严格字段存在性证明。严格保证需要把 `agent` 改成 schema required，或让 hook 同时暴露 raw pre-validation input。

## 测试方法

不要只测试“规则是否命中”。应按证据强度分层：

1. Handler test：验证 extension 的 block、rewrite 和发送消息参数。
2. TTSR isolated test：验证简单 payload 的 expected trigger/non-trigger。
3. Fresh-process test：确认 extension/TTSR 被发现并加载。
4. Live positive：确认合法调用实际执行。
5. Live negative：确认阻断后没有下游 worker。
6. Deferred delivery：确认 `nextTurn` 消息在下一自然 turn 的 session JSONL 中出现。
7. 日志检查：区分“condition 没命中”和“repeat gate 跳过”。

每个测试要说明它证明了什么，也要说明它没有证明什么。

## 常见错误

- 用 TTSR regex 代替 JSON parser。
- 在 post-defaulting extension 中声称能检测原始字段是否存在。
- 把 `agent` 放在 batch 顶层，以为它会路由所有 item。
- 只验证 `sendMessage` 调用，不验证下一 turn 的实际投递。
- 在同一 session 先跑负向再跑正向，忽略 injected state。
- 在 extension module load 阶段调用 runtime action。
- 把 worker 返回 `NOOP` 当成工具调用未被阻断的反证或证明。

## 决策清单

```text
1. 这是通用 schema 约束吗？放 schema。
2. 需要解析后的对象关系吗？放 tool_call extension。
3. 只需识别输出流里的固定文本吗？用 TTSR。
4. 需要知道原始字段是否存在吗？先查 defaulting 时序。
5. 需要提醒而不是阻断吗？用 nextTurn，并验证实际投递。
6. 规则有 repeat state 吗？使用 fresh session 或正确测试顺序。
7. 是不是把近似文本匹配说成了严格结构校验？如果是，降低结论强度。
```

## See Also

- [OMP TTSR 与 /omfg：流式行为护栏](ttsr-and-omfg.md) — TTSR 的具体 scope、配置和历史实验
- [TTSR keep vs discard](keep-vs-discard.md) — 错误上下文的生命周期选择
