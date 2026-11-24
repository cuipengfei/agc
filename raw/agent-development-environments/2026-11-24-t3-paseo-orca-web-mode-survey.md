# T3 Code / Paseo / Orca：Web 模式功能与安装配置核实（2026-11-24）

> Source: 各仓官方文档与 gh api（URL 见各节）
> Collected: 2026-11-24
> Published: Unknown

背景：用户问三个工作台的 Web 模式功能清单、WSL 安装步骤、下载 URL、升级与配置。以下为核实摘录。

## 星数与 license（gh api 2026-11-24 实测）

```
pingdotgg/t3code license=MIT stars=76689
getpaseo/paseo license=NOASSERTION stars=24920
stablyai/orca license=MIT stars=135516
```

Paseo `gh api repos/getpaseo/paseo/license` 返回 `NOASSERTION name=LICENSE`（LICENSE 文件存在，GitHub 未识别出标准条款）。对比 10-18 快照：T3 28,245、Paseo 21,268、Orca 96,086。

## T3 Code

安装与升级（docs/user/install.md、managed-policy.md、Flavio Copes 深评）：
- 安装：`curl -fsSL https://t3.codes/install.sh | sh`（装进 ~/.local/bin；Windows 用 install.ps1）；npm 备选 npx t3@latest
- 运行：`t3`（起服务器并打开本机网页）；`t3 service install`（后台常驻）
- 升级：`t3 update`（managed-policy.md：「the desktop app, t3 update, and updates ...」属正常更新流；`feedUrl` 可指自家镜像）

远程与服务（remote-access.md、background-service.md，官方原文要点）：
- `t3 up --lan` / `t3 serve --lan` 把 `T3CODE_LAN=true` 写入 `~/.t3/service.env`（background-service.md：「Put custom environment variables in service.env under the service's T3 home directory」）；此后监听局域网与 Tailscale 地址，不监听公网
- `T3CODE_HOST` 任何值会替换该 LAN 设置；官方示例值 `127.0.0.1`
- 旧服务：`t3 up --no-lan` 关闭 LAN 监听
- `t3 pair --tailscale`、`t3 pair --scope orchestration:read --scope relay:read`（细粒度配对）
- provider 启用：install.md 要求在 WSL 安装并认证 provider CLI，再到 Settings → Providers 为该环境启用（第三方实测文佐证：「Open Settings → Providers, prepare each agent CLI and the authentication it uses」）
- 环境变量 `T3CODE_HOST`/`T3CODE_PORT`（第三方部署文档示例 0.0.0.0:3773）

Web 功能清单（docs/README.md 目录 + docs/user 十二页标题核实）：
- remote-access：T3 Connect（Cloudflare）、LAN 配对、scripts and agents、More machines with T3 Chat
- thread-sidebar：线程、置顶排序、折叠工作中线程（beta）、后台启动
- composer：富文本、附件、agent 工作时继续发、Queue messages offline on mobile（移动端专属）、自定义模型
- permission-modes、terminal（选 shell、历史）、source-control（review turn changes、GitHub/Forgejo/Gitea/GitLab 连接）
- usage：自定义模型价格、订阅限额追踪、CLIProxyAPI hub
- snap-shot（截图捕获）、html-renders（visual replies、MCP apps）、guest-links（分享线程、访客附件）
- voice-input、appearance、keybindings、managed-policy（企业）

## Paseo

安装与升级（paseo.sh/docs 与 docs/web-ui.md 全文直读）：
- 安装：`npm install -g @getpaseo/cli`（需 Node 24）；Docker `ghcr.io/getpaseo/paseo:latest`
- 运行：`paseo`（前台起 daemon，询问是否开 E2E 中继并打配对 QR）；`paseo daemon start`（后台）
- 升级：npm 更新路径官方认可（第三方部署文档：「installs @getpaseo/cli into that Node.js directory using npm, so the daemon's own self-update keeps working」）

Web UI 配置（docs/web-ui.md 原文）：
- 开关：`paseo daemon config set features.webUi.enabled true`（默认关）；或 `PASEO_WEB_UI_ENABLED=true paseo daemon run`；或 config.json 的 features.webUi.enabled
- 地址：daemon 默认 `127.0.0.1:6767`；绑外网 `paseo daemon config set daemon.listen 0.0.0.0:6767`
- 密码：绑非回环前 `paseo daemon set-password`（文档原话：「Anyone who can reach the listening address can use your agents. Before you bind beyond localhost, set a password and review your host allowlist.」）
- 白名单：`paseo daemon config set daemon.hostnames '[".example.com"]'`（DNS rebinding 防护）
- Tailscale 路径（文档原文）：`tailscale serve --bg http://127.0.0.1:6767`，得 `https://<your-machine>.<tailnet>.ts.net/`，只有 tailnet 设备能连
- 反代：`daemon.trustedProxies` 默认 loopback；`PASEO_TRUSTED_PROXIES` 逗号分隔覆盖
- 状态：`PASEO_HOME`（默认 ~/.paseo）
- 鉴权边界（文档原文）：「The web app loads before authentication, by design. The static UI files are served without the daemon password... API and WebSocket still require the password」

功能（getting-started、插件 reference、CHANGELOG）：
- 并行开发、worktree、diff、测试；编排（agent 建 worktree、启动别的 agent、跨 provider 对话；Paseo tools 默认关）
- Provider 原生含 OMP（另 Claude Code、Codex、OpenCode、Pi 等），ACP 目录扩展
- 插件系统：paseo-plugin.json + index.client.tsx + index.server.ts（public-docs/plugins/reference.md）
- 移动端动作：CHANGELOG 0.17.2「Added Archive workspace to the mobile workspace actions menu (#10507)」；0.12.0 代码块复制按钮
- 「400+ 社区插件」为第三方比较站数字（opensourcealternatives.to），官方目录未给总数

## Orca

安装与升级（orca.dev/docs/install、install.mdx、远程服务器文档）：
- 下载：AppImage 直链 `https://github.com/stablyai/orca/releases/latest/download/orca-linux.AppImage`；.deb/.rpm 在 releases 页按版本架构取名
- Linux 命令名 `orca-ide`（避开 GNOME 屏幕阅读器 orca）；AppImage 首次运行注册 `~/.local/bin/orca-ide`
- headless：`orca-ide serve --pairing-address <ip>`（remote-servers：serve 可无桌面窗口运行）
- 升级：AppImage 自更新（应用内点 Update 原地替换）；.deb/.rpm 不自动，更新提示给「Copy Install Command」粘贴执行，不自动提权；签名 apt/yum 仓库截至 2026-10 未建

Web 客户端边界（官方文档直读）：
- 服务器持有 projects、worktrees、terminals、tabs、provider accounts、agent sessions；客户端只是 UI
- 唯一明文 Web 限制（docs/ssh）：「Download Folder... This is a desktop-only action — the web client ...」
- 手机/Web 可用（docs/mobile）：听写（手机、桌面、配对 Web 客户端可同时，悬浮听写胶囊）、浏览器视图（Web/Mobile 模式，桌面最小化时手机开的标签继续加载）、终端 scrollback 补水（聊天视图读历史，Markdown 渲染）
- 未在浏览器维度确认（仅桌面 IDE 维度描述）：Monaco 编辑器、GPU 终端分屏、内嵌 Chromium 面板、VM 生命周期管理
