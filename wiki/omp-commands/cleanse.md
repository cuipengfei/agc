# OMP Cleanse：动态诊断修复

> Sources: OMP upstream source code
> Raw: [OMP Cleanse 动态发现源码取证](../../raw/omp-commands/2026-09-09-cleanse-discovery-source.md)
> Updated: 2026-09-09

## 结论

`omp cleanse`（或 `/cleanse`）按项目文件和可用 binary **动态发现** checker，缺 binary 就跳过，不强行安装。支持多语言，具体由发现结果决定。

## 发现机制

`cleanse/checkers.ts:106-138` 的 `discoverCleanseDiagnosticSuite` 扫描项目后按语言调用对应 discover 函数：

- `discoverRust` — `Cargo.toml` + `cargo` → `cargo clippy --fix`
- `discoverJavaScript` — `eslint.config.*`/`.eslintrc*` + `eslint` → `eslint`；`tsconfig.json` + `tsc` → `tsc --noEmit`
- `discoverPython` — `.ruff.toml`/`pyproject.toml` + `ruff` → `ruff`
- `discoverGo` — `go.mod` + `go` → `go vet`
- ... 共 15 种以上语言

## 执行

发现后分配并行子 agent 执行修复。esc 取消。`--all` 跑全部，不带参数时弹出选择器。

## 不是固定映射

不存在"有 `package.json` 就用 eslint"的硬规则。实际看配置文件和 binary 是否同时存在。
