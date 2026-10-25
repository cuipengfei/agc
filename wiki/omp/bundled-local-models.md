# OMP /model 内置端侧模型目录（local-inference）

> Sources: 本会话取证（本机 @oh-my-pi/pi-catalog 与 @oh-my-pi/pi-coding-agent 安装源码直读）, 2026-10-25; 本会话实测（WSL2 设备与 CUDA 运行时状态、Hugging Face blobs API 载重探测）, 2026-10-25
> Raw: [bundled-local-models-catalog](../../raw/omp/2026-10-25-bundled-local-models-catalog.md)
> Updated: 2026-10-26

`/model` 选择器里的 `local` provider 携带 14 个内置端侧模型。它们的 provider 登记为 `"local"`，模型条目带 `api="local-inference" base-url="local://inference" bundle="always"`（`local.kdl:3-7`），每次请求直接送到本机子进程推理，与远端模型同表展示。标注的来源路径：`@oh-my-pi/pi-catalog` 的 `src/compat/rules/providers/local.kdl`、`@oh-my-pi/pi-coding-agent` 的 `src/{tiny,stt,tts}/` 与 `src/tiny/device.ts`、`tiny/worker.ts`、`tiny/local-inference-api.ts`、`src/subprocess/worker-runtime.ts`；缓存目录实现在 `@oh-my-pi/pi-utils` 的 `src/dirs.ts`。

## 14 个模型一览

kind 归属由 `local.kdl:108-116` 确定（kokoro→tts；parakeet/nemotron/whisper-\*→stt；lfm\*/falcon\*/qwen\*/llama3.2:3b/gemma-3-1b→tiny），用途与优劣描述取自 `tiny/models.ts`、`stt/models.ts`、`tts/models.ts` 的 description/contextNote 原文，下载仓库即各条目的 `repo` 字段（dtype 一律随条目：标题/记忆模型 q4，whisper base/small q8、large-v3-turbo q4，kokoro q8）。全部条目带 `cost input=0 output=0`、`supports-tools #false`、`allow-unauthenticated #true`（`local.kdl:5,11,13` 等）。

| 模型 | kind | 用途与优劣要点 | 实测下载量（2026-10-25） | HF 仓库 |
|---|---|---|---|---|
| `lfm2.5-230m` | tiny | 会话标题；注册默认（`local.kdl:4`），"fastest LFM2.5 option"，"Best balance among the current compact title models" | 216.0 MB（0.2 + 211.1 + 4.7） | LiquidAI/LFM2.5-230M-ONNX |
| `lfm2.5-350m` | tiny | 会话标题；"tends toward terse titles"——标题更短 | 297.1 MB（0.2 + 293.6 + 3.3） | onnx-community/LFM2.5-350M-ONNX |
| `falcon-h1-90m` | tiny | 会话标题；体积最小，"lower fidelity on complex prompts" | 137.7 MB（1.6 + 134.8 + 1.3） | onnx-community/Falcon-H1-Tiny-90M-Instruct-ONNX |
| `qwen3-1.7b` | tiny | 记忆抽取与合并；唯一 `reasoning: true`；ONNX 后端拒绝（见机器一节） | q4 权重 2147.2 MB（tokenizer 等小文件未探测） | onnx-community/Qwen3-1.7B-ONNX |
| `llama3.2:3b` | tiny | 记忆；"higher quality potential at higher disk/RAM/latency cost" | 3417.4 MB（0.3 + 2094.1 + 1311.4 + 11.6） | onnx-community/Llama-3.2-3B-Instruct-ONNX |
| `gemma-3-1b` | tiny | 记忆；"Best consolidation/dedup"，抽取会"leaks small talk" | 879.7 MB（0.3 + 859.1 + 20.3） | onnx-community/gemma-3-1b-it-ONNX |
| `qwen2.5-1.5b` | tiny | 记忆；"Best extraction granularity (atomic facts)"，合并弱 | 1799.1 MB（1787.6 + 7.0 + 2.8 + 1.7） | onnx-community/Qwen2.5-1.5B-Instruct |
| `lfm2-1.2b` | tiny | 记忆；记忆模型默认（`tiny/models.ts:63`）；"Fastest load; solid all-rounder" | 853.6 MB（0.2 + 850.1 + 3.3） | onnx-community/LFM2-1.2B-ONNX |
| `whisper-base` | stt | 听写；"Smallest + fastest; lowest accuracy" | 81.1 MB（23.2 + 53.7 + 4.2） | onnx-community/whisper-base |
| `whisper-small` | stt | 听写；"More accurate than Fast, still light on CPU/RAM" | 253.3 MB（92.3 + 156.8 + 4.2） | onnx-community/whisper-small |
| `whisper-large-v3-turbo` | stt | 听写；99 种语言，"large download, slower" | 763.2 MB（424.9 + 334.1 + 4.2） | onnx-community/whisper-large-v3-turbo |
| `parakeet-tdt-0.6b-v3` | stt | 听写默认（`stt/models.ts:132`）；25 种语言，"Open ASR Leaderboard leader"，官方注释称解码比 Whisper large-v3 快约 20× | 约 671 MB（encoder 652.2 + decoder 11.8 + joiner 6.4 + tokens.txt；整仓 671.2 MB） | csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8 |
| `nemotron-streaming-en-0.6b` | stt | 边说边出词的流式听写；仅英语；160 ms 音频块 | 约 663 MB（encoder 652.9 + decoder 7.3 + joiner 1.7 + tokens.txt；整仓 662.7 MB） | csukuangfj2/sherpa-onnx-nemotron-speech-streaming-en-0.6b-160ms-int8-2026-04-25 |
| `kokoro` | tts | `tts` 工具朗读文字；Kokoro-82M，`sampleRate: 24_000`，12 种内置音色 | 92.9 MB（92.4 + 0.5 音色 af_heart.bin） | onnx-community/Kokoro-82M-v1.0-ONNX |

下载量对照说明：whisper 三档的注册表 `sizeHint`（~60/~190/~600 MB）与实测加总 81.1/253.3/763.2 MB 有出入；kokoro 注释说 `weights ~100 MB`，实测 92.4 + 0.5；`qwen2.5-1.5b` 的 q4 导出（1787.6 MB）大于其 int8 导出（1579.0 MB），是上游仓库排布。八个语言模型（tiny 类）可同时进入 `tiny`、`memory`、`judge` 三个角色（见角色一节），五个 stt 只服务 `dictation`，一个 tts 只服务 `speech`。

## 「local」的运行机制

请求不走网络远端：catalog 登记的 `base-url="local://inference"` 与 `api="local-inference"` 由 `registerLocalInferenceApi()` 注册成自定义 API（`local-inference-api.ts:164-167`），实现 `streamLocalInferenceSimple` 的执行体引用 `tinyModelClient`（`local-inference-api.ts:12-14` 的 `import { tinyModelClient } from "./title-client"`），即 tiny 子进程 worker 的客户端。STT 注释写明两个引擎都跑在同一子进程 worker 里（`stt/models.ts:13-14` "Both engines run inside the hard-killed subprocess worker"）；kokoro 经 `kokoro-js` 跑在共享的 transformers.js/onnxruntime worker 上（`tts/models.ts:58-64` 注释原文）。推理权重首次使用时才下载并常驻缓存。

因为 `bundle="always"`，这 14 个条目始终出现在 `/model` 与知识层目录里，出现与否和是否已下载无关。是否已下载看缓存目录是否出现对应文件（见下一节）。

## 设备选择与三种后端

- 设置入口：环境变量 `PI_TINY_DEVICE`（官方文档行在 [OMP 环境变量全量参考](env-variables-reference.md)）或设置项 `providers.tinyModelDevice`，校验值共 14 个：`cpu, gpu, mlx, metal, webgpu, auto, cuda, dml, coreml, wasm, webnn, webnn-gpu, webnn-cpu, webnn-npu`（报错文案原文，`tiny/device.ts:50`）；另设哨兵值 `"default"` 表示使用内置 CPU 默认（`tiny/device.ts:74-75`）。未设置任何值时回落 `CPU_DEVICE`（`tiny/device.ts:54-59`）。
- MLX 后端只在 macOS arm64 可用（`tiny/device.ts:39-42` "MLX ships Metal wheels for Apple silicon only"）；`mlx`/`metal` 也只在该平台进入设备解析。
- 加载顺序：非 CPU/MLX 请求按 `[请求的设备, cpu]` 逐个尝试（`tiny/device.ts:63-72` "onnx execution providers to try, in order"；STT 侧同序，`asr-worker.ts:199`）。前一档失败打告警继续，最后一档失败才抛错：tiny worker 记 `"tiny-model: accelerated device failed; falling back"`（`tiny/worker.ts:189`），ASR worker 记 `"stt: accelerated device failed; falling back"`（`asr-worker.ts:219`）。
- Qwen3 1.7B 的 ONNX 导出在加载运行时之前被拒绝（`tiny/worker.ts:198-200`；原因串原文 "onnxruntime-node does not support Qwen3 RotaryEmbedding cache updates in onnx-community/Qwen3-1.7B-ONNX"，`tiny/models.ts:82-83`）。它只能走 MLX 后端，而 MLX 平台限制使它在 Linux/Windows 上不可用。
- sherpa 引擎的两档（parakeet 离线、nemotron 流式）不接设备参数：识别器配置固定 `provider: "cpu"`（`asr-worker.ts:364`，日志同值 `:381`）。
- kokoro 的设备映射只认显式 `wasm` 与 `webgpu`/`gpu`，其余全部落 CPU（`tts-worker.ts:113-117`），GPU 设备设成 `cuda` 或 `dml` 时同样得 CPU。

`transformers.env.cacheDir = getTinyModelsCacheDir()`、`allowLocalModels = false` 在 worker 运行时统一设置（`worker-runtime.ts:413-418`），因此权重一律从远端仓库拉取到统一缓存。

## 下载地址与缓存

transformers.js 系的文件地址是 hub resolve 路径；sherpa 系把基址与模板写在代码里（`asr-worker.ts:56-57,276-277`）：

```ts
const HF_RESOLVE_BASE = "https://huggingface.co";
const url = `${HF_RESOLVE_BASE}/${repo}/resolve/main/${filename}`;
```

各仓库下载文件（按 shipped dtype；完整文件名可在上表仓库页核）：

- 语言模型：`resolve/main/onnx/model_q4.onnx` + `onnx/model_q4.onnx_data`（llama3.2:3b 另有 `_data_1` 第二分片）+ 根目录 `tokenizer.json` 等小文件；
- whisper-base/small：`onnx/encoder_model_int8.onnx`（或 `_quantized`）与 `onnx/decoder_model_merged_int8.onnx`（或 `_quantized`）+ `tokenizer.json`/`vocab.json` 等；whisper-large-v3-turbo：`onnx/encoder_model_q4.onnx` 与 `onnx/decoder_model_merged_q4.onnx`；
- parakeet/nemotron：`resolve/main/encoder.int8.onnx`、`decoder.int8.onnx`、`joiner.int8.onnx`、`tokens.txt`（`stt/models.ts:96-101,114-119` 的 files 列表）；
- kokoro：`onnx/model_quantized.onnx` + 选中音色 `voices/<voice>.bin`（默认 `af_heart`，即 `voices/af_heart.bin`）。

换算示例（parakeet 完整 URL）：`https://huggingface.co/csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8/resolve/main/encoder.int8.onnx`。

缓存根目录：`~/.omp/agent/cache/tiny-models`（`utils/dirs.ts:972-975` 注释与实现），sherpa 文件按仓库名放在该目录下的子目录（`asr-worker.ts:331`）。缓存目录不存在说明对应模型还未下载；删除对应子目录即可回收磁盘。

## 本机实测与设备结论（2026-10-25，条件式）

实测记录：

```
$ /usr/lib/wsl/lib/nvidia-smi -L
GPU 0: NVIDIA GeForce RTX 3050 Laptop GPU (UUID: GPU-69dce0f1-64a6-f79f-cd59-7ae497b95244)
NVIDIA-SMI 580.65.05   Driver Version: 580.88   CUDA Version: 13.0
818MiB / 4096MiB used、14% util（23:46 快照）
```

`nvidia-smi` 不在 PATH（`echo "$PATH" | tr ':' '\n' | grep -n wsl` 走 `exit=1`），但文件存在，直接调用即有输出。`ldd libonnxruntime_providers_cuda.so` 报出四个未解析库：

```
libcublasLt.so.13 => not found
libcublas.so.13   => not found
libcurand.so.10   => not found
libcudart.so.13   => not found
libcuda.so.1      => /usr/lib/wsl/lib/libcuda.so.1
```

即驱动层 `libcuda` 有，CUDA 13 的 cublas/curand/cudart 运行时库没有；`libcuda.so.1` 就在 `/usr/lib/wsl/lib/`（171.1K 软链目标）。

用户配置（`~/.omp/agent/config.yml`）：`providers.tinyModelDevice: default`、`tinyModelDtype: default`（:55-56）；`modelRoles.tiny/memory: sensenova/glm-5.2:high`、`judge: typesafe-zen/jev-1.13-free`；`speech.enabled: false`、`tts.localVoice: af_heart`。缓存目录 `~/.omp/agent/cache/tiny-models` 当前不存在——14 个模型一个都没下载。

**条件式结论**：当前配置下这些模型的推理全部走 CPU；`default` 哨兵显式表示使用内置 CPU 默认。若之后把设备设成 `cuda` 缺上述运行时库，支持 CUDA 的 ONNX 模型（八语言模型与三 Whisper）会沿 `[cuda, cpu]` 顺序打印逐设备告警后落到 CPU（代码路径 `tiny/worker.ts:175-190`、`asr-worker.ts:208-225`）；Qwen3 会被加载前拒绝；sherpa 两档与 kokoro 本来就没有 CUDA 路径。探测当日（2026-10-25）未执行任何模型推理，下文显存判断均为推断。

若要真启用 CUDA：补齐 CUDA 13 运行时库（cublas/curand/cudart，来自 CUDA 运行时安装，不随驱动提供）后把 `providers.tinyModelDevice` 设 `cuda`；显存按当时快照 4096 MiB 总量扣除其他占用自行核对。

## 显存与资源（推断）

按权重文件字节对比剩余显存的判断（当时快照 4096 − 818 = 3278 MiB 可用；此减法是算术，非实测推理占用）：`llama3.2:3b` 权重 3417.4 MB 大于剩余显存，放不下；其余支持 CUDA 的模型文件尺寸都小于 3278 MiB，但权重加载加计算区的真实峰值未实测。常驻内存估算为权重 × 1.2–1.5（如 `llama3.2:3b` 按 CUDA 约需 4 GB 以上、CPU 模式另加），来源是 onnxruntime 常见行为，未实测。CPU 推理通道在长音频场景对 whisper/parakeet 的单核压力未做基准。

## 角色接受与当前状态

角色接受规则（`config/model-roles.ts:37-91` 原文）：`tiny` 与 `memory` 角色接受 `tiny` 或 `chat` kind（`acceptsTinyOrChat`）；`judge` 接受 `judge`/`tiny`/`chat`（`acceptsJudge`）；`speech` 只接受 `tts` kind；`dictation` 只接受 `stt` kind。 因此 8 个语言模型可同时用于标题、记忆、判定三处；5 个 stt 只进 `dictation`；kokoro 只进 `speech`。

当前机器状态上这三个角色全部指向在线 chat 模型（tiny/memory → `sensenova/glm-5.2:high`、judge → `typesafe-zen/jev-1.13-free`），`speech` 关闭——14 个模型没有参与任何工作，只是待命目录。把它们接上工作流的路径分别是 `/model` 浏览器里给角色赋值，或配置 `modelRoles.tiny/memory/judge/speech/dictation`。

## See Also

- [OMP /model 模型浏览器：角色解析与 kind 过滤](../omp-config/model-browser-role-resolution.md) — 角色接受与 kind 过滤的浏览器侧细节
- [OMP predictive text engine](predictive-text-engine.md) — 另一套本地小模型子系统（输入预测），与本目录的 tiny/local-inference 干线不同
- [OMP 环境变量全量参考](env-variables-reference.md) — `PI_TINY_DEVICE` / `PI_TINY_DTYPE` 的官方文档行与镜像关系
- [OMP judge 角色链解析与 jev-latest 400 根因](judge-role-chain-and-jev-latest-400.md) — judge 角色的候选链解析，说明 judge 接受 tiny 之外的在线候选
