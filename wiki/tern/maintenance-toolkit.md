# Tern 升级辅助工具与验收边界

> Sources: agc Tern maintenance toolkit and local validation, 2026-10-17; Tern 0.9.3 local upgrade and patches, 2026-10-18; Tern 0.9.5 upgrade and patching workflow, 2026-10-20; deterministic build and portability acceptance, 2026-10-21; write-error input cancellation acceptance, 2026-10-21; browser reproduction guard and 0.9.7 font-only deploy, 2026-10-29
> Raw: [工具说明与 0.9.2 验收记录](../../raw/tern/2026-10-17-maintenance-toolkit-and-validation.md); [0.9.3 升级、补丁与部署](../../raw/tern/2026-10-18-tern-0.9.3-upgrade-and-patches.md); [0.9.5 升级与补丁](../../raw/tern/2026-10-20-tern-0.9.5-upgrade-and-patches.md); [补丁流程要求](../../raw/tern/2026-10-20-tern-patching-workflow-retro.md); [确定性构建与移植验收](../../raw/tern/2026-10-21-deterministic-build-and-portability.md); [写入失败时取消输入等待](../../raw/tern/2026-10-21-write-error-input-cancellation.md); [复现工具误报与重绘判据](../../raw/tern/2026-10-29-browser-reproduction-redraw-guard.md); [0.9.7 仅字体部署](../../raw/tern/2026-10-29-tern-0.9.7-font-only-deploy.md)
> Updated: 2026-10-29

## 用途

`tools/tern-maintain` 用于升级 Tern Web 资源时重新取得官方模块、计算字体与时间相关位置、生成人工审核材料并执行分层验收。它不修改 manifest，不写来源配置，也不自动部署。工具已通过 commit `faae638` 纳入仓库。

## 工作流程

1. 从不带认证参数的本机原生 Web 服务取得官方 WASM URL 和 SHA-384 SRI；版本从 URL 计算，资源必须通过完整性校验。
2. 生成初始内存并用 FontTools 识别内嵌字体。分析器按实际 pointer/length 搜索唯一 descriptor，收集直接调用、函数表引用和局部指令上下文。未知 Binaryen IR 节点会使分析失败。
3. 报告给出 `decision: manual_review_required`。新版本的指令位置、ABI 和替换语义须人工审核；WAT 中间表示及其补丁允许程序化生成、组装和编译。维护工具自身的程序源码使用文件编辑工具维护，不把旧版本地址表用于新版本。
4. 字体处理校验初始内存 SHA-256，复制原字体的 lookup name records，保留 Maple 的完整 cmap、glyphs 和其他表。两个字体都通过校验后才修改 descriptor。
5. 结构、时间、字体、浏览器和后台服务分别验收。结构报告的 `deployable` 始终为 `false`，不会成为自动部署批准。

## 确定性构建与跨机器重建

已登记版本（0.9.4、0.9.5）的补丁由 recipe 确定性重建：`build` 重放锁定片段并用固定 WABT `1.0.42` 编译候选与独立测试模块、核对 SHA-256、执行结构与时间行为检查后组装完整构建包；`check-build` 校验包内文件身份、报告关联与工具源码身份，只承认 `passed`，`not_run` 不计为通过；`rebuild` 仅凭构建包在另一台机器重建，不需要原机器路径。测试 exports 在 recipe 锁定原版行之前插入（该行不要求一定是 export）；anchor 位于 replace 区间内时替换片段必须包含唯一原文 anchor。WABT 固定安装脚本 `ci/install-wabt.sh` 校验官方 tarball SHA-256 与两个 binary 的精确版本，仅支持 Linux x86_64 且安装目录必须不存在；2026-10-21 已在原机实测通过，其他平台未验证。`assets` 将校验过的候选、glue、字体与 `index.template.html` 生成的实际入口装配成新目录；`verify-page` 强制 headless 验收该真实入口，完整 GPU 与 mount 始终记 `not_run`，篡改 `fonts.json` 中 font SHA-256 会被拒绝。

0.9.4 与 0.9.5 的完整重建已完成：双版本 `build` + `check-build` 通过，candidate、独立测试模块、glue、profile 四处 SHA-256 与 recipe 锁定值一致，结构检查与六项真实时间行为检查重新执行并通过；0.9.5 构建包删除私有初始输入与原包后，在 fresh HOME `rebuild` 复验同样通过，candidate 与测试模块 hash 不变（真实 smoke `workflow-eV2Po2`，308.22s，退出码 0）。真实入口 `assets` 装配与 `verify-page` 无头验收同样通过（有效 6 passed、2 `not_run`；篡改 font SHA-256 被拒绝），receipt 在 `tools/tern-maintain/artifacts/workflow-eV2Po2/`。实际结果以 [确定性构建与移植验收](../../raw/tern/2026-10-21-deterministic-build-and-portability.md) 记录为准；操作顺序与跨机器步骤见 [跨机器补丁手册](portable-patching-runbook.md)。

写流失败时会立即停止读取输入并终止输入子进程，原始写入错误与失败目录保留；资源清理产生的后续错误不会替换已捕获的补丁断言等失败原因。定向回归控制输入保持等待并由文件系统产生真实 `EISDIR`，核对原始错误、`SIGKILL` 与失败目录状态；修复后全套 Bun 测试 62 项通过。另一次独立 Node 故障 smoke 在 19ms 内返回原始错误。该回归控制了外部输入边界，实际构建逻辑和文件系统错误处理仍由真实代码执行。

写流取消修正后，0.9.4 与 0.9.5 又分别完成真实 `build` 和 `check-build`；删除私有初始输入与首份包后，全新 HOME 重建 0.9.5 同样通过，两个模块 SHA-256 保持不变，新包也成功生成七份实际网页资源。此次源码身份、命令结果与 receipt 见 [写入失败时取消输入等待](../../raw/tern/2026-10-21-write-error-input-cancellation.md)。

内存初始化会执行可信官方模块的 start function；遇到初始化 import 调用或不支持的 import 类型会停止。工具只接受可信官方模块，不提供执行不可信 WASM 所需的隔离环境。

## 真实浏览器复现与机械检查（2026-10-29）

`markdown-windows` 用指定 binary 与站点目录启动私有 daemon 和 loopback Web 服务，再由 Windows Node 驱动 Windows Chrome 访问。流程为：确认页面取得 WebGPU adapter 并完成 mount；打开 ASCII Markdown 并确认响应与画面变化；关闭该 pane；在同一路径追加 `中` 后重新打开；等待三秒，调整 viewport 宽度与高度分别增加 80 与 40，检查应用是否更新 canvas 像素尺寸并产生新的 GPU command submission。观测探针只安装在本次隔离浏览器页面，包装 `GPUQueue.prototype.submit` 计数，不修改服务资源或 WASM。

结论分三类。`reproduced` 只表示有效 ASCII 基线之后中文页面状态查询无响应。`not_reproduced` 要求中文页面仍响应、首帧确实出现、viewport 输入后 canvas 尺寸与 GPU 提交同时增长。`not_run` 覆盖前置条件不足、驱动超时、截图失败与未观察到应用重绘，退出码 2，必须带理由。

间隔数秒的两张截图相同、`document.getSelection()` 前后相同、驱动命令超时，都只说明观测通道的状态，不作为冻结证据。静态 Markdown 页不会自行改变画面；输入目标是 WebGPU 画布，DOM 选区不表示画布内光标位置。一次实测中，旧判据把 `driver command timed out: visible-interaction` 写成了 `reproduced`，当时页面已挂载、中文首帧已出现、daemon 正常。

真实 0.9.7 仅字体页面的一次观测为：canvas 从 `1280`×`720` 变为 `1360`×`760`，GPU 提交从 `328` 增至 `334`，`wasmErrors` 为空，cleanup 成功。

`bun run check` 在内存中解析工具模块、校验部署记录，并通过 `typecheck/` 中固定版本的 TypeScript、Node/Bun 类型声明与 WebGPU 类型声明执行 `checkJs`，入口为 `build.mjs`、`assets.mjs`、`windows-browser.mjs` 及其实际导入依赖。它检查第三方 API 成员，不对全部 JavaScript 值给出完整类型证明。复现报告另要求同一 `fixturePath` 与四个成功阶段：`ascii_markdown_pane`、`pane_closed`、`cjk_appended`、`cjk_markdown_pane`。

2026-10-29 实测：定向 22 项与全套 91 项 Bun 测试通过；`bun run check` 输出 `32 modules parsed, 4 deployment records scanned, TypeScript passed`。

## 0.9.2 实际结果

官方资源获取与 SRI 通过。结构检查中的 imports、exports、函数签名、内存限制和初始内存均通过。

时间计划记录 26 个调用上下文，其中 15 个有唯一 buffer 候选，11 个需要人工审核。候选模块中原 panic 函数的直接调用、函数表引用和 `ref.func` 引用均为 0。

时间回归覆盖模块来源、日历与 epoch、输出边界、小数精度、跨秒 borrow、饱和时长、真实 consumer 和一万次 externref 复用，全部通过。

FontTools 数据测试确认 lookup 名称转换后完整 cmap 保留。每份字体有 33091 个字符映射，其中 20976 个属于记录的 CJK 范围。Headless Chromium 147 完成实际模块初始化与两份完整字体注入；没有执行 mount 或 WebSocket。

工具行为测试 18 项、字体数据测试 2 项、同步项目测试 19 项均通过。Node 与 Python 依赖审查当时未发现已知漏洞，FontTools 使用 4.60.2。

## 0.9.3 实际结果

原生版本为 `tern 0.9.3 (e96e848)`。官方 WASM SHA-256 `224e2fc0…`，glue SHA-256 `99d2c293…`，SRI 校验通过。补丁 WASM SHA-256 `bcb60f01…`，测试模块 SHA-256 `87136dec…`。

原版两份 Berkeley 字体仍无 CJK 字符（各 11217 个字符映射）；Regular pointer `4367806`、length `2288420`、槽位 `9031308`，Medium pointer `6656226`、length `2313308`、槽位 `9031332`。字体初始化改为读取新槽位 `9031308`/`9031312`、`9031332`/`9031336` 的 descriptor。

原版时间 panic 实际复现：函数 `30563`（21 个直接调用）与 `30564`（5 个直接调用）抛出 `unreachable`，消息 `time not implemented on this platform`。26 处调用点中，日历时间复用既有函数 `25011`，新增 `32181`（performance.now）与 `32182`（elapsed），跨秒相减复用既有饱和函数 `22956`，externref 由既有 `24515` 释放；没有新增 import，原函数编号保持。

结构检查 5 项与时间回归 6 项全部通过。Headless 浏览器完成模块初始化与两份完整字体注入，收到 33 个 WebSocket frame、pageerror 0；视觉效果由用户检查。正式服务 HTTP 200、补丁 WASM 指纹与既有 token 认证通过。

该次统一版本操作重启了 daemon；重启后查询返回四个 pane ID 与重启前一致（`326417514501`、`326417514503`、`347892350977`、`382252089349`），可继续使用。运行进程不随二进制路径替换更新；核对 `/proc/<pid>/exe` 的版本、SHA-256 和 device/inode，可确认实际运行身份。该次记录中的 daemon、Web 服务与安装文件 inode 均为 `238854`；daemon 与 Web 各由一个 Python 父进程（`daemon.py`、`serve.py`）管理子进程生命周期。

## 未完成与使用限制

本工具不覆盖笔记交互、完整字形外观与字符宽度。`markdown-windows` 覆盖页面响应、画面变化与应用重绘，中文内容语义仍需实际操作确认。GitHub Actions 工作流运行 `bun run check`、Bun 行为测试、FontTools 字体数据测试及同步项目现有 unittest；它不下载真实 WASM、不启动桌面浏览器、不访问本机凭据，CI 结果以 Actions 运行记录为准。真实 native 后台烟雾检查只覆盖隔离 daemon、HTTP 和 pane 集合不变，不影响原有服务。Windows 页面验收依赖本机 Windows Node、Playwright 与 Chrome，该组合在 CI 中未运行。

新 Tern 版本必须重新生成分析并人工审核。旧版本的 profile 只用于固定 SHA 的行为回归，不用于推导新版本的地址或函数编号。

## See Also

- [Tern 网页字体修改与版本迁移](web-maple-font-rebuild.md)
- [Tern 跨机器补丁手册](portable-patching-runbook.md)
- [Tern 设置存储位置](settings-storage.md)
