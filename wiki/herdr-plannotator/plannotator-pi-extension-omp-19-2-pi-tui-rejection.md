# Plannotator pi-extension 的 OMP 19.2 legacy pi-tui 拒绝：0.29.3/0.29.4、doctor 假绿与本地快捷键补丁

> Sources: 本会话本机实测，2026-11-25; `backnotprop/plannotator#4045`, 2026-11-25; 2026-11-27 复发与重打实测
> Raw: [OMP 19.2 legacy pi-tui 拒绝与本机补丁](../../raw/herdr-plannotator/2026-11-25-omp-19-2-pi-tui-rejection-and-local-patch.md); [补丁复发与重打](../../raw/herdr-plannotator/2026-11-27-plannotator-patch-recurrence-and-reapply.md)
> Updated: 2026-11-27

## Overview

OMP 19.2.0 会拒绝仍导入 `@earendil-works/pi-tui` 的 Plannotator pi-extension。`0.29.3` 与已发布的 `0.29.4` 都受影响；问题不在 `omp plugin doctor` 报告的安装健康状态，而在扩展入口的真实模块导入。删除旧 `pi-tui` 的 `Key` 导入和 `Ctrl+Alt+P` 快捷键注册后，本机 `0.29.3` 可以通过 OMP `loadExtensions()` 绑定；代价是失去该快捷键，且这个本地补丁会被后续安装或升级覆盖。2026-11-27 复核时两段代码又回到文件里，补丁已不在（丢失原因未取证），按同样方式重打后 loader 再次通过。

## 故障证据

本机补丁前环境为 OMP `19.2.0` 与 `@plannotator/pi-extension 0.29.3`。插件 `package.json` 的 `pi.extensions` 是 `["./"]`，所以 OMP 加载包根 `index.ts`。直接调用 OMP 的 `importExtensionModule()` 后，加载器返回的错误明确指出入口导入 `@earendil-works/pi-tui`，OMP 已不再提供这个旧组件 API，并指向 reactive `@oh-my-pi/pi-tui` 的迁移说明。

`0.29.4` 发布包也没有解决这个问题：`npm pack @plannotator/pi-extension@0.29.4` 解包后，`index.ts:27` 仍是 `import { Key } from "@earendil-works/pi-tui";`，`index.ts:1813` 仍注册 `pi.registerShortcut(Key.ctrlAlt("p"), ...)`。因此升级到 `0.29.4` 仍会触发同一类拒绝。

## doctor 假绿的边界

补丁后 `omp plugin doctor --json` 仍返回 8 项 `ok`，包括 `@plannotator/pi-extension v0.29.3`。这能说明插件目录、共享 `node_modules`、manifest 与入口路径存在；不能说明入口可被 OMP 导入并绑定。OMP 19.2.0 的 doctor 源码逐插件读取 `omp`/`pi` manifest，检查 tools、hooks、extensions 路径是否存在；扩展入口存在性检查调用 `fs.existsSync()`，没有执行模块导入。检查项数量会随本机插件数量和 manifest 字段变化，「8 项 ok」只是本轮快照，不是固定检查数。

遇到扩展兼容性问题时，应以 OMP `importExtensionModule()` 或 `loadExtensions()` 的直接结果为准，doctor 全绿只能排除文件缺失和版本漂移。

## 本地补丁

用户不使用 `Ctrl+Alt+P` 快捷键时，可以做最小本地补丁：

1. 删除 `index.ts` 中的 `import { Key } from "@earendil-works/pi-tui";`
2. 删除 `pi.registerShortcut(Key.ctrlAlt("p"), { ... });` 注册块

补丁后，本机入口不再包含 `@earendil-works/pi-tui`、`Key.ctrlAlt` 或 `registerShortcut`。用 OMP `loadExtensions()` 直接加载该入口，结果为 `errors: []`、`extensions: 1`。

这个补丁只绕开旧 `pi-tui` 导入，没有迁移 Plannotator 的 UI 代码；后续 `omp plugin install`、插件升级或 `uv-bun --up` 都可能覆盖本地改动。补丁后也没有在真实 OMP 会话里交互打开 Plannotator 页面，本轮验收到的是扩展加载与绑定成功。

## 补丁复发与重打

2026-11-27 复核：OMP 为 `19.2.1`，插件仍是 `0.29.3`，`index.ts` 里 `import { Key } from "@earendil-works/pi-tui";` 与 `pi.registerShortcut(Key.ctrlAlt("p"), ...)` 都在。丢失原因未取证，能确认的只是文件回到未补丁状态。

重打仍按两步删除，另外同步三处文档：头部 Features 注释、README 中两处提到 `Ctrl+Alt+P` 的句子，以及 README 的 `## Keyboard shortcuts` 整节。README 与头部注释同样属于随包内容，升级时会一起被覆盖。

本次验证比上一轮多两条断言：`plannotator-plan-mode`、`plannotator-review`、`plannotator-annotate`、`plannotator-last` 四个命令都在 `extension.commands` 里，`extension.shortcuts.size` 为 `0`，同时 `errors` 为空、`extensions` 为 `1`。

## 上游状态

`backnotprop/plannotator#4045` 已覆盖同一问题，状态为 open。已发布评论补充三点：`0.29.4` 仍有同一导入；OMP `loadExtensions()` 可直接复现；删除旧 `pi-tui` 导入和快捷键注册可在不需要 `Ctrl+Alt+P` 时临时恢复加载。上游修复需要迁移快捷键或 UI 代码到当前 OMP API，或把该注册做成兼容分支。

## See Also

- [Plannotator OMP 插件运行机制](plannotator-omp-plugin-mechanism.md)
- [Plannotator pi-extension 混版故障](pi-extension-mixed-tree-failure.md)
- [Herdr + Plannotator 工具链全量 Reference](toolchain-reference.md)
