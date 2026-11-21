# 字体登记补丁

## Sub-features

- 为身份匹配的已审核原版资源构建名称登记补丁。
- 将生成的候选 WASM 与同版本参考构建比较；没有参考构建时核对生成清单与实际文件。
- 验证错误 glue、未知原版 WASM 会被拒绝且不留下输出目录。

## How to get to it (user POV)

当匹配的检测报告分类为 `registration_missing` 时，运行 [SKILL.md](../SKILL.md) 中的 `scripts/verify-release.sh`。脚本自动选择此分支。

## Driving it with release scripts

脚本调用维护工具完成构建，并检查登记清单的版本、原版身份、glue 身份和候选 hash。证据使用 `font-registration-build.*`、`registration-reference.*` 或 `registration-identity.*`、`registration-candidate-hash.txt`、`rejected-glue.*` 和 `rejected-original.*`。

## Gotchas

- 维护工具尚未审核新版本时，构建会失败；agent 需要完成新版本支持工作，不能猜测补丁。
- 同版本参考构建存在时必须一致；没有参考构建不代表视觉效果已经确认。
- 登记补丁不包含 Maple 字体文件或旧版字体替换注入。
