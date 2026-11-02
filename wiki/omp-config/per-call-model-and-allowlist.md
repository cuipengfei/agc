# OMP per-call model 与许可机制

> Sources: can1357/oh-my-pi 官方 docs 与 CHANGELOG（v18.14.2、v18.5.0），2026-10；OMP @oh-my-pi/pi-coding-agent 18.15.0 源码与本机实测，2026-11-02
> Raw: [官方机制](../../raw/omp-config/2026-11-01-per-call-model-official-definition.md); [本机许可实测](../../raw/omp-config/2026-11-01-per-call-model-local-grants-and-rejections.md); [agent 定义与 @role 绑定](../../raw/omp-config/2026-11-01-agent-role-model-binding-example.md)
> Updated: 2026-11-02

## Overview

`task.perCallModel`（v18.14.2 起正式发布）让 main agent 在一次 task item、flat call 或 eval `agent()`/`workpool()` 调用中传 `model`。三态 `off`/`eval`/`on` 控制打开面；按次 `model` 必须是一条精确 `provider/model-id[@upstream][:level]` 选择器，且须在 operator 已配置的许可范围内；`task.perCallModelAllow` 再收窄。与 `task.agentModelOverrides` 并用时冲突失败；bundled seance 有独立模型规则。本机 runtime 18.15.0 已开启 `on`，广播给出 6 个可许可选择器。

## 三态开关

| 值 | task item / flat call | eval `agent()` / `workpool()` |
|---|---|---|
| `off`（默认） | 拒绝 `model` | 拒绝 `model` |
| `eval` | 拒绝 `model` | 接受 |
| `on` | 接受 | 接受 |

- 只有 operator 层（global config、`--config` 文件、runtime override 或 SDK host）可以打开；项目 settings 只能调低模式（`on` → `eval` → `off`），永远不能调高。
- `perCallModelEnabled()` 要求 operator 权威层与 merged 两层都放行（settings.ts:332-337）。
- 门只覆盖传了 `model` 的调用；未传 `model` 的调用照旧走 `task.agentModelOverrides` → agent frontmatter → 父会话回退，项目层照常参与。

## 按次 model 的格式

合法形态恰为一条精确 selector：`provider/model-id[@upstream][:level]`（官方示例 `anthropic/claude-sonnet-4-5:high`）。`@upstream` 钉住路由仅受 aggregator 支持，属于模型身份；`:level` 被钳到该模型支持档位，且受 `task.maxEffort` 上限约束；字面 catalog id 胜过档位后缀解析。拒绝形态：role 别名（含 `@default`、legacy `pi/<role>`）、数组、逗号列表、glob、部分 id、非 chat 模型。

本机安装版 18.15.0 上的两次实测拒绝（逐字）：

> Task 1 has an invalid `model` value "@smol". Use one exact provider/model-id selector, optionally followed by a supported :level. Role aliases, patterns, and candidate arrays are not accepted.

> Task #1 failed preflight: Per-call model c8787/gpt-5.6-luna is not approved for agent "scout": use a model named by a chat role configured outside project settings, the selected agent's own frontmatter (bundled or user-level agents only), or the parent's model. Catalog or credentials alone do not approve a model.

两次都在子代理派发前返错，没有真实模型请求。

## 许可来源与 allowlist

按次 `model` 必须已被 operator 配置许可，来源有四：

1. operator 各层配置的 chat 角色 `modelRoles` 映射值；
2. 所选 agent 的 frontmatter `model`（该 agent 须是 bundled 或 user 级、仍被发现、未禁用；project agent 的 frontmatter 不直接授予，仓库 agent 文件不能往 allowlist 加条目）；
3. 父会话 live model（仅当其路由可写为一条精确选择器）；
4. composer 中 `^provider/model` 标记出的 `m<N>` mention agent。

规则要点：

- 字面 id 对照全 catalog（含不可用模型）；含 `*`/`?` 的值只用于路由、永不授予；catalog 成员、凭据、内置角色默认值、保存的 transcript 都不授予。
- 非 chat kind 角色（`image`、`web`、`judge`，以及 `speech`（tts 文字→语音）与 `dictation`（stt 语音→文字））不授予任何模型。
- `task.perCallModelAllow`（默认 `[]`）再收窄：条目与 canonical `provider/id[@upstream]` 字面比较，模型须「被授予 且 被列出」；项目列表只能进一步收窄，永不替代 operator 的。
- 项目 settings 永不授予；只能通过 `task.perCallModel`、`task.perCallModelAllow`、`task.disabledAgents` 三键收窄。
- role 与 allowlist 编辑即时生效；global config、`--config` 文件与 user 级 agent 文件照写授予。
- 启用面上，task/eval 工具 description 广播已批准 role models 与 allowlist：provider-qualified 值按配置原样列出（不查可用性），裸值经 registry 解析为精确 selector，解不出的省略。

## 按次选模的后续约束

- 对已有 `task.agentModelOverrides[agent]` 的 agent 传按次 `model`：preflight 冲突失败，override 永不被静默替换。
- bundled seance 不支持按次 `model`；它自己的 `model` 依旧覆盖来源会话保存模型。有 agent 遮住 `seance` 名字时被视为普通 agent，适用全部规则。
- 按次 worker 永不移到未批准模型：retry fallback、context promotion、agent prewalk 关闭；请求模型不可用或缺 working 凭据时直接失败，不回退父会话模型；请求不带 server-side fallback chain。
- `task.maxEffort` 是每次按次 spawn 的档位上限：显式 `:level` 钳到 ≤ cap 的最高支持档位；省略 `:level` 继承 agent thinking level 并被 cap 限制；cap 下无支持档位的模型让 spawn 与后续每条请求失败。
- 每次派发先经 `resolveEffectiveSubagentPolicy()`（重载设置、重新发现 agents、策略检查），之后 `before_subagent_spawn` hook 可阻止 spawn 或替换 model patterns。
- 决策复用到 settings 或 catalog 变化；每条 main-loop 请求仍对照当前 grants 复查。
- `Alt+P` 的 task model pick 仅限当前会话；在 `/agents` 保存模型会替换该运行选择并为后续会话持久化。

## 本机许可实测（runtime 18.15.0）

本机已在 `/home/cpf/.omp/agent/config.yml:524` 用编辑工具单键插入 `perCallModel: "on"`（2026-11-01）；`task.perCallModelAllow` 未设置（默认 `[]`）。本机 `modelRoles` 有 13 键，chat 角色值广播 11 个 role，归并出 6 个可许可选择器：

| 可按次使用的选择器 | 广播来源 role |
|---|---|
| `c8787/gpt-6.1-sol:high` | plan、slow |
| `c8787/gpt-6-luna:high` | commit、smol |
| `opencode-go/deepseek-v4.1-flash:max` | task、default |
| `sensenova/glm-5.2:high` | vision、tiny、memory |
| `c8787/gpt-6-luna:max` | advisor |
| `sensenova/glm-5.2:max` | widget |

不授予或被排除的例子：

| 示例 | 原因 |
|---|---|
| `@smol`、`@migration_review` | role 别名不符合精确 selector 格式（`@smol` 实测拒绝） |
| `c8787/gpt-5.6-luna` | 只在 `retry.fallbackChains.web`（config.yml:199），回退链不授予；实测拒绝 |
| `web/firecrawl`、`typesafe-zen/jev-1.13-free` | 对应非 chat kind 角色 web、judge，不授予 |
| `openai/gpt-5.4:high` 这类未由角色/agent/父会话授予的模型 | 无许可来源即拒绝；catalog 或凭据本身不授予 |

补充边界：本会话广播调用未传 parentModel，不能据 `parentModelWithheld: false` 断言当前会话模型 `kimi-code/k3.1-pro` 已获许可；机制上父会话模型仅当路由可写为一条精确 selector 时授予。`task.maxEffort: high`（config.yml:533）意味着 `:max` 选择器获得许可后 thinking 仍被钳到 ≤ high 的最高支持档位。

## agent 与 role 的绑定

用户级 agent 写在 `~/.omp/agent/agents/<name>.md`，项目级在 `<project>/.omp/agents/<name>.md`；frontmatter 写 `name`、`description`、`model`、`tools`、`spawns` 等，正文成为子代理 system prompt。要点：`main`/`sub` 是保留名；`spawns` 缺省但 tools 含 task 时按兼容规则视为 `*`；键名只认 camelCase，`readSummarize: false` 关闭其 read 结构化摘要（bundled scout 出厂即关），连字符写法会被静默忽略。

官方绑定示例（docs，转写）：`~/.omp/agent/agents/reviewer.md` frontmatter 设 `model: "@review"`，`config.yml` 设 `modelRoles: { review: openai/gpt-5.4:high }`，正文为审查指令。绑定链按顺序：

1. main agent 写 `agent: "reviewer"`；
2. OMP 读取定义，frontmatter 默认模型 `@review`；
3. `@review` 经 `modelRoles.review` 展开为 `openai/gpt-5.4:high`；
4. child AgentSession 携带该 agent 的 prompt、工具与该模型起步。

role 的两个用途：agent 默认模型别名；operator 配置的 chat 角色值自动成为按次许可来源。按次调用侧必须写精确 selector，不写 `@role`。

发现合并按 first-wins：项目 `.omp/agents` → 用户 `.omp/agents` → OMP extension 包 → Claude marketplace 插件 → bundled；同名覆盖，名字区分大小写；`.claude/agents` 等跨 harness 直连根被有意跳过。`omp agents unpack` 可导出内置 agent 作为模板；`/agents` 有创建、保存与刷新入口。task/eval preflight 先重载设置再重新发现 agents，会话中新加的 agent 文件按刷新后配置解析。

## 版本历史与安装现状

旧版与现行设计差异明显，引用时须分清版本：

> **Status: Outdated** (2026-10-07)
> v18.5.0（feat de4c40c77b，2026-10-02）曾引入 per-call `model`：接受 `provider/model[:level]` pattern、role 别名或有序数组，且优先级高于 `task.agentModelOverrides`。随 revert 31876ff53e（2026-10-07）移除。现行设计（v18.14.2 起）只接受单一精确 selector，别名与数组在 preflight 失败，与 `agentModelOverrides` 并用时冲突失败。

- v18.14.2 起官方 docs 记载现行设计；本机安装 runtime 为 18.15.0（package.json 第 3 行），实现相同。
- 本机源码 checkout HEAD `1f23be9b`（包版本 18.14.1）不含该功能（src 全树无 `perCallModel` 匹配）；本地 clone 标签止于 v18.14.1。
- 再发布提交组只在 GitHub 侧可见（c30b1bbc…、ee175af3…、4f3e1cbf…、62bdd0c…）。

## See Also

- [OMP /model 模型浏览器：角色解析与 kind 过滤](model-browser-role-resolution.md)
- [OMP 配置语义手册](config-semantics.md)
- [OMP task 工具中的 seance 历史会话咨询](../omp-background-agents/task-seance-historical-consult.md)
- [OMP 自定义 sub-agent：定义、工具名适配与验证](custom-subagent-deployment.md) — frontmatter 字段表、跨机器复刻三处替换、写入前断言与冒烟核验方法
