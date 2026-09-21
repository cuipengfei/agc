---
Sources: 本会话 Zen 探针与 OMP schema 校验结果；本会话 22 文件分类运行结果
Collected: 2026-09-21
Published: Unknown
---

# Zen 与 jevify 实测记录

## OpenCode Zen models

认证请求：

```text
GET https://opencode.ai/zen/v1/models
```

返回 200，约 30 个模型。可见：

- `jev-1.13-free`
- `jev-1.13`

## jev-latest 探针

最小 System One POST 探针：

```text
model: jev-latest
```

返回：

```text
HTTP 400 "Model is unavailable."
```

## OMP 18.2.7 schema

本机安装 OMP 18.2.7。将自定义 provider 配置为：

```yaml
api: typesafe
```

启动时出现：

```text
Warning: models.yml validation failed — custom providers disabled
Schema error: providers.typesafe-zen.api: must be "openai-completions", …, "google-vertex" (was "typesafe")
```

## 上游变更

上游提交 `c96eb8fef5` 在 main 分支加入 `typesafe` / `openrouter-decisions` 等 API 值。该提交尚不属于当前安装的 18.2.7。

## jevify 运行

对提交 `923e731` 的 22 个文件执行 `jevify` 流程，完成通知中的实际 judge model 为 `kimi-claw/k2d8-preview`。
