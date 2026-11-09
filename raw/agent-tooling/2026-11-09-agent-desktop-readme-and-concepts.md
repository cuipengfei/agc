# agent-desktop 的命令面、引用作用域与投递策略摘录

> Source: https://github.com/vercel-labs/agent-desktop，commit b43ac4f；README.md、CONCEPTS.md、Cargo.toml、crates/core/src/commands/mouse_click.rs、crates/core/src/commands/batch.rs、src/cli/mod.rs
> Collected: 2026-11-09
> Published: Unknown

## README.md

> agent-desktop gives an AI agent computer use without screenshots or pixel matching. It reads the accessibility tree of a desktop app and returns it as JSON, with a ref for every element the agent can act on. The agent clicks or types on a ref, reads the UI again to check the result, and repeats. The loop lives in your agent; agent-desktop has no model inside. It ships as a CLI and a C library.

> `agent-desktop mcp` serves every command as an MCP tool over stdio. A tool is named after its command (`desktop_snapshot`, `desktop_click`, `desktop_session_start`), takes that command's arguments, and returns its JSON envelope.

> agent-desktop has 60 command names, 56 operational commands. The other four (`key-down`, `key-up`, `mouse-down`, `mouse-up`) refuse to run until a daemon can release a held key or button.

命令分组原文：

| Group | Commands |
|---|---|
| Observe | `snapshot`, `find`, `get`, `is`, `screenshot`, `list-surfaces` |
| Act on a ref | `click`, `double-click`, `triple-click`, `right-click`, `type`, `set-value`, `clear`, `focus`, `select`, `toggle`, `check`, `uncheck`, `expand`, `collapse`, `scroll`, `scroll-to` |
| Keyboard and mouse | `press`, `hover`, `drag`, `mouse-move`, `mouse-click`, `mouse-wheel`, `key-down`, `key-up`, `mouse-down`, `mouse-up` |
| Apps and windows | `launch`, `close-app`, `list-apps`, `list-windows`, `list-displays`, `focus-window`, `resize-window`, `move-window`, `minimize`, `maximize`, `restore`, `open-system-surface` |
| Notifications | `list-notifications`, `dismiss-notification`, `dismiss-all-notifications`, `notification-action` |
| Clipboard | `clipboard-get`, `clipboard-set`, `clipboard-clear` |
| Wait | `wait` |
| Sessions | `session`, `trace`, `cursor-overlay` |
| System | `status`, `permissions`, `version`, `batch`, `skills` |

平台支持原文：

| Platform | Requirement | Accessibility API |
|---|---|---|
| macOS | macOS 13 or later, Intel or Apple Silicon | AX API |
| Windows | Windows 10 1809 or later, x64 or ARM64 | UI Automation |
| Linux | Ubuntu 24.04 or later, x86_64 or aarch64, X11 or Wayland | AT-SPI |

## CONCEPTS.md

### Snapshot ID（第 18-19 行）

> A compact identifier for one persisted snapshot. Lookup is confined to the selected session namespace, so an ID created in a session is not a cross-session handle.

### RefMap（第 97-98 行）

> The persisted mapping from refs to the identity evidence needed to re-identify elements later.

### Session（第 161 行）

> Use sessions when callers want a coordinated snapshot namespace and trace sink. Every lookup is confined to its selected namespace, so a snapshot created under a session requires that same `--session` or `AGENT_DESKTOP_SESSION` scope later.

### 多 agent（第 233 行）

> Each cursor reuses the same rendering and fade behavior; snapshots remain shared by session.

### Auto-Wait（第 185-188 行）

> The default-on bounded poll that holds a ref action until its target becomes actionable, then fails with `TIMEOUT` if the budget expires.
>
> The bound is 5000ms (`type` adds 30ms per character of its text); `--timeout-ms 0` restores single-shot act-immediately behavior. Transient checks (visibility, stability, enabled, occlusion) are polled; terminal checks (supported action, policy, editability) fail fast without waiting out the budget.

### Interaction Lease（第 215-218 行）

> Machine-wide exclusivity over desktop input, held by one process at a time so concurrent callers cannot interleave synthetic input into each other's actions.
>
> The lease covers dispatch only, never the waiting that precedes it: waiting for an element to become actionable can run long, and holding exclusivity across it would serialize every caller on the machine.

### Interaction Policy（第 225-228 行）

> The CLI exposes two: **headless** (the default; accessibility-only, no cursor, fails closed when the semantic path is unavailable) and **headed** (opt-in via the global `--headed` flag; authorizes the action's declared focus and cursor preconditions).

### Headless Ref Action（第 235-238 行）

> A ref-based action that uses semantic accessibility operations without implicit focus stealing, cursor movement, synthetic keyboard input, or pasteboard use. This is the default mode.
>
> Headless ref actions may still fail when the native accessibility API cannot perform the requested semantic operation; they fail closed with structured actionability or policy errors rather than silently substituting physical input. The broader **headed** policy must be selected explicitly with `--headed`.

### Coordinate Fallback（第 251-256 行）

> An explicit opt-in path that uses screen coordinates or physical input when semantic accessibility operations cannot perform the requested action.
>
> Raw `--xy` input carries no window identity: it moves or clicks at the requested coordinates and focuses no application.

### Physical Synthesis（第 273-276 行）

> The low-level OS input primitive behind headed commands: `SendInput` on Windows, `CGEvent` on macOS, XTest on X11 and the Mutter RemoteDesktop session on Wayland.

### Secure Field（第 210-213 行）

> An element whose content must never appear in observation or action surfaces once the platform marks it secret (`IsPassword` on Windows; the AT-SPI password role on Linux; equivalent password/secure-text roles on macOS).
>
> The contract spans both sides: the **read side** withholds value and related text evidence and resolves by content-free fingerprint; the **action side** may write into the field but never echoes the attempted or observed value in steps, messages, `details`, `platform_detail`, or post-state, and reports `verified: None` when a re-read cannot confirm without leaking (A19-3).

## 源码

`crates/core/src/commands/mouse_click.rs:24-26`：

```rust
    require_cursor_policy(context, "mouse-click")?;
    require_pointer_capability(adapter)?;
```

`src/cli/mod.rs:159`：

```rust
    #[command(about = "Execute a bounded, sequential, non-atomic JSON command batch")]
```

`crates/core/src/commands/batch.rs:5-12`：

```rust
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BatchCommand {
    pub command: String,
    pub session: Option<String>,
    #[serde(default)]
    pub args: Value,
}
```

`Cargo.toml:10`：

```toml
version        = "1.2.0"
```
