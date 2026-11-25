# microsoft-decision-1.1 公开生态：直连实现、Foundry 路径与第三方网关

> Source: 本会话 GitHub 代码与产品页逐条核实（agentgateway copilot.rs 原文、sxwxs/ghc-api README 与 PyPI、litellm systemone/main.py 原文、microsoft/PilotSwarm issue #332、OpenRouter/Vercel/AnyRouter/Opper/OneInfer/OpenDunes 模型页、microsoft/vscode 代码搜索）
> Collected: 2026-11-26
> Published: Unknown

命名注记：第三方网关一律挂 `microsoft-decision-1.1`（点号）；Copilot 自家目录 ID 是 `microsoft-decision-1-1`（连字符）。

## 开源实现

### agentgateway（直连 Copilot /v1/systemone）

`crates/llm/src/copilot.rs`（https://github.com/agentgateway/agentgateway/blob/main/crates/llm/src/copilot.rs ）原文：

```rust
pub fn path_suffix(route: RouteType) -> &'static str {
	match route {
		RouteType::Embeddings => "/embeddings",
		RouteType::Messages => "/v1/messages",
		RouteType::Models => "/models",
		RouteType::Rerank => "/rerank",
		RouteType::Responses => "/responses",
		RouteType::SystemOne => "/v1/systemone",
		_ => "/chat/completions",
	}
}
```

```rust
m if m.starts_with("microsoft-decision-") || m.starts_with("text-embedding-") => vec![],
```

同文件测试原文：`fn decision_model_has_no_chat_formats_and_uses_systemone_path()`，断言 `supported_formats_for_model("microsoft-decision-1", None).is_empty()` 且 `path_suffix(RouteType::SystemOne) == "/v1/systemone"`。

### sxwxs/ghc-api（直连 Copilot /v1/systemone）

repo https://github.com/sxwxs/ghc-api ，PyPI ghc-api v1.0.40（https://pypi.org/project/ghc-api/ ）功能描述原文：

```text
Decision APIs (Copilot):
  System One: POST /v1/systemone (also /systemone) with systemone model microsoft-decision-1 style
  OpenAI Decisions: POST /v1/decisions with gpt-6-luna-decisions style
```

README 另述：forward 到模型 advertised upstream API、model-name mapping、上游响应（含校验错误）原样返回。

### litellm（独立 systemone 模块，非 Azure 专属）

`litellm/systemone/main.py`（https://github.com/BerriAI/litellm/blob/main/litellm/systemone/main.py ）公开签名原文：

```python
def systemone(
    model: str,
    state: DecisionsJSON | None = None,
    questions: SystemOneQuestions | None = None,
    ...
    images: DecisionsImages | None = None,
    assets: DecisionsAssetEntries | None = None,
    ...
) -> DecisionsResponse:
```

内部委托 `litellm/decisions/call.py` 的 `prepare_call` / `send`，endpoint 由 `api_base` / `custom_llm_provider` 决定。同 repo 另有 `litellm/proxy/decisions_endpoints/endpoints.py` 代理端点。

### PilotSwarm（Foundry 路径）

microsoft/PilotSwarm issue #332（https://github.com/microsoft/PilotSwarm/issues/332 ）原文：

```text
an openai-proxy type with decisionModels qualifies, and its key is sent as api-key to <root>/providers/microsoft/v1/systemone
```

决策适配代码位于 `packages/sdk/src/decision-provider.ts`（issue #339 提及 normalizeAnswer）。

## 第三方网关（6 家已核实上市）

- OpenRouter：https://openrouter.ai/microsoft/microsoft-decision-1.1 —— 页面原文 "It runs on the OpenRouter Decisions API rather than the OpenAI-compatible chat endpoint"；Apps 列表：Pentest AI 269M tokens、Inklace 231M + 35.1M tokens、Dumpling 59.2M tokens、LoreMotion 58.4M tokens；唯一 provider 为 Azure（$0.042/M input、output free、P50 0.16s）。
- Vercel AI Gateway：https://vercel.com/changelog/decision-1-1-now-available-on-ai-gateway 与 https://vercel.com/ai-gateway/models/microsoft/decision-1.1 。
- AnyRouter：https://anyrouter.dev/model/microsoft/microsoft-decision-1.1 与 https://anyrouter.dev/blog/releases/decision-1-1 。
- Opper：https://opper.ai/microsoft/microsoft-decision-1-1 —— 两条路由 Azure EU（$0.05/1M）与 Azure Global（$0.04/1M）。
- OneInfer：https://oneinfer.ai/models/microsoft/Microsoft-Decision-1.1 —— 经 Microsoft Foundry 路由，model 名 `microsoft/Microsoft-Decision-1.1`。
- OpenDunes：https://opendunes.com/models/microsoft/microsoft-decision-1.1 —— `POST /alpha/decisions`，model `microsoft/microsoft-decision-1.1`，0.014 DA/case。

## VS Code 源码

- `microsoft-decision` 在 microsoft/vscode 代码搜索 0 结果。
- Agent Host 决策面存在但默认模型是 luna：`src/vs/platform/agentHost/test/common/decisionsGate.test.ts` 原文 `function request(model = 'gpt-6-luna-decisions', text = 'hi'): IAgentDecisionsRequest`；`copilotAgentDecisions.test.ts` 出现 `IAgentDecisionsRequest` / `IAgentDecisionsResult` 类型。
