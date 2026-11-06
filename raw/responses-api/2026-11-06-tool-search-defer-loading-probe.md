# Responses API 工具 schema 延迟加载：线格式约束与本机 8787/4140 实测

> Source: 本机 HTTP 探测（脚本 /tmp/toolsearch_probe.py、probe2.py、probe3.py、probe4.py、probe5.py；配置经 yaml.safe_load 读取，密钥只作为请求头使用、未打印）+ headroom-ai 0.42.0 源码 + copilot-api 4140 实响应
> Collected: 2026-11-06
> Published: Unknown

## 线格式：两个字段必须成对出现

四种请求形态，分别发往 `http://localhost:8787/v1/responses` 与 `http://localhost:4140/v1/responses`，模型 `gpt-6-luna`：

| 形态 | 8787 | 4140 | 上游返回 |
|---|---|---|---|
| 12 个普通 function 工具 | 200 | 200 | 正常 |
| 只加 `{"type": "tool_search"}` | 400 | 400 | `tools.tool_search requires at least one deferred tool` |
| 只给工具加 `defer_loading: true` | 400 | 400 | `Deferred tools require tools.tool_search` |
| `tool_search` + 全部工具 `defer_loading: true` | 200 | 200 | 正常 |

两个字段的合法组合只有一种，单独使用都被上游拒绝。Headroom 的注入函数产出的正是合法组合（`helpers.py:4721` 的 `inject_tool_search_deferral_openai` 先插入搜索工具，再给待延迟工具加标记）。

## 注入的三道门

`helpers.py:4795-4801` 的调用顺序：先判客户端，再判模型版本；任一不满足就原样返回工具列表，不做任何注入。

| 门 | 条件 | 位置 |
|---|---|---|
| 工具数量 | 至少 12 个 | `helpers.py:4666` |
| 客户端 | 不在 `{"codex", "opencode"}` | `helpers.py:4668` |
| 模型版本 | 主版本 ≥ 5.4 | `helpers.py:4673` |

客户端识别：`proxy/auth_policy.py:29-49` 的 UA 表里没有 `omp`；发往 `/v1/responses` 的未识别调用方会被补上 `x-client: codex`（`auth_policy.py:126-128`）。`X-Client` 头的优先级高于 UA（`auth_policy.py:109-111`）。

排除这两个客户端的原因写在 `helpers.py:4704-4706` 的注释里：Codex 客户端在往返过程中丢失延迟工具调用的命名空间；OpenCode 会把注入的 `tool_search` 当成不可用工具报错（GitHub issue #2660）。

## 实测 token 差异

| 工具集 | 全量 input | 延迟 input | 差值 |
|---|---|---|---|
| 12 个极简工具（参数只有一个字段） | 365 | 721 | +356 |
| 40 个工具（probe2，tools 数组 34,180 字节，长描述 + 4 个属性） | 4,949 | 3,601 | −1,348（约 27%） |
| 40 个工具（probe4，同族描述） | 3,112 | 2,605 | −507 |

请求体在两臂之间变大（多了搜索工具与标记），input_tokens 却下降，说明上游在组装模型上下文时把这些工具的参数定义排除在外，计费口径同样按排除后的数。

盈亏线：`tool_search` 自身约 350 token 的固定开销；工具定义体积低于它时延迟反而更贵。

## 一次延迟调用的往返

probe3 用同一工具集问「调用 probe_tool_7，value 为 alpha，不要解释」：

| 请求 | 输出项 | 输入 token |
|---|---|---|
| 全量给出 | `function_call: probe_tool_7({"value": "alpha"})` | 2,796 |
| 全部延迟 | `tool_search_call {"paths": ["probe_tool_7"]}`、`tool_search_output`、`reasoning`、`function_call: probe_tool_7({"value": "alpha"})` | 3,062 |

搜索由上游服务端执行，结果在同一响应内返回；客户端不参与搜索，工具本身仍在调用方本地执行。单轮延迟请求多 266 token（多一次搜索往返）。

## 缓存读数与调用顺序

probe4 对同一请求体连发三次，直连 4140：

| 请求 | 第一次 | 第二次 | 第三次 |
|---|---|---|---|
| 40 个工具全量 | input 3,112，cached 0 | input 3,112，cached 3,109 | input 3,112，cached 3,109 |
| 40 个工具延迟 | input 2,605，cached 0 | input 2,605，cached 2,602 | input 2,605，cached 0 |

第一次请求写入前缀缓存，相同请求随后读到。8787 与 4140 一次的 cached 差异来自先打 8787、后打 4140 的顺序，与端点无关。延迟形态的 cached_tokens 同样低于全量形态。

## 逐模型接受度

12 个延迟工具加搜索工具的探测体，直连 4140：

| 模型 | 结果 |
|---|---|
| gpt-5.3-codex | 200 |
| gpt-5.4-mini | 502（无实例提供该模型） |
| gpt-5.6-sol | 502（无实例提供该模型） |
| gpt-5.6-luna | 502（无实例提供该模型） |
| gpt-5.6-terra | 200 |
| gpt-6-luna、gpt-6-sol、gpt-6.1-sol、gpt-6-astra | 200 |

能联系上的模型全部接受这对字段，包括低于 Headroom 版本门 5.4 的 gpt-5.3-codex。502 三条与字段无关：不带字段的同名请求同样无实例可服务。

## 8787 与 4140 的差异

状态码、input/output token、输出项完全一致：Headroom 对该特性只改写请求，响应原样透传。两臂唯一的差别出现在 cached 字段，由先后调用顺序造成。

## 未验证项

1. OMP 客户端收到 `tool_search_call`、`tool_search_output` 两类条目时的处理，以及这两类条目随历史进入后续请求后的行为。
2. OMP 实际发出的工具定义 token 体积（本地尝试动态导入 OMP 工具定义超时；从安装包正则提取的字符数来自整个 bundle，不代表请求体）。
3. 502 的三个模型在实例可用时是否接受字段。

## See Also

- [Responses API web_search usage 计量](web-search-usage-forensics.md)
