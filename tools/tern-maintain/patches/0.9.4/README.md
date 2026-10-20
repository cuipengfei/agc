# Tern 0.9.4 人工 WAT 补丁源码

本目录保存 0.9.4 补丁的**实际人工修改源码**：29 个经人工逐处修改的 WAT 片段
（`parts/part-001..part-057` 奇数编号）、测试模块独立 exports 文本、定位 manifest
和重建说明。未修改的 WAT 内容不入库（完整反汇编约 1 GB），按 `manifest.txt` 的
行号重新分解即可原样得到。

## 源材料与 hash

| 材料 | 路径 | SHA-256 |
|---|---|---|
| 官方原版 WASM | `~/.local/share/tern-web-0.9.4-original/pkg/original.wasm` | `8672d8320fa49ea4f31fd50cf18a0fa7917a9727265331bfe3686299a01acc18` |
| 补丁 candidate WASM | `~/.local/share/tern-web-0.9.4/pkg/client.wasm` | `f5f8e036dfbba59f6ddae2636d367355de05ca8e12874f3ff12fc8e6e5ca5a75` |
| WABT 工具链 | `~/.local/share/tern-web-maple/wabt-1.0.42/bin/`（wasm2wat / wat2wasm） | — |

两个 hash 已于 2026-10-18 用 `sha256sum` 对本机文件实测复核一致。WABT 的当前固定安装入口为 `ci/install-wabt.sh`（见 toolkit README）；表中路径为当时本机位置，仅作历史记录。

## 确定性重建（当前路径）

本目录的 [`recipe.json`](recipe.json) 锁定上表原版/candidate hash、测试模块、glue、profile 的 SHA-256、WABT `1.0.42`、原版 WAT 行数和每处片段对原文的 hash 断言。已登记版本由工具确定性重放，以下命令在 `tools/tern-maintain/` 执行：

```bash
bash ci/install-wabt.sh /absolute/path/to/new-wabt-dir   # Linux x86_64；目录必须不存在
bun cli.mjs build \
  --original /path/to/original.wasm --glue /path/to/client.js \
  --profile profiles/0.9.4.json --recipe patches/0.9.4/recipe.json \
  --wabt-dir /absolute/path/to/new-wabt-dir/wabt-1.0.42/bin \
  --out /tmp/tern-094-bundle
bun cli.mjs check-build --bundle /tmp/tern-094-bundle
```
`build` 在原版反汇编上按 `manifest.txt` 相同位置流式重放 29 个片段，`wat2wasm` 分别编译候选模块与独立测试模块并逐一核对 SHA-256，执行结构与时间行为检查，组装完整构建包并自检；失败保留目录，期望 hash 不因失败改写。测试 exports 在 recipe 锁定原版行之前插入（本版锁定首个 export `(export "memory" (memory 0))`，原版 line 19612474，anchor SHA-256 `2df21b55…5293f`；锁定行不要求一定是 export；anchor 位于 replace 区间内时，替换片段必须包含唯一原文 anchor）。`bun cli.mjs rebuild` 仅凭构建包在另一台机器重建，`check-build` 只承认 `passed`，`not_run` 不计为通过。

0.9.4 完整重建已实际完成：`build` + `check-build` 通过（真实 smoke `workflow-eV2Po2`），candidate、独立测试模块、glue、profile 四处 SHA-256 与 recipe 锁定值一致，candidate `f5f8e036…5a75`、测试模块 `b6017a4b…9c9a9c`，并重新执行结构检查与六项真实时间行为检查。结果记录于 `raw/tern/2026-10-21-deterministic-build-and-portability.md`。
补丁语义（详见部署目录 `~/.local/share/tern-web-0.9.4/PATCH.md`）：
26 处时间调用中，21 处 `call 30564`（Instant panic）与 5 处 `call 30565`（SystemTime
panic）逐处人工改道：17 处改调新增 `32182`（instant，经既有 imports 583/564/563 取
`performance.now`，临时 externref 交 24517 释放），4 处 elapsed 改调新增 `32183`
（保留各自真实起点，调用 32182 后经既有饱和相减 22958），5 处 SystemTime 改调既有
日历函数 25013。新增 `32182`/`32183` 插在原函数 32181 之后、table 段之前。
两份终端字体的 pointer/length 常量（Regular 4369022/2288420，Medium 6657442/2313308）
改为读取 Maple descriptor slot（9032524/9032528、9032548/9032552）。imports、既有
exports、函数签名、内存限制与初始内存均未改动。

## 目录内容

- `parts/part-*`：29 个人工修改片段，字节即当时补丁会话中的最终内容，按编号升序
  即 original.wat 中的原始先后次序。
- `exports/original-exports.wat`：原版 panic 复现测试模块的 2 条 test exports。
- `exports/time-exports.wat`：独立时间回归测试模块的 5 条 test exports
  （对应 `profiles/0.9.4.json`，产物 hash `b6017a4b…9c9a9c`）。
- `manifest.txt`：59 个 part ↔ original.wat 行区间 ↔ 原内容 ↔ 人工修改的完整对应表，
  含 csplit 的 58 个行号。

## 归档来源（人工分解的历史记录）

```bash
WABT=~/.local/share/tern-web-maple/wabt-1.0.42/bin
WORK=/tmp/tern-094-verify            # 隔离目录，自建
mkdir -p "$WORK/parts"
"$WABT/wasm2wat" ~/.local/share/tern-web-0.9.4-original/pkg/original.wasm -o "$WORK/original.wat"
wc -l "$WORK/original.wat"           # 应为 19623037
cd "$WORK/parts" && csplit -s -f part- -n 3 ../original.wat \
  2708719 2708720 2709675 2709676 3216862 3216863 4519099 4519100 \
  8266043 8266045 8266181 8266183 10779280 10779281 10780879 10780880 \
  11746268 11746269 11882961 11882962 11883007 11883008 11883070 11883071 \
  13415699 13415700 13415711 13415712 14224127 14224128 16687758 16687759 \
  16832094 16832095 17264385 17264386 17323012 17323013 18460340 18460341 \
  18464720 18464721 18464979 18464980 18702692 18702693 19006596 19006597 \
  19097026 19097027 19127507 19127508 19136108 19136109 19137021 19137022 \
  19612459 19612530
ls part-* | wc -l                    # 应为 59（part-000..part-058）
```

## 人工整理与标准编译（历史路径，已由确定性重建取代）

2026-10-18 补丁会话通过文件编辑工具按 `manifest.txt` 的原始行区间把对应人工片段写入完整 WAT。
所有区间都以原版反汇编为基准；`part-057` 同时保留模块尾部并增加两个时间函数。
完成源码整理后，标准编译器直接读取完整文件：

```bash
"$WABT/wat2wasm" "$WORK/reviewed.wat" -o "$WORK/candidate.wasm"
sha256sum "$WORK/candidate.wasm"
```

预期 candidate SHA-256 为上表记录的完整 hash。该手工路径已被 `recipe.json` 确定性重放取代；
重建证据以 `raw/tern/2026-10-21-deterministic-build-and-portability.md` 的记录为准。

## 已核对的源码证据

- 部署中的 `~/.local/share/tern-web-0.9.4/pkg/client.wasm` 实测
  SHA-256 = `f5f8e036…5a75`，即上表 candidate hash；官方原版实测
  `8672d832…acc18`。
- 本次归档时按上述 csplit 行号重新分解，part-001/003/005/009/011/057 的原始字节数
  （249/253/15/52/52/5060）与补丁会话记录完全一致，证明分解布局可复现。
- 人工修改后的片段内容逐字节抄录自补丁会话的三次 edit batch（含 32182/32183 完整
  函数体），未借助脚本/AST/sed 生成。
- 完整 candidate 重建与重新编译后的 SHA-256 比对：已执行，`build`/`check-build` 通过，重建 candidate 与测试模块 hash 和 recipe 锁定值一致（见上表），结果记录于 `raw/tern/2026-10-21-deterministic-build-and-portability.md`。
