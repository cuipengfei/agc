# Beads bd init auto-commit 与 bd prime 行为（2026-11-06 会话实测）

> Source: 本会话在 agc 仓库的 bd init / bd prime 实测输出；gastownhall/beads GitHub issues #5654, #3495, #1989；bd init --help 与 bd prime --help 输出
> Collected: 2026-11-06
> Published: Unknown

## bd init auto-commit 实测

1.3.4 上执行 `bd init --non-interactive`，退出码 0，输出末尾：

```
✓ Committed beads files to git
```

自动创建提交 `3158233 bd init: initialize beads issue tracking`，包含 19 个文件、944 行新增。提交信息固定，作者为当前 git 身份。

`bd init --help` 全文搜索无 `--no-commit`、`--skip-commit`、`--no-git` 或类似禁用 git commit 的标志。`--dolt-auto-commit` 只管 Dolt 数据库内部提交，与 git commit 无关。`--skip-agents` 存在，但 #3495 报告它在 `--reinit-local` 场景未生效。

## bd prime 空库行为实测

无 `.beads/` 数据库时执行 `bd prime`：

- 输出：0 字节（空字符串）
- 退出码：0

有数据库时输出 1-2k tokens 的 AI 工作流上下文，含 MCP/CLI 双模式自适应。

## 上游 issue 记录（原文摘录）

### #5654 (open, priority/p1, 2026-08-11)

> bd init auto-commit is not scoped to bd-generated files, so it sweeps caller pre-staged changes into its commit, and its raw git commit forks the graph of a colocated Jujutsu working copy.

> Actual: `work.txt` is included in the `bd init: initialize beads issue tracking` commit alongside the beads scaffold. Expected: the init commit is scoped to `git add .beads/ AGENTS.md CLAUDE.md ...` (an explicit pathspec), not whatever happens to already be in the index.

> This is a different code path from #3923 (pre-commit hook `export.git-add`, already fixed) and different from what #4635 verified (that path only checked _untracked_ decoy files, which are correctly left out — pre-_staged_ files are not).

### #3495 (open, priority/p0, 2026-09-27)

> 3. Creates `AGENTS.md`, `CLAUDE.md`, and `.claude/settings.json` at the rig root and makes a git commit if the rig is a git repo, with no opt-out from the reinit path. (`--skip-agents` is documented for `bd init` but did not appear to suppress these in `--reinit-local` mode in my run.)

> For the AGENTS.md / CLAUDE.md / `.claude/settings.json` creation and the auto-commit, those should respect a `--skip-agents` and a `--no-commit` flag in `--reinit-local` mode.

环境为 bd 1.0.3。

### #1989 (closed, 2026-02)

讨论 auto-commit 是否应默认开启。曾提出 opt-in (`bd init --commit`) 方案。以「代码已演进」关闭。

## bd prime 参数

- `--mcp`：强制 MCP 模式（最小输出，约 50 tokens）
- `--full`：强制完整 CLI 输出（1-2k tokens）
- `--hook-json`：包装为 SessionStart hook JSON 信封
- `--memories-only`：只输出持久记忆
- `--no-memories`：省略记忆部分
- `--max-memories N` / `--max-memory-chars N`：限制注入记忆数量与字节

## agc 仓库两次 bd init 记录

- 第一次（2026-11-06 15:27）：提交 `49dfd54` 出现。用户表示当时未察觉该提交。第一次 `bd init` 的输出没有留存，提交由谁发起尚未确认。
- 第二次（2026-11-06 15:49）：执行 `bd init --non-interactive`，自动提交 `3158233`。已实测确认。

两次提交内容一致，均为 19 个文件。
