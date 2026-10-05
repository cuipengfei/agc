# pstack 移植版生态全景

> Sources: GitHub Search API / repo_view / Tavily, 2026-10-05; poteto-mode SKILL.md 原文, 2026-10-05
> Raw: [github-pstack-ports-search](../../raw/ai-coding-agents/2026-10-05-github-pstack-ports-search.md); [pstack-poteto-mode-skill](../../raw/ai-coding-agents/2026-10-05-pstack-poteto-mode-skill.md)
> Updated: 2026-10-05

## Overview

pstack 是 Lauren Tan 为 Cursor 编写的工程工作流 skill 插件，原版托管在 `cursor/plugins` 仓库。由于 skill 本质是 markdown 文件，社区出现了大量面向其他 harness 的移植版。截至 2026-10-05，GitHub 上可检索到 20 余个移植/改编仓库，其中 michael-denyer/pstack-claude（1103 stars）与 backnotprop/pstack（944 stars）两强占据绝大多数关注度，第三名 Aqua-123/pstack-for-codex 仅 81 stars，呈明显断层。

## 原版

原版为 Lauren Tan 的 pstack，位于 `cursor/plugins` 仓库（https://github.com/cursor/plugins/tree/main/pstack），`poteto-mode` 是其主 skill，负责为工程任务选择并运行工作流。

## 移植版排行（2026-10-05 采集）

| Stars | 仓库 | 目标平台 |
|---|---|---|
| 1103 | michael-denyer/pstack-claude | Claude Code、Codex、Pi、OpenCode、Gemini、Prime Agent |
| 944 | backnotprop/pstack | harness 中立镜像分发 |
| 81 | Aqua-123/pstack-for-codex | Codex |
| 65 | ScriptedAlchemy/pstack-codex | Codex（带 marketplace 与安装器） |
| 64 | dsebban/skills | OMP |
| 30 | shrimpwtf/oh-my-pstack | Pi、OMP、Claude Code、Codex |
| 8 | kkgogogo17/pi-pstack | Pi |
| 6 | Luks3110/pstack-zcode | ZCode |
| 6 | irg1008/cstack | Claude Code（改名 cstack） |
| 6 | painhardcore/pstack | Codex、Claude Code、OpenCode |
| 5 | HustleCoding/pstack-codex | Codex |
| 3 | 0xrsydn/pstack-pi | Pi |
| 3 | shiwenbin1617/pstack | Claude Code + Codex |

2 stars 及以下的长尾另有约 15 个仓库（含 Devin 插件、oh-my-pi 扩展、带 hook 强制的 Claude Code 版等），见 raw 文件完整清单。搜索中另有同名但主题无关的项目（如 BhaskarManam/pstack 产品 PRD 工具包、suhitanantula/pstack 5Ps 框架），不计入移植版。

## 观察

- 平台热度排序：Codex 移植最多，其次 Claude Code，再次 Pi/OMP；ZCode、Devin 各有零星移植。
- 头部两仓定位不同：michael-denyer/pstack-claude 宣称覆盖六个 harness，是集成度最高的移植；backnotprop/pstack 自述为「Skills and principles for rigorous AI-assisted engineering」，偏 harness 中立的镜像分发。
- 多个移植版明确标注上游为 cursor/plugins，说明社区普遍承认 Lauren Tan 原版归属。

## backnotprop 版内部结构（2026-10-05 已验证）

经 GitHub API 目录枚举与 poteto-mode SKILL.md 原文核实：backnotprop/pstack 的 `skills/` 共 50 个子目录，其中 24 个 `principle-*` 决策规则（按 Core 10、Architecture 6、Verification 5、Delegation 2、Meta 1 分组）、26 个功能 skill。

入口 skill `poteto-mode` 的机制：frontmatter 标 `disable-model-invocation: true`（只能用户显式调用）；收到任务后匹配 23 份 playbook 之一并逐条执行其步骤，无匹配时路由到 `figure-it-out` 设计定制流程，跨日常驻项目路由到 Orchestrate；执行中按 Non-negotiables 触发器调用功能 skill（并行扇出用 swarm、方案竞赛用 arena、争议设计用 interrogate 多模型对抗评审）。subagent 默认后台运行、按角色配模型（代码默认 `grok-4.7-xhigh-fast`、判断与文书默认 `claude-opus-5-5-max`），角色映射由 `setup-pstack` 配置。自主权规则为「Just do it / Always pause for irreversible writes」。Harness 节给出 Cursor 以外平台的映射（Claude Code、Codex、Pi、OpenCode 的 subagent 工具名、模型配置文件与 transcript 路径），这是各移植版得以成立的官方依据。

