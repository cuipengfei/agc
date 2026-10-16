Source: https://github.com/herdrdev/herdr/issues/3030
Collected: 2026-10-17
Published: 2026-08-20 (issue created and closed)

Issue title: "Sixel graphics emitted by img2sixel are not rendered in Herdr panes"
State: CLOSED, NOT_PLANNED
Author: @kyhowintc
Herdr version reported: 0.8.0

Maintainer (@akbash-bot) response:

> Herdr's documented image path currently supports Kitty graphics only, behind `experimental.kitty_graphics`. `img2sixel` emits Sixel, which is a separate protocol; Mintty's outer-terminal support is not passed through because Herdr parses pane output and redraws the pane.
>
> Adding Sixel parsing and rendering would be new graphics-protocol support rather than a fix to established behavior. Please continue this proposal in [Ideas discussions](https://github.com/herdrdev/herdr/discussions/new?category=ideas).
>
> Closing as a feature request.

---

Source: https://github.com/herdrdev/herdr/issues/4330
Collected: 2026-10-17
Published: 2026-09-18 (issue created and closed)

Issue title: "foot outer: inline images (sixel) not rendered in Herdr panes — Kitty-only passthrough"
State: CLOSED, NOT_PLANNED
Author: @sarniva
Herdr version reported: 0.9.1

Reporter's analysis excerpt:

> - Outside Herdr, `opencode` image attach previews correctly in `foot` (OpenTUI picks `sixel`).
> - Inside a Herdr pane on the same `foot`, the same image shows as a black box + `[Image 1]` placeholder (OpenTUI `blocks` fallback).
> - Same Herdr session on `kitty` / `ghostty` outer terminal renders images correctly (`kitty_graphics = true`).
> - `img2sixel` also renders directly in `foot` but shows nothing inside a Herdr pane.
>
> Herdr docs: `terminal.kitty_graphics = "Render pane images in Kitty graphics-compatible outer terminals."` — no Sixel path mentioned.
>
> OpenTUI capability model supports `kitty | sixel | blocks` with `OPENTUI_IMAGE_PROTOCOL`, but Herdr VT (`libghostty-vt`) only implements Kitty passthrough (`src/kitty_graphics.rs`).

Maintainer (@akbash-bot) response:

> Duplicate of #3030, which covers the same missing Sixel support and was closed as a feature request. That disposition also applies to foot: `terminal.kitty_graphics` enables Kitty graphics, not Sixel rendering or passthrough, so a Sixel-only outer terminal cannot display pane images through that path.

---

Source: https://herdr.dev/docs/configuration (via herdr.dev/llms-full.txt)
Collected: 2026-10-17
Published: Unknown (documentation, version-correlated to 0.9.5)

Configuration reference excerpt:

> ### Kitty Graphics
>
> Render pane images in Kitty graphics-compatible outer terminals.

`terminal.kitty_graphics` is documented as enabling Kitty graphics protocol only. No Sixel configuration option exists in the documented settings.
