# pstack、mattpocock/skills 与 ub-mode 安装及本机清点

> Source: [backnotprop/pstack README](https://github.com/backnotprop/pstack/blob/f905b88ebdd877e6b36fcc791970d47f44d15a15/README.md); [mattpocock/skills README](https://github.com/mattpocock/skills/blob/5863806dd4e15c63174bee4e7515a4256792ecfa/README.md); [unclebob/ub-mode README](https://github.com/unclebob/ub-mode/blob/3da62bf3fcfd2034de41f30d920d2739e566171f/README.md); 本机会话目录清点和比较输出
> Collected: 2026-11-15
> Published: Unknown

## pstack README 摘录

> pstack is a folder of plain Agent Skills (`skills/<name>/SKILL.md`). You don't need Cursor. The `skills` CLI installs them into Claude Code, Codex, Pi, Cursor, OpenCode, and other agents.

```bash
npx skills add backnotprop/pstack
```

README 保留上游 Cursor 与 Claude Code 安装方式：

```text
/add-plugin pstack
/plugin marketplace add cursor/plugins
/plugin install pstack@cursor-plugins
```

镜像 README 的 “Also install” 表包含 `teach` → `how`, `why`；`technical-writing` → `unslop`；`architect` → `arena`, `how`；`blast-radius` → `arena`, `how`, `why`, `unslop`；`poteto-mode` → all `principle-*` skills and most of the other skills。README 正文同时声称部分技能互不调用；已有 pstack 技能地图依据技能正文记录调用关系。

## mattpocock/skills README 摘录

> A plugin updates itself. skills.sh copies editable files into your project, and you update them by hand. Pick one per agent, because installing both gives you every skill twice.

```bash
# Claude Code
claude plugin install mattpocock-skills@claude-plugins-official
# Codex
codex plugin marketplace add mattpocock/skills
codex plugin add mattpocock-skills@mattpocock
# GitHub Copilot
copilot plugin marketplace add mattpocock/skills
copilot plugin install mattpocock-skills@mattpocock
# Gemini CLI
gemini skills install https://github.com/mattpocock/skills.git --path skills/engineering
gemini skills install https://github.com/mattpocock/skills.git --path skills/productivity
# Any other agent, or editable files
npx skills@latest add mattpocock/skills -a <agent>  # cursor, opencode, devin, windsurf, amp, pi; omit -a to choose
```

README 还要求 Copilot CLI 添加 `extraKnownMarketplaces`；VS Code 使用 `Chat: Install Plugin From Source` 并输入仓库 URL。skills CLI 更新命令为 `npx skills@latest update`，再运行 `add` 可选择新技能。

## ub-mode README 摘录

> Copy `SKILL.md` into your agent's skills directory as `ub-mode/SKILL.md` (for example `~/.grok/skills/ub-mode/SKILL.md`, `~/.claude/skills/ub-mode/SKILL.md`, or `~/.cursor/skills/ub-mode/SKILL.md`), then invoke `/ub-mode`.

## 本机清点与内容比较（2026-11-15）

上游浅克隆 HEAD：

```text
backnotprop/pstack f905b88ebdd877e6b36fcc791970d47f44d15a15
mattpocock/skills 5863806dd4e15c63174bee4e7515a4256792ecfa
unclebob/ub-mode 3da62bf3fcfd2034de41f30d920d2739e566171f
```

以 `~/.agents/.skill-lock.json` 的 `skills` 条目选来源和 `skillPath`，以 `diff -rq` 比较上游对应目录与 `~/.agents/skills/<name>`：pstack 57 项 IDENTICAL，mattpocock 30 项 IDENTICAL。ub-mode 使用 `diff -q` 比较单个 `SKILL.md`，输出 UBMODE_IDENTICAL。该比较对 pstack 与 matt 为已锁定目录，不是全仓库比较。

pstack 上游 `skills/` 与本地 pstack lock 名称对照，输出唯一未装名称 `tdd`。该清点不含 `automations/benny/skills/`。

matt 的四个分类目录分别计数（含 `SKILL.md` 的直接子目录）：

```text
engineering: 20
productivity: 7
misc: 4
in-progress: 8
```

合计 39。lock 中该来源为 30 项；四目录中没有该来源记录的是 `teach` 和以下八项。本机 `teach` 已由 pstack 来源占用：

```text
misc/git-guardrails-claude-code
misc/migrate-to-shoehorn
misc/scaffold-exercises
misc/setup-pre-commit
in-progress/chief-of-staff
in-progress/claude-handoff
in-progress/setup-ts-deep-modules
in-progress/software-factory
```

在 `~/.agents/skills` 搜索这八个名称未返回匹配；这项文本搜索不构成对全部依赖关系的完整审计。
