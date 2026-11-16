# OMP 18.20.3 配置键清单、指纹与遮蔽边界取证

> Source: 本机 dump-settings 取证（`@oh-my-pi/pi-coding-agent` v18.20.3）、`src/config/all-settings.ts` 与 `src/config/registry.ts` 直读、`.agents/skills/omp-configs` 脚本与测试运行结果
> Collected: 2026-11-16
> Published: Unknown

## A. 快照规模

`orderedSettings()` 在 18.20.3 枚举 625 个键，分组 60 个，`isCredential` 键 8 个。

同机两次快照的三态计数：

第一次（页面读回）：`unset` 171、`default-explicit` 343、`customized` 111。

其后一次 smoke 导出：`onDefault` 513、`customized` 112。`onDefault` 是「未设置」与「显式默认」两类的合计，不对应 `default-explicit` 单列。

两次观测的 `customized` 分别为 111 与 112；引用具体计数时须注明快照时间。

早前留档：18.16.0 为 582 键；18.4.2 为 515 键；18.3.1 为 512 键。

## B. 描述符导出字段与指纹组成

每行除原有 `id`、`type`、`group`、`label`、`description`、`default`、`enumValues`、`credential`、`effective`、`configured`、`isDefault`、`status` 外，新增：

- `items`：descriptor 的 `definition.items`，含元素 `values` 与 `label`。
- `normalize`：`String(definition.normalize)`，无则 `null`。
- `validate`：`String(definition.validate)`，无则 `null`。

`fingerprint()` 对以下字段做 SHA-256 并取前 16 位十六进制：

```text
id, type, default, enumValues, credential,
ui{tab, group, label, description},
pathScoped, items, normalize, validate
```

测试 `fingerprint flips when validate source changes, stays put otherwise` 的断言：

- 只改 `validate` 函数源码时，该键指纹变化；
- `app.mode` 无 `validate`，指纹保持不变。

## C. report-gaps 的基线与版本结论

- `--old` 指向不存在的文件：抛出错误并以非零状态退出，错误文本含 `--old`。
- 未提供 `--old`，且解释目录不存在：`baselineKind` 为 `none`，`versionComparison` 为 `unknown`，`versionBumped` 为 `false`。
- 提供 `--old` 且版本相同：`versionComparison` 为 `unchanged`。
- 提供 `--old` 且版本不同：`versionComparison` 为 `upgraded`；存在的解释目录中、且新快照仍保留的键进入 `needsReviewOnVersionBump`，计数取该数组长度。

## D. 遮蔽规则

- `isCredential` 为真的键：`null` 与空字符串原样保留，其余值整体替换为 `<redacted>`。
- 已配置（`isCredential` 为假且 `configured=true`）的值：递归遍历字符串叶子；命中非本机 `http(s)` URL 或已知密钥前缀形态的字符串替换为 `<redacted>`，其余结构保留。
- 密钥前缀形态：`sk-`、`ghp_`、`gho_`、`github_pat_`、`xox[baprs]-`、`AKIA` 加 16 位大写字母数字、`hf_`；长度门槛 20 个字符。
- 普通长标识符保留：测试用 40 位十六进制 `0123456789abcdef0123456789abcdef01234567`，断言原样输出。
- `localhost`、`127.0.0.1`、`0.0.0.0`、`[::1]` 的 URL 保留。
- 默认值来自源码常量，其中的公网 URL 保留。

## E. 页面实测

- 1440px 视口：表格正常显示。
- 390px 视口：页面宽 396px，出现横向溢出。
- 两个下拉框（状态、分组）没有可访问名称。
- 排序表头只在 `click` 上绑定处理函数，不能通过键盘聚焦或触发。
- 深色主题由 `color-scheme:dark` 固定，表格 `table-layout:fixed`。

## F. 测试发现规则

在本仓库根目录执行 `bun test .agents/skills/omp-configs/tests/` 时，输出：

```text
2571 files were searched
note: Tests need ".test", "_test_", ".spec" or "_spec_" in the filename
```

退出码 1，收集到 0 个测试文件。

进入测试目录后执行 `bun test ./omp-configs.test.ts`，10 项测试全部通过：

```text
10 pass
0 fail
```

同一测试文件中的 10 项覆盖：描述符元数据导出、`validate` 指纹、嵌套 URL 与密钥形态遮蔽、既有长标识符保留、`--old` 缺失报错、无旧快照的 `unknown`、同版本 `unchanged`、版本变化复查清单、翻译缺项中止、HTML 与 JSON 快照一致。

## G. 翻译层规模

本次补齐 68 个键的中文说明与 `Find` 分组译名，另按描述符变化更新 16 项既有说明；快照 625 键全部通过翻译覆盖门槛。

## H. 交付与流水线

提交 `799bc2b905`：gitleaks 与 Skill behavior checks 均成功；Tern maintenance checks 未触发，因为其 `paths` 为 `tools/tern-maintain/**`、`tools/wiki-check/**`、`wiki/**`、`raw/**`、`.github/workflows/tern-maintain.yml`。最近一次 Tern 运行在提交 `27acc29` 上成功（run 43896264400）。
