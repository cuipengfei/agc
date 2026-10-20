# Tern 0.9.5 人工 WAT 修改归档

本目录手工恢复会话中已记录的 26 处时间调用修改、两个新增时间函数和独立测试 exports。原临时 WAT 分片及测试模块已被清理；归档内容来自会话中的文件编辑记录，未通过脚本生成。

## 文件

- `parts/part-001` 至 `parts/part-051` 的奇数编号：26 个调用点的完整替换文本。
- `parts/part-053`：两个新增函数的完整文本，共 27 份人工片段。该文件只保存新增函数，不包含原版未修改的模块尾部。
- `exports/time-exports.wat`：独立测试模块的五个额外 exports。
- `manifest.txt`：每个片段对应的原版行号、原始指令、时间起点与插入位置。
- `recipe.json`：锁定原版/candidate/测试模块/glue/profile 的 SHA-256、WABT `1.0.42`、原版 WAT 行数与每处片段断言的确定性构建清单。

0.9.5 的字体描述符可直接通过运行时注入，本版本没有归档字体常量改写片段。26 个调用点包含 17 个 Instant、4 个 elapsed 和 5 个 SystemTime 改道。

## 来源

| 对象 | 路径或用途 | SHA-256 |
|---|---|---|
| 原版 WASM | `~/.local/share/tern-web-0.9.5-original/pkg-original.wasm` | `1e6a49eaf33e3575e3a1c67c522cea76ece874dde2b4c8a98af5b16397cfbca5` |
| 现有 candidate | `~/.local/share/tern-web-0.9.5/pkg/client.wasm` | `b132e0fe9e1ada03339ed222f2dd04b08385c79f39b1797d2610c253c4eefdbe` |
| 既有测试模块 | 五个时间测试 exports；模块文件已清理 | `ce28ecb43c18861f96c63575f53d99998eaee81e9626b778ba7eae40c399cc0d` |

现有 candidate、profile 与 glue 已重新核对为既有六项时间报告绑定的相同文件；这些检查不等于本归档的重建验证。

## 构建方式

已登记版本的重建由工具确定性完成，以下命令在 `tools/tern-maintain/` 执行：recipe 断言原版每处原文，流式重放 26 处替换并在原版第一个 table 声明之前插入 `parts/part-053`，`wat2wasm` 分别编译候选模块与独立测试模块并逐一核对 SHA-256，随后执行结构检查与真实时间行为检查（完整说明见 toolkit README 的确定性构建一节）：

```bash
bash ci/install-wabt.sh /absolute/path/to/new-wabt-dir   # Linux x86_64；目录必须不存在
bun cli.mjs build \
  --original /path/to/pkg-original.wasm --glue /path/to/client.js \
  --profile profiles/0.9.5.json --recipe patches/0.9.5/recipe.json \
  --wabt-dir /absolute/path/to/new-wabt-dir/wabt-1.0.42/bin \
  --out /tmp/tern-095-bundle
bun cli.mjs check-build --bundle /tmp/tern-095-bundle
```

正式 candidate 保持原 export 列表；独立测试模块额外加入 `exports/time-exports.wat` 的五个测试 exports，在 recipe 锁定原版行之前插入（exports 之后的 elem 行，原版 line 19679620，anchor SHA-256 `74b6e5954…ebc82`；锁定行不要求一定是 export），candidate 与测试模块必须是不同文件。`check-build` 只承认 `passed`，`not_run` 不计为通过。

人工语义审核适用于未知版本：新版本的指令位置、ABI 与替换语义经人工确认后才登记新 recipe；已登记版本由程序重放，不再逐处手工编辑 WAT。WAT 中间表示及其补丁、测试模块与报告允许程序化生成、组装、编译和验证；维护工具自身的程序源码使用文件编辑工具维护。0.9.5 完整重建已实际完成：`build` + `check-build` 通过，candidate `b132e0fe…eefdbe`、测试模块 `ce28ecb4…9cc0d` 与 recipe 锁定值一致；完整构建包删除私有初始输入与原包后在 fresh HOME 用 `rebuild` 复验同样通过，hash 不变。结果记录于 `raw/tern/2026-10-21-deterministic-build-and-portability.md`。
