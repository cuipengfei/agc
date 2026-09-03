# Keyboard-Driven Pointer Control: Source Evidence

> Source: Multi-source web research, GitHub API, and official documentation
> Collected: 2026-09-03
> Published: Unknown

---

## A. Core Facts: Five Relevant Schemes

### Karabiner-Elements (macOS reference)

- Platform: macOS only. Architecture: grabs physical keyboard hardware via root-privileged daemon, modifies events, forwards through a virtual HID device registered at DriverKit layer. Applications cannot distinguish virtual from physical input.
- Four processes across three privilege levels: root (Karabiner-Core-Service daemon, Karabiner-VirtualHIDDevice-Daemon), DriverKit (Karabiner-DriverKit-VirtualHIDDevice), logged-in user (Karabiner-Console-User-Server, Karabiner-Core-Service agent). The agent handles Accessibility/Input Monitoring permission requests; the Console-User-Server executes shell commands, to keep privileges separated.
- Event pipeline (6 steps): hardware capture → Simple Modifications → Complex Modifications → Function Keys Modifications → system Settings modifier keys → virtual keyboard delivery.
- Mouse action units in `complex_modifications` JSON:
  - `mouse_key`: `x`, `y`, `vertical_wheel`, `horizontal_wheel`, `speed_multiplier`
  - `pointing_button`: `button1` through `button5` (left, right, middle, back, forward)
  - `software_function.set_mouse_cursor_position`: `x`/`y` support percentages, `screen` for monitor index
- Double-click: official doc says `cg_event_double_click` lags because it is software-sent; recommends sending `pointing_button::button1` twice instead.
- Limitations: cannot modify eject key on some keyboards (macOS API limitation); cannot modify fn key on non-Apple keyboards (hardware limitation, these keyboards handle fn internally without sending key events).
- Sources: https://karabiner-elements.pqrs.org/docs/help/advanced-topics/security/ ; https://karabiner-elements.pqrs.org/docs/manual/misc/event-modification-chaining/ ; https://karabiner-elements.pqrs.org/docs/json/complex-modifications-manipulator-definition/to/mouse-key/ ; https://karabiner-elements.pqrs.org/docs/json/complex-modifications-manipulator-definition/to/software_function/set_mouse_cursor_position/ ; https://karabiner-elements.pqrs.org/docs/json/complex-modifications-manipulator-definition/to/software_function/cg_event_double_click/ ; https://karabiner-elements.pqrs.org/docs/getting-started/features/

### mousemaster (Windows, recommended)

- 870 stars, Java, no LICENSE file, active (93@2026-08-22, last commit 2026-09-01).
- Single-file `.properties` configuration, 6 presets shipped: `neo-mousekeys-ijkl` (recommended), `neo-mousekeys-wasd`, `mouseable`, `neru`, `warpd`, `author` (64KB). Auto-reload on save.
- Supports all 8 mouse actions: pointer movement (with 7 easing curves: linear, quadratic, sqrt, smoothstep, smootherstep, logarithmic, exponential), left/middle/right/back/forward buttons, vertical/horizontal scroll, multi-monitor selection (`c` key + position history). Drag by holding the key.
- Three mechanism paths: true pointer simulation + key remapping + hint/grid/Zoom/RecursiveGrid/UIA-hint modes.
- Installation: portable exe + config file in same directory. README says "run it as administrator if you want the mousemaster overlay to be displayed on top of everything else" — this is about overlay z-order, not about sending input to elevated windows.
- Sources: https://github.com/petoncle/mousemaster ; https://github.com/petoncle/mousemaster/blob/main/docs/configuration-reference.md

### kanata (Windows/macOS/Linux, alternative)

- 7826 stars, Rust, LGPL-3.0, active (v1.12.0@2026-07-05, last commit 2026-09-01).
- Keyboard remapper with mouse output. Config in `.kbd` files. Minimal example exists but you must write your own keyboard layout.
- Mouse actions supported: `movemouse-up/down/left/right`, `movemouse-accel-*` (linear acceleration), `mwheel-up/down/left/right`, `mlft`/`mmid`/`mrgt`/`mfwd`/`mbck` (hold = keep pressed, so drag works), `setmouse` (absolute position), `movemouse-speed`.
- No hint/grid mode. If you need path (c), you must pair with a separate tool.
- Sources: https://github.com/jtroo/kanata ; https://github.com/jtroo/kanata/blob/main/docs/config.adoc

### Windows Mouse Keys (built-in, zero-install baseline)

- Path: Settings > Accessibility > Interaction > Mouse > Mouse keys (Win11); Settings > Ease of Access > Mouse > Mouse keys (Win10). Toggle: Left Alt + Left Shift + Num Lock.
- Numpad 8-direction movement. `/` = left button, `-` = right button, `*` = both, `5` = click, `+` = double-click, `0` = hold (drag), `.` = release.
- Speed/acceleration: single linear slider. No scroll (vertical or horizontal). No middle button. Cursor crosses monitor boundaries naturally, no jump-to-screen shortcut.
- Requires numeric keypad. Compact laptops need external numpad or on-screen keyboard.
- Source: https://support.microsoft.com/en-us/accessibility/windows/use-mouse-keys-to-move-the-mouse-pointer

### Capslock (Vonng/Capslock)

- 1568 stars, Apache-2.0, last push 2026-08-01, release v3@2021-03-09 (release lags behind code).
- Two-platform, two implementations:
  - macOS (`mac_v3/capslock.yml`, 1835 lines, v3.1.0): Karabiner complex_modifications. Builds with `make` (needs `yq` v4) → `capslock.json` → `~/.config/karabiner/assets/complex_modifications/`. Hyper = right command + right option + right control + right shift (simultaneous). 11 control planes layered on top. `mouse_key` appears 106 times, `pointing_button` 19 times, `horizontal_wheel` 37 times. Speed values hardcoded: 800 / 1600 / 3200 / 4200 for movement, 23 / 32 / 45 / 64 / 91 / 128 / 256 for scroll. No `speed_multiplier`, no `conditions`, no `frontmost_application` — behavior is uniform across apps.
  - Windows (`win/CapsLock.ahk`, 405 lines, AHK v1 syntax, 56 hotkeys): mouse-related code is 9 lines only. Fixed 10px movement, 4 directions, no acceleration, no scroll, no middle button, no right-click (uses `AppsKey` keyboard key instead). Drag works via `KeyWait Enter` (hold Enter = hold LButton, release = release).
- macOS score: 7/8 (no absolute cursor positioning). Windows score: 3/8.
- Source: https://github.com/Vonng/Capslock

---

## B. Key Quotes (mechanism, not marketing)

- neverclick UIAccess: "installs to Program Files because Windows requires that for it to register as an accessibility tool. This is what lets it perform mouse actions on apps running as administrator." (Note: this is the only candidate in the surveyed set whose README explicitly documents this mechanism.)
- mousemaster admin note: "run it as administrator if you want the mousemaster overlay to be displayed on top of everything else" — explicitly about overlay visibility, not input privilege.
- AHK v2 MouseMove: "Speed: 0 (fastest) to 100 (slowest). Speed is ignored in SendInput and SendPlay modes." Default SendMode in AHK v2 is `Input`, so `MouseMove` defaults to instant teleport, not smooth motion.
- kmonad mouse support: issue #150 opened 2020-12-08, still open. Additional issues #630 and #783 report mouse click/move crashes.
- Chromium accessibility: default does not expose accessibility tree. VS Code via UIA shows only 3 titlebar elements. Workarounds: `--force-renderer-accessibility` flag, or apps calling `setAccessibilitySupportEnabled(true)`, or external tools sending `WM_GETOBJECT`.
- keynavish platform: README states support for Windows 8.1 and 10 only; Windows 11 compatibility not claimed.

---

## C. Evidence Boundaries

| Category | Count | What it means |
|---|---|---|
| Firsthand read (official doc or source code) | ~18 sources | Content was opened and relevant text read |
| Document claim (not tested) | All mouse action capabilities | Stated in docs, not verified by running the tool |
| Not tested | Actual feel, hint hit rate, acceleration curves | No tools were installed or run on this machine |
| Inferred (not stated by source) | Capslock author motive for hardcoded speeds | Derived from YAML values, not author statement |
| Unreachable URL | autohotkey.com docs (403) | Content was read via fetch-and-index, but direct GET from this network returns 403 |
| Coverage gap | Reddit, Hacker News, AHK forums | Network-level blocking prevented community-source search |
