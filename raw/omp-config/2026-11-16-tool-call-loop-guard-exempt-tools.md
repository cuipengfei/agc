# model.toolCallLoopGuard 与 exemptTools 语义

> Source: 本机 OMP 18.20.3 源码直读（`pi-ai/src/utils/tool-call-loop-guard.ts`、`pi-coding-agent/src/session/stream-guards.ts`、`pi-coding-agent/src/advisor/loop-guard.ts`）+ 设置注册表元数据与用户级 `config.yml`
> Collected: 2026-11-16
> Published: Unknown

## 两套循环防护

| 设置族 | 检测对象 | 触发后动作 |
|---|---|---|
| `model.loopGuard.*` | 单次流式输出内的 reasoning 与正文重复（含 Gemini 连续规划不调工具） | 中断该次生成的重复流 |
| `model.toolCallLoopGuard.*` | 跨连续模型回合的完全相同工具调用集合 | 注入一条隐藏的纠偏消息 |

两族各自有独立开关。`model.toolCallLoopGuard` 由自己的 `enabled` 控制：`#activeToolCallLoopGuard()` 在 `cfgModelToolCallLoopGuardEnabled` 为 `false` 时销毁 guard 实例并返回空。`model.loopGuard` 族由 `model.loopGuard.enabled` 控制，其中的 Gemini tool-call reminder 还要求 `model.loopGuard.toolCallReminder`。

## 本机设置

| 键 | 类型 | 允许值 | 默认值 | 本机值 |
|---|---|---|---|---|
| `model.toolCallLoopGuard.enabled` | boolean | `true` / `false` | `true` | `true`（显式） |
| `model.toolCallLoopGuard.threshold` | number | 非负数字（运行时取整，最小 `1`） | `5` | `5`（显式） |
| `model.toolCallLoopGuard.exemptTools` | array | 工具名数组；也接受 `write` 分派的 `xd://` 设备名 | `["wait"]` | `["wait"]`（显式） |

注册表描述：`exemptTools` 列出「可以连续重复出现而不触发跨回合循环防护」的工具名或 `xd://` 设备名（示例写法 `mcp__peers_wait`）。

## 匹配与计数

1. 每回合从 assistant 消息中筛出 `type === "toolCall"` 的部分；本回合没有任何工具调用时清空哈希与计数并返回。
2. 参数规范化：对象键按名称排序，跳过 `INTENT_FIELD` 与旧字段 `__intent`；数组逐项递归处理。
3. 每个调用序列化为 `JSON.stringify([tc.name, canonicalizedArgs])`，整回合的调用串排序后再拼成 `turnHash`。集合内顺序不影响比较，参数键顺序不影响比较。
4. `turnHash` 与上一回合相同则计数加一，否则哈希替换、计数置 `1`。
5. 计数达到阈值时返回检测结果：`kind: "repeated_tool_call"`、工具名、计数，以及结果摘要（截到 `200` 字符）与参数摘要（截到 `400` 字符）。
6. 上报调用取本回合第一个未豁免的调用；整回合都豁免时取第一个调用。

## 豁免回合的两种结局

`recordTurn` 先判断本回合所有工具调用是否都豁免：

- 是，且本回合没有外部注入上下文（`injectedContext` 为假），并且每个调用的结果都带 `useless === true`：不重置计数。这类「无作用轮询」（例如到时的 `wait` 或没等到东西的 `wait`）被跳过，防止它与重复调用交替出现把循环掩盖掉。
- 其余情况（结果有效、失败、带注入上下文）：清空哈希与计数。这类回合可能改变了状态（任务结束、收到消息、注入上下文），视为循环中断。

## 注入物

达到阈值后写入一条 `role: "custom"` 的消息：`customType` 为循环防护专用类型，`display: false`（不显示在 transcript），`attribution: "agent"`，正文由检测结果渲染，并同时写入 session 的 custom message 记录。

## 豁免的设备别名

`ToolCallLoopGuard` 构造参数含 `exemptionAlias`；`stream-guards.ts` 与 advisor 的 `loop-guard.ts` 都传入 `writeDeviceName`。因此 `write` 调用写入 `xd://<device>` 时，设备名参与豁免判定：把某个设备名写进 `exemptTools` 即可让该设备的写入循环豁免，`write` 工具名本身不必豁免。

## 设置键与实例缓存

`#activeToolCallLoopGuard()` 用 `` `${threshold}:${JSON.stringify(exemptTools)}` `` 作为缓存键；阈值或数组变化时重建 guard 实例，空字符串元素在读取时被过滤。

## 陷阱

`exemptTools` 数组整体替换默认值，不做合并。写成 `["hub"]` 会同时失去默认的 `wait` 豁免，原本靠 `wait` 轮询等待后台任务的正常行为会被计入重复集合。要保留默认行为，数组里必须显式写出 `wait`。

## 证据边界

- 匹配与豁免语义来自上述源码；阈值与默认值来自本机 18.20.3 注册表。
- 未构造真实循环做端到端验证；结论是源码阅读结果，不是运行观测。
