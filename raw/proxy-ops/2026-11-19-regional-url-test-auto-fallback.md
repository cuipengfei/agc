# 地区自动选线与测速判定实测：Clash Verge Rev 2.5.10 + mihomo v1.19.33

> Source: 本机 Windows 宿主 Clash Verge Rev 2.5.10 + mihomo v1.19.33 配置实测与 MetaCubeX/mihomo v1.19.33 源码核对，2026-11-19 会话
> Collected: 2026-11-19
> Published: 2026-11-19

## 背景与目标

用户本机正常流量走香港节点、个别域名走美国节点，节点不稳定时希望同地区自动切换，选择依据为最近测速。要求：只新增组、不改任何现有组定义与名字；香港自动组在 GUI 中手动选择；七个指定域名（antigravity.google 后缀与 accounts.google.com、oauth2.googleapis.com、www.googleapis.com、daily-cloudcode-pa.googleapis.com、cloudcode-pa.googleapis.com、aicode.googleapis.com）的规则目标改为美国自动组；测速周期 180 秒。

## 运行环境（实测核对）

- 正在运行的程序：`Get-CimInstance Win32_Process` 显示 clash-verge 与 verge-mihomo 的 ExecutablePath 在 `D:\Program Files\Clash Verge\`；`clash-verge.exe` 版本 2.5.10，`verge-mihomo.exe -v` 为 mihomo Meta v1.19.33 go1.25.x。C 盘 `C:\Program Files\Clash Verge\` 下另有一份 2.4.1/v1.19.13 的安装，非当前运行版本；取证时先按 C 盘误判了版本，后经进程路径更正。
- 配置目录：`%APPDATA%\io.github.clash-verge-rev.clash-verge-rev\`；`profiles.yaml` 的 `current` 指向订阅条目，其 `option.script` 与 `option.rules` 是扩展脚本与规则增强文件的 UID。
- controller：`clash-verge.yaml` 的 `external-controller`（本机 127.0.0.1:9097），请求需带 `Authorization: Bearer <secret>`，secret 在同一文件。
- TUN：`tun.enable` 为 true，`stack` 为 gvisor。选线逻辑与 TUN 无关，代理组行为在 TUN 与系统代理下一致。

## 实施的配置（已生效）

扩展脚本 `profiles/sp3Cp6NUswJp.js`：

```js
function main(config) {
  var groups = config["proxy-groups"];
  var mainGroup = groups.find(function (group) {
    return group.name === "红魔馆网络";
  });
  if (!mainGroup || mainGroup.type !== "select" || !Array.isArray(mainGroup.proxies)) {
    throw new Error("红魔馆网络 select group is missing or invalid");
  }

  var names = groups.concat(config.proxies || []).map(function (item) {
    return item.name;
  });
  if (names.includes("香港自动") || names.includes("美国自动")) {
    throw new Error("automatic group name already exists");
  }

  function auto(name, filter, url) {
    return {
      name: name,
      type: "url-test",
      "include-all-proxies": true,
      filter: filter,
      url: url,
      interval: 180,
      timeout: 5000,
      tolerance: 0,
      "max-failed-times": 3,
      lazy: false,
    };
  }

  groups.push(auto("香港自动", "香港", "https://github.com/"));
  groups.push(auto("美国自动", "美国", "https://daily-cloudcode-pa.googleapis.com/"));
  mainGroup.proxies.push("香港自动", "美国自动");
  return config;
}
```

规则增强文件 `profiles/rSaJ1SEfKznp.yaml` 的 `prepend`：首条保留 `DOMAIN,vscode.download.prss.microsoft.com,红魔馆网络`，其余七条目标由 `美国01-海外中转-0.6倍率` 改为 `美国自动`。

加载方式：合并生成配置后 `PUT /configs`（body `{"payload": "<完整配置 JSON>"}`），运行内核热加载；controller 验证 `/proxies` 显示香港自动（URLTest，17 候选）与美国自动（URLTest，6 候选）已存在，`/rules` 七条目标为美国自动，主组 `红魔馆网络` 的 `now` 保留用户选择，TUN 仍启用。用户随后在 GUI 中选择香港自动；再查 `红魔馆网络` now 为香港自动，香港自动 now 为香港07-晚高峰分流-海外中转，fixed 为空。

## mihomo v1.19.33 源码行为核对

- `urltest.go` 的 `fast(touch)`：选点取每个节点最近一次测速延迟；有历史但最后一条失败的按最大延迟处理（等于排除）；`tolerance` 毫秒内不换；选点结果缓存约 10 秒。
- `groupbase.go` 的失败处理：组内建连失败连续累计到 `max-failed-times`（3 次，且都在一个 5 秒窗口内）触发整组健康检查；收到 connection refused 即触发。建连成功会重置失败计数。
- `healthcheck.go`：定时任务按组 `interval` 周期跑；测速为对该组 `url` 的 HEAD 请求，`timeout` 毫秒内拿到 HTTP 响应即记延迟并判存活；默认不限制响应状态码，403/404 也算存活。
- `urltest.go` 的 `Set`：URLTest 组若存在被固定的节点（fixed），`fast` 只在固定节点与可用性之间仲裁；未被固定时按延迟自动选。手动在 GUI 里点 URLTest 组内节点会形成固定（显示📌），点延迟测试可解除。
- 全部候选都失败时：URLTest 退回使用组内第一个成员尝试，连接可能失败。
- 切换只影响新建连接；已建立连接继续用原节点直至结束或中断。定时测速周期内不清选点缓存。

## 测速地址与节点好坏：双地址实测（2026-11-19，每节点每地址测一次，5 秒超时）

17 个名称含"香港"的节点，分别请求 `https://github.com/` 与 `https://www.gstatic.com/generate_204`：

| 节点 | GitHub ms | gstatic ms |
|---|---|---|
| 香港01-海外中转 | 203 | 158 |
| 香港01|广港专线 | fail | 819 |
| 香港02-海外中转 | 192 | 507 |
| 香港02|广港专线 | fail | fail |
| 香港03-海外中转-油管免广 | 215 | 177 |
| 香港03|广港专线|油管免广 | 253 | 206 |
| 香港04|广港专线|油管免广 | 227 | 523 |
| 香港05-海外中转|油管免广 | 308 | 148 |
| 香港05|广港专线|油管免广 | fail | fail |
| 香港06|广港专线|家宽 | 530 | 192 |
| 香港07-晚高峰分流-海外中转 | 184 | 136 |
| 香港07|广港专线|家宽 | fail | 184 |
| 香港08|广港专线|家宽|油管免广 | fail | fail |
| 香港09|广港专线|家宽 | fail | fail |
| 香港1|CF优选|电信联通推荐 | fail | fail |
| 香港2|CF优选|电信联通推荐 | fail | fail |
| 香港测试节点|0.1倍率 | 293 | 534 |

统计：两个地址都通 9 个；仅 gstatic 通 2 个（香港01|广港专线、香港07|广港专线|家宽，后者 gstatic 184 毫秒）；两个地址都不通 6 个。（初版统计把双通误数为 8 个，经用户指正为 9 个，9+2+6=17。）

结论：测速判定的是"该节点到该地址的可达与延迟"，不是"节点整体好坏"。存在换一个测速地址就改变候选集的节点；失败原因（GitHub 拒绝该出口 IP、节点到 GitHub 路由差、当时不稳定）无法从测速结果分辨。gstatic 也非对每个节点都更优（香港02-海外中转 GitHub 192、gstatic 507）。用户场景需要 GitHub，用 GitHub 做测速地址使被其拒的节点出局是合理的。
选测速地址的依据应该是「这个地址能不能代表我实际要用的服务」。

## GUI 行为（v2.5.10 源码 + 实测）

- 前台大约每 15 秒向 controller 拉一次代理视图（`refetchInterval: 15000`，`refetchIntervalInBackground: false`），组头与组内当前选中节点随之刷新。
- URLTest 组成员被固定时显示📌，悬停文案为"进行延迟测试，以取消固定"；点组内延迟测试按钮即解除固定。
- 不需要手点测速按钮：组加载即开始测，之后每 interval 周期自动测；手点只是额外立即测一轮。
- 主组（select 类型）选择香港自动后，七条规则之外的默认流量与引用主组的服务组跟随该选择；选择持久保存在 cache 中，订阅更新后仍保留。

## 会话中的更正记录

- 版本误判：先按 C 盘安装误判运行版本为 2.4.1/v1.19.13，经进程路径更正为 D 盘 2.5.10/v1.19.33。
- 统计误数：双通节点由 8 更正为 9。
- 更早一轮（本次会话）曾声称"每轮健康检查结束会清掉选点缓存"，源码核对后更正：定时测速不清缓存，选点结果另有约 10 秒缓存；"机场对 GitHub 特殊处理"的说法无证据，实测显示的是节点与地址的组合差异。
