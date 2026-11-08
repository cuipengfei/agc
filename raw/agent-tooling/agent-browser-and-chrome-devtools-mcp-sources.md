# agent-browser 与 chrome-devtools MCP 源材料

> Source: [agent-browser README](https://github.com/vercel-labs/agent-browser); [agent-browser CDP Mode](https://agent-browser.dev/cdp-mode); [chrome-devtools-mcp README](https://github.com/ChromeDevTools/chrome-devtools-mcp); [chrome-devtools-mcp tool reference](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md); 本机会话实测
> Collected: 2026-11-07
> Published: Unknown（上游两仓库无文档发布日期；README 与 tool reference 均为 2026-11-07 取回版本）

## 1. agent-browser README 原文摘录

> agent-browser is a native Rust CLI that gives an AI agent a browser it can drive one command at a time. `snapshot` returns the page as compact text with a ref such as `@e1` for each element. The agent acts on a ref, reads the page again to check the result, and repeats. The browser stays open between commands, so each step is one short shell call.

Install 段原文：

```bash
npm install -g agent-browser
agent-browser install           # download Chrome for Testing (first time only)
```

> - **Homebrew:** `brew install agent-browser`, then `agent-browser install`.
> - **Linux:** `agent-browser install --with-deps` also installs the browser's system libraries.
> - **No install:** `npx agent-browser open example.com`.

Quick start 段原文：

```bash
agent-browser open example.com
agent-browser snapshot -i       # interactive elements, each with a ref
agent-browser click @e1         # act on a ref from that snapshot
agent-browser get url           # check the result
agent-browser close
```

> - Refs describe the page at the time of the snapshot. After navigation or a DOM change, take a new snapshot before using refs again.
> - CSS selectors, text, XPath, and semantic locators also work, for example `agent-browser find role button click --name "Submit"`.

失败语义原文：

> - A click fails, instead of reporting success, when the target is hidden, disabled, outside the viewport, or covered by another element such as a consent banner. Dismiss the covering element, take a new snapshot, and retry.

How it works 段原文：

> The CLI sends each command to a background daemon that starts on the first command and controls the browser over the Chrome DevTools Protocol. Each `--session` gets its own daemon and browser. By default, the daemon closes a headless browser and exits after one hour without commands, saving state first when [session persistence](https://agent-browser.dev/sessions) is configured.

> Chrome for Testing is the default browser. You can also attach to a running Chrome with `--cdp` or `--auto-connect`, select the [Lightpanda](https://agent-browser.dev/engines/lightpanda) or [Obscura](https://agent-browser.dev/engines/obscura) engine with `--engine`, drive Mobile Safari in the [iOS Simulator](https://agent-browser.dev/ios), or use a cloud browser provider such as [Browserbase](https://agent-browser.dev/providers/browserbase), [Browserless](https://agent-browser.dev/providers/browserless), [Browser Use](https://agent-browser.dev/providers/browser-use), [Kernel](https://agent-browser.dev/providers/kernel), or [AgentCore](https://agent-browser.dev/providers/agentcore).

For AI agents 段原文：

> The CLI ships skills that match its version:

```bash
agent-browser skills get core                 # the core loop, refs, waiting, and common workflows
agent-browser skills list                     # specialized skills: electron, slack, dogfood, and more
```

> The installed skill is a thin stub that tells the agent to load `agent-browser skills get core`, so its instructions always match the installed CLI. Or add this to your `AGENTS.md`:

```markdown
Use `agent-browser` for browser automation. Before the first use, run
`agent-browser skills get core` and follow it.
```

> For MCP clients, `agent-browser mcp` starts an MCP server over stdio.

Commands 分组表原文（组、命令、文档链接列保留命令列）：

| Group | Commands |
|---|---|
| Navigate and read | `open`, `back`, `forward`, `reload`, `read`, `snapshot`, `get`, `is` |
| Interact | `click`, `dblclick`, `fill`, `type`, `press`, `keyboard`, `hover`, `focus`, `select`, `check`, `uncheck`, `scroll`, `drag`, `upload`, `mouse`, `find` |
| Wait | `wait` |
| Capture | `screenshot`, `pdf`, `record`, `download`, `diff` |
| Page and network state | `cookies`, `storage`, `network`, `set`, `clipboard`, `eval`, `pushstate` |
| Tabs, frames, and dialogs | `tab`, `frame`, `dialog` |
| Debug and performance | `console`, `errors`, `highlight`, `inspect`, `trace`, `profiler`, `vitals`, `react`, `a11y` |
| Sessions and auth | `session`, `state`, `auth`, `profiles`, `confirm`, `deny` |
| Agents and integrations | `skills`, `mcp`, `webmcp`, `flow`, `chat`, `batch`, `plugin` |
| Observe | `stream`, `dashboard` |
| Setup | `install`, `upgrade`, `doctor`, `connect`, `close` |

Documentation 段中 Security 行原文：

> - [Security](https://agent-browser.dev/security): the auth vault, domain allowlists, action policies, and content boundaries

## 2. agent-browser CDP Mode 文档原文摘录

```bash
# Start Chrome with: google-chrome --remote-debugging-port=9222

# Connect once, then run commands without --cdp
agent-browser connect 9222
agent-browser snapshot
agent-browser close

# Or pass --cdp on each command
agent-browser --cdp 9222 snapshot
```

> The session stays attached until `agent-browser close`. Later commands without a connection flag run against the same browser, as if you passed `--cdp` again. If that browser goes away, commands fail instead of launching a local one.

> If the debugging port is not open yet, `connect` and `--cdp` wait up to 2 seconds for it before failing.

`--cdp` 参数接受形式原文：

> - A port number (e.g., `9222`) for local connections via `http://localhost:{port}`
> - A full WebSocket URL (e.g., `wss://...` or `ws://...`) for remote browser services

Auto-Connect 段原文：

> Use `--auto-connect` to automatically discover and connect to a running Chrome instance without specifying a port:

> Auto-connect discovers Chrome by:
>
> 1. Reading Chrome's `DevToolsActivePort` file from the default user data directory and connecting to its WebSocket endpoint, then HTTP discovery (`/json/version`, `/json/list`) for older Chrome versions
> 2. Falling back to probing common debugging ports (9222, 9229)

> Chrome 144+ shows a remote-debugging permission prompt on the first connection. Auto-connect waits up to 20 seconds for approval. If the prompt is still open after that, the command fails with a message asking you to approve it and retry, without opening a second prompt.

> This is useful when:
>
> - Chrome 144+ has remote debugging enabled via `chrome://inspect/#remote-debugging` (which uses a dynamic port)

Use cases 段原文：

> - Electron apps
> - Chrome/Chromium with remote debugging
> - WebView2 applications
> - Remote browser services (via WebSocket URL)
> - Any browser exposing a CDP endpoint

Global options 表中相关行原文：

> `<code>--cdp <port|url></code>` CDP connection (port or WebSocket URL)
> `<code>--auto-connect</code>` Auto-discover and connect to running Chrome
> `<code>-p &lt;provider&gt;</code>` Browser provider (`browserbase`, `browseruse`, `kernel`, `browserless`, `agentcore`, or a configured `browser.provider` plugin)

## 3. chrome-devtools-mcp README 原文摘录

Key features 三条原文：

> - **Get performance insights**: Uses [Chrome DevTools](https://github.com/ChromeDevTools/devtools-frontend) to record traces and extract actionable performance insights.
> - **Advanced browser debugging**: Analyze network requests, take screenshots and check browser console messages (with source-mapped stack traces).
> - **Reliable automation**. Uses [puppeteer](https://github.com/puppeteer/puppeteer) to automate actions in Chrome and automatically wait for action results.

Disclaimers 段原文：

> `chrome-devtools-mcp` officially supports Google Chrome and [Chrome for Testing](https://developer.chrome.com/blog/chrome-for-testing/) only.

> Performance tools may send trace URLs to the Google CrUX API to fetch real-user experience data. ... To disable this, run with the `--no-performance-crux` flag.

Usage statistics 段原文：

> Data collection is **enabled by default**. You can opt-out by passing the `--no-usage-statistics` flag when starting the server.

浏览器自动启动注记原文：

> The MCP server will start the browser automatically once the MCP client uses a tool that requires a running browser instance. Connecting to the Chrome DevTools MCP server on its own will not automatically start the browser.

CLI 形态原文：

> The package also includes the `chrome-devtools` CLI. Use it to control the browser from your terminal without MCP:

```sh
chrome-devtools navigate_page 1 --url "https://developers.chrome.com"
chrome-devtools take_screenshot 1 --filePath screenshot.png
chrome-devtools stop
```

Skills 表标题行与 seven 行原文：

> The package includes [skills](./skills) that teach your agent how to use Chrome DevTools:

| Skill | Use it to |
| --- | --- |
| `chrome-devtools` | Debug and automate pages with the MCP tools. |
| `chrome-devtools-cli` | Run the CLI and write shell scripts with it. |
| `a11y-debugging` | Audit and fix accessibility issues. |
| `cookie-debugging` | Debug cookies, sessions, and authentication. |
| `debug-optimize-lcp` | Debug and improve Largest Contentful Paint. |
| `memory-leak-debugging` | Find and fix memory leaks. |
| `troubleshooting` | Fix connection problems between MCP and Chrome. |

插件安装原文：

> A plugin installs the MCP server and all skills, including the CLI skill:
>
> - **Claude Code:** Run `/plugin marketplace add ChromeDevTools/chrome-devtools-mcp`, then `/plugin install chrome-devtools-mcp@chrome-devtools-plugins`.

### tool reference 关键段原文

`take_snapshot` 全段原文：

> **Description:** Take a text snapshot of the target page based on the a11y tree. The snapshot lists page elements along with a unique identifier (uid). Always use the latest snapshot. Prefer taking a snapshot over taking a screenshot. The snapshot indicates the element selected in the DevTools Elements panel (if any).

`click` 参数原文（页面与元素绑定）：

> - **pageId** (number) **(required)**: Targets a specific page by ID.
> - **uid** (string) **(required)**: The uid of an element on the page from the page content snapshot
> - **includeSnapshot** (boolean) _(optional)_: Whether to include a snapshot in the response. Default is false.

`fill_form` 描述与参数原文：

> **Description:** [`Fill`](#fill) out multiple form elements (inputs, selects, checkboxes, radios) at once. ALWAYS prefer this tool over multiple individual '[`fill`](#fill)' or '[`click`](#click)' calls when interacting with forms. It is significantly faster, more reliable, and reduces turn count.

`new_page` 的 isolatedContext 参数原文：

> - **isolatedContext** (string) _(optional)_: If specified, the page is created in an isolated browser context with the given name. Pages in the same browser context share cookies and storage. Pages in different browser contexts are fully isolated (useful for clean-slate testing of cookies and authentication).

`emulate` 参数名原文：colorScheme、cpuThrottlingRate、extraHttpHeaders、forcedColors、geolocation、networkConditions（"Offline" "Slow 3G" "Fast 3G" "Slow 4G" "Fast 4G"）、prefersContrast、prefersReducedMotion、userAgent、viewport。

`evaluate_script` 的 serviceWorkerId 参数原文：

> - **serviceWorkerId** (string) _(optional)_: The optional service worker id to evaluate the script in. If provided, 'pageId' should be omitted.

`screencast_start` 描述原文：

> **Description:** Starts recording a screencast (video) of the target page.

工具类别标题行原文（Input automation 10 tools / Navigation automation 6 tools / Emulation 2 tools / Performance 3 tools / Network 2 tools / Debugging 10 tools / Memory 14 tools / Extensions 5 tools / Third-party 2 tools / WebMCP 2 tools / Progressive Web Apps 4 tools / WebAuthn 1 tools）。

Memory 类别 14 个工具名原文：take_heapsnapshot、analyze_heapsnapshot_contexts、close_heapsnapshot、compare_heapsnapshots、get_heapsnapshot_class_nodes、get_heapsnapshot_details、get_heapsnapshot_dominators、get_heapsnapshot_duplicate_strings、get_heapsnapshot_edges、get_heapsnapshot_object_details、get_heapsnapshot_retainers、get_heapsnapshot_retaining_paths、get_heapsnapshot_summary、query_heapsnapshot_objects。

`set_logpoints` 描述首句原文：

> **Description:** Set the complete set of logpoints of the selected page: logpoints not in the list are removed, new ones are added, and an empty list removes all. A logpoint logs expressions to the console every time a line executes, without pausing or changing the source, like logpoints in the DevTools Sources panel.

`lighthouse_audit` 描述原文：

> **Description:** Get Lighthouse scores, failing audits, and the DOM nodes they flag for accessibility, SEO, best practices, and agentic browsing. Full reports are saved to disk. This excludes performance. For performance audits, run [`performance_start_trace`](#performance_start_trace)

各类别旗标注记原文（tool reference 各节）：

> NOTE: The Extensions category is not active by default. Use the '--categoryExtensions' flag.
> NOTE: The WebMCP category is not active by default. Use the '--categoryExperimentalWebmcp' flag.
> NOTE: The Progressive Web Apps category is not active by default. Use the '--categoryPwa' flag.
> NOTE: The Third-party category is not active by default. Use the '--categoryExperimentalThirdParty' flag.
> NOTE: The Memory ... （内存工具自述 requires flag: --memoryDebugging=true）

### 本机 1.12.0 `--help` 原文摘录（2026-11-07 取自 `/home/cpf/.bun/bin/chrome-devtools-mcp --help`）

```
--autoConnect     If specified, automatically connects to a browser (Chrome 144+) running locally from the user data directory identified by the channel param (default channel is stable). Requires remote debugging server to be started in the Chrome instance via chrome://inspect/#remote-debugging.  [boolean] [default: false]
-u, --browserUrl  Connect to a running, debuggable Chrome instance (e.g. `http://127.0.0.1:9222`).  [string]
-w, --wsEndpoint  WebSocket endpoint to connect to a running Chrome instance (e.g., ws://127.0.0.1:9222/devtools/browser/<id>). Alternative to --browserUrl.  [string]
--headless        Whether to run in headless (no UI) mode.  [boolean] [default: false]
--isolated        If specified, creates a temporary user-data-dir that is automatically cleaned up after the browser is closed. Defaults to false.  [boolean] [default: false]
--channel         Specify a different Chrome channel... [choices: "canary", "dev", "beta", "stable"] [default: "stable"]
--allowedUrlPattern  Restricts browser's network access by allowing only specified URL patterns (uses https://urlpattern.spec.whatwg.org/).
--blockedUrlPattern  Restricts browser's network access by blocking specified URL patterns (uses https://urlpattern.spec.whatwg.org/).
--performanceCrux  Set to false to disable sending URLs from performance traces to CrUX API to get field performance data.  [boolean] [default: true]
--usageStatistics  Set to false to opt-out of usage statistics collection. ... [boolean] [default: true]
--javascriptEvaluation  Set to false to disable the server entry points for evaluating caller-provided JavaScript: evaluation tools (evaluate_script and slim evaluate) are disabled, the initScript parameter in navigate_page is turned off, and navigating to javascript:, data:, or vbscript: URLs is disallowed.
--memoryDebugging, --experimentalMemory  Whether to enable memory debugging tools.  [boolean] [default: false]
--redactNetworkHeaders  If true, redacts some of the network headers considered sensitive before returning to the client.  [boolean] [default: false]
--filesystemRoot, --workspace  A directory that filesystem tools are allowed to access. May be specified more than once.  [array] [default: OS temp directory]
--slim  Exposes a "slim" set of 3 tools covering navigation, script execution and screenshots only. Useful for basic browser tasks.  [boolean] [default: false]
--categoryPwa  Set to true to include tools for automating Progressive Web Apps (install, launch, uninstall, and OS state). This feature is only supported with a pipe connection; autoConnect, browserUrl, and wsEndpoint are not supported.  [boolean]
--categoryExperimentalWebmcp  Set to true to enable WebMCP tools ... Requires Chrome 150+ with the following flag: `--enable-features=WebMCP`  [boolean]
```

注：上列各行截自我的完整读取输出，行尾截断处未补写任何文字；`--categoryMemory` 说明行（Set to false to exclude tools related to memory，default true）与 `--categoryExtensions`（Set to true to include tools related to extensions）同样在原始输出中。

## 4. 本机实测记录（2026-11-07）

会话 23:38 时点（`date -Iseconds` → `2026-11-07T23:38:19+08:00`）：

```
$ wslinfo --networking-mode
mirrored
$ ss -tlnp | grep -E ':9333|:9222|:9229'
（无命中输出 → 9333/9222/9229 无监听）
$ which agent-browser
agent-browser not found
$ chrome-devtools-mcp --version
1.12.0
$ ls /home/cpf/code-inside/agc/.mcp.json
ls: cannot access '/home/cpf/code-inside/agc/.mcp.json': No such file or directory
```

`~/.omp/agent/mcp.json` 中 chrome-devtools 条目原文（行 37–47；同文件 29–36 行为含 API key 的 search-exa 与 search-tavily 条目，按凭据边界不摘录）：

```json
    "chrome-devtools": {
      "type": "stdio",
      "command": "/home/cpf/.bun/bin/chrome-devtools-mcp",
      "args": [
        "--browserUrl",
        "http://127.0.0.1:9333",
        "--no-usage-statistics",
        "--no-performance-crux"
      ],
      "enabled": false
    },
```

`~/.omp/agent/config.yml` browser 段原文（行 503–506）：

```yaml
browser:
  enabled: false
  headless: true
  cmux: true
```

同期早段（本会话前半）记录：

- `cat "/mnt/c/Users/39764/AppData/Local/Google/Chrome/User Data/DevToolsActivePort"` → `No such file or directory`（2026-11-07 时不存在）
- 探测 9222/9229/9333 的 `curl http://127.0.0.1:9222/json/version` 等均无 `/json/version` 响应返回
- `bun` 全局包清单 `~/.bun/install/global/package.json` 行 19：`"chrome-devtools-mcp": "1.12.0",`，与 agc 仓库 `bun/global-package.json` 同步一致

WSL 回环与桌面能力的既有逐字证据见 `raw/wsl-windows/2026-10-26-wsl-mirrored-loopback-and-desktop-capability-probe.md`（2026-10-26：`wslinfo --networking-mode` 输出 `mirrored`；Windows 侧 18082 监听、WSL `curl http://127.0.0.1:18082/` 返回 `win-ok`）。
