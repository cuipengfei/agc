---
name: omo-configs
description: 枚举本机 OMO Native 全部配置键、按默认值分类生效状态、对比版本间快照差异、渲染本地 HTML 总览。用于回答「这个 OMO Native 设置存在吗、默认值是什么、我改过哪些、升级后多了什么键」。只覆盖 OMO Native（Senpi 引擎），不含 OMO 的 OpenCode 插件。
---

# OMO Native 配置清单

## 用途

回答四类关于 OMO Native 配置的问题：

1. OMO Native 有没有某个设置、默认值是什么
2. 当前生效值相对默认值改动了多少（`unset` / `default-explicit` / `customized` 三态）
3. OMO 升级后键集合发生了什么（新增、删除、默认值变化、状态变化）
4. 把全部键渲染成单个本地 HTML 供浏览筛选

只覆盖 OMO Native（底层 Senpi 引擎）。OMO 的 OpenCode 插件配置（`omo.jsonc` 的 `[opencode]` 段）不在范围内。

## 设计原则

1. **四类问题，三脚本**：`dump-settings` 取真实配置 → `render-html` 渲染自包含 HTML → `report-gaps` 版本间 diff
2. **三态分类**：每个键相对默认值标 `unset` / `default-explicit` / `customized`
3. **值与默认值取证，不硬编码**：从引擎自身运行时取得默认值和生效值，不按字段名臆断
4. **完整性门槛**：每个字段必须有说明文字，缺则就地终止、不写产物
5. **脱敏**：产物自动遮蔽密钥与非本机 URL，发现盲区改脚本的 `redact()`，不手动改产物
6. **产物只留本机**：`cache/` 已 gitignore，HTML 和 JSON 不提交
7. **脚本最大化、LLM 最小化**：能用代码确定性完成的（取值、分类、脱敏、diff、渲染）全部由脚本完成；LLM 只负责脚本无法确定的部分（源码行为取证、说明文字撰写）。改动应优先扩展脚本能力，而非把工作推给 LLM 手工补

## 三类配置来源

OMO Native 的配置分散在三个文件，生效规则不同：

| 来源 | 文件 | 内容 | 生效规则 | 凭据 |
|------|------|------|---------|------|
| Senpi 引擎设置 | `<agentDir>/settings.json` 或 `settings.jsonc` | `defaultProvider`、`defaultModel`、`transport`、`theme`、扩展/技能路径等标量与列表 | 同目录内 `settings.jsonc` 优先于 `settings.json`；project scope 沿 cwd 向上查找 `.omo` 目录，覆盖 global scope | 无 |
| OMO Native 配置 | `~/.omo/omo.jsonc` 的 `[native]` 段 | `model_profile`、`model_profiles`、`categories`、`agents`、`task`、`memory` | `omo.jsonc` 优先于 `omo.json`；`[native]` 段与 Senpi 设置平行，不互相覆盖 | 无 |
| Native provider 定义 | `<agentDir>/models.json` | provider 列表、`baseUrl`、`apiKey` | 被 Senpi 设置的 `defaultProvider` 按 ID 引用 | **含 `apiKey`，本 skill 不读取** |

`dump-settings.mjs` 覆盖前两类。第三类（`models.json`）含凭据，脚本不读取，也不进入报告。

## 前置

- 本机全局安装 `@code-yeongyu/senpi`（OMO Native 的引擎），源码在 `/home/cpf/.bun/install/global/node_modules/@code-yeongyu/senpi/dist`（可用环境变量 `SENPI_SRC` 覆盖）
- 运行时用 `bun`
- 读取的真实配置目录默认 `~/.omo/agent`（可用 `OMO_AGENT_DIR` 覆盖），`omo.jsonc` 默认在 `~/.omo`（可用 `OMO_HOME` 覆盖）

## 命令

```bash
S=.agents/skills/omo-configs

# 1. 读取真实配置，产出脱敏后的 settings.json
bun $S/scripts/dump-settings.mjs

# 2. 渲染自包含 HTML（无外部资源，可 file:// 打开）
bun $S/scripts/render-html.mjs

# 3. 版本间差异（把旧版 settings.json 留档后对比）
bun $S/scripts/report-gaps.mjs --old $S/cache/settings-prev.json $S/cache/settings.json
```

产物写入 `$S/cache/settings.json` 与 `$S/cache/settings.html`。`cache/` 已 gitignore，产物只留本机，不要提交。

## 值与默认值的权威来源

每个键的默认值、生效值、解释都取证，不硬编码、不正则扫源码、不按字段名臆断。默认值与生效值按三个来源层级取得：

- **引擎实读**（多数 Senpi 标量、列表、已展开的嵌套子字段）：`dump-settings.mjs` 调 Senpi 自己的 `SettingsManager`——生效值走 `create(cwd, agentDir)`（global + project scope 合并后逐个 getter），默认值走 `inMemory({})`（磁盘无设置，同一 getter 取 shipped default）；三态读 `getGlobalSettings()`/`getProjectSettings()` 原始键判定（缺键 `unset`、等于默认 `default-explicit`、不同 `customized`）。写 `NESTED_SETTINGS_FIELDS` 前，从 `Object.getPrototypeOf(SettingsManager.inMemory({}))` 枚举真实 getter 名——接口字段名不等于 getter 名，按 `.d.ts` 字段名拼 getter 会取不到。
- **schema-only**（如 `promptCache.cacheAwareTimeouts`、`safetyBufferSeconds`）：引擎无对应 getter，取不到运行值。默认值填源码 schema 声明的常量，`state` 标 `schema-only`，生效值列留破折号并注源。
- **`[native]` 段**（`omo.jsonc` 的 `[native]`）：用 Senpi 的 `parseSettingsJson` 解析（字符串内 `//` 不被误删，解析失败就地抛错）。`model_profile`/`model_profiles`/`categories`/`agents` 四项按整值呈现（`unset`/`customized`）。`task`/`memory` 无 Senpi getter，按 OMO 自身 zod schema 逐字段展成子行——schema 与默认直接读版本匹配的公开源码 tag `v5.0.1`（`code-yeongyu/oh-my-openagent` 的 `packages/omo-config-core/{task,memory}.ts`，与安装版 omo-ai 5.0.1 bundle 一致）。未配置项的生效值取 schema 解析后的运行默认（并发用 `availableParallelism()` 按本机解析，与 `resolveOmoTaskSettings` 同源）；`task.dag` 整块可选，未配置时子字段生效值为 —（标 `schema-only`）。
- 少数用户数据映射（`modelServiceTiers`、`modelLastOnThinkingLevels`）无批量 getter，直接读合并后原始设置，默认值为空，字段表标 `raw`。

本地 bundle（omo-ai）压缩难提取时走公开源码取证：grep.app 搜独特标识符（如 `residency_max_children`）定位仓库，本地 bundle 与公开源码双证。

**每个字段回答三问**：是什么、驱动什么行为、什么场景配它——逐项对着 getter 实现、消费点或 schema 取证。`dump-settings.mjs` 的 `descGaps` 门槛在任一字段缺 label/desc 时就地抛错（结构底线）；语义准确由取证保证，门槛不代管。

## 脱敏边界

`settings.json` 与 `settings.html` 按以下规则遮蔽，其余原样：

- 键名含 `apiKey`、`api_key`、`secret`、`token`、`password`、`credential`（大小写不敏感）：值替换为 `<redacted>`
- 非本机 `http(s)` URL（不含 `localhost` / `127.0.0.1`）：替换为 `<redacted>`

Senpi 的 `settings.json` 当前不含凭据字段（凭据在 `models.json`，本 skill 不读取）。遮蔽规则是防御性的：将来若某设置引入密钥形态值，改 `dump-settings.mjs` 的 `redact()`，不要事后手动改产物。

## 升级复查

Senpi 引擎没有 OMP 那样的描述符注册表，因此无指纹。改用快照 diff：默认值来自引擎 getter，升级后引擎改了某个 shipped default，`report-gaps.mjs` 的 `defaultChanged` 会直接报出来（新旧值并列）。留档上一版 `settings.json`，升级后跑 diff 即可看到新增键、删除键、默认值变化、状态变化。

## 已知限制

- getter 返回「配置文件解析后的值」，不解析命令行 flag 或环境变量覆盖，不是「运行时最终值」
- 字段表覆盖对着引擎 `Settings` 接口顶层键校验：`dump-settings.mjs` 解析 `settings-manager.d.ts` 的 `Settings` 接口全部顶层键与字段表 diff，接口有表没有进 `schemaMissing`（stderr 告警），表有接口没有进 `schemaExtra`。按 schema 校验，未设置的键也查；升级新增键据告警补进字段表
- 嵌套对象（`markdown`/`promptCache`/`images`/`todo`）逐项拆成子字段行；`terminal` 仍整值一行（未拆子字段），`lookAt`/`httpProxy` 无子字段 getter 同样整值一行
- `[native]` 的 `task`（35 项）/`memory`（38 项）按 `v5.0.1` schema 逐字段展成子行，字段清单与源码做差集校验（缺项为零）；`model_profile`/`model_profiles`/`categories`/`agents` 四项仍整值呈现。OMO 新增段补进 `NATIVE_FIELDS`，新增子字段补进 `NATIVE_NESTED_SETTINGS_FIELDS`
- 深色主题锁 `color-scheme:dark`，列宽固定（`table-layout:fixed`），不同窗口宽度下的显示未逐宽度抽查
- native 子字段 desc 由 `` `${group} · ${note}` `` 拼成，note 空时 desc 仍非空（有群组前缀），`descGaps` 门槛不会报。当前全部 note 非零无实际漏检，但新增子字段时须人工核对 note 非空
