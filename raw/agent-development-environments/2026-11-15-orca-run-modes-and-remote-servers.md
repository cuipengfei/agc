# Orca — 运行模式、远程服务与手机文档摘录（2026-11-15）

> Source: https://orca.dev/docs (index, ways-to-run, remote-servers, mobile, cli/overview, first-session, pairing/troubleshooting), 2026-11-15 查阅
> Collected: 2026-11-15
> Published: 2026-11-15（docs 当前版）

## docs 首页 — 客户端形态

- 「Access from desktop, browser, or phone — your runtimes stay where you put them」（docs 首页原文）

## ways-to-run — 四种运行模式

- 「**Local** — the default. Everything runs on the machine where Orca desktop is installed.」
- 「**SSH** — the desktop stays local; worktrees run on the remote host over SSH.」
- 「**Remote Orca Server** — a full Orca runtime (`orca serve`) on a server you own. Desktop, browser, and mobile clients all connect to it.」
- 「**Cloud VMs** — per-worktree VMs created from a recipe (`orca.yaml` in your repo).」

## remote-servers — orca serve 与服务

- 「`orca serve` starts a headless Orca runtime on a server you control.」
- 「Orca uses a lightweight Node server (orcad). If orcad is unavailable, Orca falls back to running the server inside the desktop app.」
- 「The server owns: projects, worktrees, terminals, tabs, accounts, and sessions.」
- 「**Browser client** — sign in and connect to any server you're authorized for.」
- 「**Install as a service** — run Orca Server at boot with `orca serve --install`」（原文大意，服务安装）
- 「Each client gets its own token and authorization scope.」
- 「Stopping the desktop app does not stop a Remote Orca Server.」

## mobile — 手机端

- 「The Orca mobile app pairs with your desktop to act as a **remote control**:」
- 「Start, monitor, and stop agent sessions」「Replay terminal output」「Chat UI for permission prompts」「Source control (commit, push, PR)」「Create workspaces」
- 「Pairing: scan the code in Orca desktop's Settings → Mobile.」
- 「Relay (recommended): works anywhere; requires signing in to the same Orca account on both devices.」
- 「Direct (LAN): enter your desktop's LAN address; no Relay needed.」
- 「If the desktop app is closed, mobile sessions disconnect.」
- 「Remote Orca Servers keep the runtime alive for browser and mobile clients.」

## pairing/troubleshooting — 账号说法（与配对页不一致处）

- 排障页写明手机与桌面需登录同一 Orca 账号；配对页写明 LAN 直连无需 Relay（未提账号）。两页对「LAN 直连是否要求登录」说法不一致，本文原样记录两条。

## web client 提供方（源码与 issue，2026-11-15 补录）

- `vite.web.config.ts`（main 分支）：构建 `out/web`；`root: resolve('src/renderer')`；`base: './'` 上方注释原文：「// Resolve assets relatively for reverse-proxy pairing prefixes such as /orca/web-index.html.」
- issue #10687（Self-hosted ADE: ship the web client standalone, and make remote server install one command）原文引用 `orca serve --help`：「When the web client bundle is available, the server also prints a browser URL with the pairing data embedded」；同文写明「Today the web client is only served by a runtime, so it's implicitly 1 client ↔ 1 server」，并称 `orca serve` 加 bundled web client 在反代后工作良好。
- 同 issue 提到 `docs/reference/headless-linux-server.md` 曾写「No HTTP/web interface is served. Clients connect exclusively via WebSocket」，与上述行为矛盾（issue 描述当时文档状态）。

## cli/overview — CLI

- 「The `orca` CLI scripts a **running Orca editor** (local or remote).」
- 「Requires the Orca desktop app (or `orca serve`) to be running.」
- 「Command groups: `worktree`, `terminal`, `file`, `tab`, `automations`, `emulator`.」
- 示例：`orca worktree create --repo ~/src/app --name fix-login`；`orca terminal open --worktree fix-login`

## first-session — 首会话流程

- 「Add a repo → pick a base ref → press + to create a worktree.」
- 「Choose where it runs: Local, an SSH host, or a Cloud VM recipe.」
- 「Launch an agent from the launcher; use the terminal directly or the Chat UI.」
- 「The Chat UI is a readable conversation view with permission prompts and attachments.」
- 「Open several worktrees and drag tabs to split panes to watch them in parallel.」
- 「The diff view annotates lines; send comments back to the agent.」
- 「Commit, push, and open a PR from inside the app.」
