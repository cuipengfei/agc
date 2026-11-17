# OMP Hooks vs Extensions

> Sources: OMP upstream source code
> Raw: [OMP Hooks vs Extensions 源码取证](../../raw/omp-extensibility/2026-09-09-hooks-vs-extensions-source.md); [OMP Extension 与 Hook 关系修正](../../raw/omp-extensibility/2026-09-09-extension-hook-relationship.md); [模型访问接口与提示词改写](../../raw/omp-extensibility/2026-11-18-before-agent-start-model-context-and-adapter.md)
> Updated: 2026-11-18

## 结论

Extension 覆盖 HookAPI 的全部用例，并增加 `registerTool` / `registerProvider` / 更宽的 runtime context。Hook 是 legacy 兼容层，由同一个 extension runner 承载。新开发用 ExtensionAPI。

## 能力对比

| 能力 | Extension | Hook |
|---|---|---|
| `pi.on(...)` 事件 handler | ✅ | ✅ |
| `pi.sendMessage(...)` / `pi.appendEntry(...)` | ✅ | ✅ |
| `pi.registerCommand(...)` | ✅ | ✅ |
| `pi.registerMessageRenderer(...)` | ✅ | ✅ |
| `pi.exec(...)` | ✅ | ✅ |
| `pi.registerTool(...)` | ✅ | ❌ |
| `pi.registerProvider(...)` | ✅ | ❌ |
| 完整生命周期管理 | ✅ | ❌ |

## 运行时

- `--hook` 是 `--extension` 的 CLI 别名
- Hook 模块由 extension runner 加载
- 两套 factory/API 不是完全 drop-in（Extension 用 `ExtensionAPI`，Hook 用 `HookAPI`）

## 选型

- **新开发 → ExtensionAPI**
- **旧模块维护 → HookAPI 继续用**
- 不要声称 Extension 是 Hook 的"严格超集"——能力覆盖成立，但 API 不 drop-in

## `before_agent_start` 与模型读取

改写系统提示词的扩展通常需要在处理器里判断当前 provider。OMP 18.22.0 的 `ExtensionContext` 暴露的是属性 `model: Model | undefined`（`types.ts:814`）与查询外观 `models: ExtensionModelQuery`（`types.ts:816`），没有 `getModel()` 方法。

`ExtensionRunner.createContext()`（`runner.ts:1786`）内部确实有一个局部函数 `const getModel = model ? () => model : this.#getModel;`，但它只被 getter 属性 `model`（`runner.ts:1816-1818`）与 `models` 初始化（`runner.ts:1819`）消费，不挂到返回对象上。处理器里写 `ctx.getModel()` 会抛 `undefined is not a function`，运行时报错形态为 `Extension "<path>" error: ctx.getModel is not a function.`。

正确写法是读 getter：

```ts
if (ctx.model?.provider !== "antigravity-cli") return;
```

## 提示词改写的实现与测试

本机 `antigravity-prompt-adapter.ts`（37 行）在 `before_agent_start` 中遍历 `event.systemPrompt` 的全部元素，用 `replaceAll` 把目标句替换为中性句；未命中时只 `logger.warn` 一次并返回 `undefined`，保持提示词原样。

这类处理器的测试要避开手写上下文替身。第一版测试用自造的 `{ getModel: () => ... }` 通过，真实运行立刻失败，因为替身掩盖了接口差异。可行做法是从当前安装版本解析并导入真实的 `ExtensionRunner` 与 `SessionManager`，用 `SessionManager.inMemory(...)` 构造会话，再经 `runner.createContext(model)` 取真实 `ExtensionContext`；这样 provider 分支与字段名都按宿主实现校验。

## See Also

- [OMP Extension 与 TTSR：执行护栏的分层方法](../omp-ttsr/extension-and-ttsr-layering.md) — Extension 的具体职责与生命周期
