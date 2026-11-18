# Antigravity 提交说明整行触发的 429 对照

> Source: 2026-11-18 本机会话；OMP 18.22.2、agy 1.5.11；ACP 配置为 `model=gemini-3.8-flash`、`thought_level=medium`；OMP 模型选择器为 `antigravity-cli/gemini-3.8-flash`；真实 `@agentclientprotocol/sdk` 客户端与隔离凭据目录
> Collected: 2026-11-18
> Published: Unknown

## 固定条件

- 通过真实 `@agentclientprotocol/sdk` 客户端启动 `agy acp` 子进程，请求只修改 `_meta.antigravity.systemPrompt.append` 槽位。
- 模型声明为 `gemini-3.8-flash`，思考等级为 `medium`；每个候选使用独立的 `agy acp` 子进程，收到首条 `429` 后终止该子进程。
- 同批 `503` 文本里的 `gemini-3.8-flash-medium` 是服务端模型变体名；`-medium` 不是 OMP 或 ACP 的思考等级字段。
- 账号使用本机既有的隔离凭据目录；当轮配额与许可证错误没有出现。
- 提交说明来自 OMP 18.22.2 的系统提示词渲染结果。

## 提交说明原行与等义改写

原行长度为 271 字符：

```text
To commit your changes, use the eval `commit` namespace (`d = await commit.draft()`, then `await d.commit("subject", ["- body"])`), not `git add`/`git commit`: it selects only the lines you and your subagents wrote and never touches other agents' staged or unstaged work.
```

等义改写长度为 194 字符：

```text
Create commits with the eval commit helper: d = await commit.draft(); await d.commit("subject", ["- body"]). The helper selects changes authored by this session and preserves other pending work.
```

| 候选 | 长度 | 结果 | 耗时 |
|---|---:|---|---:|
| 提交说明原行 | 271 字符 | 两次均 429 | 5.10 秒（重复轮） |
| 等义改写 | 194 字符 | OK | 4.39 秒 |

两次 `429` 的响应体为通用 `RESOURCE_EXHAUSTED`，没有重置时间或限流指标。等义改写保留了提交操作的要求，只改变了措辞与长度。

## 完整 system 与零工具对照

| 条件 | 结果 | 耗时 |
|---|---|---:|
| 完整渲染 system，身份句已替换，零工具 | 429 | 6.20 秒 |
| 中性 system 对照，零工具 | OK | 10.07 秒 |
| 整份改写，无工具 | 503 | 4.83 秒 |

完整 system 的身份句已经由提示词扩展替换，零工具条件下仍然返回 `429`。中性 system 对照在同一时段返回 `OK`。整份改写无工具请求返回 `503` 容量错误，未计入 `429` 对照，当轮停止重试。

## 证据边界

- 提交说明原行与等义改写之间没有逐词隔离；不能判定具体命中片段，也不能推断 Google 内部的匹配规则。
- 本次只覆盖 `_meta.antigravity.systemPrompt.append` 槽位，用户消息槽位未在同一脚本中对照。
- `429` 与 `503` 是两种不同响应，`503` 没有被当作提交说明触发 `429` 的证据。
- 结果来自单个账号、单个模型与一组 OMP/agy 版本。
