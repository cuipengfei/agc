# Antigravity 系统提示词单句 429：本机逐词对照实验

> Source: 2026-11-18 本机会话；`agy` 1.5.10 经真实 `@agentclientprotocol/sdk` 客户端的 ACP 实测；OMP 18.22.0 安装包源码 `prompts/system/system-prompt.md` 与 `mcp/config.ts`；can1357/oh-my-pi issues 11794、18706、19318、19319、19333、19388；router-for-me/CLIProxyAPI issues 5751、7553、7560
> Collected: 2026-11-18
> Published: Unknown

## 待测文本在安装包中的位置

OMP 18.22.0 的模板文件 `packages/coding-agent/src/prompts/system/system-prompt.md` 为 13,550 字节，第 1 行为：

```text
You are omp's trusted coding assistant.
```

本机 `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/prompts/system/system-prompt.md` 的 `wc -c` 与 `grep -n` 分别返回 `13550` 与 `1:You are omp's trusted coding assistant.`。

该模板文件是渲染前的 Handlebars 源文本，实际发出的请求体包含渲染后注入的工具描述块。本次定位使用 ACP 会话记录里的渲染结果，不使用模板文件作为对照输入。

## 固定实验条件

- 客户端：本机脚本通过 `@agentclientprotocol/sdk` 的 `ClientSideConnection` 与 `ndJsonStream` 驱动子进程 `agy acp --gemini-dir <既有隔离目录>`。
- 认证：沿用 OMP 已登录的隔离配置目录，环境变量 `SSH_TTY=omp-agy-file-auth`；不读取、不打印任何令牌。
- 协议序列：`initialize`（协议版本 1）、`session/new`、`session/set_config_option`（model、thought_level）、`session/prompt`。
- 模型：`gemini-3.8-flash`；思考等级：`High`。
- 候选文本位置：`session/new` 的 `_meta.antigravity.systemPrompt.append`，即系统指令槽位（记录中 `role` 为 `system`）。
- 用户消息固定为 `Say OK only.`。
- 不加载 OMP 扩展，不传 `--ide-mcp-port`，不启用工具桥。
- 每个候选新建一个 `agy acp` 子进程；各自 65 秒截止。收到首条 429 通知即结束该候选并终止子进程，避免 `agy` 内部退避重试放大请求量。
- 判定：`OK` 表示收到 `stopReason: end_turn` 且回复正文为 `OK`；`429` 表示收到 `RESOURCE_EXHAUSTED` 通知。

## 15 条对照记录

记录合并自同一会话的三份结果文件，字段为候选标签、候选文本、结果、耗时秒数、通知字符数。无 503、无认证错误、无网络错误，无中途停止。

| 标签 | 系统提示词追加文本 | 结果 | 耗时 (s) | 通知字符 |
|---|---|---|---:|---:|
| control-before | You are a helpful coding assistant. | OK | 7.43 | 2 |
| original-system | You are omp's trusted coding assistant. | 429 | 5.13 | 105 |
| omp-alone | omp | OK | 7.77 | 2 |
| possessive-alone | omp's | OK | 7.19 | 2 |
| replace-omp | You are pi's trusted coding assistant. | OK | 7.12 | 2 |
| replace-trusted | You are omp's helpful coding assistant. | OK | 6.91 | 2 |
| control-after | You are a helpful coding assistant. | OK | 7.82 | 2 |
| possessive-trusted-pair | omp's trusted | OK | 8.76 | 2 |
| omit-you | are omp's trusted coding assistant. | OK | 7.73 | 2 |
| omit-are | You omp's trusted coding assistant. | OK | 7.24 | 2 |
| omit-omp | You are trusted coding assistant. | OK | 6.39 | 2 |
| omit-trusted | You are omp's coding assistant. | OK | 6.82 | 2 |
| omit-coding | You are omp's trusted assistant. | OK | 6.47 | 2 |
| omit-assistant | You are omp's trusted coding. | OK | 7.01 | 2 |
| original-system | You are omp's trusted coding assistant. | 429 | 5.18 | 105 |

两条 `original-system` 分别位于首批与末批；`control-before` 与 `control-after` 为同一句中性和对照，位于两端。

## 槽位边界

15 条记录的 `role` 全部为 `system`。本次实验只覆盖 `_meta.antigravity.systemPrompt.append` 槽位；普通对话轮次里的用户消息槽位在同一脚本中没有执行过对照。

`agy` 返回 429 时的通知长度为 105 字符，与 `agy` 内部重试横幅 `⚠ API error (attempt N): RESOURCE_EXHAUSTED (code 429): Resource has been exhausted (e.g. check quota).` 一致；成功回复 `OK` 的通知长度为 2 字符。

## 本机配置侧的两处改动

### 系统提示词替换扩展

本机扩展 `~/.omp/agent/extensions/antigravity-prompt-adapter.ts`（37 行）监听 `before_agent_start`，在 `ctx.model?.provider === "antigravity-cli"` 时把 `event.systemPrompt` 各段中的 `You are omp's trusted coding assistant.` 替换为 `You are a helpful coding assistant.`。仓库副本为 `omp/agent/extensions/antigravity-prompt-adapter.ts`，由 manifest 的 `omp/agent/extensions` 目录条目同步。

对应单元测试位于 `~/.omp/agent/extension-tests/antigravity-prompt-adapter.test.ts`（5,164 字节）；manifest 没有 `~/.omp/agent/extension-tests` 条目，因此该测试文件不在仓库同步范围内。

### MCP 服务器抑制

OMP `src/mcp/config.ts` 从用户级 `mcp.json` 读取顶层 `disabledServers` 数组（第 128 行），并在 `suppressServer`（第 141–145 行）中抑制命中名字的服务器。本机 `~/.omp/agent/mcp.json` 第 2 行为 `"disabledServers": ["search-tavily"],`。

### 用户在真实会话中的确认

扩展修好 `ctx.model` 那处后，用户在实际 OMP 会话中回了一句 `ok, it worked`。这一句是本机扩展生效的用户报告；`disabledServers` 抑制后的完整 E2E 由用户自行执行，本次没有收到该轮的结果回报。

## 外部交叉证据摘录

以下为公开仓库 issue 中与本机现象同型的对照记录，用于核对触发粒度与历史演进；各项均为第三方用户报告。

- can1357/oh-my-pi 11794（2026-09-11）：`<system-conventions>` 块相关；仅把标签名由 `system-conventions` 改为 `conventions` 即恢复 200。
- can1357/oh-my-pi 18706（2026-11-10）：`RFC 2119 keywords: MUST, REQUIRED, SHOULD, RECOMMENDED, MAY, OPTIONAL.` 命中 429；同一报告中 `You are omp's trusted coding assistant.` 单独发送返回 200。
- can1357/oh-my-pi 19318 / 19333（2026-11-15）：`Read xd://<tool> for full docs + JSON schema before first use.` 命中 429；去掉 `before first use` 恢复 200，`<tool>` 换 `<zebra>` 恢复 200。
- can1357/oh-my-pi 19319：`agy` 把重试横幅经 `agent_message_chunk` 作为助手正文发出，OMP 循环守卫在 8 个近似片段后报 `Thinking loop detected`；同帖讨论 `## functions` 工具描述块与 `--ide-mcp-port`。
- router-for-me/CLIProxyAPI 5751：`<system-conventions>` 与 `RFC 2119: MUST, REQUIRED, SHOULD, RECOMMENDED, MAY, OPTIONAL.` 的组合触发 429；`You are Codex, an agent based on GPT-5.` 触发 429，而 `You are Codex.` 与 `You are an agent based on GPT-5.` 各自返回 200。
- router-for-me/CLIProxyAPI 7553 / 7560：Claude Code、ZCode、OpenCode、DeepSeek Harness、AstrBot、Hermes 等客户端的系统提示词片段触发 429；2026-11-15 记录显示 `U+200B`、`U+034F` 零宽字符混淆对这些短语已不能绕过，字面替换（如 `DeepSeek Harness` → `Assistant Framework`）可恢复 200。

## 定位阶段的相邻文本测试

收敛到单句之前，同一会话在相同 ACP 条件下分别单独发送过下列相邻文本，均返回 `OK`：

```text
# Engineering
- Correctness, then six-month maintainability.
Delete dead weight; prefer boring design to needless abstraction.
- Compiled code: NEVER avoidable allocation
```

把身份句与 `# Engineering` 拼在一起发送则返回 `429`。该阶段为定位用的变体测试，与上表 15 条最终对照分开记录。

## 证据边界

- 可核对：上表 15 条记录的候选文本、结果、耗时与通知长度；`system-prompt.md` 的 13,550 字节与第 1 行内容；`mcp/config.ts` 的 `disabledServers` 读取与 `suppressServer` 分支。
- 未测试：用户消息槽位、标点与大小写变体、多轮重复抽样。
- 未知：Google 后端匹配规则的实现形态（字面包含、分词序列或规范化比较），以及规则库的更新节奏。
