# Tern 0.9.28 Web 字体名称登记缺失：登记补丁构建、正式部署与验收

> Source: `tools/tern-maintain/font-registration.mjs`、`tools/tern-maintain/font-check.mjs`、`tools/tern-maintain/profiles/font-registration-0.9.28-original.json`、`tools/tern-maintain/profiles/font-registration-0.9.28-patched.json`、`~/.local/share/tern-maintain/0.9.28-registration-0a41f8c18682/evidence/` 中的服务验收、正式字体探测与真实画面证据
> Collected: 2026-11-20
> Published: Unknown

## 缺陷与判定条件

Tern 0.9.28 Web 在已经下载 Maple 字体的情况下，按名称选择字体的查询仍返回空。隔离对照把官方原版分类为 `registration_missing`：字体完整投递且身份正确，但冷、暖加载两次名称查询都选不中 `Maple Mono NF CN`；候选补丁在同一浏览器与同一页面设置下分类为 `working`，冷、暖加载均返回 `Maple Mono NF CN`，内置 `Ioskeley Mono Term` 与不存在字体对照正确。

正式入口验收只承认 `font-check` 的 `source: served` 结果；传 `--wasm FILE` 把已校验的官方文件投递给隔离页面的对照结果只标记为 `source: routed`。

## 补丁身份与构建边界

登记补丁由 `font-registration-build` 从受审官方输入生成，官方原版 WASM SHA-256 为 `36abf20e257cbb0e356e2ee0b539d2a1186c6be346bbba35e4ac4bf786a9614d`，官方 glue SHA-256 为 `a520492de67d649f6ccfeeac494e3f0a7831ef5b328595d6edfe78ab1f1eac43`。候选 WASM SHA-256 为 `0a41f8c18682fc6a26c92d8aaf5ff2979d1a852c2f3abb492817f235dc418da1`。

补丁修复动态字体加载后的名称登记，并保留全部内置字体。构建工具锁定官方模块与 glue hash；版本、官方文件 hash 或补丁前提不匹配时拒绝构建或装配，不套用旧版本的函数偏移、face id 或 FontSystem 地址。

## 工具与版本分类

维护工具新增 `font-registration-build`、`assets --registration` 与 `font-check`。registration 构建目录包含 `registration.json`、`candidate.wasm` 与 `glue.js`；`registration.json` 记录 `schemaVersion`、`kind: "font-registration"`、`version`、`originalSha256`、`candidateSha256` 与 `glueSha256`。`assets --registration` 装配页面资源，正式部署目录只含 `index.html`、`pkg/client.js`、`pkg/client.wasm` 与 `deploy-manifest.json`，不携带 `maple.js`、`fonts.json` 或替换内嵌字体文件。

`font-check` 通过真实 Chrome 的 cold、warm、builtin、missing 四阶段探测报告三个分类：

| classification | 判定与后续动作 |
|---|---|
| `working` | 冷暖两次均选择目标字体，内置与不存在字体对照正确；官方原版得到此结果时无需登记补丁 |
| `registration_missing` | 字体完整投递且身份正确，冷暖两次名称查询均选不中目标字体；说明仍有同类登记缺陷 |
| `needs_investigation` | 模块 hash、版本、字体投递或观测阶段不完整；停止自动补丁，重新定位字体查询函数并建立新版 profile |

`working` 与 `registration_missing` 退出码为 0，`needs_investigation` 退出码为 2。未来版本默认只检测和报告，不自动制作或部署补丁；检查必须先跑官方原版，官方已正常则不应用补丁。

## 正式切换与保持性

正式 Web 单元 `/home/cpf/.config/systemd/user/tern-web.service` 的 `ExecStart` 追加 `--assets /home/cpf/.local/share/tern-maintain/0.9.28-registration-0a41f8c18682/site`，只重启 `tern-web.service`；`tern-daemon.service` 不重启，daemon PID `462844` 保持不变，Web 切换后 PID 为 `699075`。原访问地址、token 文件、session `4` 与三个 pane ID `326417514503`、`347892350977`、`1035087118337` 在切换前后完全相同。

持久 release 目录为 `~/.local/share/tern-maintain/0.9.28-registration-0a41f8c18682/`。其中 `site/` 是正式资源目录，`official/` 保存原版 WASM 与 glue，`tern-web.service.before` 保存切换前服务单元，`evidence/` 保存服务验收、正式字体探测、真实字形与固定光标证据。

## 正式验收结果

`verify-service` 对正式入口的六项检查全部通过：`served_wasm`、`served_glue`、`versioned_page`、`missing_token_rejected`、`invalid_token_rejected`、`existing_token_accepted`。

正式入口真实 Windows Chrome 字体探测 `classification: working`、`source: served`，页面实例化到的 WASM SHA-256 为 `0a41f8c18682fc6a26c92d8aaf5ff2979d1a852c2f3abb492817f235dc418da1`。cold 与 warm 请求 `Maple Mono NF CN` 均真实返回同名字体，builtin 请求返回 `Ioskeley Mono Term`，missing 返回 `null`。Maple 字体响应 HTTP 200，`20561696` 字节，SHA-256 `b3f8f26efab7c88f4f72cff0fe02a3c8916a2a1d2f485b4e2050fea098a25eb1`；builtin 另下载 Noto CJK 字体 `19484784` 字节，SHA-256 `b76b0433203017ca80401b2ee0dd69350349871c4b19d504c34dbdd80541690a`。

独立真实画面验收确认 ASCII、中文与四个 Nerd Font 符号均可见且无缺字方框；两条 20 列样本的左右边界 x 坐标一致。固定显示光标经独立放大截图确认，仅 `Z` 右侧一个单元格处出现 steady block 光标。

## 代码与文档改动

新增 `tools/tern-maintain/font-registration.mjs`、`font-check.mjs`、`font-check.test.mjs`、`font-registration.test.mjs`、`assets-registration.test.mjs` 与 `profiles/font-registration-0.9.28-original.json`、`profiles/font-registration-0.9.28-patched.json`。`tools/tern-maintain/cli.mjs`、`assets.mjs`、`index.template.html` 与 `README.md` 增加 registration 构建、装配、Windows 探测、三分类与未来版本检查说明。旧的 `--fonts` 字体替换流程标记为 deprecated，保留历史说明，不参与登记补丁部署。

本轮相关测试 24 项通过，`bun run check` 通过（42 个模块解析、4 条部署记录扫描、TypeScript 检查通过）。

## 证据位置

- 正式服务验收：`~/.local/share/tern-maintain/0.9.28-registration-0a41f8c18682/evidence/service.json`
- 切换前后保持性：`~/.local/share/tern-maintain/0.9.28-registration-0a41f8c18682/evidence/before-cutover.json`、`after-deployment.json`
- 正式字体探测：`~/.local/share/tern-maintain/0.9.28-registration-0a41f8c18682/evidence/formal-font-check.json`
- 真实字形、等宽排列与固定光标：`~/.local/share/tern-maintain/0.9.28-registration-0a41f8c18682/evidence/glyph-qa-20261120/` 与 `cursor-visible/`
