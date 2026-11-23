# OMP xd:// 虚拟协议全集与选择性提交 ChangeJournal

> Sources: 本机 OMP 安装包源码（src/internal-urls/xd-protocol.ts、src/tools/xdev.ts、src/tools/resolve.ts、src/tools/read.ts、src/tools/eval.ts、src/sdk.ts、src/tools/settings.ts、src/commit/selective/journal.ts）与当前会话 artifacts 目录实测，2026-11-15; 本机 omp/agent/config.yml，2026-11-15; 本机 OMP 19.1.1 工具命令变更记录, 2026-11-23
> Raw: [OMP xd:// 虚拟协议三类入口与选择性提交 ChangeJournal 源码与实测摘录](../../raw/omp-tools/2026-11-15-xd-protocol-and-change-journal-source.md); [OMP 19.1.1–19.0.1 配置项增量](../../raw/omp-config/2026-11-23-omp-19-1-release-config-inventory.md)
> Updated: 2026-11-23

## Overview

对模型与开发者而言，`xd://` 是 OMP 把“按需说明书”“专门动作开关”和“不常用工具抽屉”收进 `read`/`write` 两个基础工具里的内部协议（`src/internal-urls/xd-protocol.ts:58-140`）。与此同时，OMP 在会话末尾提示模型用 `eval` 的 `commit.draft()` 代替 `git add`/`git commit`，靠的是会话 artifacts 目录下的 `changes.jsonl` 流水账和 `blobs/` 快照备份（`src/commit/selective/journal.ts:4-21`）：在多个 agent 与用户共用同一工作树时，精确认出哪些行是当前 agent 写的，只把这批行打包提交。

> **Status: Outdated** (2026-11-23)
>
> 本文关于 `xd://` 三类入口、工具抽屉与 `tools.xdev` 行为的记录属于 v19.1.0 之前。v19.1.0 已用 bash tool commands 取代 `xd://` 工具设备，把工具文档移到 `help://<tool>/<topic>`，并让 `resolve`/`reject`/`propose`/`report_issue` 成为命令。ChangeJournal 部分不受这条版本标注影响。

## xd:// 里面的三类入口（完整清单）

`XdProtocolHandler`（`xd-protocol.ts:68-140`）统一处理三类地址。前两类不依赖 `tools.xdev` 开关：第一类还要求目标工具本身在会话里存在（`#topic` 走 `session.getToolByName(name)?.docTopics?.()`，`xd-protocol.ts:131-138`，例如 `eval` 未启用时 `xd://eval/*` 报 `Tool 'eval' has no doc topics.`），第二类要求 `write` 工具在场。第三类才受 `tools.xdev` 控制。

**第一类：按需查阅的说明书 `xd://<tool>/<topic>`（用 `read` 打开）**

系统提示词平时只放一句话简介，模型用到某项高级能力时再去读完整说明（`src/tools/xdev.ts:95-97`）。全库注册了 `docTopics()` 的工具只有 `read` 和 `eval`：

| 地址 | 对模型的作用 | 默认与本机状态 | 源码位置 |
|---|---|---|---|
| `xd://read/sources` | 教模型用 `read` 选择器直接读 SQLite、压缩包、JSON/JSONL、可执行文件、视频帧、SVG、合并冲突和 write 目标 | 常驻开启 | `src/tools/read.ts:1267-1275` |
| `xd://read/urls` | 所有内部 URL scheme（`skill://`、`agent://`、`proc://`、`cfg://` 等）的完整子路径与参数语法 | 常驻开启 | `src/tools/read.ts:1270` |
| `xd://eval/judge` | 在 `eval` 里调用 `judge`、`judge_batch`、`completion` 做分类与批量打分 | 常驻开启 | `src/tools/eval.ts:238` |
| `xd://eval/helpers` | `%load`、`%pip`、`%bun add`、`budget`、`@tool` 用法 | 常驻开启 | `src/tools/eval.ts:239` |
| `xd://eval/agents` | 在 `eval` 内核里用 `agent` 与 `workpool` 跑后台子代理与 DAG | 允许派发子代理时常驻 | `src/tools/eval.ts:241` |
| `xd://eval/commit` | 选择性提交 `commit.draft()` / `take` / `drop` / `only` / `commit` | `commit.enabled` 默认 `true`（`settings.ts:733`），本机开启 | `src/sdk.ts:2850` |
| `xd://eval/archive` | 只读查询近期项目、历史会话摘要与历史 prompt | `archive.enabled` 默认 `true`（`settings.ts:720`），本机开启 | `src/sdk.ts:2846` |
| `xd://eval/ratchet` | 建立评测集并一轮轮爬山优化 LLM 流程 | `ratchet.enabled` 默认 `false`（`settings.ts:708`），本机 `config.yml:486` 显式设为 `true`；也可由 `/ratchet` 按会话开启 | `src/sdk.ts:2842` |
| `xd://eval/browser` | 内置浏览器控制 | 本机 `config.yml:504` 设 `browser.enabled: false`，当前不挂载 | `src/sdk.ts:2834` |
| `xd://eval/computer` | 桌面 GUI / Computer Use 控制 | `computer.enabled` 默认 `false`，本机 `config.yml:479` 为 `false`，当前不挂载 | `src/sdk.ts:2838` |

**第二类：4 个常驻动作开关 `xd://<device>`（用 `write` 写入纯文本触发）**

模型向这 4 个地址写一句话即可触发宿主动作，不需要 JSON schema，也不受 `session.xdev` 是否挂载影响（`xd-protocol.ts:39-40, 86-93`）：

| 地址 | 写入内容（纯文本） | 触发的行为 | 审批档位与源码位置 |
|---|---|---|---|
| `xd://resolve` | 一句话理由 | 正式应用（apply）当前暂存的 `ast_edit` 或工具预览修改 | `read` 档（`src/tools/resolve.ts:42, 57-58`） |
| `xd://reject` | 一句话理由 | 丢弃（discard）当前暂存的 `ast_edit` 或工具预览修改 | `read` 档（`src/tools/resolve.ts:43, 59-60`） |
| `xd://propose` | 计划 `<slug>`（对应 `local://<slug>-plan.md`） | 在 `/plan` 模式下把计划推给用户弹窗审批 | `read` 档（`src/tools/resolve.ts:44, 61-63`） |
| `xd://report_issue` | `<tool>: <问题描述>` | 记录工具实际输出与文档不符的自动 QA 报告 | `write` 档（`xd-protocol.ts:39, 86-89`） |

**第三类（v19.1.0 前）：收纳不常用工具的动态抽屉 xd:// 与 xd://<tool>（受 tools.xdev 控制）**

当 `tools.xdev: true` 时，OMP 把所有 `loadMode === "discoverable"` 的工具——减去传输工具 `XDEV_TRANSPORT_TOOLS`（`read`、`write`）和固定顶层工具 `XDEV_KEEP_TOP_LEVEL`（`todo`、`yield`、`ask`、`grep`、`web_search`）——从顶层工具数组卸下，挂进 `xd://`（`src/tools/xdev.ts:59-89`）：

- `read xd://`：通过 `xdevListing` 列出当前挂载的全部设备清单；
- `read xd://<tool>`：读取该工具的说明与 TypeScript 参数定义；
- `write xd://<tool>`：写入 JSON 参数对象执行该工具。

本机 `omp/agent/config.yml:116` 显式配置了 `xdev: false`，相当于拆掉抽屉、把所有工具直接摊在顶层供模型调用，因此 `session.xdev` 为空，调 `read xd://` 会直接返回 `xd:// is not mounted in this session.`（`xd-protocol.ts:22, 126`）。

## 编辑记录保存在哪：ChangeJournal 与选择性提交

当多个 agent 或用户在同一目录改代码时，常规 `git add` / `git commit -a` 会把别人改了一半的文件一起塞进提交。OMP 的 `commit.draft()` 通过会话级 `ChangeJournal` 解决这一问题（`src/commit/selective/journal.ts:1-80, 211-234`）。

**保存路径**

保存在当前根会话的 artifacts 目录下（子代理复用父会话的同一个 artifacts 目录，因此整棵 agent 树共用同一份账本，`journal.ts:4-6`）：

`~/.omp/agent/sessions/<编码工作目录>/<时间戳>_<会话UUID>/`

例如本会话在仓库 `/home/cpf/code-inside/agc` 下的实际目录为：
`~/.omp/agent/sessions/-code-inside-agc/2026-11-15T04-47-06-877Z_01a1dd87-cc7d-72dd-bbb3-a981f7ae0540/`

**两类持久化文件**

1. **`changes.jsonl`（追加写入的操作流水账）**：每次操作追加一行 JSON，共有三种记录（`journal.ts:32-80`）：
   - `"type": "change"`：每次 `write`、`edit`、`ast_edit`、`task` 修改文件时记录，字段含时间戳 `at`、操作者 `agent`（如 `"Main"`）及 `parent`、工具名 `tool`、文件绝对路径 `path`、修改前快照键 `before`（新建文件为 `null`）、修改后快照键 `after`（删除文件为 `null`）、修改前时间戳 `beforeMtimeMs`。
   - `"type": "call"`：每次运行 `bash` 或 `eval` 时记录起止毫秒时间窗 `start`–`end` 和单行摘要 `label`，用来识别脚本或格式化器在调用期间改写的文件。
   - `"type": "commit"`：每次通过选择性提交流程生成提交后，记录 commit `sha` 与相对路径列表 `paths`。
2. **`blobs/<size_base36>-<hash_base36>`（修改前后的全文压缩快照）**：只要单文件字节数不超过 `MAX_BLOB_BYTES = 8 * 1024 * 1024`（8 MiB），`#storeBlob` 会把修改前、修改后的完整 UTF-8 内容用 `Bun.gzipSync` 压缩，按 `` `${bytes.byteLength.toString(36)}-${Bun.hash(bytes).toString(36)}` `` 命名写入同目录的 `blobs/` 子目录（`journal.ts:18-21, 223-233`）。例如本会话实际生成的快照文件名为 `6d07-13j68975fx6lc`、`7re-ymzrimfnhtdi` 等。

模型调用 `d = await commit.draft()` 时，OMP 读取 `changes.jsonl` 和 `blobs/`，把 HEAD 到当前工作树的每一行改动按写入者归属，自动预选当前 agent 及其子代理写过的行，并在私有 git index 上构建 commit，完全不触碰工作树或他人已暂存的内容。

## 证据边界

- `xd://` 路由、3 类入口清单与 `ChangeJournal` 存储结构均由本机 OMP 安装包源码直读与当前会话 artifacts 目录实测核实。
- 未展开 `src/commit/selective/attribution.ts` 内部逐行 diff 归属算法的细节。

## See Also

- [OMP 内建工具全集、会话暴露边界与内部地址空间](builtin-tools-and-internal-urls.md) — 30 个内建工具与全部内部 URL scheme 总览
- [OMP Prewalk：规划后切换模型](../omp-prewalk/prewalk.md) — `write xd://<device>` 触发 prewalk 模型切换的机制与 `tools.xdev: false` 缓解
- [OMP 配置语义手册](../omp-config/config-semantics.md) — `tools.xdev` 与 `tools.xdevDocs` 配置项含义
- [OMP 19.1.1–19.0.1 配置项增量](../omp-config/release-config-changes-19-1-1-to-19-0-1.md)
