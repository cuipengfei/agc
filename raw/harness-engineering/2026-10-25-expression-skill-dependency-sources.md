# 表达规则复刻的 Skill 依赖与来源记录

> Source: 本机 `~/.agents/.skill-lock.json` 的表达相关条目；`~/.claude/CLAUDE.md`「思维与表达 Skill」；用户对复刻指南的批注，2026-10-25
> Collected: 2026-10-25
> Published: Unknown

## 表达相关来源记录

以下 11 项对应指南中的表达相关 Skill 调用。表格摘录当前 lock 的 `source` 与 `skillPath`，这些条目的 `sourceType` 均为 `github`。

| Skill | source | skillPath |
| --- | --- | --- |
| `iso-24495` | `danyuchn/iso-24495-skill` | `SKILL.md` |
| `asd-ste100` | `danyuchn/asd-ste100-skill` | `SKILL.md` |
| `technical-writing` | `backnotprop/pstack` | `skills/technical-writing/SKILL.md` |
| `writing-shape` | `mattpocock/skills` | `skills/in-progress/writing-shape/SKILL.md` |
| `talk-behavior` | `cuipengfei/prompts` | `skills/talk-behavior/SKILL.md` |
| `no-bs` | `cuipengfei/prompts` | `skills/no-bs/SKILL.md` |
| `humanizer` | `blader/humanizer` | `SKILL.md` |
| `no-ai-slop` | `petergyang/no-ai-slop` | `skills/no-ai-slop/SKILL.md` |
| `unslop` | `backnotprop/pstack` | `skills/unslop/SKILL.md` |
| `natural-writing` | `cuipengfei/prompts` | `skills/natural-writing/SKILL.md` |
| `restating-complete-answers` | `cuipengfei/prompts` | `skills/restating-complete-answers/SKILL.md` |

## 复刻范围

- 用户批注询问：是否需要安装来自 `cuipengfei/prompts` 的全部 18 项，才能复刻表达规则。
- 安装范围由指南中实际启用的表达 Skill 调用决定。完整复刻这些调用时使用上述清单；本机同源仓库的全部安装记录不作为本指南的必装要求。
- `restating-complete-answers` 的当前安装来源为 `cuipengfei/prompts`，可沿用指南中的 GitHub 安装方式，使用 `--skill restating-complete-answers`。

## 不确定性写法

当前用户级规则要求写清缺少的证据、受影响的判断和确认动作。泛化免责句式无论出现在正文、句尾或独立段落，都不使用。
