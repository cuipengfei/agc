# OMP 上下文文件发现与优先级

> Sources: omp.sh 官方文档，2026-10-11
> Raw: [Context files — omp docs](../../raw/omp-context-files/2026-10-11-omp-sh-docs-context-files.md)
> Updated: 2026-10-11

## Overview

OMP 通过 `AGENTS.md`、`RULES.md`、`APPEND_SYSTEM.md` 与 `SYSTEM.md` 分层加载持久指令。普通项目指令沿目录层级组合；同一作用域的兼容 provider 依优先级 shadow；`APPEND_SYSTEM.md` 保留内建 system 指令并追加文字，`SYSTEM.md` 替换内建行为与工具使用指南。实际加载结果应通过 `/extensions` 的 Context Files 面板核对。

## 四类原生文件

- `AGENTS.md`：普通长期指令。仓库根目录适合放共享命令、约定与安全边界；更深目录可以添加局部指令。
- `.omp/AGENTS.md`：omp 专用的同名替代来源。在同一目录层级，它优先于兼容 context-file provider。
- `RULES.md`：始终应用的 sticky rules。用户级规则与最近项目 `.omp/RULES.md` 可以同时生效；`--no-rules` 会关闭它以及其他被发现的 rules。
- `APPEND_SYSTEM.md`：向 omp 内建 system instructions 追加文字，保留内建行为与工具使用指南，是文档推荐的默认扩展方式。
- `SYSTEM.md`：替换 omp 内建 instruction body。它适合刻意使用完全不同的 agent persona；项目作用域优先于用户作用域。

`SYSTEM.md` 替换的范围只覆盖内建 behavioral 与 tool-usage guidance。OMP 仍会在周围提供项目上下文、rules 与环境信息。

## 发现位置与优先级

从包含 `.omp/` 的启动目录启动时，`SYSTEM.md` 与 `APPEND_SYSTEM.md` 的直接项目搜索顺序是：

1. `<launch-directory>/.omp/`
2. `<launch-directory>/.claude/`
3. `<launch-directory>/.codex/`
4. `<launch-directory>/.gemini/`

项目位置没有命中时，再检查对应的用户目录：当前 omp profile 的 `agent/` 目录、当前 Claude 配置目录、`~/.codex/`、`~/.gemini/`。每个文件名使用第一个匹配来源。启用的 discovery provider 只有在直接搜索没有结果时，才可以为 `SYSTEM.md`补充位置；`APPEND_SYSTEM.md` 只使用直接搜索。

`--system-prompt` 与 `--append-system-prompt` 的优先级高于被发现的文件，参数可以接收 literal text 或可读取的文件路径。

对一般 context files，同一 user-wide scope 与同一 project directory depth 只保留一个 provider，优先级如下：

1. `native`
2. `claude`
3. `agents`，随后是 `codex`
4. `gemini`
5. `opencode`
6. `github`
7. `agents-md`

因此同一仓库层级同时存在 `<repo>/.omp/AGENTS.md` 与 `<repo>/AGENTS.md` 时，前者 shadow 后者，两者不会拼接。不同祖先层级的独立 `AGENTS.md` 具有不同作用域，可以正常组合。

## 目录层级与会话刷新

OMP 根据 session working directory 解析上下文。推荐的独立 `AGENTS.md` 布局会向上遍历并加载适用文件，从最通用到最局部呈现，最近的项目文件处于最具体的位置。适合 monorepo 的布局是：仓库根目录放共享规则，包目录放包专用命令，避免复制根文件。

编辑指令文件后，使用 `/new` 或重启 omp，新的 session 才会重新加载改动。`/extensions` 面板是核对加载结果的权威位置：它显示来源路径、是否启用，以及是否被更高优先级文件 shadow。

## `@path` 导入

context file 可以用 `@path` 引入共享 Markdown：

- 相对路径从包含 import 的文件解析；
- `~/...` 从 home 目录解析，绝对路径也可用；
- `@` 必须位于行首或空白之后，避免把邮箱地址当作 import；
- inline code 与 fenced code 中的 `@path` 保留为示例；
- nested import 最多跟随五跳；
- cycle 会停止；不可读取的 import 保留原始 `@path` token。

导入文本插入 token 原位置，适合小型共享策略，不适合大型生成文档。

## 验证与故障定位

验证加载结果的操作顺序：从目标目录启动 omp，输入 `/extensions`，进入相应 provider 的 **Context Files**，检查来源路径与 shadow 状态。修改后创建新 session，再次检查。

文件没有出现时，检查文件名大小写、启动目录、Markdown 可读性、最近的 `.omp` 配置目录和当前 named profile。文件显示为 shadowed 时，面板会同时列出两个来源；应删除重复文件、把局部指令移入更深目录，或从 `/extensions` 禁用不需要的 provider。

## See Also

- [OMP 默认系统指令](../agent-harness/omp-default-system-instruction.md) — `SYSTEM.md` 替换的内建 instruction body，以及 omp 默认指令模板的本地证据
