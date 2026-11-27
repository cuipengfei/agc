# Plannotator pi-extension 0.29.5 在 OMP 19.2.1 上的加载恢复

> Source: 本机文件核对 `~/.omp/plugins/node_modules/@plannotator/pi-extension`；OMP `loadExtensions()` 输出；2026-11-27
> Collected: 2026-11-27
> Published: Unknown

## 1. 版本快照

```text
$ omp --version
omp/19.2.1

$ jq -r '.version' ~/.omp/plugins/node_modules/@plannotator/pi-extension/package.json
0.29.5

$ jq -c '.pi' ~/.omp/plugins/node_modules/@plannotator/pi-extension/package.json
{"extensions":["./"]}

$ jq -r '.dependencies["@plannotator/pi-extension"]' ~/.omp/plugins/package.json
^0.29.5
```

`~` 为展示用的路径缩写，实际执行使用绝对路径。

文件时间：

```text
$ stat -c '%y %n' index.ts package.json README.md
2026-11-27 20:13:53.563907257 +0800 index.ts
2026-11-27 20:13:53.223907268 +0800 package.json
2026-11-27 20:13:53.223907268 +0800 README.md
```

## 2. 导入与快捷键现状

`index.ts` 头部对 `@earendil-works` 包的导入只有三项：

```ts
import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
```

快捷键注册：

```ts
1812|	pi.registerShortcut("ctrl+alt+p", {
1813|		description: "Toggle plannotator",
1814|		handler: async (ctx) => {
1815|			await togglePlanMode(ctx);
1816|		},
1817|	});
```

`pi-tui` 检索：

```text
$ grep -rn 'pi-tui' --include='*.ts' .
（无输出）

$ grep -rn 'earendil-works/pi-tui' .
package.json:90:    "@earendil-works/pi-tui": ">=0.79.1",
```

`package.json:90` 位于 devDependencies，运行时入口不导入这个包。

## 3. 与 0.29.3/0.29.4 的差异

0.29.3 与 0.29.4 的 `index.ts` 包含：

```ts
import { Key } from "@earendil-works/pi-tui";
```

```ts
pi.registerShortcut(Key.ctrlAlt("p"), {
```

0.29.5 删除了 `Key` 导入，快捷键参数改为字符串 `"ctrl+alt+p"`。

## 4. OMP 加载器验证

### 4.1 直接加载 index.ts

```bash
bun -e 'import { loadExtensions } from "/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/extensibility/extensions/loader.ts";
  const r = await loadExtensions(["/home/cpf/.omp/plugins/node_modules/@plannotator/pi-extension/index.ts"], "/home/cpf/.omp/plugins");
  const e = r.extensions[0];
  console.log(JSON.stringify({errors:r.errors, extensions:r.extensions.length, commands:e ? [...e.commands.keys()] : null, shortcuts:e ? [...e.shortcuts.keys()] : null, tools:e ? [...e.tools.keys()] : null}, null, 2));
  process.exit(r.errors.length ? 1 : 0);'
```

```json
{
  "errors": [],
  "extensions": 1,
  "commands": [
    "plannotator-plan-mode",
    "plannotator-review",
    "plannotator-annotate",
    "plannotator-last",
    "plannotator-inbox"
  ],
  "shortcuts": [
    "ctrl+alt+p"
  ],
  "tools": [
    "plannotator",
    "plannotator_mark_done",
    "plannotator_submit_plan"
  ]
}
```

### 4.2 按 package.json 的 pi.extensions 加载包目录

```bash
bun -e 'import { loadExtensions } from "/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/extensibility/extensions/loader.ts";
  const r = await loadExtensions(["/home/cpf/.omp/plugins/node_modules/@plannotator/pi-extension"], "/home/cpf/.omp/plugins");
  console.log(JSON.stringify({errors:r.errors, extensions:r.extensions.length}, null, 2));
  process.exit(r.errors.length ? 1 : 0);'
```

```text
{
  "errors": [],
  "extensions": 1
}
rc=0
```

## 5. 证据边界

- 一手直读：`omp --version`、插件 `package.json` 的版本与 `pi` 字段、三个文件的 mtime、`index.ts` 导入区与 `index.ts:1812` 快捷键块、两次 grep 输出、两次 `loadExtensions` 输出。
- 推断：0.29.5 由 2026-11-27 20:13 的一次安装或升级装入；触发这次安装的具体命令未取证。
- 未核实：真实 OMP 会话里打开 Plannotator 页面的交互结果；上游 issue #4045 本轮未复查。
