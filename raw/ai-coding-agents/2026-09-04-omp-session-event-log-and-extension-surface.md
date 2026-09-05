# OMP session 事件日志结构与 extension 事件面

> Source: 本机 `omp` CLI 与已安装包 `@oh-my-pi/pi-coding-agent` dist 类型声明；本机 session 文件结构统计
> Collected: 2026-09-04
> Published: Unknown

验证级别：`[RUN]` = 本机执行并记录输出；`[STAT]` = 对本机文件做结构统计（只读 key，不读内容）；`[TYPES]` = 读已安装包的 `.d.ts` 类型声明；`[UNVERIFIED]` = 未测。

本文件用于回答一个问题：DSH 的两项「真独有」——Cordis everything-is-plugin 与 append-only event sourcing——在本机 OMP 上是否有等价物。

---

## A. 被检查对象

`[RUN]` `which omp` → `/home/cpf/.bun/bin/omp`，`readlink -f` 解析到
`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js`。
版本以同日另一份 raw 的 `omp --version` 输出为准。

---

## B. session 日志是 typed append-only 事件流

`[STAT]` 抽样文件：`~/.omp/agent/sessions/-code-inside-agc/2026-09-03T12-36-57-744Z_01a06745-b910-723e-b3db-a619c039b257.jsonl`，4.05 MB。
本机 session 目录共 688 个 `.jsonl` 文件。

第 1 行的 key：`type`、`v`、`title`、`source`、`updatedAt`、`pad`。
非首行样本的 key：`type`、`id`、`parentId`、`timestamp`、`serviceTier`。

`[STAT]` 按 `type` 判别式统计该文件全部 1245 行（统计时读到 1242 行，随后会话继续写入至 1245 行；两次读取之间文件仍在追加）：

| 计数 | type |
|---|---|
| 771 | `message` |
| 377 | `custom` |
| 66 | `custom_message` |
| 13 | `model_change` |
| 5 | `title_change` |
| 3 | `compaction` |
| 3 | `ttsr_injection` |
| 1 | `title` |
| 1 | `session` |
| 1 | `thinking_level_change` |
| 1 | `service_tier_change` |

关键观察：

1. **判别式联合类型**：每行一个带 `type` 标签的事件，不是一个序列化的 message 数组。`[STAT]`
2. **父指针**：非首行带 `parentId`。历史需沿链投射得出，不是线性读取全部行。`[STAT]`
3. **compaction 是事件,不是重写**：3 个 `compaction` 事件分别在第 341、869、1059 行；第一个 compaction 之前仍保留 340 行。压缩没有截断或改写既有行。`[STAT]`
4. **无改写痕迹**：1244 个带 `id` 的条目，重复 id 数为 0。`[STAT]`
5. **状态变更本身也是事件**：`model_change`、`thinking_level_change`、`service_tier_change`、`title_change`、`ttsr_injection` 都以事件形式落盘。`[STAT]`

`[RUN]` 该文件可被投射为其他形态：`omp --export <session.jsonl>` 的 help 描述为 `Export session file to HTML and exit`；`-r/--resume` 接受 `by ID prefix, path, or picker`。

未验证：runtime 是否把该日志当唯一 source of truth，还是内存状态为准、日志为镜像。这需要读 OMP 源码或做写入时序观测，本次都没做。`[UNVERIFIED]`

---

## C. extension/hook 是拦截面,不是核心替换面

`[RUN]` `omp --help` 中与可扩展性相关的行：

```
      --hook=<value>                  Load a hook/extension file (can be used multiple times)
  -e, --extension=<value>             Load an extension file (can be used multiple times)
      --no-extensions                 Disable extension discovery (explicit -e paths still work)
      --export=<value>                Export session file to HTML and exit
  install                             Install or link an extension package (alias of `plugin install`/`plugin link`)
  plugin                              Manage plugins (install, uninstall, list, etc.)
  --plugin-dir <path>                 Load plugin from directory (repeatable)
```

`[RUN]` `omp plugin --help` 的 ACTION 取值：`install|uninstall|list|link|doctor|features|config|enable|disable|marketplace|discover|upgrade`；`--scope` 为 `user`（默认）或 `project`。

`[RUN]` `omp plugin list` 本机结果：npm plugins `@dietrichgebert/ponytail@4.9.0`、`@plannotator/pi-extension@0.27.12`；marketplace plugin `better-harness@better-harness (0.7.0-alpha1) (user)`。

`[TYPES]` `dist/types/extensibility/extensions/types.d.ts` 的 `on(event, handler)` 重载覆盖的事件包括：
`resources_discover`、`session_start`、`session_before_switch`、`session_switch`、`session_before_branch`、`session_before_tree`、`session_tree`、`context`、`before_provider_request`、`after_provider_response`、`before_agent_start`、`agent_start`、`agent_end`、`input`、`tool_approval_requested`、`tool_approval_resolved`、`tool_call`、`tool_result`、`user_bash`、`user_python`、`mcp_notification`。

`[TYPES]` `dist/types/extensibility/hooks/types.d.ts` 的 `HookAPI` 另有 `auto_retry_end`、`ttsr_triggered`、`todo_reminder`。

`[TYPES]` 类型声明中的能力注释原文：

```
/** Fired before a provider request is sent. Can replace the payload. */
/** Fired before a tool executes. Can block. */
/** Fired after user submits prompt but before agent loop. */
```

`[TYPES]` `HookAPI` 文档注释：`Hooks use pi.on() to subscribe to events and pi.sendMessage() to inject messages.`

关键区分：这些 seam 的动词是 subscribe、replace payload、block、inject message —— 都是在既有 loop 周围拦截。类型声明中未发现「替换 agent loop 实现」「替换 session log 后端」「替换 tool registry」的注册点。`[TYPES]`

未验证：是否存在类型声明之外的替换路径（如内部 API、未文档化导出）。未读 OMP 源码实现。`[UNVERIFIED]`

---

## D. 证据边界

- OMP 侧全部来自本机 CLI 输出、本机 session 文件结构统计与已安装包类型声明；未读实现源码。
- DSH 侧本次未做任何新取证。DSH 的机制描述仍以先前 raw 与其 `docs/architecture.md` 为准，未安装、未运行 DSH。
- 未安装或运行 OpenCode v2、Prime Agent、jcode 作对照。
- session 文件统计只读 JSON 的 key 与 `type` 判别式，未读取消息内容。
