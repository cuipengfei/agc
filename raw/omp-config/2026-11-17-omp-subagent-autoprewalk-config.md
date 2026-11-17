# OMP 18.22.0 子 Agent 自动 Prewalk 机制与本机配置实测

> Source: OMP @oh-my-pi/pi-coding-agent 18.22.0 本机安装包源码（/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src）；本机 ~/.omp/agent/config.yml、~/.omp/agent/agents/*.md、~/.omp/agent/models.yml；本会话实测命令输出
> Collected: 2026-11-17
> Published: Unknown

## 会话背景

用户在 OMP 18.22.0 上讨论 `task.agentPrewalkAuto` 配置语义，要求给出 5 个自定义子 Agent（builder、frontend、librarian、oracle、qa）与 bundled 通用 task 的 from（起始模型）/to（交接目标）建议，并落地本机配置。以下为源码事实、本机配置改动与实测路由结果。

## 源码事实（OMP 18.22.0）

1. `task.agentPrewalkAuto` 是 settings-only record，注册在 `src/task/settings.ts:694-699`，默认 `{}`。
2. 子 Agent 无独立 `prewalk.from` 配置项；`cfgPrewalkFrom` 仅在 `src/session/settings.ts:109-119` 注册，供主会话 `/prewalk restart` 使用。
3. 子 Agent 起始模型（from）解析优先级（`src/task/structured-subagent.ts:588-602`）：per-call `model` → `task.agentModelOverrides[agent]` → Agent frontmatter `model` → 父会话当前模型。
4. 子 Agent 交接目标（to）解析（`src/task/executor.ts:5069-5133` + `src/config/model-resolver.ts:1415-1436`）：`task.agentPrewalkAuto[agent]` 值为 `"on"` 时使用 `prewalk.autoTarget`（`src/task/executor.ts:5087-5088`），其他角色或模型名直接作为 `prewalkPattern`。
5. 目标与起始模型同模同档跳过（`src/task/executor.ts:5100-5104`）；judge 通过且概率 ≥0.70 才 arm（`src/task/executor.ts:5116-5128`）。
6. 交接执行：todo gate 打开后首个 `edit`/`write` 工具结果返回时切换一次（`src/session/prewalk.ts:41-75,381-423`）；直接文件 `edit`/`write` 无 `xd://` 元数据即判为实现动作，不检查路径。
7. `modelRoles` 里带的 `:max`/`:high` 后缀优先于 frontmatter `thinkingLevel`（`src/task/executor.ts:5019-5023`）。
8. `prewalk.autoTarget` 仅有两个消费者：子 Agent `"on"` 路径（`src/task/executor.ts:5087`）与主会话 `prewalk.auto`（`src/session/agent-session.ts:3285`）；本机 `prewalk.auto: "off"` 且四个条目均写死角色名，故当前为 no-op。
9. native judge 判定：本机 `~/.omp/agent/models.yml:110-112` 声明 `gpt-6-luna-decisions` 的 `api: openai-decisions`，OMP 通过 `isJudgmentApi` 将其识别为 native 判断后端（`src/judgment/index.ts`）。

## 本机配置改动（2026-11-17）

1. `~/.omp/agent/agents/builder.md` 第 5 行：`model: "@balanced"` → `model: "@task"`。
2. `~/.omp/agent/agents/frontend.md` 第 5 行：`model: "@designer"` → `model: "@task"`。
3. `~/.omp/agent/agents/qa.md` 第 5 行：`model: "@task"` → `model: "@architect"`。
4. `~/.omp/agent/config.yml:561-568`：
   ```yaml
   task:
     agentModelOverrides:
       task: "@architect"
     agentPrewalk: {}
     agentPrewalkAuto:
       builder: "@balanced"
       frontend: "@designer"
       qa: "@task"
       task: "@task"
   ```
5. 备份：`/home/cpf/.omp/agent/config.yml.bak-20261117-223714`（修改前生成）。
6. `./pull.sh` 已同步到 AGC 仓库（`omp/agent/config.yml`、`omp/agent/agents/{builder,frontend,qa}.md`；顺带同步 `omp/agent/.env`、`agents/skill-lock.json`、`bun/global-package.json`，详见 2026-11-17 会话 `./pull.sh` 输出）。

## 实测路由（OMP 18.22.0 ModelRegistry + resolveAgentModelSelection）

- builder：from `kimi-code/k3.1-pro:max`（@task）→ to `kimi-code/kimi-for-coding:max`（@balanced）
- frontend：from `kimi-code/k3.1-pro:max`（@task）→ to `sensenova/kimi-k3:max`（@designer）
- qa：from `c8787/gpt-6.1-sol:high`（@architect）→ to `kimi-code/k3.1-pro:max`（@task）
- task：from `c8787/gpt-6.1-sol:high`（@architect）→ to `kimi-code/k3.1-pro:max`（@task）
- librarian：from `c8787/gpt-6-luna:high`（@smol），未启用 prewalk
- oracle：from `c8787/gpt-6.1-sol:high`（@architect），未启用 prewalk
- scout：from `c8787/gpt-6-luna:high`（@smol），未启用 prewalk
- reviewer：from `c8787/gpt-6.1-sol:high`（@slow），未启用 prewalk
- security-reviewer：继承父会话模型，未启用 prewalk
- sonic：from `c8787/gpt-6-luna:high`（@smol），未启用 prewalk

## 已知边界与副作用

- 调高起始模型后，凡 judge 判定为 `primary`/`direct` 或未达到 0.70 阈值的子任务，会全程使用调高后的起始模型跑完。
- qa 的 tools 含 `write`/`edit`，其创建的第一个临时验证文件即可能触发切换；若全程只跑 `bash`/`read`，则留在起始模型。
- 子 Agent 的自动判断只看派发文本（`assignment`），共享 `context` 与 `solutionSpace` 不参与 judge 输入；使用 `steps` 时，`assignment` 为 `renderStepsBrief(item.steps)` 生成的包含全部步骤的 Markdown 简报（`src/task/index.ts:650-652`；`src/task/steps.ts:92-95`），不是首个 `steps[0]`。
- `prewalk.autoTarget` 当前为 no-op；若将来把某个条目改为 `"on"` 或开启主会话 `prewalk.auto`，才需要关注其值。
