# OMP 记忆后端对比：Mnemopi vs Hindsight vs Sharpshooter

> Sources: vectorize-io/hindsight GitHub, 2026-09-01; can1357/oh-my-pi 源码与 git history, 2026-09-01
> Raw: [2026-09-01-hindsight-official-installation](../../raw/omp-mnemopi/2026-09-01-hindsight-official-installation.md); [2026-09-01-hindsight-official-configuration](../../raw/omp-mnemopi/2026-09-01-hindsight-official-configuration.md); [2026-09-01-omp-hindsight-sharpshooter-source](../../raw/omp-mnemopi/2026-09-01-omp-hindsight-sharpshooter-source.md)
> Updated: 2026-09-01

## Overview

OMP `memory.backend` 枚举共 5 个值（`settings-schema.ts:2950`，本地 v18.0.11）：`off`、`local`、`hindsight`、`mnemopi`、`sharpshooter`。三者定位不同：**Mnemopi** 是本地 SQLite 记忆库，**Hindsight** 是远程/自托管记忆服务（PostgreSQL + 嵌入模型 + reranker），**Sharpshooter** 是「friction-gated 项目决策日志」，只记踩坑换来的项目决策，不参与通用检索。

## 安装与运行

| 方式 | 命令/入口 | 说明 |
|---|---|---|
| Docker full | `docker run ... ghcr.io/vectorize-io/hindsight:latest` | 内嵌 pg0 + BGE embedder + MiniLM reranker；镜像 ~9 GB (AMD64) / ~3.7 GB (ARM64) |
| Docker slim | `ghcr.io/vectorize-io/hindsight:latest-slim` | ~500 MB；不带本地模型，embedding/reranker 必须外部 |
| pip | `pip install hindsight-api` | full 变体，依赖 `hindsight-api-slim[all]`（含 `pg0-embedded`）；数据库落在 `~/.hindsight/data/` |
| pip slim | `pip install hindsight-api-slim` | 不必然带 `pg0-embedded`（它在 `embedded-db` extra） |

pg0 是 vectorize-io 的零配置 PostgreSQL 单二进制（PostgreSQL 18 + pgvector 0.8.5），不是 pip 包；pip 安装时以 `pg0-embedded` 作为依赖引入。

**LLM 永远是外部的**（官方：「the LLM is always external, including for local inference」）。两个镜像都不内嵌 llama.cpp，要本地推理需另起 Ollama/LM Studio 并配 `HINDSIGHT_API_LLM_BASE_URL`。

## LLM 与 Embedding

**LLM**（`HINDSIGHT_API_LLM_PROVIDER` / `_MODEL` / `_API_KEY` / `_BASE_URL`）：OpenAI、Anthropic、Gemini、Groq、Ollama、LM Studio、llama.cpp、DeepSeek、OpenRouter、Bedrock、GitHub Copilot、LiteLLM（100+）、任意 OpenAI-compatible。本地 URL 自动补 `/v1`。

**Embedding**（`HINDSIGHT_API_EMBEDDINGS_PROVIDER`）：默认本地 `BAAI/bge-small-en-v1.5`（384 维）；外部可选 `openai`（`text-embedding-3-small`，1536 维默认）、Cohere、TEI、Gemini、ZeroEntropy 等。OpenAI-compatible 对接用 `HINDSIGHT_API_EMBEDDINGS_OPENAI_BASE_URL` + `HINDSIGHT_API_EMBEDDINGS_OPENAI_MODEL`。

**Reranker**（`HINDSIGHT_API_RERANKER_PROVIDER`）：full 镜像自带 `cross-encoder/ms-marco-MiniLM-L-6-v2`（~90MB）。合法值含 `local`、`tei`、`cohere`、`openrouter`、`zeroentropy`、`siliconflow`、`alibaba`、`google`、`flashrank`、`litellm`。

**关于「零 HF 下载」**：官方文档里 `rrf` 出现在 `HINDSIGHT_API_RERANKER_2_PROVIDER`（链式二级重排的 fail-open 终点），不是 `RERANKER_PROVIDER` 的合法取值。若要完全不下载 HF 模型，embedding 走外部 provider（如本地 4140），reranker 的「不加载模型」路径需另配（官方推荐 `flashrank` 等本地轻量方案，或外部 reranker）；把 `RERANKER_2_PROVIDER=rrf` 理解为「不做 neural rerank」在文档中是作为 fail-open 语义出现的。

## Embedding 与 Reranker 的区别

| | Embedding | Reranker |
|---|---|---|
| 阶段 | 粗筛：查询/文档分别编码成向量，余弦距离捞 top-N | 精排：把「查询+每条候选」拼在一起逐对过 cross-encoder 打分 |
| 速度 | 快（向量距离是简单数学） | 慢（每对都要过一次神经网络） |
| 精度 | 粗（查询和文档没被一起看过） | 准（能看到逐词交互） |
| Hindsight 用 | `bge-small-en-v1.5` 或外部 | `ms-marco-MiniLM-L-6-v2` 或外部/rrf |

去掉 reranker 后召回质量**明显降**（通用 IR 共识；Hindsight 官方未发布有无 reranker 的对比基准）。小预算场景（`recallMaxTokens: 1024`）下，top 几条的排序质量更敏感。

## OMP 的 Hindsight 配置项

OMP 侧（`settings-schema.ts:3260-3422`）：

| 配置项 | 默认 | 说明 |
|---|---|---|
| `memory.backend` | `off` | 改为 `"hindsight"` |
| `hindsight.apiUrl` | `http://localhost:8888` | 指向本地服务 |
| `hindsight.apiToken` | undefined | credential，云部署才需要 |
| `hindsight.bankId` / `bankIdPrefix` | — | 固定 bank 或加前缀 |
| `hindsight.scoping` | `per-project-tagged` | global / per-project / per-project-tagged |
| `hindsight.bankMission` / `retainMission` | — | 自然语言散文；bank 身份/目的 vs 给提取 LLM 的提取指令 |
| `hindsight.autoRecall` / `autoRetain` | true / true | 自动召回/写入 |
| `hindsight.retainMode` | `full-session` | 或 `last-turn` |
| `hindsight.retainEveryNTurns` | 3 | 两种模式都生效，控制触发节奏 |
| `hindsight.retainOverlapTurns` | 2 | **只在 `last-turn` 分支生效**（`state.ts:348` 在 `retainFullWindow` 判断之后） |
| `hindsight.retainContext` | `omp` | retain 请求的来源标签 |
| `hindsight.recallBudget` / `recallMaxTokens` / `recallContextTurns` / `recallMaxQueryChars` / `recallTypes` | mid / 1024 / 1 / 800 / 默认集 | 召回侧调优 |
| `hindsight.requestTimeoutMs` / `reflectTimeoutMs` / `recallTimeoutMs` / `retainTimeoutMs` | 30s / 120s / 30s / 60s | 各路径超时 |
| `hindsight.mentalModelsEnabled` / `mentalModelAutoSeed` / `mentalModelRefreshIntervalMs` / `mentalModelMaxRenderChars` | true / true / 5min / 16000 | mental model 自动播种与注入 |

env override 只覆盖部分字段（URL/token/bankId/mission/retain/recall/timeout/scoping/debug 等），mental model 系列与 `recallTypes` 只能走 settings（`hindsight/config.ts`）。

**Scoping 语义差异**：Mnemopi 的 `per-project-tagged` 是「写入 project bank、recall 时合并 project + global 两个独立 bank」；Hindsight 是**单 bank + `project:<name>` tags**。两者同名不同义，不能混用概念。

**工具面**：hindsight 下 `recall`/`retain`/`reflect`/`learn` 可用；`memory_edit` 是 mnemopi 专属，hindsight 下消失。

## Sharpshooter

2026-08-28 引入（上游 commit `ffee26b`，随 v18.0.10 发布；本地 v18.0.11 已含）。功能是「friction-gated project decision memory」：每条 user prompt 异步触发 extraction（`smol` role 模型，`extract.ts:166`），只收「有摩擦的决策」（回归、反复纠正、代码里看不出来的规则）。存储为每项目 3 个固定 markdown（`architecture.md`/`product.md`/`style.md`，各限 120 行）。**无 embedding 召回**：启动时全量注入 developer instructions，另有 `search()` 对三份 markdown 做大小写不敏感的逐行字面搜索（`backend.ts:156,223`，`searchable: true`）。额外成本：每 user prompt 一次 extraction 调用 + 5 分钟定时 consolidation。

## 迁移（Mnemopi → Hindsight）

OMP 源码全文搜 `migrate|import`，**无官方迁移路径**。迁移 = 手动搬运 + 切配置：

1. 起服务（slim 镜像或 pip）
2. 从 `~/.omp/agent/memories/mnemopi/banks/*/mnemopi.db` 导 `working_memory`/`episodic_memory`/`facts`，写脚本 POST 到 hindsight `retain` API——数据会经 hindsight 的 LLM **重新提取事实**，是有损再加工，不是 1:1 搬迁；要无损就保留 mnemopi.db 只读归档
3. `memory.backend: mnemopi → hindsight`，`hindsight.apiUrl` 默认已指 8888
4. 验证后发一条 retain，到 `:9999` 控制面确认 bank 有数据
5. 回滚：mnemopi 的 SQLite 不删，backend 切回即恢复

## 决策要点

- 切 hindsight 得到：服务端 LLM 事实提取、TEMPR 四路召回、mental models、`reflect` 工具、跨工具生态、控制面 UI
- 失去：`memory_edit` 工具、完全本地零外部进程（多了一个服务要维护）、mnemopi SQLite 可直接 SQL 审计的透明性
- 风险：Hindsight 服务端 LLM 提取意味着会话内容发给配置的 LLM provider——配 Ollama 纯本地，配 OpenAI 则数据离机
- 现有 mnemopi 已知坑（dispose 不 promote、12h gate）在 hindsight 下不适用，但 hindsight 的坑未踩过

## See Also

- [OMP Mnemopi Consolidation 生命周期](consolidation-lifecycle.md) — Mnemopi scoping、consolidation 路径与已知坑
