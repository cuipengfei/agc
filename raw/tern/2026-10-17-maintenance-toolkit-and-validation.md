# Tern 升级辅助工具与 0.9.2 验收原始材料

> Source: agc 仓库 tools/tern-maintain/README.md、tools/tern-maintain/evidence/0.9.2.json，以及本会话命令输出
> Collected: 2026-10-17
> Published: 2026-10-17

凭据、完整认证 URL 和本机私有状态目录不记录于此。

## 工具行为

运行目录为 `tools/tern-maintain`。工具与配置同步独立，不修改 manifest，不写入来源配置。

安装与行为检查：

```bash
bun install --frozen-lockfile
bun test
uv run --with-requirements requirements.txt python -m unittest discover -s python_tests -v
```

`fetch` 从不带认证参数的本机 Tern 原生网页服务读取官方 WASM URL 和 SHA-384 SRI。版本通过 URL 计算，下载内容必须通过 SRI。官方网页结构变化或地址不符合要求时立即报错。输出目录必须不存在。

内存初始化只提供会明确报错的 import 函数。初始化期间调用 import 或出现不支持的 import 类型，分析就会停止。输入须为可信官方模块；此过程会执行模块的 start function，不能将工具作为不可信 WASM 的隔离环境。

FontTools 读取内嵌字体的 family、长度、cmap 和中日韩样例。分析器根据实际 pointer/length 对搜索唯一 descriptor，报告全部直接调用、函数表引用、时间 import 和局部指令上下文。遇到未支持的 Binaryen IR 节点立即报错。短函数中的平台 panic 文本属于候选定位，不能据此断言实际故障或完整可达性。

`decision: manual_review_required` 表示需要通过文件编辑工具修改 compiler 生成的文本源，再通过标准 WASM compiler 编译。工具不自动修改指令、不调用 Binaryen mutation/optimization API，不从旧版本地址表套用新版本。未知结构不能据此批准部署。当前工具不会自动生成完整可编译的替换函数。

字体工具核对初始内存 SHA-256，用 FontTools 从原始内嵌字体复制 lookup name records，保留 Maple 的完整 cmap、glyphs 和其他表，并检查中日韩及 Nerd Font 样例、转换前后的完整 cmap。字体加载器在两个字体都完成校验后才修改 descriptor。

结构报告检查 imports、exports、函数签名、内存限制和初始内存。时间精度、进位、跨秒相减、饱和时长和 externref 生命周期需要对应版本的实际行为测试。结构报告会将未执行项写为 `not_run`，`deployable` 始终为 `false`。浏览器检查强制 `headless: true`，初始化实际模块并验证完整字体注入，不打开桌面窗口。完整 GPU/Markdown/笔记操作没有通过这项检查得到证明。

`verify-time.mjs` 验收会核对候选 SHA-256、五个实际函数的签名与函数体、imports、额外 exports 和初始内存，再执行日历时间转换、小数精度、输出边界、跨秒相减、饱和时长、真实 consumer 及一万次 externref 复用检查。profile 仅用于固定 SHA 的行为验收；升级分析不读取它。新版本需要经过人工审核的对应测试 profile。

`start` 仅用于已经人工审核并完成行为验证的资源目录。端口已占用或状态目录已有 PID 记录时拒绝启动，保留原服务。为每个 web 进程指定独立的私有 `state-dir`；工具生成独立认证文件和脱敏日志，检查前后 pane 状态，不终止已有 daemon，不提供停止已有 daemon 的命令。

GitHub Actions 工作流运行 Bun 行为测试、FontTools 字体数据测试及同步项目现有 unittest；不会下载真实 WASM，不启动桌面浏览器，不访问本机凭据。

## evidence/0.9.2.json

```json
{
  "schemaVersion": 1,
  "date": "2026-10-17",
  "version": "0.9.2",
  "originalSha256": "93dbc7b44aa9bbddb57d6f6b37b76ddfaf32286a82a6773cfb3ba3b4dcdfb534",
  "candidateSha256": "72ca2c38ecf8f03b40e45a2f2d46750650893c46ef3ae6ec4a549382a2538106",
  "testModuleSha256": "c4f86791191cd9dd31d334cab68896125e9f56269b0dc809c7b4f2262ada6afc",
  "officialAcquisition": {"version": "0.9.2", "sri": "passed"},
  "fonts": [
    {"family": "BerkeleyMono Nerd Font", "slot": 9028220, "pointer": 4364718, "length": 2288420},
    {"family": "BerkeleyMono Nerd Font Medium", "slot": 9028244, "pointer": 6653138, "length": 2313308}
  ],
  "timePlan": {
    "callSites": 26,
    "singleBufferCandidates": 15,
    "manualBufferReview": 11,
    "originalPanicCalls": {"30559": 21, "30560": 5},
    "candidatePanicCalls": {"30559": 0, "30560": 0},
    "candidatePanicTableReferences": 0,
    "candidatePanicRefFuncReferences": 0
  },
  "boundaries": {
    "imports": "passed", "exports": "passed", "functionSignatures": "passed",
    "memoryLimits": "passed", "initialMemory": "passed"
  },
  "timeBehavior": {
    "instrumentedModuleProvenance": "passed",
    "calendarEpochAndBounds": "passed", "instantFractionAndBounds": "passed",
    "elapsedBorrowAndSaturation": "passed", "actualConsumer": "passed",
    "externrefReuse10000Calls": "passed"
  },
  "headlessBrowser": {
    "chromium": "147.0.0.0", "headless": "passed", "moduleInit": "passed",
    "fullFontInjection": "passed", "fonts": 2,
    "wireMount": "not_run", "gpuInteractionFull": "not_run"
  },
  "isolatedRuntime": {"daemon": "passed", "http": "passed", "panesUnchanged": true},
  "tests": {"tool": {"passed": 18, "failed": 0}, "fontData": {"passed": 2, "failed": 0}, "sync": {"passed": 19, "failed": 0}},
  "dependencyAudit": {"nodeVulnerabilities": 0, "nodePackages": 20, "pythonVulnerabilities": 0, "fontToolsVersion": "4.60.2"},
  "memorySha256": "27351e2a547048f5693589893dbab3e0f3566f74071e8f7638154c57f87be64d",
  "fontData": {"nameRewrite": "passed", "fullCmapPreserved": "passed", "charactersPerFont": 33091, "cjkPerFont": 20976},
  "testModuleArtifact": "../artifacts/0.9.2-time.wasm",
  "productionResourcesChanged": false,
  "automaticDeployment": false
}
```

## Git 提交

用户明确要求提交。提交前 `git diff --check` 与 `git diff --cached --check` 无输出。`git commit -m "Add Tern maintenance toolkit"` 产生 commit `faae638`；`git show --stat --oneline --summary HEAD` 显示 `faae638 Add Tern maintenance toolkit`，`git status --short` 无输出。本次提交包含工具、测试、文档、CI 工作流和 `profiles/0.9.2.json`。

未提交 GitHub 端 CI 的执行结果；完整 GPU、Markdown 和笔记交互也未验收。
