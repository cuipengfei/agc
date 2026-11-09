# sandcastle：README 与编排文档摘录

> Source: https://github.com/mattpocock/sandcastle （README、docs/guide 的 getting-started、core-concepts、run、iterations、branch-strategies、init、cli、glossary、.out-of-scope/*、package.json）; https://registry.npmjs.org/@ai-hero/sandcastle
> Collected: 2026-11-09
> Published: Unknown

## README

> ## What is Sandcastle?
>
> A TypeScript library for orchestrating AI coding agents in isolated sandboxes:
>
> 1. You invoke agents with a single `sandcastle.run()`.
> 2. Sandcastle handles sandboxing the agent with a configurable branch strategy.
> 3. The commits made on the branches get merged back.
>
> Sandcastle is provider-agnostic. It ships with native sandboxes that use your OS's own process sandbox (Bubblewrap on Linux and WSL2, Seatbelt on macOS), image-based providers for Docker and Podman, and cloud providers for Daytona, E2B, Fly.io Sprites, Modal and Vercel, and you can create your own. Great for parallelizing multiple AFK agents, creating review pipelines, or even just orchestrating your own agents.

仓库主页元数据：Stars 8950，Forks 965，Issues 171，Language TypeScript，License MIT。

## getting-started.md

### Prerequisites

> - [Git](https://git-scm.com/)
> - A [sandbox provider](./glossary.md#sandbox-provider): the function, such as `bwrap()` or `docker()`, that creates the sandbox and runs the agent in it. You pass it to `run()` as the `sandbox` option. Built-in options:
>   - **Native sandboxes (recommended for local development)**: no image to build and no daemon to run. The agent uses the tools already installed on your [host](./glossary.md#host), the machine you run Sandcastle on.
>     - `bwrap()` on Linux, and on Windows inside WSL2: needs [Bubblewrap](https://github.com/containers/bubblewrap) (`sudo apt install bubblewrap`, or your distro's equivalent)
>     - `seatbelt()` on macOS 14 or later: nothing to install
>   - [Docker Desktop](https://www.docker.com/) or [Podman](https://podman.io/): image-based, with a VM boundary on macOS and Windows
>   - [Vercel](https://vercel.com/): cloud-based Firecracker microVMs via `@vercel/sandbox`
>   - Or [create your own](./sandbox-providers.md#custom-sandbox-providers) using `createBindMountSandboxProvider` or `createIsolatedSandboxProvider`

### Quick start

> 1. Install the package:
>
> ```bash
> npm install --save-dev @ai-hero/sandcastle
> ```
>
> 2. Run `npx @ai-hero/sandcastle init`. [Init](./glossary.md#init) is the one-time setup command: it scaffolds a `.sandcastle` directory with all the files needed, lists your OS's native sandbox first, marked "(recommended)", and checks that it works on your machine.
>
> 3. Copy `.sandcastle/.env.example` to `.sandcastle/.env`, then fill in your default values for `CLAUDE_CODE_OAUTH_TOKEN` (run `claude setup-token` on your host to get one). ... A native sandbox hides your host's stored logins from the agent, so the agent logs in only through these env vars.
>
> 4. Run the `.sandcastle/main.mts` file with `npx tsx` (init names it `main.ts` instead when your `package.json` has `"type": "module"`)

```typescript
import { run, claudeCode } from "@ai-hero/sandcastle";
import { bwrap } from "@ai-hero/sandcastle/sandboxes/bwrap";

await run({
  agent: claudeCode("claude-opus-4-8"),
  sandbox: bwrap(), // seatbelt() on macOS, or docker(), podman(), vercel(), or your own provider
  promptFile: ".sandcastle/prompt.md",
});
```

## core-concepts.md

```typescript
const result = await run({
  agent: claudeCode("claude-opus-4-8"),
  sandbox: docker(),
  promptFile: ".sandcastle/prompt.md",
});

console.log(result.iterations.length); // number of iterations executed
console.log(result.iterations); // per-iteration results with optional sessionId
console.log(result.commits); // array of { sha } for commits created
console.log(result.branch); // target branch name
```

> One pass of the agent, from start to exit, is an [iteration](./glossary.md#iteration): Sandcastle starts it, lets it work on one piece of work, and collects the commits it made. A run takes one iteration unless you raise `maxIterations`, and `result.iterations` holds one entry for each.
>
> Where those commits land is up to the [branch strategy](./glossary.md#branch-strategy). Some strategies give the agent a [worktree](./glossary.md#worktree): a second checkout of your repo, on its own branch, so the agent never touches the files you have open.

文档地图（每页一个术语）：getting-started、sandbox-providers、branch-strategies、agent-providers、agent-sessions、iterations、structured-output、prompts、hooks、init、run-logs、run、cli、glossary。

## run.md

### RunOptions（选录）

| Option                     | Type               | Default                       | Description                                                                                                                                                                                  |
| -------------------------- | ------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agent`                    | AgentProvider      | —                             | **Required.** Agent provider（`claudeCode(...)`、`pi(...)`、`codex(...)`、`cursor(...)`、`opencode(...)`、`copilot(...)`）                                                                     |
| `sandbox`                  | SandboxProvider    | —                             | **Required.** Sandbox provider                                                                                                                                                               |
| `cwd`                      | string             | `process.cwd()`               | Host repo directory — anchor for `.sandcastle/` artifacts and git operations                                                                                                                  |
| `prompt` / `promptFile`    | string             | —                             | 二选一；`promptFile` 相对 `process.cwd()` 解析，**不是** `cwd`                                                                                                                                |
| `maxIterations`            | number             | `1`                           | Maximum iterations to run                                                                                                                                                                    |
| `branchStrategy`           | BranchStrategy     | per-provider default          | `{ type: 'head' }`、`{ type: 'merge-to-head' }`、`{ type: 'branch', branch: '…' }`                                                                                                             |
| `copyToWorktree`           | string[]           | —                             | 启动前复制进沙箱的宿主相对路径（`head` 策略不支持）                                                                                                                                           |
| `logging`                  | object             | file (auto-generated)         | `{ type: 'file', path }` 或 `{ type: 'stdout' }`                                                                                                                                              |
| `completionSignal`         | string \| string[] | `<promise>COMPLETE</promise>` | 提前结束迭代循环的标记                                                                                                                                                                        |
| `idleTimeoutSeconds`       | number             | `600`                         | 空闲超时，每次 agent 输出都会重置                                                                                                                                                             |
| `completionTimeoutSeconds` | number             | `60`                          | 看到完成信号后等待进程退出的宽限窗口                                                                                                                                                          |
| `resumeSession`            | string             | —                             | 按 id 续接既有会话；与 `maxIterations > 1` 不兼容                                                                                                                                              |
| `timeouts`                 | Timeouts           | —                             | 生命周期步骤超时：`copyToWorktreeMs` 60 000、`gitSetupMs` 10 000、`commitCollectionMs` 30 000、`mergeToHostMs` 30 000                                                                          |
| `output`                   | OutputDefinition   | —                             | 结构化输出定义（`Output.object(…)` 或 `Output.string(…)`）；要求 `maxIterations === 1`                                                                                                        |

### RunResult

| Field                   | Type                                        | Description                                                                                                |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `iterations`            | `IterationResult[]`                         | Per-iteration results (use `.length` for the count)                                                          |
| `completionSignal`      | string?                                     | 命中的完成信号，未命中为 `undefined`                                                                          |
| `stdout`                | string                                      | Agent output                                                                                                 |
| `commits`               | `{ sha }[]`                                 | Commits created during the run                                                                               |
| `branch`                | string                                      | **Target branch** name                                                                                       |
| `logFilePath`           | string?                                     | 仅写文件日志时有                                                                                              |
| `output`                | T?                                          | **仅在设置 `output` 选项时存在**                                                                              |
| `preservedWorktreePath` | string?                                     | 运行成功但 worktree 有未提交改动时，保留的宿主路径                                                             |
| `resume`                | `(prompt, options?) => Promise<RunResult>`? | 续接最后捕获的会话一轮                                                                                        |
| `fork`                  | `(prompt, options?) => Promise<RunResult>`? | 分叉最后捕获的会话一轮                                                                                        |

### IterationResult

> | `sessionId` | string? | Agent session ID from the provider stream, or `undefined` if the provider does not emit one |
> | `sessionFilePath` | string? | Absolute host path to the captured session JSONL, or `undefined` when capture is off |
> | `usage` | `IterationUsage`? | Token usage snapshot from the last assistant message |
> | `contextWindow` | `ContextWindow`? | Input tokens of the iteration's last model call, cache included |

### createSandbox()

> Use `createSandbox()` when you need to run multiple agents (or multiple rounds of the same agent) inside a single sandbox. It creates the sandbox once, and you call `sandbox.run()` as many times as you need. This avoids repeated container startup costs and keeps all runs on the same branch.

`CreateSandboxOptions`：`branch`（必填）、`sandbox`（必填）、`cwd`、`hooks`、`copyToWorktree`、`timeouts`。

`sandbox.exec()` 在同一沙箱里跑 shell 命令，非零 `exitCode` 直接返回而不抛出。

`CloseResult.preservedWorktreePath` 在有未提交改动时给出保留路径。

## iterations.md

> `maxIterations` sets how many iterations `run()` may run (default `1`). The loop stops sooner when the agent emits the completion signal, a marker it prints to say there is nothing left to do

> When the agent outputs `<promise>COMPLETE</promise>`, the orchestrator stops the iteration loop early. This is a convention you document in your prompt for the agent to follow — the engine never injects it.

悬挂进程：

> The agent process is expected to exit shortly after emitting the completion signal. When a child it spawned — a `gh`/git subprocess, a long-lived MCP server, etc. — inherits the agent's stdout pipe and keeps it open, the agent becomes a hanging process: it has said it is done, but it never exits. Sandcastle would otherwise wait for the full `idleTimeoutSeconds` and fail with `AgentIdleTimeoutError`, throwing away the commits the agent already made.
>
> Instead, once the completion signal is observed in the output buffer, Sandcastle swaps in a short completion timeout (default 60 s). When it expires, the run resolves successfully with a warning that the process was hanging ... The timer resets on every subsequent output line

## branch-strategies.md

> - **Head** (`{ type: "head" }`) — The agent writes directly to the host working directory. No worktree, no branch indirection. This is the default for bind-mount providers like `docker()`.
> - **Merge-to-head** (`{ type: "merge-to-head" }`) — Sandcastle creates a temporary branch in a git worktree. The agent works on the temp branch, and changes are merged back to HEAD when done. The temp branch is cleaned up after merge. If the run fails, the temp branch is deleted too, unless the agent left commits on it: then it is kept, and Sandcastle prints how to merge or discard it. If the merge itself fails (for example on a conflict), Sandcastle aborts it so HEAD is unchanged and keeps the temp branch.
> - **Branch** (`{ type: "branch", branch: "foo" }`) — Commits land on an explicitly named branch in a git worktree. Re-running with the same branch reuses the existing worktree and fast-forwards it from `origin` when safe.

默认值：

| Strategy        | Behavior                                                                 | Bind-mount | Isolated  |
| --------------- | ------------------------------------------------------------------------ | ---------- | --------- |
| `head`          | Agent writes directly to the host working directory. No worktree created | Default    | N/A       |
| `merge-to-head` | Sandcastle creates a temp branch, merges back to HEAD when done          | Supported  | Default   |
| `branch`        | Commits land on an explicit named branch you provide                     | Supported  | Supported |

git 挂载与保护：

> The repo's `.git` is mounted too, so the agent can commit. The files that decide what git runs are mounted read-only: `.git/config`, `.git/hooks`, `.git/info`, the worktree's `.git` file and its `commondir`. ... So `git config` without `--global` fails inside the sandbox.

> These protections cover the git commands Sandcastle runs. Git commands you run later in your own repo are outside Sandcastle's control: review the agent's changes before you run git commands that read repo config (`git status`, `git pull`, and so on) in a repo a sandbox has written to.

`createWorktree()`：

> Only `branch` and `merge-to-head` strategies are accepted; `head` is a compile-time type error since it means no worktree.

> `wt.close()` checks for uncommitted changes: if the worktree is dirty, it's preserved on disk; if clean, it's removed.

> **Split ownership**: When a sandbox is created via `wt.createSandbox()`, `sandbox.close()` tears down the container only — the worktree remains. `wt.close()` is responsible for worktree cleanup. This differs from the top-level `createSandbox()`, where `sandbox.close()` owns both container and worktree.

源分支与目标分支：

> The source branch is the branch the agent works on, and the strategy picks it: your current branch under head, a temporary branch under merge-to-head, or the one you name under branch. The target branch is the branch you had checked out when you called `run()`, the one merge-to-head merges back into.

worktree 目录：`.sandcastle/worktrees/`。临时分支命名 `sandcastle/<ts>`（见 `.out-of-scope/configurable-namespace-prefix.md`）。

## init.md

产物：

```
.sandcastle/
├── Dockerfile      # Sandbox environment (Docker only; Containerfile for Podman; none for bwrap/seatbelt)
├── main.mts        # Agent entry point (main.ts in an ESM package)
├── prompt.md       # Agent instructions
├── .env.example    # Token placeholders
└── .gitignore      # Ignores .env, logs/, worktrees/
```

> Errors if `.sandcastle/` already exists to prevent overwriting customizations.

模板：

| Template                       | Description                                                               |
| ------------------------------ | ------------------------------------------------------------------------- |
| `blank`                        | Bare scaffold — write your own prompt and orchestration                   |
| `simple-loop`                  | Picks issues one by one and closes them                                   |
| `sequential-reviewer`          | Implements issues one by one, with a code review step after each          |
| `parallel-planner`             | Plans parallelizable issues, executes on separate branches, then merges   |
| `parallel-planner-with-review` | Plans parallelizable issues, executes with per-branch review, then merges |

任务来源：GitHub Issues、Beads、Custom。

Dockerfile 默认内容：

> - **Node.js 22** (base image)
> - **git**, **curl**, **jq** (system dependencies)
> - **GitHub CLI** (`gh`)
> - **Claude Code CLI**
> - A non-root `agent` user (required — Claude runs as this user)

原生提供方的检查：

> Init checks your host: it warns, with the exact command to run, when the sandbox tool doesn't work yet (for example `bwrap` isn't installed) or the chosen agent's CLI isn't on your `PATH`, and still writes the files.

非交互：

> When stdin is not a TTY, init checks every flag it would otherwise ask for before it writes anything, and fails with one error naming all the missing flags rather than wedging on a question or leaving a half-written `.sandcastle/` behind.

## cli.md

`sandcastle init` 选项：`--image-name`（默认 `sandcastle:<repo-dir-name>`）、`--agent`（`claude-code`、`pi`、`codex`、`cursor`、`opencode`、`copilot`）、`--model`、`--sandbox`（`bwrap`、`seatbelt`、`docker`、`podman`）、`--template`、`--issue-tracker`（`github-issues`、`beads`、`custom`）、`--create-label`、`--build-image`、`--install-template-deps`。

其余命令：`sandcastle docker build-image`（`--image-name`、`--dockerfile`）、`sandcastle docker remove-image`、`sandcastle podman build-image`（`--containerfile`）、`sandcastle podman remove-image`。没有 `sandcastle run` 子命令。

## glossary.md（选录）

- **Iteration**：一次 agent 在沙箱内的运行，`maxIterations` 限制一轮能跑几次。词条原文：“One run of the agent inside the sandbox, **making at most one commit for one task**.”
- **Completion signal**：`<promise>COMPLETE</promise>`，无数据，需要数据时用结构化输出。
- **Hanging process**：打印完成信号但进程不退出。
- **Native sandbox provider**：用操作系统自带的进程沙箱（Linux 上 Bubblewrap，macOS 上 Seatbelt）。
- **No-sandbox provider**：`noSandbox()`，不建沙箱，agent 直接在宿主上跑。
- **Worktree**：Sandcastle 在 `.sandcastle/worktrees/` 创建的 git worktree。
- **Bind-mount sandbox provider**：把宿主仓库直接挂进沙箱。
- **Isolated sandbox provider**：沙箱有自己的文件系统，代码拷进拷出。
- **Config directory**：仓库里的 `.sandcastle/`。
- **Run log**：`.sandcastle/logs/` 下的日志文件。

### 文档内部不一致

`core-concepts.md` 写一次 iteration “collects the commits it made”（复数），`glossary.md` 的 Iteration 词条写 “making at most one commit for one task”。两处原文并存，本文不选边。

## .out-of-scope/ 八份

| 文件 | 结论 |
|---|---|
| `built-in-agent-providers.md` | 内置 agent 提供方不按请求增长；已收录 Claude Code、Codex、Cursor、OpenCode、GitHub Copilot CLI、Pi。新增门槛：非交互运行模式、stdin 传提示词、跳过权限的开关、基于环境变量的认证、行分隔 JSON 事件流 |
| `built-in-sandbox-providers.md` | 内置沙箱不按请求增长；新增需通过 `npm run verify` 真实运行验收。`SandboxProvider` 是公开接口，长尾后端自己实现 |
| `bundled-workflow-templates.md` | 不打包大型第三方工作流模板（如 superpowers/freecc） |
| `configurable-namespace-prefix.md` | `sandcastle` / `.sandcastle` 前缀不可配置；临时分支与目录名已带时间戳，碰撞问题另有解法 |
| `custom-base-image-abstraction.md` | 不做 Dockerfile 组合抽象层；`.sandcastle/Dockerfile` 归用户所有 |
| `docker-provider-bespoke-options.md` | 不为每个 `docker run` 参数加专属选项；用自定义提供方覆盖全部参数 |
| `multi-repo-sandbox.md` | 一个沙箱只支持一个仓库；多仓库是未来版本的事，当前可用 `mounts` 挂额外目录但不带分支管理 |
| `provider-error-retry.md` | 不重试提供方错误（限流、认证、配额、网络）；失败即报错 |

## package.json 与 npm 注册表

- `name` 为 `@ai-hero/sandcastle`，`version` 为 `0.14.0`，`bin` 为 `{"sandcastle": "dist/main.js"}`，`main` 为 `./dist/index.js`。
- `engines` 未声明。
- `dependencies`：`@clack/prompts`、`@standard-schema/spec`。
- `peerDependencies`（全部 `optional`）：`@vercel/sandbox`、`@daytona/sdk`、`@fly/sprites`、`e2b`、`modal`。
- `exports` 中的沙箱子路径共 10 条：`docker`、`e2b`、`vercel`、`podman`、`daytona`、`modal`、`no-sandbox`、`bwrap`、`seatbelt`、`sprites`。
- npm 注册表 `dist-tags`：`latest` 为 `0.14.0`，`v1-next` 为 `1.0.0-v1-next.20261105145541`；共有 64 个版本记录。

注意：`docs/guide/sandbox-providers.md` 的提供方表只有 9 行，没有 Daytona，而 `exports` 与 README 都含 Daytona。文档表格漏列一条。

## Development（README）

```bash
npm install
npm run build    # Bundle with tsup
npm test         # Run tests with vitest
npm run typecheck # Type-check
```
