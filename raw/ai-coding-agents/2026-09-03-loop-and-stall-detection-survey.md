# 循环与停滞检测调查：竞品证据

> Source: OMP、OpenCode、Prime Agent、DSH、jcode、OpenClaude、Hermes Agent、OpenAI、Anthropic、Google、DeepSeek 的官方仓库、PR、issue 与 API 文档
> Collected: 2026-09-03
> Published: Unknown

---

## A. 已有 harness 的客户端循环检测

### OMP（`can1357/oh-my-pi`）

两种客户端机制。`[SCOUT]`

- `thinking-loop.ts`：滚动 4096 字符尾窗，word-trigram Jaccard 近重复检测。`https://github.com/can1357/oh-my-pi/blob/main/packages/ai/src/utils/thinking-loop.ts`
- `tool-call-loop-guard.ts`：工具调用序列的同类防护。`https://github.com/can1357/oh-my-pi/blob/main/packages/ai/src/utils/tool-call-loop-guard.ts`

均为纯客户端；不使用服务端信号。防护通过比较 agent 自己的输出来检测重复，而非从推理后端接收诊断。

### OpenCode

PR #15852 已合并循环/重复检测。`[SCOUT]` `https://github.com/anomalyco/opencode/pull/15852`

纯客户端。

### Prime Agent

Issue #1029，标题「No safeguard against degenerate model repetition」。正文明确说明 harness 没有任何层防止这类失效。`[SCOUT]` `https://github.com/PrimeIntellect-ai/prime-agent/issues/1029`

### DSH（`deepseek-ai/deepseek-harness`）

Premature Victory detector 存在于未合并的 RFC 中，使用关键字匹配而非模型分类。`[SCOUT]`

在被调查的代码库中，未发现已合并的、可客户端使用的 Grok Build LazinessDetector 或 doom-loop 等价物。

### jcode

Watchdog 为进程级心跳监控，不是输出退化检测。`[SCOUT]`

### OpenClaude

仅 stream 超时；无结构性循环或停滞检测。`[SCOUT]`

---

## B. Hermes Agent（六 agent 对比集之外）

PR #95985 处理伪造的 tool-use 声明：agent 声称调用了工具但 transcript 中没有该调用。`[SCOUT]`

这与 LazinessDetector 的 `stalled_false_completion` 类别概念上相邻，但 Hermes 实现针对的是不同的失效模式（捏造调用 vs 缺席调用），且不在六 agent 对比范围内。

---

## C. 模型厂商流式 API：中途循环诊断的缺失

以下模型厂商的流式响应格式未定义任何在流结束前（`finish_reason` 之前）信号输出循环或重复退化的事件、字段或 header。`[DOC]`

- OpenAI Streaming Responses: `https://developers.openai.com/api/docs/guides/streaming-responses`
- Anthropic Streaming Messages: `https://platform.claude.com/docs/en/build-with-claude/streaming`
- Google Gemini Streaming: `https://ai.google.dev/gemini-api/docs/text-generation?lang=rest#streaming`
- DeepSeek Chat（OpenAI 兼容流式）: `https://api-docs.deepseek.com/api/create-chat-completion`（未记录非标准循环事件）

**验证深度说明。** 上述链接在收集日期已验证可达。否定性声称「不存在此类事件」基于公开 schema 中的缺失。厂商可能发布未在公开文档中列出的 undocumented 或 beta 字段；本调查不声称已穷尽所有 undocumented 端点。

---

## D. ACP 支持

Grok Build 支持 ACP（Agent Client Protocol），含 stdio、WebSocket serve、relay 模式，及 `x.ai/*` 扩展方法。`[DOC]` `https://docs.x.ai/build/features/agent-client-protocol`

六竞品中：
- OMP：支持 ACP `[SCOUT]`
- OpenCode：支持 ACP `[SCOUT]`
- DSH：支持 ACP `[SCOUT]`
- Prime Agent：支持 ACP `[SCOUT]`
- jcode：未调查 ACP
- OpenClaude：该组中唯一不支持 ACP `[SCOUT]`

---

## E. jcode 跨 harness 能力

恢复与凭据导入范围。`[SCOUT]`

- 支持恢复 Codex、Claude Code、OpenCode、pi 的会话。
- 可检测并经用户同意后读取上述四个 host 及 Gemini、Copilot 的本地凭据（共 6 个 host）。
- 只读不改不动原 host 文件；路径仅使用 symlink。
- 拒绝从 symlink 化的凭据路径读取（`.../onboarding_flow.rs`）。

Grok Build 没有等价的跨 harness 恢复。`xai-grok-foreign-sessions` 仅返回元数据（标题、cwd、分支、时间戳）。但 Grok Build 的 `claude_import.rs` 导入 Claude *设置*——权限规则、MCP server、hooks、环境变量、`extra_skill_dirs`——这是 jcode 没有的。

---

## F. 覆盖缺口

- OMP `thinking-loop.ts` 与 `tool-call-loop-guard.ts` 由子代理描述；未由本人阅读。
- OpenCode PR #15852 由子代理报告为已合并；未由本人审阅。
- Prime issue #1029 由子代理识别；未由本人阅读。
- DSH Premature Victory RFC 由子代理识别；未由本人审阅。
- Hermes PR #95985 由子代理识别；未由本人审阅。
- 模型厂商文档未做程序式解析；否定性声称来自阅读所列页面。
