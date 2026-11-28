# 终端颜色开关导致的日志断言失败

> Source: copilot-api 提交 e7c29f80、`src/lib/logger.ts`、`src/routes/responses/local-behavior.ts`、Bun 测试运行输出
> Collected: 2026-11-28
> Published: Unknown

## 一、判定与着色代码

`src/lib/logger.ts`：

```ts
export function shouldUseColor(): boolean {
  if (process.env.NO_COLOR !== undefined) return false
  if (!process.stdout.isTTY) return false
  return true
}
```

```ts
export function colorizeModel(name: string): string {
  const hash = fnv1a(name)
  const colorCode = MODEL_COLOR_CODES[hash % MODEL_COLOR_CODES.length]
  return `\x1b[38;5;${colorCode}m${name}\x1b[0m`
}
```

判定只读 `NO_COLOR` 与 `process.stdout.isTTY`，不读 `TERM`。`NO_COLOR` 只要被定义就关闭颜色，空字符串也算。

`src/routes/responses/local-behavior.ts` 的 `prepareNativeResponsesRequest`：

```ts
  const model = shouldUseColor() ? colorizeModel(payload.model) : payload.model
  consola.info(
    `IN ${model} [effort=${sentEffort ?? "unsupported"} (${effortForLog.source})]`,
  )
```

测试用 `spyOn(consola, "info")` 取第一条参数，再与完整明文比较：

```ts
expect(logs).toContain("IN gpt-image [effort=high (request)]")
```

## 二、九项失败的实际输出

| 文件 | 断言行 | 期望 | 实际 |
|---|---|---|---|
| tests/responses-local-behavior.test.ts | 118 | `IN gpt-image [effort=high (request)]` | `IN \u001B[38;5;165mgpt-image\u001B[0m [effort=high (request)]` |
| tests/responses-local-behavior.test.ts | 129 | `IN local-effort-config-default [effort=high (config)]` | `IN \u001B[38;5;175mlocal-effort-config-default\u001B[0m [effort=high (config)]` |
| tests/responses-local-behavior.test.ts | 140 | `IN local-effort-config-default [effort=unsupported (config)]` | `IN \u001B[38;5;175mlocal-effort-config-default\u001B[0m [effort=unsupported (config)]` |
| tests/responses-local-behavior.test.ts | 159 | `IN local-effort-config-default [effort=low (config)]` | `IN \u001B[38;5;175mlocal-effort-config-default\u001B[0m [effort=low (config)]` |
| tests/copilot-effort-paths.test.ts | 412 | `IN local-effort-native [effort=low (config)]` | `IN \u001B[38;5;165mlocal-effort-native\u001B[0m [effort=low (config)]` |
| tests/copilot-effort-paths.test.ts | 428 | `IN local-effort-native [effort=high (request)]` | `IN \u001B[38;5;165mlocal-effort-native\u001B[0m [effort=high (request)]` |
| tests/copilot-effort-paths.test.ts | 441 | `IN local-effort-native [effort=low (config)]` | `IN \u001B[38;5;165mlocal-effort-native\u001B[0m [effort=low (config)]` |
| tests/copilot-effort-paths.test.ts | 454 | `IN local-effort-native [effort=unsupported (config)]` | `IN \u001B[38;5;165mlocal-effort-native\u001B[0m [effort=unsupported (config)]` |
| tests/copilot-effort-paths.test.ts | 467 | `IN local-effort-native [effort=minimal (config)]` | `IN \u001B[38;5;165mlocal-effort-native\u001B[0m [effort=minimal (config)]` |

九项之前的 effort、reasoning 与响应状态断言全部通过。失败只出现在整串日志比较上。

## 三、三组计数

```
5384 pass
9 fail
23699 expect() calls
Ran 5393 tests across 267 files. [100.52s]
```

```
18 pass
9 fail
83 expect() calls
Ran 27 tests across 2 files. [722.00ms]
```

```
46 pass
0 fail
343 expect() calls
Ran 46 tests across 4 files. [989.00ms]
```

| 条件 | 通过 | 失败 | 文件 |
|---|---|---|---|
| 用户终端，`NO_COLOR` 未设置 | 5384 | 9 | 全量 267 个 |
| 真实 TTY，`NO_COLOR=1` | 27 | 0 | 上述两个 |
| 真实 TTY，取消 `NO_COLOR` | 18 | 9 | 上述两个 |
| 修复后真实 TTY，取消外部 `NO_COLOR` | 46 | 0 | 上述两个加两个颜色专项测试 |

复现命令（`script` 提供真实 TTY，`env -u NO_COLOR` 清掉继承的颜色开关）：

```
script -qefc "env -u NO_COLOR bun run test tests/responses-local-behavior.test.ts tests/copilot-effort-paths.test.ts" /dev/null
```

## 四、修复

提交 `e7c29f80 fix: disable color in isolated test runs`：

```diff
     "start": "NODE_USE_SYSTEM_CA=1 NODE_ENV=production bun run ./src/main.ts",
-    "test": "bun run test:isolated-env test --isolate",
+    "test": "NO_COLOR=1 bun run test:isolated-env test --isolate",
     "test:isolated-env": "isolated_env() ( dir=$(mktemp -d /tmp/copilot-api-isolated.XXXXXX) && trap 'rm -rf -- \"$dir\"' EXIT && mkdir -p \"$dir/home\" \"$dir/cache\" && HOME=\"$dir/home\" XDG_CACHE_HOME=\"$dir/cache\" COPILOT_API_TEST_HOME=\"$dir/home\" COPILOT_API_SQLITE_DB_PATH=:memory: COPILOT_API_HOME=\"$dir/home\" COPILOT_API_LOG_DIR=\"$dir/log\" bun \"$@\" ); isolated_env",
```

`package.json` 其余环境变量在 `test:isolated-env` 的 `isolated_env` 函数里设置；`NO_COLOR=1` 放在 `test` 脚本前置位置，作用于该脚本启动的整条测试链。

## 五、颜色行为的专项覆盖

`tests/auto-session-logs.test.ts` 用参数化用例分别断言三种条件：

```ts
    { tty: true, noColor: undefined, colored: true },
    { tty: true, noColor: "", colored: false },
    { tty: false, noColor: undefined, colored: false },
```

用例名称为 `terminal colors respect TTY=$tty and NO_COLOR=$noColor`。每个用例自行改写 `process.stdout.isTTY` 与 `NO_COLOR`，再断言有颜色时出现 `logger.colorizeModel(...)`、无颜色时不出现 `\x1b[`。

`tests/auto-session-websocket-local.test.ts` 对同一组条件做 websocket 版本：用例名为 `Responses websocket logs $source discount bypass with TTY=$tty NO_COLOR=$noColor`。

因此测试入口统一设置 `NO_COLOR=1` 后，颜色行为仍有专门的用例覆盖。

## 六、残余缺口

直接运行 `bun test` 会绕过 `package.json` 的 `test` 脚本，在彩色终端下仍会触发同类失败。仓库文档里的测试命令都经过脚本执行。
