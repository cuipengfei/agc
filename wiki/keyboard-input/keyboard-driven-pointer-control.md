# Keyboard-Driven Pointer Control

> Sources: Karabiner-Elements official documentation; mousemaster, kanata, Capslock GitHub repositories; Windows Accessibility documentation; multi-source web research (2026-09-03)
> Raw: [keyboard-driven-pointer-control](../../raw/keyboard-input/2026-09-03-keyboard-driven-pointer-control.md)
> Updated: 2026-09-03

## Overview

Three distinct mechanisms solve the "hands stay on keyboard" need, and conflating them produces bad tool choices. Tab switching and window switching are **key remapping** (path b), not mouse simulation. True pointer simulation (path a) is only needed for UI elements that lack keyboard shortcuts. Hint/grid targeting (path c) bridges the gap by letting you jump to any clickable element. Most daily workflows need all three.

## Three Mechanism Paths

| Path | What it does | Solves | Does NOT solve |
|---|---|---|---|
| **a. True pointer simulation** | Keypress synthesizes real cursor movement, clicks, drags, scrolls | Any mouse action at any screen position | Nothing; this is the catch-all |
| **b. Key remapping** | Maps keys to existing shortcuts (`Ctrl+Tab`, `Alt+Tab`) | Tab switch, window switch, copy/paste, media | UI elements with no keyboard shortcut |
| **c. Hint/grid targeting** | Overlay labels UI elements or subdivides screen; typing warps cursor | One-step jump to any clickable target | Elements the accessibility tree cannot see |

**The common mistake**: describing tab/window switching as "mouse simulation." It is not. Path (b) is far lighter, more reliable, and works in every tool.

## Tool Matrix

| | Karabiner-Elements | mousemaster | kanata | Mouse Keys (built-in) |
|---|---|---|---|---|
| **Platform** | macOS only | Windows, macOS | Windows, macOS, Linux | Windows |
| **Path coverage** | a + b | **a + b + c** | a + b | a only |
| Pointer move (variable speed) | Yes | Yes (7 easing curves) | Yes (linear accel) | Yes (single slider) |
| Left click + double + drag | Yes | Yes | Yes | Yes |
| Middle click | Yes | Yes | Yes | **No** |
| Right click | Yes | Yes | Yes | Yes |
| Vertical scroll | Yes | Yes | Yes | **No** |
| Horizontal scroll | Yes | Yes | Yes | **No** |
| Multi-monitor jump | Yes (`set_mouse_cursor_position`) | Yes (`c` + history) | Yes (`setmouse`) | Natural cross, no shortcut |
| **Hint/grid mode** | **No** | **Yes** (4 modes) | **No** | **No** |
| License | — | **none** | LGPL-3.0 | — |
| Status | — | Active | Active | Built-in |

> **Scope note on Karabiner**: Its DriverKit-based virtual HID device architecture was not matched by any Windows candidate in the surveyed set. This is a **range-limited negative finding**, not proof that no such tool exists.


## Capslock

A Hyper-key design that layers control planes on CapsLock. The macOS side (`mac_v3/capslock.yml`) is a capable Karabiner configuration: 7/8 mouse actions, 4 speed tiers, 11 planes. The Windows side (`win/CapsLock.ahk`) is a separate, much weaker implementation: 3/8 mouse actions, fixed 10px movement, no acceleration, no scroll, no middle button. Do not expect to replicate the macOS experience on Windows.

## Two Traps

### Trap 1: Chromium and Electron apps break hint mode

Browsers and VS Code do not expose their internal UI structure to Windows accessibility APIs by default. Hint tools fall back to blind screen grids, which work everywhere but require more keystrokes. Tools with computer-vision fallback (e.g., neverclick) bypass this entirely but are closed-source. If you rely heavily on browsers, verify whether your chosen tool's fallback is usable before committing.

### Trap 2: Stars are not capability

PowerToys has 138k stars but its Keyboard Manager cannot map keys to mouse actions. komorebi/GlazeWM have 15k/12k stars but do not touch the pointer. The relevant tools are an order of magnitude smaller. Judge by whether the tool covers paths (a), (b), and (c) together, not by popularity.

## Switching Cost

Switching tools resets muscle memory. The observation that mousemaster ships preset configs mimicking warpd, mouseable, and neru suggests authors recognize this as a real barrier. Starting from a preset that matches keys you already know is lower-cost than building from scratch. Expect an adaptation period; the keyboard-to-pointer workflow is cognitively different from direct hand-eye pointing.

## See Also

- [Karabiner-Elements documentation](https://karabiner-elements.pqrs.org/docs/) (official)
- [mousemaster repository](https://github.com/petoncle/mousemaster)
- [kanata repository](https://github.com/jtroo/kanata)
- [Capslock repository](https://github.com/Vonng/Capslock)
