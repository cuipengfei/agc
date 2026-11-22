# Tern 0.9.30 原生字体登记与正式部署

> Source: 当前 OMP 会话的 0.9.30 WASM 分析、真实 Chrome 报告、发布与升级证据、正式页面截图
> Collected: 2026-11-22
> Published: Unknown

## 原版与登记路径

0.9.30 官方原版 WASM SHA-256 为 `b334979a593f909f39dc97a228fb4d724a5c947be2cf61b50a3c8688e9490620`，glue SHA-256 为 `db7be2a88456a84cb1c248e425730cee90f9499f452e3d508e321c1a336b1a60`。原版资源在 `~/.local/share/tern-maintain/0.9.30/official`。

原版真实检查 `experiments/run.p0JU1h` 为 `routed/registration_missing`：目标字体 `Maple Mono NF CN` 查询为空，内置 `Ioskeley Mono Term` 正常，不存在字体查询为空。

静态分析先沿名称查询函数 `1009` 确认读取 `FontSystem + 536` 和对象内哈希配置，再追踪原生函数 `7844` 的完整登记过程。`303`/`18415` 的 `+56`/`+40` 是临时整数映射，不是持久字体名称映射。`7844` 的登记序列在追加调用后执行名称归一化、映射写入和索引集合追加。

构建器复用 `7844` 的原生序列：frame local `2`、frame size `3920`，名称映射偏移 `536`，复制追加块 children `16..31`；local `11` 保存 FontSystem，local `19` 保存字体索引，归一化字符串输出到 frame `2012`。候选 WASM SHA-256 为 `4b5e6963a2994e39655511ce21f07cb219968c452aa8891b71ca64389bd106ce`，查询函数 `14450` 的函数 index 为 `14957`，profile `statusOffset` 为 `41967146`。构建目录为 `~/.local/share/tern-maintain/0.9.30/registration-native-v3`。

## 候选验收

快速检查 `experiments/run.zCrmDx` 为 `served/working`，目标 Maple、内置 Ioskeley、缺失字体三项均正确。完整检查 `experiments/run.x8I49l` 为 `font-registration-check`、`served/working`，cold 与 warm 都匹配 `Maple Mono NF CN`，builtin 为 `Ioskeley Mono Term`，missing 为 null，阶段错误均为 null。

发布验收 `verification-evidence/run.tP8IXN/summary.json` 为 `result: passed`、`version: 0.9.30`、`classification: registration_missing`，发布输入使用官方原版报告。持久站点为 `~/.local/share/tern-maintain/0.9.30-registration-4b5e6963a299/site`。

## 正式切换

`systemd-upgrade.sh --apply` 使用 0.9.30 官方 binary、安装包和持久站点。正式证据目录为 `verification-evidence/upgrade.GyHijm`，最终摘要记录 `result: passed`、`version: 0.9.30`、`changed: true`。正式 binary、daemon、Web 均为 0.9.30，HTTP 200，8378 端口和 token 文件保持不变；原有 pane ID 与原有程序保留。程序检查改为 `comm -23`，允许并发新增程序，拒绝原有程序消失。

正式字体检查 `verification-evidence/formal-font.yJMxWT` 为 `served/working`。用户提供的 `tern --version` 为 `tern 0.9.30 (fe54a4c)`，进程参数显示 daemon 和 Web 都在运行，Web 监听 `127.0.0.1:8378` 并指向上述持久站点。

## 目视检查页面

首次正式截图只有 Settings，不能证明测试正文可见。测试文件块 `1868310773761` 移入独立标签「字体检查」并聚焦，临时 shell 已关闭。最终页面挂载且 `errors` 为空；截图 `verification-evidence/formal-font.QKoQqO/final-visual.json.png` 实际显示 `Tern 0.9.30 字体检查`、中文、日本語、Nerd Font 图标和等宽字符。

字形观感与字符宽度仍由用户目视判断，截图和名称命中检查不替代用户的显示评价。
