# Tern 确定性构建与迁移验收

> Source: 本会话真实命令输出；agc tools/tern-maintain 源码与构建产物
> Collected: 2026-10-21
> Published: 2026-10-21

## 固定 WABT 安装

在 `tools/tern-maintain/` 实际运行：

```bash
bash ci/install-wabt.sh /tmp/tern-wabt-verified-20261021-ok
```

退出码为 0，stdout：

```text
/tmp/tern-wabt-verified-20261021-ok/wabt-1.0.42/bin
```

安装脚本只接受 Linux x86_64 和全新安装目录；下载官方 `wabt-1.0.42-linux-x64.tar.gz`，解压前检查 SHA-256 `84895407a6bbb80e918f33b16b2fb2206021c150b6bc9ff6f761263a745ab131`，并分别要求 `wat2wasm --version`、`wasm2wat --version` 精确等于 `1.0.42`。

保留的 0.9.4 测试模块实际 `sha256sum` 输出：

```text
b6017a4bd8a16ec14dfe6434d84eb57839ea4c2d274b1c8e7be0d6f4949c9a9c  tools/tern-maintain/artifacts/0.9.4-time.wasm
```

## 已观察结果（2026-10-21 实际输出）

以下各条来自本会话真实执行：

1. FontTools 数据测试 `uv run --with-requirements requirements.txt python -m unittest discover -s python_tests -v`：2 项通过。
2. 同步项目测试 `python3 -m unittest discover -s tests -v`：19 项通过。
3. `bun audit --json`：退出码 0，stdout 为 `{}`。
4. 真实 CLI 链路 `memory` → `fonts.py` → `analyze` 退出码 0，输出目录 `/tmp/tern-fonts-20261021-W5WE3D/`，含 `initial.bin`、`inventory.json`、`plan.json`；analyze 的 `inputSha256` 为 `1e6a49eaf33e3575e3a1c67c522cea76ece874dde2b4c8a98af5b16397cfbca5`（与 0.9.5 recipe 固定的原版 SHA-256 一致，见 2026-10-20 raw 的证据 JSON 引用），输出摘要 `fonts2 / panics33 / decision manual_review_required`。`panics33` 是静态 panic 候选函数计数，不等于 33 个时间故障。
5. `font_manifest.py` 真实生产退出码 0，stdout 为 `{schemaVersion: 1, wasmSha256: b132e0fe9e1ada03339ed222f2dd04b08385c79f39b1797d2610c253c4eefdbe, fonts: 2}`；输出 `/tmp/tern-fonts-20261021-W5WE3D/fonts/fonts.json` 与 `pkg/MapleMono-NF-CN-Regular.ttf`、`pkg/MapleMono-NF-CN-Bold.ttf`。此次 `--wasm` 输入为现有正式 0.9.5 candidate 文件（只读），其后重建包的 candidate SHA-256 与该输入一致；fonts.json 的 `analysisSha256` 为 `1e6a49eaf33e3575e3a1c67c522cea76ece874dde2b4c8a98af5b16397cfbca5`，与 recipe 原版一致。Regular：slot `9056816`、expectedPointer `4393314`、expectedLength `2288420`、bytes `20564496`、characters `33091`、cjk `20976`、SHA-256 `fe14b378a0a0c299c186bdac3370c0a66c358f44d27283fa8ee004c8ad90a900`；Bold：slot `9056840`、expectedPointer `6681734`、expectedLength `2313308`、bytes `20517844`、characters `33091`、cjk `20976`、SHA-256 `a399807f27b9af23fdb62f878e8cd7eee3c0bdb915d8b2f4395ef3633e89a418`。两个字体 hash 与 2026-10-20 raw 的 0.9.4/0.9.5 证据一致。
6. 写流故障注入最终实测（bg28）：退出码 0；真实 `test.wat` 在 fs 边界重定向 `/dev/full`，`buildPatch` 于 27ms 以原始 ENOSPC reject，原始错误与失败目录保留，无未处理 rejection。
7. 最终本地全套 Bun 测试（bg27）`env WABT_DIR=/tmp/tern-wabt-verified-20261021-ok/wabt-1.0.42/bin bun test`：退出码 0，61 pass / 0 fail，7 个测试文件，8.02s。最终源码自 bg29 起固定（A334）。
8. 真实双版本 build 与 fresh HOME 迁移 smoke（bg19）实际结束失败（1394.70s）：首个 0.9.4 build 的测试模块 SHA-256 不一致，expected `b6017a4bd8a16ec14dfe6434d84eb57839ea4c2d274b1c8e7be0d6f4949c9a9c`，got `525f02a034ccef1e0b873b37225a2f00a5a12e6e72020568e603f1a5e3d82be2`。失败目录保留于 `tools/tern-maintain/artifacts/workflow-ROAhTj/0.9.4`。该轮在首个 build 阶段失败，0.9.5 与 fresh HOME 未开始；最终构建与迁移结果见下文 bg29/bg30 receipt。

## bg19 差异调查与修复（2026-10-21）

官方 `wasm-objdump -x -j Export` 独立确认：归档 `0.9.4-time.wasm` 的 5 个 test_* 导出位于导出序 0-4，而新失败 test.wasm 的 5 个 test_* 导出位于 56-60；candidate SHA-256 `f5f8e036…` 正确。WABT + Node line 事件扫描两版原版 WAT：0.9.4 total `19623037` / first export 行 `19612474`，0.9.5 total `19690137` / first export 行 `19679564`；两版 first export 行原文均为 `  (export "memory" (memory 0))`，行 SHA-256 `2df21b5551fc1679dc11b58fd2b0e622bbb81ee13df602ee0d4019bd6955293f`；扫描耗时 7933ms / 7354ms。

修复方向：builder 改为在 anchor 之前插入（anchor 为 replace 区间内唯一原文行），recipe 的对应 line 与行 hash 随之更新；所有 expected 模块 hash 未改。写路径按连续原文修改 64K 块写入。新增永久回归先失败（`Test exports ... not last export`），修复后 1 pass 0 fail，覆盖新 helper 导致 anchor 在 replacement 内移动的情况。

诊断基线：原版 WAT 直写 `/dev/null` 5.795s，仅作诊断，不等于完整构建耗时。

## bg25/bg29：首个真实构建成功与 0.9.5 锚点修正（2026-10-21）

- parent 接管后真实 0.9.4 build 与 check-build 成功（bg25 第一步，`tools/tern-maintain/artifacts/workflow-rIT6C8/0.9.4`），测试模块 `b6017a4b…` 与候选 `f5f8e036…` 均匹配 recipe 原锁定 SHA。
- 0.9.5 在 bg25 中候选 `b132e0fe…` 匹配，但 test 前置 exports 所得 `cf96…` 未匹配 `ce28…`；canonical history current/full 136334-136340 与 artifact 728 region 1 显示原始 0.9.5 把 5 个 exports 插在 part-053-test 第 111 行 `__wbindgen_start` 之后，与 0.9.4 原始顺序不同。
- 统一 before-line 语义，不新增 position 字段：0.9.4 first export 行 `19612474`、行 hash `2df…`；0.9.5 改锁 exports 后 elem 原版行 `19679620`、行 SHA-256 `74b6e5954fa54e130bcb4fd535fd22540c0eedea4b6fb201b60730a8e89ebc82`，实际新扫描 6887ms 确认（0.9.4 扫描 7303ms）。全部 expected 模块 hash 未动。
- 新增独立 golden 尾部 export 回归先失败（line 99 anchor，guard 只许 export），已移除该额外限制并重跑全 suite 与真实 bg29。
- bg25 两版本构建执行到第二个 test hash 检查用时 132.62s，不能称两版成功；缓冲写入耗时改善为实测观察，不等于同路径严格 benchmark。

## bg29/bg30 最终验收 receipt（2026-10-21）

- bg29（receipt `tools/tern-maintain/artifacts/workflow-eV2Po2/portability-smoke.json`）退出码 0，308.22s，linux / Bun 1.4.3。三检查 passed：`0.9.4_real_build`（candidate `f5f8e036…`、test `b6017a4b…`）与 `0.9.5_real_build`（candidate `b132e0fe…`、test `ce28ecb4…`）均匹配锁定 SHA；`relocated_bundle_without_initial_inputs` 复制包到 `portable-0.9.5`、删除私有初始输入与首包（`initialInputsRemoved`/`initialBundleRemoved` 均 true）后 `HOME=…/fresh-home` 重建到 `rebuilt-0.9.5` 并 check-build，两 SHA 与原包一致。
- bg30（receipt 同目录 `real-page-smoke.json`）退出码 0，6.15s：真实 CLI `assets` 用 `portable-0.9.5` 与 `/tmp/tern-fonts-20261021-W5WE3D/fonts` 生成 `workflow-eV2Po2/site`（index.html、maple.js、fonts.json、pkg/ 与 deploy-manifest.json，7 个文件逐字节 hash 核对）。
- verify-page 正常路径：退出码 0，page_served、headless_forced、page_ready、fonts_injected、candidate_hash、websocket_absent 六项 passed，wire_mount、gpu_interaction_full 两项 not_run（`real-page-valid.json`）。
- verify-page 错误字体 hash 路径：仅经 HTTP 替换 `/fonts.json` 响应（磁盘与 HTML/WASM 保持原样），退出码 1，page_ready、fonts_injected、candidate_hash 三项 failed（page_ready 明示 SHA-256 mismatch），其余三项 passed、两项 not_run（`real-page-invalid-font-hash.json`）。
- 未验证：完整 GPU 与 mount、native desktop UI、其他物理机器与其他操作系统。

## 构建工具源码身份（2026-10-21 采集）

`build.mjs` 的 `PRODUCER_FILES` 共 7 个文件，其 SHA-256 被 `buildPatch` 写入 `build.json` 的 `producer` 字段，并由 `checkBundle` 重新计算比对，不一致即失败：

| 字段 | 文件 | SHA-256（终值） |
|---|---|---|
| buildMjs | build.mjs | `a14d917606066765ccf6eb89f713cab97381941cbdb41448bfbd8c2ed7088dc1` |
| analyzeMjs | analyze.mjs | `162f2e10c9e8a6ba0a0822599163e8c3512fd69282eb8387579ef251ceafe4df` |
| resourcesMjs | resources.mjs | `f8daa1751577d4055e54edab94cd2c23f431a817f2e5f41e2299fde747080e84` |
| interfaceMjs | interface.mjs | `75f123f0c42dcd225d1aa68594699182a9264f5b383280372ad1487cfa529587` |
| verifyTimeMjs | verify-time.mjs | `e87ef4ee1a3d00af10a50f2c481b0f13b3d38e0e11524e6725e6d07bcedd892d` |
| packageJson | package.json | `a7b0c0e8fbe79ea1d139dea0f7814ebc9894581b89904ca7d07d29136bda7251` |
| bunLock | bun.lock | `a0fda113fc49a17b629a977a5a0a73c1dcae6580329064144ef0cface7f2ec10` |

跨写流 drain 等待缺陷已修复（bg28 最终故障实测 27ms ENOSPC 拒绝）；builder 经 bg19/bg25 两轮修正后最终固定（A334）。上表为成功包 `portable-0.9.5/build.json` 的 producer 终值（recipeSha256 `8de2b70de5d1f45f81895e76257ee88e794ecc4097fd04e30c834e6aef408b3c`，tools wabt 1.0.42 / runtime 1.4.3），其余 6 个 producer 文件与采集时一致。

## check-build 的精确通过要求（build.mjs 源码）

`requireChecks` 对每份报告强制：

- 结构报告：imports、exports、function_signatures、memory_limits、initial_memory 五项必须 `passed`；time_behavior、full_ui 允许 `not_run`。
- 时间报告：instrumented_module_provenance、calendar_epoch_and_output_bounds、instant_fractional_seconds_and_bounds、elapsed_borrow_and_saturation、actual_consumer、externref_reuse_10000_calls 六项必须 `passed`，时间报告没有 not_run 余量。
- 任一 check 为 `failed` 即失败；`not_run` 必须在允许清单内；出现未知 check 名即失败；checks 集合与已知集合完全一致。

`buildPatch` 在编译候选与测试模块后先核对 recipe 固定 hash，再运行真实结构检查与真实 `verify-time.mjs` 时间行为检查，全部通过才组装 bundle 并执行 `checkBundle`；任何失败保留构建目录，绝不改写期望 hash。`rebuildPatch` 先 `checkBundle` 通过再从包内输入重建到新目录。

## 0.9.4 recipe 身份（patches/0.9.4/recipe.json 实际内容）

WABT `1.0.42`；原版 SHA-256 `8672d8320fa49ea4f31fd50cf18a0fa7917a9727265331bfe3686299a01acc18`、WAT 行数 19623037；候选 SHA-256 `f5f8e036dfbba59f6ddae2636d367355de05ca8e12874f3ff12fc8e6e5ca5a75`；测试模块 SHA-256 `b6017a4bd8a16ec14dfe6434d84eb57839ea4c2d274b1c8e7be0d6f4949c9a9c`（与本文 sha256sum 输出一致）；glue SHA-256 `05c24604720770dadcb995867527d8e7dd0741673332be7c82179a45352385b5`；profile version `0.9.4`、SHA-256 `f8e7a9e147b622f735cc9de662d98495f0bdb4b5a9b2038ac6677764445a07f3`。29 处 edit 全部为 replace 类型，files 共 30 项。

## CLI 构建面（cli.mjs usage 原文）

```text
bun cli.mjs build --original FILE --glue FILE --profile FILE --recipe FILE --wabt-dir DIR --out NEW_DIR
bun cli.mjs rebuild --bundle DIR --wabt-dir DIR --out NEW_DIR
bun cli.mjs check-build --bundle DIR
bun cli.mjs assets --bundle DIR --fonts DIR --out NEW_DIR
bun cli.mjs verify-page --url URL --playwright-module FILE --chromium-executable FILE [--out REPORT]
```

## assets 装配绑定（assets.mjs 源码规则）

`assembleAssets` 先 `checkBundle`，再要求 `fonts.json` 的 `wasmSha256` 等于已验证 bundle 的 `candidateSha256`（绝不接受 test 模块）；字体恰为 Regular、Bold 两份，url 固定为 `./pkg/MapleMono-NF-CN-<style>.ttf`；slot、expectedPointer、expectedLength、bytes 必须是 0 到 0xffffffff 的正安全整数，槽位间隔至少 8；叶文件或父目录经 symlink 越界即拒绝；写出 index.html、maple.js、fonts.json、pkg/client.wasm、pkg/client.js、两份字体与 deploy-manifest.json，manifest 记录每个输出文件的实际 SHA-256。

## verify-page 检查序列（page-check.mjs 源码规则）

只接受无凭据、无 query、无 fragment 的 loopback URL；页面内监测并拒绝 WebSocket 构造（构造时计数并抛出错误）。检查序列为 page_served → headless_forced → page_ready → fonts_injected → candidate_hash → websocket_absent；wire_mount 与 gpu_interaction_full 恒 `not_run`（无 token URL 不 mount、本轮不做完整 GPU 交互）。fonts_injected 要求页面自报的 family 为 `Maple Mono NF CN` 且恰有 Bold、Regular 两份；candidate_hash 要求页面自报的 candidate SHA-256 与本次导航实际服务的 `/pkg/client.wasm` 字节一致。字体或模块 hash 错误的路径体现为 fonts_injected 或 candidate_hash `failed`。

## 验收范围

- 已验证（bg29/bg30，见上节）：真实 0.9.4/0.9.5 build + check-build（锁定 SHA 匹配）、删除私有初始输入与首包后 fresh HOME 重建（两 SHA 一致）、assets CLI 装配（7 文件 hash 核对）、verify-page 正常与错误字体 hash 双路径（正常 6 passed/2 not_run，错误 3 failed/3 passed/2 not_run）。
- 跨写流缺陷已修复并有最终故障注入实测（bg28，27ms）；全量 Bun 测试最终为 bg27 61 pass / 0 fail（anchor 修正后）。
- 未验证：完整 GPU 与 mount、native desktop UI、其他物理机器与其他操作系统。

## Wiki 证据校验

2026-10-21 执行 `check_evidence.py`，指定 maintenance-toolkit、portable-patching-runbook、time-api-patch-and-verification、web-maple-font-rebuild 四篇文章：0 evidence errors、9 fidelity suspects、2 unreferenced raw files；`git diff --check` 无输出。

九项数字标记已人工核对：完整耗时 308.22s 与 8.02s 已记录在本文实际输出中；四个时间输入及预期值来自 2026-10-20 升级 raw 的 JavaScript 断言；FontTools 4.60.2 来自 2026-10-17 工具验收 raw 的 JSON dependencyAudit。标记来自小数提取及 fenced code 排除，均有原始证据。两个未引用 raw 属于既有其他主题，本次新增三份 raw 均有文章引用，既有材料保持原样。
