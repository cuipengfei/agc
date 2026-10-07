# skills CLI 批量卸载、锁定文件匹配与 gws CLI 移除实录

> Source: 本会话命令输出与本机文件检查（`~/.agents/skills/`、`~/.agents/.skill-lock.json`、`bun remove -g`）
> Collected: 2026-10-08
> Published: Unknown

## 操作前状态

- `~/.agents/skills/` 磁盘目录数：270
- `~/.agents/.skill-lock.json`（version 3）skills 条目数：168（git HEAD 中 `agents/skill-lock.json` 同为 168）
- 锁定 key 与目录名不一致案例：key `Poteto Mode` 的 skillPath 为 `skills/poteto-mode/SKILL.md`；key `Make Bot UI` 的 skillPath 为 `skills/make-bot-ui/SKILL.md`。按 skillPath 末级目录名匹配后：168 tracked + 102 untracked = 270，无 ghost。
- gws-\* / recipe-\* / persona-\* 家族（共 93 个）frontmatter 均含 `version: 0.22.5` 与 `openclaw` metadata 块；锁定文件中 googleworkspace/cli 仅 2 个条目（gws-gmail、gws-gmail-send），其余 91 个家族成员不在锁文件。

## 执行的操作

1. `skills remove -g -y` 批量卸载 16 个 skill（超出点名的 writing-skills、skill-development 已用 `skills add -g -y <repo> -s <skill>` 恢复）：
   - obra/superpowers: systematic-debugging, test-driven-development, verification-before-completion
   - backnotprop/plannotator: plannotator-compound, plannotator-setup-goal, plannotator-visual-explainer
   - softaworks/agent-toolkit: agent-md-refactor, skill-judge
   - anthropics/claude-plugins-official: claude-md-improver
   - googleworkspace/cli: gws-gmail, gws-gmail-send
   - 单 skill repo: caveman (juliusbrussee/caveman), clean-ddd-hexagonal (ccheney/robust-skills), council (0xNyk/council-of-high-intelligence), excalidraw-skill (yctimlin/mcp_excalidraw), workflow-patterns (wshobson/agents)
2. 删除 95 个 untracked 目录：gws-\* 42、recipe-\* 41、persona-\* 10、codex-litellm-umans、memory-bank。
3. `bun remove -g @googleworkspace/cli` 卸载 gws CLI；`which gws`  afterwards 无输出。

## 操作后状态

- 锁文件 skills 条目数：152（168 − 16，无新增 key）
- 磁盘目录数：159（152 tracked + 7 untracked：plannotator、plannotator-annotate、plannotator-last、plannotator-review、baipiao-relay-probe、graphify、search-routing）
- agc `pull.sh` 结果：updated=1（bun/global-package.json）、unchanged=62、missing=0、protected_slots=50；`python3 -m unittest discover -s tests` 19 个测试全部通过。

## 证据边界

- 锁文件 168→152 的对比基于 git HEAD 快照与会话内两次 `len(lk)` 读取，未保存操作前的锁文件完整副本。
- 159 与 152 的差值 7 来自目录对账脚本输出（磁盘有而锁文件无的目录列表）。
