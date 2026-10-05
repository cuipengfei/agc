# justwoker-shim 工具仿真层实现

> Source: 本会话实测（2026-10-05）
> Collected: 2026-10-05
> Published: Unknown

## 设计

justwoker 的运行时替换客户端 tools 数组和 system 提示。OMP 的 60 个工具无法到达模型。解决方案借鉴 `abdurrehmandaudi/justdowork-proxy` 的文本协议：

1. 请求侧：把工具定义翻译成文字说明（教模型写 `<tool_call name="X">{json}</tool_call>`），注入第一条 user 消息（不是最新一条——最新一条每轮都变，破坏缓存；第一条稳定，缓存命中）。OMP 的 system 提示也并入同一条注入文本。
2. 响应侧：解析模型回复里的 `<tool_call>` 文本块，转换成真正的 tool_use 块，stop_reason 改为 tool_use。
3. 工具结果回传：OMP 的 tool_result 块转换成 `<tool_result>` 文本，下轮回发给模型。

## 路由

- 断路器 CLOSED：先试流式透传（上游修好自动恢复）。
- 断路器 OPEN：带工具的请求走仿真路径（非流式 + 文本协议），无工具的走普通回退。
- `read`/`write` 两个工具名原生透传（实测有效），其余全部走文本协议。

## 实测通过的工具

- grep：搜索到真实结果（0 matches 是正确结果——搜索词不在目标文件里）
- bash：拿到真实 stdout
- read：读到文件前 5 行
- write：写入文件并验证
- web_search：MCP 工具走仿真协议，返回真实搜索结果

## 已知限制

- 非流式回退时 TUI 不平滑（等全文一次性出），ping 保活防超时（OMP 空闲超时 300 秒，shim 每 10 秒发 ping）。
- 每个冷却周期开头浪费 2 次计费空流（探针检测上游是否修好）。
- Clash TUN MITM 导致间歇性 403/cert error，间隔几秒恢复。
- justwoker 渠道偶尔临时摘掉（model_not_found）。
- 流式恢复后工具仍断（流式路径不做文本协议转换），这是已知缺口。
