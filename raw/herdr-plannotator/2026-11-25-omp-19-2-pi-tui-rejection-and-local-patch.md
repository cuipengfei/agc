# Plannotator pi-extension 在 OMP 19.2 的 legacy pi-tui 拒绝与本机补丁

> Source: 本会话本机命令输出、OMP 19.2.0 源码摘录、`npm pack @plannotator/pi-extension@0.29.4`、`backnotprop/plannotator#4045` 及已发布评论
> Collected: 2026-11-25
> Published: Unknown

## 1. 本机版本与插件入口

```bash
$ omp --version
omp/19.2.0
$ jq {name,version,pi} package.json
{
  "name": "@plannotator/pi-extension",
  "version": "0.29.3",
  "pi": {
    "extensions": [
      "./"
    ]
  }
}
```

## 2. 未补丁 0.29.3 的 OMP loader 失败

```bash
$ bun -e 'import { importExtensionModule } from "/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/extensibility/extensions/loader.ts"; const r = await importExtensionModule("/home/cpf/.omp/plugins/node_modules/@plannotator/pi-extension/index.ts", "/home/cpf/.omp/plugins"); console.log(JSON.stringify({path:r.path, factory:typeof r.factory, resolvedPath:r.resolvedPath, error:r.error}, null, 2));'
```

```json
{
  "path": "/home/cpf/.omp/plugins/node_modules/@plannotator/pi-extension/index.ts",
  "factory": "object",
  "resolvedPath": "/home/cpf/.omp/plugins/node_modules/@plannotator/pi-extension/index.ts",
  "error": "Failed to load extension: /home/cpf/.omp/plugins/node_modules/@plannotator/pi-extension/index.ts imports \"@earendil-works/pi-tui\", which omp no longer provides: its component API was replaced by the reactive @oh-my-pi/pi-tui. Return pi-tui nodes (JSX from \"@oh-my-pi/pi-tui\") or a { render(width): string[] } rows object from renderers, ctx.ui.custom and ctx.ui.setWidget; replace ctx.ui.setEditorComponent with the ctx.ui.composer hooks; import Theme types from \"@oh-my-pi/pi-coding-agent\". See docs/extensions.md#migrating-from-pi-tui."
}
```

## 3. `omp plugin doctor` 输出与源码边界

补丁后 `omp plugin doctor --json` 仍报告 8 项 `ok`：

```json
[
  {"name":"plugins_directory","status":"ok","message":"Found at /home/cpf/.omp/plugins"},
  {"name":"package_manifest","status":"ok","message":"Found"},
  {"name":"node_modules","status":"ok","message":"Found"},
  {"name":"plugin:@dietrichgebert/ponytail","status":"ok","message":"v5.3.3 - Lazy senior dev mode for AI agents. The best code is the code you never wrote."},
  {"name":"plugin:@plannotator/pi-extension","status":"ok","message":"v0.29.3 - Plannotator Pi extension - interactive plan review with annotations, annotate agent messages, and review code/PRs"},
  {"name":"plugin:ns-omp-provider-kiro","status":"ok","message":"v0.5.3 - OMP (oh-my-pi) provider plugin: adds Kiro (AWS CodeWhisperer/Q) models via your kiro-cli login"},
  {"name":"plugin:omp-kit-companion","status":"ok","message":"v0.2.150 - Tested stream-triggered rules and a guarded CLI for an existing OMP installation"},
  {"name":"plugin:graphify-pi","status":"ok","message":"vundefined - Native Pi (and Oh My Pi) bridge to Graphify's installed hook-guard CLI"}
]
```

OMP 19.2.0 `src/extensibility/plugins/manager.ts` 的相关检查只读 manifest 并检查路径存在；没有导入扩展模块：

```ts
const hasManifest = !!(pluginPkg.omp || pluginPkg.pi);
const manifest: PluginManifest | undefined = pluginPkg.omp || pluginPkg.pi;

checks.push({
  name: `plugin:${name}`,
  status: hasManifest ? "ok" : "warning",
  message: hasManifest
    ? `v${pluginPkg.version}${pluginPkg.description ? ` - ${pluginPkg.description}` : ""}`
    : `v${pluginPkg.version} - No omp/pi manifest (not an omp plugin)`,
});

// Check tools path exists if specified
if (manifest?.tools) {
  const toolsPath = path.join(pluginPath, manifest.tools);
  if (!fs.existsSync(toolsPath)) {
    checks.push({
      name: `plugin:${name}:tools`,
      status: "error",
      message: `Tools entry "${manifest.tools}" not found`,
    });
  }
}

// Check hooks path exists if specified
if (manifest?.hooks) {
  const hooksPath = path.join(pluginPath, manifest.hooks);
  if (!fs.existsSync(hooksPath)) {
    checks.push({
      name: `plugin:${name}:hooks`,
      status: "error",
      message: `Hooks entry "${manifest.hooks}" not found`,
    });
  }
}

// Check extension entry paths exist if specified
if (manifest?.extensions) {
  for (const extensionPath of manifest.extensions) {
    const resolvedExtensionPath = path.join(pluginPath, extensionPath);
    if (!fs.existsSync(resolvedExtensionPath)) {
      checks.push({
        name: `plugin:${name}:extension:${extensionPath}`,
        status: "error",
        message: `Extension entry "${extensionPath}" not found`,
      });
    }
  }
}
```

## 4. 0.29.4 发布包仍有同一导入

```bash
$ npm pack --silent @plannotator/pi-extension@0.29.4 --pack-destination "$tmp" >/dev/null
$ tar -xOf "$tmp"/plannotator-pi-extension-0.29.4.tgz package/index.ts | grep -nE '@earendil-works/pi-tui|Key\.ctrlAlt|registerShortcut'
27:import { Key } from "@earendil-works/pi-tui";
1813:	pi.registerShortcut(Key.ctrlAlt("p"), {
```

## 5. 本地补丁与验证

本机补丁从 `~/.omp/plugins/node_modules/@plannotator/pi-extension/index.ts` 删除两段代码：

```ts
import { Key } from "@earendil-works/pi-tui";
```

```ts
pi.registerShortcut(Key.ctrlAlt("p"), {
  description: "Toggle plannotator",
  handler: async (ctx) => {
    await togglePlanMode(ctx);
  },
});
```

补丁后入口中不再含旧 `pi-tui` 导入或快捷键注册，OMP `loadExtensions()` 可以绑定扩展：

```bash
$ grep -nE '@earendil-works/pi-tui|Key\.ctrlAlt|registerShortcut' /home/cpf/.omp/plugins/node_modules/@plannotator/pi-extension/index.ts || true
$ bun -e 'import { loadExtensions } from "/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/extensibility/extensions/loader.ts"; const r = await loadExtensions(["/home/cpf/.omp/plugins/node_modules/@plannotator/pi-extension/index.ts"], "/home/cpf/.omp/plugins"); console.log(JSON.stringify({errors:r.errors, extensions:r.extensions.length}, null, 2)); process.exit(r.errors.length ? 1 : 0);'
```

```json
{
  "errors": [],
  "extensions": 1
}
```

## 6. 上游 issue 与已发布评论

上游 issue：

- 标题：`Pi extension: OMP 19.2.0 rejects legacy pi-tui import (tested on 0.29.3)`
- 状态：open
- URL：https://github.com/backnotprop/plannotator/issues/4045

已发布评论：https://github.com/backnotprop/plannotator/issues/4045#issuecomment-7167045771

评论正文：

```md
Confirming this on the npm-installed `0.29.3` package as well.

- `package.json` exposes `pi.extensions: ["./"]`, so OMP loads `index.ts`.
- `index.ts` imports `Key` from `@earendil-works/pi-tui` and registers `Key.ctrlAlt("p")`.
- The published `0.29.4` entry still imports `@earendil-works/pi-tui`, so upgrading to `0.29.4` does not avoid the OMP 19.2 loader rejection.
- Calling OMP's `loadExtensions()` directly against the installed `0.29.3` entry reproduces the same legacy `pi-tui` import failure.

Temporary local workaround: remove the `@earendil-works/pi-tui` import and the `pi.registerShortcut(Key.ctrlAlt("p"), ...)` block. After that, OMP `loadExtensions()` binds the extension successfully (`errors: []`, `extensions: 1`) when the Ctrl+Alt+P shortcut is not needed.

This unblocks a local install, but the upstream fix likely needs to migrate the shortcut/UI usage to the current OMP API or make that registration conditional.
```
