# OMP judgment /v1/systemone 活体实测证据：zen 转发链、请求体重建对账、重放样本（2026-09-20）

> Source: 本会话实测（OMP 18.2.6 本地日志/源码 + OpenCode Zen console 日志）
> Collected: 2026-09-20
> Published: Unknown

证据分级标签：**实测**＝本会话实际运行/抓取所得；**文档原文**＝官方页面/文档逐字引用；**推断**＝由证据推得但未直接证实；**未验证**＝未能核实。zen console 字段来自用户提供的 zen console 截图（本会话）；本地日志行逐字引用自 `~/.omp/logs/omp.2026-09-20.1544243.log`。

## ① 本地日志：13:47:45 判定链（unexpected-stop smart 分支完整闭环）

`~/.omp/logs/omp.2026-09-20.1544243.log` 第 469–471 行（逐字，**实测**）：

```
469:{"timestamp":"2026-09-20T13:47:45.087+08:00","level":"debug","pid":1544243,"message":"agent_end maintenance routing","route":"entered","stopReason":"stop","provider":"kimi-code","model":"k3","contentBlocks":2,"hasToolCalls":false,"hasText":true,"goalModeEnabled":false,"successfulYield":false}
470:{"timestamp":"2026-09-20T13:47:45.956+08:00","level":"debug","pid":1544243,"message":"agent.continue scheduled","source":"unexpected-stop-retry","schedulerToken":2}
471:{"timestamp":"2026-09-20T13:47:45.957+08:00","level":"debug","pid":1544243,"message":"agent_end maintenance routing","route":"unexpected-stop-handled","stopReason":"stop","provider":"kimi-code","model":"k3","contentBlocks":2,"hasToolCalls":false,"hasText":true,"goalModeEnabled":false,"successfulYield":false}
```

时序（**实测**）：13:47:45.087 候选 turn 进入 maintenance routing（route:"entered"）→ 0.87s 后 13:47:45.956 `agent.continue scheduled` source:"unexpected-stop-retry" → 13:47:45.957 route:"unexpected-stop-handled"。即 judge 判定 true（noul ≥ 0.5，阈值见 `unexpected-stop-classifier.ts:16`）→ 注入 nudge 并自动继续，整条链在 1 秒内完成。

源码锚点（本机 18.2.6 直读）：候选判定 `isUnexpectedStopCandidate`（`pi-coding-agent/src/session/unexpected-stop-classifier.ts:43-62`）；smart 分支与重试上限（`src/session/turn-recovery.ts:916-991`，`UNEXPECTED_STOP_MAX_RETRIES` 上限 3）；nudge 注入与 `scheduleAgentContinue({source:"unexpected-stop-retry"})`（同文件 :981-991）；classifier 先于 todo 完成检查运行（`src/session/agent-session.ts:3630` 先于 :3772）。

## ② 三条失败路径日志 0 命中 + 请求级零日志

对 `omp.2026-09-20.1544243.log` 全量 grep（**实测**，2026-09-20）：

| 失败签名（逐字） | 来源 | 命中数 |
|---|---|---|
| `judgment: TypeSafe failed; falling back to LLM judge` | `pi-coding-agent/src/judgment/index.ts:116-120` | 0 |
| `unexpected-stop: classification failed` | `pi-coding-agent/src/session/unexpected-stop-classifier.ts` catch 块 | 0 |
| `every tiny/smol candidate failed` | LLM 桥全灭抛错签名 | 0 |

三条失败路径当日均 0 触发——所有判定请求成功，无一次回退。补证：`grep -c systemone` 全日志 4 命中，全部是 subagent 名（`systemone-body-reconstruct` / `systemone-replay` 会话的 launch timing 与 exit 记录，:525/:526/:569/:578），**无任何请求级日志**——与 `pi-ai/src/judgment/typesafe.ts` 全文无 logger 一致（client 侧对判定请求零观测点，唯一可本地归因的痕迹是 model_usage 记录，见 ⑤）。

## ③ zen console 日志字段逐项（用户截图提供，本会话）

zen console 中该次请求的记录行，字段逐项（**实测**，zen 侧观测）：

| 字段 | 值 |
|---|---|
| 方法+路径 | `POST /inference/systemone/v1/systemone` |
| 状态 | 200 |
| 延迟 | 610ms |
| User-Agent | `Bun/1.4.2` |
| Key | `go`（即 opencode-go 凭据条目） |
| cost | $0.000037 |
| request content-length | 1902 |
| response content-length | 120 |
| Metadata | None recorded |

路径 `/inference/systemone/v1/systemone` 显示 zen 服务端存在 `systemone` 转发通道；响应 120 字节与 noul 单题答案形状量级一致。console 未保存请求/响应 body。

## ④ 请求体重建对账：1902 字节长度相等比对

重建方法（**实测**）：取 OMP session JSONL 第 919 行的 assistant 停嘴原文（717 字符）作为 `state.message`，按 `unexpected-stop-classifier.ts:20-30` 的 `UNEXPECTED_STOP_QUESTION` 逐字构造 questions，model 取会话模型 `jev-1.13`，按 `typesafe.ts:101` 的 `JSON.stringify({state, model, questions})` 序列化 → UTF-8 编码 **1902 字节**，与 zen console 的 request content-length 1902 **相等**。

措辞纪律：zen 未存储请求 body，本对账是**长度相等比对**，不是逐字节比对；构成强 circumstantial 耦合（时间窗、端点、UA、key、长度五要素同时吻合），但不声称 body 逐字节一致。

## ⑤ 重放样本：同 body 重发逐字响应

用同一重建 body 直接重发 `POST https://opencode.ai/zen/v1/systemone`（**实测**，2026-09-20）：200，1177ms，118 字节，响应体逐字：

```json
{"model":"jev-1.13","answers":{"stopped":{"type":"noul","noul":0.76}},"usage":{"input_tokens":888,"output_tokens":22}}
```

响应头逐字（**实测**）：

```
x-opencode-endpoint-id: typesafe
x-opencode-upstream-model-id: jev-1.13.0
```

两个头部是 zen 服务端自认转发的直接证据：请求经 `typesafe` 端点通道转发，上游实际执行模型为 `jev-1.13.0`（请求侧 model `jev-1.13` 被解析到具体版本）。响应形状与官方 Answer schema 逐字段吻合：`answers.<id>.type="noul"`、`.noul` 为 P(yes) 0–1、`usage.input_tokens/output_tokens`。

## ⑥ zen 时点观察（全部为 2026-09-20 时点快照，非承诺）

以下均为**时点观察**，易变，不构成对 zen 未来行为的预测：

1. **免费模型 429**：免费模型（jev-1.13-free）请求返回 429 `FreeUsageLimitError`（与 2026-09-19 四组对照实验结论一致）。
2. **Retry-After 非重置承诺**：429 响应的 `Retry-After` 两次观测均指向次日 UTC 午夜（09-19→09-20、09-20→09-21 各一次），但 2026-09-20 00:00 UTC 过后免费通道仍 429——Retry-After 数值是到 UTC 午夜的秒数，**不是可靠的重置时间预测器**。
3. **免费池与付费余额独立**：账户充值 $5 后，免费模型通道仍 429——充值不解锁免费池；两池相互独立（时点观察）。
4. **付费通道激活窗口**：付费模型（jev-1.13）首发请求曾返回 200 空 body（激活窗口现象），随后 3/3 次稳定返回正常判断体。
5. **匿名通道存在但 OMP 用不上**：不带 key 的匿名请求可 200（2026-09-19 已实测），但 OMP 的 TypeSafeJudge 永远带 `Authorization: Bearer` 头（`typesafe.ts:145`），匿名通道对 OMP 不可达。

## ⑦ smart stop 误判倾向观察（本会话）

本会话（2026-09-20）内观察到 **3 次**纯文本正常收尾的 assistant turn 被 smart unexpected-stop 判为意外停止并触发 nudge 重试（第三次发生在 06:07 之后；13:47:45 一次见 ① 的日志逐字）。① 中 13:47:45 事件的 stopReason:"stop"、hasText:true、successfulYield:false，正是「agent 已交付结果但被判意外停止」的形态。倾向性结论（**推断**，样本=3）：对「以陈述句收尾的交付型文本」存在系统性误检倾向，与 `UNEXPECTED_STOP_QUESTION` 的措辞（"says it will act, continue working, or call a tool, then ends"）对短交付文本的边界模糊一致。未量化误检率（无全量分母）。

## ⑧ TYPESAFE_DEFAULT_MODEL 切换（2026-09-20 时点配置记录）

- `~/.omp/agent/.env` 的 `TYPESAFE_DEFAULT_MODEL` 已由 `jev-1.13-free` 切换为 `jev-1.13`（付费通道）。背景：OMP 默认模型 `jev-latest`（`pi-ai/src/judgment/typesafe.ts:30`）在 zen 模型目录中不存在（zen 目录清单见 2026-09-19 raw 的 28/100 模型条目，均无 jev-latest），走 zen 必须显式指模型；免费模型持续 429（§⑥.1），故改走付费通道。
- 付费通道实测：除首发 200 空 body（激活窗口，§⑥.4）外，随后 3/3 次稳定 200 正常判断体。
- 该切换为时点配置记录（2026-09-20），非对 zen 价格/额度的陈述。
