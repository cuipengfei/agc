# 字体登记补丁

## Sub-features

- 为身份匹配的已审核原版资源构建名称登记补丁。
- 将生成的候选 WASM 与同版本参考构建比较；没有参考构建时核对生成清单与实际文件。
- 验证错误 glue、未知原版 WASM 会被拒绝且不留下输出目录。
- 使用独立服务快速验证目标字体、内置字体和不存在字体的实际查询返回值。
- 对候选站点完成冷暖两次检查，并保留模块身份、截图、响应和清理证据。

## How to get to it (user POV)

当匹配的检测报告分类为 `registration_missing` 时，运行 [SKILL.md](../SKILL.md) 中的 `scripts/verify-release.sh`。脚本自动选择此分支。

授权字体浏览器检查后，使用 [字体检查](../references/font-check.md) 中的 `scripts/check-fonts.sh`。调查原版传 `--original`，验证候选站点传 `--site`；`--smoke` 执行快速检查，完整验收省略该参数。

## Driving it with release scripts

脚本调用维护工具完成构建，并检查登记清单的版本、原版身份、glue 身份和候选 hash。证据使用 `font-registration-build.*`、`registration-reference.*` 或 `registration-identity.*`、`registration-candidate-hash.txt`、`rejected-glue.*` 和 `rejected-original.*`。

字体检查启动器自动创建隔离服务、中文窗格与实验目录，记录真实字体查询的返回值。成功的候选站点完整报告为 `kind: font-registration-check`、`source: served`、`classification: working`，并满足输入身份和全部对照检查；清理结果保存于 `font-cleanup.txt`。

## Gotchas

- 新版本支持需要按 [新版分析顺序](../references/new-version-analysis.md) 审核名称查询、登记过程和表达式行为。
- 快速检查输出 `font-registration-smoke-check`；发布使用完整冷暖检查报告。
- 登记补丁保留程序的内置字体，通过 Web 服务读取本机安装的 Maple 字体。
