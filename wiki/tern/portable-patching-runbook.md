# Tern 跨机器补丁手册

> Sources: Tern 补丁流程要求与时间补丁归档，2026-10-20；确定性构建与迁移验收，2026-10-21；Tern 0.9.7 仅字体部署与复现工具实测，2026-10-29；Tern 0.9.8 与 0.9.9 部署及重启启动路径，2026-11-02；Tern 0.9.10 部署与 site 目录核对，2026-11-03；Tern 0.9.12 部署与 GPU adapter 实测，2026-11-05
> Raw: [补丁流程要求](../../raw/tern/2026-10-20-tern-patching-workflow-retro.md); [0.9.5 补丁与时间验收](../../raw/tern/2026-10-20-tern-0.9.5-upgrade-and-patches.md); [确定性构建与移植验收](../../raw/tern/2026-10-21-deterministic-build-and-portability.md); [0.9.7 仅字体部署](../../raw/tern/2026-10-29-tern-0.9.7-font-only-deploy.md); [复现工具误报与重绘判据](../../raw/tern/2026-10-29-browser-reproduction-redraw-guard.md); [0.9.8 与 0.9.9 部署与 CI 作用域](../../raw/tern/2026-11-02-tern-0.9.8-0.9.9-font-only-and-ci-scope.md); [0.9.10 部署](../../raw/tern/2026-11-03-tern-0.9.10-font-only-deploy.md); [0.9.12 部署](../../raw/tern/2026-11-05-tern-0.9.12-font-only-deploy.md)
> Updated: 2026-11-05

## 使用对象与边界

本手册供另一台机器上的 Agent 使用。工具位于本仓库 `tools/tern-maintain/`；wiki 提供执行顺序、必要输入和验收范围。补丁构建、模块身份、片段断言、报告关联与输出完整性由代码判定。

已登记版本使用经过审核的 recipe。recipe 是 JSON 补丁清单，固定原版 SHA-256、WABT 版本、原始 WAT 行数、每处原文断言、替换片段、候选与测试模块身份。版本名称相同仍须通过全部 hash 检查。

未知原版需要重新分析时间语义、调用方 ABI 和字体位置，并审核新 recipe/profile。原版 hash 不匹配时立即停止，不修改期望 hash、不套用历史函数编号，也不把失败或未执行的检查改成通过。

工具只处理可信官方模块。初始化过程会执行 WASM 的 start function，不提供执行不可信代码所需的隔离环境。以下构建与无 token 页面检查不切换正式服务，不连接或操作 pane。

## 前置输入

- 本仓库工具及其锁定依赖；在 `tools/tern-maintain/` 执行 `bun install --frozen-lockfile`。
- 固定 WABT 工具链，用仓库脚本安装：`bash ci/install-wabt.sh <全新目录>`。脚本仅支持 Linux x86_64、要求目录不存在，下载官方 `wabt-1.0.42-linux-x64.tar.gz` 并校验 SHA-256，且 `wat2wasm --version`、`wasm2wat --version` 必须精确等于 `1.0.42`；最后一行 stdout 为 bin 目录。2026-10-21 已在原机实测通过；Windows、macOS 与其他架构未验证，需先自行确认工具链一致性。本次登记补丁使用 `1.0.42`。
- 对应版本的可信 Tern native binary，或完整构建包。
- 生成字体资源时，提供完整的 `MapleMono-NF-CN-Regular.ttf` 和 `MapleMono-NF-CN-Bold.ttf`。字体来源须经过用户授权。
- Python 3、uv；字体命令使用 `requirements.txt` 中的依赖。页面验收另需本机 Playwright module 和 Chromium executable。

所有输出目录均须为新目录。路径由当前机器确定，不使用其他机器的 home 路径、socket、端口或认证文件。构建和字体文件可在私有工作目录保存；真实凭据不进入仓库或报告。

## 从本机原版构建

以下命令在 `tools/tern-maintain/` 执行。`VERSION` 必须选择已登记且与输入 hash 一致的版本；`WORK`、`TERN_BINARY` 与字体文件路径按本机实际位置设置，`WABT_DIR` 由 `install-wabt.sh` 的安装结果确定。

```bash
VERSION=0.9.5
WORK=/absolute/path/to/new-tern-work
TERN_BINARY=/absolute/path/to/tern
MAPLE_REGULAR=/absolute/path/to/MapleMono-NF-CN-Regular.ttf
MAPLE_BOLD=/absolute/path/to/MapleMono-NF-CN-Bold.ttf
mkdir "$WORK"

bash ci/install-wabt.sh "$WORK/wabt"          # 仅 Linux x86_64；目录必须不存在
WABT_DIR="$WORK/wabt/wabt-1.0.42/bin"
bun cli.mjs prepare --binary "$TERN_BINARY" --out "$WORK/original"
uv run --with-requirements requirements.txt python fonts.py \
  "$WORK/original/initial.bin" --out "$WORK/font-inventory.json"
bun cli.mjs analyze --wasm "$WORK/original/pkg/original.wasm" \
  --fonts "$WORK/font-inventory.json" --out "$WORK/plan.json"
bun cli.mjs build --original "$WORK/original/pkg/original.wasm" \
  --glue "$WORK/original/pkg/client.js" --profile "profiles/$VERSION.json" \
  --recipe "patches/$VERSION/recipe.json" --wabt-dir "$WABT_DIR" \
  --out "$WORK/bundle"
bun cli.mjs check-build --bundle "$WORK/bundle"
```

`prepare` 使用随机 loopback 端口的独立临时 Web 服务获取资源，核对官方 SHA-384 SRI，并保存 `inputs.json`、原版 WASM、glue 和初始内存。它结束自己创建的临时服务，不操作现有 daemon。

`build` 重放已审核片段，分别编译候选模块与独立测试模块，执行结构检查和真实时间行为检查，再检查完整构建包。候选模块保持原应用 exports；测试模块额外暴露 profile 指定的测试入口，在 recipe 锁定原版行之前插入（该行不要求一定是 export）。两者不得互相替代。`check-build` 只承认 `passed`：`not_run` 不等于通过，未知检查名同样使校验失败。

## 从完整构建包重建

将整个 bundle 目录复制到另一机器，保留所有文件。安装相同工具及 WABT 后执行：

```bash
bun cli.mjs check-build --bundle /absolute/path/to/copied-bundle
bun cli.mjs rebuild --bundle /absolute/path/to/copied-bundle \
  --wabt-dir /absolute/path/to/wabt-1.0.42/bin \
  --out /absolute/path/to/new-rebuilt-bundle
bun cli.mjs check-build --bundle /absolute/path/to/new-rebuilt-bundle
```

输入路径由工具从包内确定；不需要恢复原机器的绝对路径或历史临时文件。构建包保留 `original.wasm`、glue、profile、recipe、全部补丁片段、候选模块、测试模块、结构报告、时间报告及构建清单 `build.json`；`build.json` 另记录构建工具源码（`build.mjs`、`analyze.mjs`、`resources.mjs`、`interface.mjs`、`verify-time.mjs`、`package.json`、`bun.lock`）的 SHA-256 与 WABT、运行时版本，是跨机器重建所需的全部身份。测试模块缺失、文件变化或报告输入不一致时，完整性检查必须失败。0.9.4 与 0.9.5 的真实重建已完成：双版本 `build` + `check-build` 通过，模块 hash 与 recipe 锁定值一致；0.9.5 完整包复制后删除私有初始输入与原包，在 fresh HOME `rebuild` 并 `check-build` 通过，candidate 与测试模块 hash 不变（真实 smoke `workflow-eV2Po2`，308.22s，退出码 0）。实际结果见 [确定性构建与移植验收](../../raw/tern/2026-10-21-deterministic-build-and-portability.md)，receipt 在 `tools/tern-maintain/artifacts/workflow-eV2Po2/`；物理异机重建仍未实测。

构建工具源码身份也属于清单的一部分。使用与构建记录一致的工具版本；工具身份不一致时停止，不手工修改清单。完整性通过后才可清理大型中间 WAT，不能提前删除重建输入或测试模块。

## 生成字体与实际网页入口

```bash
uv run --with-requirements requirements.txt python font_manifest.py \
  --plan "$WORK/plan.json" --memory "$WORK/original/initial.bin" \
  --wasm "$WORK/bundle/candidate.wasm" \
  --regular "$MAPLE_REGULAR" --bold "$MAPLE_BOLD" \
  --out "$WORK/fonts"
bun cli.mjs assets --bundle "$WORK/bundle" \
  --fonts "$WORK/fonts" --out "$WORK/site"
```

只替换字体、不应用时间补丁时，用 `prepare` 取得的原版目录代替构建包：

```bash
bun cli.mjs prepare --binary /absolute/path/to/tern --out "$WORK/original"
bun cli.mjs assets --official "$WORK/original" \
  --fonts "$WORK/fonts" --out "$WORK/site"
```

`--official` 与 `--bundle` 必须且只能提供一个。该模式读取 `inputs.json` 的 version 与两份 SHA-256，核对实际 WASM 和 glue 后逐字节复制，`deploy-manifest.json` 记录 `mode` 为 `font-only`、`wasmUnmodified` 为 true。字体清单的 `wasmSha256` 仍须等于原版 WASM。0.9.7 的实际结果为：WASM `fafe58c52cc837f81342139da7e147ec2bce25d750b65cdbe533cfd2fc3e65f1`、glue `b5ac5cfb0ad04cd8182f87f23089b02c11faf74fad901c69a28f758662f1d980`，两份字体槽位 `9108400`、`9108424`，字节数 `20564496`、`20517844`。

字体工具保留 Maple 的完整 cmap，并复制内嵌字体需要的 lookup name records。`assets` 将通过检查的候选 WASM 或官方原版 WASM、对应 glue、字体清单、完整字体、加载器和统一入口模板复制到新目录，记录实际文件身份。官方原版输入的文件名为 `official.html` 与 `pkg/original.wasm`，装配时映射为网页引用的名称。

入口执行真实 WASM init 和字体注入，再发布结构化初始化状态。无 token 时显示入口提示，不执行 mount。无 token 验收覆盖初始化、字体注入、模块身份与 WebSocket 缺席；完整 GPU 与应用交互需要具有 token 的实际操作。

## 验收实际入口

在独立终端将新 site 作为 loopback 静态目录提供，不使用正式 Tern 服务或 token：

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory "$WORK/site"
```

随后在工具目录执行：

```bash
bun cli.mjs verify-page --url http://127.0.0.1:8765/ \
  --playwright-module /absolute/path/to/playwright/index.mjs \
  --chromium-executable /absolute/path/to/chrome \
  --out "$WORK/page.json"
```

端口仅为示例，须选择本机空闲端口。`verify-page` 强制 headless，访问 `assets` 从 `index.template.html` 生成的真实 `index.html` 入口，页面在浏览器内执行真实 WASM init 与字体注入。检查按页面发布的结构化状态核对初始化状态、字体注入、实际服务模块 hash，以及没有发生 WebSocket 连接；完整 GPU 和 mount 分别记录为 `not_run`。真实页面 smoke（`workflow-eV2Po2`）对该入口通过：6 passed、2 `not_run`；把 `fonts.json` 中任一 font SHA-256 改写后 verify-page 退出 1 并拒绝（receipt `real-page-smoke.json`、`real-page-valid.json`、`real-page-invalid-font-hash.json`）。

验收后结束自己启动的临时静态服务。正式服务切换需要独立授权，并执行运行身份、认证、资源与 pane 集合检查，入口见[维护工具文章](maintenance-toolkit.md)。

## 真实浏览器复现（Windows）

需要判断中文 Markdown 是否导致页面停止更新时，用 `markdown-windows`；它自带隔离 daemon 与 loopback 服务，不连接正式服务：

```bash
bun cli.mjs markdown-windows --binary /absolute/path/to/tern \
  --assets "$WORK/site" --out "$WORK/markdown.json"
```

工具调用 Windows Node 驱动 Windows Chrome，依次完成 `windows_host`、`windows_node`、`windows_playwright`、`windows_chrome`、`isolated_daemon`、`isolated_web`、`driver_start`、`ascii_markdown_pane`、`pane_closed`、`cjk_appended`、`cjk_markdown_pane`、`cjk_progress` 各阶段。WSL 内 Chromium 缺少 GPU adapter 时该流程不适用；跨系统 CDP 与本机 WSL 浏览器在本机实测均未成功。0.9.12 实测给出具体边界：loopback 安全上下文里 `navigator.gpu` 存在，`requestAdapter()` 在 baseline、`--enable-unsafe-webgpu --ignore-gpu-blocklist`、再加 `--use-angle=swiftshader` 三种组合下均返回 null，`verify-page` 的 `wire_mount` 与 `gpu_interaction_full` 继续记 `not_run`，完整 GPU 挂载证据需另用 Windows Chrome 路径。

结论只按观测分类。`reproduced` 表示有效 ASCII 基线之后中文页面状态查询无响应。`not_reproduced` 要求中文页面仍响应、首帧出现、viewport 输入后 canvas 像素尺寸更新且 GPU 提交增加。`not_run` 表示前置条件不足、驱动超时或未观察到应用重绘，退出码 2。静态截图相同、DOM 选区相同、驱动超时都不作为冻结证据。0.9.7 仅字体版的一次实测：canvas `1280`×`720` 变为 `1360`×`760`，提交 `328` 变为 `334`，`wasmErrors` 为空，cleanup 成功。

报告写入 `--out`，同名 PNG 保存最后画面，认证值不写入报告。临时进程、服务目录、驱动目录与浏览器 profile 由本次运行清理。

## 重启后的启动

机器重启后 `runtime-state` 保留 `tern-daemon.pid`、`tern-web.pid` 与 `web-token`，但进程已不存在。`runtime.start` 在三处都会受阻：PID 文件存在即拒绝启动；`pickTokenFile` 用 `flag: 'wx'` 创建 `web-token`，文件已存在会抛 `EEXIST`；`start` 没有 `tokenFile` 参数，无法指定外部认证文件。

可用路径是保留 `~/.config/tern/web-token`，清掉三个过期状态文件后手工启动：

```bash
VERSION=0.9.10
STATE="$HOME/.local/share/tern-native-$VERSION/runtime-state"
rm -f "$STATE/tern-daemon.pid" "$STATE/tern-web.pid" "$STATE/web-token"
tern daemon --socket "$XDG_RUNTIME_DIR/tern/daemon.sock" &
tern web serve --listen 127.0.0.1:8378 \
  --token "$HOME/.config/tern/web-token" \
  --assets "$HOME/.local/share/tern-web-$VERSION" &
```

`$XDG_RUNTIME_DIR` 在本机（UID 1000）展开为 `/run/user/1000`，`tern` 子目录含 `daemon.sock`；该路径来自运行会话实测。环境变量为空或 `tern` 子目录不存在时，用 `--socket "$XDG_RUNTIME_DIR/tern/daemon.sock"` 前先确认目录；`XDG_RUNTIME_DIR` 未设置的系统按各自登录会话的运行时目录处理，不要把 `/run/user/1000` 当作通用值。

直接启动 `tern web serve` 会把带 token 的入口地址写到 stdout，凭据会进入终端记录；`runtime.start` 与 `lifecycle.upgrade` 通过 `spawnRedacted` 把输出先写入日志再脱敏。启动后核对 `tern --version`、HTTP 状态与 pane 列表；进程存活和根页面 HTTP 200 都不验证认证，认证状态需单独确认。

重建或删除 site 目录前，先用 `deploy-manifest.json` 逐文件核对内容是否有效：hash 与当前 `--official`/`--bundle` 输入一致时可直接复用目录；`verification/` 非空时先把验收记录移出。0.9.10 部署时该步骤在删除之前执行，核对结果记录在对应 raw；0.9.8 与 0.9.9 的 `verification/` 同为空目录。

0.9.12 部署的验收形态：`verify-service` 六项（`served_wasm`、`served_glue`、`versioned_page`、`missing_token_rejected`、`invalid_token_rejected`、`existing_token_accepted`）全过，`verify-page` 六项 applicable 全过，daemon 与 web 进程 `matchesInstalled` 为 true，四个原 pane ID 保留，根路径 HTTP 200。真实 mount 与 WebSocket frame 未采集，记 `not_run`；`verification/service-acceptance.json` 内嵌 service/page 报告并单列挂载观测。

## 各层检查证明的内容

| 检查 | 证明范围 | 不证明的范围 |
|---|---|---|
| `check-build` | 包内文件身份、角色、报告关联与必要通过项（`not_run` 不计为通过） | 用户界面与正式运行状态 |
| `build` / `rebuild` | 从锁定输入实际编译，并执行结构与时间行为检查 | 未登记版本的语义正确性 |
| FontTools 与字体清单 | 字体内容、完整 cmap、字节长度与 SHA-256 | 实际屏幕字体效果 |
| `verify-page` | 实际入口初始化、完整字体注入、模块身份、无 WebSocket | 完整 GPU、Markdown、笔记、native desktop UI |
| `markdown-windows` | 隔离服务与真实 Windows Chrome 中的页面响应、画面变化、viewport 重绘与 GPU 提交 | 中文内容语义、字形外观、其他浏览器或操作系统 |
| 运行身份与服务检查 | 指定正式进程、资源、认证与 pane 状态 | 全部应用操作 |

构建、fresh HOME 复验与真实入口页面验收的结果已写入 [确定性构建与移植验收](../../raw/tern/2026-10-21-deterministic-build-and-portability.md)。明确记录为未验证的范围包括：完整 GPU/mount、native desktop 全部 UI 路径、物理异机重建、Windows 与 macOS 构建环境。Windows Chrome 页面检查已在本机实测，依赖本机 Node、Playwright 与 Chrome，CI 未运行该组合。

## See Also

- [Tern 时间 API 补丁与验收](time-api-patch-and-verification.md)
- [Tern 网页字体修改与版本迁移](web-maple-font-rebuild.md)
- [Tern 升级辅助工具与验收边界](maintenance-toolkit.md)
