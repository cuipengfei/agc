# OMP 实验性换窗与裁剪机制：触发条件与缓存影响

> Source: can1357/oh-my-pi 源码 `/home/cpf/code-inside/oh-my-pi`（本会话直读）
> Collected: 2026-11-01
> Published: n/a（源码阅读）

## 实验性换窗门控

- `session-maintenance.ts:608-613`：`compaction.experimentalContextManagement === true` 且 `host.hasExperimentalContextRolloverTools()` 同时成立才走 rollover。
- `agent-session.ts:677-682`：必需工具为 `context_notes`、`new_context`、`read`、`grep`，四者都在才满足门控。
- 门控不满足时（开关关闭、工具面变化如 Vibe mode、带 mode/focus 的手动 `/compact`）回落到 `compaction.methodOrder` 链。
- 切换开关后需重启会话，工具列表才刷新。

## 阈值前的前瞻压缩

- `speculation-lead.ts:13-16`：前瞻带宽为 `clamp(12.5% × 阈值, 8,192, 32,000)`，后台摘要器在 `[阈值 − 带宽, 阈值)` 区间启动。

## 裁剪的保护区

- `shake.ts:48`：自动 shake 保护最近 16,000 tokens 的尾部，最低节省门槛 4,000 tokens。
- `pruning.ts:184`：`DEFAULT_SUFFIX_TOKEN_LIMIT = 8,000`，即后缀保护窗。
- `session-maintenance.ts:323`：`PRUNE_IDLE_FLUSH_MS` = 90 分钟；空闲超过 1 小时缓存 TTL 才整段刷写。

## 兜底路径

- `session-maintenance.ts:4402` 的 `#rescueCompactionDeadEnd`：各层压缩都腾不出空间时执行，可能绕过 `methodOrder` 的常规顺序。

## 对前缀缓存的含义

- 保护窗内的内容原样发出，命中机会不受裁剪影响。
- 窗外的消息被裁剪或改写会改变前缀，使其后整段缓存失效；这类失效在本地可测量，与上游路由造成的失效要分开看。
