# agent 定义与 @role 绑定（官方 agent 自定义机制）

> Source: can1357/oh-my-pi docs/task-agent-discovery.md（tag v18.14.2「Agent definition shape」「Role-backed custom agents」「Filesystem and plugin discovery」段，2026-11-02 经 GitHub file_read 读取）；本机安装 18.15.0 源码 src/config/model-roles.ts:56-91；自拟 migration-reviewer 演示
> Collected: 2026-11-02
> Published: Unknown

## agent 文件位置与 frontmatter

- OMP 从 `~/.omp/agent/agents/*.md` 发现用户级 agent，从项目 `.omp/agents/*.md` 发现项目级 agent。
- frontmatter 字段（docs「Agent definition shape」转写）：必需 `name`、`description`、`systemPrompt`（正文）；可选 `tools`、`spawns`、`model`（单 selector、CSV 或数组，按序尝试、role 别名先展开）、`thinkingLevel`/`thinking`、`output`、`blocking`、`structured`、`autoloadSkills`、`readSummarize`、`prewalk`、`advisor`；`main` 与 `sub` 是保留名（trim + 小写后检查）；source 标注 `"bundled" | "user" | "project"`。
- 关键字段语义：`tools` 接受 CSV 或数组，省略或 YAML null 选内置默认工具集，空的声明导致不选任何内置，结构化子代仍收必需的 `yield` 工具；`spawns` 接受 `*`、CSV、数组，缺省但 tools 含 task 时按兼容规则视为 `*`；`blocking: true` 让父级在异步执行开启时也等待该 agent；`structured: true` 在 `task.structured` 关闭时仍为该 agent 保留结构化结果与 yield；`readSummarize: false` 关闭该 agent read 工具的结构化摘要（scout 出厂即关）；`prewalk: true` 按已解析模型起步、首次 edit/write 交接给默认目标（smol 角色），字符串值（如 `prewalk: "@smol"`）自选目标，`task.agentPrewalk` 设置优先；`advisor: true` 配对 advisor 角色，字符串值给显式 advisor 模型 pattern，`task.agentAdvisor` 设置优先。
- 键名形态：frontmatter 解析默认 `rawKeys = false`，解析后把连字符键归一为 camelCase（`kebabToCamel()`，pi-utils/src/frontmatter.ts:14-18、26-49、145）；agent 入口 `parseAgent()` 用默认选项调用（task/agents.ts:111-115）。因此 `thinking-level` 与 `thinkingLevel`、`read-summarize` 与 `readSummarize` 都受支持，内部统一读 camelCase（helpers.ts:368-379）；官方 v18.14.2 文档即用连字符写法并注明归一。

## 官方 reviewer 绑定示例（docs 示例，转写缩进为两空格）

`~/.omp/agent/agents/reviewer.md`：

```md
---
name: reviewer
description: Review a change for correctness.
model: "@review"
---

Review the assigned change and report concrete findings.
```

`~/.omp/agent/config.yml`：

```yaml
modelRoles:
  review: openai/gpt-5.4:high
```

docs 原文要点：`@review` 通过 `modelRoles.review` 解析；每个 `modelRoles.<role>` 值存一条具体模型 selector，可追加 `:high` 这类 thinking 后缀；改映射影响后续 task 解析，无需改 agent 定义。task/eval preflight 会先重载 global、project 与显式 overlay 设置再重新发现 agents，会话中加入的 agent 文件与 role 别名按刷新后的配置解析。

配套 batch task 调用（docs 示例转写）：

```json
{
	"context": "Review the current change in this repository.",
	"tasks": [
		{
			"agent": "reviewer",
			"task": "Report concrete correctness findings.",
			"solutionSpace": "Review cause and failure modes are open; no known defect."
		}
	]
}
```

`solutionSpace` 描述任务有多开放，与体量无关。`/model` 的 Roles 视图可分配并持久化自定义角色映射（如 review、fast、good）；改 active/default 会话选择不会重映射这些 role。

## 发现合并顺序与查找

- `discoverAgents(cwd, home, extensionRoots?)` 依序合并：① 最近项目 `.omp/agents`（首个 `.omp` 命中）；② 用户 `.omp/agents`；③ 各启用 OMP extension 包的 `<root>/agents`；④ Claude marketplace 插件根的 `agents/`（claude-plugins provider 启用时；项目级排用户级前）；⑤ bundled agents。
- first-wins 去重按精确 name：项目 `.omp` 覆盖用户 `.omp`；靠前的 extension 根覆盖靠后的 extension 根、Claude 插件与 bundled；非 bundled 覆盖同名 bundled；名字匹配区分大小写（`Task` 与 `task` 是两个名字）；目录内按文件名字典序读取后去重。
- 直连跨 harness 根（`.claude/agents`、`.codex/agents`、`.gemini/agents`）被有意跳过（`TASK_AGENT_CONFIG_SOURCE = ".omp"`；其 frontmatter schema 与 OMP task-agent 约定不符）。Claude 方言插件 agent 会被丢弃 frontmatter `model`，避免 Claude 别名被误读为 OMP selector。
- 查找是精确 name 线性搜索；无限制会话缺省 `agent` 字段默认 `task`；受限父 `spawns` 列表缺省默认取列表第一个；名字缺失时 preflight 报 `Unknown agent "...". Available: ...`，不启动子进程。
- bundled 定义：`scout`、`reviewer`、`security-reviewer` 来自提示词文件；`task` 与 `sonic` 来自共享 task.md 正文 + 注入 frontmatter；bundled 解析用 fatal 级，YAML 不可恢复错误可让整个发现失败。
- 执行期 `resolveEffectiveSubagentPolicy()` 顺序：原子重载 live 设置 → 解析 agent 名（含父 spawn 策略缺省值）→ 深度/自递归/父策略检查 → 重新发现 agents 并追加会话内 m<N> mention agents → 精确查找与 `task.disabledAgents` 检查 → plan 模式、outputs schema、model 策略、isolation 策略解析。

## role 的两个用途

1. agent frontmatter 的默认模型别名（`model: "@review"` 经 `modelRoles.review` 展开）。
2. per-call 许可来源：operator 各层 configured 的 chat 角色值自动授予其 selector（v18.14.2 起的按次规则，另见 per-call 摘录）。

对比：按次调用侧必须写精确 `provider/model-id`，不写 `@role`；`@role` 只可作为 agent frontmatter 的默认模型别名。

## 本机角色分段（model-roles.ts:56-91 逐字段转写）

MODEL_ROLES 按 section 分两组。chat 组：`default`（Default）、`smol`（Fast）、`slow`（Thinking）、`vision`（Vision）、`plan`（Architect）、`commit`（Commit）、`tiny`（Tiny，接受 tiny 或 chat）、`memory`（Memory）、`task`（Subtask）、`advisor`（Advisor）、`widget`（Job widgets）。kind 组：`image`（`modelKind(model) === "image"`）、`web`（acceptsWeb）、`speech`（`modelKind(model) === "tts"`）、`dictation`（`modelKind(model) === "stt"`）、`judge`（acceptsJudge）。

speech 用于文字→语音合成（tts），dictation 用于麦克风语音→文字转录（stt）。两者与 `image`、`web`、`judge` 一样属于非 chat kind 角色，不构成 per-call 授予。

## 自拟演示示例（本机语境，未创建）

`/home/cpf/.omp/agent/agents/migration-reviewer.md`：

```md
---
name: migration-reviewer
description: Review database migrations for correctness and rollback risks.
model: "@migration_review"
tools: [read, grep, glob]
spawns: []
---

Review the assigned migration.

Check schema compatibility, data preservation, rollback behavior,
and lock duration. Report concrete findings with file references.
Do not modify files.
```

config.yml：

```yaml
modelRoles:
  migration_review: c8787/gpt-6.1-sol:high
```

绑定链（按顺序）：

1. main agent 在 task 里写 `agent: "migration-reviewer"`；
2. OMP 读取该 agent 定义，frontmatter 给出默认模型 `@migration_review`；
3. `@migration_review` 经 `modelRoles.migration_review` 展开为 `c8787/gpt-6.1-sol:high`；
4. child AgentSession 携带该 agent 的 prompt、工具与该模型起步。

`c8787/gpt-6.1-sol:high` 已在本机 per-call 许可广播清单内（见同日本地许可摘录）。示例整体为自拟演示，本机未创建这两个文件。

## 模板与入口

- `omp agents unpack`（加 `--project` 则入项目目录）导出 bundled agent 作为模板。
- `/agents` 提供创建、保存与刷新入口；官方文档：Alt+P 的 task model pick 仅限本会话，`/agents` 里保存模型会替换该运行选择并为后续会话持久化。
