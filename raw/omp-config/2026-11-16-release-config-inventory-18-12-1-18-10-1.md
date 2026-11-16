# OMP 18.12.1–18.10.1 十个 release 的配置项增量

> Source: https://github.com/can1357/oh-my-pi/releases/tag/v18.12.1 ; .../v18.12.0 ; .../v18.11.3 ; .../v18.11.2 ; .../v18.11.1 ; .../v18.11.0 ; .../v18.10.4 ; .../v18.10.3 ; .../v18.10.2 ; .../v18.10.1（逐份完整 release body；本机 OMP 18.20.3 设置注册表与用户级 `~/.omp/agent/config.yml` 对照）
> Collected: 2026-11-16
> Published: Unknown（各 release 发布时间见下表）

## 范围与顺序

GitHub `repos/can1357/oh-my-pi/releases` 按发布时间排序，前 40 条中第 31–40 条为本文件的十个版本。发布日：

| 顺序 | tag | published |
|---|---|---|
| 31 | v18.12.1 | 2026-10-17 |
| 32 | v18.12.0 | 2026-10-17 |
| 33 | v18.11.3 | 2026-10-16 |
| 34 | v18.11.2 | 2026-10-16 |
| 35 | v18.11.1 | 2026-10-15 |
| 36 | v18.11.0 | 2026-10-14 |
| 37 | v18.10.4 | 2026-10-13 |
| 38 | v18.10.3 | 2026-10-12 |
| 39 | v18.10.2 | 2026-10-12 |
| 40 | v18.10.1 | 2026-10-12 |

调查方法：一次 `gh api "repos/can1357/oh-my-pi/releases?per_page=40"` 取回完整正文；用本机注册表导出的键 ID 清单（`.agents/skills/omp-configs/cache/settings.json`）构造正则，对每个 release body 的 `- ` 条目逐行匹配，命中行再人工阅读确认；`v18.10.1` 的正文只有 TUI/native 渲染命名（`omp.turn.copy`、`omp.context.*`、`omp.editor.*` 等），没有本范围内的持久配置项。

去重教训：前一轮答复把已在更早 20 个版本中介绍过的设置再次逐项列出（`bash.gitGuard`、`edit.mode`、`async.widgets`、`task.softRequestBudget`、`retry.fallbackChains` 等），用户指出范围错误。增量调查必须先建立「已覆盖清单」，只输出新版本带来的新增与变化；纯背景引用、只改说明文字的项不计入。

## config.yml 新增键

| 版本 | 键 | 允许值 | 默认值 | 本机值 |
|---|---|---|---|---|
| v18.12.1 | `advisor.continueSeverity` | `nit` / `concern` / `blocker` | `concern` | `concern`（显式） |
| v18.12.0 | `sharpshooter.minPromptLength` | 数字；正文写 minimum `2` | `16` | `16`（未显式） |
| v18.12.0 | `statusLine.segmentOptions.pi.showProfile` | 布尔值 | 代码为 `showProfile === false` 时隐藏，其余显示 | 未配置 |
| v18.11.3 | `prewalk.auto` | `off` / `suggest` / `on` | `off` | `off`（未显式） |
| v18.11.3 | `prewalk.autoTarget` | 模型或角色选择器 | `@smol` | `@smol`（未显式） |
| v18.11.2 | `lsp.requestTimeout` | 秒数；`lsp` 工具调用范围 `5`–`300`，工具默认 `20` 秒 | `10` | `10`（未显式） |
| v18.10.4 | `gc.compress` | 布尔值 | `false` | `false`（未显式） |
| v18.10.4 | `gc.compressAfterDays` | 非负天数 | `7` | `7`（未显式） |
| v18.10.2 | `task.structured` | 布尔值 | `false` | `true`（显式） |

说明：

- `advisor.continueSeverity`：v18.12.1 起，agent 给出最终答复后出现的 advisor `concern` 默认会继续运行；设为 `blocker` 可恢复此前行为。
- `sharpshooter.minPromptLength`：按用户可见字符（grapheme）计数，小于下限时按 `MIN_PROMPT_LENGTH_FLOOR` 与设置值的较大者处理；`/` 开头的命令消息不提取。
- `statusLine.segmentOptions.pi.showProfile` 与 release 正文里的 `pi.showProfile` 是同一选项对象的两种写法，不另算一个键。
- `lsp.requestTimeout` 在 `resolveLspTimeouts` 中决定 server 等待时间，同时把整个调用期限抬到不低于该值。

## 受影响既有键

| 版本 | 键 | 本次变化 | 允许值 | 默认值 | 本机值 |
|---|---|---|---|---|---|
| v18.12.0 | `providers.cacheWarming` | Google Antigravity 上的 Claude 声明 5 分钟 prompt cache 时长后即可预热；Gemini 仍不预热 | `off` / `streaming` / `idle` | `idle` | `idle`（显式） |
| v18.11.1 | `compaction.thresholdTokens` | 修复 length-stop 恢复把已丢弃输出计入阈值 | 数字；`-1` 走自动 | `-1` | `-1`（显式） |
| v18.11.1 | `retry.waitForUsageReset` | 自动 compaction 现在遵守该设置 | 布尔值 | `false` | `false`（未显式） |
| v18.11.0 | `retry.modelFallback` | 说明与 Auto-Promote Context 独立；关闭后 `retry.fallbackChains` 的模型切换停止 | 布尔值 | `true` | `true`（显式） |
| v18.11.0 | `task.agentAccountPools` | fallback 遇到不在该 subagent 池内的 provider 时跳过并尝试下一项 | agent 名 → provider → OAuth 身份键数组 | `{}` | `{}`（未显式） |
| v18.10.4 | `read.renderMarkdown` | 普通文件读取的内联预览也遵守该设置 | 布尔值 | `false` | `true`（显式） |
| v18.10.3 | `snapcompact.toolResults` | 大型工具结果从首次发送起即图像化，避免下一回合重复发送破坏缓存 | 布尔值 | `false` | `false`（显式） |
| v18.10.3 | `compaction.keepRecentTokens` | 修复 signed thinking 按签名字节计导致只保留约一半预算 | Token 数 | `20000` | `20000`（显式） |
| v18.10.3 | `snapcompact.shape` | 仅修复设置预览的标签与样例 | 见下方枚举 | `auto` | `auto`（显式） |

`snapcompact.shape` 枚举（18 项）：`auto`、`8x8r-bw`、`8x8r-sent`、`8x8u-bw`、`8x8u-sent`、`6x6u-bw`、`6x6u-sent`、`5x8-bw`、`5x8-sent`、`6x12-dim`、`8x13-bw`、`8on16-bw`、`8on22-bw`、`11on16-bw`、`silver16-bw`、`doc-8on16-bw`、`doc-8on16-sent`、`doc-8on16-sent-dim`。

`compaction.keepRecentTokens` 修复细节：Claude signing 会话里每个保留回合按 signature 大小计数，导致实际保留量约为设置的一半；改为按整轮 reasoning 计费口径。

## 其他配置文件

| 版本 | 文件与字段 | 作用 | 允许值 | 默认值 | 本机值 |
|---|---|---|---|---|---|
| v18.11.0 | agent frontmatter 的 `structured` | 全局 `task.structured` 关闭时，该 agent 的 task 仍保留 `yield` 与 schema 校验 | 布尔值 | 未设置 | 用户级 5 个自定义 agent 均未设置 |
| v18.11.3 | `models.yml` 的 `imageCountBudget` | 自定义模型或 override 的单次请求图片上限 | 正整数；schema 要求 `positive integer` | 按 host 规则；未知 host 为 `5` | 无显式覆盖 |
| v18.12.0 | `models.yml` 的 `contextWindow`、`maxTokens` | 自定义模型的显式值优先于该模型 id 的 catalog 限制规则 | 正整数 | 由模型目录决定 | 见下表 |
| v18.10.2 | `models.yml` 的 `compat.honorsClaudeCodeBetaKillSwitch` | 决定模型是否遵守 `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | 布尔值 | 由 provider 与模型规则决定 | 无显式覆盖 |
| v18.11.1 | `lsp.json` 的 `initOptions` | language server 初始化选项；复用 shared server 时应用更新后的值 | 对象 | 各 server 不同 | 用户级 `~/.omp/agent/lsp.*` 不存在 |
| v18.10.4 | `keybindings.yml` 的 `app.approval.approve` | 直接批准当前工具调用 | 按键或按键数组 | `ctrl+enter`、`ctrl+q` | 用户级未覆盖 |
| v18.10.2 | `keybindings.yml` 的 `app.tree.previousBranch`、`app.tree.nextBranch` | `/tree` 内分支切换 | 按键或按键数组 | `[]`（未绑定） | 用户级未覆盖 |

`lsp.json` 的配置文件优先级（来自 `lsp/config.ts`）：项目根 `lsp.json`/`.lsp.json`/`lsp.yml`/`.lsp.yml`/`lsp.yaml`/`.lsp.yaml`，其次项目配置目录 `.omp/lsp.*`、`.pi/lsp.*`、`.claude/lsp.*`，再次用户配置目录 `~/.omp/agent/lsp.*`、`~/.pi/agent/lsp.*`、`~/.claude/lsp.*`，最后 home 根目录 `~/lsp.*`、`~/.lsp.*`。

## models.yml 显式 contextWindow / maxTokens（本机）

| provider / model | contextWindow | maxTokens |
|---|---|---|
| openai-codex/gpt-5.6-luna | 1050000 | 128000 |
| c8787/gpt-5.3-codex | 272000 | 24000 |
| c8787/gpt-5.4-mini | 272000 | 24000 |
| c8787/gpt-5.6-sol | 400000 | 58000 |
| c8787/gpt-5.6-terra | 400000 | 62000 |
| c8787/gpt-5.6-luna | 1050000 | 128000 |
| c8787/gpt-6-luna | 1000000 | 128000 |
| c8787/gpt-6-sol | 400000 | 55000 |
| c8787/gpt-6.1-sol | 400000 | 55000 |
| c8787/gpt-6.1-terra | 400000 | 55000 |
| c8787/gpt-6-astra | 400000 | 58000 |
| c8787/gpt-6-luna-decisions | 1000000 | 未写 |
| c8787-chat/gemini-3.8-flash | 1048576 | 65536 |
| c8787-chat/gemini-4-argon | 1048576 | 65536 |
| kimi-claw/k3-agent | 262144 | 未写 |
| kimi-claw/k2d8-preview | 262144 | 未写 |
| sensenova/deepseek-v4-flash | 1048576 | 65536 |
| sensenova/deepseek-flash | 1048576 | 65536 |
| sensenova/deepseek-v4.1-flash | 1048576 | 65536 |
| sensenova/glm-5.2 | 1048576 | 131072 |
| sensenova/glm-5.3 | 1048576 | 131072 |
| sensenova/kimi-k3 | 1048576 | 65536 |
| sensenova/sensenova-6.8-flash | 262144 | 65536 |
| sensenova/sensenova-6.8-flash-lite | 262144 | 65536 |
| sensenova/sensenova-u1.5-lite | 262144 | 65536 |

## 环境变量

| 版本 | 变量 | 作用与取值 | 默认行为 | 当前进程 |
|---|---|---|---|---|
| v18.12.0、v18.12.1 | `PI_REQUEST_COMPRESSION` | 控制支持的 provider 的请求体压缩；`$flag("PI_REQUEST_COMPRESSION", true)`，`0` 关闭；v18.12.1 增加代理拒绝压缩时自动重发未压缩请求并停止对该 host 压缩 | 开启 | 未设置 |
| v18.10.2 | `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | 仅当模型 `compat.honorsClaudeCodeBetaKillSwitch === true` 时生效，省略实验性 beta 头与字段 | 关闭 | 未设置 |
| v18.11.0 | `OMP_BUILD_LABEL` | 给 session 条目附加 omp build 信息 | 未设置 | 未设置 |
| v18.11.2 | `OPENAI_CODEX_OAUTH_TOKEN` | Codex OAuth 环境认证；v18.11.2 修复仅设置该变量时 web search 缺 OAuth credential | 未设置 | 未设置（只记录是否设置） |
| v18.11.3 | `GITHUB_TOKEN`、`GH_TOKEN` | 下载工具查询 GitHub release 时使用，避免匿名 API 额度 | 未设置 | 均未设置 |
| v18.11.2 | `MNEMOPI_STATED_WEIGHT` | stated 类记忆的 recall 分数乘数；负数运行时按 `0` | `1.0` | 未设置 |
| v18.11.2 | `MNEMOPI_INFERRED_WEIGHT` | inferred 类乘数 | `0.7` | 未设置 |
| v18.11.2 | `MNEMOPI_TOOL_WEIGHT` | tool 类乘数 | `0.5` | 未设置 |
| v18.11.2 | `MNEMOPI_IMPORTED_WEIGHT` | imported 类乘数 | `0.6` | 未设置 |
| v18.11.2 | `MNEMOPI_UNKNOWN_WEIGHT` | unknown 类乘数 | `0.8` | 未设置 |
| v18.11.2 | `MNEMOPI_TIER1_WEIGHT` | episodic 第 1 降级层乘数 | `1.0` | 未设置 |
| v18.11.2 | `MNEMOPI_TIER2_WEIGHT` | 第 2 层乘数 | `0.85` | 未设置 |
| v18.11.2 | `MNEMOPI_TIER3_WEIGHT` | 第 3 层乘数 | `0.7` | 未设置 |

`true`、`likely_true`、`false` 三类标签没有环境变量覆盖；`false` 的权重固定为 `0`。

## 已移除

| 版本 | 项 | 说明 |
|---|---|---|
| v18.12.0 | `PI_CODEX_ZSTD` | 由 `PI_REQUEST_COMPRESSION` 取代 |
| v18.10.4 | `providers.openai-codex.codeMode`、`providers.openai-codex.codeModeDirectTools` | Codex Code Mode 移除，模型始终使用完整 direct tool surface |
| v18.10.4 | 模型字段 `toolMode`（值 `code_mode_only`） | 发现流程不再映射 `tool_mode` |
| v18.10.2 | `app.tree.foldOrUp`、`app.tree.unfoldOrDown` | 两个快捷键 ID 不再做任何事 |

本机 `config.yml` 与 `models.yml` 中没有这些被移除项的显式值。

## 证据边界

- 本机值来自用户级 `config.yml`（`Settings.loadReadOnly({agentDir:'/home/cpf/.omp/agent',cwd:'/tmp'})`）与当前 OMP 进程环境；项目配置、其他启动器与外壳覆盖可能改变运行值。
- 环境变量只检查当前进程；凭据类变量只记录是否设置，未读取值。
- `contextWindow`/`maxTokens` 表为本机 `models.yml` 中显式写出的字段，未写 `maxTokens` 的模型在该列标记「未写」。
- 上述十个 release 的正文是唯一依据；正文没写明的默认值、取值范围不补写。
- 本次为只读调查，未修改任何配置或 tracker 缓存。
