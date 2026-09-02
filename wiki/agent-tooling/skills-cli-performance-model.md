# skills CLI 性能模型：目录发现比安装数量更关键

> Sources: 本机 `skills` CLI 源码检查与命令实测, 2026-09-03
> Raw: [skills CLI 性能模型调查](../../raw/agent-tooling/2026-09-03-skills-cli-performance-model.md)
> Updated: 2026-09-03

## Overview

`skills ls -g` 的耗时主要取决于 CLI 需要检查多少 agent skill 目录及其文件，而不只是用户真正使用了多少 skill。目录增殖、无用 agent 目录和软链会放大发现阶段的成本；`check`、`update`、`upgrade` 又共享同一更新路径，因此不能把 `check` 当作完全独立的廉价 dry-run。

## 发现阶段的成本模型

CLI 在源码中静态列出多个 agent skill 目录，例如 `.agents/skills`、`.claude/skills`、`.codex/skills`、`.opencode/skills` 和 `.pi/skills`。扫描候选目录时，CLI 会检查其中是否存在 `SKILL.md`。因此可以用下面的近似模型理解耗时：

```text
总耗时 ≈ 候选 agent 目录数 × 目录/文件状态检查成本
       + 实际 skill 数 × 元数据读取与解析成本
       + 软链、嵌套目录和更新检查的额外成本
```

这解释了为什么“安装了很多 skill”不是唯一问题：即使某些目录最终没有可用 skill，它们仍可能进入发现路径；软链也不是零成本引用。

## `check` 不是纯 dry-run

命令分派把 `check`、`update` 和 `upgrade` 都交给 `runUpdate()`。该函数根据 scope 运行 global 或 project skill 更新流程，并打印检查/更新结果。使用 `check` 做性能测试时，应把它看成共享更新管线的一种入口，而不是与 `update` 完全不同的实现。

## 清理的有效方向

前一轮本机记录显示，global skill 列表操作从超过 120 秒降至约 17.7 秒；本轮同一环境下 `skills ls -g` 返回成功，用时约 19 秒。记录中的另一个变化是 agent 目录从 77 个降至 8 个。两组旧数字属于本机历史测量，本轮没有完整重放，不能当作跨机器基准。

因此，最小有效优化顺序是：

1. 删除或移走不再使用的 phantom agent 目录。
2. 清理无用的 skill 软链，避免让发现路径反复检查它们。
3. 再测量 `skills ls -g`，确认清理是否真的减少了耗时。
4. 只有在目录规模已经受控后，才考虑更换 CLI 或修改扫描算法。

## 证据边界

前一轮采样记录中 futex 等待约占 CPU 的 84%，软链单条检查约 80–100 ms。这些数字用于解释本机瓶颈，不是普适基准。若要比较不同机器或版本，必须固定 agent 目录数量、软链数量、文件系统和 CLI 版本后重新测量。
