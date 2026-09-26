# judgeBatch await 用法与常见误诊

> Source: `xd://eval/judge` 文档；本机 OMP eval JS kernel 实测（gen 3, Bun 1.4.2）；记忆条目全文（`memory://a04e697478b3f663` + `memory://dac0cf98f9eca033`）
> Collected: 2026-09-26
> Published: 2026-09-26

## 文档签名

`xd://eval/judge` 写明：

- 单状态：`await judge(state, questions) → {id: answer}`，直接 await 返回结果。
- 多状态：`judge_batch(states, questions)` 返回 JudgmentBatch，用 `await b.drain()` 收取结果。文档写 "Two or more states → judge_batch, never a loop of judge()"。

## 本机内核实际暴露

gen 3 JS kernel（Bun 1.4.2）：

- `judge(state, questions)` 可用，直接 await 返回 `{id: answer}`。与文档一致。
- `judge_batch` 不存在。内核只暴露 camelCase `judgeBatch`。命名差异客观存在，但接口行为与文档一致。
- `judgeBatch(states, questions, concurrency, retries, min_ok, intent)` 返回 thenable。await 后拿到 JudgmentBatch，带 `drain / drainIter / results / failed / status` 方法。
- `judgeBatch.attach(id)` 同样返回 thenable，需 await 后才能拿到 JudgmentBatch。

## 正确用法

```
const ref = await judgeBatch(states, questions, 32, 1, 1, 'intent-label');
const slice = await ref.drain(30000);  // 分片收取 settled items
// item.answers 为结果，item.error 为失败
const all = b.results();  // 已完成汇总
```

attach 已完成批次：

```
const ref = await judgeBatch.attach('jdgb-xxxxxxxx');
const results = ref.results();
```

## 误诊模式

judgeBatch 返回的是未 resolve 的 thenable。在未 await 的 Promise 上探查方法（`Object.getOwnPropertyNames(Object.getPrototypeOf(b))`）只会看到 `then / catch / finally / constructor`。

据此断言「接口缺失 / 值得报上游 bug」是误诊。文档方法在 resolve 后的对象上。

## 记忆条目全文

`memory://a04e697478b3f663`（importance 0.7）：judge API 与文档 xd://eval/judge 存在绑定差异（文档叫 judge_batch，内核只暴露 judgeBatch，没有 snake_case 别名）。这条为真：命名差异客观存在。

`memory://dac0cf98f9eca033`（importance 0.7）：judgeBatch 与文档没有绑定差异（await 后接口符合文档）。这条也为真：接口行为一致。

两条措辞看着对立，实则各指一层：一个说命名，一个说行为。真正的误诊「接口缺失/值得报上游」没有被存成任何一条离散 fact。

## memory_edit 边界

`memory_edit` 工具对 `[facts]` 类型只读。`update` / `forget` / `invalidate` 三种操作全部拒绝，返回 `not_editable`。跨会话更正靠新增澄清条目，不能修改存量。

## 双通道验证

54 个 state 同时用 judge() 循环和 judgeBatch 跑了一遍。dest 判定 53/54 一致。唯一差异块（L21-22 keep vs consolidate_send）正是人工已裁定进发送条件的那块，与最终映射不冲突。
