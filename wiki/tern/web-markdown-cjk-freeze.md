# Tern 网页 Markdown 中文触发无响应

> Sources: 用户对照试验，2026-10-13；Stencil Terms of Use 第 17.9 节；旧版浏览器诊断与 0.9.6 同路径对照，2026-10-29；0.9.7 仅字体版重绘检查，2026-10-29
> Raw: [reproduction evidence](../../raw/omp-tips/2026-10-13-tern-web-markdown-cjk-freeze.md); [runtime and download access](../../raw/omp-tips/2026-10-13-tern-web-runtime-and-download-access.md); [0.8.4 浏览器 panic 与 0.9.6 仅字体对照](../../raw/tern/2026-10-29-084-browser-panic-and-font-only-comparison.md); [0.9.7 仅字体部署](../../raw/tern/2026-10-29-tern-0.9.7-font-only-deploy.md); [复现工具误报与重绘判据](../../raw/tern/2026-10-29-browser-reproduction-redraw-guard.md)
> Updated: 2026-10-29

## 概述

旧版 Tern web client 在打开含单个中文字符的 Markdown 文件时失去响应。未修改的官方 client 与带 Maple 字体修改的 client 都复现过，因此已有证据不支持「字体修改导致冻结」。同环境还实际观察到时间 panic，但 panic 与冻结的因果关系没有隔离。0.9.6 官方原版按同一路径重做后未复现冻结。

> **Status: Outdated** (2026-10-29)
> 旧报告标注的版本 0.8.3 未能在本机复核：同批浏览器诊断显示当时本地运行的是 `tern 0.8.4 (6b4535f)`，加载资源为 `stencil_tern_web-0.8.4_bg.wasm`。冻结观察本身仍是用户报告的事实，只是版本标签未统一。

## 版本与证据

| 版本 | 已观察内容 | 证据性质 |
|---|---|---|
| 0.8.3（旧报告标签） | 纯 ASCII Markdown 正常；同一文件末尾追加仅含 `中` 的一行后整个 web 界面冻结；官方原版与 Maple 版 client 都复现 | 用户报告 |
| 0.8.4（本地实际运行） | 浏览器客户端出现时间 panic `unsupported.rs:35:9`；原版 panic 后心跳仍返回，Maple 版 panic 后心跳超时 | 诊断输出 |
| 0.9.6 原版 | 同一路径 ASCII → 关闭 → 追加 `中` → 重开：两次操作均响应约 `2 ms`，`freezeReproduced` 为 `false`，`timePanicEvidence` 为空 | 隔离检查 |
| 0.9.6 原版 | 直接调用时间导出仍抛 `RuntimeError: Unreachable code should not be executed` | 隔离检查 |
| 0.9.7 仅字体版 | 同一路径 ASCII → 关闭 → 追加 `中` → 重开：页面仍响应，首帧与延迟画面均变化；viewport 输入后 canvas 由 `1280`×`720` 变为 `1360`×`760`，GPU 提交由 `328` 增至 `334`，`wasmErrors` 为空 | 隔离检查 |

这张表说明三件事：旧版冻结可复现且与字体修改无关；旧版同环境确实存在时间 panic；0.9.6 与 0.9.7 的检查都没有复现冻结，且 unsupported 时间分支仍在。因此 panic 分支存在与冻结之间没有已建立的因果链。

## 复现边界

纯 ASCII 的 Markdown 测试文件可正常打开；在同一文件末尾追加仅含 `中` 的一行后，整个 web 界面冻结。同一环境下 JSON 和 Python 文件可正常打开。以上为用户报告的观察结果：内部原因（Markdown 解析器、字体库或浏览器文本排版 API）仍未确定，已确认的触发字符只有 U+4E2D（UTF-8 字节 `E4 B8 AD`）。

旧的浏览器诊断只打开客户端根路径，记录了旧版时间 panic；Markdown 打开是否触发 panic 仍需定向实验。0.9.6 的同路径检查重放了「打开中文 Markdown」这一步。
0.9.7 的检查使用 viewport 重绘判据：静态截图相同、DOM 选区相同、驱动超时都不构成冻结证据；证据不足记为 `not_run`。0.9.7 原版尚未用该判据复跑，表内 0.9.7 行对应仅字体版。

最小复现文件内容与恢复过程记录在所链 raw 文件中。

## 现场处置

1. 保持 daemon 与 shell pane 运行。
2. 用 `tern ls --json` 读取当前 workspace。
3. 按 `file` 字段匹配目标 Markdown 路径，取得该 pane 的当前 `id`；Git pane 由 `git` 字段标识，保留其他 pane。
4. 用当前 `id` 关闭：`tern close <current-id> --json`。
5. 再次执行 `tern ls --json`，确认返回中不再包含该 Markdown 路径。
6. 若冻结的浏览器页面仍显示旧帧，关闭该标签页并重开。
7. 将重启后的服务交给用户之前，先关闭恢复出来、可触发冻结的文件 pane，否则恢复会立即复现冻结。

浏览器卡住时 CLI 仍能关闭 pane，但这不会更新冻结的 web client 显示。旧版 panic 之后的诊断还显示：心跳仍能返回状态对象，`tern ls` 也仍返回完整会话。心跳与 CLI 可用都记录状态查询通道；该诊断未采集画面变化。

## 上报渠道

Stencil Terms of Use 第 17.9 节给出的联系邮箱是 `help@stencil.so`。完整英文邮件已存入稳定 raw 文件（见上方 Raw 字段）：收件人 `help@stencil.so`，标题 "Tern 0.8.3 web client freezes when a Markdown file contains one Chinese character"，环境行 `Linux x86_64 under WSL2 on a Windows host`（未声称具体 Windows 版本，浏览器与 GPU 未知）。邮件尚未发送。同一邮件在 `/tmp/tern-markdown-cjk-bug-email.txt` 存有便利副本；该临时路径可能消失，本轮恢复的副本也不声称找回了原删除文件的完整历史内容。

邮件涵盖：原版与 Maple 字体修改版 client 的对照复现、ASCII 内容加单个 `中` 的最小 fixture、JSON/Python 对照正常、daemon 响应与恢复步骤，并明确内部原因未知；不含 URL token。邮件标题沿用 0.8.3 标签，未随本条版本更正重发。

## 限制

- 具体 Markdown 触发链仍未隔离：未识别 Markdown 解析器、字体库或浏览器排版组件；已确认的触发字符只有 U+4E2D。
- 0.9.6 只重放了一条同路径序列，没有在不同浏览器、GPU 或操作系统上重复；一次 Xvfb 尝试因无 GPU adapter 记为 `not_completed`，未形成冻结结论。
- 0.9.6 正式服务只注入 Maple 字体，同版本原版在同路径同样未复现冻结；字体已确认的作用只是显示，冻结原因尚未隔离。
- 0.9.7 只检查了一次仅字体版序列；0.9.7 原版按同一判据的对照仍未执行。
- 中文内容语义、字形外观与完整 Markdown 渲染未由该检查覆盖；判据只确认页面响应与渲染继续工作。
- 版本号 0.8.3 与 0.8.4 的标签差异尚未在原始报告中统一。

## See Also

- [Tern 网页客户端：Maple 中文与 Nerd Font 修改及版本迁移](web-maple-font-rebuild.md)
- [Tern：TSP 与 browser 后端](tsp-and-browser-backend.md)
- [Tern 时间 API 补丁与验收](time-api-patch-and-verification.md)
