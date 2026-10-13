---
name: opencode-configs
description: 枚举本机 OpenCode V2 主配置、查询默认值与配置状态、复查升级后的 schema 和运行时默认行为、渲染本地 HTML。只覆盖 @opencode/cli 2.x 的 opencode.json(c)，不含 TUI cli.json。
---

# OpenCode V2 配置清单

## 分工与资产

确定性脚本负责引擎读取、配置合并、四态分类、脱敏、资产校验、源码指纹比较、快照比较和 HTML 渲染。LLM 负责发生变化的源码行为调查、默认语义判断及中文说明；先运行脚本取得变化清单，再调查对应消费点。

可复用资产保存在 skill 根目录，接受版本管理：

- `translations.json`：每行中文 label/desc。
- `defaults.json`：每个非父行的默认值证据；有独立默认的父行也保存条目。
- `evidence.json`：取证仓库、审核版本、文件 SHA-256 和配置键到证据文件的关联。

`cache/` 由 gitignore 排除，只保存本机脱敏 JSON、HTML、旧快照与复查报告。源码读取结果和真实配置值不进入这些可复用资产。

## 前置与命令

需要 `bun`、PATH 中的 `opencode` 2.x 和可访问的后台服务。源码复查需要 `gh` 访问 `anomalyco/opencode`，也可使用版本对应的本地源码目录。目标 skill 可从仓库位置直接执行；采集时在目标项目目录运行，项目配置由引擎当前目录解析。

```bash
S=.agents/skills/opencode-configs

# 取 schema、配置与版本，校验后保存脱敏快照
bun $S/scripts/dump-settings.mjs

# 从快照渲染自包含 HTML
bun $S/scripts/render-html.mjs

# 升级前保存基线，升级后比较完整默认语义及证据
cp $S/cache/settings.json $S/cache/settings-prev.json
bun $S/scripts/report-gaps.mjs --old $S/cache/settings-prev.json $S/cache/settings.json

# 即使 schema 不变，也对新版消费源码和文档进行复查
bun $S/scripts/review-evidence.mjs --version 2.x.y --out $S/cache/evidence-review.json

# 行为与资产校验测试
bun test ./$S/scripts/
```

## 采集门槛与数据来源

1. `opencode --version` 与 `GET /api/info` 必须一致，`evidence.json` 审核版本必须与引擎一致；不一致立即终止，保留已有产物。
2. schema 使用本机 `GET /openapi.json` 的 `Config.InfoEncoded`。固定 properties 递归展开，record 和数组整体显示。schema 子树的 SHA-256 用于识别结构变化。
3. `GET /api/config` 提供引擎归一化后的配置文档。按返回顺序深合并，后者优先、数组整体替换。引擎将 V1 键改写为 V2 键；报告呈现归一化结果。
4. 默认资产恰好采用一种形态：`known: true` 并具有 `value`；`inert: true`；或非空 `behavioral` 描述。每条具有非空 evidence 和对应源码文件指纹。未配置字段也接受同样校验。
5. 每行中文说明必须非空，每个非父行必须有默认条目；任一缺失或资产无效，采集终止且不写产物。

默认值优先由匹配版本的运行时消费点取证，其次由该版本源码中的文档或 schema 注解支持。文档证据应明确标明证据等级。例如当前 LSP 默认关闭由文档支持，开源树没有相应客户端实现代码。

## 四态与父行

- `unset`：配置文档中没有该字段。
- `default-explicit`：显式配置与精确默认值相同。
- `customized`：与精确默认值不同；behavioral 字段一经配置也归入此类，其说明描述内置行为，不提供精确相等比较。
- `declared`：引擎接受字段，当前版本不消费其配置。

父行存在配置后代时按 `customized > declared > default-explicit` 推导；父行未配置时为 `unset`。后代全部未配置时，有自身默认条目就比较父行自身值，如 `warming: true` 对默认 `false` 显示已修改；无自身条目的空容器显示显式默认。父行具有精确默认时，默认列显示该值；其他容器提示查看子字段。

## 脱敏与输出

配置值仅在进程内读取和处理，脚本输出仅含计数、键名和路径。写快照前递归脱敏：

- 凭据键 apiKey/api_key/secret/token/password/credential/authorization 的非空值整体替换为 `<redacted>`；`tokens` 计数字段保留。
- HTTP(S) URL 使用标准 `URL` 解析 hostname，仅 `localhost`、`127.0.0.1`、`::1` 保留。公网 URL，包括 `localhost.example.com`，整体或在说明字符串中的对应 URL 部分替换为 `<redacted>`。本地 URL 若含 username/password 同样遮蔽。
- `{file:…}` 只显示引用路径，不读取目标文件。

HTML 转义嵌入 JSON 与单元格文本，筛选只提供上述四态。发现遮蔽缺口修改脚本并补充行为回归测试，再重新生成 JSON 与 HTML。

## 升级复查流程

1. 保留旧快照，运行 `review-evidence --version <新版>`。脚本比较已关联源码及文档文件 SHA-256；变化或被删除的文件映射到 affectedKeys。网络或鉴权失败明确终止。
2. LLM 读取变化文件，检查相应默认值、是否生效、条件分支与说明文字。文件未变的既有取证复用；新增 schema 字段按覆盖缺项调查。源码出现新的调用依赖时，将该依赖加入证据关联。
3. 审核后更新 `defaults.json`、`translations.json` 和 `evidence.json` 的版本与文件指纹。文件哈希只能来自实际读取的源码字节；复查脚本不自动批准语义、不自动改写审核资产。
4. 新版本采集成功后运行 `report-gaps --old`。报告新增、删除、schema 指纹变化、完整默认语义变化、状态变化与独立的 evidenceChanged。行为默认描述、known/inert 形态均参加比较。
5. 执行测试及 dump/render，并在浏览器验证受影响行和状态筛选。全部通过后保留更新的可复用资产；HTML 和配置快照只保留本机。

消费代码的变化可以不改变 schema；源码文件指纹与 schema 指纹承担不同检查职责。文件级检测可能要求复查同文件中未受影响的键，LLM 根据消费点确认语义是否变化。

## 已知边界

- 配置文档合并值不覆盖 `OPENCODE_CONFIG_CONTENT` 与 managed 配置层，报告不代表所有运行时覆盖后的最终值。
- record/数组整体呈现，用户自定义条目不生成单独配置行。
- 证据检测覆盖已经登记的文件与依赖，源码调查发现新的依赖时必须补充关联。
- HTML 使用固定深色主题；浏览器验证应记录实际检查的窗口宽度。
