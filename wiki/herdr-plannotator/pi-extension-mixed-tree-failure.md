# Plannotator pi-extension 混版故障：Export named not found + ?mtime=

> Sources: 本机取证（2026-10-01）；npm registry；plannotator release notes
> Raw: [pi-extension 混版事故取证](../../raw/herdr-plannotator/2026-10-01-pi-extension-mixed-tree-incident.md); [release notes 0.27.15-0.27.24](../../raw/herdr-plannotator/2026-10-01-release-notes-0.27.15-0.27.24.md)
> Updated: 2026-10-01

## 症状签名

会话内报 `Failed to start annotation UI: Export named '<符号>' not found in module '...pi-extension/<文件>?mtime=<数字>'`，同一会话重复报、重试无效。这是 ESM link 期错误：加载器读到的模块图里，import 方文件来自新版本、被 import 方文件来自旧版本。

## 根因

`~/.omp/plugins/node_modules/` 下的插件目录被写成了**混版**：一次未完成的安装把部分文件写成了新版本，其余文件停留在旧版本，且 package.json/bun.lock/omp-plugins.lock.json 未被更新（成功安装才会 flush）。OMP 的 legacy-pi 加载器每次加载打 `?mtime=<加载时刻>` 的 cache-bust tag（`legacy-pi-compat.ts:2099-2104`，tag 是墙钟时间不是文件 mtime），混版图谱一旦在该 tag 下链接失败，同进程重试复用同一失败结果，所以同会话内不会自愈。

2026-10-01 实例：`resolveReviewProgress` 由 0.27.23 引入（registry 发布 05:41；该版本新功能 "Code review remembers what you have viewed"，PR #1632）。报错会话 11:37:10 加载时，`server/serverReview.ts` 已是 ≥0.27.23（有 import），`generated/config.ts` 仍是 0.27.22（无 export）。npm pack 实测 0.27.22/0.27.23/0.27.24 三个发布版本各自自洽——没有任何已发布版本自身是坏的，报错必是混版。混版制造者的直接证据被 11:42 的完整安装覆盖，无法最终证实；最可能是开机后 11:29 一条被中断的裸 `bun update --latest`（**推断**）。

## 修复（按有效性排序）

1. **重跑安装让树写齐**：`uv-bun --up` 或 `omp plugin install <pkg>@latest --force`。2026-10-01 实例中用户 11:37:51 跑 `uv-bun --up`，11:42:13-16 0.27.24 完整落盘，故障消失。
2. **重开会话**：运行中的进程持有失败的模块图谱，装齐后必须新会话才生效。plannotator 官方 release notes 每版 Pi 段也写 "and restart Pi"。

## 预防

- 在 `~/.omp/plugins` 目录跑 bun/安装命令时不要中断（Ctrl+C、关终端、杀进程）。
- 再遇同类报错不用排查符号本身，直接重装 + 重开会话。
- 治本在上游：安装应先落到临时目录再原子换入（temp-dir + rename），或安装期间阻塞扩展加载。OMP 侧 09-27 已有同类前科（node-pty 编译失败导致 bun install exit 127 中途留下不完整现场，见 [Plannotator 工具链参考](toolchain-reference.md)）。

## 取证方法（可复用）

- `npm pack <pkg>@<旧版本>` 解包后 grep 符号，判定「发布版本自身坏」还是「混版」。
- registry `time` 字段给发布时间窗，与本机文件 mtime、日志时间戳对齐做时间线。
- zsh 历史 epoch 秒转本地时间定位用户动作。
- 报错里的 `?mtime=` 数字是加载时刻（epoch 毫秒），可直接换算定位是哪次会话启动。

## 两套产物路径（2026-10-01 实测）

- 独立 CLI：`/home/cpf/.local/bin/plannotator`（145.5M 单文件二进制，官方 install.sh 安装），与插件互不共享文件，本类故障不涉及它。
- OMP 插件：`~/.omp/plugins/node_modules/@plannotator/pi-extension/`（实体目录，非 symlink），清单在 `~/.omp/plugins/package.json`、`bun.lock`、`omp-plugins.lock.json`。
- bun 全局 `~/.bun/install/global/node_modules/` 下无 `@plannotator`，全局 bun 命令碰不到插件。

## See Also

- [Plannotator 工具链参考](toolchain-reference.md) — 09-27 node-pty/node-gyp 安装失败前科
- [OMP 内置 slash 命令全量枚举](../omp-slash-commands/builtin-slash-commands.md) — /plannotator-last 等命令归属
