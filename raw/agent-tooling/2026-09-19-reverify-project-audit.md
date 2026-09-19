# Reverify 项目审计底稿：确定性验证的适用边界与 rollover 实际价值

> Source: 本机 `/tmp/reverify-src`（git 快照 `f32ea84`，包版本 0.11.0）的 README/源码/BENCHMARK/CHANGELOG/ROADMAP 逐字摘录；GitHub `2akouwu/reverify` issue #22/#14、PR #19/#21 状态（在线读取）；本机 `/home/cpf/.agents/skills/handoff/SKILL.md`
> Collected: 2026-09-19
> Published: Unknown

## 证据分级约定

- **【直接源码】**：逐字引自本地快照指定 `文件:行号`，可用 `git show f32ea84:<path>` 复核。
- **【项目自述】**：项目文档/benchmark 的自报数字，未独立复现。
- **【外部记录】**：GitHub issue/PR 正文（在线读取，非本地文件）。
- **【本地规约】**：本机 handoff skill 原文（用户自有工作流约定）。
- **【推断】**：由上述证据得出的结论，不是原文。
- **【未实测】**：未取得运行证据的声明。

本审计未运行 reverify（未 pip install、未跑 benchmark）；`functions_equiv`、claim 回路、rollover 状态机的行为结论全部来自源码阅读。

---

## A. 本地快照身份（【直接源码】）

`git log --oneline -1` → `f32ea84 ci: pin coverage/build/twine to exact versions (Scorecard Pinned-Dependencies) (#18)`。最新合并 PR 为 #18。

`reverify/_version.py:3-4`：

```
"""Single source of the package version (importable as a package or flat)."""

__version__ = "0.11.0"
```

## B. README 摘录（【项目自述】为主）

README 定位（README.md:24-27）：

```
AI is confident and often wrong: it invents an API, a struct field, an offset, or what a
function does, and says it like fact. Reverify makes a deterministic tool the judge — the model
proposes a claim, the tool checks it against the actual artifact, and it comes back VERIFIED /
REFUTED with evidence. The model never gets to assert a fact on its own.
```

claim kind 清单（README.md:118-130）：

```
Claims can be batched from a JSON file (`--claims-file claims.json`); the CLI exits
non-zero if anything is refuted, so an agent or CI job can gate on a grounded
reconstruction. Claim kinds: `bytes_at`, `u16_at` / `u32_at` / `u64_at` (typed reads, no
endianness math), `pattern_present`, `string_present`, `instructions` (mnemonics and
optionally operands), `emulate_result`, `behavior_equiv`, `prove_equiv`, `protobuf_field`,
`import_present`, `export_present`, `section_present`, and the semantic kinds
`function_at`, `calls`, `references`, `reachable_from_entry`
```

语义层强度（README.md:341-347）：

```
Honesty about strength: a recovered control-flow graph is *analysis-derived* — CFGFast is
heuristic and can miss or split functions — so semantic verdicts name the engine and are
recorded at a **`DERIVED`** tier below `VERIFIED`. Without an engine the pure fallback only
knows what is independently certain (the entry point and the exports are function starts)
and answers `INCONCLUSIVE` for everything else, never a guess.
```

rollover 与宿主差异（README.md:249-255）：

```
The same rule applied to an interactive session — Claude Code, Codex CLI, Gemini CLI or
OpenCode. Built-in compaction is turned off; the model hands off to files, and instead of a
model-written summary the session is *replaced* wherever the CLI lets a hook do that (Gemini
CLI, OpenCode) or a launcher owns the process. Where it does not (a plain `claude` or `codex`),
reverify keeps the context *lean* rather than pretending to clear it: bulky tool output goes to
files that stay re-readable, edits stay local, exploration goes to subagents, and the hand-off
is always current. We are asking those vendors for the missing primitive.
```
【注】README.md:252 原句中 lean 带强调标记（`*lean*`）；剥除标记后的纯文本为 "keeps the context lean rather than pretending to clear it"。

Status 节（README.md:388-389）：

```
**v0.9.0 — the semantic layer**, on [PyPI](https://pypi.org/project/reverify/)
(`pip install reverify`).
```

（注：README 状态节写 v0.9.0，实际包版本 0.11.0——文档滞后，【直接源码】对比 _version.py:4。）

## C. 源码摘录（【直接源码】）
### C1. Verifier 的输入对象与 SUPPORTED claim 范围

`reverify/verifier.py:1255-1258`：

```
def verify_claims(
    data: bytes,
    claims: List[Dict[str, Any]],
    facts: Optional[Dict[str, Any]] = None,

`reverify/verifier.py:165-188`（SUPPORTED 常量，【直接源码】）：

```
    SUPPORTED = (
        "bytes_at",
        "u16_at",
        "u32_at",
        "u64_at",
        "pattern_present",
        "string_present",
        "instructions",
        "emulate_result",
        "behavior_equiv",
        "prove_equiv",
        "exebench",
        "functions_equiv",
        "protobuf_field",
        "import_present",
        "export_present",
        "section_present",
        "pe_import",  # alias of import_present
        # semantic layer (engine-derived): function boundaries, call graph, xrefs
        "function_at",
        "calls",
        "references",
        "reachable_from_entry",
    )
```

`reverify/verifier.py:190-191`（初始化签名，【直接源码】）：

```
    def __init__(self, data: bytes):
        self.data = data
```

`reverify/verifier.py:643-653,674-683`（两个源码差分核查器，【直接源码】）：

```
    def _check_exebench(self, p: Dict[str, Any]):
        """Claim: a candidate C source reproduces a set of recorded I/O pairs (ExeBench).
```

```
    def _check_functions_equiv(self, p: Dict[str, Any]):
        """Claim: a candidate implementation computes the same as a reference implementation.
```
```
【推断】Verifier 对象由 `data: bytes` 初始化（:190-191），其判官输入是二进制字节流；但 `SUPPORTED`（:165-188）同时包含二进制断言 kind、`exebench` 与 `functions_equiv`，源码差分路径有 `_check_exebench`/`_check_functions_equiv`（:643-707）——源码差分既可作为 claim 进入该回路，也可走 CLI `reverify equiv` / exebench adapter，契约仍窄（C2）。README.md:118-130 的 claim kind 清单未列这两个 kind（README 滞后于代码）。产品另有非 claim-loop 的通用命令，见下。

`reverify/cli.py:540-543`（非 claim-loop 的通用命令之一，【直接源码】）：

```
def cmd_audit_boundary(args: argparse.Namespace) -> None:
    workspace = args.workspace or os.getcwd()
    urls = args.urls.split(",") if args.urls else None
    report = run_full_security_audit(workspace, urls)
```

`reverify/boundary_auditor.py:2-9`（该命令的审计范围，【直接源码】）：

```
"""Security Boundary Auditor Module.

Provides defensive security checks and audits for:
1. Path Canonicalization & Symlink Containment (Filesystem Boundary)
2. Network Loopback, Private IP, DNS Rebinding & Metadata Filtering (SSRF Boundary)
3. State Serialization & Structured Snapshot Integrity (State Boundary)
4. Environment Variable & Secret Boundary Sanitization (Secret Boundary)
"""
```

【推断】audit-boundary 是确定性检查工具，但不构成"模型提出断言→工具裁定"的验证回路；产品能力须分 claim loop 与通用命令两层表述。

### C2. functions_equiv 的窄契约

`reverify/exebench.py:182-185`：

```
# --- language runners: prepare an implementation, then run it over integer args -------------
# Every language uses the same contract as this module: the program reads its integer
# arguments from argv (decimal) and prints one integer to stdout. Adding a language is a
# ``prepare`` (make it runnable) and a memory ceiling generous enough for its runtime.
```

`reverify/exebench.py:260-271`：

```
    if reference is None and record is not None:
        if key != "c":
            return _inconclusive(0, "a recorded-I/O 'record' oracle is only supported for lang='c'")
        return exebench_verify(record, candidate, cc=cc, timeout=timeout)
    if reference is None:
        return _inconclusive(0, "functions_equiv needs 'reference' (a reference implementation) or 'record'")
    if not native_exec_allowed():
        return _inconclusive(0, NATIVE_EXEC_HINT)
    if key == "c" and not has_compiler(cc):
        return _inconclusive(0, f"no C compiler '{cc}' available; cannot build the implementations")

    cases = [tuple(int(x) for x in c) for c in inputs] if inputs else gen_inputs(nargs, 32)
    cases = cases[:max_inputs]
```

`reverify/exebench.py:300-303`（pass 的诚实标注）：

```
    return {
        "status": "pass", "passed": passed, "total": compared, "failures": [],
        "detail": f"candidate matches the reference on all {compared} inputs tested (tested, not proven)",
    }
```

`reverify/behavior.py:184-187`：

```
def gen_inputs(nargs: int, bits: int, n: int = 24, seed: int = 0x5EED) -> List[Tuple[int, ...]]:
    """Boundary values plus deterministic pseudo-random tuples (no global RNG)."""
    mask = (1 << bits) - 1
    boundary = [0, 1, 2, mask, mask - 1, mask >> 1, 1 << (bits - 1), 0xFF, 0x100, 0x7FFFFFFF]
```

`reverify/exebench.py:241`（max_inputs 默认值）：

```
    max_inputs: int = 40,
```

【推断】oracle 前提：可信参考实现（或仅 C 支持的录制 I/O）；输入域为整数，`gen_inputs(nargs, 32)` 的 32 是 bits（32-bit 输入域）；boundary 列表 10 组（behavior.py:187）+ n=24 个固定种子伪随机（seed 0x5EED），共 34 组；`cases[:max_inputs]` 的 max_inputs 默认 40（exebench.py:241），34 组不截断；pass 是 tested-not-proven。

### C3. ledger 按二进制内容寻址

`reverify/ledger.py:284-286`：

```
        sha = hashlib.sha256(data).hexdigest()
        path = ledger_dir(directory) / f"{sha[:24]}.json" if persist else None
        led = cls(sha, len(data), path)
```

`reverify/ledger.py:70-74`（ledger 自述范围）：

```
LEDGER_INSTRUCTIONS = (
    "Reverify keeps a durable ledger per binary of everything its tools verified, observed, "
    "proved or refuted (re_verify_claim records automatically). After a context reset "
    (/clear, compaction, or a new session) call re_ledger with the file path to restore the "
    "grounded state instead of re-deriving it (max_facts bounds how much comes back). Facts "
```

【推断】纯源码任务无二进制 → 无 sha256 键 → ledger/ledger-backed hand-off 状态基本空转。

### C4. rollover 状态机：阈值、hand-off 形状校验、action=allow

`reverify/rollover_harness.py:52-64`：

```
DEFAULT_THRESHOLD = 200_000
DEFAULT_STEP = 100_000
DEFAULT_MIN_INTERVAL = 120.0
HANDOFF_NAME = "rollover-handoff.md"
HANDOFF_MAX_BYTES = 24 * 1024
ANCHOR_MAX_CHARS = 1200
TAIL_BYTES = 4 * 1024 * 1024
HOOK_MARKERS = ("rollover_harness.py", "claude_rollover.py", "rollover_guard.py", "reverify-rollover")
HARNESSES = ("claude", "codex", "gemini", "opencode")
CODEX_NO_COMPACT_LIMIT = 100_000_000

ENV_TOKENS = "REVERIFY_ROLLOVER_TOKENS"
ENV_STEP = "REVERIFY_ROLLOVER_STEP"
```

`reverify/rollover_harness.py:560-578`（validate_handoff 全文）：

```
def validate_handoff(path: Path, not_before: float) -> Optional[str]:
    """None when the hand-off is usable; otherwise the reason it is not."""
    if not path.is_file():
        return "hand-off file missing"
    stat = path.stat()
    if stat.st_mtime < not_before - 1.0:
        return "hand-off file was not rewritten after the block"
    if stat.st_size > HANDOFF_MAX_BYTES:
        return f"hand-off larger than {HANDOFF_MAX_BYTES} bytes"
    if stat.st_size == 0:
        return "hand-off file is empty"
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return f"hand-off unreadable: {exc}"
    headings = [line for line in text.splitlines() if line.startswith("## ")]
    if len(headings) < 3:
        return "hand-off has fewer than 3 sections"
    return None
```

`reverify/rollover_harness.py:802-805`（hand-off 被拒后的行为）：

```
        state["last_outcome"] = "handoff_rejected: " + problem
        save_state(state)
        log_event("handoff_rejected", harness=harness.name, session=session_id, problem=problem, handoff=str(handoff))
        return {"action": "allow", "why": problem}
```

`reverify/rollover_harness.py:17-20`（模块 docstring 对失败路径的描述）：

```
2. **Receipt, fail closed.** On the next stop the guard checks that the file was really
   rewritten and is well-formed; only then does it write a receipt carrying the transcript's
   SHA-256 and the user's verbatim first and latest messages. Otherwise nothing happens and
   the guard re-arms further up.
```

【推断】"fail closed"指不发放 receipt（不触发换会话），不是阻断会话；hook 层返回 action="allow"，会话继续生长，guard 在更高 token 处重新触发。

`reverify/rollover_harness.py:2223-2225`（hook 整体 fail-open）：

```
    except Exception as exc:  # hooks fail open, always
        debug(f"error: {exc!r}")
        return 0
```

### C5. hand-off 模板：七节 + UNVERIFIED 页脚

`reverify/rollover_harness.py:678-687`（HANDOFF_TEMPLATE 全文）：

```
HANDOFF_TEMPLATE = """# Rollover hand-off
written: {when} · session: {session} · context: {tokens}
## Task and goal (one line) + constraints or preferences the user stated
## Decisions the user made (one reason each; include "don't" / "not yet")
## Done / in progress / not done
## Identifiers and paths, verbatim (commits, tags, PR/issue numbers, CI run ids, file paths, commands to re-run)
## Verification status (test counts and results, baseline numbers, which environment ran, which did not)
## Waiting on the user / waiting on external results (background jobs, CI)
## Next step
(This file is the model's own notes = UNVERIFIED. Verified facts live only in the memory files and the reverify ledger. Mark anything uncertain as uncertain; never fill gaps.)"""
```

### C6. receipt 消费路径与"未必消费"

`reverify/rollover_harness.py:1774-1779`（Launcher 不变量）：

```
    Invariants (each has a test):
    - a receipt is consumed exactly once (atomic rename) and never re-used after a restart;
    - a user message that lands after the hand-off cancels that rollover;
    - a receipt with an unknown schema, or one arriving sooner than ``min_interval`` after
      the previous rollover, is ignored (fail closed);
    - the successor's first message quotes the user's original request verbatim.
```

`reverify/rollover_harness.py:1978-1982`（unconsumed_receipts 定义）：

```
def unconsumed_receipts(harness_name: str) -> Dict[str, Any]:
    """Receipts issued to sessions that neither a launcher nor an in-place reset followed up on.

    Each one is a hand-off that was written for nothing: the session kept running past the threshold.
```

`reverify/rollover_harness.py:2094-2101`（doctor 对未消费 receipt 的判词）：

```
        elif unconsumed["count"]:
            row["problems"].append(
                f"{unconsumed['count']} hand-off receipt(s) went to sessions the launcher did not start "
                f"(peak {fmt_k(unconsumed['peak'])}, last {unconsumed['last_at']}); nothing ended those sessions, so with "
                f"native compaction off they kept growing. Start the CLI through `reverify rollover {name}` "
                "(add --remote-control to keep phone/web access) so a fresh session actually follows each hand-off"
```

【推断】receipt 只有三条消费路径：launcher（换进程）；inline 重置（gemini 的 `clearContext: True` 只证明当前上下文被重置，是否等同"新会话"未验证；opencode 插件经 SDK 开新 session）；successor（仅 claude 有 `REVERIFY_ROLLOVER_SUCCESSOR=bg` 开关，codex 未见等价物，未验证）。"receipt 未被消费"仅发生在未使用这三条路径的 plain session（CHANGELOG 列明：desktop app、`claude --bg`、Remote Control server mode、plain `claude`）→ receipt 写入后无人消费，doctor 依赖用户跑 `doctor` 才发现。

### C7. 宿主差异（【直接源码】）

`reverify/rollover_harness.py:872-873`（ClaudeHookFormatter.format_receipt 返回 None）：

```
    def format_receipt(self, result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return None
```

`reverify/rollover_harness.py:1246-1248`（Gemini 的 inline 清上下文）：

```
    def format_receipt(self, result):
        if result.get("inline"):
            return {"hookSpecificOutput": {"hookEventName": "AfterAgent", "clearContext": True}}
        return None
```

`reverify/rollover_harness.py:1510-1513`（OpenCode 插件协议）：

```
            elif result["action"] == "receipt":
                emit({"action": "rollover" if result.get("inline") else "none", "opening": result["opening"],
                      "handoff": result["receipt"].get("handoff_path")})
            else:
                emit({"action": "none", "why": result.get("why")})
```

`reverify/rollover_harness.py:1004`（Claude successor 开关）：

```
    SUCCESSOR_ENV = "REVERIFY_ROLLOVER_SUCCESSOR"          # "bg" -> `claude --bg <opening>` on each receipt
```

【推断】宿主差异严格表述：gemini 的 `clearContext: True` 只证明当前上下文被重置（不能写成"新会话"）；opencode 插件经 SDK 开新 session；claude 的 Stop hook 无权结束会话，需 launcher 或 opt-in successor；codex 需 launcher，未验证有等价 successor 开关。

## D. BENCHMARK 摘录（【项目自述】，未独立复现）

BENCHMARK.md:64-70：

```
Across the reference run, the three CI runs and the third-party aarch64 run below: **275
binaries, 4 formats/architectures, 0 false VERIFIED** (pooled 95% upper bound about 1.4%).
The gate is the same everywhere: one false VERIFIED fails the build. Known gap: for the
*universal* system binaries on the arm64 macOS runner, lief still judges the x86_64 slice
(slice selection by host CPU is in place but has not taken effect on the runner yet — under
investigation); AArch64 Mach-O code **is** exercised through the compiled corpus below,
which is built natively for arm64 on that runner.
```

BENCHMARK.md:134-135：

```
Pooled with the reference run: **0 false VERIFIED of 2,007 known-false claims** across four
platforms (95% upper bound about 0.2%).
```

【未实测】以上数字直接采信项目文档，本次审计未复现任何 benchmark 运行。

## E. CHANGELOG 摘录（【直接源码】/【项目自述】混合）

unconsumed receipt 实测病例（CHANGELOG.md:13-17，【项目自述】）：

```
- **`reverify rollover doctor` reports hand-offs nobody consumed.** A receipt whose session was not
  started by the launcher (desktop app, `claude --bg`, Remote Control server mode, a plain `claude`)
  used to look fine while the session kept growing with native compaction off — one measured
  session reached 909k tokens. Doctor now counts those receipts per harness, shows the peak, and
  names the two remedies.
```

hand-off UNVERIFIED 标注（CHANGELOG.md:120-122，【直接源码】）：

```
- The model works through a small JSON protocol: propose claims, take notes, update its
  established-facts ledger...
```

（另见 0.11.0 节：guard "asks for a hand-off *file* (fixed sections, UNVERIFIED) instead of an in-band summary"。）

32 位 x86 静默错误史（CHANGELOG.md:87-91，【直接源码】）：

```
- **32-bit x86 argument passing in the emulation runner** (PR #12, @IMGillusion):
  `arch='x86'` fell back to 64-bit register names, a no-op in 32-bit unicorn mode,
  so every 32-bit call silently saw `arg=0` and returned 0. Added 32-bit register
  sets, an arch→bit-width map (bits derived from arch; an explicit mismatch now
  raises), fixing `behavior_equiv` for 32-bit code.
```

## F. ROADMAP 摘录（【直接源码】）

ROADMAP.md:60-69：

```
## 5. Deeper claim kinds — and off binaries, toward verified coding

- [x] **`functions_equiv`**: differential execution of two implementations — compile a
  candidate and a reference, run over shared inputs, compare. The everyday "did this
  rewrite / the AI's version preserve behaviour?" check; the same rigour aimed at ordinary
  source code, not just binaries. First step of the verified-coding domain.
- [x] A real coding surface: a `reverify equiv` CLI and a **Python** runner (no toolchain, so it
  runs everywhere), alongside C.
- [ ] Grow it further: more languages (JS/Go/Rust), function-level (not just whole-program)
  contracts, spec-by-examples as the oracle.
```

【推断】"verified coding" 目前只有 functions_equiv 一步落地，更多语言/函数级契约/spec-by-example 全是未勾选项。

## G. GitHub issue/PR 状态（【外部记录】，2026-09-19 在线读取）

**issue #22**（open，2026-09-11，@czk-aa）"Verifier marks vacuous claims VERIFIED (empty string/pattern/bytes/mnemonics)"——自报类型 verified-wrong。最小复现（issue 正文逐字）：

```python
from reverify.verifier import Verifier, Claim

data = b"hello world"
claim = {"kind": "bytes_at", "params": {"offset": 3, "expected": ""}}
v = Verifier(data)
result = v.verify(Claim.from_dict(claim))
print(result["verdict"], result["detail"])
# VERIFIED  bytes match   <-- expected "" matched anything
```

同行为：`{"kind": "string_present", "params": {"value": ""}}`、`{"kind": "pattern_present", "params": {"pattern": "??"}}`、`{"kind": "instructions", "params": {"offset": 0, "mnemonics": []}}`。issue 指出这四类断言"true of *every* byte stream"，且都带正 base_weight（如空 bytes_at 的 0.3），可被用来刷 `grounded_score`。

**PR #21**（fix: refuse vacuous VERIFIED claims and bound PE export table reads，@czk-aa）：**state: open**（2026-09-19 查询），即修复截至今日未合入上游。本地快照 f32ea84 同样不含（最新合并 #18；`grep "empty assertion" reverify/verifier.py` 无匹配）。【推断】"never accepts a wrong claim" 的主张在 issue #22 修复合入前存在已公开绕过。

**issue #14**（open，2026-09-05，@IMGillusion）"orchestrate: open-ended goals make the model ignore structured claim kinds"——开放式目标下模型退化为 `bytes_at` 盲猜、不收敛（`done: False`，ledger 充满 OBSERVED 读）。同目标换成具体措辞（"find the dynamic import list"）则 14 条 import_present VERIFIED。根因：`agent.py` 的 `RULES` 只推荐原始 kind。**PR #19**（对应一行修复）：**state: open**（2026-09-19 查询）。【推断】这正是"无预制答案"开放式任务的行为退化实测记录。

## H. 本机 handoff SKILL.md（【本地规约】，全文 16 行）

`/home/cpf/.agents/skills/handoff/SKILL.md`：

```
---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS - not the current workspace.

Include a "suggested skills" section in the document, naming which skills the next agent should call the Skill tool for.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, then treat them as a description of what the next session will focus on and tailor the doc accordingly.
```

【推断】本机已有 handoff 约定（模型写摘要、存临时目录、供下一个 agent 接力），无任何形状校验/receipt/会话替换机制；与 reverify rollover 的差别在于后者把"hand-off 落盘形状+receipt+换会话"做成了状态机，但 hand-off 内容本身同样出自模型、同样 UNVERIFIED。

## I. 复核结论汇总（【推断】/【未实测】）

1. **无预制答案 ≠ 无 oracle**：Verifier 由 `data: bytes` 初始化、`SUPPORTED` claim types 同时含二进制断言与 `functions_equiv`/`exebench`（C1）；对无机械核对对象的判断类工作，这些 claim 都无从断言，只剩 rollover/ledger 状态管理，而 ledger 按 binary sha256 键（C3）在纯源码任务空转。
2. **functions_equiv 窄契约**：int argv → int stdout、可信参考实现、32-bit 输入域、10 边界 + 24 固定种子伪随机共 34 组（max_inputs=40 不截断）、opt-in 原生执行（C2）。
3. **普通 coding + 已有 handoff 通常不值得装**（fit 判断，非机制断言）：验证面窄 + issue #22 洞 + 本机已有模型写 handoff 的约定（H）。
4. **hand-off validation 只查形状**：mtime/24KB/非空/≥3 个 `## ` 标题（C4），失败返回 action="allow"（C4），不校验内容真伪。
5. **receipt 未必消费**：仅 launcher/inline/successor 三条路径消费；"receipt 未被消费"仅发生在未使用这三条的 plain session（desktop app、`claude --bg`、plain `claude`，CHANGELOG.md:13-17 列明），实测一例涨到 909k tokens（E）。
6. **宿主差异**：gemini `clearContext` 只证明当前上下文重置；opencode 经 SDK 开新 session；claude 可 launcher 或 opt-in successor；codex 需 launcher，未验证等价 successor（C7）。
7. **benchmark 数字未独立复现**（D）。

**未实测声明**：未 pip install / 未运行 reverify 及任何 benchmark；issue/PR 状态为 2026-09-19 在线读取快照。
