# NVIDIA NGC Status：中国短信验证事件解决记录

- Source URL: https://status.ngc.nvidia.com/history
- Collected: 2026-10-05
- Published: 2026-09-29（事件解决时间）

## 摘录（status page history Atom feed 原文）

Incident: Issues with NVIDIA Build service

Sep 29, 16:28 PDT
Resolved - Issues affecting the NVIDIA Build service have been resolved and the service is operating normally.

Sep 29, 16:08 PDT
Monitoring - A fix for the NVIDIA Build service issues has been applied and we are monitoring the service for stability.

Sep 23, 15:04 PDT
Update - We are continuing to work on a fix for this issue.

Sep 23, 15:01 PDT
Identified - SMS verification is temporarily unavailable in China. We're working to restore the service. Please try again later.

## 本机后续事实（2026-10-05）

用户于 2026-10-05 在中国实际收到 NVIDIA Build 短信验证码并成功登录（NVIDIA provider 登录凭据保存到 /home/cpf/.omp/agent/agent.db，OMP 输出 "Successfully logged in to nvidia"）。

OMP 配置改动（/home/cpf/.omp/agent/config.yml）：enabledModels 加入 `nvidia/**`；maxInFlightRequests 配置 `nvidia: 5`。端到端实测 `omp --print --model 'nvidia/deepseek-ai/deepseek-v4.1-flash'` 真实调用返回 OK（85.08 秒，含 reasoning）。
