# Google Antigravity 地区名单、资格判定与社区用量报告摘录

> Source: https://antigravity.google/docs/faq/ ; https://discuss.ai.google.dev/t/your-current-account-is-not-eligible-for-antigravity-because-it-is-not-currently-available-in-your-location/136457 ; https://discuss.ai.google.dev/t/subject-request-for-assistance-google-account-country-association-incorrectly-set-to-china/197612 ; https://discuss.ai.google.dev/t/antigravity-app-2-26-0-returns-unsupported-location-1008-for-every-model-account-country-is-japan/196250 ; https://discuss.ai.google.dev/t/antigravity-returns-403-unsupported-location-1008-even-though-my-account-and-location-are-eligible/199573 ; https://github.com/google-gemini/gemini-cli/issues/15986 ; https://www.cnblogs.com/SH-xuliang/p/19540440 ; https://www.reddit.com/r/google_antigravity/comments/1rr9n6x/mark_my_words_google_is_moving_towards_the_credit/ ; https://www.reddit.com/r/google_antigravity/comments/1xc0uvj/google_completely_wrecked_usage_tiers_15_minutes/ ; https://www.reddit.com/r/google_antigravity/comments/1xrmvl6/weekly_quotas_known_issues_support_november_09/
> Collected: 2026-11-14
> Published: Unknown

验证级别：`[DOC]` = 官方 FAQ 或官方论坛支持人员回复；`[OBS]` = 本次会话用户观察到的 Google 页面表单结构；`[COMMUNITY]` = 论坛、GitHub issue、Reddit 或博客用户报告；`[UNVERIFIED]` = 未实测。

论坛与社区账号标识以 `<USER>` 代替，原始来源链接保留。

## 1. `https://antigravity.google/docs/faq/` 地理可用性与 Google One 购买差异（`[DOC]`）

官方 FAQ 的洲际标题及其数字如下，标题数字相加为 224：
- `Americas (51 countries and territories)`
- `Europe (47 countries and territories)`
- `Africa (56 countries and territories)`
- `Asia (43 countries and territories)`
- `Oceania and Antarctica (27 countries and territories)`

亚洲名单及页面标题摘录：

```markdown
**Asia (43 countries and territories):**
* Bahrain
* Bangladesh
* Bhutan
* British Indian Ocean Territory
* Brunei
* Cambodia
* Christmas Island
* Cocos (Keeling) Islands
* India
* Indonesia
* Iraq
* Israel
* Japan
* Jordan
* Kazakhstan
* Kuwait
* Kyrgyzstan
* Laos
* Lebanon
* Malaysia
* Maldives
* Mongolia
* Nepal
* Oman
* Pakistan
* Palestine
* Philippines
* Qatar
* Saudi Arabia
* Singapore
* South Korea
* Sri Lanka
* Taiwan
* Tajikistan
* Thailand
* Timor-Leste
* Türkiye
* Turkmenistan
* United Arab Emirates
* Uzbekistan
* Vietnam
* Yemen
```

中国大陆（China）、香港（Hong Kong）、澳门（Macau）均不在上述亚洲名单中。

同页 `Why am I ineligible for a Google One AI plan?` 列出了在 Antigravity 支持名单内、但目前无法购买 Google One AI 套餐的 31 个地区（含 `Brunei`、`Türkiye`、`Greenland`、`Faroe Islands`、`Kosovo`、`Montenegro`、`U.S. Virgin Islands` 等；`Singapore`、`Japan`、`Taiwan`、`South Korea`、`United States` 不在该不可购买列表中）：

```markdown
## Why am I ineligible for a Google One AI plan?

The following regions do not currently have access to Google One AI plans:
- Antarctica
- Brunei
- Caribbean Netherlands
- Curaçao
- Democratic Republic of the Congo
- Eswatini
- Falkland Islands (Islas Malvinas)
- Faroe Islands
- Greenland
- Guernsey
- Heard Island and McDonald Islands
- Isle of Man
- Jersey
- Kosovo
- Montenegro
- New Caledonia
- Pitcairn Islands
- Republic of the Congo
- Saint Barthélemy
- Saint Helena, Ascension and Tristan da Cunha
- Saint Kitts and Nevis
- Saint Vincent and the Grenadines
- São Tomé and Príncipe
- South Georgia and the South Sandwich Islands
- South Sudan
- Sudan
- The Gambia
- Türkiye
- United States Minor Outlying Islands
- U.S. Virgin Islands
- Wallis and Futuna
```

## 2. 地区与资格判定：官方论坛支持回复与用户案例（`[DOC]` + `[COMMUNITY]`）

### 2.1 中国大陆关联账号（Topic `197612`，2026-11-02）

一名用户报告在 2026-10-28 开着美国 VPN 注册 Google 账号，账号归属地仍显示为 `China`。一名论坛支持人员于 2026-11-02 回复（`[DOC]`）：

```markdown
* **Form submissions and confirmation emails**: The Country Association Correction Form (https://policies.google.com/country-association-form) is handled by Google's central Account and Legal review team rather than Antigravity Support. Because that queue is separate from our support tools, we don't have visibility into whether your previous submissions were received or what their review status is, and we can't manually approve or override an account's region. You don't need to keep resubmitting the form, as it's already the only official channel for requesting a region review.
* **Region eligibility**: Google determines an account's associated country using multiple account and location signals, so using a VPN during registration doesn't override other signals pointing to mainland China. Under our geographical availability policy ( https://antigravity.google/docs/faq ), mainland China isn't currently a supported region for Google Antigravity, and Antigravity Support isn't able to grant regional exceptions.

Since country association is managed server-side on your Google Account, local steps like reinstalling Antigravity or clearing cache won't change it. You can check the country currently tied to your account at https://policies.google.com/terms. If you have another Google Account that is already associated with a supported country or territory listed in the FAQ, you can sign in with that account instead.
```

### 2.2 香港 AI Pro 付费用户被拒（Topic `136457`，2026-03-27 至 2026-04-16，`[COMMUNITY]`）

```markdown
# Your current account is not eligible for Antigravity, because it is not currently available in your location
Created by: <USER> - 2026-03-27

I am experiencing an issue accessing my subscription benefits after signing in with my personal Google account. I have a paid **AI Pro** subscription, and according to the plan details, **Antigravity** should be available to me.
Despite Hong Kong recently being added as a supported location for Gemini, I am still encountering an error and cannot access these features. I have tried several troubleshooting steps, but the problem persists. Reinstall Antigravity, remove cache file, delete environment variables. By the way, Gemini CLI / Gemini Code Assist is ok.
```

### 2.3 日本账号遇 `403 UNSUPPORTED_LOCATION (1008)` 与代理分流（Topic `196250`，2026-10-27 至 2026-11-05）

- 一名用户报告 `policies.google.com/terms` 显示 `Country version: Japan`，Windows 11 下 Antigravity App `2.26.0` 登录成功，但所有模型请求均返回：
  - `403 PERMISSION_DENIED`
  - `reason: UNSUPPORTED_LOCATION`
  - `error_number: 1008`
  - `"Your current account is not eligible for Gemini Code Assist for individuals because it is not currently available in your location."`
- 一名论坛支持人员于 2026-10-28 回复（`[DOC]`）：

```markdown
This error is a location eligibility check and it is evaluated using the network location your requests come from, not only the country on your Google Account. Requests sent through proxies or VPNs can be classified differently from the exit country you selected, so the country shown on your Terms of Service page alone doesn't determine the result.

If you are physically located in a supported country, please turn off the proxy or VPN and connect directly, then sign out from **Settings → Account → Sign Out** in the Antigravity App and sign in again.
```

- 一名社区成员于 2026-11-05 补充排查项（`[COMMUNITY]`）：

```markdown
Rule-Mode Split Routing on `daily-cloudcode-pa.googleapis.com` and `aicode.googleapis.com`: Many local Windows proxy rulesets route `*.google.com` through the Japan node while sending `*.googleapis.com` (or direct UDP/QUIC `HTTP/3` traffic) via `DIRECT` to speed up downloads. Switch your local proxy client from **Rule** mode to **Global** mode, disable **UDP / QUIC** on port `443` so Go's `language_server` is forced over the proxied TCP tunnel...
Google Play / Payments Country vs. `policies.google.com/terms`: Even when `policies.google.com/terms` displays Country version: Japan, Google's internal eligibility check also looks at the country tied to your Google Payments profile at `pay.google.com` (Settings > Country/Region) and the hard country association at `policies.google.com/country-association-form`.
```

### 2.4 新加坡账号与直连仍遇 `1008`（Topic `199573`，2026-11-11 至 2026-11-12）

- 一名用户（2026-11-11，`[COMMUNITY]`）报告人在新加坡、不用 VPN、`policies.google.com/terms` 显示 `Singapore`，此前可以使用，当天报 `HTTP 403 PERMISSION_DENIED` / `reason: UNSUPPORTED_LOCATION` / `error_number: 1008`。
- 一名论坛支持人员于 2026-11-11 回复（`[DOC]`）：

```markdown
Since Singapore is a [supported region](https://antigravity.google/docs/faq#what-is-google-antigravitys-geographical-availability) and you are connecting directly without a VPN, please check the following:
* **Verify your Google Terms of Service country**: Antigravity checks the country listed specifically on the [Google Terms of Service](https://policies.google.com/terms) page rather than general Google Account or Maps location settings. If it does not show **Singapore**, submit a region update via the [Country Association form](https://policies.google.com/country-association-form).
* **Reset cached onboarding state**: Signing out and back in can retain a cached `1008` eligibility state on Windows. In **Antigravity IDE**, press `Ctrl+Shift+P` and run **`Antigravity: Reset Onboarding`**, or in the **Antigravity App (`v2.31.0`)**, quit the app and clear `%APPDATA%\Antigravity` before signing in again.
* **Check ISP IP classification**: Try connecting briefly via a mobile hotspot. If a direct residential ISP connection is misclassified by Google's geolocation system, you can report it via Google's [Report IP problems](https://support.google.com/websearch/workflow/9308722) form.
```

- 该用户于 2026-11-12 反馈（`[COMMUNITY]`）：确认 Terms 页面为 `Singapore`、清空 `%APPDATA%\Antigravity` 并提交 IP 报告后，仍收到 `403 PERMISSION_DENIED` / `1008`，问题截至 2026-11-12 尚未解决。

## 3. Google 账号归属地查看页与修改表单选项（`[OBS]` + `[COMMUNITY]`）

- 本次会话（2026-11-14）在 `https://policies.google.com/terms` 观察到的页面顶部标识（`[OBS]`）：

```text
Google Terms of Service
Effective July 30, 2026 | Archived versions | Download PDF
Country version: <COUNTRY>
```

- 本次会话（2026-11-14）在 `https://policies.google.com/country-association-form` 观察到的表单结构与 8 个预设原因选项（`[OBS]`）：

```text
您希望将账号关联到哪个地区？
选择地区
为什么您的账号应与这个地区关联？
- 我住在这里
- 我在过去一年内搬到了这里
- 我的居住地、工作地或学习地在领土边界附近
- 我的工作地/学习地和居住地分属不同的地区
- 我经常旅行
- 我经常使用虚拟专用网 (VPN)
- 我与在另一个地区居住或工作的他人共用我的设备
- 其他原因
```

- 社区经验参考（`https://github.com/google-gemini/gemini-cli/issues/15986` 与 `https://www.cnblogs.com/SH-xuliang/p/19540440`，`[COMMUNITY]`）：
  - 博客园转载 Yeekal（2025-11-19）教程记录：在 `country-association-form` 选择目标地区后填写英文说明申请修改，收到审核通过邮件后重新登录 Antigravity 并完成授权。
  - GitHub issue `#15986` 中两名用户（2026-06-08 与 2026-08-28）提到 VPN 需开启 TUN 模式，并检查 `payments.google.com` 支付资料国家。

## 4. 社区用量与限流报告（2026-03 至 2026-11，`[COMMUNITY]`）

### 4.1 `r/google_antigravity` 2026-03-11 帖（用户追踪 3 个付费 AI Pro 账号）

```markdown
# Mark my words, Google is moving towards the credit system for Antigravity
**r/google_antigravity** · <USER> · 143 points · 101 comments · 2026-03-11

* Before January I could use over 300 million input / 1-2 million output in a week for the Gemini Pro models.
* In January when weekly rate limits rolled around the first few weeks I started getting rate limited at around 150 million input / ~1 million output tokens in a week, which was still a great deal.
* In February this went down to 80 million / 500 thousand output tokens, which was still acceptable.
* However In March everything has fallen apart. It first went to 25 million / 250 thousand last week and this week I hit my weekly rate limits at less than 9 million input / 200 thousand output tokens. I get more than that with Gemini CLI now.
In fact I now consistently hit my weekly rate limit in the first 5 hour quota window (there is basically no more 5 hour quota for the Gemini Pro models - I don't use Claude models so I don't know about those). This has happened across all three of my paid AI Pro subscriptions so I know this is systemic.
... I tried out the AI credit system today and blew through 280 credits on a single task ...
```

### 4.2 `r/google_antigravity` 2026-10-21 帖与评论区

```markdown
# Google completely wrecked usage tiers. 15 minutes on a simple task and I'm blocked for the week
**r/google_antigravity** · <USER> · 36 points · 28 comments · 2026-10-21

I tried running it with Flash 3.8—something that used to run fine. 15 minutes in, the process couldn't even finish because I was completely blocked out. ... Then came the real shock: it wasn't just my 5-hour window that ran out, my **entire week** was completely wiped out. I thought maybe it was just a glitch with the Flash model, so I tried Sonnet instead... and boom, that burnt through instantly too.

- **<USER>** · 2026-10-22:
  Na they split up Argon and Gemini models into two different usage limits. And opus and sonnet have their own limits.
```

### 4.3 `r/google_antigravity` 2026-11-09 周帖（`[Weekly] Quotas, Known Issues & Support — November 09`）

```markdown
- **<USER>** · 2026-11-09:
  Burnt trough 40% in a day on Gemini 3.8 medium.. wtf..
- **<USER>** · 2026-11-09:
  OS: Win 11 | v2.29.0 | 4 Argon & 3.8 Flash Constant 503s all day today and "model unavailable" for the past few days. 4 Argon is completely bricked across low, medium, and high. 3.8 Flash only works on medium right now.
- **<USER>** · 2026-11-09:
  Claude Opus now burns through 2500 tokens + the 5 hour limit in under 30 minutes. Similar tasks less than 2 weeks ago would be completed without me needing to reload with extra tokens and I could get other tasks solved too.
  It spawned up to 8 sub agents to check data in a CSV file, 1 agent per X lines in the file.
```

注：报告 Claude Opus 用量的用户未在评论中注明其所属套餐档位（Pro 或 Ultra）。

## 5. 未测与排除项（`[UNVERIFIED]`）

- 本次未提交 `country-association-form`，未实测各预设理由（如“我经常使用虚拟专用网 (VPN)”）的通过率。
- 本次未在中国大陆网络环境下实测调用 Claude Opus 5.5，未验证特定代理软件或节点。
- 2025 年 12 月旧帖中的“250 次请求/5 小时”及仅见于搜索结果摘要而未在已读帖子正文中出现的美元配额估算数字，不作为 2026 年 11 月的已核实事实使用。
