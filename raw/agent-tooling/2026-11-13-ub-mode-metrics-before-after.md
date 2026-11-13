# agc 仓库上 crapper 与 mutator 的修复前后实测

> Source: 本机 `/home/cpf/code-inside/agc`，修复前快照 `714f4f2` 与提交 `d314097`；crapper 与 mutator 实际运行输出；`/tmp/agc-ranked-browser.3QdFwy` 日志
> Collected: 2026-11-13
> Published: Unknown

## 测量对象

`tools/tern-maintain/` 的三个入口函数：`page-check.mjs::checkPage`、`cli.mjs::main`、`runtime.mjs::browserCheck`。

修复前快照为 `714f4f2`，修复后为提交 `d314097`。

## 修复前：圈复杂度

在 `714f4f2` 的独立 worktree 中执行：

```bash
crapper --no-coverage tools/tern-maintain/page-check.mjs tools/tern-maintain/cli.mjs tools/tern-maintain/runtime.mjs
```

输出原文：

```text
Function                       Namespace                             CC    Cov%     CRAP
----------------------------------------------------------------------------------------
checkPage                      tools.tern-maintain.page-check        60   N/A       N/A
main                           tools.tern-maintain.cli               53   N/A       N/A
browserCheck                   tools.tern-maintain.runtime           52   N/A       N/A
```

`--no-coverage` 时覆盖率与 CRAP 都是 N/A。以覆盖率为 0 计算，CRAP 为 `CC² + CC`：

| 函数 | CC | 计算 | CRAP |
|---|---:|---|---:|
| `checkPage` | 60 | 3600 + 60 | 3660 |
| `main` | 53 | 2809 + 53 | 2862 |
| `browserCheck` | 52 | 2704 + 52 | 2756 |

## 修复后：`.metrics/crap.edn`

提交 `d314097` 的 `.metrics/crap.edn` 相关行原文：

```clojure
{:name "checkPage", :namespace "tools.tern-maintain.page-check", :complexity 4, :coverage 100.0, :crap 4.0}
{:name "main", :namespace "tools.tern-maintain.cli", :complexity 7, :coverage 100.0, :crap 7.0}
{:name "browserCheck", :namespace "tools.tern-maintain.runtime", :complexity 6, :coverage 100.0, :crap 6.0}
```

同一批数值的表格形式，供正文检索：

| 函数 | 修复后 CC | 修复后覆盖率 | 修复后 CRAP |
|---|---:|---:|---:|
| `checkPage` | 4 | 100.0 | 4.0 |
| `main` | 7 | 100.0 | 7.0 |
| `browserCheck` | 6 | 100.0 | 6.0 |

同一文件中的三个辅助函数：

```clojure
{:name "initPageModules", :namespace "tools.tern-maintain.runtime", :complexity 9, :coverage 15.7895, :crap 57.3709}
{:name "awaitMount", :namespace "tools.tern-maintain.runtime", :complexity 6, :coverage 17.6471, :crap 26.1066}
{:name "readFontGlobals", :namespace "tools.tern-maintain.page-check", :complexity 4, :coverage 0.0, :crap 20.0}
```

这三个辅助函数由浏览器侧回调调用。测试通过 `node:vm` 真实执行了这些回调，覆盖率仍显示 15.7895、17.6471 与 0.0。

## 目标变异：修复后

`mutation-sync-focused.log` 原文：

```text
KILLED    src/agc_sync/manifest.py:71 or -> and
KILLED    src/agc_sync/transfer.py:22 == -> !=
Total                                   2         0          0     23  100.0%
```

`mutation-evidence-focused.log` 原文：

```text
KILLED    evidence.mjs:58 delete !
KILLED    evidence.mjs:58 || -> &&
KILLED    evidence.mjs:58 !== -> ===
KILLED    evidence.mjs:58 1 -> 0
Total                            4         0          0     79  100.0%
```

两个目标共 6 个变异，全部 KILLED，幸存 0。

## 全量测试

`bun-final.log` 原文：

```text
 139 pass
 0 fail
 711 expect() calls
Ran 139 tests across 13 files. [177.29s]
```

`python-final.log` 原文：

```text
Ran 47 tests in 0.107s

OK
```

`fonts-final.log` 原文：

```text
Ran 2 tests in 0.061s

OK
```

## dryer 的 JavaScript 修复验证

| 状态 | 命令 | 输出原文 |
|---|---|---|
| #16 单独，未改 parser | 在 #16 的 worktree 上以 `PYTHONPATH` 指向该 worktree 的 `src` 运行 `pytest -q -o pythonpath=<该 worktree>/src tests/test_languages.py -k javascript_jsx` | `4 failed, 25 deselected in 0.09s` |
| 本修复分支 | `python -m pytest -q` | `84 passed in 0.23s` |
| #16 与本修复组合 | `python -m pytest -q` | `80 passed in 0.27s` |

组合状态下真实 CLI 运行结果：

```text
PASS: real CLI discovers all four JavaScript extensions and reports 28 exact structural duplicate pairs; EDN snapshot exists.
Wrote /tmp/ub-tools-upstream.gIxcof/cli-fixtures/.metrics/dry.edn
```
