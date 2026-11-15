# T3 Code — 运行形态、远程访问与 ACP provider 文档摘录（2026-11-15）

> Source: https://github.com/pingdotgg/t3code (docs/user/install.md, docs/user/remote-access.md, docs/user/background-service.md, docs/internals/overview.md, docs/user/providers-acp.md, README.md, main 分支)
> Collected: 2026-11-15
> Published: 2026-11-15（docs 当前版）

以下内容均为 GitHub main 分支文档原文摘录，按主题截取，保留原始措辞；省略号为截断标记。

## install.md — server 与网页

- 「打开 Terminal（或终端模拟器）并运行：`curl -fsSL https://t3.codes/install.sh | bash`」
- 「启动 server：`t3`」「您的浏览器会自动打开 http://localhost:3000 载入界面」
- 「t3 位于您的 PATH，并从任何目录启动 server」
- 「T3 Code Desktop 捆绑了 T3 server — 它随应用自动启动」
- 「可选：安装为后台服务」「在登录时启动并常驻运行：`t3 service install`」
- 「验证：`t3 doctor`」「我们的网站有时会使用与预期 URL 略有不同的域——目前包括 app.t3.codes 和 t3code.app」

## remote-access.md — 本地/局域网/Connect 与手机

- 「**仅本地** — 仅在此机器上运行。配置不需要登录，工作完全离线。」
- 「**本地网络** — 配置不需要登录，但工作区共享需要配置 T3 Connect」
- 「运行向导：`t3 up`」— 选项包括 Local Server / LAN Sharing / T3 Connect
- 「**T3 Connect** (默认)：自动配置 Cloudflare 隧道 → 无需打开防火墙端口，安全，且对您的路由器零配置」
- 「直接暴露：在 `/etc/t3/service.env` 中设置 `T3_SERVE_MODE=lan`、`T3_SERVE_PORT=<port>`、`T3_SERVE_TOKEN=<token>`」「只有在能接受风险时才选择此方式 — 无 TLS、无访问日志」
- 「打开 https://app.t3.codes，登录（如果需要），添加您的服务器（名称 + URL），点击 Connect」
- 「托管 Web 需要 HTTPS」；「自签名证书…会静默失败」；「自托管示例（Caddy）: app.t3.codes { reverse_proxy <REDACTED>:3212 }」
- 「**T3 Connect 云隧道** — 对用户免费，无带宽限制」「T3 应用程序作为 *服务器* 连接到 T3 Connect，以实现远程 *客户端* 访问」
- 手机：「在 iPhone 或 Android 上打开 **T3 Code** 应用」「**通过电脑配对** — 选择此选项」「在桌面应用中，转到 Settings → Mobile 配对 — 或者在 Web 中，点击用户菜单 → 配对新设备。一个一次性配对代码会显示约 2 分钟」「此配对链接使手机能够在**本地网络上**找到并连接到您的 T3 server — **不需要 T3 Connect**」（原文加粗）
- 「从任何地方的**任何设备**访问您的 T3 环境」「需要 T3 Connect（或 LAN）」

## background-service.md — 服务化

- 「服务文件位置: `/etc/systemd/system/t3.service`」；「环境文件: `/etc/t3/service.env`」；「它拥有 `~/.t3/userdata` 数据库的所有权」
- 「在 macOS 上，服务由 **launchd** 管理」；「在 Windows 上…计划任务 + 后台进程」

## internals/overview.md — 架构

- 「架构概览：T3 Code 是一个用于 coding agent 的控制平面。**T3 server** 拥有该环境…桌面应用和 Web 客户端通过**已认证的 RPC** 控制 server」「Threads 永远不会在客户端机器上运行 — agent、文件系统和工具都留在 T3 server 所在的环境中。客户端是纯 UI。」
- 「**使用场景 1**：您在台式机上工作，偶尔想在沙发上用 iPad 或手机查看进度的『检查状态』情况。」
- 「**使用场景 2**：您想从旅行用的笔记本电脑（或咖啡馆的电脑）上远程驱动您家中/办公室里强大的台式机。」
- 「**使用场景 3**：一个 power user 运行一个专用的 headless Linux 盒子…您在家里/办公室的桌面上打开应用作为『指挥中心』」
- 「每个客户端都进行身份验证…配对代码…为每个客户端生成一个唯一的 token」（由英文版回译核对）

## providers-acp.md — 内置 provider 与 ACP

- 「**内置提供商** — Agent Client Protocol (ACP) 代理：Codex、Claude Code、Cursor CLI、Grok Build、Kiro、OpenCode、Antigravity、Pi、Muse Code、fx」
- 「**ACP Registry** — 浏览并安装兼容 ACP 的 agent（例如 Gemini CLI、Qwen Code）」
- 「**自定义 ACP** — 通过命令连接任何与 ACP 兼容的 agent」
- 「本地 ACP 命令：Settings → Providers → Add Provider → Show more → Local ACP command。可执行文件和逐行参数（不支持 shell 语法）」「工作目录…临时目录…（ACP agent 无法回滚自己的对话）」
- 「当 checkpoint 回滚经过 ACP agent 的对话时，T3 会打开一个 **new ACP session**」
- 「**未提供 subagent 谱系** — 目前没有 subagent 层级结构的通用标准」「没有标准的附件上传」
- 「**自定义 permission schema** — 您可以提供自己的权限模式…T3 会渲染并强制执行它」

## README.md — 定位

- 「T3 Code is an open-source **control plane for coding agents**」
- 「🎯 **Goal**: Ship features faster by running **multiple coding agents in parallel** with oversight」

## 代码检索记录

- 查询：GitHub code search `repo:pingdotgg/t3code "oh-my-pi"`，2026-11-15 执行，0 结果。T3 无 OMP 内置支持。
