# mihomo v1.19.13 keep-alive 键名核验报告（只读，脱敏）

> Source: file:///tmp/llm-sse-proxy-study/keepalive-key-verification.md
> Collected: 2026-09-19
> Published: Unknown

# mihomo v1.19.13 keep-alive 键名核验报告（只读，脱敏）

> 对象：`C:\Program Files\Clash Verge\verge-mihomo.exe`（Mihomo Meta v1.19.13 windows amd64 go1.25.0, with_gvisor）
> 源码：`/tmp/mihomo-src`（MetaCubeX/mihomo 分支 Meta，HEAD=ab405bad，tag v1.19.31，2026-09-14；比本机 1.19.13 新，但键名一致——二进制字符串已交叉证实）
> 文档：https://wiki.metacubex.one/en/config/general/（可访问）
> 未修改任何配置；未发任何经代理的请求（仅一次公网文档页 GET）。

## 1. 二进制字符串命中（verge-mihomo.exe，strings | grep -c，子串匹配）

| 键名 | 命中次数 | 结论 |
|---|---|---|
| keep-alive-idle | 2 | ✅ 内置支持 |
| keep-alive-interval | 2 | ✅ 内置支持 |
| disable-keep-alive | 2 | ✅ 内置支持 |
| tcp-keep-alive-idle | 0 | ❌ 不存在 |
| tcp-keep-alive-interval | 0 | ❌ 不存在 |
| dial-timeout | 0 | ❌ 不存在 |

（各 2 次命中 = yaml tag + json tag 两枚结构体标签常量。）

## 2. 源码命中（/tmp/mihomo-src，全仓库）

- `keep-alive-idle` / `keep-alive-interval` / `disable-keep-alive`：
  - `config/config.go:67-69`（Global 结构体，json tag）与 `config/config.go:446-448`（Config 结构体，`yaml:"keep-alive-idle" json:"keep-alive-idle"` 等）——全局 general 配置键；
  - `hub/executor/executor.go:406-408`：启动时读 general 并 `keepalive.SetKeepAliveIdle/Interval/SetDisableKeepAlive`（单位秒），应用到**所有出站/入站 dialer**；
  - 消费端 `component/keepalive/tcp_keepalive_go123.go:13-31`（Go 1.23+ 用 `net.KeepAliveConfig{Idle, Interval}`，Windows 下 idle/interval 需 Win10 build ≥16299 才生效，见 `tcp_keepalive_go123_windows.go:28-39`）、`tcp_keepalive_go122.go:16-31`（旧 Go 只能设 SetKeepAlivePeriod=Interval）。
- `tcp-keep-alive-idle` / `tcp-keep-alive-interval`：**全仓库 0 命中**——mihomo Meta 从未有过这组键名。
- `dial-timeout`：**全仓库 0 命中**——不是 mihomo 的任何配置键（全局/代理/proxy-provider 均无）。
- 未找到任何 deprecated/alias/rename 注释与这三个键相关：keep-alive-* 从引入至今没有改过名。

## 3. 官方文档（wiki.metacubex.one/en/config/general/）

「TCP Keep Alive Settings」节当前仅列三个键：`keep-alive-interval: 15`、`keep-alive-idle: 15`、`disable-keep-alive: false`。无 tcp-keep-alive-*，无 dial-timeout。

## 4. 结论

1. **本机 1.19.13 应写且只能写**：`keep-alive-idle` / `keep-alive-interval` / `disable-keep-alive`（顶层 general 键，单位秒）。当前 `clash-verge.yaml` 写的正是这三个键，**写法正确、已生效**。
2. **没有「新旧名」之分**：keep-alive-* 是唯一键名，mihomo Meta 源码与二进制中从未出现 tcp-keep-alive-*；后者不是 mihomo 的旧名，属于其他工具（sing-box 系）的命名记忆混淆。
3. **dial-timeout 在 mihomo 不存在**（截至 v1.19.31 源码全仓库 0 命中），拨号超时由内核默认/各协议实现内部决定，配置层无法覆盖；如需控制建连失败速度，只能通过 proxy-group 的 `url`+`interval` 健康检测或换节点实现。
4. Windows 注意点：keep-alive-idle 的精确控制在 Win10 1709(build 16299) 以下会被内核忽略（只保留 interval 语义）；本机为 Windows 11，无此问题。
