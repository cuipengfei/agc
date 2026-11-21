# 按需字体检查

仅在匹配的历史检测报告不存在、身份不符或结果为 `needs_investigation`，并且用户明确授权 Tern 视觉测试时使用。

## 执行

按 `tools/tern-maintain/README.md` 的字体登记检查章节运行维护工具的 `font-check.mjs`。该工具驱动真实 Chrome，检查冷加载、暖加载、内置字体正对照和不存在字体负对照，并保存报告与截图。WSL 环境按 README 使用 Windows Node 和路径转换；token 只通过文件传入。

检测使用当前版本的原版或已修补资源、对应 profile 和目标 Maple 字体。每次新版本都生成新的报告和 profile，不能从历史版本复制 WASM 地址、字体描述符或名称偏移。

## 判定

- `working`：冷暖两次均选中目标字体且对照正确，发布脚本选择原版兼容装配。
- `registration_missing`：字体已投递但名称查询未匹配，发布脚本选择登记补丁。
- `needs_investigation`：停止部署，保留报告与截图，查明失败阶段。

报告必须匹配当前版本、WASM、glue 和目标字体身份。将报告与 profile 放在原版资源旁，或在运行 `verify-release.sh` 时通过 `TERN_FONT_REPORT`、`TERN_FONT_PROFILE` 指定。

截图和分类用于判断名称登记；中文、图标、字形与宽度的最终视觉结果由用户确认。浏览器检查不替代发布脚本中的资源、服务与升级检查。
