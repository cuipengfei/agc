# Headroom 版本升级与兼容性（0.39 配置 / 0.41 变更）

> Sources: 本机 headroom-ai 0.39.0 源码核验 + dist-info METADATA + Settings 页面, 2026-09-26; 本机 headroom-ai 0.39.1 源码直读 + OMP 会话实测, 2026-09-27; GitHub release v0.41.0 + CHANGELOG 0.41.0 区段, 2026-10-13
> Raw: [2026-09-26-headroom-039-config-and-compat](../../raw/agent-tooling/2026-09-26-headroom-039-config-and-compat.md); [2026-09-27-headroom-read-command-whitelist](../../raw/agent-tooling/2026-09-27-headroom-read-command-whitelist.md); [2026-10-15-headroom-v041-release-notes](../../raw/agent-tooling/2026-10-15-headroom-v041-release-notes.md)
> Updated: 2026-10-15

## Overview

Headroom 0.38 → 0.39 对已装 `[proxy,mcp,code,html,relevance]` 部署是无破坏升级：CLI 参数、Kompress env var 全部未改名。0.39 官方新增 4 个 extras（langgraph、pytorch-mps、sandbox、vector），对本地 coding agent 代理链都不需要装。本文记录 0.39 的 Timeouts 全清单、记忆检索超时的跨 handler 范围、`HEADROOM_PROTECT_READS` 的保护边界，以及升级后唯一值得改的一处。

## v0.41.0 发布变更（2026-10-13）

0.39 之后经历了 0.40.0、0.41.0 两个 minor 版本（中间版本未入库记录），本文补记 v0.41.0。

**新功能：**

- Google Antigravity IDE 原生集成、OpenCode 2.x 插件 API 适配（#3817、#3999）
- headroom-snip：Claude Code mod，压缩过程动画化（#3980）
- Rust 代理获得原生 spend/savings 统计与仪表盘（#2321）
- 模型路由新增 `max_output_tokens` 条件，可把小请求/不带工具/低输出要求路由到便宜模型（#3898）
- 节省统计按 agent 归因（#2627）
- 商业项：dashboard/docs/llms.txt 展示 Headroom for Teams 推广位（#3991）

**对本地代理链有实质影响的修复：**

- 缓存：Claude Code 重发自己最后一条回复时保持缓存模式（#4003）；子代理 fork 会话不再冷启动会话 lineage（#4043）；前缀跟踪器保留到 provider 缓存生命周期（#4023）
- 流式：从 message_delta 读取流式缓存用量（#4174）；容忍畸形上游 SSE 事件（#2558）；失败流归类为失败请求（#3747）
- 计费：缓存计费与模型特定 LiteLLM 费率对齐（#3033）；流式轮记录 provider 计费输入数（#4052）
- 限流：无法在退避上限内成功的 429/529 不再重试（#3992）
- 上下文：靠近真实上下文窗口时打破每轮压缩循环（#2942）
- 压缩保真：嵌套 JSON 记录压缩后保持完整（#3680）；ML 压缩按请求设总量上限而非仅按块（#3721）
- 接入：Codex 解包移除 headroom init 路由（#3920）、auth.json API key 原样保留（#3355）；Copilot 默认尊重 GitHub 广告的 Business/Enterprise 主机（#4155）、VS Code next-edit 走 completions 主机（#4188）；`wrap opencode` 可指向第三方 OpenAI 兼容上游（#3125）；/api/hello 探测正确路由到 Anthropic（#3336）
- 记忆：存在未应答客户端工具调用时不发送记忆续写（#4009）；模型与客户端工具并发调用 headroom_retrieve 时也能服务（#4034）
- 安全与稳定：23 个 CodeQL 告警与高严重级告警修复（#4045、#4005）；quinn-proto 升 0.11.19 修复 RUSTSEC-2026-0338..0342（#4178）；beacon 不再记录发送者 IP（#4018）；onnx 空闲核修复（#4189）
- 性能：避免急切依赖导入，启动更快（#3546）

**清理（对外行为无变化）：** 大量未接线组件弃用/删除——never-wired 记忆写入器（#4101）、孤儿 Mem0SystemAdapter（#4114）、Rust log/search selector 的 Python mirror（#4096、#4103）、test-only UniversalCompressor（#4095）等。


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

## HEADROOM_PROTECT_READS 的命令白名单

`_is_read_command` 的完整白名单是 7 个动词加 `sed -n`（共 8 种命令形式）。`_READ_VERBS = ("cat", "head", "tail", "nl", "bat", "less", "more")`，`sed` 单独判断必须带 `-n` 标志。裸 `sed`（无 `-n`）是流编辑器，不命中读取保护。

明确排除：`grep`、`rg`、`ls`、`find`、`pytest` 的派生输出不在白名单；任何位置出现 `>`、`>>`、`tee`、`<<` 判定为写操作，直接排除。

命令提取按 harness wire shape 分五种：Anthropic dict（`input.command`）、OpenAI JSON string（`json.loads(arguments)`）、Codex list（`command` 是数组）、Codex code-mode `exec_command`（JS 对象字面量正则抠 `cmd` 属性）、纯文本 agent（fenced code block）。Codex JS 抠不出 `cmd` 字面量（变量、拼接、模板替换、不解的转义）时，调用方替换成哨兵字符串 `"exec_command(<cmd not a string literal>)"` 并登记该 `call_id` 进入内容检测；最终是否保护由内容闸门决定。纯文本 agent 没有 fenced block 时返回空字符串，不保护。

wrapper 剥离：`_SHELL_WRAPPERS` 包含 `rtk`、`sudo`、`env`、`time`、`nice`、`ionice`、`nohup`、`stdbuf`、`command`、`timeout`、`xargs`。`sudo cat f`、`timeout 30 cat f`、`rtk cat f` 都判定为读。`bash -lc "cat f"` 递归进 `-c` 参数再判，也判定为读。

18 种 lockfile（`bun.lock`、`package-lock.json`、`uv.lock`、`Cargo.lock` 等）命中 `_LOCKFILE_RE` 时不保护，因为 lockfile 是工具再生成产物，不会被逐字节 patch。

内容闸门：`_read_output_should_be_protected` 默认保护，只在内容类型属于 `_RELEASABLE_READ_TYPES` 时放行压缩。放行类型：JSON array、搜索结果、构建/测试日志、git diff、HTML、CSV/表格。固定宽度列（`/etc/fstab`、C `#define` 块）也保护。检测异常时保护（fail-close）。

## 与 OMP bash 守卫的关系

OMP 在 tool 执行层拦 `less`/`more`（提示用 `read` 工具），放行 `cat`/`head`/`tail`/`nl`/`sed -n`。OMP 对复合命令也按整条命令行形状拦截。

两层守卫作用在不同环节：OMP 拦掉的命令输出不存在，headroom 的保护名单里自然也不会有。OMP 放行的 5 种命令（`cat`/`head`/`tail`/`nl`/`sed -n`）命中 headroom 的 `_READ_VERBS` + `sed -n` 规则。若输出经过 8787 且 `HEADROOM_PROTECT_READS=1`，这些命令会进入 headroom 的读取检测；最终是否保护仍由内容闸门决定。


## See Also

- [Headroom Extras](headroom-extras.md)
