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

## 翻译层

`translations.json` 在 `cache/` 里（gitignored，不进仓库），render-html 按 `join(import.meta.dir, "../cache/translations.json")` 读取。格式 `{"<id>": {"label": "…", "desc": "…"}, …, "_groups": {"<英文分组名>": "<中文>"}}`。写 HTML 前校验：文件必须存在；每个键必须有非空中文 desc（包括源里无文字的键）；源里有 label 的键 label 也必须非空；59 个分组必须有译名。缺一项即终止并列出缺项，不渲染英文或空说明。当前 512 键全覆盖，其中 128 个源里无 label/description 的键（如 `auth.broker.url`、`modelRoles`）的 desc 是手工读源码行为撰写的，label 为 null，页面 label 列回退显示键名。

升级后 report-gaps 报 fingerprint 变化的键，其 description 可能改了：抽出该键新旧 description 重新翻译对应条目，保持 512 全覆盖。

## 脱敏边界

`settings.json` 与 `settings.html` 按以下规则遮蔽，其余原样：

- `isCredential` 的键：任何非空值（字符串或 record）替换为 `<redacted>`
- 已配置（configured=true）的非本机 `http(s)` URL：替换为 `<redacted>`（默认值里的公网 URL 保留，来源是源码常量）

遮蔽不到的盲区：consume 方代码里拼出来的地址、未被 `isCredential` 标记的密钥形态值（如某些 token 键）。发现盲区时改 `dump-settings.mjs` 的 `redact()`，不要事后手动改产物。

## 指纹与升级复查

每个键带 `fingerprint`（对描述符整体做 SHA-256，含 `validate`/`normalize` 函数源码）。键的解释文字（本 skill 的 `explanations/` 目录）依赖什么行为，指纹变了就必须重写。

`report-gaps.mjs` 的行为：

- 给了 `--old`：报告新增、删除、指纹变化（精确）
- 只给 `--expl`（默认）：小版本升级时列出**所有有解释的键**作为待复查项，因为指纹看不到活在 consume 方代码里的行为变化；有 `--old` 时以指纹为准

## 已知限制

- `loadReadOnly` 不解析环境变量覆盖，effective 值是「配置文件的值」，不是「运行时最终值」
- 凭证当前全部为空，遮蔽逻辑改后未在「真实有值」场景下验证过；首次发现凭证有值时应人工核对一遍产物
- 深色主题锁 `color-scheme:dark`，列宽固定（`table-layout:fixed`），真机浏览器不同窗口宽度下的显示未逐宽度抽查
