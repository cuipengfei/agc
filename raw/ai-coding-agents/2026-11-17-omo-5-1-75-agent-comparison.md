# OMO oh-my-openagent 5.1.75 与 5.1.57 自定义子 Agent 原型对比

> Source: 本机 oh-my-openagent@5.1.75 安装包（/home/cpf/.bun/install/global/node_modules/oh-my-openagent/）；上游仓库 code-yeongyu/oh-my-openagent（dev 分支，2026-11-17 检索）；raw/omp-config/2026-11-02-omo-absorption-audit-and-remediation.md（5.1.57 基线）
> Collected: 2026-11-17
> Published: Unknown

## 对比方法

以 2026-11-02 的 OMO 5.1.57 吸收核查记录为基线，读取本机 oh-my-openagent@5.1.75 安装包中对应的原型文件，逐项比对 5 个自定义 OMP 子 Agent（builder、frontend、librarian、oracle、qa）的直接 OMO 原型是否有结构性变更。

## 直接原型逐项结论（5.1.57 → 5.1.75）

| OMP 子 Agent | OMO 5.1.75 直接原型位置 | 原型是否有变更 | 依据 |
|---|---|---|---|
| builder | `dist/cli-node/index.js:11777-11779`（UNSPECIFIED_LOW_CATEGORY_PROMPT_APPEND / CALLER_GUIDANCE）；相邻 deep-low 在 11711-11776 | 无结构变更 | 功能点与 5.1.57 记录一致；新增 GPT 变体解析器不改变 unspecified-low 本体 |
| frontend | `dist/cli-node/index.js:11491-11582`（VISUAL_CATEGORY_PROMPT_APPEND） | 无变更 | Phase 1–4 与 OBSERVE_EACH_CHANGE 功能点与 5.1.57 记录一致 |
| librarian | `packages/omo-codex/plugin/components/ultrawork/agents/librarian.toml:1-70`；native 侧 `dist/index.js:181531-181839` | 无变更 | 分类、Phase 0.5、SHA permalink、失败恢复分支功能点与 5.1.57 记录一致 |
| oracle | `packages/omo-codex/plugin/components/ultrawork/agents/metis.toml:1-52` + `momus.toml:1-38` + `packages/shared-skills/skills/debugging/references/methodology/04-oracle-triple.md:1-126` | 原型无变更；同目录新增 `partial-runtime-evidence.md` | metis/momus 三态与 Oracle Triple 结构未变；`partial-runtime-evidence.md:146-199` 给出 Verification Oracle 模式（5.1.75 中有、5.1.57 审计记录未提及） |
| qa | `packages/omo-codex/plugin/components/ultrawork/agents/lazycodex-qa-executor.toml:1-22` | 无变更 | 场景/表面/证据/矩阵结构功能点与 5.1.57 记录一致 |

## 可选候选（5.1.75 值得记录但未本地化的增量）

1. **builder · Caller_Warning 未覆盖**（`dist/cli-node/index.js:11777-11779` + `raw/omp-config/2026-11-02-builder-balanced-and-selection-guidance.md:97-99`）：OMO 要求派发者写清编号步骤、禁止范围、成功标准；本地 `builder.md` description 未含此条，5.1.57 核查时已记为未覆盖，5.1.75 仍未变。
2. **builder · 相邻 deep-low 的两条 GPT 变体规则**（`dist/cli-node/index.js:11715-11716`）：① 捆绑多个互不依赖问题时只做核心那个，其余列为可单独委派项；② 修 bug 至少往症状上方追两层调用链再落手。属相邻候选，非 unspecified-low 直接要求。
3. **oracle · useWhen / avoidWhen**（`dist/index.js:181121-181136` 的 ORACLE_PROMPT_METADATA）：`avoidWhen` 包含“简单文件操作、第一次修复尝试、能从已读代码回答的问题不要派 oracle”，目前未进 `oracle.md` description。
4. **oracle · Verification Oracle**（`packages/shared-skills/skills/debugging/references/methodology/partial-runtime-evidence.md:146-199`）：Oracle Triple 只用于卡住的调试；逆向/提取/审计等非调试交付物应走单路怀疑论终审（逐条核对断言与一手证据源，返回 PASS / FAIL / PARTIAL）。
5. **librarian · 模型与成本差异**（`librarian.toml:5-6`）：OMO 用 `model_reasoning_effort: "low"` + `service_tier: "fast"`；本机 `@smol` 为 `:high`，属模型/成本选择差异，非 prompt 吸收缺口。

## 不属直接原型的 OMO 资产（只作参考，不写成本地 agent 的必要更新）

- `packages/shared-skills/skills/frontend/SKILL.md`（Draft Guard、Subtract 等）是 OMO 独立技能资产，不是 `frontend.md` 的直接原型。
- `packages/shared-skills/skills/ulw-execute/SKILL.md`（9 类对抗场景速查表）属于 ulw-loop 工作流编排层。
- `packages/omo-codex/plugin/components/ultrawork/agents/lazycodex-worker-*.toml` 是 OMO 自己的实现 worker，与 builder 的 category prompt 来源不同。
- `dist/index.js` 中 `oracle.ts` / `metis.ts` / `momus.ts` 的 native 变体与 `packages/omo-codex` 的 TOML 是不同表面，本地 `oracle.md` 的吸收基线是后者。
