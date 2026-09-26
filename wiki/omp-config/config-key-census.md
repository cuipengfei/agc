# OMP 配置键全量清单与凭据遮蔽边界（18.3.1）

> Sources: 本会话 dump-settings 取证（`@oh-my-pi/pi-coding-agent` v18.3.1）+ 直读 config/{all-settings,registry,settings}.ts, 2026-09-26
> Raw: [配置键全量清单与凭据遮蔽边界取证](../../raw/omp-config/2026-09-26-config-key-census-18-3-1.md)
> Updated: 2026-09-26

## 这篇讲什么

OMP 配置面的三个结构事实：全量键有多少、多少键在源码里没有说明文字、凭据遮蔽的边界在哪。配合 [OMP 配置语义手册](config-semantics.md)看——那篇讲手挑键各自做什么，这篇讲清单本身的形状与安全边界。

## 键总量与文档覆盖

18.3.1 的 `orderedSettings()` 枚举出 512 个键。其中 128 个键在 `all-settings.ts` 里 `ui.label` 与 `ui.description` 两者皆空；核对下来只缺其一的都是 0 个，即每个键要么两个字段都有、要么都没有。

对做「配置解释器」的直接影响：这 128 个键没有任何源自带的说明文字可用，只能读消费代码推断行为。剩下 384 个键的 label/description 可直接取用。

## 凭据遮蔽边界

`isCredential` 只标记了 8 个键：`auth.broker.token`、`mnemopi.embeddingApiKey`、`mnemopi.llmApiKey`、`hindsight.apiToken`、`dev.autoqaPush.token`、`searxng.token`、`searxng.basicPassword`、`images.urls.credentials`。

只按这个 flag 遮蔽不够：`auth.broker.url`（string 型，远程 broker 地址）与 `modelRoles`（record 型）携带敏感信息，却都未被标记。可靠做法是在 flag 之外按值形态补遮蔽——已配置的非本机 `http(s)` URL、非空 credential record 一律替换。本机验证该规则挡下了 `dev.autoqaPush.endpoint`、`share.serverUrl`、`images.urls.credentials` 的生效值；默认值里的公网 URL 是源码常量，保留。

可复用结论：把配置值写进任何产物前，不能只信 `isCredential`，要按值形态兜一层。

## 枚举与判定 API

- `orderedSettings()`（`config/all-settings.ts`）取全部描述符。
- `Settings.loadReadOnly({ agentDir, cwd })`（`config/settings.ts`）只读加载本机配置取生效值；不解析环境变量覆盖，取到的是配置文件的值，不是运行时最终值。
- `settingValuesEqual(a, b)`（`config/registry.ts`）判定生效值是否等于默认值。

## 指纹缓存法与盲区

给每个键的说明文字做缓存时，键的指纹对整个描述符做 SHA-256，包含 `validate`/`normalize` 函数的源码字符串，因此 normalize 单独改动也会翻转指纹、触发该键重写。

盲区：活在消费代码里的行为变化不进描述符，指纹看不到。所以只有旧快照可比对时才以指纹为准（精确检出新增、删除、指纹变化）；只有解释索引时，小版本升级要列出全部有解释的键供人工复查，不能假设指纹没变行为就没变。

## See Also

- [OMP 配置语义手册](config-semantics.md) — 手挑 33 项设置各自的触发条件与行为影响
- [OMP Managed Skills 生命周期](managed-skills.md) — `skills.*` 系列键相关的写入/删除路径
