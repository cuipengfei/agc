# OpenCode Provider 可替换性证据

> Source: https://github.com/anomalyco/opencode
> Collected: 2026-09-01
> Published: Unknown

> Commit: `26ff3ed3d3e28830190ef53f2ff4b261852139a4`

## Confirmed

- OpenCode 使用 `provider/model-id` 标识模型。
- Provider 配置允许 provider-specific options，并支持自定义 provider 与 base URL。
- OpenCode Zen 是可选 provider，不是运行 OpenCode harness 的强制依赖。
- Agent、工具和本地执行层可以与用户选择的 provider 分离。

## Boundary

“Harness 开源且 provider 可替换”不等于模型免费。用户仍需自行承担远端 API、代理或本地模型的运行成本。
