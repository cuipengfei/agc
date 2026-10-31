# Inbox 附件与 Guided Review（官方 agent 指南摘录）

> Source: `backnotprop/plannotator` main：`docs/agent-guides/inbox-files-and-guides.md`
> Collected: 2026-10-31
> Published: Unknown

## HTML 附件的渲染方式

> HTML is drawn through annotate's serving path: a `<base href>` at `/api/html-assets/<token>/`, one unguessable token per folder, inside `HtmlViewer`'s sandboxed srcdoc frame. Relative images and frames load from the file's folder. The page cannot read the Inbox API, and a frame never draws the Inbox. The Inbox opts into `createHtmlAssetRegistry({ refuseAssetPath, documentCsp })` (annotate passes none): since a page may be attached from a home folder, any path segment starting with `.` and the dotenv family are `404`, judged as requested and by the realpath under the folder (`inboxRefusesAssetPath`), and nested documents get `sandbox allow-scripts allow-modals; connect-src 'none'`.

## 目录导航（Contents）

> Contents … a Markdown file with 4 or more headings of levels 1 to 4 (`showsContents` in `packages/inbox/contents.ts`, over ui's `hasContentsRailHeadings` and `tocHeadings`) has Contents.

> The rail measures itself and yields where the page is under 480 px or the gutter right of the column under 68 px …

## 全屏内评论

> **Full screen's composer** … The person can comment on a file or answer the agent without leaving full screen.

## 附件的安全检查

> a page may be attached from a home folder … any path segment starting with `.` and the dotenv family are `404` …

> nested documents get `sandbox allow-scripts allow-modals; connect-src 'none'`.
