# Prime Agent 技术实质：源码验证记录

> Source: PrimeIntellect-ai/prime-agent GitHub 仓库源码（main branch, commit a903d4b）
> Collected: 2026-08-30
> Published: Unknown

## 版本差异说明

本机安装版本（v0.8.1，bundle 验证）：启动 `python -m ipykernel_launcher`，标准 Jupyter kernel。
上游源码（commit a903d4b，文档/源码）：启动 `python -m rlm.repl`，自定义 JSONL REPL。
两者为不同时期的实现形态。以下按版本分列。

## RLM（Recursive Language Model）

### 不是标准 Jupyter，是自定义 CPython REPL

`repl-manager.ts:1-300` 启动命令：

```typescript
spawn(python, ["-m", "rlm.repl"])
```

`repl.py:1-1123` 运行时：
- 建立 asyncio event loop
- 创建 `__main__` module
- 通过 stdin/stdout newline-delimited JSON 通信
- 使用 `ast.PyCF_ALLOW_TOP_LEVEL_AWAIT` 执行代码
- **没有 Jupyter/IPython kernel imports**

`repl.md` 协议文档确认：持久 `__main__` namespace、单 asyncio loop、JSONL 协议、dill snapshot 按变量序列化。

### 每个 AgentSession 独立 kernel

`agent-session.ts:9078-9180`：`_buildRuntime` 为每个 session 创建新的 `IpythonKernelProvisioner`，注入自己的 `sessionId`、`snapshotDir`。

### 模型调用方式

`__init__.py`：`rlm.run` 通过 `host_request("rlm.run", {prompt, kwargs})` 桥接到 TypeScript host，返回严格校验的 `RLMSpawnHandle`。

### 子 agent 隔离

- 独立 `AgentSession`、`SessionManager`、独立的 `python -m rlm.repl` kernel 子进程
- Inline 子 agent 与父 agent **共享同一个 Node worker 进程**（`agent-session.ts:9494-9565`）
- Daemon-backed 子 agent 可保留为独立可寻址 worker

### 递归

子 agent 可再 `rlm.run()`，default depth cap = 2。递归在 **agent/session 调度层** 真实存在，实现手段是 host 调度，不是 Python/OS 进程递归。

## Continual Harness

### 只有 4 类配置

`refinement.ts:21-107`：`RefinementKind = "prompt" | "memory" | "skill" | "subagent"`

### 存储格式

- `harness_state.json`（JSON，session-local 或 global）
- `refinements.jsonl`（global history）
- 原子 rename 写入

### 更新机制

- `/refine` 显式调用，或 auto-refine（turn_interval / compact 触发）
- LLM 生成 JSON 提案 → deterministic create/update/delete apply
- `session_before_refine` extension hook 可 skip refinement
- 基础 system prompt 禁止修改
- Rollback：before/after snapshot 反向生成 edit

### 不生成可执行 Python 代码

Skill edit 必须有 Python reference/arguments，但 `/refine` 只改**配置引用**，不写实现代码。

## Daemon

### 架构

- Supervisor-worker：supervisor 管 Unix socket、client attach/detach、worker 健康
- 每个 root session 一个 detached resident worker 进程

### 生命周期

- Detach：退出 TUI，worker 继续运行
- Reattach：通过 stable ID + 恢复机制
- **Persistent sessions may snapshot**（不是定时保证）
- Crash recovery：worker crash 只影响一个 root tree，recovery 重试（250ms, 1s, 5s）

### 关键限制

- 电脑休眠 → 执行暂停，唤醒后继续
- 电脑关机 → worker 终止
- Non-serializable 对象 crash 后丢失
