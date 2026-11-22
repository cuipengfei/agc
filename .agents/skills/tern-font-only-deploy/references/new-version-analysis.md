# 新版字体登记分析

## 输入与成功标准

使用当前版本的官方 WASM、glue、字体响应与对应 profile。以原版真实字体检查确定名称查询状态；候选站点的完整成功条件见 [字体检查](font-check.md)。每次实验说明具体假说和预期的可见结果，并保存输入、输出及失败原因。

## 分析顺序

1. **名称查询**：确认当前模块 hash、字体匹配函数、返回值位置和 profile。快速检查必须覆盖目标字体、内置字体和不存在字体；先读取字体响应 SHA-256 与实际返回值。`registration_missing` 要求目标字体已完整投递、名称未匹配且两项对照正确。
2. **名称登记**：跟随当前版本接收字体的路径，检查字体名称解析、名称表 entry、字体索引和集合追加过程。核对输入名称、查询使用的名称及登记结果之间的关系。
3. **表达式行为**：检查待修改函数的完整表达式、参数类型、返回类型、常量、调用目标与副作用。空值、索引、数量和指针的含义必须从当前调用方与被调用函数确定。
4. **候选修改**：确定缺少的登记动作及调用位置后修改当前版本，执行模块有效性检查与快速真实字体检查。候选站点随后完成冷暖两次及两项对照的完整检查。

函数形状用于筛选位置。函数常量、调用目标、类型和指令语义共同决定该函数是否具有所需行为。旧版本的函数编号、局部参数位置、地址和补丁片段只作查找线索；新版 profile 必须来自当前模块。

## 固定函数分析入口

从 AGC 仓库根目录运行：

```bash
bun tools/tern-maintain/cli.mjs function-analysis \
  --wasm /path/to/current/original.wasm \
  --original /path/to/0.9.29/original.wasm \
  --names 14350,18267 \
  --out /path/to/function-analysis.json
```

`--original` 存在时，`--names` 是参考模块中已知的准确函数名，工具在当前模块筛选相同签名的候选并报告对应关系；省略参考模块时，函数名属于当前模块。函数名与包含 imports 的 `index` 分开记录。需要 CDP 指令位置时追加 `--wabt-dir /path/to/wabt/bin`，使用固定 WABT 1.0.42。

分析由维护工具固定使用同一个 Binaryen 实例，报告模块身份、函数来源、签名、形状、常量、调用目标和函数内容差异。审核时阅读归一化内容差异，检查保留的常量和调用语义；修改后的模块还需通过有效性检查。无需在会话中重复编写 Binaryen 遍历脚本。

## 实验与失败证据

所有探索命令使用统一运行器：

```bash
bun .agents/skills/tern-font-only-deploy/scripts/run-experiment.mjs \
  --hypothesis 'Current font reception appends the name to the lookup table' \
  --input /path/to/current/original.wasm --input /path/to/profile.json \
  -- sh -c 'exec bun tools/tern-maintain/cli.mjs function-analysis --wasm /path/to/current/original.wasm --names FUNCTION_NAME --out "$TERN_EVIDENCE/function-analysis.json"'
```

输出使用独立实验目录；命令也可通过 `TERN_EVIDENCE` 把产物写入该目录。运行器保存输入快照和 SHA-256、命令、开始与结束时间、退出码、终止信号及脱敏 stdout/stderr。`--root DIR` 或 `TERN_EXPERIMENT_ROOT` 指定实验保存位置。需要从日志删除认证值时，通过 `--secret-file FILE` 传入文件，认证值仅在运行时内存中处理；该文件禁止作为输入快照。

命令退出失败、命令无法启动或输入准备失败，均保存已有证据和原因。运行被终止时结束本次命令创建的进程组；字体启动器保存隔离服务日志及清理结果。读取现有失败证据后，重新核对假说、反例和缺少的前提，再执行有新依据的实验。
