# Orca 源码构成、配置路径与 npm registry 核实（2026-11-28）

> Source: GitHub API `repos/stablyai/orca` 与 `languages`；main 分支 `package.json`、`pnpm-workspace.yaml`、`mobile/package.json`；main 分支源码文件；npm registry 查询
> Collected: 2026-11-28
> Published: Unknown

## GitHub 仓库

- fork=false
- parent=None
- license=MIT
- created_at=2026-03-17T03:28:57Z
- 仓库创建日期：2026-03-17。

## 语言占比（GitHub languages API）

| Language | Share | Bytes |
| --- | --- | --- |
| TypeScript | 95.6% | 151270759 |
| JavaScript | 3.2% | 5127179 |
| Swift | 0.3% | 500725 |
| CSS | 0.2% | 324926 |
| Python | 0.1% | 228927 |
| PowerShell | 0.1% | 167711 |
| Kotlin | 0.1% | 117193 |
| C | 0.1% | 108494 |
| HTML | 0.1% | 107883 |
| Shell | 0.0% | 68241 |
| C++ | 0.0% | 43340 |
| Rust | 0.0% | 28940 |
| Ruby | 0.0% | 21535 |
| NSIS | 0.0% | 20513 |
| Dockerfile | 0.0% | 15445 |
| Objective-C | 0.0% | 7556 |
| Java | 0.0% | 3372 |
| Batchfile | 0.0% | 999 |
| VBScript | 0.0% | 745 |

## package.json（main 分支）

| Field | Value |
| --- | --- |
| name | orca |
| version | 1.4.214 |
| main | ./out/main/index.js |
| engines | {"node": "24"} |
| bin | {"orca": "./out/cli/index.js", "orca-dev": "./config/scripts/development/launch/orca-dev.mjs"} |
| electron | 45.4.1 |
| electron-vite | ^6.0.0 |
| vite | ^8.3.6 |
| react | ~19.2.9 |
| react-dom | ~19.2.9 |
| typescript | ^7.0.2 |
| tailwindcss | ^4.3.5 |
| node-pty | ^1.1.0 |
| monaco-editor | ^0.55.1 |
| @xterm/xterm | 6.1.0-beta.336 |
| zustand | ^5.1.0 |
| electron-builder | 26.15.3 |
| vitest | 5.1.0 |
| @playwright/test | ^1.64.1 |
| oxlint | ^1.94.0 |

pnpm workspace 的 `packages` 包含 `native/windows-notifications`、`native/windows-registry`、`native/windows-security`、`src/packages/*`；`src/packages/` 下只有 `process-host`。

移动端 `mobile/package.json`：`name=orca-mobile`、`react-native 0.88.1`、`expo ~58.0.22`、`react 19.3.0`、`typescript ^7.0.2`。

## 入口与分层

- `src/main/index.ts`：Electron 主进程入口；`main` 指向 `./out/main/index.js`。
- `src/preload/index.ts`：contextBridge。
- `src/renderer/src/main.tsx`：React 界面入口。
- `src/cli/index.ts`：CLI 入口。
- `src/packages/process-host`：内部 workspace 包。
- `src/main/orcad/`：orcad 服务端；`src/main/daemon/`：终端 daemon。
- `src/main/sqlite/sync-database.ts` 从 `node:sqlite` 导入 `DatabaseSync` 等类型，SQLite 走 Node 内置模块。
- `native/wayland-clipboard`：C；`native/windows-agent-hook`：Rust；`native/computer-use-macos`：Swift；`native/computer-use-windows`：PowerShell；`native/computer-use-linux`：Python。
- `cloud/` 目录含 Cloudflare Workers 应用（`cloud/apps/relay-edge/wrangler.jsonc`、`cloud/apps/push/wrangler.jsonc` 等）。

## 配置路径（源码）

`src/cli/runtime/profile/metadata.ts`：

```
if (platform === 'darwin') {
  return join(homeDir, 'Library', 'Application Support', 'orca')
}
...
// Match Electron’s packaged userData path.
return join(process.env.XDG_CONFIG_HOME || join(homeDir, '.config'), 'orca')
```

`src/cli/runtime/profile/launch-user-data-path.ts`：`ORCA_USER_DATA_PATH` 优先；dev 走 `ORCA_DEV_USER_DATA_PATH`；`pinServeUserDataPath` 额外设置 `ORCA_SERVE_USER_DATA_PATH`，并追加 `--user-data-dir=<path>`。

`src/shared/orca-profiles/profile-state-storage-paths.ts`：

```
export const PROFILE_STATE_DATABASE_FILE_NAME = 'profile-state.db'
export function getOrcaProfileDataFile(profileId, userDataPath) {
  return join(userDataPath, 'profiles', profileId, 'orca-data.json')
}
export function getOrcaProfileStateDatabaseFile(profileId, userDataPath) {
  return profileStateDatabaseFile(join(userDataPath, 'profiles', profileId))
}
```

`src/main/persistence/profile-state/database/profile-state-database-schema.ts`：`PROFILE_STATE_DATABASE_SCHEMA_VERSION = 3`；表 `profile_state_meta`、`profile_state_documents`。

`src/shared/orca-profiles/persisted-state-types.ts` 的 `PersistedState` 含 `settings: GlobalSettings`；profile-state documents 按 domain 存顶层状态。

`src/main/orca-profiles/profile-storage-paths.ts`：`PROFILE_INDEX_FILE_NAME = 'orca-profile-index.json'`、`PROFILE_BROWSER_SESSION_META_FILE_NAME = 'browser-session-meta.json'`、`PROFILE_DIRECTORY_NAME = 'profiles'`、`LEGACY_DATA_FILE_NAME = 'orca-data.json'`。

`src/main/keybindings/keybinding-file.ts`：

```
export function getUserKeybindingsPath(homePath: string): string {
  return join(homePath, '.orca', 'keybindings.json')
}
```

`src/main/startup/main-process-account-services.ts`：`homePath: app.getPath('home')`。

`src/main/bitbucket/credential-store.ts`：`return join(homedir(), '.orca')`。

- 测试里的 `linear-token.enc`、`linear-tokens/*.enc`、`jira-tokens/*.enc` 同样位于 `$HOME/.orca`。
- agent hooks 脚本位于 `$HOME/.orca/agent-hooks/`，例如 `claude-hook.sh`、`codex-hook.sh`。

`src/main/persistence/loading-store/user-data-path.ts`：`orca-data.json` 与 `orca-github-cache.json` 在 userData 根目录。

Docker 测试脚本 `config/docker/headless-serve-shutdown/run-signal-case.sh` 检查 `$ORCA_USER_DATA_PATH/orca-runtime.json`，并断言 `$XDG_CONFIG_HOME/orca/orca-runtime.json` 不存在。

## Web 端本地存储

- `src/renderer/src/web/pairing/web-runtime-environment.ts`：`ENVIRONMENT_STORAGE_KEY = 'orca.web.runtimeEnvironment.v1'`，读写 `window.localStorage`。
- `src/renderer/src/web/preload-api/preferences/web-preferences-store.ts`：`SETTINGS_STORAGE_KEY`、`UI_STORAGE_KEY`；`settings.get` 通过 `callRuntimeResult` 取 runtime 设置，离线时回退到本地存储。
- `src/renderer/src/web/preload-api/preferences/web-settings-api.ts`：`settings.set` 先写本地，再 `syncRuntimeBackedSettings`。

## 发行物构建

- `config/scripts/desktop-distribution/linux/package-linux-formats.mjs`：对 `AppImage`、`deb`、`rpm` 调 electron-builder，参数含 `--prepackaged appDirectory`。
- `config/scripts/orcad-distribution/server-bundle/build-orcad.mjs`：用 esbuild 构建 orcad 入口、CLI、launcher，打包固定 Node 运行时。
- `src/main/orcad/runtime-launch/orcad-bundled-runtime.ts`：在应用目录解析 bundled runtime；`serve` 默认用 orcad，失败时回退桌面内 server。

- `docs/cli/overview.mdx` 的 `npx skills add https://github.com/stablyai/orca --skill orca-cli` 安装的是 agent skill，不是 Orca 本体。

## npm registry（2026-11-28）

- orca: latest=1.3.1 desc="Plotly's image-exporting utilities" bin={'orca': 'bin/orca.js'}
- orca-ide: 404
- @stablyai/orca: 404
- @orca/cli: 404
- @orca/web: 404
- @orca/server: 404
- @orca/core: 404
- @stablyai/orca-server: 404
- orca-server: 404

`@stablyai` scope 已发布包：

- @stablyai/playwright-test 2.1.16
- @stablyai/email 0.1.2
- @stablyai/playwright 2.1.16
- @stablyai/playwright-base 2.1.16
- @stablyai/internal-playwright-cli 0.1.3
- @stablyai/ci-run-id 0.1.1

## 版本差异

- main 分支 `package.json` 读取时为 `1.4.214`。
- GitHub Releases latest 为 `v1.4.281`。
- 两者按各自来源记录，不推断它们的关系。

## 证据边界

- 未安装、未运行 Orca；配置路径与构建关系来自 main 分支源码与脚本。
- npm registry 与 GitHub API 为 2026-11-28 快照。
