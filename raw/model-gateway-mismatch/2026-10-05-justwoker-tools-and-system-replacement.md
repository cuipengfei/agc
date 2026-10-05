# JustWoker 运行时替换客户端 Tools 与 System 的实测

> Source: 本会话实测（2026-10-04 至 2026-10-05）
> Collected: 2026-10-05
> Published: Unknown

## Tools 数组被替换

发 5 个带 `xyzzy_` 前缀的假工具给 `/v1/messages`，问模型「列出你实际能调用的工具名」。模型回答：`read_tabular`、`system_todo_write`。我发的 5 个工具一个都没到达模型。

## 原生透传实测

逐个测试工具名是否原生透传（模型能否以 tool_use 块调用）：

| 发送的工具名 | 模型实际调用 | 判定 |
|---|---|---|
| `read` | `read({"input":"probe"})` | 透传 |
| `write` | `write({"content":"probe","file_path":"/tmp/probe"})` | 透传 |
| `bash` | `read_tabular({"input":"probe"})` | 被替换 |
| `edit` | `system_todo_write({"todos":[...]})` | 被替换 |
| `web_search` | `read_tabular({"input":"probe"})` | 被替换 |

## System 提示的处理

三档体量探针（50K / 120K / 180K 字符 filler + 尾部独特标记）：

- 50K、120K：模型读到标记（YES）
- 180K：new-api 返回 `model_not_found`（渠道临时摘掉，未测成）

模型报告系统提示的「结尾」永远是运行时的 function_calls 指引，不是客户端 system 的结尾。运行时的行为是**追加**自己的指令到客户端 system 之后，不是替换。但 OMP 真实请求（~176K system）里注入的工具目录模型没看到——体量太大被淹没。

## 运行时身份

邻居 OMP session（herdr w4:p1）的模型逐字倒出自己的上下文：

- 头部是通用 invoke 模板（"In this environment you have access to a set of tools..."），不是 OMP 的系统提示
- `read_tabular` 的 schema 里内嵌完整 Snowpark stored procedure 源码（`SnowflakeFile.open` + openpyxl/xlrd + pandas exec）
- `system_todo_write` 是 todo 管理工具
- 上下文里没有 AGENTS.md、没有 project-context、没有任何 OMP 用户规则

## 独立第三方验证

`abdurrehmandaudi/justdowork-proxy`（2026-10-04 创建，4 stars）：另一个用户独立对同一 relay 做了同方法探测（names_probe.py 发 44 个候选工具名），结论一致：relay 只原生透传 read/write/edit/bash 四个工具名（其中 bash/edit 与我们实测结果冲突，可能随时间或路由变化），其余全走文本协议仿真。
