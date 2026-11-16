# workpool `yield` 参数为空的失败形态与归因边界

> Source: 本会话 `eval` workpool 运行记录（pool `omp-annotations`）、`@oh-my-pi/pi-coding-agent` v18.20.3 `src/tools/yield.ts`、`.omp/agent/sessions/.../omp-annotations-3.jsonl`、`tool` 报错文本
> Collected: 2026-11-16
> Published: Unknown

## A. 现象

`eval` 中用 `workpool()` 建池 `omp-annotations`，三个 `builder` 工作者各领一项任务。每项任务要求结束时调用 `yield` 提交 `{key, data}` 或 `{key, error}`。

实际发生的调用：

```text
arguments: {}
```

本机返回：

```text
key must be one of: 1
```

同一工作者连续重复该调用五次（session 记录行 118–146）。这一现象在三个工作者与三条池项上都出现。

## B. 本机 `yield` 的参数要求

`src/tools/yield.ts` 中，workpool 模式下 `yield` 的参数声明包含：

- `key`：必填，取值为当前池中待提交项的编号；
- `data`：结构化结果；
- `error`：错误说明。

缺少合法 `key` 时，调用被拒绝，`data`/`error` 即使存在也不被接受。

## C. 影响

- 三条池项全部标记为 failed。
- 其中至少两项的调查与编辑已经完成并写入了仓库；工作成果保留，交付报告没有返回。
- 主代理只能从 `history://` 与 session JSONL 中重建结论。

## D. 可用的交付路径

对同一批调查改用带 `outputSchema` 的 `agent()` 句柄后，两个子代理均正常返回结构化结果。该路径不经过 workpool 的 `yield` 参数。

## E. 归因边界

已确定：

- 本机拒绝行为符合 `yield` 的参数声明；
- 会话层保存的调用参数确实为空对象。

未确定：

- 模型生成时参数即为空；
- 服务端或中转在传递中丢失参数；
- 本地流式解析把参数变成空对象。

区分三种情况需要同一请求的配对记录：实际出站的 `yield` 工具声明，以及服务返回的原始流式 tool-call 参数。本次会话没有保存这对记录，历史 session 只保留了解析后的参数。

## F. 观察到的排查线索

- 三个工作者都能正常调用 `read`、`grep`、`edit` 等其他工具，工具面没有整体失效。
- 失败集中在 `yield` 这一带必填 `key` 的工具。
- 本机请求适配扩展（`opencode-request-adapter.ts`）在 `appendRead` 分支追加 `read` 工具声明，未发现改写既有工具参数的逻辑。
