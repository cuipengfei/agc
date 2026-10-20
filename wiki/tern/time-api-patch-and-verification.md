# Tern 时间 API 补丁与验收

> Sources: Tern 0.9.5 补丁归档与 verify-time 实际断言，2026-10-20；会话补丁流程复盘，2026-10-20；Tern 确定性构建与迁移验收，2026-10-21
> Raw: [0.9.5 升级证据与时间断言](../../raw/tern/2026-10-20-tern-0.9.5-upgrade-and-patches.md); [补丁流程复盘与要求](../../raw/tern/2026-10-20-tern-patching-workflow-retro.md); [确定性构建与迁移验收](../../raw/tern/2026-10-21-deterministic-build-and-portability.md)
> Updated: 2026-10-21

## 适用范围

Tern Web 模块存在时间 API 的平台 unsupported 分支。静态定位这些分支与调用点，只能说明待分析位置；实际用户操作是否触发 panic，需要独立动态证据。0.9.5 的完整用户操作触发路径尚未动态复现。

时间补丁不修改 native desktop 的时间实现。Web 初始化、daemon/CLI 行为与 native UI 的覆盖范围分别记录。

## 三类时间语义

| 类别 | 需要保留的语义 | 主要检查 |
|---|---|---|
| SystemTime / calendar | 从 epoch 表达日历时间 | 秒、纳秒与 epoch 转换 |
| Instant | 使用 performance.now 的单调计时 | 小数精度、输出边界、externref 释放 |
| elapsed | 使用调用方真实起点计算时长 | 跨秒借位与未来起点的零饱和 |

当前测试输出采用 little-endian i64 秒与 i32 纳秒。相同的 panic 调用形式可能对应不同输出地址和 elapsed 起点；每个调用点必须保留各自 ABI。

0.9.5 的已审补丁包含 26 处调用：17 处 Instant、4 处 elapsed、5 处 SystemTime。索引包含 imports；这些数量与索引仅属于该版本。既有 calendar、epoch、饱和相减和 externref 释放函数继续复用，没有按名称猜测替代语义。

## 候选模块与测试模块

正式候选保持原应用 exports。独立测试模块只额外暴露 profile 指定的五个函数，不替代候选文件。

`verify-time.mjs` 在运行行为检查前，核对以下来源：

- 候选 SHA 与对应 profile 一致。
- 两模块中被测函数的签名、locals 与函数体一致。
- imports 一致，额外 exports 恰好是 profile 的测试入口。
- 初始内存一致。
- 测试使用真实 glue 的 default init。

测试函数编号和 consumerFlags 从当前版本的 profile 获取。未知版本需要分析和审核新的对应关系，不能沿用历史版本数字。

## 六项行为验收

1. `instrumented_module_provenance`：证明测试模块来源。
2. `calendar_epoch_and_output_bounds`：检查 calendar、epoch 与输出边界。
3. `instant_fractional_seconds_and_bounds`：检查小数精度与输出边界。
4. `elapsed_borrow_and_saturation`：检查跨秒借位和未来起点的零饱和。
5. `actual_consumer`：执行真实 consumer，检查实际使用方读到的时间。
6. `externref_reuse_10000_calls`：重复调用后，externref table 长度保持稳定。

跨秒示例：当前时间 2000.25 毫秒，起点为 1 秒加 999750000 纳秒，预期结果为 0 秒加 500000 纳秒。当前时间 1000 毫秒、起点为 2 秒时，结果饱和为零。

这组检查验证明确的时间语义，不证明完整 GPU 交互、所有应用操作或 native desktop UI。

## 重建、报告与保留材料

报告必须由实际检查生成。使用历史报告时，明确记录复用，并核对 candidate、test module、profile 和 glue 的身份。历史通过记录不能代替本次运行声明。

完整构建包应保留原版、候选、测试模块、glue、profile、recipe/补丁片段和报告。清理大型中间 WAT 的前提是重建材料完整，不能只保留最终 WASM 和通过标记。

`build` 从 recipe 确定性重放已审核修改：recipe 锁定 WABT 版本、原版 SHA-256、WAT 行数与每处 edit 的原文 hash 断言；候选与测试模块分开生成，`wat2wasm` 编译后分别核对 recipe 固定 hash；任一失败保留构建目录并停止，不改写期望 hash。程序化处理 WAT 属于二进制构建，执行构建的程序源码仍使用文件编辑工具维护。`check-build` 对结构报告精确要求 imports、exports、function_signatures、memory_limits、initial_memory 五项 `passed`（time_behavior、full_ui 允许 `not_run`），对时间报告精确要求六项行为检查全部 `passed` 且无 not_run 余量；checks 集合与已知集合须完全一致。构建清单还记录构建工具源码身份，`check-build` 重算 build.mjs、analyze.mjs、resources.mjs、interface.mjs、verify-time.mjs、package.json、bun.lock 的 SHA-256 并比对，不一致即失败。

2026-10-21 已观察：WABT 1.0.42 安装脚本实测通过；FontTools 2 项与同步项目 19 项 unittest 通过；`bun audit` 退出码 0；最终本地全套 Bun 测试 61 pass / 0 fail（7 个测试文件，8.02s）；最终写流故障注入实测 ENOSPC 于 27ms 拒绝、失败目录保留；真实 `analyze` 链路输出 `panics33` 为静态候选计数，不等于时间故障数。真实 0.9.4 与 0.9.5 build + check-build 均实测通过（锁定 SHA 匹配）；删除私有初始输入与首包后 fresh HOME 重建，两 SHA 与原包一致（bg29，308.22s）；verify-page 正常与错误字体 hash 双路径按预期通过。未验证：完整 GPU、mount、native desktop UI、其他物理机器与操作系统。

具体安装和执行入口见[跨机器补丁手册](portable-patching-runbook.md)。每次重建均应保留完整材料，并使用本次实际执行生成的时间报告。

## See Also

- [Tern 升级辅助工具与验收边界](maintenance-toolkit.md)
- [Tern 网页字体修改与版本迁移](web-maple-font-rebuild.md)
- [Tern 跨机器补丁手册](portable-patching-runbook.md)
