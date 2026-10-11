# OMP 内建工具全集、会话暴露边界与内部地址空间

> Sources: omp docs (Tools index), 2026-10-11; 本机 OMP 源码 + 本会话 harness 实测, 2026-10-11
> Raw: [omp.sh/docs/tools](../../raw/omp-tools/2026-10-11-omp-sh-docs-tools.md); [源码与会话实测](../../raw/omp-tools/2026-10-11-omp-builtin-tools-source-and-session.md)
> Updated: 2026-10-11

## Overview

OMP 的内建工具由两处权威定义：源码常量 `BUILTIN_TOOL_NAMES`（30 个）+ `HIDDEN_TOOL_NAMES`（3 个），以及 omp.sh/docs/tools 以能力形式列出的面向用户目录。文档比核心常量宽，多列了 6 个走另一套注册的能力型工具（browser、computer、inspect_image、generate_image、tts、hub）。某次会话实际暴露哪些工具，取决于模型、项目与设置——本会话暴露 27 个（核心 30 减去 ida、checkpoint、rewind）。工具按意图分叉、作用于不同对象，并通过一套内部地址（everything-is-a-file）把本地文件、远端主机、会话对象、GitHub、配置、进程、数据库行都包装成可读写的路径。

## 三个权威来源与它们的口径差

- **源码核心常量**（`builtin-names.ts`）：`BUILTIN_TOOL_NAMES` 30 个 + `HIDDEN_TOOL_NAMES` 3 个（`yield`、`goal`、`think`）。另有 legacy 别名 `search → grep`。
- **文档目录**（omp.sh/docs/tools）：按用途分节列能力，额外含 6 个不在核心常量里的能力型工具——`browser`、`computer`、`inspect_image`、`generate_image`、`tts`、`hub`。它们走 eval prelude / 能力工具注册，不在 `BUILTIN_TOOL_NAMES`。
- **本会话 harness 实测**：暴露 27 个内建函数 = 核心 30 − `ida` − `checkpoint` − `rewind`。`ast_grep`、`ast_edit` 均已暴露（本会话 `ast_grep` 可直接调用，尽管文档标 `astGrep.enabled` 默认关——印证"默认开关随环境变"）。

`/tools` 是文档明确指定的权威实时视图：设置、已装程序、模型支持、任务深度、自定义工具、MCP 都会改变它。

## 工具分组：作用对象、本会话可用、审批类别

文档用 Read / Write / Exec / Mixed 四个审批类别描述潜在影响（Mixed 看具体动作，例如 GitHub 读为 Read、检出推送为 Exec）。本机内建审批模式默认 `yolo`，自动放行三类。

### 查找与读取

| 工具 | 作用对象 | 本会话 | 类别 |
|---|---|---|---|
| `read` | 文件/目录/文档/笔记本/压缩包/图片/SQLite/内部地址/已知网页 | ✓ | Read（部分远端/转换路径 Exec） |
| `glob` | 文件与目录路径 | ✓ | Read |
| `grep` | 本地或受支持远端的文本内容 | ✓ | Read（SSH 搜索为 Exec） |
| `find` | 代码库行为（返回文件与行段） | ✓ | Read |
| `ast_grep` | 源码语法形状 | ✓ | Read |
| `lsp` | 代码符号 | ✓ | Mixed（查看 Read，改名/修复 Write） |
| `inspect_image` | 本地图片 | ✗ | Read |
| `web_search` | 实时互联网 | ✓ | Read |
| `github`（读侧） | GitHub 仓库/文件/issue/PR/diff | ✓ | Mixed |

### 修改与运行

| 工具 | 作用对象 | 本会话 | 类别 |
|---|---|---|---|
| `edit` | 已有文本文件 | ✓ | Write |
| `write` | 文件/压缩包成员/SQLite 行/可写内部资源 | ✓ | Write |
| `ast_edit` | 源码文件（批量改写） | ✓ | Write |
| `bash` | Shell/进程/文件系统 | ✓ | Exec |
| `eval` | 常驻内核（Python/JS 默认，Ruby/Julia 需开启） | ✓ | Exec |
| `debug` | 运行中的程序/调试器 | ✓ | Mixed |
| `browser` | 交互或重 JS 的网页 | ✗ | Exec |
| `computer` | 桌面应用/屏幕 | ✗ | Mixed |
| `security_scan` | 代码仓库 | ✓ | Exec |
| `generate_image` | 图像 | ✗ | Write |
| `tts` | 文本→音频 | ✗ | Write |
| `ida` | 二进制数据库（IDA） | ✗ | — |

### 协调、监督、恢复

| 工具 | 作用对象 | 本会话 | 类别 |
|---|---|---|---|
| `ask` | 用户 | ✓ | Read |
| `todo` | 任务清单状态 | ✓ | Read |
| `task` | 子代理 | ✓ | Exec |
| `hub` | 同级代理/后台任务/长跑进程 | ✗ | Mixed |
| `wait` | 自己起的后台任务/服务 | ✓ | — |
| `checkpoint`/`rewind` | 对话状态 | ✗ | Read |
| `new_context` | 上下文窗口 | ✓ | — |
| `context_notes` | 会话分支常驻笔记本 | ✓ | — |

### 记忆与技能（需先选记忆后端）

`recall`、`retain`、`reflect`、`memory_edit`、`learn`、`manage_skill` 本会话均暴露（后端为 mnemopi）。记忆默认关，需 `hindsight` 或 `mnemopi` 后端；`memory_edit` 仅 mnemopi；`learn`/`manage_skill` 还需 `autolearn.enabled`。`yield`、`goal`、`think` 是隐藏内部助手，不对用户开放选择。

## 三个被核验的机制

- **github 靠本机 gh 登录态**：工具用 `$which` 定位本机 `gh` 并 spawn（`utils/github.ts:1`），认证走 gh 自身登录；未登录时改写错误为 "Run `gh auth login`"（`utils/github.ts:62-63`），不在检出目录又没给 `repo` 时提示补 `repo`（`:66-71`）。
- **security_scan 另起受限只读子代理**：`createDefaultSecuritySession` 以 `security-reviewer` 角色启子会话（`coordinator.ts:231,263`），默认用当前活动模型 `input.model ?? host.activeModel`（`:435-436`），工具收窄到 `read/grep/glob/lsp/ast_grep/task/security_publish`（`:48,260-261`），关 MCP 与回退链（`:234-236,265-266`），自动批准无界面（`:270-271`）。即"同一模型的受限只读分身"，可由 `model` 参数覆盖。
- **report_issue 先本地后上报**：先写本地 SQLite（`report-tool-issue.ts:13`），取得同意后 POST 到 `dev.autoqaPush.endpoint`（默认 `qa.omp.sh`），2xx 标记已 push、坏行二分隔离（`:24-29`）；`dev.autoqa` 默认开（`:8-9`）。落点是 OMP 的 qa.omp.sh，不是 GitHub issues。

## 内部地址空间（everything-is-a-file）

工具不只操作磁盘文件，还把多类对象包装成地址。各 scheme 支持的动作不同（并非一律 read/write/grep）：

| 地址 | 指向 | 支持动作 |
|---|---|---|
| `http(s)://` | 网页 | read（`:raw` 取原始 HTML） |
| `ssh://主机/路径` | 远端文件/目录（≤1 MiB，需已验证 POSIX shell） | read/write/grep |
| `issue://<N>`、`pr://<N>`、`pr://<N>/diff` | GitHub issue/PR/diff | read |
| `agent://<id>` | 子代理输出/状态 | read；write=发消息（`agent://all` 广播） |
| `history://<id>` | 会话转录 | read（只读） |
| `artifact://<id>` | 溢出输出 | read（`:N-M`、`:raw`） |
| `local://<name>.md` | 共享工件 | read/write |
| `proc://`、`proc://<id>` | 后台作业/服务 | read；write=stdin；`/kill`、`/mode` |
| `cfg://<ns>/<key>` | OMP 设置 | read；write=会话内且需批准，`…/save` 持久化 |
| `skill://<name>` | 技能说明 | read（`/<path>` 读技能文件） |
| `omp://` | harness 文档 | read |
| `security://scans` | 安全扫描结果 | read（只读） |
| `memory://<id>` | 一条长期记忆 | read（只读） |
| `mcp://<uri>` | MCP 资源 | read |
| `xd://report_issue` | 自动 QA 记录 | write（纯文本） |
| `xd://resolve`、`xd://reject` | 暂存的 ast_edit 改写 | write（一句理由） |

此外 `read`/`write` 把本地容器当可导航文件系统：SQLite（`db.sqlite:table:key`、`?q=SELECT`）、压缩包成员（`archive.ext:member`，ZIP/tar 系/`.asar` 可写）、JSON/JSONL（`?q=<jq>`）、PDF/文档（抽取文本）、笔记本（可编辑 cell）、图片（`:img`/`:raw`）、视频（帧/时间点）、普通文本行选择器（`:50-200`、`:-60`、`:raw`）。`bash` 也认这些地址作路径。

## 设计观察：Unix 词汇 + LLM 当 shell

工具命名与"一切皆文件"深度沿袭 Unix（`grep`/`glob`/`bash` 原词，`read`/`write` 对应系统调用语感），内部地址把远端主机、子代理、配置、进程、数据库行都挂成命名空间，更接近 Plan 9。但组合方式被倒置：工具之间不互相管道，每个工具是一次独立调用、返回结构化结果交回模型，由模型充当 shell 与胶水；工具比 Unix 原版胖、按意图分叉（glob/grep/find/ast_grep/lsp 各管一种查找），且带审批护栏。此段为依据工具契约的设计判断，非源码实现断言。

## See Also

- [OMP cfg:// 配置解析：合并视图与 source 归属](../omp-config/cfg-url-resolution.md)
- [OMP 默认系统指令](../agent-harness/omp-default-system-instruction.md)
