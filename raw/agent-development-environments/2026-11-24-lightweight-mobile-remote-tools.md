# 轻量手机远程控制工具：9 个候选逐仓核实

> Source: GitHub API（stargazers_count 快照 2026-11-24）与各仓库 README/源码（URL 见各节）
> Collected: 2026-11-24
> Published: Unknown

背景：2026-11-24 用户质疑「轻量非臃肿的手机远程方案真的只有 Herdr 一个」。此前按「ADE / Agent IDE + 高星」检索得到的候选都在向 IDE 全家桶膨胀。跳出该检索框、按「手机远程查看与控制电脑上本地 agent 会话」重新检索，得到 9 个候选。以下逐仓核实；star 均为 2026-11-24 GitHub API 快照；未实机安装任何工具。

## Ark0N/Codeman — 847★，MIT，默认分支最新提交 2026-11-20

来源：https://github.com/Ark0N/Codeman 、https://api.github.com/repos/Ark0N/Codeman 、README blob 5548c17、install.sh L9-20、packages/xterm-zerolag-input/package.json、docs/omp-integration.md

- 移动端形态：手机浏览器 Web UI（触屏终端、推送通知）；另有 macOS 桌面应用。
- 连接：支持 Tailscale Serve——服务绑回环地址，由 Serve 提供 tailnet HTTPS；安装脚本确有 `--tailscale` 选项。
- OMP：专门适配。docs/omp-integration.md 存在；独立 OMP 会话模式、PTY/tmux、模型与恢复参数、OMP 历史读取。审批 Inbox 只是提醒，回答仍须在终端进行。
- xterm-zerolag-input 包存在，仓库内版本 0.4.2。
- 边界自述：「Codeman has no plugin runtime on purpose, so an integration is just your own process talking HTTP.」（README L1039-1045）
- 未核实：未安装或运行；OMP 审批与远程连接未实机验证；OMP 路径是否硬编码 ~/.omp（自定义 PI_CONFIG_DIR 场景）未查。

## giuliastro/harness-remote — 450★，Apache-2.0，最新提交 2026-11-16

来源：https://github.com/giuliastro/harness-remote 、README blob 8609a7f、bridge/src/omp-session-history.js L313-370、docs/DEPENDENCIES.md

- 移动端形态：原生 Android 应用及 Web/PWA；README 明确 Android 支持从后台通知直接允许或拒绝权限，Web 支持浏览器通知。
- 连接：设备直连本机 gateway，QR 一次性配对；作者建议可信 LAN 或 VPN，明确不要将 gateway 直接暴露公网；未见 Tailscale Serve 专用配置。
- OMP：专门适配，走 `omp acp` 的 stdio JSON-RPC；确实直读 OMP 会话历史：源码以 ~/.omp/agent/sessions 为根递归枚举 .jsonl、按会话 ID 查找并解析（非仅顶层 *.jsonl）。
- 边界自述：「Harness Remote is not another coding agent. It is the remote-control and continuity layer around the coding agents you already use.」
- 未核实：通知内审批在锁屏状态下是否可操作未证实；未实机安装。

## kzahel/yepanywhere — 559★，MIT，最新提交 2026-11-23

来源：https://github.com/kzahel/yepanywhere 、README blob 1c4f843、docs/competitive/all-projects.md

- 移动端形态：手机响应式浏览器 Web UI；Android 原生应用开发中、iOS 计划中，README 称两者均未发布。
- 连接：支持直连或自带公共中继；作者称远程访问流量端到端加密；公开只读分享为单独路径且中继运营者可读取；也可经 Tailscale 等 VPN 私网直连。
- OMP：README 列 Claude Code、Codex，另列实验性的 OpenCode、Grok Build、Gemini、pi；未列 OMP，也未证明通用 PTY 透传。
- 竞品总表 docs/competitive/all-projects.md 确实存在。
- 备注：仓库简介称 no database，但 README 明确当前使用 SQLite——简介已过时。
- 未核实：加密未实测；SQLite 以外的本地状态细节未查。

## termly-dev/termly-cli — 320★，MIT，最新提交 2026-04-14

来源：https://github.com/termly-dev/termly-cli 、README blob 9618186、lib/ai-tools/selector.js L30-38、lib/ai-tools/registry.js、https://termly.dev/ 、https://play.google.com/store/apps/details?id=dev.termly.app

- 移动端形态：原生 Android 应用有 Google Play 页面；官网宣称 iOS 应用并给出 App Store 链接；README 的 coming soon 与官网现状声明冲突。
- 连接：作者称 WebSocket 服务中继、AES-256-GCM 加密与 DH 密钥交换；生产服务地址按环境硬编码。
- OMP：底层使用 PTY，但工具选择走注册表查找，未知工具报错；现有注册表未列 omp。能否绕过注册表运行 OMP 未核实。
- 边界自述：「Server URLs are hardcoded per environment and cannot be changed by users.」
- 未核实：iOS App Store 直链抓取返回 404，当前可用性未证实；加密未实测。

## awkto/ssh-to-go — 65★，AGPL-3.0，最新提交 2026-10-24

来源：https://github.com/awkto/ssh-to-go 、README blob c1d3e82、android/README.md

- 移动端形态：手机浏览器 Web 终端；另有早期原生 Android 客户端（经 WebSocket 访问会话）。
- 连接：浏览器或 Android 客户端经 WebSocket 接自建 ssh-to-go 服务，服务再经 SSH 连接目标机器的 tmux。README 未称其为 Tailscale SSH，也未声称自带公网中继或端到端加密。
- OMP：通用终端/tmux 透传，README 支持任意长运行终端进程；非 OMP 专门适配，兼容性未实测。
- 边界自述：「no agents, no plugins, single binary.」；「Zero setup on targets — no agents or daemons to install, just SSH + tmux」
- 未核实：OMP 实机交互、Android 客户端当前发布状态、tmux 会话跨目标重启存活均未实测。

## ddevalco/CodeRelay — 67★，MIT，最新提交 2026-09-04

来源：https://github.com/ddevalco/CodeRelay 、README blob 035ea51、docs/PROVIDERS.md

- 移动端形态：移动优先的手机浏览器 Web UI，也支持桌面浏览器；快速开始以 Mac + iPhone 为场景。
- 连接：本机回环服务由 tailscale serve 仅向 tailnet 发布 HTTPS/WSS，使用访问令牌和设备配对令牌。
- OMP：当前 provider 文档列 Codex、OpenCode、Copilot ACP 和 Claude，未列 OMP；Copilot ACP 不能直接等同于任意 ACP 或 OMP 支持。
- 边界自述：「designed to stay tailnet-only (no public tunnels required).」

## custardcream98/better-remote-control — 0★，最新提交 2026-03-24

来源：https://github.com/custardcream98/better-remote-control 、README 与 package.json blob 7d2ccee

- license：README 与 package.json 声明 MIT，但 GitHub API license 为 null，仓库 LICENSE 路径 404；独立许可证文本未找到。
- 移动端形态：手机浏览器移动优先 Web 终端。
- 连接：默认 Cloudflare Tunnel；`--no-tunnel` 为本地网络方式，使用密码认证。
- OMP：通用终端/PTY 形态（node-pty），支持选择 shell 和启动命令；未见 OMP 专门适配。
- 边界自述：「a focused tool that does one thing well: puts your local terminal on your phone.」

## JessyTsui/Claude-Code-Remote — 1290★，MIT，最新提交 2025-12-06

来源：https://github.com/JessyTsui/Claude-Code-Remote 、README blob cd172b2

- 移动端形态：用手机邮件客户端、Telegram 或 LINE 与本地服务交互；自有 iOS/Android 应用列为 TODO，不是手机 Web 终端。
- 连接：SMTP/IMAP、Telegram 或 LINE 消息/机器人；通知使用 Claude hooks，指令经 PTY/智能粘贴或 tmux 注入。
- OMP：面向 Claude Code hooks 的定制工具；其他 AI 工具列为未来支持；其 PTY 命令注入不能算作 OMP 通用终端透传。
- 备注：仓库简介称 Discord，README 将 Discord 列为 TODO。
- 边界自述：「Subagent notifications are disabled by default.」

## yuuichieguchi/claude-remote-approver — 73★，MIT，最新提交 2026-03-02

来源：https://github.com/yuuichieguchi/claude-remote-approver 、README blob 3df14bd、README L285-292

- 移动端形态：经第三方 ntfy 的 iOS 或 Android 应用接收通知并点审批按钮；不是独立终端或会话浏览器。
- 连接：Claude Code PermissionRequest hook 将请求 POST 至公共或自建 ntfy，手机操作经响应 topic 返回，hook 经 SSE 监听；超时回退本地 CLI。
- OMP：专门接入 Claude Code PermissionRequest hook；未见 OMP 适配或终端透传。
- 安全边界：公共 ntfy 的 topic 可被他人读到请求内容，端到端加密未核实；作者建议敏感场景自建。
- 边界自述：「The push notification shows the tool name and a brief summary, but not the full context of what Claude Code is doing.」
