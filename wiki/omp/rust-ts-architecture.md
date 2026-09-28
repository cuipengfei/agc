# OMP Rust/TS architecture and pi-natives

> Sources: OMP source code and binary inspection, 2026-09-27
> Raw: [OMP pi-natives Rust crate inventory and N-API binding evidence](../../raw/omp/2026-09-27-omp-pi-natives-crate-inventory.md); [OMP 18.3.3 predictive text engine changelog and settings source](../../raw/omp/2026-09-27-omp-18-3-3-predictive-text-engine.md)
> Updated: 2026-09-27

## Overview

OMP 主体是 TypeScript，运行在 Bun 上。原生功能（文件搜索、shell 执行、编辑引擎、diff、音频、输入预测等）集中在 `pi_natives` 一个预编译的原生插件（`.node` 文件）中，通过 Node-API 暴露给 TS。这个插件由 Rust 编写，证据是 `THIRD-PARTY-NOTICES.txt` 的 "RUST RUNTIME DEPENDENCY LICENSES — Generated from Cargo.lock by cargo-about 0.8.2"。

## TS 侧职责

TS 侧（`pi-coding-agent` 包）负责编排逻辑：CLI 入口、TUI 渲染、模型 provider HTTP 调用、MCP 客户端、工具调度、会话管理、配置、extensions/hooks、daemon 进程的生命周期管理。TS 通过 `import { ... } from "@oh-my-pi/pi-natives"` 调用原生功能。

## Rust crate 清单

二进制 `pi_natives.linux-x64-modern.node` 中内嵌了 12 个 crate 的源文件路径。以下按 crate 分组（完整文件清单见 raw 文件）。各 crate 的运行职责为按名字与文件名推断，未逐一实测。

### pi-predict

文件：`prose.rs`。TS 侧注释引用 `pi_predict::smollm::open`（`smollm-weights.ts:52`），表明 crate 内有 `smollm` 模块。ngram 和 smollm 的模块文件未在 strings 提取中出现，可能因内联或不同路径模式。（推断：负责输入预测）

### pi-diff

文件：`lib.rs`。（推断：文本差异计算）

### pi-edit

文件：`diff_string.rs`、`fuzzy.rs`、`notebook.rs`、`path_policy.rs`、`session.rs`、`store.rs`、`stream_json.rs`、`text.rs`。（推断：hashline 编辑协议实现）

### pi-ast

文件：`ops.rs`、`summary.rs`。（推断：AST 操作与代码摘要）

### pi-vcs

源文件路径未在提取中出现（仅 crate 名可见）。

### pi-vfs

文件：`canonicalize.rs`、`dir.rs`、`file.rs`、`fs.rs`、`path.rs`、`provider.rs`、`runtime.rs`。（推断：虚拟文件系统抽象）

### pi-walker

文件：`lib.rs`。（推断：目录遍历）

### pi-shell

文件：`cancel.rs`、`output_decode.rs`、`process.rs`、`shell.rs`。（推断：进程管理与 shell 执行）

### pi-iso

文件：`diff.rs`、`lib.rs`、`zfs.rs`。（推断：任务隔离，含 ZFS 支持）

### pi-voice

文件：`audio.rs`、`live.rs`。（推断：音频采集/播放与 live 语音通道）

### pi-builtins

103 个 `.rs` 文件，文件名对应一套 shell 内建命令。清单中实际出现的命令包括：`alias`、`cat`、`cd`、`cp`、`cut`、`date`、`diff`、`echo`、`exec`、`find`、`grep`、`head`、`history`、`jq`、`kill`、`ls`、`mv`、`printf`、`ps`、`pwd`、`rm`、`sed`、`seq`、`sleep`、`sort`、`tail`、`tee`、`test`、`touch`、`tr`、`uniq`、`wc`、`xargs`、`yes` 等（完整 103 项见 raw）。

> 推断：`pi-builtins` 以 Rust 重写这些命令的文件名意味着 bash 工具执行 `ls`、`cat` 等命令时可能不需要 fork 外部进程。此推断基于文件清单和命令名，未实测验证。

### pi-natives

28 个 `.rs` 文件，是顶层胶水层，把上述 crate 的功能通过 Node-API 导出给 TS。文件：`appearance.rs`、`ast.rs`、`audio.rs`、`crash_handler.rs`、`diff.rs`、`edit.rs`、`glob_util.rs`、`grep.rs`、`highlight.rs`、`iso.rs`、`js.rs`、`keys.rs`、`live.rs`、`power.rs`、`predict.rs`、`prof.rs`、`ps.rs`、`pty.rs`、`shell.rs`、`sixel.rs`、`snapcompact.rs`、`spelling.rs`、`task.rs`、`text.rs`、`tokens.rs`、`tty_writer.rs`、`vcs.rs`、`vectors.rs`。

## native/index.js 导出的 API

类（20 个）：AudioCapture、AudioPlayback、DesktopSession、DiffStream、EditSession、EditStore、FileLock、HighlightStream、LiveWebRtcPeer、MacAppearanceObserver、NativeOAuthCallback、PowerAssertion、Process、PtySession、Shell、TextPredictor、TtyWriter、VcsGitRepo、VcsJjWorkspace、VcsRepo

函数（部分）：`executeShell`、`glob`、`grep`、`countTokens`、`diffLines`、`diffWords`、`editDiffString`、`editInspect`、`execReplace`、`extractInlineSloppyRegions`、`astMatch`、`editGrammar`、`hashlineFileHash`、`hashlineCountOps`、`getWorkProfile`、`copyToClipboard`、`encodeSixel`、`decodeSixelToPng`、`deviceCheckGenerateToken`、`__ompInstallTokioRuntime`、`__piNativesBuildVersion`

文件头注释（`index.js:1-21`）说明导出列表由 `gen-enums.ts` 在 `napi build` 重新生成 `index.d.ts` 后自动重写。

## 分层对 agent 行为的影响

> 以下为分析推断，非源码直接证据。

TS 编排 + Rust 执行的分层让 OMP 能在工具层做控制：bash 工具的输出格式、取消、超时可以在 Rust 层插桩；grep/glob 工具的遍历在 Rust 层实现；edit 工具的 hashline 校验在 Rust 层执行。代价是 `.node` 文件体积较大。

## See Also

- [OMP predictive text engine](predictive-text-engine.md)
- [Node-API and napi-rs in OMP](napi-node-api.md)
