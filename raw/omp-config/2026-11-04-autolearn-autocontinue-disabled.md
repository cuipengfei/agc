# OMP autolearn 关闭自动继续：配置改动与生效边界

> Source: 本机 `~/.omp/agent/config.yml` 与仓库同步结果
> Collected: 2026-11-04
> Published: Unknown

## 1. 改动

`~/.omp/agent/config.yml` 的 `autolearn` 块：

```yaml
autolearn:
  enabled: true
  autoContinue: false
  minToolCalls: 5
```

改动前 `autoContinue` 为 `true`，`enabled` 已经是 `true`，本次只把 `autoContinue` 改为 `false`。改动发生在 2026-11-04。

## 2. 复核

- 用 YAML 解析读取整个文件：`{'enabled': True, 'autoContinue': False, 'minToolCalls': 5}`。
- 按 `manifest.json` 的 `omp-config` 条目做单条目 pull：dry-run 输出 `would-update`，实际执行输出 `updated=1 unchanged=0 missing=0`。
- 仓库副本 `omp/agent/config.yml` 的 diff 只涉及这一行。

## 3. 行为影响

既有记录（`raw/omp-config/2026-10-28-autolearn-capture-pipeline-forensics.md`）说明 capture 需要 `autolearn.enabled` 与 `autolearn.autoContinue` 同时为真。现在 `autoContinue=false`，回合结束后不会启动自动 capture。

## 4. 生效边界（未取证）

- 本会话最初断言「正在运行的进程不需要重启就能读到新值」，该断言没有依据，已撤回。
- 同目录 `2026-10-28-autolearn-capture-pipeline-forensics.md` 第 155 行记录：同一进程内把 `autoContinue` 从 false 改为 true 后，多个满足工具调用数的回合都没有触发 capture；换成新 PID 并 `--resume` 同一会话后，首个满足条件的回合立刻触发。
- 同文件第 166 行记录：`main.ts` 中存在 `settingsInstance.startWatching()` 这类监听路径，但其对 autolearn 键的作用未验证。
- 结论：配置改动在磁盘上确定生效；运行中的进程是否读取新值，本机只有「新进程生效」这一条观察，热重载路径仍然未取证。

## 边界

- 没有重启会话验证 capture 确实停止；判断依据是配置值与既有触发条件。
- 没有读取 `controller.ts` 当前的读取时机，无法说明每回合是否重新读取设置。
