# Beads 1.3.4 的命令面与帮助树结构

> Sources: gastownhall/beads 1.3.4 CLI 实测，2026-11-05；gastownhall/beads README 与 docs（quickstart、cli-reference/dolt、ide-setup），2026-11-04 至 2026-11-05
> Raw: [Beads 安装、运行面、命令面与任务系统分工](../../raw/agent-tooling/2026-11-05-beads-install-runtime-command-surface.md)
> Updated: 2026-11-05

## Overview

1.3.4 的 `bd` 在递归扫描中展开为 299 个帮助页：120 个一级条目（`bd` 根加 119 个顶层命令）、172 个二级命令、7 个三级命令。命令面按任务生命周期、查看报告、依赖结构、同步数据、初始化配置、维护与外部集成分组；核心循环是创建任务、查找可领取任务、领取、关闭，跨机器再叠加 Dolt 同步。

## 核心循环

`bd create` 创建任务，`bd ready` 列出没有活动阻塞的任务，`bd update <id> --claim` 领取，完成后 `bd close <id>`。任务之间用 `bd dep add` 建立阻塞关系，`bd ready` 只显示没有未完成前置的任务。多人或多机共享时，用 `bd sync` 或 `bd dolt push`、`bd dolt pull`。

常用命令：

- `create` — 新建任务，支持从 markdown 或图 JSON 批量创建。
- `q` — 快速创建并只输出 ID。
- `list` — 列出任务。
- `ready` — 列出无活动阻塞的任务。
- `show` — 查看任务详情与依赖。
- `update` — 更新任务，`--claim` 领取。
- `close` — 关闭任务，可写原因。
- `reopen` — 重新打开任务。
- `dep add` — 添加阻塞依赖。
- `label` — 管理标签；`tag` 只添加一个标签。
- `note` — 追加备注；`comment` 添加评论。
- `search` / `query` — 文本搜索与查询语言。
- `blocked` — 列出被阻塞的任务。
- `status` — 数据库概览与统计。
- `sync` — 拉取、检查冲突、修复 `is_blocked`、再推送。
- `dolt push` / `dolt pull` — 单向传输 Dolt 历史。
- `backup` — 完整数据库备份。
- `doctor` — 检查并修复安装健康状态。
- `setup` — 写入 AI 编辑器或 agent 的集成文件。
- `prime` — 输出面向 AI 的工作流上下文。
- `onboard` — 输出可粘贴到 `AGENTS.md` 的最小片段。

## 主命令分组

### Working With Issues

assign、children、close、comment、comments、create、create-form、delete、edit、gate、heartbeat、label、link、list、merge-slot、note、priority、promote、provenance、q、query、reclaim、reopen、search、set-state、show、state、tag、todo、unclaim、update。

这一组覆盖任务本身的操作：分配、子任务、关闭、评论、创建、删除、编辑、异步闸门、租约心跳、标签、依赖连接、合并槽、备注、优先级、wisp 提升、来源日志、快速创建、查询、回收过期租约、重开、搜索、运行状态、详情、标签、TODO、释放领取与更新。

### Views & Reports

count、diff、find-duplicates、history、lint、stale、status、statuses、types。

统计、提交差异、相似任务、版本历史、模板检查、过期任务、数据库概览、合法状态与合法类型。

### Dependencies & Structure

dep、duplicate、duplicates、epic、graph、supersede、swarm。

依赖管理、重复项标记与合并、Epic 完成度、依赖图检查、取代关系、结构化 Epic 的并行执行。

### Sync & Data

backup、branch、conflicts、export、federation、import、restore、sync、vc。

备份、Dolt 分支、活动冲突、JSONL 导出与导入、点对点同步、压缩内容恢复、完整同步循环与 Dolt 版本控制。

### Setup & Configuration

bootstrap、config、context、dolt、forget、hooks、human、info、init、kv、memories、migrate-personal、onboard、prime、quickstart、recall、remember、setup、where。

新克隆的数据库连接、配置、后端身份、Dolt 设置、持久记忆、Git hooks、人工任务、数据库信息、初始化、键值存储、个人规划迁移、AI 接入说明、工作流上下文、快速入门、位置查询。

### Maintenance

batch、compact、doctor、events、flatten、gc、migrate、ping、preflight、prune、purge、recompute-blocked、rename-prefix、rules、sql、upgrade、worktree。

批量事务、历史压缩、健康检查、事件日志、历史合并、垃圾回收、数据库迁移、连通性、PR 清单、旧任务删除、临时任务删除、阻塞标志重算、前缀重命名、规则审计、原始 SQL、版本升级与 worktree 管理。

### Integrations & Advanced

admin、jira、linear、repo。

数据库管理、Jira 与 Linear 集成、多仓库配置。

### Additional Commands

ado、audit、blocked、completion、cook、defer、formula、github、gitlab、help、init-safety、mail、metrics、mol、notion、orphans、ready、rename、schema、serve、ship、undefer、version。

Azure DevOps、GitHub、GitLab、Notion 集成，agent 交互审计，阻塞任务，shell 补全，formula 与 molecule 工作模板，帮助，init 安全说明，邮件委托，遥测，孤立任务，就绪任务，ID 重命名，JSON Schema，HTTP API，能力发布，延后与取消延后，版本信息。

## 子命令模式

- `dep`：add、cycles、list、relate、remove、tree、unrelate。
- `dolt`：commit、killall、pull、push、remote（add / list / remove / reset-data）、set、show、start、status、stop、test。
- `config`：apply、drift、get、list、set、set-many、show、unset、validate。
- `gate`：add-waiter、check、create、discover、list、resolve、show。
- `merge-slot`：acquire、check、create、release。
- `mol`：bond、burn、current、distill、pour、progress、ready、seed、show、squash、stale、wisp（create / gc / list）。
- `worktree`：create、info、list、remove。
- 六个外部平台（ado、github、gitlab、jira、linear、notion）都有 pull、push、sync、status；ado 与 gitlab 另有 projects，github 有 repos，linear 有 teams，notion 有 init 与 connect。

## 帮助树结构

1.3.4 的顶层帮助把命令分成八段：Working With Issues、Views & Reports、Dependencies & Structure、Sync & Data、Setup & Configuration、Maintenance、Integrations & Advanced、Additional Commands。Cobra 标准段只有 `Available Commands:` 与 `Additional Commands:`，只按标准段解析会漏掉前七段。

递归扫描遇到三个边界：

- 把任意以冒号结尾的标题当作命令段，会把 `Environment Variables:` 下的变量名当成命令。
- 命令出错时的帮助会再次列出命令，递归规模会膨胀；扫描触发了 500 节点上限。
- 命令名与描述之间可能只有一个空格，例如 `recompute-blocked`；要求两个以上空格会漏项。

最终采用顶层分组标题白名单、非顶层只用 Cobra 标准段、`Usage:` 与错误输出校验、广度优先遍历，得到 299 个帮助页。三级命令只有 7 个：`dolt remote` 的 add、list、remove、reset-data，以及 `mol wisp` 的 create、gc、list。

## 版本范围

本文的计数与分组对应 1.3.4，扫描日期 2026-11-05。命令会随版本变化，具体参数以本机 `bd <命令> --help` 为准。

## See Also

- [Beads 的安装与运行面](beads-install-and-runtime-surface.md) — 安装物、Dolt 依赖与同步条件
- [持久任务库与会话 todo 的分工](durable-backlog-vs-session-todo.md) — 何时用 bd，何时用会话清单
- [四 Agent CLI 能力面对比](../ai-coding-agents/cli-capability-surface.md) — 另一套递归 --help 对比方法
