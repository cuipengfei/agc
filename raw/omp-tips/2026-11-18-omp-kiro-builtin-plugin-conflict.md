# OMP 18.22.2 内置 Kiro 与 ns-omp-provider-kiro 注册冲突

> Source: 2026-11-18 当前会话的用户异常报告、本机已安装 OMP 与插件代码、插件禁用命令和 RPC 启动验证输出；本机路径中的用户目录统一表示为 `~`
> Collected: 2026-11-18
> Published: 2026-11-18

## 用户问题与执行顺序

用户报告 OMP 启动后出现以下异常，询问是否由 Kiro 插件引起，以及怎样禁用插件。调查阶段只查询本机版本、插件状态和代码。用户随后明确要求禁用插件，才执行禁用命令并验证启动。

```text
ConfigurationError: Cannot register custom API "kiro-api": built-in API names are reserved.
```

异常调用路径位于 `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js`，包含 `registerProvider`。

## 已安装版本与原始状态

读取 `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/package.json`：

```json
{"name":"@oh-my-pi/pi-coding-agent","version":"18.22.2"}
```

`omp plugin list` 的 Kiro 插件条目：

```text
● ns-omp-provider-kiro@0.5.3
```

读取 `~/.omp/plugins/omp-plugins.lock.json`，禁用前对应条目为：

```json
{"version":"0.5.3","enabledFeatures":null,"enabled":true}
```

插件的 `package.json` 同时声明 `omp.extensions` 与 `pi.extensions`，入口均为 `./dist/index.js`。`~/.omp/agent/config.yml` 中 `disabledExtensions` 为空。

## OMP changelog 原文

已安装包 `CHANGELOG.md` 的相关原文：

```markdown
## [18.22.2] - 2026-11-18

### Added

- Added Kiro as a built-in provider: run `/login kiro`, pick Identity Center, Builder ID, or an API key, and choose a discovered `kiro/<model-id>` model. Each `/login kiro` adds an account ([#18955](https://github.com/can1357/oh-my-pi/pull/18955) by [@Xytronix](https://github.com/Xytronix), based on [#14215](https://github.com/can1357/oh-my-pi/pull/14215) by [@ajdiyassin](https://github.com/ajdiyassin))
- Added Google and GitHub to `/login kiro`: approve a one-time code at `app.kiro.dev`, then sign in with that account ([#18955](https://github.com/can1357/oh-my-pi/pull/18955) by [@Xytronix](https://github.com/Xytronix), based on [#14215](https://github.com/can1357/oh-my-pi/pull/14215) by [@ajdiyassin](https://github.com/ajdiyassin))
```

## API 保留名称检查与插件注册代码

已安装 OMP 的 `dist/cli.js` 中，内置 API 名称列表包含 `"kiro-api"`。相关压缩代码原文片段：

```javascript
function ect(e){return HTl.has(e)}function WTl(e){if(ect(e))throw new Ct(`Cannot register custom API "${e}": built-in API names are reserved.`)}function Xte(e,t,n,r){WTl(e),Zlt.set(e,{stream:r??((i,o,s)=>t(i,o,s)),streamSimple:t,sourceId:n})}
```

`~/.omp/plugins/node_modules/ns-omp-provider-kiro/dist/index.js` 的 `providerConfig()` 原文节选：

```javascript
  function providerConfig() {
    return {
      baseUrl: kiroBaseUrl(current.region),
      api: "kiro-api",
      apiKey: "$KIRO_API_KEY",
      models: decorate(current.models),
      fetchDynamicModels: fetchDynamicKiroModels,
      streamSimple: streamKiroForOmp,
      usage: kiroUsageProvider,
```

同一插件入口中存在：

```javascript
  pi.registerProvider("kiro", providerConfig());
```

代码机制与用户异常一致：插件通过 `streamSimple` 提供自定义实现，同时使用已被 OMP 保留的 `kiro-api` 名称，注册时触发名称检查。

## 单插件禁用机制

已安装 OMP 的 `src/extensibility/plugins/toggle.ts` 原文：

```typescript
export async function setInstalledPluginEnabled(
	name: string,
	options: {
		enabled: boolean;
		scope?: "user" | "project";
		marketplaceIds: ReadonlySet<string>;
		marketplace: MarketplaceManager;
		npm: PluginManager;
	},
): Promise<void> {
	if (options.marketplaceIds.has(name)) {
		await options.marketplace.setPluginEnabled(name, options.enabled, options.scope);
	} else {
		await options.npm.setEnabled(name, options.enabled);
	}
}
```

`src/extensibility/plugins/manager.ts` 原文：

```typescript
	async setEnabled(name: string, enabled: boolean): Promise<void> {
		const config = await this.#ensureConfigLoaded();
		if (!config.plugins[name]) {
			throw new Error(`Plugin ${name} not found in runtime config`);
		}
		config.plugins[name].enabled = enabled;
		await this.#saveRuntimeConfig();
	}
```

`src/extensibility/plugins/loader.ts` 原文：

```typescript
		const runtimeState = runtimeConfig.plugins[name];

		// Check if disabled globally
		if (runtimeState && !runtimeState.enabled) {
			continue;
		}
```

因此禁用指定插件会阻止该插件入口加载，内置 Kiro provider 保持安装状态。

## 用户授权后的命令与状态验证

执行：

```bash
omp plugin disable ns-omp-provider-kiro
```

输出：

```text
command exit: 0
✔ Disabled ns-omp-provider-kiro
```

重新读取同一插件状态文件，并比较执行前后的各插件条目。输出：

```text
after: {"version":"0.5.3","enabledFeatures":null,"enabled":false}
changed plugins: ["ns-omp-provider-kiro"]
verification: only Kiro plugin disabled
```

插件保留安装，其他插件状态保持不变。

## 启动与 RPC 验证

在原项目工作目录运行：

```bash
omp --mode rpc --no-session --no-ui
```

通过标准输入发送：

```json
{"id":"boot-check","type":"get_state"}
```

验证程序检查退出码、响应是否成功，以及 stdout/stderr 是否包含 `Cannot register custom API "kiro-api"` 或 `built-in API names are reserved`。输出：

```text
startup exit: 0 signal: null error: null
Kiro registration conflict: false
RPC check: {"type":"response","command":"get_state","success":true}
stderr error lines: none
verification: OMP initialized and answered get_state successfully without Kiro API conflict
```

本次完成 OMP 初始化与 RPC 响应验证。未执行内置 Kiro 登录、凭据迁移或模型生成请求；交互式 TUI 未单独启动验证。
