# Tern 网页 Markdown 中文触发无响应

> Sources: user-controlled Tern web comparison, 2026-10-13; Stencil Terms of Use section 17.9
> Raw: [reproduction evidence](../../raw/omp-tips/2026-10-13-tern-web-markdown-cjk-freeze.md); [runtime and download access](../../raw/omp-tips/2026-10-13-tern-web-runtime-and-download-access.md)
> Updated: 2026-10-14

## 概述

Tern 0.8.3 的 web client 在打开含单个中文字符的 Markdown 文件时失去响应。未修改的官方 client 同样复现，说明 Maple 字体修改不是触发条件。daemon 全程保持响应，受影响的文件 pane 可通过 CLI 关闭。

## 复现边界

纯 ASCII 的 Markdown 测试文件可正常打开；在同一文件末尾追加仅含 `中` 的一行后，整个 web 界面冻结。同一环境下 JSON 和 Python 文件可正常打开。以上为用户报告的观察结果：内部原因（Markdown 解析器、字体库或浏览器文本排版 API）仍未确定，现有证据也不能证明所有 CJK 字符都会触发——已确认的触发字符只有 U+4E2D（UTF-8 字节 `E4 B8 AD`）。

最小复现文件内容与恢复过程记录在所链 raw 文件中。

## 现场处置

1. 保持 daemon 与 shell pane 运行。
2. 用 `tern ls --json` 读取当前 workspace。
3. 按 `file` 字段匹配目标 Markdown 路径，取得该 pane 的当前 `id`；Git pane 由 `git` 字段标识，保留其他 pane。
4. 用当前 `id` 关闭：`tern close <current-id> --json`。
5. 再次执行 `tern ls --json`，确认返回中不再包含该 Markdown 路径。
6. 若冻结的浏览器页面仍显示旧帧，关闭该标签页并重开。
7. 将重启后的服务交给用户之前，先关闭恢复出来、可触发冻结的文件 pane，否则恢复会立即复现冻结。

浏览器卡住时 CLI 仍能关闭 pane，但这不会更新冻结的 web client 显示，因此 daemon 状态与浏览器可见状态须分别核实。

## 上报渠道

Stencil Terms of Use 第 17.9 节给出的联系邮箱是 `help@stencil.so`。完整英文邮件已存入稳定 raw 文件（见上方 Raw 字段）：收件人 `help@stencil.so`，标题 "Tern 0.8.3 web client freezes when a Markdown file contains one Chinese character"，环境行 `Linux x86_64 under WSL2 on a Windows host`（未声称具体 Windows 版本，浏览器与 GPU 未知）。邮件尚未发送。同一邮件在 `/tmp/tern-markdown-cjk-bug-email.txt` 存有便利副本；该临时路径可能消失，本轮恢复的副本也不声称找回了原删除文件的完整历史内容。

邮件涵盖：原版与 Maple 字体修改版 client 的对照复现、ASCII 内容加单个 `中` 的最小 fixture、JSON/Python 对照正常、daemon 响应与恢复步骤，并明确内部原因未知；不含 URL token。

## See Also

- [Tern 网页客户端：Maple 中文与 Nerd Font 修改及版本迁移](tern-web-maple-font-rebuild.md)
- [Tern：TSP 与 browser 后端](tern-tsp-and-browser-backend.md)
