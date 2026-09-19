# OMP 扩展自动加载机制 —— 源码直读 + canary 探针实测原始记录

> Source: oh-my-pi 上游源码直读（can1357/oh-my-pi commit 71c5eec）+ 本机 canary 探针实测（2026-09-19）
> Collected: 2026-09-19
> Published: Unknown

## A. 结论

OMP 会自动扫描扩展目录加载全部 `*.ts`/`*.js` 扩展文件；config.yml 的 `extensions` 列表只是追加/去重，不是加载开关。

## B. 源码证据（can1357/oh-my-pi，commit 71c5eec）

- `packages/coding-agent/src/extensions/loader.ts:561-650` `discoverExtensionPaths()` 四路合并：
  1. extension-modules capability（`providers:["native"]`，loader.ts:597-603）
  2. hook capability（610-618）
  3. 已安装插件（626-628）
  4. config.yml 显式路径（631-647）

  用 `seen` 集合去重。
- `packages/coding-agent/src/discovery/builtin.ts:464-562` `loadExtensionModules()`：对每个 `getConfigDirs()` 返回的 dir 扫描 `dir+'/extensions'`（builtin.ts:486），并读取 `settings.json` 的 `extensions` 数组（509-524）。
- `discovery/builtin.ts:58-73` `getConfigDirs()`：`project=<cwd>/.omp`，`user=getAgentDir()`（即 `~/.omp/agent`）。
- `discovery/helpers.ts:818-857` `discoverExtensionModulePaths()`：glob `'*.{ts,js}'`，直接子文件即视为扩展入口。
- `sdk.ts:799-805`：config.yml 的 `extensions` 只作为 `configuredPaths` 追加进发现列表。

## C. canary 实测（2026-09-19）

- 写入 `~/.omp/agent/extensions/zz-canary-probe.ts`（未在 config.yml 声明），运行 `omp -p 'Reply with exactly: ok'`，canary 工厂函数被实际调用并写标记文件（时间戳 2026-09-19T15:27:24.852Z）→ 证明自动加载。
- 对照：`omp --no-extensions -p ...` 同一 canary 未加载 → 证明加载来自 discovery 机制，而非 config.yml。
- 测试后 canary 与标记文件已清理。

## D. 扫描范围

自动扫描：
- `~/.omp/agent/extensions/*.ts|js`（用户级）
- `<cwd>/.omp/extensions/*.ts|js`（项目级）
- hooks 的扩展入口
- 已安装插件的扩展入口

不扫描：
- `~/.omp/.pi/extensions/`（不在 native SOURCE_PATHS，需 config.yml 显式声明才加载）

排除机制：
- `disabledExtensions` 列表（id 形如 `extension-module:<name>`）
- `--no-extensions` 全局关闭
- 非 `.ts`/`.js` 后缀（如 `.archived`）不匹配 glob

## E. 本机应用（2026-09-19）

- 禁用扩展正确做法：改名加 `.archived` 后缀（如 `umans-status.ts` → `umans-status.ts.archived`），而非只删 config.yml 声明。
- 本机当前生效扩展 4 个：
  - `rtk.ts`（config.yml 声明，位于 `~/.omp/.pi/extensions/`）
  - `herdr-omp-agent-state.ts`（自动扫描）
  - `task-agent-required.ts`（自动扫描）
  - `win-ntf-notify.ts`（自动扫描）
- 已归档 2 个：`umans-status.ts.archived`、`advisor-cache-observer.ts.archived`
