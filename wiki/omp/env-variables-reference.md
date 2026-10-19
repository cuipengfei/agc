# OMP 环境变量全量参考
> Sources: omp.sh docs, 2026-10-19; oh-my-pi repo docs/environment-variables.md, 2026-10-17
> Raw: [../../raw/omp/2026-10-19-omp-environment-variables-reference.md](../../raw/omp/2026-10-19-omp-environment-variables-reference.md)
> Updated: 2026-10-19

OMP（`@oh-my-pi/pi-coding-agent`，源码版本 oh-my-pi `5d72f5d3f4`，2026-10-19 更新）的全量环境变量参考。官方已维护两份载体：仓库内 `docs/environment-variables.md`（自称 Current Runtime Reference，691 行 11 组，从 `packages/coding-agent`、`packages/ai`、`packages/utils`、`packages/tui` 当前代码路径推导，只记录活跃行为）与官网渲染页 `https://omp.sh/docs/env`（注意路径是 `/docs/env`；`/docs/environment-variables` 实测 404）。本文在其 11 组之上补第 12 组「源码扫描补遗」，并收录三处文档-源码校正。

## 0. 解析模型与优先级

运行时 env 查找基本走 `$env`（`packages/utils/src/env.ts`），`.env` 加载顺序：

| 层级（高→低） | 来源 | 规则 |
|---|---|---|
| 1 | 进程已有环境（`Bun.env`） | 最高优先，任何 `.env` 不覆盖 |
| 2 | 启动目录项目 `.env` | 只补空值 |
| 3 | 活动 agent 目录 `.env`（通常 `~/.omp/agent/.env`） | 只补空值；尊重 profile 与 `PI_CONFIG_DIR` |
| 4 | 配置根 `.env`（通常 `~/.omp/.env`） | 只补空值 |
| 5 | `~/.env` | 只补空值 |

| 机制 | 规则 |
|---|---|
| `OMP_*` → `PI_*` 镜像 | 每个 `.env` 文件内的 `OMP_*` 键自动生成 `PI_*` 别名并覆盖同文件 `PI_*` 值；仅对 dotenv 文件生效，管不到继承自父进程的变量 |
| 布尔解析（`parseFlag`） | 空值忽略；`1`/`y`/`true`/`yes`/`on`（全大写或全小写）为真；其他非空值为假 |
| 解析器 | Bun `node:util.parseEnv`；支持多行引号值、转义换行、行内注释；变量引用保持字面量 |

## 1. 模型 / Provider 认证

### 1a. 核心 Provider 凭据

经 `getEnvApiKey()`（`packages/ai/src/stream.ts`）消费；变量名来自 `packages/catalog/src/compat/rules/**/*.kdl` 的 `env` 声明。

| Variable | 用途 / 备注 |
|---|---|
| `ANTHROPIC_OAUTH_TOKEN` | Anthropic OAuth；优先于 `ANTHROPIC_API_KEY` |
| `ANTHROPIC_API_KEY` | Anthropic 回退 |
| `ANTHROPIC_FOUNDRY_API_KEY` | Foundry 模式开启时优先于前两者 |
| `OPENAI_API_KEY` | OpenAI 系；也用于 Codex 搜索与 OpenAI Decisions judge |
| `OPENAI_CODEX_OAUTH_TOKEN` | `openai-codex` OAuth token |
| `GEMINI_API_KEY` | Google Gemini 主键 |
| `GOOGLE_API_KEY` | `gemini_image` 工具回退键 |
| `GROQ_API_KEY` / `CEREBRAS_API_KEY` / `FIREWORKS_API_KEY` / `FIREPASS_API_KEY` / `TOGETHER_API_KEY` | 各自 provider |
| `ABLITERATION_API_KEY` / `ABLIT_KEY` | abliteration；前者优先 |
| `AIMLAPI_API_KEY` | AIML API（OpenAI 兼容） |
| `HUGGINGFACE_HUB_TOKEN` / `HF_TOKEN` | Hugging Face；后者回退 |
| `SYNTHETIC_API_KEY` / `NVIDIA_API_KEY` / `NANO_GPT_API_KEY` / `NOVITA_API_KEY` / `VENICE_API_KEY` | 各自 provider |
| `LITELLM_API_KEY` | LiteLLM 代理 |
| `LM_STUDIO_API_KEY` / `OLLAMA_API_KEY` / `LLAMA_CPP_API_KEY` | 本地服务可选认证；无认证本地服务任意非空值即可 |
| `XIAOMI_API_KEY`；`XIAOMI_TOKEN_PLAN_AMS_API_KEY` / `XIAOMI_TOKEN_PLAN_CN_API_KEY` / `XIAOMI_TOKEN_PLAN_SGP_API_KEY` | 小米 MiMo 及三个 Token Plan 区域 |
| `MOONSHOT_API_KEY` | Moonshot；接受 `KIMI_API_KEY` 别名（desc `envVars` 顺序即回退序） |
| `STEPFUN_API_KEY` | StepFun；`.ai` 与 `.com` 域名各认各的 key |
| `HELMCODE_API_KEY` | helmcode |
| `XAI_OAUTH_TOKEN` / `XAI_API_KEY` | xAI；OAuth 优先 |
| `OPENROUTER_API_KEY` | OpenRouter；image 工具也读 |
| `MISTRAL_API_KEY` | Mistral |
| `ZAI_API_KEY` | z.ai（模型与搜索共用） |
| `ZHIPU_API_KEY` | zhipu-coding-plan |
| `UMANS_AI_CODING_PLAN_API_KEY` | umans |
| `MINIMAX_API_KEY` / `MINIMAX_CODE_API_KEY` / `MINIMAX_CODE_CN_API_KEY` | MiniMax 三个入口 |
| `OPENCODE_API_KEY` | opencode-go / opencode-zen |
| `QIANFAN_API_KEY` | qianfan |
| `QWEN_OAUTH_TOKEN` / `QWEN_PORTAL_API_KEY` | qwen-portal；OAuth 优先 |
| `ZENMUX_API_KEY` | ZenMux OpenAI/Anthropic 兼容路由 |
| `COMMAND_CODE_API_KEY` | commandcode；`COMMANDCODE_API_KEY` 旧别名 |
| `CHARM_HYPER_API_KEY` | charm-hyper；`HYPER_API_KEY` 别名 |
| `VLLM_API_KEY` | vllm 本地发现 opt-in；任意非空值即可 |
| `CURSOR_ACCESS_TOKEN` | Cursor；`CURSOR_API_KEY` 别名 |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway；`VERCEL_AI_GATEWAY_API_KEY` 别名 |
| `CLOUDFLARE_AI_GATEWAY_API_KEY` | CF AI Gateway（需 Run 权限） |
| `CLOUDFLARE_API_TOKEN` | CF Workers AI（Clef judge）；`CLOUDFLARE_AUTH_TOKEN` 回退 |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_GATEWAY_ID` | CF 账号/网关路由；`/login` 已存则免 |
| `SNOWFLAKE_PAT` / `SNOWFLAKE_ACCOUNT` | Snowflake Cortex |
| `ALIBABA_CODING_PLAN_API_KEY` | alibaba-coding-plan |
| `ALIBABA_TOKEN_PLAN_API_KEY` / `BAILIAN_TOKEN_PLAN_API_KEY` | alibaba-token-plan；后者兼容 Qwen Code 预设 |
| `CORAL_API_KEY` | coralbricks；`CORALBRICKS_API_KEY` 别名 |
| `DEEPINFRA_API_KEY` / `DEEPSEEK_API_KEY` | DeepInfra / DeepSeek |
| `SILICONFLOW_API_KEY` / `SILICONFLOW_CN_API_KEY` | SiliconFlow 国际/中国 |
| `KILO_API_KEY` / `OLLAMA_CLOUD_API_KEY` / `CLINE_API_KEY` | Kilo / ollama-cloud / cline-pass |
| `YOLO_AUTO_API_KEY` / `WAFER_SERVERLESS_API_KEY` | yolo-auto / wafer-serverless |
| `GITLAB_TOKEN` | gitlab-duo / gitlab-duo-agent 共用 |
| `BASETEN_API_KEY` / `SAMBANOVA_API_KEY` / `DEVIN_API_KEY` | 也可 `/login` 交互登录（devin 走 OAuth） |
| `COREWEAVE_API_KEY` / `WANDB_API_KEY` | coreweave；另需 `COREWEAVE_PROJECT`（回退 `WANDB_INFERENCE_PROJECT`）提供 `OpenAI-Project` 头 |
| `SAKANA_API_KEY` / `FUGU_API_KEY` | sakana；任选一个 |
| `AIAND_API_KEY` / `GMI_API_KEY` | aiand / gmi-cloud |
| `MODEL_API_KEY` / `META_API_KEY` | meta；任选一个 |
| `SINGULARITYAPI_DEV_API_KEY` / `SINGULARITYAPI_TECH_API_KEY` | SingularityAPI 按量网关 / 预留通道 |

### 1b. GitHub / Copilot

| Variable | 用途 / 备注 |
|---|---|
| `COPILOT_GITHUB_TOKEN` | Copilot provider 认证；不读通用 GitHub token |
| `COPILOT_INTEGRATION_ID` | 客户端身份覆盖，默认 `copilot-chat`；被拒时以 CLI 身份重试一次 |
| `GITHUB_TOKEN` / `GH_TOKEN` | web scraper 的 GitHub API auth；前者优先 |

### 1c. Auth Broker（远程凭据库）

| Variable | 用途 / 备注 |
|---|---|
| `OMP_AUTH_BROKER_URL` | 设置即启用 broker 模式，优先于 `auth.broker.url`；无 token 时报错而非回退本地 SQLite |
| `OMP_AUTH_BROKER_TOKEN` | Bearer；解析链 env → `auth.broker.token`（支持 `$ENV_NAME` 间接引用）→ `<config-dir>/auth-broker.token` |
| `OMP_AUTH_BROKER_SNAPSHOT_TTL_MS` | 本地加密快照新鲜度，默认 1 小时（3600000）；`0` 关闭缓存 |
| `OMP_AUTH_BROKER_SNAPSHOT_CACHE` | 快照路径，默认 `~/.omp/cache/auth-broker-snapshot.enc` |
| `OMP_AUTH_BROKER_ACCOUNT_POOL_FILE` | provider→broker 账号映射 JSON；启动解析一次，非法输入 fail-closed |

## 2. Provider 运行时配置

### 2a. 代理与压缩

| Variable | 行为 |
|---|---|
| `PI_PROXY_<PROVIDER>` | 单 provider 代理（ID 大写、非字母数字转 `_`，如 `PI_PROXY_GITHUB_COPILOT`）；优先于 `PI_PROXY`，只管该 provider |
| `PI_PROXY` | 全局代理；装在进程级 `fetch` 上，覆盖 OAuth 刷新、usage 探测等非 provider 请求 |
| `HTTPS_PROXY`/`https_proxy`、`HTTP_PROXY`/`http_proxy`、`ALL_PROXY`/`all_proxy` | 标准代理回退链（含小写变体） |
| `NO_PROXY`/`no_proxy` | 排除名单；回环/私网地址永远直连 |
| `PI_REQUEST_COMPRESSION` | `0`/`false`/`no`/`off` 关闭请求体压缩（默认开；只对声明可解码的官方端点启用：Anthropic gzip、Codex zstd、Copilot zstd→gzip） |

### 2b. Anthropic Foundry / 企业网关

| Variable | 行为 |
|---|---|
| `CLAUDE_CODE_USE_FOUNDRY` | 开启 Foundry 模式 |
| `FOUNDRY_BASE_URL` | Foundry 模式下 Anthropic 端点 |
| `ANTHROPIC_CUSTOM_HEADERS` | 逗号/换行分隔 `key: value`；`ANTHROPIC_BASE_URL` 指向非官方主机时也转发 |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | 去掉 beta 字段与 `anthropic-beta` 头（网关拒绝时用） |
| `NODE_EXTRA_CA_CERTS` | 额外 CA（PEM 路径或内联）；Bun 原生不读它，由 OMP 合并进 `RequestInit.tls.ca` |
| `CLAUDE_CODE_CLIENT_CERT` / `CLAUDE_CODE_CLIENT_KEY` | mTLS（仅 Foundry；两者必须成对；接受 PEM 路径或内联） |

### 2c. Amazon Bedrock

| Variable | 行为 |
|---|---|
| `AWS_REGION` / `AWS_DEFAULT_REGION` | 区域链；再之后 `us-east-1` |
| `AWS_BEARER_TOKEN_BEDROCK` | 最高优先 bearer 认证，跳过 AWS 凭据链 |
| `AWS_PROFILE` | INI 命名 profile 认证路径 |
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`（+`AWS_SESSION_TOKEN`） | IAM key 认证路径 |
| `AWS_CONTAINER_CREDENTIALS_RELATIVE_URI` / `_FULL_URI`、`AWS_CONTAINER_AUTHORIZATION_TOKEN`(+`_FILE`) | ECS 容器凭据；标记 Bedrock 可用 |
| `AWS_WEB_IDENTITY_TOKEN_FILE` + `AWS_ROLE_ARN` / `AWS_ROLE_SESSION_NAME` | web-identity 角色假定 |
| `AWS_SHARED_CREDENTIALS_FILE` / `AWS_CONFIG_FILE` / `AWS_SDK_LOAD_CONFIG` | 共享 INI 路径与加载开关 |
| `AWS_EC2_METADATA_DISABLED` / `AWS_EC2_METADATA_SERVICE_ENDPOINT`(+`_MODE`) | IMDSv2 开关与端点 |
| `AWS_BEDROCK_SKIP_AUTH` | 注入假凭据走代理（仅 Converse resolver，不管 Mantle）；Bun 原生代理链生效 |

### 2d. Azure OpenAI Responses

| Variable | 行为 |
|---|---|
| `AZURE_OPENAI_API_KEY` | 必需（除非 option 传入） |
| `AZURE_OPENAI_API_VERSION` | 默认 `v1` |
| `AZURE_OPENAI_BASE_URL` | 直接 base URL 覆盖 |
| `AZURE_OPENAI_RESOURCE_NAME` | 拼 `https://<resource>.openai.azure.com/openai/v1` |
| `AZURE_OPENAI_DEPLOYMENT_NAME_MAP` | `modelId=deployment,...` 映射 |

### 2e. Google Vertex AI

| Variable | 行为 |
|---|---|
| `GOOGLE_CLOUD_PROJECT` → `GCP_PROJECT` → `GCLOUD_PROJECT` | 项目 ID 链（`GOOGLE_CLOUD_PROJECT_ID` 仅 OAuth 登录辅助） |
| `GOOGLE_VERTEX_LOCATION` → `GOOGLE_CLOUD_LOCATION` → `VERTEX_LOCATION` | location 链 |
| `GOOGLE_CLOUD_API_KEY` | 直接 API-key 认证（或 ADC） |
| `GOOGLE_APPLICATION_CREDENTIALS` | ADC 文件；设了就必须存在 |
| `GOOGLE_CLOUD_ACCESS_TOKEN` / `CLOUDSDK_AUTH_ACCESS_TOKEN` | 显式 OAuth token，绕过 ADC |

### 2f. Kimi / OpenAI 兼容端点 / UA 伪装

| Variable | 行为 |
|---|---|
| `KIMI_CODE_OAUTH_HOST` → `KIMI_OAUTH_HOST` | Kimi OAuth host 链，缺省 `https://auth.kimi.com` |
| `KIMI_CODE_BASE_URL` | Kimi 用量端点覆盖 |
| `OPENAI_BASE_URL` | OpenAI 兼容请求 base URL 回退 |
| `MOONSHOT_BASE_URL` | Moonshot 聊天与模型发现端点 |
| `XAI_BASE_URL` | xAI 端点；只在用捆绑 `api.x.ai` 端点时生效，models.yml 的 `baseUrl` 优先 |
| `SAKANA_BASE_URL` / `FUGU_BASE_URL` | Sakana 端点；前者优先 |
| `PI_OPENROUTER_RESPONSES` | 设 `0` 让 OpenRouter 走 Completions |
| `UMANS_WEBSEARCH_PROVIDER` | Umans Anthropic 搜索默认 provider |
| `PI_AI_GEMINI_CLI_VERSION` | `gemini-cli` provider 的 UA 版本覆盖（默认 `0.46.0`），详见第 14 节 |
| `PI_AI_ANTIGRAVITY_VERSION` / `_CL` / `_OS` / `_ARCH` | `google-antigravity` provider 的 UA 覆盖；版本解析 env → 更新 manifest 自动发现 → 钉住 `2.19.1`（官方文档写 `2.8.0`，见第 13 节） |

### 2g. GitLab Duo

| Variable | 行为 |
|---|---|
| `GITLAB_CLIENT_ID` / `GITLAB_REDIRECT_URI` | OAuth 登录覆盖；非回环 redirect 走粘贴码路径 |
| `GITLAB_DUO_NAMESPACE_ID` | workflow namespace 覆盖 |
| `GITLAB_DUO_PROJECT_ID` / `GITLAB_DUO_PROJECT_PATH` | 项目覆盖；ID 优先于 PATH |
| `GITLAB_DUO_WORKFLOW_DEFINITION` | workflow 定义，默认 `ambient` |
| `GITLAB_DUO_WORKFLOW_TRACE` / `..._TRACE_FILE` | 严格 `1` 开 JSONL trace；后者给输出路径 |

### 2h. OpenAI Codex / 流式控制

| Variable | 行为 |
|---|---|
| `PI_CODEX_DEBUG` | `1`/`true` 开 Codex provider 调试日志 |
| `PI_CODEX_WEBSOCKET` | `1`/`true` 优先 websocket 传输 |
| `PI_CODEX_RESPONSES_LITE` | `1` 让普通推理走 Responses Lite |
| `PI_OPENAI_STATEFUL` | 覆盖 `previous_response_id` 链式默认（api.openai.com 默认开，其他默认关） |
| `PI_CODEX_WEBSOCKET_IDLE_TIMEOUT_MS` | 默认 300000 |
| `PI_CODEX_WEBSOCKET_FIRST_EVENT_TIMEOUT_MS` | 默认 300000 |
| `PI_CODEX_WEBSOCKET_PING_INTERVAL_MS` | 默认 10000 |
| `PI_CODEX_WEBSOCKET_PONG_TIMEOUT_MS` | 默认 60000 |
| `PI_CODEX_WEBSOCKET_MESSAGE_QUEUE_CAPACITY` | 默认 4096 |
| `PI_CODEX_WEBSOCKET_MAX_IDLE_REUSE_MS` | 默认 30000；`0` 关闭 idle-age 限制 |
| `PI_CODEX_WEBSOCKET_RETRY_BUDGET` | 默认 5 |
| `PI_CODEX_WEBSOCKET_RETRY_DELAY_MS` | 默认 500 |
| `PI_STREAM_FIRST_EVENT_TIMEOUT_MS` / `PI_STREAM_IDLE_TIMEOUT_MS` | 通用流式超时；`0` 关闭 |
| `PI_OPENAI_STREAM_FIRST_EVENT_TIMEOUT_MS` / `PI_OPENAI_STREAM_IDLE_TIMEOUT_MS` | OpenAI 专属，优先于通用值；持久等价物是 `providers.streamFirstEventTimeoutSeconds` 等配置键 |

websocket 参数共 8 个（早期会话版本曾把这两张小表合计说成「七个」，实际 8 个）。

### 2i. Cursor 调试与缓存

| Variable | 行为 |
|---|---|
| `DEBUG_CURSOR` / `DEBUG_CURSOR_LOG` | Cursor provider 调试（`2`/`verbose` 带载荷）与 JSONL 输出路径 |
| `PI_CACHE_RETENTION` | `long`/`short`/`none`；其他值忽略（anthropic、openai-responses、Bedrock 生效处） |

## 3. Web 搜索

| Variable | 用途 |
|---|---|
| `EXA_API_KEY` | Exa（或 `/login exa`） |
| `TAVILY_API_KEY` | Tavily（或 AuthStorage 存 provider `tavily`） |
| `BRAVE_API_KEY` / `KAGI_API_KEY` / `JINA_API_KEY` / `PARALLEL_API_KEY` / `TINYFISH_API_KEY` | 各自搜索 provider |
| `PERPLEXITY_API_KEY` / `PERPLEXITY_COOKIES` | Perplexity API-key 模式 / cookie 模式 |
| `PI_PERPLEXITY_RESPONSES` | `1` 选 Responses 端点 |
| `PI_PERPLEXITY_MODEL` / `PI_PERPLEXITY_API_MODEL` | 订阅模型（默认 `experimental`）/ API 模型（默认 `sonar-pro`） |
| `FIRECRAWL_API_KEY` / `FIRECRAWL_BASE_URL` | Firecrawl（搜索可无 key 回退，fetch reader 必需）；`FIRECRAWL_API_URL` 别名 |
| `MOONSHOT_SEARCH_API_KEY` / `KIMI_SEARCH_API_KEY` | Kimi/Moonshot 搜索认证 |
| `MOONSHOT_SEARCH_BASE_URL` / `KIMI_SEARCH_BASE_URL` | 搜索端点覆盖 |
| `SEARXNG_ENDPOINT` / `SEARXNG_TOKEN` / `SEARXNG_BASIC_USERNAME` / `SEARXNG_BASIC_PASSWORD` | 均为 `searxng.*` 配置的回退 |
| `ANTHROPIC_SEARCH_API_KEY` | 只管 Anthropic web-search 请求，先于模型凭据，不影响聊天 |
| `PI_AUTH_NO_BORROW` | 关闭 Perplexity 登录的 macOS 原生应用借 token 路径 |
| `TYPESAFE_API_KEY` | TypeSafe judge 发现与 System One 请求（或 `/login typesafe`） |
| `TYPESAFE_BASE_URL` | TypeSafe judge 端点（默认 `https://api.typesafe.ai`） |
| `TYPESAFE_DEFAULT_MODEL` | 仅 `pi-ai` 独立客户端默认（`jev-latest`）；coding-agent 由 `judge` 角色选模型，此变量管不到应用侧，详见 [TypeSafe env 文](judgment-typesafe-env-config.md) |

（DuckDuckGo 无 key，走 `html.duckduckgo.com` 并入 `public` 聚合；`DEEPSEEK_API_KEY`、`ZAI_API_KEY`、`OPENAI_API_KEY`、`OLLAMA_CLOUD_API_KEY` 与模型组共用。）

## 4. Python / JS 工具运行时

| Variable | 行为 |
|---|---|
| `PI_PY` / `PI_JS` | eval 语言开关；覆盖 `eval.py`/`eval.js` 设置 |
| `PI_PYTHON_SKIP_CHECK` | 跳过解释器可用性检查 |
| `PI_PYTHON_IPC_TRACE` | 记录与 Python runner 的 NDJSON 帧 |
| `VIRTUAL_ENV` | venv 解析最高优先 |
| `CONDA_PREFIX` | 其后；再之后才看本地 `.venv`/`venv` |

（Python 子进程剥掉常见 API key，只放行安全基础变量加 `LC_`/`XDG_`/`PI_` 前缀。）

## 5. Agent / 运行时行为开关

| Variable | 行为 |
|---|---|
| `PI_SMOL_MODEL` / `PI_SLOW_MODEL` / `PI_PLAN_MODEL` | 模型角色临时覆盖（CLI `--smol/--slow/--plan` 优先） |
| `PI_NO_TITLE` | 非空即关闭自动会话标题 |
| `OMP_BUILD_LABEL` | 自定义构建标签（压一行取前 80 字符），写进 session |
| `PI_TINY_DEVICE` / `PI_TINY_DTYPE` | 本地小模型后端 / ONNX 精度（覆盖 `providers.tinyModelDevice`/`tinyModelDtype`） |
| `PI_NO_INTERLEAVED_THINKING` | `1` 关 Anthropic interleaved thinking，退回旧模式 |
| `PI_NO_THINKING_LOOP_GUARD` | `1` 关思考循环护栏 |
| `NULL_PROMPT` | `true` 时 system prompt 空串 |
| `PI_BLOCKED_AGENT` | 屏蔽 task 工具某个 subagent 类型 |
| `PI_TASK_MAX_OUTPUT_BYTES` / `PI_TASK_MAX_OUTPUT_LINES` | subagent 输出上限（默认 500000 字节 / 5000 行） |
| `PI_WALK_WORKERS` | `omp grep` 遍历 worker 数（默认 4；`0` 自动，`1` 串行；旧名 `PI_GREP_WORKERS` 已不读） |
| `PI_TIMING` | stderr 打印启动耗时树；`=x` 打印后退出；`=full` 列全部模块 |
| `PI_DEBUG_STARTUP` | 每阶段输出 `[startup] <phase>:start/done`；卡住时最后一行即卡点 |
| `OMP_LOG_LEVEL` | `logs/omp.<date>.<pid>.log` 最高级别：`error`/`warn`/`info`/`debug` |
| `PI_PACKAGE_DIR` | 包资产目录覆盖 |
| `OMP_SKIP_SETUP` | 跳过交互式 setup |
| `PI_DISABLE_LSPMUX` | `1` 跳过 lspmux，直接拉起 LSP server |
| `PI_RPC_EMIT_TITLE` | RPC 模式发标题事件 |
| `SMITHERY_URL` / `SMITHERY_API_URL` / `SMITHERY_API_KEY` | Smithery MCP 注册表覆盖 |
| `PUPPETEER_EXECUTABLE_PATH` | Eval 浏览器 Chromium 路径 |
| `LITELLM_BASE_URL` | 默认 `http://localhost:4000/v1`；配置优先 |
| `LM_STUDIO_BASE_URL` / `OLLAMA_BASE_URL` / `OLLAMA_HOST` / `LLAMA_CPP_BASE_URL` | 本地发现端点覆盖（默认 1234 / 11434 / 8080） |
| `OLLAMA_CONTEXT_LENGTH` | 只影响 OMP 上下文预算 |
| `PI_EDIT_VARIANT` | 强制 edit 变体（`patch`/`replace`/`hashline`/`apply_patch`/`sloppy`）；`edit.modelVariants` 优先 |
| `PI_EDIT_FUZZY` / `PI_EDIT_FUZZY_THRESHOLD` | 模糊匹配开关与阈值（覆盖 `edit.fuzzyMatch`/`edit.fuzzyThreshold`） |
| `PI_INTENT_TRACING` | 工具 intent 元数据开关（回退 `tools.intentTracing`） |
| `PI_STRICT_EDIT_MODE` | `1` 关按模型的 edit-mode 内置回退 |
| `PI_ALLOW_SIXEL_PASSTHROUGH` | 配合 `PI_FORCE_IMAGE_PROTOCOL=sixel` 允许透传 |
| `PI_NO_PTY` | `1` 关 bash 工具 PTY（CLI `--no-pty` 内部也设它） |
| `OMP_MCP_TIMEOUT_MS` | MCP 请求超时（默认 30000；`0` 关闭；非法值告警忽略） |
| `OMP_MCP_STARTUP_TIMEOUT_MS` | MCP 初始发现窗口（默认 250，覆盖 `mcp.startupTimeoutMs`） |
| `OMP_MCP_REQUIRE_READY` | `1` 时 print 模式有 server 未就绪即以 1 退出 |
| `PI_DISABLE_UUTILS_BUILTINS` | 非空（除 `0`/`false`）禁用 bash 内建 uutils；`shell.env.PI_DISABLE_UUTILS_BUILTINS` 优先 |
| `OMP_NO_WEBP` | `1`/`true` 关图片缩放选 WebP |
| `MNEMOPI_EMBEDDING_MODEL` | `mnemopi.embeddingModel` 为空时的回退 |
| `PI_AUTO_QA` / `PI_AUTO_QA_PUSH` / `PI_AUTO_QA_PUSH_URL` / `PI_AUTO_QA_PUSH_TOKEN` | 工具问题自动上报开关与无头推送覆盖（对应 `dev.autoqa*`） |
| `PI_BROWSER_RELAY` | browser relay 总开关（回退 `browser.relay`） |
| `OMP_DAEMON_IDLE_GRACE_MS` | daemon broker 最后客户端断开后的存活毫秒（默认 3000；按 `parseInt` 前缀解析） |

### 5a. Hindsight 记忆后端

每个变量覆盖对应 `hindsight.*` 设置；空字符串忽略；整数按 `parseInt` 前缀，枚举必须全小写匹配。

| Variable | 覆盖的设置 / 默认 |
|---|---|
| `HINDSIGHT_API_URL` | 默认 `http://localhost:8888` |
| `HINDSIGHT_API_TOKEN` | `hindsight.apiToken` |
| `HINDSIGHT_BANK_ID` / `HINDSIGHT_BANK_MISSION` | bank 与 mission |
| `HINDSIGHT_RETAIN_MODE` | `full-session`/`last-turn` |
| `HINDSIGHT_RECALL_BUDGET` | `low`/`mid`/`high`，默认 `mid` |
| `HINDSIGHT_AUTO_RECALL` / `HINDSIGHT_AUTO_RETAIN` | 布尔，默认 `true` |
| `HINDSIGHT_SCOPING` | `global`/`per-project`/`per-project-tagged` |
| `HINDSIGHT_DEBUG` | 布尔，默认 `false` |
| `HINDSIGHT_RECALL_MAX_TOKENS` / `HINDSIGHT_RECALL_CONTEXT_TURNS` / `HINDSIGHT_RECALL_MAX_QUERY_CHARS` | 1024 / 1 / 800 |
| `HINDSIGHT_RETAIN_EVERY_N_TURNS` | 默认 3 |
| `HINDSIGHT_REQUEST_TIMEOUT_MS` / `HINDSIGHT_REFLECT_TIMEOUT_MS` / `HINDSIGHT_RECALL_TIMEOUT_MS` / `HINDSIGHT_RETAIN_TIMEOUT_MS` | 30000 / 120000 / 30000 / 60000 |

## 6. 存储与路径

| Variable | 行为 |
|---|---|
| `OMP_PROFILE` / `PI_PROFILE` | profile 选择；前者优先且显式空值也算设置 |
| `PI_CONFIG_DIR` | 配置根目录名，默认 `.omp` |
| `PI_CODING_AGENT_DIR` | 仅默认 profile 的 agent 目录覆盖 |
| `PI_CODING_AGENT_SESSION_DIR` | session 目录覆盖 |
| `PI_NATIVES_DIR` | 原生 addon 解压根 + tree-sitter 语法目录；必须用户独占可写 |
| `PI_CONFIG_FILES` | 设置叠加路径列表（Unix `:` / Windows `;`），先于 `--config` |
| `CLAUDE_CONFIG_DIR` | Claude Code 用户配置目录覆盖（连同 `.claude.json`） |
| `OMP_AUTORESEARCH_DB_DIR` | autoresearch DB 与项目产物根 |
| `XDG_DATA_HOME` / `XDG_STATE_HOME` / `XDG_CACHE_HOME` | 目标 omp 根已存在时才重定向 |
| `PWD` | 路径助手里的 cwd 匹配 |
| `OMP_WORKTREE_DIR` | worktree 根（默认 `~/.omp/wt`；绝对或 `~` 开头） |
| `OMP_GITHUB_CACHE_DB` | GitHub 视图缓存库路径 |
| `PI_BUILD_URL` | 构建服务源（默认 `https://build.stencil.so`）；下载按 size+SHA-256 校验 |
| `PI_GRAMMARS_URL` | wasm tree-sitter 语法下载基址 |

`omp update` 还会读取工具链目录变量来定位安装位置（`packages/coding-agent/src/cli/update-cli.ts:348-355`）：`MISE_DATA_DIR` 覆盖 mise 数据目录；Windows 下 `LOCALAPPDATA` 拼出 `<LOCALAPPDATA>/mise`；`BUN_INSTALL_GLOBAL_DIR` 参与 bun 全局安装位置的解析。

## 7. Shell / 工具执行环境

| Variable | 行为 |
|---|---|
| `PI_BASH_NO_CI` / `CLAUDE_BASH_NO_CI` | 抑制子 shell 自动注入 `CI=true`；旧别名回退 |
| `PI_BASH_NO_LOGIN` / `CLAUDE_BASH_NO_LOGIN` | POSIX `-c` 替代 `-l -c`，PowerShell 加 `-NoProfile` |
| `PI_SHELL_PREFIX` / `CLAUDE_CODE_SHELL_PREFIX` | 命令前缀包装 |
| `VISUAL` / `EDITOR` | 外部编辑器选择链 |

（这三个开关用非空字符串判断：`0` 或 `false` 也算开启。）

## 8. UI / 终端 / 会话探测（一般由终端或 OS 设置）

| Variable | 用途 |
|---|---|
| `COLORTERM` / `TERM` / `WT_SESSION` | 颜色能力 |
| `COLORFGBG` | 背景明暗 |
| `TERM_PROGRAM` / `TERM_PROGRAM_VERSION` / `TERMINAL_EMULATOR` | 终端身份（进 system prompt） |
| `TMUX_PANE` / `CMUX_SURFACE_ID` / `KITTY_WINDOW_ID` / `TERM_SESSION_ID` / `WT_SESSION` | 会话 breadcrumb ID |
| `COLUMNS` / `LINES` | 无 TTY 时的 TUI 尺寸回退（`packages/tui/src/terminal.ts`） |
| `SHELL` / `ComSpec` | 系统诊断读取 |
| `APPDATA` / `XDG_CONFIG_HOME` | lspmux 配置路径 |
| `HOME` | MCP 命令 UI 路径缩短 |
| `COPILOT_HOME` | Copilot 配置目录（默认 `~/.copilot`） |
| `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` | 额外指令目录（逗号分隔） |
| `JS_DEBUG_DAP_SERVER` | 复用已有 JS 调试适配器服务 |

## 9. TUI 运行时标志

| Variable | 行为 |
|---|---|
| `PI_NOTIFICATIONS` | `off`/`0`/`false` 关桌面通知 |
| `PI_TUI_WRITE_LOG` | TUI 写日志（OSC 52 只记长度） |
| `PI_TUI_RAW_BACKSPACE_IS_CTRL` | `1` 把裸 `0x08` 当 Ctrl+Backspace（SSH/容器后 Windows Terminal 场景） |
| `PI_HARDWARE_CURSOR` | `1` 开硬件光标 |
| `PI_NO_SYNC_OUTPUT` | 关 DEC 2026 同步输出 |
| `PI_NO_DECCARA` | 关 Kitty DECCARA 矩形填充 |
| `PI_NO_GLYPH_PROTOCOL` | `1` 跳过 APC `25a1` 握手 |
| `PI_TUI_NATIVE` | Tern Surface Protocol 探测：`0` 永不，`1` 连多路复用器里也探（本机 agent `.env` 已设 `0`） |
| `PI_TUI_TSP_RECORD` | TSP 消息 JSONL 记录路径 |
| `PI_TUI_NATIVE_STATS` | `1` 记录原生帧统计 |
| `PI_DEBUG_REDRAW` | `1` 开 redraw 调试日志 |
| `PI_KITTY_PLACEHOLDERS` / `PI_NO_KITTY_PLACEHOLDERS` | Kitty 占位符强制开关 / 硬关（后者优先） |
| `PI_TUI_RESIZE_IN_PLACE` | `1` 强制原地 resize；`0` 强制 alt-screen 快路径 |
| `PUPPETEER_PROXY` / `PUPPETEER_PROXY_BYPASS_LOOPBACK` / `PUPPETEER_PROXY_IGNORE_CERT_ERRORS` | Chromium 代理与证书行为 |
| `CMUX_WORKSPACE_ID` / `CMUX_SURFACE_ID` / `CMUX_RELAY_ID` / `CMUX_RELAY_TOKEN` | cmux 分屏与 relay 身份 |

## 10. Commit 生成

| Variable | 行为 |
|---|---|
| `PI_COMMIT_TEST_FALLBACK` | `true`（大小写不敏感）强制走回退生成路径 |
| `PI_COMMIT_NO_FALLBACK` | `true` 禁止回退 |
| `DEBUG` | 设置即打印 commit agent 错误堆栈 |

## 11. OpenTelemetry

至少一个信号有 endpoint 才初始化 OTLP；`telemetry.otlpExportEnabled: false` 或 `OTEL_SDK_DISABLED=true` 整体关闭。

| Variable | 行为 |
|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | 公共端点 |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `..._LOGS_ENDPOINT` / `..._METRICS_ENDPOINT` | 按信号端点，优先于公共 |
| `OTEL_EXPORTER_OTLP_HEADERS` + 按信号 `..._HEADERS` | `key=value` 列表，值需 percent-encode；按信号按键合并覆盖 |
| `OTEL_TRACES_EXPORTER` / `OTEL_LOGS_EXPORTER` / `OTEL_METRICS_EXPORTER` | 含 `none` 即关该信号 |
| `OTEL_EXPORTER_OTLP_PROTOCOL` + 按信号变体（`..._TRACES_PROTOCOL` 等） | 本运行时只启用 `http/protobuf` |
| `OTEL_SERVICE_NAME` / `OTEL_RESOURCE_ATTRIBUTES` | 资源元数据 |
| `OTEL_LOG_LEVEL` | 最低导出的 OMP 日志级别 |

## 12. 源码扫描补遗（官方文档未收；全部经源码读取点核对）

官方文档推导范围不含 `packages/mnemopi`、`packages/catalog` 的 KDL 与构建脚本。本节来自本会话扫描：唯一 env 引用 295 个，其中 169 个「全部引用都在测试路径」预筛跳过，其余 126 个经批量分类判定（`user_config 77 · instrument_internal 31 · test_internal 16 · external_tool 2 · mixed 0 · errors 0`），不定性与源码细节全部收录在 raw 名册。

### 12a. Mnemopi 记忆后端（`packages/mnemopi`；已确认接入 coding-agent 主运行时——`agent-session.ts` 在会话生命周期调用 `getMnemopiSessionState`/`setMnemopiSessionState`/`shutdownMnemopiEmbedClient`，`memory-backend/types.ts` 的 `MemoryBackendId` 含 `"mnemopi"`）

| Variable | 行为 |
|---|---|
| `MNEMOPI_DATA_DIR` | 数据目录覆盖 |
| `MNEMOPI_EMBEDDING_API_KEY` | embedding key；回退 `OPENROUTER_API_KEY` → `OPENAI_API_KEY` |
| `MNEMOPI_EMBEDDING_API_URL` | embedding 端点；回退 `OPENROUTER_BASE_URL` → OpenRouter |
| `MNEMOPI_EMBEDDING_DIM` | 向量维度覆盖 |
| `MNEMOPI_EMBEDDING_MAX_INPUT_CHARS` | 单条 embedding 输入字符上限，默认 `8192`；`0` 关闭（`config.ts:119`） |
| `MNEMOPI_LLM_REPO` / `MNEMOPI_LLM_FILE` | 本地抽取 LLM 的 GGUF 仓库与文件 |
| `MNEMOPI_EXTRACTION_MODEL` | 抽取模型覆盖 |
| `MNEMOPI_DB_PAGE_SIZE` | SQLite page size 或 `os` |
| `MNEMOPI_AUTO_MIGRATE` | `0` 时只警告不自动迁移 |
| `MNEMOPI_MCP_BANK` | MCP 模式默认 bank |
| `MNEMOPI_SESSION_ID` / `MNEMOPI_AUTHOR_ID` / `MNEMOPI_AUTHOR_TYPE` / `MNEMOPI_CHANNEL_ID` | MCP 工具身份元数据 |
| `MNEMOPI_SHARED_SURFACE_DB` | 共享 surface 库路径 |
| `MNEMOPI_BEAM_MODE` | beam 召回扫描上限 |
| `MNEMOPI_PROACTIVE_LINKING` / `MNEMOPI_POLYPHONIC_RECALL` | recall 特性开关（设置后优先于代码默认） |
| `MNEMOPI_SP_MAX` | scratchpad 上限，默认 `1000`（`core/beam/store.ts:65`） |
| `MNEMOPI_SHMR_BATCH_SIZE` / `MNEMOPI_SHMR_HARMONY_THRESHOLD` / `MNEMOPI_SHMR_MAX_ITERATIONS` / `MNEMOPI_SHMR_MIN_CLUSTER_SIZE` / `MNEMOPI_SHMR_SIMILARITY_THRESHOLD` | SHMR 聚类参数 |

### 12b. Provider / 凭据杂项

| Variable | 行为 | 出处 |
|---|---|---|
| `STENCIL_API_KEY` / `STENCIL_CLIENT_ID` / `STENCIL_BASE_URL` / `STENCIL_AUTH_URL` / `STENCIL_REDIRECT_URI` | Stencil 邀请制账号（授权 `omp stream` 等官方托管服务） | `catalog/.../auth/stencil.kdl` |
| `ZAI_OAUTH_CLIENT_ID` / `ZAI_OAUTH_AUTHORIZE_URL` / `ZAI_OAUTH_REDIRECT_URI` / `ZAI_OAUTH_TOKEN_URL` | z.ai OAuth 流程覆盖 | `catalog/.../auth/zai-coding-plan.kdl` |
| `GH_HOST` | `gh` 解析无主机 repo 的默认实例（默认 github.com；企业版用户相关） | `coding-agent/src/tools/gh-common.ts` |
| `GH_CONFIG_DIR` | gh 配置目录 | `tools/github-cache.ts` |
| `AIAND_BASE_URL` | aiand 端点覆盖 | `catalog/provider-models/openai-compat.ts` |
| `PI_AI_CLAUDE_CODE_VERSION` | 钉住 Anthropic 线上的 Claude Code 版本；设置后禁用版本自动升级重试 | `ai/.../claude-code-fingerprint.ts` |
| `PI_CODEX_CONCURRENT_SUMMARIES` | `1`/`true` 开 `sequential_cutoff` summary 投递（codex-rs `concurrent_reasoning_summaries`）；默认关。上游注释测量：12 轮 interleaved 对话可见思考减半（每轮 0.83 vs 1.67 个 summary 段、37 vs 69 字符），3 轮完全没有 summary | `ai/.../request-transformer.ts:111-114` |
| `PI_TOKENIZER_ACCURATE` | `1` 时未知模型也用精确 tokenizer（测试环境自动禁用） | `agent/src/tokenizer.ts:24` |
| `PI_DIALECT` | agent loop dialect 覆盖 | `agent/src/agent-loop.ts` |
| `PI_NO_INTENT` | `1` 关工具 schema 的 `i` intent 字段注入 | `agent/src/agent-loop.ts` |
| `OMP_APP_NAME` | 用量归属标签（默认 `omp`），给 robomp/CI 机器人区分用量 | `utils/src/dirs.ts` |
| `OMP_COMMIT_CACHE_DB` / `OMP_JUDGMENT_CACHE_DB` | 两个缓存库路径覆盖 | `utils/src/dirs.ts` |
| `OMP_HARMONY_DEBUG` | `1` 时 harmony 泄漏日志带完整被移除内容 | `ai/src/utils/harmony-leak.ts` |

### 12c. TUI 调试与 OS/终端探测（官方文档第 8、9 节未列）

| Variable | 行为 |
|---|---|
| `OMP_TUI_DEBUG` | 设为 socket 路径即开 TUI NDJSON 调试服务 |
| `PI_TUI_RESIZE_SCROLLBACK` | `append`/`rebuild`/`preserve`，默认 `preserve` |
| `PI_TUI_OSC99_PROBE` / `PI_TUI_GLYPH_PROTOCOL_PROBE` / `PI_TUI_TSP_PROBE` | 测试运行时里强制开探测 |
| `TERN_BLOB_DIR` | Tern 原生渲染 blob 存储目录覆盖（`tui/src/native/backend.ts`） |
| `WSL_DISTRO_NAME` / `WSL_INTEROP` | WSL 纯环境判定（剪贴板路由等） |
| `WAYLAND_DISPLAY` / `DISPLAY` | 剪贴板路线门控 |
| `TERMUX_VERSION` | Termux 检测 |
| `SSH_CLIENT` / `SSH_CONNECTION` / `SSH_TTY` | SSH 会话检测 |
| `TMUX` / `ZELLIJ` / `ZELLIJ_PANE_ID` / `ZELLIJ_SESSION_NAME` / `WEZTERM_PANE` / `HERDR_*` / `TERN_*` / `WMUX*` | 多路复用器/终端检测 |
| `WARP_CLI_AGENT_PROTOCOL_VERSION` | Warp 结构化协议协商信号；≥1 时 omp 发 OSC 777 事件 |
| `IDADIR` / `IDAUSR` | IDA 安装路径查找（`coding-agent/src/ida/install.ts`） |
| `ProgramFiles` / `SystemRoot` / `SYSTEMROOT` | Windows 系统定位（浏览器拉起、`utils/open.ts`） |
| `LOCALAPPDATA` | Windows 下 `<LOCALAPPDATA>/mise` 与浏览器路径解析 |

### 12d. 构建期（只对源码构建有意义）

| Variable | 行为 |
|---|---|
| `OMP_NATIVE_BUILD_BACKEND` | `cargo`/`bazel` |
| `OMP_NATIVE_CARGO_PROFILE` | 如 `ci` |
| `OMP_NATIVE_FEATURES` / `PCRE2_SYS_STATIC` / `RUSTFLAGS` / `CROSS_TARGET` / `OMP_BAZEL_RC` | 原生构建参数 |
| `PI_COMPILED` / `PI_BUNDLED` / `PI_TINY_TRANSFORMERS_VERSION` / `PI_DOCS_EMBED` / `OMP_LAUNCH_CWD` | 打包/启动标记 |
| `BUN_COMPILE_EXECUTABLE_PATH` / `BUN_NO_CODESIGN_MACHO_BINARY` | 二进制构建/免签（`coding-agent/scripts/build-binary.ts` 等） |

## 13. 文档-源码校正（三处）

1. **Codex websocket 参数计数**：8 个（2h 小表逐项可见）。
2. **`PI_CODEX_CONCURRENT_SUMMARIES` 出处**：`request-transformer.ts` 上游注释（`sequential_cutoff`、12 轮测量数字见 raw 3.2 逐字摘录）；codex-rs 同样默认关（`Stage::UnderDevelopment`, `default_enabled: false`）。
3. **`PI_AI_ANTIGRAVITY_VERSION` 默认值**：官方文档写 `2.8.0`，源码 `DEFAULT_ANTIGRAVITY_VERSION = "2.19.1"`（测试同值）；`os_type`/`arch` 是UA 组成部分，钉住 `darwin`/`arm64`，无论本机平台；设置 env 版本会跳过更新 manifest 的联网探测（raw 3.1 逐字摘录）。

## 14. UA 伪装的适用对象

两组 UA 变量只作用于 Google Cloud Code Assist 后端（`packages/catalog/src/wire/gemini-headers.ts`）：

- `PI_AI_GEMINI_CLI_VERSION` → `gemini-cli` provider：UA 形如 `GeminiCLI/<版本>/<model> (<platform>; <arch>; terminal)`，默认 `0.46.0`。
- `PI_AI_ANTIGRAVITY_*` → `google-antigravity` provider：UA 形如 `antigravity/hub/<版本> (aidev_client; os_type=<os>; arch=<arch>; cl=<cl>)`；版本门控控制模型可见性（例如 `gemini-3.7-flash` 被旧版本 UA 挡住）。

## 15. 扫描与排除边界

未收录进本文目录的引用名：169 个预筛 test-only（读取点全在 `test/`/`fixtures/`/`bench/`/`.test.ts` 等路径）+ 16 个 judge `test_internal`（`scripts/ci-*.ts`、`packages/metaharness`、`TB_*`、`OMP_TEST_*`）+ 其余 31 个 `instrument_internal`（`PI_TEST_RUNTIME`、`BUN_ENV`/`NODE_ENV` 作为测试运行期探测、`ACTIONS_ID_TOKEN_*`、`MallocStackLogging*`、`BUN_BE_BUN`、`DEVELOPER_DIR` 等，完整名册在 raw 第 4.1 节）+ `SESSIONS_DB_URL`/`MY_KEY`/`NO_COLOR`（示例文件、fixture 与 metaharness 内部）。Rust 内嵌 coreutils 命令自己的变量（`QUOTING_STYLE`、`TIME_STYLE` 等）属 `pi-builtins` 工具行为，不计入。`ComSpec`（第 8 组）与 `SystemRoot`/`SYSTEMROOT`（12c）虽在判定名册里，已收编进正文目录，不在排除之列。

安全提示沿用官方文档：所有 `*_API_KEY`/`*_TOKEN`、`AWS_*`、`CLAUDE_CODE_CLIENT_*`、OTLP headers 都按密钥处理，不进日志与提交。

## See Also

- [OMP TypeSafe env 变量边界、.env 加载链与 zen 免费 jev 接入](judgment-typesafe-env-config.md) —— `TYPESAFE_*` 三变量与 `.env` 加载链的判定级细节
- [Plannotator agent tool 与 quick labels](../herdr-plannotator/plannotator-agent-tool-and-quick-labels.md) —— OMP `.env` 注入通道的应用侧实例
