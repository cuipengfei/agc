# 作者仓库是否自用 crapper、dryer、mutator

> Source: https://github.com/unclebob/crapper; https://github.com/unclebob/dryer; https://github.com/unclebob/mutator; 三个仓库 `git log`、默认分支文件树与 `.gitignore`，2026-11-13 克隆核对
> Collected: 2026-11-13
> Published: Unknown

## 核对范围

三个仓库完整克隆后读取：默认分支文件树、`.gitignore`、`pyproject.toml`，以及全部提交说明中涉及 `crapper`、`dryer`、`mutator`、`CRAP`、`duplicate`、`mutation`、`self` 的条目。

默认分支文件树中都没有 `.github/` 目录，即没有配置 CI 自动运行这三项检查。

三个仓库的 `.gitignore` 都包含：

```text
.metrics/
```

这表示指标产物不进入版本库。缺少已提交的 `.metrics/` 不能用来推断从未运行过工具。

## crapper：提交说明原文

`c757ec79a6c15dc815238bbd9c2f4601eb54d3cc`：

```text
Find Go coverage by module import path.

Why: `go test -coverprofile` names each file by its module import path.
crapper found it only by path suffix, which works when the module path
happens to end with the project-relative path. A module in a subdirectory
whose name differs from its directory (`svc/go.mod` declaring
`module example.com/api`) scored 0% for every function.

What: `go_import_name` builds the profile's name for a file from the
nearest go.mod's module line and the path inside the module. The bundle
remembers its root and looks a Go file up by that name first, then by the
old suffix match. `_nearest` becomes the shared `nearest_marker` so
coverage and the runners find go.mod the same way. mutator uses
`go_import_name` so the two tools cannot drift.

Proof: three new coverage specs (nested module with a different name,
quoted module path, fallback without a module line) failed first, now
pass; 147 pass, the 2 bb/uml environment failures are unchanged.
crapper on changed code: max CRAP 9.0 (percent_for, unchanged), new
functions <= 7.0. dryer: no candidates in changed files. mutator on the
changed lines: 13/13 killed.
```

`ce3895211e407e5d51d71da711d8a8670a05f7cf`：

```text
Add tests for the branches the first mutation run left alive.
```

## mutator：提交说明原文

`830ec7e9c39664d753f8699015bc796df67727b9`：

```text
Read Go coverage by module import path, the name go test gives a file.

Why: every Go run printed "No coverage data for <file>; its sites are
uncovered". `go test -coverprofile` keys files by import path
(`github.com/acme/tool/cmd/tool/main.go`); mutator looked them up by
absolute disk path (`/.../tool/cmd/tool/main.go`). Neither path ends with
the other, so no Go file ever matched and only --no-coverage ran sites.

What: `_go_lines` asks crapper's `go_import_name` for the profile's name
of the file (nearest go.mod module line plus path inside the module) and
`_lookup` tries that name as an exact key, then the existing suffix
match. Other languages pass no name and are unchanged. Needs crapper
c757ec7 or later.

Proof: two new specs (module at the root, module in a subdirectory with
a different name) failed with None first, now pass; 78 pass. crapper:
_go_lines 6.0, covered_lines 5.0, _lookup 4.0. dryer: no candidates.
mutator on the changed lines: one equivalent survivor (insert(0) vs
insert(1)) removed by appending the name; no survivors left.
```

`63fe452adb706af5f0afba71bf7ee7ba31859d91`：

```text
Add tests that kill the mutation survivors the suite can reach.

A self-run left covered gaps and live mutants. These cases exercise the
real boundaries and leave equivalent mutants and lines coverage cannot see.
```

## dryer：提交说明原文

`66ff6d21a42c04afcad89c78a80066176d1294b0`：

```text
Bring every CRAP score under 10 except the option parser.

The reader, the normalizer, the TypeScript picker, and the fingerprint printer are each a small function. parse_args stays the option switch.
```

`6892667b3441b88379bc8d0439fc2152b0fdb341`：

```text
Extract helpers and test the behavior mutation testing was missing.

The switches stay intact. The new tests pin option parsing, file selection, normalization, and which forms each language compares, so the survivors that remain are equivalent mutants.
```

## 按提交说明可确认的范围

| 仓库 | 明确点名的工具 | 结论 |
|---|---|---|
| crapper | `crapper`、`dryer`、`mutator` | 三个都点名，并给出各自结果 |
| mutator | `crapper`、`dryer`、`mutator` | 三个都点名，并给出各自结果 |
| dryer | 无工具名 | 有 CRAP 分数与变异测试的表述，未写由哪个 CLI 产出；未找到运行 `dryer` 检查自身重复的记录 |

dryer 的 README 只说明它的比较单位与 `crapper`、`mutator` 一致，没有给出自查命令。
