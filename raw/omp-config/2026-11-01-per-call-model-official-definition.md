# OMP per-call model 官方机制（v18.14.2 起现行设计）

> Source: can1357/oh-my-pi docs/task-agent-discovery.md（tag v18.14.2，2026-11-02 经 GitHub file_read 读取）；packages/coding-agent/CHANGELOG.md（本地 clone tag v18.5.0 第 16 行，`git show v18.5.0:...` 读取）；本地 clone 提交元数据（`git show --no-patch`）；本机安装 @oh-my-pi/pi-coding-agent 18.15.0 源码 src/task/settings.ts、src/task/model-approval.ts、src/task/persisted-revive.ts
> Collected: 2026-11-02
> Published: Unknown

## v18.14.2 文档摘录（docs/task-agent-discovery.md「Per-call model」段，转写要点）

`task.perCallModel` 决定哪类调用可以在调用侧传 `model`：

| 值 | 行为 |
|---|---|
| `off`（默认） | task item、flat call、eval `agent()`、`workpool()` 传 `model` 会在 preflight 失败（bundled seance 自己的 `model` 独立处理）。字段仍在 task schema 中。 |
| `eval` | 仅 eval `agent()` 与 `workpool()` 接受；task item 照 `off` 行事。用于从脚本路由特定 agent，同时普通委托保持各自配置路由。 |
| `on` | 全部接受。 |

- 只有 operator 层能打开：项目的 `task.perCallModel` 可以调低模式（`on` → `eval` → `off`），永远不能调高。
- 按次 `model` 必须恰好是一条 `provider/model-id[@upstream][:level]`（官方示例 `anthropic/claude-sonnet-4-5:high`）。可选 `@upstream` 钉住路由仅受 aggregator 支持，属于模型身份；`:level` 被钳到该模型支持的档位，同时受 `task.maxEffort` 上限约束；字面 catalog id 胜过把 `:level` 形后缀按档位解析。
- role 别名（含 `@default` 与 legacy `pi/<role>`）、数组、逗号列表、glob、部分 id 都会在 preflight 失败；非 chat 模型被拒时一并给出该原因。
- 许可来源四类：
  1. operator 各层（global config、`--config` 文件、runtime override 或 SDK host settings，绝不是 project settings）配置好的 chat 角色 `modelRoles` 值；非 chat 角色（`image`、`web`、`judge` 等）不授予任何模型，值内的 role 别名也不会展开成内置默认；
  2. 所选 agent 自身 frontmatter `model`，仅当该 agent 是 bundled 或 user 级、仍被发现、未被禁用（project agent 的 frontmatter 不直接授予，仓库 agent 文件不能往 `task.perCallModelAllow` 加条目；它的 frontmatter 模型会授予其按次子代理并向下传递；另一个 agent 的 frontmatter 不授予）；
  3. 父会话 live model，仅当其路由可写为一条精确选择器（多个 `only` upstream、`order` 列表或其他路由字段都不授予）；
  4. composer 里 `^provider/model` 标记产生的 `m<N>` mention agent（bundled task 模板 + 该标记模型作为自身 frontmatter；同样受发现、disabled-agent 与 allowlist 检查）。
- 匹配规则：字面 id 对照全 catalog（含不可用模型）；含 `*`/`?` 的值只路由、永不授予；catalog 成员、凭据、内置角色默认值、保存的 transcript 都不授予。
- `task.perCallModelAllow` 收窄：trimmed 条目与模型 canonical `provider/id[@upstream]` 字面比较（无解析、无 `:level` 分段、无 glob、无裸 id）；模型必须「被授予且被列出」；项目列表只能进一步收窄，永不替代 operator 的；空 project 列表同样只是收窄。
- 项目 settings（`.omp/config.yml` 等）永不授予，只可以通过 `task.perCallModel`、`task.perCallModelAllow`、`task.disabledAgents` 收窄；role 与 allowlist 编辑即时生效；global config、`--config` 文件与 user 级 agent 文件照写授予。
- 门只覆盖传了 `model` 的调用；不传 `model` 的调用照旧走 `task.agentModelOverrides`、agent frontmatter 与 `modelRoles`（项目层照常参与）。
- 对已有 `task.agentModelOverrides[agent]` 条目的 agent 传按次 `model` 会 preflight 冲突失败，override 永不被静默替换。
- bundled seance 不支持按次 `model`；它自己的 `model` 依旧覆盖来源会话保存模型。有 agent 遮住 `seance` 名字时它就是普通 agent：其 `model` 是按次 `model`，适用本段全部规则。
- 按次 worker 永不移到未批准模型：retry fallback、context promotion、agent prewalk 关闭；请求模型不可用或缺 working 凭据时直接失败，不回退父会话模型；请求不带 server-side fallback chain（含调用方传入的）；工厂模型的 provider 自带 chain 会被省略，其他模型的响应（或带 fallback handoff block）会在转发任何内容前让 worker 失败；每条 main-loop 请求都对照当前 operator grants 复查；决策复用到 settings 或 catalog 变化；preflight 时冷 registry 或后台发现未完成的模型，会在 child session 创建前再查一次。
- 冷恢复只恢复精确保存的 `perCallModelIdentity` 路由与 `perCallThinkingLevel` selector；创建 child session 前与每条 main-loop 请求都重查 grants；缺 parent-local grants 的恢复直接拒绝并提示先恢复父会话。改 `task.perCallModel` 只影响新调用。
- compaction summary 与 advisor 之类的维护侧请求不在 main-loop 审批检查内。
- 对按次 `model`，`task.maxEffort` 约束每次 spawn：显式 `:level` 钳到 ≤ cap 的最高支持档位；省略 `:level` 继承 agent thinking level 并被 cap 限制；Unset、`:inherit`、`:off` 保持原义；cap 下没有支持档位的模型让 spawn 与后续每条请求失败；endpoint 自身的 effort 重试仍可取最近支持档位（含上行，例 `minimal` → `low`、`xhigh` → `max`）。
- policy resolution 之后 `before_subagent_spawn` extension hook 跑一次：可阻止 spawn 或替换已解析的 model patterns（带 routing note 进进度元数据）。
- 启用面上，task/eval 工具 description 广播已批准的 role models 与收窄 allowlist：provider-qualified 的 role 值按配置原样列出（不查可用性）；裸值经 registry 解析为精确 `provider/model-id` 解不出则省略；glob 值不授予也不列出；广播用与 dispatch 相同的字面 allowlist 比较。
- `Alt+P` 的 task model pick 仅限本会话；在 `/agents` 保存模型会替换该运行选择并为后续会话持久化。

## v18.5.0 旧设计（已撤回，保留原文）

本地 clone tag `v18.5.0`（creatordate 2026-10-03 03:07:15 +0200）CHANGELOG.md 第 16 行逐字：

> - Added a per-call `model` selector to task items, eval `agent()`, and `workpool()`: a `provider/model[:level]` pattern or role alias, or an ordered array of them, that takes precedence over `task.agentModelOverrides` and the agent definition. Selection is an ordered preference — requested candidates are tried before configured fallbacks — and the spawn fails at preflight instead of silently routing elsewhere when the selector is the ambiguous literal `default`/`inherit` with or without a `:level` suffix (use `@default`), is blank or comma-only, carries an invalid thinking suffix, matches no available model, or sits on the batch container instead of a `tasks[]` item. A requested model without working credentials fails the spawn instead of running on the parent's model, and the error tells the caller to report the unavailable model rather than substitute another. A pool applies its selector to each worker's first turn and reuses that worker's session afterwards ([#12229](https://github.com/can1357/oh-my-pi/pull/12229) by [@Xytronix](https://github.com/Xytronix), [#13669](https://github.com/can1357/oh-my-pi/pull/13669) by [@andrebrait](https://github.com/andrebrait)).

与 18.14.2 现行设计的差异：旧版接受 role 别名与候选数组，且优先级高于 `task.agentModelOverrides`。

本地 clone 提交时间线（`git show --no-patch --format='%h %ci %s'`）：

- de4c40c77b 2026-10-02 21:42:32 +0000 feat(task,eval): per-call model selector on task items and agent() (#12229)
- f064d9789d 2026-10-02 23:54:28 +0200 fix(task): fail an unauthenticated per-call model instead of using the parent's
- 31876ff53e 2026-10-07 19:32:22 +0200 revert: removed per-call subagent model selectors（`git tag --contains` 显示被 v18.9.0 系列及更晚标签包含）

## 再发布与安装现状

- 再发布提交组（GitHub 侧 2026-11-01 经 commit 搜索与补丁读取可得）：c30b1bbc22c94716451b6793511f08b64f427675、ee175af313fdd5b0378efe471376a312290a81be、4f3e1cbf851f9bb74115a73169009f612dec3380、62bdd0c776b64361f8a4fda19944d73bf101d5cf；本地 checkout HEAD `1f23be9b`（包版本 18.14.1，branch main）实测不含 c30b1bbc（`git merge-base --is-ancestor` 失败），且 `grep perCallModel` 在 packages/coding-agent/src 全树零匹配。
- 本地 clone 标签 `git tag -l 'v18.14*' 'v18.15*'` 只有 v18.14.0、v18.14.1；v18.14.2 与 v18.15.0 不在本地。
- 本机安装 runtime `@oh-my-pi/pi-coding-agent` package.json 第 3 行 `"version": "18.15.0"`。实现位置：
  - `src/task/settings.ts:308-325`：`cfgTaskPerCallModel`，`type: "enum"`，`values: ["off", "eval", "on"]`，`default: "off"`；options 描述含「Accept `model` on task items and in eval agent()/workpool()」等三条。
  - `src/task/settings.ts:332-337`：`perCallModelEnabled(settings, invocationKind)` 要求 `[settings.grantAuthority(), settings].every(...)`，即 operator 权威层与 merged 层都允许；`on` 全开、`eval` 只对 eval 开、项目层关得开不得。
  - `src/task/settings.ts:358-373`：`cfgTaskPerCallModelAllow`，`type: "array"`，`default: []`；UI editor 在 project 来源时隐藏（`condition: "perCallModelAllowNotProject"`）。
  - `src/task/model-approval.ts:272-288`：授予集合 `perCallModelGrantPatterns` 由 configuredRoleGrantPatterns、bundled/user agent frontmatter（需未禁用、含 live 层检查）与 parentModelPattern 组成。
  - `src/task/model-approval.ts:291-307`：`computeGranted` 先过双层 allowlist，再看授予 pattern：字面 catalog id 优先（不可用也不扩大授予）、glob 永不授予、其余经解析比较。
  - `src/task/persisted-revive.ts:380-384`：注释「A per-call model is held to the operator's current grants, not the transcript's, never switches models, and keeps the live task.maxEffort ceiling the spawn ran under」，并携带 `thinkingLevelCeiling: cfgTaskMaxEffort.get(...)`。
- 官方 docs tag v18.14.2 与安装版 18.15.0 实现一致描述上述规则。
