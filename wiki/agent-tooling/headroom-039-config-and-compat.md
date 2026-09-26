# Headroom 0.39：配置行为、Timeouts 与升级兼容性

> Sources: 本机 headroom-ai 0.39.0 源码核验 + dist-info METADATA + Settings 页面, 2026-09-26
> Raw: [2026-09-26-headroom-039-config-and-compat](../../raw/agent-tooling/2026-09-26-headroom-039-config-and-compat.md)
> Updated: 2026-09-26

## Overview

Headroom 0.38 → 0.39 对已装 `[proxy,mcp,code,html,relevance]` 部署是无破坏升级：CLI 参数、Kompress env var 全部未改名。0.39 官方新增 4 个 extras（langgraph、pytorch-mps、sandbox、vector），对本地 coding agent 代理链都不需要装。本文记录 0.39 的 Timeouts 全清单、记忆检索超时的跨 handler 范围、`HEADROOM_PROTECT_READS` 的保护边界，以及升级后唯一值得改的一处。

## 升级兼容性判定

用户的 `headroom-proxy-start` 编排脚本（proxy + mcp serve + motomoto-shim 三进程）无需改动：

- `headroom proxy` 的 `--anthropic-api-url`、`--openai-api-url`、`--port`、`--code-aware`、`--mode` 在 0.39 全部保留
- `headroom mcp serve` 的 `--transport`、`--host`、`--port`、`--path`、`--proxy-url` 全部保留
- 6 个 Kompress env var 无改名

Kompress 默认值有一处实质变化：execution timeout 从旧版 25ms 提到 3000ms。用户脚本的调优值（execution 5000、acquire 15、budget 30、canary 15）全部高于 0.39 默认，压制仍有效。

## Extras：已装五项 vs 0.39 官方新增

已装 `proxy,mcp,code,html,relevance` 的安装建议不变（见 [Headroom Extras](headroom-extras.md)）。0.39 `Provides-Extra` 共 29 项，相对 0.37 pyproject 枚举新增 4 项，对本地 coding agent 都不需要：

| 新增 extra | 用途 | 本地代理链是否需要 |
|---|---|---|
| `langgraph` | LangGraph 框架 SDK 集成 | 不需要（同 langchain/agno 类） |
| `pytorch-mps` | PyTorch Apple Metal 后端 | 不需要（本机 WSL2/x86_64 无 Metal） |
| `sandbox` | 沙箱代码执行依赖 | 按需，压缩代理默认不用 |
| `vector` | HNSW 向量索引 | 不需要（sqlite-vec 已够） |

## Timeouts 全清单（10 项）

| 项 | 键名 | 默认 | 作用（源码可证） |
|---|---|---|---|
| Request | `HEADROOM_REQUEST_TIMEOUT` | 300s | 整个上游请求超时 |
| Connect | `HEADROOM_CONNECT_TIMEOUT_SECONDS` | 10s | 建立连接超时 |
| Write | `HEADROOM_WRITE_TIMEOUT_SECONDS` | 150s | 发送请求体超时 |
| Retry attempts | `HEADROOM_RETRY_MAX_ATTEMPTS` | 3 | connect/read/5xx 失败重试次数 |
| Retry base delay | `HEADROOM_RETRY_BASE_DELAY_MS` | 1000ms | 首次重试等待 |
| Retry max delay | `HEADROOM_RETRY_MAX_DELAY_MS` | 30000ms | 重试等待上限 |
| Buffered | `HEADROOM_ANTHROPIC_BUFFERED_REQUEST_TIMEOUT_SECONDS` | 600s | Anthropic 非流式/batch 读超时 |
| Pre-upstream concurrency | `HEADROOM_ANTHROPIC_PRE_UPSTREAM_CONCURRENCY` | max(2,min(8,cpu)) | 上游前并发闸 |
| Pre-upstream acquire | `HEADROOM_ANTHROPIC_PRE_UPSTREAM_ACQUIRE_TIMEOUT_SECONDS` | 15.0s | 等并发槽超时，超时降级 passthrough |
| Pre-upstream memory | `HEADROOM_ANTHROPIC_PRE_UPSTREAM_MEMORY_CONTEXT_TIMEOUT_SECONDS` | 2.0s | 记忆检索超时，超时放弃记忆 |

## 记忆检索超时的跨 handler 范围

最后一项虽带 `ANTHROPIC` 前缀，实际被 `anthropic.py:2700`、`openai.py:4258`、`gemini.py:636` 三个 handler 共用作记忆检索超时。`bedrock.py:169-215` 的 InvokeModel 路径不读此参数。调它影响 Anthropic/OpenAI/Gemini，不影响 Bedrock InvokeModel。

## HEADROOM_PROTECT_READS 的保护边界

`HEADROOM_PROTECT_READS=1` 保护源码类文件读取，让 cat/sed/head 输出保持原字节，避免 agent 行级编辑错位。但 `content_router.py:1148-1185` 明确放行 JSON、CSV/表格、构建日志等结构可预测的读取继续压缩。所以它只保证源码类读取字节保真，不保证所有文件读取。

Bash 工具结果默认会被压缩，仅 WebFetch 默认排除。

## Disable CCR 的分路径不可还原

关闭 CCR 后按路径分行为：JSON row-drop 路径不生成检索标记、不写 CCR 缓存，`headroom_retrieve` 取不回该路径丢弃的内容；opaque-string 路径仍可能生成标记。想彻底不用 retrieve 工具时才关，代价是部分内容永久不可还原。

## 唯一建议改动

升级后脚本只需加一行 `export HEADROOM_PROTECT_READS=1`，用途限定为保护源码类文件读取。其他保持默认；用户既有 Kompress 调优仍高于 0.39 默认，不用动。

## 方法论：升级后"缺失"可执行文件先 Read 再判断

升级 Python 包后看到 bin 目录里某可执行文件"不见了"，不能推断它是旧版残留 shim 并删除。用户级 bin 目录下的可执行文件可能是手写编排脚本。本例 `headroom-proxy-start` 就是用户脚本，headroom 从未提供过同名命令。先 Read 确认性质，Read 优先于 rm。

## Advisor 429 根因与修复

OMP TUI 显示 advisor `quota_exhausted`，实际不是上游配额耗尽，也不是 OMP 状态误判。根因是 Headroom 0.39 新引入的本地 token 限流。

`__advisor.default.jsonl:1089,1093` 记录 `errorStatus: 429`，`errorMessage: "Token rate limited. Retry after 5.4s"`。`proxy-8787.log:18180-18183` 显示请求到达 8787 后几毫秒内返回 `status=429`，未转发 4140。`openai.py:5784-5791` 确认这是 `TokenBucketRateLimiter.check_tokens` 在转发前抛出的本地 429。

版本对比确认 `check_tokens` 是 0.39 新行为：0.38.0 的 `rate_limiter.py` 定义了 `check_tokens` 方法但整个包无调用点；0.39.0 被 `openai.py:3730`、`openai.py:5785`、`gemini.py:536`、`anthropic.py:1453` 四个 handler 调用。默认 TPM 100000（`models.py:332`）。

修复：`headroom-proxy-start` 两处启动命令加 `--no-rate-limit`。重启后 `/health` 返回 `rate_limiter.enabled: false`，日志启动横幅显示 `Rate Limiting: DISABLED`。

注意：`HEADROOM_NO_RATE_LIMIT` 环境变量不存在，只能通过 CLI 标志关闭。

## See Also

- [Headroom Extras](headroom-extras.md)
