# Headroom 0.39.0 配置、Timeouts 与升级兼容性核验

> Source: 本机 headroom-ai 0.39.0 site-packages 源码核验（~/.local/share/uv/tools/headroom-ai/lib/python3.13/site-packages/headroom/）; dist-info METADATA; Settings 页面 DOM 快照; uv tool upgrade 输出; 用户 ~/.local/bin/headroom-proxy-start 脚本
> Collected: 2026-09-26
> Published: 2026-09-26

## 版本升级

- `uv tool upgrade 'headroom-ai[proxy,mcp,code,html,relevance]'`：0.38.0 → 0.39.0
- 已装 extras 集合未变：`proxy,mcp,code,html,relevance`
- bin 目录只装 `headroom` 与 `headroom-cache-ttl` 两个包内可执行文件

## Extras：已装 vs 0.39 官方全集

- 0.39 `headroom_ai-0.39.0.dist-info/METADATA:125-153` 的 `Provides-Extra` 共 29 项：agno, all, anyllm, autogen, bedrock, code, crewai, dev, evals, html, image, langchain, langgraph, mcp, memory, memory-stack, ml, otel, proxy, proxy-prod, pytorch-mps, relevance, reports, sandbox, spreadsheet, strands, vector, voice, voice-train
- 相对 0.37 pyproject 枚举（`raw/agent-tooling/2026-08-31-headroom-extras-survey.md:43-75`）新增 4 项：
  - `langgraph`：LangGraph 框架 SDK 集成（与 langchain/agno/autogen 同类）
  - `pytorch-mps`：PyTorch Apple Metal (MPS) 后端
  - `sandbox`：沙箱代码执行相关依赖
  - `vector`：HNSW 向量索引（0.37 raw 的 pyproject 块未列此项）
- 本机为 WSL2/Linux x86_64，无 Metal；代理链压缩用途不依赖这 4 项。已装五项的安装建议不受影响。

## CLI 兼容性（0.38 → 0.39）

用户脚本 `headroom-proxy-start` 调用的全部参数在 0.39 仍存在：

- `headroom proxy`：`--anthropic-api-url`、`--openai-api-url`、`--port`、`--code-aware`、`--mode`
- `headroom mcp serve`：`--transport`、`--host`、`--port`、`--path`、`--proxy-url`

无参数改名、无语义变更。脚本无需改动。

## 脚本性质

`/home/cpf/.local/bin/headroom-proxy-start` 是用户手写编排脚本，启动 3 个进程：`headroom proxy`、`headroom mcp serve`、motomoto-shim。不是包安装的 shim。升级 Python 包后此文件仍在，包升级自然经同一 `headroom` 入口生效。

## Kompress 0.39 默认值

`transforms/kompress_compressor.py:128-143`：

| 参数 | 0.39 默认 | 用户脚本设定 |
|---|---|---|
| execution timeout | 3000ms（旧版 25） | 5000 |
| acquire timeout | 5.0s | 15 |
| time budget | 20.0s | 30 |
| canary | 5.0s | 15 |
| onnx intra/inter threads | auto | 8 / 2 |

用户设定全部高于默认，压制仍有效。

## Timeouts 全清单（10 项）

| 键名 | 默认 | 源码 |
|---|---|---|
| `HEADROOM_REQUEST_TIMEOUT` | 300s | settings_store.py:543; proxy.py:496 |
| `HEADROOM_CONNECT_TIMEOUT_SECONDS` | 10s | settings_store.py:553 |
| `HEADROOM_WRITE_TIMEOUT_SECONDS` | 150s | settings_store.py:565 |
| `HEADROOM_RETRY_MAX_ATTEMPTS` | 3 | proxy.py:466 |
| `HEADROOM_RETRY_BASE_DELAY_MS` | 1000 | proxy.py:476 |
| `HEADROOM_RETRY_MAX_DELAY_MS` | 30000 | proxy.py:486 |
| `HEADROOM_ANTHROPIC_BUFFERED_REQUEST_TIMEOUT_SECONDS` | 600s | settings_store.py:581; handlers/anthropic.py:533 |
| `HEADROOM_ANTHROPIC_PRE_UPSTREAM_CONCURRENCY` | max(2,min(8,cpu)) | settings_store.py:592; server.py:1159 |
| `HEADROOM_ANTHROPIC_PRE_UPSTREAM_ACQUIRE_TIMEOUT_SECONDS` | 15.0s | settings_store.py:602; handlers/anthropic.py:1001 |
| `HEADROOM_ANTHROPIC_PRE_UPSTREAM_MEMORY_CONTEXT_TIMEOUT_SECONDS` | 2.0s | settings_store.py:612 |

## Memory 检索超时的跨 handler 范围

`HEADROOM_ANTHROPIC_PRE_UPSTREAM_MEMORY_CONTEXT_TIMEOUT_SECONDS`（2.0s）虽带 `ANTHROPIC` 前缀，实际被三个 handler 读取：

- `handlers/anthropic.py:2700`
- `handlers/openai.py:4258`
- `handlers/gemini.py:636`

`handlers/bedrock.py:169-215` 的 InvokeModel 路径直接压缩转发，不读此参数。所以调节此项影响 Anthropic/OpenAI/Gemini 三条路径，不影响 Bedrock InvokeModel。

## HEADROOM_PROTECT_READS 的保护边界

`content_router.py:1148-1185,6792-6800`：`HEADROOM_PROTECT_READS=1` 保护源码类文件读取（cat/sed/head 输出保持原字节）。JSON、CSV/表格、构建日志等结构可预测的读取内容仍进入相应压缩流程。所以它只保证源码类读取的字节保真，不保证所有 cat/sed/head 输出。

Bash 工具结果默认会被压缩，仅 WebFetch 默认排除（`config.py:215-229`）。

## Disable CCR 的分路径行为

`smart_crusher.py:28-34,333-339`：禁用 CCR 后，JSON row-drop 路径既不生成检索标记也不写 CCR 缓存，`headroom_retrieve` 无法取回该路径丢弃的内容；opaque-string 路径仍可能生成标记。`cli/proxy.py:378-385`：`--no-ccr` 关闭检索工具且压缩内容无法取回。

## Memory 与 Extensions 键名

- `HEADROOM_MEMORY_TOP_K` → `memory_top_k`，默认 10，最大 100（settings_store.py:663-672）：语义检索取多少条记忆注入系统提示。「top-K 大→提示更准」是推断，help 字符串只规定检索数量，不承诺准确性。
- `HEADROOM_MIN_EVIDENCE` → `min_evidence`，默认 5（settings_store.py:675-683）：一个模式被观察多少次才写入记忆。
- `HEADROOM_PROXY_EXTENSIONS` → `proxy_extensions`，默认空（settings_store.py:445; cli/proxy.py:424）：逗号分隔扩展名，手动 opt-in。

## 唯一建议改动

脚本加 `export HEADROOM_PROTECT_READS=1`，用途限定为保护源码类文件读取。其他默认即可。

## Advisor 429 排查与修复

OMP TUI 显示 advisor `quota_exhausted`，用户怀疑上游 429。排查路径与证据：

1. 主 session JSONL（1189 行）搜 `"429"` 得 0 匹配，主 agent 链路无 429。
2. `__advisor.default.jsonl:1089,1093` 有 `errorStatus: 429`，`errorMessage: "429 {\"detail\":\"Token rate limited. Retry after 5.4s\"}"`，model `gpt-6-sol`，duration 15.5s。
3. `proxy-8787.log:18180-18183`：`status=429`，`duration_ms=2.54-3.39`，请求体 146546 bytes，未转发 4140。
4. `openai.py:5784-5791`：`TokenBucketRateLimiter.check_tokens` 在转发前抛 429，非上游返回。
5. 版本对比：`check_tokens` 在 0.38.0 的 `rate_limiter.py:86` 定义但全包无调用点；0.39.0 被 `openai.py:3730`、`openai.py:5785`、`gemini.py:536`、`anthropic.py:1453` 四处调用。默认 TPM 100000（`models.py:332`）。
6. 修复：`headroom-proxy-start` 两处启动命令加 `--no-rate-limit`。
7. 验证：`/health` 返回 `"rate_limiter": {"enabled": false, "status": "disabled"}`；日志启动横幅 `Rate Limiting: DISABLED`；历史 429 计数 434 次全来自限流启用期间的旧实例。

注意：`HEADROOM_NO_RATE_LIMIT` 环境变量不存在，只能 `--no-rate-limit` CLI 标志关闭。
