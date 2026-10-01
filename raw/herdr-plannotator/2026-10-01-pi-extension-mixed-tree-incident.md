# plannotator pi-extension 混版事故：resolveReviewProgress 导出缺失报错

> Source URL: 本机文件系统、OMP 日志、npm registry、zsh 历史
> Collected: 2026-10-01
> Published: Unknown

## 报错原文

```
Opening annotation UI for last message...
Error: Failed to start annotation UI: Export named 'resolveReviewProgress' not found in module
'/home/cpf/.omp/plugins/node_modules/@plannotator/pi-extension/generated/config.ts?mtime=1790825830279'.
```
（同一会话连报两次，mtime 相同）

## 三个发布版本各自自洽（npm pack 实测）

- 0.27.22：全包 `grep -rn resolveReviewProgress` 零命中（既无导出也无导入）。
- 0.27.23：`generated/config.ts:778` 有 `export function resolveReviewProgress(`，`server/serverReview.ts:11` 有同名 import，`:630` 调用。
- 0.27.24：与 0.27.23 同样自洽（本机磁盘文件验证，config.ts:778 / serverReview.ts:11）。

结论：报错只能来自混版目录树——≥0.27.23 的 serverReview.ts（有 import）与 0.27.22 的 config.ts（无 export）共存。

## registry 发布时间（registry.npmjs.org）

- 0.27.21 2026-09-26T22:44:58.914Z
- 0.27.22 2026-09-29T01:21:12.481Z
- 0.27.23 2026-09-30T21:41:59.984Z（本地 10-01 05:41）
- 0.27.24 2026-10-01T03:27:26.456Z（本地 11:27）
- dist-tags: latest = 0.27.24

## `?mtime=` tag 语义（oh-my-pi 源码，HEAD 73a11421fe）

`packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:2099-2104`：

```typescript
let legacyPiLoadTag = 0;
function nextLegacyPiLoadTag(): string {
	legacyPiLoadTag = Math.max(legacyPiLoadTag + 1, Date.now());
	return String(legacyPiLoadTag);
}
```

`:2630` `return await import(`${entrySpecifier}?mtime=${nextLegacyPiLoadTag()}`)`；`:1115-1121` 注释说明 extension 相对 import 一律改写带 `?mtime=<tag>` 的 cache-bust。tag 是加载时刻的墙钟时间，不是文件 mtime。1790825830279 = 2026-10-01 11:37:10.279 本地，即报错会话（pid 19584，日志首行 11:37:09.555）启动时的扩展加载。

## 文件与安装时间线（本地，+0800）

- 11:20 前后：WSL 开机（12:54 测 uptime 1:34）。
- 11:27:26：0.27.24 发布。
- 11:29:01-11:35:27：zsh 历史记录用户跑 `ncu -u -g`、`bun update --latest`（11:29:06，裸命令、历史行带尾部反斜杠形态异常）、`bun update -g --latest`、`bun add -g ...`、`bun upgrade`。
- 11:37:09：epoch 1790825829 `omp --resume 01a0f104-...`（报错会话启动）。
- 11:37:10.279：扩展加载，ESM link 报错（import 方已是 ≥0.27.23 代码，config.ts 仍是 0.27.22）。
- 11:37:51：epoch 1790825871 `uv-bun --up`（用户修复动作；uv-bun:237-247 对 plannotator 跑官方 installer https://plannotator.ai/install.sh，带一次重试）。
- 11:42:08-11:42:24：五个一行 OMP CLI 日志（pid 24352/24400/24592/24780/24818）。
- 11:42:13.731 / 11:42:14.543：`generated/config.ts`、`server/serverReview.ts`、`package.json` 写入（0.27.24 装齐）；bun 缓存 `@plannotator/pi-extension@0.27.24@@@1` 解出 11:42:14.543。
- 11:42:16.753：`~/.omp/plugins/bun.lock` 与 `~/.omp/plugins/package.json` 写入，spec 变为 `^0.27.24`。

## 修复前后版本证据

- agc 仓库 `git diff --cached omp/plugins/omp-plugins.lock.json`：`"version": "0.27.22"` → `"0.27.24"`；`package.json`：`^0.27.22` → `^0.27.24`。
- 修复前 lock 停在 0.27.22：0.27.23 从未成功安装过（混版只能来自未完成的写入）。
- `~/.omp/plugins/node_modules/@plannotator/`：`pi-extension/` 与 `webtui/` 为实体目录（非 symlink）。
- 独立 CLI：`/home/cpf/.local/bin/plannotator`，145.5M 单文件二进制，`plannotator --version` 报 0.27.24。`~/.bun/install/global/node_modules/` 下无 `@plannotator`。
- bunfig：plugins 目录与 `$HOME` 均无 bunfig.toml，无 minimumReleaseAge 干扰。

## 排除法记录

- 05:00-11:38 无 OMP 会话 transcript 含 plugin install / install.sh / uv-bun 痕迹（7189 文件扫描后按窗口过滤）。
- 无 crontab、无相关 systemd user timer。
- copilot-api 的 bun.lock/package.json mtime 为 2026-09-30 00:18，oh-my-pi 的 bun.lock 为 2026-09-23，11:29 的裸 `bun update --latest` 不在这些目录执行。
- 报错文本不进 OMP 日志（全日志 grep 无 "Failed to start annotation UI"），属 UI 层输出。
- 混版制造者的直接证据已被 11:42 完整安装覆盖，无法最终证实；最可能是 11:29:06 被中断的裸 `bun update --latest`（推断）。

## 09-27 前科（wiki 已有记录）

wiki/herdr-plannotator 已记录 2026-09-27 事故：`omp plugin install @plannotator/pi-extension@latest` 因 node-pty 需现场编译而 node-gyp 缺失，bun install exit 127 中途失败；修复为 `bun add -g node-gyp`（13.0.2）+ 重跑 `uv-bun --up`。同属「安装中断留下不完整现场」类别。
