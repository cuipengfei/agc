# Stencil Spotlight：工具输出的相关性评分

> Sources: `@oh-my-pi/pi-coding-agent` v18.20.3 `src/spotlight/` 与 `src/config/auxiliary-model-policy.ts` 源码，2026-11-16; `https://cloud.stencil.so/` 公开页面，2026-11-16
> Raw: [Stencil Spotlight 评分协议与启用边界取证](../../raw/omp-config/2026-11-16-stencil-spotlight-protocol.md)
> Updated: 2026-11-16

## Overview

Spotlight 是 OMP 内置的批量相关性评分能力：把一段上下文与若干候选项发给 Stencil 的评分服务，取回每个候选项的分数，再据此决定工具输出保留哪部分、或对 `find` 的候选排序。它是随 OMP 一起分发的调用代码加一个远端服务，没有独立客户端需要安装。

请求走专用接口 `POST https://cloud.stencil.so/v1/spotlight`，直接对其发 GET 返回 HTTP 405。协议与聊天类接口无关：没有 `messages`、`input` 或 `content` 这类会话结构。

## 请求形状

```json
{
  "model": "whiskers-latest",
  "state": { "task": "…", "commands": ["…"], "said": "…", "intent": "…" },
  "source": "read src/auth/client.ts",
  "items": ["候选一", "候选二"],
  "questions": { "relevance": { "probe": "这段内容对当前任务有多大帮助？" } },
  "thinking": "low"
}
```

`items` 是候选项数组，`questions` 是以 ID 为键的问题表，每个问题只有 `probe` 文本。这种分法让一次请求可以对同一组候选项回答多个维度的问题。`thinking` 取 `low`、`med`、`high`、`max`，客户端未指定时用 `low`。

`state` 承载共享上下文：用户任务、此前执行的命令（不含输出）、工具调用前 assistant 已说的话、当前处理意图。`source` 标明候选内容来自哪次读取或命令。

## 响应形状

```json
{
  "answers": { "relevance": { "scores": [0.96, 0.02] } },
  "usage": { "input_tokens": 180 }
}
```

每个问题的 `scores` 必须是数字数组，长度等于 `items` 长度；否则客户端按 `bad_reply` 处理。

响应头里的 `stencil-cost-usd` 记入 `costUsd`，`x-request-id` 记入 `requestId`。

## 整理范围

开启实验后，整理覆盖工具输出：代码读取提取结构、测试日志只留失败、长文档保留相关段落、数据导出压缩、已看过的行折叠。其他结果超过约 `3.9k` 字符时，裁剪到排名最高的约 `3k`。agent 自行选择的源码区间与 ASCII 图不裁剪，agent 自己的脚本输出仅在很长时处理。`read`、`bash`、`eval` 在各自执行内整理结果，其余工具在调用返回时按命令输出整理。

## 凭据与门禁

凭据来自 `STENCIL_API_KEY` 环境变量，或 `stencil` 登录（`omp token stencil` 打印的凭据）。缺少凭据时抛 `no_credential`，工具输出整理回退到按规则处理的路径。

启用与限制分三层：

| 层 | 条件 | 结果 |
|---|---|---|
| 实验开关 | `spotlight.experiment.enabled=true` | 才发起工具输出整理与 `find` 排名 |
| 辅助模型策略 | `models.noSpotlight` 或 `models.offline` 为真 | 除默认端点加 `stencil` 会话外，不请求 |
| 单次调用 | 显式 app、relay 等入口 | 按入口决定是否走 Spotlight |

主模型使用其他 provider 时，只要两个限制项为假，Spotlight 仍可工作：它调用的是独立服务，凭据也独立。

## 配置项

| 键 | 允许值 | 默认 | 作用 |
|---|---|---|---|
| `spotlight.experiment.enabled` | 布尔 | `false` | 总开关 |
| `spotlight.experiment.tools` | 工具名数组，`*` 表示全部 | `["*"]` | 参与整理与 journal 的工具；空数组关闭这部分整理 |
| `spotlight.experiment.holdout` | `0`–`1` | `0.05` | 对照组比例：模型收到完整结果，记录保留原计划裁剪 |
| `spotlight.experiment.scoreFree` | `0`–`1` | `0.15` | 未进入对照组的结果中跳过评分的比例 |
| `spotlight.url` | 字符串 | 默认端点 | 空字符串回退默认端点 |
| `spotlight.model` | 字符串 | `whiskers-latest` | 空字符串回退默认模型 |
| `spotlight.thinking` | `low`/`med`/`high`/`max` | `med` | 请求的 thinking 档位 |
| `spotlight.timeoutMs` | 数字，毫秒 | `5000` | 单次排名预算；`0` 立即超时 |
| `models.noSpotlight` | 布尔 | `false` | 限制 Spotlight 请求 |
| `models.offline` | 布尔 | `false` | 同时限制 judge 与 Spotlight 的 provider |

`holdout` 与 `scoreFree` 是实验对照用的两档抽样：前者衡量「裁剪本身的效果」，后者衡量「请求评分与按规则处理的效果」。两者都不控制 `find` 的排名路径。

## 与 Decisions、Jev 的分工

三者的用途相近，外层结构不同：

| 协议 | 请求外层 | 结果 |
|---|---|---|
| Spotlight | `model + state + source + items + questions{probe}` | 每个问题一组逐项分数 |
| OpenAI Decisions | `model + input + questions[]`，问题含 `name`、`type`、`instructions` | predicate、choice、score 等结构化答案 |
| Jev / System One | `model + state + questions{}`，问题含 `type`、`instructions`、`criteria` | 按问题类型返回答案与概率 |

Spotlight 把候选项显式列成 `items`，问题只描述评分角度；Decisions 与 Jev 的问题自带类型，答案形状随类型变化。接到 `spotlight.url` 的服务需要实现 Spotlight 的请求与响应格式。

## 计费

单次请求的美元金额由响应头 `stencil-cost-usd` 返回，客户端不含价目表或计算公式。Stencil 官网与 Cloud 公开页面未列出 Spotlight 单价；public HTML 中没有 `whiskers` 或价目内容。账号额度与计费页需要登录后查看。源码注释说明较高 thinking 档位成本更高，未给费率。

## 延迟与回退

评分请求失败、超时或缺凭据时，调用方使用不依赖分数的规则处理，工具调用继续执行。客户端不重试；单次预算由 `spotlight.timeoutMs` 控制，默认 5000 ms。`omp find` 自身另有 20 秒整体预算。

会话首次真实排名前，客户端可能发一次预热请求（`state.task = "warm-up"`、`items = ["ok"]`），每次客户端最多一个预热在途，失败只写 debug 日志。

## See Also

- [OMP 配置语义手册](../omp-config/config-semantics.md) — 各设置项的触发条件与行为影响
- [OMP 配置键全量清单、指纹与凭据遮蔽边界](../omp-config/config-key-census.md) — 键集合、指纹与凭据处理
