# TUIOS Tape：CLI 帮助与项目 tape 文档

> Source: 本机 `tuios 0.12.0 tape --help`；Gaurav-Gosain/tuios `docs/PROJECT_TAPES.md`
> Collected: 2026-10-31
> Published: Unknown

## `tuios tape --help`（verbatim）

```
  Manage and execute .tape automation scripts for TUIOS

  Tape files allow you to automate interactions with TUIOS by specifying
  sequences of commands, key presses, and delays. Execute scripts in
  interactive mode (visible TUI) to watch automation happen in real-time.

  USAGE

    tuios tape [command] [--flags]

  EXAMPLES

    # Run tape with visible TUI (watch it happen)
    tuios tape play demo.tape

    # Validate tape file syntax
    tuios tape validate demo.tape

  COMMANDS

    delete <name>               Delete a tape recording
    dir                         Show the tape recordings directory path
    exec <file.tape> [--flags]  Execute a tape file in a running session
    list [--flags]              List all saved tape recordings
    play <file.tape> [--flags]  Run a tape file in interactive mode
    show <name>                 Display the contents of a tape file
    validate <file.tape>        Validate a tape file without running it

  FLAGS

    --cpuprofile                Write CPU profile to file
    --debug                     Enable debug logging
    -h --help                   Help for tape
    --pprof                     Serve /debug/pprof profiles on this address, for example :6060. With no host, it listens on 127.0.0.1 only. The profiles have no password
    --server                    Use the daemon named NAME. It has its own socket and saved sessions
```

## `docs/PROJECT_TAPES.md` 摘录（逐字）

> A project tape is a `.tuios.tape` file in a project directory. When the focused
> shell inside TUIOS enters a directory that carries one, TUIOS can build a project
> session and layout from it, the same way a `.envrc` file works for direnv.
>
> Because a tape is arbitrary command execution (`Type "curl x | sh" Enter` is a
> legal tape), the feature is built around a trust boundary: **an untrusted tape is
> inert.** TUIOS only stats it, reads it once, hashes it, and shows it to you.
> Nothing runs until you review the content and choose to run or trust it.

### 信任模型

> Trust is granted per **(canonical path, content hash)** pair, using direnv's
> model:
>
> - The path is the `realpath` of the tape; the hash is SHA-256 of its exact bytes.
> - **Any edit to the file changes the hash and silently reverts it to untrusted.**
>   A `git pull` that changes a trusted tape shows up as an untrusted, "changed
>   since you trusted it" encounter, never a silent run.
> - Approval and execution use the **same in-memory bytes**. TUIOS reads the file
>   once, hashes that buffer, shows that buffer, and runs that buffer. The file on
>   disk is never re-read between review and execution, so swapping the file (or a
>   symlink target) after you approve changes nothing about what runs.
>
> Trust decisions live in `$XDG_DATA_HOME/tuios/tape-trust.toml` (mode 0600). It is
> per-machine state and does not travel with dotfile syncing.

### 不具备资格的 tape

> Before a tape is even offered for trust it must pass hygiene checks, like
> `sshd` applies to `authorized_keys`:
>
> - a regular file (after symlink resolution), owned by you, not group- or
>   world-writable;
> - no world-writable directory (without the sticky bit) on the path to it;
> - at most 64 KiB.
>
> A tape that fails is **ineligible**: the dialog shows why and offers only
> *Dismiss*. There is no override.

### 被拒绝的 tape

> **Never** records a deny entry keyed by **path only** (no hash), so editing the
> file cannot nag you back into a prompt. A denied path produces no banner, no
> badge, and no dialog until you clear it.

### 审查对话框

> The dialog is only ever opened deliberately: by `Ctrl+B` `T` `t`, the command
> palette, or (in `auto` mode, for a still-untrusted tape) the passive path. It
> never steals focus because you typed `cd`. It shows:
>
> - the tape's canonical path and trust status (including "changed since you
>   trusted it" when a trusted tape was edited);
> - a one-line summary of what running it does (e.g. `session "myproject"`), from a
>   cheap header parse that executes nothing;
> - the **full tape content**, scrollable with `↑`/`↓`. This is the security
>   boundary: you approve what you can see.

### `autorun` 三种模式

> - **`off`**: no scanning, no indicators, feature invisible.
> - **`ask`** (default): detection on; every encounter surfaces the passive banner
>   and badge. Nothing runs without you opening the dialog and choosing Run.
> - **`auto`**: a trusted, unedited tape runs automatically on entry. An untrusted
>   or changed tape behaves exactly as in `ask`: banner, badge, dialog, never an
>   autorun. There is no mode in which unreviewed content executes.
>
> The environment variable `TUIOS_TAPE_AUTORUN` overrides the config for one run
> (`TUIOS_TAPE_AUTORUN=off tuios ...`), useful for CI or poking at hostile code.

### `auto_review` 行为矩阵

> | Mode | Tape | `auto_review = false` (default) | `auto_review = true` |
> |------|------|--------------------------------|----------------------|
> | `off` | any | nothing | nothing |
> | `ask` | untrusted / trusted / changed | passive banner + badge | dialog opens automatically |
> | `auto` | trusted, unedited | runs automatically (no dialog) | runs automatically (no dialog) |
> | `auto` | untrusted / changed | passive banner + badge | dialog opens automatically |
> | any | **denied** | nothing | nothing (deny is respected) |
> | any | **ineligible** | passive notice | passive notice (no dismiss-only popup) |

### `show_status`

> While a tape plays, tuios shows a RUNNING pill with the progress, and
> `tuios tape exec` shows the message "Remote: running a tape". Set
> `show_status = false` to hide both. Use it when you record the screen with a
> tape, so the recording shows the app and not the player. A tape that fails
> still shows its error.

### tape 头部指令

> | Directive | Meaning | Default |
> |-----------|---------|---------|
> | `Session "name"` | Target session name | project directory basename |
> | `Scope session\|current` | Where the tape runs | `session` |
> | `Workspace N` | Workspace to build in | none |
> | `Require "command"` | Skip with a notice if a binary is missing | - |

### tape 正文指令

> | Command | Effect |
> |---------|--------|
> | `Type "text" [Enter]` | Type text into the focused pane; optional `Enter` submits it |
> | `Run "cmd"` | Shorthand for `Type "cmd" Enter` |
> | `Enter` | Submit a line in the focused pane |
> | `Split vertical\|horizontal\|left\|right\|up\|down` | Split the focused pane into a new tiled pane (`v`/`h` accepted). A side names where the new pane goes |
> | `NewWindow ["name"]` | Create a new tiled pane |
> | `RenameWindow "name"` | Name the focused pane (`Rename` is an alias) |
> | `Focus "name"` | Focus a pane by name |
> | `Sleep <duration>` | Pause (e.g. `500ms`, `1s`) |
> | `EnableTiling` / `DisableTiling` | Toggle tiling |

### Scope 语义

> **If a session with that name already exists, it switches to it and does not
> rebuild.** The session is the durable artifact; the tape is its constructor,
> run once. Re-entering the project never duplicates panes.
>
> Session scope requires a daemon-backed session (`tuios new ...`). Outside one,
> TUIOS falls back to running the tape in the current session and says so.
>
> `Scope current` applies the tape to the current session, starting from the
> focused window. It composes with whatever state exists, so it is honest
> best-effort, good for tiny tapes ("split once, run `make watch`").

### 安全属性

> - Only a trusted, unedited tape ever runs without a keypress (`auto` mode).
> - Run once and Trust and run act on content you reviewed in the dialog.
> - Execution uses the exact bytes hashed at review time, never a fresh read.
> - A denied path never prompts or runs.
> - A tape edited since it was trusted reverts to untrusted and re-prompts; it does
>   not silently run the old trusted version.
> - Detection is suppressed entirely while a tape is running, and a project root
>   handled this run does not re-trigger, so a tape that `cd`s onward cannot chain
>   another run.
> - Remote (SSH) shells are ignored: TUIOS cannot read or verify a remote file, so
>   it neither prompts nor runs.
