# OMP TypeSafe env 变量边界、.env 加载链与 zen 免费 jev 接入落地（2026-09-19 会话材料汇编）

> Source: OMP vibe 会话（2026-09-19）worker transcripts：omp-judgment-config-check / omp-judgment-env-vs-config / omp-typesafe-env-setup / omp-zen-jev-catalog / zen-429-full-response / zen-429-controlled-test / jev-signup-research / jev-pricing-compare / jev-modelsdev-check + 探针脚本 ~/.omp-typesafe-verify/probe.py、probe4.py、probe5.py + 本机全局安装 @oh-my-pi/* **18.2.6** 源码直读（`~/.bun/install/global/node_modules/@oh-my-pi/`，pi-coding-agent / pi-ai / pi-utils / pi-catalog / pi-tui 均随包附带 src/）
> Collected: 2026-09-19
> Published: Unknown

证据分级标签：**实测**＝本会话实际运行/抓取所得；**文档原文**＝官方页面/文档逐字引用；**推断**＝由证据推得但未直接证实；**未验证**＝未能核实。

## ① 三个 TYPESAFE_* 变量的边界（源码级，全部行号按本机 18.2.6 直读核实）

### TYPESAFE_API_KEY —— 四条认证途径（hasAuth 判定，pi-ai/src/auth-storage.ts:2961-2968）

`hasAuth(provider)` 依次查四途径，任一命中即算已认证：

1. **runtime override**：CLI `--api-key` flag → `setRuntimeApiKey`（auth-storage.ts:1595-1597；调用点 pi-coding-agent/src/main.ts:543,2087,2248）。
2. **config override**：models.yml `providers.typesafe.apiKey` → `setConfigApiKey`（pi-coding-agent/src/config/model-registry.ts:1575 与 :2444 两处解析点 → auth-storage.ts:1639-1641；注释明言「Higher priority than stored credentials and OAuth tokens」）。
3. **stored credential**：OMP 内 `/login typesafe` 存 `~/.omp/agent/agent.db` auth_credentials 表（auth-storage.ts:3214-3232；pi-utils/src/dirs.ts:856-858）；2026-09-19 时点该表 **0 行**（实测）。
4. **dedicated env**：`TYPESAFE_API_KEY`。env 名来自 pi-catalog 规则 `env "TYPESAFE_API_KEY"`（pi-catalog/src/compat/rules/auth/typesafe.kdl:9），经 serviceProviderMap 派生；查找链 pi-ai/src/stream.ts:840-866（Bun.env → cwd/.env → ~/.env）。typesafe.kdl:1-6 注释明示 typesafe 不是 chat-model provider，无 `providers/typesafe.kdl`，凭据仅供 judgment resolver 检查。

**auto 探测**（pi-coding-agent/src/judgment/index.ts:80-84）：`usesTypeSafeJudge()` —— mode==="llm" 永不 TypeSafe；否则 mode==="typesafe" 或 `hasAuth("typesafe")` 为真即走 TypeSafe。**只看 API_KEY 类凭据，不看 TYPESAFE_BASE_URL**（实测：`getEnvApiKey("typesafe")` 在设/未设 TYPESAFE_API_KEY 时分别返回/不返回值）。配套配置项 `providers.judgmentProvider` 三值 closed enum `["auto","typesafe","llm"]`，默认 `"auto"`（pi-coding-agent/src/config/settings-schema.ts:5635-5638）。

### TYPESAFE_BASE_URL / TYPESAFE_DEFAULT_MODEL —— env-only，无 config 等价物

- 常量与读取（pi-ai/src/judgment/typesafe.ts:29-40）：`TYPESAFE_DEFAULT_BASE_URL = "https://api.typesafe.ai"`（:29）、`TYPESAFE_DEFAULT_MODEL = "jev-latest"`（:30）；`typesafeBaseUrl()`（:33-35）只读 `$env.TYPESAFE_BASE_URL`（去尾斜杠），`typesafeModel()`（:38-40）只读 `$env.TYPESAFE_DEFAULT_MODEL`。
- settings-schema.ts 全文 grep 无这两个 config 项（反向成立，全量排除）。`TypeSafeJudgeOptions.baseUrl/model` 构造参数存在（typesafe.ts:42-51, 91-94），但 OMP 唯一构造点 `resolveJudge` **只传 apiKey**（judgment/index.ts:97-99）。
- 结论：key 可写 env / CLI flag / models.yml apiKey / /login 四处；**BASE_URL 与 DEFAULT_MODEL 只能 env（含 .env 文件）**。

## ② OMP 启动加载的 4 个 .env 文件与优先级（pi-utils/src/env.ts:287-307，直读）

| 加载点 | 变量 | 路径 |
|---|---|---|
| env.ts:291 | projectEnv | `<cwd>/.env`（getProjectDir()） |
| env.ts:290 | agentEnv | `~/.omp/agent/.env`（getAgentDir()） |
| env.ts:289 | piEnv | `<config root>/.env`（getConfigRootDir()，即 `~/.omp/.env`） |
| env.ts:288 | homeEnv | `~/.env`（os.homedir()） |

合并（env.ts:300-307）：按 `[projectEnv, agentEnv, piEnv, homeEnv]` 顺序，以 `!Bun.env[key]` 守卫写入 → **先到先得、只补不盖**；已存在于进程 env 的最高优先不被覆盖。即优先级 **`<cwd>/.env` > `~/.omp/agent/.env` > `~/.omp/.env` > `~/.env`**，进程 env 最高。

## ③ 实际落地配置：~/.omp/agent/.env（实测）

- 写入前备份：`~/.omp/agent/.env.bak-20260919-001504`（权限 600；原文件 85B，仅 `OPENCODE_API_KEY` 一行，无 TYPESAFE_*）。
- 写入后变量清单（值脱敏，长度与来源实测）：
  - `OPENCODE_API_KEY=<REDACTED>`（67 字符，原有保留）
  - `TYPESAFE_API_KEY=<REDACTED>`（67 字符，来源 `~/.local/share/opencode/auth.json` 的 **opencode-go** 条目；该文件共 8 条目——opencode-go / deepseek / umans-ai / umans-ai-coding-plan / kimi-for-coding / tokenrouter / openrouter / sensenova——无 "opencode" 条目，按规则取 opencode-go）
  - `TYPESAFE_BASE_URL=https://opencode.ai/zen`（23 字符）
  - `TYPESAFE_DEFAULT_MODEL=jev-1.13-free`（13 字符）
- chmod 600 已确认；同名行替换、其余行保留。**未改 config.yml、models.yml，未重启/触碰任何 OMP 进程**。
- 静态验证（实测）：bun 进程 cwd=/home/cpf import pi-utils/src/env.ts 的 `$env`，打印得 `TYPESAFE_BASE_URL=https://opencode.ai/zen`、`TYPESAFE_DEFAULT_MODEL=jev-1.13-free`、`TYPESAFE_API_KEY exists=true len=67`。（注：import 整包会拉 pi-natives 原生模块，cache 副本无 .node 会失败，故直接 import env.ts，绕开与目标无关的失败。）

## ④ base URL 拼接坑：/zen 还是 /zen/v1（probe.py 对照实测）

源码事实：请求 URL = `` `${this.baseUrl}${path}` ``（typesafe.ts:144），POST 的 path 硬编码 `"/v1/systemone"`（typesafe.ts:102），baseUrl 尾部斜杠剥除（typesafe.ts:34, 93）。

- 写 `TYPESAFE_BASE_URL=https://opencode.ai/zen` → 实际请求 `https://opencode.ai/zen/v1/systemone`（正确）。
- 写 `TYPESAFE_BASE_URL=https://opencode.ai/zen/v1` → 实际请求 `https://opencode.ai/zen/v1/v1/systemone`（404）。

probe.py 对照实测（2026-09-19，浏览器 UA，key 从 auth.json 运行时读取并已 redact，POST body={state:"Statement: 1 + 1 = 2.", model:"jev-1.13-free", questions:{q1:{type:"noul",...}}}）：

```
URL: https://opencode.ai/zen/v1/systemone
  status: 429, latency: 1.22s
  error body (redacted): {"type":"error","error":{"type":"FreeUsageLimitError","message":"Rate limit exceeded. Please try again later."}}
URL: https://opencode.ai/zen/v1/v1/systemone
  status: 404, latency: 1.13s
  error body (redacted): <!DOCTYPE html><html lang="en" dir="ltr" data-locale="en">...
```

- 429 = 端点存在、API 返回 JSON、免费额度耗尽；404 = 路由不存在、返回站点 HTML。凭 404 vs 429 证据裁定 BASE_URL 应为 `https://opencode.ai/zen`（**实测**裁定；任务书原给值 `/zen/v1` 与代码拼接存在内在矛盾，此为例外偏离并如实记录）。
- 附加实测：python-urllib 默认 UA 下两个 URL 均 403 Cloudflare Error 1010（`"error_name":"browser_signature_banned"`）；浏览器 UA 与 bun 默认 UA 均可通过 → OMP 的 bun fetch 不会被 CF 拦（对 OMP 接入无影响）。

## ⑤ unexpectedStopDetection: mechanical → smart（config.yml 修改记录，实测）

- 备份：`~/.omp/agent/config.yml.bak-20260919-235440`（带时间后缀，因 `config.yml.bak-20260919` 与 `-232420` 已存在）。
- diff **仅 1 行**：line 590 `'unexpectedStopDetection: mechanical'` → `'smart'`，其它行 0 触碰。
- 验证闭环：YAML parse OK（`features.unexpectedStopDetection='smart'`）；`omp config get` 返回 `smart`（实测）。
- 语义与出处：`features.unexpectedStopDetection` 合法值 `none|mechanical|smart`，默认 `mechanical`（settings-schema.ts:5745-5769）；生效判定 src/session/turn-recovery.ts:917-920（`mechanical` 保留机械重试但不跑 judge，`smart` 才跑 judge）。

## ⑥ zen 探针实测（opencode.ai/zen）

- `GET https://opencode.ai/zen/v1/models`（真 key，bun fetch）→ **200**，1.3s，**28 个模型含 jev-1.13-free**（实测）。
- `POST https://opencode.ai/zen/v1/systemone`（真 key，model=jev-1.13-free）→ **429 FreeUsageLimitError**，完整状态行/响应头/响应体证据见 `raw/ai-coding-agents/2026-09-19-jev-omp-compatibility-probes.md`。
- OMP catalog 侧（`omp models refresh` 实测，models.db 缓存更新于 2026-09-19 23:30:35 本地）：provider `opencode-zen` enabled，baseUrl `https://opencode.ai/zen/v1`，100 models 其中 jev-1.13 / jev-1.13-free 两条 cost 全 0、contextWindow/maxTokens 为 null；provider `opencode-go` enabled，baseUrl `https://opencode.ai/zen/go/v1`，37 models 无 jev；两 provider 共用 auth.json opencode-go 条目（67 字符 key，无独立 zen 条目，无 OPENCODE_API_KEY env）；models.yml 无静态定义，whitelist `opencode-zen/*`、`opencode-go/*`。
