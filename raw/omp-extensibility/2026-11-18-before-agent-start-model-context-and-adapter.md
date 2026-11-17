# OMP 扩展的模型访问接口与 `before_agent_start` 提示词改写

> Source: OMP 18.22.0 安装包源码 `src/extensibility/extensions/types.ts`、`src/extensibility/extensions/runner.ts`；本机运行时报错原文；`~/.omp/agent/extensions/antigravity-prompt-adapter.ts` 与 `~/.omp/agent/extension-tests/antigravity-prompt-adapter.test.ts`
> Collected: 2026-11-18
> Published: Unknown

## 报错原文

本机扩展第一次运行时的输出：

```text
Extension "/home/<USER>/.omp/agent/extensions/antigravity-prompt-adapter.ts" error: ctx.getModel is not a function. (In 'ctx.getModel()', 'ctx.getModel' is undefined)
```

## `ExtensionContext` 暴露的模型字段

`src/extensibility/extensions/types.ts` 的 `ExtensionContext`（第 792 行起）声明：

```ts
/** Current model (may be undefined) */
model: Model | undefined;
/** Read-only model query facade: list / current / resolve / family. */
models: ExtensionModelQuery;
```

对应行为第 814 行与第 816 行。该接口没有 `getModel()` 方法。

## `createContext` 的实现

`src/extensibility/extensions/runner.ts` 的 `ExtensionRunner.createContext()`（第 1786 行起）内部保留局部函数：

```ts
const getModel = model ? () => model : this.#getModel;
```

`getModel` 只用于三处：getter 属性 `model`（第 1816–1818 行，`get model() { return getModel(); }`）、`models: createExtensionModelQuery(this.modelRegistry, this.settings, getModel)`（第 1819 行），以及内部求解。局部函数不挂到返回对象上，所以处理器里调用 `ctx.getModel()` 会抛 `undefined is not a function`。

## 改法

判断 provider 改为读取属性 getter：

```ts
if (ctx.model?.provider !== TARGET_PROVIDER) return;
```

## 扩展实现（37 行）

`~/.omp/agent/extensions/antigravity-prompt-adapter.ts` 源码：

```ts
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

// 修改当前渲染结果，保留上游模板更新以及其他 provider 的提示。
const TARGET_PROVIDER = "antigravity-cli";
const ORIGINAL = "You are omp's trusted coding assistant.";
const REPLACEMENT = "You are a helpful coding assistant.";

export default function antigravityPromptAdapter(pi: ExtensionAPI) {
    let warnedMissingText = false;

    pi.on("before_agent_start", (event, ctx) => {
        if (ctx.model?.provider !== TARGET_PROVIDER) return;

        let systemPrompt: string[] | undefined;

        for (let i = 0; i < event.systemPrompt.length; i++) {
            const original = event.systemPrompt[i];
            const updated = original.replaceAll(ORIGINAL, REPLACEMENT);
            if (updated === original) continue;

            systemPrompt ??= event.systemPrompt.slice();
            systemPrompt[i] = updated;
        }

        if (!systemPrompt) {
            if (!warnedMissingText) {
                pi.logger.warn(
                    "antigravity-prompt-adapter: target text absent; prompt unchanged",
                );
                warnedMissingText = true;
            }
            return;
        }

        return { systemPrompt };
    });
}
```

实现遍历 `event.systemPrompt` 的全部元素，不假设目标句位于首段；未命中时只告警一次并返回 `undefined`，保持提示词原样。

## 测试方式

`~/.omp/agent/extension-tests/antigravity-prompt-adapter.test.ts`（5,164 字节）从当前安装版本动态解析并导入真实的 `ExtensionRunner` 与 `SessionManager`，用 `SessionManager.inMemory("/tmp")` 构造会话，再经 `runner.createContext(model)` 拿到真实 `ExtensionContext`，跳过手写上下文的替身。测试覆盖：目标 provider 下替换生效、目标文本缺失时不改动、其他 provider 不替换。

## 同步与边界

- 扩展源码经 manifest 的 `omp/agent/extensions` 目录条目同步到仓库 `omp/agent/extensions/antigravity-prompt-adapter.ts`。
- `~/.omp/agent/extension-tests` 不在 manifest 范围内，测试文件只存在于本机。
- 上述接口结论来自 OMP 18.22.0 的安装包源码；升级后需重新核对 `ExtensionContext` 字段。
