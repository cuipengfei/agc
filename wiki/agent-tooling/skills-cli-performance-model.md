# skills CLI 性能模型：目录发现比安装数量更关键

> Sources: 本机 `skills` CLI 源码检查与命令实测, 2026-09-03; 批量卸载与锁定文件匹配实测, 2026-10-08
> Raw: [skills CLI 性能模型调查](../../raw/agent-tooling/2026-09-03-skills-cli-performance-model.md); [skill 清理与锁定匹配实录](../../raw/skills-cli/2026-10-08-skill-cleanup-and-lock-matching.md); [空格名锁条目清理实录](../../raw/skills-cli/2026-10-08-lock-space-name-cleanup.md)
> Updated: 2026-10-08

## Overview

`skills ls -g` 的耗时主要取决于 CLI 需要检查多少 agent skill 目录及其文件，而不只是用户真正使用了多少 skill。目录增殖、无用 agent 目录和软链会放大发现阶段的成本；`check`、`update`、`upgrade` 又共享同一更新路径，因此不能把 `check` 当作完全独立的廉价 dry-run。

## 发现阶段的成本模型

CLI 在源码中静态列出多个 agent skill 目录，例如 `.agents/skills`、`.claude/skills`、`.codex/skills`、`.opencode/skills` 和 `.pi/skills`。扫描候选目录时，CLI 会检查其中是否存在 `SKILL.md`。因此可以用下面的近似模型理解耗时：

```text
总耗时 ≈ 候选 agent 目录数 × 目录/文件状态检查成本
       + 实际 skill 数 × 元数据读取与解析成本
       + 软链、嵌套目录和更新检查的额外成本
```

这解释了为什么"安装了很多 skill"不是唯一问题：即使某些目录最终没有可用 skill，它们仍可能进入发现路径；软链也不是零成本引用。

## `check` 不是纯 dry-run

命令分派把 `check`、`update` 和 `upgrade` 都交给 `runUpdate()`。该函数根据 scope 运行 global 或 project skill 更新流程，并打印检查/更新结果。使用 `check` 做性能测试时，应把它看成共享更新管线的一种入口，而不是与 `update` 完全不同的实现。

## 清理的有效方向

前一轮本机记录显示，global skill 列表操作从超过 120 秒降至约 17.7 秒；本轮同一环境下 `skills ls -g` 返回成功，用时约 19 秒。记录中的另一个变化是 agent 目录从 77 个降至 8 个。两组旧数字属于本机历史测量，本轮没有完整重放，不能当作跨机器基准。

因此，最小有效优化顺序是：

1. 删除或移走不再使用的 phantom agent 目录。
2. 清理无用的 skill 软链，避免让发现路径反复检查它们。
3. 再测量 `skills ls -g`，确认清理是否真的减少了耗时。
4. 只有在目录规模已经受控后，才考虑更换 CLI 或修改扫描算法。

## 锁定文件结构与批量卸载

`.skill-lock.json`（version 3）的 `skills` 映射以 skill 名为 key，每个条目含 `source`（owner/repo）、`sourceType: "github"`、`skillPath`（如 `skills/<name>/SKILL.md`）、`skillFolderHash`、`installedAt`、`updatedAt`。key 可以是显示名（如 `Poteto Mode`），而磁盘目录名取自 skillPath 末级（`poteto-mode`）；核对锁定状态时应按 skillPath 而非 key 字符串匹配，否则会把这两条误报为 untracked。

`skills remove -g -y <name...>` 按 key 精确匹配卸载，CLI 报告成功移除的 skill 数等于传入的 name 数；误卸可用 `skills add -g -y <repo> -s <skill>` 按原 repo 恢复。卸载对锁文件的净效果可由 git HEAD 快照对比验证：168 条减 16 条至 152 条，无新增 key。

插件自带但未经安装器的 skill（googleworkspace/cli 的 gws-\*、recipe-\*、persona-\* 家族）不进锁文件，其 frontmatter 带 `version: 0.22.5` 与 `openclaw` metadata 块，与已锁定条目同版本同 schema——这是判断同源的文件级证据。删除这类目录不影响锁文件；卸载对应的 bun 全局 CLI 用 `bun remove -g @googleworkspace/cli`，`which gws` 无输出即生效。

## 空格名 key 的卸载语义

锁 key 含空格的显示名（`Poteto Mode`、`Make Bot UI`）在卸载时表现特殊（2026-10-08 实测案例，根因未证实）：

- `skills remove -g -y "Poteto Mode" "Make Bot UI"`（位置参数）不匹配任何锁 key，输出 `No matching skills found`，锁与磁盘均不变。shell 引号会把 `"Poteto Mode"` 作为单个参数传入，CLI 是否按空格拆词未读源码证实。
- `skills remove --skill "Poteto Mode" --skill "Make Bot UI" -g -y` 报告 removed 2，但删除对象是**磁盘安装**：若锁中旧显示名条目与新 slug 条目共享同一 `skillPath`，删除会连带删掉 slug 条目实际使用的技能目录，而锁记录本身不变化。
- locked 条目与磁盘目录名可以不同（key `Poteto Mode` → 目录 `poteto-mode`）。是否能用 `skills ls -g` 核对锁 key 与磁盘目录对账，本次未验证。
- 本次案例的恢复路径：手工编辑 `~/.agents/.skill-lock.json` 精确删键（原子写回：tempfile + os.replace），再用 slug 名 `skills add -y -g <repo>@<slug>` 重装；`backnotprop/pstack` 的 `poteto-mode`/`make-bot-ui` 重装后恢复。这是用户批准的单次操作，非验证过的通用流程。

## 锁定文件变更的粗粒度确认

锁 mtime 与条目 `installedAt`/`updatedAt` 都不足以单独断言某条命令写了锁：`installedAt` 只记录条目何时加入，`updatedAt` 未必随每次写入刷新；区分「命令是否修改锁」应以命令前后的锁文件快照 diff 为准（会话内用备份文件对比）。

## 证据边界

前一轮采样记录中 futex 等待约占 CPU 的 84%，软链单条检查约 80–100 ms。这些数字用于解释本机瓶颈，不是普适基准。若要比较不同机器或版本，必须固定 agent 目录数量、软链数量、文件系统和 CLI 版本后重新测量。
