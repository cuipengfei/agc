# `gpt-6-luna-decisions` 在 Copilot 相关仓库中的出现记录（2026-11-09 检索）

> Source: GitHub Commits 搜索 API（`search/commits`，按 `committer-date` 升序）；各仓库 PR 与文件原文；`github/gh-aw-firewall` 的 `shared/model-information/sources/decisions.json`
> Collected: 2026-11-09
> Published: Unknown（检索记录）

证据分级标签：**原文**＝逐字抓取；**实测**＝本会话检索实际返回；**推断**＝由证据推得但未直接证实。

检索范围限定为 **GitHub Copilot 相关的代码**，不含 OpenAI 直连、OpenRouter、Vercel 等其他渠道的同名用法。

## ① 检索方法与局限

- 使用 `search/commits`，查询词 `"gpt-6-luna-decisions"`，按 `committer-date` 升序；再分别对 `Ashesh3/copilot-api`、`github/gh-aw`、`microsoft/vscode` 单独检索。
- 该接口匹配的是**提交消息中的分词**，不是源码中的精确字符串。因此"命中的提交"不等于"该提交里出现了这个 ID"。
- 2026-09-22 起的早期命中（如 `AltotraficoCO/ai-agency`、`BAITC-Hacks/hack-5caf5332-stroit-ai`、`soupashh-ship-it/kestrel`）消息里出现的是 `GPT-6 Luna`、`decisions` 这类词，本轮**未逐条比对 patch**，不能算作精确字符串的出现记录。
- 下列每一条都另外核对了 patch 或文件原文，确认包含精确字符串 `gpt-6-luna-decisions`。

## ② Copilot 网关生态最早一条（实测，含 patch 核对）

`Ashesh3/copilot-api`，PR #146：

```json
{
  "date": "2026-10-08T16:47:43.000+05:30",
  "message": "feat: support Copilot Decisions and Images APIs (v6.5.0) (#146)",
  "repo": "Ashesh3/copilot-api",
  "sha": "b96963a6a8a6149dd8f06a63063813e9c4fc32c1"
}
```

PR 元数据：

```text
created_at: 2026-10-08T06:48:35Z
merged_at:  2026-10-08T11:17:44Z
number:     146
title:      feat: support Copilot Decisions and Images APIs (v6.5.0)
```

PR 正文摘录（原文）：

> Copilot now serves preview models that do not use chat endpoints. `gpt-6-luna-decisions` advertises only `/v1/decisions`, and `gpt-image-2.5-sunburst` advertises only `/v1/images/generations` and `/v1/images/edits`. The gateway had none of these routes (requests returned `404`), and its chat-style routes cannot serve these models. This adds native passthrough routes for all three, plus the prefix-free aliases `/decisions`, `/images/generations`, and `/images/edits`.

> **Endpoint authority:** the routed account's live model row must list the requested endpoint. A cataloged model that doesn't, such as a chat model or an image model without edits, gets a local `400 model_not_supported`.

新增文件 `src/routes/decisions/route.ts`（68 行）摘录：

```text
+export const decisionRoutes = new Hono()
+
+/**
+ * Mirrors openaidecisionsapi.Request.Validate in github/copilot-api at
+ * 0748fca992 (2026-10-08). Copilot rejects these with a bare "Bad Request";
+ * checking them locally names the field. Everything else stays upstream's call.
+ */
+function validateQuestions(questions: unknown): void {
+  if (!Array.isArray(questions) || questions.length === 0)
+    throw createInvalidRequestError("questions must be a nonempty array", "questions")
+  ...
+}
+
+decisionRoutes.post("/", async (c) => {
+  ...
+    return await dispatchNativeCopilotRequest(c, {
+      body: JSON.stringify(parsed.value),
+      contentType: "application/json",
+      endpoint: "/v1/decisions",
+      model,
+    })
```

同 PR 还新增 `tests/decisions-route.test.ts`（500 行）。

## ③ GitHub 官方仓库的最早记录（实测）

### `github/gh-aw`

```json
{
  "date": "2026-11-01T18:39:53.000-08:00",
  "message": "Replace agent-based evals with batched Decisions requests (#73918)",
  "repo": "github/gh-aw",
  "sha": "0261414a7b8e8cc0b9211e94f7cfeee076474a5b"
}
```

### `microsoft/vscode`

```json
{
  "date": "2026-11-06T21:28:01.000-08:00",
  "message": "Agent Host: model routers for Copilot (experimental) (#346652)",
  "repo": "microsoft/vscode",
  "sha": "5f5ee3e46279f5e674940594ae869a2228e621a7"
}
```

`src/vs/platform/agentHost/common/modelRouter.ts` 中定义了决策模型常量（本轮 code search 命中该文件，命中行显示为 `*/`，具体常量名来自 PR 标题与文件路径；常量赋值的逐字行未在本轮可用输出中留存）。

## ④ `github/gh-aw-firewall` 的模型清单条目（实测，逐字）

`shared/model-information/sources/decisions.json` 中 Copilot 条目：

```json
{
  "schemaVersion": 1,
  "identity": {
    "key": "copilot/gpt-6-luna-decisions",
    "provider": "copilot",
    "rawId": "gpt-6-luna-decisions",
    "lookupId": "gpt-6-luna-decisions"
  },
  "lifecycle": { "status": "active" },
  "modelType": "other",
  "provenance": {
    "authority": "maintained",
    "source": "https://github.com/github/gh-aw/pull/75859",
    "revision": "4c2be18cc2076f2a37e8f0258c298026a4ae413b",
    "at": "2026-11-08T22:25:19Z",
    "confidence": "verified"
  },
  "protocols": [
    {
      "protocol": "decisions",
      "support": {
        "state": "supported",
        "provenance": {
          "authority": "maintained",
          "source": "https://github.com/github/gh-aw/pull/75859",
          "revision": "4c2be18cc2076f2a37e8f0258c298026a4ae413b",
          "at": "2026-11-08T22:25:19Z",
          "confidence": "verified"
        }
      },
      "features": {
        "predicate": {
          "state": "conditional",
          "condition": "One predicate succeeded in the maintainer-reported live Actions job at the pinned revision using Copilot-Integration-Id: agentic-workflows; logs were not independently retrieved. This does not establish choice/score, general account availability or credential eligibility.",
          "provenance": {
            "authority": "maintained",
            "source": "https://github.com/github/gh-aw/blob/4c2be18cc2076f2a37e8f0258c298026a4ae413b/actions/setup/js/scripts/test_decisions_client.cjs",
            "revision": "4c2be18cc2076f2a37e8f0258c298026a4ae413b",
            "at": "2026-11-08T22:25:19Z",
            "confidence": "verified"
          }
        }
      }
    }
  ]
}
```

同一文件中的 OpenAI 条目（对照）：

```json
{
  "identity": {
    "key": "openai/gpt-6-luna",
    "provider": "openai",
    "rawId": "gpt-6-luna",
    "lookupId": "gpt-6-luna"
  },
  "protocols": [
    {
      "protocol": "decisions",
      "support": { "state": "supported", "..." : "..." },
      "features": {
        "typed_questions": {
          "state": "conditional",
          "condition": "1–400 predicate, choice or score questions; answers retain question order."
        }
      }
    }
  ]
}
```

（上段 `"..." : "..."` 为省略的 provenance 字段，其余逐字。）

该文件**没有任何 tariff 或价格字段**；Copilot 条目的 `predicate` 状态标为 `conditional`，条件是"维护者自述的一次 Actions 实跑成功，日志未被独立获取"。

## ⑤ 计费相关的第三方观测（实测检索）

外部仓库的工作流在使用 `gpt-6-luna-decisions` 调 Copilot `/v1/decisions` 时报错，原文为：

```text
Model "gpt-6-luna-decisions" has no AI credits pricing and no default pricing is configured
```

对应的上游目录把该模型的 `token_prices` 各项配为 `0`（见 [实测 raw](./2026-11-09-copilot-decisions-live-verification.md) §④）。这两条互相吻合：代理在计算 AI Credits 时找不到非零单价。

## ⑥ 证据边界

- 检索只覆盖 GitHub 公开仓库；私有仓库与其他托管平台未涉及。
- `search/commits` 的分词匹配意味着"更早"的精确字符串记录可能存在于未被此次查询命中的提交里；本清单是**已核实的下界**，不是"全站首次"。
- `microsoft/vscode` 的文件当前版本可能已变更；本轮命中的 blob 与导入的 revision 未逐行核对。
- 未验证 `github/gh-aw` 与 `microsoft/vscode` 是否实际在运行时调用该端点；本轮只核实代码中出现该 ID。
