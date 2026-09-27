# Plannotator OMP 插件 slash command 归属与浏览器服务链路（0.27.21 源码实证）

> Source: 本机源码阅读：`@plannotator/pi-extension@0.27.21`（`~/.omp/plugins/node_modules`）与 `~/.claude/skills`
> Collected: 2026-09-27
> Published: Unknown

## 插件注册的 slash command（index.ts，0.27.21 实测行号）

```
663:  pi.registerCommand("plannotator-plan-mode", { description: "Toggle plannotator planning mode", ... });
670:  pi.registerCommand("plannotator-review", { description: "Open interactive code review for current changes or a PR URL; ...", ... });
770:  pi.registerCommand("plannotator-annotate", { description: "Open markdown file or folder in annotation UI", ... });
1071: pi.registerCommand("plannotator-last", { description: "Annotate the last assistant message", ... });
```

插件 manifest（uv-bun 安装输出）只有 extensions 与 skills，无 commands 字段：

```
"manifest": {
  "extensions": ["./"],
  "skills": ["skills/plannotator/SKILL.md"],
  "version": "0.27.21"
}
```

## /plannotator-last 处理器数据流（index.ts:1073-1103）

```ts
handler: async (args, ctx) => {
    // Support --gate on /plannotator-last for the Stop-hook review gate.
    const { parseAnnotateArgs } = await import("./generated/annotate-args.ts");
    const { gate } = parseAnnotateArgs(args ?? "");
    if (!hasPlanBrowserHtml()) { ctx.ui.notify("Annotation UI not available. Run 'bun run build' in the pi-extension directory.", "error"); return; }
    currentPiSession.update(ctx);
    const origin = getPiSessionIdentity(ctx);
    const snapshot = getLastAssistantMessageSnapshot(ctx);
    if (!snapshot) { ctx.ui.notify("No assistant message found in session.", "error"); return; }
    const recent = getRecentAssistantMessages(ctx, 25);
    const pickerMessages = recent.length > 1 ? recent : undefined;
    ctx.ui.notify("Opening annotation UI for last message...", "info");
    const session = await startLastMessageAnnotationSession(ctx, snapshot.text, gate, pickerMessages);
    ctx.ui.notify(sessionOpenedMessage("Last-message annotation opened", session.url), "info");
    void session.waitForDecision().then(async (result) => { ... sendUserMessageWithCurrentSessionFallback(pi, prompt, { deliverAs: "followUp" }, ...) ... });
```

`plannotator-browser.ts:861` 定义 `startLastMessageAnnotationSession(ctx, lastText, gate?, recentMessages?)`；`plannotator-events.ts:62-65` 显示它经 `loadPlannotatorBrowser()` 按需加载浏览器/服务器模块图。

命令处理链（取消息到回传）内未见 `plannotator` CLI 调用。

## 浏览器服务链路（插件进程内 HTTP 服务器）

`server/serverAnnotate.ts`：

```
3:   import { createServer } from "node:http";
711: const server = createServer(async (req, res) => { ... });
1202: const { port, portSource } = await listenOnPort(server);
1107: } else if (url.pathname === "/api/approve" && req.method === "POST") {
1148: } else if (url.pathname === "/api/feedback" && req.method === "POST") {
```

批注回传为 HTTP POST（`/api/approve`、`/api/feedback`），无 WebSocket。serverAnnotate.ts:490-491 注释：「/api/feedback does not type-validate its body (unlike /api/approve)」。

`server/network.ts:197` `export async function listenOnPort(server)`；端口选择支持 `PLANNOTATOR_PORT` 环境变量（network.test.ts: `process.env.PLANNOTATOR_PORT = "start-start+1"` 段/单端口形式），占用时重试（MAX_RETRIES = 5，RETRY_DELAY_MS = 500）。

标注界面 HTML 是打包资产：`index.ts` 的 `hasPlanBrowserHtml()` 检查缺失时报「Run 'bun run build' in the pi-extension directory」；包根目录有 `plannotator.html`、`review-editor.html`。

插件其他模块对 `node:child_process` 的使用（与命令处理链无关）：`server/network.ts:322` `spawn(glimpseCli, ...)` 启动浏览器启动器、`:406` `spawn(cmd, args, ...)` 打开浏览器。

## 终端能力降级机制

`generated/agent-terminal.ts:17-22` 的不可用原因枚举：

```
| "not-annotate-mode"
| "remote-disabled"
| "runtime-unavailable"
| "webtui-unavailable"
| "pty-unavailable"
| "unsupported-runtime";
```

`server/agent-terminal.ts:12` 从 `@plannotator/webtui/core` 导入 `PtyBackend` 等类型；导入失败时禁用终端桥接。

## OMP 插件 health check 的实际覆盖

uv-bun 输出的健康检查五项均为存在性检查：plugins_directory、package_manifest、node_modules、两个插件的版本行。Summary: 5 ok。它不验证运行时功能（例如不加载 pty.node）。

## 另一入口：~/.claude/skills 下的同名 skill

`/home/cpf/.claude/skills/plannotator-last/SKILL.md` 全文要点：

```
---
name: plannotator-last
description: Open Plannotator on the latest rendered assistant message and use the returned annotations to revise that message or continue.
allowed-tools: Bash(plannotator:*)
---

# Plannotator Last

## Message annotations

:!`plannotator annotate-last $ARGUMENTS`
```

`!` 前缀 = 以 Bash 执行；`plannotator` 经 PATH 解析到 `/home/cpf/.local/bin/plannotator`（145.3 MB 单文件，非 bun 全局包；`plannotator --help` 确认 `annotate-last` 子命令存在）。该 skill 的执行方式是让 agent shell 出去调独立 CLI；它服务哪些宿主、CLI 内部如何组织上下文，本机证据未验证。

## ~/.claude/skills 的 plannotator 家族（ls -la 实测）

```
drwxrwxr-x 3 cpf cpf 4096 Sep 27 10:25 plannotator
drwxrwxr-x 2 cpf cpf 4096 Sep 27 10:25 plannotator-annotate
lrwxrwxrwx 1 cpf cpf   41 Jul  5 22:30 plannotator-compound -> ../../.agents/skills/plannotator-compound
drwxrwxr-x 2 cpf cpf 4096 Sep 27 10:25 plannotator-last
drwxrwxr-x 2 cpf cpf 4096 Sep 27 10:25 plannotator-review
lrwxrwxrwx 1 cpf cpf   43 Jul  5 22:30 plannotator-setup-goal -> ../../.agents/skills/plannotator-setup-goal
lrwxrwxrwx 1 cpf cpf   49 Jul  5 22:30 plannotator-visual-explainer -> ../../.agents/skills/plannotator-visual-explainer
```

`~/.claude/skills/plannotator/SKILL.md` 与插件包内 `skills/plannotator/SKILL.md` 内容相同（diff -q 实测 SAME）。安装者未验证：四个实体目录修改时间为 2026-09-27 10:25、三个软链指向 `~/.agents/skills`；谁写入了这些文件，现有本机证据不能判定。

## slash command 归属的双通道排查流程

同名命令在不同宿主可能分属两个实现，排查时两条通道都要查：

1. 宿主的原生命令注册机制：OMP 插件查扩展源码的 `pi.registerCommand`（及 commands 目录）；
2. 同名 skill 文件的实际执行内容：读 SKILL.md 的 bang 命令 / allowed-tools，确认它 shell 出去调什么。

## 版本核对（写入阶段补录，2026-09-27）

`plannotator --version` 输出：

```
plannotator 0.27.21
```

独立 CLI（`~/.local/bin/plannotator`）与 pi-extension 插件（0.27.21）同版本，均为 2026-09-27 本机实测。
