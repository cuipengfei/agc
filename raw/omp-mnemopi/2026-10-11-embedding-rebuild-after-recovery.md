# 恢复后的 embedding 重建（2026-10-11）

> Source: 本会话 embedding 现状排查（session 日志、mode=ro 计数采样、进程环境）
> Collected: 2026-10-11
> Published: 2026-10-11

恢复上线后 `memory_embeddings` 行数明显低于恢复件，排查定性为「模型变更触发的重建、进行中但停滞」，非数据丢失。

## 日志证据

- pid 1123800 @ `2026-10-11T19:43:42`：`mnemopi: embedding model changed, rebuilding`，`from:[""]`、`to:"text-embedding-3-small"`、`count:885`。
- pid 1124841 @ `2026-10-11T19:44:56`：`mnemopi: resuming interrupted embedding rebuild`，`to:"text-embedding-3-small"`、`count:629`。
- 之后仅有 `embedding input truncated` 的 debug 行；19:44:56 后再无 embedding 日志；按 fail/error/timeout 关键字搜索零命中。

恢复件里的 embedding 行模型字段为空，开库时检测到模型变成 `text-embedding-3-small`，清旧重算。

## 计数采样

- `immutable=1` 读到 `memory_embeddings=256`（看不到 WAL）。
- `mode=ro` 读到 `memory_embeddings=257`，三次采样（19:48:46 / 19:48:50 / 19:48:54）稳定不变。
- `gists`≈900（19:48 为 900，稍后 901），content 完好 → embedding 可从 gists 重算。
- 覆盖：`content_rows=4338`、`emb=257`、`gists=900`。

## 定性

- 不是丢数据：源（gists）在，可重算。
- 当前停滞在 257/约 900，未见进展、也无报错 → 重建启动后未被推进到完成（需 embedding 后端可达 + 会话活动驱动）。
- 后果：语义召回在约 70% 记忆上暂降级，直到重建跑完。
- 线索非定论：本次排查进程（agent/bash）环境里 `OPENAI_API_KEY` 长度仅 5（真 key 为 `sk-` + 50+ 字符），疑似占位值；但这是**排查进程**的环境，不等于 omp 会话进程的 embedding 配置，不能据此断定会话端 key 失效。
