# Kiro 模型目录刷新与 OMP 可见性排查

> Source: 本会话命令输出与 OMP/ns-bridge 安装代码检查
> Collected: 2026-10-23
> Published: Unknown

## 问题与排查

- 切换美国出口后，Kiro OMP 目录仍为旧缓存；`omp models refresh` 不会重新调用 Kiro `ListAvailableModels`，真正的远端目录刷新由 `ns-bridge models refresh kiro --apply` 执行。
- 旧目录缓存的 `fetchedAt` 为 2026-10-22 00:59；后续刷新失败时目录保持旧值。此次时间关系不能证明出口地区是失败原因。
- 刷新错误为 `ListAvailableModels request failed in us-east-1`。Node `dns.lookup` 默认参数解析 management 主机耗时 11,042 ms；强制 `family: 4` 耗时 5 ms，强制 `family: 6` 在 10,008 ms 后返回 `EAI_AGAIN`。IPv4 与 IPv6 查询测得的耗时不稳定。
- Node `fetch` 的底层错误为 `UND_ERR_CONNECT_TIMEOUT`，时限 10,000 ms。将本次命令的 `NODE_TLS_REJECT_UNAUTHORIZED` 设为 `1` 后仍失败；错误发生在 HTTP 响应前。

## 修复与验证

- 在全局安装的 `ns-bridge` 生成文件 `~/.bun/install/global/node_modules/@ngosangns/ns-bridge/dist/refresh-entry.js` 中，仅为 Kiro management 请求注入 IPv4 lookup dispatcher。
- 初次将外部 Undici Agent 传给 Node 内置 fetch 时，出现 `UND_ERR_INVALID_ARG: invalid onRequestStart method`；运行时内置 Undici 为 7.29.1，全局包 Undici 为 8.10.2。改用同一外部 Undici 包的 `fetch` 与 `Agent` 后刷新成功。
- 刷新后目录为 8 个模型：`auto`、`claude-sonnet-4-5`、`claude-haiku-4-5`，以及原有 DeepSeek、GLM、MiniMax、Qwen 模型。`omp models kiro --json` 确认 OMP 可读到新目录。
- 当时 `config.yml` 已含 `enabledModels: kiro/*`，`ns-bridge providers status omp kiro` 为 `on`，插件列表显示 `ns-omp-provider-kiro@0.5.3`。
- OMP 菜单后来出现；没有捕获出现时刻的启动日志，具体原因未知。源码中存在扩展注册后重建会话模型列表的逻辑，但无法据此确认本次触发原因。
- 临时 `/etc/hosts` 记录已按用户要求删除；当前有效补丁只在全局安装的生成 bundle 中，升级 ns-bridge 时会被覆盖。

## Kiro Free 模型观察

- 原生 Kiro CLI 对 `claude-sonnet-4.5` 的一次请求返回 `MODEL_OK`；另对 `gpt-5.6-sol` 与 `claude-opus-5.5` 的请求返回 `not available`。这些是不同模型请求的实测结果，不代表其他地区或账号。
- 同次刷新目录列出 Sonnet 与 Haiku；Haiku 只验证了目录可见，没有做生成请求。
- 对失败请求是否扣减 credits 未核对账页。本文不包含账号邮箱、具体出口 IP、Token 或完整会话记录。
