# Tern 升级辅助工具

运行目录为 `tools/tern-maintain`。本工具与配置同步独立，不修改 manifest，不写入来源配置，不提交 Git。

## 0.9.5 本机验收

正式 daemon、Web 和安装 binary 已统一为 `0.9.5 (2863c37)`，端口继续使用 `8378`，保留原认证文件及升级前的 pane 集合。后台进程由 `runtime.mjs __redact` 管理。

[`evidence/0.9.5.json`](evidence/0.9.5.json) 来自正式服务与实际资源。部署目录 `~/.local/share/tern-web-0.9.5/verification/` 另保存实际入口初始化检查、非空 pane 隔离升级和正式升级报告。入口检查没有 token，不执行 mount 或完整 GPU 交互。

人工 WAT 修改记录保存在 [`patches/0.9.5/`](patches/0.9.5/README.md)：26 处调用点替换、两个完整时间函数、独立测试 exports、原版定位清单和锁定全部输入 hash 的 [`recipe.json`](patches/0.9.5/recipe.json)。原临时分片已清理，本归档手工恢复自会话编辑记录。

0.9.4 与 0.9.5 的完整重建已用确定性路径实际完成：`build` 重放 recipe、`check-build` 校验构建包，真实 smoke `workflow-eV2Po2` 以 308.22s、退出码 0 通过。两个版本的 candidate、独立测试模块、glue、profile 四处 SHA-256 与 recipe 锁定值完全一致（0.9.4 candidate `f5f8e036…5a75`、测试模块 `b6017a4b…9c9a9c`；0.9.5 candidate `b132e0fe…eefdbe`、测试模块 `ce28ecb4…9cc0d`），结构检查与六项真实时间行为检查均重新执行并通过。0.9.5 完整构建包另经 portable 复制、删除私有初始输入与原包后，在 fresh HOME 用 `rebuild` 重建并通过 `check-build`，candidate 与测试模块 hash 不变。实际结果记录于 `raw/tern/2026-10-21-deterministic-build-and-portability.md`，receipt 为 `artifacts/workflow-eV2Po2/portability-smoke.json`。

时间行为以重建后重新执行的六项真实时间检查为准（0.9.4 与 0.9.5 均通过）。原版时间分支的用户操作可达性及 native desktop 全部 UI 路径未验证。完整范围见验收记录中的 `skipped`。

WAT 中间表示、补丁、测试模块和验收报告允许程序化生成、组装、编译与验证；维护工具自身的程序源码使用文件编辑工具维护。


## 安装与行为检查

```bash
bun install --frozen-lockfile
bun test
uv run --with-requirements requirements.txt python -m unittest discover -s python_tests -v
```

进程身份测试需要 Linux `/proc`、`cc` 和 Python 3；HTTP 与 WebSocket 夹具使用 Bun 的标准接口。

字体工具使用 FontTools 和 JSON Schema；通过 `uv run --with-requirements requirements.txt python ...` 运行，无需改变同步项目的 Python 环境。

## 获取与定位

`fetch` 从**不带认证参数的本机 Tern 原生网页服务**读取官方 WASM URL 和 SHA-384 SRI。版本通过 URL 计算，下载内容必须通过 SRI。官方网页结构变化或地址不符合要求时立即报错。输出目录必须不存在。

```bash
bun cli.mjs fetch --url http://127.0.0.1:PORT --out /tmp/tern-candidate
bun cli.mjs memory --wasm /tmp/tern-candidate/pkg/original.wasm --out /tmp/tern-initial.bin
uv run --with-requirements requirements.txt python fonts.py /tmp/tern-initial.bin --out /tmp/tern-fonts.json
bun cli.mjs analyze --wasm /tmp/tern-candidate/pkg/original.wasm --fonts /tmp/tern-fonts.json --out /tmp/tern-plan.json
```

`prepare` 从指定的原生 binary 启动随机 loopback 端口的临时 Web 服务，取得并校验官方资源，随后结束该临时服务。认证值仅供本次获取使用，不接触既有 daemon、Web 服务或 pane：

```bash
bun cli.mjs prepare --binary /path/to/new/tern --out /tmp/tern-original
```

内存初始化只提供会明确报错的 import 函数。初始化期间调用 import 或出现不支持的 import 类型，分析就会停止。输入须为可信官方模块；此过程会执行模块的 start function，不能将工具作为不可信 WASM 的隔离环境。

FontTools 读取内嵌字体的 family、长度、cmap 和中日韩样例。分析器根据实际 pointer/length 对搜索唯一 descriptor，报告全部直接调用、函数表引用、时间 import 和局部指令上下文。遇到未支持的 Binaryen IR 节点立即报错。短函数中的平台 panic 文本属于候选定位，不能据此断言实际故障或完整可达性。

函数索引 `index` 包含 imports；Binaryen 的 `name` 可能采用另一套编号。人工检查使用 `index`：

```bash
bun cli.mjs function --wasm /tmp/tern-candidate/pkg/original.wasm --index NUMBER --out /tmp/tern-function.json
```

报告只包含所选函数。正常分析不生成整个 WAT、不按字符串猜测 instruction 边界。`manualEdits` 包含时间 panic 的局部后续指令及成对 i64/i32 loads 推导出的 timestamp buffer 候选；这些候选仍需结合 ABI 审核，尤其是 elapsed 输入与输出。

## 修改和编译

`decision: manual_review_required` 表示新版本的指令位置、ABI 和替换语义需要人工审核。WAT 中间表示可由程序生成、组装，再通过标准 WASM compiler 编译。未知结构不能据此批准部署，不从旧版本地址表套用新版本。

已有 Tern 0.9.2、0.9.3 和 0.9.4 的补丁分别保存在 `~/.local/share/tern-web-0.9.2/`、`~/.local/share/tern-web-0.9.3/`、`~/.local/share/tern-web-0.9.4/`。这里不保存 WASM、字体文件或凭据；补丁的函数编号和行为结果以对应目录的 `PATCH.md` 为证据。升级时不能将旧版本验证结果直接用于新版本。

0.9.4 的人工 WAT 源码、原版 hash、分片位置和重建步骤另见 [`patches/0.9.4/README.md`](patches/0.9.4/README.md)。源码归档保留修改的指令；完整 WAT 和 WASM 保存在仓库外。

## 确定性构建与固定 WABT

已登记版本（当前为 0.9.4、0.9.5）用 recipe 确定性重建。recipe 锁定 WABT 版本、原版/candidate/测试模块/glue/profile 的 SHA-256、原版 WAT 行数和每处片段对原文的 hash 断言。`build` 流式重放片段生成候选 WAT 与测试 WAT，用固定 WABT 编译并逐一核对两个输出 hash，执行结构检查与真实时间行为检查，组装完整构建包后 `check-build` 自检；期望 hash 绝不因失败改写，失败构建保留目录供检查。`check-build` 只承认 `passed`：`not_run` 不等于通过（结构报告仅 `time_behavior`/`full_ui` 允许 `not_run`，时间报告要求六项全部 `passed`），未知检查名同样使校验失败。测试 exports 在 recipe 锁定原版行之前插入（insertBefore）；锁定行不要求一定是 export（0.9.4 为首个 export，0.9.5 为 exports 之后的 elem 行）。anchor 可位于 replace 区间内，此时替换片段必须包含唯一原文 anchor。

WAT 写流失败时会立即关闭 readline 和子进程 stdout、终止输入子进程，并取消另一写流的 drain 等待；保留首个写入错误与失败目录。补丁原文校验等失败原因会在清理前保存，清理产生的后续 stream error 不替换该原因。独立子进程回归覆盖“输入仍在等待时发生真实 EISDIR”，断言原始错误、生产者退出信号与失败目录状态。

WABT 用固定脚本安装：仅支持 Linux x86_64，安装目录必须不存在；下载官方 `wabt-1.0.42-linux-x64.tar.gz`，解压前校验 SHA-256，并要求 `wat2wasm`/`wasm2wat` 两个 binary 精确报告 `1.0.42`。2026-10-21 已在原机实测通过（`bash ci/install-wabt.sh /tmp/tern-wabt-verified-20261021-ok`）；其他平台未验证。最后一行 stdout 为包含 `wat2wasm`/`wasm2wat` 的 bin 目录：

```bash
bash ci/install-wabt.sh /absolute/path/to/new-wabt-dir
```

```bash
bun cli.mjs build --original /path/to/original.wasm --glue /path/to/client.js \
  --profile profiles/0.9.4.json --recipe patches/0.9.4/recipe.json \
  --wabt-dir /absolute/path/to/new-wabt-dir/wabt-1.0.42/bin \
  --out /tmp/tern-bundle
bun cli.mjs check-build --bundle /tmp/tern-bundle
bun cli.mjs rebuild --bundle /tmp/tern-bundle \
  --wabt-dir /absolute/path/to/new-wabt-dir/wabt-1.0.42/bin \
  --out /tmp/tern-rebuilt
bun cli.mjs assets --bundle /tmp/tern-bundle --fonts /tmp/tern-font-assets \
  --out /tmp/tern-site
bun cli.mjs verify-page --url http://127.0.0.1:PORT \
  --playwright-module /path/to/playwright/index.mjs \
  --chromium-executable /path/to/chrome --out /tmp/tern-page.json
```

构建包包含 `original.wasm`、`glue.js`、`profile.json`、`recipe.json`、全部 `parts/` 与 `exports/` 片段、`candidate.wasm`、`test.wasm`、`structure.json`、`time.json` 和 `build.json`；`build.json` 记录构建工具源码（`build.mjs`、`analyze.mjs`、`resources.mjs`、`interface.mjs`、`verify-time.mjs`、`package.json`、`bun.lock`）的 SHA-256 以及 WABT 与运行时版本。`rebuild` 仅凭包内相对路径输入重建到新目录，是跨机器重建所需的全部输入，不需要原机器的绝对路径或历史临时文件；工具源码身份与构建记录不一致时校验停止，不手工修改清单。

`assets` 将通过 `check-build` 的候选 WASM（绝不接受测试模块）、glue、字体清单、两份完整 Maple 字体、加载器和 `index.template.html` 生成的实际入口页面装配到新目录，写入 `deploy-manifest.json` 记录每个输出文件的实际 SHA-256；输出目录必须不存在。`verify-page` 强制 headless，访问 `assets` 生成的真实 `index.html` 入口，页面在浏览器内执行真实 WASM init 与字体注入；检查按页面自己发布的结构化状态核对初始化完成、两份字体真实注入、页面报告的 candidate SHA-256 与服务字节一致、全程零 WebSocket 构造；无 token 入口不执行 mount，完整 GPU 交互与 mount 始终记 `not_run`。真实页面 smoke（`workflow-eV2Po2`）对该入口通过：6 passed（含 page_ready、fonts_injected、candidate_hash）、2 `not_run`；把 `fonts.json` 中任一 font SHA-256 改写后 verify-page 退出 1，`page_ready`/`fonts_injected`/`candidate_hash` 失败并拒绝，其余检查不受影响（`artifacts/workflow-eV2Po2/real-page-smoke.json`、`real-page-valid.json`、`real-page-invalid-font-hash.json`）。

## 字体清单

使用完成指令修改并编译后的 WASM、对应初始内存和完整 Maple Regular/Bold 原始文件：

```bash
uv run --with-requirements requirements.txt python font_manifest.py \
  --plan /tmp/tern-plan.json --memory /tmp/tern-initial.bin --wasm /tmp/candidate.wasm \
  --regular /path/to/MapleMono-NF-CN-Regular.ttf \
  --bold /path/to/MapleMono-NF-CN-Bold.ttf --out /tmp/tern-font-assets
```

输出 `fonts.json` 和两份字体数据。工具核对初始内存 SHA-256，用 FontTools 从原始内嵌字体复制 lookup name records，保留 Maple 的完整 cmap、glyphs 和其他表，并检查中日韩及 Nerd Font 样例、转换前后的完整 cmap。两个字体都计算完整文件 SHA-256，descriptor 地址来自分析报告。新目录配合本目录 `maple.mjs` 使用，网页将其作为 `maple.js` 引入；manifest 指定的模块资源为 `pkg/client.wasm`。代码文件的安装由文件编辑工具处理，工具不自动改写现有网页。字体加载器在两个字体都完成校验后才修改 descriptor。

## 验证

```bash
bun cli.mjs verify --original /tmp/tern-candidate/pkg/original.wasm --candidate /tmp/candidate.wasm --out /tmp/tern-structure.json
bun cli.mjs browser --url http://127.0.0.1:PORT \
  --playwright-module /path/to/playwright/index.mjs \
  --chromium-executable /path/to/chrome --out /tmp/tern-browser.json
```

结构报告检查 imports、exports、函数签名、内存限制和初始内存。时间精度、进位、跨秒相减、饱和时长和 externref 生命周期需要对应版本的实际行为测试；结构报告会将未执行项写为 `not_run`，`deployable` 始终为 `false`，不得将它当成自动部署批准。浏览器检查强制 `headless: true`，初始化实际模块并验证完整字体注入，不打开桌面窗口。完整 GPU/Markdown/笔记操作没有通过这项检查得到证明。

`verify-time.mjs` 保留实际模块的时间回归。测试模块由独立 WAT 副本增加对应 `profiles/<version>.json` 中列出的五个 exports 后编译，不修改候选模块。当前包含 0.9.2、0.9.3、0.9.4 和 0.9.5 的 profile。编译产物放在已忽略的 `artifacts/`，后续验收可直接复用，不需要重新生成整个 WAT。

```bash
bun verify-time.mjs --candidate /path/to/instant.wasm \
  --test-module artifacts/0.9.2-time.wasm --glue /path/to/client.js \
  --profile profiles/0.9.2.json --out /tmp/tern-time.json
```

验收会核对候选 SHA-256、五个实际函数的签名与函数体、imports、额外 exports 和初始内存，再执行日历时间转换、小数精度、输出边界、跨秒相减、饱和时长、真实 consumer 及一万次 externref 复用检查。profile 仅用于固定 SHA 的行为验收；升级分析不读取它。新版本需要经过人工审核的对应测试 profile。

时间报告记录实际使用的 profile 与 glue 文件 SHA-256。生成验收记录时，这两个 hash 必须与提供的文件一致。

`probe.mjs` 在随机 loopback 端口映射指定资源，使用新 `maple.mjs` 完成实际无界面加载，不连接 daemon：

```bash
bun probe.mjs --fonts /tmp/tern-font-assets --wasm /path/to/candidate.wasm \
  --glue /path/to/client.js --playwright-module /path/to/playwright/index.mjs \
  --chromium-executable /path/to/chrome --out /tmp/tern-font-browser.json
```

真实获取烟雾检查：`bun smoke.mjs /path/to/tern`。它使用随机空闲端口和临时认证值，启动独立原生 web 服务，检查真实下载与 SRI，然后仅终止自己创建的 web 进程；不创建或关闭 pane，不影响原有服务。

## 后台服务

```bash
bun cli.mjs status --binary /path/to/tern --socket /path/to/daemon.sock --port PORT
bun cli.mjs start --binary /path/to/tern --socket /path/to/daemon.sock --port PORT \
  --assets /path/to/reviewed-assets --state-dir /path/to/local-state
```

`start` 仅用于已经人工审核并完成行为验证的资源目录；结构报告不会自动调用它。端口已占用或状态目录已有 PID 记录时拒绝启动，保留原服务。为每个 web 进程指定独立的私有 `state-dir`，目录放在仓库外；工具生成独立认证文件和脱敏日志，检查前后 pane 状态，不终止已有 daemon。真实隔离烟雾检查入口为 `bun runtime-smoke.mjs /path/to/tern /path/to/assets`，仅结束自身创建的进程。

### 运行身份与统一升级

`inspect-runtime` 动态识别指定 socket 和端口对应的实际 tern 子进程，读取其运行 binary 的版本、SHA-256、device/inode，并单独记录 manager PID。它不重启服务。`verify-service` 检查实际服务资源、页面版本以及缺失、错误和有效认证值的 WebSocket 行为，认证文件仅在内存读取。

```bash
bun cli.mjs inspect-runtime --binary /path/to/installed/tern \
  --socket /path/to/daemon.sock --port PORT --out /tmp/runtime.json
bun cli.mjs verify-service --url http://127.0.0.1:PORT \
  --assets /path/to/reviewed-assets --token-file /path/to/private-token \
  --version 0.9.4 --out /tmp/service.json
```

`upgrade` 是明确执行服务切换的命令。调用前应已完成对应版本的人工指令审核与行为验证。它确认进程归属，保存当前 pane 集合，等待目标 manager 和 tern 子进程退出后原子替换安装 binary，以原有 socket、端口和认证文件启动新版，再检查实际版本、服务资源、认证和 pane 集合。manager 必须通过 `--` 明确携带相同子进程命令，且只管理该子进程；遇到不明确的进程归属即停止，不终止无关服务。

```bash
bun cli.mjs upgrade --binary /path/to/installed/tern \
  --candidate-binary /path/to/new/tern --socket /path/to/daemon.sock --port PORT \
  --assets /path/to/reviewed-assets --state-dir /path/to/new-private-state \
  --token-file /path/to/existing-private-token --version 0.9.4 --out /tmp/upgrade.json
```

### 从实际报告生成验收记录

`evidence` 使用专用 schema，核对实际输入文件与结构、时间、字体、运行身份、服务和无界面初始化报告。目标版本、候选 SHA、profile 与各报告必须一致；实际 daemon/Web 的版本和文件身份必须与安装 binary 一致。缺少必要报告、检查失败或相互矛盾时拒绝生成记录。输出文件必须不存在。

```bash
bun cli.mjs evidence --version 0.9.4 \
  --original /path/to/original.wasm --candidate /path/to/client.wasm \
  --glue /path/to/client.js --profile profiles/0.9.4.json \
  --structure-report /tmp/structure.json --time-report /tmp/time.json \
  --font-report /path/to/fonts.json --headless-report /tmp/headless.json \
  --runtime-report /tmp/runtime.json --service-report /tmp/service.json \
  --skipped /path/to/skipped.json --out /tmp/evidence.json
```

`skipped.json` 是列明未执行事项及原因的 JSON object，必须提供 `visualTests`、`fullGpuAndApplicationInteraction`、`syncProjectTests` 和 `sofa`，也可记录其他未执行事项，例如 `{"visualTests":"用户要求不执行视觉测试","fullGpuAndApplicationInteraction":"用户要求不执行完整 GPU 交互","syncProjectTests":"未修改同步实现","sofa":"连接不可用"}`。每个原因都必须为非空字符串。分层报告中的 `not_run` 会保留原因；独立时间报告可以证明时间行为，结构检查本身继续保留其验证范围。跳过项目不记为通过。

GitHub Actions 工作流运行 Bun 行为测试、FontTools 字体数据测试及同步项目现有 unittest；不会下载真实 WASM，不启动桌面浏览器，不访问本机凭据。本机实际验收结果保存在 [`evidence/0.9.2.json`](evidence/0.9.2.json)、[`evidence/0.9.3.json`](evidence/0.9.3.json)、[`evidence/0.9.4.json`](evidence/0.9.4.json) 和 [`evidence/0.9.5.json`](evidence/0.9.5.json)，大型二进制验收产物保存在已忽略的 `artifacts/`。
