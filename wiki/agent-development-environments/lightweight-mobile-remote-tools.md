# 轻量手机远程工具：9 个候选逐仓核实

> Sources: 各仓库 README/源码与 GitHub API, 2026-11-24; Herdr 产品关系与 core 接口官方摘录, 2026-11-12
> Raw: [轻量手机远程控制工具逐仓核实](../../raw/agent-development-environments/2026-11-24-lightweight-mobile-remote-tools.md); [herdr-app-core-mobile-boundaries](../../raw/herdr-plannotator/herdr-app-core-mobile-boundaries.md)
> Updated: 2026-11-24

## Overview

2026-11-24 用户质疑「轻量非臃肿的手机远程方案真的只有 Herdr 一个」。按「ADE / Agent IDE + 高星」检索会把候选集拉向正在膨胀成 IDE 全家桶的工作台；按「手机远程查看与控制电脑上本地 agent 会话」重新检索得到 9 个候选，全部经 GitHub API 与 README/源码逐仓核实（star 为 2026-11-24 快照）。本机既有的 herdr-core 路线（Tailscale SSH + `hc` + 手机 App）仍是唯一已部署方案；这 9 个都是未安装候选。

## 三个维度对比

| 工具 | ★ | license | 手机端形态 | 连接方式 | OMP 支持 |
|---|---|---|---|---|---|
| [Codeman](https://github.com/Ark0N/Codeman) | 847 | MIT | 手机浏览器 Web 终端 + 推送 | Tailscale Serve（安装器 `--tailscale`；服务绑回环） | 专门适配（docs/omp-integration.md；审批 Inbox 仅提醒，回答在终端） |
| [Harness Remote](https://github.com/giuliastro/harness-remote) | 450 | Apache-2.0 | 原生 Android + Web/PWA；通知内审批 | 直连本机 gateway，QR 一次性配对；作者建议 LAN/VPN | 专门适配（`omp acp` stdio JSON-RPC；递归读 `~/.omp/agent/sessions` 的 .jsonl） |
| [yepanywhere](https://github.com/kzahel/yepanywhere) | 559 | MIT | 手机浏览器 Web UI；原生应用未发布 | 直连 / 自带 E2E 中继 / Tailscale 等 VPN | 无（Claude Code、Codex + 实验性 pi 等；未列 OMP） |
| [Termly CLI](https://github.com/termly-dev/termly-cli) | 320 | MIT | 原生 Android（iOS 未证实） | 自带 WebSocket 中继，服务地址硬编码 | 注册表识别，未列 omp；底层 PTY |
| [ssh-to-go](https://github.com/awkto/ssh-to-go) | 65 | AGPL-3.0 | 手机浏览器 Web 终端（早期 Android 客户端） | 浏览器 → WebSocket → 自建服务 → SSH → tmux | 通用 tmux 透传 |
| [CodeRelay](https://github.com/ddevalco/CodeRelay) | 67 | MIT | 手机浏览器移动优先 Web UI | tailscale serve 仅向 tailnet 发布（访问令牌 + 配对令牌） | 无（Codex/OpenCode/Copilot ACP/Claude） |
| [better-remote-control](https://github.com/custardcream98/better-remote-control) | 0 | 声明 MIT，无 LICENSE 文件 | 手机浏览器 Web 终端 | Cloudflare Tunnel 默认；`--no-tunnel` 本地密码 | 通用 PTY（node-pty） |
| [Claude-Code-Remote](https://github.com/JessyTsui/Claude-Code-Remote) | 1290 | MIT | 邮件 / Telegram / LINE 交互；原生应用 TODO | SMTP/IMAP、Telegram/LINE 机器人 | 无（Claude Code hooks） |
| [claude-remote-approver](https://github.com/yuuichieguchi/claude-remote-approver) | 73 | MIT | ntfy 通知 + 审批按钮 | Claude Code hook → 公共/自建 ntfy（SSE 回传） | 无（PermissionRequest hook） |

按形态分四类：手机浏览器里的终端画面（Codeman、ssh-to-go、better-remote-control），手机浏览器里的定制 GUI（yepanywhere、CodeRelay），原生 App 或 PWA（Harness Remote、Termly），只做通知与审批转发的消息层（Claude-Code-Remote、claude-remote-approver）。

## 与 herdr-core 路线的差别

本机已部署的 herdr-core 路线见 [Herdr App、herdr-core 与手机](../herdr-plannotator/herdr-app-core-mobile.md)。这里两项事实分开说：官方文档确认手机 App 经 SSH 连接电脑上的 herdr-core，Tailscale 是受支持的选项而非必需；core 协议文档给出的远程接入方式是 SSH 到目标机后由 `hc connect` 以 stdin/stdout 承载协议（文档示例 `ssh box hc connect`），官方 App 内部是否正是调用 `hc connect` 未确认。agent 主动上报状态进 Inbox。这批候选的差别集中在三点：Herdr 的 Inbox 依赖 agent 主动上报状态，这批工具多数改为直读 JSONL/ACP 或干脆纯 PTY 透传，不解析状态；Codeman 与 Harness Remote 是这批里 OMP 适配最深的（会话恢复参数、`omp acp`）；纯透传类（ssh-to-go、better-remote-control、Termly）没有 Inbox 类聚合，只有终端画面加手机端输入辅助。

## 证据边界

- 9 个工具均未实机安装；Codeman 的 OMP 审批链路、Harness Remote 通知内审批的锁屏可操作性均未实测。
- Codeman 的 OMP 路径是否硬编码 `~/.omp`（自定义 `PI_CONFIG_DIR` 场景）未查；Termly 能否绕过注册表跑 OMP 未核实。
- Termly 官网称有 iOS 应用但 App Store 直链 404；yepanywhere 仓库简介 "no database" 与 README 的 SQLite 现状冲突，以 README 为准。
- better-remote-control 的 MIT 仅见于 README 与 package.json 声明，仓库无 LICENSE 文件。
- claude-remote-approver 走公共 ntfy 时请求内容可被 topic 订阅者读到；作者建议敏感场景自建。

## See Also

- [ADE 候选清单](ade-candidate-inventory.md)
- [ADE 选型方法](ade-selection-method.md)
- [Herdr App、herdr-core 与手机](../herdr-plannotator/herdr-app-core-mobile.md)
- [herdr-core 安装配置与 WSL2/Tailscale 手机接入](../herdr-plannotator/herdr-core-install-config-wsl2-tailscale.md)
