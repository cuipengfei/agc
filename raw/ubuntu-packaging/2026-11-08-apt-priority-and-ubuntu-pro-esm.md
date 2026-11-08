# apt 来源优先级与 Ubuntu Pro ESM 启用摘录

> Source: 本机 wsl-webtop 会话调查（用户追问原文 + 实测 `apt-cache policy`、`/etc/apt/preferences.d/` 全部 pin 文件、`pro status`、`/var/log/apt/history.log`、USN-8893-1、Ubuntu Pro 官方流程）
> Collected: 2026-11-08
> Published: Unknown

本文是原始材料摘录。来源逐块标注：用户原话、配置原文、实测输出、官方资料。identifier 与代码一律保持英文原名。

## 用户追问原文

关于包用途与来源：

> 这两个包具体做什么？谁在用？只有 ttyd？

关于自动化的可能：

> this is too manual, can it be auto? what other tweaks did we do to apt in this wsl? hold anything else?
> can we give the good source higher priority? and the xtradeb lower priority? so that if newer good version come, apt update and apt upgrade will auto get it?

关于安全修复是否存在：

> 当前安装的 4.3.5-3ubuntu1.1 仍属于公告所列的受影响版本，安全修复尚未安装? is security fix even existing? you say not yet installed? which implies that it it already out there? or what?

关于 Ubuntu Pro：

> Ubuntu Pro ESM, full name is what? esm? it is free? need to pay? when will the fixed version come to our normal apt source?
> 个人使用可以免费覆盖最多 5 台机器 … ok, lets go get it, do it for me, how?
> if we use ubuntu pro already, why not enabled them? net gain? any lose?
> enabled

## apt 优先级模型（官方手册要点）

`man apt_preferences` 的关键规则：没有 pin 时，各软件源默认优先级 `500`；先看优先级，优先级相同时取**版本号最大**的那个。

手册给出的优先级区间原文（`P` 为 Pin-Priority）：

| 区间 | 含义（手册措辞） |
|---|---|
| `P >= 1000` | 即使构成降级也安装 |
| `990 <= P < 1000` | 即使不来自 target release 也安装，除非已装版本更新 |
| `500 <= P < 990` | 安装，除非存在属于 target release 的版本或已装版本更新 |
| `100 <= P < 500` | 安装，除非存在属于其他 distribution 的版本或已装版本更新 |
| `0 < P < 100` | 仅在没有任何已装版本时安装 |
| `P < 0` | 阻止该版本被安装 |
| `P = 0` | 行为未定义，手册明确要求不要使用 |

这一点解释了本次事故：xtradeb 与 Ubuntu 官方同为 `500`，而 xtradeb 的版本号 `4.3.5-3xtradeb1.2604.1` 高于 `4.3.5-3ubuntu1.1`，于是普通 `apt upgrade` 自然切到第三方构建。

## 本机全部 apt pin 文件（实测原文）

`/etc/apt/preferences.d/libwebsockets-official`（本次新增，104 字节）：

```text
Package: libwebsockets19t64 libwebsockets-evlib-uv
Pin: release o=LP-PPA-xtradeb-apps
Pin-Priority: -1
```

`/etc/apt/preferences.d/nodejs`：

```text
Package: nodejs
Pin: origin deb.nodesource.com
Pin-Priority: 600
```

`/etc/apt/preferences.d/nsolid`：

```text
Package: nsolid
Pin: origin deb.nodesource.com
Pin-Priority: 600
```

`/etc/apt/preferences.d/ubuntu-pro-esm-apps`（由 `ubuntu-pro-client` 包提供，文件内注明「no effect if Ubuntu Pro services are not in use」）：

```text
Package: *
Pin: release o=UbuntuESMApps
Pin-Priority: 510
```

`/etc/apt/preferences.d/ubuntu-pro-esm-infra`：

```text
Package: *
Pin: release o=UbuntuESM
Pin-Priority: 510
```

注意：两个 ESM pin 文件在启用 Pro 之前就存在（文件时间约 31 个月），只是当时没有对应软件源，因此不生效。

## `apt-cache policy` 收窄后的实际效果

启用 Pro 并安装 `+esm1` 后实测：

```text
libwebsockets19t64:
  Installed: 4.3.5-3ubuntu1.2+esm1
  Candidate: 4.3.5-3ubuntu1.2+esm1
  Version table:
     4.3.5-3xtradeb1.2604.1 -1
        500 https://ppa.launchpadcontent.net/xtradeb/apps/ubuntu resolute/main amd64 Packages
 *** 4.3.5-3ubuntu1.2+esm1 510
        510 https://esm.ubuntu.com/apps/ubuntu resolute-apps-security/main amd64 Packages
        100 /var/lib/dpkg/status
     4.3.5-3ubuntu1.1 500
        500 https://archive.ubuntu.com/ubuntu resolute-updates/universe amd64 Packages
        500 https://security.ubuntu.com/ubuntu resolute-security/universe amd64 Packages
```

即：xtradeb 被 `-1` 排除；ESM 的 `510` 胜过普通源 `500`；`/var/lib/dpkg/status` 的 `100` 是已安装版本自身。`apt-get -s upgrade` 在修复完成后给出 `0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded`。

## hold 与 pin 的区别（本机实测对比）

会话早期使用 `apt-mark hold libwebsockets19t64 libwebsockets-evlib-uv`，随后发现副作用：hold 会拦住**该包的所有**升级，包括将来的安全修复，只有手动 `unhold` 才解除。

最终状态是：`apt-mark showhold` 输出为空，改用包级 pin 表达「不要 xtradeb 的这个构建」，同时保留官方与 ESM 的正常升级通道。

## Ubuntu Pro 启用过程（实测记录）

客户端版本与环境检查后，用设备码流程绑定：

```text
sudo pro attach
```

输出提示访问 `https://ubuntu.com/pro/attach` 并输入一次性设备码（形如 6 位大写字母数字）。用户侧首次访问该页面返回 Canonical 的 HTTP 500「We couldn't load this page」，重试后正常；输入设备码完成后终端侧流程结束（`proc://pro-attach` 退出码 0）。

绑定后 `pro status` 实测：

```text
SERVICE          ENTITLED  STATUS       DESCRIPTION
esm-apps         yes       enabled      Expanded Security Maintenance for Applications
esm-infra        yes       disabled     Expanded Security Maintenance for Infrastructure
landscape        yes       disabled     Management and administration tool for Ubuntu

     Account: <REDACTED>
Subscription: Ubuntu Pro - free personal subscription
```

即：免费个人订阅；`pro attach` 的默认流程启用了 `esm-apps`，`esm-infra` 与 `landscape` 未启用。

随后按需启用 `esm-infra`：

```text
sudo pro enable esm-infra
One moment, checking your subscription first
Configuring APT access to Ubuntu Pro: ESM Infra
Updating Ubuntu Pro: ESM Infra package lists
Ubuntu Pro: ESM Infra enabled
```

启用后 `pro status`：`esm-apps` 与 `esm-infra` 均 `enabled`，`landscape` 仍 `disabled`。

## 服务职责与取舍

| 服务 | 覆盖范围 | 本机决定 |
|---|---|---|
| `esm-apps` | Universe 等应用类包的扩展安全更新；本次 libwebsockets 修复在这里 | 启用 |
| `esm-infra` | Main 等基础系统与基础设施包 | 启用（用户确认「有净收益」后） |
| `landscape` | 集中管理多台 Ubuntu 机器的管理端代理 | 保持关闭（单机无收益，且会向管理端上报机器与包信息） |

ESM 版本用 `+esmN` 后缀标识，例如 `4.3.5-3ubuntu1.2+esm1`、`7:8.0.1-3ubuntu2+esm5`、`25.1.1+dfsg-1ubuntu2+esm3`。它不表示「普通源将来也会发布」，Ubuntu 公告只列 ESM 版本时，普通源可能长期停在旧版本。

## 一次 ESM 批量升级的实测样本

启用 `esm-apps` 后执行 `sudo apt update; sudo apt upgrade`，apt 提示：

```text
25 packages can be upgraded. Run 'apt list --upgradable' to see them.
Summary:
  Upgrading: 25, Installing: 0, Removing: 0, Not Upgrading: 0
25 esm-apps security updates
  Download size: 33.3 MB
  Space needed: 712 kB / 861 GB available
```

这次批量升级共 25 个安全更新，下载体积 33.3 MB，需求额外空间 712 kB，可用空间 861 GB。

升级对象含 `ffmpeg`（`7:8.0.1-3ubuntu2+esm5`）、`imagemagick`（`8:7.1.2.18+dfsg1-1ubuntu0.1~esm4`）、`tesseract-ocr`（`5.5.0-1ubuntu0.1~esm1`）、`git-lfs`（`3.7.1-1ubuntu0.26.04.1~esm1`）、`python3-pip`（`25.1.1+dfsg-1ubuntu2+esm3`）、`libde265-0`（`1.0.16-1ubuntu0.1~esm2`）等，全部来自 `https://esm.ubuntu.com/apps/ubuntu`。命令收尾为 `Processing triggers for libc-bin` / `man-db` / `desktop-file-utils`，无 dpkg 或依赖错误，未引入新包或删除。

## 会话内一处纠正（必须记录）

上一轮我在回复里声称「`esm-infra` 已启用」。随后读 `pro status` 实测发现它是 `disabled`，即该陈述不成立。本轮执行 `sudo pro enable esm-infra` 后核实为 `enabled`。记录此事的原因是：**状态类结论必须以命令输出为准，不能凭上一轮自己的说法延续。**

## 边界与未执行项

- 未验证 Ubuntu 普通源未来是否也会发布该修复；公告只列 ESM 版本。
- 未验证 xtradeb 后续版本是否修复崩溃，pin 的 `-1` 目前无条件排除该来源的这两个包。
- 未做 ttyd 浏览器页面验收。
- 未 commit、未 push。
