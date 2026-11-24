# OMP 技能简介压缩：模型、缓存与 Optimizing skills

> Sources: OMP 上游源码与 v19.0.0 发布记录, 2026-11-18; 本机 OMP 19.1.1 配置与缓存观测, 2026-11-24
> Raw: [OMP 技能简介压缩、缓存与 Optimizing skills 进度显示取证](../../raw/omp-config/2026-11-24-skill-description-optimization.md); [OMP @smol 角色消费方与本机 gpt-6.1-terra 配置](../../raw/omp-config/2026-11-23-smol-role-consumers-and-terra-config.md)
> Updated: 2026-11-24

## Overview

OMP 启动时可能短暂显示 `Optimizing skills`。这条进度行表示后台模型正在把较长的 skill `description` 压缩成用于路由的短简介。结果写入 SQLite 缓存，后续会话命中缓存后直接复用。该流程不创建或改写 `SKILL.md`，与 Auto-Learn 写入 managed skill 的流程分开。

v19.0.0 发布记录新增了后台技能简介进度显示，同时把旧的 `deferSkillDescriptionCompression` API 改名为 `deferHintCompression`。这是一条基于发布记录的推断：简介压缩能力此前已有，v19.0.0 新增的是可见进度行。

## 识别启动时的提示

准确文案是 `Optimizing skills`，不是随机启动提示。提交 `b6a095fbbad6` 给出的示例包括 `Optimizing skills 3/12`；任务完成后显示 `ready`，失败时显示原因。进度行位于输入框上方，完成后的 `ready` 保留 `DOWNLOAD_DONE_RETAIN_MS = 1_500` 毫秒。

同一条后台活动机制也处理 MCP namespace hint，对应文案为 `Optimizing MCP: <server>`。

## 触发条件

只有同时满足以下条件，后台模型才会处理一条技能简介：

- 该技能会进入主 agent 的技能列表，即未被 `hide: true` 隐藏，且当前存在可读取 `skill://` 的工具。
- 原始 `description` 合并空白并去除首尾空白后，长度超过 100 个字符。
- 缓存中没有对应结果，也没有同一进程内正在执行的任务。
- 压缩模型可解析，且缓存存储可用。

100 个字符以内的简介直接使用原文，不调用模型。压缩期间，主 agent 先使用确定性的预览文本；预览最多 100 个字符，并尽量在句子边界截断。

## 模型选择

压缩请求使用 `smol` 角色，不跟随主会话当前模型。选择顺序如下：

1. 按 `smol` 角色链解析；角色未设置时继承 `default`，再进入内置链。
2. `smol` 链没有可用模型时，尝试 `tiny`。
3. 两者都不可用时，不发起模型请求，继续使用预览简介。

本机 `omp config get modelRoles` 本次读回：

| 角色 | 当前值 |
|---|---|
| `smol` | `c8787/gpt-6.1-terra:low` |
| `tiny` | `sensenova/glm-5.3:max` |

因此，按当前配置，下一次压缩请求会优先选择 `c8787/gpt-6.1-terra:low`。这个结论描述配置与选择逻辑；用户看到的那次请求实际由哪个模型完成，没有调用日志证据。

## 压缩请求的输入与输出

压缩模型收到一条独立的 user message，其中只有固定指令、技能名称和原始简介，不带主 agent 的对话记录。固定指令要求：

- 输出一条路由提示，最多 12 个词。
- 说明何时使用；只有确实有助于避免混淆时才说明何时不适用。
- 保留可识别的触发词。
- 不重复技能名称，不进行宣传。
- 输出一行，不使用列表或引号。

运行时对输出另有硬校验：必须是非空单行，且不超过 160 个字符。12 词目标属于提示约束，小模型可能超出几个词，但仍需满足字符上限。

以下是说明示例，不是本机实际调用记录。

输入：

```text
Skill: db-migration
Description: Use before changing database schemas and migration files. Require reversible migrations, preserve existing data, audit indexes, test rollback, and update docs. Avoid for changes with no schema impact.
```

示例输出：

```text
Use for schema changes; require reversible migrations and rollback tests.
```

请求参数包括 `maxTokens: 1024`、`temperature: 0`、`disableReasoning: true`，超时为 30 秒。费用记入发起这次压缩的会话，遥测类型为 `skill_description`。

## 缓存与复用

默认缓存文件是 `~/.omp/agent/skill-descriptions.db`。本机只读检查确认该文件存在；本轮没有查询其中的具体条目。

缓存表只有两列：

```sql
CREATE TABLE IF NOT EXISTS skill_descriptions (key TEXT PRIMARY KEY, description TEXT NOT NULL)
```

缓存键是以下内容拼接后的 SHA-256：

- 压缩提示模板原文；
- skill 名称；
- 原始 `description`。

模板、名称或简介任一变化，都会生成新键并重新压缩。三者不变时，后续会话直接读取缓存。进程内使用任务映射避免重复请求，机器级锁让多个 OMP 窗口共用一个未完成的压缩任务。v19.0.0 发布记录也明确说明生成结果按机器共享。

不合格的输出按模型记录为不可用，键形如 `<缓存键>:v<校验版本>:<模型>`。同一模型不会反复请求同一份不合格结果；更换模型或校验版本变化后，可以再次尝试。

## 当前会话与后续会话

`RoutingHintCatalog` 为每次 prompt 构建保存一份简介快照。后台压缩完成后，不会修改当前会话已经建立的 system prompt；新结果通过缓存进入后续 prompt 构建或后续会话。

主 agent 的 system prompt 只列出技能名称和简介：

```text
Matching skill → MUST read skill://<name> first.
<skills>
- db-migration: Use before changing database schemas and migration files.
</skills>
```

完整 `SKILL.md` 正文在模型匹配到技能后，通过 `read skill://<name>` 按需加载。

| 主 agent 建立上下文时的状态 | `Skills` 条目 |
|---|---|
| 缓存未命中，后台压缩尚未完成 | `- db-migration: Use before changing database schemas and migration files.` |
| 后续会话读到压缩缓存 | `- db-migration: Use for schema changes; require reversible migrations and rollback tests.` |

## 与 Managed Skills 的区别

`Optimizing skills` 把结果写入 `skill-descriptions.db` 的 `description` 列。该流程的写入目标是 `skill-descriptions.db`；managed skill 文件由另一条路径创建或更新。

managed skill 的创建与更新由 `manage_skill`、`learn(skill=...)` 或 Auto-Learn capture 完成。两套流程可以先后发生：先写入技能文件，再在后续 prompt 构建时压缩其简介。

## 证据边界

- 版本、模型角色与缓存文件存在来自本机只读命令输出。
- 触发条件、请求参数、缓存键、会话快照和主 agent 上下文形状来自 OMP v19.1.1 源码。
- 进度显示的引入版本来自 v19.0.0 发布记录与对应提交。
- 示例输出是依照提示模板编写的说明材料，不是真实模型响应。
- 没有读取缓存数据库的具体条目，也没有用交互界面重现进度行。

## See Also

- [OMP @smol 角色：直接使用、后级回退与本机模型](smol-role-consumers.md)
- [OMP Managed Skills 生命周期](managed-skills.md)
- [Auto-Learn capture 管线与可观测产物](autolearn-capture-pipeline.md)
- [OMP 启动提示全表](../omp-tips/startup-tips.md)
