# Antigravity 可空枚举工具声明触发的 400 与本地投影

> Source: 2026-11-18 本机会话；OMP 18.22.2 安装包源码；agy 1.5.11；真实 ACP 对照与 OMP TUI 验收
> Collected: 2026-11-18
> Published: Unknown

## 源工具声明

`search-tavily` 的 `topic` 参数使用可空枚举，形状为：

```json
{
  "default": null,
  "anyOf": [
    { "type": "string", "enum": ["general", "news"] },
    { "type": "null" }
  ]
}
```

`search_depth` 与 `time_range` 使用同型的 `anyOf` 可空枚举。源声明没有把 `null` 放进字符串枚举本身。

## OMP 的工具声明转换

OMP 18.22.2 的 `src/utils/schema/wire.ts` 中，`copyNullableScalarConstraints`（第 161-175 行）把可空标量合并为一份声明。转换后的声明包含：

- `type` 数组含 `null`；
- `enum` 数组含 `null`。

离线调用 `toolWireSchema` 可以复现同样的结果。该结果正是送给 Antigravity 的工具声明。

## Antigravity 的 400

真实 ACP 请求返回 `400 INVALID_ARGUMENT`。错误点名三个枚举位置：

- `topic.enum[2]`
- `search_depth.enum[4]`
- `time_range.enum[4]`

错误文本包含 `cannot be empty`。同一请求的系统提示词为中性对照，零工具条件下没有 `400`。

## 54 工具对照

| 条件 | 工具声明 | 结果 | 耗时 |
|---|---|---|---:|
| 中性 system | 54 个原工具声明 | 400 | 6.38 秒 |
| 中性 system | 54 个工具，仅从模型声明的 `enum` 移除 `null` | OK | 6.02 秒 |

两次对照使用同一批工具与同一模型。移除 `null` 只作用于发给模型的声明，原始工具参数对象没有改变。受控变量是 `enum` 中的 `null`。

## 本地投影实现

`antigravity-schema-adapter.ts` 的投影流程：

1. 对每个工具调用 `normalizeSchemaForMCP(toolWireSchema(tool))`，得到 OMP 实际发送的 wire 形状。
2. 使用宿主已有的 `json-schema-traverse` 遍历，查找 `enum` 中含 `null` 的节点。
3. 需要投影时克隆 wire 声明，只从 `enum` 中移除 `null`；`enum` 只剩 `null` 时抛出 `Antigravity cannot advertise null-only enum: ${tool.name}`。
4. 按原始 `parameters` 对象使用 `WeakMap` 缓存投影结果；没有可空枚举时返回原工具数组。
5. 仅替换 `streamSimple` 收到的工具声明，工具执行与参数校验仍使用 OMP 原来的工具定义。

## 上游修复点

OMP 的 `src/providers/antigravity-cli/host.ts` 第 854-858 行在 `toMcpTool` 中调用 `normalizeSchemaForMCP(toolWireSchema(tool))`。上游如果要消除该 `400`，应在这个工具投影处避免把 `null` 放进字符串枚举。本地扩展在扩展层执行同样的投影，属于兼容层。

provider 的 `runStep` 不调用 `onPayload`，因此 `before_provider_request` 无法修改这份工具声明；可用的修改点是扩展的 `streamSimple` 代理。

## 扩展的模型切换路径

- 内置 `antigravity-acp` api 不能覆盖。
- `registerProvider` 可以提供自定义 api 与 `streamSimple`，不改模型目录或认证。
- `before_agent_start` 中仅当 `ctx.model.provider === "antigravity-cli"` 且 api 尚未切换时，调用 `pi.setModel({ ...ctx.model, api: "antigravity-schema-compat" })`。
- 代理调用官方 `streamAntigravityCli`，保留原 OAuth、reasoning 与工具执行参数校验。
- `setModel` 的 `persist` 默认为 `false`，切换只作用于当前会话。

扩展机制与源码行号见 `raw/omp-extensibility/2026-11-18-registerprovider-session-model-switch.md`。

## 模型标识

`model=gemini-3.8-flash` 与 `thought_level=medium` 是两个独立参数。`503` 文本里的 `gemini-3.8-flash-medium` 是服务端模型变体名；`-medium` 属于变体名，不是思考等级字段。

## 真实 TUI 验收

OMP 18.22.2、agy 1.5.11；TUI 模型选择器为 `antigravity-cli/gemini-3.8-flash`，`--thinking medium`。

- TUI 问候成功。
- 新进程中的 Tavily MCP 已连接。
- 真实 `tavily_search` 仅带 `query` 执行一次，返回 10 条结果并完成回答。
- 首条结果标题为 `Tavily API - Docs, SDKs & Integration`，URL 为 `https://apitracker.io/a/tavily`。

## 测试

仓库副本的两个测试文件共 8 项通过，其中 schema 扩展 3 项：

- 可空枚举只改变模型声明，保留原始参数与其他工具。
- 遍历联合分支，不修改 `default` 与 `enum` 中的业务对象。
- 无可空枚举时保持原引用；仅含 `null` 的声明明确抛出错误。

测试使用当前 Bun 全局安装的 OMP 模块与真实插件加载边界。

## 证据边界

- 错误字段来自 `agy` 转发的响应；Google 校验器的内部实现未公开。
- 只覆盖 `search-tavily` 一个 MCP 服务器、一个模型与一组 OMP/agy 版本。
- 其他可空枚举形状、其他 MCP 服务器与其他模型未验证。
- OMP 升级后，`toolWireSchema`、`normalizeSchemaForMCP`、`streamAntigravityCli` 与 `setModel` 的接口需要重新核对。
