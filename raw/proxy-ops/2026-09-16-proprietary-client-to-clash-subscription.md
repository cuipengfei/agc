# 专有代理客户端到标准 Clash 订阅的提取过程记录（匿名化）

> Source: 本机实测会话记录（专有 Flutter+mihomo 套壳客户端，名称已去除）
> Collected: 2026-09-16
> Published: Unknown

## 背景

某专有代理客户端（Flutter UI + 独立核心可执行文件），用户希望脱离该客户端、把节点导入标准 Clash Verge Rev + mihomo 使用，并最好能拿到可自动刷新的订阅 URL。

## 逐步取证链

1. 安装目录枚举：发现 `flutter_windows.dll`、`data/app.so`、独立 `*Core.exe`、特权 Helper 服务。
2. 进程探测：`tasklist` + `Get-NetTCPConnection`，观察到 mixed proxy 端口、内部 IPC 端口、198.18.x.x fake-ip TUN 段监听。
3. 核心二进制 `strings` 扫描：命中 `github.com/metacubex/mihomo` 字符串，确认内核是 mihomo；协议关键字命中 VLESS/VMess/TUIC/Hysteria2/Shadowsocks/Reality。
4. 用户数据定位：`%APPDATA%/<app>/` 下发现 `shared_preferences.json`、`database.sqlite`、`profiles/*.yaml`；profile YAML 为高熵内容（外层 Base64、内层高熵，未解密）。
5. SQLite `profiles` 表：存在订阅 URL（`http://<IP>:<port>/<path>?token=<hex>` 形态）、套餐名、流量统计字段。
6. `shared_preferences.json`：存在 `flutter.api_base_url`、`flutter.auth_token`（JWT）、`flutter.cached_subscribe_info`（含 subscribe_url）——登录态以明文存于本地。
7. 订阅 URL 直连测试：多种 User-Agent（clash-verge、clash.meta、客户端自身 UA）均返回同样大小的 Base64 内容，解码后为 5 个指向 1.1.1.1 的占位节点（提示使用官方客户端）。结论：占位响应与 UA 无关。
8. Web 控制台前端分析：该服务控制台为 V2Board 面板 + 开源主题（vlesstop/v2board-theme-buddy）；从主题源码读到鉴权方式：`Authorization` 请求头直接携带 token，无 `Bearer ` 前缀；请求路径形如 `/api/v1/user/getSubscribe`。
9. 关键突破：V2Board 订阅接口的公开约定是 `flag` 参数决定输出格式。对 subscribe_url 追加 `flag=meta` 后，服务器返回真实的 mihomo YAML（86 个节点、8 个代理组、625 条规则，协议类型 anytls/ss/vless），并带 `profile-update-interval: 24` 响应头。不带 flag 的默认格式（Base64 URI 列表）被服务端替换为占位节点；flag=clash / flag=meta 的 YAML 通道未加该限制。
10. 交付物：一个 PowerShell 脚本（读取本地 shared_preferences 的 api_base_url 与 auth_token → 调 `/user/getSubscribe` 取最新 subscribe_url → 追加 `flag=meta` → 校验响应为含 `proxies:` 的 YAML → 写入 txt 文件供 Clash Verge 导入）。脚本本身不含硬编码凭据。
11. 修正记录：
    - 曾把订阅 URL 的 host 重写为 API 的明文 HTTP IP 地址；该做法会把 token 长期暴露在明文传输中且允许链路篡改订阅内容，被审查驳回后回滚，保留服务器返回的 HTTPS CDN host。
    - 脚本初版的节点计数正则 `^  - name:` 与真实 YAML 缩进不符，输出 `Nodes: 0`，与实际 86 个节点矛盾；移除该行。

## 通用结论

- 专有客户端套壳标准内核时，迁移路径是：确认内核 → 找本地登录态 → 识别后端面板 → 用面板的标准格式参数取标准输出。
- V2Board 系面板订阅的 `flag` 参数决定输出格式；客户端锁定常见实现是只替换默认格式的返回内容，其他格式通道可能未受限。
- 订阅 URL 不应重写为明文 HTTP 地址；保留服务端返回的 HTTPS host。
- 登录态（token/JWT）在这类客户端通常以明文存于 shared_preferences/SQLite，提取方便但意味着本机任何进程都能读。
