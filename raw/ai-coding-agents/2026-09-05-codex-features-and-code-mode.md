# Codex features 系统实测与 Code Mode 二进制取证

- Source: 本 repo 研究会话，对本机 Codex CLI 0.153.4 的 features 子命令实测、config.toml 检查、native 二进制字符串扫描
- Collected: 2026-09-05
- Published: Unknown

## 一、`codex features list` 完整输出（135 项）

```
apply_patch_freeform                     removed            false
apply_patch_preserve_line_endings        under development  false
apply_patch_streaming_events             under development  false
apps                                     stable             true
apps_mcp_path_override                   removed            false
artifact                                 under development  false
auth_elicitation                         stable             true
background_paginated_rollout_migration   under development  false
bedrock_setup_wizard                     under development  false
browser_use                              stable             true
browser_use_external                     stable             true
browser_use_full_cdp_access              stable             true
chronicle                                under development  false
code_mode                                under development  false
code_mode_buffered_exec                  removed            false
code_mode_host                           stable             true
code_mode_interrupt                      under development  false
code_mode_only                           under development  false
code_mode_prewarm                        under development  false
codex_git_commit                         removed            false
collaboration_modes                      removed            true
compaction_image_budget                  stable             true
computer_use                             stable             true
concurrent_reasoning_summaries           under development  false
content_item_kinds                       stable             true
context_management                       under development  false
current_time_reminder                    under development  false
cwd_relative_turn_diffs                  under development  false
default_mode_request_user_input          under development  false
deferred_executor                        under development  false
deferred_tool_world_state                under development  false
elevated_windows_sandbox                 removed            false
enable_fanout                            removed            false
enable_mcp_apps                          under development  false
enable_request_compression               stable             true
exec_permission_approvals                under development  false
executed_tool_call_metadata              under development  false
executor_capability_discovery            under development  false
experimental_windows_sandbox             removed            false
external_agent_memory_import             under development  false
external_migration                       removed            false
fast_mode                                stable             true
goals                                    stable             true
guardian_approval                        stable             true
guardian_enhanced_node_repl_transcripts  under development  false
guardian_ext                             under development  false
guardian_node_repl_transcript_images     under development  false
guardian_reuse_parent_compaction         under development  false
guardianv2                               under development  false
hooks                                    stable             true
image_detail_original                    removed            false
image_generation                         stable             true
image_resize_notice                      under development  false
in_app_browser                           stable             true
in_app_chat                              stable             true
in_app_dictation                         stable             true
in_app_local_automation                  stable             true
in_app_updates                           stable             true
item_ids                                 removed            true
js_repl                                  removed            false
js_repl_tools_only                       removed            false
local_thread_store_compression           under development  false
local_thread_store_shared_compression    removed            false
mcp_2026_07_28                           under development  false
mcp_oauth_refresh_coordination           under development  false
memories                                 stable             true
mentions_v2                              stable             true
multi_agent                              stable             true
multi_agent_mode                         removed            false
multi_agent_v2                           stable             false
network_proxy                            experimental       false
non_prefixed_mcp_tool_names              under development  false
omit_app_server_notification_media       under development  false
personality                              stable             true
plugin_hooks                             removed            false
plugin_sharing                           stable             true
plugins                                  stable             true
powershell_shell_version                 under development  false
prevent_idle_sleep                       experimental       false
psp                                      under development  false
realtime_conversation                    under development  false
recommended_plugins                      stable             false
remote_compaction_v2                     stable             true
remote_control                           removed            false
remote_models                            removed            false
remote_plugin                            stable             true
request_permissions_tool                 under development  false
request_rule                             removed            false
resize_all_images                        removed            true
respect_system_proxy                     under development  false
responses_websockets                     removed            false
responses_websockets_v2                  removed            false
retain_client_developer_messages         under development  false
rollout_budget                           under development  false
runtime_metrics                          under development  false
search_tool                              removed            false
secret_auth_storage                      stable             false
send_async_message                       removed            false
shell_snapshot                           stable             true
shell_snapshot_v2                        under development  false
shell_tool                               stable             true
shell_zsh_fork                           under development  false
skill_env_var_dependency_prompt          removed            false
skill_mcp_dependency_install             stable             true
skill_search                             stable             true
skip_host_skill_discovery                under development  false
sleep_tool                               stable             true
sqlite                                   removed            true
standalone_web_search                    under development  false
steer                                    removed            true
step_model_switching                     under development  false
terminal_resize_reflow                   removed            true
terminal_visualization_instructions      under development  false
token_budget                             under development  false
tool_call_mcp_elicitation                stable             true
tool_search                              removed            false
tool_search_always_defer_mcp_tools       removed            true
tool_suggest                             stable             true
transcript_v2                            under development  false
tui_app_server                           removed            true
unavailable_dummy_tools                  removed            false
unbounded_connection_retries             stable             true
undo                                     removed            false
unified_exec                             stable             true
unified_exec_zsh_fork                    removed            true
unified_image_budget                     under development  false
use_agent_identity                       under development  false
use_legacy_landlock                      deprecated         false
use_linux_sandbox_bwrap                  removed            false
view_image                               stable             true
web_search_cached                        deprecated         false
web_search_request                       deprecated         false
workspace_dependencies                   stable             true
workspace_owner_usage_nudge              removed            false
write_stdin_approval                     under development  false
```

脚本解析计数：135 项 = effective true 48 + effective false 87。按 stage × effective 交叉：
stable true 39；stable false 3（multi_agent_v2、recommended_plugins、secret_auth_storage）；experimental false 2（network_proxy、prevent_idle_sleep）；under development false 52；deprecated false 3（use_legacy_landlock、web_search_cached、web_search_request）；removed true 9；removed false 27。

注意：本会话早期曾手数出「126 行、28 个 stable true、34 个 removed」，是错的；上表数字全部来自脚本解析，以此为准。

## 二、enable 执行记录

执行 `codex features enable` 的对象：multi_agent_v2、recommended_plugins、secret_auth_storage、apply_patch_preserve_line_endings、apply_patch_streaming_events、code_mode。命令输出：

```
Enabled multi_agent_v2 in config.toml. 等六条（格式相同）
Warning: Under-development features are incomplete and may behave unpredictably. Set suppress_unstable_features_warning = true in config.toml to hide this warning.
```

（该 warning 仅在 enable under-development 项时出现。）

enable 后复跑 `features list` 的对应行：

```
apply_patch_preserve_line_endings        under development  true
apply_patch_streaming_events             under development  true
code_mode                                under development  true
code_mode_buffered_exec                  removed            false
code_mode_host                           stable             true
code_mode_interrupt                      under development  false
code_mode_only                           under development  false
code_mode_prewarm                        under development  false
multi_agent_v2                           stable             true
plugin_hooks                             removed            false
recommended_plugins                      stable             true
secret_auth_storage                      stable             true
terminal_resize_reflow                   removed            true
```

`~/.codex/config.toml` 的 `[features]` 段现状：

```toml
terminal_resize_reflow = true
memories = true

plugin_hooks = true

multi_agent = true

hooks = true
goals = true
multi_agent_v2 = true
recommended_plugins = true
secret_auth_storage = true
apply_patch_preserve_line_endings = true
apply_patch_streaming_events = true
code_mode = true
```

## 三、removed × effective 的两个判别性数据点

- `plugin_hooks = true` 写在 config.toml `[features]` 里，但 `features list` 显示 plugin_hooks 为 removed 且 effective **false**。
- `terminal_resize_reflow = true` 同样写在 config.toml 里，stage removed，effective **true**。

待验证假设（非已证机制）：removed 功能的 effective 值冻结在其移除前的默认值上，config 里的显式设置被忽略——plugin_hooks 一例直接证成「config 值被忽略」；但「统一冻结」是否对所有 removed 项成立、还是 feature-specific 行为，未读源码，仅作假设记录。

## 四、Code Mode 二进制字符串取证（native codex 258MB，/vendor/x86_64-unknown-linux-musl/bin/codex）

以下字符串经二次扫描逐字复核，确认存在于二进制（fenced block 内为原样摘录，含原始反引号；`…` 为二进制格式化占位处的省略标记）：

```text
Code Mode is unavailable because … ; enable `features.code_mode_host` and install `codex-code-mode-host`.
Code Mode is enabled in configuration, but model `…` does not advertise Code Mode support. This may degrade model performance. Disable `features.code_mode` and `features.code_mode_only`, or select a model whose metadata enables Code …
exec expects raw JavaScript source text (non-empty). Provide JS only, optionally with first-line `// @exec: {"yield_time_ms": 10000, "max_output_tokens": 1000}`.
core/src/tools/code_mode/execute_handler.rs   （紧邻 expects raw JavaScript source text）
core/src/tools/code_mode/wait_handler.rs
Waits on a yielded `…` cell and returns new output or completion.
exec pragma only supports `yield_time_ms` and `max_output_tokens`; got `…`
exec pragma fields `yield_time_ms` and `max_output_tokens` must be non-negative safe integers
exec pragma must be valid JSON with supported fields
codex-rs/target/…/build/codex-code-mode-protocol-…/out/codex.code_mode.v1.rs
code-mode-protocol/src/host/codec.rs
code-mode IPC frame length … exceeds … bytes
```

推断（未读源码）：Code Mode = 模型产出 JavaScript cell，由独立 host 进程执行，`wait` 类工具轮询 cell 产出；`code_mode_host`（stable）是底座开关，`code_mode` 是本体（under development），`code_mode_only` 限制只能用 code mode 工具调用，`code_mode_prewarm` 预热 host，`code_mode_interrupt` 允许中断。

## 五、`codex-code-mode-host --help` 全文

二进制随 `@openai/codex` 的 platform package 发布，位于 `node_modules/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/bin/codex-code-mode-host`，66.2MB，不在 PATH。`--version` 不存在（`error: unexpected argument '--version' found`）。help 全文：

```
Usage: codex-code-mode-host [OPTIONS]

Options:
      --listen <URL>               Transport endpoint: `stdio`, `stdio://`, or `grpc://IP:PORT`
                                   [default: stdio]
      --otel-trace-listen <URL>    Optional WebSocket endpoint that streams only raw OTLP trace
                                   batches
      --otel-trace-exporter <URL>  Optional OTLP/HTTP JSON trace exporter endpoint, analogous to
                                   `otel.trace_exporter` in app-server configuration
  -h, --help                       Print help
```

证据边界：help 只证明它支持 stdio / grpc://IP:PORT transport 与两个 OTLP trace 选项。它是「被 Codex 调起的 Code Mode host/协议进程」；launcher（`bin/codex.js`）只按 vendor 相对路径解析 codex 本体，谁负责 spawn host、按什么路径找 host，未验证。code_mode 开关已开但端到端未实测——还需模型 metadata advertise Code Mode support。
