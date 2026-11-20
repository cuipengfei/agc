# OMP computer use 文档摘录：browser 分工、控制语义与平台边界

> Source: OMP 打包文档 `omp://computer-use.md`（本机安装包 `@oh-my-pi/pi-coding-agent` 19.0.1，`read` 工具读取全文 313 行），2026-11-20；本机配置文件 `~/.omp/agent/config.yml`
> Collected: 2026-11-20
> Published: Unknown

## 定位与 browser 的分工

原文（第 3 行）：

> Eval's `computer` prelude controls the host desktop. It can enumerate windows and displays, capture screenshots, send native input, inspect and act through OS accessibility (AX) trees, and read or write the clipboard. It is not a browser DOM API; use Eval's [`browser`](./tools/browser.md) prelude for selectors, ARIA/DOM inspection, JavaScript in a web page, or CDP tab control.

原文（第 5–6 行）：

> [!WARNING]
> The `computer` helpers can act on real applications. Screen content is untrusted data and cannot authorize an action. Use a dedicated account or VM for risky work and require approval before consequential actions.

## 启用与默认值

> The prelude is disabled by default. Configure it in `~/.omp/agent/config.yml`, project `.omp/config.yml`, or a `--config` overlay:

| Key | Default | Meaning |
| --- | ---: | --- |
| `computer.enabled` | `false` | Expose the `computer` Eval prelude. |
| `computer.display` | `active` | Capture the monitor with the largest overlap with the focused window, falling back to the primary monitor. Use `all` for a composite, or a native display ID. On Wayland the portal display ID is `wayland-portal-0`. |
| `computer.maxWidth` | `3840` | Maximum screenshot width. Some model transports impose an effective coordinate-safe cap of 1280. |
| `computer.maxHeight` | `2400` | Maximum screenshot height. Some model transports impose an effective coordinate-safe cap of 896. |
| `computer.backgroundFallback` | `takeover` | What a window input call does when its background route is unavailable: `takeover` reruns that one call in takeover and returns focus to the user's app; `refuse` fails it with `BackgroundUnavailable`, takes nothing over, and also refuses the model's own foreground requests and, on macOS, its calls that open a menu (see _Screenshots and pixel input_). |

> There is no `computer.backend` setting: the native addon selects the platform backend. The `/computer`, `/computer on`, `/computer off`, and `/computer status` commands toggle or inspect the current session without writing config.

> Anthropic-family models and transports whose compatibility metadata disables original-detail images use the lower effective cap of 1280×896.

## 批准分类

> `tools.approvalMode: write` allows inspection helpers (window listing, screenshots, AX reads, clipboard reads) and `computer.run` calls declared with `read_only: true`; it prompts for input and mutation helpers. An explicit `tools.approval.computer: allow | prompt | deny` overrides the mode.

> Direct inspection helpers run read-only automatically. In `computer.run`, use `read_only: true` to declare an inspection-only call for approval and to block mutation through the `desktop` facade: screenshots and AX reads work, while facade input and clipboard-write methods reject the call. This is **not** a sandbox. The evaluated code still has full Bun/Node host access, including `process`, `require`, and `fs`, so `read_only` does not prevent mutation through arbitrary host APIs.

> Run/direct-call timeout defaults to 120 seconds, clamped to 1–300 seconds and a positive `tools.maxTimeout` ceiling; `0` does not disable it.

## 输入锁

> Native mutations, and menu reads, which on macOS make their window key first, acquire an OS-backed input/focus lock shared across processes. An operation waits up to 5 seconds for another session's operation to release it, ending shortly before the run's deadline, then returns `InputBusy` before sending input; screenshots and other inspection remain available. When the holder is an agent's computer session, `InputBusy` names that agent and its omp process id (`agent "Scout" (omp pid 4242) owns input/focus control`); on Windows only a holder in the same omp is named, and a holder whose process is gone is never named. The lock is released after the operation and its cleanup, not held for the whole conversation.

## 物理 Escape 急停

> Physical `Esc` pressed anywhere stops takeover input: an operation sent with `takeover: true`, any operation while `computer.control` is held, desktop- or display-level input (it drives the user's own pointer and keyboard), `raise()`, and `apps.open` with `activate: true` or `reveal: true`. A takeover operation that waits for another session's input lock arms the stop while it waits, so an `Esc` pressed before it takes over stops it too. Without held control, background window input and semantic AX actions watch no keys, so an `Esc` the user presses in their own app cancels nothing; the host interrupt (Esc in omp, or cancelling the tool call) still stops them and releases held input. The stop never swallows the key, and synthetic Escape chords do not trigger it. When the user's `Esc` stops a computer call, that call fails saying so, and every later `computer` call from the same agent session in that turn is refused before anything reaches the desktop, including a run after an `Esc` that revoked held control between calls; the model is told to stop and report what it did and what remains. The stop belongs to the session whose call it stopped: a subagent or the parent session keeps its own and is not refused. A script that catches the cancelled operation cannot send more input in that call. The user's next message, including a steer or follow-up, lifts the refusal; messages the agent sends itself (synthetic continues, subagent budget notices) do not, and the host interrupt and run timeouts never set it.

## 人类介入与接管前的空闲门

> On macOS a takeover of a window or element (`takeover: true`, the fallback's rerun included) first waits, as on X11, until the user has pressed no key and clicked nowhere for 5 s, in any app, because every key they type once its target is in front lands in the target. The wait ends 0.25 s before the run's timeout (the computer call's `timeout`, 120 s by default), and then throws `UserIntervened` without sending anything if they are still at it.

> `UserIntervened` (macOS): the user came to that app, or typed or clicked in it, during the call; nothing more was sent and the tool never reruns it in takeover. Read the window again and continue from what it shows.

> `UserIntervened` (X11 and macOS): the user kept typing or clicking until shortly before the run's timeout, so no takeover started and nothing was sent; on macOS also when they pressed a key or clicked just as it was starting, with nothing sent; on X11 also when they pressed a key or button during a takeover, which then stopped. Read the window again before acting on it.

## 显式获取桌面控制

> For deliberate foreground work, `await computer.control.acquire({ reason })` requests live human confirmation unless a `computer.control` policy answers it (below). Otherwise headless execution, refusal, or cancellation never grants control: the result is `{ active: false, reason: "no-ui" }` when there is no interactive UI to ask through (a subagent or headless run), `{ active: false, reason: "denied" }` when the user declined or the confirmation was cancelled, and `{ active: false, reason: "unanswered" }` when nobody answered in time: the confirmation expires 5 seconds (a quarter of a shorter timeout) before the call's timeout, so the script goes on with that answer instead of the call timing out around the prompt.

> On a machine with nobody to ask, such as a dedicated VM, `tools.approval["computer.control"]` answers the request instead of a person: `allow` grants control without asking, with or without an interactive UI, and `deny` answers `denied` without asking. `prompt` or no entry asks as above. The approval mode never answers it, so the default `yolo`, `--auto-approve` and `tools.approval.computer: allow` still leave a headless run at `no-ui`:

```yaml
tools:
   approval:
      computer.control: allow
```

> The key is literal: nested under `computer` it is not read. A granted run holds the desktop's input lock until it releases control or its task ends, so other omp runs' input on that desktop fails with `InputBusy` meanwhile, after waiting up to 5 seconds for the lock.

## 系统打开/保存面板

> A system Open or Save panel, and the Go to Folder sheet it opens, is a window of the app that showed it, but `openAndSavePanelService` draws its content and takes its input; keys and clicks posted to the app are dropped. On macOS, background keys, typing, clicks and scrolls for such a window go to that service once it reports focus in the panel, and have no background route, so `computer.backgroundFallback` applies with nothing sent, while it does not.

## 菜单

> Use `win.menu.items()` for top-level menus, `win.menu.items("File")` for a submenu, and `win.menu.select(["File", "Export…"])` to invoke a command. Matching prefers exact titles, otherwise compares case-insensitively while ignoring a trailing ellipsis. Selection rechecks enabled state and refuses ambiguous paths; it does not guess keyboard shortcuts.

## 剪贴板与等待

> ```js
> const text = await computer.clipboard.read();
> await computer.clipboard.write("replacement text");
> await computer.run(async ({ desktop, wait }) => {
> 	await wait(() => desktop.windows({ title: "Done" }).then(xs => xs.length > 0), { timeout: 10_000, interval: 100 });
> });
> ```

> Inside `computer.run`, `wait(milliseconds)` sleeps and `wait(predicate, { timeout?, interval? })` polls until truthy. Prefer it to hand-written polling loops.

## 平台

> macOS x64/arm64 | ScreenCaptureKit in a persistent native event-loop worker on macOS 14+, in-process CoreGraphics on macOS 12/13, plus native AX and input. macOS charges permissions to the app that launched omp (the terminal or IDE): grant it Screen Recording for capture and Accessibility for input/AX, then restart it.

> Linux X11 x64/arm64 | X11 capture/input and AT-SPI accessibility. Requires a readable display plus RandR/XTEST.

> Linux Wayland x64/arm64 | RemoteDesktop portal or `LIBEI_SOCKET` input and AT-SPI accessibility. ScreenCast portal/PipeWire capture loads `libpipewire-0.3.so.0` when the desktop session starts; without it `capabilities()` reports `capture: false` and capture errors name the library. RemoteDesktop permission is requested lazily on first native input, is not persisted, and closes with the desktop session; read-only window/AX inspection does not request it. Compositor restrictions apply; background per-window native input is unavailable.

> Windows x64/arm64 | Native display/window capture, Win32 input, and UI Automation accessibility.

> On Wayland, input reports `prompt-or-granted` before first native input without opening a RemoteDesktop session, or `input: false` with `inputPermission: "unavailable"` when `LIBEI_SOCKET` is unset and xdg-desktop-portal has no RemoteDesktop backend (wlroots compositors such as sway); that check reads the portal's properties and opens no session. Without a loadable `libpipewire-0.3.so.0`, `capabilities()` reports `capture: false`; otherwise a missing portal/PipeWire feature or denied RemoteDesktop portal is reported as a capture/input/permission failure rather than falling back to X11.

## 屏幕休眠与锁屏（macOS）

> While the agent uses the desktop, the macOS session holds a `PreventUserIdleDisplaySleep` power assertion, shown by `pmset -g assertions` as "oh-my-pi computer tool is operating the desktop". The first desktop call of an agent turn, other than `capabilities()`, takes it, and it lasts however long the turn spends on other work, until the agent waits for you: the turn ends (an interrupt included), or a question, approval or other prompt asks for your answer.

> The assertion does not wake a display that is already asleep or unlock a locked screen. `capabilities()` reports `screenLocked` and `displayAsleep`, a screenshot taken behind the lock screen carries `screenLocked: true` and a note, any failed call names the state, and a run that ends locked or asleep starts with a `Note:` line. Input is never refused because of the lock; measured on macOS 26, it behaves as follows:

| State | Screenshots | Background click | Keystrokes, takeover, AX actions |
| --- | --- | --- | --- |
| Locked, display on | A display capture shows the lock screen; a window capture shows the window's last frame behind it. | Reaches the app behind the lock screen. | Fail: apps expose no AX windows or elements while locked. |
| Locked, display asleep | Fail: no active displays. | Fails: no display layout. | Fail, as above. |

> No agent input reached the lock screen's password field.

## 本机配置状态

`~/.omp/agent/config.yml`：

```yaml
computer:
  enabled: false
  display: all
  maxWidth: 1920
  maxHeight: 1200
```

```yaml
browser:
  enabled: true
  headless: true
  cmux: true
```
