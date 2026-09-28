# OMP predictive text engine (18.3.3)

> Sources: OMP changelog 18.3.3, 2026-09-27; OMP source code inspection, 2026-09-27
> Raw: [OMP 18.3.3 predictive text engine changelog and settings source](../../raw/omp/2026-09-27-omp-18-3-3-predictive-text-engine.md); [OMP pi-natives Rust crate inventory and N-API binding evidence](../../raw/omp/2026-09-27-omp-pi-natives-crate-inventory.md)
> Updated: 2026-09-27

## Overview

OMP 18.3.3（2026-09-27）引入了统一的输入预测引擎（predictive text engine），在用户敲字时以灰色幽灵文字（ghost text）形式给出下一个最可能的单词建议。Tab 接受建议并加空格，右箭头接受不加空格。该功能由 `spelling.autocomplete` 设置控制，默认 `auto`。

## 引擎选项

`spelling.autocomplete` 的枚举值定义于 `word-completion.ts:7`：

| 值 | 行为 |
|---|---|
| `auto`（默认） | 标准平台上用 N-gram 引擎 |
| `ngram` | 强制 N-gram |
| `smollm` | SmolLM2 模型，与 N-gram 混合评分 |
| `apple` | macOS 系统原生补全 |
| `off` | 关闭幽灵文字 |

changelog 原文（18.3.3, Changed 段）："Completion behavior now uses the N-gram engine for standard `auto` completion across platforms, with blended N-gram and SmolLM confidence scoring where applicable; the SmolLM2 model uses a 145 MB GGUF (Q8_0) download and is prefetched only when explicitly activated."

Linux 上没有 `apple` 引擎，`auto` 实际走 N-gram。

## SmolLM2 模型下载

当引擎设为 `smollm` 时，OMP 按需从 Hugging Face 下载 SmolLM2-135M 模型权重。文件清单（`smollm-weights.ts:52-75`）：

| 文件 | 来源仓库 | 大小 | 校验 |
|---|---|---|---|
| `config.json` | HuggingFaceTB/SmolLM2-135M | 704 B | sha256 |
| `tokenizer.json` | HuggingFaceTB/SmolLM2-135M | 2_104_556 B | sha256 |
| `SmolLM2-135M.Q8_0.gguf` | QuantFactory/SmolLM2-135M-GGUF | 144_810_464 B | sha256 |

所有文件固定 revision、逐个校验 sha256。GGUF 文件是 llama.cpp 生态的 Q8_0 量化格式（8-bit，32 权重每块，f16 scale）。总下载量约 145 MB。存储路径为 tiny-models 缓存目录下的 `predict/<org>--<name>/`。

## daemon 进程模型

预测引擎不在 TUI 主进程内运行，而是一个独立的后台 daemon。进程结构：

```
TUI 进程（omp）
└── __omp_worker_daemon_broker（全局 broker）
    └── __omp_worker_text_predict（预测 daemon）
```

daemon 由 broker 通过 `Bun.spawn` 拉起（`client.ts:163-177`），spawn 参数中 `detached: false, persist: false`（`client.ts:174-177`），即它是 broker 的普通子进程，不脱离。

daemon 行为（`daemon.ts:1-11` 文件头注释原文描述）：

- 每个请求的引擎惰性打开一个 `TextPredictor`
- 从 `history.db` 持续学习（按 row-id 游标批量摄取，`INGEST_BATCH = 1_000`）
- 引擎状态空时先从 Claude Code 和 Codex 的 prompt 历史启动学习（`foreign-history.ts`）
- `smollm` 请求由 SmolLM 和 ngram 共同回答（`blend.ts`）
- 空闲 15 分钟后自动退出（`IDLE_EXIT_MS = 15 * 60_000`）
- 学习状态每 30 秒防抖持久化一次（`PERSIST_DEBOUNCE_MS = 30_000`）
- 引擎状态加载失败时清空重建

## 与下拉补全的关系

`autocompleteMaxVisible`（默认 10）控制的是**下拉列表**（slash 命令、emoji 那类）的可见条数，不是幽灵文字。两者是独立的 UI 组件。设置位置：`settings.ts:841-849`，`ui.group: "Input"`。

## 相关命令

changelog 提到 `omp predict` 命令用于评估补全性能，`omp tiny-models download` 支持下载单词补全模型。这两个命令的详细行为未在本轮调查中验证。

## See Also

- [OMP Rust/TS architecture and pi-natives](rust-ts-architecture.md)
- [Node-API and napi-rs in OMP](napi-node-api.md)
