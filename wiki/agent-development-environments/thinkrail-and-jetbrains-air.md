# ThinkRail 与 JetBrains 的 ADE 版图

> Sources: JetBrains (ThinkRail README/官网/规格，2026-10-26; Fleet 博客，2025-12-08; Air 博客，2026-03; air.dev，2026-10-26; Air 快速入门，2026-10-26; Gateway/IDEA 文档，2026-10-26; Projector 页，2026-10-26; CodeCanvas 博客，2025-10); 用户终端输出，2026-10-26
> Raw: [ThinkRail 摘录](../../raw/agent-development-environments/2026-10-26-thinkrail-readme-specs-and-install.md); [JetBrains Air 版图摘录](../../raw/agent-development-environments/2026-10-26-jetbrains-air-and-ade-landscape.md)
> Updated: 2026-10-26

## Overview

ThinkRail 是 JetBrains 孵化器（InnovationHub）下的开源 agentic IDE（Apache-2.0，2026-07-08 公开，稳定版 0.2.0 于 2026-10-18 发布），围绕上游 Pi 编码代理（`@earendil-works/pi-coding-agent`）加一层 IDE 外壳。JetBrains 的主线 ADE 是 2026-03 公开预览的 Air（构建在已停止分发的 Fleet 平台上）。对"WSL 里运行、Windows 浏览器打开"这一约束，JetBrains 产品线里只有 ThinkRail 的自托管浏览器模式满足；Air 的浏览器模式绑定 JetBrains 云端运行。

## ThinkRail 是什么

- 定位：agentic IDE。项目切成工作区（git worktree），每个工作区可同时跑多个 pi 会话；带 Monaco 编辑器、实时 diff、PTY 终端、diff 与文件行评论（评论收集为结构化上下文回传聊天）、spec 图（`spec_*` 工具维护互相链接的 `SPEC.md`）、共享计划（每步可单独提交与审查）、用自带 `gh` 的 PR 流程。
- 设计原则：ThinkRail 自己不做 agent 循环、不拼装提示词；模型、skills、扩展、上下文压缩、费用统计、会话状态全部由 pi 负责。仓库用 spec-first 方式开发：顶层 `goal-and-requirements.md` 与 `architecture.md` 为权威规格，每个模块旁置 `SPEC.md`。
- 引擎关系：依赖上游 Pi（badlogic/pi-mono 被 Earendil 收购后迁至 earendil-works/pi）。OMP 用的 `@oh-my-pi/pi-coding-agent` 是同一血统的下游深度分叉（2026-03-22 后，Bun 运行时，另加约 8 万行 Rust 核心）；状态目录 `~/.omp` 与 `~/.pi` 分开。从 OMP 迁移时认证与 MCP 配置需检查迁移，Pi 扩展逐项核对兼容性。详见 [Pi/OMP 兼容与身份链](../agent-harness/sol-pi-omp-compat.md)。

## 形态与架构

- 两种入口、同一内核：桌面应用（Electrobun；macOS Apple Silicon、Windows x64、Linux x64/ARM64；Linux 需 glibc 2.38+、GTK 3、WebKitGTK 4.1 等，官方写 Ubuntu 24.04 起）；`thinkrail` 命令行在本机启动 engine host，用浏览器打开同一套界面。无 TUI；无常驻 headless serve（规格列为后续工作）。
- 内部三层：`apps/cli`、`apps/desktop`（Electrobun）、`packages/server`（engine host，Bun HTTP+WS，每个聊天一个进程内 pi 会话）、`packages/contracts`（带类型带版本的协议）、`apps/web`（React 19、Zustand、Tailwind v4）、`packages/shared`；UI 只依赖协议。
- 代码主体为 TypeScript（约 10.2MB）；Bun 1.4.4；Node.js ≥ 22.19；签名状态：Windows 已签名、macOS CLI 已签名未公证、Linux 未签名。
- host 进程内跑 pi：一个致命故障会让整个应用退出（文档承认的取舍）。

## 安装与命令行为

- 安装：`curl -fsSL https://raw.githubusercontent.com/JetBrains/thinkrail/main/install.sh | bash`，安装到 `~/.local/bin/thinkrail`，会修改 shell 启动文件（`--no-modify-path` 跳过），SHA256 校验通过后完成安装；支持 Linux x64/ARM64、macOS Apple Silicon、Windows（PowerShell 走 `install.ps1`），无 Intel macOS 包。v0.2.0 资产：CLI 约 140 MB，桌面 tar.gz 约 46 MB。
- 主命令默认监听 `localhost:24242`，端口被占用自动切换到空闲端口；`--no-open` 只启动服务并打印地址；`--verbose` 日志写终端与 `~/.thinkrail/logs`。
- `update` 无版本比较：帮助原文 "re-downloads + installs the latest build for your channel"，实测运行两次均完整重装 0.2.0。新改动先出 nightly（0.3.0-nightly.6 已于 2026-10-25 发布）；`--channel` 更换通道、`--version` 锁定版本。
- `uninstall` 删除可执行文件、PATH 条目、安装元数据与暂存缓存；默认保留 `~/.thinkrail`；`--remove-data` 连项目、工作区与其管理的 git worktree（含未提交改动）一并删除；`~/.pi` 任何方式都不触碰；stdin 非终端时必须加 `-y`。
- 许可证与账号：Apache-2.0，无许可证密钥、无账号体系；模型访问走 JetBrains AI 登录或自己的 provider 凭据（pi 认证）。
- 遥测：基础使用事件与崩溃报告默认始终发送（绑定随机安装 ID）；`--no-analytics`/`THINKRAIL_NO_ANALYTICS=1` 只关闭本次额外数据；永久开关在 Settings → Privacy。

## 安全边界

- 浏览器模式无应用层登录，谁能连 host 由网络层决定。监听保持默认 `localhost`；Windows 浏览器连不上时先按顺序检查：`curl -i http://localhost:24242/health` 确认服务存活（端口可能已上移）→ WSL2 `.wslconfig` 的 `localhostForwarding`（改动后 `wsl --shutdown` 生效）→ Windows 防火墙与代理。远程访问用 SSH 端口转发（`ssh -L 24242:localhost:24242 user@host`），host 侧保持回环；把 `--host` 放开到 `0.0.0.0` 等于向所有可路由设备暴露无登录界面（mirrored 网络模式下可达范围可能是整个局域网）。

## 本机 WSL 实测（2026-10-26）

- 环境：Ubuntu 26.04.1、glibc 2.43、x86_64、git 已安装、WSLg 存在。CLI 路径满足全部前提，已实际安装 0.2.0。
- 桌面路径缺 `libwebkit2gtk-4.1-0` 与 `libayatana-appindicator3-1`（apt 有候选 2.52.6 与 0.5.94）；WSL 不在官方支持列表，桌面版在 WSLg 下的显示效果未验证。

## JetBrains 的 ADE 版图（2026-10-26）

- **Air**：主线 ADE，2026-03 公开预览，预览期免费，构建在 Fleet 平台上。多个 AI agent 并发运行任务：Claude Agent、OpenAI Codex、Gemini CLI、Junie 开箱，外加 ACP 注册表任意 agent（产品页另列 Copilot、OpenCode）；Air Gateway 从命令行纳入终端 agent。运行环境三种：Local Workspace / Git Worktree / Docker。审查带 diff 行评论回传与"Review with agent"第二意见。桌面应用 macOS/Windows/Linux（Linux 安装脚本 `curl -fsSL https://jb.gg/air-install.sh | sh` 或 Toolbox）；浏览器模式 air.jetbrains.cloud 绑定云端运行，正在逐步放开；BYOK 可带 base URL，云任务消耗 JetBrains 额度。
- **Fleet**：2025-12-08 官宣、2025-12-22 起停止下载与更新；已下载者可继续用，依赖服务器端的功能（含 AI Assistant）可能逐渐失效。
- **Gateway + 传统 IDE**：官方支持 WSL2 作为后端（backend IDE 下载进 WSL，项目在原生 JetBrains Client 窗口打开；IntelliJ IDEA 2025.3 起可同窗口）；远程开发功能包含在付费 IDE 订阅。Dev Environments 另可连接 Ona、Google Cloud、GitHub Codespaces、Amazon CodeCatalyst、Coder。
- **Projector**：独立版开发已暂停、官方不再推荐；Projector 技术仍作为 Gateway 的一部分存在，但 Gateway 输出原生客户端窗口，不提供浏览器入口。
- **CodeCanvas**：2025-10 官宣停止当前形态的开发，现有实例可使用至 2026-03-31，此后公共产物停止提供。
- **Junie**：驻留在 IDE、终端（Junie CLI）与 CI 中的编码 agent，本身不是工作台。

## 与 Herdr 的对比与选型结论

按本仓库 ADE 调研的口径（管理多个并发 coding agent 的工作台，准入见 [ADE 候选清单](ade-candidate-inventory.md)）：

- Herdr 管理任意 CLI agent 进程（实测 24 种，含 OMP）、本地与 SSH 机器合一、TUI/CLI/SSH 单 Rust 二进制、45.8k stars；ThinkRail 只有上游 Pi 一种引擎、无机器维度、约 1.2k stars。
- ThinkRail 更强的是 Herdr 不做的部分：Monaco 编辑器、diff 行评论回传、worktree 创建与归架、spec 图、每步单独提交与审查、自带 `gh` 的 PR 流程。
- 结论（推断）：不值得用 ThinkRail 替换 Herdr；ThinkRail 适合作为上游 Pi 用户的图形审查入口，或 OMP 用户试用上游 Pi 时的界面。Air 的 agent 覆盖面与 Herdr 正面重叠，且走开放 ACP；OMP 存在经 ACP 接入 Air 的可能（本仓库已记录 bb 用 `acp-omp`、Paseo 内置 `omp` provider），此路径未验证。
- 约束矩阵（WSL 运行 + Windows 浏览器 GUI）：ThinkRail 满足（`--no-open` 后 Windows 浏览器打开）；Air 桌面应用在 WSLg 下的显示未验证，浏览器模式是云端托管；Gateway 是原生窗口且需订阅；Projector 独立版已暂停。

## 证据边界

- ThinkRail 部分已在本机 WSL 实际安装并观察 CLI 帮助与 `update` 行为（用户终端输出）；界面操作、多仓库并行、浏览器会话未实测。
- Air 未安装实测；其 Linux/Windows 支持以官方快速入门为准（2026-03 博客写 "Windows and Linux versions coming soon"，现已过期）。OMP 经 ACP 接入 Air、Air 桌面应用在 WSLg 下的显示、`--channel` 是否持久化，均未验证。
- CodeCanvas 停止开发一节转自官方公告（advisor 提供 URL，未直接抓取全文）。
- ThinkRail stars 取官方页 1.2k 显示值，未直读精确数；pushed_at 未直读，以 2026-10-25 发布的 nightly 0.3.0-nightly.6 作为活跃证据。

## See Also

- [ADE 候选清单](ade-candidate-inventory.md)
- [ADE 选型方法](ade-selection-method.md)
- [Pi/OMP 兼容与身份链](../agent-harness/sol-pi-omp-compat.md)
- [Herdr 工具链参考](../herdr-plannotator/toolchain-reference.md)
