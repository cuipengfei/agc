# Google Antigravity 第三方客户端禁令与社区网关 API 规范摘录

> Source: https://antigravity.google/docs/faq/ ; https://github.com/google-gemini/gemini-cli/discussions/20632 ; https://github.com/NoeFabris/opencode-antigravity-auth （`docs/ANTIGRAVITY_API_SPEC.md`）; https://github.com/router-for-me/CLIProxyAPIBusiness/blob/main/internal/quota/poller.go
> Collected: 2026-11-14
> Published: Unknown

验证级别：`[DOC]` = Google 官方 FAQ 或 Google 仓库维护者公告；`[CODE]` = 开源仓库文档或源码逐字摘录；`[UNVERIFIED]` = 本次会话未发起真实网络调用。

维护者的账号标识以 `<USER>` 代替，原始来源链接保留。

## 1. Google 官方 FAQ 关于第三方工具与 Headless 模式的条款说明（`https://antigravity.google/docs/faq/`，`[DOC]`）

```markdown
## Why can’t I use third-party software (such as Claude Code, OpenClaw, or OpenCode) with my Antigravity login?

Using third-party software, tools, or services to access Antigravity is a violation of our Terms of Service (/terms) and severely degrades the experience for legitimate product users. Such actions can result in suspension or termination of your account. To use a third-party coding agent with Gemini, we recommend using a Gemini Enterprise or Google AI Studio API key.

## Can I use Antigravity CLI headless mode in third-party coding agents or automate account switching?

Antigravity CLI headless mode (`agy -p`) is intended for direct scripting and CI workflows. Wrapping `agy` inside third-party coding agents or applications, or automating account rotation, is not supported under consumer plans.
```

## 2. `google-gemini/gemini-cli` Discussion `#20632` 维护者公告（2026-02-27，`[DOC]`）

Gemini CLI 维护者于 2026-02-27 在 `https://github.com/google-gemini/gemini-cli/discussions/20632` 发布的公告原文摘录：

```markdown
# Addressing Antigravity Bans & Reinstating Access #20632
<USER> announced in Announcements · Feb 27, 2026

Over the past week, we saw reports from Gemini CLI users experiencing account disruptions. These were the result of a series of **Antigravity bans** rolled out to address violations of the Antigravity Terms of Service (https://antigravity.google/terms) (ToS), specifically the use of 3rd party tools or proxies to access Antigravity resources and quotas. Because of the backend layer where abuse prevention occurs, bans for Antigravity usage also blocked access to **Gemini CLI** and **Gemini Code Assist**. We acknowledge the disruption this caused and are taking steps to restore access.

**⏪ Bans have been reset**
In coordination with Antigravity we are conducting a **system-wide automated unban** for accounts recently flagged for breaking ToS.
```

## 3. `NoeFabris/opencode-antigravity-auth`：`docs/ANTIGRAVITY_API_SPEC.md` 摘录（`[CODE]`）

来源仓库 `NoeFabris/opencode-antigravity-auth` 文件 `docs/ANTIGRAVITY_API_SPEC.md`（Version `2.0`，Last Updated `October 21, 2026`）：

```markdown
# Antigravity Unified Gateway API Specification

**Version:** 2.0
**Last Updated:** October 21, 2026
**Status:** Current Hub protocol reference; live account access requires verification

## Overview

Antigravity is Google's **Unified Gateway API** for accessing multiple AI models (Claude, Gemini, GPT-OSS) through a single, consistent Gemini-style interface. It is NOT the same as Vertex AI's direct model APIs.

### Key Characteristics

- **Single API format** for all models (Gemini-style)
- **Project-based access** via Google Cloud authentication
- **Internal routing** to model backends (Vertex AI for Claude, Gemini API for Gemini)
- **Unified response format** (`candidates[]` structure for all models)

## Endpoints

| Environment | URL | Status |
|-------------|-----|--------|
| **Antigravity Hub** | `https://daily-cloudcode-pa.googleapis.com` | Consumer Antigravity requests |
| **Gemini CLI** | `https://cloudcode-pa.googleapis.com` | Separate Gemini CLI quota |

Antigravity consumer requests stay on the non-sandbox daily host. Do not retry
them against Gemini CLI's production host: its entitlements and quota responses
can differ. See the current protocol and migration notes (OPENCODE-V2.md).

### API Actions

| Action | Path | Description |
|--------|------|-------------|
| Generate Content | `/v1internal:generateContent` | Non-streaming request |
| Stream Generate | `/v1internal:streamGenerateContent?alt=sse` | Streaming (SSE) request |
| Load Code Assist | `/v1internal:loadCodeAssist` | Project discovery |
| Onboard User | `/v1internal:onboardUser` | User onboarding |
| Available Models | `/v1internal:fetchAvailableModels` | Account-specific model inventory and quota |

## Authentication

### OAuth 2.0 Setup

Authorization URL: https://accounts.google.com/o/oauth2/v2/auth
Token URL: https://oauth2.googleapis.com/token

### Required Scopes

https://www.googleapis.com/auth/cloud-platform
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
https://www.googleapis.com/auth/cclog
https://www.googleapis.com/auth/experimentsandconfigs

### Required Headers

Authorization: Bearer {access_token}
Content-Type: application/json
User-Agent: antigravity/hub/2.24.0 (aidev_client; os_type=darwin; arch=arm64; cl=1000335682)

The version comes from the Hub updater manifest; the example is the current
fallback. OAuth content requests omit `x-goog-api-key`, `Client-Metadata`, and
`x-goog-user-project`. Put the project in the JSON envelope. `loadCodeAssist`
sends `metadata: { ideType: "ANTIGRAVITY" }`; onboarding uses the separate
snake_case metadata fields documented in the implementation.

For streaming requests, also include:
Accept: text/event-stream
```

请求与响应格式、字段限制及文档末尾对比表摘录：

```markdown
## Request Format

### Basic Structure

{
  "project": "{project_id}",
  "model": "{model_id}",
  "request": {
    "contents": [...],
    "generationConfig": {...},
    "systemInstruction": {...},
    "tools": [...]
  },
  "userAgent": "antigravity",
  "requestType": "agent",
  "requestId": "agent-{unique_id}"
}

### Role Values
- `user` - Human/user messages
- `model` - Assistant responses (NOT `assistant`)

### System Instructions
Must be an object with `parts`, NOT a plain string.

### Google Search Grounding
`googleSearch` and `urlContext` tools cannot be combined with `functionDeclarations` in the same request.

### Function Name Rules
- First character: Must be a letter (a-z, A-Z) or underscore (_)
- Allowed characters: `a-zA-Z0-9`, underscores (`_`), dots (`.`), colons (`:`), dashes (`-`)
- Max length: 64 characters
- Not allowed: Slashes (`/`), spaces, other special characters

### Thinking / Extended Reasoning
`maxOutputTokens` must be GREATER than `thinkingBudget`

## NOT Supported

| Feature | Error |
|---------|-------|
| `anthropic_version` | Unknown field |
| `messages` array | Unknown field |
| `max_tokens` | Unknown field |
| Plain string `systemInstruction` | Invalid value |
| `system_instruction` (snake_case at root) | Unknown field |
| JSON Schema `const` | Unknown field (use `enum: [value]`) |
| JSON Schema `$ref` | Not supported (inline instead) |
| JSON Schema `$defs` | Not supported (inline instead) |
| Tool names with `/` | Invalid (use `_` or `:` instead) |
| Tool names starting with digit | Invalid (must start with letter/underscore) |

## Response Headers

| Header | Description |
|--------|-------------|
| `x-cloudaicompanion-trace-id` | Trace ID for debugging |
| `server-timing` | Request duration |

## Comparison: Antigravity vs Vertex AI Anthropic

| Feature | Antigravity | Vertex AI Anthropic |
|---------|-------------|---------------------|
| Endpoint | `cloudcode-pa.googleapis.com` | `aiplatform.googleapis.com` |
| Request format | Gemini-style `contents` | Anthropic `messages` |
| `anthropic_version` | Not used | Required |
| Model names | Simple (`claude-sonnet-4-6`) | Versioned (`claude-4-5@date`) |
| Response format | `candidates[]` | Anthropic `content[]` |
| Multi-model support | Yes (Claude, Gemini, etc.) | Anthropic only |
```

注：同一份 `docs/ANTIGRAVITY_API_SPEC.md` 前文 `Endpoints` 节写明消费端请求走 `https://daily-cloudcode-pa.googleapis.com` 且不要向 `https://cloudcode-pa.googleapis.com` 重试，而末尾 `Comparison` 表仍写 `cloudcode-pa.googleapis.com`。

## 4. `router-for-me/CLIProxyAPIBusiness`：`internal/quota/poller.go` 摘录（`[CODE]`）

```go
const (
	antigravityUserAgent = "antigravity/1.11.5 windows/amd64"
	codexUserAgent       = "codex_cli_rs/0.76.0 (Debian 13.0.0; x86_64) WindowsTerminal"
)

var (
	antigravityQuotaURLs = []string{
		"https://daily-cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels",
		"https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:fetchAvailableModels",
		"https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels",
	}
	geminiCLIQuotaURL = "https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota"
)
```

## 5. 未测边界（`[UNVERIFIED]`）

- 本次会话未向 `daily-cloudcode-pa.googleapis.com`、`daily-cloudcode-pa.sandbox.googleapis.com` 或 `cloudcode-pa.googleapis.com` 发起任何真实请求。
