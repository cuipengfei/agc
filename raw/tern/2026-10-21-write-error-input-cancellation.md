# Tern 写流失败时取消输入等待的验收

> Sources: tools/tern-maintain/build.mjs, isolated write-error fixture, local regression and CLI acceptance, 2026-10-21
> Published: 2026-10-21
> Captured: 2026-10-21

## 验证对象

延迟审查指出：候选 WAT 或测试 WAT 写入失败时，构建可能仍在等待 wasm2wat 的下一行输入。原实现保存首个写入错误并取消 drain 等待，但未同时结束 readline 与输入子进程；循环没有接收到新行时，循环入口的错误检查不会执行。

本次仅修改这一错误路径及对应测试、文档；没有修改 recipe、已锁定的模块 SHA-256、WABT 版本或补丁指令。

## 定向回归

`fixtures/write-error.mjs` 在独立 Bun 子进程中使用 `bun:test` 的模块模拟隔离外部边界：wasm2wat 的流式输入由一个不输出内容、等待三秒后自然结束的子进程控制；测试 WAT 写入目标改为真实目录，由文件系统产生实际 `EISDIR`。待验证的 `buildPatch`、写流错误处理和资源清理仍执行真实实现。

永久回归通过公开 `buildPatch` 路径验证原始错误包含 `EISDIR`、输入子进程收到 `SIGKILL`、失败构建目录保留。判定依据为错误内容、退出信号与目录状态，不依赖耗时阈值。模块模拟只在隔离子进程内生效。

修复前，`bun test build.test.mjs -t 'a write error while awaiting input'` 实际失败；等待中的输入没有立即被取消，原始写入错误未被保留。

## 修正与复验

写流 error handler 保存首个错误，然后取消 drain 等待、关闭 readline、关闭 child.stdout 并终止输入子进程。输入循环结束时先检查保存的写入错误。catch 在资源清理前保存本次失败原因，清理时产生的后续 stream error 不会替换已发生的补丁断言错误。

最终本地复验命令：

```bash
WABT_DIR=/tmp/tern-wabt-verified-20261021-ok/wabt-1.0.42/bin node /tmp/tern-idle-input-error-smoke.mjs
WABT_DIR=/tmp/tern-wabt-verified-20261021-ok/wabt-1.0.42/bin bun test
```

实际结果：独立 Node 故障 smoke 在 19ms 内返回原始 `EISDIR`，失败目录保留；Bun 全套 62 pass、0 fail，7 个文件，8.21s。既有“原文不匹配时返回 Edit assertion failed”回归同时通过，清理过程没有掩盖该断言错误。

故障注入证明本地错误取消和错误保留行为；受控输入等待不代表真实 WABT 发生过停顿。

## 最终源码的完整构建验收

本次修改后重新执行真实 0.9.4 和 0.9.5 `build`、`check-build`，再复制完整 0.9.5 包、删除私有初始输入与首份 0.9.5 构建包，确认路径返回 ENOENT，使用全新 HOME 执行 `rebuild` 与 `check-build`。实际 smoke 退出码 0，耗时 329.69s，receipt 为 `tools/tern-maintain/artifacts/write-cancel-llvnoA/receipt.json`。

- 0.9.4 candidate：`f5f8e036dfbba59f6ddae2636d367355de05ca8e12874f3ff12fc8e6e5ca5a75`；测试模块：`b6017a4bd8a16ec14dfe6434d84eb57839ea4c2d274b1c8e7be0d6f4949c9a9c`。
- 0.9.5 candidate：`b132e0fe9e1ada03339ed222f2dd04b08385c79f39b1797d2610c253c4eefdbe`；测试模块：`ce28ecb43c18861f96c63575f53d99998eaee81e9626b778ba7eae40c399cc0d`。
- fresh HOME 重建后，两个 0.9.5 模块的 hash 与上述值完全相同；所有 recipe 原期望 hash 均未修改。
- 最终 `build.mjs` SHA-256 为 `d0809b8c284cf9b8d1cf1b97f9443def7c68ba8731a180adc6e8839153f2f3f1`；0.9.5 recipe SHA-256 为 `8de2b70de5d1f45f81895e76257ee88e794ecc4097fd04e30c834e6aef408b3c`。完整 producer 身份见该目录 `portable-0.9.5/build.json`。
- 使用新包执行 `assets`，实际退出码 0，生成 `site/` 的七份文件及 deploy-manifest.json；candidate 和两份完整字体 hash 与既有锁定值一致。

构建只读正式原版资源；删除操作仅针对本轮私有输入与首份私有构建包。本轮未重新执行浏览器或远端 CI；物理异机、其他操作系统、完整 GPU/mount 与 native desktop UI 未验证。
