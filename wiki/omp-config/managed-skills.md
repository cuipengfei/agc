# OMP Managed Skills 生命周期

> Sources: OMP upstream source code
> Raw: [OMP Managed Skills 生命周期源码取证](../../raw/omp-config/2026-09-09-managed-skills-lifecycle.md)
> Updated: 2026-09-09

## 结论

Managed skills **没有自动清理**。

## 路径

`~/.omp/agent/managed-skills`

## 操作

| 动作 | 入口 |
|---|---|
| 创建/更新 | `manage_skill` 工具 或 `learn(skill=...)` |
| 删除 | `deleteManagedSkill()` 显式调用 |
| 自动按年龄/闲置/数量清理 | **不存在** |

`learn.ts:100-140` 确认 `learn` 工具的 `skill` payload 同样调用 `writeManagedSkill()`。

