# OMP nvidia 模型剪枝机制

> Sources: @oh-my-pi/pi-catalog 与 pi-coding-agent 源码直读，2026-10-05；NVIDIA hosted API 实测，2026-10-05
> Raw: [OMP nvidia 模型剪枝机制取证](../../raw/omp-config/2026-10-05-omp-nvidia-model-pruning.md)
> Updated: 2026-10-05

## 结论

OMP 的 nvidia provider 缓存只增不减：176 个条目里 95 个已从 NVIDIA hosted 目录移除（调用即 410），`omp models refresh` 不会清掉它们。根因是剪枝开关 `dynamicModelsAuthoritative` 对 nvidia 未打开，且该开关不在用户可配置面上。

## 只增不减的机制（源码行号）

1. 四源合并：OMP 对每个 provider 合并「内置静态目录 + 上次缓存 + models.dev 目录 + 在线 `/v1/models`」（`pi-catalog/src/model-manager.ts:354-368`）。
2. 剪枝开关：清除已下架 chat 模型的 `retainModelIds`（`model-manager.ts:575-582`）只在动态抓取被声明为权威时执行（`model-manager.ts:328`、`:370`），即 `dynamicModelsAuthoritative: true`；默认 false（`model-manager.ts:257`）。
3. nvidia 未设：nvidia 走 `createSimpleOpenAICompletionsOptions`（`openai-compat.ts`，`nvidiaModelManagerOptions`），返回值没有 `dynamicModelsAuthoritative`。对照组：deepinfra、novita、umans 都显式设了 true（`openai-compat.ts:1619`、`:1425`、`:1057`），那些 provider 会自动清掉下架模型。
4. 多出的 95 个的实际构成（实测比对）：52 个来自 models.dev 的 nvidia 目录（共 106 条，保留已退役模型）；4 个在内置 `nvidia.kdl`；其余 39 个是历次缓存/models.dev 旧快照的残留，因第 2 点永远不会被清掉。

## 剪枝开关不可配置

用户配置里没有这个键：provider 级用户配置（`ProviderOverride`，`pi-coding-agent/src/config/model-patch.ts:14-32`）只暴露 `baseUrl`、`headers`、`apiKey`、`compat`、`transport`、`guardrail*` 等；`dynamicModelsAuthoritative` 是 provider 描述符的编译期内置属性，运行时从描述符读取（`model-registry.ts:2205`），不读用户配置。本地改 `node_modules` 里的 `src/*.ts` 无效（运行时是 dist 打包产物），改 dist 升级即被覆盖，属易碎 hack。

## 上游一行改动方案

`openai-compat.ts` 里 `nvidiaModelManagerOptions` 的返回值加 `dynamicModelsAuthoritative: true`（照 deepinfra/novita/umans 写法）。对 nvidia 安全的实证依据：2026-10-05 的 `/v1/models` 81 个条目里包含 embedding、翻译、文档解析、vision 等非 chat 端点模型，说明该端点返回全目录，打开剪枝不会误删「走别的端点」的模型。打开后 retainModelIds 会把不在动态集里的 chat 模型全部清掉，剩下正好 81。用户 2026-10-05 明确暂不提 PR。

## 手动删库无效的原因

从 `~/.omp/agent/models.db` 删掉死条目再 refresh，models.dev 目录里的 52 个退役模型每次刷新都会重新合并回来（`model-manager.ts:355-359` 无条件合并 models.dev 源），清不干净。

## 关联配置

本机 `~/.omp/agent/config.yml` 已启用 `nvidia/**`（enabledModels）并配 `maxInFlightRequests.nvidia: 5`（2026-10-05 实测端到端可用）；这些是用户配置可改的部分，与上述编译期内置开关不同层。

## See Also

- [NVIDIA hosted 模型目录审计](../nvidia-build/nvidia-hosted-model-catalog-audit.md)
- [NVIDIA Build 用量与商业模式](../nvidia-build/nvidia-build-usage-and-business-model.md)
