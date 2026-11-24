# 选择性提交遇到已暂存内容：索引出现重复片段的一次观察

> Source: 本机会话的 `gst`、`git status --short`、`git diff --cached`、`git diff`、`git diff HEAD` 输出，仓库 `~/code-inside/copilot-api`
> Collected: 2026-11-25
> Published: Unknown

## 提交前

以下记录于 2026-11-25。

用户执行 `gst`，显示 9 个文件处于已暂存修改状态，没有未暂存改动：

```text
modified:   docs/guides/en/troubleshooting.md
modified:   docs/guides/zh-CN/troubleshooting.md
modified:   src/lib/http/chat-completions-stream.ts
modified:   src/lib/http/request-context-store.ts
modified:   src/lib/http/request-events.ts
modified:   src/routes/chat-completions/handler.ts
modified:   tests/auto-session-discovery.test.ts
modified:   tests/chat-completions-handler.test.ts
modified:   tests/chat-completions-stream.test.ts
```

## 提交后

用 `commit.draft()` 逐项 `take` 后提交，生成 `0f3b3490`，包含全部 9 个文件。两份文档在 `git status --short` 中显示为 `MM`，其余 7 个文件无改动。

`git diff --cached --numstat` 对两份文档各为 `8	0`；`git diff --numstat` 各为 `0	8`。两处差异内容相同：同一小节的中英文新增段落各出现两次，已暂存版本多一份副本。

`git diff HEAD -- docs/guides/en/troubleshooting.md docs/guides/zh-CN/troubleshooting.md` 输出为空，说明工作树与提交一致，重复只存在于索引。

工具结果把这两项标为：

```text
Staged by others: 2 path(s), left staged.
```

## 后续状态

再次检查时，两份文档的重复暂存已不存在；仓库出现另一批未暂存改动（`bun.lock`、`package.json`），来源不是本次提交动作。

## 边界

重复产生的机制没有核实。可以确认的是：提交前索引里已有同一批片段，提交后索引里同一片段出现两份，提交内容与工作树一致。使用选择性提交前先查看 `git status`，提交后以 `git diff HEAD` 判断是否真有残留，比相信状态字母更快。
