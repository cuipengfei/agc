# copilot_cache_control 的跨项目用法与 Gemini 适用性

> Source: GitHub 公开仓库源码、grep.app 检索、CC Switch issue、本机同账户对照
> Collected: 2026-11-28
> Published: Unknown

## 一、字段形态

写进请求消息的完整形态是 `"copilot_cache_control": { "type": "ephemeral" }`，按消息挂载，用于给支持断点缓存的模型标记可复用位置。

## 二、各客户端的选点规则

| 项目 | 选点规则 |
|---|---|
| caozhiyuan/copilot-api（commit 9be0eb602f1ffee7597741c9af9bc66a68e1a241，2026-05） | 前 2 条非空 `system` 加最后 2 条非空非 `system` |
| 本机 copilot-api | 前 2 条非空 `system` 加最后 1 条非空非 `system`，扩展到 Gemini 的 Chat 请求 |
| VS Code Copilot（commit 2627b28b85b730e82b0121f013aca1e3f78d8d38） | 预算 4 个，自尾部向前：当前用户消息、当前工具批次末尾、所有位置不带非空 `tool_calls` 的 assistant；有余量再补开头 |
| CodeCompanion.nvim（e262a7b7777cfdd09b271326198ff5bdf1a4d754） | 按估算 token 数排序，取最大的最多 4 条 |
| ghcp_proxy（510aab43000f777d7b098a34f6048273d0442d15） | 不自行选点，保留客户端已有的标记 |

本机实现与 caozhiyuan 的版本同源：同一选点骨架，尾部条数不同，并扩展到了 Gemini 的 Chat 路径。它的提交测试没有验证 Gemini 的缓存效果。

## 三、Gemini 侧的适用性证据

`gemini-4-argon` 只支持隐式缓存，不支持显式缓存。隐式缓存按内容做最长公共前缀匹配，不读取断点标记。

本机同账户成对对照没有出现稳定方向的差异。CC Switch 的 issue #9613 里，请求未带该标记，重发相同内容时输入 219,575 tokens、命中 217,526 tokens；同一报告给出的长期命中率只有 27%。

| 观察 | 数值 |
|---|---|
| 无标记重发的命中 | 217,526 / 219,575 |
| 同一报告长期命中率 | 27% |
| 本机带标记与不带标记的对照 | 无稳定方向差异 |

## 四、结论边界

公开资料里没有控制其他变量的对照，证明这些标记能提高 Gemini 的命中率。它们的价值目前只体现在 Claude 类断点缓存模型上；对 Gemini，标记更像无害的附带字段。

## 五、本机待实施的规划

在 `copilot-api` 仓库内已产出规格与实施票据，采用 VS Code 官方 Chat 的四标记选点：预算 4 个、已有标记计入预算、内容不可标记时跳过、预算耗尽立即停止、两个入口从首次处理起使用同一策略。规划未落地为实现。
