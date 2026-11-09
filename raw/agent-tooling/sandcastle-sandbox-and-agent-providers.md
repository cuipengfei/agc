# sandcastle：沙箱提供方、agent 提供方与围栏边界摘录

> Source: https://github.com/mattpocock/sandcastle （docs/guide/sandbox-providers.md、docs/guide/agent-providers.md、src/AgentProvider.ts、.changeset/modern-pi-package.md）; 本机环境检查
> Collected: 2026-11-09
> Published: Unknown

## docs/guide/sandbox-providers.md

### 提供方表

| Provider   | Import path                                | Type                | Accepted by                                 |
| ---------- | ------------------------------------------ | ------------------- | ------------------------------------------- |
| Bubblewrap | `@ai-hero/sandcastle/sandboxes/bwrap`      | Native (bind-mount) | `run()`, `createSandbox()`                  |
| Seatbelt   | `@ai-hero/sandcastle/sandboxes/seatbelt`   | Native (bind-mount) | `run()`, `createSandbox()`                  |
| Docker     | `@ai-hero/sandcastle/sandboxes/docker`     | Bind-mount          | `run()`, `createSandbox()`, `interactive()` |
| Podman     | `@ai-hero/sandcastle/sandboxes/podman`     | Bind-mount          | `run()`, `createSandbox()`, `interactive()` |
| E2B        | `@ai-hero/sandcastle/sandboxes/e2b`        | Isolated            | `run()`, `createSandbox()`                  |
| Modal      | `@ai-hero/sandcastle/sandboxes/modal`      | Isolated            | `run()`, `createSandbox()`                  |
| Sprites    | `@ai-hero/sandcastle/sandboxes/sprites`    | Isolated            | `run()`, `createSandbox()`                  |
| Vercel     | `@ai-hero/sandcastle/sandboxes/vercel`     | Isolated            | `run()`, `createSandbox()`, `interactive()` |
| No-sandbox | `@ai-hero/sandcastle/sandboxes/no-sandbox` | None                | `run()`, `createSandbox()`, `interactive()` |

> The `sandbox` option on `run()`, `interactive()`, and `createSandbox()` accepts any sandbox provider, including `noSandbox()`: opt in to running the agent directly on the host when isolation is undesired.

> [Worktree](./glossary.md#worktree) methods (`wt.run()`, `wt.interactive()`, `wt.createSandbox()`) accept the same providers as their top-level counterparts. `wt.interactive()` defaults to `noSandbox()` when no sandbox is specified.

### 原生沙箱：`bwrap()` 与 `seatbelt()`

> A native sandbox contains the agent with your OS's own process sandbox instead of a container: Bubblewrap on Linux and WSL2, Seatbelt on macOS. There's no image to build and no daemon to run. Each `exec` is a fresh sandboxed process that runs your host's own tools, read-only.

- **Files.** The agent can write only the repo (or its worktree), the git dirs Sandcastle mounts, a private temp dir and a private home. Your home directory, SSH keys, agent logins and other repos are hidden. The repo appears at its real host path, as it does under `noSandbox()`.

- **Toolchain.** Every directory on your host `PATH` is readable, plus the install root of each executable symlinked from one, so a `claude` in `~/.local/bin` or an nvm-installed `codex` just works. The install root is the executable's package when it's installed under a `node_modules` dir, and otherwise only the executable's own directory, so an `npm link`ed checkout isn't exposed. A `PATH` entry equal to your home directory or an ancestor of it, and an install root holding a `.git`, are never mounted. Add other paths with `mounts`.

- **Logins.** Each sandbox gets a fresh private home, removed on close, so the agent can't use the logins stored in your home directory: `~/.claude`, `~/.codex`, `~/.config/gh`. `seatbelt()` doesn't promise to keep the agent away from your macOS Keychain, so don't rely on it for that. Put the agent's login in `.sandcastle/.env` (`CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_API_KEY` and so on), and a `GH_TOKEN` there for `gh`. Your git identity is still copied in, so commits carry your name.

- **Env.** The agent sees only the env vars Sandcastle passes in, plus `PATH`, `HOME` and `TMPDIR`.

- **Processes.** The agent can't signal your processes, and every process it started is killed when the sandbox closes. Under `seatbelt()`, a process that leaves its process group (by calling `setsid` or `setpgid`) is the exception.

- **Network.** Open, including your host's localhost.

- **No root.** `exec` and hooks with `sudo: true` reject, pointing to `docker()`. There's no image to install system packages into, so install them on your host.

- **No `interactive()`.** `interactive()` with a native provider throws `NativeInteractiveNotSupportedError`. Use `run()`, or pass `docker()` or `noSandbox()` to `interactive()`.

### 原生提供方选项

```typescript
bwrap({
  env: { MY_VAR: "value" },
  mounts: [
    { hostPath: "/opt/my-tool-cache", sandboxPath: "/opt/my-tool-cache" },
    { hostPath: "/home/me/shared-config", sandboxPath: "/home/me/shared-config", readonly: true },
  ],
  maxOutputTailChars: 65_536,
});
```

> Constructing a native provider checks, once per process, that your machine can run it. If it can't, it throws `NativeSandboxUnavailableError`, with a `fixCommand` when there's one to run. It throws before any worktree exists, and it **never falls back to running the agent unsandboxed**.

### `bwrap()` 平台细节

> It needs `bwrap` on `PATH`; the error gives your distro's install command if it's missing. Ubuntu 24.04 and later block the unprivileged user namespaces Bubblewrap needs with AppArmor. The error says so, and its `fixCommand` gives `bwrap` an AppArmor profile that allows them

```bash
printf 'abi <abi/4.0>,\ninclude <tunables/global>\nprofile bwrap %s flags=(unconfined) {\n  userns,\n}\n' "$(command -v bwrap)" \
  | sudo tee /etc/apparmor.d/bwrap >/dev/null && sudo apparmor_parser -r /etc/apparmor.d/bwrap
```

> Or, more bluntly, allow user namespaces for every program: `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0`.

> **`bwrap()` on Windows.** Run Sandcastle inside WSL2 and use `bwrap()`, with your repo on the Linux filesystem (ext4, for example `~/code/my-repo`), not under `/mnt/c`. Inside the sandbox, `/mnt`, `/run/WSL` and `WSL_INTEROP` are hidden, so the agent can't run a Windows `.exe`.

> **`seatbelt()` on macOS.** It needs macOS 14 or later and runs the system `/usr/bin/sandbox-exec`, so there's nothing to install. macOS refuses to nest Seatbelt sandboxes, so `seatbelt()` can't start inside another one

> **Agents' own sandboxes.** The native sandbox is the containment layer, and Sandcastle already runs agents with their permission checks skipped, so turn off the agent's own sandboxing.

### 云端提供方要点

- **`e2b()`**：Firecracker 微虚拟机；`npm install e2b`，需要 Node 22.19 或更新；`E2B_API_KEY` 放 shell 或 `apiKey` 选项，不放 `.sandcastle/.env`（那里的键会被转发进沙箱）；默认模板没有 agent CLI，预置 `claude`、`codex` 模板带；仓库进入 `$HOME/workspace`；`timeoutMs` 默认 30 分钟，免费 Hobby 档上限 1 小时；不支持 `interactive()`。
- **`sprites()`**：Fly.io Sprite，Linux 微虚拟机；`npm install @fly/sprites`，需要 Node 24；`SPRITES_TOKEN` 或 `SPRITE_TOKEN`；基础镜像已含 git、Node、`claude`；`close()` 删除实例，进程被 `SIGINT`/`SIGTERM` 中断时由后台进程删除；`sandboxId` 是 Sprite 名字；不支持 `interactive()`。
- **`modal()`**：安装 `modal` 包，`MODAL_TOKEN_ID`/`MODAL_TOKEN_SECRET` 或 `tokenId`/`tokenSecret`；默认镜像 `node:24-bookworm` 加 Claude Code，构建一次后缓存；以 root 运行，故 `sudo: true` 无差别，并设置 `IS_SANDBOX=1`；生命周期最长 `timeoutMs`，默认 1 小时（Modal 自身默认 5 分钟，上限 24 小时）；`sandboxId` 形如 `sb-…`。

### Containment（防什么、不防什么）

> What a sandbox protects you from depends on the provider. Native sandboxes are built for **accidents and prompt-injection attacks**: an agent that runs the wrong command, or follows instructions planted in an issue or a web page, can't read your credentials, write outside the repo, or touch your other processes.

> They don't protect against:
>
> - **Kernel escapes.** A native sandbox is a shared-kernel process sandbox. On Linux, `bwrap()` is about as strong as a runc container (Docker on Linux). On macOS, `seatbelt()` is weaker than Docker Desktop, which runs containers in a VM.
> - **Services on your host's localhost.** The network is open, and the sandbox can reach anything listening on `127.0.0.1`, such as a dev server or a local database.
> - **Process listing on macOS.** Seatbelt has no PID namespace. The agent can't signal your processes, and `ps`, `pgrep` and the process-list sysctl are blocked, but your processes aren't hidden the way they are in `bwrap()`'s own PID namespace. Paths outside the sandbox are visible as metadata: the agent can check that a path exists and read its size and timestamps, but not its contents.
> - **Detached processes on macOS.** `seatbelt()` kills each `exec`'s process group. A process that leaves that group, by calling `setsid` or `setpgid`, survives `close()` and your Node process being killed. It is still under the Seatbelt profile, so it can still write the worktree and reach the network, until it exits or you kill it.

### 自定义提供方与 handle 约定

两种类型：**Bind-mount**（沙箱能挂宿主目录，worktree 直接挂进去，无需同步）与 **Isolated**（沙箱有自己的文件系统，用 `copyIn` 与 `copyFileOut` 同步）。

| Method           | Required             | Description                                                                                 |
| ---------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `exec`           | Both                 | Run a command, optionally streaming stdout line-by-line via `options.onLine`                |
| `close`          | Both                 | Tear down the sandbox                                                                       |
| `copyFileIn`     | Bind-mount           | Copy a single file from the host into the sandbox                                            |
| `copyFileOut`    | Both                 | Copy a single file from the sandbox to the host                                              |
| `copyIn`         | Isolated             | Copy a file or directory from the host into the sandbox                                      |
| `worktreePath`   | Both                 | Absolute path to the repo directory inside the sandbox                                       |
| `sandboxHomedir` | Bind-mount, optional | The agent's home as commands inside the sandbox see it. Defaults to `/home/agent`            |
| `sandboxTmpdir`  | Bind-mount, optional | A writable temp dir as commands inside the sandbox see it. Defaults to `/tmp`                 |
| `sandboxId`      | Both, optional       | An id outside tools can address the sandbox by, such as a container name or a vendor id      |

```typescript
interface ExecResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}
```

> The Docker and Podman providers return `exitCode: 1` when their command process is terminated by a signal. Numeric exit codes are preserved, including `0` for success.

参考实现：`src/sandboxes/docker.ts`、`e2b.ts`、`vercel.ts`、`modal.ts`、`podman.ts`、`test-isolated.ts`。

## docs/guide/agent-providers.md

> Sandcastle ships agent providers for Claude Code, Codex, Pi, Copilot, Cursor and OpenCode: `claudeCode()`, `codex()`, `pi()`, `copilot()`, `cursor()` and `opencode()`, all exported from `@ai-hero/sandcastle`. Each takes a model string and, optionally, provider-specific options

### `ClaudeCodeOptions`

| Option            | Default | Description                                                                                                        |
| ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `effort`          | —       | `low` / `medium` / `high` / `xhigh` / `max`（`max` 仅 Opus）                                                          |
| `env`             | `{}`    | 该提供方注入的环境变量                                                                                              |
| `captureSessions` | `true`  | 捕获会话 JSONL 到宿主，供 `claude --resume`                                                                          |
| `permissionMode`  | —       | 映射 `--permission-mode`；设置后替换默认的 `--dangerously-skip-permissions`；`auto` 为逐工具 AI 审批                |

### `CodexOptions`

| Option              | Default | Description                                                                                       |
| ------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `effort`            | —       | 经 `model_reasoning_effort`                                                                          |
| `env`               | `{}`    | 同上                                                                                                 |
| `captureSessions`   | `true`  | 捕获 rollout JSONL                                                                                   |
| `approvalsReviewer` | —       | `user` 或 `auto_review`；后者把 `--dangerously-bypass-approvals-and-sandbox` 换成 `-a on-request -s danger-full-access` |

### `PiOptions`

```typescript
agent: pi("claude-sonnet-4-6", { thinking: "high" });
```

| Option            | Type                                                                     | Default | Description                       |
| ----------------- | ------------------------------------------------------------------------ | ------- | --------------------------------- |
| `thinking`        | `off` / `minimal` / `low` / `medium` / `high` / `xhigh`                  | —       | 经 `--thinking` 传递              |
| `env`             | `Record<string, string>`                                                 | `{}`    | 注入的环境变量                    |
| `captureSessions` | `boolean`                                                                | `true`  | 捕获 pi 会话 JSONL                |

> Without `thinking`, Sandcastle passes no `--thinking` flag, and pi uses its own default (`medium`). Some models reject that default. With pi 0.73.1, `anthropic/claude-haiku-5-5` fails with a 400

### 提供方 `env` 合并规则

> - Provider env (agent + sandbox) overrides `.sandcastle/.env` resolver output for shared keys
> - Agent provider env and sandbox provider env **must not overlap** — if they share any key, `run()` throws an error
> - When `env` is not provided, it defaults to `{}`

## src/AgentProvider.ts 的 pi 构造

```typescript
return {
  command: `pi -p --mode json --model ${shellEscape(model)}${thinkingFlag}${sessionFlag}`,
  stdin: prompt,
};
```

```typescript
/** Options for the pi agent provider. */
export interface PiOptions {
  /**
   * Reasoning effort level. Maps to the CLI's --thinking flag. When omitted,
   * no flag is passed and pi uses its own default (`medium`), which some
   * models reject
   */
  readonly thinking?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
```

会话解析注释：

> The first line of pi's --mode json stdout stream is a `session` header carrying the UUID; subsequent stream entries (model_change, thinking_level_change, message, ...) do not. Verified against `@mariozechner/pi-coding-agent` 0.73.1 and `@earendil-works/pi-coding-agent` 1.5.0.

错误处理注释：

> When the model call fails (e.g. an API 400), pi puts the error on the last assistant message and still exits 0.

## .changeset/modern-pi-package.md

> `sandcastle init` now installs the maintained `@earendil-works/pi-coding-agent` package for the Pi agent (in the scaffolded Dockerfile and the host install hint) instead of the deprecated `@mariozechner/pi-coding-agent`.

## 本机证据（2026-11-09）

- `command -v bwrap` 为 `/usr/bin/bwrap`，`bwrap --version` 输出 `bubblewrap 0.11.1`。
- `docker --version` 输出 `Docker version 29.4.1, build 055a478`；`docker info` 失败，守护进程未运行。
- `node -v` 为 `v24.22.2`，`npm -v` 为 `11.19.1`，`git --version` 为 `git version 2.53.0`。
- `pi --version` 输出 `1.5.0`，路径 `~/.bun/bin/pi` → `~/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js`。
- `omp --version` 输出 `omp/18.18.3`。
- `claude`、`codex`、`opencode`、`gh`、`bd` 均在 PATH 上。
- `/proc/sys/kernel/apparmor_restrict_unprivileged_userns` 不存在；`/etc/apparmor.d/bwrap` 不存在。
- 仓库目录 `stat -f -c %T` 报 `ext2/ext3` 家族，位于 Linux 文件系统，不在 `/mnt/c` 下。
- 早前实测：`unshare -Ur true` 成功；`unshare -Urm` 内可挂载 overlay。
- 未执行 `npm install`、`sandcastle init` 或任何 `run()`，未构建镜像。
- 未在 OMP 会话环境里实测 bwrap 启动。
