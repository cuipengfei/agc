# OMP judge 角色链解析与 jev-latest 400 根因

> Sources: 本会话取证（本机 oh-my-pi 源码 `/home/cpf/code-inside/oh-my-pi`，upstream/main `d49918fab2` 直读）, 2026-09-22; 本会话实测（zen 网关日志、eval judge、unexpected-stop nudge、会话 JSONL 全量扫描）, 2026-09-22
> Raw: [jev-latest-400-root-cause](../../raw/omp/2026-09-22-jev-latest-400-root-cause.md)
> Updated: 2026-09-22

## Overview

18.2.7+ OMP 的 judge 模型选择由「角色链解析」决定：eval `judge()` 与自动 judge（auto-thinking、smart unexpected-stop、git TUI AI staging）都经 `resolveJudge` → `resolveRoleChain("judge")` 取候选链。链首是 `modelRoles.judge` 的显式值，链尾来自 `retry.fallbackChains.judge`；缺省时改用 priority.json 默认段，而默认段第一项是内置 catalog 模型 `typesafe/jev-latest`。本文记录这套解析机制、`TYPESAFE_BASE_URL` 劫持内置 provider 后生出的 jev-latest 400、ChainJudge 的失败语义、以及修法。judgmentProvider 三值语义与 /v1/systemone 协议面见另两篇。

## 角色链解析机制

- 入口统一：`sessionJudge`/`resolveJudge`（`packages/coding-agent/src/judgment/index.ts`）与 unexpected-stop 的 smart 分支共用 `resolveRoleChain("judge")`（`packages/coding-agent/src/config/model-resolver.ts:1507`）。
- fallback 选择（`model-resolver.ts:1516-1518`）：`retry.fallbackChains.judge` 已配置 → 用配置值；缺省 → `rolePriorityDefaults("judge")`，读 `src/priority.json` 的 `["typesafe/jev-latest", "@tiny", "@smol", "@default"]`。显式链一旦存在即整体替换默认链。
- 本机修复前解析出的链：`typesafe-zen/jev-1.13`（`modelRoles.judge` 显式）→ `typesafe/jev-latest` → `@tiny` → `@smol` → `@default`。`@tiny` 与 `@smol` 路由相同会被候选去重合并；自动 judge 路径（`ChainJudge.#resolveCandidates`）链尾还可能追加会话当前模型。

## 内置 typesafe catalog provider 与劫持

- `typesafe/jev-latest` 不是用户配置出来的：它是 OMP 内置 catalog 模型，provider 规则在 `packages/catalog/src/compat/rules/providers/typesafe.kdl`——`seed bundle="always"`、`default-model "jev-latest"`、`env "TYPESAFE_API_KEY"`、`base-url "https://api.typesafe.ai"`。
- `TYPESAFE_BASE_URL` 与 `TYPESAFE_DEFAULT_MODEL` 是 env-only（边界见 [env 文章](judgment-typesafe-env-config.md)）。`TYPESAFE_BASE_URL=https://opencode.ai/zen` 时，内置 provider 的 base-url 被覆盖指向 zen。
- priority.json 显式写 `typesafe/jev-latest`，覆盖 `TYPESAFE_DEFAULT_MODEL` 的默认模型——改 env 默认模型救不了 fallback 链。
- 结果：链上 fallback 候选 `typesafe/jev-latest` 向 zen 发 `POST https://opencode.ai/zen/v1/systemone`、`model: "jev-latest"`；zen 对该 key 只提供 `jev-1.13`/`jev-1.13-free` → 400（网关文本 `Router.ModelNotFound`；最小探针文本 `Model is unavailable.`）。

## ChainJudge 失败语义（jev-latest 何时被尝试）

`ChainJudge.withCandidate`（`judgment/index.ts:172` catch）：

- timeout/abort（`isAbortOrTimeout`，含 `TypeSafeJudge` 10 秒 `AbortSignal.timeout`）→ 直接抛出，**不**继续 fallback；
- 账号拒绝 401/402/403 → 记冷却，继续下一候选；
- 其他失败 → 继续下一候选。

`TypeSafeJudge` 自身：timeout 10s、`MAX_ATTEMPTS = 3`、transient `408 || 429 || >=500`（`typesafe.ts:58-59, :168`）。所以 jev-latest 只在 primary `jev-1.13` 以非 timeout、非中止方式失败时被尝试。原生 judge 失败不写 model_usage（成功记账路径见 [协议面文章](judgment-systemone-protocol.md)），400 从不出现在 usage 里。

## 修复模式

`~/.omp/agent/config.yml`（备份 `config.yml.bak.20260922-235033`）显式配置：

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

一处覆盖 auto judge 与 eval judge（同一 `resolveRoleChain`）。验证：`omp config get retry.fallbackChains` exit=0；当前会话 eval judge 实测 `2026-09-22T15:54:07.190Z` → usage `purpose=judge`、`provider=typesafe-zen`、`model=jev-1.13`。

## 回溯解释：18.2.7 时期的 zen 400 潮

18.2.7 时 config 无 `modelRoles.judge`、无 `typesafe-zen` provider；judge 链 = priority.json 默认、链首即 `typesafe/jev-latest`，且已被 `TYPESAFE_BASE_URL` 指向 zen。2026-09-21 jevify 22 文件分类实际模型 `kimi-claw/k2d8-preview`（22 条 `judge_batch` usage，`2026-09-21T11:38:43.371Z` 至 `11:38:49.568Z`）与 zen 日志中的 jev-latest 400 可由该候选链解释：候选解析会先尝试 jev-latest，这些尝试与日志中的 400 未逐条绑定；判定本体由 k2d8-preview 完成。2026-09-21 配 `modelRoles.judge`、2026-09-22 配显式 fallback 链后，链首为 Zen jev-1.13。

## 证据边界

- 网关 400 到具体请求/会话的逐条绑定：无 sessionID，机制归因完整、请求级归属未确认。
- 修复后网关不再出现 jev-latest 400：未实测。
- 运行中会话是否热加载 fallback 链：未验证；新会话必然加载。


## See Also

- [OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界](judgment-provider-and-eval-judge.md)
- [OMP TypeSafe env 变量边界、.env 加载链与 zen 免费 jev 接入](judgment-typesafe-env-config.md)
- [OMP judgment /v1/systemone 协议面：题型 schema、传输参数、观测点与兼容端点](judgment-systemone-protocol.md)
- [Jev 七渠道定价与 OMP systemone 兼容性判定](../ai-coding-agents/jev-omp-systemone-channel-compatibility.md)
