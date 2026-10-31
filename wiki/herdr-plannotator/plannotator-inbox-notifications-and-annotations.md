# Plannotator Inbox 通知与标注面

> Sources: backnotprop/plannotator 源码 `packages/inbox/notify.ts`、`notifyStatus.ts`、`sound.ts`，官方 agent 指南 `docs/agent-guides/inbox-messages.md`、`inbox-files-and-guides.md`，2026-10-31；本机 `plannotator` 0.28.42 的 `inbox --help`，2026-10-31
> Raw: [Inbox 桌面通知与铃声实现摘录](../../raw/herdr-plannotator/2026-10-31-plannotator-inbox-notification-impl.md); [Inbox 消息页：正文评论与回复](../../raw/herdr-plannotator/2026-10-31-plannotator-inbox-messages-guide.md); [Inbox 附件与 Guided Review](../../raw/herdr-plannotator/2026-10-31-plannotator-inbox-files-guide.md); [`plannotator inbox --help` 摘录](../../raw/herdr-plannotator/2026-10-31-plannotator-inbox-cli-help.md)
> Updated: 2026-10-31

## Overview

Inbox 的提醒只有一种通道：打开的 Inbox 网页发浏览器桌面通知。消息本身写入磁盘，不依赖标签页；提醒依赖标签页。通知由两件事触发：agent 新开一个线程，或已有线程里出现新问题。标注面上，agent 消息正文的文字可以选中评论，问题卡片不能。

## 什么会通知

| 情况 | 是否通知 |
|---|---|
| agent 新开一个线程 | 一定通知，标签页在前台也通知 |
| agent 消息里出现新问题（`Stopped:`、`Holds up:` 或任何 `:::question`） | 通知，除非该线程正被打开且可见 |
| 已有线程里的普通进展 | 从不通知 |

单条通知的标题按线程所在区段取值：`<项目>: <agent> stopped on you`、`… is waiting on you`、`… started a thread`，线程主题放在正文。

多条同时到达时合并为一条：`3 waiting in 2 projects` 或 `3 new in …`；只有一条时点击打开对应线程，多条时点击打开列表。所有通知共用一个标签，浏览器同时只显示一条。标签页不在前台时，一批通知持续到标签页回到前台；在前台时，`FRONT_BURST_MS = 30_000`（30 秒）内的通知合并成一条。

同时开多个 Inbox 标签页时，每个条目只弹一次：在前台的那个标签页负责，否则由最先声明该条目的标签页负责。

## 铃声

铃声只对新问题响，与通知开关无关：通知被关闭、被浏览器拒绝或被系统拦截时，铃声照样响。`decideRing` 的四条规则：

| 条件 | 结果 |
|---|---|
| 声音开关关闭 | 不响，也不改变当前一批的状态 |
| 任意 Inbox 标签页在前台 | 不响，当前一批结束 |
| 距上一批最后一个问题不足 30 秒（`RING_BURST_MS = 30_000`） | 不响，本批继续 |

“在前台”的判定是 `document.visibilityState === 'visible' && document.hasFocus()`。浏览器要求页面先有一次点击或按键才允许播放声音，因此声音上下文在第一次手势后才创建（armed）；在那之前到来的铃声会丢失且不报错。多个标签页共享一个 BroadcastChannel（谁在前台、谁响过），并用一个短锁保证只响一次。

## 界面上的状态文字

Settings → General 里的通知状态：

| 状态 | 文案 |
|---|---|
| `on` | `On for this address` |
| `off` | `Off` |
| `not-allowed` | `Not allowed in <浏览器> for this address` |
| `blocked` | `Blocked in <浏览器> for this address` |
| `unsupported` | `This browser cannot show notifications` |

“Notifications reach you” 用 `reachText` 输出五种结果：`No: notifications are off.`、`Yes, through this tab, while it stays open.`、`No: this tab may not notify.`、`No: no Inbox tab is open.`、`No: none of the N open Inbox tabs may notify.`

通知静默失败有五种来源：此地址没有权限（`default`，常见于 Inbox 换了端口或换用 127.0.0.1 的写法）、浏览器拦截了此地址（`denied`）、开关关闭、没有打开的 Inbox 标签页、以及浏览器放行但系统层不显示。最后一种只能靠 Settings 里的测试通知发现，文案指向 macOS 的 `System Settings → Notifications` 与 Focus，其他系统指向系统通知设置与 Do Not Disturb。权限按来源地址计算，因此设置存在 Inbox 服务端（config.json），不存 localStorage。

## 标签页休眠

浏览器可能冻结或回收后台标签页，通知会延迟或丢失。两种状态：`discarded`（Chrome 的 Memory Saver 关掉了标签页，再次打开即重载）与 `frozen`（Chrome 冻结了一段时间）；冻结超过 `FROZEN_NOTICE_MS = 60_000`（60 秒）才提示一次。

## 标注面

| 对象 | 能否评论 | 方式 |
|---|---|---|
| agent 消息正文 | 能 | 选中文字，工具栏只有 Comment 与 👍 Looks good；Comment 打开与文件评论相同的输入框，⌘↵ 或 Save 保存 |
| 问题卡片 | 不能 | 文字可以选中与复制；卡片包在 `annotation-exclude` 里，评论工具栏不为它出现 |
| 行动事项卡片 | 不能 | 同上，只能勾选 Done 或 Can't do it |
| Markdown、纯文本、配置文件、Mermaid、Graphviz、HTML 附件 | 能 | 在 Plannotator 查看器里打开后评论 |
| 图片 | 能 | 在消息里直接显示，按图片方式评论 |
| 视频（MP4、MOV、WebM） | 能 | 在消息旁播放，评论带上时间点，如 `At 1:42 (102.4 s of 7:41)`，并给出暂停帧的路径 |

消息正文的评论按文字定位，重新挂载时按文字重新画出高亮；文字找不到时列在回复框列表里标为 Unanchored。保存被拒绝时高亮被移除并显示错误。评论与文件的评论一样先保存，随一次 Send 与回复一起交给 agent；未发送的条数按线程记在 `unsentAnnotations` 里。

HTML 附件通过 annotate 的托管路径渲染：一个 `<base href>` 指向 `/api/html-assets/<token>/`，每个目录一个不可猜测的 token，页面在 `HtmlViewer` 的沙箱 srcdoc 里运行，读不到 Inbox API。以 `.` 开头的路径段与 dotenv 家族一律返回 404。

## 回复如何组织

人的一次 Send 只产生一条回复，即使问题分布在多条 agent 消息上：

1. 人的原话；
2. `Answers to your questions` 段落，按 `### Your message <id>` 分组；
3. `Feedback on your message from <time> (<message id>)` 段落，先引用被选中的原文，再写评论；
4. 附件的标注；
5. 粘贴进回复框的文件，列为 `Attached: <name> (<path>)`。

问题没回答就仍然开放，回复会说明还有几个未答；不要重复追问。被标记 👍 Looks good 的消息返回 `ack: { label, at }`，不需要回答。

## 与 review、annotate 的分工

Inbox 用于可以等待答复的事项；需要 agent 在继续之前拿到签字的计划、文档或 diff，用 Plannotator 的 review（plan review、`plannotator annotate`、`plannotator review`）。Inbox 的桌面通知与标注查看器与 review 共用，但两者是独立窗口与独立进程。

## 边界

浏览器界面未实际点击；以上行为取自源码注释与官方指南，界面文案在版本之间可能变化。复选框、按钮位置这类布局细节不在本文范围内。

## See Also

- [Plannotator Inbox 与 OMP 接通](plannotator-inbox-omp-connection.md) — 工具开关、注册门与 stdio 通道
- [Plannotator agent tool 注入与 Quick Labels 机制](plannotator-agent-tool-and-quick-labels.md) — agent 工具开关链与 config.json 键清单
- [Plannotator OMP 插件运行机制](plannotator-omp-plugin-mechanism.md) — 插件注册与进程内 HTTP 服务
