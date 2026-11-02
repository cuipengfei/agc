# 自定义 sub-agent 冒烟：自报模型 ID 核验绑定链

> Source: 本会话实测（OMP runtime 18.15.0，重启后首次 spawn，2026-11-02）；task 工具返回的 task-result 与等待快照
> Collected: 2026-11-02
> Published: Unknown

## 方法

给每个自定义 agent 一个固定小任务：讲一个短笑话，并单独一行报告自己实际运行的模型完整 ID。不读文件、不调工具。判定标准是自报 ID 与 `modelRoles` 映射是否一致。

任务文本（四个 agent 相同）：

```text
讲一个关于<主题>的短笑话。然后单独一行报告你自己实际运行的模型完整 ID（provider/model-id 格式）。
```

## 派遣摘要（逐字）

```text
Spawned 4 background agents using librarian, oracle, qa, frontend.
- `DisciplinarySwift` (job `DisciplinarySwift`)
- `AmateurSailfish` (job `AmateurSailfish`)
- `FrailMarsupial` (job `FrailMarsupial`)
- `SharpAlligator` (job `SharpAlligator`)
```

一次 batch 派发 4 个子任务，四个不同 agent 名在同一调用里被分别路由。

## 四条结果

| agent | job | 自报模型 ID | 耗时 | 绑定 role |
|---|---|---|---|---|
| `qa` | FrailMarsupial | `opencode-go/deepseek-v4.1-flash` | 7.8s | `@task` |
| `librarian` | DisciplinarySwift | `c8787/gpt-6-luna` | 8.0s | `@smol` |
| `oracle` | AmateurSailfish | `c8787/gpt-6.1-sol` | 11.4s | `@architect` |
| `frontend` | SharpAlligator | `sensenova/glm-5.2` | 1m25s | `@designer` |

笑话原文：

- qa：「一个测试工程师走进酒吧，点了 0 杯啤酒、-1 杯啤酒、一杯 NaN 和一亿杯啤酒。酒保看了他一眼，默默把店关了，然后在 JIRA 上给他建了个 ticket。」
- librarian：「图书馆里，书问管理员：“我能不能自己出去？”管理员说：“不行，你还没办借阅证。”」
- oracle：「程序员：灯泡坏了。架构师：先别换，我们先设计一个支持多种灯泡的可扩展照明平台。」
- frontend：「为什么前端开发者总在深夜写 CSS？因为白天跟设计师吵 1px 差距，晚上才轮到跟自己和解。」

## 观察

- 四个自报 ID 与 `modelRoles` 映射逐一对应：`@smol`→`c8787/gpt-6-luna:high`、`@architect`→`c8787/gpt-6.1-sol:high`、`@task`→`opencode-go/deepseek-v4.1-flash:max`、`@designer`→`sensenova/glm-5.2:high`。provider 与 model 族完全一致。
- 自报值只到模型族，缺 `:high` / `:max` 后缀。agent 从自身上下文拿不到档位后缀，也不区分模型基名与档位；因此这条路径能证明 model 族绑定正确，不能证明 thinking 档位已按配置生效。
- 耗时跨度从 7.8s 到 1m25s，`frontend`（sensenova/glm-5.2）明显慢于另外三个，单次样本不足以判定是模型特性还是网络抖动。
- 派遣摘要里的 `using librarian, oracle, qa, frontend` 直接反映 `agent` 参数被逐项解析，而不是回落到默认 `task`。若 agent 名未生效，摘要会显示通用 task worker。
- `frontend` 首次运行时 `read` 了自身 job 状态（等待快照显示 1 条请求、1m18s 仍在运行），随后正常结束；无异常。

## 结论与边界

绑定链（frontmatter `model: "@role"` → `modelRoles.<role>` → child AgentSession 实际模型）在一次真实 spawn 中闭环可用。

未覆盖：MCP 工具解析路径、prompt 正文的实际行为质量、结构化输出与 `outputSchema`。这些需要各自的任务场景，不能由讲笑话的调用推断。
