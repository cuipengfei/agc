# OMP Markdown 标题 TUI 渲染：本机安装包源码摘录

> Source: 本机安装包 ~/.bun/install/global/node_modules/@oh-my-pi/pi-tui/src/ 与 ~/.omp/agent/config.yml 直读
> Collected: 2026-11-15
> Published: Unknown（本机安装版本）

现象：OMP TUI 中一级、二级标题渲染为不带 `#` 的彩色标题，三级及以下标题显示为带彩色 `###` 前缀的整行。以下为定位到的事实源码。

## markdown.ts — heading 绘制分支（4211-4235）

```ts
		switch (token.type) {
			case "heading": {
				const headingLevel = token.depth;
				const headingText = this.#renderInlineTokens(token.tokens || [], this.#proseFgExemptContext(styleContext));
				const headingPlainText = plainInlineTokens(token.tokens || []);
				// A sized heading draws plain text, which would drop a clickable extension link's marker.
				if (headingLevel === 1 && TERMINAL.textSizing && stripExtensionLinkMarkers(headingText) === headingText) {
					const plainWidth = visibleWidth(headingPlainText);
					if (plainWidth > 0 && 2 * plainWidth <= width) {
						const sizedHeading = encodeTextSizedHeading(headingPlainText, 2);
						lines.push(
							renderedLine(this.#theme.heading(this.#theme.bold(this.#theme.underline(sizedHeading)), 1)),
						);
						lines.push(renderedLine("")); // reserve the heading's second visual row
						if (nextTokenType && nextTokenType !== "space") {
							lines.push(renderedLine("")); // Add spacing after headings (unless space token follows)
						}
						break;
					}
				}
				lines.push(renderedLine(this.#styleHeading(headingLevel, headingText)));
				if (nextTokenType && nextTokenType !== "space") {
					lines.push(renderedLine("")); // Add spacing after headings (unless space token follows)
				}
				break;
			}
```

## markdown.ts — #styleHeading（4851-4856）

```ts
	/** Rendered inline heading text styled for its level, as one (unsized) line. */
	#styleHeading(depth: number, headingText: string): string {
		if (depth === 1) return this.#theme.heading(this.#theme.bold(this.#theme.underline(headingText)), 1);
		if (depth === 2) return this.#theme.heading(this.#theme.bold(headingText), 2);
		return this.#theme.heading(this.#theme.bold(`${"#".repeat(depth)} ${headingText}`), depth);
	}
```

## tui-adapters.ts — colorfulMarkdown 默认值与按级配色（202-203, 280-295, 319-323）

```ts
let markdownMermaidRendering = true;
let markdownColorful = true;
```

```ts
/** Palette slot per heading depth under colorful Markdown; index 0 is H1, deeper levels reuse the last. */
const COLORFUL_HEADING_COLORS: readonly AnsiColor[] = ["magenta", "yellow", "blue"];

const colorfulMarkdownRoles = {
	heading: (text: string, depth: number) =>
		theme.ansiFg(COLORFUL_HEADING_COLORS[Math.min(depth, COLORFUL_HEADING_COLORS.length) - 1], text),
	code: (text: string) => theme.ansiFg("green", text),
	strong: (text: string) => theme.ansiFg("magenta", theme.bold(text)),
	emphasis: (text: string) => theme.ansiFg("magenta", theme.italic(text)),
	tableHeader: (text: string) => theme.ansiFg("yellow", theme.bold(text)),
} satisfies Partial<MarkdownTheme>;
```

```ts
	const markdownTheme: MarkdownTheme = {
		heading: (text: string) => theme.fg("mdHeading", text),
		code: (text: string) => theme.fg("mdCode", text),
		...(markdownColorful ? colorfulMarkdownRoles : {}),
```

## assistant-message.ts — 扩展文本渲染器 #renderText（552-601 节选）

```ts
	/**
	 * Display form with the extension text renderers applied, in registration order: each gets the
	 * previous one's output. A renderer that throws or returns a non-string leaves its input drawn;
	 * a throw is logged once per renderer. A block whose text and `streaming` flag are unchanged
	 * since its last render reuses that output: a block sealed at a tool call keeps receiving
	 * updates while the call's arguments stream. {@link rerenderMessage} and
	 * {@link setTextRenderers} drop the reused output.
	 */
	#renderText(message: AssistantMessage, streaming: boolean): AssistantMessage {
		const rendering = this.#textRendering;
		if (!rendering) return message;
		// Renderers are display-only: hand them a deep copy so no edit, however nested, reaches the stored message.
		let view: AssistantMessage | undefined;
		let content: AssistantMessage["content"] | undefined;
		const tail = message.content.length - 1;
		for (let index = 0; index < message.content.length; index++) {
			const block = message.content[index]!;
			if (block.type !== "text" || block.text.length === 0) continue;
			const blockStreaming = streaming && index === tail;
			const cached = this.#renderedText.get(index);
			let text: string;
			if (cached?.input === block.text && cached.streaming === blockStreaming) {
				text = cached.output;
			} else {
				view ??= structuredClone(message);
				text = block.text;
				for (const renderer of rendering.renderers) {
					try {
						const rendered = renderer({
							message: view,
							contentIndex: rendering.contentOffset + index,
							text,
							streaming: blockStreaming,
						});
						if (typeof rendered === "string") text = rendered;
					} catch (error) {
						if (failedTextRenderers.has(renderer)) continue;
						failedTextRenderers.add(renderer);
						logger.warn("Assistant text renderer failed; drawing its input", { error: String(error) });
					}
				}
				this.#renderedText.set(index, { input: block.text, streaming: blockStreaming, output: text });
			}
			if (text === block.text) continue;
			content ??= message.content.slice();
			content[index] = { ...block, text };
		}
		return content ? { ...message, content } : message;
	}
```

## 本机 config.yml — extensionRenderers（640-641）

```yaml
extensionRenderers:
  assistantText: false
```

本机 config.yml 的 `tui:` 段没有覆盖 `colorfulMarkdown`，即保持 `tui-adapters.ts:203` 的默认值 `true`。
