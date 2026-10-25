# ThinkRail — README、规格、安装与命令行为摘录

> Source: https://github.com/JetBrains/thinkrail (README.md, 模块 SPEC.md, releases, install.sh); https://thinkrail.ai/; 用户终端输出
> Collected: 2026-10-26
> Published: Unknown

README 与 SPEC 的载荷事实以文末「逐字摘录」为准；中间各节为导航性要点转录（非逐字原文），终端输出与帮助文本为逐字记录。

## GitHub API 指标快照（2026-10-26）

- `JetBrains/thinkrail`：stars 官方页显示 1.2k（约 1200，未直读精确值）、forks 85、created 2026-07-08。
- Latest stable release：v0.2.0（2026-10-18）；nightly：0.3.0-nightly.6（2026-10-25 发布）。
- 同日 `herdrdev/herdr` stars 45.8k（GitHub API）。

## 定位与设计原则（README / goal-and-requirements.md）

- JetBrains InnovationHub（孵化器）项目，Apache-2.0，TypeScript 为主；自述定位 "agentic IDE"。
- 围绕 pi 编码代理构建 IDE 外壳；依赖 `@earendil-works/pi-coding-agent`（上游 Pi）。
- 设计原则：ThinkRail 自己不做 agent 循环、不拼装提示词；模型、skills、扩展、上下文压缩、费用统计、会话状态全部由 pi 负责。
- spec-first 开发：顶层 `goal-and-requirements.md` 与 `architecture.md` 为权威规格，每个模块旁置 `SPEC.md`。

## 功能清单（README，要点转录）

- 项目 = 本地 git 仓库；工作区 = 从项目切出的 `git worktree`，各自分支与目录；文件、diff、终端、聊天都限定在工作区内；支持挂载已有 worktree；完成或闲置的工作区自动收进项目置物架（PR 合并/关闭，或安静一周后），回来时自动恢复。
- IDE 工作台：Monaco 编辑器分页、带 git 变更标记的文件树、实时 diff 的 Changes 视图、PTY 终端；可在文件与 diff 的具体行上留评论，评论收集为结构化上下文发给聊天；可用已安装的外部 IDE 打开当前 worktree。
- 聊天：同一工作区可同时运行多个 pi 会话，每会话单独选模型，头部实时显示 token 与花费；中途可调整方向、排队后续消息；可派发子代理（前台/并行/后台）；共享计划（TODO）由 agent 执行、用户可编辑，完成的每一步可单独提交与审查。
- Spec 图：互相链接的 `SPEC.md` 图景，agent 通过专门的 `spec_*` 工具读取、搜索、维护，右侧 Specs 面板渲染成树。
- Skills：复用已有的 Agent Skills（pi 负责解析与执行）。内置工作流：项目搭建、设计头脑风暴、发布 PR（用用户自己的 `gh` 推分支并开/更新 PR）。
- Agent 工具：网页调研；聊天内渲染图表、选项对比、文件预览；agent 提议界面改动时给出渲染好的前后对比稿，可像 diff 一样留评论；Extensions 页可逐个关闭。
- MCP：读取 pi 的 `mcp.json`，也可在设置里添加；可能改动数据的调用先在聊天里征求同意，可按项目设"总是允许"；仓库里定义的 MCP 服务器默认关闭，按条目批准，条目变更后批准失效；OAuth 服务器可从设置登录。
- 模型与凭据：JetBrains AI 登录，或经 pi 自己的认证接任意 provider；ThinkRail 无自有账号体系。
- 界面语言：跟随系统或手动，内置英文与简体中文；翻译后的 `en.json` 放 `~/.thinkrail/locales` 即加语言，保存生效；agent 回复与工具输出保持原文不翻译。
- 顶栏 GitHub 流程：显示当前分支相对 `origin` 的位置与对应 PR；发布、推送、开 PR 一键可达，PR 描述可来自计划、提交记录、PR 模板或 agent 草稿；PR 打开后显示 CI 检查与审查结论；可标记 ready、合并、把失败检查或分叉分支交给 agent、重新打开、删除远端分支。

## 形态与架构（README / SPEC，要点转录）

- 桌面应用：Electrobun 打包；平台 macOS Apple Silicon、Windows x64、Linux x64/ARM64；Linux 系统库要求 glibc 2.38+、GTK 3、WebKitGTK 4.1、Ayatana AppIndicator 3、librsvg 2，官方写 Ubuntu 24.04 起；带后台自动更新；无 Apple 芯片以外的 macOS 构建。
- CLI：`thinkrail [project-dir]` 在本机启动 engine host 并用浏览器打开同一套界面；状态在 `~/.thinkrail`。
- 无 TUI（`thinkrail` 只负责启动/更新/卸载）；无常驻 headless serve 模式（cli SPEC「Later」节明确列为后续工作）。
- host 在进程内运行 pi：一个致命故障会让整个应用退出（文档承认的取舍）。
- 应用无自有账号/登录界面，谁能连 host 由网络层决定；两台 host 可共用一个数据目录，但互不协调会话、终端与客户端。
- 三层结构：`apps/cli`；`apps/desktop`（Electrobun）；`packages/server`（engine host，Bun HTTP+WS，每个聊天一个进程内 pi 会话）；`packages/contracts`（the wire，带类型带版本的协议）；`apps/web`（React 19、Zustand、Tailwind v4）；`packages/shared`。UI 只依赖协议，可独立发布，也可连接另一台机器上的 host。

## 代码与平台（GitHub API languages + README）

- TypeScript 约 10.2MB、CSS 约 110KB、Astro 约 50KB，其余为安装脚本。
- 运行与包管理：Bun 1.4.4；Node.js ≥ 22.19（进程内 pi 引擎要求）；单仓库 Bun workspace + turbo。
- 签名：Windows 的 CLI、桌面安装器、应用二进制已签名；macOS CLI 已签名、尚未公证；Linux 产物未签名。

## CLI 帮助原文（用户终端，2026-10-26）

```
Usage: thinkrail [options] [project-dir]
       thinkrail update [--channel stable|nightly] [--version X.Y.Z|X.Y.Z-nightly.N|latest]
       thinkrail uninstall [--remove-data|--keep-data] [-y]

Boots the ThinkRail engine host in-process and opens the browser to the app.
The `update` subcommand re-downloads + installs the latest build for your channel;
`uninstall` removes ThinkRail from this machine (your ~/.thinkrail app state is kept
unless you ask for it to go). Both take `--help`.

Options:
  --port <n>     Listen port (default 24242; falls back to a free port if taken).
  --host <h>     Bind host (default localhost).
  --no-open      Don't open the browser (e.g. headless / remote host).
  --no-analytics Disable additional usage analytics this run.
                 The saved sharing preference lives in Settings → Privacy.
  --verbose      Debug-level logging (terminal + the rotated log files under
                 ~/.thinkrail/logs).
  -v, --version  Print the version and exit.
  -h, --help     Show this help.

Arguments:
  project-dir    A git repo to open as a project on launch (optional).

Env:
  THINKRAIL_PORT / THINKRAIL_HOST   Defaults for --port / --host.
  THINKRAIL_STATIC_DIR                 Override the built web app served by the host.
  THINKRAIL_NO_ANALYTICS               Same as --no-analytics (any non-empty value; read by the host).
  THINKRAIL_LOG_LEVEL                  Log level: debug|info|warn|error (default info; read by the host).
```

```
Usage: thinkrail update [options]

Re-download and install the latest ThinkRail for the current channel.

Options:
  --channel stable|nightly   Override the channel (default: the installed channel).
  --version X.Y.Z|X.Y.Z-nightly.N|latest
                             Install a specific version (default: latest).
  -h, --help                 Show this help.
```

```
Usage: thinkrail uninstall [options]

Remove ThinkRail from this machine: the executable, the installer's PATH entry, the install
metadata, and the binary's staging cache. Your app state (~/.thinkrail) is kept unless you ask
for it to be removed. pi's own state (~/.pi) is never touched.

Options:
  --remove-data   Also delete the app state dir — projects, workspaces, and the git worktrees
                  under it, including any uncommitted work in them.
  --keep-data     Keep the app state dir (the default; skips the question).
  -y, --yes       Don't ask anything (required when stdin isn't a terminal; keeps the app state
                  unless --remove-data says otherwise).
  -h, --help      Show this help.
```

## 安装与更新行为（用户终端，2026-10-26）

- 安装：`curl -fsSL https://raw.githubusercontent.com/JetBrains/thinkrail/main/install.sh | bash` → "Resolving latest stable release for linux/x64 ... → v0.2.0" → 下载 thinkrail-linux-x64 → 下载 SHA256SUMS → "Verifying checksum ... → ok" → "Installed → /home/cpf/.local/bin/thinkrail" → "ThinkRail 0.2.0 (stable) installed."
- 安装脚本会修改 shell 启动文件（`--no-modify-path` 跳过）；支持 Linux x64/ARM64、macOS Apple Silicon、Windows（Git Bash 同脚本，PowerShell 用 install.ps1）；无 Intel macOS 包。
- release 资产：`thinkrail-linux-x64`（v0.2.0，约 140 MB）、`thinkrail-desktop-linux-x64.tar.gz`（约 46 MB）、`SHA256SUMS`。
- `thinkrail update` 运行两次，均输出 "Updating ThinkRail (current: 0.2.0, channel: stable) …"、"→ v0.2.0" 并完整重新下载、校验、重装：该命令无"已是最新则跳过"的版本比较，帮助原文为 "re-downloads + installs the latest build for your channel"。
- `--port` 默认 24242，被占用自动切换到空闲端口；`--host` 默认 localhost。

## 本机 WSL 实测（2026-10-26）

- Ubuntu 26.04.1（/etc/os-release）、glibc 2.43（ldd）、x86_64、git 已安装、WSLg 存在（/mnt/wslg）。
- 桌面路径缺 `/usr/lib/x86_64-linux-gnu/libwebkit2gtk-4.1-0` 与 `libayatana-appindicator3-1`；apt 有候选 2.52.6 与 0.5.94。CLI 路径满足全部前提。

## 许可证与遥测（README / 帮助文本，逐字摘录见文末）

- Apache-2.0 开源；无许可证密钥、无账号体系；模型访问走 JetBrains AI 登录或自己的 provider 凭据（pi 认证，状态在 `~/.pi`），模型费用由 provider 计。
- 基础使用事件与崩溃报告默认始终发送，绑定随机安装 ID；额外使用数据默认关闭，可在设置打开；`--no-analytics` 或 `THINKRAIL_NO_ANALYTICS=1` 只关闭本次运行的额外数据，基础事件仍发送；永久开关在 Settings → Privacy。

## 引擎关系（交叉引用 wiki/agent-harness/sol-pi-omp-compat.md）

- ThinkRail 依赖 `@earendil-works/pi-coding-agent`：上游 Pi（badlogic/pi-mono 被 Earendil 收购后迁至 earendil-works/pi，官网 pi.dev）。
- OMP 使用 `@oh-my-pi/pi-coding-agent`：同一 pi-mono 血统的下游深度分叉（2026-03-22 后深度分叉，Bun 运行时，另加约 8 万行 Rust 核心）。
- 运行状态目录分开：`~/.omp` 与 `~/.pi`。OMP 迁移到上游 Pi 时认证与 MCP 配置需检查迁移，Pi 扩展逐项核对兼容性（已记录两例：SoL-Pi 的 Action Fusion 兼容修复在 OMP 侧未合入；pi-provider-kiro 使用的钩子名与 OMP 不同）。

## Herdr 对比基线（raw/agent-development-environments/2026-10-18-herdr-readme.md + GitHub API 2026-10-26）

- Herdr 实测 agent 列表 24 种（含 `omp`、`pi`、`claude`、`codex`）；本地与保存的 SSH 机器合成一个列表；形态为终端 TUI、CLI、SSH，单个 Rust 二进制。
- Herdr 后台 server 保持终端运行；断线或关客户端不停活；机器重启后恢复布局，原进程不保留。
- Herdr 无编辑器，diff 在终端查看；45.8k stars（2026-10-26）。

## README 逐字摘录（2026-10-26 自 main 分支抓取；仅收录载荷段落，图片标记与开发命令省略）

ThinkRail is the agentic IDE that gets better every time you use it — learning your project through
living specs today, and building its own capabilities tomorrow.

We built a rich interface around the [`pi`](https://www.npmjs.com/package/@earendil-works/pi-coding-agent)
coding agent, isolated work into separate workspaces, and gave the agent durable project knowledge
through living specs and reusable skills. Next, we're adding full extension support, so ThinkRail can
create the tools it needs based on how you actually work.

- **Isolated workspaces.** Open any git repo as a project and cut workspaces from it as `git worktree`s,
  each with its own branch and working directory. Agents work in parallel without touching your
  checkout; merge the good branch, delete the rest. You can also attach existing worktrees or explicitly
  work in the project folder itself. Finished and dormant workspaces settle onto a per-project shelf on
  their own — when their pull request merges or closes, or after a quiet week — and come back the moment
  you work in them. The topbar shows where the active branch stands against `origin` and its pull request,
  with the next step one click away: publish, push, or open a PR described from the plan, the commits,
  your PR template, or an agent-written draft. Once a GitHub PR is open it shows the CI checks and review
  decision, and lets you mark it ready, hand failing checks or a diverged branch to the agent, merge it
  with the repository's last-used method, reopen it, or delete the remote branch.
- **A real IDE around the agent.** A splittable workbench of Monaco editor tabs, a Files tree with live git
  change marks and a Changed view, terminals, and documents — all scoped to the active workspace. Leave
  anchored review comments on files and diffs and send them to a chat as structured context, or open the
  worktree in your installed IDE.
- **Chats that stream like the engine thinks.** Several concurrent `pi` sessions per workspace, each with
  its own model and live token and cost readout. Steer a running turn or queue a follow-up, delegate to
  subagents, and work a shared plan the agent updates and you edit — each completed step can be committed
  and reviewed on its own.
- **Specs as ground truth.** A connected graph of `SPEC.md` files lives beside the code; the agent reads,
  searches, and maintains it through dedicated `spec_*` tools, so intent survives the session. The
  read-only Specs tool renders the graph as a tree in the workbench.
- **Skills and workflows.** Portable Agent Skills you already keep for other coding agents are read in
  place, and bundled workflows guide project setup, design brainstorming, and shipping a pull request —
  pushing the workspace branch and opening or updating its GitHub PR through your own `gh`.
- **Agent tools beyond the shell.** Web research, and inline diagrams, option comparisons and file previews
  rendered right in the chat — when the agent proposes a UI change it shows a before/after mockup you can
  comment on like a diff. Settings → Extensions lists the ThinkRail extensions the agent gets and lets you switch
  each one off.
- **MCP servers.** Connect the MCP servers in your `pi` `mcp.json` (or add them, and a few presets, from
  Settings): ThinkRail asks in the chat before calls the server does not mark read-only (or always allows
  the tools you trust in a project), keeps servers a repository
  defines off until you approve them, signs you in to OAuth servers from Settings, and shows each chat's
  servers next to its background commands and subagents.
- **Your providers, your credentials.** Sign in with [JetBrains AI](https://www.jetbrains.com/ai/) or
  connect any provider through `pi`'s own auth. ThinkRail has no accounts of its own.
- **Desktop app or browser.** A native desktop app, or the `thinkrail` CLI that opens the same app in your
  browser. Both embed the same engine host; app state lives under `~/.thinkrail`.
- **Your language.** Settings → Language follows your system language or a language you pick; English and
  Simplified Chinese are built in. Add a language ThinkRail doesn't ship yet by dropping a translated
  `en.json` into `~/.thinkrail/locales` — it applies as you save. Agent replies and tool output stay as
  the agent wrote them.

Download the `thinkrail-desktop-*` asset for your platform:

- **macOS (Apple Silicon)** — open the DMG. There is no Intel desktop build.
- **Windows x64** — extract the complete setup ZIP, then run its setup executable in place, next to its
  payload.
- **Linux x64 / ARM64** — extract the setup tarball and run `installer`. Desktop builds need glibc 2.38+
  with GTK 3, WebKitGTK 4.1, Ayatana AppIndicator 3, and librsvg 2 — Ubuntu 24.04 or newer:

  ```bash
  sudo apt install libgtk-3-0 libwebkit2gtk-4.1-0 libayatana-appindicator3-1 librsvg2-2
  ```

The installer downloads the right binary, verifies its SHA-256 checksum, and puts `thinkrail` on your PATH.

`thinkrail` needs `git` on your PATH and a model provider — sign in with JetBrains AI from the app or use
your own provider credentials. `thinkrail --help` lists the flags; `thinkrail --version` prints the build.

The installer takes `--channel stable|nightly` and `--version`; a pinned version must belong to the
selected channel. [...] `thinkrail update` directly on any platform: it re-runs the installer for the installed
channel and replaces `<prefix>/bin/thinkrail[.exe]`; pass `--channel` or `--version` only for an explicit
override.

`thinkrail uninstall` removes the executable, the PATH entry the installer added, and the install metadata,
and asks whether to delete your `~/.thinkrail` app state (kept by default — `--remove-data` deletes it,
`-y` skips the questions).

Prefer a manual install? Download a binary and `SHA256SUMS` from the releases page and verify the checksum.
For self-update to work, rename it to `thinkrail` (`thinkrail.exe` on Windows) and place it at
`<prefix>/bin/thinkrail[.exe]`; a binary kept under its release filename or elsewhere must be replaced
manually or reinstalled with the script.

| Platform | Desktop | CLI |
| --- | --- | --- |
| macOS Apple Silicon | DMG | signed binary |
| macOS Intel | no Electrobun build | not prebuilt — [build from source](#developing-thinkrail) |
| Windows x64 | signed setup executable and app binaries | signed `.exe` |
| Linux x64 / ARM64 | setup tarball, unsigned | unsigned |

JetBrains signs the Windows CLI, the desktop setup executable, and every executable and DLL the desktop app
installs. The macOS CLI is signed but not yet notarized. [...] Linux artifacts are unsigned.

## Analytics & privacy

ThinkRail collects basic usage events — launches, chat creation, message sends, provider connections — tied to
a random installation ID. Usage analytics never include prompts, code, files, credentials, or account
identity. Error reports are also always sent, tied to the same installation ID, so we can fix crashes: the
error type and code and where in ThinkRail's own code it happened. They never include error messages, file
paths, names, URLs, or anything from your projects or extensions. Additional product
usage and how you found ThinkRail are shared only while **Share additional usage
data** is on; the switch is offered at first launch and lives in **Settings → Privacy**. When launching from
the command line, `thinkrail --no-analytics` (or `THINKRAIL_NO_ANALYTICS=1`) turns additional sharing off for
that run. With additional sharing on, a packaged build may open the ThinkRail blog in your browser once to
link your installation to the website visit that brought you here — only where you accepted marketing cookies on the
website or no consent is required — and that link expires after 30 days.

## Under the hood

ThinkRail is a thin host that runs `pi` in-process and bridges it to a rich web UI. `pi` owns models,
skills, compaction, cost, and session state; the app owns the workspace, the editor, and the wire — it
never assembles prompts behind your back. Three rings:

- **Engine host** — `packages/server` (+ `packages/shared`): a `Bun.serve` HTTP+WS host with one in-process
  `pi` session per chat, launched by `apps/cli` or `apps/desktop`.
- **The wire** — `packages/contracts`: the typed, versioned protocol between host and UI.
- **UI client** — `apps/web`: React 19 + Zustand + Tailwind v4, shipped independently; it dials a host over
  the wire and depends on the contracts only.

[`goal-and-requirements.md`](goal-and-requirements.md) and [`architecture.md`](architecture.md) are the
canonical product and design specs. ThinkRail is developed spec-first: a `SPEC.md` sits beside every
module, and a change that moves a boundary, contract, or decision updates the spec in the same change.

You need **Bun** 1.4.4 (the pinned package manager and runtime), **Node.js** ≥ 22.19 (required by the
in-process `pi` engine), and an authenticated `pi` provider for agent work.

Licensed under the [Apache License 2.0](LICENSE).

## SPEC 逐字摘录（2026-10-26 自 main 分支抓取）

apps/cli/SPEC.md:

> `--port` (stable default 24242, scans upward to the next free port on collision), `--host` (default `localhost`), `--no-open`, `--no-analytics` (**per-run suppression of additional analytics only** — basic events remain on; the durable additional-data choice is Settings → Privacy ...), `--verbose` (debug-level logging ...)

> (`Bun.serve` won't surface `EADDRINUSE` for a busy port, so the free port is found by probing, not by catching a bind error — see `@thinkrail/shared/freePort`.)
> The browser is a first-class client, not a fallback — the same UI can point at a remote host.
> The agent runs in this process — a fatal fault takes the app down (the accepted in-process tradeoff).

> ## Later
> A headless `serve` mode (always-on host for remote/automations). The shipped desktop sibling swaps "open a browser" for "open a native webview" over the same `bootHost()` lifecycle.

packages/server/src/host/SPEC.md:

> in-process pi means such a fault is the whole host's, and a launcher started without a terminal otherwise loses its only trace.

> Separate host processes do not coordinate mutable state or events. They may use the same data directory, but each owns independent in-memory sessions, terminals, watchers, and connected clients; persistence conflicts are accepted rather than serialized by the host.

packages/server/src/workspaces/SPEC.md:

> A workspace is a `git worktree` on its own branch under the data dir — the anchor for files/git/terminals/chats.

> Every project carries **exactly one built-in Default workspace** (`kind: "default"`) whose `worktreePath` is the project folder itself (git's *main working tree*) — the "just work in my project folder" anchor, ensured lazily, **non-removable and non-renamable**. Any **existing worktree** the user explicitly attaches is recorded in place as `kind: "external"` — outside the data dir, never created or mutated here.

> The record carries `lastActiveAt`, `settledOverride` / `settledAt`, and the `review` snapshot described in [[module-contracts]]; which rows are live and which sit on the shelf is a *client* derivation over these facts plus session state
