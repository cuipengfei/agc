# OMP 扩展：自定义 provider api 与会话级模型切换

> Source: OMP 18.22.2 安装包源码 `src/extensibility/extensions/types.ts`、`runner.ts`、`src/session/model-controls.ts`、`src/extensibility/extensions/loader.ts`、`src/extensibility/builtin.ts`；本机扩展与测试
> Collected: 2026-11-18
> Published: Unknown

## 模型上下文

`ExtensionContext` 暴露属性 `model: Model | undefined`（`types.ts:814`）与查询外观 `models: ExtensionModelQuery`（`types.ts:816`），没有 `getModel()` 方法。

`ExtensionRunner.createContext()`（`runner.ts:1786`）内部保留局部函数 `const getModel = model ? () => model : this.#getModel;`。该函数只被 getter 属性 `model`（`runner.ts:1816-1818`）与 `models` 初始化（`runner.ts:1819`）使用，没有挂到返回对象上。处理器调用 `ctx.getModel()` 会得到 `undefined is not a function`。

## `registerProvider` 的部分注册

`antigravity-schema-adapter.ts` 的注册形态：

```ts
pi.registerProvider("antigravity-cli", {
    api: "antigravity-schema-compat",
    streamSimple(model, context, options = {}) {
        return streamAntigravityCli(
            { ...model, api: "antigravity-acp" },
            context,
            options,
        );
    },
});
```

该调用只提供自定义 api 与 `streamSimple`，没有重建模型目录，也没有新增 apiKey 或 OAuth 配置。`registerProvider` 的完整模型注册要求认证信息；这里使用部分注册，认证继续由原 provider 负责。

## 不能走的配置路径

- 内置 `antigravity-acp` api 不能覆盖；尝试覆盖会失败。
- `models.yml` 的 `modelOverrides` 中，`api` 字段只接受已知 api 名，不能用配置新增自定义 api。
- 因此自定义 api 需要在运行时由扩展注册，不能只改模型目录。

## 会话级模型切换

`pi.setModel` 转到 `session.setModel`（`src/session/model-controls.ts:315-354`），`persist` 默认为 `false`。切换只作用于当前会话，不改变全局默认模型，也不写回 `models.yml`。

`before_agent_start` 处理器在每次开始时检查：

```ts
if (ctx.model?.provider !== "antigravity-cli" || ctx.model.api === api) return;
if (!await pi.setModel({ ...ctx.model, api })) throw new Error("Antigravity credentials are unavailable");
```

模型对象的其余字段保持不变，包括 provider、模型 id、上下文窗口与 reasoning 标记。

## 扩展自动发现

OMP 18.22.2 的扩展加载器会扫描用户扩展目录：`src/extensibility/extensions/loader.ts:725-800` 与 `src/extensibility/builtin.ts:513-524`。扩展放入 `~/.omp/agent/extensions/` 后，新进程会自动发现；在 `config.yml` 中显式写路径不是必要条件。

## 工具声明投影的位置

`streamSimple` 收到的 `context.tools` 是本次请求的工具声明。扩展可以在调用官方 `streamAntigravityCli` 前替换这份声明，同时保留 OMP 原来的工具定义用于执行与参数校验。

上游的对应投影在 `src/providers/antigravity-cli/host.ts:854-858`：`toMcpTool` 调用 `normalizeSchemaForMCP(toolWireSchema(tool))`。provider 的 `runStep` 不调用 `onPayload`，所以 `before_provider_request` 改不到这份声明。

## 提示词扩展

`antigravity-prompt-adapter.ts` 在 `before_agent_start` 中遍历 `event.systemPrompt` 的全部元素，处理两段目标文本：

- 身份句 `You are omp's trusted coding assistant.` 替换为 `You are a helpful coding assistant.`。
- 提交说明原行替换为 194 字符的等义改写。

两段目标文本都未命中时只 `logger.warn` 一次并返回 `undefined`，保持提示词原样；命中任一段时返回新的 systemPrompt 数组，不修改原数组。

## 测试

仓库副本的两个测试文件共 8 项通过：

- 提示词扩展 5 项：其他 provider 与未选模型不改写、替换全部匹配、上游措辞变化时只警告一次、提交说明改写、切换 provider 后重新判断。
- schema 扩展 3 项：可空枚举投影、联合分支与 `default` 保留、无变化保持引用与仅含 `null` 时报错。

测试从当前 Bun 全局安装解析真实 OMP 模块，并使用真实插件加载器；提示词测试通过 `ExtensionRunner.createContext` 取得真实 `ExtensionContext`。

## 证据边界

- 以上行为对应 OMP 18.22.2 安装包源码。
- 其他 OMP 版本的行号与接口可能变化。
- 只验证了 `antigravity-cli` 一个 provider 与一组模型。
- 部分注册的 `streamSimple` 只代理到官方 `streamAntigravityCli`，其他 provider 的注册行为未验证。
