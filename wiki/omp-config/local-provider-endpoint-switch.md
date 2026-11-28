# OMP 本机 provider 端点切换与 openai-codex 移除

> Sources: 本机 OMP 配置修改与 `omp models --json` 验证, 2026-11-28; OMP 与 copilot-api 源码阅读, 2026-11-28
> Raw: [2026-11-28-local-provider-8787-to-4140-switch](../../raw/omp-config/2026-11-28-local-provider-8787-to-4140-switch.md)
> Updated: 2026-11-28

## 两个端口不是同一个服务

| 端口 | 进程 | 识别方式 |
|---|---|---|
| 8787 | Headroom proxy | `ps` 里的 `headroom proxy`；日志在 `~/.headroom/logs/`；启动横幅 `Mode: cache` |
| 4140 | copilot-api | `/token-usage`、`/usage-viewer`；数据库 `~/.local/share/copilot-api/copilot-api.sqlite` |

两者返回同一份 `/v1/models`，因为 8787 把请求转发给 4140。目录字节相同只能说明转发关系，不能推出二者是同一服务。做“经过代理与直连”的费用对比时，这个区分是前提，判错会让对比失去意义。

## models.yml 的四处地址

| 位置 | 说明 |
|---|---|
| `providers.openai-codex.baseUrl` | 该 provider 走 `openai-codex-responses`，已移除 |
| `providers.c8787.baseUrl` | Responses 通道，带 `/v1` |
| `providers.c8787-chat.baseUrl` | chat completions 通道，带 `/v1` |
| `providers.c8787.models[microsoft-decision-1-1].baseUrl` | 模型级覆盖，不带 `/v1` |

四处的共同点是都要写全 `http://localhost:<端口>/v1`（模型级覆盖这一条按该 provider 的路径约定写成不带 `/v1` 的形态）。改动后 `omp models --json` 退出码 0，三个 provider 的模型数都大于 0。

## 生效时刻只能按请求记录判定

`models.yml` 在进程启动时读取。改完配置之后，日志里仍能看到经旧端口的请求，说明已运行的会话继续走旧地址。

因此“切换时间”不是配置文件 mtime，而是各会话实际开始走新地址的时刻。两侧都留了带时间戳的请求记录：8787 的 PERF 行、4140 的用量行。按请求时间切分即可完成前后对比，不需要强制运行中的会话重新绑定模型。

## codex 通道的路径前提

OMP 对 `api: openai-codex-responses` 的 provider 强制把地址拼成 `<baseUrl>/codex/responses`。

Headroom 注册了 `/v1/codex/responses` 并归一化为 `/v1/responses`。copilot-api 按原路径转发、没有注册 `/codex/responses`。

结论：这类 provider 只在中间有一层做路径归一化时能用。直连 4140 会在路径上失败，判断来自两侧源码，未发起真实请求。

## 移除一个 provider 的三处编辑点

| 文件 | 改动 |
|---|---|
| `~/.omp/agent/models.yml` | 删整个 provider 块，含注释横幅与末尾空行 |
| `~/.omp/agent/config.yml` | 从 `enabledModels` 删除 `- <provider>/*` |
| shell rc（本机 `~/.zshrc`） | 若有专属环境变量，一并删除 |

移除前先确认没有角色或 fallback 链指向它。本次核对了 `modelRoles.web`（当时为 `web/firecrawl`）与 `fallbackChains.web`（用 `c8787`），均为空引用；保留的代理日志中也没有该 provider 专属路径的请求。

验证顺序：

1. YAML 解析通过与改动前逐字段对比，确认除目标两项外无变化。
2. `omp models --json` 退出码 0，被移除 provider 名下模型数为 0，其余 provider 仍有模型。
3. `zsh -n ~/.zshrc` 退出码 0。
4. 仓库镜像目录对该 provider 名称零匹配。

## 清理的边界

- 已运行的会话需要重启才读取新的 provider 列表。
- 历史 session 文件、`agent.db`、`models.db-wal` 仍保留过去用过的 provider 名称。那是记录，不是配置，不影响后续调用。
- 活目录 `~/.omp/agent` 的整目录文本搜索会被本机凭据防护拦截，残留检查只能落在具体配置文件和仓库镜像上。

## See Also

- [GPT-6 Luna 与 Sol（8787 Copilot 网关）三宿主接入记录](../copilot-gateway/gpt-6-luna-sol-config.md)
- [OMP web search 自定义 Responses API 端点](../omp-tips/web-search-custom-responses-provider.md)
- [OMP Codex WebSocket 传输判定与回退](websocket-transport-policy.md)
- [Headroom 压缩率与节省金额的计价边界](../agent-tooling/headroom-savings-money-accounting.md)
