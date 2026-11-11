# Harness² 执行器与改进器源码摘录

> Source: https://github.com/google-research/harness2（pyproject.toml、.env.example、harness2/config.py、harness2/core/spec.py、harness2/core/proposer.py、harness2/core/judge.py、harness2/substrate/base.py、harness2/substrate/__init__.py、harness2/substrate/opencode.py、harness2/substrate/codex.py、docs/SETUP.md、docs/BENCHMARKS.md）
> Collected: 2026-11-12
> Published: 2026（仓库 main 分支源码，无独立发布日期）

以下为源码原文摘录，标识符与数值保持原样。

## 依赖与 Python 版本（pyproject.toml）

- `requires-python = ">=3.12"`
- `dependencies = []`
- `[project.optional-dependencies] render = ["huggingface_hub[cli]>=0.30", "matplotlib>=3.9", "numpy>=1.26"]`

核心包无第三方运行时依赖；render extra 用于图表与 Hugging Face CLI。

## 模型配置（config.py 与 .env.example）

.env.example 的模型变量：

- `HARNESS2_SOLVER_MODEL`（OpenCode 的 provider/model 语法）、`HARNESS2_JUDGE_MODEL`（裸模型 ID）
- `HARNESS2_IMPROVER_MODEL`（可选；空值使用 executor 模型）
- `HARNESS2_RUNS_DIR`（可选输出根）
- `HARNESS2_CODEX_BASE_URL` / `HARNESS2_CODEX_CONTAINER_URL` / `HARNESS2_CODEX_API_KEY` / `HARNESS2_CODEX_MODEL`
- `HARNESS2_JUDGE_BASE_URL` / `HARNESS2_JUDGE_API_KEY`
- `GOOGLE_CLOUD_PROJECT`、`GOOGLE_CLOUD_LOCATION`（默认 global）

config.py 对应定义：

```python
SOLVER_MODEL_OC = env("HARNESS2_SOLVER_MODEL", "")
SOLVER_MODEL_CX = env("HARNESS2_CODEX_MODEL", SOLVER_MODEL_OC.split("/", 1)[-1])
IMPROVER_MODEL = env("HARNESS2_IMPROVER_MODEL", SOLVER_MODEL_OC)
JUDGE_MODEL = env("HARNESS2_JUDGE_MODEL", "")
```

依赖固定版本（config.py）：

```python
DEPENDENCY_PINS = {
    "job-bench-eval": "fa03a17f9ff662f136798a274e10011c3aa00fd0",
    "workbuddy-bench": "b516950be5b56eb3be406c2f76ee1c5111dcb57f",
    "harvey-labs": "b58a28ae9fde5ee4b810e53b4fd0a1915325a35d",
    "opencode": "23fb5e0516c99ac04a1aa46c193efda2e1b9bb24",
}
DEPENDENCY_ORIGINS = {
    "job-bench-eval": "https://github.com/Job-Bench/job-bench-eval.git",
    "workbuddy-bench": "https://github.com/Tencent/workbuddy-bench.git",
    "harvey-labs": "https://github.com/harveyai/harvey-labs.git",
    "opencode": "https://github.com/anomalyco/opencode.git",
}
```

- `OPENCODE_DIR = DEPENDENCIES / "opencode"`
- `BUN = DEPENDENCIES / "tools" / "node_modules" / ".bin" / "bun"`
- `CODEX_VERSION = "0.144.6"`
- `DEFAULT_PROPOSER_CHANNEL = "opencode"`
- `PROPOSER_MODEL_BY_CHANNEL = {"opencode": IMPROVER_MODEL, "claude_cli": IMPROVER_MODEL}`
- `WB_OC_HARNESS_VER = "1.14.18"`（WorkBuddy 的 OpenCode harness 版本）
- `WB_CX_HARNESS_VER = CODEX_VERSION`
- `WB_MAX_JOBS = {"oc": 1, "cx": 1}`、`WB_MAX_TRIALS = {"oc": 2, "cx": 2}`
- `WB_MODEL_CONNECTION = "local_proxy"`

`validate_models()` 要求 executor 与 improver 模型使用 OpenCode 的 provider/model 语法；
模型以 `google-vertex` 开头时要求设置 `GOOGLE_CLOUD_PROJECT`；judge=True 时要求
`HARNESS2_JUDGE_MODEL`。

## 改进器通道（core/spec.py）

```python
CHANNELS = ("claude_cli", "opencode")
```

`ChannelSpec` 的 `kind` 必须属于这两个值，否则 `ValueError: unknown channel`。
`effort` 默认 "high"，`steps` 默认 120，`timeout` 默认 3600。

## 改进器实现（core/proposer.py）

`Proposer` 以子进程方式运行外部 CLI，带审计与缓存。每次调用经 `_call_fingerprint`
按内容寻址；命中缓存直接返回。`_write_audit` 写出 mission、system、response 与 meta。

`env()`：claude_cli 通道设置 `CLAUDE_CODE_USE_VERTEX=1`、
`ANTHROPIC_VERTEX_PROJECT_ID`、`CLOUD_ML_REGION`、`ANTHROPIC_MODEL`；opencode 通道设置
`GOOGLE_VERTEX_PROJECT`、`GOOGLE_VERTEX_LOCATION`、`VERTEXAI_LOCATION`。两条通道都先经
`config.scrub_env` 清除宿主密钥（SCRUB_ENV 含 ANTHROPIC_API_KEY、OPENAI_API_KEY、
GEMINI_API_KEY、GOOGLE_API_KEY、GITHUB_TOKEN、AWS 凭据等）。

`_claude_cli` 命令（节选）：

```
claude --dangerously-skip-permissions -p --output-format json --effort <effort>
```

system 文本经 `--append-system-prompt` 传入，超过 `SYSTEM_ARG_MAX = 120_000` 时改为内嵌
到 stdin 并提示模型遵守。读 stdout JSON 的 `result`/`text`，费用取 `total_cost_usd`。

`_opencode`：把 mission 写入 `MISSION.md`，写 `opencode.json` 设置 agent build steps，
prompt 为 "Read MISSION.md first. Do what it asks. Reply with the requested output as
your final message AND save it verbatim to output/answer.md."，然后经 Bun 运行固定
commit 的 OpenCode 源码：

```
bun run --cwd <OPENCODE_DIR>/packages/opencode --conditions=browser src/index.ts run <prompt> \
  --dir <cwd> --model <spec.model> --format json [--variant <effort>]
```

设置 `OPENCODE_PERMISSION` 只允许当前工作目录，`XDG_DATA_HOME` 与 `XDG_STATE_HOME`
指向会话目录内的 `.ocdata` / `.ocstate`。读 JSONL 事件流的 text 事件与 step_finish
的 cost；优先取 `output/answer.md`。

`_opencode_dir()`：若 `config.OPENCODE_DIR/packages/opencode/src/index.ts` 不存在则抛
FileNotFoundError，提示运行 scripts/setup_benchmark.py 克隆固定 commit。

## 判分（core/judge.py）

`judge.py` 调 `adapter.score()`，由各基准的上游判分脚本执行；框架自身不含 LLM judge。

## solver 执行器（substrate/__init__.py、base.py、opencode.py、codex.py）

`substrate/__init__.py` 模块文档：「The two solver substrates behind one interface
(substrate/base.py).」只导出 `OpencodeSubstrate` 与 `CodexSubstrate` 两个实现，基准
adapter 提供 launcher body。

`substrate/base.py` 的 `Substrate` Protocol 要求五个方法：

- `surface()` 返回 SurfaceSpec
- `materialise(tree_dir, spec, ctx)` 把 harness 树安装到工作区
- `execute(task_ref, install, run_ids, timeout)` 启动任务
- `read_trajectory(stream_path, *, obs_trunc, max_chars, args_trunc=400)` 渲染轨迹
- `preflight()` 运行前检查

OpenCode（substrate/opencode.py）：

- `OPENCODE_SURFACE` 的 always_on 文件为 `systemprompt.md`、`guardrails.md`、
  `LongTermMEMORY.md`、`tool_descriptions/tool_guidance.md`，`always_on_max = 24_000`。
- 三种 install mode：`workspace_agents_md`（JobBench，AGENTS.md append +
  `.opencode/{skills,agent}` + scripts）、`home_dir_jinja`（WorkBuddy，
  `_composed/prompt.j2`）、`workspace_config`（LAB，render composition + ENV_DELTA +
  opencode.json tool gate）。
- `run_argv()` 文档：「The upstream checkout runs from source through bun: there is no
  `opencode` binary in the contract.」argv 以 `config.BUN run --cwd
  <OPENCODE_DIR>/packages/opencode --conditions=browser src/index.ts run` 开头，接
  `--dir`、`--model`、`--title`、`--format json`。
- `run_env()` 设置 `OPENCODE_PERMISSION` 的 external_directory 白名单（默认 deny，允许
  workspace），`OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX` 对应 `OUTPUT_TOKEN_MAX = 64_000`。
- `preflight()` 检查固定 commit `23fb5e0516c99ac04a1aa46c193efda2e1b9bb24`
  （v1.14.18）的 OpenCode checkout 与 Bun 是否存在。
- 轨迹渲染 `render_events()` 把 JSONL 事件折成 ASSISTANT/THINKING/ACTION/OBSERVATION
  统一语法。

Codex（substrate/codex.py）：

- `CODEX_SURFACE` 的 always_on 为 `AGENTS.md`，`always_on_max = 8_000`，文档注明 Codex
  会在 32,768 字节处静默截断。
- skill 目录 `.agents/skills`，plugin_dir 为 None，hooks 文件 `.codex/hooks.json`，
  hook 事件含 PreToolUse、PostToolUse、PermissionRequest、PreCompact、PostCompact、
  SessionStart、SubagentStart、SubagentStop、UserPromptSubmit、Stop。
- 安装模式 `codex_root`：AGENTS.md、.agents、scripts、.codex 复制到工作区根，
  `codex exec -C <ws>` 读取。

## 系统依赖与桥接（docs/SETUP.md）

- 平台：Linux；Python 3.12（推荐）或 3.13；uv。
- 执行器运行时：Node.js 20+；OpenCode 经 Bun 从源码运行；Codex 用 0.144.6 的 CLI。
- 认证：Vertex AI 走 Application Default Credentials（`gcloud auth
  application-default login`）；模型需要 GCP 项目与相应模型访问权限。
- LAB 需要 Pandoc 与 Poppler；WorkBuddy-Bench 需要 Docker。
- `harness2-bridge` 用 LiteLLM proxy 把 Vertex Gemini 包装成 Codex 所需的 Responses
  API，复用同一份 ADC 与项目。安装 `uv pip install -e '.[render,bridge]'` 后单独会话
  启动；WorkBuddy 场景用 `harness2-bridge --host 0.0.0.0`（容器内需跨网络访问，绑定
  所有网络接口，文档要求限制访问对象）。桥接打印需写入 `.env` 的 `HARNESS2_CODEX_*`
  设置；端口与生成的访问密钥保存在 `dependencies/codex/`，重启时复用。使用其他
  Responses API 端点时直接设置 `HARNESS2_CODEX_BASE_URL`、`HARNESS2_CODEX_API_KEY`、
  `HARNESS2_CODEX_MODEL`，端点与模型记录在 `dependencies/codex/home/config.toml`。

## 基准上游（docs/BENCHMARKS.md）

| 基准 | 上游仓库 | 数据 |
|---|---|---|
| LAB | https://github.com/harveyai/harvey-labs | 法律任务，仓库固定 commit b58a28ae |
| JobBench | https://github.com/Job-Bench/job-bench-eval | Hugging Face 数据集；RUBRICS.json 公开 |
| WorkBuddy-Bench | https://github.com/Tencent/workbuddy-bench | Hugging Face 数据集；office/web/code 三个 subset |

WorkBuddy-Bench 使用腾讯自定义许可证，含地域限制；JobBench 数据集在下载时解析，
未固定 commit，revision 由 setup 记录。

## 无凭证演示（README.md）

`harness2-demo` 用确定性编辑器与真实 Python 执行跑两种递归模式，不需要模型凭证。
