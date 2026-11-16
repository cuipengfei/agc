# OMP 配置键全量清单、指纹与凭据遮蔽边界

> Sources: 本会话 dump-settings 取证（`@oh-my-pi/pi-coding-agent` v18.3.1）+ 直读 config/{all-settings,registry,settings}.ts, 2026-09-26; dump-settings 取证（v18.4.2）与 report-gaps 18.4.1→18.4.2 diff, 2026-09-28; dump-settings 取证（v18.20.3）、描述符字段直读与隔离测试, 2026-11-16
> Raw: [配置键全量清单与凭据遮蔽边界取证](../../raw/omp-config/2026-09-26-config-key-census-18-3-1.md); [2026-09-28-omp-18-4-2-settings-forensics](../../raw/omp-config/2026-09-28-omp-18-4-2-settings-forensics.md); [OMP 18.20.3 配置键清单、指纹与遮蔽边界取证](../../raw/omp-config/2026-11-16-omp-18-20-3-config-census.md)
> Updated: 2026-11-16

## 这篇讲什么

OMP 配置面的三个结构事实：全量键有多少、多少键在源码里没有说明文字、凭据遮蔽的边界在哪。配合 [OMP 配置语义手册](config-semantics.md)看——那篇讲手挑键各自做什么，这篇讲清单本身的形状与安全边界。

## 键总量与文档覆盖

18.20.3 的 `orderedSettings()` 枚举 625 个键、60 个分组，其中 `isCredential` 键 8 个。

18.3.1 的 512 键中，128 个键的 `ui.label` 与 `ui.description` 同时为空，只缺其一的为 0 个。这 128 个键没有源自带的说明文字，只能读消费代码推断行为；其余 384 个键的 label/description 可直接取用。

**版本记录**：18.3.1 为 512 键；18.4.2 为 515 键（`effectiveDefault` 418、`customized` 97，键集合 diff 为新增 0、删除 0、指纹变化 0）；18.16.0 为 582 键。

18.20.3 同机两次快照：第一次（页面读回）`unset` 171、`default-explicit` 343、`customized` 111；其后一次导出 `onDefault` 513、`customized` 112。`onDefault` 是「未设置」与「显式默认」两类的合计。引用具体计数时需要注明快照时间。

## 凭据遮蔽边界

`isCredential` 只标记了 8 个键：`auth.broker.token`、`mnemopi.embeddingApiKey`、`mnemopi.llmApiKey`、`hindsight.apiToken`、`dev.autoqaPush.token`、`searxng.token`、`searxng.basicPassword`、`images.urls.credentials`。

`isCredential` 之外还有携带敏感信息的键：`auth.broker.url`（string 型，远程 broker 地址）与 `modelRoles`（record 型）都未被标记。本机验证遮蔽规则挡下了 `dev.autoqaPush.endpoint`、`share.serverUrl`、`images.urls.credentials` 的生效值；默认值里的公网 URL 是源码常量，保留。

可复用结论：把配置值写进任何产物前，要按值形态处理遮蔽。18.20.3 的实现规则：

- `isCredential` 为真的键：`null` 与空字符串保留，其余值整体替换为 `<redacted>`；
- 已配置的值递归遍历字符串叶子，非本机 `http(s)` URL 与已知密钥前缀形态替换为 `<redacted>`，其余结构保留；
- 已知前缀包括 `sk-`、`ghp_`、`gho_`、`github_pat_`、`xox[baprs]-`、`AKIA` 加 16 位大写字母数字、`hf_`，长度门槛 20 个字符；
- 普通长标识符保留，测试用 40 位十六进制验证；
- `localhost`、`127.0.0.1`、`0.0.0.0`、`[::1]` 的 URL 与源码常量中的公网默认地址保留。

## 枚举与判定 API

- `orderedSettings()`（`config/all-settings.ts`）取全部描述符。
- `Settings.loadReadOnly({ agentDir, cwd })`（`config/settings.ts`）只读加载本机配置取生效值；不解析环境变量覆盖，取到的是配置文件的值，不是运行时最终值。
- `settingValuesEqual(a, b)`（`config/registry.ts`）判定生效值是否等于默认值。

## 指纹缓存法与盲区

给每个键的说明文字做缓存时，键的指纹对描述符字段做 SHA-256 并取前 16 位十六进制，覆盖 `id`、`type`、`default`、`enumValues`、`credential`、`ui{tab,group,label,description}`、`pathScoped`、`items`、`normalize`、`validate`。

隔离测试的断言：只改 `validate` 函数源码时，该键指纹变化；无 `validate` 的键指纹保持不变。

盲区：活在消费代码里的行为变化不进描述符，指纹看不到。有旧快照可比对时以指纹为准（精确检出新增、删除、指纹变化）；给出旧快照且版本变化时，解释目录中仍保留的键进入 `needsReviewOnVersionBump`。未给旧快照时 `versionComparison` 为 `unknown`，`needsReviewOnVersionBump` 为空，需要先取得版本证据再判断升级。

## report-gaps 的基线与版本结论

| 输入 | 行为 |
|---|---|
| `--old` 指向不存在的文件 | 抛出错误并以非零状态退出 |
| 未给 `--old`，无解释目录 | `baselineKind=none`，`versionComparison=unknown`，`versionBumped=false` |
| 给了 `--old`，版本相同 | `versionComparison=unchanged` |
| 给了 `--old`，版本不同 | `versionComparison=upgraded`；解释目录中仍存在的键进入 `needsReviewOnVersionBump` |

## See Also

- [OMP 配置语义手册](config-semantics.md) — 手挑 33 项设置各自的触发条件与行为影响
- [OMP Managed Skills 生命周期](managed-skills.md) — `skills.*` 系列键相关的写入/删除路径
