# Herdr 与 Plannotator 生态盘点与交叉集成（2026-11-15 star 快照）

> Source: GitHub API 查询（`gh api`）；`herdr.dev/tui/plugins/`；各仓库 README
> Collected: 2026-11-15
> Published: Unknown

star 数为 GitHub API `stargazers_count` 原值，查询时间 2026-11-15 06:44–06:50 UTC。同一仓库在相邻两次查询间出现 +1 浮动（如 `zenbu-labs/terminal-browser` 4647 → 4648），属正常波动。

## Herdr 官方组织 `herdrdev`

| 仓库 | star |
|---|---:|
| `herdrdev/herdr` | 51031 |
| `herdrdev/herdr-app` | 2932 |
| `herdrdev/herdr-core` | 702 |
| `herdrdev/herdr-nix` | 21 |
| `herdrdev/herdr-layout-examples` | 19 |

组织查询共返回 5 个仓库。

## 社区插件索引

`https://herdr.dev/tui/plugins/` 页面声明插件来自 GitHub topic `herdr-plugin`。

GitHub 搜索 `topic:herdr-plugin` 的 `total_count`：**2129**（2026-11-15 06:44 UTC）。官网页面文字写 **2081**。

按 star 排序前 12 条：

| 仓库 | star |
|---|---:|
| `zenbu-labs/terminal-browser` | 4648 |
| `zenbu-labs/terminal-code` | 2268 |
| `devswha/ovis` | 2065 |
| `AltanS/collie` | 1655 |
| `openclaw/crabbox` | 1538 |
| `furkankly/zoetrope` | 1169 |
| `eugenioenko/ttt` | 1123 |
| `persiyanov/herdr-reviewr` | 994 |
| `ZingerLittleBee/Heeler` | 889 |
| `babarot/dotfiles` | 782 |
| `plannotator/herdr-annotate` | 760 |
| `smarzban/herdr-file-viewer` | 706 |

## Plannotator 侧

主仓库 `backnotprop/plannotator`：**11352** star。

官方组织 `plannotator` 共 24 个仓库：

| 仓库 | star |
|---|---:|
| `plannotator/effective-html` | 4154 |
| `plannotator/herdr-annotate` | 760 |
| `plannotator/artifact-server` | 273 |
| `plannotator/plannotator-tui` | 248 |
| `plannotator/tot` | 84 |
| `plannotator/write-better` | 37 |
| `plannotator/guides` | 35 |
| `plannotator/effective-svg` | 32 |
| `plannotator/herdr-plannotator` | 27 |
| `plannotator/webtui` | 23 |
| `plannotator/app-notes` | 18 |
| `plannotator/design-artifact` | 13 |
| `plannotator/2n` | 11 |
| `plannotator/spec-planning-frameworks` | 9 |
| `plannotator/dev-skills` | 7 |
| `plannotator/envit` | 7 |
| `plannotator/markdown-editor` | 6 |
| `plannotator/agent-bridge` | 4 |
| `plannotator/byoa` | 4 |
| `plannotator/coding-agent-field-guide` | 4 |
| `plannotator/homebrew-tap` | 1 |
| `plannotator/show` | 1 |
| `plannotator/diffs-rs` | 0 |
| `plannotator/performance-audit` | 0 |

## 交叉集成仓库

### `plannotator/herdr-annotate`（760 star）

Herdr 插件 ID `annotate`。0.9.10 版清单含 11 个 action、3 个 pane、3 条 build，详见 `raw/herdr-plannotator/2026-11-15-herdr-annotate-0-9-10-upgrade.md`。纯终端路线：终端文字标注由 `bin/herdr-annotate.exe` 处理，文档与 agent 回复审阅由 `bin/plannotator-tui.exe` 处理。

### `plannotator/plannotator-tui`（248 star）

独立的终端标注程序（Rust + ratatui），被 `herdr-annotate` 反向依赖：插件 build 阶段从 `plannotator-tui` 的 GitHub Release 下载二进制。

### `plannotator/herdr-plannotator`（27 star）

Herdr 插件 ID `official.plannotator`。README 第 7–13 行 Requirements 原文：

```
## Requirements

- Herdr 0.7.5 or newer
- A Plannotator release with external presenter support
- [Herdr Browser](https://github.com/ogulcancelik/herdr-browser), installed and enabled
- Bun
- Google Chrome or Chromium
- Herdr's experimental Kitty graphics support
```

README 首段原文：

```
Herdr Plannotator opens Plannotator's existing review page in a Herdr Browser
pane. Plannotator still owns approvals, feedback, and agent behavior. This
plugin only changes where the page appears.
```

安装顺序与配置原文：

```bash
herdr plugin install ogulcancelik/herdr-browser --yes
```

```toml
[experimental]
kitty_graphics = true
```

```bash
herdr server reload-config
```

```bash
herdr plugin install plannotator/herdr-plannotator --yes
herdr plugin action invoke configure --plugin official.plannotator
```

```bash
herdr plugin log list --plugin official.plannotator --limit 1
```

```bash
herdr plugin action invoke doctor --plugin official.plannotator
```

### `ogulcancelik/herdr-browser`（359 star）

README 首四行原文：

```
# Herdr Browser (Deprecated)

> [!WARNING]
> This project is no longer maintained. Use
> [terminal-browser](https://github.com/zenbu-labs/terminal-browser) instead.
```

该 README 声明推荐改用 `zenbu-labs/terminal-browser`。`herdr-plannotator` 的 Requirements 仍要求安装并启用 Herdr Browser。

### `zenbu-labs/terminal-browser`（4648 star）

通用终端浏览器，详见 `raw/terminal-graphics/2026-11-15-terminal-browser-and-browser-kitty-terminals.md`。它提供 Herdr 插件（`zenbu-labs.terminal-browser`），不提供 `official.browser` pane 入口。

## 其余相关项目 star（2026-11-15 06:44–06:50 UTC）

| 仓库 | star |
|---|---:|
| `ghostty-org/ghostty` | 64117 |
| `kovidgoyal/kitty` | 35682 |
| `xtermjs/xterm.js` | 21355 |
| `tsl0922/ttyd` | 12635 |
| `Gaurav-Gosain/tuios` | 6532 |
| `linuxserver/docker-webtop` | 4510 |
| `Xpra-org/xpra` | 3065 |
| `selkies-project/selkies` | 2562 |
| `wiedymi/restty` | 420 |
| `Gaurav-Gosain/sip` | 30 |
| `Gaurav-Gosain/webterm` | 7 |

## 未验证项

- 官网插件目录未逐条抓取，只读页面文字与 GitHub topic 计数。
- 2129 与 2081 的差值原因未确认（索引刷新时间、manifest 校验差异均属推测）。
- 未安装或运行任何上述插件。
