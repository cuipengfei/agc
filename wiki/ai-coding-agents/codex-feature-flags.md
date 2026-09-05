# Codex 特性门系统（features）与 Code Mode

> Sources: 本机实测（Codex CLI 0.153.4），2026-09-05
> Raw: [Codex features 系统实测与 Code Mode 二进制取证](../../raw/ai-coding-agents/2026-09-05-codex-features-and-code-mode.md); [Code Mode 字符串摘录的规范化说明](../../raw/ai-coding-agents/2026-09-05-code-mode-string-normalization.md)（含 `…` 的长串为规范化显示，逐字性仅对说明中列出的 literal 短串成立）
> Updated: 2026-09-05

## 特性门是什么

`codex features list` 把每条功能的生命周期阶段与开关状态摊在明面上。本机 0.153.4 共 135 项（脚本解析），两列**正交**：

- **stage**：`stable` / `under development` / `experimental` / `deprecated` / `removed`——功能的生命周期标签。
- **effective**：true/false——叠完 config.toml、CLI flag、默认值之后的最终计算值。它只证明当前算出来是什么，看不出被哪一层设置。

**enable 前基线**分布（脚本计数）：stable true 39；stable false 3（`multi_agent_v2`、`recommended_plugins`、`secret_auth_storage`——stable ≠ 默认开）；experimental false 2（`network_proxy`、`prevent_idle_sleep`）；under development false 52；deprecated false 3；removed true 9；removed false 27。

**enable 后**（2026-09-05 复跑，脚本计数）：135 项 = stable true 42（+3）、under development true 3（`apply_patch_preserve_line_endings`、`apply_patch_streaming_events`、`code_mode`）、under development false 49；experimental false 2、deprecated false 3、removed true 9、removed false 27 不变。

用户侧操作：`features enable <name>` / `features disable <name>` 写 `config.toml` 的 `[features]` 段（等价于 `-c features.<name>=true`）；顶层 `--enable/--disable <FEATURE>` 对单次运行生效不落盘。enable under-development 项会警告「Under-development features are incomplete and may behave unpredictably」，可用 `suppress_unstable_features_warning = true` 静音。

## removed + true 的读法

`removed` 只是 stage 标签，不推导 effective。两个判别性数据点（本机 config.toml 实测）：

- `plugin_hooks = true` 写在 `[features]` 里，但 plugin_hooks 显示 removed 且 effective **false**——该样本显示 config 值未反映到 effective，原因未确定。
- `terminal_resize_reflow = true` 同样在 config 里，removed，effective **true**。

**待验证假设**（非已证机制）：removed 功能的 effective 冻结在其移除前的默认值上。但「统一冻结」是否对所有 removed 项成立、还是 feature-specific 行为，未读源码，仅作假设。对 removed 项执行 `features enable` 是否被接受、有无效果，未实测，不建议尝试。

## Code Mode

让模型直接写并执行 JavaScript 的运行时（推断，基于二进制字符串，未读源码）：

- 模型产出原始 JS（exec 工具描述串：「expects raw JavaScript source text (non-empty). Provide JS only, optionally with first-line `// @exec: ...`」），由独立 host 进程执行；`wait` 工具「Waits on a yielded cell and returns new output or completion」。
- cell 可带 pragma：`yield_time_ms`、`max_output_tokens`，必须是合法 JSON 且非负安全整数。
- 独立协议：构建路径串 `codex-code-mode-protocol-…/out/codex.code_mode.v1.rs`，同区域有 IPC frame 编解码（`code-mode-protocol/src/host/codec.rs`）。
- 前置条件：报错串指明需 `enable features.code_mode_host and install codex-code-mode-host`。
- **模型必须配合**：「model … does not advertise Code Mode support. This may degrade model performance.」——模型 metadata 需声明支持，否则功能退化。走中转/自定义 provider 的模型大概率没有这个声明。

## 本机启用状态（2026-09-05 实测开启）

已 enable 并复跑验证：`multi_agent_v2`、`recommended_plugins`、`secret_auth_storage`（stable）、`apply_patch_preserve_line_endings`、`apply_patch_streaming_events`（under development）、`code_mode`（under development）。

- `codex-code-mode-host` 随 `@openai/codex` 的 platform package 发布（`node_modules/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/bin/`，66.2MB），不在 PATH；`--help` 证明它是被 Codex 调起的 Code Mode host 进程，支持 `stdio` / `grpc://IP:PORT` transport 与两个 OTLP trace 选项，无 `--version`。
- 未验证项：launcher（`bin/codex.js`）只按 vendor 相对路径解析 codex 本体，谁负责 spawn host、按什么路径找 host 未验证；code_mode 开关已开但**端到端未实测**。
- `code_mode_only`、`code_mode_prewarm`、`code_mode_interrupt` 保持关闭——`code_mode_only` 会限制只能用 code mode 工具调用，模型未声明支持时强开会退化。

## See Also

- [四 Agent CLI 能力面对比](cli-capability-surface.md)
- [AI Coding Agent 对比：真正独特优势（19 家）](4-agent-comparison.md)
