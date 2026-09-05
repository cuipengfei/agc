# Code Mode 字符串摘录的规范化说明

- Source: 本 repo 研究会话，raw 证据等级复核
- Collected: 2026-09-05
- Published: Unknown
- 关系：本文限定 [Codex features 系统实测与 Code Mode 二进制取证](2026-09-05-codex-features-and-code-mode.md) 第四节的证据等级。原记录按 `raw/` 不可变规则保持原样。

## 问题

原记录第四节的 fenced block 把扫描上下文里的格式占位字节显示为 `…`，形如「原样摘录」。实际扫描命中的是 Rust 格式化串，占位处是不可打印字节（终端显示为 ``），`…` 是人工省略标记，不是二进制内容。

## 逐字确认的 literal 短串（扫描精确命中）

- `codex-code-mode-protocol`
- `expects raw JavaScript source text`
- `exec expects raw JavaScript source text (non-empty). Provide JS only, optionally with first-line ` + 反引号包裹的 `// @exec: {"yield_time_ms": 10000, "max_output_tokens": 1000}`（此完整串一次命中，逐字确认）
- `Waits on a yielded`（其后跟占位字节与 ` cell and returns new output or completion.`）
- `yield_time_ms`、`max_output_tokens`
- `does not advertise Code Mode support. This may degrade model performance.`
- `core/src/tools/code_mode/execute_handler.rs`、`core/src/tools/code_mode/wait_handler.rs`
- `codex.code_mode.v1.rs`
- `enable ` + 反引号包裹的 `features.code_mode_host` + ` and install ` + 反引号包裹的 `codex-code-mode-host`

## 属规范化显示的（占位字节替换为 …，非逐字）

- `Code Mode is unavailable because … ; enable …`（两处占位）
- `model ` + 占位 + ` does not advertise Code Mode support…`
- `exec pragma only supports ` + 反引号字段名 + `; got ` + 占位
- `code-mode IPC frame length … exceeds … bytes`（数字占位）

## 使用约束

引用这些字符串时，逐字性只对上节列出的 literal 短串成立；含 `…` 的长串应表述为「扫描上下文摘录（规范化显示）」，不得当作可逐字比对的原文。
