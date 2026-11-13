# ub-mode 配套工具：安装、升级与项目运行方式

> Sources: unclebob/ub-mode 与四个配套仓库文档和包配置，2026-11-12 采集；uv 官方文档与本次会话安装日志，2026-11-12；edn-format/edn 规范及提交历史，2026-11-12 采集；crapper `c757ec7`、dryer `66ff6d2`、mutator `830ec7e` 的源码与提交说明，2026-11-13 采集；dryer PR #16、issue #17、PR #19，2026-11-13；本机 agc 仓库的 crapper 与 mutator 实测输出，2026-11-13
> Raw: [配套工具文档与配置](../../raw/agent-tooling/2026-11-12-ub-mode-companion-tools.md); [uv Git 安装与升级证据](../../raw/agent-tooling/2026-11-12-uv-git-tools-install-and-upgrade.md); [EDN 规范与作者记录](../../raw/agent-tooling/2026-11-12-edn-specification-and-authorship.md); [语言支持与上游缺口](../../raw/agent-tooling/2026-11-13-ub-mode-tools-language-matrix.md); [作者自用证据](../../raw/agent-tooling/2026-11-13-ub-mode-tools-self-run-evidence.md); [修复前后实测](../../raw/agent-tooling/2026-11-13-ub-mode-metrics-before-after.md)
> Updated: 2026-11-13

## Overview

ub-mode 在 Then Make it Right 阶段明确要求 agent 使用 crapper、dryer 和 mutator。它们是外部命令行工具，agent 在目标仓库中调用、读取结果，再修改源码或项目已有测试。uml-viewer 在 README 中列为配套可视化工具，SKILL.md 没有要求运行它。skill 文本提供操作规则，工具安装与执行仍由调用它的 agent 或用户完成。三者的语言注册并不一致，读指标前需要先确认当前项目所用的后缀是否被登记。

## 三个检查工具与可选 viewer

| 工具 | 检查或显示内容 | 输出与语言范围 |
|---|---|---|
| [crapper](https://github.com/unclebob/crapper) | 逐函数计算圈复杂度、覆盖率和 CRAP | 终端表格、`.metrics/crap.edn`；Clojure、Java、Go、TypeScript、Rust、Python，另认 `.js`、`.jsx`、`.mjs`、`.cjs` |
| [dryer](https://github.com/unclebob/dryer) | 比较同语言的规范化结构，报告相似代码候选 | 终端报告、`.metrics/dry.edn`；Clojure、Java、Go、TypeScript、Rust、Python；当前不认 JavaScript 扩展名 |
| [mutator](https://github.com/unclebob/mutator) | 生成源码变异体，运行项目已有测试，记录结果 | `.metrics/mutate/<namespace>.edn`；同 crapper 的语言范围，另认 `.js`、`.jsx`、`.mjs`、`.cjs` |
| [uml-viewer](https://github.com/unclebob/uml-viewer) | 图形化查看依赖、源码和指标，也可与 companion agent 联动 | 内置 Clojure、TypeScript、Rust、Python、Go 扫描器；读取 CRAP 和 mutation 指标 |

uml-viewer 的 Java 扫描只在自定义注册示例中出现，未列为内置能力。README 没有给出 dryer 指标的接入方式；dryer 的终端与 EDN 报告单独审阅。

ub-mode 要求函数 CRAP 低于 10，处理相似度达到 0.8 的重复代码，并处理未覆盖位置、幸存变异体和无用代码。工具参数与规则边界需要分别读清：crapper 的 `--threshold` 在分数高于阈值时退出失败，因此 `--threshold 10` 对恰好等于 10 的情况仍需按 skill 要求检查。dryer 默认阈值是 0.82，按该 skill 工作时应显式设置 `--threshold 0.8`。

## 语言注册：源码核对

三个工具都支持 `.java`。Java 的覆盖率来自 JaCoCo 的 `INSTRUCTION` 计数，crapper 与 mutator 共用同一套方法与命名空间；dryer 只比较带方法体的方法，跳过构造器、抽象方法与匿名类内的方法。

JavaScript 与 TypeScript 家族按后缀登记，三个工具并不一致：

| 后缀 | crapper | dryer | mutator |
|---|---|---|---|
| `.ts` `.tsx` `.mts` `.cts` | 认 | 认 | 认 |
| `.js` `.jsx` `.mjs` `.cjs` | 认 | 不认 | 认 |

认后缀不等于选对语法。crapper 用 `_JS_SUFFIXES = (".jsx", ".mjs", ".cjs", ".js")` 把这四种交给 tree-sitter 的 `javascript` grammar，`.tsx` 用 `tsx`，其余用 `typescript`；mutator 在 `sites.py::_grammar` 有同样分支。dryer 的 `extract.py::_grammar` 在 `66ff6d2` 只处理 `.tsx`，其余全部返回 `typescript`。

## JavaScript 支持缺口与上游修复

dryer 的缺口分两层，缺任意一层都拿不到可靠的 JavaScript 结果：

| 层 | 位置 | 缺该层的表现 |
|---|---|---|
| 文件发现 | `discover.EXTENSIONS` | 扫描范围内只剩 JavaScript 文件时输出 `No source files to analyze.`，退出 0 |
| 语法选择 | `extract._grammar` | 文件进入扫描，JSX 按 TypeScript grammar 解析，与等价 TSX 组件不匹配 |

`discover.py` 的模块说明声称扩展名与跳过目录跟 crapper、mutator 一致，实际 `EXTENSIONS` 没有 `.js`、`.jsx`、`.mjs`、`.cjs`，`is_test_file` 也只列到 `.test.cts` 与 `.spec.cts`。

显式传入单个文件会绕过语言与测试文件过滤，因此 `.jsx` 文件能被读入，但仍按 TypeScript grammar 解析；含 JSX 的文件在结构比较中不可靠。

上游状态：PR #16 补文件发现与八个测试后缀，issue #17 提出同一诉求，PR #19 补语法选择并加四项行为回归，采集时三者都是 open。两个 PR 合入前，dryer 的 JavaScript 结果需要按上述两层分别确认。

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

## 指标怎么读

CRAP 把圈复杂度与覆盖率合成一个数：

$$\text{CRAP} = \text{CC}^2 \times (1 - \text{Cov})^3 + \text{CC}$$

覆盖率为 0 时退化为 `CC² + CC`。同一个函数在补测试前后可以是 3660 与 4 的差别，差别来自覆盖率，与代码有没有变简单无关。`crapper --no-coverage` 把覆盖率与 CRAP 都写成 N/A，读数前先确认用的是哪种模式。

mutator 回答另一个问题：这条分支有没有断言真正验证。位置被执行到也可能存活；存活变异体表示测试跑过且没失败。

dryer 的分数是结构指纹的 Jaccard 相似度，默认阈值 0.82。它只比较同一语言内的形式，跨语言不产生候选；某语言整体未登记时，结果是空报告，该结果只覆盖已登记的语言。

### agc 仓库的一次实测

| 函数 | 修复前 CC | 修复前 CRAP | 修复后 CC | 修复后覆盖率 | 修复后 CRAP |
|---|---:|---:|---:|---:|---:|
| `checkPage` | 60 | 3660 | 4 | 100.0 | 4.0 |
| `main` | 53 | 2862 | 7 | 100.0 | 7.0 |
| `browserCheck` | 52 | 2756 | 6 | 100.0 | 6.0 |

修复前的 CRAP 由 `CC² + CC` 算出，当时三个入口没有进程内覆盖率。修复后三个入口都有测试直接调用，覆盖率到 100.0，Bun 全套 139 项通过，根 Python 47 项、字体 2 项通过。

同一仓库的目标变异在补测试后 6 个全部 KILLED，幸存 0：`manifest.py:71 or -> and`、`transfer.py:22 == -> !=`、`evidence.mjs:58` 的四处。两个运行都按行限定，结果分别写入 `.metrics/mutate/agc_sync.manifest.edn`、`.metrics/mutate/agc_sync.transfer.edn` 与 `.metrics/mutate/evidence.edn`。

### 覆盖率读数的一个已知失真

`initPageModules` 覆盖率 15.7895、`awaitMount` 17.6471、`readFontGlobals` 0.0，而测试确实执行了这些函数。当前解释是：这些函数作为回调传给 `page.evaluate`，序列化后由 `node:vm` 执行，Bun 生成的 LCOV 无法把执行行映射回原文件。这是对数字与测试事实的解释，未从工具文档得到确认。遇到 CRAP 高而测试明显覆盖的浏览器侧函数，先确认覆盖率报告的归属方式，再决定是否拆分。

## 作者仓库是否自用这三个工具

| 仓库 | 提交说明点名的工具 | 可确认的范围 |
|---|---|---|
| crapper | crapper、dryer、mutator | 三个都点名，并给出各自结果 |
| mutator | crapper、dryer、mutator | 三个都点名，并给出各自结果 |
| dryer | 无工具名 | 有 CRAP 与变异测试的表述，未写由哪个 CLI 产出 |

三个默认分支都没有 `.github/` 目录，没有 CI 自动运行这三项检查。三个仓库的 `.gitignore` 都包含 `.metrics/`，指标产物不进入版本库；没有已提交的指标不能说明从未运行。

## 运行影响与验证边界

mutator 对待变异文件使用 worker 私有副本；baseline 在真实项目目录运行，项目测试命令本身的写入和外部副作用仍由项目决定。crapper 默认重建覆盖率报告，可能向项目解释器或 node_modules 安装缺少的测试、覆盖率包，或安装 Rust 覆盖率工具。crapper 遇到缺少工具或测试失败时可能写入覆盖率为零的快照，阅读报告时需要同时检查执行日志。

`crapper --no-coverage` 只检查复杂度，覆盖率和 CRAP 都是 N/A；`--use-existing-coverage` 使用已有报告。应根据当前任务选择检查范围，不能把跳过的覆盖率检查报告为 CRAP 已通过。

本次会话已执行临时 HOME 的 Git 安装、三个帮助入口、mutator 依赖导入及无更新场景的 upgrade-all。用户随后提供了全局安装成功和三个 `--help` 的输出。安装版本均为 0.1.0；三个 `--version` 都返回用法错误，版本可用 `uv tool list` 查看。

本次已在一个 JavaScript 项目上执行真实 CRAP 与目标变异，并用 `--no-coverage` 与已有 LCOV 两种模式读数。尚未运行六种语言的完整项目分析，未运行 uml-viewer，也未测试远端新增提交后的升级过程。

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
