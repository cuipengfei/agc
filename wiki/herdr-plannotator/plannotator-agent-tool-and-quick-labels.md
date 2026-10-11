# Plannotator agent tool 注入与 Quick Labels 机制

> Sources: backnotprop/plannotator 官方源码，2026-10-11；本机 OMP pi-extension 0.28.12 实测，2026-10-11
> Raw: [Plannotator agent tool 注入、Quick Labels 与 config.json 键清单](../../raw/herdr-plannotator/2026-10-11-plannotator-agent-tool-and-quick-labels.md)
> Updated: 2026-10-11

## Overview

Plannotator 在 OMP 上的 agent 工具（`plannotator`）默认关闭（Pi 主机），需环境变量、配置文件或 CLI 打开；Quick Labels 是可自定义的一键标注，存在 cookie 里跨端口持久，但快速栏的 👍 是硬编码例外。`~/.plannotator/config.json` 支持 38 个顶层配置键，未写的键走默认值。

## agent tool 的开关链

工具注册判定链，优先级最高者胜出：

```
PLANNOTATOR_AGENT_TOOL 环境变量 → config.agentTool → AGENT_TOOL_DEFAULTS[host]
```

默认值表（官方 `packages/shared/config.ts`）：claude-code 默认开；**Pi 和 OpenCode 2 默认关**。env 值 `1`/`true`/`on` 开，`0`/`false`/`off`/`disabled` 关，空值算未设。每次会话启动只读一次，改动对下个会话生效——工具列表是模型 prompt 的一部分，会话中途改变会破坏 prompt 缓存。

Inbox 工具（`plannotator_inbox`）默认值与 agent tool 用同一张表（`INBOX_TOOL_DEFAULTS = AGENT_TOOL_DEFAULTS`），开关键 `inboxTool` 支持全主机共用布尔或按主机 `{"pi": true}`。

## OMP 的 .env 注入通道

OMP 核心 `@oh-my-pi/pi-utils/env.ts` 在 import 时把四个 .env 依次合并进进程环境（只填未设置的键）：项目 → agent 目录 → 配置根 → 家目录。因此 `~/.omp/agent/.env` 里的 `PLANNOTATOR_AGENT_TOOL=1` 与 `~/.plannotator/config.json` 的 `"agentTool": true` 等效，且环境变量压过配置文件。

> **注意**：真实进程环境（如 shell 启动文件）已有的同名变量优先级最高，且项目 .env 也会被 Bun 预加载，这两层都可能压过 agent 目录 .env。

## Quick Labels：可配置的标注与硬编码的 👍

Quick Labels 是预设的一键反馈标注，存浏览器 cookie（键 `plannotator-quick-labels`），不是 localStorage——标注会话每次随机端口，cookie 按域名共享所以跨端口持久，localStorage 按端口隔离会丢。

默认 10 个标签（Clarify this、Missing overview、Verify this、Give me an example、Match existing patterns、Consider alternatives、Ensure no regression、Out of scope、Needs tests、Nice approach），多数带 tip——选中标签时 tip 整段注入反馈给 agent，是自定义时最有用的维度。

**两套机制分界**：标注工具栏的快速栏按钮硬编码 `THUMBS_UP_LABEL`（👍 "Looks good"），刻意不在可配置集内，也是 comment-only 界面唯一允许发出的标签；⚡️ 按钮打开的菜单才展示全部可配置标签（含自定义）。没有配置入口把自定义标签固定到快速栏——最接近的替代是把常用标签排到列表第 1 位用 Alt+1 快捷键。

Settings → Labels 编辑器支持：改 emoji（严格单 grapheme 校验，ZWJ 序列/旗帜/keycap 均可）、改文字（自动派生 id）、选 10 色、编辑 tip、上下排序（**顺序决定 Alt+数字快捷键**：第 1 位 = Alt+1，第 10 位 = Alt+0）、删除、新增（上限 12 个，第 11、12 个无快捷键）、Reset to defaults。

## config.json 的 38 个支持键

分组清单（未写的键走各自默认值，文件只需写想覆盖的键）：

- **显示与外观(7)**：`displayName`、`theme`、`diffOptions`、`favicon`、`agentTerminalSide`、`agentTerminalDefaultAgent`、`conventionalComments`
- **评论标签(2)**：`conventionalLabels`（`{label, display, blocking}[]`，`null` 显式清空回默认）、`prompts`（review/plan/annotate 三段提示词覆盖，可 runtimes 按主机分写）
- **review/annotate 行为(8)**：`reviewAnalysis.{semanticDiff,callFlow}`、`jina`、`annotateHistory`、`markdownExtensions`、`feedbackHistory`、`guideHistory`、`reviewProgress`
- **agent 集成(7)**：`agentTool`、`inboxTool`、`inboxNotifications`、`inboxPhones`、`inboxTailscale`、`inboxTailscaleAllow`、`claudeCodeMod`
- **更新与安全(6)**：`autoUpdate`、`updateCheck`、`verifyAttestation`、`skipInstall.{codex,gemini,kiro,vibe,opencode,skills,claudePlugin}`、`pfmReminder`、`glimpse`
- **审查环境(6)**：`gitRemoteCheck`、`cursorSandbox`、`claudeSandbox`、`todoProvider`、`share`、`guideShareUrl`
- **远程与第三方(3)**：`urlHost`、`bitbucketEmail`、`bitbucketToken`（**明文存 config.json**，官方建议用 `PLANNOTATOR_BITBUCKET_TOKEN` 环境变量）

本机 config.json 只写 6 个键（`diffOptions`、`reviewAnalysis`、`conventionalComments`、`favicon`、`theme`、`agentTool`），其余全走默认。

## See Also

- [Plannotator OMP 插件运行机制](plannotator-omp-plugin-mechanism.md) — slash command 双通道与 HTTP 服务链路
- [Herdr + Plannotator 工具链全量 Reference](toolchain-reference.md) — CLI flags 与插件生态基线
- [Plannotator pi-extension 混版故障](pi-extension-mixed-tree-failure.md) — 安装故障取证