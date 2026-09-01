# Hindsight 官方安装文档摘录

> Source: https://github.com/vectorize-io/hindsight/blob/main/hindsight-docs/docs/developer/installation.md
> Collected: 2026-09-01
> Published: Unknown

以下为 `hindsight-docs/docs/developer/installation.md` 的关键摘录（经 gh api 获取）。

## 平台支持表（Linux/macOS/Windows）

- Linux (x86_64, ARM64)：✅ 完全支持，生产推荐
- macOS (Apple Silicon / arm64)：✅ 完全支持
- macOS (Intel / x86_64)：⚠️ slim only —— full bundle 的本地 ML 模型（PyTorch, MLX）不发布 Intel-Mac wheels，`pip install hindsight-all` 会静默回退到数月前的旧版本。应搭配 `hindsight-api-slim` + 外部 embedding/reranker，或 in-process ONNX backend（`hindsight-api-slim[local-onnx]`）
- Windows (x86_64)：✅ 完全支持，可用外部 PostgreSQL

## PostgreSQL 要求

Hindsight 需要 PostgreSQL 14+ 及向量扩展，支持的扩展：pgvector（默认）、pgvectorscale、vchord、scann (AlloyDB)。用 `HINDSIGHT_API_VECTOR_EXTENSION` 配置。

默认使用 **pg0** —— 一个本地运行的嵌入 PostgreSQL，方便开发但**不推荐生产**。

## Hardware（L53-67）

The footprint depends mainly on whether the **full** image (which bundles local embedding and reranker models) or the **slim** image (which delegates those to external providers) is used.

| Component | Minimum RAM | Recommended RAM | Notes |
|-----------|-------------|-----------------|-------|
| **API — Full image** | 1.5 GB | 2 GB | Loads local BGE embedder (~130 MB) and MiniLM cross-encoder (~90 MB) into memory, plus PyTorch/ONNX runtime arenas. Idle RSS settles around 0.8–1.0 GB; expect 1.2–1.5 GB under load. |
| **API — Slim image** | 512 MB | 1 GB | No local models. Steady-state RSS is dominated by Python runtime and DB connections. Requires external embedding and reranker providers (e.g. TEI, OpenAI, Cohere). |
| **Control Plane (UI)** | 128 MB | 256 MB | Next.js process, lightweight. |
| **Worker** (if separated) | Same as API image variant | Same as API image variant | Workers load the same models as the API server. |
| **PostgreSQL** | 512 MB | 1 GB+ | Scales with the number of memories and indexes. |

CPU vs GPU (L67): 2 vCPUs on CPU-only is fine for development and basic workloads. For production traffic, the local reranker (cross-encoder) is the main bottleneck and typically benefits from a GPU to keep recall latency reasonable; alternatively, offload reranking to an external reranker provider (e.g. TEI, Cohere) on dedicated GPU hardware.

## Docker 运行命令（L80-84）

```
docker run -it --pull always --name hindsight --restart unless-stopped --shm-size=1g -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_API_KEY=$OPENAI_API_KEY \
  -v hindsight-data:/home/hindsight/.pg0 \
  ghcr.io/vectorize-io/hindsight:latest
```

- API Server: http://localhost:8888
- Control Plane (Web UI): http://localhost:9999

数据持久化：容器以非 root 用户（UID 1000）运行。`hindsight-data` **named volume** 是推荐方式（Docker 会创建为容器用户所有）。若 bind-mount 宿主机目录，该目录必须属 UID 1000，否则嵌入数据库启动 `Permission denied`。

## Docker Image Variants（L115-124）

| Variant | Size (AMD64) | Size (ARM64) | When to use |
|---------|--------------|--------------|-------------|
| **Full** (`latest`) | ~9 GB | ~3.7 GB | Default. Embeddings and reranking run in the image; the LLM is always external, including for local inference. |
| **Slim** (`slim`) | ~500 MB | ~500 MB | Use when you already rely on external services for embeddings and reranking (OpenAI, Cohere, TEI). Significantly smaller image, faster deploys. Requires external providers. |

The slim image corresponds to the `hindsight-api-slim` pip package.

镜像 tag 实际形态（L150-157）：

```
ghcr.io/vectorize-io/hindsight:latest        # Full, latest release
ghcr.io/vectorize-io/hindsight:latest-slim   # Slim, latest release
ghcr.io/vectorize-io/hindsight-api:latest-slim
```

Neither image bundles llama.cpp, so the built-in `llamacpp` provider is not available in Docker. To run inference locally, start llama.cpp (or Ollama, LM Studio, vLLM) alongside Hindsight and point `HINDSIGHT_API_LLM_BASE_URL` at it.

## Bare-metal pip（L246）

`pip install hindsight-api` 会创建数据库于 `~/.hindsight/data/` 并在 http://localhost:8888 启动 API。
