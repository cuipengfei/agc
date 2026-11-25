# dsh-our-free-model 的免费通道机制与源码证据

> Source: https://github.com/Ebony-Vinyl/dsh-our-free-model 的 README、src/upstream.js、src/kilo.js、docs/free-lane-wire.md；页面快照与 GitHub 文件接口，2026-11-25
> Collected: 2026-11-25
> Published: Unknown

## 仓库简介中的承诺

README 首段原文：

> 在 dsh 里装上这个插件即可，无需登录、注册或填 API Key，就能使用包括 DeepSeek V4.1 Flash、Kimi K3 在内的前沿模型——完全免费，不限量。

README 安装警告原文：

> **⚠️ 不要安装 npm 上那个裸名的 `dsh-our-free-model`。**
>
> npm 上的 `dsh-our-free-model` 包**不是本仓库发布的**。它由第三方打包，内容与本仓库不一致：`index.js`、`client.js` 被改动，并额外包含本仓库从未有过的 `src/channel-visibility.js`。装到它得不到本项目审核过的构建，也拿不到本仓库的签名清单校验与应用内升级。

## 上游是哪些源

README「上游是哪些源」原文摘录：

> **免费车道：OpenCode 的免密网关，https://opencode.ai/inference/v1/\***（2026-10-14 从
> `/zen/v1` 迁到这里；旧路径对免费模型一律 403 FreeTierError）。
>
> | 用途 | 目标 | 携带何种凭据 |
> | --- | --- | --- |
> | 推理请求 | POST …/inference/v1/chat/completions、…/inference/v1/responses、…/inference/v1/messages（按模型分流，见 endpointFor） | Authorization: Bearer public——该车道本身即为公开免密额度，插件中不含任何属于你的密钥 |
>
> **Kilo 渠道：Kilo AI 的公共网关，https://api.kilo.ai/api/gateway**（2026-10-06 接入）。
>
> | 用途 | 目标 | 携带何种凭据 |
> | --- | --- | --- |
> | 推理请求 | POST …/api/gateway/chat/completions（OpenAI Chat Completions 兼容，SSE 流式） | **无**——该网关的免费池（清单中 `isFree: true` 的模型，含 `kilo-auto/free` 自动路由）不需任何账号、Key 或登录态 |

README 同时写明：

> 你的 prompt、工具结果与随附图像会作为正常推理请求发送至所选模型对应的上游——与调用任何模型 API 相同。除此之外插件不上传任何内容：用量看板数据、设置、转发 Key 均只落在本机 DSH_HOME/our-free-model/。

## 免费与限量的边界

README「已知边界」原文：

> "不限量"指不存在额度体系：无需充值、不按 token 计费、没有套餐与用量面板。但该车道按 session 统计速率，短时间内打满会返回 429。插件将该模型标记为"已达限额"，不做隐藏，下一轮探测自动恢复。

README「免责声明」原文：

> - **本插件是一个客户端，不是模型服务方。** 所有模型响应均由上述第三方上游（OpenCode Zen 网关、Kilo AI 公共网关、以及你自己部署的 EAC 网关）生成并传输；插件不托管、不修改、不过滤任何模型输出。模型可能产出错误、过时或有偏颇的内容，请自行核实后再使用。
> - **免费不等于无限，也不等于私有。** 免费额度由上游单方面提供，随时可能限流、收费或下线；Kilo 免费池明确声明 prompt 可能被上游记录并用于改进服务。**请勿通过本插件的免费车道发送密码、密钥、个人身份信息、商业机密或任何你不愿第三方处理的内容**；生产与敏感场景请使用你自己的付费 API。
> - **上游条款由你遵守。** 使用各渠道即表示你同意对应上游的服务条款与用量政策；因违反上游政策导致的限流、封禁或其它后果由使用者自行承担。插件不对任何上游的可用性、准确性或连续性作任何承诺。

README 对客户端适配的说明：

> 请求形状对齐官方 2.2.3 客户端（`traceparent`/`b3`/通配 `accept`），保留工具名绑定、无对应声明的历史工具调用清理及标题请求免整形；请求适配实现见 `src/o2a/SYNC.md`。

## 上游出站实现

`src/upstream.js` 原文摘录：

```javascript
/**
 * Overridable so the selftest can point the adapter at a dead port and exercise
 * the transport-failure path without touching the real free lane's quota.
 */
export const UPSTREAM_BASE = process.env.OUR_FREE_MODEL_BASE ?? 'https://opencode.ai'

/**
 * The headers the gateway fingerprints a genuine client by — the v2 set
 * (`o2a/headers.js`), with the pooled免密 credential `Bearer public`.
 *
 * @param {object} options
 * @param {string} options.session - canonical session (all four session headers)
 * @param {boolean} [options.stream] - drives the default `accept`
 * @param {string} [options.accept] - explicit `accept` override
 * @param {string} [options.project] - caller project signal; **defaults to a
 *   fresh 40-hex id per request**
 * @param {boolean} [options.anthropic] - add the Messages-lane beta header
 */
export function gatewayHeaders(options) {
  return o2aGatewayHeaders(options)
}
```

`src/kilo.js` 原文摘录：

```javascript
/**
 * Kilo AI (https://kilo.ai) publishes an OpenAI-compatible gateway whose free
 * pool answers with no credential at all — no key, no login, no fingerprint
 * gate. That makes this the simplest lane in the plugin: a fixed base URL, a
 * plain POST per turn, and the free lane's own streaming discipline. The trade
 * is stated on the gateway's own model cards and belongs in front of the user:
 * free-pool prompts may be logged by the upstream provider and used to improve
 * its services (the README carries the same warning), so this lane is for
 * throwaway work, not secrets.
 */
export const KILO_BASE = (process.env.OUR_FREE_MODEL_KILO_BASE ?? 'https://ai-gateway.kilo.ai/api/v1').replace(/\/+$/, '')
```

## OpenCode 客户端形状

`docs/free-lane-wire.md`「v2 客户端指纹（2026-10-16）」原文：

> 上游在 2026-10-14 前后把免费车道换成了 **OpenCode v2 客户端**的形状，v1 的四项特征逐一失效 —— 每一项单独出现都是 `403 FreeTierError`（"free tier can only be used from within OpenCode"）。本插件在 2026-10-16 按 v2 重做，两侧实现（`src/upstream.js` 与 vendored 的 `vendor/channel-pack/src/opencode*.ts`）保持同一套形状。

同一文档列出的 v2 检查包含：

> | 项目 | v1（旧） | v2（现在） |
> | --- | --- | --- |
> | User-Agent | `opencode/1.18.31` | **`opencode/latest/2.0.26/cli`**（`opencode/<channel>/<version>/<client>`，major ≥ 2；整串匹配，任何前后缀都不再算 v2 客户端） |
> | 工具闸门 | `bash`/`glob`/`grep`/`read` 四个名字，各带至少一个 property | **`read` 与 `shell` 两个名字，且 description 与参数 schema 必须与官方客户端逐字一致** |
> | `tool_choice` | 无工具时补 `none` 压住诱饵 | **`none` 即 403**，绝不下发；只有 Responses 线补官方的 `auto` |

同一文档在 2026-11-21 的更新中记录：

> 真实 DSH 里 `deepseek-v4.1-flash-free` 每轮 429，而同一出口、同一分钟的裸探针 200。

## 证据边界

- 以上内容来自仓库自身 README、源码与文档。仓库对客户端形状的描述属于维护者自述与自测记录。
- 本文件不包含完整源码审计，不支持或反对仓库中任何具体安全结论。
- 阅读与保存时不写入账号、cookie、API key 或其它私密凭据；`Bearer public` 是上游公开的免密标识。
