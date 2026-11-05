# Tern 网页客户端：Maple 中文与 Nerd Font 修改及版本迁移

> Sources: Tern 0.8.3 网页客户端实测与用户验收，2026-10-13；会话材料复核与源码补全，2026-10-14；Tern 0.9.3 本地升级与补丁，2026-10-18；Tern 0.9.5 升级与补丁流程复盘，2026-10-20；Tern 确定性构建与迁移验收，2026-10-21；Tern 0.9.7 仅字体部署实测，2026-10-29；Tern 0.9.8 与 0.9.9 仅字体部署与 CI 作用域，2026-11-02；Tern 0.9.10 仅字体部署，2026-11-03；Tern 0.9.12 仅字体部署与 Geist 字体观察，2026-11-05
> Raw: [字体修改证据](../../raw/omp-tips/2026-10-13-tern-web-maple-font-patch-evidence.md); [完整源码与重建记录](../../raw/omp-tips/2026-10-13-tern-web-maple-client-source.md); [运行时与下载](../../raw/omp-tips/2026-10-13-tern-web-runtime-and-download-access.md); [0.9.3 升级、补丁与部署](../../raw/tern/2026-10-18-tern-0.9.3-upgrade-and-patches.md); [0.9.5 升级证据](../../raw/tern/2026-10-20-tern-0.9.5-upgrade-and-patches.md); [流程复盘与要求](../../raw/tern/2026-10-20-tern-patching-workflow-retro.md); [确定性构建与迁移验收](../../raw/tern/2026-10-21-deterministic-build-and-portability.md); [0.9.7 仅字体部署](../../raw/tern/2026-10-29-tern-0.9.7-font-only-deploy.md); [0.9.8 与 0.9.9 部署与 CI 作用域](../../raw/tern/2026-11-02-tern-0.9.8-0.9.9-font-only-and-ci-scope.md); [0.9.10 部署](../../raw/tern/2026-11-03-tern-0.9.10-font-only-deploy.md); [0.9.12 部署](../../raw/tern/2026-11-05-tern-0.9.12-font-only-deploy.md)
> Updated: 2026-11-05

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

## 0.9.7 历史结果

0.9.7 原版两份 BerkeleyMono 仍是各 `11217` 个字符映射、CJK 为 0。`analyze` 的 `panics` 为 `31`，这是全部 `panicFunctions` 数量；按 `time not implemented on this platform` 筛选后为函数 `30815`（18 处调用）与 `30816`（3 处调用），合计 21 处。

| 字体 | 槽位 | 原 pointer | 原 length | 保存的 Maple bytes | Maple SHA-256 |
|---|---:|---:|---:|---:|---|
| Regular | 9108400 | 4444898 | 2288420 | 20564496 | `fe14b378a0a0c299c186bdac3370c0a66c358f44d27283fa8ee004c8ad90a900` |
| Bold，对应原 Medium | 9108424 | 6733318 | 2313308 | 20517844 | `a399807f27b9af23fdb62f878e8cd7eee3c0bdb915d8b2f4395ef3633e89a418` |

两份 Maple 各有 `33091` 个字符映射，其中基本 CJK 字符 `20976`。WASM 保持官方字节，SHA-256 `fafe58c52cc837f81342139da7e147ec2bce25d750b65cdbe533cfd2fc3e65f1`；glue SHA-256 `b5ac5cfb0ad04cd8182f87f23089b02c11faf74fad901c69a28f758662f1d980`。页面在运行时写入字体并更新上述两个描述符。

Windows Chrome 实际访问候选与正式入口：`mounted` 为 true，两份字体注入的槽位与字节数如上表，WebGPU adapter 可用，`framesReceived` `18`，`pageErrors` 为空。正式升级后四个 pane ID 保持不变，运行进程的 binary SHA-256 为 `c6cc3765acade43c12ca90a7f97c78f47d242231bb035f89ec6de689fc96e759`，与安装文件一致。该版本没有应用时间补丁。

## 0.9.8 与 0.9.9：字体族更换与多副本描述符

0.9.8 起原版内嵌字体从 2 份 BerkeleyMono 换成 18 份多族字体。终端等宽字体为 `Ioskeley Mono Term`（weight 400）与 `Ioskeley Mono Term Medium`（weight 500），各 3 份副本，共 6 个描述符槽位。`fonts.py` 报告的字符数从 0.9.7 的 `11217` 降到 `7564`，CJK 计数仍为 0；该数字是扫描器对字符映射的计数，未逐一验证完整 cmap。

| 版本 | Regular 槽位 | Regular pointer | Bold 槽位 | Bold pointer |
|---|---|---|---|---|
| 0.9.8 | 12276428 / 16677588 / 23229332 | 9212823 / 13613983 / 20165727 | 12276452 / 16677612 / 23229356 | 10714787 / 15115947 / 21667691 |
| 0.9.9 | 6975632 / 11396480 / 22820320 | 3912027 / 8332875 / 19756715 | 6975656 / 11396504 / 22820344 | 5413991 / 9834839 / 21258679 |

两版本的槽位数与字体族相同，地址完全不同；`expectedLength` 一致（Regular `1501964`、Bold `1499864`）。同一组内 Regular 与 Bold 槽位相差 24 字节。换版本必须重新测量，不能沿用旧地址。

三份 Regular 共用同一 Maple 文件与 SHA-256 `a575f533481139875243926514a5883dda4f5d24d6bf8c57586d6e146f0dfeec`（`20564520` bytes），三份 Bold 共用 `1f6369330d1e00daa05981ab4832dae9d9c1897553e0e0112964b44d1f572acd`（`20517832` bytes）。`maple.mjs` 按 `style` 分组，每种字体只调用一次 `__wbindgen_malloc`，把同一指针与长度写入该 style 的全部 slot，6 条描述符只占两份内存。生成的两份 Maple 字体各含 `33091` 个字符映射，其中基本 CJK 字符 `20976`。

0.9.9 的 WASM 为 `628f3299db8f904d64676aaeb043d93d62822ada8b6fe493aefdf1adbd155ff7`、glue 为 `cd89d8a856230cf278147e7340b377bcc61aaaf748d18239a9ae9d55b0c8c8f9`；0.9.8 分别为 `1e47421edc41c4776d63c61a39d628891223ed05f90236830ff91bdc983da3f7` 与 `17a9f0bbcd77587a3bb2db7c38d983c1518d59e14369d58c30132e1249435525`。两版装配后 WASM 与 glue 均与 `--official` 输入逐字节一致，未应用时间补丁。正式服务分别为 `tern 0.9.8 (f21d9a3)` 与 `tern 0.9.9 (9c1c09f)`，四个原 pane ID 均保留。两次部署均未执行浏览器视觉检查。

## 0.9.10：描述符回到单副本

0.9.10 的终端等宽字体结构与 0.9.7 相同（每种字体 1 份，共 2 条描述符），但换了字体族、地址与长度：`Ioskeley Mono Term` Regular 槽位 `14894592`、pointer `11830987`、length `1501964`；Bold 槽位 `14894616`、pointer `13332951`、length `1499864`。同一组内两者相差 24 字节。`fonts.py` 报告的字符数仍为 `7564`，CJK 计数为 0。

原始 WASM 的 SHA-256 为 `e308b39e8f41d3406e4567289f3c34f02963bd24527c646d4240bf9dc5085c98`，glue 为 `fb4e5b7dc81769e2a5bbad1a6b4aecd70a0eecb36fc84898499916f215be52a5`；binary 为 `024915230b1446528b89bad16dedd4dca80a66297aee55fd7be81be8c91bc5f0`（版本串 `2ad447b`）。装配后 WASM 与 glue 与 `--official` 输入逐字节一致，未应用时间补丁。正式服务经手工 daemon 与 `web serve --token` 启动，HTTP 200，四个原 pane ID 保留：`326417514501`、`326417514503`、`347892350977`、`536870912003`。用户要求跳过浏览器视觉检查，本次未执行。

替换 Maple 用的两份文件与 0.9.8/0.9.9 相同：Regular `20564520` bytes、SHA-256 `a575f533481139875243926514a5883dda4f5d24d6bf8c57586d6e146f0dfeec`，Bold `20517832` bytes、SHA-256 `1f6369330d1e00daa05981ab4832dae9d9c1897553e0e0112964b44d1f572acd`；各含 `33091` 个字符映射，其中基本 CJK 字符 `20976`。

## 0.9.12：新增 Geist UI 字体与单副本

0.9.12 原版字体清单出现 `Geist`（728 字符、CJK 0）作为 UI 字体，四个字体全部无 CJK 覆盖：Symbols Nerd Font `10624`、Geist `728`、`Ioskeley Mono Term` `7564`、`Ioskeley Mono Term Medium` `7564`。Geist 不在终端等宽范围内，未替换。终端等宽描述符仍是 2 条单副本，结构与 0.9.10 相同，slot 与 pointer 为本版本新值，length 与 0.9.10 完全一致：Regular 槽位 `14896052`、pointer `11832447`、length `1501964`；Bold 槽位 `14896076`、pointer `13334411`、length `1499864`；同组相差 24 字节。

WASM SHA-256 为 `4bf8955a9b33ef840e50780a49e6ea5931a85bbb2d4e77e61138dd9a99077fa0`，glue 为 `02fc147f31459463c364b1bdfa59ad517463c527a0f4be8bfb06fda5ac2bd081`，binary 为 `7983d66f0c7b26d228e06e5f29f68880a93fc79e8ffef807fe80688deba778b7`（版本串 `e498b49`）。装配后 WASM 与 glue 与 `--official` 输入逐字节一致，未应用时间补丁。正式服务经手工 daemon 与 `web serve --token` 启动，`verify-service` 六项与 `verify-page` 六项 applicable 全过，HTTP 200，四个原 pane ID 保留：`326417514501`、`326417514503`、`347892350977`、`536870912003`。真实浏览器 mount 与 WebSocket frame 未采集，记 `not_run`；WSL 本机 headless Chromium 的 `requestAdapter()` 在三种 GPU 开关组合下均返回 null。

替换 Maple 用的两份文件与 0.9.10 相同：Regular `20564520` bytes、SHA-256 `a575f533481139875243926514a5883dda4f5d24d6bf8c57586d6e146f0dfeec`，Bold `20517832` bytes、SHA-256 `1f6369330d1e00daa05981ab4832dae9d9c1897553e0e0112964b44d1f572acd`；各含 `33091` 个字符映射，其中基本 CJK 字符 `20976`。

## 确定性资产装配与页面验收（2026-10-21 工具状态）

`assets` CLI 支持两种输入。`--bundle` 从已通过 `check-build` 的构建包装配；`--official` 从 `prepare` 取得的官方原版目录装配，此时读取 `inputs.json` 的 version、WASM SHA-256 与 glue SHA-256，核对实际文件后逐字节复制，并在 `deploy-manifest.json` 记录 `mode` 为 `font-only`、`wasmUnmodified` 为 true。两种模式都要求 `fonts.json` 的 `wasmSha256` 与实际模块一致；描述符至少两条（0.9.7、0.9.10 与 0.9.12 为每种字体 1 份共两条，0.9.8/0.9.9 为每种字体三副本共六条），每条的 style 必须是 `Regular` 或 `Bold`，URL 以 `./pkg/MapleMono-NF-CN-` 开头；slot、expectedPointer、expectedLength、bytes 必须是正安全整数，任意两条的槽位间隔至少 8；叶文件或父目录经 symlink 越界即拒绝。字体文件按每条描述符的 URL 从 `--fonts` 目录读取，因此多副本清单可以各自带 slot 后缀。输出含 index.html、maple.js、fonts.json、pkg/client.wasm、pkg/client.js、字体文件与逐文件记录 SHA-256 的 deploy-manifest.json。

装配时还核对 glue 与模板的 `mount` 参数类型是否一致：从 `client.js` 的 JSDoc `@param` 读取声明类型，与 `index.template.html` 中 `mount(canvas, …)` 的实参形式对照。0.9.7 声明 `string`、模板传字符串；0.9.8 起声明 `string[]`、模板传数组。两者不一致时按 glue 声明改写模板后写入站点，glue 中识别不到 `mount` 导出时跳过对照（测试 fixture glue 不实现 mount）。

`verify-page` 只访问无凭据、无 query 的 loopback 真实入口，页面内监测并拒绝 WebSocket 构造（构造时抛出错误）。检查序列为 page_served、headless_forced、page_ready、fonts_injected、candidate_hash、websocket_absent；wire_mount 与 gpu_interaction_full 恒 `not_run`。fonts_injected 要求页面自报的 family 为 `Maple Mono NF CN` 且恰有 Bold、Regular 两份；candidate_hash 要求页面自报的 candidate SHA-256 与本次导航实际服务的 `/pkg/client.wasm` 字节一致。字体或模块 hash 错误路径体现为 fonts_injected 或 candidate_hash `failed`。

2026-10-21 已观察：`font_manifest.py` 真实生产退出 0，产出 fonts.json 与两份字体；字符映射与 CJK 计数、两个字体 SHA-256 与上文 0.9.5 历史结果一致；全量 Bun 测试最终 61 pass / 0 fail（7 个测试文件）。`assets` 真实 CLI 用已验证 bundle 与上述 fonts 生成 `workflow-eV2Po2/site`（index.html、maple.js、fonts.json、pkg/ 与 deploy-manifest.json，7 个文件逐字节 hash 核对）。verify-page 正常路径 6 项 passed、2 项 not_run（退出 0）；错误字体 hash 路径仅经 HTTP 替换 `/fonts.json` 响应，3 项 failed、3 项 passed、2 项 not_run（退出 1）；receipt 为 `real-page-smoke.json` 与两份报告。未验证：完整 GPU、mount、native desktop UI、其他物理机器与操作系统。

## See Also

- [Tern：TSP 与 browser 后端](tsp-and-browser-backend.md)
- [Tern 网页 Markdown 中文触发无响应](web-markdown-cjk-freeze.md)
