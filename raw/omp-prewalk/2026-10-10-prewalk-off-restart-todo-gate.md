# Prewalk `/prewalk off`、`/prewalk restart` 子命令与 todo gate 机制官方摘录

> Source: oh-my-pi 官方文档 `docs/prewalk.md`（GitHub 仓库 can1357/oh-my-pi，经 github file_read 采集）
> Collected: 2026-10-10
> Published: Unknown

以下摘录均为原文，identifier（命令、flag、Settings key、角色名）未翻译。本份用于补 wiki prewalk 文章缺失的 `/prewalk off`、`/prewalk restart` 子命令与 todo gate 机制记载。

## `/prewalk off`（原文）

> `/prewalk off` cancels a pending handoff and clears its planning steering without changing the active model, saved configuration, or already-delivered continuation history. It is safe to run when already off or after a handoff; it does not switch back to the planning model. Cancellation applies only to the current session: `/new` re-arms prewalk when the configured setting is enabled.

作用：取消本会话 pending 的 handoff 并清除 planning steering；不改 active model、不改已保存配置、不改已交付的 continuation history；已 off 或 handoff 之后运行也安全，不会切回 planning model；取消仅对当前会话生效。

## `/prewalk restart`（原文）

> After a handoff, `/prewalk restart` immediately returns the session to the current `@default` assignment and re-arms the handoff to `@smol`. Both roles are resolved when the command runs, so the cycle is independent of concrete model names and does not alter either role's persisted configuration.

及 target 不匹配时的拒绝行为（原文）：

> If prewalk is already armed, `/prewalk` leaves the existing target in place. `/prewalk restart` also preserves a matching arm; if its existing target differs from the current `@smol` resolution, restart is rejected before changing the active model. To choose a different target at startup, use `--prewalk-into`.

作用：handoff 之后运行，立即将会话回切到当前 `@default` 角色，并重新武装指向 `@smol` 的 handoff；两个角色在命令运行时解析，循环不依赖具体模型名，也不改动任一角色的持久化配置；若已 armed 且现有 target 与当前 `@smol` 解析不同，restart 在改变 active model 之前被拒绝。

## todo gate 机制（原文）

> When the `todo` tool is active, any successful `todo` call—including the read-only `view` operation—opens the handoff gate. Without an active `todo` tool, the gate is already open.

即：`todo` 工具激活时，任何成功的 `todo` 调用（含只读 `view` 操作）打开 handoff gate；无 `todo` 工具激活时 gate 本来就敞开。

## 交接触发时机与条件（原文）

> OMP switches at the completed assistant-turn boundary containing the first eligible `edit` or `write` result, after persisting that turn's assistant message and tool results. Unlike the todo gate, the edit/write trigger does not require a successful result.

> Calls to other tools do not trigger the handoff. A read-only `xd://` device request routed through `write`, such as LSP navigation, also does not count; only device operations classified as workspace writes or execution count.

> The switch is one-shot: after the handoff, prewalk disarms itself, removes the planning nudge, and steers the target with an implementation checklist. It changes the session's active model and optional thinking level without rewriting model-role assignments. A same-model handoff can still change thinking; when the model and effective thinking configuration already match, prewalk disarms without switching.

即：OMP 在包含首个符合条件的 `edit`/`write` 结果的已完成 assistant-turn 边界切换（在持久化该 turn 的 assistant 消息与工具结果之后）；与 todo gate 不同，edit/write 触发不要求结果成功；其他工具调用不触发；经 `write` 路由的只读 `xd://` 设备请求（如 LSP navigation）也不算；仅被归类为 workspace write 或 execution 的设备操作计数。切换是 one-shot：handoff 后 prewalk 自行解除、移除 planning nudge、用 implementation checklist 引导目标模型。

## 相关命令与 flag（逐字保留）

会话内免重启运行（原文代码块）：

```text
/prewalk
/prewalk restart
/prewalk off
```

启动 flag 表（原文）：

| Flag | Effect |
| --- | --- |
| `--prewalk` | Arm prewalk for the new session. |
| `--no-prewalk` | Leave prewalk disabled for the startup session, even when `prewalk.enabled` is `true`. `/new` still follows `prewalk.enabled`. |
| `--prewalk-into <model-or-role>` | Arm prewalk and use the supplied model pattern or role instead of `@smol`. |

Settings key（原文）：

```bash
omp config set prewalk.enabled true
```

```yaml
prewalk:
  enabled: true
```

`/new` 语义（原文，与 `/prewalk off` 的 cancel 范围相关）：

> `/new` starts a fresh cycle using `prewalk.enabled` and the current `@smol` assignment, rather than inheriting a consumed handoff or the previous todo gate. Startup flags (`--prewalk`, `--no-prewalk`, `--prewalk-into`) apply only to the startup session; `/new` always uses the configured setting. When prewalk is enabled, the new session restores the previous planning model and thinking level after a handoff unless a later selection replaced them. If the planning model can no longer be used (for example, its credentials were removed), `/new` warns and stays on the current model. Resuming an existing session does not automatically re-arm prewalk.

## 证据边界声明

- 本摘录仅覆盖官方 `docs/prewalk.md` 页面内容；未对照 `packages/coding-agent/src/slash-commands/builtin-modes.ts` 源码验证子命令注册，子命令存在性以官方文档记载为准。
- 文档未标注发布日期，Published 记 Unknown。
