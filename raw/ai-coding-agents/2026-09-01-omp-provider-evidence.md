# OMP Provider 可替换性证据

> Source: https://github.com/can1357/oh-my-pi
> Collected: 2026-09-01
> Published: Unknown

> Commit: `65f79e76fcc89b96632fe86a598f314bd7cfc725`

## Confirmed

- README 在 “Custom OpenAI-compatible providers” 一节说明可在 `~/.omp/agent/models.yml` 定义自定义 provider。
- OMP 支持大量内置 provider，并列出 Ollama、LM Studio、llama.cpp 与 LiteLLM 等本地或自托管路径。
- Provider、模型和 endpoint 属于用户配置，不要求请求经过单一 OMP 托管推理服务。

## Boundary

OMP harness 可自主管理 provider，不代表所有 provider 或模型本身开源、免费或适合离线运行。
