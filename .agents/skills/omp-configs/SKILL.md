---
name: omp-configs
description: 枚举本机 OMP 全部配置键、按默认值分类生效状态、对比版本间键集合差异、渲染本地 HTML 总览。用于回答「这个设置存在吗、默认值是什么、我改过哪些、升级后多了什么键」。
---

# OMP 配置清单

## 用途

回答四类问题：

1. OMP 有没有某个设置、默认值是什么
2. 当前生效值相对默认值改动了多少（`unset` / `default-explicit` / `customized` 三态）
3. OMP 升级后键集合发生了什么（新增、删除、描述符指纹变化）
4. 把全部键渲染成单个本地 HTML 供浏览筛选

## 设计原则

1. **四类问题，三脚本**：`dump-settings` 取真实配置 → `render-html` 渲染自包含 HTML → `report-gaps` 版本间 diff
2. **三态分类**：每个键相对默认值标 `unset` / `default-explicit` / `customized`
3. **值与默认值取证，不硬编码**：从引擎自身运行时取得默认值和生效值，不按字段名臆断
4. **完整性门槛**：每个字段必须有说明文字，缺则就地终止、不写产物
5. **脱敏**：产物自动遮蔽密钥与非本机 URL，发现盲区改脚本的 `redact()`，不手动改产物
6. **产物只留本机**：`cache/` 已 gitignore，HTML 和 JSON 不提交
7. **脚本最大化、LLM 最小化**：能用代码确定性完成的（取值、分类、脱敏、指纹、diff、渲染）全部由脚本完成；LLM 只负责脚本无法确定的部分（源码行为取证、翻译层撰写）。改动应优先扩展脚本能力，而非把工作推给 LLM 手工补

## 前置

- 本机全局安装 `@oh-my-pi/pi-coding-agent`，源码在 `/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src`（可用环境变量 `OMP_SRC` 覆盖）
- 运行时用 `bun`
- 读取的真实配置目录默认 `~/.omp/agent`（可用 `OMP_AGENT_DIR` 覆盖）

## 命令

```bash
S=.agents/skills/omp-configs

# 1. 读取真实配置，产出脱敏后的 settings.json
bun $S/scripts/dump-settings.mjs

# 2. 渲染自包含 HTML（无外部资源，可 file:// 打开）
bun $S/scripts/render-html.mjs

# 3. 版本间差异（把旧版 settings.json 留档后对比）
bun $S/scripts/report-gaps.mjs --old $S/cache/settings-prev.json $S/cache/settings.json
```

产物写入 `$S/cache/settings.json` 与 `$S/cache/settings.html`。`cache/` 已 gitignore，产物只留本机，不要提交。

## 回答配置问题时复用证据

1. 先读取现有 `cache/settings.json` 的版本、目标键的 descriptor 和脱敏配置文件值；需要当前值时重新采集，并注明 `OMP_AGENT_DIR` 与 `OMP_PROBE_CWD` 的作用范围。`translations.json` 保存中文说明。
2. 查 `behavior-evidence.json` 的同名键：它记录人工核对过的 OMP 版本和源码位置；说明正文保存在 `translations.json`，两者一起使用。当前文件只覆盖已有来源的键，未列出的键没有记录过消费方证据。
3. 把用户问题逐项与现有字段、说明和证据比较，只查询缺失或版本已过期的部分。descriptor 指纹未变时，消费方仍可能变化；版本不同时，针对用户实际询问的消费方重新核对。行号仅供定位，以当前源码为准。
4. 委派查证时附上已知版本、键名、当前结论、已有来源和具体缺口，只让子 agent 查缺项。将新核对的消费方路径与版本更新到证据文件；不同版本共存时给每项标明版本。
5. 报告默认值、可选值、配置文件值和实际运行时覆盖的区别；某一信息未取得时明确标注，禁止从名称推断取值语义。

## 翻译层

`translations.json` 保存中文说明，格式为 `{"<id>": {"label": "…", "desc": "…"}, …, "_groups": {"<英文分组名>": "<中文>"}}`。渲染前检查每个键的非空 desc、源里有 label 的键的非空 label，以及每个实际分组的译名；缺项则终止。源里无 label 的键可以将 label 设为 null，页面显示键名。当前键数和分组数以生成的快照为准。

升级后复核新增和指纹变化的键，按新描述符更新对应翻译；消费方行为另按「回答配置问题时复用证据」的版本条件核对。

## 脱敏边界

`settings.json` 与 `settings.html` 按以下规则遮蔽，其余原样：

- `isCredential` 的键：任何非空值（字符串或 record）替换为 `<redacted>`
- 已配置（configured=true）的值：递归遮蔽非本机 `http(s)` URL 与已知密钥前缀形态的字符串，保留其余结构；默认值中的公网 URL 保留。

形态检查无法覆盖所有凭据或消费方拼接的地址。发现盲区时修改 `dump-settings.mjs` 的 `redact()` 并补行为测试，不手动修改产物。

## 指纹与升级复查

每个键带 `fingerprint`，由所选描述符字段（包括 `validate` / `normalize` 函数源码）计算 SHA-256。快照也导出 `items`、`validate` 与 `normalize`，供按键复用。指纹计算首次纳入 `validate` 后，旧快照对比可能出现一次性指纹变化，需重新建立基线。

`report-gaps.mjs --old` 比较新增、删除与指纹变化；指定的旧快照不存在时退出报错。未给旧快照时 `versionComparison` 为 `unknown`，不能据此判定升级。若给出旧快照且版本变化，存在的解释目录中仍保留的键会列入复查，因为消费方变化不一定改变描述符。

运行离线行为测试：`(cd .agents/skills/omp-configs/tests && bun test ./omp-configs.test.ts)`。测试使用隔离 fixture，不读取本机配置，也不调用外部服务。

## 已知限制

- `loadReadOnly` 不解析环境变量覆盖，effective 值是「配置文件的值」，不是「运行时最终值」
- 非凭据字段的遮蔽使用已知密钥前缀和远程 URL 形态；其他形式的秘密需要补充规则。
