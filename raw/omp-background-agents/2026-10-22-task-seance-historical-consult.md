# OMP task 工具中的 seance 历史会话咨询：会话摘录

> Source: 本次用户会话、OMP task/seance 工具调用结果与本机源码摘录
> Collected: 2026-10-22
> Published: Unknown

## 用户问题与核查经过

用户先指出 `sourceSession` 只适用于 `seance`，要求用 task 工具试验。之后追问 `model` 在 schema 中是否必需、如何调用 `seance`、为什么此前提交了 schema 问题报告，以及 `seance` 是否恢复原会话、使用来源模型并把问题交给模型回答。用户随后要求实际运行 `seance` 查看结果，并继续确认来源对话如何进入上下文、是否按需搜索，以及主 agent 如何得知该使用 `seance`。

## 子 agent 探测结果

|探测|agent|model|sourceSession|结果|
|---|---|---|---|---|
|SpawnProbe|省略，默认为 `task`|省略|省略|子任务请求收到 403 `resource_exhausted` 配额错误；这次没有验证参数拒绝。|
|SpawnProbe2|省略，默认为 `task`|`opencode-zen/deepseek-v4.1-flash-free`|省略|参数校验拒绝 `model`，错误为 `model is only accepted for the seance agent`。|
|SpawnProbe3|`sonic`|省略|省略|完成，输出工作目录 `/home/cpf/code-inside/agc`。|
|SpawnProbe4|省略，默认为 `task`|省略|省略|完成，输出工作目录 `/home/cpf/code-inside/agc`。|

以上四次探测都没有把 `sourceSession` 传给非 `seance` agent。因此，非 `seance` 携带 `sourceSession` 的运行时拒绝没有在本会话中直接实测。源码检查显示同一参数校验器会对非 `seance` 的 `sourceSession` 和 `model` 做拒绝。

此前曾调用 `xd://report_issue` 报告 schema 问题。源码核查后确认：schema 字段可选性不代表字段适用于所有 agent；参数校验按 agent 限定它们的使用范围。该问题判断不应作为真实 schema 缺陷记录。当前可见工具回执不足以确认该报告是否持久化。

## Schema 与调用规则

- task schema 中 `sourceSession` 与 `model` 均为可选字段；`agent` 默认值为 `task`。
- 对 `agent: "seance"`，运行时要求 `sourceSession`；`model` 可以省略，也可以提供覆盖值。
- `sourceSession` 可指向会话 ID 或会话文件路径。

## 主 agent 与 seance 子 agent 的提示

发给主 agent 的 task 工具指引原文：

> Historical consults: use `agent: "seance"` with `sourceSession` (id/path); optional `model` overrides the saved source model.

seance 分配提示中说明：

> The fork already contains the source conversation; consult it first as the primary source. Treat it as historical evidence and answer the current request without changing the source.

这两条提示的对象不同：前者教主 agent 何时以及如何派遣 `seance`；后者说明 seance 子 agent 如何使用 fork 中的历史内容。

## Fork、模型与上下文

源码检查显示，seance 解析来源会话后创建独立的子会话并复制会话历史，来源会话保持不变。未传 `model` 时，根据来源会话保存的模型选择解析可用模型；传入 `model` 时使用显式选择。

模型上下文按子会话的活动分支构建。会话已有压缩记录时，上下文会使用压缩摘要和保留的近期消息；不能保证所有原始历史消息都进入单次模型请求。seance 可用 `read`、`grep`、`glob` 读取普通文件，但本次检查没有发现专用的 transcript 检索接口或自动按需加载完整历史的机制。

## 真实 seance 调用结果

调用时指定 `agent: "seance"`、来源会话 ID（此摘录省略具体 ID）、`effort: "med"`，没有传 `model`。问题要求列出此前 Kiro API 调研的最终候选仓库、stars、最后 push 日期和筛选依据，并解释筛选规则变更。调用完成，返回短名单：

|仓库|Stars|最后 push|PR 总数/合并|Issue 总数/关闭|
|---|---:|---|---:|---:|
|`ngosangns/ns-bridge`|3|2026-10-21|13/13|2/2|
|`d-kuro/kirocc`|68|2026-10-21|147/124|30/19|
|`ZyphrZero/kiro.rs`|489|2026-10-20|71/61|56/36|
|`minpeter/kiro-lb`|31|2026-10-17|105/97|14/13|

父 agent 将回答与原会话和现有 Kiro raw 对照。现有 raw 显示 `hank9999/kiro.rs` 为 1963 stars，`mikeyobrien/pi-provider-kiro` 为 106 stars；现有 wiki 文章把 1963 stars 归给了 `pi-provider-kiro`，需要修正。

此前核对记录还指出，原会话中的一处 `hj01857655/kiro-account-manager` 星数与现有 raw 不一致：原会话文字报 2034，raw 记录 2035。本次提炼没有重新读取原会话完整表格；该数值保持未决，不作为 wiki 结论。

## 证据边界

- 真实 seance 调用证明了该来源 ID 路径在这次请求中完成，并返回历史会话相关答案；它不证明所有来源会话都适用。
- 非 seance + `sourceSession` 的拒绝由源码核查支持，缺少直接运行时探测。
- 本次没有记录 seance 最终解析出的具体模型名称，也没有测量实际输入 token 数。
- 一次 task 的 403 配额错误与后续 task 成功均为当次观察，不能推广成持续的模型可用性结论。
