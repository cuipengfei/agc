# Plannotator pi-extension 补丁复发与重打（OMP 19.2.1）

> Source: 本机文件核对 `~/.omp/plugins/node_modules/@plannotator/pi-extension`；OMP `loadExtensions()` 输出；2026-11-25 补丁会话记录
> Collected: 2026-11-27
> Published: Unknown

## 1. 版本快照

```text
$ omp --version
omp/19.2.1

$ jq -r '.version' ~/.omp/plugins/node_modules/@plannotator/pi-extension/package.json
0.29.3
```

`package.json` 的 `pi.extensions` 为 `["./"]`，OMP 加载包根 `index.ts`。

## 2. 2026-11-27 复核时补丁不在文件里的状态

重打前，`index.ts` 中：

```ts
26|} from "@earendil-works/pi-coding-agent";
27|import { Key } from "@earendil-works/pi-tui";
```

```ts
1813|	pi.registerShortcut(Key.ctrlAlt("p"), {
1814|		description: "Toggle plannotator",
1815|		handler: async (ctx) => {
1816|			await togglePlanMode(ctx);
1817|		},
1818|	});
```

2026-11-25 的补丁删除过这两段，本轮两段均在文件里。补丁丢失的具体原因未取证。

## 3. 本次改动

`index.ts` 三处：

1. 头部 Features 注释由 `/plannotator-plan-mode command or Ctrl+Alt+P to toggle` 改为 `/plannotator-plan-mode command to toggle`
2. 删除 `import { Key } from "@earendil-works/pi-tui";`
3. 删除 `pi.registerShortcut(Key.ctrlAlt("p"), { ... })` 整块

`README.md` 三处：

1. 计划模式说明句去掉 ` or `Ctrl+Alt+P``
2. 「Pressing Esc in Pi no longer cancels an open plan review」句的括号说明只保留 `/plannotator-plan-mode`
3. 删除 `## Keyboard shortcuts` 整节及其 `Ctrl+Alt+P` 表行

## 4. 验证

```bash
$ bun -e 'import { loadExtensions } from "~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/extensibility/extensions/loader.ts";
  const r = await loadExtensions(["~/.omp/plugins/node_modules/@plannotator/pi-extension/index.ts"], "~/.omp/plugins");
  ... 断言 errors 为空、extensions 为 1、四条命令在 extension.commands、shortcuts.size 为 0 ...'

{"errors":[],"extensions":1,"commands":["plannotator-plan-mode","plannotator-review","plannotator-annotate","plannotator-last"],"shortcuts":0}
```

`~` 为展示用的路径缩写，实际执行使用绝对路径。

## 5. 证据边界

- 一手直读：版本号、`pi.extensions`、重打前的两段源码、重打后的 loader 输出
- 推断：补丁由重装或升级覆盖。观察到的事实只是文件回到未补丁状态，没有安装日志佐证
- 未核实：npm 上是否已发布修复版；真实 TUI 里打开 Plannotator 页面的交互结果
