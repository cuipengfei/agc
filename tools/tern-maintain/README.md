# Tern 升级辅助工具

运行目录为 `tools/tern-maintain`。本工具与配置同步独立，不修改 manifest，不写入来源配置，不提交 Git。

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

`decision: manual_review_required` 表示需要通过文件编辑工具修改 compiler 生成的文本源，再通过标准 WASM compiler 编译。工具不自动修改指令、不调用 Binaryen mutation/optimization API，不从旧版本地址表套用新版本。未知结构不能据此批准部署。当前工具不会自动生成完整可编译的替换函数。

已有 Tern 0.9.2、0.9.3 和 0.9.4 的补丁分别保存在 `~/.local/share/tern-web-0.9.2/`、`~/.local/share/tern-web-0.9.3/`、`~/.local/share/tern-web-0.9.4/`。这里不保存 WASM、字体文件或凭据；补丁的函数编号和行为结果以对应目录的 `PATCH.md` 为证据。升级时不能将旧版本验证结果直接用于新版本。

0.9.4 的人工 WAT 源码、原版 hash、分片位置和重建步骤另见 [`patches/0.9.4/README.md`](patches/0.9.4/README.md)。源码归档保留修改的指令；完整 WAT 和 WASM 保存在仓库外。

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

`verify-time.mjs` 保留实际模块的时间回归。测试模块由标准 compiler 的独立文本副本，通过文件编辑工具增加对应 `profiles/<version>.json` 中列出的五个 exports 后编译；不修改候选模块。当前包含 0.9.2、0.9.3 和 0.9.4 的 profile。编译产物放在已忽略的 `artifacts/`，后续验收可直接复用，不需要重新生成整个 WAT。

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

GitHub Actions 工作流运行 Bun 行为测试、FontTools 字体数据测试及同步项目现有 unittest；不会下载真实 WASM，不启动桌面浏览器，不访问本机凭据。本机实际验收结果保存在 [`evidence/0.9.2.json`](evidence/0.9.2.json)、[`evidence/0.9.3.json`](evidence/0.9.3.json) 和 [`evidence/0.9.4.json`](evidence/0.9.4.json)，大型二进制验收产物保存在已忽略的 `artifacts/`。
