# jev-latest 400 根因取证与修复（2026-09-22 会话）

> Source: 本会话取证（本机 oh-my-pi 源码 `/home/cpf/code-inside/oh-my-pi`，upstream/main `d49918fab2`）与会话 JSONL 直读；本会话实测（zen 网关日志、eval judge、unexpected-stop nudge）
> Collected: 2026-09-22
> Published: Unknown

## 1. 源码锚点（全部亲读）

- `packages/coding-agent/src/config/model-resolver.ts:1507` `resolveRoleChain`；`:1516-1518`：`configuredFallbacks = settings.get("retry.fallbackChains")[role]`，为空时 `fallbackSelectors = rolePriorityDefaults(role)`（读 `src/priority.json`）。
- `packages/coding-agent/src/priority.json` judge 段：`"judge": ["typesafe/jev-latest", "@tiny", "@smol", "@default"]`。
- `packages/catalog/src/compat/rules/providers/typesafe.kdl`：内置 typesafe provider，`seed bundle="always"`、`default-model "jev-latest"`、`env "TYPESAFE_API_KEY"`、`base-url "https://api.typesafe.ai"`。
- `packages/coding-agent/src/judgment/index.ts:172` `ChainJudge.withCandidate` catch：`isAbortOrTimeout(error)` 为真直接 `throw`（timeout 不会继续 fallback）；账号拒绝（401/402/403）记冷却后继续下一候选；其他失败继续下一候选。
- `packages/ai/src/judgment/typesafe.ts`：`DEFAULT_TIMEOUT_MS = 10000`（:58）、`MAX_ATTEMPTS = 3`（:59）、transient 集合 `408 || 429 || >=500`（:168）。
- `packages/coding-agent/src/session/transform-messages.ts:727-741`：abandoned tool-use 定义——turn 带 toolCall block 但 `stopReason !== "toolUse"`（如 adaptive-thinking 输出后以 end_turn/stop 收尾），OMP 不执行该工具。
- `ChainJudge.#resolveCandidates`（自动 judge 路径）在链尾可能追加会话当前模型作为兜底候选；路由相同的候选按 route 去重合并（`@tiny`/`@smol` 同路由时合成一个）。
- `packages/coding-agent/src/session/claude-session-store.ts:245`：`"tool_use" → "toolUse"` 归一化。
- `packages/coding-agent/src/session/unexpected-stop-classifier.ts:16` 阈值 `noul >= 0.5`；`:20-30` 题面（"says it will act, continue working, or call a tool, then ends"）；`:42-62` 候选条件（`stopReason === "stop"`、无 toolCall、非空可见文字或带签名 thinking）。
- `packages/coding-agent/src/session/turn-recovery.ts:73` `UNEXPECTED_STOP_MAX_RETRIES = 3`；`:916-991` smart 分支；`:952-967` classify 异常 → 返回（不 nudge）。
- `packages/coding-agent/test/agent-session-empty-stop-guard.test.ts:213-227`：recordCall → emptyStop() → 注入 1 条 reminder → 第三次模型调用；空 assistant stop 被剥离（`toHaveLength(0)`）。

## 2. 本机配置两态

18.2.7 时期（2026-09-21 前）：config 无 `modelRoles.judge`、无 `typesafe-zen` provider；`retry.fallbackChains` 仅 `web`。judge 链 = priority.json 默认，链首即 `typesafe/jev-latest`。

当前（2026-09-22）：`modelRoles.judge = typesafe-zen/jev-1.13`；models.yml `typesafe-zen`：`api: typesafe`、`baseUrl: https://opencode.ai/zen`、两个模型 `jev-1.13`/`jev-1.13-free`、apiKey 走 env `OPENCODE_API_KEY`；OMP 18.2.8。

环境变量（值不录，长度实测）：`TYPESAFE_API_KEY` 已设（67 字符）、`TYPESAFE_BASE_URL` 已设（23 字符 = `https://opencode.ai/zen`）、`TYPESAFE_DEFAULT_MODEL` 已设（8 字符 = `jev-1.13`）。priority.json 显式写 `typesafe/jev-latest`，覆盖 `TYPESAFE_DEFAULT_MODEL`，env 默认模型救不了 fallback 链。

## 3. 400 的生成机制

fallback 候选 `typesafe/jev-latest` 经 `TYPESAFE_BASE_URL` 指向 zen，发出 `POST https://opencode.ai/zen/v1/systemone`，body `model: "jev-latest"`。zen 对该 key 只提供 `jev-1.13`/`jev-1.13-free`。两种 400 文本：`Router.ModelNotFound`（2026-09-22 网关日志中的请求，来源未绑定）与 `Model is unavailable.`（2026-09-21 最小探针实测）。jev-latest 只在 primary `jev-1.13` 以非 timeout、非中止方式失败时被尝试（ChainJudge 语义）。

## 4. 修复

`~/.omp/agent/config.yml` 备份 `config.yml.bak.20260922-235033`，编辑工具新增：

```yaml
retry:
  fallbackChains:
    judge:
      - typesafe-zen/jev-1.13
      - typesafe-zen/jev-1.13-free
      - "@tiny"
      - "@smol"
      - "@default"
```

显式链整体替换 priority.json 默认链。auto judge 与 eval judge 共用 `resolveRoleChain("judge")`，一处修复覆盖两方。

## 5. 验证记录

- YAML parse OK；`omp config get retry.fallbackChains` exit=0，返回含新 judge 链。
- 会话文件全量扫描（当时 3361 行、3360 条有效 JSON、0 解析错误）：model_usage 24 条 = 22 条 `judge_batch`（`kimi-claw/k2d8-preview`，2026-09-21T11:38:43.371Z 至 11:38:49.568Z，jevify 22 文件分类）+ 2 条 `judge`（`provider=typesafe-zen`、`model=jev-1.13`，`2026-09-22T14:47:39.050Z`、`15:18:35.051Z`）。
- 当前运行会话 eval judge 实测（`2026-09-22T15:54:07.190Z`）→ 新增第 3 条 `judge` usage（`provider=typesafe-zen`、`model=jev-1.13`、`api=typesafe`、stop、无 error），此后合计 25 条。全会话 jev-latest 成功 usage = 0。
- unexpected-stop 实测：承诺句停止 → nudge `Attempt #1/3`；后续说明文字（另一条 assistant message）→ `Attempt #2/3`。两次成功 nudge 之后 judge usage 均无新增（最新仍为 15:54:07），原因未知。

## 6. 18.2.8 版本事实

- CHANGELOG `[18.2.8]`：`typesafe`/`openrouter-decisions` API 值可声明 custom provider（带 base URL、API key、模型）。18.2.7 拒绝 `api: typesafe` 的 schema 限制解除，实测接受。
- eval `judge()` 在 18.2.8 记 model_usage（`purpose=judge`），18.2.6 不记；unexpected-stop 的两次成功 nudge 在 18.2.8 均无 usage 新增，原因未知。

## 7. 证据边界

- 网关 400 到具体请求/会话的逐条绑定：无 sessionID，机制归因完整、请求级归属未确认。
- 修复后网关不再出现 jev-latest 400：未实测。
- 运行中会话是否热加载新 fallback：未验证；新会话必然加载。
- unexpected-stop 判定服务模型：未验证（成功路径不入 journal 的判定机制未查明）。
