# plannotator Release Notes 要点（v0.27.15 → v0.27.24）

> Source URL: https://github.com/backnotprop/plannotator/releases（gh release view 逐版正文）
> Collected: 2026-10-01
> Published: 见各版本日期

## 版本清单（gh release list）

- v0.27.24, Latest, 2026-10-01T03:26:23Z
- v0.27.23, 2026-09-30T21:38:41Z
- v0.27.22, 2026-09-29T01:18:54Z
- v0.27.21, 2026-09-26T22:43:39Z
- v0.27.20, 2026-09-24T20:29:50Z
- v0.27.19, 2026-09-23T21:28:33Z
- v0.27.18, 2026-09-22T22:43:57Z
- v0.27.17, 2026-09-21T09:53:09Z
- v0.27.16, 2026-09-18T02:26:36Z
- v0.27.15, 2026-09-15T16:47:11Z

## 各版本 What's New 标题与要点

### v0.27.24
- "Image previews stay in the all-files view"
- "PR comment previews open on the commented line"

### v0.27.23
- "Bitbucket Cloud pull requests"（PR provider seam，#1641）
- "Questions in plans, answered in place"（文档内问题块 #1637/#1638/#1639）
- "Opt-in automatic updates"（后台自动更新，opt-in，#1636）
- "Code review remembers what you have viewed"：viewed 标记跨会话保留，按文件内容哈希绑定，记录于 `~/.plannotator/review-progress/`；关闭方式 `PLANNOTATOR_REVIEW_PROGRESS=0` 或 `{ "reviewProgress": false }`；`plannotator uninstall --purge` 会删除。PR #1632，closing #1136，by @oorestisime。**该功能引入 `resolveReviewProgress`**（pi-extension generated/config.ts:778 导出，server/serverReview.ts:11 导入，0.27.23 起出现）。
- "Review another repository or worktree"：`plannotator review ../other-repo` 与 `/plannotator-review ./worktrees/feature` 不移动会话直接 review 目标目录（#1644，closing #896 与 #1482）。
- What's Changed 另有：`fix(pi): stop the plannotator skill colliding with the CLI install`（#1643）；`chore(opencode): migrate plugin dependencies to stable APIs`（#1640）。

### v0.27.22
- "Plans can open the documents they link to"
- "Claude review jobs are locked down"
- "Code Tour on Linux when Claude Code's sandbox cannot start"
- "Pi reviews the plan you just wrote"

### v0.27.21
- "Remote and phone sessions load several times faster"（压缩 app 页面，woff2-only KaTeX，#1619）
- "Request changes on GitHub pull requests"（成为真正的 PR review event，#1613）
- "Model pickers show real names and where the list came from"
- "OpenCode fixes"：反馈送达到写消息的那个 agent（#1614，closing #1612）；去掉 OpenCode v2 拒绝的 `--dir`（#1610）。

### v0.27.20
- "Mistral Vibe support"
- "Annotate gets the full Options menu and Settings"（#1602）
- "Commits panel for jj reviews"
- "Long lines wrap in plan code blocks"

### v0.27.19
- "Before and After previews for changed images"
- "File comments become real GitHub file threads"
- "References link to the right forge"
- "`/plannotator-last` finds the right conversation"

### v0.27.18
- "Model pickers come from your installed tools"（含 Claude Agent SDK 0.3.273 升级说明：Claude 会话中换目录后，后续问题从新目录开始）
- "Unsent PR review comments survive new pushes"

### v0.27.17
- "Diagram files open in the diagram viewer"
- "OpenCode switches the model with the agent"
- "An idle review stops touching the git remote"
- "The review setup dialog is gone" 等

### v0.27.16
- "Themed diagrams"、"Comment on any node, edge, or diagram"
- "Review a diff file, no repository required"：`plannotator review --patch-file change.diff`，`--patch-file -` 从 stdin 读（#1554，@soundvibe 首个贡献）
- "Embedded HTML documents render"、"Printing from a dark theme"

### v0.27.15
- "Plannotator TUI and Herdr Annotate"：一次性公告面板；TUI 仓库 plannotator/plannotator-tui，Herdr 插件仓库 plannotator/herdr-annotate（#1529）
- "Pinpoint comments describe the element to the agent"
- "HTML annotate: the page gets the viewport, and the chords are real"（工具默认隐藏；`Mod+Shift+X` 显示；`Mod+Shift+A` 是文档化切换；#1531，后续 #1537）
- "Links between local HTML files open as linked documents"、"All files view in the annotations panel"
- "Codex: Stop plan review stays in the current turn"（#1169 by @rNoz；#1534 rollout 兜底）
- "Pi: PLANNOTATOR_BROWSER script paths work on macOS"（#1429）
- "x64 release binaries run on older CPUs"（#1514）

## 每版 Install / Update 段的 Pi 说明（逐字模式）

各版本均为："**Pi:** Update `@plannotator/pi-extension` to <版本号> and restart Pi." OpenCode 段为："Clear cache and restart: `rm -rf ~/.bun/install/cache/@plannotator`"。
