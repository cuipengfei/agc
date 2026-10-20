# Tern Inbox OSC 99 实测记录

> Source: 本机 WSL2 Tern 0.9.4 (b9ef74c) 当前运行窗口
> Collected: 2026-10-20
> Published: Unknown

## 测试环境

用户当前 Tern 窗口（OMP 会话所在 pane），非 headless。

## 测试 1：结构化 OSC 99 JSON

```bash
printf '\e]99;;{"title": "Test from omp", "body": "OSC 99 test message", "type": "test"}\e\\'
```

结果：inbox 无条目。Tern 窗口无任何可见变化。

## 测试 2：两条连续 OSC 99

```bash
printf '\e]99;;{"title": "Second test", "body": "Please respond to this message"}\e\\' && sleep 0.3 && printf '\e]99;;{"title": "Third test", "body": "Complete"}\e\\'
```

结果：inbox 无条目。无可见变化。

## 测试 3：OSC 99 + BEL

```bash
printf '\e]99;;{"title": "Fourth test", "body": "Does this appear in inbox?"}\e\\' && printf '\a'
```

结果：inbox 无条目。BEL 未触发可见或 audible bell（Tern 可能默认静音 bell）。

## 用户观察

用户报告 OMP 可以 post msgs 到 inbox 供查看。此现象与上述直写 pty 测试不一致。

## 假设

1. Tern web mode 对 shell pane 与 agent 块 pane 的通知处理不同
2. OMP 通知经 Tern 的 `alert` scenario 命令而非 OSC 99
3. OSC 99 结构化 JSON 需要 Tern hello 协商确认后才被解析

## 下一步

需用户反馈 OMP 实际触发通知时的具体行为（OMP 完成时是否有通知出现在 inbox），再对比直写差异。

## Herdr 排除（2026-10-20 补）

用户澄清：当前会话在 Tern web mode 里跑 OMP，没有 Herdr。`env | grep HERDR_` 确认当前 shell 无 `HERDR_ENV` / `HERDR_PANE_ID` 等 Herdr 标识变量。OMP 通知未走 Herdr 通道。Herdr 进程属于另一个 OMP 会话，与本次测试无关。
