# sticky-router 模型目录与重启状态的源码和会话摘录

> Source: 2026-11-13 本次会话的终端记录；本机 copilot-api router 源码（2026-11-14）
> Collected: 2026-11-14
> Published: Unknown

以下日志中的实例名称和 session ID 均替换为 `<REDACTED>`；只保留与路由行为有关的摘录。

## 源码摘录：模型目录

`router/sticky-router.ts:63-68`：

```typescript
  const instances = parseInstances(rawInstances)
  const state = createStickyRouterState(instances)

  await discoverModels(state, log)

  Bun.serve({
```

`router/state.ts:521-540`：

```typescript
  state.portToModels.clear()
  state.modelToPorts.clear()
  state.modelDetails.clear()
  state.portHeaderSnapshots.clear()

  for (const inst of state.instances) {
    try {
      const res = await fetchImpl(`http://localhost:${inst.port}/v1/models`)
      const data: unknown = await res.json()
      const models = parseModelIds(data)
      const allowlist = inst.allowedModels
      const filteredModels =
        allowlist !== undefined && allowlist.length > 0 ?
          models.filter((model) => allowlist.includes(model))
        : models
      state.portToModels.set(inst.port, filteredModels)
      for (const model of filteredModels) {
        const ports = state.modelToPorts.get(model) || []
        ports.push(inst.port)
        state.modelToPorts.set(model, ports)
      }
```

`router/state.ts:914-920`：

```typescript
  if (url.pathname === "/v1/models" && req.method === "GET") {
    const allModels = new Set<string>()
    for (const models of runtime.state.portToModels.values()) {
      for (const model of models) {
        allModels.add(model)
      }
    }
```

2026-11-14 对 router 目录的 `discoverModels\s*\(` 查询，在源码中找到 `router/state.ts:516` 的定义和 `router/sticky-router.ts:66` 的启动调用。

## 源码摘录：实例停用状态

`router/state.ts:145-147`，新状态中的集合：

```typescript
    portHeaderSnapshots: new Map<number, UpstreamHeaderSnapshot>(),
    disabledPorts: new Set<number>(),
    totalNanoAiuSinceStart: 0,
```

`router/state.ts:464-468`：

```typescript
  if (disabled) {
    state.disabledPorts.add(port)
  } else {
    state.disabledPorts.delete(port)
  }
```

`router/state.ts:230-235`：

```typescript
  return ports.filter(
    (port) =>
      !state.disabledPorts.has(port)
      && getRemainingCooldownMs(state, port, nowMs) === 0,
  )
```

Dashboard 的 `PATCH /api/instances/` 处理分支在 `router/state.ts:1333-1334` 调用：

```typescript
      const disabled = (body as Record<string, unknown>).disabled as boolean
      setInstanceDisabled(options.state, port, disabled, encoder)
```

`GET /status` 返回的实例对象在 `router/state.ts:300,314` 分别读取 `state.portToModels.get(instance.port)` 和 `state.disabledPorts.has(instance.port)`。

## 2026-11-13 会话摘录：模型目录

对实例 `/models` 返回的 `data[].id` 查询 `gpt-6.1-terra`，4142 的输出：

```text
4142: true count=13
```

对 `http://localhost:4140/v1/models` 返回的 `data[].id` 排序后的完整输出：

```text
gemini-3.8-flash
gemini-4-argon
github-copilot/gpt-image-2.5-flare
gpt-5.3-codex
gpt-5.6-terra
gpt-6-astra
gpt-6-luna
gpt-6-luna-decisions
gpt-6-sol
gpt-6.1-sol
mai-code-1.1-flash
text-embedding-3-small
text-embedding-3-small-inference
text-embedding-ada-002
```

向 `http://localhost:8787/v1/responses` 发送 `gpt-6.1-terra` 请求时，返回：

```json
{"error":"no instance serves model: gpt-6.1-terra"}
```

4140 路由日志中的对应记录：

```text
[2026-11-13T15:33:56.284Z] NO PORT sid=- agent=_ model=gpt-6.1-terra provider=_
```

## 2026-11-13 会话摘录：重启前后状态

重启前，`http://localhost:4140/status` 中各实例的 `port` 和 `disabled` 字段摘录：

```text
  "port": 4142,
  "disabled": false,
  "port": 4143,
  "disabled": true,
  "port": 4144,
  "disabled": true,
  "port": 4145,
  "disabled": true,
  "port": 4146,
  "disabled": true,
```

重启后，`http://localhost:4140/status` 的输出：

```text
<REDACTED>:4142 disabled=false
<REDACTED>:4143 disabled=false
<REDACTED>:4144 disabled=false
<REDACTED>:4145 disabled=false
<REDACTED>:4146 disabled=false
```

重启后的路由日志摘录：

```text
[2026-11-13T15:36:25.549Z] sid=- agent=_ provider=_ → <REDACTED>:4143 model=gpt-6.1-terra reason=new
[2026-11-13T15:36:47.702Z] sid=<REDACTED> agent=_ provider=_ → <REDACTED>:4145 model=gpt-6.1-terra reason=new
[2026-11-13T15:36:58.340Z] sid=<REDACTED> agent=_ provider=_ → <REDACTED>:4145 model=gpt-6.1-terra reason=sticky
```

恢复停用状态后，`http://localhost:4140/status` 的输出：

```text
<REDACTED>:4142 disabled=false
<REDACTED>:4143 disabled=true
<REDACTED>:4144 disabled=true
<REDACTED>:4145 disabled=true
<REDACTED>:4146 disabled=true
```

随后一次经 8787 的请求返回 `OK`；4140 路由日志：

```text
[2026-11-13T15:42:13.213Z] sid=- agent=_ provider=_ → <REDACTED>:4142 model=gpt-6.1-terra reason=new
```
