# OMP 扩展自动加载机制

> Sources: oh-my-pi 上游源码直读（can1357/oh-my-pi commit 71c5eec）+ 本机 canary 探针实测（2026-09-19）
> Raw: [extension-auto-loading-canary](../../raw/omp-tips/2026-09-19-extension-auto-loading-canary.md)
> Updated: 2026-09-19

OMP 会自动扫描扩展目录加载全部 `*.ts`/`*.js` 扩展文件；config.yml 的 `extensions` 列表只是追加/去重，**不是加载开关**。

## 四路合并机制

`discoverExtensionPaths()`（loader.ts:561-650）把四个来源合并成一个发现列表，用 `seen` 集合去重：

1. extension-modules capability（`providers:["native"]`，loader.ts:597-603）
2. hook capability（loader.ts:610-618）
3. 已安装插件（loader.ts:626-628）
4. config.yml 显式路径（loader.ts:631-647）——sdk.ts:799-805 中 config.yml 的 `extensions` 只作为 `configuredPaths` 追加进发现列表

`loadExtensionModules()`（builtin.ts:464-562）对每个 `getConfigDirs()` 返回的 dir 扫描 `dir+'/extensions'`（builtin.ts:486），并读取 `settings.json` 的 `extensions` 数组（builtin.ts:509-524）。`getConfigDirs()`（builtin.ts:58-73）：`project=<cwd>/.omp`，`user=getAgentDir()`（即 `~/.omp/agent`）。

`discoverExtensionModulePaths()`（helpers.ts:818-857）用 glob `'*.{ts,js}'`，直接子文件即视为扩展入口。

## 扫描范围

自动扫描：
- `~/.omp/agent/extensions/*.ts|js`（用户级）
- `<cwd>/.omp/extensions/*.ts|js`（项目级）
- hooks 的扩展入口
- 已安装插件的扩展入口

**不扫描**：`~/.omp/.pi/extensions/`（不在 native SOURCE_PATHS，需 config.yml 显式声明才加载）。

排除机制：
- `disabledExtensions` 列表（id 形如 `extension-module:<name>`）
- `--no-extensions` 全局关闭
- 非 `.ts`/`.js` 后缀（如 `.archived`）不匹配 glob

## canary 实测证据（2026-09-19）

写入 `~/.omp/agent/extensions/zz-canary-probe.ts`（未在 config.yml 声明），运行 `omp -p 'Reply with exactly: ok'`，canary 工厂函数被实际调用并写标记文件（时间戳 2026-09-19T15:27:24.852Z）→ 证明自动加载。

对照：`omp --no-extensions -p ...` 同一 canary 未加载 → 证明加载来自 discovery 机制。测试后 canary 与标记文件已清理。

## 禁用扩展的正确方法

**常见误区**：只删 config.yml 声明不能禁用目录里的扩展——自动扫描路径下的文件不依赖 config.yml 声明。

正确做法（按优先级）：
1. 改名加 `.archived` 后缀（如 `umans-status.ts` → `umans-status.ts.archived`），不匹配 glob 即不再加载
2. 加入 `disabledExtensions` 列表
3. 临时全局关闭：`--no-extensions`

## 本机现状（2026-09-19）

本机当前生效扩展 4 个：`rtk.ts`（config.yml 声明，位于 `~/.omp/.pi/extensions/`——正因不在自动扫描范围才需要声明）、`herdr-omp-agent-state.ts`、`task-agent-required.ts`、`win-ntf-notify.ts`（后三个自动扫描）。已归档 2 个：`umans-status.ts.archived`、`advisor-cache-observer.ts.archived`。

## See Also

- [Responses API web_search 服务端执行与 usage 计量](../responses-api/web-search-usage-forensics.md)
