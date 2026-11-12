# ub-mode 配套工具：安装、升级与项目运行方式

> Sources: unclebob/ub-mode 与四个配套仓库文档和包配置，2026-11-12 采集；uv 官方文档与本次会话安装日志，2026-11-12；edn-format/edn 规范及提交历史，2026-11-12 采集
> Raw: [配套工具文档与配置](../../raw/agent-tooling/2026-11-12-ub-mode-companion-tools.md); [uv Git 安装与升级证据](../../raw/agent-tooling/2026-11-12-uv-git-tools-install-and-upgrade.md); [EDN 规范与作者记录](../../raw/agent-tooling/2026-11-12-edn-specification-and-authorship.md)
> Updated: 2026-11-12

## Overview

ub-mode 在 Then Make it Right 阶段明确要求 agent 使用 crapper、dryer 和 mutator。它们是外部命令行工具，agent 在目标仓库中调用、读取结果，再修改源码或项目已有测试。uml-viewer 在 README 中列为配套可视化工具，SKILL.md 没有要求运行它。skill 文本提供操作规则，工具安装与执行仍由调用它的 agent 或用户完成。

## 三个检查工具与可选 viewer

| 工具 | 检查或显示内容 | 输出与语言范围 |
|---|---|---|
| [crapper](https://github.com/unclebob/crapper) | 逐函数计算圈复杂度、覆盖率和 CRAP | 终端表格、`.metrics/crap.edn`；Clojure、Java、Go、TypeScript、Rust、Python，文档也列出 JavaScript 扩展名 |
| [dryer](https://github.com/unclebob/dryer) | 比较同语言的规范化结构，报告相似代码候选 | 终端报告、`.metrics/dry.edn`；Clojure、Java、Go、TypeScript、Rust、Python |
| [mutator](https://github.com/unclebob/mutator) | 生成源码变异体，运行项目已有测试，记录结果 | `.metrics/mutate/<namespace>.edn`；同上述六类语言，文档也列出 JavaScript 扩展名 |
| [uml-viewer](https://github.com/unclebob/uml-viewer) | 图形化查看依赖、源码和指标，也可与 companion agent 联动 | 内置 Clojure、TypeScript、Rust、Python、Go 扫描器；读取 CRAP 和 mutation 指标 |

uml-viewer 的 Java 扫描只在自定义注册示例中出现，未列为内置能力。README 没有给出 dryer 指标的接入方式；dryer 的终端与 EDN 报告单独审阅。

ub-mode 要求函数 CRAP 低于 10，处理相似度达到 0.8 的重复代码，并处理未覆盖位置、幸存变异体和无用代码。工具参数与规则边界需要分别读清：crapper 的 `--threshold` 在分数高于阈值时退出失败，因此 `--threshold 10` 对恰好等于 10 的情况仍需按 skill 要求检查。dryer 默认阈值是 0.82，按该 skill 工作时应显式设置 `--threshold 0.8`。

## uv Git 安装

三个 Python 包均声明 Python `>=3.11`、tree-sitter 依赖及 console entry point。正常使用无需 `dev` extra；它仅包含用于工具自身测试的 `pytest>=8`。

```bash
uv tool install git+https://github.com/unclebob/crapper.git
uv tool install git+https://github.com/unclebob/dryer.git
uv tool install \
  git+https://github.com/unclebob/mutator.git \
  --with git+https://github.com/unclebob/crapper.git
```

mutator 的包配置未声明 crapper，但代码需要导入它。uv 为各工具建立隔离环境，因此单独安装 crapper 不会把它加入 mutator 环境。这里的 `--with` 是附加依赖，不是 extra。隔离安装实测中，单独安装 mutator 后导入失败，附加 crapper 后输出 `crapper import: OK`。

这三条命令无需手工 checkout 相邻源码目录，uv 负责取得 Git 源码并构建安装包。采集时四个仓库都没有已发布的 GitHub Release。使用上述完整 Git 地址可以明确项目归属。

升级命令及 Git 输出含义见 [uv 工具发现机制与 uv-receipt.toml](uv-tool-discovery-and-receipts.md#git-来源工具的安装与升级)。

## 前置环境与可选 viewer

前三个工具的 Python 环境由 uv 管理；运行目标项目测试时，仍需要项目自己的依赖及构建工具。分析非 Clojure 项目无需为这三个工具额外安装 Clojure CLI。生成 Clojure 覆盖率时使用 `clj -M:cov --lcov`；Clojure 变异测试命令取决于项目使用的 clj 或 bb 测试入口。

uml-viewer 自身需要 Clojure CLI 和 Java 21+。官方 bootstrap 使用 zsh、Git；完整 companion 流程还涉及 tmux 和 Grok。它属于 Clojure 应用，没有本次三个 Python 工具那样的 uv 安装入口。

如需可视化，在要查看的项目中按官方文档运行：

```bash
curl -fsSL \
  https://raw.githubusercontent.com/unclebob/uml-viewer/master/scripts/get-uml-viewer \
  -o get-uml-viewer
chmod +x get-uml-viewer
./get-uml-viewer --install-only
./uml
```

脚本会获取源码到 `.uml-viewer/uml-viewer/`、生成 `./uml` 并更新项目 `.gitignore`。重复执行 `./get-uml-viewer --install-only` 会重新获取选定 ref；它不属于 `uv tool upgrade --all` 的管理范围。本次没有安装或运行 viewer。

## agent 在目标仓库中怎样使用 mutator

使用者启动 ub-mode 后，agent 按 skill 调用已安装的 CLI。目标项目不需要把 mutator 声明为业务依赖，测试代码也无需 import mutator 或使用专门 API。

以 README 中的 Python 测试命令为例：

```bash
mutator --test-command "pytest -q tests/test_demo.py"
```

这是文档示例，实际运行时应选择当前项目存在且能通过的测试入口。也可以通过文件路径限定范围，或使用 `--changed` 选择 Git 新增及修改文件；`--scan` 只列位置，不运行测试、不写指标。

实际变异流程如下：

1. mutator 按源码语言选择自己的变异规则和默认测试命令。
2. 在原项目目录运行 baseline。失败则退出 2，不重写结果快照。
3. 在 `target/mutation-workers` 中为变异文件创建私有副本，其余项目内容通过链接提供；在 worker 中运行测试。
4. 记录 killed、survived、uncovered 并写入 `.metrics/mutate/<namespace>.edn`。存在幸存变异体时退出 3。
5. agent 根据结果调整项目原有的 JUnit、pytest 等普通测试或源码，再运行相应检查。已有快照时，默认重新检查幸存变异体及文本变化函数中的位置。

Java 默认使用最近 `pom.xml` 对应的 `mvn -q test -DexcludeTags=no-mutate`；Go 使用包测试，Rust 使用 cargo test，TypeScript 使用 npm test，Python 使用项目解释器的 pytest 或 unittest。项目入口与默认值不一致时，通过 `--test-command` 明确指定。工具支持范围之外的语言、其他构建系统或特殊测试布局，需要另行核对支持情况。

mutator 自己实现源码变异规则；README 没有将 PIT、Stryker、mutmut 列为其引擎。ub-mode 当前明确指定 mutator，其他框架可以承担相同质量目标，但未记录读取它们报告并替代 mutator 快照的接口。统一 CLI、共享 namespace 和快照格式可以解释这套组合的便利性，这是基于结构的推断；本次没有得到作者完整的选型动机，也未进行同项目性能或规则覆盖比较。

## 运行影响与验证边界

mutator 对待变异文件使用 worker 私有副本；baseline 在真实项目目录运行，项目测试命令本身的写入和外部副作用仍由项目决定。crapper 默认重建覆盖率报告，可能向项目解释器或 node_modules 安装缺少的测试、覆盖率包，或安装 Rust 覆盖率工具。crapper 遇到缺少工具或测试失败时可能写入覆盖率为零的快照，阅读报告时需要同时检查执行日志。

`crapper --no-coverage` 只检查复杂度，覆盖率和 CRAP 都是 N/A；`--use-existing-coverage` 使用已有报告。应根据当前任务选择检查范围，不能把跳过的覆盖率检查报告为 CRAP 已通过。

本次会话已执行临时 HOME 的 Git 安装、三个帮助入口、mutator 依赖导入及无更新场景的 upgrade-all。用户随后提供了全局安装成功和三个 `--help` 的输出。安装版本均为 0.1.0；三个 `--version` 都返回用法错误，版本可用 `uv tool list` 查看。

尚未运行六种语言的完整项目分析、真实变异测试或 uml-viewer，也未测试远端新增提交后的升级过程。

## EDN 输出格式与作者

EDN 全称为 extensible data notation，是独立的文本数据表示格式，有公开规范，可由不同语言实现 reader 和 writer。规范描述 keyword、map、vector、set、tagged element 等数据形式；它本身不自带 schema。

例如 `:namespace` 是 keyword，`{:a 1}` 是 map，`[a b 42]` 是 vector。工具把分析结果保存为 EDN；查看或读取这些文件无需启动 uml-viewer。

EDN 规范仓库的初始提交日期为 2012-09-06，提交作者是 Rich Hickey；采集时其账号贡献了 26 个提交。该记录支持 Rich Hickey 创建并主导这个公开规范仓库。Uncle Bob 的工具采用 EDN 作为输出格式，作者归属与工具归属分别记录。

## 仓库热度快照

以下是 2026-11-12 的 GitHub API 快照，不随本文自动刷新。

| 仓库 | Stars |
|---|---:|
| unclebob/crapper | 227 |
| unclebob/dryer | 94 |
| unclebob/mutator | 119 |
| unclebob/uml-viewer | 498 |

## See Also

- [pstack 与 ub-mode 的作者归属及原则来源](../ai-coding-agents/pstack-ub-mode-authorship-and-principle-origins.md)
- [uv 工具发现机制与 uv-receipt.toml](uv-tool-discovery-and-receipts.md)
- [Mutation testing、test oracle 与 invariant](../software-testing/mutation-testing-oracles-and-invariants.md)
