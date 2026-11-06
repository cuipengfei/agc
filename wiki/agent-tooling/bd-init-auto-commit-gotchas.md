# bd init auto-commit 陷阱

> Sources: gastownhall/beads 1.3.4 实测，2026-11-06；gastownhall/beads GitHub issues #5654, #3495, #1989，2026-08 至 2026-11
> Raw: [Beads bd init auto-commit 与 bd prime 行为](../../raw/agent-tooling/2026-11-06-beads-init-auto-commit-and-prime-behavior.md)
> Updated: 2026-11-06

## Overview

`bd init` 默认自动执行 `git add` + `git commit`，没有 `--no-commit` 或 `--skip-commit` 标志。它会把工作树中预先 staged 的文件卷入提交；未跟踪的文件不会被带入。这在 Jujutsu colocated 仓库中还会 fork 提交图。

## 实测行为

1.3.4 上执行 `bd init --non-interactive`，退出码 0，输出：

```
✓ Committed beads files to git
```

自动创建提交 `3158233 bd init: initialize beads issue tracking`，包含 19 个文件、944 行新增。提交信息固定，作者为当前 git 身份。

## 上游 issue

- #5654（open, priority/p1, 2026-08-11）：auto-commit 把预先 staged 的文件卷入提交；在 colocated Jujutsu 仓库中 fork 提交图。期望用显式 pathspec 限定提交范围。
- #3495（open, priority/p0, 2026-09-27）：`--reinit-local` 自动创建 AGENTS.md、CLAUDE.md、`.claude/settings.json` 并自动 git commit。`--skip-agents` 存在但在 `--reinit-local` 场景未生效；没有 `--no-commit` 选项。环境为 bd 1.0.3。
- #1989（closed, 2026-02）：讨论 auto-commit 是否应默认开启。曾提出 opt-in (`bd init --commit`) 方案。以「代码已演进」关闭。

## 规避方式

没有官方禁用标志。只能：

1. `bd init --stealth` — 不提交任何文件到 git，但 beads 功能受限
2. `bd init --skip-agents --skip-hooks` — 跳过集成和 hooks，但 auto-commit 仍然发生
3. 事后 `git reset --soft HEAD~1` 撤销提交，保留文件

## 建议

执行 `bd init` 前，先 `git status` 确认工作树干净，或 `git stash` 暂存其他工作。执行后检查 `git log` 确认提交内容符合预期。

## See Also

- [Beads 的安装与运行面](beads-install-and-runtime-surface.md) — 安装路径与 Dolt 依赖
- [持久任务库与会话 todo 的分工](durable-backlog-vs-session-todo.md) — bd 与会话清单的选择规则
