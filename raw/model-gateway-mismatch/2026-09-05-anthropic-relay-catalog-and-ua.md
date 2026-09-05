# Anthropic 兼容 relay 的 `/v1/models` 目录形态与 UA 门槛

> Source: 本会话对 `https://api.justwoker.icu/v1/models` 的脱敏实测记录
> Collected: 2026-09-05
> Published: Unknown

## 取证边界

- 请求为 `GET /v1/models`，请求头含 `x-api-key` 与 `anthropic-version: 2023-06-01`；认证值已删除，不在本文件保存。
- 本文件只记录该 relay 的目录形态与 User-Agent 相关的响应码，不涉及 `/v1/messages` 行为。

## 目录条目字段

`data[0]` 的键集合：

```json
["created_at","display_name","id","type"]
```

条目中没有 `capabilities`、没有 `limits`、没有 `billing`、没有 `claude_model_id`。

## User-Agent 对响应码的影响

同一 URL、同一认证头，只改 `User-Agent`：

| User-Agent | HTTP |
|---|---:|
| Python 标准库 `urllib.request` 默认值（未显式设置 `user-agent`） | 403 |
| `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36` | 200 |

## 请求稳定性

本会话中对该 relay 的目录请求出现过间歇失败：同一命令连续执行时，部分次数返回可解析 JSON，部分次数因超时或非 200 而无结果。未记录到失败次数的完整统计。
