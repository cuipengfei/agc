# 全局 skill 更新与 lock 核对

> Source: 本会话中的用户提供的 `skills check -g` / `skills add` 输出，以及本机 `.skill-lock.json`、共享 skill 目录和仓库提交内容检查
> Collected: 2026-10-25
> Published: Unknown

## 问题

用户先核对 `skills check -g` 与单项安装日志，再问为什么本仓库只有部分 skill 被全局更新、其余 skill 是否已经安装，以及 `.skill-lock.json` 是否正确更新。

## 安装与检查输出

1. 一次 `skills check -g` 输出 `Found 2 global update(s)`，更新 `no-bs` 和 `talk-behavior`。同一输出报告 `restating-complete-answers (Local path)` 无法自动检查，并给出本地路径安装命令。命令的 Node 进程报告 `NODE_TLS_REJECT_UNAUTHORIZED=0`，关闭 TLS 证书验证。
2. `skills add -y -g cuipengfei/prompts --skill restating-complete-answers` 的输出显示选择了该 skill，写入 `~/.agents/skills/restating-complete-answers` 并链接到 Claude Code。输出另报告 PromptScript 不支持全局 skill 安装。CLI 总退出码为 0。
3. 接着执行的 `skills check -g` 输出 `All global skills are up to date`，也出现了 TLS 证书验证警告。
4. 提交 `7d20d5a` 推送后再次运行 `skills check -g`，输出更新了 `improve-skill`、`fuck`、`no-bs`、`github-repo-osint`、`uncharted`、`talk-behavior`、`note` 和 `restating-complete-answers` 共八项。该次也出现 TLS 警告。
5. 将 `NODE_TLS_REJECT_UNAUTHORIZED=1` 仅用于下一次检查进程后，`skills check -g` 输出 `All global skills are up to date`，未出现 TLS 警告；没有修改全局环境变量。

## 全局安装状态核对

仓库中 35 个 skill 的清单与全局 CLI 清单、`~/.agents/skills/` 和 `~/.agents/.skill-lock.json` 对照后：

- 18 项具有来自 `cuipengfei/prompts` 的全局安装记录。
- 八项在本次提交后更新。
- 十项已有安装；本次核对时，安装内容与仓库源文件的 SHA-256 清单一致。
- 另 17 项未出现在本次检查的全局 CLI 清单、共享 skill 目录或 lock 文件中。能确认的是这些目录和记录里没有它们；不能据此排除机器其他位置存在手工副本。

未更新的十项：`auto-extract`、`evolutionary-architecture`、`exploring-generative-ai`、`help-me-read`、`improve-prompt`、`jichang`、`jpm-voice`、`knowledge-fetch`、`multi-source-inquiry`、`natural-writing`。

未发现全局安装记录的十七项：`ba-collaboration`、`cline-kanban`、`codex-advisor`、`dialectic-partner`、`foundational-principles`、`openspec-apply-change`、`openspec-archive-change`、`openspec-explore`、`openspec-propose`、`planning-workflow`、`programming-workflow`、`quality-standards`、`response-guidelines`、`sequential-thinking`、`shortcut-system`、`testing-guidelines`、`zellij-control`。

## Lock 核对

全部 18 项记录的 `source` 为 `cuipengfei/prompts`，`sourceType` 为 `github`，`sourceUrl` 为 `https://github.com/cuipengfei/prompts.git`。各记录的 `skillPath` 是 `skills/<name>/SKILL.md`；每个 `skillFolderHash` 与提交 `7d20d5a` 中相应 `skills/<name>` Git tree hash 相等。八个更新项的安装文件已与源目录比对；十个未更新项也逐文件比对，内容一致。

`restating-complete-answers` 早期记录的 `skillPath` 为 `plugins/restating-complete-answers/skills/restating-complete-answers/SKILL.md`，随后记录改为 `skills/restating-complete-answers/SKILL.md`。其 `updatedAt` 从 `2026-10-24T15:36:45.819Z` 变为 `2026-10-24T16:06:05.355Z`；`installedAt` 维持 `2026-10-24T14:42:37.999Z`，`skillFolderHash` 维持 `886b64691692e670625ae2cd3c07713b6e4cdc78`。

会话没有保存完整的更新前 lock 快照，因此只能确认上述记录与当前源文件一致，不能声称已逐字段比较整份 lock 的前后差异。
