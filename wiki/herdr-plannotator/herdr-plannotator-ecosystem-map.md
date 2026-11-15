# Herdr 与 Plannotator 生态地图：组成、规模与交叉集成

> Sources: GitHub API star 快照，2026-11-15 06:44–06:50 UTC；`herdr.dev/tui/plugins/`；`plannotator/herdr-plannotator` 与 `ogulcancelik/herdr-browser` README，2026-11-15 查阅
> Raw: [Herdr 与 Plannotator 生态盘点与交叉集成](../../raw/herdr-plannotator/2026-11-15-herdr-plannotator-ecosystem-stars.md)
> Updated: 2026-11-15

## Herdr 侧

官方 `herdrdev` 组织共 5 个仓库：

| 仓库 | 作用 | star |
|---|---|---:|
| `herdrdev/herdr` | Herdr TUI，终端工作区管理器 | 51031 |
| `herdrdev/herdr-app` | 桌面应用 | 2932 |
| `herdrdev/herdr-core` | 终端运行时 | 702 |
| `herdrdev/herdr-nix` | Nix 发布渠道 | 21 |
| `herdrdev/herdr-layout-examples` | 布局示例 | 19 |

社区插件通过 GitHub topic `herdr-plugin` 被发现，`herdr.dev/tui/plugins/` 提供浏览入口。GitHub 搜索该 topic 的 `total_count` 为 2129；官网页面文字写 2081。两个数字的差值原因未确认。

按 star 排序的前几名（2026-11-15 快照）：

| 仓库 | 作用 | star |
|---|---|---:|
| `zenbu-labs/terminal-browser` | 终端内 Chromium 浏览器 | 4648 |
| `zenbu-labs/terminal-code` | 终端内 VS Code Web 界面 | 2268 |
| `devswha/ovis` | 浏览器与手机客户端 | 2065 |
| `AltanS/collie` | 手机 PWA | 1655 |
| `openclaw/crabbox` | 沙箱执行环境 | 1538 |
| `furkankly/zoetrope` | agent 会话流程图 | 1169 |
| `eugenioenko/ttt` | 终端文本编辑器 | 1123 |
| `persiyanov/herdr-reviewr` | diff 审查与评论回传 | 994 |
| `ZingerLittleBee/Heeler` | iOS 客户端 | 889 |
| `plannotator/herdr-annotate` | 终端标注插件 | 760 |

`babarot/dotfiles`（782）也带该 topic，属个人配置仓库。

## Plannotator 侧

主仓库 `backnotprop/plannotator` 为 **11352** star，提供本地 Web 服务与浏览器批注界面。

官方 `plannotator` 组织共 24 个仓库，规模集中在少数几个：

| 仓库 | 作用 | star |
|---|---|---:|
| `plannotator/effective-html` | agent 技能：HTML 原型 | 4154 |
| `plannotator/herdr-annotate` | Herdr 终端标注插件 | 760 |
| `plannotator/artifact-server` | artifact 托管服务 | 273 |
| `plannotator/plannotator-tui` | 终端标注程序 | 248 |
| `plannotator/tot` | 发布 HTML/Markdown 为链接 | 84 |
| `plannotator/write-better` | 写作技能 | 37 |
| `plannotator/guides` | Guided Review 技能 | 35 |
| `plannotator/effective-svg` | SVG 技能 | 32 |
| `plannotator/herdr-plannotator` | Herdr 浏览器窗格集成 | 27 |
| `plannotator/webtui` | Web GUI agent TUI | 23 |

其余 14 个仓库的 star 在 0 到 18 之间：`app-notes` 18、`design-artifact` 13、`2n` 11、`spec-planning-frameworks` 9、`dev-skills` 7、`envit` 7、`markdown-editor` 6、`agent-bridge` 4、`byoa` 4、`coding-agent-field-guide` 4、`homebrew-tap` 1、`show` 1、`diffs-rs` 0、`performance-audit` 0。

## 两条集成路线

### 路线一：纯终端

`plannotator/herdr-annotate`（插件 ID `annotate`）承担全部入口：终端选择文字评论由 `bin/herdr-annotate.exe` 处理，文档与 agent 回复审阅由 `bin/plannotator-tui.exe` 处理。

依赖方向是 `herdr-annotate` → `plannotator-tui`：插件 build 阶段从 `plannotator-tui` 的 GitHub Release 下载对应平台二进制。`plannotator-tui` 可以独立使用，不依赖 Herdr。

### 路线二：浏览器版显示在 Herdr 窗格

`plannotator/herdr-plannotator`（插件 ID `official.plannotator`）把 Plannotator 现有的审阅页面放进 Herdr Browser 窗格。README 写明 Plannotator 仍负责审批、反馈与 agent 行为，插件只改变页面出现的位置。

Requirements 原文列出六条：Herdr 0.7.5 或更新、带 external presenter 支持的 Plannotator 版本、安装并启用 `ogulcancelik/herdr-browser`、Bun、Google Chrome 或 Chromium、Herdr 的实验性 Kitty graphics 支持。

配置步骤里需要 `[experimental] kitty_graphics = true` 并 `herdr server reload-config`，然后安装插件并执行 `configure`，再执行 `doctor` 检查。

### 两条路线的关系

两者互不依赖，也不共享运行时：路线一完全在终端字符界面内完成，路线二调用浏览器版 Plannotator 的页面。同一台机器可以同时安装。

## `herdr-browser` 的停止维护状态

`ogulcancelik/herdr-browser`（359 star）README 标题即 `# Herdr Browser (Deprecated)`，正文警告：

> This project is no longer maintained. Use
> [terminal-browser](https://github.com/zenbu-labs/terminal-browser) instead.

`plannotator/herdr-plannotator` 的 Requirements 仍要求安装并启用 Herdr Browser。`zenbu-labs/terminal-browser` 提供 Herdr 插件，`herdr-plannotator` 的 README 没有把 terminal-browser 列为可替代项。

## star 口径

以上数字均为 GitHub API `stargazers_count` 原值，快照时间 2026-11-15 06:44–06:50 UTC。相邻两次查询间同一仓库可能出现 +1 变动。

## 证据边界

组织与仓库清单、star 数来自 GitHub API 直读。两条路线的机制来自各自 README 与插件清单原文。未安装或运行任何列出的插件；未逐条抓取官网插件目录，官网页面只取到「来源为 GitHub topic」与该页文字中的 2081 这一数字。

## See Also

- [Herdr + Plannotator 工具链全量 Reference](toolchain-reference.md)
- [Plannotator 能标注哪些面](plannotator-annotatable-surfaces.md)
- [浏览器端 Kitty 图形终端](../terminal-graphics/browser-kitty-terminals.md)
