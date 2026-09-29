- Source: GitHub topic 搜索 `herdr-plugin`（79 repos）+ 各仓库 manifest 复核（contents API root + git tree recursive）
- Collected: 2026-09-29
- Published: Unknown

# Herdr 插件 marketplace 榜单复核记录（2026-09-29）

## 收录口径（marketplace 官方文档）

Marketplace 收录规则：GitHub topic `herdr-plugin` + 默认分支存在可解析 `herdr-plugin.toml`（root 或子目录均可，`herdr plugin install owner/repo/subdir` 合法）。每 30 分钟刷新一次。仓库作者自己打 topic 和放 manifest，**无审核**。GitHub topic 搜索 API 返回的不全是可安装插件。

## 方法

1. `gh api search/repositories?q=topic:herdr-plugin&per_page=100`（两页，共 79 个仓库）。
2. 对每个仓库复核：root `herdr-plugin.toml`（contents API）+ recursive git tree 全树搜索。
3. 注意：raw.githubusercontent 大小写敏感，大小写不匹配会 404，需用 contents API 复核。

## 高 star 但 manifest 复核不通过的仓库（2026-09-29 状态）

以下仓库 star 高、出现在 topic 搜索中，但 2026-09-29 复核默认分支全树无 `herdr-plugin.toml`：

| Star | 仓库 | 描述 | 复核结果 |
|---|---|---|---|
| 3507 | zenbu-labs/terminal-browser | Terminal browser for AI agents | root 404，recursive 全树 NONE |
| 2094 | zenbu-labs/terminal-code | Terminal VS Code for AI agents | root 404，recursive NONE |
| 1437 | openclaw/crabbox | Warm a box, sync the diff, run the suite | root 404，recursive NONE |
| 1130 | AltanS/collie | Self-hosted mobile web terminal PWA | root 404，recursive NONE，无任何 herdr 相关 toml |
| 959 | furkankly/zoetrope | Real-time live activity flow-graph | root 404，recursive NONE |
| 612 | ZingerLittleBee/Heeler | -- | root 404，recursive NONE |
| 518 | alexarthurs/herdr-sidebar | VS Code-style sidebar | root 404，recursive NONE |
| 355 | ogulcancelik/herdr-browser | Render any website in a herdr pane | root 404，recursive NONE |
| 346 | eugenioenko/ttt | TTT editor | root 404，recursive NONE |
| 308 | ThorstenRhau/token | Neovim colorscheme with terminal-wide contrib themes | 未单独复核（manifest 复核通过与否未确认） |
| -- | nikosuave/memex | -- | 仓库不可访问 |

## 与 2026-09-17 调研表的状态冲突

`wiki/herdr-plannotator/toolchain-reference.md` 插件表（基于 raw 2026-09-17-herdr-plannotator-investigation.md）收录了 `AltanS/collie`（PWA 管理 herdr）和 `ogulcancelik/herdr-browser`（Chromium 渲进 pane）。9-17 的 raw 明确记录当时**未验证**每仓库有可解析 manifest（raw 第 63-64 行：「未验证 GitHub topic」「未验证每仓库有可解析 herdr-plugin.toml」）。

2026-09-29 复核结果：两仓库默认分支全树均无 manifest。可验证事实：本次复核日它们不满足 marketplace 收录口径，与 9-17 表内的收录状态冲突。9-17 时 manifest 是否存在不可考（当时未核验），不写迁移时间线。

## manifest 复核通过的高 star 仓库（root 有 herdr-plugin.toml，2026-09-29）

| Star | 仓库 | 描述 |
|---|---|---|
| 792 | persiyanov/herdr-reviewr | Rust，code review sidebar，diff 评论回发 agent |
| 612 | smarzban/herdr-file-viewer | Rust，git 感知只读文件浏览器 |
| 582 | plannotator/herdr-annotate | Rust，终端文本标注，评审意见回送 agent |
| 517 | eliasstravik/herdr-projects | Rust，coordinator + 并行 worker |
| 499 | madarco/agentbox | TypeScript，一条命令沙箱 VM 并行跑 agent |
| 394 | dcolinmorgan/herdr-remote | Python，菜单栏/手机/Telegram 远程监控 |
| 340 | cloudmanic/herdr-plus | Go，Projects + Quick Actions |
| 314 | osolmaz/pi-workflows | TypeScript，pi 工作流引擎+实时查看器 |
| 261 | 0cv/herdr-mobile-relay | Go，手机审批+推送，QR 配对 |
| 257 | powerfooI/roamgate | TypeScript，桌面/移动全端客户端 |
| 242 | uwuclxdy/clauth | Claude Code 多账户管理+用量监控 |
| 236 | vekexasia/pi-extensible-workflows | Pi 确定性多 agent 编排 |
| 220 | ChmaraX/herdr-nvim | Rust，Neovim 深度集成 |
| 215 | kryptamine/herdr-auto-title | Go，按工作内容/git 分支自动命名 tab |
| 188 | qu8n/herdr-automatic-rename | Shell，按前台进程自动命名 |
| 175 | thanhdat77/herdr-navigator | Rust，模糊跳转 workspace/agent/动作 |
| 165 | devashish2203/herdr-worktrunk | worktree 管理 |
| 162 | nelsonPires5/herdr-board | Rust，看板卡片=发给 agent 的 prompt |
| 152 | smarzban/tsk | Rust，终端共享任务板（Linear 平替） |
| 145 | levi-qiao/herdr-agent-usage | Rust，多 vendor 用量/context/cache |
| 134 | jhochenbaum/herdr-hunk-diff | hunk 级评审+行内评论 |
| 130 | yuk1ty/herdr-spreader | Rust，一个 YAML 铺整个 workspace |
| 104 | hhdebb/herdr-radar | JS，谁在干活谁在等，按项目分组 |
| 101 | arronKler/pairfob | 手机端，拨出式连接 |
| 95 | nidhi-singh02/agent-router | 按任务选 agent+模型 |
| 77 | iurysza/herdr-tab-smart-rename | 上下文感知 workspace/tab 命名 |
| 72 | permgps/herdr-telegram-agents | Telegram 双向开 agent |
| 47 | fullerzz/herdr-plugin-sesh | zoxide workspace picker |
| 44 | speardragon/herdr-plugin-manager | popup 管理插件，含 marketplace 浏览 |
| 38 | JanTvrdik/herdr-command-palette | fzf 命令面板 |
| 36 | Crokily/herdr-lazygit | 侧栏 lazygit+AI commit |
| 35 | ntindle/herdr-resurrect | tmux-resurrect 的 herdr 版 |
| 25 | natori-hrj/herdr-lazy | 声明式插件管理器+精选包 |

注：搜索 API 按 star 排序输出，79 个仓库中未列出者 star 更低，未逐个记录。
