# Prime Agent 技术实质

> Sources: Prime Agent 源码（commit a903d4b），2026-08-30
> Raw: [Prime Agent 源码验证记录](../../raw/prime-agent/2026-08-30-prime-agent-technical-reality.md)
> Updated: 2026-08-30

## RLM（Recursive Language Model）

### 版本差异

| 版本 | Kernel 类型 | 启动命令 | 通信协议 |
|---|---|---|---|
| v0.8.1（本机 bundle） | 标准 Jupyter IPython kernel | `python -m ipykernel_launcher` | ZeroMQ + HMAC |
| 上游源码（a903d4b） | 自定义 CPython REPL | `python -m rlm.repl` | stdin/stdout JSONL |

两者都是持久 Python 环境，但实现不同。v0.8.1 是成熟的标准 Jupyter 生态；上游源码在探索更轻量的自定义协议。

### 模型调用方式（两版本一致）

模型通过 `ipython` tool 提交 Python cell。环境里预置 `rlm.run()`、`rlm.harness` 等对象。`rlm.run()` 通过 `host_request` 桥接到 TypeScript host，返回严格校验的 `RLMSpawnHandle`。

### 子 agent 隔离（两版本一致）

- 独立 `AgentSession`、`SessionManager`、独立的 kernel 子进程
- Inline 子 agent 与父 agent **共享同一个 Node worker 进程**
- Daemon-backed 子 agent 可保留为独立可寻址 worker

### 递归

子 agent 可再 `rlm.run()`，default depth cap = 2。递归在 **agent/session 调度层** 真实存在，实现手段是 host 调度，不是 Python/OS 进程递归。

## Continual Harness

### 只有 4 类配置

`RefinementKind = "prompt" | "memory" | "skill" | "subagent"`。

### 存储与更新

- `harness_state.json`（JSON，session-local 或 global）+ `refinements.jsonl`（global history）
- 原子 rename 写入
- `/refine` 显式调用，或 auto-refine（turn_interval / compact 触发）
- LLM 生成 JSON 提案 → deterministic create/update/delete apply
- Rollback：before/after snapshot 反向生成 edit

### 关键限制

- 基础 system prompt 禁止修改
- 不生成可执行 Python 代码，只改配置引用
- `session_before_refine` extension hook 可 skip refinement

## Daemon

### 架构

Supervisor-worker：supervisor 管 Unix socket、client attach/detach、worker 健康。每个 root session 一个 detached resident worker 进程。

### 生命周期

- Detach：退出 TUI，worker 继续运行
- Reattach：通过 stable ID + 恢复机制
- **Persistent sessions may snapshot**（不是定时保证）
- Crash recovery：worker crash 只影响一个 root tree，recovery 重试（250ms, 1s, 5s）

### 关键限制

- 电脑休眠 → 执行暂停，唤醒后继续
- 电脑关机 → worker 终止
- Non-serializable 对象 crash 后丢失

## Status: Disputed

本文章中关于 RLM 的"递归"描述与 Digg 转载文章 "Critic Finds Prime Agent Lacks True RLM Recursion" 存在表面矛盾。但源码已确认 child→grandchild 递归在 agent/session 调度层真实存在，因此该批评与事实不符。

## See Also

- [Prime Agent：功能与配置总览](prime-agent-overview.md) — 官方文档视角的功能介绍
- [Prime Agent 社区 Reception](prime-agent-community-reception.md) — 第三方评价与 benchmark
- [模型 capability 与 gateway wire 参数不一致](../model-gateway-mismatch/reasoning-capability-vs-wire-parameter.md) — 另一篇 harness 层 mismatch 案例
- [OMP Extension 与 TTSR 分层防护](../omp-ttsr/extension-and-ttsr-layering.md) — OMP 的护栏方法论
