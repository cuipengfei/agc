# 本机 per-call model 许可实测（runtime 18.15.0）

> Source: /home/cpf/.omp/agent/config.yml（逐字行见下）；OMP @oh-my-pi/pi-coding-agent 18.15.0 安装版；Settings.loadReadOnly + getPerCallModelAdvertisement 运行输出；本会话 task 工具两次拒绝输出
> Collected: 2026-11-02
> Published: Unknown

## 配置状态

- `/home/cpf/.omp/agent/config.yml:524` 现为 `perCallModel: "on"`（2026-11-01 用编辑工具单键插入启用；此前未设置该键，随默认 `off` 生效）。未设置 `task.perCallModelAllow`（默认 `[]`）。
- task 段逐字（config.yml:516-539）：

```yaml
task:
  isolation:
    apply: true
    merge: patch
    commits: generic
    enabled: false
  eager: default
  batch: true
  perCallModel: "on"
  enableEffort: true
  maxConcurrency: 32
  enableLsp: true
  maxRecursionDepth: 1
  maxRuntimeMs: 1800000
  agentIdleTtlMs: 420000
  softRequestBudget: 200
  softRequestBudgetNotice: true
  maxEffort: high
  disabledAgents: []
  agentModelOverrides: {}
  agentPrewalk: {}
  prewalk: false
  showResolvedModelBadge: true
  structured: true
```

## 本机 modelRoles 逐字（config.yml:59-72，连 `modelRoleStorage: global`）

```yaml
modelRoleStorage: global
modelRoles:
  plan: c8787/gpt-6.1-sol:high
  slow: c8787/gpt-6.1-sol:high
  commit: c8787/gpt-6-luna:high
  smol: c8787/gpt-6-luna:high
  task: opencode-go/deepseek-v4.1-flash:max
  vision: sensenova/glm-5.2:high
  tiny: sensenova/glm-5.2:high
  advisor: c8787/gpt-6-luna:max
  default: opencode-go/deepseek-v4.1-flash:max
  web: web/firecrawl
  memory: sensenova/glm-5.2:high
  judge: typesafe-zen/jev-1.13-free
  widget: sensenova/glm-5.2:max
```

## 广播实测（Settings.loadReadOnly，agentDir=/home/cpf/.omp/agent，cwd=/home/cpf/code-inside/agc，2026-11-02 输出逐字）

```json
{
  "setting": "on",
  "allowlist": [],
  "taskEnabled": true,
  "evalEnabled": true,
  "modelRolesKeys": [
    "plan", "slow", "commit", "smol", "task", "vision", "tiny",
    "advisor", "default", "web", "memory", "judge", "widget"
  ],
  "advertisement": {
    "roles": [
      { "role": "plan",    "patterns": [ "c8787/gpt-6.1-sol:high" ] },
      { "role": "slow",    "patterns": [ "c8787/gpt-6.1-sol:high" ] },
      { "role": "commit",  "patterns": [ "c8787/gpt-6-luna:high" ] },
      { "role": "smol",    "patterns": [ "c8787/gpt-6-luna:high" ] },
      { "role": "task",    "patterns": [ "opencode-go/deepseek-v4.1-flash:max" ] },
      { "role": "vision",  "patterns": [ "sensenova/glm-5.2:high" ] },
      { "role": "tiny",    "patterns": [ "sensenova/glm-5.2:high" ] },
      { "role": "advisor", "patterns": [ "c8787/gpt-6-luna:max" ] },
      { "role": "default", "patterns": [ "opencode-go/deepseek-v4.1-flash:max" ] },
      { "role": "memory",  "patterns": [ "sensenova/glm-5.2:high" ] },
      { "role": "widget",  "patterns": [ "sensenova/glm-5.2:max" ] }
    ],
    "allowlist": [],
    "parentModelWithheld": false
  }
}
```

（原输出 JSON 中 modelRolesKeys 为逐键排开，此处折行不逐值改动。）

说明：

- 广播只列 operator 各层 configured 的 chat 角色值；13 个 modelRoles 键里 `web`（web/firecrawl）与 `judge`（typesafe-zen/jev-1.13-free）属于 non-chat kind 角色，按官方规则不授予，也不出现在广播 roles 里。广播 roles 共 11 条。
- role → selector 归并后共 6 个不同选择器获许可：`c8787/gpt-6.1-sol:high`（plan、slow）、`c8787/gpt-6-luna:high`（commit、smol）、`opencode-go/deepseek-v4.1-flash:max`（task、default）、`sensenova/glm-5.2:high`（vision、tiny、memory）、`c8787/gpt-6-luna:max`（advisor）、`sensenova/glm-5.2:max`（widget）。
- 该次广播调用未传 parentModel，不能据 `parentModelWithheld: false` 断言当前会话模型 `kimi-code/k3.1-pro` 已获许可；官方规则为父会话 live model 仅当路由可写为一条精确选择器时授予（model-approval.ts:281-287 将 parentModelPattern 并入授予集合）。
- 13 键 sentinel 通过（`Object.keys(s.getModelRoles()).length !== 13` 抛错路径未触发）。

## 两次拒绝实测（逐字）

1. task item 传 `model: "@smol"`（agent: scout）：

> Task 1 has an invalid `model` value "@smol". Use one exact provider/model-id selector, optionally followed by a supported :level. Role aliases, patterns, and candidate arrays are not accepted.

2. task item 传 `model: "c8787/gpt-5.6-luna"`（agent: scout）：

> Task #1 failed preflight: Per-call model c8787/gpt-5.6-luna is not approved for agent "scout": use a model named by a chat role configured outside project settings, the selected agent's own frontmatter (bundled or user-level agents only), or the parent's model. Catalog or credentials alone do not approve a model.

两次都在子代理派发前返错，没有发起真实模型请求。

## 未获许可与排除项

- `c8787/gpt-5.6-luna` 在本机只出现在 `retry.fallbackChains.web`（config.yml:195-206，第 199 行），运行时故障回退链不授予按次许可，实测即拒绝。web 链逐字（config.yml:195-209）：

```yaml
    web:
      - web/tavily
      - web/exa
      - c8787/gpt-6-luna
      - c8787/gpt-5.6-luna
      - web/duckduckgo
      - web/jina
      - web/kimi
      - web/startpage
      - web/ecosia
      - web/google
      - web/mojeek
      - web/public
      - web/parallel
      - web/perplexity
```

（链在 209 行后继续有 web/ollama 等，直到 `@default`。）

- `modelRoles.web` 的 `web/firecrawl` 与 `modelRoles.judge` 的 `typesafe-zen/jev-1.13-free` 是非 chat kind 角色（model-roles.ts：`web: { section: "kind", accepts: acceptsWeb }`、`judge: { section: "kind", accepts: acceptsJudge }`），按官方规则不授予。
- `task.maxEffort: high`（config.yml:533）对每个按次选模 spawn 生效为档位上限：`:max` 选择器（task、default、advisor、widget 的值）获许可后 thinking 仍被钳到 ≤ high 的最高支持档位（官方 docs + persisted-revive.ts:380-384）。
- `agentModelOverrides: {}`（config.yml:535）为空，无冲突路径。

## 核对边界

- 「获许可」指配置与 preflight 授予成立；未发起真实模型请求，上游当前可用性未验证。
- 广播输出用 Settings.loadReadOnly 合并视图读取，未包含环境变量覆盖的最终运行时值差异（已知限制）。
