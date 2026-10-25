# OMP 内置端侧模型目录取证（bundled local models）

> Source: 本机安装包源码（@oh-my-pi/pi-catalog、@oh-my-pi/pi-coding-agent、@oh-my-pi/pi-utils，bun 全局 node_modules）；Hugging Face models API（?blobs=true）；备注：这是本机实测记录，无外部文章
> Collected: 2026-10-25
> Published: Unknown

来源路径（版本：本机 bun 全局安装 @oh-my-pi/pi-coding-agent）：

- `~/.bun/install/global/node_modules/@oh-my-pi/pi-catalog/src/compat/rules/providers/local.kdl`
- `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/tiny/models.ts`
- `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/tiny/device.ts`
- `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/tiny/worker.ts`
- `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/tiny/local-inference-api.ts`
- `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/stt/models.ts`
- `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/stt/asr-worker.ts`
- `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/tts/models.ts`
- `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/tts/tts-worker.ts`
- `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/subprocess/worker-runtime.ts`
- `~/.bun/install/global/node_modules/@oh-my-pi/pi-utils/src/dirs.ts`
- `~/.bun/install/global/node_modules/onnxruntime-node/bin/napi-v6/linux/x64/`（ldd 实测对象 `libonnxruntime_providers_cuda.so`）
- 用户配置：`~/.omp/agent/config.yml`

探测脚本（2026-10-25 当日运行，保存在 /tmp）：`/tmp/hf_sizes.py`、`/tmp/hf_files.py`、`/tmp/hf_kokoro.py`；对 14 个 HF 仓库逐文件调 `https://huggingface.co/api/models/<repo>?blobs=true` 取字节。

## 1. pi-catalog local.kdl 全文（verbatim）

来自 `src/compat/rules/providers/local.kdl:1-117`：

```kdl
// On-device inference workers exposed as catalog models.

provider "local" {
	default-model "lfm2.5-230m"
	allow-unauthenticated #true

	seed api="local-inference" base-url="local://inference" bundle="always" {
		model "kokoro" name="Kokoro-82M" {
			reasoning #false
			input "text"
			cost input=0 output=0 cache-read=0 cache-write=0
			limits
			supports-tools #false
		}
		model "parakeet-tdt-0.6b-v3" name="Parakeet TDT 0.6B v3" {
			reasoning #false
			input "text"
			cost input=0 output=0 cache-read=0 cache-write=0
			limits
			supports-tools #false
		}
		model "nemotron-streaming-en-0.6b" name="Nemotron Speech 0.6B (Streaming English)" {
			reasoning #false
			input "text"
			cost input=0 output=0 cache-read=0 cache-write=0
			limits
			supports-tools #false
		}
		model "whisper-base" name="Whisper Base" {
			reasoning #false
			input "text"
			cost input=0 output=0 cache-read=0 cache-write=0
			limits
			supports-tools #false
		}
		model "whisper-small" name="Whisper Small" {
			reasoning #false
			input "text"
			cost input=0 output=0 cache-read=0 cache-write=0
			limits
			supports-tools #false
		}
		model "whisper-large-v3-turbo" name="Whisper Large v3 Turbo" {
			reasoning #false
			input "text"
			cost input=0 output=0 cache-read=0 cache-write=0
			limits
			supports-tools #false
		}
		model "lfm2.5-230m" name="LFM2.5 230M" {
			reasoning #false
			input "text"
			cost input=0 output=0 cache-read=0 cache-write=0
			limits
			supports-tools #false
		}
		model "lfm2.5-350m" name="LFM2.5 350M" {
			reasoning #false
			input "text"
			cost input=0 output=0 cache-read=0 cache-write=0
			limits
			supports-tools #false
		}
		model "falcon-h1-90m" name="Falcon H1 Tiny 90M" {
			reasoning #false
			input "text"
			cost input=0 output=0 cache-read=0 cache-write=0
			limits
			supports-tools #false
		}
		model "qwen3-1.7b" name="Qwen3 1.7B" {
			reasoning #true
			input "text"
			cost input=0 output=0 cache-read=0 cache-write=0
			limits
			supports-tools #false
		}
		model "llama3.2:3b" name="Llama 3.2 3B" {
			reasoning #false
			input "text"
			cost input=0 output=0 cache-read=0 cache-write=0
			limits
			supports-tools #false
		}
		model "gemma-3-1b" name="Gemma 3 1B" {
			reasoning #false
			input "text"
			cost input=0 output=0 cache-read=0 cache-write=0
			limits
			supports-tools #false
		}
		model "qwen2.5-1.5b" name="Qwen2.5 1.5B" {
			reasoning #false
			input "text"
			cost input=0 output=0 cache-read=0 cache-write=0
			limits
			supports-tools #false
		}
		model "lfm2-1.2b" name="LFM2 1.2B" {
			reasoning #false
			input "text"
			cost input=0 output=0 cache-read=0 cache-write=0
			limits
			supports-tools #false
		}
	}

	models "kokoro" {
		kind "tts"
	}
	models "parakeet-tdt-0.6b-v3" "nemotron-streaming-en-0.6b" "whisper-*" {
		kind "stt"
	}
	models "lfm*" "falcon-*" "qwen*" "llama3.2:3b" "gemma-3-1b" {
		kind "tiny"
	}
}
```

关键行（`local.kdl:3-7`）：`default-model "lfm2.5-230m"`；`seed api="local-inference" base-url="local://inference" bundle="always"`。kind 归属（`local.kdl:108-116`）：kokoro→tts；parakeet/nemotron/whisper-*→stt；lfm*/falcon*/qwen*/llama3.2:3b/gemma-3-1b→tiny。

## 2. tiny/models.ts 摘录（verbatim）

标题模型（`src/tiny/models.ts:1-48`）：

```ts
/** Local model the `tiny-models` CLI downloads when none is named. */
export const DEFAULT_TINY_TITLE_LOCAL_MODEL_KEY = "lfm2.5-230m";

export interface TinyTitleLocalModelSpec {
	key: string;
	/** ONNX export loaded by transformers.js on every platform. */
	repo: string;
	dtype: "q4";
	/** Pre-quantized MLX export loaded by mlx-lm when `PI_TINY_DEVICE=mlx`. */
	mlxRepo: string;
	label: string;
	description: string;
	contextNote: string;
	/** Model family emits hidden reasoning unless the chat template disables it. */
	reasoning?: boolean;
	/** Reason the ONNX backend refuses this model before loading the runtime; the MLX backend ignores it. */
	onnxUnsupportedReason?: string;
}

export const TINY_TITLE_LOCAL_MODELS = [
	{
		key: "lfm2.5-230m",
		repo: "LiquidAI/LFM2.5-230M-ONNX",
		...
		description: "Recommended local model; fastest LFM2.5 option, about 214 MB cached.",
		contextNote: "Best balance among the current compact title models.",
	},
	{
		key: "lfm2.5-350m",
		repo: "onnx-community/LFM2.5-350M-ONNX",
		...
		description: "Larger LFM2.5 option, about 292 MB cached; tends toward terse titles.",
		contextNote: "Use when compact labels are preferred over descriptive titles.",
	},
	{
		key: "falcon-h1-90m",
		repo: "onnx-community/Falcon-H1-Tiny-90M-Instruct-ONNX",
		...
		description: "Smallest option, about 147 MB cached; lower fidelity on complex prompts.",
		contextNote: "Use on constrained machines where download size matters most.",
	},
] as const satisfies readonly TinyTitleLocalModelSpec[];
```

（各条目 dtype 均为 `"q4"`，mlxRepo：`LiquidAI/LFM2.5-230M-MLX-4bit`、`LiquidAI/LFM2.5-350M-MLX-4bit`、`mlx-community/Falcon-H1-Tiny-90M-Instruct-4bit`。）

记忆模型（`src/tiny/models.ts:62-122`；默认 `DEFAULT_MEMORY_LOCAL_MODEL_KEY = "lfm2-1.2b"`，见 `:63`）：

```ts
/**
 * Local models for Mnemopi memory tasks (fact extraction + consolidation).
 * These are larger (1B-1.7B) than the title models: structured extraction and
 * faithful summarization need more capacity than 3-6 word titles. All q4.
 * Ranking/recipe rationale lives in docs/local-models.md.
 */
export const TINY_MEMORY_LOCAL_MODELS = [
	{
		key: "qwen3-1.7b",
		repo: "onnx-community/Qwen3-1.7B-ONNX",
		dtype: "q4",
		mlxRepo: "mlx-community/Qwen3-1.7B-4bit",
		label: "Qwen3 1.7B",
		description:
			"MLX only (providers.tinyModelDevice=mlx): onnxruntime-node cannot run this ONNX export's RotaryEmbedding cache updates.",
		contextNote: "Blocked on the ONNX backend to avoid the unsupported RotaryEmbedding runtime path.",
		reasoning: true,
		onnxUnsupportedReason:
			"onnxruntime-node does not support Qwen3 RotaryEmbedding cache updates in onnx-community/Qwen3-1.7B-ONNX",
	},
	{
		key: "llama3.2:3b",
		repo: "onnx-community/Llama-3.2-3B-Instruct-ONNX",
		dtype: "q4",
		mlxRepo: "mlx-community/Llama-3.2-3B-Instruct-4bit",
		label: "Llama 3.2 3B",
		description:
			"Larger Llama 3.2 option for local memory/classifier tasks; higher quality potential at higher disk/RAM/latency cost.",
		contextNote: "Use when larger model capacity is preferred over faster load times.",
	},
	{
		key: "gemma-3-1b",
		repo: "onnx-community/gemma-3-1b-it-ONNX",
		dtype: "q4",
		mlxRepo: "mlx-community/gemma-3-1b-it-4bit",
		label: "Gemma 3 1B",
		description: "Best consolidation/dedup; lighter footprint, but leaks small talk during extraction.",
		contextNote: "Use when consolidation quality and size matter most.",
	},
	{
		key: "qwen2.5-1.5b",
		repo: "onnx-community/Qwen2.5-1.5B-Instruct",
		dtype: "q4",
		mlxRepo: "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
		label: "Qwen2.5 1.5B",
		description: "Best extraction granularity (atomic facts); weaker consolidation.",
		contextNote: "Use when fine-grained, deduplicatable facts matter more than summaries.",
	},
	{
		key: "lfm2-1.2b",
		repo: "onnx-community/LFM2-1.2B-ONNX",
		dtype: "q4",
		mlxRepo: "mlx-community/LFM2-1.2B-4bit",
		label: "LFM2 1.2B",
		description: "Fastest load; solid all-rounder, slightly noisier extraction labels.",
		contextNote: "Use when local startup cost is the priority.",
	},
] as const satisfies readonly TinyTitleLocalModelSpec[];
```

（`tiny/models.ts:82-83`：Qwen3 的 `onnxUnsupportedReason: "onnxruntime-node does not support Qwen3 RotaryEmbedding cache updates in onnx-community/Qwen3-1.7B-ONNX"`。）

## 3. stt/models.ts 摘录（verbatim）

`src/stt/models.ts:13-14`（子进程注释）：

```
 * The worker resolves the spec by key and loads the model lazily (kept warm
 * afterwards). Both engines run inside the hard-killed subprocess worker.
```

五档模型（`src/stt/models.ts:59-126`，sizeHint 与 description 原文）：

```
whisper-base            engine=transformers repo=onnx-community/whisper-base            dtype=q8 englishOnly=false label="Fast (Whisper base)"
  description: "Whisper base, multilingual. Smallest + fastest; lowest accuracy. Best for low-resource machines."
  sizeHint: "~60 MB"
whisper-small           engine=transformers repo=onnx-community/whisper-small           dtype=q8 englishOnly=false label="Balanced (Whisper small)"
  description: "Whisper small, multilingual. More accurate than Fast, still light on CPU/RAM."
  sizeHint: "~190 MB"
whisper-large-v3-turbo  engine=transformers repo=onnx-community/whisper-large-v3-turbo  dtype=q4 englishOnly=false label="Turbo (Whisper large-v3)"
  description: "Whisper large-v3-turbo, 99 languages. Widest language coverage; large download, slower."
  sizeHint: "~600 MB"
parakeet-tdt-0.6b-v3    engine=sherpa mode=offline repo=csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8 modelType="nemo_transducer" englishOnly=false label="Parakeet TDT v3 (SoTA)"
  files: encoder.int8.onnx / decoder.int8.onnx / joiner.int8.onnx / tokens.txt
  description: "NVIDIA Parakeet TDT 0.6B v3, 25 languages. Open ASR Leaderboard leader — best accuracy and far fastest decoding. Default."
  sizeHint: "~680 MB"
nemotron-streaming-en-0.6b engine=sherpa mode=online repo=csukuangfj2/sherpa-onnx-nemotron-speech-streaming-en-0.6b-160ms-int8-2026-04-25 englishOnly=true label="Nemotron 0.6B (live streaming, English)"
  description: "NVIDIA Nemotron Speech 0.6B, English only. Native streaming recognition with live words while you speak; 160 ms audio chunks."
  sizeHint: "~630 MB"
```

默认值（`stt/models.ts:128-132`）：

```
/**
 * SoTA default — NVIDIA Parakeet TDT 0.6B v3 (sherpa-onnx). Tops the Open ASR
 * Leaderboard on accuracy while decoding ~20× faster than Whisper large-v3.
 */
export const DEFAULT_STT_MODEL_KEY = "parakeet-tdt-0.6b-v3";
```

## 4. tts/models.ts 摘录（verbatim）

`src/tts/models.ts:58-64` 注释与 `:66-76` 条目：

```
 * Local TTS model registry. Kokoro-82M is the on-device SoTA tiny TTS (tops the
 * TTS Arena leaderboard); the `onnx-community` ONNX export runs through
 * `kokoro-js` on the shared transformers.js/onnxruntime worker. q8 keeps the
 * weights ~100 MB and CPU inference fast while preserving quality. One model
 * spans every voice/accent — language selection is a voice choice, not a
 * separate download.
```

```
export const TTS_LOCAL_MODELS = [
	{
		key: "kokoro",
		repo: "onnx-community/Kokoro-82M-v1.0-ONNX",
		dtype: "q8",
		sampleRate: 24_000,
		label: "Kokoro-82M",
		description: "Kokoro-82M neural TTS — SoTA on-device quality, multi-voice, fully local",
		voices: KOKORO_VOICES,
	},
] as const satisfies readonly TtsLocalModelSpec[];
```

`DEFAULT_TTS_VOICE = "af_heart"`（`tts/models.ts:55-56`）。音色清单 12 个（af_heart/af_bella/af_nicole/af_aoede/af_kore/af_sarah/am_michael/am_fenrir/am_puck/bf_emma/bm_george/bm_fable，`tts/models.ts:40-53`）。

## 5. 设备与回退路径（verbatim）

`src/tiny/device.ts:19-33`（全部设备值）：auto, gpu, cpu, wasm, webgpu, cuda, dml, coreml, webnn, webnn-npu, webnn-gpu, webnn-cpu, mlx。

```
DEVICE_VALUES: auto/gpu/cpu/wasm/webgpu/cuda/dml/coreml/webnn/webnn-npu/webnn-gpu/webnn-cpu/[MLX_DEVICE]
normalizeTinyModelDevice: `Unsupported PI_TINY_DEVICE=${JSON.stringify(value)}. Use cpu, gpu, mlx, metal, webgpu, auto, cuda, dml, coreml, wasm, webnn, webnn-gpu, webnn-cpu, or webnn-npu.`
```

（`tiny/device.ts:50`。）

MLX 平台限制（`tiny/device.ts:39-42`）：

```ts
/** Whether the mlx-lm backend can run here: MLX ships Metal wheels for Apple silicon only. */
export function tinyMlxSupported(platform = process.platform, arch = process.arch): boolean {
	return platform === "darwin" && arch === "arm64";
}
```

默认 CPU（`tiny/device.ts:54-59`）：

```ts
export function resolveTinyModelDevicePreference(
	value: string | undefined = $env.PI_TINY_DEVICE,
): TinyModelDevicePreference {
	return {
		device: normalizeTinyModelDevice(value) ?? CPU_DEVICE,
		raw: value,
	};
}
```

加载顺序（`tiny/device.ts:63-72`）：

```
/**
 * ONNX execution providers to try, in order, for the requested device. `mlx`
 * is not an ONNX provider: workers that only speak ONNX (STT/TTS, or the tiny
 * worker after an MLX bootstrap failure) run CPU-only for it.
 */
export function tinyModelDeviceLoadOrder(preference: TinyModelDevicePreference): readonly TinyOnnxDevice[] {
	if (preference.device === CPU_DEVICE || preference.device === MLX_DEVICE) return CPU_ONLY_ORDER;
	if (usesDarwinWorkerWebGpu(preference.device)) return DARWIN_WEBGPU_UNSAFE_ORDER;
	return [preference.device, CPU_DEVICE];
}
```

默认哨兵（`tiny/device.ts:74-75`）：`/** Sentinel `providers.tinyModelDevice` value meaning "use the built-in CPU default". */` `export const TINY_MODEL_DEVICE_DEFAULT = "default";`

tiny worker 回退循环（`src/tiny/worker.ts:158-193`）：

```ts
if (devices[0] !== this.#devicePreference.device) {
	logger.warn("tiny-model: requested device is not an ONNX provider usable in the worker; using CPU", {...});
}
let cudaDiagnostics: string | null = null;
for (let i = 0; i < devices.length; i += 1) {
	const device = devices[i]!;
	try {
		const generator = await transformers.pipeline("text-generation", this.#spec.repo, {
			device,
			dtype: this.#dtypeOverride ?? this.#spec.dtype,
			progress_callback: info => sendProgress(reply, requestId, this.#modelKey, info),
		});
		return { generator, device };
	} catch (error) {
		const deviceDiagnostics = await formatOnnxRuntimeCudaDiagnostics(transformers, device, error);
		if (deviceDiagnostics) cudaDiagnostics = deviceDiagnostics;
		if (i === devices.length - 1) {
			if (cudaDiagnostics) throw new Error(`${errorText(error)}\n${cudaDiagnostics}`);
			throw error;
		}
		const meta: Record<string, unknown> = { modelKey, device, fallbackDevice: devices[i + 1], error: errorMessage(error) };
		if (deviceDiagnostics) meta.cudaDiagnostics = deviceDiagnostics;
		logger.warn("tiny-model: accelerated device failed; falling back", meta);
	}
}
throw new Error("No tiny model devices configured");
```

Qwen3 在加载前被拒（`tiny/worker.ts:196-200`）：

```ts
pipeline(reply: ReplyTransport, requestId: string): Promise<TextGenerationPipeline> {
	if (this.#pipeline) return this.#pipeline;
	if (this.#spec.onnxUnsupportedReason) {
		return Promise.reject(new Error(`${this.#modelKey} is unavailable: ${this.#spec.onnxUnsupportedReason}`));
	}
```

Whisper 的 ASR 侧同构回退（`src/stt/asr-worker.ts:199-225`；pipeline 设备参数在 `:185-189`）：

```ts
const devices = tinyModelDeviceLoadOrder(sttModelDevicePreference);
if (devices[0] !== sttModelDevicePreference.device) {
	sendLog(transport, "warn", "stt: requested device is unsafe in the worker; using CPU", {...});
}
for (let i = 0; i < devices.length; i += 1) {
	const device = devices[i]!;
	try {
		return { pipeline: await loadPipelineOnDevice(transformers, spec, modelKey, transport, requestId, device), device };
	} catch (error) {
		if (i === devices.length - 1) throw error;
		const fallbackDevice = devices[i + 1]!;
		sendLog(transport, "warn", "stt: accelerated device failed; falling back", {...});
	}
}
```

sherpa 识别器固定 CPU（`asr-worker.ts:358-368,377-384`）：

```
modelConfig: {
	transducer: { encoder, decoder, joiner },
	tokens: files.tokens,
	modelType: spec.modelType,
	numThreads,
	provider: "cpu",
	debug: 0,
},
...
sendLog(transport, "debug", "stt: local model loaded", { modelKey, repo, engine: "sherpa", provider: "cpu", numThreads, elapsedMs });
```

Kokoro 设备映射（`src/tts/tts-worker.ts:108-117`）：

```ts
/**
 * Map a tiny-model device onto the narrow set `kokoro-js` accepts. The worker
 * always runs `kokoro-js` on Node, where `cpu` (onnxruntime-node) is the only
 * safe option; `webgpu`/`wasm` are honored if explicitly requested.
 */
function toKokoroDevice(device: TinyModelDevice): KokoroDevice {
	if (device === "wasm") return "wasm";
	if (device === "webgpu" || device === "gpu") return "webgpu";
	return "cpu";
}
```

transformers.js 环境统一配置（`src/subprocess/worker-runtime.ts:413-418`）：

```ts
function configureTransformers<T extends ConfigurableTransformers>(transformers: T): T {
	transformers.env.cacheDir = getTinyModelsCacheDir();
	transformers.env.allowLocalModels = false;
	transformers.env.logLevel = transformers.LogLevel.ERROR;
	return transformers;
}
```

缓存目录（`@oh-my-pi/pi-utils/src/dirs.ts:972-975`）：

```ts
/** Get the tiny title model cache directory (~/.omp/agent/cache/tiny-models). */
export function getTinyModelsCacheDir(agentDir?: string): string {
	return dirs.agentSubdir(agentDir, path.join("cache", "tiny-models"), "cache");
}
```

sherpa 下载 URL 与落盘（`src/stt/asr-worker.ts:56-57,276-277,331`）：

```ts
// Hub origin for raw sherpa-onnx model files (encoder/decoder/joiner/tokens).
const HF_RESOLVE_BASE = "https://huggingface.co";
...
const url = `${HF_RESOLVE_BASE}/${repo}/resolve/main/${filename}`;
const response = await fetch(url, { redirect: "follow" });
...
const dir = path.join(getTinyModelsCacheDir(), spec.repo);
```

local-inference 传输注册（`src/tiny/local-inference-api.ts:16-17,164-167`）：

```ts
const LOCAL_INFERENCE_API = "local-inference";
const LOCAL_INFERENCE_SOURCE = "omp/local-inference";
...
/** Register the local-inference transport with the shared API registry. */
export function registerLocalInferenceApi(): void {
	registerCustomApi(LOCAL_INFERENCE_API, streamLocalInferenceSimple, LOCAL_INFERENCE_SOURCE);
}
```

## 6. 角色接受规则（verbatim，`src/config/model-roles.ts:37-91`）

```ts
function acceptsTinyOrChat(model: Model): boolean {
	const kind = modelKind(model);
	return kind === "tiny" || kind === "chat";
}
function acceptsJudge(model: Model): boolean {
	const kind = modelKind(model);
	return kind === "judge" || kind === "tiny" || kind === "chat";
}
export const MODEL_ROLES: Record<ModelRole, ModelRoleInfo> = {
	...
	tiny: { tag: "TINY", name: "Tiny", color: "dim", section: "chat", accepts: acceptsTinyOrChat },
	memory: { tag: "MEMORY", name: "Memory", color: "dim", section: "chat", accepts: acceptsTinyOrChat },
	...
	speech: {
		tag: "SPEECH",
		name: "Speech",
		color: "warning",
		section: "kind",
		accepts: model => modelKind(model) === "tts",
	},
	dictation: {
		tag: "DICTATION",
		name: "Dictation",
		color: "warning",
		section: "kind",
		accepts: model => modelKind(model) === "stt",
	},
	judge: { tag: "JUDGE", name: "Judge", color: "muted", section: "kind", accepts: acceptsJudge },
};
```

## 7. 本机实测记录（2026-10-25 23:46，WSL2）

命令与输出：

```
$ /usr/lib/wsl/lib/nvidia-smi -L
GPU 0: NVIDIA GeForce RTX 3050 Laptop GPU (UUID: GPU-69dce0f1-64a6-f79f-cd59-7ae497b95244)

$ /usr/lib/wsl/lib/nvidia-smi（头部）
NVIDIA-SMI 580.65.05              Driver Version: 580.88         CUDA Version: 13.0
|   0  NVIDIA GeForce RTX 3050 ...    On  |   00000000:01:00.0 Off |                  N/A |
| N/A   66C    P3             11W /   34W |     818MiB /   4096MiB |     14%      Default |

$ echo "$PATH" | tr ':' '\n' | grep -n "wsl"   # exit=1（nvidia-smi 不在 PATH）

$ ldd libonnxruntime_providers_cuda.so | grep -i "not found|libcudart|libcublas|libcurand|libcuda.so"
	libcublasLt.so.13 => not found
	libcublas.so.13   => not found
	libcurand.so.10   => not found
	libcudart.so.13   => not found
	libcuda.so.1      => /usr/lib/wsl/lib/libcuda.so.1 (0x000010d62aa00000)

$ ls -l /usr/lib/wsl/lib/libcuda.so.1
555  /usr/lib/wsl/lib/libcuda.so.1  171.1K

$ ls -d ~/.omp/agent/cache/tiny-models
ls: cannot access '/home/cpf/.omp/agent/cache/tiny-models': No such file or directory
```

用户配置（`~/.omp/agent/config.yml`）：

- `providers.tinyModelDevice: default`（:55）、`providers.tinyModelDtype: default`（:56）
- `modelRoles.tiny: sensenova/glm-5.2:high`（:75）、`modelRoles.memory: sensenova/glm-5.2:high`（:79）、`modelRoles.judge: typesafe-zen/jev-1.13-free`（:80）
- `tts.localVoice: af_heart`（:573-576 区域）、`speech.enabled: false`（:575-577 区域；实测行号 575 附近）

条件式结论：当前配置 `tinyModelDevice: default` → 按 `tiny/device.ts:54-59` 取内置 CPU 默认；模型未下载、缓存目录不存在、本次未做过任何模型推理或显存实测。若之后把设备设为 `cuda`：缺 `libcublas.so.13`/`libcudart.so.13`/`libcurand.so.10`（CUDA 13 运行时库）时，支持 CUDA 的 ONNX 模型（tiny 语言模型与 Whisper）会沿 `[cuda, cpu]` 加载顺序打印 `tiny-model: accelerated device failed; falling back` 后落到 CPU（代码路径 `tiny/worker.ts:175-190`、`stt/asr-worker.ts:208-225`）；Qwen3 在加载前直接拒绝；sherpa 三档与 kokoro 不走 CUDA 路径。

## 8. HF blobs API 载重探测输出（2026-10-25，verbatim）

`/tmp/hf_sizes.py` 输出（repo_total 是全仓库整仓合计非单模型下载量；onnx 列表按体积降序截 12 行）：

```
## LiquidAI/LFM2.5-230M-ONNX
repo_total_mb=2536.3 file_count=18
  onnx/model_q8.onnx	0.2 MB
  onnx/model_q4.onnx	0.2 MB
  onnx/model_q4f32.onnx	0.2 MB
  onnx/model_fp16.onnx	0.1 MB
  onnx/model.onnx	0.1 MB

## onnx-community/LFM2.5-350M-ONNX
repo_total_mb=3238.7 file_count=17
  onnx/model_quantized.onnx	0.2 MB
  onnx/model_q4.onnx	0.2 MB
  onnx/model_q4f16.onnx	0.2 MB
  onnx/model.onnx	0.1 MB
  onnx/model_fp16.onnx	0.1 MB

## onnx-community/Falcon-H1-Tiny-90M-Instruct-ONNX
repo_total_mb=1077.5 file_count=17
  onnx/model_q4f16.onnx	1.7 MB
  onnx/model_quantized.onnx	1.6 MB
  onnx/model_q4.onnx	1.6 MB
  onnx/model_fp16.onnx	1.6 MB
  onnx/model.onnx	1.5 MB

## onnx-community/Qwen3-1.7B-ONNX
repo_total_mb=25521.8 file_count=39
  onnx/model_q4.onnx	2147.2 MB
  onnx/model_bnb4.onnx	2059.1 MB
  onnx/model_quantized.onnx	1742.4 MB
  onnx/model_uint8.onnx	1742.4 MB
  onnx/model_int8.onnx	1742.4 MB
  onnxruntime/webgpu/webgpu-int4-kld-block-32/model.onnx	1478.7 MB
  onnx/model_q4f16.onnx	1426.1 MB
  onnxruntime/cpu_and_mobile/cpu-int4-kld-block-128/model.onnx	1408.9 MB
  onnxruntime/cuda/cuda-int4-kld-block-128/model.onnx	1371.3 MB
  onnx/model.onnx	0.3 MB
  onnx/model_fp16.onnx	0.3 MB

## onnx-community/Llama-3.2-3B-Instruct-ONNX
repo_total_mb=38008.8 file_count=38
  onnx/model_quantized.onnx	1.1 MB
  onnx/model_uint8.onnx	1.1 MB
  onnx/model_int8.onnx	1.1 MB
  onnx/model_bnb4.onnx	1.0 MB
  onnx/model_q4f16.onnx	0.3 MB
  onnx/model_q4.onnx	0.3 MB
  onnx/model_fp16.onnx	0.2 MB
  onnx/model.onnx	0.2 MB

## onnx-community/gemma-3-1b-it-ONNX
repo_total_mb=12875.1 file_count=22
  onnx/model_bnb4.onnx	1602.0 MB
  onnx/model_uint8.onnx	1001.5 MB
  onnx/model_int8.onnx	1001.5 MB
  onnx/model_q4f16.onnx	0.5 MB
  onnx/model_fp16.onnx	0.4 MB
  onnx/model_quantized.onnx	0.4 MB
  onnx/model_q4.onnx	0.3 MB
  onnx/model.onnx	0.3 MB

## onnx-community/Qwen2.5-1.5B-Instruct
repo_total_mb=18778.2 file_count=21
  onnx/model_q4.onnx	1787.6 MB
  onnx/model_bnb4.onnx	1705.7 MB
  onnx/model_uint8.onnx	1579.0 MB
  onnx/model_int8.onnx	1579.0 MB
  onnx/model_quantized.onnx	1579.0 MB
  onnx/model_q4f16.onnx	1221.9 MB
  onnx/model_fp16.onnx	1.1 MB
  onnx/model.onnx	1.1 MB

## onnx-community/LFM2-1.2B-ONNX
repo_total_mb=11413.9 file_count=24
  onnx/model_q8.onnx	4.1 MB
  onnx/model_quantized.onnx	0.2 MB
  onnx/model_q4.onnx	0.2 MB
  onnx/model_q4f16.onnx	0.2 MB
  onnx/model.onnx	0.1 MB
  onnx/model_fp16.onnx	0.1 MB

## onnx-community/whisper-base
repo_total_mb=2357.1 file_count=41
  onnx/decoder_model_merged.onnx	208.5 MB
  onnx/decoder_model.onnx	208.3 MB
  onnx/decoder_with_past_model.onnx	195.6 MB
  onnx/decoder_model_merged_q4.onnx	123.6 MB
  onnx/decoder_model_q4.onnx	123.4 MB
  onnx/decoder_model_merged_bnb4.onnx	122.0 MB
  onnx/decoder_model_bnb4.onnx	121.8 MB
  onnx/decoder_with_past_model_q4.onnx	121.3 MB
  onnx/decoder_with_past_model_bnb4.onnx	120.0 MB
  onnx/decoder_model_merged_fp16.onnx	104.7 MB
  onnx/decoder_model_fp16.onnx	104.4 MB
  onnx/decoder_with_past_model_fp16.onnx	98.0 MB

## onnx-community/whisper-small
repo_total_mb=6344.1 file_count=41
  onnx/decoder_model_merged.onnx	615.3 MB
  onnx/decoder_model.onnx	614.9 MB
  onnx/decoder_with_past_model.onnx	558.1 MB
  onnx/encoder_model.onnx	352.8 MB
  onnx/decoder_model_merged_fp16.onnx	308.6 MB
  onnx/decoder_model_fp16.onnx	307.9 MB
  onnx/decoder_with_past_model_fp16.onnx	279.5 MB
  onnx/decoder_model_merged_q4.onnx	233.1 MB
  onnx/decoder_model_q4.onnx	232.7 MB
  onnx/decoder_model_merged_bnb4.onnx	226.1 MB
  onnx/decoder_model_bnb4.onnx	225.6 MB
  onnx/decoder_with_past_model_q4.onnx	223.7 MB

## onnx-community/whisper-large-v3-turbo
repo_total_mb=16419.2 file_count=46
  onnx/encoder_model_fp16.onnx	1274.3 MB
  onnx/decoder_model_merged.onnx	688.0 MB
  onnx/decoder_model.onnx	687.8 MB
  onnx/encoder_model_quantized.onnx	644.8 MB
  onnx/encoder_model_uint8.onnx	644.8 MB
  onnx/encoder_model_int8.onnx	644.8 MB
  onnx/decoder_with_past_model.onnx	635.4 MB
  onnx/decoder_model_merged_int8.onnx	439.9 MB
  onnx/decoder_model_merged_quantized.onnx	439.9 MB
  onnx/decoder_model_merged_uint8.onnx	439.9 MB
  onnx/decoder_model_uint8.onnx	439.7 MB
  onnx/decoder_model_int8.onnx	439.7 MB

## csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8
repo_total_mb=671.2 file_count=9
  encoder.int8.onnx	652.2 MB
  decoder.int8.onnx	11.8 MB
  joiner.int8.onnx	6.4 MB

## csukuangfj2/sherpa-onnx-nemotron-speech-streaming-en-0.6b-160ms-int8-2026-04-25
repo_total_mb=662.7 file_count=10
  encoder.int8.onnx	652.9 MB
  decoder.int8.onnx	7.3 MB
  joiner.int8.onnx	1.7 MB

## onnx-community/Kokoro-82M-v1.0-ONNX
repo_total_mb=1447.4 file_count=68
  onnx/model.onnx	325.5 MB
  onnx/model_q4.onnx	305.2 MB
  onnx/model_uint8.onnx	177.5 MB
  onnx/model_fp16.onnx	163.2 MB
  onnx/model_q4f16.onnx	154.6 MB
  onnx/model_uint8f16.onnx	114.2 MB
  onnx/model_quantized.onnx	92.4 MB
  onnx/model_q8f16.onnx	86.0 MB
```

`/tmp/hf_files.py` 输出（q4/q8 相关文件逐项，LFM/whisper 三个仓库）：

```
## LiquidAI/LFM2.5-230M-ONNX
        0.2 MB  onnx/model_q4.onnx
      211.1 MB  onnx/model_q4.onnx_data
        4.7 MB  tokenizer.json

## onnx-community/LFM2.5-350M-ONNX
        0.2 MB  onnx/model_q4.onnx
      293.6 MB  onnx/model_q4.onnx_data
        3.3 MB  tokenizer.json

## onnx-community/Falcon-H1-Tiny-90M-Instruct-ONNX
        1.6 MB  onnx/model_q4.onnx
      134.8 MB  onnx/model_q4.onnx_data
        1.3 MB  tokenizer.json

## onnx-community/Llama-3.2-3B-Instruct-ONNX
        0.3 MB  onnx/model_q4.onnx
     2094.1 MB  onnx/model_q4.onnx_data
     1311.4 MB  onnx/model_q4.onnx_data_1
       11.6 MB  tokenizer.json

## onnx-community/gemma-3-1b-it-ONNX
        0.3 MB  onnx/model_q4.onnx
      859.1 MB  onnx/model_q4.onnx_data
       20.3 MB  tokenizer.json

## onnx-community/LFM2-1.2B-ONNX
        0.2 MB  onnx/model_q4.onnx
      850.1 MB  onnx/model_q4.onnx_data
        3.3 MB  tokenizer.json

## onnx-community/whisper-base
       23.2 MB  onnx/encoder_model_int8.onnx
       23.2 MB  onnx/encoder_model_quantized.onnx
       53.7 MB  onnx/decoder_model_merged_int8.onnx
       53.7 MB  onnx/decoder_model_merged_quantized.onnx
        2.5 MB  tokenizer.json
        1.0 MB  vocab.json
        0.5 MB  merges.txt
        0.1 MB  normalizer.json
        0.3 MB  tokenizer_config.json

## onnx-community/whisper-small
       92.3 MB  onnx/encoder_model_int8.onnx
       92.3 MB  onnx/encoder_model_quantized.onnx
      156.8 MB  onnx/decoder_model_merged_int8.onnx
      156.8 MB  onnx/decoder_model_merged_quantized.onnx
        2.5 MB  tokenizer.json
        1.0 MB  vocab.json
        0.5 MB  merges.txt
        0.1 MB  normalizer.json
        0.3 MB  tokenizer_config.json

## onnx-community/whisper-large-v3-turbo
      424.9 MB  onnx/encoder_model_q4.onnx
      334.1 MB  onnx/decoder_model_merged_q4.onnx
        2.5 MB  tokenizer.json
        1.0 MB  vocab.json
        0.5 MB  merges.txt
        0.1 MB  normalizer.json
        0.3 MB  tokenizer_config.json
```

`/tmp/hf_kokoro.py` 输出（相关行）：

```
## onnx-community/Kokoro-82M-v1.0-ONNX  files=68
       92.4 MB  onnx/model_quantized.onnx
        0.5 MB  voices/af_heart.bin

## onnx-community/Qwen2.5-1.5B-Instruct  files=21
     1787.6 MB  onnx/model_q4.onnx
        7.0 MB  tokenizer.json
        2.8 MB  vocab.json
        1.7 MB  merges.txt
        1.1 MB  onnx/model.onnx
```

## 9. 注册表提示与实际下载量对照（按 shipped dtype 加总）

| 模型 | sizeHint / 注释 | 实测加总（组件） |
|---|---|---|
| whisper-base | `~60 MB` | 81.1 MB = encoder_int8/quantized 23.2 + decoder_merged_int8/quantized 53.7 + 词表 4.2 |
| whisper-small | `~190 MB` | 253.3 MB = 92.3 + 156.8 + 4.2 |
| whisper-large-v3-turbo | `~600 MB` | 763.2 MB = encoder_q4 424.9 + decoder_merged_q4 334.1 + 4.2 |
| kokoro | 注释 `weights ~100 MB` | 92.9 MB = model_quantized 92.4 + 选中音色 0.5 |
| qwen2.5-1.5b | （无 hint） | 1799.1 MB = 1787.6 + 7.0 + 2.8 + 1.7；q4 导出 1787.6 大于 int8 导出 1579.0（上游排布） |
| lfm2.5-230m | 注释 `about 214 MB cached` | 216.0 MB = 0.2 + 211.1 + 4.7 |
| lfm2.5-350m | 注释 `about 292 MB cached` | 297.1 MB = 0.2 + 293.6 + 3.3 |
| falcon-h1-90m | 注释 `about 147 MB cached` | 137.7 MB = 1.6 + 134.8 + 1.3 |
| qwen3-1.7b | （无 hint） | q4 权重 2147.2 MB；tokenizer 与小文件本次未探测 |
| llama3.2:3b | （无 hint） | 3417.4 MB = 0.3 + 2094.1 + 1311.4 + 11.6 |
| gemma-3-1b | （无 hint） | 879.7 MB = 0.3 + 859.1 + 20.3 |
| lfm2-1.2b | （无 hint） | 853.6 MB = 0.2 + 850.1 + 3.3 |
| parakeet-tdt-0.6b-v3 | `~680 MB` | 约 671 MB = encoder 652.2 + decoder 11.8 + joiner 6.4 + tokens.txt（整仓 repo_total_mb=671.2） |
| nemotron-streaming-en-0.6b | `~630 MB` | 约 663 MB = encoder 652.9 + decoder 7.3 + joiner 1.7 + tokens.txt（整仓 repo_total_mb=662.7） |
