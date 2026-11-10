# Copilot Fusion GA：effort 档位、计划可用性与 30% 折扣（官方两页原文摘录）

> Source: https://docs.github.com/en/copilot/concepts/models/copilot-fusion （content-negotiation 返回 text/markdown）; https://github.blog/changelog/2026-10-28-route-and-orchestrate-models-with-github-copilot-fusion/ （HTML 正文段落）
> Collected: 2026-11-10
> Published: 2026-10-28

## 一、docs：Overview

Copilot Fusion is an intelligent runtime model router and orchestrator. It chooses models and execution patterns for your task, then returns a single response. For example, it can choose one model to draft a solution and a separate model for review.

You select Copilot Fusion in the model picker, but you aren't selecting a specific model. You're choosing a system that routes and orchestrates models at runtime. You don't need to switch models during a task or decide which model suits each step. For each request, Copilot Fusion selects the right execution pattern, the right level of reasoning effort, and the models that run it.

Copilot Fusion also considers real-time system health and availability when choosing models. Routing occurs along natural cache boundaries and large changes in conversation complexity to avoid additional cache-related costs without quality improvements.

## 二、docs：How Copilot Fusion works

Copilot Fusion evaluates each task and uses capability signals for reasoning, code generation, debugging, and tool use, to select the most efficient execution pattern that meets the quality bar for your chosen effort level.

Depending on the effort level and task, Copilot Fusion chooses one of three execution patterns:

| Execution pattern | Description                                                                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single            | One model completes the task.                                                                                                                                                                      |
| Cascade           | An efficient model drafts a solution, and a judge inspects the draft and decides whether to accept it or escalate to a stronger model.                                                             |
| Critique          | One model drafts a response while multiple models independently critique it in parallel. Their feedback is aggregated, and the original model revises its response based on the combined feedback. |

Copilot Fusion chooses an execution pattern when needed, for each prompt, so different prompts in the same session can use different execution patterns. For example, if your first prompt uses the single pattern, a follow-up prompt can use the critique pattern.

Choosing an execution pattern is a lightweight step that adds minimal latency.

Copilot Fusion only adds model calls when a task warrants them. This means a straightforward task doesn't wait or use AI credits for a review it doesn't need.

* The single execution pattern behaves like a request to one model.
* Cascade and critique take longer because they include model calls for review.

Copilot Fusion draws on a mix of models: versatile models for straightforward work, and models with stronger reasoning for harder problems. Reasoning effort and model choice are set per step. The model pool changes as new models become available and as GitHub evaluates which models perform best.

While Copilot Fusion works, you can follow the progress of each step and the model being used. Intermediate drafts might be revised or discarded, so Copilot Fusion only shows you the final response.

Copilot Fusion doesn't have a context window of its own. Each step runs within the context limits of the model running it. The context window shown for Copilot Fusion is a conservative value based on the smallest limits among the models it uses.

When the response is provided, you can hover over the effort level name below the response to see a list of models used.

## 三、docs：Copilot Fusion effort levels

Copilot Fusion has multiple effort levels to let you prioritize the quality, cost, and capability tradeoffs that the system prioritizes for each prompt.

| Effort level        | Priority                                                      | Typical use                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fusion Standard** | Balances cost, quality, and latency.                          | Everyday work. Copilot Fusion selects one model for each task.                                                                                                                       |
| **Fusion High**     | Balanced orchestration with moderate token savings.           | Substantial, well-scoped coding tasks, such as fixing a complex bug or making a change across several files, when additional model calls may be worth the extra time and AI credits. |
| **Fusion Max**      | Frontier capability while still considering token efficiency. | Tasks requiring the deepest possible reasoning and most thorough analysis.                                                                                                           |
| **Fusion Fast**     | Only used in scenarios that require fast models.              | Not selectable by users. Only available in Visual Studio Code inline chat.                                                                                                           |

> [!NOTE]
>
> * If Fusion Max is not available in your model picker, one or more of the models required for Fusion Max may be disabled. See [Configuring access to AI models in GitHub Copilot](/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-access-to-ai-models) and [Managing availability of models in your enterprise](/en/copilot/how-tos/administer-copilot/manage-for-enterprise/manage-availability-of-default-models#configuring-models-available-for-copilot-fusion).
> * If you have installed either the MAI Code 1.1 Flash or Qwen3.8 Flash Next models locally, these are more likely to be used, where appropriate, on the Fusion Standard effort level. See [Selecting local models in Copilot Fusion](#selecting-local-models-in-copilot-fusion).

## 四、docs：Selecting local models in Copilot Fusion

> [!NOTE]
> This feature is in public preview and is subject to change.

If you use Windows on a computer with the required specifications, you can download and install the MAI Code 1.1 Flash model from within Copilot CLI, the Copilot app, or Visual Studio Code. See [Adding LLM models to the GitHub Copilot app](/en/copilot/how-tos/github-copilot-app/add-llm-models#installing-a-local-model-from-the-model-picker), [Adding LLM models to GitHub Copilot CLI](/en/copilot/how-tos/copilot-cli/customize-copilot/add-llm-models#installing-a-local-model-from-the-model-picker), and [AI language models in VS Code](https://code.visualstudio.com/docs/agent-customization/language-models#_use-on-device-models).

Once this model is installed locally, Copilot Fusion can choose to use it when appropriate, but only from the Fusion Standard effort level.

Similarly, in Copilot CLI, if you install Qwen3.8 Flash Next locally, (using a model provider such as Ollama), and Copilot identifies it as "qwen3.8-flash-next-local", then Copilot Fusion, from the Fusion Standard effort level, can also use this local model. This is supported across Windows, macOS, and Linux.

While this is in public preview, you must enable experimental features to use it:

* **In the Copilot app**: Turn on **Local model auto routing** in the "Experimental" section of the app's settings.
* **In Copilot CLI**: Start the CLI with the `--experimental` option, or use `/experimental on` in an interactive session to enable experimental features for the current and future sessions.

As an alternative to Copilot Fusion, you can configure a custom agent to use a specific local model, and then, in your prompt, instruct Copilot to use that custom agent for the task, or for a specific part of the task. See [Creating and using custom agents for GitHub Copilot CLI](/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli#delegating-focused-tasks-to-a-specific-model).

## 五、docs：Policies and availability

Copilot Fusion is generally available in:

* Visual Studio Code
* Copilot CLI
* GitHub Copilot app
* JetBrains IDEs

### Copilot Fusion effort level availability by Copilot plan

表头列序（逐格解析得到，共七列）：Copilot Free、Copilot Student、Copilot Pro、Copilot Pro+、Copilot Max、Copilot Business、Copilot Enterprise。

行列内容按 `<svg class="octicon octicon-check">`（Included）与 `<svg class="octicon octicon-x">`（Not included）逐单元格解析：

| Effort level    | Copilot Free | Copilot Student | Copilot Pro | Copilot Pro+ | Copilot Max | Copilot Business | Copilot Enterprise |
| --------------- | ------------ | --------------- | ----------- | ------------ | ----------- | ---------------- | ------------------ |
| Fusion Standard | Included     | Included        | Included    | Included     | Included    | Included         | Included           |
| Fusion High     | Not included | Not included    | Not included | Included     | Included    | Included         | Included           |
| Fusion Max      | Not included | Not included    | Not included | Included     | Included    | Included         | Included           |
| Fusion Fast     | Included     | Included        | Included    | Included     | Included    | Included         | Included           |

### Policies

When you use Copilot Fusion, it chooses from the models available, subject to your policies and subscription type. Available models may change over time.

Copilot Fusion, **won't** include these models:

* Models not available in your plan.
* Models excluded by administrator policies. See [Configuring access to AI models in GitHub Copilot](/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-access-to-ai-models) and [Managing availability of models in your enterprise](/en/copilot/how-tos/administer-copilot/manage-for-enterprise/manage-availability-of-default-models#configuring-models-available-for-copilot-fusion).
* Models excluded by policies restricting Copilot to data-resident or FedRAMP-compliant models.
* Models excluded by policies restricting [Evaluation models](/en/copilot/reference/ai-models/supported-models#evaluation-models).

Copilot Fusion may use specific locally hosted models with the Fusion Standard effort level. See [About GitHub Copilot Fusion](/en/copilot/concepts/models/copilot-fusion#selecting-local-models-in-copilot-fusion).

If none of the models Copilot Fusion uses are available to you, Copilot Fusion doesn't appear in the model picker.

## 六、docs：Billing for Copilot Fusion

<!-- expires 2026-11-30 -->

> [!NOTE]
> Through November 30, 2026, users on paid Copilot plans receive a 30% discount on model costs when using Copilot Fusion.

<!-- end expires 2026-11-30 -->

When you use Copilot Fusion, you're billed for each model it uses, at that model's standard rate. There's no separate charge for Copilot Fusion. Because Fusion High and Fusion Max can use more than one model for a task, a task may consume more AI credits than it would with Fusion Standard. For per-model rates, see [Models and pricing for GitHub Copilot](/en/copilot/reference/copilot-billing/models-and-pricing).

Copilot Fusion keeps your main conversation on the same model whenever possible, so the conversation continues to benefit from cached tokens. Models that assist, such as a reviewer, receive only the context they need.

## 七、docs：Copilot Fusion limitations

* Copilot Fusion works separately from subagents and doesn't start them.
* If Copilot Fusion discards a draft, changes that the draft already made in your workspace, such as file edits, aren't undone automatically. Review changes before you commit them.
* The execution patterns and model pool used may change over time.

## 八、changelog 正文（2026-10-28 发布，2 minute read）

GitHub Copilot Fusion is generally available. Instead of picking a model for each task, choose Copilot Fusion and let Copilot intelligently route and orchestrate which models it uses for you.

Copilot Fusion brings together Project HydraFusion's multi-model orchestration and Copilot auto model selection's fine-tuned model selection, leveraging the benefits of both to balance performance and cost efficiency.

Since Project HydraFusion launched, we've improved its performance. In the Artificial Analysis Coding Agent Index, Copilot Fusion Max scored 60, within two points of Claude Code with Opus 5.5 Max. It delivered that result at about half the average API cost per task, using about half as many tokens and taking about 40% less time per task.

When you select Copilot Fusion in the model picker, you aren't selecting a specific model. You're choosing a system that routes and orchestrates models for each task. There's no need to switch models during a task or decide which model suits each step. For each prompt, Copilot Fusion determines which models to use and how they work together, while you choose the right level of effort.

To use it, select **Copilot Fusion** in the model picker, then choose the effort level.

- **Fusion Standard:** Prioritizes versatile models for everyday coding.
- **Fusion High:** Prioritizes capable models for challenging tasks and deeper reasoning.
- **Fusion Max:** Prioritizes the most capable models for the most demanding tasks and complex reasoning.

Watch as Copilot Fusion analyzes each task and selects a model to complete it, orchestrating multiple models through the following workflows when needed.

- **Single:** One model solves the task directly.
- **Cascade:** An efficient model drafts a response. A quality check determines whether to accept it or escalate to a stronger model.
- **Critique:** One model drafts an initial response, another model reviews it, and the original model revises.

管理员控制项（原文要点）：Copilot Fusion only uses the models that are enabled in your enterprise and organization **model policies**. Enterprise administrators can view what models Copilot Fusion picks from, independently set each model's effective policy state, and disable models for Copilot Fusion without disabling the model for everyone. Administrators can set Copilot Fusion, at any effort level, as the **default model** for Copilot users with Enterprise managed settings.

计费段落原文：When you use Copilot Fusion you're billed for each model it uses, at each model's standard rate. For a limited time, users on paid Copilot plans will receive a 30% discount on model costs when using Copilot Fusion.

Get started 段落原文：Copilot Fusion is available on all Copilot plans in Visual Studio Code, the GitHub Copilot app, GitHub Copilot CLI, and JetBrains IDEs. Support for additional clients is coming soon. Update your client to try it out. Open the model picker, select **Copilot Fusion**, and choose an effort level.

## 九、可用性矩阵的读取方法（本人解析，非源文）

GitHub 文档表格用内联 SVG 的 `class` 表达「含/不含」：

- `octicon octicon-check` + `aria-label="Included"`
- `octicon octicon-x` + `aria-label="Not included"`

单元格文本被截断（显示为 `…`）时图标本身仍在 HTML 里，因此只看截断后的文本会读错可用性。正确做法是逐单元格正则抓 `octicon-(check|x)`，并单独取出表头行确认列序，两者都不依赖单元格可见文本。

本轮解析结果：`Fusion High` 与 `Fusion Max` 的七格标记均为 `Not included, Not included, Not included, Included, Included, Included, Included`；`Fusion Standard` 与 `Fusion Fast` 七格全部 `Included`。

## 十、排名与价格的口径边界

changelog 只给出「scored 60」「within two points of Claude Code with Opus 5.5 Max」「about half the average API cost per task」「about half as many tokens」「about 40% less time per task」，均为 GitHub 自报，未附逐任务明细。

检索命中的二手页面给出 `$5.59 per task`（Copilot Fusion Max）与 `$11.42 per task`（Claude Code with Opus 5.5 Max），源头标注为 Artificial Analysis 2026-10-28 发布的分析文章；本轮未抓取该一手页面，因此这两个金额不进 wiki 正文。
