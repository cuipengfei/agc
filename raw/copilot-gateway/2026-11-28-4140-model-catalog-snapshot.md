# 4140 模型目录快照与 OMP 侧退役模型清理

> Source: 本机 4140 `GET /v1/models` 实测、OMP 模型配置与扩展文件
> Collected: 2026-11-28
> Published: Unknown

## 一、目录快照

`GET http://127.0.0.1:4140/v1/models` 返回 200，共 14 项。按端点归类：

| 类别 | 模型 | 端点 |
|---|---|---|
| GPT Responses | gpt-5.3-codex、gpt-6-luna、gpt-6.1-sol、gpt-6.1-terra、gpt-6-astra | `/v1/responses` |
| 决策接口 | gpt-6-luna-decisions | `/v1/decisions` |
| 决策接口 | microsoft-decision-1-1 | `/v1/systemone` |
| Gemini | gemini-3.8-flash、gemini-4-argon | `/chat/completions` |

`gpt-6.1-terra` 与 `gpt-6-luna` 的能力上限均为 context 400000、max output 55000。

## 二、OMP 中不再对应目录的条目

`c8787` provider 下有 5 个模型不在目录中：gpt-5.4-mini、gpt-5.6-sol、gpt-5.6-terra、gpt-5.6-luna、gpt-6-sol。

处理：从 models.yml 删除这 5 个条目；`retry.fallbackChains.web` 中指向 `c8787/gpt-5.6-luna` 的一行删除；其余回退模型与顺序保留。

## 三、现役 GPT 的保温声明

`c8787` 下 5 个现役 GPT Responses 模型各加 `promptCache: { short: 1500, long: 1500 }`。`gpt-6-luna-decisions` 使用 `openai-decisions` API，不参与保温，未加该字段。

保温扩展原本只放行 `c8787-chat`。修改后，`c8787-chat` 的 Gemini 沿用原策略；`c8787` 下 id 以 `gpt-` 开头且 api 为 `openai-responses` 的模型套用同一套费用上限判断；`openai-decisions` 与 `typesafe` 两类模型不受影响。

## 四、验收

- 扩展行为测试 4 项通过：现役 5 个 GPT 与 Gemini 均返回 warm；无可用方式、单次费用不低于差价、累计超支三种情况返回 stop；决策类与其他 provider 返回 undefined。
- `omp models c8787 --json` 的模型 id 集合与目录中的 5 个现役 GPT 一致。
- `omp config get retry.fallbackChains --json` 中不再包含 `c8787/gpt-5.6-luna`。

## 五、目录快照的时效

该快照是单次读取的结果。上游目录会变化，判断某模型是否现役要以当时的 `GET /v1/models` 为准。本次未发送付费生成请求，也未重启服务。
