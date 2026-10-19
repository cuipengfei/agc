# backpass 在 agc 仓库的 OMP 会话分析：运行证据

> Source: 本机 2026-10-19 的 backpass v0.1.36 运行输出、`.backpass/` 状态文件与 backpass 0.1.36 源码（仓库 kunchenguid/backpass）；模型调用经 acpx 0.19.6
> Collected: 2026-10-19
> Published: Unknown

## 安装前提与命令

`node bin/backpass.js --help` 的开头：

```
backpass v0.1.36 - gradient descent for your agent memory

A backward pass over AGENTS.md / CLAUDE.md: it finds the agent sessions that ran in this
repo, reads what actually happened in them, and proposes evidence-backed edits to the
memory file - under a token budget, gated by you.
```

README 的安装要求：

```
Requires **Node >= 22.5** and [`acpx`](https://github.com/openclaw/acpx) on your PATH.
The default `backpass apply` review UI also requires [`lavish-axi`](https://github.com/kunchenguid/lavish-axi)
on your PATH; install it with `npm install -g lavish-axi`. To review in the terminal instead, run
`backpass apply --no-ui`.
```

```
backpass has **no API keys of its own**. Every model call goes through acpx to a harness
you have already authenticated.
```

本机安装方式与结果：

- `bun add -g backpass` → `backpass@0.1.36`，可执行文件位于 `~/.bun/bin/backpass`，`backpass --version` 输出 `0.1.36`。
- `bun add -g acpx` → `acpx@0.19.6`，`acpx --version` 正常。
- `acpx status` 只显示会话状态（`no-session`），不列出各 harness 的登录情况。

## 命令清单（帮助原文）

```
COMMANDS
  (none)     the full pass: collect samples → calculate loss → aggregate gradients →
             gradient descent. Never writes.
  scan       collect samples only: which transcripts belong to this repo, and how we know
  analyze    calculate loss: one cheap model call per new transcript (tier 1)
  propose    aggregate gradients, then high-reasoning gradient descent
             turning the aggregated evidence into edits (tier 2)
  apply      review the proposal and write the accepted edits (the only writer)
  status     cache state, evidence counts, and the budget bar
  init       write .backpassrc.json, or with --scope user the user config block
```

```
COLLECT SAMPLES
  --since <dur>            only sessions newer than this (30d, 12h, 2w, all)  [30d]
  --harness <a,b>          limit to these harnesses
                           (claude, codex, pi, opencode, grok, cursor, hermes)
  --strict                 deterministic associations only (tiers 1, 1.5, and 2)
  --limit <n>              analyze at most N transcripts this run (newest first)
  --max-transcripts <n>    cap per run; past it a recency-weighted sticky sample
                           is analyzed. 0 or "all" disables the cap          [100]
  --seed <n>               draw a different reproducible transcript sample
```

```
MODELS (two-tier: cheap analysis, smart synthesis - all through acpx)
  By default each pass auto-picks the first harness in its ladder that is installed,
  logged in, and serves the model (a cached zero-token probe; cold starts may take 3m):
    analysis   gpt-5.6-luna via pi, opencode, codex  >  claude-sonnet-5 via claude  >  grok-4.6 via pi, opencode, grok
    synthesis  gpt-5.6-sol  via pi, opencode, codex  >  claude-opus-5  via claude   >  grok-4.6 via pi, opencode, grok
  Setting an agent pins that pass and skips its ladder.
  --analysis-agent <a>     acpx agent for the per-transcript pass       [auto]
  --analysis-model <id>    model id for the analysis pass (needs --analysis-agent)
  --analysis-effort <e>    one-off reasoning effort, when supported          [medium]
  --synthesis-agent <a>    acpx agent for the final proposal pass       [auto]
  --synthesis-model <id>   model id for the synthesis pass (needs --synthesis-agent)
  --synthesis-effort <e>   one-off reasoning effort for synthesis            [high]
  --no-auto-agent          skip the ladders and pin codex / claude (the pre-0.2 defaults)
  --jobs <n>               parallel analysis calls                      [4]
```

```
APPLY
  --no-ui                  terminal accept/reject instead of the Lavish surface
  --decisions <vector>     decide without a review surface, e.g. for a script you
                           trust: "e1=accepted e2=rejected:too-narrow"; an edit
                           it does not name is left undecided. Repeatable; all vectors
                           are checked together, and no edit may be decided twice
  --dry-run                show what would be written, write nothing
  --force                  re-analyze transcripts that already have fresh evidence,
                           and re-probe agents instead of trusting the probe cache
```

## 抽样机制（源码原文）

`src/config.js`：

```
 * Cap on transcripts analyzed per run; past it a deterministic, recency-weighted sample
 * is drawn (`src/sample.js`). `0` or "all" disables the cap. `sampleHalfLife` is the age
 * at which a transcript's sampling weight halves; `seed` selects a different reproducible
 * sample.
```

`src/sample.js`：

```
 * sample follows the corpus mix when both sides are healthy, but a category that would
 * fall below 20% of the cap is boosted up to that floor (or all of its members, if
 * fewer). That is why a 98% non-interactive corpus still keeps its interactive
 * sessions in the sample instead of letting recency-weighted chance drop them.
```

运行输出中的对应行：

```
· discovered 364 transcript(s), analyzing a recency-weighted sample of 15 (--max-transcripts) · interactive 4 · non-interactive 11
```

## 分析缓存键（源码原文）

`src/analyze.js`：

```
 * Everything expensive is cached. Evidence is keyed to the transcript's content
 * signature AND the memory-surface hash it was judged against, so re-running after a
```

缓存键不包含模型或 harness。

## OMP 会话发现

`includeOmp` 默认关闭；README：

```
{ "discovery": { "includeOmp": true } }
```

```
Then run `backpass scan --harness pi` (or a normal `backpass` run). The setting also
applies to configured SSH hosts. For `--scope user`, set it in `user.discovery` and
include `"pi"` in `user.discovery.harnesses`; user scope otherwise collects only Claude
and Codex. Explicit Pi store environment overrides still work without this setting;
```

pi 适配器的源码注释：

```
 * prepends a fixed-width `{type:"title"}` record, so the `{type:"session", cwd, id}`
 * entry is line 2 there. Only the opt-in OMP store gets the title and nested handling
 * below; every other store is read one level deep with a line-1 header, as before.
 * omp also writes subagent transcripts one level deeper, at
 * `<escaped-cwd>/<session-id>/<Name>.jsonl`, and their own subagents at
 * `<escaped-cwd>/<session-id>/<Name>/<Name>.<Child>.jsonl`. Ancestor headers establish
 * observer provenance; nested layout alone marks automation. BB's Pi bridge writes the
```

自行会话排除（`src/discovery/self.js`）：

```
 * Self-session exclusion.
 *
 * backpass's own model calls run through acpx with `--cwd <repo root>`, so the harness
 * files each one in its normal store under this repo's cwd - a tier-1 exact match for
 * discovery. Left alone, the next run would analyze backpass talking to itself (and a
 * synthesis session quotes the memory file verbatim, so the "evidence" would be
```

## agc 的 OMP 会话数据量

```
du -sh ~/.omp/agent/sessions/-code-inside-agc
4.5G
```

```
top-level total=120 within30d=104
subagent dirs=115
```

其中 104 是按文件名日期统计；按文件修改时间（backpass `--since` 的实际依据）统计为：

```
within30d-by-mtime=106 of 120
```

```
/ 一层嵌套 495
/ 两层嵌套 0
```

```
within 7d: 33
within 14d: 66
```

OMP 树 30 天窗口的完整计数：

```
main=106 nested=262 total=368
```

## scan 输出原文

```
agc · 1 worktree(s) · since 30d

HOST   HARNESS  SCANNED  MATCHED  SELF  CACHED  NOTE
local  pi       502      364      0     0

364 transcript(s) associated with this repo · tier1 364 (exact) · tier1.5 0 (sibling clone) · tier2 0 (remote) · tier3 0 (best-effort) · interactive 106 · non-interactive 258
```

```
Wall time: 1.45 seconds
```

独立 Pi 存储的同层级检查：

```
standalone-pi files=0 with-agc-cwd-in-header=0
```

14 个匹配会话 ID 在独立 Pi 存储中的命中总数：

```
14 matched IDs in standalone-pi store: total hits=0
```

## 完整运行输出原文

```
backpass v0.1.36 · agc · budget 5,000 tok · since 30d
· discovered 364 transcript(s), analyzing a recency-weighted sample of 15 (--max-transcripts) · interactive 4 · non-interactive 11
· analysis: codex (gpt-5.6-luna) effort=medium
    skipped pi/gpt-5.6-luna: model not available (ambiguous among advertised ids: openai/gpt-5.6-luna, opencode/gpt-5.6-luna, opencode-go/gpt-5.6-luna (cannot rank auth types; disambiguate with a provider-qualified id))
    skipped opencode/gpt-5.6-luna: probe timed out
· analyzing 15 transcript(s) with codex (gpt-5.6-luna) effort=medium at jobs=4
  10/15 analyzed
  15/15 analyzed
warn 9 quote(s) were discarded because they do not appear in the distilled trace they claim to come from; a model that paraphrases instead of copying produces fewer findings, not cleaner ones - consider a stronger analysis model
· AGENTS.md + skill descriptions: [###########################.....] 4,236 / 5,000 tok · 67 instructions
· evidence: 15 new · 0 cached · 0 too short · 0 failed
· synthesis: codex (gpt-5.6-sol) effort=high
    skipped pi/gpt-5.6-sol: model not available (ambiguous among advertised ids: openai/gpt-5.6-sol, opencode/gpt-5.6-sol (cannot rank auth types; disambiguate with a provider-qualified id))
    skipped opencode/gpt-5.6-sol: probe timed out
· synthesizing with codex (gpt-5.6-sol) effort=high

proposal · agc · AGENTS.md · 4 edit(s) from 15 session(s) · interactive 4 · non-interactive 11
  budget [###########################.....] 4,236 -> 4,277 / 5,000 tok
  evidence: 24 positive · 29 negative · 0 gap clusters

  e1 REWRITE  把 SOFA 启动检查变成首项操作并要求报告结果 (+21 tok, 2 transcript(s))
  e2 REWRITE  扩大 Wiki 预查规则的明确触发范围 (+12 tok, 3 transcript(s))
  e3 REWRITE  把范围控制与回答完整度改成逐项验收清单 (-2 tok, 3 transcript(s))
  e4 REWRITE  明确禁止把时间相邻或相关性写成因果关系 (+10 tok, 2 transcript(s))
  note: 四个编辑覆盖全部五项 measured changes；H3 与 H4 共同处理范围控制和回答完整度。
  note: 没有删除指令，没有修改 skill 文件。
  note: backpass 测得 always-loaded surface 为 4236/5000 token。

  tier-1 tokens: input=707,864 output=21,595 cache_read=182,316 total=911,775
  tier-2 tokens: input=63,867 output=4,903 cache_read=181,040 total=249,810

Review and apply with `backpass apply` (nothing has been written).

Wall time: 487.82 seconds
```

以上 token 与耗时数字均为该次运行 stdout 的报告值。

## 模型探测缓存

`.backpass/agent-probe-cache.json`：

```
"acpxVersion": "0.19.6",
"entries": {
    "pi|gpt-5.6-luna": {
      "verdict": "model-unavailable",
      "detail": "ambiguous among advertised ids: openai/gpt-5.6-luna, opencode/gpt-5.6-luna, opencode-go/gpt-5.6-luna (cannot rank auth types; disambiguate with a provider-qualified id)",
    "codex|gpt-5.6-luna": {
      "verdict": "ok",
    "pi|gpt-5.6-sol": {
      "verdict": "model-unavailable",
      "detail": "ambiguous among advertised ids: openai/gpt-5.6-sol, opencode/gpt-5.6-sol (cannot rank auth types; disambiguate with a provider-qualified id)",
    "codex|gpt-5.6-sol": {
      "verdict": "ok",
```

## 提案与预算元数据

`.backpass/proposal.json`：

```
"budget": {
    "capTokens": 5000,
    "current": 4236,
    "projected": 4277,
    "delta": 41,
    "withinBudget": true,
    "over": 0,
    "utilization": 0.8554,
"config": {
    "maxEditsPerRun": 5,
    "minGapEvidence": 2,
```

## 写入结果

`backpass apply --decisions "e1=accepted" ...` 接受全部四条后，`AGENTS.md` 的改动为 5 行替换、5 行插入，位置在 167、176、180、182、184 行。提交为 `f8c6ea6`，已推送到 `origin/master`。

## 固定分析与生成 harness（配置层）

README 的配置层级：

```
`.backpassrc.json` in the repo root, layered over `~/.config/backpass/config.json`, with
CLI flags on top:
```

```
The `analysis` and `synthesis` blocks shown above are explicit project overrides. Omit a
block to inherit that role from the global config; set its fields to `null` only when this
repo should explicitly use the auto-pick ladder instead of a global pin. `backpass init`
leaves both blocks out so it preserves either inherited behavior.
```

个人配置路径：

```
The personal file is
`$XDG_CONFIG_HOME/backpass/config.json` (default `~/.config/backpass/config.json`).
```

角色配置结构（源码默认值）：

```
analysis: { agent: null, model: null, effort: null },
synthesis: { agent: null, model: null, effort: null },
autoAgent: true,
```

```
`agent: null` means auto-pick from `ladders[role]`; `effort: null` means
`DEFAULT_EFFORT[role]`, except OpenCode which omits the overlay until effort
is set. Setting `agent` pins the role and skips the ladder.
```

## 复核：acpx 的 pi 不是 OMP

acpx 0.19.6 的 agent 定义（`dist/agent-registry-*.js`）：

```
pi: {
  name: "Pi",
  argv: ["npx", `pi-acp@${ACP_ADAPTER_PACKAGE_RANGES.pi}`],
  installedArgv: ["pi-acp"],
  requiredCommands: ["pi"],
```

pi-acp 适配器的启动方式（README 与 `dist/index.js`）：

```
`pi-acp` communicates **ACP JSON-RPC 2.0 over stdio** to an ACP client (e.g. Zed editor) and spawns `pi --mode rpc`, bridging requests/events between the two.
```

```
const args = ["--mode", "rpc", "--no-themes"];
if (params.sessionPath) args.push("--session", params.sessionPath);
```

本机两个二进制并存：

```
/home/cpf/.bun/bin/pi
/home/cpf/.bun/bin/omp
omp/18.12.2
```

结论：`--analysis-agent pi` 启动的是上游 `pi`，与 OMP 无关。

## 复核：把 OMP 注册成 acpx 自定义 agent

`~/.acpx/config.json`：

```json
{
  "agents": {
    "omp": { "argv": ["/home/cpf/.bun/bin/omp", "acp"] }
  }
}
```

`acpx config show` 读到了该条目，`acpx omp --help` 出现 `prompt` / `exec` / `status` / `sessions` 子命令，`acpx omp sessions new` 在 `/tmp/acpx-omp-probe` 成功创建会话：

```
[acpx] created session cwd (fbbdc463-ebc2-483d-b43f-c44799c176c9)
[acpx] agent: omp
```

`acpx --format json omp status` 返回 882 个 `availableModels`。提供方分布（前 16 位）：

```
584 openrouter
178 nvidia
37 opencode-go
29 opencode-zen
14 openai-codex
11 c8787
7 kimi-code
6 sensenova
4 deepseek
3 c8787-chat
3 motomoto-chat
2 kimi-claw
1 justwoker
1 grok2api
1 tokenrouter
1 husky
```

`availableModels` 中不存在 `openai/gpt-5.6-luna` 或 `openai/gpt-5.6-sol`：`omp models` 目录里存在这两个 ID，但 ACP 会话没有公布。存在的同族 ID 是 `openai-codex/`、`openrouter/openai/`、`opencode-go/`、`c8787/`。

逐个实测（`acpx --format quiet --model <id> omp exec "Reply with the single word ok"`）：

| 模型 | 结果 |
|---|---|
| `openai-codex/gpt-5.6-luna` | Codex websocket transport error，无可读回复 |
| `opencode-go/gpt-5.6-luna` | 403 需要 OpenCode Go 订阅 |
| `openai/gpt-5.6-luna` | 不在公布列表，探测即判 `model-unavailable` |
| `openrouter/openai/gpt-5.6-sol` | 403 地区不支持 |
| `opencode-zen/gpt-6-luna` | 403 地区不支持 |
| `opencode-zen/deepseek-v4.1-flash-free` | 正常返回，tokens input=28423 output=59 |
| `c8787/gpt-5.6-luna` | 正常返回 `ok`，tokens input=597 output=143 |
| `c8787/gpt-5.6-sol` | 正常返回 `ok`，tokens input=25466 output=109 |

## 复核：backpass 拒绝把 OMP 当作分析工人

固定 agent 后仍会套用角色默认 effort，`src/agents.js`：

```
export function resolvedEffort(role, agent, config) {
  const configured = config[role].effort;
  if (typeof configured === "string" && configured.trim()) return configured.trim();
  if (agent === "opencode") return null;
  return DEFAULT_EFFORT[role];
}
```

```
export const DEFAULT_EFFORT = { analysis: "medium", synthesis: "high" };
```

`src/harness-invoke.js` 的允许清单只有 pi / grok / claude / codex / opencode，其余 agent 一旦请求覆盖就抛出：

```
} else if (overlay) {
  throw new UserError(
    `${agent} has no proven invocation-scoped way to apply ${describeOverride(requestedModel, requestedEffort)} without writing persistent harness defaults`,
    "pin pi, claude, codex, grok, or opencode, or omit the model and effort override",
  );
```

实跑（agc，`--since 3d --max-transcripts 1 --seed 1 --force`）：

```
· analyzing 1 transcript(s) with omp (c8787/gpt-5.6-luna) effort=medium at jobs=4
  1/1 analyzed
error omp has no proven invocation-scoped way to apply model=c8787/gpt-5.6-luna and effort=medium without writing persistent harness defaults
  pin pi, claude, codex, grok, or opencode, or omit the model and effort override
```

省略模型与 effort 也不行：`resolvedEffort` 对非 opencode 的 agent 永远返回角色默认值，overlay 仍为真。

替代路径也验证为不可用：让 pi-acp 启动 omp。包装脚本 `exec /home/cpf/.bun/bin/omp "$@"` 后执行：

```
PI_ACP_PI_COMMAND=/tmp/omp-as-pi.sh acpx --format quiet pi exec "Reply with the single word ok"
[acpx] error: RUNTIME Internal error: Cannot call write after a stream was destroyed
```

`omp` 支持 `--mode rpc` 与 `--no-themes`，但 RPC 协议与 pi-acp 不兼容，会话在建立阶段即断开。

### 覆盖 acpx 内置 pi 也会被拒绝

项目级 `.acpxrc.json`（临时放在 agc 根目录，验证完成后已删除）：

```json
{
  "agents": {
    "pi": {
      "argv": ["/home/cpf/.bun/bin/omp", "acp", "--model", "c8787/gpt-5.6-luna"]
    }
  }
}
```

`acpx config show` 显示项目配置已加载且 `pi` 被换成 omp，随后 `acpx --format quiet pi exec` 正常返回：

```
ok
[acpx] tokens: input=3 output=127 cache_read=24896 total=25026
```

但 backpass 在会话建立后检查 acpx 生效配置，发现被要求的内置 agent 名被替换即停止（`src/acpx.js`）：

```
if (Object.prototype.hasOwnProperty.call(config.agents, invocation.requiredBuiltinAgent)) {
  throw new UserError(
    `cannot safely apply model or effort overrides because acpx agents.${invocation.requiredBuiltinAgent} replaces the proven built-in adapter`,
    `remove the agents.${invocation.requiredBuiltinAgent} replacement or omit the model and effort override`,
  );
```

实跑输出：

```
· analyzing 1 transcript(s) with pi (c8787/gpt-5.6-luna) effort=medium at jobs=4
  1/1 analyzed
error cannot safely apply model or effort overrides because acpx agents.pi replaces the proven built-in adapter
  remove the agents.pi replacement or omit the model and effort override
```

`omp acp` 本身接受 `--model` 并在原始 agent 命令下工作：

```
acpx --format quiet --agent "omp acp --model c8787/gpt-5.6-luna" exec "Reply with the single word ok"
ok
[acpx] tokens: input=3 output=154 cache_write=24896 total=25053
```

限制在 backpass 一侧：它要求覆盖必须落在已知内置适配器上，且角色 effort 默认值必然构成覆盖请求。
