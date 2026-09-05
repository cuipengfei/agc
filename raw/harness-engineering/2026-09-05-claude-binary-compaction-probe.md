# claude 二进制中的压缩阈值与 `[1m]` 处理证据

> Source: 本会话对本机已安装 claude 二进制的字符串扫描与运行实测
> Collected: 2026-09-05
> Published: Unknown

## 取证边界

- 扫描对象：`~/.bun/install/global/node_modules/@anthropic-ai/claude-code-linux-x64/claude`
- 方法：整文件读入后按字节正则匹配，打印命中处的可打印字符邻域。offset 为字节偏移，仅对本机这一份二进制有效。
- 运行实测部分只使用本机 `http://localhost:4140` 网关。

## 环境变量名命中次数

| 变量名 | 命中次数 |
|---|---:|
| `CLAUDE_CODE_MAX_CONTEXT_TOKENS` | 9 |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | 6 |
| `CLAUDE_CODE_CONTEXT_LIMIT` | 0 |

## 压缩阈值计算代码

offset 183821621 附近的可打印片段：

```js
function wvn(e,t){let r=e.entries.find((o)=>o.windowSize===t);if(r!==void 0)return{kind:"exact",entry:r};return e.defaultEntry===null?null:{kind:"default",entry:e.defaultEntry}}
function ZPe(e,t){let r=e-13000,o=t.testPctOverride;if(o!==void 0&&!isNaN(o)&&o>0&&o<=100)return Math.min(Math.floor(e*(o/100)),r);return r}
function nst(e,t){return Math.min(e-Math.round(e*t.precomputeBufferFraction),ZPe(e,t))}
function rst(e,t,r,o=t,d){let f=d??ZPe(t,r),y=r.enabled?f:t,E=y-20000,v=r.testBlockingOverride,x=v!==void 0&&!isNaN(v)&&
```

offset 95746624 附近出现的相邻标识符：

```
windowSize  defaultEntry  testPctOverride  precomputeBufferFraction  testBlockingOverride  replacesDefault  DISABLE_AUTO_COMPACT  CLAUDE_CODE_AUTO_COMPACT_WI
```

## Beta 标识列表

offset 97728376 附近的可打印片段（beta 标识串）：

```
interleaved-thinking-2025-05-14   context-1m-2025-08-07   context-management-2025-06-27
structured-outputs-2025-12-15   web-search-2025-03-05   advanced-tool-use-2025-11-20
tool-search-tool-2025-10-19   effort-2025-11-24
```

## 状态栏字符串

offset 91724358 附近的可打印片段：

```
% context used     % until auto-compact     Context low (...% remaining)
Context low (...% remaining) . Run /compact to compact & continue
pctLeft   effectiveWindow   DISABLE_COMPACT
```

## `[1m]` 后缀的线路行为实测

同一份环境变量（`ANTHROPIC_BASE_URL=http://localhost:4140`、`ANTHROPIC_AUTH_TOKEN=dummy`、`ANTHROPIC_MODEL=gpt-5.4-mini[1m]`、`ANTHROPIC_DEFAULT_HAIKU_MODEL=gpt-5.4-mini[1m]`）下运行 `claude -p "reply with the single word ok"`：

- 输出尾部包含遥测行片段：`code:unrecognized_model] {"model":"gpt-5.4-mini[1m]","query_source":"sdk"}`
- 同一次运行的可见回答包含 `ok`

对照：直接向同一网关 `POST /v1/messages` 发送 `"model":"gpt-5.4-mini[1m]"` 返回 HTTP 502 `{"error":"no instance serves model: gpt-5.4-mini[1m]"}`，发送 `"model":"gpt-5.4-mini"` 返回 HTTP 200（记录见 `2026-09-05-copilot-gateway-catalog-fields.md`）。

本文件不记录 Claude Code 内部改写请求的具体位置，只记录上述两个可观测结果。
