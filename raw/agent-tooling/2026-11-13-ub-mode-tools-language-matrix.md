# ub-mode 三个配套工具的语言支持与上游 JavaScript 缺口

> Source: https://github.com/unclebob/crapper/blob/c757ec79a6c15dc815238bbd9c2f4601eb54d3cc/src/crapper/discover.py; https://github.com/unclebob/crapper/blob/c757ec79a6c15dc815238bbd9c2f4601eb54d3cc/src/crapper/languages/typescript.py; https://github.com/unclebob/mutator/blob/830ec7e9c39664d753f8699015bc796df67727b9/src/mutator/sites.py; https://github.com/unclebob/mutator/blob/830ec7e9c39664d753f8699015bc796df67727b9/src/mutator/crapper_link.py; https://github.com/unclebob/dryer/blob/66ff6d21a42c04afcad89c78a80066176d1294b0/src/dryer/discover.py; https://github.com/unclebob/dryer/blob/66ff6d21a42c04afcad89c78a80066176d1294b0/src/dryer/extract.py; 三个仓库 README; https://github.com/unclebob/dryer/pull/16; https://github.com/unclebob/dryer/issues/17; https://github.com/unclebob/dryer/pull/19
> Collected: 2026-11-13
> Published: Unknown

## 固定版本

| 工具 | 提交 | 默认分支 |
|---|---|---|
| crapper | `c757ec79a6c15dc815238bbd9c2f4601eb54d3cc` | master |
| dryer | `66ff6d21a42c04afcad89c78a80066176d1294b0` | master |
| mutator | `830ec7e9c39664d753f8699015bc796df67727b9` | main |

## crapper：文件发现

`src/crapper/discover.py` 原文：

```python
EXTENSIONS = {
    ".clj": "clojure",
    ".cljc": "clojure",
    ".cljs": "clojure",
    ".bb": "clojure",
    ".java": "java",
    ".go": "go",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".mts": "typescript",
    ".cts": "typescript",
    ".js": "typescript",
    ".jsx": "typescript",
    ".mjs": "typescript",
    ".cjs": "typescript",
    ".rs": "rust",
    ".py": "python",
}
```

## crapper：语法选择

`src/crapper/languages/typescript.py` 原文：

```python
_JS_SUFFIXES = (".jsx", ".mjs", ".cjs", ".js")
```

```python
def _grammar(path: str) -> str:
    if path.endswith(".tsx"):
        return "tsx"
    if path.endswith(_JS_SUFFIXES):
        return "javascript"
    return "typescript"
```

README 原文：

> TypeScript, TSX, and JavaScript (`.js`, `.jsx`, `.mjs`, `.cjs`) use the same structural decisions as Java, including `&&` inside JSX, plus `??` and `?.`.

README 的 Java 段原文：

> Java follows crap4java: `if`, loops, `catch`, `?:`, each `switch` label, and `&&` / `||`. Constructors and methods inside anonymous classes are omitted. Coverage is JaCoCo's `INSTRUCTION` counter.

## mutator：语法选择与 crapper 依赖

`src/mutator/sites.py` 原文：

```python
def _grammar(language: str, path: str) -> str:
    if language == "typescript":
        if path.endswith(".tsx"):
            return "tsx"
        if path.endswith((".js", ".jsx", ".mjs", ".cjs")):
            return "javascript"
        return "typescript"
    if language == "go":
        return "go"
    return language
```

`src/mutator/crapper_link.py` 模块说明原文：

```text
Import crapper from the environment or the sibling checkout.

Function names and namespaces come from crapper so `.metrics/mutate` joins
the same operations uml-viewer joins to `.metrics/crap.edn`.
```

README 原文：

> Java follows [mutate4java](https://github.com/unclebob/mutate4java).

> | Java | `true`/`false`, `==`/`!=`, `<`/`<=`, `>`/`>=`, `+`/`-`, `*`/`/`, `&&`/`||`, delete `!` and unary `-`, `0`/`1`. Constructors are not entries, matching crapper. |

> | TypeScript | the Java set, plus `===`/`!==`, `??` to `||`, and `?.` to `.`. A call or index drops `?.` (`a?.()` becomes `a()`). `.js`, `.jsx`, `.mjs`, and `.cjs` use these rules. |

## dryer：文件发现

`src/dryer/discover.py` 模块说明与 `EXTENSIONS` 原文：

```text
Find source files and decide which language each one is written in.

The extensions and the skipped directories match crapper and mutator, with
`.cljd` added because dry4clj reads it.
```

```python
EXTENSIONS = {
    ".clj": "clojure",
    ".cljc": "clojure",
    ".cljs": "clojure",
    ".cljd": "clojure",
    ".bb": "clojure",
    ".java": "java",
    ".go": "go",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".mts": "typescript",
    ".cts": "typescript",
    ".rs": "rust",
    ".py": "python",
}
```

`is_test_file` 的 TypeScript 分支原文：

```python
    if name.endswith(
        (
            ".test.ts",
            ".spec.ts",
            ".test.tsx",
            ".spec.tsx",
            ".test.mts",
            ".spec.mts",
            ".test.cts",
            ".spec.cts",
        )
    ):
        return True
```

`_walk` 开头原文，显式传入单个文件时直接返回该文件，不经过语言与测试文件过滤：

```python
def _walk(root: Path) -> list[Path]:
    if not root.exists():
        return []
    if root.is_file():
        return [root]
```

## dryer：语法选择

`src/dryer/extract.py` 在 `66ff6d21a42c04afcad89c78a80066176d1294b0` 的原文：

```python
def _grammar(path: str) -> str:
    if path.endswith(".tsx"):
        return "tsx"
    return "typescript"
```

README 开头原文：

> dryer finds candidate duplicate code in Clojure, Java, Go, TypeScript, Rust, and Python.

README 的 Java 候选范围原文：

> | Java | methods with a body | constructors, abstract methods, methods inside anonymous or local classes |

## 既有上游提案：PR #16

标题 `Discover JavaScript sources alongside TypeScript`，作者 `NavidGhoreyshi`，状态 open，创建时间 `2026-11-02T11:13:46Z`。

正文摘录：

> Adds `.js`, `.jsx`, `.mjs`, `.cjs` to `EXTENSIONS` and `.test.js`/`.spec.js`/`.test.jsx`/`.spec.jsx`/`.test.mjs`/`.spec.mjs`/`.test.cjs`/`.spec.cjs` to `is_test_file`.

> `crapper` and `mutator` both handle plain JavaScript, but `dryer` does not: on a JSX codebase (`src/**/*.jsx`, no `.tsx` anywhere) `dryer src` prints `No source files to analyze` and exits with nothing to report.

diff 涉及两个文件：`src/dryer/discover.py` 增加四个 `EXTENSIONS` 条目与八个测试后缀；`tests/test_cli.py` 增加断言。diff 没有修改 `src/dryer/extract.py`。

## 既有上游提案：issue #17

标题 `Read .js, .jsx, .mjs and .cjs like crapper and mutator do`，作者 `omicron-soft`，状态 open，创建时间 `2026-11-07T22:45:18Z`。

正文摘录：

> At `66ff6d2`, `discover.EXTENSIONS` lists `.ts/.tsx/.mts/.cts` but no JavaScript, so on a plain JavaScript tree (`.js`, `.jsx`, `.mjs`, `.cjs`) dryer prints "No source files to analyze."

> `.js/.jsx/.mjs/.cjs` → language `typescript`, and `extract._grammar` returning `"javascript"` for them (the JavaScript grammar parses JSX);

## 本次提交的上游提案：PR #19

标题 `Select the JavaScript grammar for .js, .jsx, .mjs and .cjs`，状态 open，创建时间 `2026-11-13T13:52:36Z`。

改动原文：

```diff
 if path.endswith(".tsx"):
     return "tsx"
+if path.endswith((".js", ".jsx", ".mjs", ".cjs")):
+    return "javascript"
 return "typescript"
```

正文中的范围说明：

> Companion to #16, which adds JavaScript source discovery and test-file exclusions. This PR only handles parser selection and does not overlap those changes. Related to #17.

提交 `deeb8148b47c22046634d2162c37df4d65654552` 的说明原文：

```text
Select the JavaScript grammar for JavaScript sources.

Why: The TypeScript grammar misparses JSX in .js, .jsx, .mjs, and .cjs
inputs, so equivalent JSX and TSX components do not match.

What: Select the JSX-aware JavaScript grammar for those suffixes. Keep
TSX and TypeScript grammar selection unchanged. Companion to #16;
related to #17.

Proof: Four regression cases fail with the original parser and pass with
this change. The full suite passes all 84 tests. Combined with #16, the
existing suite passes all 80 tests, and the real CLI discovers all four
JavaScript extensions and reports 28 exact structural duplicate pairs.
```

## 两个缺口的分层

| 层 | 位置 | 缺该层的表现 |
|---|---|---|
| 文件发现 | `discover.EXTENSIONS` | 纯 JavaScript 目录输出 `No source files to analyze.`，退出 0 |
| 语法选择 | `extract._grammar` | 文件进入扫描，但 JSX 按 TypeScript grammar 解析，与等价 TSX 组件不匹配 |
