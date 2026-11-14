# GitHub Copilot Auto 与 Fusion 端点行为与折扣验证

> Source: 对 GitHub Copilot `/auto` 与 `/model/fusion` 上游端点的直接实测，2026-11-13 与 2026-11-14
> Collected: 2026-11-14
> Published: Unknown

本次观测覆盖 2026-11-13 与 2026-11-14 两天，结论只适用于该窗口内观察到的端点行为与计费表现。

## 端点形状

`POST /auto` 请求体为 `{ prompt, tier }`。tier 取 `efficiency`、`balance`、`intelligence`、`fast`。响应含 `selected_model.id`、`session_token`、`expires_at`，以及可选的 `discounted_costs`。

`POST /model/fusion` 请求体为 `{ prompt, plan_version }`。`plan_version` 取 `"1"` 时返回多步 cascade，例如先 draft 后 escalation，`steps` 数组每项含 `model_id` 与 `role`。取 `"2"` 时返回单步 solo。响应同样含 `session_token`、`expires_at`、`hydra_scores`。

## session_token 是折扣凭证

两个端点返回的 `session_token` 是折扣凭证，带 `expires_at` 过期时间。把这个 token 放在后续 `/responses` 请求的 `Copilot-Session-Token` 头里，该请求按对应折扣计费。

token 过期后，重新发送原来的完整题面可以取得新 token。题面文本本身需要保存下来，日后重放同一题面即可恢复折扣覆盖。

上游响应中的 `copilot_usage.token_details` 按每种 token 类型分别给出 `cost_per_batch` 与 `batch_size`。两者的比值就是该类型的实际单价。

## 选模型不可指定，且随时间变化

请求体里没有可以指定具体模型的字段，选哪个模型完全由服务端决定。同一个题面在不同日期可能返回不同模型。

Auto 与 Fusion 的候选池不一致。实测中 `mai-code-1.1-flash` 在 `/auto` 反复请求都没有出现，在 `/model/fusion` 的 `plan_version "1"` cascade 中稳定出现。

Fusion `plan_version "1"` 的多步计划里可能出现 `plan_version "2"` solo 刷不出来的模型。要覆盖尽可能多的模型，两个版本都需要请求，并登记每一个 step 的模型。

## 长上下文价格档

长上下文档的起点由模型目录条目的 `billing.token_prices.default.context_max` 决定，按模型取值，不是统一的固定数字。本次读取的目录数据里观察到 128,000（`mai-code-1.1-flash`）、200,000（`gemini-3.7-flash`、`gpt-5.6-luna`）、224,000（`kimi-k2.7-code`）、272,000（`gpt-5.4`、`gpt-5.5`、`gpt-5.6-sol`、`gpt-5.6-terra`）四档起点。部分条目没有 `long_context` 档，超过各自起点后仍按普通价计费。

存在 `long_context` 档的模型，其输入、缓存读取、缓存写入基础价是普通档的 2 倍，输出基础价是 1.5 倍。本次审计的 `gpt-6.1-sol` 与 `gpt-6.1-terra` 在用满该档的请求上呈这两个倍率，起点为 272,000。

折扣按同一价格档的原价计算。30% 折扣叠加在长上下文档上，相对普通档原价表现为输入与缓存 1.4 倍、输出 1.05 倍。审计折扣时必须先判断请求属于哪个价格档，再按档内原价比较，否则长上下文请求会被误判为折扣没有生效。

## 折扣验证方法

同模型、同输入，分别携带与不携带 `Copilot-Session-Token` 各发一次请求。

比较两次响应 `copilot_usage.token_details` 中每种 token 类型的 `cost_per_batch / batch_size`。只有全部 token 类型都呈现一致的比例，才能确认整体折扣率。

不能用 `total_nano_aiu` 直接相除。两次请求的 token 数量与缓存命中情况不同，总量比值会把 token 数差异混进折扣计算。

实测结果与官方文档一致：Auto 为 10%，Fusion 为 30%。
