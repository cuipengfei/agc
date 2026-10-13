# Tern 网页 Markdown 中文复现与报告邮件

> Source: 用户对照试验、`tern ls --json`、`tern close`、Stencil 服务条款，以及下方保存的完整报告邮件
> Collected: 2026-10-14
> Published: Unknown

不保存凭据或 URL token。

复现观察来自 2026-10-13。pane 字段在 2026-10-14 的复核中核对，邮件便利副本于本轮重新生成。

## 已确认的复现边界

未修改的官方 Tern 0.8.3 网页客户端同样复现；带 Maple 字体修改的客户端也复现，因此本次触发不依赖字体修改。

用户观察：

- 纯 ASCII Markdown 可以正常打开。
- 同一文件增加一个中文字符 `中` 后，整个网页界面失去响应。
- 同环境的 JSON 和 Python 文件可以正常打开。
- 网页失去响应时，daemon CLI 仍然响应。

内部故障机制尚未确定。现有证据未识别具体 Markdown parser、字体库或浏览器排版组件，也未证明全部 CJK 字符都触发。

## 最小复现文件

纯 ASCII 文件名为 `tern-md-english-test.md`：

```markdown
# English Markdown Test

Hello from Tern.

## Simple List

- First item
- Second item

This is **bold text** and this is `inline code`.
```

触发问题的文件在末尾增加一行，仅包含：

```text
中
```

该字符为 U+4E2D，UTF-8 bytes 为 `E4 B8 AD`。

## Pane 状态与恢复

网页失去响应时，`tern ls --json` 仍返回工作区。按 `file` 字段匹配 Markdown 路径，取得文件 pane 的当前 `id`；Git pane 使用 `git` 字段。shell pane 保持运行。

使用当前 `id` 关闭文件。下面 `9` 是当时的 shell id，新现场应选择实际 shell：

```bash
tern close <current-id> --json
tern focus 9 --json
```

关闭命令成功后，新清单不再包含 Markdown 路径。冻结网页仍可能显示旧帧；关闭该浏览器标签页并重新打开，是用户试验中有效的恢复操作。

daemon 重启会恢复记录的工作区，包括文件 pane。交给用户重试前应关闭恢复出的目标 Markdown pane，避免重复加载触发状态。

## 官方联系渠道与完整英文邮件

Stencil 服务条款第 17.9 节给出通用联系邮箱。原文联系说明：

> Questions, comments, or concerns regarding the Services or these Terms may be directed to: Email: help@stencil.so

下面保存完整邮件，尚未发送。环境只写已确认的 Windows host；浏览器与 GPU 信息未知。相同文本在 2026-10-14 保存到 `/tmp/tern-markdown-cjk-bug-email.txt` 作为便利副本；长期来源是本 raw 中的正文。

```text
To: help@stencil.so
Subject: Tern 0.8.3 web client freezes when a Markdown file contains one Chinese character

Environment: tern 0.8.3 (e2b8656), Linux x86_64 under WSL2 on a Windows host. Browser and GPU unknown.

Summary

The web client becomes fully unresponsive when a Markdown file containing a single Chinese character is opened. The daemon CLI remains responsive while the browser tab is stuck.

Reproduction

1. Create a file named tern-md-english-test.md with this ASCII-only content:

# English Markdown Test

Hello from Tern.

## Simple List

- First item
- Second item

This is **bold text** and this is `inline code`.

2. Open it in the web client: it renders normally.
3. Append one final line containing only the character 中 (U+4E2D, UTF-8 bytes E4 B8 AD).
4. Open the file again in the web client: the whole web interface freezes.

Controls

- The same ASCII-only Markdown file opens normally.
- JSON and Python files open normally in the same environment.
- The unmodified official 0.8.3 web client reproduced the freeze.
- A web client carrying a Maple font modification also reproduced it, so the font modification is not required to trigger the problem.

Daemon behavior and recovery

- While the browser was stuck, `tern ls --json` still returned the workspace. Panes carry `id` and `file`; the Git pane carries `git`.
- The affected file pane was closed from the CLI with its current id: `tern close <current-id> --json`, then `tern focus 9 --json`.
- After the close succeeded, `tern ls --json` no longer listed the Markdown path.
- The frozen tab kept showing its old frame; closing that browser tab and reopening it recovered the web client.
- After a daemon restart, the recorded workspace was restored, including the file pane. A stuck file pane must be closed before handing a restarted web service to a user, or the freeze can reproduce immediately.

Internal cause

Unknown. The evidence does not identify a Markdown parser, a font library, a browser text-layout API, or a full CJK range as the cause. The observed trigger is the single character 中; other CJK characters were not tested, so it is not known whether every CJK character triggers the bug.

No credentials or URL tokens are included in this report.
```
