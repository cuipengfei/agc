# OMP browser prelude 与 browser-relay 源码摘录

> Source: 本机安装包 `@oh-my-pi/pi-coding-agent` 18.12.6（`~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/`）；omp.sh/docs/web；`packages/browser-relay/README.md`；Chrome for Developers 博客《Changes to remote debugging switches to improve security》
> Collected: 2026-10-26
> Published: Unknown

## 包与版本

`package.json` 实测：

- `version`: 18.12.6
- `dependencies.puppeteer-core`: 25.3.0

## prelude 定位

`src/prompts/tools/browser.md` 的现象：browser 没有独立工具名，声明为 eval 的预置全局对象，`browser.open()` 返回 `BrowserTab`。`src/tools/browser.ts` 中的注册描述把它作为 eval prelude 暴露给 JavaScript 与 Python 内核。

## 后端选择（结构摘要）

`src/tools/browser.ts` 的 `resolveBrowserKind`（约 154-224 行）按固定顺位判断，命中即停止：

1. 调用参数 `app.cdp_url` → Direct CDP Attach
2. 调用参数 `app.path` → Managed Chromium
3. 调用参数 `app.relay: true` → Browser Relay
4. 全局配置 `browser.relay: true`（或 `PI_BROWSER_RELAY`） → Browser Relay
5. 全局配置 `browser.cdpUrl` → Direct CDP Attach
6. Tern 环境（`TERN_PANE`、`TERN_PANE_SOCKET`）且 `browser.tern` 开启 → Tern
7. cmux 环境（`CMUX_SOCKET_PATH`）且 `browser.cmux` 开启 → cmux
8. 以上都不命中 → Managed Chromium（`~/.omp/puppeteer` 缓存优先）

## 设置默认值

`src/tools/browser/settings.ts`：

- `browser.enabled` 默认 false
- `browser.relay` 默认 false
- `browser.headless` 默认 true

本机 `omp config get` 实测：`browser.enabled=false`、`browser.relay=false`、`browser.headless=true`、`browser.cdpUrl` 未设置；当前会话 `typeof browser === "undefined"`。

## relay 服务端与鉴权

`src/tools/browser/relay/server.ts`（约 96-116 行）的实际行为：

| 端点 | token 校验 | 其它校验 |
|---|---|---|
| `WS /ext` | 有：`opts.token && url.searchParams.get("token") !== opts.token` → 401 | 带 Origin 时必须以 `chrome-extension://` 开头 |
| `WS /cdp` | 无 | 只拒绝带 `Origin` 的请求 |
| `GET /json/version`、`GET /json/list` | 无 | 无 |

服务只绑定 `127.0.0.1`，端口 9224。扩展未连接时 `/json/version` 返回 503，响应体为 `omp browser relay: extension not connected`。

源码注释本身写明：能连到该端口的进程就能驱动用户的登录浏览器；token 的注释限定为“扩展必须携带的共享密钥”。

## 扩展侧连接地址

`src/tools/browser/relay/extension-assets/background.js.txt:246` 把连接地址固定为：

`ws://127.0.0.1:${settings.port}/ext`

扩展选项页只允许改端口与 token，没有远端主机字段。扩展清单名为 `OMP Browser Relay`，以未打包形式从本地目录加载；`omp browser-relay install` 默认写出到 `~/.omp/browser-relay/extension`。

## 标签页生命周期（结构摘要）

`src/tools/browser/tab-supervisor.ts`：

- 不传 `app.target` 时新建后台标签页（`active: false`），不抢占前台标签页。
- 传入 `app.target` 时借用已有标签页；`tab.close()` 只断开 `chrome.debugger` 附加关系，不关闭该标签页。
- Managed Chromium 的标签页在回合结束时冻结、空闲超时关闭；Relay 与 Direct CDP 的标签页不受这两项影响。
- 驱动中的标签页归入青色 `omp` 标签组。

## 跨系统上传

`src/tools/browser/upload-files.ts` 两阶段：先通过 CDP `DOM.setFileInputFiles` 送本地路径；失败时在 OMP 侧读取文件字节，通过页面内 `DataTransfer` 构造文件对象注入 `<input type="file">`。

## 跨系统下载

`src/tools/browser/downloads.ts`（约 70、79-87、175-203 行）：

- 默认下载目录：`path.join(os.tmpdir(), "omp-downloads-${tabId}")`
- 通过 CDP `Browser.setDownloadBehavior` 下发给浏览器（源码只调用 `Browser.*`，没有 `Page.setDownloadBehavior` 分支）
- `perTab: true`（Managed Chromium）使用 `allowAndName`，下载完成后由 OMP 把 GUID 命名的文件移入目标名
- `perTab: false`（Relay 与 Direct CDP）使用 `allow`，不执行这一步搬移，直接采用事件回报的 `event.filePath` 或拼接路径

## Chrome 侧背景限制

Chrome for Developers 博客原文：

> from Chrome 136 we're making changes to the behavior of `--remote-debugging-port` and `--remote-debugging-pipe`. These switches will no longer be respected if attempting to debug the default Chrome data directory. These switches must now be accompanied by the `--user-data-dir` switch to point to a non-standard directory.

## 官方文档要点

`packages/browser-relay/README.md` 与 omp.sh/docs/web：relay 让 browser prelude 驱动浏览器标签页；需要本地安装扩展；文档把默认打开行为描述为采用当前可见标签页，与本机 18.12.6 源码的“新建后台标签页”不一致，以源码为准。
