# OMP 社区 TTSR 规则资源与筛选

> Sources: can1357/oh-my-pi 官方规则文档，2026-11-22；各候选公开仓库源码与 GitHub API，2026-11-22
> Raw: [生态候选与官方规则分类](../../raw/omp-ttsr/2026-11-22-omp-ttsr-ecosystem-survey.md); [omp-kit-companion 安装与验证](../../raw/omp-extensibility/2026-11-22-omp-kit-companion-plugin-install.md)
> Updated: 2026-11-22

## 先分清规则形态

官方规则文档把有 `condition`、`astCondition` 或 `question` 且成功注册的文件归入 TTSR；没有这些条件且 `alwaysApply: true` 的文件全文进入系统提示词；普通 rulebook 文件只列名称与简介，由模型按需读取正文。一个文件同时写 `alwaysApply` 和有效条件时，优先按 TTSR 处理。

因此，仓库规则目录里的 Markdown 数量不能直接当成 TTSR 数量；包含触发字段也不等于当前 OMP 版本已经正确加载和触发。

## 值得优先阅读的公开来源

下表的 stars 与最后 push 是 2026-11-22 的 GitHub API 快照。排序依据是规则与当前任务的接近程度，不是星数。

| 来源 | stars | 最后 push | 适合参考的内容 | 采用时的限制 |
|---|---:|---|---|---|
| [M0n7y5/slop-stop](https://github.com/M0n7y5/slop-stop) | 2 | 2026-08-19T16:32:27Z | [no-prose-slop](https://github.com/M0n7y5/slop-stop/blob/main/rules/no-prose-slop.md) 抓未经验证的英文成功措辞；[no-slop-tests](https://github.com/M0n7y5/slop-stop/blob/main/rules/no-slop-tests.md) 抓空测试、同函数生成预期与固定等待 | 英文正则未覆盖中文完成声明；文字匹配不等于核对工具记录 |
| [joshuaswarren/remnic](https://github.com/joshuaswarren/remnic) | 235 | 2026-11-22T07:34:54Z | [规则设计说明](https://github.com/joshuaswarren/remnic/blob/main/.omp/rules/README.md) 解释正常代码案例与规则取舍；通用文件边界和命令提醒可挑选 | Stars 属于主应用；部分规则绑定该项目，且其数字为作者自报 |
| [themuuln/omp-config](https://github.com/themuuln/omp-config) | 1 | 2026-09-23T09:26:13Z | [check-health](https://github.com/themuuln/omp-config/blob/main/agent/rules/check-health.mdc) 强调相关且成本适当的验证；[provider-quota-handling](https://github.com/themuuln/omp-config/blob/main/agent/rules/provider-quota-handling.mdc) 防止明确的额度问题反复请求 | 作者私有 macOS、`hub` 和脚本约定较多；规则主要监视英文模型输出 |
| [zerx-lab/FluxDown](https://github.com/zerx-lab/FluxDown) | 5912 | 2026-11-22T06:17:36Z | 中文 TTSR 写法，报告核对 `.omp/rules/` 23 份条件规则；[依赖政策](https://github.com/zerx-lab/FluxDown/blob/main/.omp/rules/dependency-policy.md) 是中文、限定工具、提醒型例子 | 是应用仓库，星数不属于规则包；项目路径和发布约定需要剔除 |
| [rstacruz/omp-typescript-antislop](https://github.com/rstacruz/omp-typescript-antislop) | 1 | 2026-10-10T11:16:44Z | 报告称 14 份 TypeScript 规则已直读，涉及类型表达、模块模拟和复制开销 | 适合 TypeScript 专题，未解决中文完成声明 |
| [jvsteiner/agent-rules](https://github.com/jvsteiner/agent-rules) | 0 | 2026-10-11T10:18:53Z | 报告称 10 份原生规则均为 `interruptMode: never`，观察秘密、异常、类型与调试输出 | 更强的语义判断位于另一套 Jev 策略中，不能计为原生 TTSR |

## 命令与语言专题来源

`0xfe-project/eta` 的 [go-ioutil](https://github.com/0xfe-project/eta/blob/main/packages/TOBEREFR/eta-plugin-akhook/presets/omp/go-ioutil.md) 用条件匹配 `io/ioutil`，限定 Go 的 edit/write，提醒不打断。报告将其 27 份预设作为目录资产记录，只抽读两份源码；README 说明预设复制自 OMP v18.2.11。

`rstacruz/omp-typescript-antislop` 等专题包适合挑选明确语言边界的提醒。`jvsteiner/agent-rules` 的 `never` 模式提供较少打断的参考，它仍会附加提醒并占用后续处理。

## 持续更新与本地筛选

Git 插件可以整体安装，再用本地配置忽略无关资源。`omp-kit-companion@0.2.145` 的 manifest 加载 15 个扩展；本机将它们全部加入 `disabledExtensions`，同时忽略 6 个作者私有技能和 8 个项目专用规则，保留通用命令、测试与 Beads 纪律。

安装后 `omp ttsr list` 报告 50 条规则，其中 19 条来自插件。对 `All tests pass now.` 执行 `omp ttsr test` 命中 `kit-unverified-done`。该命令验证规则发现和正则匹配，尚未覆盖新会话实际中断、其余规则及中文效果。

## 选择时的判断

优先看规则能否独立运行、检查范围是否准确、正常情况会不会误报，以及提醒方式是否符合当前任务。仓库 Stars 常用于排序阅读，不能直接代表规则有效性。

候选源码只表明公开写法；报告没有安装这些新规则包，中文触发率、误报率、调用费用及长期维护效果均未实测。

## See Also

- [OMP TTSR 与 /omfg](ttsr-and-omfg.md)
- [规则可靠性与误报案例](rule-design-and-false-positive-cases.md)
- [OMP 扩展自动加载机制](../omp-tips/omp-extension-auto-loading.md)
- [OMP Git 插件升级与本地筛选](../omp-tips/omp-git-plugin-updates.md)