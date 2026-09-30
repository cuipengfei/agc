# OpenAI Decisions API 公告与端点未公开核验（2026-09-30 会话材料汇编）

> Source: OpenAI DevDay 2026 recap 官方页；community.openai.com DevDay 公告转载帖（topic 1402006）；Hacker News Algolia API（comment 49899145）；bigchange.ai 与 aigentlab.tech 溯源文章；github.com/OpenDecisions/OpenDecisions README；均为本会话实际抓取
> Collected: 2026-09-30
> Published: 2026-09-29（DevDay recap 与社区帖）；2026-09-30（两篇第三方核查）

证据分级标签：**文档原文**＝逐字引用；**实测**＝本会话实际抓取/运行所得；**推断**＝由证据推得但未直接证实。

## ① 官方公告（文档原文，逐字）

OpenAI DevDay 2026 Recap（https://openai.com/index/devday-2026-recap/）Decisions API 节：

> "Decisions API enables real-time decision-making by focusing Luna's intelligence on a specific set of user-defined questions with finite pre-defined answers. Developers supply context using text or images, and get back answers they can use to classify content, route requests, or choose an agent's next action."
> "Available in limited preview today with a broad release planned in the coming days."

community.openai.com 公告转载帖（https://community.openai.com/t/devday-2026-announcements-and-developer-resources/1402006，@N2U，2026-09-29）：

> "Decisions API is in limited preview. It uses Luna to classify inputs, route requests, or choose an action from predefined answers."

## ② 与 Jev 的竞争关系（HN 评论，文档原文）

Hacker News「DevDay 2026 Recap」帖评论（author HarHarVeryFunny，objectID 49899145，2026-09-29T19:34:27Z，经 Algolia API 抓取）：

> "business automation is all about decision making and the market for this is massive. Up until now most people just saw this as a use case for LLMs, until TypeSafe/Jev came along and said "actually you don't need an LLM for this ...". [...] are they willing to compete with Jev on price, thereby massively reducing Luna margins (which OpenAI's "Decisions API" is based on)?"

## ③ 端点未公开（2026-09-30 核查）

- 官方 API reference 索引 https://developers.openai.com/api/reference/llms.txt：可见片段与尾部 endpoints 索引均无 Decisions 资源条目（**实测**，该文件 45.6KB，抓取后按片段核对）。
- 官方 reference 路径 `resources/decisions.md` 与 `resources/decisions/methods/create.md` 均 404（**实测**，经搜索工具核验）。
- 官方 changelog（https://developers.openai.com/api/docs/changelog）2026-09-29 条目无 Decisions endpoint（**实测**）。
- 官方 SDK 源码 openai/openai-python、openai/openai-node、openai/openai-openapi、openai/openai-cookbook 搜 `decisions` 均无资源定义（**实测**，GitHub 代码搜索）。
- bigchange.ai（https://bigchange.ai/blog/openai-decisions-api-preview-developer-guide，2026-09-30 核查，文档原文）：

  > "We found no official public request path, request or response schema, SDK example or Decisions API price in the materials checked. BIG CHANGE has not called the service."

- aigentlab.tech（https://aigentlab.tech/articles/openai-decisions-api-luna-guide-2026-09/，文档原文）：

  > "Decisions API のリクエスト形式は公開されていない"（请求形式未公开）

## ④ GitHub 生态：OpenDecisions（实测）

github.com/OpenDecisions/OpenDecisions（GitHub 仓库搜索命中，Updated 2026-09-29T19:32:48Z，0 stars）README 要点（文档原文）：

> "Open models and one server for the Decisions API. Send text, images or video with a few questions that have fixed options, and get back the chosen option and a calibrated probability for every option."
> "The server also answers TypeSafe's System One API on `POST /v1/systemone`, so the official `typesafe-sdk` works with `TYPESAFE_BASE_URL=http://localhost:8000`."

- 自建端点 `POST /v1/decisions`，请求形状 `{model, context, questions: [{id, question, options, ordered}]}`，响应含 `results: [{id, answer, confidence, probabilities, expected}]`（README 示例）。
- provider 路由表只有 `local` / `openrouter` / `typesafe` / `remote`，无 OpenAI 项。
- README 仅在图像输入格式处引用 OpenAI（"OpenAI's `image_url` and `input_image` forms"）。
- 其 `/v1/decisions` 形状为该项目自定，不能作为 OpenAI 官方端点证据（**推断**）。
