# ESP 租户滥用与登录页镜像代理：脱敏观测记录

> Source: 会话内直接观测（原始邮件头、HTTP 响应与静态脚本，已脱敏）
> Collected: 2026-11-20
> Published: Unknown

## 背景

一次钓鱼邮件观测：邮件冒充 AI 服务商的登录通知，正文使用真实模板与官方 CDN 图片，所有链接指向一个仿冒域名下的带令牌路径。点击链接后进入的页面与官方登录页高度一致。观测者点击了链接，没有输入任何凭据。

## 邮件认证观测

发信域（下称 `<abused-domain>`）属于被滥用的组织；邮件通过邮件服务商（ESP，本例为 NetcoreCloud）的授权租户发出。头部呈现以下形态：

- `Return-Path: <bounce-id@nc.<abused-domain>>`，退信子域为 `nc.<abused-domain>`。
- `Authentication-Results`：SPF PASS（`smtp.mailfrom` 指向 `nc.<abused-domain>`）；DKIM PASS（`header.i=@<abused-domain>`）；DMARC PASS（`header.from=<abused-domain>`）。
- `DKIM-Signature: d=<abused-domain>; s=<selector>`，签名域与被滥用域名一致。
- `X-Mailer: NetcoreCloud Mailer`。
- DMARC 策略为 `p=REJECT`，子域策略为 `sp=REJECT`。
- `From` 的显示名冒充该 AI 服务商，地址仍落在 `<abused-domain>`；`Reply-To` 指向另一个域，且不参与认证。

认证链成立的条件：`<abused-domain>` 的 DNS 发布了 DKIM 公钥，私钥由 ESP 持有；`nc.<abused-domain>` 的 SPF 记录包含 ESP 的发信 IP。拿到该 ESP 租户访问权的人可以正常签名并发信，收件方会判定为来自 `<abused-domain>` 的合法邮件。

消息标识、活动编号、发信 IP 与收件人信息均已省略。

## 页面访问观测

仿冒域名下称 `<lookalike-domain>`，官方登录域下称 `<official-domain>`。

1. 请求 `https://<lookalike-domain>/<token>`：返回 `302`，`Location: https://<lookalike-domain>/login`，同时设置一个域名级 Cookie（名称与值已省略，值每次访问轮换）。
2. 不带该 Cookie 请求 `/login`：返回 `154` 字节的 HTML，内容只有 `top.location.href='https://<official-domain>/login'`，把顶层窗口送到官方登录域。
3. 带该 Cookie 请求 `/login`：返回 `242602` 字节的登录页，标题与官方登录页一致。
4. 与该官方登录页对照：JS、CSS 与字体资源共 `66` 个，路径完全一致；配置中 `consoleAbsoluteUrl` 从 `<official-domain>` 改写为 `<lookalike-domain>`；验证码脚本域从官方验证码域改写为 `<lookalike-domain>` 下的子域；其余配置值保持原样。
5. 连续两次带 Cookie 请求，返回页面的 CSP nonce 不同；资源清单与页面结构保持一致。
6. 在同一仿冒域下无 Cookie 请求验证码脚本子域，返回的仍是第 2 步的 `154` 字节跳转页。
7. TLS 证书由 Let's Encrypt 签发，起始时间为 `2026-11-17 01:31 UTC`；响应头包含 Cloudflare 的 `Cf-Ray` 与 `__cf_bm`。
8. 静态 chunk 扫描未发现独立的凭据收集端点；可见的 API 字面量只有事件日志批处理路径。登录提交由服务端处理，静态资源中没有明文提交地址。

## 证据边界

- 本次观测没有提交邮箱或密码，无法直接验证后端是否记录明文凭据或转交会话 Cookie。
- “后端每次请求现场取官方页面并改写”属于机制推断，依据是资源清单一致、配置仅主机名改写、nonce 随请求变化。
- “代理转发凭据并可能转交会话 Cookie”属于机制推断，依据是同源提交与页面镜像形态。
- 域名解析结果落在 `198.18.0.0/15`，这是本机代理的 fake-IP 地址段，不能据此推断服务器位置或托管方。
- 邮件地址脚注中的零宽字符可能来自正规模板或复制过程，不能单独作为伪造判据。
- 具体被滥用域名、仿冒域名、令牌、Cookie 名与值、消息标识、活动编号、发信 IP、收件人地址均未写入。
