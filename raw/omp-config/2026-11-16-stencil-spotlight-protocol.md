# Stencil Spotlight 评分协议与启用边界取证

> Source: `@oh-my-pi/pi-coding-agent` v18.20.3 `src/spotlight/{client.ts,settings.ts,session.ts,types.ts}`、`src/config/auxiliary-model-policy.ts`、`src/tools/jfind/index.ts`；`https://cloud.stencil.so/` 公开页面；OpenAI Decisions 官方参考页
> Collected: 2026-11-16
> Published: Unknown

## A. 端点与传输

- 默认地址：`https://cloud.stencil.so/v1/spotlight`。
- 方法：`POST`，`authorization: Bearer <token>`，`content-type: application/json`。
- 直接对该地址发 GET 返回 HTTP 405。
- 客户端不重试；调用方在工具执行过程中，失败即回退到按规则处理的路径。
- `StencilCredential.resolve()` 依次尝试 `STENCIL_API_KEY` 与 `stencil` 登录（`omp token stencil` 打印的凭据）。
- 无凭据抛出 `SpotlightError`，`status 0`，`code no_credential`。

`src/spotlight/types.ts` 的模块注释补充：

- 开启 `spotlight.experiment.enabled` 后，会话整理工具输出（代码读取提取结构、测试日志只留失败、长文档保留相关段落、数据导出压缩、已看过的行折叠）；
- 其他结果超过约 `3.9k` 字符时，裁剪到 Spotlight 排名最高的约 `3k`；
- agent 自行选择的源码区间与 ASCII 图不裁剪；agent 自己的脚本输出仅在很长时处理；
- `read`、`bash`、`eval` 在各自执行内整理结果，其余工具在调用返回时按命令输出整理；
- 读取溢出产物的上限为 `4 * 1024 * 1024` 字节；
- thinking 档位越高成本越高。


## B. 请求体

```json
{
  "model": "whiskers-latest",
  "state": {
    "task": "…",
    "commands": ["…"],
    "said": "…",
    "intent": "…"
  },
  "source": "read src/auth/client.ts",
  "items": ["候选一", "候选二"],
  "questions": {
    "relevance": { "probe": "这段内容对当前任务有多大帮助？" }
  },
  "thinking": "low"
}
```

| 字段 | 说明 |
|---|---|
| `model` | 评分模型 ID；配置项为空时用 `whiskers-latest` |
| `state.task` | 当前用户任务 |
| `state.commands` | 之前执行的命令，不含其输出 |
| `state.said` | 工具调用前 assistant 已说的话 |
| `state.intent` | 当前处理意图，评分问题中的 `{intent}` 会被替换 |
| `source` | 候选内容来源（命令或读取操作） |
| `items` | 待评分文本数组 |
| `questions.<id>.probe` | 该维度的问题文本；请求体只保留 `probe` |
| `thinking` | `low`、`med`、`high`、`max`；未提供时为 `low` |

## C. 响应体

```json
{
  "answers": {
    "relevance": { "scores": [0.96, 0.02] }
  },
  "usage": { "input_tokens": 180 }
}
```

- 每个问题的 `scores` 必须为数字数组，长度等于 `items` 长度，否则抛 `bad_reply`（`status 200`）。
- `usage.input_tokens` 缺失时按 0 处理。
- 响应头 `stencil-cost-usd` 写入 `costUsd`（缺失或非数字按 0）；`x-request-id` 写入 `requestId`。
- 超时使用独立 deadline，默认 `5000` ms；超时错误 `code timeout`，其他传输错误 `code transport`。

## D. 预热请求

会话建立的客户端带 `warm()`：在后台发一次极小的排名请求，内容为 `state.task = "warm-up"`、`source = "true"`、`items = ["ok"]`、问题 `The most important line in this output is: \``。每次客户端最多一个预热在途，失败只写 debug 日志；无凭据时跳过。

## E. 配置项

| 键 | 允许值 | 默认 | 作用 |
|---|---|---|---|
| `spotlight.experiment.enabled` | 布尔 | `false` | 开启工具输出整理、find 排名与实验记录 |
| `spotlight.experiment.tools` | 工具名数组，`*` 表示全部 | `["*"]` | 参与整理与 journal 的工具；空数组关闭这部分整理 |
| `spotlight.experiment.holdout` | `0`–`1` | `0.05` | 对照组比例：模型收到完整结果，记录保留原计划裁剪 |
| `spotlight.experiment.scoreFree` | `0`–`1` | `0.15` | 未进入 holdout 的结果中跳过评分的比例 |
| `spotlight.url` | 字符串 | 默认端点 | 空字符串回退默认端点 |
| `spotlight.model` | 字符串 | `whiskers-latest` | 空字符串回退默认模型 |
| `spotlight.thinking` | `low`/`med`/`high`/`max` | `med` | 请求的 thinking 档位 |
| `spotlight.timeoutMs` | 数字（毫秒） | `5000` | 单次排名预算；`0` 立即超时 |
| `models.noSpotlight` | 布尔 | `false` | 限制 Spotlight 辅助请求 |
| `models.offline` | 布尔 | `false` | 同时施加 judge 与 Spotlight 的 provider 限制 |

## F. provider 门禁

`models.noSpotlight` 或 `models.offline` 为真时：

- 默认端点且当前会话 provider 为 `stencil`：允许请求；
- 其他组合：不请求，回退到无评分规则；
- 独立运行的 `omp find`：关闭 Spotlight 排名，继续使用 judge 排名。

主模型使用其他 provider 时，只要两个限制项为假，仍可请求 Spotlight。

## G. 与常见协议的外层差异

| 协议 | 请求外层 | 结果形状 |
|---|---|---|
| Spotlight | `model + state + source + items + questions{probe} + thinking` | `answers.<id>.scores[]`，按候选项逐项给分 |
| OpenAI Chat Completions | `model + messages` | `choices[]` 中的 assistant 消息或工具调用 |
| OpenAI Responses | `model + input`，另有 `instructions`、`tools` | `output[]` 中的消息与工具调用 |
| Anthropic Messages | `model + messages + max_tokens`，另有 `system` | `content[]` 中的文本与工具调用 |
| OpenAI Decisions | `model + input + questions[]`，问题含 `name`、`type`、`instructions` | predicate、choice、score 等结构化答案 |
| Jev / System One | `model + state + questions{}`，问题含 `type`、`instructions`、`criteria` | 按问题类型返回答案与概率信息 |

Spotlight 的问题对象只有 `probe`，并用独立 `items` 数组做逐项评分；Decisions 与 Jev 的问题自带类型声明，答案按问题类型变化。

## H. 计费边界

- 客户端源码不含价目表或费用计算公式。
- 单次请求的美元金额由响应头 `stencil-cost-usd` 返回，客户端记入 `costUsd`。
- Stencil 官网与 `https://cloud.stencil.so/` 公开页面未查到 Spotlight 单价；页面为单页应用，公开 HTML 中没有 `whiskers` 或价目相关内容。
- 源码注释说明较高的 thinking 档位成本更高，未给费率。
- 计费页与账号额度需要登录后查看；本次未使用凭据发起付费请求。

## I. 相关发现

- `omp find` 的整体预算为 20 秒，独立于 `spotlight.timeoutMs`。
- `models.offline` 约束 provider 路由，当前 provider 自身仍可通过网络提供服务。
- 客户端 `close()` 释放自己打开的认证存储，避免 `omp find` 这类一次性进程被 broker 快照流拖住。
