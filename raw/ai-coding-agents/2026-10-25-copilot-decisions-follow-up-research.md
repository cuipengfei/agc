# Copilot 是否跟进 OpenAI Decisions API：公开资料与最佳判断（2026-10-25）

> Source: OpenAI API changelog（https://developers.openai.com/api/docs/changelog，2026-10-25 直读）；GitHub changelog（https://github.blog/changelog/2026-09-22-openais-gpt-6-sol-and-gpt-6-luna-now-available/，2026-10-25 直读）；Microsoft VS Code 源码（https://github.com/microsoft/vscode/blob/main/extensions/copilot/src/platform/endpoint/common/endpointProvider.ts，2026-10-25 直读）；本会话之前的 Copilot 端点探测记录（见 2026-10-25-copilot-decisions-retest-and-payload-validation.md）
> Collected: 2026-10-25
> Published: Unknown（本文件为检索与分析记录）

证据分级：**官方文档/源码事实**指来源直接写明的内容；**本地实测**指本会话先前实际请求得到的结果；**最佳判断**指依据前两类证据作出的解释，不是 GitHub 对其内部排期的声明。

## ① 日期对照：模型上架与 Decisions GA 是不同事件

OpenAI API changelog，2026-09-22（原页面标注 Sep 22）：

> "Released GPT-6 Sol (`gpt-6-sol`) and GPT-6 Luna (`gpt-6-luna`). These reasoning models accept text and image inputs and generate text through the Responses and Chat Completions APIs."

同日 GitHub changelog 标题为 “OpenAI’s GPT-6 Sol and GPT-6 Luna now available”。正文说明两款模型在 GitHub Copilot 中可通过 model picker 选择，逐步向多个 Copilot 客户端与计划开放。

OpenAI API changelog，2026-10-22，分类 `Update · Model: gpt-6-luna · API: v1/decisions`：

> "The Decisions API is now generally available with `gpt-6-luna`."

该条还列出 prompt caching、题目级图片、`input_json` 和单请求 400 题等更新。

**事实边界**：GitHub 与 OpenAI 于 Sep 22 分别公布模型 API 发布及 Copilot 可用；OpenAI 于 Oct 22 宣布 Decisions GA。模型出现在 Copilot 与 Decisions 端点接入不是同一个公告或能力声明。

## ② VS Code Copilot 的公开端点类型

Microsoft VS Code 当前源码 `extensions/copilot/src/platform/endpoint/common/endpointProvider.ts` 定义：

```ts
export enum ModelSupportedEndpoint {
	ChatCompletions = '/chat/completions',
	Responses = '/responses',
	WebSocketResponses = 'ws:/responses',
	Messages = '/v1/messages'
}
```

此枚举描述 VS Code Copilot 客户端的模型端点类型，不包含 `/v1/decisions`。它能说明该客户端公开类型当前没有 Decisions 端点，不能单独概括 Copilot 所有服务端或产品面。

## ③ 本地探测摘要与边界

此前三次探测（2026-10-15、10-18、10-25）在各自记录的相同测试条件下，`POST /v1/decisions` 均返回 `model_not_supported`。10-25 的虚构路径对照返回 404。详情见 [10-25 Copilot 复测 raw](2026-10-25-copilot-decisions-retest-and-payload-validation.md)。

**限定**：这些结果只覆盖被测试的认证、上游和请求条件，不能推出所有 Copilot 账号、客户端或服务端条件都相同。该 raw 使用匿名描述，不记录账号类型、主机名、测试模型 ID 或目录清单。

## ④ 公开跟进信息检索

2026-10-25 以以下关键词检查 GitHub changelog、VS Code Copilot 源码、网页与公开代码搜索：

- `GitHub Copilot OpenAI Decisions API`
- `githubcopilot.com/v1/decisions`
- `GitHub Copilot decisions support`
- VS Code `extensions/copilot` 中的 `decisions`、`/v1/decisions`

在本次检索范围内，未找到 GitHub 宣布接入 OpenAI Decisions API 的公告、时间表或可核实的实现。负面搜索结果不等于不存在未公开工作或尚未索引的讨论。

## ⑤ 最佳判断（推断）

最符合现有证据的解释是：**Copilot 的模型上架流程复用已有生成端点；Decisions 是独立 API surface，需要单独接入端点能力与结构化请求/响应处理，所以不会因为底层模型已经可用就自动出现。**

VS Code 的端点枚举没有 Decisions，而三次特定条件的上游探测均返回 `model_not_supported`，与“该端点尚未加入这些条件下的可用模型能力”相符。Copilot 面向聊天与编码的产品入口也没有明显的自定义 bounded-question 使用场景，因此 GitHub 很可能暂时没有把通用 Decisions 接口列为优先事项。

这只是最佳判断，不是 GitHub 说明的内部原因。现有证据不能在“尚未开发”“尚未排期”“需要独立权限或灰度”等解释之间作出区分。

## ⑥ 证据边界

- GPT-6 模型同日宣布在 OpenAI API 发布、并在 GitHub Copilot 可选，由两家官方 changelog 分别直接证实。
- Decisions GA 于 Oct 22，由 OpenAI 官方 changelog 直接证实。
- VS Code 当前端点枚举不含 Decisions，由 Microsoft 源码直接证实；仅适用于该客户端模型端点类型。
- Copilot 拒绝结果仅限前述三次特定探测条件。
- “产品优先级较低、模型上架与端点接入分属不同工作”是基于现有材料的最佳解释，不是官方路线图或因果声明。
