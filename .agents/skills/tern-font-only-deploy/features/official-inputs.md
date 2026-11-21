# 官方资源与字体判定

## Sub-features

- 核对官方安装包、候选 binary、原版 WASM 和 glue 的版本与身份。
- 核对字体检测报告、profile、目标字体与当前原版资源属于同一组输入。
- 经授权获取新版本的原版资源，或由已有资源直接进入验证。

## How to get to it (user POV)

按 [SKILL.md](../SKILL.md) 设置 binary、安装包和原版资源，运行 `scripts/verify-release.sh`。没有原版资源且已授权联网时设置 `TERN_PREPARE=1`。

## Driving it with release scripts

脚本自动执行安装包成员检查、binary 比较、资源 hash 和检测报告匹配，再根据报告选择 `working` 或 `registration_missing`。证据使用 `archive-*`、`official-*`、`target-font-hash.txt`、`font-report-identity.*` 和 `font-decision.*`。

## Gotchas

- 新版本必须重新取得匹配报告和 profile；缺少时脚本停止。视觉检查需要用户明确授权。
- 原版 WASM、glue 或字体结构未知时停止，不复用旧版本地址或常量。
- 报告分类只决定部署路径，不证明中文或图标的最终显示。
