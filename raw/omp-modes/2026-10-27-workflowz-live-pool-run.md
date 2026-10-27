# workflowz 五项池实测记录

> Source: 本机会话实测；omp 18.13.1；`task.maxConcurrency=4`（`omp config get task.maxConcurrency` 输出 `4`）
> Collected: 2026-10-27
> Published: 2026-10-27

## 创建与入池

本机版本 18.13.1。

```text
pool: workflowz-probe
pushed: ['workflowz-probe#1', 'workflowz-probe#2', 'workflowz-probe#3', 'workflowz-probe#4', 'workflowz-probe#5']
status: {'name': 'workflowz-probe', 'agent': 'scout', 'limit': 4, 'closed': False, 'freshAgents': False,
  'agents': [
    {'id': 'workflowz-probe-1', 'state': 'running', 'queued': 1, 'turns': 0, 'current': 'workflowz-probe-1-b1'},
    {'id': 'workflowz-probe-2', 'state': 'running', 'queued': 0, 'turns': 0, 'current': 'workflowz-probe-2-b1'},
    {'id': 'workflowz-probe-3', 'state': 'running', 'queued': 0, 'turns': 0, 'current': 'workflowz-probe-3-b1'},
    {'id': 'workflowz-probe-4', 'state': 'running', 'queued': 0, 'turns': 0, 'current': 'workflowz-probe-4-b1'}],
  'items': {'queued': 1, 'running': 4, 'completed': 0, 'failed': 0, 'cancelled': 0},
  'batches': 4}
```

## 工作者复用

- 1 号工作者先完成 `workflowz-probe-1-b1`，随后接下第 5 项，产生 `workflowz-probe-1-b2`，`turns=2`。
- 池在 4 个工作项 Running、1 个 Queued 时立即返回；第 5 项没有等待新池。

## 批次结果与截断

```text
Pool `workflowz-probe` · agent `workflowz-probe-1` · batch `workflowz-probe-1-b1` completed (1 item):
- [workflowz-probe#1] completed — Investigate the history and design evolution…
[output truncated to 6000 characters]
4 item(s) still queued or running in this pool. Transcript: history://workflowz-probe-1 · full output: agent://workflowz-probe-1
```

- 每个批次结果在 6000 字符处截断，完整内容通过 `agent://` 读取。
- 批次任务默认不自动投递；`wait` 能看到完成快照。

## 聚合结果

```text
Pool `workflowz-probe` completed (5 item(s), 5 batch(es)).

## workflowz-probe-1-b1 · agent `workflowz-probe-1` · completed
- [workflowz-probe#1] completed — Investigate the history and design evolution…

Pool queue drained.
```

- 聚合卡片只自动投递一次，任务 id 是 `workflowz-probe`。
- 聚合内每个批次一段，使用未截断的批次输出。
- 排空后池关闭；再 push 会抛 `workpool <name> is closed`。

## 观察边界

- 以上是主 agent 直接观察到的池对象、批次卡片与聚合卡片。
- 五项调查的详细报告由五个 `scout` 工作者产出；主 agent 只抽查了历史提交、README 与部分运行时常量，未逐条复跑全部测试。
- 未运行 OMP 测试套件，也未验证 push 与排空收尾并发窗口。
