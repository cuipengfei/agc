---
name: herdr-configs
description: 枚举本机 Herdr 全部配置键、按官方参考的默认值分类生效状态、对比版本间键集合差异、渲染本地 HTML 总览。用于回答「Herdr 有没有某个设置、默认值是什么、我改过哪些、升级后多了什么键」。
---

# Herdr 配置清单

## 用途

回答四类问题：

1. Herdr 有没有某个设置、默认值是什么
2. 当前值相对默认值改动了多少（`unset` / `default-explicit` / `customized` 三态）
3. Herdr 升级后键集合发生了什么（新增、删除、参考条目指纹变化）
4. 把全部键渲染成单个本地 HTML 供浏览筛选

与 `wiki/herdr-plannotator/herdr-config-user-experience.md` 的分工：那篇文章按「体验维度」叙述各组设置的影响；本 skill 按「逐键清单 + 三态 + HTML 总览」回答存在性、默认值与改动状态。两者互补。

## 设计原则

1. **四类问题，三脚本**：`dump-settings` 取真实配置 → `render-html` 渲染自包含 HTML → `report-gaps` 版本间 diff
2. **四态分类**：每个键相对默认值标 `unset` / `default-explicit` / `customized` / `unknown`（默认值无法判定）
3. **默认值取证，不猜**：优先读 `herdr --default-config` 模板里的赋值；模板没有该键时，只在参考条目的 `default` 能解析成单个值时采用；带条件说明的条目（如按平台给不同默认值）标 `unknown`，不从前缀猜值
4. **完整性门槛**：每个键必须有中文名称与说明，缺则就地终止、不写产物
5. **脱敏**：产物自动遮蔽密钥形态值与已配置的非本机 URL，发现盲区改脚本的 `redact()`，不手动改产物
6. **产物只留本机**：`cache/` 已 gitignore，HTML 与 JSON 不提交
7. **脚本最大化、LLM 最小化**：取值、分类、脱敏、指纹、diff、渲染全部由脚本完成；LLM 只负责翻译层

## 与 omp-configs 的关键差异

OMP 能从自身源码 import 设置描述符注册表；Herdr 没有可导入的接口，所以数据源换成两份：

| 维度 | omp-configs | herdr-configs |
|---|---|---|
| 默认值来源 | 引擎 `orderedSettings()` 运行时 | `herdr --default-config` 模板 + 官方 `config-reference.json`（按已装版本取） |
| 当前值来源 | `Settings.loadReadOnly()` | 本机 `config.toml` 的 TOML 解析 |
| 参考中不存在的键 | 不适用 | 单列 `Local extras`（如 `[[keys.command]]` 自定义命令） |
| 凭据标记 | 描述符 `isCredential` | 无此标记，按键名与密钥形态识别 |
| 升级复查 | `--old` 或 `--expl` 两个分支 | 只有 `--old` 分支 |

## 前置

- 本机安装 `herdr`（脚本读 `herdr --version` 决定参考版本）
- 运行时用 `bun`（需 `Bun.TOML`，Bun 1.1 以上）
- 读取的真实配置默认 `~/.config/herdr/config.toml`（可用 `HERDR_CONFIG_PATH` 覆盖）
- 参考文件按已装版本从 GitHub 取，缓存到 `cache/config-reference-<version>.json`；也可用 `HERDR_REFERENCE_JSON` 指定本地文件
- **失败即终止**：读不到 `herdr --version`、参考文件取不到、配置文件不存在，脚本直接以非零状态退出且不写产物。不做「回退到任意缓存」或「版本标 unknown 继续跑」，因为错版本的快照会把旧字段与默认值冒充成当前版本

## 命令

```bash
S=.agents/skills/herdr-configs

# 1. 读取真实配置，产出脱敏后的 settings.json
bun $S/scripts/dump-settings.mjs

# 2. 渲染自包含 HTML（无外部资源，可 file:// 打开）
bun $S/scripts/render-html.mjs

# 3. 版本间差异（先把上一版 settings.json 留档）
bun $S/scripts/report-gaps.mjs --old $S/cache/settings-prev.json $S/cache/settings.json
```

产物写入 `$S/cache/settings.json` 与 `$S/cache/settings.html`。`cache/` 已 gitignore，产物只留本机，不要提交。

升级 Herdr 后的复查流程：先把旧 `cache/settings.json` 复制成 `cache/settings-prev.json`，升级后重跑 dump 与 report-gaps。

## 翻译层

`translations.json` 在 skill 根目录（受版本管理，随仓库长期保存——这是 LLM 手写的翻译层，放 `cache/` 会被 gitignore 而丢失），render-html 按 `join(import.meta.dir, "../translations.json")` 读取。格式 `{"<key>": {"label": "…", "desc": "…"}, …, "_groups": {"<英文分组名>": "<中文>"}}`。写 HTML 前校验：文件必须存在；每个键必须有非空中文 label 与 desc（包括官方参考无说明的键与本地扩展键）；每个分组必须有译名。缺一项即终止并列出缺项，不渲染英文或空说明。当前 212 键全覆盖（211 个官方键 + `keys.command` 本地扩展键），15 个分组。

升级后 report-gaps 报 fingerprint 变化的键，其官方 description 可能改了：抽出该键新旧 description 重新翻译对应条目，保持全覆盖。

## 脱敏边界

`settings.json` 与 `settings.html` 按以下规则遮蔽，其余原样：

- 键名命中 `token|secret|password|passwd|credential|api_key|authorization|cookie`：非空值替换为 `<redacted>`
- 已配置（`configured=true`）的非本机 `http(s)` URL：替换为 `<redacted>`（参考里的默认公网地址保留）
- 字符串中命中已知密钥形态（`sk-`、`ghp_` 等 GitHub/OpenAI 前缀、`xox*`、`AKIA*`、`Bearer <长串>`）：就地替换为 `<redacted>`

Herdr 的配置结构上不承载凭据（全部是界面与行为偏好），但 `[[keys.command]]` 的命令串可能内嵌 token，`worktrees.directory` 等字段含用户路径。遮蔽不到的盲区：编码或拼接出来的密钥。发现盲区时改 `dump-settings.mjs` 的 `redact()`，不要事后手动改产物。

## 指纹与升级复查

每个官方键带 `fingerprint`（对参考条目的 `key`、`type`、`default`、`description`、`values` 做 SHA-256，取前 16 位）。本地扩展键的 `fingerprint` 为 `null`。

`report-gaps.mjs` 的行为：

- 给了 `--old`：报告新增、删除、指纹变化，另附 `statusChanged`（本机四态发生变化，例如某键从 `unset` 变成 `customized`）
- 版本号变化时额外列出 `needsReviewOnVersionBump`：全部键的待复查清单，因为指纹只能看到参考条目文本，看不到活在代码里的行为变化

每个键另带 `defaultSource`，标明默认值从哪来：`default-config`（模板赋值）、`reference`（参考条目可解析为单值）、`reference:unset`（参考声明无默认值）、`undeterminable`（参考只给条件说明，判不了）、`no-reference`（本地扩展键）。`undeterminable` 且本机有值时状态为 `unknown`，页面默认值列显示「（无法判定）」。

## 已知限制

- 当前值是「配置文件里的值」，不是「运行时最终值」：`HERDR_CONFIG_PATH` 之外的运行期覆盖、以及通过界面菜单临时改的状态都不体现
- 数组与表按整体比较，不做元素级三态（`ui.sidebar.agents.rows` 改了任意一个 token 都算整个键 `customized`）
- 比较用稳定序列化，因此对象键顺序不影响判定；但类型不同（如 `26` 与 `"26"`）会判为不同
- `unset` 指配置文件里没有这个键，包含「用默认值」与「Herdr 内部回退」两种情况
- `unknown` 表示参考条目给的是条件默认值（例如按平台不同），本机又写了值；此时无法判断是否等于默认值，脚本不去猜
- 模板扫描只认右侧能独立解析为 TOML 值的行，因此 `herdr --default-config` 里夹在说明文字中的示例不会被当成默认值；当前覆盖 211 个官方键中的 117 个，其余靠参考条目补齐
