# Inbox 消息页：正文评论与回复（官方 agent 指南摘录）

> Source: `backnotprop/plannotator` main：`docs/agent-guides/inbox-messages.md`
> Collected: 2026-10-31
> Published: Unknown

## 消息正文的评论（文字选择）

> … open ui's selection toolbar comment-only, as on an HTML file: Comment and the one-click 👍 Looks good (no Delete, no label picker). Comment opens the same composer as a file's; ⌘↵ or Save stores it. ui's seam is `Viewer`'s `textComments` (with `answerOnly`: the selection toolbar, its composer and the highlights come back, nothing else of authoring; question cards are wrapped `annotation-exclude`, so their words are never commented on). The message keeps the passage's light highlight, drawn again from the store by its words on every mount (Unanchored in the reply box's list when the words are not found). A refused save takes its highlight away and shows the error.

## 卡片文字可以选中复制，但不能评论

> Text in the card (and in a question card) selects and copies: the message's Viewer wraps both in `annotation-exclude` under text comments, and web-highlighter removed the DOM selection after every pointer-end even when it painted nothing; `rangeInsideExcluded` (ui `useAnnotationHighlighter`) now lets a selection wholly inside an excluded subtree stand …

## 评论存到哪里

> Stored like file comments: `POST /api/inbox/messages/:id/annotations` …

## 回复草稿

> The words are kept per thread as a server draft (`packages/shared/inbox/reply-drafts.ts`, `inbox/reply-drafts/<thread id>.json`, 0600 in a 0700 folder, written whole …). Outside the event log, like compose drafts: no line, no seq, nothing an agent, the MCP, search or the phone's event stream sees.

> A row's comment count is kept per thread as annotations change (`unsentAnnotations`), never scanned.
