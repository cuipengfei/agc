# justwoker-shim 第二轮修复：断路器饥饿、死代码、工具描述截断

> Source: 本会话实测（2026-10-05）
> Collected: 2026-10-05
> Published: Unknown

## 修复动机

第一轮实现留下五个问题，按严重度排序：

1. **模型写坏 JSON 时工具调用凭空消失**：`JSON.parse` 失败时 `continue` 跳过块，模型与 OMP 之间的调用无声消失。
2. **断路器饥饿**：CLOSED 态带工具请求走 proxyStream 透传，但透传路径不喂断路器（`sawContent` 只在非仿真路径触发）。上游空流不会被记录，断路器在工具路径上被废掉。
3. **流式转换死代码**：proxyStream 里加了 130+ 行流式 `<tool_call>` 解析器，但 CLOSED 态模型通常不写 `<tool_call>`（上游流式坏时模型回退到普通文本），这段代码几乎不触发。
4. **工具描述截断 800 字符**：`.slice(0, DESC_LIMIT)` 切断用法说明，模型可能漏掉关键约束。
5. **正则只认双引号**：`<tool_call\s+name="([^"]+)"` 不认单引号；工具结果不截断，超大结果塞爆上下文。

## 采纳 advisor 意见

- **advisor 第 1 条（饥饿）成立**：带工具请求不喂断路器，上游空流不会触发 fallback。修法：带工具请求**无条件走 emulation**（不依赖流式转换），断路器只被非工具请求喂养。
- **advisor 第 2 条（死代码）成立**：CLOSED 态注入后模型通常不写 `<tool_call>`，流式转换器是死代码。修法：删 proxyStream 里的流式转换，恢复纯透传。

## 采纳后的路由

```
带工具请求 → emulateResponse（无论断路器 CLOSED 还是 OPEN）
无工具请求 → proxyStream（透传 + 喂断路器）或 fallbackResponse（断路器 OPEN 时）
```

断路器只被无工具流式请求触发空流时喂养。带工具请求永远走 emulation（非流式 + 文本协议），不依赖上游流式是否修好。

## 五项修复实现

### 1. 非法 JSON 回退为文本

`parseEmulatedResponse` 的 `catch` 从 `continue` 改为 push 原文：

```typescript
} catch {
  console.error(`[jw-shim] BAD JSON in tool_call ${m[1]}: ${m[2].slice(0, 200)}`);
  const pre = text.slice(pos, m.index);
  if (pre.trim() !== "") out.push({ type: "text", text: pre });
  out.push({ type: "text", text: m[0] });  // 保留原文，模型可见
  pos = m.index + m[0].length;
  continue;
}
```

### 2. 断路器饥饿修复

路由改为：

```typescript
if (hasEmulated) return emulateResponse(req, body);  // 带工具无条件走 emulation
if (Date.now() < openUntil && body.stream === true) return fallbackResponse(req, body);
// 否则 proxyStream 透传 + 喂断路器
```

### 3. 流式转换死代码删除

proxyStream 从 130+ 行流式 `<tool_call>` 解析器恢复为纯透传（19.36 KB，之前 25.27 KB）。`emulatedNames` 参数已删。

### 4. 工具描述不截断

`buildExtraPrompt` 从 `.slice(0, DESC_LIMIT)` 改为完整描述：

```typescript
lines.push(`### ${t.name}\n${t.description ?? ""}\nInput schema: ${schema}\n`);
```

### 5. 正则认单双引号 + 结果截断

- `CALL_RE` 从 `"([^"]+)"` 改为 `["']([^"']+)["']`
- `flattenResult` 加 50K 截断保护

## 悬垂参数清理

advisor nit：`emulatedNames` 参数已删（proxyStream 恢复纯透传后无人传入），注释从「stream-level tool_use reconstruction when request carried emulated tools」改为「forward verbatim, scan for content markers to feed the breaker」。

## e2e 验证

- CLOSED 带工具 → `emulateResponse` → 注入协议 → 模型写 `<tool_call>` → 解析为真 `tool_use` 块 ✅
- OPEN 带工具 → `fallbackResponse` → 非流式注入+解析 → 真 `tool_use` 块 ✅
- 非工具流式 → `proxyStream` 透传 + 喂断路器（空流记录 1/2、2/2、OPEN）✅
- 编译通过（19.36 KB）✅
- 完整长描述注入后模型明确说「through the text protocol」并遵协议写 `<tool_call>` ✅
