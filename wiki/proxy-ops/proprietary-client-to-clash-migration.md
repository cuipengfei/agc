# 专有代理客户端迁移到标准 Clash：通用取证方法

> Sources: 本机实测会话记录, 2026-09-16
> Raw: [2026-09-16-proprietary-client-to-clash-subscription](../../raw/proxy-ops/2026-09-16-proprietary-client-to-clash-subscription.md)
> Updated: 2026-09-16

## Overview

当专有代理客户端只是标准开源内核的套壳时，可以把节点迁移到 Clash Verge Rev + mihomo，并拿到可自动刷新的订阅 URL。通用路径是：二进制指纹确认内核 → 用户数据目录找登录态 → 识别后端面板 → 用面板的标准格式参数取标准输出。

## 取证链

1. **二进制指纹先行**：对核心可执行文件跑 `strings`。若命中 `github.com/metacubex/mihomo` 等字符串，则内核是标准 mihomo，客户端只是套壳，迁移在原理上可行。同时确认支持的协议（VLESS/VMess/TUIC/Hysteria2/Shadowsocks/Reality）全是标准协议、没有私有协议墙。
2. **用户数据目录三件套**：`%APPDATA%` / `%LOCALAPPDATA%` / `%LOCALLOW%`。Flutter 应用通常有 `shared_preferences.json`；本例中它明文存有 `api_base_url`、JWT `auth_token` 和缓存的 `subscribe_url`。SQLite 的 `profiles` 表存有订阅 URL 与套餐信息。本地 profile 文件可能是高熵加密内容，但不需要解密——登录态已经足够。
3. **面板识别**：客户端的 Web 控制台前端 bundle 暴露 API 路径形态（如 `/api/v1/user/getSubscribe`），可据此识别后端面板家族。从面板的公开主题源码可直接读到鉴权方式——本例为 `Authorization` 头直接携带 token，**无 `Bearer ` 前缀**。
4. **识别占位墙**：默认订阅响应解码后若全部节点指向 `1.1.1.1` 且节点名是提示文案（如"请使用官方客户端"），即占位墙。判别要点：换多种 UA 响应字节数完全相同 → 与 UA 无关，不要下"按 UA 封锁"的结论；占位墙通常只加在**默认输出格式**上。
5. **格式参数突破（关键 eureka）**：V2Board 系面板的订阅接口用 `flag` 参数决定输出格式。先由步骤 1 的内核指纹确定目标格式名——内核是 mihomo，所以优先试 `flag=meta`、`flag=clash`，而不是盲试。对 subscribe_url 追加 `flag=meta` 后，本例服务器返回真实 mihomo YAML：86 个节点、8 个代理组、625 条规则，并带 `profile-update-interval: 24` 自动刷新头，Clash Verge 可直接导入并每日自动更新。
6. **交付形态**：一个刷新脚本（本地读登录态 → 调面板 API 取最新 subscribe_url → 追加 `flag=meta` → 校验响应含 `proxies:` → 输出 txt 供导入）。脚本不硬编码凭据。

## 复现要点（给下一个 agent）

- `getSubscribe` 调用形态：`GET {api_base_url}/user/getSubscribe`，header `Authorization: <token>`（原文、无 Bearer），响应 JSON 的 `data.subscribe_url` 即最新订阅地址。subscribe_url 的 CDN host 每次可能变化，所以脚本必须每次现取，不能固化 host。
- flag 候选清单：`clash`、`meta`（= clash.meta/mihomo）、`sing-box`、`v2ray`。命中标准：响应是含顶层 `proxies:` 的 YAML；不命中时常见为 Base64 URI 列表或占位墙。
- 验证订阅质量的四个硬指标：HTTP 200、YAML 可解析且 `proxies` 非空、节点 server 字段无 `1.1.1.1` 占位、响应头有 `profile-update-interval`。
- 导入 Clash Verge 时直接粘贴带 `flag=meta` 的完整 URL；若导入后只有几个名字像提示语的节点，即 flag 丢失或未生效。

## 安全边界

- **不要把订阅 URL 重写为明文 HTTP 地址**。曾把 URL host 改成 API 的明文 HTTP IP，被审查驳回：这会让 token 长期明文传输，且订阅内容可被链路篡改（攻击者可替换全部节点）。应保留服务端返回的 HTTPS host。
- 占位响应与 User-Agent 无关时不要下"按 UA 封锁"的结论；本例多种 UA 返回完全相同的占位内容。
- 登录态明文存于本机意味着任何本机进程都能读取；提取方便，但也是凭据面。

## 教训记录

- 脚本里数节点用的正则假设了 YAML 缩进（`^  - name:`），与真实输出不符，曾报 `Nodes: 0` 与实测 86 个节点矛盾。验收脚本的结果要用独立解析（如 YAML parser）复核，不能只信自己的正则。

## See Also

- [代理出口 IP 指纹批量测量](exit-ip-fingerprint-measurement.md)
