# OMP 内建工具源码常量与本会话暴露实测

> Source: 本机 OMP 源码 /home/cpf/code-inside/oh-my-pi/packages/coding-agent/src（builtin-names.ts、utils/github.ts、security/coordinator.ts、tools/report-tool-issue.ts、tools/ida.ts）；本会话 harness 暴露的工具定义
> Collected: 2026-10-11
> Published: Unknown

## 内建工具名常量（builtin-names.ts）

`src/tools/builtin-names.ts` 导出两个常量数组。

`BUILTIN_TOOL_NAMES`（30 个，按源码顺序）：

```
read, bash, edit, ast_grep, ast_edit, ask, debug, ida, eval, github,
glob, grep, find, lsp, checkpoint, rewind, context_notes, new_context,
security_scan, task, wait, todo, web_search, write, memory_edit, retain,
recall, reflect, learn, manage_skill
```

`HIDDEN_TOOL_NAMES`（3 个）：

```
yield, goal, think
```

`builtin-names.ts:40` 还有一条 legacy 别名映射 `LEGACY_BUILTIN_TOOL_NAME_ALIASES = Map([["search", "grep"]])`，`normalizeToolName` 把 `search` 规范化为 `grep`。MCP 工具名带 `mcp__<server>_<tool>` 前缀（`isMCPToolName`，`builtin-names.ts:66`）。

关键事实：`browser`、`computer`、`inspect_image`、`generate_image`、`tts`、`hub` 均不在 `BUILTIN_TOOL_NAMES` 常量里。它们是 omp.sh/docs/tools 以能力形式列出的工具，走另一套注册（eval prelude / 能力工具），不在这份核心常量。

## 本会话 harness 暴露的工具（27 个）

本会话实际暴露的内建函数（排除 MCP 工具与扩展提供的 plannotator）：

```
read, bash, edit, ast_grep, ast_edit, ask, debug, eval, github, glob,
grep, find, lsp, context_notes, new_context, security_scan, task, wait,
todo, web_search, write, memory_edit, retain, recall, reflect, learn,
manage_skill
```

对账：27 = 核心 30 − `ida` − `checkpoint` − `rewind`。`ast_grep`、`ast_edit` 都在暴露集内（本会话 `ast_grep` 可直接调用，尽管 docs 标注 `astGrep.enabled` 默认关）。

## github 工具的认证路径（utils/github.ts）

- `utils/github.ts:1`：`import { $which, isRecord } from "@oh-my-pi/pi-utils"`，用 `$which` 定位本机 `gh` 二进制再 spawn。
- `utils/github.ts:22`：`GH_COMMAND_TIMEOUT_MS = 5 * 60 * 1000`，gh 子进程 5 分钟超时。
- `utils/github.ts:26-35`：以 `GH_PROMPT_DISABLED=1`、`GIT_TERMINAL_PROMPT=0`、`GIT_ASKPASS=true` 等非交互环境启动 gh。
- `utils/github.ts:62-63`：gh 返回含 `gh auth login` 或 `not logged into any GitHub hosts` 时，错误被改写为 "GitHub CLI is not authenticated. Run `gh auth login`."。
- `utils/github.ts:66-71`：不在检出目录且未提供 `repo` 时，提示 "GitHub repository context is unavailable. Pass `repo` explicitly or run the tool inside a GitHub checkout."。

结论：github 工具的认证完全依赖本机 `gh` CLI 的登录态；它不自存凭据。

## security_scan 的执行模型（security/coordinator.ts）

- `security/coordinator.ts:48`：`SECURITY_SESSION_TOOLS = ["read", "grep", "glob", "lsp", "ast_grep", "task", "security_publish"]`。
- `security/coordinator.ts:231`：`createDefaultSecuritySession` 创建子代理会话。
- `security/coordinator.ts:234-236`：覆盖 `cfgRetryModelFallback=false`、`cfgRetryUsageAwareFallback=false`、`cfgRetryFallbackChains={}`，关闭回退链。
- `security/coordinator.ts:237-244`：`cfgTaskAgentModelOverrides` 把 `security-reviewer` 指向 `${input.model.provider}/${input.model.id}`；`cfgTaskAgentPrewalk` 设 `security-reviewer: "off"`。
- `security/coordinator.ts:260-266`：`toolNames: SECURITY_SESSION_TOOLS`、`restrictToolNames: true`、`spawns: "security-reviewer"`、`appendSystemPrompt: securityCoordinatorPrompt`、`disableExtensionDiscovery: true`、`enableMCP: false`。
- `security/coordinator.ts:271`：`autoApprove: true`；`:270` `hasUI: false`。
- `security/coordinator.ts:435-436`：`const model = input.model ?? this.#host.activeModel; if (!model) throw ... "Security scan preflight requires an active model"`。
- `security/coordinator.ts:589-595`：执行时若活动模型与 plan 记录的模型一致则复用，否则按 `plan.model.provider/modelId` 从 modelRegistry 查找；查不到报 "Security scan model is unavailable"。

结论：security_scan 另起一个受限只读子代理会话（security-reviewer 角色），默认使用当前活动模型（可由 `model` 参数覆盖），工具收窄到 read/grep/glob/lsp/ast_grep/task/security_publish，关闭 MCP 与模型回退链。

## report_issue 的落点（tools/report-tool-issue.ts）

文件头注释（`tools/report-tool-issue.ts:1-31`）记载：

- `:2`：report_issue 是 "automated QA backend for tracking unexpected tool behavior"。
- `:4-6`：没有面向模型的工具 schema；write 工具把纯文本派发到 `xd://report_issue`，系统提示让模型在此写 `<tool>: <concise description>`。
- `:8-9`：`dev.autoqa` 默认 true；`PI_AUTO_QA=0` 或显式 `dev.autoqa: false` 关闭注入。
- `:13`：`Records grievances to a local SQLite database; never throws from the device dispatch path.`
- `:24-29`：授权后对内置端点 `dev.autoqaPush.endpoint`（默认 `qa.omp.sh`）POST 待发记录，HTTP 2xx 标记已 push；服务器永久拒收（400/413/422）的行被二分隔离并带服务器错误 park，单条坏行不堵队列。`PI_AUTO_QA_PUSH=1` 在非交互环境强制 push。
- `:30-31`：设备执行从不阻塞于网络、从不抛错。

本会话 `cfg://` 实读印证：`dev.autoqa: true`、`dev.autoqaConsent: "granted"`、`dev.autoqaPush.endpoint: "https://qa.omp.sh/v1/grievances"`、`dev.autoqaPush.token: null`。

结论：report_issue 先写本地 SQLite，取得同意后把记录上报到 OMP 的 `qa.omp.sh`；不是写到 GitHub issues。

## ida 工具的动作集（tools/ida.ts）

`tools/ida.ts:36-47` 的 schema：

- `action` 枚举：`list`, `open`, `save`, `close`, `exec`, `rename`, `comment`, `set_type`, `make_function`。
- `db?`：binary 或 .i64/.idb 路径，或已开 db id（仅一个 db 打开时可省）。
- `target?`：symbol 名或 0x 地址。
- `name?`（rename）、`text?`（comment）、`repeatable?`、`decl?`（set_type 的 C 声明）、`code?`（exec 的 Python；`db` 为 ida_domain Database，命名空间按 db 持久）、`save?`（close 前是否先存，默认 true）、`timeout?`（exec 超时秒数）。

本会话未暴露 ida 工具（本机 `ida.enabled: true`，但工具不在本会话 27 个暴露函数内）。
