# OMP 配置当前值与同步状态取证

> Source URL: 本机 `~/.omp/agent/config.yml` 与 `~/.omp/agent/models.yml`
> Collected: 2026-11-03
> Published: 2026-11-03

## 取证范围

本会话改动后的来源文件实际值、OMP 引擎读取验证、仓库同步状态。读取时间 2026-11-03。

## config.yml 相关键当前值

`~/.omp/agent/config.yml`：

```
inlineToolDescriptors: "on"    # 第 173 行，原 auto，本会话改为 on（带引号避免 YAML 1.1 布尔歧义）
textVerbosity: medium          # 第 184 行（未改动）
cacheRetention: long           # 第 57 行（未改动）
cacheWarming: idle             # 第 58 行（未改动）
task.file: true                # 第 555 行，原 false，本会话改为 true
```

## models.yml c8787 provider compat 当前值

`~/.omp/agent/models.yml` 第 19-28 行：

```yaml
  c8787:
    baseUrl: http://localhost:8787/v1
    apiKey: dummy
    api: openai-responses
    compat:
      supportsStrictMode: true
      supportsImageDetailOriginal: false
      supportsLongPromptCacheRetention: true
      officialEndpoint: true       # 本会话新增
      statefulResponses: false     # 本会话新增
    models:
```

`c8787-chat` provider（第 100-126 行）未改动，compat 仍为：
```yaml
    compat:
      supportsPromptCacheKey: true
      supportsStrictMode: true
      supportsImageDetailOriginal: false
      supportsLongPromptCacheRetention: true
```

`openai-codex` provider（第 2-18 行）未改动，唯一模型 gpt-5.6-luna 标了 `preferWebsockets: false`。

## OMP 引擎读取验证

运行 `bun .agents/skills/omp-configs/scripts/dump-settings.mjs`（从引擎运行时读取配置，产出脱敏 settings.json），提取关键字段：

- inlineToolDescriptors：`effective: "on"`、`configured: true`（默认 auto）
- task.file：`effective: true`、`configured: true`（默认 false）
- textVerbosity：`effective: "medium"`（默认 medium）

引擎按字符串 "on" 接受 inlineToolDescriptors，未解析成布尔。

## compat 解析验证

用 `resolveModelPolicy` 对 c8787 的 gpt-6.1-sol 构建 spec（含上述 compat 覆盖），resolver 输出：
- officialEndpoint = true
- statefulResponses = false
- supportsStrictMode = true

`applyCompatOverrides` 在主机判定之后应用用户覆盖，officialEndpoint 从 false（localhost 非 api.openai.com）变为 true。

## 仓库同步状态

改动在来源完成后，按 manifest 条目单独 pull 到仓库副本（`src/agc_sync/pull.py::run(entries)`）：

- `omp-models` 条目：dry-run 确认 1 个 would-update → 实际 pull 写入 `omp/agent/models.yml`，protected_slots=7。
- `omp-config` 条目：dry-run 确认 1 个 would-update → 实际 pull 写入 `omp/agent/config.yml`。同步带入来源里其他既有调整（webSearchTimeoutSeconds: 60、xdevNotices: true 等）。

`./sync.py status` 全量只读核对：models.yml 与 config.yml 已同步，其余条目 unchanged。

## Git 与 symlink 状态

`git status --short`：
```
 M omp/agent/config.yml
 M omp/agent/models.yml
```
（config.yml 在 pull 前已有 staged 变更，状态为 MM；models.yml 为 M。）

symlink 检查（`find . -path './.git' -prune -o -type l -print`）：输出的链接全部是 node_modules/.bin 下的包管理器生成物和既有的 .codegraph，本次改动未创建新 symlink。

## 未改动项

- `providers.openaiLiveSteering`：未改动，保持默认 false。
- `providers.cacheWarming`：未改动，保持默认 idle。
- `providers.cacheRetention`：未改动，保持 long。
- c8787 模型未添加 `promptCache` 字段。
- c8787-chat 与 openai-codex provider 未改动。

## 凭据边界

models.yml 同步经 policy.py 脱敏，protected_slots=7。config.yml 无敏感槽位（protected_slots=0）。来源文件 apiKey 字段值为 dummy（8787 网关不校验鉴权）。全程未读取或打印真实凭据。
