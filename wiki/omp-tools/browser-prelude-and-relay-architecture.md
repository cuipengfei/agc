# OMP browser prelude 与 relay 架构

> Sources: 本机安装包 `@oh-my-pi/pi-coding-agent` 18.12.6 源码, 2026-10-26; omp.sh/docs/web 与 browser-relay README, 2026-10-26; Chromium《UI Automation》与 Chrome for Developers 安全变更说明, 2026-10-26; 本机 WSL 与 Windows 回环实测, 2026-10-26
> Raw: [browser prelude 与 relay 源码摘录](../../raw/omp-tools/2026-10-26-omp-browser-prelude-and-relay-source.md); [Electron 与 Windows 无障碍文档摘录](../../raw/omp-tools/2026-10-26-electron-uia-and-windows-accessibility-docs.md); [WSL 回环与桌面能力实测](../../raw/wsl-windows/2026-10-26-wsl-mirrored-loopback-and-desktop-capability-probe.md)
> Updated: 2026-10-26

## Overview

OMP 的浏览器能力是注入 `eval` 内核的预置全局对象 `browser`，不是独立工具。它统一用 `puppeteer-core`（本机 25.3.0）驱动 Chromium 系浏览器，按八条顺位在四种后端之间选择：受管 Chromium、直连 CDP、浏览器扩展中继、终端内嵌 WebView。中继（relay）用一个本地服务假装成 Chrome 调试端口，让日常浏览器里的扩展代收 CDP 命令。整套设计的安全边界只有 loopback 绑定与操作系统账户隔离，token 只保护扩展接入的那一端。

## prelude 是什么

prelude 是 OMP 在启动 `eval` 内核时预先注入全局作用域的预置定义集合，`browser` 与 `computer` 都属于这一类。`browser` 在工具列表里没有单独名字，`browser.open()` 返回 `BrowserTab` 对象，后续用页面方法驱动。

启用条件：`browser.enabled` 为 true；当前会话启用 `eval` 工具且未把 `browser` 排除；内建 prelude 生效时，OMP 会过滤同类的 browser MCP server。源码默认 `browser.enabled`、`browser.relay` 为 false，`browser.headless` 为 true。

## 四种后端与八条路由

| 顺位 | 条件 | 后端 | 协议 | 浏览器进程归属 |
|---|---|---|---|---|
| 1 | `app.cdp_url` | Direct CDP Attach | CDP 直连 | 外部已开调试端口的 Chromium |
| 2 | `app.path` | Managed Chromium | CDP 子进程 | OMP 启动的指定可执行文件 |
| 3 | `app.relay: true` | Browser Relay | CDP 经本地中继与扩展 | 你日常使用的浏览器 |
| 4 | `browser.relay: true` 或 `PI_BROWSER_RELAY` | Browser Relay | 同上 | 同上 |
| 5 | `browser.cdpUrl` | Direct CDP Attach | CDP 直连 | 外部 Chromium |
| 6 | Tern 环境且 `browser.tern` 开启 | Tern | 终端自有 socket | 宿主终端内嵌 WebView |
| 7 | cmux 环境且 `browser.cmux` 开启 | cmux | 终端自有 socket | 宿主终端内嵌 WebView |
| 8 | 以上都不命中 | Managed Chromium | CDP 子进程 | `~/.omp/puppeteer` 缓存优先 |

默认新装状态落在第 8 条，即受管 Chromium，同样是 CDP。想要复用日常浏览器的登录态，才需要启用第 3 或第 4 条。

## relay 的端点与真实安全边界

中继服务只绑定 `127.0.0.1`，端口 9224。扩展未连接时 `/json/version` 返回 503，响应体是 `omp browser relay: extension not connected`。

| 端点 | token 校验 | 其它校验 |
|---|---|---|
| `WS /ext` | 有，不匹配返回 401 | 带 Origin 时必须为 `chrome-extension://` |
| `WS /cdp` | **无** | 只拒绝带 Origin 的请求 |
| `GET /json/version`、`GET /json/list` | **无** | 无 |

结论：`--token` 只阻止本机其它进程冒充扩展，不保护 `/cdp`。relay 运行期间，任何能连到 `127.0.0.1:9224` 的本地进程都能不带 token 驱动已附加的登录浏览器。源码注释也这么写。把 token 当作防本机其它进程的措施，会高估它实际保护的范围。

## 扩展来源与安装

扩展不在 Chrome 应用商店，源码包自带 `OMP Browser Relay` 的未打包文件。`omp browser-relay install` 默认写出到 `~/.omp/browser-relay/extension`，也可以 `--dir` 指定位置；随后在 `chrome://extensions` 打开开发者模式、加载已解压扩展。

扩展侧把连接地址固定为 `ws://127.0.0.1:${settings.port}/ext`，选项页只能改端口与 token，没有远端主机字段。这决定了它要求浏览器所在系统能访问自己的 loopback。

## 为什么日常浏览器必须走中继

Chrome 从 136 起改变了远程调试开关的行为，博客原文：

> These switches will no longer be respected if attempting to debug the default Chrome data directory.

同一段还要求配合一个指向非默认目录的 `--user-data-dir`。所以直连 CDP 只能配一个独立数据目录的新实例，里面没有你日常的会话；要驱动已登录的日常浏览器，中继是唯一不搬迁 profile 的路径。

## 标签页：新建、借用与生命周期

- 不传 `app.target` 时新建后台标签页（`active: false`），不抢占当前前台标签页。omp.sh 文档写的是“采用当前可见标签页”，与 18.12.6 源码不一致，以源码为准。
- 借用已有标签页要先 `browser.targets()` 查到目标，再传入 `app.target`；`tab.close()` 对借用的标签页只断开 `chrome.debugger` 附加关系，不关闭它。
- 受管 Chromium 的标签页在回合结束时冻结、空闲超时关闭；中继与直连的标签页不受这两项影响。
- 驱动中的标签页归入青色 `omp` 标签组。

## 跨系统文件收发的实际行为

上传有内置回退：先通过 CDP `DOM.setFileInputFiles` 送路径，失败时在 OMP 侧读文件字节，用页面内 `DataTransfer` 注入 `<input type="file">`。

下载的目录由 OMP 指定，源码写的是 `path.join(os.tmpdir(), "omp-downloads-${tabId}")`，通过 CDP `Browser.setDownloadBehavior` 下发。受管 Chromium 走 `perTab: true`，用 `allowAndName`，下载完成后由 OMP 把 GUID 命名的文件移入目标名；中继与直连走 `perTab: false`，用 `allow`，不做这一步搬移，直接采用事件回报的路径。

当浏览器是 Windows 进程而 OMP 在 WSL 内时，这个 POSIX 目录传给 Windows 浏览器后的实际写入位置**尚未实测**；首次使用请先跑一次 `waitForDownload` 并在两侧核对文件落点。

## 认证与企业身份发生的位置

在 CDP 与中继路径下，OMP 只发送导航与读取指令，真正的 TCP/TLS 连接、`Authorization: Negotiate` 生成、Kerberos 票据获取、系统证书握手与 Cookie 携带全部发生在浏览器进程所在的操作系统里。因此：

| 路径 | 请求发起方 | 能否用 Windows 域凭据 |
|---|---|---|
| 中继 → Windows 浏览器 | Windows 浏览器进程 | 能，按浏览器原有配置 |
| 直连 → Windows 浏览器 | Windows 浏览器进程 | 能，但独立 profile 没有日常 Cookie |
| 受管 Chromium（WSL 内） | WSL 内 Linux 进程 | 不能复用 Windows SSPI |
| `read` / `web_search` | WSL 内进程 | 不能 |

两条边界要记住：Chrome 只对列入 `AuthServerAllowlist` 的域名自动发送 Negotiate 凭据；触发操作系统原生对话框的认证（证书选择、Hello、系统凭据框）CDP 无法操作，需要人工处理。

## WSL + Windows 的接线与实测

本机 WSL 为 `mirrored` 网络模式，双向回环已实测：

| 方向 | 方法 | 结果 |
|---|---|---|
| Windows → WSL | WSL 起 `omp browser-relay serve`，Windows 请求 `http://127.0.0.1:9224/json/version` | 503，正文为中继未连接扩展的提示 |
| WSL → Windows | Windows 在 `127.0.0.1:18082` 监听，WSL 内 `curl` | 返回 `win-ok` |

这证明网络路径通畅，**不代表扩展已接通**：`/ext` 的 WebSocket 握手与页面打开仍待实测，判断依据是扩展图标显示已连接且 `browser.open()` 成功。

接线步骤：

```bash
omp browser-relay install                       # 默认目录，随 OMP 自动更新
omp browser-relay install --dir /mnt/c/Users/39764/omp-browser-relay-extension
omp config set browser.enabled true
omp config set browser.relay true
```

Windows 上 Chrome 为 156.0.8078.47、Edge 为 156.0.4314.42；注册表里未发现 Chrome 本地策略项。若 Chrome 拒绝从 `\\wsl.localhost` 加载未打包扩展，用 `--dir` 写到 Windows 原生目录。

## 与 API、CLI、联网搜索的选型顺位

| 顺位 | 手段 | 理由 |
|---|---|---|
| 1 | 官方 API 或 SDK | 结构化、便于复查，字段有版本承诺；结果仍取决于服务端状态 |
| 2 | 带机器可读输出的命令行工具 | 行为确定、可脚本化 |
| 3 | 文档化的 HTTP 接口 | 比驱动界面省得多 |
| 4 | `browser` | 界面会改版，选择器会失效，但比像素路径便宜 |
| 5 | `computer` | 最贵、最不稳，还占用你的屏幕与键鼠 |

选界面而非 API 的正当理由：你本身获准通过该界面操作、且所需能力只存在于界面里（登录态复用、没有公开接口的后台页、一次性导出、依赖渲染结果的检查、正在开发的前端本身）。配额与付费档位不构成绕过接口的理由。

`web_search` 与 `browser` 的分界在于身份与交互：搜索工具跑在外部服务上，拿不到你的 Cookie、企业 SSO 与内网地址；`browser` 在你的浏览器里执行，能带登录态、能多步交互、能读取渲染后的 DOM。

## See Also

- [OMP computer prelude 与桌面自动化](computer-prelude-desktop-automation.md)
- [OMP 内建工具全集、会话暴露边界与内部地址空间](builtin-tools-and-internal-urls.md)
- [OMP 配置语义手册](../omp-config/config-semantics.md)
