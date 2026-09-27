# Plannotator OMP 插件运行机制：slash command 归属、浏览器服务链路与 node-pty 编译门

> Sources: 本机诊断与源码阅读, 2026-09-27
> Raw: [Plannotator OMP 插件升级失败：node-pty 编译门与 node-gyp 修复](../../raw/herdr-plannotator/2026-09-27-plannotator-node-pty-node-gyp-upgrade-failure.md); [Plannotator OMP 插件 slash command 归属与浏览器服务链路](../../raw/herdr-plannotator/2026-09-27-plannotator-omp-plugin-slash-command-and-serving.md)
> Updated: 2026-09-27

## Overview

Plannotator 以两条互不依赖的通道存在于本机：OMP 插件 `@plannotator/pi-extension`（2026-09-27 升级至 0.27.21）在 OMP 进程内注册原生 slash command 并自建 HTTP 服务器供浏览器标注；`~/.claude/skills` 下的同名 skill 家族（安装者未验证）让 agent shell 出去调独立二进制（`~/.local/bin/plannotator`，同为 0.27.21）。OMP 插件的升级受 node-pty 原生编译门约束：node-pty@1.1.0 的发布包不含 linux-x64 预编译产物，Linux 下安装脚本需 node-gyp 现场编译，缺它则整个插件安装失败。

## 双通道总览

**插件通道（OMP 内）**：`pi-extension` 的 `index.ts` 用 `pi.registerCommand` 注册四个原生 slash command（0.27.21 实测行号）：`plannotator-plan-mode`（663 行）、`plannotator-review`（670 行）、`plannotator-annotate`（770 行）、`plannotator-last`（1071 行）。插件 manifest 只有 `extensions` 与 `skills` 两项——skills 仅一个 `skills/plannotator/SKILL.md`，没有 commands 字段；命令全靠扩展代码在运行时注册。

**skill 通道（~/.claude/skills）**：`~/.claude/skills/plannotator-last/SKILL.md` 声明 `allowed-tools: Bash(plannotator:*)`，正文是 bang 命令 ``!`plannotator annotate-last $ARGUMENTS` ``——agent 以 Bash 执行，PATH 解析到独立 CLI 二进制。家族共四个实体目录（plannotator、plannotator-annotate、plannotator-last、plannotator-review，修改时间 2026-09-27 10:25）加三个软链进 `~/.agents/skills`（plannotator-compound、plannotator-setup-goal、plannotator-visual-explainer）。安装者未验证，仅有软链结构与修改时间证据。

两通道只是同名，各用各的实现：OMP 里敲 `/plannotator-last` 走插件注册的原生命令，不调全局二进制；skill 文件被哪个宿主加载未验证，但其执行内容是调 CLI。

## /plannotator-last：注册与数据流

处理器（index.ts:1073 起）全链路：

1. `parseAnnotateArgs` 解析 `--gate`（Stop-hook 审查门用）
2. `hasPlanBrowserHtml()` 检查打包 HTML 资产，缺失直接报错返回
3. `currentPiSession.update(ctx)` 更新会话快照，`getLastAssistantMessageSnapshot(ctx)` 取最后一条 assistant 消息（取不到则报错返回）
4. `getRecentAssistantMessages(ctx, 25)` 取最近 25 条，多于一条时供界面挑选
5. `startLastMessageAnnotationSession(ctx, snapshot.text, gate, pickerMessages)`（plannotator-browser.ts:861）启动会话，返回带 `url` 的 session 对象
6. `session.waitForDecision()` 挂起等待；用户批注完成后把反馈经 `sendUserMessageWithCurrentSessionFallback` 以 `followUp` 发回 OMP 会话

命令处理链（取消息到回传）不调用 `plannotator` CLI，数据直接来自活会话的 ctx。边界说明：插件其他模块确实使用 `child_process`——`server/network.ts:322` spawn 浏览器启动器 glimpseCli、`:406` spawn 浏览器命令——但那不属于命令处理链，也不提供标注内容。

## 浏览器服务链路

标注界面由插件进程内的 HTTP 服务器提供：

- `server/serverAnnotate.ts:711` `createServer`（`node:http`），`:1202` `listenOnPort(server)` 绑端口
- 批注回传是 HTTP POST，不是 WebSocket：`/api/approve`（:1107）、`/api/feedback`（:1148）；其中 `/api/feedback` 不做请求体类型校验（:490-491 注释，与 `/api/approve` 不同）
- 端口选择见 `server/network.ts:197` 的 `listenOnPort`：支持 `PLANNOTATOR_PORT` 环境变量（单端口或区间段形式），占用时重试（MAX_RETRIES 5 次、间隔 500ms）
- 页面是打包资产：包根目录的 `plannotator.html`、`review-editor.html`；`hasPlanBrowserHtml()` 就是防资产缺失的闸门（缺失提示「Run 'bun run build' in the pi-extension directory」）

## node-pty 编译门

**依赖链**：`@plannotator/pi-extension` → `@plannotator/webtui@0.1.0` → `node-pty@^1.1.0`（bun.lock 118 行与 320 行；pi-extension package.json:61）。node-pty 提升到 OMP 插件共享 node_modules 顶层（`/home/cpf/.omp/plugins/node_modules/node-pty`）——所有插件共用一个 node_modules，任一插件的安装脚本失败会拖垮全部插件安装。

**缺口**：node-pty@1.1.0 的 `prebuilds/` 只有 darwin-arm64、darwin-x64、win32-arm64、win32-x64 四个平台，没有 linux-x64（安装副本实测）。Linux 下安装脚本检测不到平台目录就回退源码编译，需要 node-gyp。

**故障形态**：`node-gyp: command not found` → 安装脚本 exit 127 → `bun install` 失败。实测一次常规升级（0.27.20 → 0.27.21）即触发 node-pty 重建，plannotator 升级与 ponytail Git 刷新双双 aborted。

**修复**：`bun add -g node-gyp`（装得 13.0.2）后重跑 `uv-bun --up`，plannotator 升至 0.27.21，健康检查 5 ok，`build/Release/pty.node` 编译产物生成。本机 g++/cc/make/python3 与 Node v24.21.0 本就齐全，缺的只有 node-gyp。

**决策**：node-gyp 常驻全局。node-pty 的 Linux 预编译缺口是其发布形态决定的，不会自行修复；插件升级重新解包 node-pty 时会再次需要 node-gyp；node-gyp 自身是纯 JavaScript 驱动包，常驻代价近零。

**边界认知**：OMP 插件健康检查只做存在性验证（plugins_directory、package_manifest、node_modules、插件版本行，共 5 项），不加载 pty.node。终端能力有优雅降级：`generated/agent-terminal.ts:17-22` 定义了 `webtui-unavailable`、`pty-unavailable` 等禁用原因，导入 `@plannotator/webtui` 失败时禁用终端桥接（server/agent-terminal.ts:12 起），其余功能不受影响。

## slash command 归属排查流程

同名命令在不同宿主可能分属两个实现，排查时两条通道都查：

1. **宿主的原生命令注册机制**：OMP 插件查扩展源码的 `pi.registerCommand` 调用（以及 commands 目录机制）
2. **同名 skill 文件的实际执行内容**：读 SKILL.md 的 bang 命令与 `allowed-tools`，确认它 shell 出去调什么二进制

两条通道的结论可能完全不同（本案：插件通道进程内自处理，skill 通道调独立 CLI），只查一条会得出错误归属。

## See Also

- [Herdr + Plannotator 工具链全量 Reference](toolchain-reference.md)
