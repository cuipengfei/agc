# Hindsight 官方配置：Embedding / Reranker / pg0

> Source: https://github.com/vectorize-io/hindsight/blob/main/hindsight-docs/docs/developer/configuration.md
> Source: https://github.com/vectorize-io/hindsight/blob/main/hindsight-api-slim/hindsight_api/config.py
> Collected: 2026-09-01
> Published: Unknown

以下为 `hindsight-docs/docs/developer/configuration.md`（经 gh api 获取）与 `hindsight-api-slim/hindsight_api/config.py` 的关键摘录。

## Embedding provider（configuration.md）

`HINDSIGHT_API_EMBEDDINGS_PROVIDER` 合法值（L715）：

`local`, `onnx`, `tei`, `openai`, `openai-codex`, `openrouter`, `requesty`, `cohere`, `google`, `zeroentropy`, ...

OpenAI-compatible 对接（L739-740, L903-904, L930, L942）：

- `HINDSIGHT_API_EMBEDDINGS_OPENAI_MODEL`：OpenAI embedding model，默认 `text-embedding-3-small`
- `HINDSIGHT_API_EMBEDDINGS_OPENAI_BASE_URL`：Custom base URL for OpenAI-compatible API (e.g., Azure OpenAI)
- 别名：`HINDSIGHT_API_EMBEDDINGS_BASE_URL` = `HINDSIGHT_API_EMBEDDINGS_OPENAI_BASE_URL`；`HINDSIGHT_API_EMBEDDINGS_MODEL` = `HINDSIGHT_API_EMBEDDINGS_OPENAI_MODEL`
- L930 注释示例：`export HINDSIGHT_API_EMBEDDINGS_OPENAI_MODEL=text-embedding-3-small  # 1536 dimensions by default`

## Reranker provider（configuration.md）

`HINDSIGHT_API_RERANKER_PROVIDER` 合法值（L1040）：

`local`, `tei`, `cohere`, `openrouter`, `zeroentropy`, `siliconflow`, `alibaba`, `google`, `flashrank`, `litellm`, ...

**关于 `rrf`**（L1125, L1128）：

```
export HINDSIGHT_API_RERANKER_2_PROVIDER=rrf
```

Ending the chain with `rrf` makes recall **fail open**: results come back in the order (检索融合排序)。

注意：`rrf` 出现在 `RERANKER_2_PROVIDER`（链式二级重排）位置，作为 fail-open 终点，不是 `RERANKER_PROVIDER` 的合法取值。

## config.py 中的 env 名（hindsight-api-slim/hindsight_api/config.py）

- `HINDSIGHT_API_EMBEDDINGS_PROVIDER`
- `HINDSIGHT_API_EMBEDDINGS_OPENAI_BASE_URL`
- `HINDSIGHT_API_EMBEDDINGS_OPENAI_MODEL`
- `HINDSIGHT_API_RERANKER_PROVIDER`
- `HINDSIGHT_API_LLM_PROVIDER` / `HINDSIGHT_API_LLM_MODEL` / `HINDSIGHT_API_LLM_API_KEY` / `HINDSIGHT_API_LLM_BASE_URL`

## pg0 / 数据目录

- bare-metal `pip install hindsight-api`：数据库落在 `~/.hindsight/data/`（installation.md L246）
- pg0 独立运行默认目录：`~/.pg0`
- Docker 容器内挂载点：`/home/hindsight/.pg0`（容器内 UID 1000）

`pg0-embedded` 位于 `hindsight-api-slim` 的可选 `embedded-db` extra；`pip install hindsight-api` 带上它是因为 full 包依赖 `hindsight-api-slim[all]`。单装 `hindsight-api-slim` 不必然带 pg0-embedded。
