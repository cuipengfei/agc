Source: https://github.com/tsl0922/ttyd/blob/1.7.7/html/package.json
Collected: 2026-10-17
Published: 2024-03-30 (ttyd 1.7.7 release)

Dependencies (excerpt from `html/package.json` at tag 1.7.7):

```json
"@xterm/addon-canvas": "^0.6.0",
"@xterm/addon-fit": "^0.9.0",
"@xterm/addon-image": "^0.7.0",
"@xterm/addon-unicode11": "^0.7.0",
"@xterm/addon-web-links": "^0.10.0",
"@xterm/addon-webgl": "^0.17.0",
"@xterm/xterm": "^5.4.0",
```

---

Source: https://github.com/xtermjs/xterm.js/blob/5.4.0/addons/addon-image/README.md
Collected: 2026-10-17
Published: 2024-02-26 (xterm.js 5.4.0 release)

Opening line and protocol scope:

> ## @xterm/addon-image
>
> Inline image output in xterm.js. Supports SIXEL and iTerm's inline image protocol (IIP).

Constructor options excerpt:

```ts
const customSettings: IImageAddonOptions = {
  enableSizeReports: true,    // whether to enable CSI t reports (see below)
  pixelLimit: 16777216,       // max. pixel size of a single image
  sixelSupport: true,         // enable sixel support
  sixelScrolling: true,       // whether to scroll on image output
  sixelPaletteLimit: 256,     // initial sixel palette size
  sixelSizeLimit: 25000000,   // size limit of a single sixel sequence
  storageLimit: 128,          // FIFO storage limit in MB
  showPlaceholder: true,      // whether to show a placeholder for evicted images
  iipSupport: true,           // enable iTerm IIP support
  iipSizeLimit: 20000000      // size limit of a single IIP sequence
}
```

Status section:

> - Sixel support and image handling in xterm.js is considered beta quality.
> - IIP support is in alpha stage. Please file a bug for any awkwardities.

No mention of Kitty graphics protocol in this README.

---

Source: https://github.com/tsl0922/ttyd/wiki/Client-Options
Collected: 2026-10-17
Published: Unknown (wiki page, continuously updated)

Client option for Sixel:

> - `-t enableSixel=true`: enable [Sixel](https://en.wikipedia.org/wiki/Sixel) image output support ([img2sixel](https://saitoha.github.io/libsixel) / [lsix](https://github.com/hackerb9/lsix))

No Kitty graphics option listed.

---

Source: https://github.com/tsl0922/ttyd/blob/1.7.7/html/src/components/terminal/xterm/index.ts
Collected: 2026-10-17
Published: 2024-03-30 (ttyd 1.7.7 release)

ImageAddon loading logic (from `applyPreferences`):

```ts
case 'enableSixel':
    if (value) {
        terminal.loadAddon(register(new ImageAddon()));
        console.log('[ttyd] Sixel enabled');
    }
    break;
```

`enableSixel` is a boolean client option. When true, ttyd loads `@xterm/addon-image` (ImageAddon). No separate Kitty graphics addon exists in the dependency list.
