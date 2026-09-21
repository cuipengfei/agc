# OMP TypeSafe env 变量边界、.env 加载链与 zen 免费 jev 接入

> Sources: 本会话取证（本机 @oh-my-pi/* 18.2.6 安装源码直读）, 2026-09-19; 本会话实测（probe.py 对照探针、bun $env 静态验证、omp config get）, 2026-09-19; 本会话实测（zen 探针 GET models / POST systemone、omp models refresh）, 2026-09-19; 本会话实测（zen 429 重置推断复验、jev-1.13 付费通道实测）, 2026-09-20; 本会话实测（18.2.7 models.yml api: typesafe 拒绝、上游 c96eb8fef5 加入 schema）, 2026-09-21
> Raw: [typesafe-env-chain-and-zen-setup](../../raw/omp/2026-09-19-typesafe-env-chain-and-zen-setup.md); [judgment-systemone-live-evidence](../../raw/omp/2026-09-20-judgment-systemone-live-evidence.md); [Zen jevify typesafe](../../raw/ai-coding-agents/2026-09-21-zen-jevify-typesafe.md)
> Updated: 2026-09-21

## Overview

OMP 的 TypeSafe（Jev）judgment 后端由三个 `TYPESAFE_*` 环境变量控制，三者的边界不对称：`TYPESAFE_API_KEY` 有**四条**认证途径，`TYPESAFE_BASE_URL` 与 `TYPESAFE_DEFAULT_MODEL` 则是 **env-only**（无 config 等价物）。env 不等于"必须写 shell rc"——OMP 启动时自动加载 4 个 `.env` 文件，只补不盖。本文还记录 base URL 拼接 `/v1/systemone` 硬后缀的坑（实测 429 vs 404 对照裁定）、`unexpectedStopDetection` 改 `smart` 的一行修改，以及 zen 免费 jev（jev-1.13-free）的落地配置。全部结论来自本机 18.2.6 源码直读与 2026-09-19 当天探针实测；429 完整证据与四组对照实验见 [Jev 七渠道定价与 OMP systemone 兼容性判定](../ai-coding-agents/jev-omp-systemone-channel-compatibility.md)。

## 三个 TYPESAFE_* 变量的边界

| 变量 | 边界 | 读取位置（pi-ai/src/judgment/typesafe.ts） |
|---|---|---|
| `TYPESAFE_API_KEY` | 四条途径任一命中即已认证 | 见下 |
| `TYPESAFE_BASE_URL` | **env-only** | `typesafeBaseUrl()`（`typesafe.ts:33-35`），默认 `https://api.typesafe.ai`（`:29`） |
| `TYPESAFE_DEFAULT_MODEL` | **env-only** | `typesafeModel()`（`typesafe.ts:38-40`），默认 `jev-latest`（`:30`） |

`TYPESAFE_API_KEY` 的四条途径（`hasAuth` 判定依次检查，`pi-ai/src/auth-storage.ts:2961-2968`）：

1. CLI `--api-key` flag → `setRuntimeApiKey`（`auth-storage.ts:1595-1597`）。
2. models.yml `providers.typesafe.apiKey` → `setConfigApiKey`（`pi-coding-agent/src/config/model-registry.ts:1575`、`:2444` → `auth-storage.ts:1639-1641`；优先级高于存储凭据与 OAuth）。
3. `/login typesafe` 存储凭据（`~/.omp/agent/agent.db` auth_credentials 表；2026-09-19 时点 0 行，实测）。
4. env `TYPESAFE_API_KEY`（`pi-catalog/src/compat/rules/auth/typesafe.kdl:9` 声明，查找链 `pi-ai/src/stream.ts:840-866`）。

env-only 的依据：settings-schema 全文无这两个 config 项（全量排除）；`TypeSafeJudgeOptions` 构造参数 `baseUrl`/`model` 存在（`typesafe.ts:42-51, 91-94`），但 OMP 唯一构造点 `resolveJudge` 只传 apiKey（`pi-coding-agent/src/judgment/index.ts:97-99`）。

## auto 探测只看 key、不看 base url

`usesTypeSafeJudge()`（`pi-coding-agent/src/judgment/index.ts:80-84`）：`mode === "llm"` → 永不 TypeSafe；否则 `mode === "typesafe"` 或 `hasAuth("typesafe")` 为真即走 TypeSafe。已实测：`getEnvApiKey("typesafe")` 在设/未设 `TYPESAFE_API_KEY` 时分别返回/不返回值——`auto` 只看 key 类凭据，**不看 `TYPESAFE_BASE_URL`**。

配套配置项 `providers.judgmentProvider`：closed enum `["auto","typesafe","llm"]`，默认 `auto`（`pi-coding-agent/src/config/settings-schema.ts:5635-5638`）。语义：`auto` 已认证走 TypeSafe 否则 LLM 桥（失败沿 tiny→smol→default→会话模型回退）；`typesafe` 强制 TypeSafe、失败回退 online role 链；`llm` 永不 TypeSafe。非法值不报错、静默等价 `auto`——想彻底关掉 TypeSafe 应写 `llm`。

## .env 加载链：4 个加载点与优先级（`pi-utils/src/env.ts:287-307`）

| 加载点 | 路径 |
|---|---|
| `env.ts:291` | `<cwd>/.env`（getProjectDir()） |
| `env.ts:290` | `~/.omp/agent/.env`（getAgentDir()） |
| `env.ts:289` | `~/.omp/.env`（getConfigRootDir()） |
| `env.ts:288` | `~/.env`（os.homedir()） |

合并顺序 `[projectEnv, agentEnv, piEnv, homeEnv]`，以 `!Bun.env[key]` 守卫写入（`env.ts:300-306`）——**先到先得、只补不盖**：优先级 `<cwd>/.env` > `~/.omp/agent/.env` > `~/.omp/.env` > `~/.env`，已存在于进程 env 的最高、不被覆盖。推荐写 `~/.omp/agent/.env`：只对 OMP 生效，key 不落全局 shell。

## zen 接入落地（2026-09-19 实测）

`~/.omp/agent/.env` 最终变量清单（值脱敏，长度实测）：

- `OPENCODE_API_KEY=<REDACTED>`（67 字符，原有保留）
- `TYPESAFE_API_KEY=<REDACTED>`（67 字符，来源 `~/.local/share/opencode/auth.json` 的 opencode-go 条目；该文件无 "opencode" 条目，按规则取 opencode-go）
- `TYPESAFE_BASE_URL=https://opencode.ai/zen`（23 字符）
- `TYPESAFE_DEFAULT_MODEL=jev-1.13-free`（13 字符）
- **2026-09-20 更新**：`TYPESAFE_DEFAULT_MODEL` 已改为 `jev-1.13`（付费通道；免费模型持续 429，zen 目录无 `jev-latest`，实测 3/3 稳定 200，证据见 [judgment-systemone-live-evidence](../../raw/omp/2026-09-20-judgment-systemone-live-evidence.md) §⑥§⑧）。上行为 2026-09-19 时点的历史配置记录。

写入前备份 `~/.omp/agent/.env.bak-20260919-001504`（原文件 85B 仅 `OPENCODE_API_KEY`），chmod 600，同名行替换、其余行保留；未改 config.yml、models.yml，未重启 OMP 进程。静态验证：bun 进程 import pi-utils/src/env.ts 的 `$env`，三值全部可读（BASE_URL 打印为 `https://opencode.ai/zen`，API_KEY exists=true len=67）。

OMP catalog 侧（`omp models refresh` 实测，models.db 更新于 2026-09-19 23:30:35 本地）：provider `opencode-zen` enabled、baseUrl `https://opencode.ai/zen/v1`、100 models 含 jev-1.13 / jev-1.13-free；provider `opencode-go` enabled、37 models 无 jev；两 provider 共用 opencode-go 条目凭据。

## base URL 拼接坑：写 /zen，不要写 /zen/v1（实测对照裁定）

请求 URL = baseUrl + path（`typesafe.ts:144`），POST 的 path 硬编码 `"/v1/systemone"`（`typesafe.ts:102`），baseUrl 尾部斜杠剥除（`typesafe.ts:34, 93`）。因此：

- `TYPESAFE_BASE_URL=https://opencode.ai/zen` → 实际请求 `https://opencode.ai/zen/v1/systemone`（正确）。
- `TYPESAFE_BASE_URL=https://opencode.ai/zen/v1` → 实际请求 `https://opencode.ai/zen/v1/v1/systemone`（路由不存在）。

probe.py 对照实测（2026-09-19，浏览器 UA，key 运行时读取并 redact，POST model=jev-1.13-free）：

| URL | 状态 | 响应体性质 |
|---|---|---|
| `https://opencode.ai/zen/v1/systemone` | 429 | API JSON：FreeUsageLimitError（message 原文「Rate limit exceeded. Please try again later.」，端点存在，免费额度耗尽） |
| `https://opencode.ai/zen/v1/v1/systemone` | 404 | 站点 HTML（路由不存在） |

凭 404 vs 429 证据裁定正确值是 `https://opencode.ai/zen`（对任务书原给值 `/zen/v1` 的偏离，如实记录）。附加实测：python-urllib 默认 UA 两个 URL 均被 Cloudflare Error 1010 拦（browser_signature_banned）；浏览器 UA 与 bun 默认 UA 可通过——OMP 的 bun fetch 不会被拦。

## unexpectedStopDetection: mechanical → smart（一行修改记录）

- 备份 `~/.omp/agent/config.yml.bak-20260919-235440`；diff 仅 line 590 一行 `'unexpectedStopDetection: mechanical'` → `'smart'`，其它行 0 触碰。
- 验证闭环：YAML parse OK（`features.unexpectedStopDetection='smart'`）；`omp config get` 返回 `smart`（实测）。
- 语义出处：`settings-schema.ts:5745-5769`，合法值 `none|mechanical|smart`、默认 `mechanical`（`mechanical` 保留机械重试但不跑 judge，`smart` 才跑 judge）；生效判定 `src/session/turn-recovery.ts:917-920`。

## models.yml api: typesafe 的版本限制（2026-09-21 实测）

本机 OMP 18.2.7 的 `models.yml` schema 不接受 `api: typesafe`。尝试配置自定义 provider：

```yaml
providers:
  typesafe-zen:
    api: typesafe
    baseUrl: https://opencode.ai/zen
```

启动报错：

```text
Warning: models.yml validation failed — custom providers disabled
Schema error: providers.typesafe-zen.api: must be "openai-completions", …, "google-vertex" (was "typesafe")
```

上游提交 `c96eb8fef5` 在 main 分支加入了 `typesafe` / `openrouter-decisions` 等 API 值。该提交尚不属于 18.2.7。包含该提交的正式版本发布后，才能通过 `models.yml` 配置 `api: typesafe` 的 provider。

## 证据边界

- 本文 429 只引用结论；zen 429 完整证据（状态行/响应头逐行/112 字节体）与四组对照实验（匿名 200 / 假 key 401 / 真 key 429 / 其它免费模型 503）在兼容性文章。
- zen 免费额度按 UTC 午夜重置是**推断**（Retry-After 与 UTC 0 点对齐），额度数值、账号级还是 key 级未验证。
> **Status: Outdated** (2026-09-20)
> 「zen 免费额度按 UTC 午夜重置」的推断已被推翻：429 的 `Retry-After` 恒指次日 UTC 午夜，但 2026-09-20 00:00 UTC 过后免费通道依旧 429——**重置周期未定，`Retry-After` 非可靠预测器**；另实测免费池与付费余额相互独立（充值不解锁免费池）。时点快照证据见 [judgment-systemone-live-evidence](../../raw/omp/2026-09-20-judgment-systemone-live-evidence.md) §⑥。

- `hasAuth` 途径 3 的 agent.db 凭据表当前 0 行——`/login typesafe` 路径本机未使用。
