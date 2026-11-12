# Bun 钩子默认 5 秒预算与超时报错诊断

> Source: GitHub Actions run `42189362972`（失败）与 `42216007618`（修复后通过）、`tools/tern-maintain/lifecycle.test.mjs`、`/tmp` 五组最小用例、CI 运行日志
> Collected: 2026-11-12
> Published: Unknown

## 失败现场

run `42189362972`（提交 `e4d87f7`，纯文档改动）在 `bun test` 失败，`lifecycle.test.mjs` 的第一个准备钩子抛 `fixture build failed: undefined`，日志同时出现 `killed 1 dangling process` 与：

```
(fail) (unnamed) [5005.75ms] ^ a beforeEach/afterEach hook timed out for this test.
```

该钩子用 `spawnSync('cc', [...])` 把 `fixtures/tern-lifecycle.c` 编译成替身 tern 可执行文件（收到 `--version` 返回固定串，其他参数 fork 后 `execvp` 跑同目录 JS 替身脚本，供测试观察进程归属、PID 文件与端口占用）。

## 判定依据

CI 实测耗时对照：

| 运行 | 观测 |
|---|---|
| run `42189362972`（失败） | 测试组开始 `08:40:51.580` → 报错 `08:40:56.590`，约 5.01 秒 |
| run `42040555983`（上次成功） | 组开始 `13:58:50.690` → 首个测试 pass `13:58:54.589`，编译约 3.9 秒 |
| 本机同一文件 | 12 pass、0 fail、2.17 秒 |

上次成功已贴着 5 秒，本次 runner 稍慢越线。本机热缓存 2 秒出头，所以本地不复现。所有断言通过，失败只在准备阶段。

## `/tmp` 最小用例（五组）

| 用例 | 结果 |
|---|---|
| `beforeAll` 异步等 6 秒，无预算 | 失败，`(fail) (unnamed) [5002.07ms]`，报错 `a beforeEach/afterEach hook timed out for this test.` |
| `beforeAll` 异步等 6 秒，预算 `30000` | 通过，6 秒 |
| `beforeEach` 异步等 6 秒，无预算 | 失败，报错文本相同，但显示测试名 |
| `beforeAll` 内 `spawnSync` 阻塞 6 秒，无预算 | 失败，`fixture build failed: undefined` + `(unnamed) [5010.11ms]`，逐字复现 CI |
| 同上，预算 `30000` | 通过，6 秒 |

结论：bun 对 `beforeAll` 与 `beforeEach` 超时的报错文本相同（均写 `a beforeEach/afterEach hook timed out`），不能靠文本区分钩子类型；区分依据是失败条目标记 `(unnamed)`（用例名尚未注册）属 `beforeAll` 路径，显示名字的属 `beforeEach`。

## `spawnSync` 空状态机制

钩子超时后 bun 杀掉子进程，`spawnSync` 返回 `status` 为 `null`、`stderr` 为空、`error` 为 `undefined`。原报错模板按 `compile.stderr || compile.error` 拼接，三者皆空时打印字面量 `undefined`，掩盖真实原因。改法是在报错里补 `status` 与 `signal`：

```js
const detail = compile.stderr || compile.error?.message
  || `status=${compile.status} signal=${compile.signal}`;
```

## 修法与验证

`tools/tern-maintain/lifecycle.test.mjs` 两个 `beforeAll` 尾部闭包后加 `, 30000`（第一个编译替身、第二个内部 `waitFor(..., 8000)` 等服务响应）。第二个钩子的 8 秒内部等待本身已超默认预算，属同类潜伏失败点，一并加预算。预算取值依据是实测最慢一次约 4 秒的约 7 倍余量。

验证：

- 生命周期测试 12 pass、0 fail、2.04 秒。
- 慢编译模拟（PATH 前置睡 6 秒再调用真编译器的包装脚本）12 pass、8.17 秒。
- 全文花括号机械核对深度 0、无负深度。
- 完整套件装 WABT 1.0.42 后 91 pass、0 fail（缺 WABT 时 `build.test.mjs` 准备钩子抛 `WABT not found`，3 项失败与本改动无关）。
- 提交 `088004e` 后 run `42216007618` 通过，`bun test` 80 pass、11 skip、0 fail；`lifecycle.test.mjs` 组开始 `12:13:46.408` → 首个 pass `12:13:51.704`，准备阶段实测 5.30 秒——越过原默认预算，加预算后通过。

11 个 skip 是需要 Windows 主机的驱动用例，Linux runner 按设计跳过。提交 `088004e` 改动为 1 文件、加 7 行删 3 行，只动两个钩子预算与报错模板，未动产品代码与断言。
