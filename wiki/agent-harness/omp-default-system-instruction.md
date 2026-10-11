# OMP 默认系统指令

> Sources: OMP v18.9.0 本地 bundle 核查，2026-10-11；omp.sh 官方文档，2026-10-11
> Raw: [OMP 默认系统指令本地核查](../../raw/agent-harness/2026-10-11-omp-default-system-instruction-anatomy.md); [Context files — omp docs](../../raw/omp-context-files/2026-10-11-omp-sh-docs-context-files.md)
> Updated: 2026-10-11

## Overview

本机安装的 OMP v18.9.0 将默认 system-instruction 保存为 `dist/cli.js` 内的 `cts` JavaScript 字符串模板。模板在启动时填充 skills、rules、工具引用和其他运行时内容，形成当前会话看到的指令正文；随后会话上下文还可以附加项目规则、环境信息与其他生成内容。`SYSTEM.md` 可以替换这段内建 instruction body，`APPEND_SYSTEM.md` 则保留它并追加文字。

## 内嵌位置与尺寸

本机 `omp` 解析到：

```text
/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js
```

包版本为 `18.9.0`。bundle 中 `cts` 赋值位于第 `18674` 行，`trusted coding assistant` 标记的字节偏移为 `23092773`。字符串从 `RFC 2119 keywords...` 开始，以最后的 `</critical>` 规则块结束。

解码后的模板测量值为：

| 指标 | 值 |
|---|---:|
| 字节 | 14,296 |
| 字符 | 14,221 |
| 逻辑行 | 265 |
| 单词 | 1,722 |

`wc -l` 输出为 `264`，原因是最后一行没有换行符；解码器按逻辑行分割得到 `265`。

## 模板结构

固定骨架包括：

1. RFC 2119 关键词定义与 XML system-content 处理规则；
2. `§ Role`：Engineering、Personality、Values、Tone、Escalation；
3. `§ Runtime`：Skills & Rules、Internal URLs、Tool Inventory，以及按工具表面条件出现的设备和 scratchpad 内容；
4. `§ Tool Policy`：General、Tool I/O、Specialized Tools、Exploration、AST、Delegation；
5. `§ Workflow`：Scope、Research Before Editing、Decompose、Implement、Hand-off 或 Verify、Cleanup；
6. `§ Delivery`：contract、completeness、evidence-and-output、yielding；
7. `§ Critical`：完成前不得提前结束、不得叙述 session 预算、不得重复审计已应用的编辑。

源码包含 Handlebars 风格的条件、循环和工具引用，例如 `{{#if personality}}`、`{{#each alwaysApplyRules}}`、`{{toolRefs.read}}` 与 `{{#if subagent}}`。因此 bundle 中同时存在运行时可能采用的分支；当前 session 只会收到依据工具、skills、rules 与 agent 状态渲染后的内容。

## 与会话顶部指令的关系

当前会话顶部的固定 `cts` 部分与该模板的 RFC/XML 规则及各主要 section 结构一致。渲染后会填入实际 skills、tools、Internal URLs 和规则，并根据运行状态选择分支。

会话上下文还包含模板之外的运行时内容。bundle 中 `cts` 后紧跟 `{{generatedAppend}}`；当前上下文也包含项目规则、环境信息、memory 与其他追加内容。因此这是结构对应关系，不构成完整渲染结果的字节级 diff。

## 默认状态核查

本机启动目录下的 `.omp/`、`.claude/`、`.codex/`、`.gemini/` 中均未发现 `SYSTEM.md` 或 `APPEND_SYSTEM.md`；`~/.omp/agent/`、`~/.codex/`、`~/.gemini/`、`~/.claude/` 以及已检查的 named profile agent 目录也未发现这两个文件。

因此文件核查支持当前使用内建默认模板。命令行 `--system-prompt` 与 `--append-system-prompt` 属于运行时参数，单凭磁盘文件无法证明启动命令没有携带它们；本记录的结论结合了文件核查与当前 session 结构比对。

## 与上下文文件的关系

`SYSTEM.md` 的行为由官方文档定义为替换 omp 的 built-in instruction body，并保留项目上下文、rules 与环境信息的外围内容。`APPEND_SYSTEM.md` 追加文字并保留内建指导。上下文文件的发现位置、优先级和验证方式见 [OMP 上下文文件发现与优先级](../omp-context-files/context-file-discovery-and-priority.md)。
