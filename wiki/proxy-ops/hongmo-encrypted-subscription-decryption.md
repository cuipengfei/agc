# 红魔系客户端 UA 白名单加密订阅的解密与维护

> Sources: 本机实测会话记录（专有 Flutter+mihomo 套壳客户端，名称按仓库口径匿名；与 2026-09-16 迁移记录同一客户端）, 2026-11-26
> Raw: [UA 白名单加密订阅取证](../../raw/proxy-ops/2026-11-26-ua-whitelist-encrypted-subscription.md)
> Updated: 2026-11-26

## Overview

该服务的订阅端点按 User-Agent 精确切分为三层：泛化 UA 收到 1320 字节占位墙（1.1.1.1 提示节点），泛用客户端名 UA 收到 2264 字节「客户端已被禁用」墙，精确 UA `NetFlow/v3.0.5 clash-verge Platform/windows` 收到 125504 字节 AES-128-CBC 加密的真实订阅。突破路径是：从内核恢复 Go 函数名 → 反汇编 `DecodeAESBase64` 提取 AES key/IV 常量 → 从本机官方客户端缓存的 `global-ua` 字段取得精确 UA → Windows 本机 Bun 常驻服务解密中转。Clash Verge 在运行增强脚本之前先做 YAML Mapping 校验，加密内容过不了，因此必须本机先解密再交付。现有地区自动分组与前置规则挂在与 URL 独立的增强文件上，条目只换 URL 时全部保留。

## 三层分流与判别法

同一订阅地址、同一 token，仅改 UA（2026-11-26 实测）：

| UA 形态 | 响应 | 判别特征 |
|---|---|---|
| 泛化（clash-verge 默认等） | 1320 字节 Base64 | 解码后 vmess 节点 server 全为 1.1.1.1，节点名是「请使用官方客户端」类提示 |
| 泛用客户端名（hongmo、NetAPP 及带版本变体） | 2264 字节 Base64 | 「当前客户端已被禁用」提示节点 |
| 精确 `NetFlow/v3.0.5 clash-verge Platform/windows` | 125504 字节 Base64 | AES 解密后 57 个真实节点，香港 17、美国 5，无占位 |

判别要点：响应字节数是最快的分流信号；占位内容都是合法 Base64，必须解出节点检查 server 与节点名，单看 `HTTP 200 + Base64` 会误判为可用订阅。精确 UA 与泛用名 UA 只差应用名一节，盲猜命中概率低——正确来源是本机官方客户端解密后的 `global-ua` 字段。携带 `Authorization` 头、更换备用 CDN host、`flag=meta` / `flag=clash` 参数均不改变分流结果。

## AES 常量的取证路径

1. **恢复函数表**：内核 stripped（`go tool nm` 报 no symbols），GoReSym 官方发布件（校验 release asset 的 SHA256 digest 后使用）可恢复 `UserFunctions`。定制点在 `github.com/metacubex/mihomo/common/convert` 下出现 `DecodeAESBase64`、`aesDecryptCBC`、`pkcs7Unpadding`、`DecryptConfig`、`DecodeObfuscatedBase64` 等函数，即上游 mihomo 不含的订阅解密层。
2. **提取常量**：`DecodeAESBase64` 反汇编后，函数头部 4 条 `movabs` 立即数依序装载 16 字节 key 与 16 字节 IV（ASCII 字节序）。算法结构为外层 Base64 → AES-128-CBC → PKCS7 去填充 → 内层 Base64 → YAML。
3. **落地形态**：32 字节写入服务目录的 `key.bin`（key 16 + IV 16），权限私有；密钥值不入 wiki、不入任何仓库文件。
4. **免密钥替代已验证无效**：`DecodeObfuscatedBase64` 的混淆码表置换对当前加密内容不适用。

## Clash Verge 为什么需要中转

Clash Verge Rev v2.5.10 `src-tauri/src/config/prfitem.rs` 的 `from_url`：下载后先 `serde_yaml_ng::from_str::<Mapping>` 校验并要求顶层 `proxies` 或 `proxy-providers`，报错文案即 `the remote profile data is invalid yaml`；merge/script/rules 增强都在校验之后。所以即使 UA 正确，加密响应也进不了 Clash，必须本机解密成 YAML 后由本地 HTTP 地址交付。仅设置条目的自定义 User-Agent 不足。

## 本机解密中转服务

Windows 侧目录 `%LOCALAPPDATA%\hongmo-clash-subscription\`：

| 文件 | 作用 |
|---|---|
| `server.mjs` | Bun 常驻 HTTP 服务，监听 `127.0.0.1:8766` |
| `key.bin` | 32 字节 AES key+IV，服务启动时读入 RAM |
| `server.test.js` | bun test 行为测试（7 项） |
| `install.ps1` | 创建 Startup 目录登录启动快捷方式并启动服务 |

请求 `GET http://127.0.0.1:8766/hongmo.yaml` 的处理链：读本机客户端登录数据（`%APPDATA%\<app>\<app>\shared_preferences.json` 的 `flutter.auth_token`，只在 RAM 中使用，不落盘不打印）→ 调官方 HTTPS 元数据接口取当前 subscribe_url（校验必须 https）→ 带精确 UA 下载 → AES 解密 → 校验节点与分组非空 → 返回 YAML 并透传 `subscription-userinfo`、`profile-update-interval`、`profile-web-page-url`。非 GET 返回 405，未知路径 404，上游失败返回 502 与失败阶段名（不返回假成功）。地址每次现取，不依赖任何固化 host——桌面 txt 与旧 PowerShell 刷新脚本已退出链路。

Clash 侧：既有订阅条目只把 URL 换为本机地址，自动更新间隔沿用条目设置；增强脚本、规则、分组、代理组文件与 URL 独立，全部保留（离线验证：香港自动 17 成员、美国自动 5 成员、7 条美国规则）。

## 维护手册（给下一个 agent）

**前提条件**：Windows 本机 Bun（`%USERPROFILE%\.bun\bin\bun.exe`）；登录数据文件 `%APPDATA%\<app>\<app>\shared_preferences.json` 存在且 `flutter.auth_token` 未过期（凭据过期需重新登录官方客户端一次，客户端平时可保持关闭）。

**日常检查**（Windows PowerShell）：

```powershell
(Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8766/hongmo.yaml").StatusCode
```

返回 `200` 即服务正常；`502` 的 body 会写明失败阶段（login information / subscription refresh / decryption）。

**修改代码后**：`bun test server.test.js` 跑行为测试，再重启服务（停 `bun.exe` 且命令行含 `hongmo-clash-subscription\server.mjs` 的进程，然后双击 Startup 快捷方式 `hongmo-clash-subscription.lnk`）。

**故障速查**：

- 502 at `login information`：登录数据文件缺失或 auth_token 过期 → 重新登录官方客户端。
- 502 at `subscription refresh`：上游 HTTPS 失败或返回非 200；曾实测旧 CDN host 出现 TLS 连接重置（Bun 报 `UNKNOWN_CERTIFICATE_VERIFICATION_ERROR`、Node 报 `ECONNRESET`）。服务每次现取地址，单个 host 失效不应持续；持续失败再查元数据接口连通性。
- 502 at `decryption`：服务端换了加密密钥或算法 → 按 raw 的取证路径重新从新版内核提取常量，更新 `key.bin`。
- Clash 刷新报 invalid yaml：确认请求的是本机地址而非原始订阅地址；本机地址返回 502 时 Clash 会保留旧配置。

**升级 Bun 的已知坑**：`bun upgrade` 内部调 Windows PowerShell 5.1 跑 `Expand-Archive`，若进程 `PSModulePath` 含 PowerShell 7 的 `Microsoft.PowerShell.Archive`，三参 `ExtractToDirectory` 重载在 .NET Framework 不存在，解压失败且 bun.exe 不被替换（报 `Failed to verify Bun (code: FileNotFound)`）。修复：升级前把子进程 `$env:PSModulePath` 临时限定为 `C:\Windows\System32\WindowsPowerShell\v1.0\Modules`，finally 里恢复；已实测 1.3.10 → 1.4.5 升级成功，升级后 4 项原测试通过。替换 bun.exe 受 Windows 文件锁限制，升级前先停转换服务。

**敏感边界**：登录 token、订阅 token、AES key/IV、控制器 secret、节点 server 与凭据组合不得写入任何仓库文件或日志；服务源码只含占位路径与公开域名坐标。

## 验收记录

`bun test server.test.js` 7 pass / 0 fail；Windows 真实端到端 HTTP 200、57 节点、香港自动 17、美国自动 5、美国规则 7 条、未知路径 404、错误方法 405；运行态仅监听 127.0.0.1:8766。

## See Also

- [专有代理客户端迁移到标准 Clash：通用取证方法](proprietary-client-to-clash-migration.md) — flag 突破时期的历史取证链与本次失效的衔接
- [地区自动选线与测速判定：url-test 组的实测行为](regional-url-test-auto-fallback.md) — 保留的自动分组配置面与行为
- [域名定向代理规则：把指定域名固定到代理组](domain-targeted-proxy-rules.md) — 条目增强文件与 URL 独立的结构依据
