# Tern 0.8.4 浏览器时间 panic 与 0.9.6 仅字体对照

> Source: 2026-10-13 旧版浏览器诊断输出（会话 `01a1353f-1316-7664-968e-9211aa859fa0` 的 `205.shake.log`，经 `artifact://205` 读取）；2026-10-28 0.9.6 同路径检查产物 `/tmp/tern-0.9.6-glibc-check-C7SCIa/`；0.9.6 仅字体部署验收与用户实际操作反馈
> Collected: 2026-10-29
> Published: Unknown

不保存凭据或 URL token；页面地址中的 `?token=` 一律记作 `<REDACTED>`。

## 结论摘要

1. 0.8.4 旧版浏览器客户端在挂载后出现真实 panic：`panicked at /rustc/ea137335b78829b4514bf1b4c16302f74fab8581/library/std/src/sys/time/unsupported.rs:35:9:`，错误文本为 `time not implemented on this platform`，随后输出 `pageerror RuntimeError: unreachable`。
2. Maple 字体版与官方原版在同一批诊断中都出现该 panic。字体版那次运行以 `heartbeat 0 {"unresponsive":true}` 结束（`Wall time: 3.51 seconds`）；原版在 `heartbeat 1` 之后 panic，`heartbeat 2` 到 `heartbeat 11` 仍返回 `{"status":null,"mounted":true,"maple":false,"gpu":true}`（`Wall time: 16.19 seconds`）。
3. 心跳与 CLI 仍响应，不等于渲染仍在更新：原版 panic 后同一现场 `tern ls` 仍返回完整会话、窗格与 split 结构。
4. 0.9.6 官方原版按同一路径（ASCII → 关闭 → 同一路径追加 `中` → 重开）未复现冻结：两次页面操作均响应约 `2 ms`，`freezeReproduced` 为 `false`，`timePanicEvidence` 为空数组。
5. 0.9.6 官方原版直接调用两个时间导出仍抛错（`test_time_30092`、`test_time_30093`，`RuntimeError: Unreachable code should not be executed`）。panic 分支仍在，但分支存在本身不决定 Markdown 冻结。
6. 正式 8378 服务切换为 0.9.6 后只注入 Maple 字体，WASM 与 JS glue 保留官方字节；挂载与字体验收通过，之后用户报告含中文的 Markdown 正常。该结果不能归因于字体或时间补丁，因为同版本原版在同路径也未见冻结。

## 0.8.4 官方原版现场

诊断脚本用 Windows 浏览器 CDP 打开客户端根路径 `http://127.0.0.1:8378/?token=<REDACTED>`，每秒读取一次页面状态，单次读取超过 2000 ms 记为 `unresponsive`。

关键输出（节选，wasm 函数地址保留原文）：

```text
console  INFO stencil_trace::console: started app="Tern" role="tern-web"
console  INFO stencil_gfx: gpu adapter adapter= backend="WebGPU" driver= software=false cpu=false max_texture_dimension_2d=16384 timestamp_query=true
heartbeat 0 {"status":"Connecting","mounted":true,"maple":false,"gpu":true}
console  INFO stencil_tern::daemon::websocket: websocket daemon connected
console  INFO stencil_tern::session: session started ephemeral=false
console  INFO stencil_tern::session::attach: daemon attached host=0
console  INFO stencil_window::window: rendering gpu= (WebGPU)
console  INFO stencil_platform::web: app launched
console  WARN stencil_window::window: no transparent swapchain; the window stays opaque
console  INFO stencil_text::backend::portable::system: font database loaded count=0 elapsed=0ns
console  INFO stencil_platform::web::shared: window created width=1280.0 height=720.0 scale=1.0
heartbeat 1 {"status":null,"mounted":true,"maple":false,"gpu":true}
console panicked at /rustc/ea137335b78829b4514bf1b4c16302f74fab8581/library/std/src/sys/time/unsupported.rs:35:9:
time not implemented on this platform
...
    at http://127.0.0.1:8378/pkg/stencil_tern_web-0.8.4_bg.wasm:wasm-function[31557]:0x2812d55
    at http://127.0.0.1:8378/pkg/stencil_tern_web-0.8.4_bg.wasm:wasm-function[19617]:0x25be1f1
    at http://127.0.0.1:8378/pkg/stencil_tern_web-0.8.4_bg.wasm:wasm-function[26579]:0x274e732
pageerror RuntimeError: unreachable
    at http://127.0.0.1:8378/pkg/stencil_tern_web-0.8.4_bg.wasm:wasm-function[19617]:0x25be247
heartbeat 2 {"status":null,"mounted":true,"maple":false,"gpu":true}
heartbeat 11 {"status":null,"mounted":true,"maple":false,"gpu":true}
```

同一次运行的 `heartbeat 2` 到 `heartbeat 11` 全部返回正常对象，没有 `unresponsive`；整段 `Wall time: 16.19 seconds`。panic 之后脚本仍能读取页面状态字段；该脚本未采集画面变化。

## 0.8.4 Maple 字体版现场

字体版在同一诊断下先到达 `app launched`，同样以 `unsupported.rs:35:9` 的 panic 文本和 `pageerror RuntimeError: unreachable` 结束，但这次没有后续心跳：末尾为

```text
heartbeat 0 {"unresponsive":true}
Wall time: 3.51 seconds
```

该次 panic 的函数地址为 `wasm://wasm/0e524342:wasm-function[31557]:0x2812d69`、`wasm-function[19617]:0x25be205`，随后 `pageerror RuntimeError: unreachable` 指向 `wasm-function[19617]:0x25be25b`。

即单次状态读取超过 2000 ms 超时，按脚本定义记为无响应。该次运行使用的是 8378 上的 Maple asset 目录；同批次更早的一次运行中 `window.ternMaple` 为 `true`，页面报 `no GPU adapter: No suitable graphics adapter found; noop not requested, vulkan not requested, metal not requested, dx12 not requested, gl not requested, webgpu found no adapters`，那次是启动失败，不是 panic，说明诊断环境是否存在可用 GPU adapter 会改变结果。

现场用脚本心跳（evaluate 成功返回、无 `unresponsive`）记录状态查询通道，没有单独重取 panic 后的页面 HTTP 状态码，也未采集画面变化。

## 旧版现场未确认的边界

- 诊断脚本只打开客户端根路径，没有打开任何 Markdown 文件。已记录的现象是旧版客户端时间 panic；Markdown 打开是否触发 panic 仍需定向实验。
- 已确认的旧版本地运行为 `tern 0.8.4 (6b4535f)`，加载资源名 `stencil_tern_web-0.8.4_bg.wasm`；原冻结报告写的是 0.8.3。两处版本标签尚未统一，本文不裁决旧报告版本号。
- panic 与用户报告的 Markdown 冻结在旧版同一环境中都出现过；但「Markdown 打开 → panic → 冻结」这条因果链当时没有任何一步被单独隔离。
- 旧版现场没有对 panic 后的页面 HTTP 响应码取样；只有心跳 evaluate、`tern ls` 与后续进程检查可用。
- 浏览器侧信息：CDP 报告 `Edg/154.0.4258.62`，UA 为 `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0`。未确认 Markdown 解析器、字体库或排版组件；已确认的触发字符只有 U+4E2D。

## 0.9.6 官方原版同路径对照

产物目录 `/tmp/tern-0.9.6-glibc-check-C7SCIa/`，2026-10-28 生成，隔离服务，不接触正式 8378。`same-path-report.json`：

| 字段 | 值 |
|---|---|
| `version` | `0.9.6` |
| `sequence` | `same path: ASCII -> close -> append CJK -> reopen` |
| `mount` | `responsive` true、`elapsedMs` 11、`mounted` true |
| `ascii` | `responsive` true、`elapsedMs` 2、`closedBeforeAppend` true、`same-path-ascii.png` |
| `cjk` | `responsive` true、`elapsedMs` 2、`paneCount` 1、`same-path-cjk.png` |
| `freezeReproduced` | `false` |
| `timePanicEvidence` | `[]` |
| `webgpu` | `present` true、`adapter` true |
| `daemonResponsive` | true |
| `conclusion` | `freeze_not_reproduced` |

同目录 `markdown-report-xvfb-vulkan.json` 是另一次 Xvfb 尝试：`conclusion` 为 `not_completed`，原因是该环境 `webgpu` 无 adapter（`no GPU adapter: No suitable graphics adapter found; noop not requested, vulkan not requested, metal not requested, dx12 not requested, gl not requested, webgpu found no adapters`）。该文件既不能当通过，也不能当复现。

## 0.9.6 时间导出探针

`time-probe.json`：`schemaVersion` 1，`version` `0.9.6`，两次直接调用均失败，`logged` 为空数组。

```text
test_time_30092: RuntimeError: Unreachable code should not be executed (evaluating 'wasm[name]()')
test_time_30093: RuntimeError: Unreachable code should not be executed (evaluating 'wasm[name]()')
```

这与 0.9.6 原版同路径未冻结并列：unsupported 时间分支在原版二进制中仍可抛错，但它不是本次 Markdown 结果的充分条件。

## 0.9.6 正式服务只注入字体

- 版本 `0.9.6`；安装 binary 的 SHA-256 为 `77325b3eae8f6ccae049dc8456c4cb7bfa44a3afbdc6437f4fcc772f7a299247`，daemon 与 web 进程的 binary SHA-256 与该文件一致。
- 部署前预检报告 `wasmUnmodified` 为 true，`page_served` 为 `GET http://127.0.0.1:42475/ -> 200`，候选 WASM SHA-256 `38524c0ccbe83b5e0034a4430fb6dcffced4998ccc162be661c85c748426cb38` 与页面报告一致；`cmp` 复核安装的 binary、WASM、JS glue 与官方 0.9.6 原件逐字节一致。
- 正式入口 `127.0.0.1:8378` 的 Windows Chrome 验收：`mounted` true，`webgpu` `present` 与 `adapter` 均 true，字体注入 Regular `20564496` bytes、Bold `20517844` bytes，`framesReceived` `18`，`pageErrors` `0`；原有四个窗格 ID 保留。
- 验收后用户实际操作反馈：打开含中文的 Markdown，正常显示、页面可用。
- 边界：这是单次用户操作，不是重复对照；同版本官方原版在同一路径也已未复现冻结，因此不能写「Maple 修复了冻结」。字体在这里的已确认作用只是显示（中文与 Nerd Font 字形），时间实现与 Markdown 逻辑均未修改。

## 证据文件

- `/tmp/tern-0.9.6-glibc-check-C7SCIa/same-path-report.json`、`same-path-ascii.png`、`same-path-cjk.png`
- `/tmp/tern-0.9.6-glibc-check-C7SCIa/time-probe.json`、`markdown-report-xvfb-vulkan.json`、`fonts.json`、`plan.json`
- 旧版现场：会话 `01a1353f-1316-7664-968e-9211aa859fa0` 的 `205.shake.log`（`artifact://205`）

`/tmp` 路径可能被清理；结论字段已抄录在上文，长期来源是本文件。旧版冻结原始记录 `raw/omp-tips/2026-10-13-tern-web-markdown-cjk-freeze.md` 未修改。
