# OMP 18.12.1–18.10.1 配置项增量

> Sources: GitHub Releases v18.12.1 至 v18.10.1（逐份正文）, 2026-10-12 至 2026-10-17; 本机注册表与用户级配置, 2026-11-16
> Raw: [OMP 18.12.1–18.10.1 十个 release 的配置项增量](../../raw/omp-config/2026-11-16-release-config-inventory-18-12-1-18-10-1.md)
> Updated: 2026-11-16

## Overview

这十个 release 在 `config.yml` 新增九个键，改动九个既有键的行为，另有四个模型与 agent 配置字段、两类快捷键与一组环境变量。默认值与本机值按本机当前 OMP 安装包核对；`v18.10.1` 的正文没有本范围内的配置项。

## 范围与方法

按发布时间排序的第 31–40 条 release：`v18.12.1`、`v18.12.0`、`v18.11.3`、`v18.11.2`、`v18.11.1`、`v18.11.0`、`v18.10.4`、`v18.10.3`、`v18.10.2`、`v18.10.1`。

调查方式：一次取回完整 40 条 release body，用本机注册表导出的键 ID 构造正则逐行匹配，命中后再人工确认。增量调查要先建立已覆盖清单，只输出新版本带来的新增与变化；纯背景引用与仅改说明文字的项不计入。

## config.yml 新增键

| 版本 | 键 | 允许值 | 默认值 | 本机值 |
|---|---|---|---|---|
| v18.12.1 | `advisor.continueSeverity` | `nit` / `concern` / `blocker` | `concern` | `concern` |
| v18.12.0 | `sharpshooter.minPromptLength` | 数字；最小 `2` | `16` | `16` |
| v18.12.0 | `statusLine.segmentOptions.pi.showProfile` | 布尔值 | 代码在 `showProfile === false` 时隐藏 profile 名 | 未配置 |
| v18.11.3 | `prewalk.auto` | `off` / `suggest` / `on` | `off` | `off` |
| v18.11.3 | `prewalk.autoTarget` | 模型或角色选择器 | `@smol` | `@smol` |
| v18.11.2 | `lsp.requestTimeout` | 秒数；工具调用范围 `5`–`300`，工具默认 `20` 秒 | `10` | `10` |
| v18.10.4 | `gc.compress` | 布尔值 | `false` | `false` |
| v18.10.4 | `gc.compressAfterDays` | 非负天数 | `7` | `7` |
| v18.10.2 | `task.structured` | 布尔值 | `false` | `true` |

`advisor.continueSeverity` 决定 agent 给出最终答复后哪些级别的 advisor 意见会唤醒它继续工作；`blocker` 相当于恢复旧行为。`sharpshooter.minPromptLength` 按用户可见字符计数。`statusLine` 的 `pi.showProfile` 与 release 正文里的 `pi.showProfile` 是同一选项。

## 受影响既有键

| 版本 | 键 | 变化 | 默认值 | 本机值 |
|---|---|---|---|---|
| v18.12.0 | `providers.cacheWarming` | Google Antigravity 上的 Claude 可预热；Gemini 仍不预热 | `idle` | `idle` |
| v18.11.1 | `compaction.thresholdTokens` | 修复 length-stop 恢复的计数 | `-1` | `-1` |
| v18.11.1 | `retry.waitForUsageReset` | 自动 compaction 遵守该设置 | `false` | `false` |
| v18.11.0 | `retry.modelFallback` | 与 Auto-Promote Context 独立；关闭即停止 fallback 切换模型 | `true` | `true` |
| v18.11.0 | `task.agentAccountPools` | fallback 跳过池外 provider | `{}` | `{}` |
| v18.10.4 | `read.renderMarkdown` | 普通文件的内联预览也遵守该设置 | `false` | `true` |
| v18.10.3 | `snapcompact.toolResults` | 工具结果从首次发送即图像化 | `false` | `false` |
| v18.10.3 | `compaction.keepRecentTokens` | 修复 signed thinking 计数导致保留量减半 | `20000` | `20000` |
| v18.10.3 | `snapcompact.shape` | 仅修复设置预览 | `auto` | `auto` |

`snapcompact.shape` 有 `18` 个允许值：`auto`、`8x8r-bw`、`8x8r-sent`、`8x8u-bw`、`8x8u-sent`、`6x6u-bw`、`6x6u-sent`、`5x8-bw`、`5x8-sent`、`6x12-dim`、`8x13-bw`、`8on16-bw`、`8on22-bw`、`11on16-bw`、`silver16-bw`、`doc-8on16-bw`、`doc-8on16-sent`、`doc-8on16-sent-dim`。

## 模型与 agent 配置

| 版本 | 位置 | 作用 | 默认 | 本机 |
|---|---|---|---|---|
| v18.11.0 | agent frontmatter `structured` | 全局关闭时仍为该 agent 保留 `yield` 与 schema 校验 | 未设置 | 用户级 5 个 agent 均未设置 |
| v18.11.3 | `models.yml` `imageCountBudget` | 单次请求图片上限；正整数 | 按 host，未知 host 为 `5` | 无显式覆盖 |
| v18.12.0 | `models.yml` `contextWindow` / `maxTokens` | 显式值优先于该模型 id 的 catalog 规则 | 由模型目录决定 | 25 个模型显式写出 |
| v18.10.2 | `models.yml` `compat.honorsClaudeCodeBetaKillSwitch` | 决定是否遵守 beta 关闭开关 | 由 provider 与模型规则决定 | 无显式覆盖 |
| v18.11.1 | `lsp.json` `initOptions` | language server 初始化选项；复用 shared server 时应用新值 | 各 server 不同 | 用户级 `lsp.*` 不存在 |

本机 25 个模型的窗口与输出上限已显式写出：`contextWindow` 覆盖 `262144`、`272000`、`400000`、`1000000`、`1048576`、`1050000` 六档，`maxTokens` 覆盖 `24000` 至 `131072`。`c8787/gpt-6-luna-decisions`、`kimi-claw/k3-agent`、`kimi-claw/k2d8-preview` 三个模型未写 `maxTokens`。

## 快捷键

| 版本 | 键 | 默认绑定 |
|---|---|---|
| v18.10.4 | `app.approval.approve` | `ctrl+enter`、`ctrl+q` |
| v18.10.2 | `app.tree.previousBranch`、`app.tree.nextBranch` | `[]`（未绑定） |

## 环境变量

| 版本 | 变量 | 默认行为 | 当前进程 |
|---|---|---|---|
| v18.12.0、v18.12.1 | `PI_REQUEST_COMPRESSION` | 开启；`0` 关闭 | 未设置 |
| v18.10.2 | `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | 关闭；仅 `compat.honorsClaudeCodeBetaKillSwitch === true` 的模型生效 | 未设置 |
| v18.11.0 | `OMP_BUILD_LABEL` | 未设置 | 未设置 |
| v18.11.2 | `OPENAI_CODEX_OAUTH_TOKEN` | 未设置 | 未设置 |
| v18.11.3 | `GITHUB_TOKEN`、`GH_TOKEN` | 未设置 | 均未设置 |
| v18.11.2 | `MNEMOPI_*_WEIGHT` 五个来源权重 | `1.0` / `0.7` / `0.5` / `0.6` / `0.8` | 均未设置 |
| v18.11.2 | `MNEMOPI_TIER1_WEIGHT`、`TIER2`、`TIER3` | `1.0` / `0.85` / `0.7` | 均未设置 |

## 已移除

`PI_CODEX_ZSTD` 由 `PI_REQUEST_COMPRESSION` 取代（v18.12.0）。`providers.openai-codex.codeMode`、`codeModeDirectTools` 与模型字段 `toolMode` 在 v18.10.4 移除。`app.tree.foldOrUp`、`app.tree.unfoldOrDown` 在 v18.10.2 移除。本机配置中没有这些项的显式值。

## 边界

- 本机值只覆盖用户级配置与当前进程环境；项目配置与其他启动器可改变运行值。
- 环境变量中凭据类只记录是否设置。
- 十个 release 的正文是唯一依据，正文未写明的默认值与范围未补写。

## See Also

- [OMP 配置语义手册](config-semantics.md)
- [OMP 工具调用循环防护与 exemptTools](tool-call-loop-guard.md)
- [OMP 终端动画设置：motion 与 shimmer 形态](terminal-animation-settings.md)
- [gc 存储垃圾回收](../omp-commands/gc-storage-garbage-collection.md)
