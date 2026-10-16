Source: https://github.com/Gaurav-Gosain/tuios/blob/main/docs/release-notes/v0.8.3.md
Collected: 2026-10-17
Published: 2026 (v0.8.3 release)

Sixel images section:

> **Sixel images.** A pane's sixel image shows on the host, cut to the visible part of the pane ([#282](https://github.com/Gaurav-Gosain/tuios/pull/282), [#283](https://github.com/Gaurav-Gosain/tuios/pull/283)).
>   - Popups, borders and `clear` act on the image as they act on text.
>   - A host with kitty graphics and no sixel gets a kitty image. A host with neither shows a box.
>   - A pane is told about sixel only when the host draws it. chafa, timg, lsix and yazi then use their text fallback on other hosts.
>   - This works in daemon mode, over `tuios ssh` and in `tuios-web`.

---

Source: https://github.com/Gaurav-Gosain/tuios/blob/main/README.md
Collected: 2026-10-17
Published: 2026 (main branch, current as of 2026-10-17)

Graphics & Protocols section:

> ### Graphics & Protocols
> - **Kitty Graphics Protocol**: Full image rendering with flicker-free video playback. `mpv --vo=kitty` works (both shm and base64), and [youterm](https://github.com/Gaurav-Gosain/youterm) works.
> - **Sixel Graphics**: Sixel image passthrough (experimental, no pixel-level clipping yet)
> - **Kitty Keyboard Protocol**: Progressive enhancement (CSI u) with push/pop/query support. Fish 4.x compatible; Shift+printable bypasses the protocol and sends text directly.
> - **Synchronized Output**: Mode 2026 prevents screen tearing
> - **Shared Memory Support**: `t=s` passthrough for mpv `--vo-kitty-use-shm`
> - **Animation Frames**: A guest's `a=f` frame edits are forwarded to the host, so a program that patches its own image costs a rectangle instead of a whole bitmap. TUIOS also patches guests that only retransmit. Panes are told whether the host carries frame edits through `TUIOS_KITTY_ANIMATION`, because the host's reply is not relayed back into the pane and a guest cannot find out for itself.
> - **Terminal Queries**: OSC 4 palette, OSC 10-12 colors, CSI 14/16/18t sizing, DA1/DA2
> - **Experimental**: Kitty text sizing protocol (OSC 66). Basic passthrough works but has known issues with scrollback and window repositioning
> - **Kitty Animation Protocol**: Frame transmission, composition, and control (a=f, a=a, a=c), with damage-patch streaming for animated guests

Requirements section:

> **Requirements:** A terminal with true color support. Kitty graphics and sixel support recommended (Ghostty, Kitty, WezTerm).

Architecture section mentions:

> - **Kitty graphics passthrough**: Image IDs are reused across frames for flicker-free video. Output is batched with the render cycle and wrapped in mode 2026 sync.

Terminal emulation component:

> - **Terminal Emulation** ([`vt/`](./vt/)): ANSI parser with scrollback, kitty/sixel graphics, kitty keyboard protocol, OSC 133
