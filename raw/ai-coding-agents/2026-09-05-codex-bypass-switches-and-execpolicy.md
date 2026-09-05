# Codex bypass 开关与 execpolicy 的关系：本机一手核验

- Source: 本 repo 研究会话，主会话对本机安装 Codex CLI `0.153.4` 的行为探测与二进制字符串扫描
- Collected: 2026-09-05
- Published: Unknown
- 关系：本文是 [Claude Code 与 Codex 入列](2026-09-05-claude-code-and-codex-enrollment.md) 的证据补编。那份记录把 execpolicy 的三档 decision、`justification`、内联单测、分层规则标为「仅 scout 转述官方文档 `[single-source]`」；本文用本机一手证据把其中一部分升级，并新增两条机制。原记录不改动，按 `raw/` 不可变处理。
- 起因：用户提问「`codex --yolo` 之后 execpolicy `.rules` 是不是就不起作用了」。
- 工具失败记录：`ctx_fetch_and_index` 对 `https://developers.openai.com/codex/rules` 与 `/codex/sandbox` 两次超时（MCP error -32001, 120s）；直接 `read` 同一 URL 亦超时。因此本文全部证据来自本机，未取得官方文档原文。

## 一、`--yolo` 是 `--dangerously-bypass-approvals-and-sandbox` 的别名（行为证明）

`--yolo` 不在 `codex --help` 输出中。先做对照实验确认 clap 会拒绝未知 flag（否则「被接受」不构成证据）：

| 探测命令 | 结果 |
|---|---|
| `codex --definitelynotaflag --help` | `error: unexpected argument '--definitelynotaflag' found` |
| `codex exec --definitelynotaflag --help` | `error: unexpected argument '--definitelynotaflag' found` |
| `codex --yolo --help` | 接受，正常打印 help |
| `codex --not-so-yolo --help` | 接受，正常打印 help |

对照组会报错，说明「被接受」有意义。决定性一步：

```
$ codex --yolo --dangerously-bypass-approvals-and-sandbox --help
error: the argument '--dangerously-bypass-approvals-and-sandbox' cannot be used multiple times
```

clap 把 `--yolo` 解析成了同一个 argument id，即 **`--yolo` 是 `--dangerously-bypass-approvals-and-sandbox` 的别名**，`[verified]`（行为证明）。

该 flag 的 help 原文：`Skip all confirmation prompts and execute commands without sandboxing. EXTREMELY DANGEROUS`。

`--not-so-yolo` 在二进制的 clap 字符串表中紧邻 `AUTO_REVIEW` 与 `approve-for-me`（序列为 `...AUTO_REVIEW` `Route approval requests through automatic review using the workspace-write sandbox` `approve-for-me` `not-so-yolo` `DANGEROUSLY_BYPASS_APPROVALS_AND_SANDBOX`...），据此**推断**它是 `--approve-for-me` 的别名——属推断，未用重复参数法验证。

## 二、三个 bypass 开关互相独立（一手证据）

| 开关 | 关掉什么 | env var | 证据 |
|---|---|---|---|
| `--yolo` = `--dangerously-bypass-approvals-and-sandbox` | 交互审批 + 沙箱 | `DANGEROUSLY_BYPASS_APPROVALS_AND_SANDBOX` | help 原文 + 上节别名证明 |
| `--ignore-rules` | 加载 execpolicy `.rules` 文件 | `IGNORE_RULES` | 二进制串 `ignore_rules` `IGNORE_RULES` `Do not load user or project execpolicy .rules files` `ignore-ru`（截断） |
| `--dangerously-bypass-hook-trust` | hook 信任闸门 | `BYPASS_HOOK_TRUST` | `codex --help` 原文 + 二进制串 `BYPASS_HOOK_TRUST` |

`--yolo` 与 `--ignore-rules` 可同时传（`codex exec --yolo --ignore-rules --help` 被接受，无冲突报错），说明二者在 CLI 层是正交的独立参数，**不是同一开关的别名**。

推论边界：由此可确证「规则加载」与「审批/沙箱 bypass」是两个独立开关；但**「`--yolo` 之后 `Forbidden` 规则仍然拒绝执行」这一条本文未能直接验证**——没有安全的本机测法（真跑一次 `--yolo` 就是无沙箱执行真实 agent turn），官方文档又抓不到。只能记作：规则仍会被加载（除非另传 `--ignore-rules`），至于 `Forbidden` 与 `Prompt` 在 `AskForApproval::Never` 下的具体归约，属**未实测**。

## 三、Decision 枚举与 NetworkRule：从 scout 单源升级为一手证据

enrollment 记录中标为「仅 scout 转述 `https://developers.openai.com/codex/rules`」的部分，以下几项现有本机二进制字符串直证：

- 三档 decision：串 `PrefixRuleAllowPromptForbiddenPrefixPattern` —— 即 `PrefixRule` 与 `Allow` / `Prompt` / `Forbidden` / `PrefixPattern` 同处一处枚举名序列
- `justification` 字段与网络规则同处：串 `NetworkRulejustificationPluginSelectedPluginConfigCompatibilityhost_owned_appsPromptForbidden...`

仍未获一手证据、继续保持 `[single-source]` 的部分：优先级次序 `forbidden > prompt > allow`、`match`/`not_match` 内联单测、用户层与项目层分层规则。

（第一节已用活体实测证明 `allow` 与 `forbidden` 两档实际生效，见 enrollment 记录；`prompt` 一档此前只有文档来源，现补上枚举名证据，但其运行时行为仍未实测。）

## 四、新机制：managed requirements 能压过 YOLO

二进制内可见完整错误串（逐字）：

```
`approval_policy = "never"` cannot be used because requirements do not allow `sandbox_mode = "danger-full-access"`; Codex would fall back to read-only permissions with approvals
```

即当组织侧 requirements 不允许 `danger-full-access` 时，用户设 `approval_policy = "never"`（`--yolo` 对应的审批策略）会被拒绝，**Codex 回落到 read-only + 需审批**。这是「管理侧配置压过本地 YOLO」的显式路径，`[verified]`（错误串原文）。

相关枚举串：`SandboxMode` 三档 `read-only` / `workspace-write` / `danger-full-access`；`AskForApproval` 四档 `untrusted` / `on-failure` / `on-request` / `never`，另有 `struct variant AskForApproval::Granular with 5 elements`（`Granular` 变体未在 help 中暴露，用途未查）。

## 五、对上层裁定的影响

强化 execpolicy 的真独有裁定：一个「跳过所有确认提示并无沙箱执行」的 flag **不会**顺带关掉策略规则，规则加载有独立开关；且管理侧 requirements 还能压过用户的 YOLO。这说明 execpolicy 不是审批 UI 的附属品，而是独立的策略层。
