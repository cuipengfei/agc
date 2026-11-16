# 配置清单类 skill 的证据复用与确定性检查

> Sources: 本仓库 `.agents/skills/{omp-configs,opencode-configs,herdr-configs,omo-configs,info-tracker}` 正文、脚本与测试运行，2026-11-16; `.github/workflows/{skills.yml,tern-maintain.yml}`，2026-11-16
> Raw: [配置清单类 skill 的证据复用与确定性检查取证](../../raw/agent-tooling/2026-11-16-config-inventory-skill-evidence-and-checks.md)
> Updated: 2026-11-16

## Overview

仓库里的一组 skill 回答同一类问题：某个工具存在哪些配置键、默认值是什么、本机改过哪些。这类 skill 的价值取决于两件事：证据能否复用，检查是否确定性。前者决定解释一个键要花多少检索，后者决定产物是否可信。

## 三层证据

| 层 | 位置 | 内容 | 是否入库 |
|---|---|---|---|
| 运行时快照 | `cache/settings.json`、`cache/settings.html` | 键集合、默认值、合并后的配置值、三态、指纹 | 否 |
| 消费方证据 | `behavior-evidence.json`、`evidence.json`、`omo-evidence.mjs` | 已核对的源码位置与版本 | 是 |
| 翻译层 | `translations.json` | 中文 label 与 desc | 是 |

消费方证据与翻译层分开存放，原因是生命周期不同：翻译文本面向读者，按描述符变化更新；证据指向源码位置，按上游版本过期。两类内容混在一处时，版本变化会牵动无关文本。

`omp-configs` 的证据文件记录 22 个键与 OMP 版本 `18.20.3`；`herdr-configs` 记录 3 个键与 Herdr `0.9.5`；OpenCode 复用已有 `evidence.json`，输出逐键的 `changed`/`missing`/`unchanged` 映射；OMO 把版本常量与已复核键集合写成模块。

## 只查缺项

配置解释类问题的耗时主要花在重复检索上：同一个键的默认值、枚举、消费方在相邻的几轮里被重新查证。可复用的流程是：

1. 读现有快照，取得版本、目标键描述符与脱敏后的配置值。
2. 查消费方证据，取得已核对的版本与源码位置。
3. 把问题与已有字段、说明、证据逐项比较，只查询缺失或版本过期的部分。
4. 委派时附上已知版本、键名、当前结论、已有来源与具体缺口。
5. 报告默认值、可选值、配置文件值与运行时覆盖的区别；未取得的信息明确标注。

指纹覆盖的是描述符字段；消费方代码变化不改变指纹。版本不同时，按用户实际询问的消费方复查，未询问的键保持原证据标记。

## 确定性检查

每个配置 skill 配一套隔离测试，通过真实 CLI 断言用户可见行为：

| skill | 规模 |
|---|---:|
| `omp-configs` | 10 项 |
| `opencode-configs` | 72 项 |
| `herdr-configs` | 3 项 |
| `omo-configs` | 20 项 |
| `info-tracker` | 23 项 |

隔离方式按数据来源分级：`omp-configs` 用假的 OMP 源码树（7 个假设置，覆盖 enum、items、credential、normalize、validate）；`herdr-configs` 在 `PATH` 注入 stub 二进制；`omo-configs` 提供假的 `SettingsManager` 与 `.d.ts`；`opencode-configs` 用临时目录与本地 fixture。

断言选择集中在这几类：

- 只改 `validate` 时描述符指纹翻转；
- 指定的旧快照不存在时报错；
- 未给旧快照时版本结论为 `unknown`；
- 翻译缺项时非零退出且不写产物；
- HTML 内嵌 JSON 与输入快照一致；
- `</script>` 注入按文本显示；
- schema 不完整时缺项计数非零。

这些断言共同点：都能在无本机安装、无网络的环境下运行。CI 因此可以只装 Bun 与 Python。

## CI 触发路径

新增的 `skills.yml` 在 `.agents/skills/**`、`tests/test_info_tracker*.py` 与该 workflow 自身变化时运行，一个 job 五个步骤。

既有 `tern-maintain.yml` 的触发路径是 `tools/tern-maintain/**`、`tools/wiki-check/**`、`wiki/**`、`raw/**` 与自身；`.agents/skills/**` 的变化不触发它。查一次提交的检查结果时，先确认改动落在哪个 workflow 的 `paths` 内。

## 两个容易踩的规则

**Bun 跳过点开头目录。** 在仓库根目录执行 `bun test .agents/skills/<skill>/tests/` 会搜索 2571 个文件、收集 0 个测试文件并返回 1。进入测试目录再执行，或用 workflow 的 `working-directory`。

**版本证据要带标记。** OMO 的 73 个 native 默认值中，2 项已对照安装版 5.1.72 核对，其余标 5.0.1 证据；导出时检测安装版本，不匹配的键在 HTML 里标「未核实」，默认值、生效值与状态分类一并提示可能不准确。当前安装 5.1.72 下导出 158 行，`schemaMissing=16`，71 行未核实、2 行已核对。

未核实标记的作用是让读者知道哪部分可以引用。把所有键都当作同一版本已验证，会让旧证据在升级后继续冒充当前默认值。

## See Also

- [skills CLI 性能模型](skills-cli-performance-model.md) — 目录发现与安装数量的性能差异
- [OMP 配置键全量清单、指纹与凭据遮蔽边界](../omp-config/config-key-census.md) — 键集合、指纹与凭据处理
