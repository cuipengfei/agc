# OMP @smol 角色：直接使用、后级回退与本机模型

> Sources: 本机 `@oh-my-pi/pi-coding-agent` 19.1.1 源码与配置, 2026-11-23
> Raw: [OMP @smol 角色消费方与本机 gpt-6.1-terra 配置](../../raw/omp-config/2026-11-23-smol-role-consumers-and-terra-config.md); [OMP 技能简介压缩、缓存与 Optimizing skills 进度显示取证](../../raw/omp-config/2026-11-24-skill-description-optimization.md)
> Updated: 2026-11-24

## Overview

`@smol` 在 `/model` 中显示为 `SMOL / Fast`，用于轻量编辑、只读侦察、机械修改、后台摘要与规划后的执行交接。它是角色别名，不是固定模型。本机当前 `omp config get modelRoles` 读回 `smol: c8787/gpt-6.1-terra:low`。

消费方分两类：直接读取 `@smol` 的功能，以及先读取自己的专用角色、再把 `@smol` 放入后级候选的功能。配置专用角色后，不能把后者当前的主模型也笼统写成 smol。

## 直接使用 @smol

| 消费方 | 用途 |
|---|---|
| Magic Edit | `edit.magic.model` 未设置时作为 apply model |
| Edit Auto-Repair | 编辑破坏 AST 后修复区域并重新 parse |
| bundled `scout` | 只读代码探索 |
| bundled `sonic` / Vibe 轻量执行 | 机械修改与数据收集 |
| 本机 `librarian` | 外部文档与开源仓库考证；frontmatter 为 `model: "@smol"` |
| `omp cleanse` | 默认子代理模型 |
| 后台 skill 描述压缩 | 技能简介路由提示压缩；smol 链优先，其后尝试 tiny |
| Sharpshooter | 未配置专用提取模型时使用 |
| Prewalk / auto-prewalk | 默认交接目标 |
| plan-yolo | 未指定执行模型时的默认目标 |
| 模型档位循环 | 默认顺序为 `smol`、`default`、`slow` |
| eval `completion()` | `model="smol"` tier |
| CLI / 环境变量 | `--smol` 或 `PI_SMOL_MODEL` 临时覆盖角色 |

## 专用角色优先，smol 位于后级

`model-resolver.ts` 将 `memory`、`tiny`、`widget` 的默认优先级别名设为 `smol`；`memory` 还先尝试 `tiny`。各功能的实际候选还受显式 `modelRoles` 和 `retry.fallbackChains` 影响。

| 功能 | 角色关系 | 本机专用角色 |
|---|---|---|
| commit message | 先 `commit`，再 `smol`；conventional commit 的 summary 默认 secondary 为 smol | `commit: c8787/gpt-6-luna:low` |
| 会话标题 | tiny 候选包含 `tiny`、`commit`、`smol` | `tiny: sensenova/glm-5.3:max` |
| TTS 文本改写 | 先 tiny，再按 tiny → smol 链解析 | `tiny: sensenova/glm-5.3:max` |
| 记忆提取 | memory 先 tiny，再 smol | `memory: sensenova/glm-5.3:max` |
| 后台 widget | widget 未配置时按 smol 解析，再看 fallback | `widget: sensenova/glm-5.3:max` |
| judge | 部分候选链可含 `@tiny`、`@smol`、`@default` | `judge: c8787/gpt-6-luna-decisions` |

## thinkingLevel 的来源

Magic Edit 在未设置 `edit.magic.model` 时通过 `resolveRoleSelection(["smol"], ...)` 取得模型，并用解析后的 `thinkingLevel` 生成 `reasoning.effort`。当前选择器后缀为 `:low`，所以可确认它按 `low` 请求；尚无 Terra 与 Luna 的对照实测。

本机 `librarian` frontmatter 另写 `thinkingLevel: high`，但 `@smol` 选择器本身带 `:low`。按既有 selector 后缀优先规则，角色选择器后缀优先于 frontmatter 的独立档位字段。

## See Also

- [OMP 技能简介压缩：模型、缓存与 Optimizing skills](skill-description-optimization.md)
- [Magic Edit：主模型描述、辅助模型修改](../omp-tools/magic-edit.md)
- [OMP /model 模型浏览器：角色解析与 kind 过滤](model-browser-role-resolution.md)
- [OMP 自定义 sub-agent：定义、工具名适配与验证](custom-subagent-deployment.md)
- [OMP Prewalk：规划后切换模型](../omp-prewalk/prewalk.md)
