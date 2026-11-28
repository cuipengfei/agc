> Source: 本机实测——`~/.omp/agent/models.yml` 与 `~/.omp/agent/config.yml` 的修改前后内容、`omp models --json` 输出、`ps` 进程表、`~/.headroom/logs/proxy-8787.log*`、`127.0.0.1:4140/v1/models`、只读查询 `~/.local/share/copilot-api/copilot-api.sqlite`；OMP 源码 `/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src` 与 `@oh-my-pi/pi-ai/src/providers/openai-codex-responses.ts`；copilot-api 源码 `/home/cpf/code-inside/copilot-api/src`
> Collected: 2026-11-28
> Published: 2026-11-28

# OMP 本机 provider 端点从 8787 切到 4140，并移除 openai-codex

## 一、两个端口的角色

| 端口 | 实际进程 | 取证方式 |
|---|---|---|
| 8787 | Headroom proxy | `ps` 中的 `headroom proxy` 进程；日志 `~/.headroom/logs/proxy-8787.log*`；启动横幅 `Mode: cache` |
| 4140 | copilot-api（sticky router） | `/token-usage`、`/token-usage/events`、`/usage-viewer`；`~/.local/share/copilot-api/copilot-api.sqlite` |

两者返回同一份 `/v1/models` 目录，是因为 8787 在上游转发给 4140，不能据此判定二者是同一服务。

此前的 wiki 表述「8787 与 4140 是同一网关的两个入口」不准确，本次更正。

## 二、切换动机

用户在测得 Headroom 的实际压缩节省（30 天约 39.56 美元，见 `raw/agent-tooling/2026-11-28-headroom-savings-repricing-audit.md`）之后，希望直接对比“经过 Headroom”与“直连 4140”的每请求费用，再决定是否保留 Headroom。

## 三、models.yml 的四处地址

| 位置 | 改前 | 改后 |
|---|---|---|
| `providers.openai-codex.baseUrl` | `http://localhost:8787/v1` | `http://localhost:4140/v1` |
| `providers.c8787.baseUrl` | `http://localhost:8787/v1` | `http://localhost:4140/v1` |
| `providers.c8787-chat.baseUrl` | `http://localhost:8787/v1` | `http://localhost:4140/v1` |
| `providers.c8787.models[microsoft-decision-1-1].baseUrl` | `http://localhost:8787` | `http://localhost:4140` |

写入时刻：2026-11-28 14:20:42 +08:00（06:20:42 UTC），取 `models.yml` 的 mtime。

改动后 YAML 解析通过；除上述四处外，其余解析结果与改动前逐字段相等；`omp models --json` 退出码 0，`openai-codex`、`c8787`、`c8787-chat` 三个 provider 的模型数均大于 0。

## 四、生效边界

`models.yml` 在 OMP 进程启动时读取。配置写入之后的日志中仍出现经 8787 的 PERF 记录，说明已运行的会话继续走旧地址。

实际切换时刻不能用配置 mtime，只能按请求记录判定：8787 的 PERF 行与 4140 的用量行都带时间戳，比较费用时按请求时间切分即可，不需要强制运行中的会话重新绑定模型。

## 五、openai-codex 的路径前提

OMP 对 `api: openai-codex-responses` 的 provider 强制把 baseUrl 拼成 `<baseUrl>/codex/responses`（`@oh-my-pi/pi-ai/src/providers/openai-codex-responses.ts` 的 URL 解析分支）。

Headroom 注册了 `/v1/codex/responses` 并归一化为 `/v1/responses`，这是既有 wiki 文章记录过的链路。

copilot-api 按原路径转发，没有注册 `/v1/codex/responses`。因此把 `openai-codex` 直指 4140 之后，该 provider 预计返回 404。此判断来自两侧源码，未发起真实请求验证。

## 六、openai-codex 的移除

移除依据：本机无任何 `modelRoles` 指向该 provider；`fallbackChains` 的 web 链使用 `c8787`；网页搜索角色为 `web/firecrawl`；保留的 Headroom 日志（2026-11-10 至 2026-11-28）中没有 `/codex/responses` 请求。

该 provider 在 `models.yml` 中只显式声明一个模型 `gpt-5.6-luna`（`maxTokens: 128000`）；`omp models --json` 中它名下共 15 个模型，其余来自目录动态发现。

三处编辑点：

| 文件 | 改动 |
|---|---|
| `~/.omp/agent/models.yml` | 删除整个 `providers.openai-codex` 块，含 `gpt-5.6-luna` 条目 |
| `~/.omp/agent/config.yml` | 从 `enabledModels` 删除 `- openai-codex/*` |
| `~/.zshrc` | 删除 `export PI_CODEX_WEB_SEARCH_MODEL="gpt-5.6-luna"` 及其行内注释 |

验证结果：

- `omp models --json` 退出码 0，`openai-codex` 名下模型数为 0，`c8787` 与 `c8787-chat` 仍有模型。
- `zsh -n ~/.zshrc` 退出码 0。
- 改动后 YAML 解析结果与“仅删除上述两项”的预期逐字段相等，其余设置未变。
- 仓库镜像 `omp/agent` 中 `openai-codex` 与 `PI_CODEX_WEB_SEARCH_MODEL` 零匹配；`~/.zshrc` 零匹配。
- 活目录 `~/.omp/agent` 的整目录搜索被本机凭据防护拦截，未执行。

## 七、残留与边界

- 已运行的 OMP 会话需要重启才读取新的 provider 列表。
- 历史 session、`agent.db`、`models.db-wal` 仍保留过去使用过的 provider 名称，属历史记录，不影响后续调用。
- `providers.webSearchOrder` 一类排序设置在本次会话中未逐项核对，只核对了 `modelRoles.web` 与 `fallbackChains.web`。
- copilot-api 侧的 `/v1/codex/responses` 缺失是从路由注册表读出的判断，未实测。
