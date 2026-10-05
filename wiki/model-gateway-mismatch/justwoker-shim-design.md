# justwoker-shim 设计

> Sources: 本会话实测与实现, 2026-10-04 至 2026-10-05
> Raw: [流式空响应诊断与断路器 shim 设计](../../raw/model-gateway-mismatch/2026-10-05-justwoker-empty-stream-and-breaker-shim.md); [运行时替换 tools 与 system 的实测](../../raw/model-gateway-mismatch/2026-10-05-justwoker-tools-and-system-replacement.md); [shim 工具仿真层实现](../../raw/model-gateway-mismatch/2026-10-05-shim-tool-emulation-implementation.md); [第二轮修复](../../raw/model-gateway-mismatch/2026-10-05-justwoker-shim-final-fixes.md)
> Updated: 2026-10-05

## Overview

justwoker-shim 是本地 Bun 代理（127.0.0.1:4151），解决 justwoker relay 的三个问题：流式丢内容块、tools 数组被替换、system 提示不到达模型。设计目标：OMP 的工具全部可用，上游修好流式后自动恢复平滑输出。

## 断路器状态机

三态：CLOSED（流式透传）→ OPEN（非流式回退）→ 半开（冷却结束试流式）。

- CLOSED：空流计数，窗口内达到阈值（默认 2 次 / 10 分钟）打开断路器。流式确认有内容时清零失败计数和断路器状态。
- OPEN：冷却 30 分钟。
- 半开：冷却结束后第一个请求试流式，有内容回 CLOSED，仍空重新冷却。

每个冷却周期开头浪费 2 次计费空流（探针代价），这是设计选择。

## 路由（第二轮修复后）

```
带工具请求 → emulateResponse（无论断路器 CLOSED 还是 OPEN）
无工具请求 → proxyStream（透传 + 喂断路器）或 fallbackResponse（断路器 OPEN 时）
```

断路器只被无工具流式请求喂养。带工具请求永远走 emulation（非流式 + 文本协议），不依赖上游流式是否修好。这是采纳 advisor 意见后的设计：避免了在 proxyStream 里造流式 `<tool_call>` 解析器（死代码），也避免了断路器在工具路径上被废掉（饥饿）。

## SSE 合成

非流式回退时，shim 拿到完整 JSON 响应后在本地合成标准 Anthropic SSE 序列：message_start（带 usage）→ content_block_start/delta/stop（thinking/text/tool_use 三类块）→ message_delta（stop_reason + output_tokens）→ message_stop。等待上游期间每 10 秒发 ping（OMP 的空闲超时 300 秒，ping 重置计时）。

## 文本协议工具仿真

justwoker 的运行时替换客户端 tools 数组。shim 的应对：

1. 请求侧：把 OMP 的工具定义翻译成文字说明（教模型写 `<tool_call name="X">{json}</tool_call>`），注入第一条 user 消息（不是最新一条——最新一条每轮都变，破坏缓存）。OMP 的 system 提示也并入同一条注入文本。**工具描述不截断**（完整注入，模型能看到全部用法说明）。
2. 响应侧：解析模型回复里的 `<tool_call>` 文本块，转换成真正的 tool_use 块，stop_reason 改为 tool_use。**非法 JSON 时原文回退为文本**（模型可见，不静默丢弃）。
3. 工具结果回传：OMP 的 tool_result 块转换成 `<tool_result>` 文本，下轮回发给模型。**结果超过 50K 字符时截断保护**。
4. `read`/`write` 两个名字原生透传（实测有效），其余全部走文本协议。OMP 的工具名带 `_` 前缀（如 `_grep`），shim 做双向映射（模型写 `grep` 或 `_grep` 都认，统一转成 `_grep`）。

## 已知缺口

- 非流式回退时 TUI 不平滑（等全文一次性出）。
- Clash TUN MITM 导致间歇性 403/cert error。

## See Also

- [JustWoker `/v1/messages` 实测行为](justwoker-v1-messages-observed-behavior.md) — 上游 relay 的完整行为记录。
