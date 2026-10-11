# OMP 本地构建：内部 worker 与运行时依赖（v18.8.7 源码摘录）

> Source: 本机 oh-my-pi 仓库 v18.8.7（commit f261ed9）源码文件；当前会话的进程列表观察
> Collected: 2026-10-11
> Published: Unknown

## 用户问题

- 「there is a text predict thing? we built that as well?」（进程列表出现 `__omp_worker_text_predict`）
- 「we built all here listed?」（进程列表包含多个 OMP worker 与其他程序）

用户提供的进程列表显示（OMP 部分全部来自全局安装路径）：

- `/home/cpf/.bun/bin/bun /home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js __omp_worker_daemon_broker`
- 同路径 `__omp_worker_lsp_mux`
- 同路径 `__omp_worker_text_predict`
- `/home/cpf/.bun/install/global/node_modules/@colbymchenry/codegraph-linux-x64/node -e …`（CodeGraph）
- `/bin/bash /home/cpf/.omp/mem-ledger/start-watcher.sh`（mem-ledger 监控）
- `/usr/bin/zsh -l -i -c procs omp`（用户查询命令）

本地构建的 `packages/coding-agent/dist/omp` 未出现在该列表。

## worker 分派（src/cli.ts）

`src/cli/worker-selectors.ts:20-25` 定义 worker 参数常量：`__omp_worker_stats_activity`、`__omp_worker_text_predict`、`__omp_worker_terminal_output`；cli.ts 另引用 `DAEMON_BROKER_WORKER_ARG`、`LSP_MUX_WORKER_ARG`。

`src/cli.ts:292-317` 分派（关键行）：

- 292：`if (arg === DAEMON_BROKER_WORKER_ARG)` → `await import("./launch/broker")`，`startDaemonBrokerFromEnvironment()`
- 298：`if (arg === LSP_MUX_WORKER_ARG)` → `await import("./lsp/mux/server")`，`startLspMuxFromEnvironment()`
- 313：`if (arg === TEXT_PREDICT_WORKER_ARG)` → `await import("./predict/daemon")`，`startTextPredictDaemonFromEnvironment()`

同一入口文件既运行主 CLI 也运行这些 worker；worker 不需要单独构建可执行文件。

## 文本预测 daemon（src/predict/daemon.ts）

`daemon.ts:1-11` 注释（摘录）：

> Server half of the machine-global text-prediction daemon (worker selector `__omp_worker_text_predict`, started through the `text-predict` global broker). Lazily opens one `TextPredictor` per requested engine … `smollm` requests are answered by SmolLM and ngram together (`blend.ts`).

`daemon.ts:335-346` 引擎打开：

- 338：`if (!(await smolLmWeightsReady())) throw new SmolLmWeightsMissingError();`
- 339：`modelDir = getSmolLmModelDir();`
- 346：`let predictor = new TextPredictor({ method, stateDir, modelDir, showThreshold });`

`TextPredictor` 来自 `@oh-my-pi/pi-natives`（daemon.ts:16），是 Rust addon 提供的原生实现。

## SmolLM 权重按需下载（src/predict/smollm-weights.ts）

`smollm-weights.ts:7-29` 注释（摘录）：

> On-demand weights for the `smollm` word-completion engine (`pi_predict::smollm`): the SmolLM2-135M base checkpoint (Apache-2.0), every file pinned to one repo revision and verified by size and SHA-256. … Format: `config.json` and `tokenizer.json` from the upstream repo, and the weights as llama.cpp's `Q8_0` GGUF export (145 MB …) from QuantFactory/SmolLM2-135M-GGUF …

> Only interactive processes download (the composer on first use through `prefetchSmolLmWeights`, shown in the download HUD, or `omp tiny-models download smollm`); the prediction daemon just checks `smolLmWeightsReady` and serves ngram until then.

SmolLM 权重是运行时数据，不属于本地构建产物。

## Transformers.js / onnxruntime-node 路径（src/cli.ts）

`cli.ts:321-328` 注释（摘录）：

> Boot a subprocess-isolated transformers.js worker over the parent's IPC channel … The tiny-model, STT, and TTS workers each run `onnxruntime-node` (loaded transitively by `@huggingface/transformers`) in a child address space because its NAPI finalizer segfaults Bun on shutdown (issue #1606) …

编译二进制把 `onnxruntime-node` 列为外部依赖不内嵌（compile-binary.ts 的 `COMPILED_EXTERNAL_DEPENDENCIES` 注释：fastembed、onnxruntime-node "always resolved from the on-demand install instead of embedded"）。该路径与 smollm 预测相互独立。

## 其他进程

- LSP mux 代码随主程序打包（cli.ts:298-301）；实际 language server 是外部程序。
- CodeGraph（@colbymchenry/codegraph-linux-x64）与 mem-ledger 监控不属于 OMP 构建产物。

## 证据边界

- 未单独运行本地构建的 worker 入口，未验证内部功能。
- 未执行 SmolLM 权重下载或模型推理。
- 本地运行证据仍为 `--version`、`--help` 与用户确认的会话恢复。
