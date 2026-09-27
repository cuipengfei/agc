# Plannotator OMP 插件升级失败：node-pty 编译门与 node-gyp 修复

> Source: 本机诊断：uv-bun --up 输出、`~/.omp/plugins` 依赖树、node-pty 安装副本实测
> Collected: 2026-09-27
> Published: Unknown

## 失败现象（uv-bun --up 输出摘录）

```
checking OMP registry plugins...
  bun outdated v1.4.2 (744846f84)
  | Package                   | Current | Update  | Latest  |
  | @plannotator/pi-extension | 0.27.20 | 0.27.21 | 0.27.21 |
  upgrade: omp plugin install <package>@latest --force
  upgrading @plannotator/pi-extension to latest via OMP...
  ✘ Failed to install @plannotator/pi-extension@latest: Error: bun install failed: Resolving dependencies
  Resolved, downloaded and extracted [16]
  > Checking prebuilds...
  > Rebuilding because directory /home/cpf/.omp/plugins/node_modules/node-pty/prebuilds/linux-x64 does not exist

  /usr/bin/bash: line 1: node-gyp: command not found

  error: install script from "node-pty" exited with 127
  FAILED omp plugin install @plannotator/pi-extension@latest (rc=1)
  refreshing Git plugin via OMP: https://github.com/DietrichGebert/ponytail
  ✘ Failed to install https://github.com/DietrichGebert/ponytail: Error: bun install failed: > Checking prebuilds...
  > Rebuilding because directory /home/cpf/.omp/plugins/node_modules/node-pty/prebuilds/linux-x64 does not exist

  /usr/bin/bash: line 1: node-gyp: command not found

  error: install script from "node-pty" exited with 127
  FAILED omp plugin install https://github.com/DietrichGebert/ponytail (rc=1)
```

两个失败都停在同一处：OMP 所有插件共享 `~/.omp/plugins` 一个 node_modules，`bun install` 重建依赖树时 node-pty 的安装脚本需要 node-gyp。

## 取证：node-pty 预编译产物缺口（本机安装副本实测）

`ls /home/cpf/.omp/plugins/node_modules/node-pty/prebuilds`：

```
darwin-arm64/
darwin-x64/
win32-arm64/
win32-x64/
```

`grep '"version"'` → `"version": "1.1.0"`。node-pty@1.1.0 的发布包不带 linux-x64 预编译产物，Linux 下安装脚本回退源码编译，需要 node-gyp。

## 取证：依赖链

`grep -n 'node-pty' /home/cpf/.omp/plugins/bun.lock`：

```
118:    "@plannotator/webtui": ["@plannotator/webtui@0.1.0", "", { "dependencies": { ... "node-pty": "^1.1.0", ... } }, ...],
320:    "node-pty": ["node-pty@1.1.0", "", { "dependencies": { "node-addon-api": "^7.1.0" } }, ...],
```

`grep -n 'webtui' ~/.omp/plugins/node_modules/@plannotator/pi-extension/package.json` → `61:    "@plannotator/webtui": "0.1.0",`

链：`@plannotator/pi-extension` → `@plannotator/webtui@0.1.0` → `node-pty@^1.1.0`（提升到共享 node_modules 顶层）。

## 取证：本机工具链

```
g++: /usr/bin/g++
cc: /usr/bin/cc
make: /usr/bin/make
python3: /usr/bin/python3
node v24.21.0  (/home/cpf/.local/opt/node-current/bin/node)
node-gyp: MISSING  (which rc=1)
```

编译工具链齐全，缺的只有 node-gyp。

## 修复与验证

```
$ bun add -g node-gyp
installed node-gyp@13.0.2 with binaries:
 - node-gyp
4 packages installed [4.52s]
$ node-gyp --version
v13.0.2
```

重跑 `uv-bun --up`：

```
upgrading @plannotator/pi-extension to latest via OMP...
  ✔ Installed @plannotator/pi-extension@0.27.21
  refreshing Git plugin via OMP: https://github.com/DietrichGebert/ponytail
  ✔ Installed @dietrichgebert/ponytail@4.10.0
  Plugin Health Check
  ✔ plugins_directory: Found at /home/cpf/.omp/plugins
  ✔ package_manifest: Found
  ✔ node_modules: Found
  ✔ plugin:@dietrichgebert/ponytail: v4.10.0
  ✔ plugin:@plannotator/pi-extension: v0.27.21
  Summary: 5 ok, 0 warnings, 0 errors
```

原生绑定编译产物验证（修复前该目录无 build/）：

```
/home/cpf/.omp/plugins/node_modules/node-pty/build/Release/pty.node   （存在）
```

## 决策：node-gyp 常驻全局

skill `bun-global-install-with-temporary-helper-cleanup` 的默认流程是临时装 node-gyp、编完卸载。本案改为常驻，理由：

1. node-pty 的 linux-x64 预编译缺口是这个包发布形态决定的，不会自行修复；
2. 本次常规版本升级（0.27.20 → 0.27.21）即触发了 node-pty 安装脚本重跑，说明插件升级重新解包 node-pty 时会再次需要 node-gyp；
3. node-gyp 是纯 JavaScript 包（自身不含原生代码，是调 g++/make 的驱动），常驻代价近零。

下次插件升级若再次触发 node-pty 重建，全局 node-gyp 直接可用。
