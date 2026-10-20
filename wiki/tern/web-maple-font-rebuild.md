# Tern 网页客户端：Maple 中文与 Nerd Font 修改及版本迁移

> Sources: Tern 0.8.3 网页客户端实测与用户验收，2026-10-13；会话材料复核与源码补全，2026-10-14；Tern 0.9.3 本地升级与补丁，2026-10-18；Tern 0.9.5 升级与补丁流程复盘，2026-10-20；Tern 确定性构建与迁移验收，2026-10-21
> Raw: [字体修改证据](../../raw/omp-tips/2026-10-13-tern-web-maple-font-patch-evidence.md); [完整源码与重建记录](../../raw/omp-tips/2026-10-13-tern-web-maple-client-source.md); [运行时与下载](../../raw/omp-tips/2026-10-13-tern-web-runtime-and-download-access.md); [0.9.3 升级、补丁与部署](../../raw/tern/2026-10-18-tern-0.9.3-upgrade-and-patches.md); [0.9.5 升级证据](../../raw/tern/2026-10-20-tern-0.9.5-upgrade-and-patches.md); [流程复盘与要求](../../raw/tern/2026-10-20-tern-patching-workflow-retro.md); [确定性构建与迁移验收](../../raw/tern/2026-10-21-deterministic-build-and-portability.md)
> Updated: 2026-10-21

## 适用范围与完成标准

当 Tern 升级后需要重新制作网页中文与 Nerd Font 修改，或需要恢复本次客户端时，按本文执行。先验证原版终端的中文与图标：已经满足需求就结束字体修改流程。Markdown 中文预览属于单独问题，不作为是否制作字体补丁的条件。

已成功的实例为 Tern 0.8.3、Maple Mono NF CN 7.9：完整 Regular 与 Bold 字体进入 WASM 新分配的内存，两个实际加载路径改为读取新引用；页面在 `init()` 后、`mount()` 前注入字体。用户已确认 Windows 浏览器的终端中文和 Nerd Font 图标正常。

新版本的地址、长度、family、引用位置及 hash 必须重新确认。发现结构变化就停止套用旧值，报告具体不匹配项。

已登记版本的工具安装、资源获取、构建与验收入口见[跨机器补丁手册](portable-patching-runbook.md)。本文说明字体处理方法与历史证据；时间指令修改另见[时间 API 补丁与验收](time-api-patch-and-verification.md)。

## 重建步骤

### 1. 确认输入资源

记录原版 Tern 版本和 build，取得同版本 JavaScript glue 与 WASM。原版服务提供 `/pkg/stencil_tern_web.js`；本次公开 WASM 地址为 `https://build.stencil.so/web/tern/0.8.3/stencil_tern_web_bg.wasm`。

核对 Windows 终端正在使用的 Maple Mono NF CN 与 WSL 字体文件；最新版本以实际官方 release 元数据为准。本次源字体 version 字段为 `Version 7.900`，Windows 与 WSL 的 Regular、Bold hash 一致。

完成条件：原版资源版本一致；输入字体包含所需中文和 Nerd Font 字符；原版保留供对照。

### 2. 创建工作目录并重新生成内存

按关联 raw 的目录清单准备 `pkg/`、`fonts/` 与源码。使用原版 WASM 生成新的初始内存文件，不要求上次的临时文件仍存在。

关联 raw 的“初始化内存的生成方法”保存了标准 WebAssembly API 操作，“原字体定位”保存了实际使用的 FontTools 代码。这个阶段只识别初始数据；客户端启动由后续真实 `init()` 验证。

完成条件：能从新生成的内存解析出目标字体 family、pointer、length 和字符映射。0.8.3 初始内存为 `19,333,120` bytes，两原字体各有 `11,217` 个字符映射。

### 3. 定位描述符与实际 code 引用

在初始化内存中寻找唯一的 little-endian `{pointer, length}` 记录；FontTools 计算字体长度。再用 WABT 反汇编，检查所有实际读取原地址和长度的指令。

本次有两条路径、共八处常量需要更新：直接 font load 调用，以及将 pointer/length 写入临时结构的路径。完整原行号与替换对应关系保存在源码 raw。行号只作历史实例，不能用于新版本直接编辑。

完成条件：目标记录唯一；每个字体 pointer 与 length 的所有实际加载引用均已确认；data 区域与无关的同值常量保持原样。

### 4. 修改指令并编译

二进制/WAT 处理允许程序化执行，补丁工具源码仍使用文件编辑工具修改。需要改写字体常量的版本，把确认的 `i32.const <原值>` 改为 `i32.const <记录地址>` 后接 `i32.load`。保留原版 WASM，输出独立候选模块。

关联 raw 保存了大文件分成原顺序片段、通过 Edit 修改、把片段传给标准 `wat2wasm` 的实际方法及编译脚本。使用浏览器兼容的编译输出，并由实际目标引擎解析；工具验证结果不代替浏览器兼容性检查。

完成条件：标准验证通过；实际引擎可以解析；编译后原固定地址/长度读取已改为描述符读取，覆盖所有已定位路径。

### 5. 准备完整 Maple 字体

关联 raw 的完整 `prepare-fonts.py` 可作为 0.8.3 实例。更新该脚本的内存文件路径、源字体目录、原字体 pointer、Tern/Maple 版本及断言；执行前创建 `fonts/`。

保留字体的完整字形；用原 face 的 name IDs `1, 2, 4, 6, 16, 17` 维持 lookup 名称。版权和授权记录保持原样。

完成条件：保存后的 `getBestCmap()` 和 glyph order 与输入 Maple 相同；中文及 Nerd Font 样本存在；lookup family 与客户端请求一致。

### 6. 同步加载器、清单和页面

完整 `maple.js`、`index.html`、`fonts.json` 均在源码 raw 中，包含 canvas、状态显示、鉴权参数处理及启动错误显示。

必须同步更新：

| 位置 | 需要更新的配置 |
|---|---|
| `prepare-fonts.py` | 输入路径、字体版本断言、原 pointer、清单版本、修改版 WASM 路径 |
| `maple.js` | WASM hash、加载路径、`SLOTS`、清单版本校验 |
| `fonts.json` | 由生成器产生的新 hash、字体长度、原记录与 lookup family |
| `index.html` | 匹配的 glue 路径、加载脚本缓存版本 |
| `serve.py`、`daemon.py` | 实际可执行路径、daemon socket、可用端口 |

保持 `init()` → 分配内存 → 写完整字体 → 更新引用 → `mount()` 的顺序。每次 malloc 后重新取得 memory view，使用 allocator 返回值，不复制历史新地址。任何版本、长度、hash 或原记录不匹配都停止启动。

完成条件：各处版本和 hash 相符；字体文件、清单及页面引用全部可解析；没有旧资源与新模块混用。

### 7. 分层验收和运行

源码 raw 保存了实际执行的非视觉检查源码：原版与修改版 imports/exports、初始内存、真实 Chromium 的 `init()`、字体引用与 header、HTTP 以及原 token 的 `/wire` 认证。

按实际环境更新其 Playwright 和 Chromium 路径。token 只在运行时提供，不写源码或报告。初始化通过不等于最终字形通过；Windows 浏览器中的中文、图标、光标、字符宽度和刷新行为需要独立验收。没有 GPU adapter 的 headless 环境只能报告其实际覆盖阶段。

启动 daemon，验证 `tern ls --json` 成功，再启动独立端口的修改版服务。本次目录缺少 `plugins/` 时需在启动前创建。以当前可连接状态判断 daemon 就绪，不只检查旧 socket 或过去的 ready 通知。

完成条件：模块与资源检查通过；daemon 可连接；用户网址及 WebSocket 可用；实际渲染验收的执行者与结果明确。Markdown 回归另按相关问题文章进行。

## 0.8.3 历史映射

| 替换文件 | 原 pointer | 原 length | pointer 记录 | length 记录 | 保存的 Maple bytes |
|---|---:|---:|---:|---:|---:|
| Regular | 4299258 | 2288420 | 8962760 | 8962764 | 20,564,496 |
| Bold，对应原 Medium | 6587678 | 2313308 | 8962784 | 8962788 | 20,517,844 |
原 lookup family 分别是 `BerkeleyMono Nerd Font` 与 `BerkeleyMono Nerd Font Medium`。修改版 WASM SHA-256 为 `dba5a764b1e225d451b6376757e247214ec1002f60d2ae26dfb75574cc2e2d9b`。完整源码、输入 hash 和验证结果以关联 raw 为准。


## 0.9.3 历史映射

| 替换文件 | 原 pointer | 原 length | pointer 记录 | length 记录 | 保存的 Maple bytes | 槽位 |
|---|---:|---:|---:|---:|---:|---:|
| Regular | 4367806 | 2288420 | 9031308 | 9031312 | 20,564,496 | 9031308 |
| Bold，对应原 Medium | 6656226 | 2313308 | 9031332 | 9031336 | 20,517,844 | 9031332 |

原 lookup family 分别是 `BerkeleyMono Nerd Font` 与 `BerkeleyMono Nerd Font Medium`。修改版 WASM SHA-256 为 `bcb60f010b308af22da907513c992b073a51fd427b8702da3b9a6425ec8d1492`，glue SHA-256 `99d2c293…`。原版两份字体仍无 CJK 字符（各 11217 个字符映射）。完整源码、输入 hash 和验证结果以关联 raw 为准。


## 0.9.5 历史结果

此版本通过运行时分配完整字体并更新 descriptor 完成注入，归档没有修改字体相关 WAT 常量。时间补丁与字体注入分别验收，不能把旧版本字体常量修改步骤直接用于此版本。

Regular、Bold 各保留 33091 个字符映射，其中 20976 个属于证据记录的 CJK 范围；两份字体 hash 与 0.9.4 证据一致。初始化和数据检查覆盖了实际字体注入；精确 fallback 顺序与最终字形外观未由这些检查证明。

正式入口曾在无 token 的 headless 环境完成初始化与注入，没有执行 mount/WebSocket。完整 GPU 和 native desktop UI 未验证，不能由 Web 模块初始化推断其他平台表现。

## 确定性资产装配与页面验收（2026-10-21 工具状态）

`assets` CLI 从已通过 `check-build` 的 bundle 与 `font_manifest.py` 输出装配站点目录：`fonts.json` 的 `wasmSha256` 必须等于已验证 bundle 的 candidate（绝不接受 test 模块）；字体恰为 Regular、Bold 两份，URL 固定为 `./pkg/MapleMono-NF-CN-<style>.ttf`；slot、expectedPointer、expectedLength、bytes 必须是正安全整数且槽位间隔至少 8；叶文件或父目录经 symlink 越界即拒绝。输出含 index.html、maple.js、fonts.json、pkg/client.wasm、pkg/client.js、两份字体和逐文件记录 SHA-256 的 deploy-manifest.json。

`verify-page` 只访问无凭据、无 query 的 loopback 真实入口，页面内监测并拒绝 WebSocket 构造（构造时抛出错误）。检查序列为 page_served、headless_forced、page_ready、fonts_injected、candidate_hash、websocket_absent；wire_mount 与 gpu_interaction_full 恒 `not_run`。fonts_injected 要求页面自报的 family 为 `Maple Mono NF CN` 且恰有 Bold、Regular 两份；candidate_hash 要求页面自报的 candidate SHA-256 与本次导航实际服务的 `/pkg/client.wasm` 字节一致。字体或模块 hash 错误路径体现为 fonts_injected 或 candidate_hash `failed`。

2026-10-21 已观察：`font_manifest.py` 真实生产退出 0，产出 fonts.json 与两份字体；字符映射与 CJK 计数、两个字体 SHA-256 与上文 0.9.5 历史结果一致；全量 Bun 测试最终 61 pass / 0 fail（7 个测试文件）。`assets` 真实 CLI 用已验证 bundle 与上述 fonts 生成 `workflow-eV2Po2/site`（index.html、maple.js、fonts.json、pkg/ 与 deploy-manifest.json，7 个文件逐字节 hash 核对）。verify-page 正常路径 6 项 passed、2 项 not_run（退出 0）；错误字体 hash 路径仅经 HTTP 替换 `/fonts.json` 响应，3 项 failed、3 项 passed、2 项 not_run（退出 1）；receipt 为 `real-page-smoke.json` 与两份报告。未验证：完整 GPU、mount、native desktop UI、其他物理机器与操作系统。

## See Also

- [Tern：TSP 与 browser 后端](tsp-and-browser-backend.md)
- [Tern 网页 Markdown 中文触发无响应](web-markdown-cjk-freeze.md)
