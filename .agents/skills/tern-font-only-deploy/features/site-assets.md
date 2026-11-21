# 站点资源装配

## Sub-features

- `registration_missing` 分支将登记补丁装配成候选站点，并拒绝混用旧字体替换输入。
- `working` 分支使用原版资源和匹配的 Maple 字体清单执行兼容装配。
- 核对站点清单与实际文件，并按要求保留持久部署产物。

## How to get to it (user POV)

运行 [SKILL.md](../SKILL.md) 中的 `scripts/verify-release.sh`。需要把站点用于正式部署时，在运行前将 `TERN_SITE_OUT` 设置为一个尚不存在的版本化目录。

## Driving it with release scripts

脚本自动选择与检测分类一致的装配路径，验证站点清单及页面、WASM、glue 的实际 hash。登记分支还验证互斥输入拒绝。证据使用 `assets-registration.*` 或 `assets-official.*`、`assets-identity.*`、`asset-*.txt` 和 `rejected-assets.*`。

## Gotchas

- 每次构建使用新的输出目录；持久站点由调用方指定版本化位置。
- 原版兼容路径只在其分类和工具支持成立时使用。
- 不装配本地站点的内嵌官方页面需要另一组页面检查，不能套用本地站点资源断言。
