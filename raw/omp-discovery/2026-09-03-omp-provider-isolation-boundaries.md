# OMP provider 隔离边界：disabledProviders 覆盖哪些能力

> Source: 本机 `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent` v18.1.3 源码直读
> Collected: 2026-09-03
> Published: Unknown（未发布内容，安装包源码）

用途：核实 OMP `disabledProviders` 的实际作用范围。起因是本机 `config.yml` 长期设置 `disabledProviders: ['claude-plugins']`，被误当作「Claude 插件对 OMP 完全隔离」的闸门。

## disabledProviders 生效的那一层

`src/capability/index.ts:236-241`：

```
236: 	items: readonly T[],
237: 	kind: CapabilityKind,
238: ): readonly T[] {
239: 	const disabled = new Set(Settings.get("disabledProviders") ?? []);
240: 	if (disabled.size === 0) return items;
241: 	const filtered: T[] = [];
```

`filterProviders` 是 capability 注册路径上的集中检查点，作用对象是已收集的 capability items（skills、commands、agents、MCP、hooks、tools、extensions 等）。它不是唯一读取 `disabledProviders` 的地方（`isProviderEnabled` 在特定路径也检查），但它是 skills/commands/agents 这类常规 capability 的统一闸门。

## agents 路径：显式检查 provider

`src/task/discovery.ts:106-111`：

```
106: 	}
107:
108: 	// Load agents from Claude Code marketplace plugins (respects disabledProviders)
109: 	const { roots } = isProviderEnabled("claude-plugins")
110: 		? await listClaudePluginRoots(homeDir, cwd)
111: 		: { roots: [] };
```

注释与实现都明确：agents 尊重 `disabledProviders`。

## LSP 路径：不检查 provider

`src/main.ts:762-764`：

```
762: 	// Preload plugin roots so downstream discovery is synchronous.
763: 	await preloadPluginRoots(os.homedir(), cwd);
764:
```

无条件调用，没有 provider 判断。

`src/lsp/config.ts:437-452`：

```
437: 	// Plugin-provided LSP configs. Both the plugin root itself and the
438: 	// marketplace catalog that shipped it may declare servers; the catalog is
439: 	// consulted second so a plugin's own file wins.
440: 	for (const root of pluginRoots) {
441: 		sources.push(pluginConfigSource(root));
442: 	}
443: 	const pluginRoots = getPreloadedPluginRoots();
444: 	for (const root of pluginRoots) {
445: 		const direct = path.join(root.path, ".lsp.json");
446: 		if (await fileExists(direct)) {
447: 			sources.push({ kind: "plugin", path: direct, root });
448: 		}
449: 		sources.push(marketplaceConfigSource(root));
450: 	}
451: 	return sources;
452: }
```

`getPreloadedPluginRoots()` 直接消费 `main.ts:763` 预加载的结果，整段无 `isProviderEnabled` 调用。

**因此：`disabledProviders: ['claude-plugins']` 不阻止 Claude 插件的 `.lsp.json` 进入 OMP 的 LSP 配置源。**

## marketplace manifest 的查找路径与真实位置不一致

`src/lsp/config.ts:374-384`：

```
374: 	};
375: }
376:
377: function readMarketplaceLspConfig(root: PluginRoot): ConfigSource {
378: 	const catalogPaths = [
379: 		path.resolve(root.path, "..", "..", "marketplace.json"),
380: 		path.resolve(root.path, "..", "..", ".claude-plugin", "marketplace.json"),
381: 	];
382: 	return { kind: "marketplace", root, catalogPaths };
383: }
384:
```

已安装插件的 `root.path` 形如 `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>`，因此 `../..` 解析到 `cache/<marketplace>`。对本机两个 marketplace 做存在性探测：

```
不存在  /home/cpf/.claude/plugins/cache/claude-plugins-official/marketplace.json
不存在  /home/cpf/.claude/plugins/cache/claude-plugins-official/.claude-plugin/marketplace.json
不存在  /home/cpf/.claude/plugins/cache/claude-code-lsps/marketplace.json
不存在  /home/cpf/.claude/plugins/cache/claude-code-lsps/.claude-plugin/marketplace.json
```

真实位置在另一棵目录树下，不在上述查找路径上：

```
存在    /home/cpf/.claude/plugins/marketplaces/claude-plugins-official/.claude-plugin/marketplace.json
存在    /home/cpf/.claude/plugins/marketplaces/claude-code-lsps/.claude-plugin/marketplace.json
```

结论：只有插件**根目录内**自带 `.lsp.json` 的插件对 OMP 可见；仅在 marketplace manifest 内联声明 `lspServers` 的插件（本机的 `pyright-lsp`、`typescript-lsp`）不可见。

## 本机实测的插件 LSP 声明

卸载前 `~/.claude/plugins/cache/` 下四个 LSP 插件的目录内容：

```
pyright-lsp/1.0.0            files=[LICENSE, README.md]                      无 .lsp.json
typescript-lsp/1.0.0         files=[LICENSE, README.md]                      无 .lsp.json
vscode-langservers/0.1.0     files=[.claude-plugin/plugin.json, .lsp.json]   keys: html, css, eslint
bash-language-server/0.1.0   files=[.claude-plugin/plugin.json, .lsp.json]   keys: shellscript
```

`~/.claude/plugins/marketplaces/claude-plugins-official/.claude-plugin/marketplace.json` 中：

```
pyright-lsp        lspServers=["pyright"]     command=pyright-langserver
typescript-lsp     lspServers=["typescript"]  command=typescript-language-server
```

OMP 内置默认 server（`src/lsp/defaults.json`）共 55 个，含 `eslint`、`bashls`、`vscode-html-language-server`、`vscode-css-language-server`。插件声明的 key 与内置的对比：

- `html`、`css`、`shellscript`：新 key，与内置不同名
- `eslint`：同名。内置 `rootMarkers` 为 6 个 eslint 配置文件，插件条目无 `rootMarkers`

`src/lsp/config.ts:55-65` 显示 `normalizeConfig` 接受 `extensionToLanguage` 形式并在缺 `rootMarkers` 时补 `["."]`，因此插件的 `eslint` 条目若覆盖内置条目，root 判定会从「必须存在 eslint 配置文件」放宽为「任意目录」。

四个二进制在本机均存在：

```
/home/cpf/.bun/bin/bash-language-server
/home/cpf/.bun/bin/vscode-html-language-server
/home/cpf/.bun/bin/vscode-css-language-server
/home/cpf/.bun/bin/vscode-eslint-language-server
```

## marketplace 安装在两个 provider 之间的缝隙

`src/discovery/omp-extension-roots.ts:345-352`：

```
345: 	}
346:
347: 	// Marketplace installs also create runtime symlinks for enable-state
348: 	// persistence, but their resources are discovered through the
349: 	// `claude-plugins` provider. Filtering them here prevents `/status` from
350: 	// showing the same plugin under both providers and prevents duplicate
351: 	// skill/command registration.
352: 	const marketplaceRealpaths = new Set<string>();
```

`src/discovery/omp-extension-roots.ts:377-381`：

```
377: 	}
378:
379: 	return roots.filter(root => !marketplaceRealpaths.has(root.realpath));
380: }
381:
```

`src/discovery/claude-plugins.ts:288-296`：

```
288: 	const commandsDir = await resolvePluginDir(
289: 		root,
290: 		["commands", "slash-commands"],
291: 		"commands",
292: 		false,
293: 	);
294: 	if (!commandsDir) return [];
295: 	return loadFilesFromDir<SlashCommand>(commandsDir, "commands", provider, root);
296: }
```

`claude-plugins` 只查 `commands/` 与 `slash-commands/`。

## prompts 与 commands 是两种不同能力

`src/discovery/omp-plugins.ts:88-94`：

```
88: 	if (!root) return [];
89: 	const dir = path.join(root.path, "commands");
90: 	if (!(await dirExists(dir))) return [];
91: 	return loadFilesFromDir<SlashCommand>(dir, "commands", "omp-plugins", root);
92: }
93:
94: export async function listOmpPluginPrompts(
```

`src/discovery/omp-plugins.ts:135-141`：

```
135: 	const roots = await listOmpExtensionRoots(homeDir, cwd);
136: 	const out: Prompt[] = [];
137: 	for (const root of roots) {
138: 		const dir = path.join(root.path, "prompts");
139: 		if (!(await dirExists(dir))) continue;
140: 		out.push(...(await loadFilesFromDir<Prompt>(dir, "prompts", "omp-plugins", root)));
141: 	}
```

`commands/` 注册为 `SlashCommand`（裸名可用），`prompts/` 注册为 `Prompt`（走 `/prompts:` 菜单）。两者由同一 provider 处理，但目录与能力类型不同。

`src/discovery/builtin.ts:343-347`：

```
343: export async function listNativeCommands(
344: 	configDir: string,
345: ): Promise<readonly SlashCommand[]> {
346: 	const dir = path.join(configDir, "commands");
347: 	if (!(await dirExists(dir))) return [];
```

原生 slash command 目录是 `<configDir>/commands`。本机 `~/.omp/agent/commands` 不存在。

## Better Harness 的目录构成（本缝隙的实例）

```
commands/                     不存在
slash-commands/               不存在
prompts/better-harness.md     存在，791 bytes
.claude-plugin/plugin.json    无 commands 键，无 slash-commands 键
package.json                  pi.skills="./skills"，pi.prompts="./prompts"
```

`better-harness@better-harness` v0.6.6 为 marketplace 安装（记录于 `~/.omp/plugins/installed_plugins.json`）。

## 未验证边界

- 未观测到实际启动了重复的 LSP 进程。以上只证明配置读取路径可达、server key 存在重名与新增，未观测运行时进程数。
- 未观测插件 `eslint` 条目是否真的覆盖了内置条目（合并顺序在 `config.ts:437-439` 注释中写明「plugin's own file wins」，但未实测最终生效值）。
- 未在启用 `claude-plugins` 后实测 `/prompts:better-harness` 是否出现。
