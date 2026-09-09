# OMP Cleanse 动态发现源码取证

> Source: can1357/oh-my-pi upstream
> Collected: 2026-09-09

## 关键文件

### checkers.ts

`packages/coding-agent/src/cleanse/checkers.ts:106-138` — `discoverCleanseDiagnosticSuite`：

```ts
await discoverRust(state);
discoverGo(state);
await discoverPython(state);
await discoverJavaScript(state);
discoverRuby(state);
// ... 15 种以上语言
```

### discoverJavaScript

`packages/coding-agent/src/cleanse/checkers.ts:673-748`：
- `eslint.config.*`/`.eslintrc*` + `eslint` 可用 → `eslint`
- `tsconfig.json` + `tsc` 可用 → `tsc --noEmit`
- `biome.json` + `biome` 可用 → `biome`
- `deno.json` + `deno` 可用 → `deno lint`

### discoverRust

`packages/coding-agent/src/cleanse/checkers.ts:404-477`：
- `Cargo.toml` + `cargo` 可用 → `cargo clippy --fix`

## 结论

- 按项目文件和可用 binary 动态发现 checker
- binary 缺失时标记为 skipped，不强行安装
- 支持多语言，具体由发现结果决定
