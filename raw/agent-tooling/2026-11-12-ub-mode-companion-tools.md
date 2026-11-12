# ub-mode 配套工具的文档、包配置与项目运行方式

> Source: https://github.com/unclebob/ub-mode/blob/master/SKILL.md; https://github.com/unclebob/ub-mode/blob/master/README.md; 下文各工具的固定提交文档、包配置、安装脚本及 GitHub API
> Collected: 2026-11-12
> Published: Unknown

## 来源版本

以下是本次用户安装日志对应的源码版本，工具文档与 Python 包配置按这些提交核对。

| 工具 | 提交 | README |
|---|---|---|
| crapper | c757ec79a6c15dc815238bbd9c2f4601eb54d3cc | https://github.com/unclebob/crapper/blob/c757ec79a6c15dc815238bbd9c2f4601eb54d3cc/README.md |
| dryer | 66ff6d21a42c04afcad89c78a80066176d1294b0 | https://github.com/unclebob/dryer/blob/66ff6d21a42c04afcad89c78a80066176d1294b0/README.md |
| mutator | 830ec7e9c39664d753f8699015bc796df67727b9 | https://github.com/unclebob/mutator/blob/830ec7e9c39664d753f8699015bc796df67727b9/README.md |
| uml-viewer | ad6c36d964ef4dab07623ab98122d72010ecb5a6 | https://github.com/unclebob/uml-viewer/blob/ad6c36d964ef4dab07623ab98122d72010ecb5a6/README.md |

## ub-mode 规则原文摘录

来源：https://github.com/unclebob/ub-mode/blob/master/SKILL.md；同时核对本机已安装的 `ub-mode/SKILL.md`。

```markdown
## Crapper

* Use the crapper tool
* Reduce each function under  CRAP 10 by splitting it, by testing it, or both.
* Consider whether case statements are worth reducing.

## Dryer

* Use the dryer tool to eliminate duplication that rank 0.8 or above.

## Mutator

* Use the mutator tool
* Cover the uncovered.
* Kill the survivors.
* Delete dead code.
```

README 的 Companion Tool Repositories 列出 crapper、dryer、mutator、uml-viewer。SKILL.md 的上述执行步骤只指定前三个工具。读取的 SKILL.md 中没有安装这些工具的总控程序，也没有要求目标项目通过 mutator API 编写测试。

## crapper：README 与 CLI 帮助摘录

```text
CRAP = CC² × (1 − coverage)³ + CC
```

README 的输出项：

- a table on stdout, worst score first
- `.metrics/crap.edn`, replaced on every successful analysis

README 的运行示例：

```bash
./crapper --no-coverage                  # complexity only; coverage is N/A
./crapper --use-existing-coverage        # read reports already on disk
./crapper --changed                      # git additions and edits
./crapper --threshold 30                 # exit 2 when the worst score is higher
```

用户提供的已安装版本 CLI 帮助：

```text
--no-coverage                 Score complexity only. Coverage and CRAP are N/A.
--threshold <number>          Exit 2 when the worst CRAP score is above this.
```

README 的覆盖率命令表：

| Language | Command | Report |
| --- | --- | --- |
| Clojure | `clj -M:cov --lcov` (needs `deps.edn` or `bb.edn`) | `target/coverage/` |
| Java | JaCoCo Maven plugin `0.8.12` in each module with `pom.xml` | `target/site/jacoco/jacoco.xml` |
| Go | `go test ./... -coverprofile=...` | `target/coverage/go/coverage.out` |
| TypeScript | `npm run coverage`, or Vitest `--coverage`, or `npx c8 ... npm test` | `coverage/lcov.info` or `target/coverage/typescript/lcov.info` |
| Rust | `cargo llvm-cov` or `cargo tarpaulin`, per Cargo package | `target/coverage/rust/lcov.info` |
| Python | `coverage run` pytest or unittest, then `coverage lcov` | `target/coverage/python/lcov.info` |

README 对运行影响的记载：默认删除对应语言的旧报告并重新生成；缺少工具或测试失败时以该语言覆盖率为零写入快照；Python 路径可能向项目解释器安装缺少的 coverage 和 pytest；Vitest 路径可能向 node_modules 安装缺少的 @vitest/coverage-v8；Rust 路径在缺少两种覆盖工具时安装 cargo-llvm-cov。这些是文档记载，本次没有执行覆盖率生成。

## dryer：README 摘录

```text
score = shared fingerprints / all fingerprints seen in either form
```

README 的参数：

```text
--threshold N    Minimum structural similarity score, default 0.82
--min-lines N    Minimum source lines in a candidate form, default 4
--min-nodes N    Minimum normalized syntax nodes, default 20
--format F      text or edn, default text
```

README 输出为 stdout 报告及 `.metrics/dry.edn`。比较范围是同语言的规范化结构；保留调用名称、运算符和语法树形状，忽略局部变量名、字段名、字面量等差异。高分条目是需要审阅的候选。

用户提供的 CLI 帮助列出 Clojure、Java、Go、TypeScript、Rust、Python。正常写出报告退出 0，用法错误退出 1，未知输出格式退出 2。

## mutator：运行与变异规则

README 开头原文：

> Mutation testing for Clojure, Java, Go, TypeScript, Rust, and Python.

README 的命令示例：

```bash
./mutator src/demo/core.clj
./mutator --scan src/demo
./mutator --changed
./mutator --mutate-all
./mutator --no-coverage
./mutator --use-existing-coverage
./mutator --test-command "pytest -q tests/test_demo.py"
./mutator --max-workers 3 src/demo/core.clj
```

以下为 README 各节的可核对摘录记录：

- `--scan` 列出变异位置，不运行测试、不写指标。
- 实际变异前，在原项目目录运行一次 baseline；失败则退出 2，不重写快照。
- 每个 worker 位于 `target/mutation-workers`；被变异的文件使用私有副本，其余项目内容通过链接提供；变异测试在 worker 内运行。测试命令本身的副作用取决于项目。
- 测试失败或超时记为 killed；仍通过记为 survived；覆盖率未命中的位置记为 uncovered，默认不运行该位置的变异。
- `.metrics/mutate/<namespace>.edn` 保存结果；已有快照时，默认重新运行幸存变异体及文本变化函数中的位置。
- 每次只处理一个文件，该文件的多个位置可以并行执行。
- 变异规则由 mutator 按语言实现。README 没有把 PIT、Stryker 或 mutmut 列为它的底层引擎。

README 的默认测试命令表：

| Language | Command | Where |
| --- | --- | --- |
| Clojure | `clj -M:spec --tag ~no-mutate` when Speclj is on classpath, otherwise `clj -M:test` or `bb spec` | nearest `deps.edn` or `bb.edn` |
| Java | `mvn -q test -DexcludeTags=no-mutate` | nearest `pom.xml` |
| Go | `go test -count=1` file's package | nearest `go.mod` |
| TypeScript | `npm test` | nearest `package.json` |
| Rust | `cargo test` | nearest `Cargo.toml` |
| Python | project's `.venv` or `venv` Python running `pytest`, or `unittest discover` | nearest project file |

用户提供的 CLI 帮助：

```text
--test-command <cmd>          Run this command for the baseline and every
                              mutant. The working directory is the project
                              root.
--max-workers <number>        Run at most this many mutants of one file at
                              once.
Exit codes:
  0  every executed mutant was killed, or there was nothing to run
  1  usage error
  2  baseline tests failed
  3  at least one mutant survived
```

这些运行路径显示：mutator 的测试入口是项目现有测试命令，测试代码不需要 import mutator；工具本身可以安装在仓库外。是否修改 JUnit、pytest 等普通测试由 agent 根据报告判断。

## 三个 Python 包的配置

来源：

- https://github.com/unclebob/crapper/blob/c757ec79a6c15dc815238bbd9c2f4601eb54d3cc/pyproject.toml
- https://github.com/unclebob/dryer/blob/66ff6d21a42c04afcad89c78a80066176d1294b0/pyproject.toml
- https://github.com/unclebob/mutator/blob/830ec7e9c39664d753f8699015bc796df67727b9/pyproject.toml

三个配置共有的原文：

```toml
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "tree-sitter>=0.24",
    "tree-sitter-language-pack>=0.7",
]

[project.optional-dependencies]
dev = ["pytest>=8"]
```

entry point 分别为 `crapper = "crapper.cli:main"`、`dryer = "dryer.cli:main"`、`mutator = "mutator.cli:main"`。mutator 的 dependencies 没有声明 crapper。

## 版本与阈值字段

以下字段从上文原文提取，供阅读包配置与 CLI 默认值时直接核对。

| 字段 | 值 | 原文位置 |
|---|---|---|
| 三个 Python 包的 version | 0.1.0 | 各自 pyproject.toml |
| ub-mode 的重复代码处理阈值 | 0.8 | SKILL.md 的 Dryer 一节 |
| dryer 默认的 --threshold | 0.82 | README 参数表与 CLI 帮助 |

## mutator 的 crapper 导入

来源：https://github.com/unclebob/mutator/blob/830ec7e9c39664d753f8699015bc796df67727b9/src/mutator/crapper_link.py

模块说明原文：

```text
Import crapper from the environment or the sibling checkout.

Function names and namespaces come from crapper so `.metrics/mutate` joins
the same operations uml-viewer joins to `.metrics/crap.edn`.
```

`ensure_crapper()` 先尝试导入 crapper，导入失败后检查同级源码目录；两者均不存在时抛出 ImportError。该环境导入要求在 uv 隔离安装中需要通过附加依赖满足。

## uml-viewer：可视化与安装前提

README 的 Run 一节：

> Needs Clojure CLI and Java 21+.

官方安装命令：

```bash
cd /path/to/the-project
curl -fsSL https://raw.githubusercontent.com/unclebob/uml-viewer/master/scripts/get-uml-viewer -o get-uml-viewer
chmod +x get-uml-viewer
./get-uml-viewer --install-only
./uml
```

安装脚本：https://github.com/unclebob/uml-viewer/blob/ad6c36d964ef4dab07623ab98122d72010ecb5a6/scripts/get-uml-viewer

脚本以 `#!/bin/zsh` 开始，使用 Git 获取源码，写入 `./uml`，修改项目 `.gitignore`，忽略 `.uml-viewer/` 和 `uml-viewer-log.txt`。默认源码地址为 `https://github.com/unclebob/uml-viewer.git`，ref 为 `master`。已有 checkout 时执行 fetch 和 checkout FETCH_HEAD。`--install-only` 跳过启动。

README 的 Language graphs 分别列出 Clojure、TypeScript、Rust、Python、Go。Java 仅在自定义注册示例 `(graph/register! :java my-java-scanner)` 中出现。

README 指标来自 `.metrics/crap.edn` 与 `.metrics/mutate/*.edn`，按 namespace 和函数名对应；文档没有列出 `.metrics/dry.edn` 的接入。README 同时描述了 GUI 与 tmux 中 Grok companion 的联动。viewer 是 Clojure 应用，安装方式不属于 uv Python tool 安装。

## 分发与 star 快照

2026-11-12 对以下 API 读取 `stargazers_count`：

- https://api.github.com/repos/unclebob/crapper
- https://api.github.com/repos/unclebob/dryer
- https://api.github.com/repos/unclebob/mutator
- https://api.github.com/repos/unclebob/uml-viewer

| 仓库 | stargazers_count |
|---|---:|
| unclebob/crapper | 227 |
| unclebob/dryer | 94 |
| unclebob/mutator | 119 |
| unclebob/uml-viewer | 498 |

各仓库 `/releases?per_page=1` 均返回空数组。这表示采集时没有已发布的 GitHub Release。会话中的 PyPI 检查还确认：同名 dryer、mutator 包归属其他项目；不要凭名称安装这些同名包。

## 实测范围

本次会话实际验证了安装、帮助命令和 mutator 导入依赖；用户随后提供了全局安装及帮助输出。没有在六种语言项目中逐一执行分析，没有运行 uml-viewer，也没有对照 PIT、Stryker、mutmut 的同项目结果。
