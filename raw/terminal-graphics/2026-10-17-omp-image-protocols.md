Source: https://github.com/can1357/oh-my-pi/blob/v18.11.2/packages/tui/src/terminal-capabilities.ts
Collected: 2026-10-17
Published: 2026 (tag v18.11.2, commit 470b7efb67673960d37e3e64584669e6e9caad1c)

Image protocol enumeration:

```ts
export enum ImageProtocol {
	Kitty = "\x1b_G",
	Iterm2 = "\x1b]1337;File=",
	Sixel = "\x1bPq",
}
```

`PI_FORCE_IMAGE_PROTOCOL` override:

```ts
function getForcedImageProtocol(): ImageProtocol | null | undefined {
	const raw = $env.PI_FORCE_IMAGE_PROTOCOL?.trim().toLowerCase();
	if (!raw) return undefined;
	if (raw === "kitty") return ImageProtocol.Kitty;
	if (raw === "iterm2" || raw === "iterm") return ImageProtocol.Iterm2;
	if (raw === "sixel") return ImageProtocol.Sixel;
	if (raw === "off" || raw === "none" || raw === "0" || raw === "false") return null;
	return null;
}
```

`renderImage` function dispatches on `TERMINAL.imageProtocol`:

```ts
export function renderImage(
	base64Data: string,
	imageDimensions: ImageDimensions,
	options: ImageRenderOptions = {},
): { sequence?: string; lines?: string[]; rows: number; transmit?: string } | null {
	if (!TERMINAL.imageProtocol) {
		return null;
	}
	// ...
	if (TERMINAL.imageProtocol === ImageProtocol.Kitty) {
		// Kitty: a=t transmit + a=p placement, or Unicode placeholders
		// ...
	}
	if (TERMINAL.imageProtocol === ImageProtocol.Sixel) {
		// SIXEL: encodeSixelNow or async encode
		// ...
	}
	if (TERMINAL.imageProtocol === ImageProtocol.Iterm2) {
		// iTerm2: OSC 1337;File=
		// ...
	}
	return null;
}
```

SIXEL encode uses native Rust binding:

```ts
import { encodeSixel } from "@oh-my-pi/pi-natives";
// ...
export function encodeSixelNow(base64Data: string, widthPx: number, heightPx: number): string | null {
	try {
		return encodeSixel(new Uint8Array(Buffer.from(base64Data, "base64")), widthPx, heightPx);
	} catch {
		return null;
	}
}
```

Windows Terminal SIXEL detection:

```ts
export function isWindowsTerminalPreviewSixelSupported(
	env: NodeJS.ProcessEnv = Bun.env,
	platform: NodeJS.Platform = process.platform,
): boolean {
	if (
		platform !== "win32" ||
		!env.WT_SESSION ||
		(env.TERM_PROGRAM && env.TERM_PROGRAM.toLowerCase() !== "windows_terminal")
	) {
		return false;
	}
	const version = parseMajorMinorVersion(env.TERM_PROGRAM_VERSION);
	if (!version) return false;
	return version.major > 1 || (version.major === 1 && version.minor >= 22);
}
```

Kitty graphics protocol operations:

```ts
export function encodeKittyDeleteAllImages(): string {
	return wrapTmuxPassthroughIfNeeded("\x1b_Ga=d,d=A,q=2\x1b\\");
}

export function encodeKittyDeletePlacement(imageId: number, placementId: number): string {
	return wrapTmuxPassthroughIfNeeded(`\x1b_Ga=d,d=i,i=${imageId},p=${placementId},q=2\x1b\\");
}
```

iTerm2 protocol:

```ts
export function encodeITerm2(
	base64Data: string,
	options: { ... } = {},
): string {
	// ...
	return `\x1b]1337;File=${params.join(";")}:${base64Data}\x07`;
}
```

`TerminalId` type includes: kitty, ghostty, wezterm, iterm2, vscode, alacritty, warp, orca, otty, rio, tern, monstar, base, trueColor.

Warp implements Kitty graphics only on macOS/Linux (null on Windows/WSL):

```ts
export function resolveWarpImageProtocol(
	platform: NodeJS.Platform = process.platform,
	env: NodeJS.ProcessEnv = Bun.env,
): ImageProtocol | null {
	const windowsHost = platform === "win32" || isWsl(platform, env);
	return windowsHost ? null : ImageProtocol.Kitty;
}
```

---

Source: https://github.com/can1357/oh-my-pi/blob/v18.11.2/packages/tui/src/chat/table-chart.ts
Collected: 2026-10-17
Published: 2026 (tag v18.11.2)

Module docstring:

> Charts drawn under numeric tables in assistant answers (the host's `tui.autoGraph`). `splitTableCharts` cuts a Markdown block after each top-level table that gets a chart; `lookupTableChart` plans, builds and draws that chart — locally under `always`, through the host's model-backed `TableChartPlanner` under `smart` for the tables `shouldJudge` picks — and caches it per table source. `TableChartFigure` shows it as a terminal image rasterized in omp's theme; `chartFence` hands a TSP terminal the SVG as an ```svg fence, which it draws in the palette it shows. Either way a chart follows theme switches like the prose around it.

Mode type:

```ts
/**
 * `smart`: a model refines the local guess where meaning decides (kind,
 * columns, row names, ordering, polarity, focus, title; see `shouldJudge`);
 * `always`: the local best guess charts every table it reads as numeric;
 * `off`: tables stay tables.
 */
export type TableChartMode = "smart" | "always" | "off";
```

Chart-as-image definitions (`chartFence` docstring, then `TableChartFigure` class):

```ts
/**
 * Chart `svg` as a Markdown ```svg fence, for a TSP terminal's `md` node. Its
 * figure tokens stay unresolved: the terminal draws the fence as a figure in
 * the palette it shows the prose in, so the chart cannot fall out of step with
 * the page when omp's own idea of the appearance does, and a theme switch
 * recolors it without a resend.
 */
export function chartFence(svg: string): string {
	return `\`\`\`svg\n${svg}\n\`\`\``;
}
```

```ts
export interface TableChartFigureOptions {
	/** Shared inline-image budget. */
	budget?: ImageBudget;
	/** The chart's rows changed outside a text update: its pick or raster landed. */
	onChange: () => void;
}

/**
 * The chart under one table, as a terminal image a blank row below it. Looks
 * the chart up on first render — a block rebuilt mid-stream never asks for a
 * pick it drops — and renders nothing until it is drawn, or when the table
 * gets no chart.
 */
export class TableChartFigure implements Component {
	readonly #options: TableChartFigureOptions;
	readonly #figure: SvgFigure;
	...
	constructor(options: TableChartFigureOptions) {
		this.#options = options;
		this.#figure = new SvgFigure({ budget: options.budget, onChange: options.onChange });
	}
```

`TableChartFigure` 的 docstring 声明它是「the chart under one table, as a terminal image a blank row below it」；类里持有 `#figure: SvgFigure` 并构造 `new SvgFigure({ budget, onChange })`。（源码摘录有省略。）

---

Source: https://github.com/can1357/oh-my-pi/blob/v18.11.2/docs/tui-core-renderer.md
Collected: 2026-10-17
Published: 2026 (tag v18.11.2)

§5 "Terminal capabilities and input probes":

> SIXEL discovery accepts either a positive XTSMGRAPHICS geometry reply or DA1 attribute 4. `ProcessTerminal.onSixelSupport` publishes and caches the DA1 advertisement while consuming the reply bytes and preserving sentinel ownership. A missing DA1 attribute does not reject support reported by XTSMGRAPHICS. Selecting SIXEL from DA1 does not end a pending XTSMGRAPHICS query: its input consumer remains until the graphics reply arrives or the probe times out. Explicit `PI_FORCE_IMAGE_PROTOCOL` choices, including `none`/`off`, take priority; native TSP surfaces keep their own image transport.

> `ProcessTerminal` also sends the TSP `hello` query (APC `tsp`) behind a `tsp` DA1 sentinel owner. `PI_TUI_NATIVE=0` disables it; multiplexers, devenv's reloading shell (`DEVENV_RELOAD_FILE`: its terminal layer forwards DA1 but drops APC) and Bun tests skip it by default, while `PI_TUI_NATIVE=1` forces the probe (tmux still needs `@tern-tsp`).

§6 "Inline images and memory":

> Kitty images are transmit-once, place-many. `ImageBudget` retains only the most recent images; demotion deletes image pixels by id and repaints the affected viewport rows with the height-preserving text fallback. It does not replay history. An image already retained in terminal history may lose its pixels when demoted because historical rows are immutable.

> Never retransmit full base64 image data on every frame. Kitty Unicode placeholders remain capability-gated and can be overridden with the existing image environment settings.
