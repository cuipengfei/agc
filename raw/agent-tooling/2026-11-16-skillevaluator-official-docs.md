# SkillEvaluator 官方文档摘录（README 与 Tier/安装/凭据文档）

> Source: https://github.com/NVIDIA/SkillEvaluator/blob/main/README.md ; https://docs.nvidia.com/skills/skillevaluator/tier1-validation ; https://docs.nvidia.com/skills/skillevaluator/tier2-deduplication ; https://docs.nvidia.com/skills/skillevaluator/agents-and-sandboxes ; https://docs.nvidia.com/skills/skillevaluator/configuration ; https://docs.nvidia.com/skills/skillevaluator/installation
> Collected: 2026-11-16
> Published: Unknown（docs.nvidia.com 持续更新；README 对应仓库 main 分支；论文 arXiv 2608.20614 发表 2026-08-20）

## README.md（NVIDIA/SkillEvaluator main，https://github.com/NVIDIA/SkillEvaluator/blob/main/README.md）

> SkillEvaluator checks AI agent skills and measures their effect on task results:
> start with quality checks, then compare runs with and without a skill.

> Agent skills are folders of instructions and supporting files defined by the
> [Agent Skills specification](https://agentskills.io/). SkillEvaluator is part of
> the [NVIDIA Verified Skills pipeline](https://github.com/NVIDIA/skills).

安装（README「Get started」节）：

```bash
pip install skillevaluator
# 或 uv tool install skillevaluator
skillevaluator validate ./my-skill --tiers 1
```

> Then check your skill, no API key

Quickstart 两条路径均用 bundled `text-analyzer`：

> ### Run without an LLM
>
> ```bash
> uv run --python 3.13 skillevaluator quality-check \
>   src/skillevaluator/tier3/reference_skills/text-analyzer \
>   -r cli -r json -o reports/first-quality
> ```
>
> No API key, scanner, GPU or Docker is needed. The example scores **88.8/100 (B)**,
> exits `0` and saves `reports/first-quality/skillevaluator-quality.json`. The
> passing threshold defaults to 70.

> ### Use NVIDIA Build
>
> ```bash
> export SKILL_EVAL_LLM_PROVIDER=nv_build
> export NVIDIA_API_KEY='nvapi-...'
> uv run --python 3.13 --extra llm skillevaluator rubric-eval \
>   src/skillevaluator/tier3/reference_skills/text-analyzer \
>   -r cli -r json -o reports/first-build
> ```
>
> The command sends skill documentation to the model and saves feedback in
> `reports/first-build/skillevaluator-rubric.json`. No agent runtime or Docker is
> needed. Completed evaluations can still fail rubric thresholds.
>
> The same key supports Tier 2 embeddings and supported Tier 3 agents.

Three-tier overview（README「Three-tier overview」节）：

| Tier | Question | Example after setup | Additional setup |
| --- | --- | --- | --- |
| Tier 1: Validation | Is the skill safe, well-formed and harness-compatible? | `uv run skillevaluator tier1 ./my-skill --no-llm` | External scanners for full static coverage; a provider and model clients enable LLM checks |
| Tier 2: Deduplication | Does guidance repeat or overlap? | `uv run --extra tier2 skillevaluator tier2 ./my-skill` | Embeddings and chat; add `--catalog ./skill-catalog.json` for inter-skill comparison |
| Tier 3: Live Evaluation | Does the skill help the agent? | `uv run --extra tier3 skillevaluator tier3 ./my-skill` | Provider access, a supported agent, and a running sandbox (Docker by default) |

> Each tier is independent. Add its extra to your command.

> Tier 1 fetches pinned, verified SkillSpector and Gitleaks releases when they
> are missing; Semgrep is optional. See [scanners](docs/installation.mdx#system-tools).
> `--no-llm` does not remove scanner requirements; a scanner that cannot run is
> `INCOMPLETE` and exits nonzero.
> [SkillSpector](https://github.com/NVIDIA/SkillSpector) provides specialized skill
> security scanning; [Harbor](https://github.com/harbor-framework/harbor), the
> open-source agent evaluation framework, powers sandboxed agent runs.
>
> Tier 2 reports when inter-skill comparison did not run. Tier 3 autopilot reuses
> sources or creates one skill-grounded case with limited coverage. See
> [tier guides](https://docs.nvidia.com/skills/skillevaluator/).

validate 管线（README「Run the combined pipeline」节）：

```bash
uv run --python 3.13 --extra all skillevaluator doctor --env-mode docker
uv run --python 3.13 --extra all skillevaluator validate ./my-skill
```

> `doctor` checks readiness, not inference success. `validate` runs all tiers with
> autopilot for skills. Use `--tiers 1,2` to skip live evaluation or `--tiers 1` for
> static checks. `--no-autopilot` requires an existing source. Other artifact types
> retain their applicable stages.
>
> Tier 1 gates `validate`. Tier 2 gates unless `--no-block-on-dedup` is set;
> Tier 3 gates only with `--block-on-agent-eval`.

autopilot 数据集生成（README 同节）：

> Standalone generation needs substantive `evals/EVAL.md` guidance, a `--prompt`
> file with task requests and outcomes, or matching retained traces. `--force`
> below replaces the autopilot starter; `--refine` refines it. Explicit
> `--grounding skill` permits skill-only starters. Review cases; templates omit
> unauthored negatives.

## docs.nvidia.com/skills/skillevaluator/tier1-validation（节录，2026-11-16）

开头：

> Deterministic quality gates for skills — schema, quality, security, PII, license, code-integrity, Unicode, and script checks, plus optional LLM judging.

> Static checks need no model key. With a configured provider, this command also
> runs rubric judging, LLM security analysis, and finding verification. Without a
> provider, those LLM stages are explicitly reported as skipped. Use `--no-llm`
> for static checks only, or `--llm` to require a provider instead of allowing a
> keyless run. Full scanner coverage still requires the external tools listed in
> [Installation](/skills/skillevaluator/installation#system-tools).

命令矩阵（「What Tier 1 checks」节）：

| Command              | Purpose                                                                               | Needs a key? |
| -------------------- | ------------------------------------------------------------------------------------- | ------------ |
| Top-level `validate` | Run the selected Tier 1 checks, Tier 2 deduplication, and Tier 3 autopilot for skills | Yes for the full pipeline; `--tiers 1` selects keyless static checks |
| `quality-check`      | Score skill quality across four weighted categories                                   | No |
| `rubric-eval`        | Run the nine-criterion LLM-as-judge rubric                                            | Yes |
| `security-scan`      | Run SkillSpector static scanning and optional LLM analysis                            | No (only with `--llm`/`--llm-verify`) |
| `pii-scan`           | Detect PII, credentials, secrets, and local identifiers                               | No (only with `--llm-verify`) |
| `lint-scripts`       | Run advisory AST-based checks on Python scripts                                       | No |

> `validate` is the umbrella command: all three tiers run by default for skills, with autopilot creating one starter evaluation case if no source exists. Tier 1 checks always gate the exit code (non-zero on failure or incomplete required scanner evidence), Tier 2 dedup runs and gates by default, and Tier 3 is advisory by default. Use `--tiers 1` for static checks only, `--no-block-on-dedup` to keep Tier 2 advisory, or `--block-on-agent-eval` to promote Tier 3 into the gate.

退出码（「Run the default suite」节）：

> The exit code is `0` when every gate passes and `1` when one fails.

离线完整门禁（同节）：

> With Semgrep, SkillSpector, and Gitleaks installed, every required scanner produces evidence and the run is deterministic — the same input yields the same exit code, with nothing leaving your machine.

> Install the scanners, then select only Tier 1 for a fully hermetic run:
>
> ```bash
> brew install gitleaks semgrep
> uv tool install git+https://github.com/NVIDIA/SkillSpector.git@v2.13.4
> skillevaluator validate ./my-skill --tiers 1
> ```

severity override 与分数门禁（「Write a custom policy overlay」节）：

> Severity overrides change how findings gate a run; they do not change the
> quality score or waive its `--min-score` requirement. Even an override of
> `QUALITY.*: info` leaves a below-minimum quality score failing.

## docs.nvidia.com/skills/skillevaluator/tier2-deduplication（节录，2026-11-16）

开头：

> Detect redundant content within one skill and overlapping skills across a collection using embedding similarity.

> Tier 2 finds redundant content — inside a single skill and across a skill
> collection — using embedding similarity, with chat-LLM verification for
> intra-skill candidates. It needs a configured embeddings provider; intra-skill
> analysis also needs a chat LLM.

命令（「Run Tier 2」节）：

```bash
# intra-skill only
skillevaluator tier2 ./my-skill

# intra-skill + against a saved catalog
skillevaluator tier2 ./my-skill --catalog ./skill-catalog.json

# build the catalog
similarity-check ./skills --save-catalog ./skill-catalog.json
```

> Without `--catalog`, the output explicitly reports that inter-skill comparison did not run; it does not claim the skill is distinct from a catalog it never checked.

两个检查的差别（「Which check do you need」节）：

|                       | Intra-skill (`context-optimization-check`) | Inter-skill (`similarity-check`) |
| --------------------- | --------------------------------------------- | --------------------------------- |
| Scope | Within one skill directory | Across a collection, or one candidate against a local catalog |
| Needs | Embeddings provider **and** a chat LLM | Embeddings provider only — no chat LLM is ever called |
| Comparison | Pairwise cosine similarity, then Union-Find clustering, then LLM verification | Pairwise cosine similarity, or one target compared with catalog entries |
| Embedding storage | Ephemeral, in memory per run | Ephemeral for a direct scan, or a versioned local JSON catalog |

intra-skill 两阶段（「Detect redundancy inside one skill」节）：

| Stage | What runs | What it produces |
| --- | --- | --- |
| 1. Embedding clustering | Chunks are batch-embedded with the configured embeddings provider; pairs at or above the threshold are grouped with Union-Find | Candidate clusters of overlapping chunks |
| 2. LLM verification | The actual text of each candidate cluster goes to the configured provider model for classification | A verdict, a confidence score, reasoning, and a suggested author action |

> The default intra-skill threshold (`0.80`) is higher than the inter-skill
> default because sections from the same skill naturally share more domain
> vocabulary.

判定与严重级（「Verdicts and what to do about them」节）：

| Verdict | Meaning | Your action |
| --- | --- | --- |
| `DUPLICATE` | Content repeats the same information without a meaningful addition | Consolidate into one location; the finding is actionable |
| `INTENTIONAL_DETAIL` | One section summarizes content another section develops in detail | Keep it — progressive disclosure is not reported as a finding |
| `RELATED_BUT_DISTINCT` | Sections cover the same topic for different purposes or from different angles | Keep it — not reported as a finding |

| Condition | Severity |
| --- | --- |
| `DUPLICATE` with confidence >= 0.70 | HIGH — blocking |
| `DUPLICATE` with confidence < 0.70 | MEDIUM — advisory |
| Short, same-file duplicate dominated by comment or configuration-style text | Capped at LOW — advisory |

inter-skill 阈值与分类（「Compare skills across a collection」节）：

| `HIGH_SIMILARITY` | >= 0.90 | HIGH — blocking |
| `SIMILAR` | >= 0.75 | MEDIUM — advisory |
| `LOOSELY_RELATED` | >= 0.50 | LOW — advisory |
| `DISTINCT` | < 0.50 | INFO — advisory; below the default reporting threshold |

> The threshold controls which score bands are returned; it does not change the
> classification boundaries. The default (`0.75`) reports `SIMILAR` and stronger
> matches.

| Flag | Default | Effect |
| --- | --- | --- |
| `--threshold` | `0.75` | Minimum reported cosine score |

defaults-and-safety-limits 表（「Defaults and safety limits」节）：

| Setting | Default | Purpose |
| --- | --- | --- |
| Inter-skill reporting threshold | `0.75` | Reports `SIMILAR` and stronger matches |
| Intra-skill clustering threshold | `0.80` | Selects candidate chunk pairs for clustering |
| Full-body chunking | 512 tokens, 64-token overlap | Chunked average pooling for `--full-body` embeddings |
| Minimum content chunk | 80 characters | Drops sections and chunks too small to compare usefully |
| Embedding input cap | 3,000 characters | Caps every Markdown, Python, and shell embedding input |
| High-confidence duplicate boundary | `0.70` | Maps actionable duplicate verdicts to HIGH rather than MEDIUM |
| Inter-skill name and description | 16,384 characters each | Per-field catalog text limit |
| Intra-skill content chunks | 1,024 | Per-skill ceiling, checked before any embedding request |

「What leaves your machine」节：

> * A default inter-skill scan sends skill names and descriptions to the
>   configured embeddings provider. With `--full-body`, the scan sends each
>   discovered `SKILL.md` in full, including frontmatter, in embedding chunks.
> * Intra-skill analysis sends retained content chunks to the configured
>   embeddings provider. Only candidate clusters found by the embedding stage are
>   sent to the configured chat LLM for classification.
> * `similarity-check` never calls a chat LLM.

## docs.nvidia.com/skills/skillevaluator/agents-and-sandboxes（节录，2026-11-16）

Supported agents（「Supported agents」节）：

> Pass agents as a comma-separated list with `-a/--agents`. Without that option,
> SkillEvaluator selects the provider-native default: `opencode` for NVIDIA Build,
> `codex` for OpenAI, and `claude-code` for Anthropic. Three agents are supported,
> with Hermes available as an explicit experimental option:

| Agent | Notes |
| --- | --- |
| `claude-code` | Anthropic's Claude Code CLI. `claude` is an accepted alias. Harbor installs Claude Code 2.1.292. |
| `codex` | OpenAI's Codex CLI. The OpenAI-provider default. Harbor installs Codex 0.161.0. Runs with `reasoning_effort=high`. |
| `opencode` | The OpenCode CLI. Harbor installs OpenCode 1.19.5. |
| `hermes` | Experimental. Hermes v2026.9.24, Docker with NVIDIA Build only; no OpenRouter fallback. |

> The pinned CLI releases apply wherever Harbor installs the agent: Docker and the remote environments. [Local mode](#local-mode) runs the CLI already on your machine instead.

> **Note**
>
> Harbor installs agent CLIs in Docker and remote task environments. Local mode requires an agent CLI already installed on your machine. Operator credentials come only from the host environment — a `harbor.runtime_env` entry in `evals/config.yml` that sets an operator-owned credential name … is rejected at run time.

One NVIDIA Build key for everything（同页）：

> When the evaluator provider is NVIDIA Build (`nv_build`) and trials run in `--env-mode docker`, `kata`, or `local`, a single `NVIDIA_API_KEY` powers the evaluator and all three agents:
>
> * **OpenCode** calls NVIDIA Build directly through its `nvidia` provider adapter.
> * **Codex** runs against a SkillEvaluator-owned loopback compatibility bridge that translates the OpenAI Responses API into NVIDIA Build Chat Completions calls.
> * **Claude Code** (experimental on this path) runs against an equivalent Messages-to-Chat-Completions bridge.
>
> Both bridges support multi-turn tool-call continuation, so agents complete real tool loops against Build models.

> The bridges exist only in `docker`, `kata`, and `local` mode. On any other Harbor backend, each agent calls its native provider:

| Agent | Requirement with `nv_build` on other backends |
| --- | --- |
| `claude-code` | Its own `ANTHROPIC_API_KEY` in the host environment, plus an explicit model (`--agent-model claude-code=MODEL`). |
| `codex` | A full OpenAI Responses credential — `OPENAI_API_KEY` + `OPENAI_BASE_URL`, distinct from Build's — plus an explicit model. |
| `opencode` | Works with `NVIDIA_API_KEY` directly. |

Where trials run（「Where trials run」节）：

> SkillEvaluator exposes 27 environment modes: 26 Harbor-native backends, including Docker, plus SkillEvaluator's own `local` host-execution mode. Docker is the default.

| Mode | Type | Harbor extra or system prerequisite |
| --- | --- | --- |
| `docker` | Harbor-native | No additional Python extra. Requires Docker Engine and Docker Compose v2 |
| `kata` | Harbor-native | Requires a Linux host with `/dev/kvm` and a Kata Containers runtime registered with Docker |
| `daytona` | Harbor-native | `harbor[daytona]==0.25.0` |
| `e2b` | Harbor-native | `harbor[e2b]==0.25.0` |
| （其余 22 种略：modal、runloop、langsmith、ec2、gke、ack、openshift、novita、apple-container、singularity、islo、tensorlake、cwsandbox、wandb、use-computer、blaxel、beam、skypilot、hyperbrowser、vercel、runta 等） | | |

## docs.nvidia.com/skills/skillevaluator/configuration（节录，2026-11-16）

One provider and key for all three tiers：

> **For NVIDIA Build, getting started requires just two variables: the provider and its API key.** Default chat and embedding models are already configured:
>
> ```bash
> export SKILL_EVAL_LLM_PROVIDER=nv_build
> export NVIDIA_API_KEY='nvapi-...'
> ```
>
> The same key covers Tier 1 LLM checks, Tier 2 embeddings and chat, and supported Tier 3 agents in Docker, Kata, or local mode.

What needs a key（表格节选）：

| Runs without an LLM credential | Needs a provider key |
| --- | --- |
| `tier1 PATH --no-llm` and `validate PATH --tiers 1` (deterministic checks: schema, security scanners including secret detection, PII, license, code-integrity, unicode, quality, lint; direct Tier 1 also checks dependencies) | `rubric-eval` — LLM-as-judge scoring (chat LLM) |
| `quality-check`, `security-scan`, `pii-scan`, `lint-scripts` | `tier1 PATH` automatically enables LLM stages when configured; `validate --llm` / `security-scan --llm` — deeper LLM security analysis |
| `doctor`, `health-check` (offline readiness probes by default) | All Tier 2 commands — embeddings API; `context-optimization-check` and `dedup-scan` also use a chat LLM (`similarity-check` is embeddings-only) |
| Tier 3 scaffolding and inspection: `create-eval-dataset PATH --no-llm --grounding skill`, `init-custom-grader`, `init-harbor-task`, `tier3 validate`, `view`, `harbor-view`, and `compare` | Tier 3 LLM dataset generation needs a provider key; `tier3 evaluate` needs a provider key plus a credential the selected live agent can use — with NVIDIA Build in `--env-mode docker` or `local`, one `NVIDIA_API_KEY` covers both roles |

Tier 3 credentials: two roles（「Tier 3 credentials: two roles」节）：

| Role | Who uses it | How you configure it |
| --- | --- | --- |
| Evaluator key | SkillEvaluator itself — dataset generation and verifier-side judging | The provider setup above (`SKILL_EVAL_LLM_PROVIDER` + its key) |
| Agent credential | The live agent under test (Codex, Claude Code, ...) inside its task environment | Your host environment only — export the agent's native variables (for example `OPENAI_API_KEY` and `OPENAI_BASE_URL` for Codex) before the run |

> Both roles resolve from the operator's environment; a skill's `evals/config.yml` can never supply, rename, or redirect a credential. Export them in the shell or CI job that runs SkillEvaluator: Harbor starts in an empty, evaluator-owned working directory with `.env` loading disabled, so a `.env` or `.env.local` file near your project is not read.

> * **NVIDIA Build, one key** (`--env-mode docker`, `kata`, or `local`): a single `NVIDIA_API_KEY` powers the evaluator and all three supported agents …
> * **NVIDIA Build on Harbor cloud modes** (`daytona`, `e2b`, ...): the bridge is not available. `claude-code` needs its own native `ANTHROPIC_API_KEY`, `codex` needs a full OpenAI Responses API credential (`OPENAI_API_KEY` plus `OPENAI_BASE_URL`), and each needs an explicit model via `--agent-model` or `harbor.agents.<agent>.model`.
> * **Matching native provider**: when the evaluator provider is the agent's own (for example `anthropic` with `claude-code`, or `openai` with `codex`), the same key serves both roles automatically.
> * **OpenAI-compatible gateway**: Codex, OpenCode, and Claude Code inherit the shared URL and key.

Key protection（同页）：

> The bridged CLIs — Codex and Claude Code — never see the real Build key:
>
> * **Docker mode** passes the key to Harbor's trusted parent process over stdin, then uses a short-lived, container-only stdin handoff for each main-container exec.
> * **Local mode** keeps the real key in Harbor's trusted parent process; each bridged CLI receives a unique per-trial capability token that only the loopback bridge accepts.
>
> OpenCode is the exception: it calls NVIDIA Build directly, so it necessarily receives the key itself.

Judge failures are not zero scores（同页）：

> Standard Tier 3 grading treats a required judge transport, authentication, timeout, HTTP, or exhausted response-parsing error as an evaluation infrastructure failure. A condition containing a failed or incomplete default trial publishes none of its scores, dimensions, pass\@k, or quality findings, and no cross-condition lift is published.

Embeddings（「Embeddings」节）：

> Anthropic and Bedrock do not provide embeddings, and SkillEvaluator rejects them as embedding providers. When one of those is your LLM provider, configure an embedding-capable provider separately for Tier 2.

Fully local setup（「Fully local setup」节）：

> The `openai-compatible` provider accepts any local OpenAI-compatible server (Ollama, vLLM, llama.cpp, NVIDIA NIM), so Tier 2 can run with no external calls at all.

## docs.nvidia.com/skills/skillevaluator/installation（节录，2026-11-16）

Requirements：

> * uv for the recommended install paths (plain pip works too).
> * Python 3.12, 3.13, or 3.14.
> * Git for installs from the repository and for the bundled-example checkout.
> * Docker, only for the container install and Tier 3 Docker-mode evaluation.
> * No API key is needed for deterministic Tier 1 checks. The base package includes Bandit and the uv executable; Tier 1 provisions SkillSpector and Gitleaks itself, and Semgrep is optional.

System tools（「System tools」节）：

> * **SkillSpector:** when no executable is found, Tier 1 downloads the 2.13.4 release wheel once into the SkillEvaluator runtime folder, verifies its SHA-256 checksum, and runs it with `uv tool run`. … The first run needs network access (GitHub and PyPI); later runs use the uv cache.
> * **Semgrep:** optional. When it is installed, Code Risk Analysis adds its rules to Bandit; when it is not, the check notes it was skipped. Set `SKILLEVALUATOR_REQUIRE_SEMGREP=1` to report a missing Semgrep as `INCOMPLETE` (the Tier 1 CI image does).
> * **Gitleaks:** on first use, SkillEvaluator downloads the pinned 8.30.0 release into its runtime folder and verifies its SHA-256 checksum. There is no prompt, so CI runs install it too. Linux and macOS only.
>
> Installed executables take precedence. To use your own, put them on `PATH` or set `SKILLEVALUATOR_SEMGREP_PATH` and `SKILLEVALUATOR_SKILLSPECTOR_PATH`.

Docker 镜像（「Docker」节）：

> The image does not bundle the SkillSpector or Gitleaks executables. Tier 1 downloads the pinned releases on first run, so the container needs network access to GitHub and PyPI, and each new container downloads them again. Without that access their required scanner evidence is incomplete and `validate` exits non-zero — the other checks still run and the report is still produced. Semgrep is optional and not in the image.

extras（「Choosing extras」节）：

> The base package completes the schema, PII, license, quality, Unicode, script-lint, and hygiene checks on its own. `quality-check` needs no scanner setup. When you run the full static suite, the base package also runs Bandit, and scanner-backed checks report INCOMPLETE until the required external scanners are available. Running without an LLM or API key does not remove those scanner requirements.

| Extra | What it unlocks |
| --- | --- |
| `llm` | Shared LLM and embedding clients used by LLM-backed checks, Tier 2, and Tier 3 |
| `tier2` | Intra-skill deduplication and local-catalog inter-skill similarity; includes `llm` |
| `tier3` | Docker, local, and cloud live-agent evaluation through Harbor (pins `harbor==0.25.0` and requires `python-dotenv>=1.2.0`); includes `llm` |
| `security` | pip-audit, for the opt-in dependency audit (Bandit is in the base package) |
| `all` | `tier2`, `tier3`, and `security` in one bundle |

Troubleshooting（「Troubleshooting」节）：

> #### Validation reports INCOMPLETE and exits non-zero
>
> A required scanner could not run. Check that GitHub and PyPI are reachable (SkillSpector), or that GitHub is reachable for the Gitleaks download, or install the scanner named in the report. Missing required evidence leaves validation `INCOMPLETE` and non-zero. To run without that scanner, pass `--skip` with the check named in the fix list (e.g. `--skip secrets`); the check is then reported as skipped and the run cannot certify Tier 1.
