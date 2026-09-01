# OMP Hindsight / Sharpshooter 后端：源码与配置证据

> Source: local `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/`（OMP v18.0.11）
> Source: `gh api repos/vectorize-io/hindsight`（pg0 description）
> Collected: 2026-09-01
> Published: Unknown

以下为 OMP 本地源码关键片段与 gh 查询结果。

## memory.backend 枚举（config/settings-schema.ts L2945-2955）

```ts
"memory.backend": {
    type: "string",
    enum: ["off", "local", "hindsight", "mnemopi", "sharpshooter"],
    default: "off",
    ...
},
```

## hindsight 配置项（config/settings-schema.ts L3260-3422）

全部带 schema 默认值；`hindsight/config.ts` 仅对以下字段做 env override：`HINDSIGHT_API_URL`、`HINDSIGHT_API_TOKEN`、`HINDSIGHT_BANK_ID`、`HINDSIGHT_BANK_MISSION`、`HINDSIGHT_RETAIN_MISSION`、`HINDSIGHT_AUTO_RECALL`、`HINDSIGHT_AUTO_RETAIN`、`HINDSIGHT_RETAIN_MODE` 等；mental model 系列与 `recallTypes` 只能走 settings。

关键项：

- `hindsight.apiUrl` 默认 `http://localhost:8888`
- `hindsight.apiToken` 默认 undefined（credential 字段）
- `hindsight.scoping` 默认 `per-project-tagged`
- `hindsight.bankMission` / `hindsight.retainMission`：自然语言散文，前者是 bank 身份/目的，后者是给事实提取 LLM 的提取指令
- `hindsight.retainMode` 默认 `full-session`（OMP 推荐）；另一值 `last-turn`
- `hindsight.retainEveryNTurns` 默认 3；`hindsight.retainOverlapTurns` 默认 2；`hindsight.retainContext` 默认 `omp`
- `hindsight.requestTimeoutMs` 30s / `reflectTimeoutMs` 120s / `recallTimeoutMs` 30s / `retainTimeoutMs` 60s
- `hindsight.mentalModelsEnabled` true / `mentalModelAutoSeed` true / `mentalModelRefreshIntervalMs` 5min / `mentalModelMaxRenderChars` 16000

## hindsight/state.ts：retain 节奏（L219, L329, L348, L380）

```ts
// L329
const retainFullWindow = this.config.retainMode === "full-session";
// L348（else 分支，即 last-turn）
const windowTurns = this.config.retainEveryNTurns + this.config.retainOverlapTurns;
// L380（两种模式共用）
if (userTurns - this.lastRetainedTurn < this.config.retainEveryNTurns) return;
```

结论：`retainEveryNTurns` 在 full-session 与 last-turn 下都生效（控制触发节奏）；`retainOverlapTurns` 只在 last-turn 分支生效（L348 在 full-session 判断之后）。

## sharpshooter 提取（sharpshooter/extract.ts L158-176）

extraction 用 `resolveRoleSelection("smol")` 选择的模型；每条 user prompt 异步触发一次 extraction 调用。

## sharpshooter 搜索（sharpshooter/backend.ts L156, L223）

- L156: `searchable: true`
- L223: `async search(...)` —— 对三份 Markdown 做大小写不敏感的逐行字面搜索

## sharpshooter 引入时间（gh）

- 上游 commit `ffee26b87d07142c023e02112622477ebf28d366`，随 v18.0.10 发布
- 本地 v18.0.11 已含；上游最新已到 v18.1.0

## pg0 本质（gh api repos/vectorize-io/pg0）

description：零配置 PostgreSQL 单二进制，跑完整 PostgreSQL 18 + pgvector 0.8.5，不用装数据库、不用 Docker。

## 工具面（tools/index.ts L615-695）

切到 hindsight 后 `recall`/`retain`/`reflect`/`learn` 可用；`memory_edit` 是 mnemopi 专属，hindsight 下消失。

## 迁移工具

OMP 源码全文搜 `migrate|import`，无 mnemopi→hindsight 迁移路径。

## 本机 mnemopi 实际 embedding 配置（~/.omp/agent/config.yml L311-315）

```yaml
mnemopi:
  scoping: per-project
  embeddingVariant: multilingual
  embeddingApiUrl: http://localhost:4140/v1
  embeddingModel: text-embedding-3-small
```

显式 `embeddingModel` 优先于 `embeddingVariant`（`src/mnemopi/config.ts:54-64`），所以当前实际跑的是 4140 的 OpenAI-compatible `text-embedding-3-small`（1536 维）。
