# skills CLI 锁文件空格名清理实录：remove 语义、手工清键与 slug 重装

> Source: 本会话命令输出与本机文件读取（`~/.agents/.skill-lock.json`、`~/.agents/skills/`）
> Collected: 2026-10-08
> Published: Unknown

## 背景

锁中旧条目 `Poteto Mode`、`Make Bot UI`（installedAt 实测 2026-10-04T15:35:43Z，显示名带空格）与磁盘目录 `poteto-mode`、`make-bot-ui`（slug 名）指向同一 skillPath（`skills/poteto-mode/SKILL.md`、`skills/make-bot-ui/SKILL.md`）。`skills check -g` 对这 Display name 的更新失败，日志显示 `✗ Failed to update Poteto Mode` 与 `✗ Failed to update Make Bot UI`；失败根因未证实。

## 失败尝试：`skills remove -g -y "Poteto Mode" "Make Bot UI"`

输出：`No matching skills found for: Poteto Mode, Make Bot UI`。锁文件对比（备份 vs 当前）确认四条记录（`Poteto Mode`、`Make Bot UI`、`poteto-mode`、`make-bot-ui`）原封不动。位置参数为何匹配不到锁 key 未证实（shell 引号会把 `"Poteto Mode"` 作为单个参数传给 CLI，是否按空格拆词由 CLI 内部实现决定，未读源码）。

## 第二次尝试：`skills remove --skill "Poteto Mode" --skill "Make Bot UI" -g -y`

输出确认「Successfully removed 2 skill(s)」。但随后验证发现**两个磁盘目录（poteto-mode、make-bot-ui）被删除**，而锁中四条记录没有变化。观察结论：该调用删除了磁盘安装，未改锁文件记录；当新旧条目共享同一 skillPath 时，删除会连带删掉 slug 条目也要用的目录。

## 手工修复（本次案例，非通用流程）

1. 备份锁文件：`~/.agents/.skill-lock.json.bak-20261008-231149`（会内仅此一次备份，后另有 bak2 二次备份）
2. Python 脚本精确按 key 删除四条（`Poteto Mode`、`Make Bot UI`、`poteto-mode`、`make-bot-ui`），原子写回（tempfile + os.replace），JSON 重读验证无残留；锁条目总数 165 → 161
3. slug 装回：`skills add -y -g backnotprop/pstack@poteto-mode`（首次因 Git TLS handshake failed 失败，重试成功）、`skills add -y -g backnotprop/pstack@make-bot-ui`
4. 终验：锁中只剩 `poteto-mode`（installedAt 2026-10-08T15:21:21Z）、`make-bot-ui`（2026-10-08T15:21:58Z）两条 slug 条目；磁盘两个目录恢复（含 SKILL.md）；锁总条目 163

## 证据边界

- 锁条目总数为 `python3 json` 读取的 `len(skills)`，165→161→163 为会内实测值（删除 4 键后 161，重装 2 slug 后 163）
- 旧条目 installedAt 2026-10-04T15:35:43Z 取自备份锁文件，非推断
- `skills remove` 删除磁盘目录但锁不变的结论基于本次 remove 前后只读对比（备份 + 当前锁），未读 skills CLI 源码确认 remove 是否在任何条件下写锁（上游有 `removeSkillFromLock` 符号，触发条件未核实）
- PromptScript 侧安装失败（"PromptScript does not support global skill installation"）是独立项，不影响 Claude Code/Universal 侧安装结果