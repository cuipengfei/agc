# Orca 的实现构成与发行物关系

> Sources: GitHub API（repo、languages），2026-11-28；Orca main 分支 `package.json`、`pnpm-workspace.yaml`、`mobile/package.json` 与源码，2026-11-28；npm registry，2026-11-28
> Raw: [源码构成、配置路径与 npm registry 核实](../../raw/agent-development-environments/2026-11-28-orca-codebase-config-and-npm.md); [Linux 发行物、serve 与 Web 客户端核实](../../raw/agent-development-environments/2026-11-28-orca-linux-distribution-and-serve.md)
> Updated: 2026-11-28

## Overview

Orca 是 MIT 的 TypeScript 项目，GitHub 上 `fork=false`，初始提交 2026-03-17；语言统计 TypeScript 95.6%、JavaScript 3.2%。应用外壳是 Electron 45.4.1，界面用 React ~19.2.9，CLI 与 orcad 都是 Node 进程。桌面包内置 orcad；server-only tar 是同一套源码分出的并行子集，不是桌面包的底座。npm 上没有官方 Orca 包。

## 代码构成

- 主进程 `src/main`：Electron 主进程、PTY、Git、文件、provider、SQLite 与 runtime server。
- 桥接 `src/preload`：contextBridge。
- 界面 `src/renderer`：React + Tailwind；编辑器嵌 Monaco，终端嵌 xterm；入口 `src/renderer/src/main.tsx`。
- CLI `src/cli`：`orca` / `orca-ide`，入口 `src/cli/index.ts`。
- 共享层 `src/shared`：类型与协议。
- 内部 workspace 包：`src/packages/process-host`；pnpm workspace 还包含 `native/windows-notifications`、`native/windows-registry`、`native/windows-security`。
- 服务端：`src/main/orcad/`；终端 daemon：`src/main/daemon/`。
- 移动端：`mobile/`，React Native 0.88.1 + Expo ~58.0.22，独立 workspace。
- 云端：`cloud/` 下是 Cloudflare Workers 应用，例如 `cloud/apps/relay-edge/wrangler.jsonc`、`cloud/apps/push/wrangler.jsonc`。
- 平台模块：`native/wayland-clipboard` 用 C，`native/windows-agent-hook` 用 Rust，`native/computer-use-macos` 用 Swift，`native/computer-use-windows` 用 PowerShell，`native/computer-use-linux` 用 Python。

依赖版本（main 分支）：Electron 45.4.1、React ~19.2.9、TypeScript ^7.0.2、Vite ^8.3.6、Tailwind ^4.3.5、node-pty ^1.1.0、Monaco ^0.55.1、@xterm/xterm 6.1.0-beta.336、Zustand ^5.1.0、electron-builder 26.15.3、Vitest 5.1.0、Playwright ^1.64.1、oxlint ^1.94.0；Node 24，包管理用 pnpm。

## 进程与数据

`src/main/index.ts` 是 Electron 主进程入口，`main` 指向 `./out/main/index.js`；`src/cli/index.ts` 是 CLI 入口；orcad 是独立的 Node 服务端，发布时带固定版本 Node。`serve` 默认用 orcad，orcad 起不来时回退桌面应用内的 server。

profile 状态在 SQLite 里：`profiles/<profile-id>/profile-state.db`，schema 版本 3，表 `profile_state_meta` 与 `profile_state_documents`；`src/main/sqlite/sync-database.ts` 从 `node:sqlite` 导入 `DatabaseSync` 等类型。`orca-data.json` 是迁移前的 JSON 状态。完整的配置目录见 [Orca 在 Linux/WSL 的安装、serve 与 Web 客户端](orca-linux-install-and-web-client.md)。

## 发行物关系

三个桌面包由 `config/scripts/desktop-distribution/linux/package-linux-formats.mjs` 调 electron-builder 生成，参数含 `--prepackaged appDirectory`。桌面包内置 bundled orcad：`src/main/orcad/runtime-launch/orcad-bundled-runtime.ts` 在应用目录解析运行时，`serve` 直接使用它。

server-only tar 由 `config/scripts/orcad-distribution/server-bundle/build-orcad.mjs` 用 esbuild 单独构建，打包 orcad 入口、CLI、launcher 和固定 Node 运行时。它去掉 Electron、GTK/X11/Xvfb 和 web client，得到的是无头子集，与桌面包共用源码和 orcad 代码，没有谁从谁的包里解出来。

## npm

npm 上没有官方 Orca。`orca` 这个包名属于 Plotly 的图片导出工具，latest 是 1.3.1，描述为 "Plotly's image-exporting utilities"，`bin` 是 `{'orca': 'bin/orca.js'}`。

以下候选全部 404：`orca-ide`、`@stablyai/orca`、`@orca/cli`、`@orca/web`、`@orca/server`、`@orca/core`、`@stablyai/orca-server`、`orca-server`。

`@stablyai` scope 下已发布的是 `@stablyai/playwright-test 2.1.16`、`@stablyai/email 0.1.2`、`@stablyai/playwright 2.1.16`、`@stablyai/playwright-base 2.1.16`、`@stablyai/internal-playwright-cli 0.1.3`、`@stablyai/ci-run-id 0.1.1`，都跟 Orca IDE 无关。

文档里的 `npx skills add https://github.com/stablyai/orca --skill orca-cli` 安装的是 agent skill，不是 Orca 本体。

## 证据边界

- 未安装、未运行 Orca；代码构成、配置路径与构建关系来自 main 分支源码与脚本。
- main 分支 `package.json` 读取时为 1.4.214，GitHub Releases latest 为 v1.4.281；两者按各自来源记录，不推断关系。
- npm registry 与 GitHub API 是 2026-11-28 的快照。

## See Also

- [Orca 在 Linux/WSL 的安装、serve 与 Web 客户端](orca-linux-install-and-web-client.md)
- [T3 Code、Orca 与 Herdr TUI 的运行形态和本地化边界](t3code-orca-herdr-run-surfaces.md)
