# 某红魔系专有客户端的 UA 白名单加密订阅取证

> Source: 本机实测会话记录（专有 Flutter+mihomo 套壳客户端，与 2026-09-16 raw 为同一客户端；按旧文口径不写实名，用「该客户端」指代）
> Collected: 2026-11-26
> Published: Unknown

## 背景

2026-09-16 记录的「flag 参数突破」取回的真实 Clash YAML 通道失效：Clash Verge 刷新该订阅条目报 `the remote profile data is invalid yaml`。用户要求找到可持续获取真实节点的通道，并保留既有地区自动分组。

## 实测响应三层分流（2026-11-26，同一订阅地址、同一 token）

| 请求 User-Agent | HTTP | 响应字节数 | 解码后内容 |
|---|---|---|---|
| clash-verge（Clash 默认） | 200 | 1320 | Base64，解码后 3 个 vmess 节点，server 均为 1.1.1.1，节点名提示「请使用官方客户端」「官网：quickline.top」「去官网教程处下载客户端」 |
| `hongmo` / `NetAPP` / `hongmo/3.0.5` / `NetAPP/3.0.5` / `hongmo/v3.0.5 clash-verge Platform/windows` / `NetAPP/v3.0.5 clash-verge Platform/windows` | 200 | 2264 | Base64，解码后 5 个 vmess 节点，server 均为 1.1.1.1，节点名提示「当前客户端已被禁用」「请登入官网获取官方客户端」「官网：hmgweb.notion.site」「客户端下载: https://ztq.mobi/kehuduan」「遇到问题请联系客服」 |
| `NetFlow/v3.0.5 clash-verge Platform/windows` | 200 | 125504 | Base64，AES 解密后为真实 mihomo YAML：57 个节点（香港 17、美国 5，无 1.1.1.1 占位），协议分布 ss 5 / anytls 12 / vless 39 / mieru 1 |

同一精确 UA 下，`flag=meta` 与 `flag=clash` 参数返回与无 flag 完全相同的 125504 字节响应（SHA256 前缀相同），说明服务端当前按 UA 而非 flag 分流。

携带 `Authorization: <登录token>` 头不改变占位响应；换 API 返回的备用 HTTPS host、换官方客户端 SQLite 里的历史 http host 同样返回占位内容。

## 官方通道关闭公告（2026-08-01 更新，知识库文章 id 20）

「为什么暂时没有提供直接订阅功能」：为避免节点失效、IP 被通报，「目前不建议继续使用直接订阅方式连接」，推荐下载官方客户端。同站 Windows 教程（id 22）要求安装时不要与其他 clash 软件同时运行。

## 内核取证与 AES 常量提取

- 核心可执行文件 stripped（`go tool nm` 无符号），但 GoReSym v3.3.1-v3.4.1 官方发布件（校验 SHA256 后使用）可恢复函数表：`github.com/metacubex/mihomo/common/convert` 下存在 `DecodeAESBase64`、`aesDecryptCBC`、`pkcs7Unpadding`、`DecryptConfig`、`DecodeObfuscatedBase64`、`isYAMLConfig`、`isValidConfig` 等定制解密函数。
- Go build 信息：go1.24.0，模块 `core v0.0.0-…-dirty`，构建路径含 Clash.Meta 源码树 `common/convert/decrypt.go` 与 `obfuscated_base64.go`。
- `DecodeAESBase64` 反汇编（`objdump -M intel`）函数头有 4 个 `movabs` 立即数指令，依次装载 16 字节 AES key 与 16 字节 CBC IV（ASCII；具体值不记录，取证路径可复现）。函数体确认外层 Base64 → AES-128-CBC → PKCS7 去填充 → 内层再 Base64 → YAML。
- 用该 key/IV 解密本机 `%APPDATA%/<app>/<app>/config.yaml` 与 `profiles/999999.yaml` 成功：86 节点明文 YAML（含 1 个 1.1.1.1 提示占位），其中顶层 `global-ua` 字段值为 `NetFlow/v3.0.5 clash-verge Platform/windows`——精确 UA 的来源，避免盲猜 UA 字符串。
- 另一条免密钥路径验证无效：`DecodeObfuscatedBase64` 的混淆码表（内核字面量可恢复）对当前加密内容不适用，解密需 AES 常量。

## Clash Verge 侧校验位置

Clash Verge Rev v2.5.10 `src-tauri/src/config/prfitem.rs` 的 `from_url`：下载后先 `serde_yaml_ng::from_str::<Mapping>(data)` 校验（报错文案 `the remote profile data is invalid yaml`），要求顶层 `proxies` 或 `proxy-providers`，之后才运行 merge/script/rules 增强。加密 Base64 响应过不了该校验，因此仅改 UA 不足以让 Clash Verge 直接消费，需要本机先解密。

## 分组保留验证

既有增强脚本（新增 `香港自动` / `美国自动` url-test 组，`include-all-proxies: true` + `filter`，push 进主 select 组；规则增强文件 7 条前置 DOMAIN 规则指向美国自动）在新解密配置上以 Bun `node:vm` 离线执行成功：两组生成、主组引用、成员非空、7 条规则不变。Clash 条目 option 挂的 script/rules/proxies/groups 增强文件与 URL 独立，条目不删除只换 URL 时定制保留。

## 交付：Windows 本机解密中转服务

目录 `%LOCALAPPDATA%\hongmo-clash-subscription\`（符号链接不存在；本机 Windows 用户目录），文件：`server.mjs`（Bun 常驻 HTTP 服务）、`key.bin`（32 字节 = AES key 16 + IV 16，权限私有，值不入库）、`server.test.js`（bun test）、`install.ps1`（登录启动安装）。

行为：监听 `127.0.0.1:8766`，`GET /hongmo.yaml` 时读取本机客户端登录数据（`%APPDATA%<app>\<app>\shared_preferences.json` 的 `flutter.auth_token`，RAM 内使用，不落盘不打印），调官方 HTTPS 元数据接口取当前 subscribe_url（校验必须 https），带精确 UA 下载，AES 解密，校验节点与分组后返回 YAML，并透传 `subscription-userinfo`、`profile-update-interval`、`profile-web-page-url` 响应头；非 GET 返回 405，未知路径 404，上游失败返回 502 与失败阶段名。登录启动经 Startup 目录快捷方式以隐藏 PowerShell 启动 Bun。

Clash 侧订阅 URL 换为 `http://127.0.0.1:8766/hongmo.yaml`，更新频率沿用 Clash 条目的自动更新设置。

## 升级与运行故障两次实测

1. **Bun upgrade 失败**：报 `Cannot find an overload for "ExtractToDirectory" and the argument count: "3"`，随后 `Failed to verify Bun (code: FileNotFound)`。根因：Bun 升级流程内部调 `powershell.exe`（Windows PowerShell 5.1 / .NET Framework），而该进程的 `PSModulePath` 含 PowerShell 7 的 `Microsoft.PowerShell.Archive` 模块路径，PS7 模块调用三参 `ExtractToDirectory` 重载，.NET Framework 无此重载，解压失败，bun.exe 未被替换。修复：升级前把子进程 `$env:PSModulePath` 临时限定为 `C:\Windows\System32\WindowsPowerShell\v1.0\Modules`（已验证该路径下 `Expand-Archive` 模块为兼容版本，且进程级修改不影响父会话），`bun upgrade` 成功 1.3.10 → 1.4.5。
2. **旧订阅域名连接重置**：桌面 txt 保存的旧 CDN host 出现 TLS 连接重置（Bun 报 `UNKNOWN_CERTIFICATE_VERIFICATION_ERROR`、Windows Node 报 `ECONNRESET`、WSL Python 报 `SSLEOFError`；同 token 官方 HTTPS 元数据接口正常）。处置：服务改为每次请求先调元数据接口取当前地址再下载，不再依赖桌面 txt 固化 host，恢复后 Windows 实测 HTTP 200、57 节点。桌面 txt 与旧 PowerShell 刷新脚本退出该链路。

## 验收记录

- `bun test server.test.js`：7 pass / 0 fail（解密往返、占位拒绝、空节点拒绝、畸形 YAML 拒绝、双次刷新跟随新地址且 CDN 请求不带 Authorization、401 登录失效拒绝、非 https 订阅地址拒绝）。
- Windows 真实端到端：本机 URL HTTP 200，`application/yaml; charset=utf-8`，`Cache-Control: no-store`，traffic 头透传，57 节点；离线执行增强脚本后香港自动 17、美国自动 5、美国规则 7 条；未知路径 404，错误方法 405。
- 运行态：Startup 快捷方式存在，converter 进程 1 个，仅监听 127.0.0.1:8766。
- Bun 升级后 4 项原测试在 1.4.5 复跑通过；升级期间旧实例内存镜像不受解压失败影响，但 Windows 文件锁意味着替换 bun.exe 前需先停服务。

## 敏感信息处理

登录 token、auth_token、订阅 URL 及 token、AES key/IV、Clash 控制器 secret、订阅节点 server/凭据组合均不写入本文件；原始读取输出曾在会话记录中出现 token 与 secret，本文件与由其编译的 wiki 文章不复述任何值。公共服务域名（订阅 CDN 域名家族、ztq.mobi 客户端下载页、知识库文章 id）保留为取证坐标。占位节点名提示文案含官网域名，按公开营销文案处理。
