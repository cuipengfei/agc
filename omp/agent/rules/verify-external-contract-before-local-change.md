---
name: verify-external-contract-before-local-change
description: "外部依赖或工具链问题必须先查明契约，不得用本地修改和反复换版本碰运气"
condition: ["(?:Write|Create|Apply|编写|创建|应用)[^\\n\"]{0,100}(?:(?:version|upgrade|dependency|release|版本|升级|依赖|发布)[^\\n\"]{0,60}(?:script|check|脚本|检查))", "(?:Add|Revert|添加|回退)[^\\n\"]{0,80}(?:TS|TypeScript|tsconfig|types?|类型|配置)[^\\n\"]{0,60}(?:for test|to test|see if|测试|试一下|试试看|看看|to tsconfig|到 tsconfig)", "(?:dependency|package|SDK|API|CLI|framework|library|依赖|软件包|框架|库|版本|升级|迁移|兼容)[^\\n\"]{0,160}(?:我现在就执行|现在直接|先(?:改|写|装|升级|回退)|直接(?:改|写|安装|升级|回退)|(?:改|写|升级|回退)[^\\n\"]{0,30}(?:看看|试一下|试试看|for test|to test|see if))"]
scope: ["tool:bash(*)", "tool:write(/tmp/*)", "tool:write(*.js)", "tool:write(*.ts)", "tool:edit(package.json)", "tool:edit(tsconfig*.json)", "tool:edit(*.ts)", "tool:edit(*.tsx)"]
---

兄台，久候了。以下所述均为事实，保证不是瞎编的。

停下：当前输出出现了“尚未确认外部契约便准备本地试错”或“验证前过早下结论”的信号。该命中只是检查门，不自动断定违规。

继续前先检查本轮已有证据：

1. 查官方文档、发布说明、包元数据、`peerDependencies`、`engines` 和上游源码；库与 API 优先使用 Context7，上游实现优先使用 DeepWiki、GitHub 或代码搜索。单一入口无结果时换来源，不得猜测。
2. 先确认是否已有原生能力；已有标准配置时不得自制替代脚本。
3. 写明已确认事实、未知项、根因假设、兼容矩阵、最小改动和验证方法。
4. 多个主版本不得同时试验；在隔离环境中一次只改变一个变量。
5. 未经契约证据或单变量复现，不得修改配置、源码或测试来迁就依赖错误。
6. 若上述证据已经齐全，明确引用证据并说明当前修改只验证哪个假设，然后执行最小改动。
7. 实测完成前，不得宣称改动小、风险低或给出确定工时。