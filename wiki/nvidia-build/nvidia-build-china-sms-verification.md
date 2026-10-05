# NVIDIA Build 中国短信验证故障

> Sources: NVIDIA NGC Status, 2026-09-28；NVIDIA Developer Forums, 2026-09-28；NVIDIA NGC Status history, 2026-10-05
> Raw: [状态事件](../../raw/nvidia-build/2026-09-28-nvidia-build-china-sms-status.md); [账号支持说明](../../raw/nvidia-build/2026-09-28-nvidia-build-account-access-support.md); [解决记录与 OMP 接入](../../raw/nvidia-build/2026-10-05-nvidia-build-sms-resolved-and-omp-integration.md)
> Updated: 2026-10-05

## 当前记录

NVIDIA 状态页记录：中国短信验证暂时不可用，NVIDIA 正在修复。页面在 `Posted Sep 23, 2026 - 15:01 PDT` 标记为 `Identified`，随后在 `Posted Sep 23, 2026 - 15:04 PDT` 更新为继续修复；实际故障起始时间未公布。

## 解决记录

NVIDIA 状态页 history 记录该事件已于 2026-09-29 修复（Resolved）。2026-10-05 用户实际收到验证码并成功登录 NVIDIA Build，故障已不复现。

后续的注册、API key 创建与 OMP 配置已在 2026-10-05 完成：`~/.omp/agent/config.yml` 的 enabledModels 已加入 `nvidia/**`，maxInFlightRequests 配了 `nvidia: 5`，端到端实测 `nvidia/deepseek-ai/deepseek-v4.1-flash` 真实调用可用。

## 支持入口

NVIDIA 官方论坛建议把注册邮箱、尝试过的电话号码、错误详情和截图发送到 `help@build.nvidia.com`。
