# 本机 sticky-router：模型目录与重启状态

> Sources: 本机 copilot-api router 源码, 2026-11-14; 本次会话日志, 2026-11-13
> Raw: [sticky-router 模型目录与重启状态证据](../../raw/copilot-gateway/sticky-router-model-discovery-and-restart.md)
> Updated: 2026-11-14

## 模型目录什么时候更新

本机 sticky-router 在启动时执行 `discoverModels`：读取每个实例的 `/v1/models`，按 `allowedModels` 过滤后建立 `portToModels` 和 `modelToPorts`。当前 router 源码中，这个函数在启动时调用一次；实例之后增加模型，运行中的路由目录不会自动更新。

例如，2026-11-13 的本机记录中，4142 的 `/models` 已包含 `gpt-6.1-terra`，4140 的 `/v1/models` 清单没有该模型，经 8787 请求返回 `no instance serves model: gpt-6.1-terra`。

遇到这个错误时，可先比较目标实例的 `/v1/models` 与 4140 的 `/v1/models`，再检查实例的 `allowedModels` 和路由启动时的发现日志。实例目录和路由目录不一致时，启动时保存的目录可能已经过时。

4140 的 `/v1/models` 汇总 `portToModels`，不会排除已停用的实例。列表中有模型时，还需要查看 4140 的 `/status` 中各实例的 `disabled` 和 `models`，并考虑实例冷却状态。

## 重启会改变哪些实例可用

Dashboard 的实例开关由 `setInstanceDisabled` 修改进程内的 `disabledPorts`；创建路由状态时，这个集合为空。重启后，之前通过 Dashboard 停用的实例会重新成为可选实例，实际分配仍受模型映射和冷却状态约束。

2026-11-13 的记录中，重启前只有 4142 启用；重启后 4143、4144、4145、4146 也显示启用。恢复停用状态之前，模型请求曾进入 4143 和 4145。恢复后，状态检查显示这四个实例再次停用。

## 重启前后的检查

1. 重启 4140 前先获得用户授权。安排维护时间，暂停经过 8787 和 4140 的新请求，等待在途请求结束，并记录 `/status` 中每个实例的 `disabled` 值。
2. 重启后继续保持请求暂停，在 Dashboard 恢复原先的停用状态，再查看 `/status` 核对各实例。恢复期间保持请求暂停，避免请求进入尚未停用的实例。
3. 核对 4140 的模型目录后再恢复请求。需要通过真实模型请求验证时，确认该请求已获授权。

上述端口和现场记录属于本机当时的配置；具体实例以操作时的配置和状态为准。

## See Also

- [GPT-6 Luna 与 Sol 三宿主接入记录](gpt-6-luna-sol-config.md)
- [OMP 动态 Session Identity 与 Sticky Routing](../omp-config/dynamic-session-identity-sticky-routing.md)
