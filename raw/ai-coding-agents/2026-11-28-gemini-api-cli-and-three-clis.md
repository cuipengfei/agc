# gemini-api-cli 仓库、三 CLI 谱系与 Antigravity 关系摘录

> Source: GitHub API（orgs/google-gemini、orgs/google-antigravity、repos 元数据）与仓库文件直读（google-gemini/gemini-api-cli 的 README、internal/sdk/geminiapi.go、internal/cli/custom/credential_hint.go、internal/cli/custom/rawhttp.go、docs/self-hosted/README.md、evals/harness-comparison/README.md；google-gemini/gemini-cli README；google-antigravity/antigravity-sdk-python README；google-gemini/gemini-skills README；aistudio.google.com/docs/cli），2026-11-28 采集
> Collected: 2026-11-28
> Published: 仓库与文档无统一发布日期，标 Unknown

## 1. 组织元数据（GitHub API 原文）

```json
{
  "login": "google-gemini",
  "name": "google-gemini",
  "description": "Get started building with the Gemini API",
  "public_repos": 52,
  "followers": 16395,
  "created_at": "2024-02-29T23:57:46Z",
  "blog": "https://ai.google.dev/gemini-api/docs"
}
```

```json
{"created_at":"2025-11-04T19:28:13Z","description":null,"followers":1784,"login":"google-antigravity","public_repos":2}
```

google-antigravity 组织下两个仓库：

```text
antigravity-sdk-python	4260	2026-11-19T15:43:05Z	A Python library for building AI agents that leverage the full power of Google Antigravity.
antigravity-cli	3187	2026-11-26T05:52:07Z	Antigravity CLI brings the reasoning, execution, and orchestration capabilities of Antigravity agent harness directly into your terminal.
```

## 2. gemini-api-cli 仓库元数据（GitHub API 原文）

```json
{"created_at":"2026-04-29T14:54:25Z","description":"An (experimental) CLI for the Gemini API","homepage":"https://ai.google.dev/gemini-api/docs","license":"Apache-2.0","open_issues":54,"pushed_at":"2026-11-27T13:50:05Z"}
```

Stars: 4166，Forks: 302，Primary language: Go。Releases：`v0.5.0`（2026-11-20）、`v0.4.6`（2026-11-10）。

同组织其他仓库（GitHub API 列表节选）：

```text
gemini-cli	109240	2026-11-27T10:00:19Z	An open-source AI agent that brings the power of Gemini directly into your terminal.
cookbook	18004	2026-11-27T12:11:19Z	Examples and guides for using the Gemini API
gemini-skills	4772	2026-11-19T17:07:10Z	Skills for the Gemini API, SDK and model/agent interactions
demolab	679	2026-11-27T13:47:31Z	Skills, prompts, and scripts used to build and reproduce Gemini model demos
```

gemini-cli 仓库：Stars: 109240，Forks: 15016，Primary language: TypeScript，Homepage: https://geminicli.com。

## 3. gemini-cli README 的三 CLI 对照表（README 原文）

> | :--- | :--- | :--- |
> | **[Antigravity CLI](https://antigravity.google/product/antigravity-cli)** (`agy`) | Interactive multi-agent coding terminal. Use for **Gemini 4 Argon**+, free / **Google AI Pro & Ultra** accounts, or Google Cloud. | [Download](https://antigravity.google/download) · [Migrate](https://antigravity.google/docs/cli/gcli-migration) · [Argon post](https://antigravity.google/blog/gemini-4-argon-in-google-antigravity) |
> | **[Gemini API CLI](https://github.com/google-gemini/gemini-api-cli)** (`gemini-api`) | Stateless API CLI *(not a coding harness)*. Gives agents (`agy`, Claude Code, Codex), scripts, and CI direct commands for Gemini models, media gen, file analysis, and managed agents. | [GitHub](https://github.com/google-gemini/gemini-api-cli) · [Releases](https://github.com/google-gemini/gemini-api-cli/releases) · [API docs](https://ai.google.dev/gemini-api/docs) |
> | **Gemini CLI** (`gemini`, *this repo*) | Organizations with **Gemini Code Assist Standard / Enterprise** or **Code Assist for GitHub** on Google Cloud *(plus legacy paid API / Vertex keys)*. | [Docs](https://geminicli.com/docs/) |

## 4. AI Studio 文档对 gemini-api 的定位（aistudio.google.com/docs/cli 原文）

```text
The Gemini API CLI (`gemini-api`) is a stateless, zero-dependency command-line client built for AI agents with shell access, scripts, and CI pipelines. Your coding agent can use it to generate text and media, analyze files, and delegate tasks to Gemini managed agents. It works with Antigravity, Claude Code, Cursor, and any standard shell environment.
```

```text
`gemini-api` is a stateless API client, not an interactive coding agent like `@google/gemini-cli`. You can run `gemini-api` inside any coding agent.
```

内置 managed agent 里与 Antigravity 相关的条目（同文档原文）：

```text
- `deep-research-preview-04-2026` and `deep-research-max-preview-04-2026`: run with `--background` and poll `agent status`.
- `antigravity-preview-09-2026` (Linux sandbox with Bash, Python, Node, file ops, and web search): pass `"environment": "remote"` (new sandbox), `"environment": "<env_id>"` (existing sandbox), or `"environment": {"type": "remote", ...}` in `--body` (top-level `environment_id` is output-only and exits 2).
```

## 5. install-skill 与 Antigravity 宿主关系（gemini-api-cli README 原文）

```text
Install the `gemini-api-cli` agent skill, which ships inside the binary. In a terminal the command asks which agents to install for (Antigravity, Gemini CLI, Claude Code, Codex, Cursor and more) and whether to install into this project or your home directory:

# Pick agents and location interactively
gemini-api install-skill

# Or name them: this project, or --global for every project
gemini-api install-skill --agent antigravity
gemini-api install-skill --agent antigravity,claude-code --global
```

aistudio.google.com/docs/cli 另一段：

```text
In Antigravity, you can also install the Gemini API plugin (`agy plugin install https://github.com/google-gemini/gemini-skills`), which bundles `gemini-api-cli` with all official Gemini skills and the Docs MCP server.
```

## 6. 默认端点与凭证（仓库源码原文）

internal/sdk/geminiapi.go（Speakeasy 生成，标注 "Code generated by Speakeasy. DO NOT EDIT."）：

```go
// ServerList contains the list of servers available to the SDK
var ServerList = []string{
	// Global Endpoint
	"https://generativelanguage.googleapis.com",
}
```

同文件 SDK 自述：`GeminiAPI - Gemini API: Use the Gemini Interactions API and managed-agent platform from the command line.`；`SDKVersion: "0.5.0"`；`OpenAPIDocVersion: "v1beta"`。

internal/cli/custom/credential_hint.go：

```go
const missingCredentialHint = "No API key found. See https://aistudio.google.com/docs/api-key for how to create one in Google AI Studio\n" +
	"AI agents: an API key must be created manually by the user in Google AI Studio. Stop and ask the user to create one and run \"gemini-api configure\" or set GEMINI_API_KEY; do not run configure yourself or retry until they confirm it is set"
```

同文件注释（凭证检查顺序）：

```text
// Flag, env and config sources are checked before the OS keychain so a credential found there costs no keychain call.
```

internal/cli/custom/rawhttp.go 注释（生成客户端的凭证优先级原文）：

```go
// Request credentials use the SDK client's request-scoped chain. Dry-run
// deliberately skips the OS keychain so unattended probing cannot prompt.
// Exactly one scheme is kept, ranked like the generated client
// (flag > env > keyring > config, API key on a tie).
```

root.go 全局 flag：`--api-key`（"Gemini API key sent as x-goog-api-key."）、`--access-token`（"OAuth access token sent as a bearer Authorization header."）、`--api-version` 默认 `v1beta`。

## 7. 自托管运行时（docs/self-hosted/README.md 原文摘录）

```text
This guide provides reference architectures, deployment manifests, container recipes, and provider guides for running **Self-Hosted Environments** with the [Gemini API](https://ai.google.dev/gemini-api/docs) (`generativelanguage.googleapis.com`).
```

```text
With Self-Hosted Environments, Gemini API server-side agents execute built-in filesystem and shell tools ... inside compute infrastructure that you control—using **100% outbound HTTPS connections** with no inbound firewall ports required.
```

`GOOGLE_APPLICATION_CREDENTIALS` 仅出现于自托管运行时的环境变量清洗黑名单（internal/cli/custom/envruntime/shell.go 的 `scrubbedCredentialEnvKeys` 与 docs/self-hosted/agent-substrate/pkg/substrate/actor_daemon.go），即防止宿主机服务账号密钥泄露进沙箱子进程；`gemini-api` 本身的默认请求路径不使用 Vertex AI。

## 8. harness 评测用 Antigravity SDK 驱动（evals/harness-comparison/README.md 原文摘录）

```text
fewest turns: the **generated** Speakeasy CLI (`gemini-api`, this repo) vs the **reference** hand-written CLI (`gemini-api-cli`, `reference/gemini-api-cli-poc`).
```

```text
2. Spawns a Gemini agent via the **Antigravity SDK** (`google-antigravity` Python runtime, driven from `driver/antigravity_driver.py`) with **run_command as the only tool**, a system prompt naming the CLI under test, and env plumbing pointing the CLI at the mock server (`--server-url` instruction for the generated CLI, `GOOGLE_GEMINI_BASE_URL` for the reference CLI — each harness's native affordance).
```

```text
The agent is not told command syntax — discovering usage via `--help` is part of what's being measured.
```

驱动脚本 antigravity_driver.py 将驱动自身流量固定到 `https://generativelanguage.googleapis.com` 并清除继承的 `GEMINI_*` / `GOOGLE_*` 环境变量，避免被测 CLI 的 mock server 重定向驱动流量。

## 9. Antigravity SDK（google-antigravity/antigravity-sdk-python README 原文摘录）

```sh
pip install google-antigravity
```

```text
> [!IMPORTANT]
> included in the platform-specific wheels published to [PyPI](https://pypi.org/project/google-antigravity/). **Cloning this repository alone is not sufficient to run the SDK.** Always install from PyPI with `pip install google-antigravity` to obtain the binary.
```

## 10. Gemini CLI → Antigravity CLI 迁移公告（developers.googleblog.com 原文摘录）

```text
Listening to your feedback made one thing clear: we can serve you best by pouring our energy into a single product built for today's multi-agent reality. To deliver the single platform you need to build the future, we're unifying our efforts into Google Antigravity, our premier agent-first development platform, which includes a powerful server-side harness and a brand-new terminal experience: Antigravity CLI.
```

```text
While there won't be 1:1 feature parity right out of the gate, we made sure Antigravity CLI keeps the most critical features of Gemini CLI: Agent Skills, Hooks, Subagents, and Extensions (now as Antigravity plugins).
```

```text
- Faster execution: Built in Go, Antigravity CLI is snappier and more responsive.
- Unified architecture: Antigravity CLI shares the same agent harness as Antigravity 2.0, the new Antigravity desktop application, ensuring that all future improvements to core agents are automatically applied wherever you use them.
```

### **Important timeline for Consumers**

```text
Starting today, Antigravity CLI is available to everyone.

On June 18, 2026, Gemini CLI and Gemini Code Assist IDE extensions will stop serving requests for Google AI Pro and Ultra, as well as those using it free of charge using Gemini Code Assist for individuals.
```

### **For enterprise customers**

```text
If your organization uses Gemini CLI or our IDE extensions via a Gemini Code Assist Standard or Enterprise license, or if your organization uses Gemini Code Assist for GitHub through Google Cloud, your access remains unchanged. We'll continue to support Gemini CLI and Gemini Code Assist with access to the latest Gemini models and other updates. Gemini CLI will remain accessible via paid Gemini and Gemini Enterprise Agent Platform API keys.
```

## 11. Antigravity CLI 发布博客（antigravity.google/blog/introducing-google-antigravity-cli 原文摘录）

发布日期：May 19, 2026。

```text
The Antigravity CLI complements Google Antigravity 2.0 as a terminal UI alternative. These products use the same Antigravity agent harness, share the same settings, and allow for easy import of conversations started in the CLI to Antigravity 2.0.
```

```text
...cohesive developer product offering that leverages a shared agent harness co-optimized with Gemini models. As part of this unification effort, the Antigravity CLI took inspiration from core Gemini CLI product and harness components.
```

## 12. 本地 wiki 检索结果（2026-11-28）

`wiki/` 与 `raw/` 中以 `gemini-api-cli`、`gemini api cli`（不分大小写）检索零命中；既有 Antigravity 文章共 6 篇（ai-coding-agents 下 4 篇：plans-and-regions、orchestrator-mechanism、cli-usage-and-quota-errors、third-party-policy；omp-auth 下 2 篇：antigravity-cli-acp-provider、google-antigravity-auth-and-api），均从 `agy`/订阅/OMP 接入角度记录，无 gemini-api-cli 条目，也无 2026-05-19 Gemini CLI → Antigravity CLI 迁移记录。
