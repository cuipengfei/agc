# microsoft-decision-1-1 经 Copilot /v1/systemone 文本三题型实测

> Source: 本会话实测（5 个 Copilot 账号经本机 8787 网关 POST /v1/systemone，Business 账号上游 https://api.business.githubcopilot.com/v1/systemone）
> Collected: 2026-11-26
> Published: Unknown

## 文本三题型实测记录

5 个 Copilot 账号逐一实测，全部 HTTP 200。每请求计量：

```text
input tokens: 约 160/请求（单题请求更低）
output tokens: 3
延迟: 约 600ms（实测区间 611–1613ms）
请求 ID: microsoft-decision-1-1（连字符）
响应 body model 回显: microsoft-decision-1.1（点号）
```

文本三题型 `noul` / `choice` / `score` 全部可用，答案按同名 key 返回。协议与 Jev System One 一致，OMP typesafeWire 无需改动。

## 与 luna-decisions 的 10 场景对比（76 题）

同一批 76 道题分别经两个模型判定（OMP typesafeWire 打包）：

```text
                    microsoft-decision-1-1   gpt-6-luna-decisions
答对                76/76                    73/76
Brier               0.000406                 0.026034
中位延迟            741ms                    837ms
input tokens        4086                     12569
```

早期分诊轮：

```text
                    microsoft-decision-1-1   gpt-6-luna-decisions
答对                24/27                    27/27
中位延迟            588ms                    700ms
```

## 图片请求被静默忽略

红/蓝测试图随 questions 发送，上游响应与纯文本逐位一致：

```text
带图概率 vs 纯文本概率: 小数点后 16 位相同
input_tokens: 恒为 40/46
逐次请求 token 差异来源: typesafeWire 每次随机生成 UUID 拼进 state
```

OMP 侧带 `images` 的 judge 调用由 imageJudgeRoleChain 改派 `c8787/gpt-6-luna-decisions`：

```text
红图概率: 1.0
蓝图概率: 0.99
tokens: 136
attempt: 1（无重试）
```
