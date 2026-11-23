# Tern 0.9.32 字体登记复用、正式部署与版本清理

> Source: 当前 OMP 会话的安装包校验、`prepare` 输出、`function-analysis` 报告、私有 Chrome 字体检查报告、发布与升级证据、清理前后目录清点
> Collected: 2026-11-23
> Published: Unknown

## 输入与身份

安装包 `Tern-0.9.32-linux-x86_64.tar.gz` 位于 Windows 下载目录，`du -sh` 为 `78.0M`，SHA-256 为 `a8cabceab6be35b401e69767f51601e7f842eaf001fce655a3347713f8c51f74`。`tar -tzf` 只列出 `tern/` 与 `tern/tern`。解包后 `tern --version` 输出 `tern 0.9.32 (0dd129e)`。

本机运行 `bun 1.4.5`、WABT `1.0.42`（`~/.cache/agc/wabt-1.0.42/wabt-1.0.42/bin`）、Windows `node.exe` `v22.23.2`（`/mnt/d/Program Files/nodejs/node.exe`）、Chrome（`/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe`）。

`prepare` 输出：

```json
{"schemaVersion":1,"version":"0.9.32","url":"https://build.stencil.so/web/tern/0.9.32/stencil_tern_web_bg.wasm","integrity":"sha384-9s5HYmG7qa6L4xDx02K40hWuK20qPN4wgFYKkfSJY4p/0yQYSKODuhXiG3fW2k03","wasmSha256":"046f39a1a2a611353545b22a581524a63a424f6b9e542e7a55ab0313a66b5663","glueSha256":"67783d8dd0e29a112758ab4bd30b240a2af505847f02f6efb4b85f5e86a8e89d"}
```

## 原版字体检查

命令为 `check-fonts.sh --original … --profile original-profile.json`，实验目录 `experiments/run.KGVl6l`。报告 `source: routed`、`kind: font-registration-check`、`classification: registration_missing`：cold 与 warm 的 `matched` 均为 `null`，builtin 为 `Ioskeley Mono Term`，missing 为 `null`；`fontResponses` 中 cold `status 200`、`sha256 b3f8f26efab7c88f4f72cff0fe02a3c8916a2a1d2f485b4e2050fea098a25eb1`、`bytes 20561696`。cleanup 记录 `exit=0; processes_remaining=0; evidence retained`。

结论：0.9.32 与 0.9.28、0.9.29、0.9.30 相同，字体能完整投递，但按名称选择返回空，登记仍缺失。

## 函数定位

以下对照以 0.9.30 官方 WASM `b334979a593f909f39dc97a228fb4d724a5c947be2cf61b50a3c8688e9490620` 为参考，实验目录 `experiments/run.9i3stB`、`run.7NJYs4`、`run.PF365C`。

| 用途 | 0.9.30 | 0.9.32 | 定位依据 |
|---|---|---|---|
| selector | `14450` | `14507` | 同签名 5×i32，形状相似度 1 |
| builtin（原生登记供体） | `7844` | `7853` | 同签名 2×i32，形状相似度 1 |
| append（字体追加） | `32343` | `32497` | 同签名 2×i32，形状相似度 1，常量一致 |
| string（owning String entry） | `1308` | `1320` | 同签名，形状相似度 1 |
| free | `30197` | `30223` | 调用序列对照 |
| parse | `16025` | `16066` | 调用序列对照 |
| family | `22470` | `22474` | 调用序列对照 |
| normalize | `30122` | `30148` | 调用序列对照 |
| downloaded（字体接收调用方） | `5056` | `5345` | 由 append 的调用方集合定位；形状相似度不适用 |

`downloaded` 不是按函数形状匹配得到的：`function-analysis` 对 `5056` 给出的候选相似度只有 `0.2579028773759763`。改用调用关系定位，0.9.30 中 `32343` 的调用方为 `5056:5563`、`7844:8351`、`8373:8880`，0.9.32 中 `32497` 的调用方为 `5345:5852`、`7853:8360`、`92:599`。

`7844`（0.9.30）与 `7853`（0.9.32）的登记段在追加调用之后紧跟归一化调用，随后是名称映射写入与索引集合追加；0.9.32 的归一化目标是 `30148`。0.9.30 的片段曾在构建器里写死为 `30122`，本次改为按版本记录。

不变的参数：`nativeMapOffset` `536`、`frameLocal` `2`、`frameSize` `3920`。

## 探针位置（statusOffset）

`font-check.mjs` 需要在字体匹配函数里读取实际返回值，profile 的 `statusOffset` 指向该函数局部变量声明之后的第一个指令。

| 模块 | codeStart | firstInstructionOffset | 第一条指令 |
|---|---|---|---|
| 原版 `046f39a1…b5663` | `42216778`（`0x2842d4a`） | `42216783`（`0x2842d4f`） | `global.get 0` |
| 候选 `20ea825f…0f24` | `42333776`（`0x285f650`） | `42333781`（`0x285f655`） | `global.get 0` |

两份 profile 位于 `tools/tern-maintain/profiles/font-registration-0.9.32-original.json` 与 `…-patched.json`，`family` 为 `Maple Mono NF CN`、`builtin` 为 `Ioskeley Mono Term`、`fontSha256` 为 `b3f8f26efab7c88f4f72cff0fe02a3c8916a2a1d2f485b4e2050fea098a25eb1`。

## 登记补丁构建

命令为 `font-registration-build --original …/official/pkg/original.wasm --glue …/official/pkg/client.js`，实验目录 `experiments/run.cWXWBk`。

`registration.json`：

```json
{"schemaVersion":1,"kind":"font-registration","version":"0.9.32","originalSha256":"046f39a1a2a611353545b22a581524a63a424f6b9e542e7a55ab0313a66b5663","candidateSha256":"20ea825faf71d681657690142411ea3bb8b360920b6b359bf0589626308e0f24","glueSha256":"67783d8dd0e29a112758ab4bd30b240a2af505847f02f6efb4b85f5e86a8e89d","patch":{"caller":5345,"originalAppend":32497,"entry":null,"statusFunctionIndex":15014}}
```

构建器 `tools/tern-maintain/font-registration.mjs` 的 `RELEASES` 增加 0.9.32 条目，并把原本写死的归一化目标改成每个版本自己的 `normalize` 字段（0.9.30 为 `30122`，0.9.32 为 `30148`）。`font-registration.test.mjs` 为 `1 pass / 0 fail`。

## 候选站点的真实字体检查

`assets --registration` 装配到 `0.9.32-oZFxMLl8/site`，清单为 `mode: font-registration`，只含 `index.html`、`pkg/client.wasm`、`pkg/client.js`。

完整检查 `experiments/run.MSZoYf` 为 `source: served`、`classification: working`：cold 与 warm 均 `matched: Maple Mono NF CN`，builtin 为 `Ioskeley Mono Term`，missing 为 `null`，四阶段 `error` 均为 `null`；cleanup 记录 `exit=0; processes_remaining=0; evidence retained`。

## 发布验收与正式升级

发布验收 `verification-evidence/run.DBhPS4` 的 `summary.json`：

```json
{"result":"passed","version":"0.9.32","classification":"registration_missing","original":"/home/cpf/.local/share/tern-maintain/0.9.32-oZFxMLl8/official","site":"/home/cpf/.local/share/tern-maintain/0.9.32-oZFxMLl8/site","visual":"not_run","formalUpgrade":"not_run"}
```

同一轮里三项拒绝路径按预期失败并退出 1：`rejected-glue`、`rejected-original`、`rejected-assets`。

`systemd-upgrade.sh` 只读预检 `verification-evidence/upgrade.eInkA3` 记录 `{"result":"preflight_passed","version":"0.9.32","mode":"check","changed":false}`。正式执行 `--apply` 的证据目录为 `upgrade.nLcJiu`，摘要 `{"result":"passed","version":"0.9.32","mode":"apply","changed":true,"visual":"not_run"}`；`formal-service.json` 六项检查全部 `passed`：`served_wasm`、`served_glue`、`versioned_page`、`missing_token_rejected`、`invalid_token_rejected`、`existing_token_accepted`。

切换后 `tern --version` 为 `tern 0.9.32 (0dd129e)`，`tern-daemon.service` 与 `tern-web.service` 均为 `active`，根路径 `HTTP 200`。`runtime-final.json` 中 `paneIds` 与升级前的 `before-runtime.json` 排序后相等，daemon 与 web 两个进程都 `matchesInstalled`。

## 正式入口的字体检查与一次误判

第一次直接对正式服务跑完整检查，报告写入 `0.9.32-oZFxMLl8/formal-font/font-check.json`（实验目录 `run.mjxtsR`），结果 `classification: needs_investigation`：四个阶段的 `matched` 中只有 builtin 命中，cold 与 warm 均为 `null`，而 `fontResponses` 是空数组 `[]`。

原因由同轮截图确认：页面显示的是 Settings 窗口，可见 pane 只有 shell 提示符，没有任何需要回落字体的字符，WASM 因此根本没有请求 `/fonts`。检查工具不会自己制造中文内容，它的前置条件是页面里真的出现目标字符。

随后用 `tern open --tab` 打开一份含中文的 Markdown 文件块，再跑同一检查（实验目录 `run.lT36NU`），结果为 `source: served`、`classification: working`：cold 与 warm 均 `matched: Maple Mono NF CN`，builtin 为 `Ioskeley Mono Term`，missing 为 `null`。检查结束后关闭该临时块并把焦点交回原 pane。

## 版本保留与清理

用户的要求是只在本机保留最新三版，旧版本可以删除。清点时的版本目录如下（清理前 `du -sh` 数值，单位 MiB）：

| 版本 | 合计 | 程序 | 网页 | 字体 |
|---|---:|---:|---:|---:|
| 0.9.8 | 952 | 194 | 640 | 118 |
| 0.9.9 | 589 | 195 | 276 | 118 |
| 0.9.21 | 425 | 197 | 188 | 40 |
| 0.9.18 | 424 | 196 | 188 | 40 |
| 0.9.12 | 401 | 185 | 176 | 40 |
| 0.9.10 | 399 | 184 | 175 | 40 |
| 0.9.7 | 387 | 172 | 175 | 40 |
| 0.9.5 | 366 | 171 | 195 | — |
| 0.9.6 | 346 | 171 | 175 | — |
| 0.9.4 | 345 | 170 | 175 | — |
| 0.9.3 | 344 | 170 | 174 | — |
| 0.9.23 | 280 | 197 | 83 | — |
| 0.9.2 | 212 | — | 212 | — |
| 0.9.26 | 198 | 198 | — | — |
| 0.9.28 | 331 | 197 | — | 134 |

0.9.28 的 331 由程序 197 与登记目录 `0.9.28-registration-0a41f8c18682` 的 `134M` 相加得到；其余合计为该版本各目录之和。0.9.8 偏大是因为同名网页资源存在 `0.9.8`、`0.9.8-fixed`、`0.9.8-new` 三份 183M 副本与 91M 原版目录。

仓库内的构建目录单独统计：`workflow-rIT6C8` 2.3G、`workflow-ROAhTj` 2.1G、`workflow-eV2Po2` 627M、`write-cancel-llvnoA` 627M、`workflow-YF3NtD` 336M，合计约 6 GiB；它们按版本和时间混合，不能按版本精确分配。

实际删除对象：48 个 `tern-native-*`／`tern-web-*`／`tern-fonts-*`（0.9.2 到 0.9.28）、`0.9.28-registration-0a41f8c18682`、`tern-web-maple` 除 `wabt-1.0.42` 外的全部内容，以及仓库内 36 个构建模块和大型 WAT。删除后可用空间增加约 12 GiB。

保留的是 `0.9.29-YKaUMw39`、`0.9.30`、`0.9.30-registration-4b5e6963a299`、`0.9.32-oZFxMLl8`，以及下载目录里的 0.9.32 安装包。

## 一次误删与恢复

清理过程中曾用 `find … -name '*.wasm' -delete` 删掉 `tools/tern-maintain/artifacts/` 下 30 个历史验证模块。该目录被 `tools/tern-maintain/.gitignore` 排除，Git 无法还原。

恢复来源与结果：0.9.4 原版取自 `~/.local/share/tern-web-0.9.4-original/pkg/original.wasm`（`8672d8320fa49ea4f31fd50cf18a0fa7917a9727265331bfe3686299a01acc18`），0.9.4 候选取自 `~/.local/share/tern-web-0.9.4/pkg/client.wasm`（`f5f8e036dfbba59f6ddae2636d367355de05ca8e12874f3ff12fc8e6e5ca5a75`），0.9.5 原版取自 `~/.local/share/tern-web-0.9.5-original/pkg-original.wasm`（`1e6a49eaf33e3575e3a1c67c522cea76ece874dde2b4c8a98af5b16397cfbca5`），0.9.5 候选取自 `~/.local/share/tern-web-0.9.5/pkg/client.wasm`（`b132e0fe9e1ada03339ed222f2dd04b08385c79f39b1797d2610c253c4eefdbe`）。

测试模块用 recipe 重新构建：0.9.4 与 0.9.5 直接 `build` 到独立目录后复制，0.9.2 与 0.9.3 没有 recipe，改为从候选 WASM 反编译出 WAT，再按 profile 的导出表插入 `test_calendar`、`test_epoch`、`test_instant`、`test_elapsed`、`test_consumer` 后编译。0.9.2 的导出必须插在 `(export "memory" (memory 0))` 之后才能得到 `c4f86791191cd9dd31d334cab68896125e9f56269b0dc809c7b4f2262ada6afc`；插在其余导出之前得到的是 `8eca6e6d57c7bb5c5c12d0dd86a7d427e4c9eb2e46e5bc54fa411fc47770b71c`，并不匹配。0.9.3 按同一规则得到 `87136dec3aa01b8a844b11ae504928e68210825062e022e5a3a6067edf281055`。

两份失败构建样本同样按归档的 WAT 重新编译：`workflow-ROAhTj/0.9.4/test.wasm` 为 `525f02a034ccef1e0b873b37225a2f00a5a12e6e72020568e603f1a5e3d82be2`，`workflow-rIT6C8/0.9.5/test.wasm` 为 `cf9618da319931b216a78aaa62e1f5a3c486fd007a938c5133e36e15debcbf51`。

核对结果：30 个文件 `sha256sum -c` 全部 OK；7 份 `build.json` 覆盖 258 个文件全部一致；两份站点的 `deploy-manifest.json` 共 14 个文件一致。

仍缺失并未恢复的是 17 个 `experiments/run.*/inputs/*.wasm` 快照与旧字体站点的 3 个 0.8.4 网页模块；本机目录与 Chrome 缓存中都没有匹配副本，用户选择不联网重取。

## 未覆盖范围

字形观感与字符宽度未做机器判定，仍由用户目视。Windows Playwright 模块当时位于 `/mnt/c/Users/39764/AppData/Local/Temp/tern-font-root-JAFtwB/node_modules/playwright/index.mjs`，属于临时目录，下次检查需要重新确认路径。
