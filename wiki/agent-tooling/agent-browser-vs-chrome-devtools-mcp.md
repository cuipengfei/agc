# agent-browser 与 chrome-devtools MCP：能力、生态位与接入边界

> Sources: agent-browser README（vercel-labs，Unknown）；agent-browser CDP Mode（agent-browser.dev，Unknown）；chrome-devtools-mcp README 与 tool reference（ChromeDevTools，Unknown）；本机实测（2026-11-07）
> Raw: [agent-browser 与 chrome-devtools MCP 源材料](../../raw/agent-tooling/agent-browser-and-chrome-devtools-mcp-sources.md)；[WSL mirrored 回环与桌面能力实测](../../raw/wsl-windows/2026-10-26-wsl-mirrored-loopback-and-desktop-capability-probe.md)
> Updated: 2026-11-12

## Overview

agent-browser（Vercel Labs，Rust 原生 CLI）与 chrome-devtools-mcp（ChromeDevTools 官方）构建在同一套 Chrome DevTools Protocol 上，各自实现了「无障碍树文本快照 + 元素标识符」的页面循环，读取模型同级。差别集中在周边能力：agent-browser 的强项是委托浏览的安全门、人工观察、留证与会话生命周期，外加多引擎与云端浏览器；chrome-devtools-mcp 的强项是 DevTools 面板级深调试（性能 trace、堆快照、logpoints、CSS、Lighthouse）与各类别专项工具。本机现状：chrome-devtools-mcp 1.12.0 已装但 OMP 条目关闭、指向的 9333 端口检查时无监听；agent-browser 未安装。

## 选择结论

委托 agent 做日常浏览、登录态操作与端到端验证：装 agent-browser。做性能、内存、CSS、Lighthouse 这类面板级深调试：启用 chrome-devtools-mcp。两者可并存，同一会话内不冲突。

## 共享模型

**协议与循环。**agent-browser 的 README 写明 daemon「controls the browser over the Chrome DevTools Protocol」；chrome-devtools-mcp 写明「Uses puppeteer to automate actions in Chrome and automatically wait for action results」，底层同样是 CDP 通道。

**读取。**agent-browser 的 `snapshot` 返回 compact text，每个元素带 `@e1` 形式 ref；chrome-devtools-mcp 的 `take_snapshot` 返回 a11y tree 文本快照，每元素带 uid，且写明 "Prefer taking a snapshot over taking a screenshot"。快照过期语义一致：前者要求「After navigation or a DOM change, take a new snapshot before using refs again」，后者写明「Always use the latest snapshot」。

**形态。**双方都有 CLI 与 MCP 两种形态：agent-browser 的 `agent-browser mcp` 起 stdio server；chrome-devtools-mcp 与 `chrome-devtools` CLI 同包发布。

**浏览器来源**双方各有对应物：

| 方向 | agent-browser | chrome-devtools-mcp |
| --- | --- | --- |
| 打包自带 | `install` 下载 Chrome for Testing，Linux 加 `--with-deps` 连系统库 | 默认在工具首次调用时自动启动浏览器 |
| 外接调试端口 | `agent-browser connect 9222` 或 `--cdp 9222`；端口未开时最多等 2 秒后失败 | `--browserUrl http://127.0.0.1:9222`，或 `--wsEndpoint` 加 `--wsHeaders` |
| 连接日常 Chrome | `--auto-connect`：读取 `DevToolsActivePort`、探测 9222/9229；Chrome 144+ 首次连接弹批准框，等 20 秒 | `--autoConnect`：Chrome 144+，须在 `chrome://inspect/#remote-debugging` 开启远程调试 |
| 云端与远端 | `-p` 直接指五家 provider；`--cdp` 也接受 WebSocket URL | `--wsEndpoint` 连 WebSocket 端点 |

## agent-browser 独有优势

| 区域 | 内容 | chrome-devtools-mcp 对应情况 |
| --- | --- | --- |
| 委托安全 | auth vault、domain allowlists、action policies，加上 `confirm`/`deny` 审批命令 | 只有 `--allowedUrlPattern`/`--blockedUrlPattern`、`--redactNetworkHeaders`、`--javascriptEvaluation` 开关与 `--filesystemRoot` 限制 |
| 留证 | `pdf`、`record`、`diff` 命令 | `take_screenshot` 与 `screencast` 视频录屏；无 pdf、diff 工具 |
| 人工观察 | `stream` 与 `dashboard` 实时面 | `screencast_start` 录屏属事后取证 |
| 会话生命周期 | 独立 daemon 起于首条命令；每 `--session` 独立 daemon 与浏览器；默认一小时无命令退出 headless browser，配置 session persistence 时先保存状态 | server 生命周期挂在宿主进程上 |
| 多引擎 | `--engine` 选 Lightpanda 或 Obscura；iOS Simulator 里驱动 Mobile Safari | 仅官方支持 Chrome 与 Chrome for Testing |
| 云端浏览器 | Browserbase、Browserless、Browser Use、Kernel、AgentCore 五家 provider | 仅 WebSocket 远端连接 |
| 安装打包 | `install --with-deps` 一条命令装齐浏览器与 Linux 系统库；`doctor`/`upgrade` 维护 | 依赖已有 Node LTS 与 Chrome |
| agent 用法说明 | CLI 发版即发同版 skill；skills.sh 安装的引导桩加载 `agent-browser skills get core`，说明与手上 CLI 版本一致 | 七个 skill 配套（chrome-devtools、chrome-devtools-cli、a11y-debugging、cookie-debugging、debug-optimize-lcp、memory-leak-debugging、troubleshooting），升级包后需手动重拷 |
| 失败语义 | 点击在目标被隐藏、禁用、滚出视口或被遮挡时直接失败并说明原因 | 文档只写自动等待动作结果，遮挡时的具体报错形态未载 |

## chrome-devtools-mcp 独有优势

| 区域 | 内容 | agent-browser 对应情况 |
| --- | --- | --- |
| 性能调试 | DevTools trace、Insight 逐项分析、CrUX 真实用户数据（`--no-performance-crux` 可关） | `vitals`、`profiler`、`react` 命令，深度不及 |
| 内存调试 | 14 个堆快照工具（对比、retainer、dominator、detached 检索），`--memoryDebugging` 激活 | 无 |
| 页面内调试 | `set_logpoints`、source-mapped console、`get_css_styles` 级联检查、`lighthouse_audit` | `console`/`errors`/`network`/`eval`，检查面浅一档 |
| 表单批量 | `fill_form` 一次填多元素，官方描述减少轮数 | 逐项 `fill` |
| 上下文隔离 | `new_page` 的 `isolatedContext` 让不同上下文 cookie/storage 完全隔离，适合洁净登录态测试 | 有多 tab，无按名隔离上下文 |
| 精细模拟 | `emulate` 覆盖色系、CPU/网络节流、强制色系、对比度、reduced motion、地理位置、UA、视口 | 有设备模拟，颗粒度不及 |
| 专项类别 | 扩展（`--categoryExtensions`）、PWA（`--categoryPwa`，仅 pipe 连接支持）、WebMCP（`--categoryExperimentalWebmcp`，需 Chrome 150+ 开旗标）、第三方工具发现、WebAuthn 虚拟认证器 | 无对应 |
| service worker | `evaluate_script` 可经 `serviceWorkerId` 在 worker 内求值 | 无对应 |
| 插件一体 | Claude Code `/plugin marketplace add ChromeDevTools/chrome-devtools-mcp` 一条命令装 server 与全部 skill | 需分别接入 |

## 本机状态与启用路径

2026-11-07 23:38 时点实测：

| 项目 | 状态 |
| --- | --- |
| chrome-devtools-mcp | 1.12.0，bun 全局安装，agc 仓库清单同步一致 |
| OMP `mcp.json` 条目 | `enabled: false`；`--browserUrl http://127.0.0.1:9333`；带 `--no-usage-statistics` 与 `--no-performance-crux` |
| 9333/9222/9229 | 检查时均无监听；`DevToolsActivePort` 文件不存在 |
| agent-browser | 未安装 |
| 项目级 `.mcp.json` | 不存在 |
| `config.yml` browser 段 | `enabled: false`（OMP 自带 prelude 关闭） |

chrome-devtools-mcp 的启用两条路：

1. 从 mcp.json 条目里去掉 `--browserUrl` 参数并恢复启用：工具首次被调用时由 server 自动启动浏览器（README 原文见 raw）。
2. 保留 `--browserUrl http://127.0.0.1:9333`：先在任一侧起一个带 `--remote-debugging-port` 的独立配置 Chrome 指向该端口。

WSL 连接 Windows 侧 Chrome 的可行性有两次实测支持：`wslinfo --networking-mode` 输出 `mirrored`（2026-11-07 现录，raw §4；2026-10-26 Windows 18082 监听、WSL `curl` 返回 `win-ok`，见 Raw 链接的 wsl-windows raw）。agent-browser 走 `connect <端口>`；两工具的 auto-connect 都要求 Chrome 144+ 与首次批准框（agent-browser 等满 20 秒后失败退出）。

## 待验证边界

- chrome-devtools-mcp 被遮挡时的具体失败语义：文档未载，按 README 只知自动等待动作结果。
- agent-browser 全套流程未实测（本机未安装，装法与 `install --with-deps` 均按 README 记录）。
- 两工具的 auto-connect 从 WSL 直接发现 Windows 侧默认配置目录的可行性未验证。
- 9333 端口无监听按本次测量记录，不据此推断历史状态。
- usage statistics 与 CrUX 发送默认开启，本机条目已分别用旗标关闭。

## See Also

- [OMP browser prelude 与 relay 架构](../omp-tools/browser-prelude-and-relay-architecture.md)：OMP 自带浏览器通道的架构，Chrome 136 限制与扩展来源的上下文证据同在此文。
- [ABKit：面向 agent 的 WebKit 浏览器引擎](abkit-agent-browser-engine.md) — 同一问题在引擎层的解法：自有 WebKit 与 ABHost 协议
