# OMP task 工具中的 seance 历史会话咨询

> Sources: 本机 OMP 源码与 task/seance 实测, 2026-10-22
> Raw: [会话摘录](../../raw/omp-background-agents/2026-10-22-task-seance-historical-consult.md)
> Updated: 2026-10-22

## Overview

OMP 的 `seance` 是 task 工具内的历史会话咨询 agent。主 agent 根据 task 工具指引，传入 `agent: "seance"` 和 `sourceSession`；seance 创建来源会话的独立 fork，在该 fork 的历史上下文中回答问题。来源会话保持不变。

## 主 agent 如何知道何时调用

task 工具的历史咨询指引要求主 agent 选择 `agent: "seance"` 并提供 `sourceSession`（会话 ID 或路径）；`model` 可省略，也可覆盖来源会话保存的模型选择。

这条指引面向发起调用的主 agent。seance 子 agent 另有专用分配提示，告知它 fork 已包含来源对话，应优先查阅该历史，将其作为历史证据回答当前问题，并保持来源会话不变。

## 参数适用范围

`sourceSession` 和 `model` 在整个 task 工具 schema 中都是可选字段。运行时按 `agent` 限定用途：`sourceSession` 只有在 `agent: "seance"` 时适用；seance 调用必须提供它。`model` 对 seance 可选，用于覆盖来源会话保存的模型选择。

因此，schema 中字段为可选不代表每种 agent 都能使用该字段。拒绝非 seance 调用中的 `model` 或 `sourceSession`，属于参数范围校验。

## 来源会话 fork 与模型选择

seance 接受来源会话 ID 或文件路径。它创建一个独立子会话并复制来源历史，模型从子会话上下文回答；来源会话本身不被继续写入。省略 `model` 时，OMP 根据来源会话保存的模型选择解析可用模型；显式传入 `model` 时使用该选择。

## 上下文与检索边界

上下文由子会话的活动分支构建。来源会话已有压缩记录时，模型使用压缩摘要和保留的近期消息；因此不能保证每条原始历史消息都进入单次请求。seance 提示它先读 fork 中已有的对话。

seance 的 `read`、`grep`、`glob` 可用于普通文件查找。本次源码检查没有发现专用的 transcript 查询工具，也没有发现必须逐段搜索、按命中取回原文的默认流程。

## 实测与证据边界

实际调用 seance 查询历史会话中的 Kiro API 候选清单，调用成功并返回结果。父 agent 将候选表和依据与来源会话及已有 raw 对照，发现 Kiro wiki 文章的一处 stars 归属错误，详见[现有 Kiro 文章](../ai-coding-agents/kiro-backend-api-for-agents.md)。

本次没有对非 `seance` agent 传入 `sourceSession` 执行负向测试；该行为由源码中的参数校验支持。一次 task 子任务遇到 403 配额错误，后续 task 子任务成功，因此单次错误不代表 task agent 持续不可用。本次没有记录 seance 实际解析出的模型名称，也没有测量实际输入 token 数。

## See Also

- [OMP /tan：后台 fork 分身命令](tan-command.md)
- [OMP session JSONL 格式与第三方 pi 解析器兼容性](../omp-sessions/jsonl-format-and-third-party-parsers.md)
- [OMP 内建工具全集、会话暴露边界与内部地址空间](../omp-tools/builtin-tools-and-internal-urls.md)
