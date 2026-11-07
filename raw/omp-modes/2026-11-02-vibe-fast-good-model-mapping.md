# Vibe fast/good 模型映射与覆盖边界

> Source: OMP @oh-my-pi/pi-coding-agent 18.15.0 安装版 `src/vibe/runtime.ts:60-71`、`src/prompts/tools/vibe-spawn.md`、`src/prompts/system/vibe-mode-active.md`；本机 `~/.omp/agent/config.yml` 的 modelRoles 与 task.agentModelOverrides
> Collected: 2026-11-02
> Published: Unknown

## 固定映射

`src/vibe/runtime.ts:68-71` 逐字：

```typescript
export const VIBE_CLI_AGENT: Record<VibeCli, string> = {
	fast: "sonic",
	good: "task",
};
```

`VibeCli` 类型只有 `fast | good` 两个值。Vibe 主代理用 `vibe_spawn({cli: "fast" | "good"})` 选择，OMP 再映射到 bundled agent：

| vibe cli | bundled agent | 绑定的 model role | 本机当前 selector |
|---|---|---|---|
| `fast` | `sonic` | `@smol` | `c8787/gpt-6-luna:high` |
| `good` | `task` | `@task` | `opencode-go/deepseek-v4.1-flash:max` |

## 角色选择语义

`src/prompts/tools/vibe-spawn.md:3-5` 逐字：

```text
CLI flavor by task:
- `fast`: low-latency model; mechanical, well-specified work (renames, boilerplate, running tests, data collection).
- `good`: strong model; hard work (design, debugging, multi-file changes, judgment calls).
```

fast/good 是按任务难度分的，不是按 agent 类型分的。fast 处理不需要判断力的活，good 处理需要判断力的活。

## 为什么只有两种

Vibe 的设计意图是给主代理一个极简的二选一。`src/prompts/system/vibe-mode-active.md:2` 定义主代理为「DIRECTOR」，只负责派活和验证，不做具体实现。如果主代理可以选择更多 agent 类型，它就变成了编排器而不是导演。Vibe 通过工具面收窄（只有 `read` + `vibe_*`）来强制这个约束。

## 模型覆盖的边界

`task.agentModelOverrides` 按 agent 名生效，不区分调用来源。Vibe 的 `fast`/`good` 和普通 `task(agent="sonic")`/`task(agent="task")` 共享同一套 override。

因此：

- 改 `agentModelOverrides.sonic` 会同时影响 Vibe 的 fast 和普通 task 的 sonic。
- 改 `agentModelOverrides.task` 会同时影响 Vibe 的 good 和普通 task 的 task。
- **无法只改 Vibe 不改普通 task**。

当前 OMP 没有 Vibe 专用的模型覆盖机制。要做到必须改源码里的 `VIBE_CLI_AGENT` 映射，或加一个新的 Vibe 专用配置键。

## 我们的自定义 agent 不在 Vibe 里

`librarian`、`oracle`、`qa`、`frontend`、`builder` 都不在 `VIBE_CLI_AGENT` 映射里。Vibe 主代理无法 spawn 它们。Vibe 模式下的 worker 只有 `sonic` 和 `task` 两种。
