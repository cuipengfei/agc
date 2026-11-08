# 私有桌面应用入口与命令路径接入摘录（XDG_DATA_DIRS、PATH 与全量解析验证）

> Source: 本机 wsl-webtop 会话调查（用户追问原文 + bd 事项 wsl-webtop-5tp 记录 + session.environment 修改与测试 + 实际 Plasma/Qt/strace-shell 解析 + ../buntoolbox 清单核对）
> Collected: 2026-11-08
> Published: Unknown

本文是原始材料摘录。来源逐块标注：用户原话、bd 记录、代码修改实测、全量解析清单。identifier 与代码一律保持英文原名。

## 用户追问原文（2026-11-08）

1. 会话问答（未修改时期）：

> 个人应用菜单和其他用户命令目录尚未全面检查, if not yet, then do

2. 之后汇总核对请求（当日）：

> all these can be found by kde and i3? including the ones in the ../buntoolbox repo , some of them existing for this wsl as well, can they all be found in kde and i3?

## bd 事项记录（全文引用）

issue `wsl-webtop-5tp`「接入个人应用入口与桌面命令路径」：P2 BUG，2026-11-08 创建并开始，现已 CLOSED。

DESCRIPTION 原文：

> KDE/i3共享系统与个人应用数据；桌面PATH接入既有用户命令目录，保留私有XDG配置。验证实际搜索和命令解析，不浏览器自动化，不提交推送。

CLOSE REASON 原文：

> 个人应用XDG_DATA_DIRS及既有用户命令PATH接入，私有配置保留。30sessiontests通过，新回归先失败后通过；获授权restart KDE ready，实际Plasma进程PATH可解析code/bun/uv/omp/tern/bd，Qt可找到个人Claude entry；i3新环境可解析命令并找到原HOME Tern entry。不浏览器视觉/切i3/commit/push。

## 修改前的检查结论（2026-11-08 会话内完成）

- 交互式 zsh 终端在 KDE、i3 环境里，用户初始化配置会补充命令路径，`code`、`bun`、`uv`、`omp`、`tern` 均解析到用户安装位置（实测 `zsh -lic`）。
- i3 的 `Ctrl+Alt+D`（`wmenu-run`）按桌面进程 `PATH` 列程序；实测只有 `/usr/local/bin:/usr/bin:/bin`，用户命令不可见；`wmenu-run` 不读取 `.desktop`。
- KDE 应用发现：项目数据目录已有 Tern 三个 `.desktop` 入口，Qt `qtpaths6 --locate-file GenericDataLocation applications/so.stencil.tern.desktop` 找到项目那一份；i3 项目目录没有该入口。
- 原 `~/.local/share/applications` 有四个入口：Tern 主入口、两个 Tern 变体（file/url），`claude-code-url-handler.desktop`（带 `NoDisplay=true` 的 URL 处理器）。

## `wsl_webtop/session.py` 修改（2026-11-08）

`environment()` 新增两段（任务 `wsl-webtop-5tp`）：

- `command_path`：仅接入**实际存在**的用户命令目录，tuple 依序 `(".local/opt/node-current/bin", ".local/bin", "bin", ".bun/bin", ".cargo/bin", ".opencode/bin", ".dotnet", ".sdkman/candidates/gradle/current/bin", "jdtls/bin", "go/bin", ".local/share/mise/shims", ".asdf/shims", ".npm-global/bin")`，系统目录 `/opt/maven/bin`、`/usr/local/go/bin`，末尾保留 `/usr/local/bin:/usr/bin:/bin`；不读取也不执行用户 shell 初始化文件。
- `data_dirs`：以项目私有 `XDG_DATA_HOME` 的文件系统与会话不冲突为前提，`XDG_DATA_DIRS` 首项是用户 `~/.local/share`，随后只接入**实际存在**的 Flatpak 导出目录（`~/.local/share/flatpak/exports/share`、`/var/lib/flatpak/exports/share`）与 Snap 桌面目录（`/var/lib/snapd/desktop`），末尾是 `/usr/local/share:/usr/share`。项目自身的 `XDG_DATA_HOME` 保持优先。

## 行为回归（测试先行）

- 新增 `tests/test_session.py::SessionTests::test_personal_commands_and_application_entries_are_discoverable`（2026-11-08）：同一 `.desktop` 与 `~/.local/bin` 假命令，断言两个桌面环境 `shutil.which(...,path=env["PATH"])` 与 `qtpaths6 --locate-file GenericDataLocation applications/personal-editor.desktop` 都可达。
- 修复前运行（红线）：ok 前 `AssertionError`（字体目录先走过一次，本条失败实测存在，具体值见工作树 diff）。
- 修复后 `python3 -m unittest discover -s tests -p test_session.py` 30 全部 `OK`（0.686 s）。

## 实际重启验证（用户授权）

- 用户选择「现在重启」；`wsl-webtop restart` 完成（bg_67，20.43 秒），`ready`；新 main PID `3626844`、Plasma PID `3627128`、KWin PID `3626983`，运行时 `/run/user/1000/wsl-webtop/session-m0al6tg1`。
- `/proc/3627128/environ` 实测 `PATH` 与 `XDG_*`：

```text
PATH=/home/cpf/.local/opt/node-current/bin:/home/cpf/.local/bin:/home/cpf/.bun/bin:/home/cpf/.cargo/bin:/home/cpf/.opencode/bin:/home/cpf/.dotnet:/home/cpf/.sdkman/candidates/gradle/current/bin:/home/cpf/jdtls/bin:/home/cpf/go/bin:/opt/maven/bin:/usr/local/go/bin:/usr/local/bin:/usr/bin:/bin
XDG_CONFIG_HOME=/home/cpf/.config/wsl-webtop/desktop
XDG_DATA_HOME=/home/cpf/.local/share/wsl-webtop/desktop
XDG_DATA_DIRS=/home/cpf/.local/share:/var/lib/snapd/desktop:/usr/local/share:/usr/share
```

- 在该实际 Plasma 环境实测：
  - `shutil.which(..., path=PATH)`、`code`、`bun`、`uv`、`omp`、`tern`、`bd` 全部命中用户或系统位置。
  - `qtpaths6 --locate-file GenericDataLocation applications/claude-code-url-handler.desktop` 命中 `/home/cpf/.local/share/applications/claude-code-url-handler.desktop`（用户目录）。
  - 优先顺序：KDE 侧查 `so.stencil.tern.desktop` 命中项目目录那份；i3 侧同一查询没有项目目录时命中 `~/.local/share/applications/so.stencil.tern.desktop`（原用户那份）。
- `wsl-webtop doctor` 重启后：`blockers: []`、无相关 desktop 差异；`git status` 工作区明确未提交。

## 全量命令解析验证（用户最终问题，2026-11-08 实测）

目录全量枚举采用 Python `os.listdir/iterdir`（不依赖截断的 shell 列表），再在每个桌面启动环境用 `shutil.which(name, path=env["PATH"])` 解析：

| 环境来源 | 计划命令数 | 命中缺失 | 备注 |
|---|---:|---|---|
| `~/.bun/bin`（66 项） | 66 | 0 | 含 `claude`、`omp`、`opencode`、`codex`、`dsh`、`biome`、`tsc`、language servers 等 |
| `~/.local/bin`（94 项，不含子目录） | 94 | 4 | `env.fish`（fish 专用配置）、`pnpm`/`pnpx`（该目录符号链接无效）、`uv-bun.test.js`（非可执行测试文件） |
| `../buntoolbox/scripts/check-wsl-versions.sh` 检查的 31 工具（java、python3、node、bun、gradle、mvn、http、uv、gh、git、jq、rg、fd、fzf、tmux、btop、psql、starship、zoxide、zsh、lazygit、eza、delta、procs、zellij、duf、ttyd、bd、rtk、plannotator、herdr） | 31 | 0 | KDE 与 i3 全部命中 |

`pnpm`/`pnpx` 宿主侧 `command -v` 同样为空，说明是宿主本身遗留问题，与桌面无关。`~/.local/share/rtk/tee/1794135611_ls-hidden.log` 保存了列表截断前的补全内容（`pyright-langserver`、`qiushi-skill`、`skills`、`tokscale`、`tsc`、`tsserver`、`tweakcc`、`typescript-language-server`、五个 vscode-* language server、`yaml-language-server`、`wrangler`、`wrangler2`、`btop-stop`、`wsl-webtop`、`xclip`、`zellij`、`zoxide`）。

## 验证边界（诚实区分）

审查方（advisor，2026-11-08 会话评估）指出表述风险，要点如下：

> 补充提醒（advisor）：Konsole 走 D-Bus 只确认了 profile 字符串（font 已是 Maple），实机 Konsole 窗口的字形渲染本身没有非视觉证据；st 侧已用 strace 与 glyph smoke 建立「实际打开的字体文件包含全部八个 Starship codepoint」的闭环。Konsole 若暂时无法做同级别验证，报告时应把「Konsole 渲染正常」标为用户目视验收项，不写成已验证。

同一日的第二轮评估（advisor）补充约束：

> Concern：最终答复把"命令可通过 PATH 解析"和"KDE 菜单显示"并列，容易让人理解成全部 Bun、uv 命令都会出现在 KDE 应用菜单。已读 `session.py:146-163` 显示 PATH 与 XDG_DATA_DIRS 分别设置；`desktop-parity.md:69` 说明 KDE 菜单使用 `.desktop` 入口，i3 的 `wmenu-run` 按 PATH 列出程序。建议把末段改成：“本次逐项验证的是 KDE、i3 启动环境能通过 PATH 解析这些命令；i3 的 `wmenu-run` 可列出这些可执行命令。KDE 应用菜单显示带有 `.desktop` 入口的应用，本次没有逐项验证全部命令的菜单入口。”

边界结论：

- 已验证：KDE、i3 启动环境能通过 `PATH` 解析全部常规命令；`i3` 的 `wmenu-run` 会列出这些可执行命令；KDE 能通过 `XDG_DATA_DIRS` 找到个人 `.desktop`（Tern、Claude handler 实证）。
- 未验证：KDE 菜单是否对全部命令显示 `.desktop` 入口（未逐一核验）；命令的可执行依赖是否都在真实场景下可用；浏览器视觉验收。菜单整屏视觉未做。

## 未执行事项

- 最近未做浏览器视觉验收与键鼠/截图注入（原约束沿用）。
- 未切换到 i3 实际运行桌面复验菜单。
- 未 commit、未 push。
