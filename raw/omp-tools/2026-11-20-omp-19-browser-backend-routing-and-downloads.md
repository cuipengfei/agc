# OMP 19.0.1 浏览器后端路由、下载顺序与开关语义（源码与本机摘录）

> Source: 本机安装包 `@oh-my-pi/pi-coding-agent` 19.0.1 源码（`src/tools/browser.ts`、`src/tools/browser/{launch,install,kind,settings}.ts`、`src/config/settings.ts`、`src/session/agent-session.ts`、`src/mcp/config.ts`、`src/slash-commands/builtin-collaboration.ts`、`node_modules/@oh-my-pi/pi-utils/src/dirs.ts`）；本机文件状态与实测输出，2026-11-20
> Collected: 2026-11-20
> Published: Unknown

## 版本与本机配置位置

```text
$ omp --version
omp/19.0.1
```

包目录：`~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent`。

改动前 `~/.omp/agent/config.yml` 的 browser 段（第 512–515 行）：

```yaml
browser:
  enabled: false
  headless: true
  cmux: true
```

## 设置默认值（`src/tools/browser/settings.ts`）

`cfgBrowserEnabled`：

```ts
export const cfgBrowserEnabled = register({
	id: "browser.enabled",
	type: "boolean",
	default: true,
	ui: {
		tab: "tools",
		group: "Available Tools",
		label: "Browser",
		description: "Enable the browser eval prelude for scripted browser automation",
	},
});
```

`cfgBrowserRelay` 的 `default: false`（第 35 行）。

`cfgBrowserHeadless` 的 `default: true`，描述原文：

```text
Run the browser without a window (disable to show it). omp's WebKit tabs gain or lose their windows at once where the engine ships its viewer (macOS); elsewhere a visible browser is Chromium, launched in the new mode by the next open.
```

`cfgBrowserWebKit` 的 `default: true`，描述原文：

```text
Open browser tabs in omp's own headless WebKit engine instead of managed Chromium when the engine is installed (omp downloads it to ~/.o2/lib/abkit before Chrome for Testing when no browser is installed; see Browser WebKit Path). Chromium still opens a visible browser where the engine ships no viewer, and tabs the engine fails to start; an explicit app, the relay, Browser CDP URL, Tern and cmux take precedence; app "chromium" opts one open out. Set PI_BROWSER_WEBKIT=0 or PI_BROWSER_WEBKIT=1 to override.
```

`cfgBrowserCmux` 与 `cfgBrowserTern` 的默认值都是 `true`。

## 自动选择顺序（`src/tools/browser.ts` 的 `resolveBrowserKind`）

`src/prompts/tools/browser.md` 的原文顺序：

```text
- No `app` → the first that applies:
  1. the user's Chrome through the relay (`browser.relay` setting; `PI_BROWSER_RELAY=1`/`=0` overrides it)
  2. `browser.cdpUrl`
  3. Tern inside a Tern pane
  4. cmux
  5. omp's own browser: headless WebKit when installed, downloaded first when no browser is (off with the `browser.webkit` setting or `PI_BROWSER_WEBKIT=0`),
     else managed Chromium (installs on first use)
- A subagent skips the relay, Tern and cmux: pass `app: "relay"` or `app: "tern"` when the task needs the user's browser or pane.
```

`ownBrowserKind` 的判定：

```ts
	const chromium = chromiumKind(params, session);
	const webkit = resolveWebKitKind(
		{
			settingEnabled: cfgBrowserWebKit.get(session.settings),
			settingPath: cfgBrowserWebKitPath.get(session.settings),
		},
		env,
	);
	// A window is the viewer's to show: an engine without one leaves visible tabs to Chromium.
	if (!webkit || (!chromium.headless && !webkit.viewer)) return chromium;
	return webkit;
```

显式 `app: "webkit"` 传入 `settingEnabled: true`：

```ts
	if (app === "webkit") {
		const webkitKind = resolveWebKitKind(
			{ settingEnabled: true, settingPath: cfgBrowserWebKitPath.get(session.settings) },
			env,
		);
```

## WebKit 下载门槛（`installWebKitForOpen`）

文档注释原文（`src/tools/browser.ts`）：

```text
 * Download omp's WebKit engine into its default location
 * ({@link webKitEngineToInstall}) before an open that needs it. A missing
 * engine is downloaded for an open with `app: "webkit"`, or one that otherwise
 * ends at managed Chromium (headless, or visible where released engines ship a
 * viewer) while Chromium itself would first be downloaded: with no browser
 * installed, omp's own engine comes before Chrome for Testing.
```

条件分支原文：

```ts
	const explicit = params.app === "webkit";
	const pending = await webKitEngineToInstall({...});
	if (pending === null) return undefined;
	...
	if (!explicit) {
		const kind = resolveBrowserKind(params, session);
		if (kind.kind !== "headless" || params.app === "chromium") return undefined;
		if (!kind.headless && !VIEWER_PLATFORMS.includes(process.platform)) return undefined;
		if (!(await chromiumNeedsDownload())) return undefined;
	}
```

## Chromium 是否需要下载（`src/tools/browser/launch.ts`）

`chromiumNeedsDownload` 原文：

```ts
export async function chromiumNeedsDownload(): Promise<boolean> {
	if (process.env.PUPPETEER_EXECUTABLE_PATH) return false;
	if (process.platform !== "darwin" && (await resolveSystemChromium())) return false;
	const managed = await managedChromiumLocation();
	return managed !== undefined && !fs.existsSync(managed.executablePath);
}
```

`ensureChromiumExecutable` 注释原文（节选）：

```text
 * Other platforms keep the download-avoiding system Chrome
 * preference and fall back to Chrome for Testing. The managed browser is
 * cached under ~/.omp/puppeteer (getPuppeteerDir).
```

Linux 系统浏览器候选名单原文：

```ts
			const names = ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser", "chrome"];
```

`openOnKind` 注释原文：

```text
	// First browser use may have to download Chrome for Testing (~180 MB).
```

## 引擎与缓存路径（`@oh-my-pi/pi-utils/src/dirs.ts`）

```ts
/** Get the puppeteer sandbox directory (~/.omp/puppeteer). */
export function getPuppeteerDir(): string {
	return dirs.rootSubdir("puppeteer", "cache");
}
```

```ts
/**
 * Get where the WebKit browser engine's host executable is installed: `ABHost` (`ABHost.exe` on Windows)
 * in the ABKit engine directory `~/.o2/lib/abkit`. The location is shared with Tern, so it is outside omp's
 * own directories.
 */
```

## 开关语义

`resolveWebKitKind` 的环境变量覆盖原文：

```text
	/** `browser.webkit` setting (default true); `PI_BROWSER_WEBKIT=0|1` overrides it. */
```

```ts
	if (!parseFlag(env.PI_BROWSER_WEBKIT, options?.settingEnabled ?? true)) return null;
```

`/browser` 命令的描述与无参行为（`src/slash-commands/builtin-collaboration.ts`）：

```ts
		getTuiAutocompleteDescription: runtime => {
			if (!cfgBrowserEnabled.get(runtime.ctx.settings)) return "Browser: disabled";
			return cfgBrowserHeadless.get(runtime.ctx.settings) ? "Browser: headless" : "Browser: visible";
```

```ts
			if (!enabled) return usage("Browser capability is disabled (enable in settings).", runtime);
```

## 生效路径

设置文件监视（`src/config/settings.ts`）：

```text
	 * Watching directories (not files) keeps atomic rename-over writes observable.
```

```ts
				watcher = fs.watch(dir, { persistent: false }, (_event, filename) => {
					const entry = this.#fileWatchers.get(dir);
					if (!entry || entry.watcher !== watcher) return;
					if (filename && !entry.names.has(path.basename(filename.toString()))) return;
					this.#scheduleWatchReload();
```

能力的运行时重算（`src/session/agent-session.ts`）：

```ts
		cfgBrowserEnabled.listen(this, enabled => this.#reconcileEvalPreludeSetting("browser.enabled", enabled));
```

```text
	 * Capability settings change the live eval preludes; the browser toggle also
	 * re-filters its MCP tools first. An empty transcript rebuilds the system prompt to advertise
	 * them; mid-session the cached prompt stays byte-stable and the next user prompt carries a
	 * hidden prelude notice instead (see {@link SessionTools.takeEvalPreludeNotice}).
	 * A failed browser switch-on reverts to off.
```

## MCP 浏览器 server 过滤（`src/mcp/config.ts`）

```ts
const BROWSER_MCP_NAMES = new Set([
	"puppeteer",
	"playwright",
	"browserbase",
	"browser-tools",
	"browser-use",
	"browser",
]);
```

```ts
export function shouldFilterBrowserMCPForPrelude(options: BrowserMCPPreludeFilterOptions): boolean {
	return !options.restrictToolNames && options.browserEnabled && options.evalRegistered && options.evalActive;
}
```

包名与 URL 模式：`BROWSER_MCP_PKG_PATTERN`（puppeteer、playwright、browserbase、browser-tools、browser-use 相关包），`BROWSER_MCP_URL_PATTERN = /browserbase\.com|browser-use\.com/i`。本机 `chrome-devtools` 的 server 名与命令 `/home/cpf/.bun/bin/chrome-devtools-mcp` 均不在这些名单与模式内。

## 本机文件探针

```text
$ /usr/bin/chromium --version
Chromium 156.0.8078.73 built on Ubuntu 26.04.1 LTS

$ ls ~/.omp/puppeteer/chrome/
linux-150.0.7871.24

$ ls -d ~/.o2
无输出（目录不存在）
```

`/usr/bin/chromium` 为 4.9K 的 POSIX shell 脚本（发行版 launcher）。

## 打开后的实测

`browser.enabled` 改为 `true` 后，重置 eval 内核：

```text
> typeof browser
object
```

首个标签：

```text
Opened tab "smoke" on omp's headless Chromium (shared)
{
  title: 'Example Domain',
  text: 'This domain is for use in documentation examples without nee'
}
Released managed tab "smoke"
```

Google 搜索（同一受管无头 Chromium）：

```text
title: 'oh-my-pi github - Google 搜索'
url: https://www.google.com.hk/search?q=oh-my-pi+github&sei=...
chars: 2368
markers: []            // captcha / unusual traffic / before you continue / consent / not a robot 均未命中
links: 跳到主要内容, 无障碍功能帮助, 登录, 全部, 视频, 图片, 短视频, 新闻, 图书, 网页, 时间不限, 过去 1 小时内
```

在结果页用搜索框填入 `oh-my-pi browser prelude` 并按 Enter：

```text
title: 'oh-my-pi browser prelude - Google 搜索'
h3: 8
links[0]: Pi – a minimal terminal coding harness : r/hackernews
```

全程无下载：`~/.o2` 仍不存在，`~/.omp/puppeteer/chrome` 仍只有 `linux-150.0.7871.24`。

## 引擎安装来源（`src/tools/browser/webkit/install.ts`）

文档注释原文（节选）：

```text
 * Downloads omp's WebKit engine, ABKit, from Stencil's build service (product
 * `abkit`, its newest {@link ABKIT_CHANNEL} build) into an engine directory,
 * normally `~/.o2/lib/abkit` ({@link webKitEngineToInstall}): when it holds no
 * engine, and to update one older than that build, asked once per process.
```

```text
 * The answered archive (`abkit-<version>-<platform>.tar.gz`, `.zip` on
 * Windows) is checked against the answer's size and SHA-256 while it streams,
 * unpacked beside the engine directory, and must hold the engine as `abkit/`
 * with its host executable.
```
