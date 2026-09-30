# OMP Managed Skills 生命周期

> Sources: OMP upstream source code
> Raw: [OMP Managed Skills 生命周期源码取证](../../raw/omp-config/2026-09-09-managed-skills-lifecycle.md); [创建门槛与 Auto-Learn 注入取证](../../raw/omp-config/2026-09-30-managed-skills-createif-and-autolearn-prompt.md)
> Updated: 2026-09-30

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

## 工具可见性门槛（createIf）

两个创建通道都在工具注册处设卡，不满足条件时工具不进入可用列表（bundle 18.4.4 探针）：

| 工具 | createIf 条件 |
|---|---|
| `manage_skill` | `autolearn.enabled` 开启（默认 **false**） |
| `learn` | `autolearn.enabled` 开启，且 `memory.backend` ∈ {hindsight, mnemopi, local}（`off`、`sharpshooter` 不可用；hindsight 另有配置检查） |

两个 createIf 均**不含 taskDepth 条件**，sub-agent 层是否可见不由这里限制。

## 创建/更新参数校验

- `name` 强制 trim + lowercase 后过 kebab-case 正则（1–64 字符，字母或数字开头），失败抛 `Invalid skill name`。
- `create`/`update` 必须同时提供 `description` 与 `body`（schema 层与运行时双重检查）。
- `create` 撞名 authored skill（`~/.omp/agent/skills` 等）时拒绝：`managed skills cannot override authored ones`。
- learn 的 `scope: "global"` 仅 mnemopi 后端可用；learn 的 approval 分级：带 `skill` 参数、`scope: "global"` 或 backend 为 `local` 时按 write 审批，否则 read。

## Auto-Learn 相关字符串的出处

这些说明文字编译在 OMP bundle（`dist/cli.js`，构建产物）里，**未见独立的可编辑规则/文档文件**承载，分三类（bundle 18.4.4 探针）：

- **系统提示注入**：Auto-Learn 段由 `Pio` 按工具可用性组装——manage_skill 可用时注入，learn 可用时追加一段；注入文本含 "Capture sparingly, specifically: skill requires reuse..."。
- **工具 description**：learn 的 description 含 "Capture sparingly, specifically: one strong reusable lesson..."；manage_skill 的 description 是另一段（action 语义与 kebab-case 要求），不含 Capture sparingly。
- **自动捕获回合提示**：`autolearn.autoContinue` 开启时在 agent 停止后自动跑一轮私有捕获（额外消耗 token）。

引用 OMP 行为规范时须区分两类出处：bundle 内字符串（系统提示注入或工具 description）与磁盘规则文件（如 `~/.omp/agent/rules/*.md`）。

