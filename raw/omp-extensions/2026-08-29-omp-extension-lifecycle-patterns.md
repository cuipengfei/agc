# OMP Extension 生命周期与设计模式

> Source: https://github.com/can1357/oh-my-pi/blob/main/docs/skills/authoring-extensions.md; https://github.com/can1357/oh-my-pi/blob/main/docs/extensions.md; https://github.com/can1357/oh-my-pi/blob/main/packages/agent/src/agent-loop.ts
> Collected: 2026-08-29
> Published: Unknown

## Extension 的基本职责

官方 authoring 文档把 Extension 定义为 OMP 增加能力的主要方式。一个 TypeScript extension 可以注册 LLM 工具、slash commands 和 session lifecycle event handlers。默认导出是接收 `ExtensionAPI` 的 factory：

```ts
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("My extension loaded!", "info");
  });
}
```

官方文档同时说明：Extension 是 Hook 的严格超集；新 authoring 应使用 `ExtensionAPI`。纯 event interception 可以使用 Extension 或 Hook，但 Extension 是推荐选项。

## Discovery 与身份

官方文档列出的 discovery 来源：

1. `<cwd>/.omp/extensions/`
2. `~/.omp/agent/extensions/`
3. settings 中的 legacy extension paths
4. 已启用 plugin 的 `omp.extensions` / `pi.extensions` manifest
5. CLI `--extension` / `-e` / `--hook`
6. config 中的 `extensions:`

Runtime 按 resolved absolute path 去重，先发现者生效。

目录入口解析顺序：

1. `package.json` 的 `omp.extensions` 或 legacy `pi.extensions`
2. `index.ts`
3. `index.js`

扫描 `extensions/` 目录时，还会加载直接的 `*.ts` / `*.js` 文件和包含入口文件或 manifest 的一级子目录。

Extension 的派生名称来自 filename stem；`/path/to/my-ext.ts` 的名称是 `my-ext`。可以通过 `disabledExtensions` 使用 `extension-module:<name>` 停用而不删除文件。

## `tool_call`：结构化执行政策 seam

官方示例：

```ts
pi.on("tool_call", async (event, ctx) => {
  // event.toolName, event.input, event.toolCallId
  if (event.toolName !== "bash") return;

  const command = String((event.input as { command?: unknown }).command ?? "");
  if (command.includes("rm -rf /")) {
    return { block: true, reason: "Blocked by safety policy" };
  }
});
```

`tool_call` handler 可以：

- 返回 `undefined` 放行。
- 返回 `{ block: true, reason }` 阻断。
- 返回修改后的 `input` 改写将要执行的参数。

官方约束：`tool_call` handler 抛错时 fail-closed，工具调用会被阻断。

## Schema validation 与 hook 时序

当前 agent loop 的执行顺序来自 `packages/agent/src/agent-loop.ts`：

```ts
const validated = validateToolArguments(toolCall, tool);
if (!validated.ok) {
  entries.push({ toolCall, tool, args: toolCall.arguments });
  continue;
}

let effectiveArgs = validated.value;
if (options?.beforeToolCall) {
  const beforeResult = await options.beforeToolCall({
    toolCall,
    tool,
    args: effectiveArgs,
    assistantMessage,
    signal,
  });
```

因此 `beforeToolCall` / extension `tool_call` 收到的 `args` 已经过 schema validation 和 defaulting。`toolCall.arguments` 仍保存 raw arguments，但当前 extension event 只暴露验证后的 `event.input`。

通用结论：如果政策依赖“字段是否原始存在”，必须先确认 schema 是否在 hook 前补默认值。若信息已经被 defaulting 抹掉，post-validation extension 无法恢复它。

## 消息注入语义

官方文档说明 `pi.sendMessage(message, options)` 支持：

- `deliverAs: "steer"`：默认；中断当前 run。
- `deliverAs: "followUp"`：当前 run 完成后排队执行。
- `deliverAs: "nextTurn"`：存储，并在下一次 user prompt 时注入。
- `triggerTurn: true`：idle 时启动 turn；与 `nextTurn` 一起使用时，idle 会立即 prompt，streaming 状态会安排 internal continuation。

`pi.sendUserMessage(content, { deliverAs })` 总是走 prompt flow。streaming 时未指定 `deliverAs` 会排为 steer；`followUp` 会等待当前 run 完成。

`appendEntry` 只把 custom entry 持久化到 session，不发送给 LLM。

## Runtime 与错误边界

官方约束：

- 不得在 extension module load 阶段调用 `pi.sendMessage()` 等 runtime action；session 未 active 时会抛 `ExtensionRuntimeNotInitializedError`。
- load 阶段只注册 handlers、tools、commands；runtime 行为放在 event handler、tool 或 command 内。
- raw `setInterval`、`setTimeout` 或 detached promise 的异常会逃出 handler-dispatch 的 `try/catch`，导致 session crash。
- background work 应使用 `ctx.setInterval` / `ctx.setTimeout`；它们包含 callback 异常并在 `session_shutdown` 自动清理。
- command 名称与 built-in 冲突时会跳过注册并写 diagnostic log。

## 调试与验收

官方文档说明 OMP 把结构化日志写到 active state root 的 `logs/`；extension load failure 会记录 path 和 error，extension 也可通过 `pi.logger` 写日志。

通用验收层次：

1. Pure handler test：用 fake `ExtensionAPI` 注册 handler，直接传入事件，检查 block、input rewrite 或 `sendMessage` 参数。
2. Fresh-process discovery：新 OMP process 或 `/extensions` 验证 extension 被发现并启用。
3. Live positive：合法调用确实执行。
4. Live negative：非法调用被 block，且没有工具/worker 启动。
5. Deferred delivery：`nextTurn` 必须在下一个自然 user turn 到来后检查 session custom message，不能只证明 `sendMessage` 被调用。

## 证据边界

- 本 raw 记录的是 2026-08-29 本地 checkout 中的文档和源码行为。
- `tool_call` 的输入保真度取决于目标工具 schema；不同工具可能有不同 defaulting 和 normalization。
- Extension discovery 规则来自当前 OMP authoring 文档，不应外推到其他 agent host。
