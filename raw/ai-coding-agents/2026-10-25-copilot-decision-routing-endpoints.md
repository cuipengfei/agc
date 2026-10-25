# Copilot 的决策路由端点与 Auto／HydraFusion 边界（2026-10-25 会话核查）

> Source: 本机 copilot-api 代理源码（src/lib/api-config.ts、src/services/copilot/get-auto-selection.ts）；copilot-backend-tester skill 探测脚本；microsoft/vscode 仓库 extensions/copilot/src/platform/endpoint/common/autoModeTiers.ts；npm 包 @vscode/copilot-api@0.5.2；GitHub changelog（https://github.blog/changelog/2026-09-30-hydrafusion-in-vs-code-and-the-github-copilot-app）
> Collected: 2026-10-25
> Published: Unknown（核查记录）

证据分级标签：**文档原文**＝逐字引用；**实测**＝本会话实际抓取；**推断**＝由证据推得但未直接证实。

## ① 上游基址规则（源码直读）

`copilot-api/src/lib/api-config.ts:177-197`：

```ts
export const copilotBaseUrl = (state: State) => {
  if (state.accountType === "individual") return "https://api.githubcopilot.com"
  return `https://api.${state.accountType}.githubcopilot.com`
}
```

即上游地址形态为 `https://api[.<account-type>].githubcopilot.com`，individual 账号使用 `https://api.githubcopilot.com`。

## ② `/auto` 端点（源码直读）

`copilot-api/src/services/copilot/get-auto-selection.ts`：

- 方法：`POST`
- 路径：`${copilotBaseUrl(state)}/auto`
- 请求体：`{ prompt, tier }`
- 响应类型（代理侧声明）：

```ts
export interface AutoSelectionResponse {
  selected_model: AutoSelectedModel
  session_token: string
  expires_at: number
  discounted_costs?: Record<string, number>
}
```

`AutoSelectedModel` 为 `{ id: string; supported_endpoints?: Array<string> }`。

**形状判定**：文本进、有界 typed 选择出（返回选中的模型 ID 与会话令牌）。这是固定题目的决策接口——只能问「用哪个模型」，不能提交自定义题目。

## ③ `tier` 取值（VS Code 源码逐字）

`microsoft/vscode/extensions/copilot/src/platform/endpoint/common/autoModeTiers.ts`：

```ts
/**
 * Routing profiles accepted by `POST /auto`. A tier is picked per session and
 * biases which models the router may choose from.
 */
export const autoModeTiers = ['efficiency', 'balance', 'intelligence', 'fast'] as const;
```

```ts
/**
 * The tiers offered in the model picker. `fast` is excluded: it is the profile
 * inline chat falls back to when the user has not picked a tier, and is not
 * offered as a choice.
 */
export const selectableAutoModeTiers: readonly AutoModeTier[] = ['efficiency', 'balance', 'intelligence'];
```

```ts
/** The tier used when the user has not picked one. */
export const defaultAutoModeTier: AutoModeTier = 'balance';

/** The tier inline chat defaults to; latency matters more than routing depth there. */
export const inlineChatAutoModeTier: AutoModeTier = 'fast';
```

```ts
/**
 * Tier names retired in favour of the current ones. `POST /auto` still accepts
 * them, but the agent runtime rejects them, so they are mapped forward on read.
 */
const retiredAutoModeTiers: Readonly<Record<string, AutoModeTier>> = {
	eco: 'efficiency',
	balanced: 'balance',
	max: 'intelligence',
};
```

## ④ `hydra_scores` 的归属（需谨慎）

探测脚本 `.agents/skills/copilot-backend-tester/scripts/test-auto-select.mjs` 第 1-3 行注释：

```js
// Probe POST /auto (VS Code Auto V2 path): one-shot model selection.
// Returns selected_model, session_token, expires_at, discounted_costs
// and hydra_scores in a single response.
```

同脚本第 137 行读取 `hydra_scores: body?.hydra_scores ?? null`。

**归属限定**：脚本把 `POST /auto` 标为 Auto V2 路径。因此 `hydra_scores` 只能关联到 `/auto`／Auto V2；**不能据此断言它属于 HydraFusion，也不能断言 HydraFusion 在客户端侧运行**。

注意：代理侧 `AutoSelectionResponse` 类型声明中不含 `hydra_scores`，该字段只出现在探测脚本的读取逻辑里。

## ⑤ 另一个路由端点：`/models/session/intent`

`@vscode/copilot-api@0.5.2` 的 `RequestType` 枚举含 `ModelRouter`，URL 映射为 `/models/session/intent`；请求体为 prompt + available_models + 上下文信号，响应含 `predicted_label`、`candidate_models`、`scores`。

**证据来源限定**：该调用实现见于已归档仓库 `microsoft/vscode-copilot-chat` 的 `routerDecisionFetcher.ts`，加上当前 npm 包的 URL 映射。当前 VS Code 主仓库开源部分未见到实际调用代码。因此这条应标为「旧客户端与包中记录的路由接口」，不能断言为当前官方客户端调用。

## ⑥ Auto 与 HydraFusion 的官方区分（文档原文）

GitHub changelog，2026-09-30：

> "Auto selects a model for each request. HydraFusion explores how Copilot can both select a workflow and coordinate multiple models within a turn."

| 维度 | Auto | HydraFusion |
|---|---|---|
| 决策单位 | 每个请求选一个模型 | 每个任务选一种执行模式（Single / Cascade / Critique），一轮内协调多个模型 |
| 判断依据 | 任务复杂度 + 实时模型健康 + tier 档位 | 四个能力信号：reasoning、code generation、debugging、tool use |
| 用户可见形式 | 模型选择器里的 Auto | 模型选择器里的 HydraFusion 条目 |
| 状态 | GA | research preview |

## ⑦ HydraFusion 的上游地址：未找到

- 本机 `copilot-api` 全仓 grep `hydra|fusion`：无任何请求路径。
- `@vscode/copilot-api@0.5.2` 的请求映射中无 HydraFusion 条目。
- 公开的 GitHub changelog、docs 与社区讨论中未给出其 API 地址。

**结论：HydraFusion 的独立上游 URL 未公开、未确认。** 既不能给出地址，也不能断定它没有独立端点。

## ⑧ 对外是否存在 system-one 式 API

未找到任何公开文档、changelog 或对外 API 说明表明 Copilot 向用户提供 system-one 类型的决策接口。已确认的上游决策端点（`/auto`、`/models/session/intent`）均需 Copilot token，且各自只服务选模与意图判断，schema 固定。

## ⑨ 证据边界

- 未实发 `/auto` 请求；`hydra_scores` 是否仍在当前响应中未验证，`discounted_costs`、`multi_turn_mode` 的实际返回亦未验证。
- 未实测 `/models/session/intent`。
- HydraFusion 的内部实现、上游调用方式属未公开信息。
- `/auto` 的 `tier` 与响应字段属未公开行为，可能变动。
- 证据层级：「`/auto` 端点存在且有人实际调用」的依据是代理源码的调用实现（本机第三方代理按此形状发请求）；「端点接受四个档位」的依据是 VS Code `autoModeTiers.ts` 的注释。VS Code 主仓库开源部分未见到实际发起该请求的调用代码，因此不能断言当前官方客户端会调用它。
